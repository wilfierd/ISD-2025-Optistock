// Production.js with time-based batch creation and persistent batch tracking
import React, { useState, useEffect, useRef } from 'react';
import Navbar from './Navbar';
import { useLogout } from '../hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMaterials } from '../hooks/useMaterials';
import apiService from '../services/api';
import { toast } from 'react-toastify';
import './Production.css';
import { useLanguage } from '../contexts/LanguageContext';
import BatchTimer from './BatchTimer.js';

// Custom hook for production data
const useProduction = (status = 'all') => {
  return useQuery({
    queryKey: ['production', status],
    queryFn: async () => {
      const response = await apiService.production.getAll(status);
      return response.data.data || [];
    },
    retry: 1,
  });
};

// Custom hook for plating data
const usePlating = () => {
  return useQuery({
    queryKey: ['plating'],
    queryFn: async () => {
      const response = await apiService.plating.getAll();
      return response.data.data || [];
    },
    retry: 1,
  });
};

// Store the persistent state for batch processing
// Using localStorage to persist between navigation/renders
const getLastProcessedBatchCounts = () => {
  try {
    const stored = localStorage.getItem('lastProcessedBatchCounts');
    return stored ? JSON.parse(stored) : {};
  } catch (e) {
    console.error('Error reading lastProcessedBatchCounts from localStorage:', e);
    return {};
  }
};

const saveLastProcessedBatchCounts = (counts) => {
  try {
    localStorage.setItem('lastProcessedBatchCounts', JSON.stringify(counts));
  } catch (e) {
    console.error('Error saving lastProcessedBatchCounts to localStorage:', e);
  }
};

// Get last processing time from localStorage
const getLastProcessingTime = () => {
  try {
    const stored = localStorage.getItem('lastBatchProcessingTime');
    return stored ? parseInt(stored, 10) : 0;
  } catch (e) {
    return 0;
  }
};

const saveLastProcessingTime = (time) => {
  try {
    localStorage.setItem('lastBatchProcessingTime', time.toString());
  } catch (e) {
    console.error('Error saving lastBatchProcessingTime to localStorage:', e);
  }
};

// This variable helps us avoid concurrent processing 
let processingLock = false;

// Setup background processing service that runs regardless of current page
// This uses Web Worker pattern principles but without actually using a Worker
const BackgroundService = {
  active: false,
  initialize: function() {
    if (this.active) return;
    console.log("Initializing background batch processing service");
    
    // Process batches every 15 seconds (for testing, can be increased to 30 in production)
    this.processingInterval = setInterval(() => {
      this.processBatchesInBackground();
    }, 15000);
    
    // Register beforeunload handler to ensure we don't lose processing when page refreshes
    window.addEventListener('beforeunload', () => {
      console.log("Page unloading, storing processing state");
      // Any final cleanup could go here
    });
    
    this.active = true;
  },
  
  // This function will run in the background to process batches
  processBatchesInBackground: async function() {
    try {
      // Prevent concurrent processing
      if (processingLock) {
        console.log("Background processing: Already locked, skipping");
        return;
      }
      
      // Rate limiting
      const now = Date.now();
      const lastProcessingTime = getLastProcessingTime();
      if (now - lastProcessingTime < 10000) {
        console.log("Background processing: Rate limited, skipping");
        return;
      }
      
      console.log("Background batch processing running", new Date().toLocaleTimeString());
      processingLock = true;
      saveLastProcessingTime(now);
      
      // Fetch active productions
      const productionsResponse = await apiService.production.getAll('running');
      const productions = productionsResponse.data.data || [];
      
      if (productions.length === 0) {
        console.log("No running productions found");
        return;
      }
      
      console.log(`Found ${productions.length} running productions to process`);
      
      // Get current processed counts
      const lastProcessedCounts = getLastProcessedBatchCounts();
      let updatedCounts = {...lastProcessedCounts};
      let countsChanged = false;
      
      // Process each production
      for (const prod of productions) {
        try {
          const startTime = new Date(prod.start_date).getTime();
          const now = new Date().getTime();
          const elapsedMinutes = Math.floor((now - startTime) / (1000 * 60));
          
          // Calculate completed batches (every 5 minutes)
          const batchesDone = Math.floor(elapsedMinutes / 5);
          const lastProcessed = lastProcessedCounts[prod.id] || 0;
          const totalExpected = prod.expected_output || 100;
          
          console.log(`Background processing: Production ${prod.id}: ${batchesDone} batches done, ${lastProcessed} last processed, Total: ${totalExpected}`);
          
          // Check if production is at 100% completion
          if (batchesDone >= totalExpected) {
            console.log(`Background processing: Production ${prod.id} has reached 100% - stopping`);
            
            // Mark production as stopped
            await apiService.production.update(prod.id, {
              status: 'stopping',
              actual_output: totalExpected
            });
            
            // Try to update machine status
            if (prod.machine_id) {
              try {
                await apiService.machines.saveStopReason(prod.machine_id, {
                  reason: "Production complete - 100% of expected output reached",
                  stopTime: new Date().toTimeString().split(' ')[0],
                  stopDate: new Date().toLocaleDateString('en-GB').split('/').join('/')
                });
              } catch (err) {
                console.error("Failed to update machine status:", err);
              }
            }
            
            // Update the processed count
            updatedCounts[prod.id] = totalExpected;
            countsChanged = true;
            continue;
          }
          
          // If new batches have been completed
          if (batchesDone > lastProcessed) {
            const newlyCompletedCount = batchesDone - lastProcessed;
            
            if (newlyCompletedCount > 0) {
              console.log(`Background processing: ${newlyCompletedCount} new batches completed for production ${prod.id}`);
              
              // Create batches in warehouse
              const batchData = {
                part_name: prod.material_name,
                machine_name: prod.machine_name,
                mold_code: prod.mold_code,
                quantity: Math.min(newlyCompletedCount, 5), // Limit to 5 at once
                warehouse_entry_time: this.formatDateTime(new Date()),
                status: null, // Initially ungrouped
                created_by: 1 // Default to admin user if we don't have user context
              };
              
              // Create the batch
              await apiService.batches.create(batchData);
              
              // Update production with new actual output
              await apiService.production.update(prod.id, {
                actual_output: batchesDone
              });
              
              // Update our tracking
              updatedCounts[prod.id] = batchesDone;
              countsChanged = true;
            }
          }
        } catch (error) {
          console.error("Background processing: Error processing production", prod.id, error);
        }
      }
      
      if (countsChanged) {
        saveLastProcessedBatchCounts(updatedCounts);
        console.log("Background processing: Updated processed counts", updatedCounts);
      }
    } catch (error) {
      console.error("Background processing: Error in batch processing", error);
    } finally {
      processingLock = false;
    }
  },
  
  // Helper function to format date
  formatDateTime: function(date) {
    const pad = (num) => String(num).padStart(2, '0');
    
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    const seconds = pad(date.getSeconds());
    const day = pad(date.getDate());
    const month = pad(date.getMonth() + 1);
    const year = date.getFullYear();
    
    return `${hours}:${minutes}:${seconds} - ${day}/${month}/${year}`;
  }
};

// Initialize the background service immediately when this file loads
BackgroundService.initialize();

function Production({ user }) {
  const { t: translate, language } = useLanguage();
  const queryClient = useQueryClient();
  const scanInputRef = useRef(null);
  
  // State for active tab and filters
  const [activeTab, setActiveTab] = useState('production');
  const [productionFilter] = useState('all');
  
  // State for modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showStopReasonModal, setShowStopReasonModal] = useState(false);
  const [showPlatingModal, setShowPlatingModal] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [selectedPlating, setSelectedPlating] = useState(null);
  const [stopReason, setStopReason] = useState('');
  const [stopTime, setStopTime] = useState('');
  const [stopDate, setStopDate] = useState('');
  const [scannedInput, setScannedInput] = useState('');
  
  // State for current step in add wizard
  const [currentStep, setCurrentStep] = useState(1);
  
  // State for batch production progress
  const [productionProgress, setProductionProgress] = useState({});
  
  // Helper functions to format date and time for input fields
  const formatDateForInput = (date) => {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const formatTimeForInput = (date) => {
    const d = new Date(date);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };
  
  // State for plating date/time - initialize with current date/time in proper format
  const [platingData, setPlatingData] = useState({
    platingDate: formatDateForInput(new Date()),
    platingTime: formatTimeForInput(new Date()),
    selectedItems: []
  });
  
  // State for recent batch completions and notifications
  const [recentCompletions, setRecentCompletions] = useState([]);
  const [showCompletionAlert, setShowCompletionAlert] = useState(false);
  
  // State for batch completion popup
  const [showCompletionPopup, setShowCompletionPopup] = useState(false);
  const [completedBatchInfo, setCompletedBatchInfo] = useState(null);
  
  // State for next completion
  const [nextCompletion, setNextCompletion] = useState(null);
  
  // State for tracking last processed batches
  const [lastProcessedBatchCounts, setLastProcessedBatchCounts] = useState(getLastProcessedBatchCounts());
  
  // Form data state
  const [formData, setFormData] = useState({
    materialId: '',
    partName: '',
    materialCode: '',
    supplier: '',
    length: '',
    width: '',
    machineId: '',
    machineName: '',
    moldId: '',
    moldCode: '',
    expectedOutput: '',
  });
  
  // Queries for data
  const { data: materials = [] } = useMaterials();
  const { data: productions = [], isLoading: isLoadingProductions } = useProduction(productionFilter);
  const { data: platingItems = [], isLoading: isLoadingPlating, refetch: refetchPlating } = usePlating();
  const { data: machines = [] } = useQuery({
    queryKey: ['machines'],
    queryFn: async () => {
      try {
        const response = await apiService.machines.getAll();
        return response.data.data || [];
      } catch (error) {
        console.error('Error fetching machines:', error);
        return [];
      }
    },
  });
  const { data: molds = [] } = useQuery({
    queryKey: ['molds'],
    queryFn: async () => {
      try {
        const response = await apiService.molds.getAll();
        return response.data.data || [];
      } catch (error) {
        console.error('Error fetching molds:', error);
        return [];
      }
    },
  });
  
  const logoutMutation = useLogout();
  
  // Mutations
  const createProduction = useMutation({
    mutationFn: (data) => apiService.production.create(data),
    onSuccess: () => {
      toast.success(language === 'vi' ? 'Đã tạo lô sản xuất thành công' : 'Production batch created successfully');
      setShowAddModal(false);
      queryClient.invalidateQueries({ queryKey: ['production'] });
      queryClient.invalidateQueries({ queryKey: ['machines'] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || (language === 'vi' ? 'Không thể tạo lô sản xuất' : 'Failed to create production batch'));
    }
  });
  
  const updateProduction = useMutation({
    mutationFn: ({ id, data }) => apiService.production.update(id, data),
    onSuccess: () => {
      toast.success(language === 'vi' ? 'Đã cập nhật lô sản xuất thành công' : 'Production batch updated successfully');
      queryClient.invalidateQueries({ queryKey: ['production'] });
      queryClient.invalidateQueries({ queryKey: ['machines'] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || (language === 'vi' ? 'Không thể cập nhật lô sản xuất' : 'Failed to update production batch'));
    }
  });
  
  const deleteProduction = useMutation({
    mutationFn: (id) => apiService.production.delete(id),
    onSuccess: () => {
      toast.success(language === 'vi' ? 'Đã xóa lô sản xuất thành công' : 'Production batch deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['production'] });
      queryClient.invalidateQueries({ queryKey: ['machines'] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || (language === 'vi' ? 'Không thể xóa lô sản xuất' : 'Failed to delete production batch'));
    }
  });
  
  const saveMachineStopReason = useMutation({
    mutationFn: ({ machineId, data }) => apiService.machines.saveStopReason(machineId, data),
    onSuccess: () => {
      // Update production batch status after stop reason is saved
      if (selectedMachine) {
        updateProduction.mutate({
          id: selectedMachine.productionId,
          data: {
            status: 'stopping'
          }
        });
      }
      
      // Reset form and close modal
      setStopReason('');
      setStopTime('');
      setStopDate('');
      setShowStopReasonModal(false);
      setSelectedMachine(null);
      
      // Show success message
      toast.success(language === 'vi' ? 'Đã lưu lý do dừng máy thành công' : 'Machine stop reason saved successfully');
      
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['production'] });
      queryClient.invalidateQueries({ queryKey: ['machines'] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || (language === 'vi' ? 'Không thể lưu lý do dừng máy' : 'Failed to save machine stop reason'));
    }
  });
  
  // Mutation for updating plating information
  const updatePlating = useMutation({
    mutationFn: ({ id, data }) => apiService.plating.update(id, data),
    onSuccess: () => {
      toast.success(language === 'vi' ? 'Đã cập nhật thông tin mạ thành công' : 'Plating information updated successfully');
      refetchPlating();
      setShowPlatingModal(false);
      setSelectedPlating(null);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || (language === 'vi' ? 'Không thể cập nhật thông tin mạ' : 'Failed to update plating information'));
    }
  });
  
  // Helper function to format date time string
  const formatDateTime = (date) => {
    const pad = (num) => String(num).padStart(2, '0');
    
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    const seconds = pad(date.getSeconds());
    const day = pad(date.getDate());
    const month = pad(date.getMonth() + 1);
    const year = date.getFullYear();
    
    return `${hours}:${minutes}:${seconds} - ${day}/${month}/${year}`;
  };
  
  // Function to create batches in the warehouse - memoized to avoid dependency issues
  const createCompletedBatches = React.useCallback(async (production, count) => {
    try {
      console.log(`Creating ${count} completed batches for production ID: ${production.id} at ${new Date().toLocaleTimeString()}`);
      
      // Rate limiting: Only allow creation of max 5 batches at once to prevent flooding
      const maxBatchesPerOperation = 5;
      const batchesToCreate = Math.min(count, maxBatchesPerOperation);
      
      if (batchesToCreate <= 0) {
        console.log(`No batches to create for production ${production.id}`);
        return null;
      }
      
      if (!production.material_name || !production.machine_name || !production.mold_code) {
        console.error('Missing required production data:', production);
        throw new Error('Missing required production data');
      }
      
      // Prepare the batch data
      const batchData = {
        part_name: production.material_name,
        machine_name: production.machine_name,
        mold_code: production.mold_code,
        quantity: batchesToCreate,
        warehouse_entry_time: formatDateTime(new Date()),
        status: null, // Initially ungrouped
        created_by: user.id
      };
      
      console.log('Sending batch data to API:', batchData);
      
      // Call the API to create batches
      const response = await apiService.batches.create(batchData);
      console.log('Batch creation API response:', response.data);
      
      // Force a refresh of the batches list
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      queryClient.invalidateQueries({ queryKey: ['batches', 'ungrouped'] });
      
      return response.data;
    } catch (error) {
      console.error('Error creating batches:', error);
      // Log more detail about the error for debugging
      if (error.response) {
        console.error('API error response:', error.response.data);
      }
      toast.error(
        language === 'vi' 
          ? `Lỗi tạo lô: ${error.message}` 
          : `Error creating batch: ${error.message}`
      );
      throw error;
    }
  }, [user.id, queryClient, language, formatDateTime]);
  
  // Calculate which production will complete a batch next - memoized to avoid dependency issues
  const getNextBatchCompletion = React.useCallback(() => {
    let nextCompletion = null;
    let minTimeLeft = Infinity;
    
    // Check all running productions
    productions.forEach(prod => {
      if (prod.status === 'running') {
        const startTime = new Date(prod.start_date).getTime();
        const now = new Date().getTime();
        const elapsedMinutes = (now - startTime) / (1000 * 60);
        
        // Calculate which batch is in progress and when it will complete
        const completedBatches = Math.floor(elapsedMinutes / 5);
        const nextBatchCompleteTime = startTime + ((completedBatches + 1) * 5 * 60 * 1000);
        
        // Time left until next batch completion
        const timeLeft = nextBatchCompleteTime - now;
        
        // If this is sooner than our current minimum, update
        if (timeLeft > 0 && timeLeft < minTimeLeft) {
          minTimeLeft = timeLeft;
          nextCompletion = {
            productionId: prod.id,
            materialName: prod.material_name,
            machineName: prod.machine_name,
            timeLeft: timeLeft,
            completionTime: new Date(nextBatchCompleteTime)
          };
        }
      }
    });
    
    return nextCompletion;
  }, [productions]);
  
  // Function to process batch completions with rate limiting
  const processBatchCompletions = async () => {
    // Prevent concurrent processing
    if (processingLock) {
      console.log('Skipping batch processing: Already processing');
      return;
    }
    
    // Rate limiting
    const now = Date.now();
    const lastProcessingTime = getLastProcessingTime();
    if (now - lastProcessingTime < 15000) { // 15 seconds minimum between processing
      console.log('Skipping batch processing: Rate limited');
      return;
    }
    
    try {
      console.log('Processing batch completions...');
      processingLock = true;
      saveLastProcessingTime(now);
      
      // Get a copy of the current processed counts
      const currentProcessedCounts = {...lastProcessedBatchCounts};
      let updatedCounts = false;
      
      // Process each running production
      for (const prod of productions) {
        if (prod.status === 'running') {
          try {
            const startTime = new Date(prod.start_date).getTime();
            const now = new Date().getTime();
            const elapsedMinutes = Math.floor((now - startTime) / (1000 * 60));
            
            // Calculate completed batches (every 5 minutes)
            const batchesDone = Math.floor(elapsedMinutes / 5);
            const lastProcessed = currentProcessedCounts[prod.id] || 0;
            
            console.log(`Production ${prod.id}: ${batchesDone} batches done, ${lastProcessed} last processed`);
            
            // If new batches have been completed since last check
            if (batchesDone > lastProcessed) {
              // Calculate newly completed batches
              const newlyCompletedCount = batchesDone - lastProcessed;
              
              if (newlyCompletedCount > 0) {
                console.log(`${newlyCompletedCount} new batches completed for production ${prod.id}`);
                
                // Show completion popup for the most recent batch
                setCompletedBatchInfo({
                  productionId: prod.id,
                  materialName: prod.material_name,
                  machineName: prod.machine_name,
                  moldCode: prod.mold_code,
                  batchNumber: batchesDone,
                  completionTime: new Date(),
                });
                setShowCompletionPopup(true);
                
                // Automatically hide after 10 seconds
                setTimeout(() => {
                  setShowCompletionPopup(false);
                }, 10000);
                
                // Create batches in warehouse - limit to max 5 per operation to prevent flooding
                await createCompletedBatches(prod, Math.min(newlyCompletedCount, 5));
                
                // Add to recent completions
                setRecentCompletions(prevCompletions => {
                  const newCompletions = [...prevCompletions];
                  newCompletions.unshift({
                    id: Date.now(),
                    productionId: prod.id,
                    count: newlyCompletedCount,
                    materialName: prod.material_name,
                    timestamp: new Date()
                  });
                  
                  // Keep only the last 5 completions
                  return newCompletions.slice(0, 5);
                });
                
                // Show notification alert
                setShowCompletionAlert(true);
                setTimeout(() => {
                  setShowCompletionAlert(false);
                }, 10000);
                
                // Show toast notification
                toast.success(
                  language === 'vi' 
                    ? `${newlyCompletedCount} lô đã hoàn thành từ sản xuất ID: ${prod.id}` 
                    : `${newlyCompletedCount} batches completed from production ID: ${prod.id}`
                );
                
                // Update production with actual output
                await updateProduction.mutateAsync({
                  id: prod.id,
                  data: {
                    actual_output: batchesDone
                  }
                });
                
                // Refresh batches data
                queryClient.invalidateQueries({ queryKey: ['batches'] });
                
                // Update the last processed count for this production
                currentProcessedCounts[prod.id] = batchesDone;
                updatedCounts = true;
              }
            }
          } catch (error) {
            console.error(`Error processing batch completion for production ${prod.id}:`, error);
          }
        }
      }
      
      // Only update stored counts if we made changes
      if (updatedCounts) {
        setLastProcessedBatchCounts(currentProcessedCounts);
        saveLastProcessedBatchCounts(currentProcessedCounts); 
      }
    } finally {
      // Always release the lock
      processingLock = false;
    }
  };
  
  // Initialize production progress and set up batch completion tracking
  // This effect is for initial setup and state updates, NOT for batch processing
  useEffect(() => {
    if (productions.length > 0) {
      const progress = {};
      let countsUpdated = false;
      const updatedCounts = {...lastProcessedBatchCounts};
      
      productions.forEach(prod => {
        if (prod.status === 'running') {
          // For running productions, calculate progress based on time
          const startTime = new Date(prod.start_date).getTime();
          const now = new Date().getTime();
          const elapsedMinutes = Math.floor((now - startTime) / (1000 * 60));
          
          // Assuming 5 min per batch as requested
          const batchesDone = Math.floor(elapsedMinutes / 5);
          const totalExpected = prod.expected_output || 100;
          
          // Calculate percentage with constraints
          const percentage = Math.min(Math.round((batchesDone / totalExpected) * 100), 100);
          const remaining = Math.max(totalExpected - batchesDone, 0);
          
          progress[prod.id] = {
            batchesDone,
            batchesRemaining: remaining,
            totalExpected,
            percentage,
            // Estimated completion time
            estimatedCompletion: new Date(startTime + (totalExpected * 5 * 60 * 1000))
          };
          
          // Initialize last processed count if not already set or if actual_output is higher
          if (!lastProcessedBatchCounts[prod.id] && prod.actual_output) {
            updatedCounts[prod.id] = prod.actual_output;
            countsUpdated = true;
          } else if (prod.actual_output > (lastProcessedBatchCounts[prod.id] || 0)) {
            // If server has a higher count than what we have locally, update our local count
            updatedCounts[prod.id] = prod.actual_output;
            countsUpdated = true;
          }
        } else {
          // For stopped productions, use actual output
          const actualOutput = prod.actual_output || 0;
          const totalExpected = prod.expected_output || 100;
          const percentage = Math.min(Math.round((actualOutput / totalExpected) * 100), 100);
          
          progress[prod.id] = {
            batchesDone: actualOutput,
            batchesRemaining: Math.max(totalExpected - actualOutput, 0),
            totalExpected,
            percentage,
            stopped: true
          };
          
          // Make sure we track stopped productions too
          if (!lastProcessedBatchCounts[prod.id] || lastProcessedBatchCounts[prod.id] !== actualOutput) {
            updatedCounts[prod.id] = actualOutput;
            countsUpdated = true;
          }
        }
      });
      
      setProductionProgress(progress);
      
      // Only update if counts have changed
      if (countsUpdated) {
        setLastProcessedBatchCounts(updatedCounts);
        saveLastProcessedBatchCounts(updatedCounts);
      }
      
      // Initial calculation of next batch completion
      setNextCompletion(getNextBatchCompletion());
    }
  }, [productions]);
  
  // Set up regular interval for updating progress and checking batch completions
  useEffect(() => {
    console.log("Setting up intervals for progress updates and batch processing");
    
    // Make sure background service is initialized
    if (!BackgroundService.active) {
      BackgroundService.initialize();
    }
    
    // Immediately process batches once at start
    processBatchCompletions();
    
    // Update progress UI more frequently (every 5 seconds)
    const progressInterval = setInterval(() => {
      // Update production progress
      setProductionProgress(prev => {
        const updated = {...prev};
        
        productions.forEach(prod => {
          if (prod.status === 'running' && updated[prod.id]) {
            const startTime = new Date(prod.start_date).getTime();
            const now = new Date().getTime();
            const elapsedMinutes = Math.floor((now - startTime) / (1000 * 60));
            
            // Assuming 5 min per batch
            const batchesDone = Math.floor(elapsedMinutes / 5);
            const totalExpected = prod.expected_output || 100;
            const percentage = Math.min(Math.round((batchesDone / totalExpected) * 100), 100);
            const remaining = Math.max(totalExpected - batchesDone, 0);
            
            updated[prod.id] = {
              batchesDone,
              batchesRemaining: remaining,
              totalExpected,
              percentage,
              estimatedCompletion: new Date(startTime + (totalExpected * 5 * 60 * 1000))
            };
          }
        });
        
        return updated;
      });
      
      // Update next batch completion
      setNextCompletion(getNextBatchCompletion());
    }, 5000); 
    
    // Local interval for batch processing in this component instance
    const batchProcessingInterval = setInterval(() => {
      console.log("Triggering component-specific batch processing", new Date().toLocaleTimeString());
      processBatchCompletions();
    }, 15000); // Process batches every 15 seconds (reduced for testing, can be set back to 30000)
    
    return () => {
      // Clear the local intervals when component unmounts
      clearInterval(progressInterval);
      clearInterval(batchProcessingInterval);
      
      console.log("Component unmounting - local intervals cleared, background service still running");
    };
  }, [productions, user.id, processBatchCompletions, getNextBatchCompletion]);
  
  // Set up scanner input listener
  useEffect(() => {
    // Focus the input field when modal is opened
    if (showAddModal && scanInputRef.current) {
      scanInputRef.current.focus();
    }
  }, [showAddModal, currentStep]);
  
  // Set current date/time for plating form fields and stop form fields
  useEffect(() => {
    if (showStopReasonModal) {
      const now = new Date();
      setStopTime(
        `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`
      );
      setStopDate(
        `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`
      );
    }
    
    if (showPlatingModal || activeTab === 'platingList') {
      const now = new Date();
      setPlatingData(prev => ({
        ...prev,
        platingTime: formatTimeForInput(now),
        platingDate: formatDateForInput(now)
      }));
    }
  }, [showStopReasonModal, showPlatingModal, activeTab]);
  
  // Improved function to extract material ID from scanned QR codes
  const extractMaterialIdFromScan = (scanValue) => {
    try {
      // Log the raw value for debugging
      console.log('Raw QR scan value:', scanValue);
      
      // 1. Check for direct material ID format
      if (scanValue.includes('/material/')) {
        const parts = scanValue.split('/material/');
        const idPart = parts[parts.length - 1].trim();
        // Extract just the numeric part until any non-digit character
        const matches = idPart.match(/^(\d+)/);
        if (matches && matches[1]) {
          console.log('Extracted material ID from URL path:', matches[1]);
          return matches[1];
        }
      }
      
      // 2. Check if the entire scan is just a valid material ID number
      if (/^\d+$/.test(scanValue.trim())) {
        console.log('Scan value is a direct numeric ID:', scanValue.trim());
        return scanValue.trim();
      }
      
      // 3. Try to parse as JSON (for QR codes that contain JSON data)
      try {
        const jsonData = JSON.parse(scanValue);
        // Look for id, materialId, or material_id in the JSON
        if (jsonData.id) return String(jsonData.id);
        if (jsonData.materialId) return String(jsonData.materialId);
        if (jsonData.material_id) return String(jsonData.material_id);
        
        // If we have a material object in the JSON
        if (jsonData.material && jsonData.material.id) {
          return String(jsonData.material.id);
        }
      } catch (jsonError) {
        // Not JSON, continue with other methods
      }
      
      // 4. Check for key=value pairs format (like URL parameters)
      if (scanValue.includes('=')) {
        const params = {};
        scanValue.split('&').forEach(pair => {
          const [key, value] = pair.split('=');
          if (key && value) params[key.trim()] = value.trim();
        });
        
        // Check for material ID in various key formats
        if (params.id) return params.id;
        if (params.materialId) return params.materialId;
        if (params.material_id) return params.material_id;
        if (params.materialID) return params.materialID;
      }
      
      // 5. Last resort: Look for material ID pattern in the string
      // This is more conservative than just extracting any digits
      const materialIdMatch = scanValue.match(/material[^0-9]*(\d+)/i);
      if (materialIdMatch && materialIdMatch[1]) {
        console.log('Extracted material ID from pattern match:', materialIdMatch[1]);
        return materialIdMatch[1];
      }
      
      // If all methods fail, return null instead of extracting random digits
      console.warn('Could not extract a reliable material ID from scan:', scanValue);
      return null;
    } catch (error) {
      console.error('Error extracting material ID from scan:', error, 'Value:', scanValue);
      return null;
    }
  };
  
  // Handle scanner input changes and process when Enter key is pressed
  const handleScannerInput = (e) => {
    if (e.key === 'Enter') {
      // Process the scanned input when Enter key is pressed
      // (Most barcode scanners automatically send Enter key after scan)
      if (scannedInput) {
        handleScannedData(scannedInput);
        setScannedInput('');
      }
    }
  };
  
  // Handle scanned data
  const handleScannedData = (input) => {
    try {
      // Try to extract identification data from the scan
      const materialId = extractMaterialIdFromScan(input);
      
      if (materialId) {
        console.log("Successfully extracted material ID:", materialId);
        
        // Find the matching material
        const matchedMaterial = materials.find(m => m.id === parseInt(materialId));
        
        if (matchedMaterial) {
          // Update form based on current step
          if (currentStep === 1) {
            // Material information
            setFormData(prev => ({
              ...prev,
              materialId: matchedMaterial.id,
              partName: matchedMaterial.partName || matchedMaterial.part_name,
              materialCode: matchedMaterial.materialCode || matchedMaterial.material_code,
              supplier: matchedMaterial.supplier,
              length: matchedMaterial.length,
              width: matchedMaterial.width
            }));
            
            toast.success(language === 'vi' ? 'Đã tải thông tin vật liệu' : 'Material information loaded');
          }
        } else {
          // Material ID was extracted but not found in database
          toast.warning(language === 'vi' ? 
            'Không tìm thấy vật liệu với mã này trong cơ sở dữ liệu' : 
            'Material not found in database with this ID');
        }
        return;
      }
      
      // If we couldn't extract a material ID, try parsing as structured data
      let scannedData = {};
      
      // Try parsing as JSON
      if (input.startsWith('{')) {
        try {
          scannedData = JSON.parse(input);
          console.log("Parsed JSON data:", scannedData);
        } catch (e) {
          console.error("Failed to parse JSON from scan:", e);
        }
      } else {
        // Try parsing as key=value pairs
        input.split('&').forEach(pair => {
          const [key, value] = pair.split('=');
          if (key && value) {
            scannedData[key.trim()] = value.trim();
          }
        });
        console.log("Parsed key-value data:", scannedData);
      }
      
      // Process the extracted data based on current step
      updateFormFromScan(scannedData);
      
    } catch (error) {
      console.error('Error processing scanned input:', error);
      toast.error(language === 'vi' ? 'Định dạng mã vạch không hợp lệ' : 'Invalid barcode format');
    }
  };
  
  // Helper function to update form based on scanned data
  const updateFormFromScan = (scannedData) => {
    if (Object.keys(scannedData).length === 0) {
      toast.error(language === 'vi' ? 'Không thể trích xuất dữ liệu từ mã vạch' : 'Could not extract data from barcode');
      return;
    }
    
    if (currentStep === 1) {
      // Material information
      const matchedMaterial = materials.find(m => 
        m.materialCode === scannedData.materialCode || 
        m.packet_no === scannedData.packetNo ||
        m.material_code === scannedData.materialCode
      );
      
      if (matchedMaterial) {
        setFormData(prev => ({
          ...prev,
          materialId: matchedMaterial.id,
          partName: matchedMaterial.partName || matchedMaterial.part_name,
          materialCode: matchedMaterial.materialCode || matchedMaterial.material_code,
          supplier: matchedMaterial.supplier,
          length: matchedMaterial.length,
          width: matchedMaterial.width
        }));
        
        toast.success(language === 'vi' ? 'Đã tải thông tin vật liệu' : 'Material information loaded');
      } else if (scannedData.materialCode || scannedData.partName) {
        setFormData(prev => ({
          ...prev,
          materialCode: scannedData.materialCode || '',
          partName: scannedData.partName || '',
          supplier: scannedData.supplier || '',
          length: scannedData.length || '',
          width: scannedData.width || ''
        }));
        
        toast.info(language === 'vi' ? 
          'Không tìm thấy vật liệu trong cơ sở dữ liệu. Vui lòng chọn từ danh sách hoặc nhập thông tin.' : 
          'Material not found in database. Please select from list or enter details.');
      }
    } else if (currentStep === 2) {
      // Machine and mold information
      let dataUpdated = false;
      
      if (scannedData.machineId || scannedData.machineName || scannedData.ten_may_dap) {
        const matchedMachine = machines.find(m => 
          m.id === Number(scannedData.machineId) || 
          m.ten_may_dap === scannedData.machineName ||
          m.ten_may_dap === scannedData.ten_may_dap
        );
        
        if (matchedMachine) {
          setFormData(prev => ({
            ...prev,
            machineId: matchedMachine.id,
            machineName: matchedMachine.ten_may_dap
          }));
          
          dataUpdated = true;
          toast.success(language === 'vi' ? 'Đã tải thông tin máy' : 'Machine information loaded');
        }
      }
      
      if (scannedData.moldId || scannedData.moldCode || scannedData.ma_khuon) {
        const matchedMold = molds.find(m => 
          m.id === Number(scannedData.moldId) || 
          m.ma_khuon === scannedData.moldCode ||
          m.ma_khuon === scannedData.ma_khuon
        );
        
        if (matchedMold) {
          setFormData(prev => ({
            ...prev,
            moldId: matchedMold.id,
            moldCode: matchedMold.ma_khuon,
            expectedOutput: matchedMold.so_luong
          }));
          
          dataUpdated = true;
          toast.success(language === 'vi' ? 'Đã tải thông tin khuôn' : 'Mold information loaded');
        }
      }
      
      if (!dataUpdated) {
        toast.warning(language === 'vi' ? 
          'Không tìm thấy thông tin máy hoặc khuôn từ mã quét' : 
          'No machine or mold information found from scan');
      }
    }
  };
  
  // Handle tab changes
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    // If switching to plating list, refetch plating data
    if (tab === 'platingList') {
      refetchPlating();
    }
  };
  
  // Handle add new batch
  const handleAddBatch = () => {
    setCurrentStep(1);
    setFormData({
      materialId: '',
      partName: '',
      materialCode: '',
      supplier: '',
      length: '',
      width: '',
      machineId: '',
      machineName: '',
      moldId: '',
      moldCode: '',
      expectedOutput: '',
    });
    setShowAddModal(true);
  };
  
  // Handle plating item selection
  const handlePlatingItemSelect = (itemId) => {
    setPlatingData(prev => {
      const selectedItems = [...prev.selectedItems];
      
      if (selectedItems.includes(itemId)) {
        return {
          ...prev,
          selectedItems: selectedItems.filter(id => id !== itemId)
        };
      } else {
        return {
          ...prev,
          selectedItems: [...selectedItems, itemId]
        };
      }
    });
  };
  
  // Handle set plating data
  const handleSetPlatingTime = () => {
    // Validate
    if (!platingData.platingDate || !platingData.platingTime) {
      toast.error(language === 'vi' ? 'Vui lòng chọn ngày và giờ mạ' : 'Please select plating date and time');
      return;
    }
    
    if (platingData.selectedItems.length === 0) {
      toast.error(language === 'vi' ? 'Vui lòng chọn ít nhất một lô để mạ' : 'Please select at least one batch for plating');
      return;
    }
    
    // Convert the date and time to a proper format
    try {
      // Format the date and time in a way the server expects
      const formattedDate = platingData.platingDate.split('-').reverse().join('/');
      const formattedPlatingData = {
        platingDate: formattedDate,
        platingTime: platingData.platingTime,
        status: 'processing'
      };
      
      // For each selected item, update its plating information
      let updatePromises = [];
      
      platingData.selectedItems.forEach(itemId => {
        const item = platingItems.find(p => p.id === itemId);
        if (item) {
          updatePromises.push(
            updatePlating.mutateAsync({
              id: itemId,
              data: formattedPlatingData
            })
          );
        }
      });
      
      // Show loading toast
      const loadingToastId = toast.info(
        language === 'vi' ? 'Đang cập nhật dữ liệu mạ...' : 'Updating plating data...',
        { autoClose: false }
      );
      
      // Execute all updates and handle results
      Promise.all(updatePromises)
        .then(() => {
          // Clear selection after successful update
          setPlatingData(prev => ({
            ...prev,
            selectedItems: []
          }));
          
          // Close loading toast and show success
          toast.dismiss(loadingToastId);
          toast.success(
            language === 'vi' ? 
            'Đã cập nhật thông tin mạ thành công' : 
            'Plating information updated successfully'
          );
          
          // Refresh the data
          refetchPlating();
        })
        .catch(error => {
          // Show error message
          toast.dismiss(loadingToastId);
          toast.error(
            language === 'vi' ? 
            `Lỗi: ${error.message || 'Không thể cập nhật thông tin mạ'}` : 
            `Error: ${error.message || 'Failed to update plating information'}`
          );
        });
    } catch (error) {
      console.error('Error processing plating data:', error);
      toast.error(
        language === 'vi' ? 
        'Lỗi xử lý dữ liệu mạ' : 
        'Error processing plating data'
      );
    }
  };
  
  // Handle show plating detail
  const handleShowPlatingDetail = (plating) => {
    setSelectedPlating(plating);
    setShowPlatingModal(true);
  };
  
  // Handle plating data input change
  const handlePlatingInputChange = (e) => {
    const { name, value } = e.target;
    setPlatingData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Handle next step in wizard
  const handleNextStep = () => {
    if (currentStep === 1) {
      if (!formData.materialId) {
        toast.error(language === 'vi' ? 'Vui lòng chọn vật liệu' : 'Please select a material');
        return;
      }
      setCurrentStep(2);
    }
  };
  
  // Handle previous step in wizard
  const handlePrevStep = () => {
    if (currentStep === 2) {
      setCurrentStep(1);
    }
  };
  
  // Handle completion of form - submit
  const handleFinishForm = () => {
    if (!formData.machineId || !formData.moldId) {
      toast.error(language === 'vi' ? 'Vui lòng chọn máy và khuôn' : 'Please select machine and mold');
      return;
    }
    
    createProduction.mutate({
      materialId: parseInt(formData.materialId),
      machineId: parseInt(formData.machineId),
      moldId: parseInt(formData.moldId),
      expectedOutput: parseInt(formData.expectedOutput) || 0
    });
  };
  
  // Handle machine stop
  const handleStopMachine = (production) => {
    setSelectedMachine({
      id: production.machine_id,
      name: production.machine_name,
      productionId: production.id
    });
    setShowStopReasonModal(true);
  };
  
  // Handle saving stop reason
  const handleSaveStopReason = () => {
    if (!stopReason) {
      toast.error(language === 'vi' ? 'Vui lòng nhập lý do dừng' : 'Please enter a stop reason');
      return;
    }
    
    // Only call the saveMachineStopReason mutation
    // The updateProduction will be called in the onSuccess callback
    saveMachineStopReason.mutate({
      machineId: selectedMachine.id,
      data: {
        reason: stopReason,
        stopTime,
        stopDate
      }
    });
  };
  // Handle plating completion
  const handleCompletePlating = () => {
    if (!selectedPlating) return;
    
    // Show confirmation dialog
    if (window.confirm(language === 'vi' ? 
      'Bạn có chắc chắn muốn hoàn thành quá trình mạ và chuyển sản phẩm này đến kho thành phẩm?' : 
      'Are you sure you want to complete plating and move this product to the finished products warehouse?')) {
        
      // Call the API to complete plating and move to finished products
      try {
        // Show loading toast
        const loadingToastId = toast.info(
          language === 'vi' ? 'Đang hoàn thành quá trình mạ...' : 'Completing plating process...',
          { autoClose: false }
        );
        
        // Call the API
        apiService.plating.completePlating(selectedPlating.id)
          .then(response => {
            // Close loading toast and show success
            toast.dismiss(loadingToastId);
            toast.success(
              language === 'vi' ? 
              'Đã hoàn thành quá trình mạ và chuyển sản phẩm đến kho thành phẩm' : 
              'Plating process completed and product moved to finished products warehouse'
            );
            
            // Close the modal
            setShowPlatingModal(false);
            setSelectedPlating(null);
            
            // Refresh the data
            refetchPlating();
          })
          .catch(error => {
            // Show error message
            toast.dismiss(loadingToastId);
            toast.error(
              language === 'vi' ? 
              `Lỗi: ${error.message || 'Không thể hoàn thành quá trình mạ'}` : 
              `Error: ${error.message || 'Failed to complete plating process'}`
            );
          });
      } catch (error) {
        console.error('Error completing plating:', error);
        toast.error(
          language === 'vi' ? 
          'Lỗi hoàn thành quá trình mạ' : 
          'Error completing plating process'
        );
      }
    }
  };
  
  // Handle start/continue production
  const handleStartProduction = (production) => {
    updateProduction.mutate({
      id: production.id,
      data: {
        status: 'running'
      }
    });
  };
  
  // Handle delete production
  const handleDeleteProduction = (id) => {
    if (window.confirm(language === 'vi' ? 'Bạn có chắc chắn muốn xóa lô sản xuất này?' : 'Are you sure you want to delete this production batch?')) {
      deleteProduction.mutate(id);
    }
  };
  
  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Auto-fill expected output from mold if moldId changes
    if (name === 'moldId') {
      const selectedMold = molds.find(m => m.id === parseInt(value));
      if (selectedMold) {
        setFormData(prev => ({
          ...prev,
          moldCode: selectedMold.ma_khuon,
          expectedOutput: selectedMold.so_luong
        }));
      }
    }
    
    // Auto-fill machine name if machineId changes
    if (name === 'machineId') {
      const selectedMachine = machines.find(m => m.id === parseInt(value));
      if (selectedMachine) {
        setFormData(prev => ({
          ...prev,
          machineName: selectedMachine.ten_may_dap
        }));
      }
    }
    
    // Auto-fill material details if materialId changes
    if (name === 'materialId') {
      const selectedMaterial = materials.find(m => m.id === parseInt(value));
      if (selectedMaterial) {
        setFormData(prev => ({
          ...prev,
          partName: selectedMaterial.partName || selectedMaterial.part_name,
          materialCode: selectedMaterial.materialCode || selectedMaterial.material_code,
          supplier: selectedMaterial.supplier,
          length: selectedMaterial.length,
          width: selectedMaterial.width
        }));
      }
    }
  };
  
  // Helper function to format time
  const formatTime = (date) => {
    if (!date) return '';
    
    try {
      const d = new Date(date);
      return d.toLocaleString();
    } catch (e) {
      return date;
    }
  };
  
  // Handle logout
  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <div className="production-container">
      <Navbar user={user} onLogout={handleLogout} />
      
      <div className="content-wrapper">
        <div className="header-section">
          <h1>{language === 'vi' ? activeTab === 'production' ? 'Danh sách lô sản xuất' : 'Danh sách mạ' : 
                            activeTab === 'production' ? 'Production Management' : 'Plating List'}</h1>
          
          {activeTab === 'production' && (
            <button className="add-button" onClick={handleAddBatch}>
              {language === 'vi' ? 'Tạo lô mới' : 'New Production Batch'}
            </button>
          )}
        </div>
        
        {/* Tabs */}
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'production' ? 'active' : ''}`}
            onClick={() => handleTabChange('production')}
          >
            {language === 'vi' ? 'Danh sách lô sản xuất' : 'Production Batches'}
          </button>
          <button
            className={`tab ${activeTab === 'platingList' ? 'active' : ''}`}
            onClick={() => handleTabChange('platingList')}
          >
            {language === 'vi' ? 'Danh sách mạ' : 'Plating List'}
          </button>
        </div>
        
        {/* Production Tab Content */}
        {activeTab === 'production' && (
          <div className="table-container">
            {/* Next batch completion indicator */}
            {nextCompletion && (
              <div className="next-batch-alert">
                <div className="pulsing-icon">
                  <i className="fas fa-hourglass-half"></i>
                </div>
                <div className="next-batch-info">
                  <div className="next-batch-label">
                    {language === 'vi' ? 'Lô tiếp theo sẽ hoàn thành:' : 'Next batch completing:'}
                  </div>
                  <div className="next-batch-details">
                    <span className="material-name">{nextCompletion.materialName}</span>
                    <span className="separator">|</span>
                    <span className="machine-name">{nextCompletion.machineName}</span>
                    <span className="separator">|</span>
                    <span className="completion-time">{nextCompletion.completionTime.toLocaleTimeString()}</span>
                  </div>
                </div>
                <div className="time-remaining">
                  <span className="time-value">
                    {Math.floor(nextCompletion.timeLeft / (1000 * 60))}:
                    {String(Math.floor((nextCompletion.timeLeft / 1000) % 60)).padStart(2, '0')}
                  </span>
                  <span className="time-label">
                    {language === 'vi' ? 'phút còn lại' : 'minutes left'}
                  </span>
                </div>
              </div>
            )}
          
            {isLoadingProductions ? (
              <div className="loading-spinner">
                <div className="spinner"></div>
              </div>
            ) : (
              <table className="production-table">
                <thead>
                  <tr>
                    <th>{language === 'vi' ? 'Trạng thái' : 'Status'}</th>
                    <th>{language === 'vi' ? 'Tên máy dập' : 'Machine'}</th>
                    <th>{language === 'vi' ? 'Mã khuôn' : 'Mold'}</th>
                    <th>{language === 'vi' ? 'Tiến độ' : 'Progress'}</th>
                    <th>{language === 'vi' ? 'Số lượng' : 'Quantity'}</th>
                    <th>{language === 'vi' ? 'Ngày, giờ bắt đầu' : 'Start Time'}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {productions.length > 0 ? (
                    productions.map(production => (
                      <tr key={production.id}>
                        <td>
                          <span className={`status-indicator ${production.status === 'running' ? 'active' : 'inactive'}`}></span>
                        </td>
                        <td>{production.machine_name}</td>
                        <td>{production.mold_code}</td>
                        <td>
                          {/* Progress bar showing batch completion based on time */}
                          <div className="progress" style={{ height: '20px' }}>
                            <div 
                              className={`progress-bar ${production.status === 'running' ? 'bg-success' : 'bg-secondary'}`} 
                              role="progressbar" 
                              style={{ width: `${productionProgress[production.id]?.percentage || 0}%` }}
                              aria-valuenow={productionProgress[production.id]?.percentage || 0} 
                              aria-valuemin="0" 
                              aria-valuemax="100"
                            >
                              {productionProgress[production.id]?.percentage || 0}%
                            </div>
                          </div>
                          <div className="small text-muted mt-1">
                            {language === 'vi' 
                              ? `Hoàn thành: ${productionProgress[production.id]?.batchesDone || 0} / 
                                  Còn lại: ${productionProgress[production.id]?.batchesRemaining || 0}` 
                              : `Completed: ${productionProgress[production.id]?.batchesDone || 0} / 
                                 Remaining: ${productionProgress[production.id]?.batchesRemaining || 0}`}
                          </div>
                          
                          {/* Add batch completion timer for running productions */}
                          {production.status === 'running' && (
                            <div className="batch-info-row">
                              <div className="completion-estimate">
                                <span className="completion-badge in-progress">
                                  {language === 'vi' ? 'Đang chạy' : 'In Progress'}
                                </span>
                                <BatchTimer startTime={production.start_date} batchDuration={5} />
                              </div>
                              <div className="total-estimate">
                                {language === 'vi' ? 'Hoàn thành dự kiến:' : 'Est. completion:'} 
                                {' '}
                                {productionProgress[production.id]?.estimatedCompletion 
                                  ? productionProgress[production.id].estimatedCompletion.toLocaleString() 
                                  : 'N/A'}
                              </div>
                            </div>
                          )}
                        </td>
                        <td>
                          {production.expected_output} 
                          {production.actual_output > 0 && ` / ${production.actual_output}`}
                        </td>
                        <td>
                          {production.start_date ? new Date(production.start_date).toLocaleString() : '-'}
                        </td>
                        <td className="actions-cell">
                          {/* Start button - Blue when machine is stopped */}
                          <button
                            className={`action-button start-button ${production.status !== 'running' ? 'active' : 'inactive'}`}
                            onClick={() => handleStartProduction(production)}
                            disabled={production.status === 'running'}
                          >
                            {language === 'vi' ? 'Tiếp tục' : 'Start'}
                          </button>
                          
                          {/* Stop button - Red when machine is running */}
                          <button
                            className={`action-button stop-button ${production.status === 'running' ? 'active' : 'inactive'}`}
                            onClick={() => handleStopMachine(production)}
                            disabled={production.status !== 'running'}
                          >
                            {language === 'vi' ? 'Dừng' : 'Stop'}
                          </button>
                          
                          {/* Delete button - Always visible */}
                          <button
                            className="action-button delete-button"
                            onClick={() => handleDeleteProduction(production.id)}
                          >
                            <i className="fas fa-trash"></i>
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" className="no-data">
                        {language === 'vi' ? 'Không tìm thấy lô sản xuất nào' : 'No production batches found'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        )}
        
        {/* Plating List Tab Content */}
        {activeTab === 'platingList' && (
          <div className="plating-section">
            {/* Plating settings for ready items */}
            <div className="card mb-4">
              <div className="card-header bg-primary text-white">
                <h5 className="mb-0">{language === 'vi' ? 'Lô chờ mạ' : 'Batches Ready for Plating'}</h5>
              </div>
              <div className="card-body">
                {isLoadingPlating ? (
                  <div className="text-center my-3">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">{language === 'vi' ? 'Đang tải...' : 'Loading...'}</span>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="row mb-3">
                      <div className="col-md-5">
                        <label htmlFor="platingDate" className="form-label">
                          {language === 'vi' ? 'Ngày mạ' : 'Plating Date'}
                        </label>
                        <input 
                          type="date" 
                          className="form-control" 
                          id="platingDate"
                          name="platingDate"
                          value={platingData.platingDate}
                          onChange={handlePlatingInputChange}
                        />
                      </div>
                      <div className="col-md-5">
                        <label htmlFor="platingTime" className="form-label">
                          {language === 'vi' ? 'Giờ mạ' : 'Plating Time'}
                        </label>
                        <input 
                          type="time" 
                          className="form-control" 
                          id="platingTime"
                          name="platingTime"
                          value={platingData.platingTime}
                          onChange={handlePlatingInputChange}
                        />
                      </div>
                      <div className="col-md-2">
                        <label className="form-label">&nbsp;</label>
                        <button
                          className="btn btn-primary w-100"
                          onClick={handleSetPlatingTime}
                          disabled={!platingData.platingDate || !platingData.platingTime || platingData.selectedItems.length === 0}
                        >
                          {language === 'vi' ? 'Đặt lịch mạ' : 'Set Plating'}
                        </button>
                      </div>
                    </div>
                    
                    <div className="table-responsive">
                      <table className="table table-hover">
                        <thead>
                          <tr>
                            <th width="5%">
                              <input 
                                type="checkbox" 
                                className="form-check-input" 
                                checked={platingItems.filter(p => p.status === 'pending').length > 0 && 
                                         platingItems.filter(p => p.status === 'pending').every(p => platingData.selectedItems.includes(p.id))}
                                onChange={() => {
                                  const pendingItems = platingItems.filter(p => p.status === 'pending');
                                  if (pendingItems.length === 0) return;
                                  
                                  const areAllSelected = pendingItems.every(p => platingData.selectedItems.includes(p.id));
                                  
                                  if (areAllSelected) {
                                    // Deselect all
                                    setPlatingData(prev => ({
                                      ...prev,
                                      selectedItems: prev.selectedItems.filter(id => !pendingItems.some(p => p.id === id))
                                    }));
                                  } else {
                                    // Select all
                                    setPlatingData(prev => ({
                                      ...prev,
                                      selectedItems: [...new Set([...prev.selectedItems, ...pendingItems.map(p => p.id)])]
                                    }));
                                  }
                                }}
                              />
                            </th>
                            <th>{language === 'vi' ? 'Nhóm ID' : 'Group ID'}</th>
                            <th>{language === 'vi' ? 'Số lượng' : 'Quantity'}</th>
                            <th>{language === 'vi' ? 'Người phụ trách' : 'PIC'}</th>
                            <th>{language === 'vi' ? 'Trạng thái' : 'Status'}</th>
                            <th>{language === 'vi' ? 'Ngày bắt đầu' : 'Start Date'}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {platingItems.filter(p => p.status === 'pending').length > 0 ? (
                            platingItems.filter(p => p.status === 'pending').map(item => (
                              <tr key={item.id} style={{ cursor: 'pointer' }} onClick={() => handlePlatingItemSelect(item.id)}>
                                <td>
                                  <input 
                                    type="checkbox" 
                                    className="form-check-input" 
                                    checked={platingData.selectedItems.includes(item.id)}
                                    onChange={() => handlePlatingItemSelect(item.id)}
                                    onClick={e => e.stopPropagation()}
                                  />
                                </td>
                                <td>{item.group_id}</td>
                                <td>{item.product_quantity}</td>
                                <td>{item.pic_name}</td>
                                <td>
                                  <span className="badge bg-warning">
                                    {language === 'vi' ? 'Chờ mạ' : 'Pending'}
                                  </span>
                                </td>
                                <td>{formatTime(item.created_at)}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="6" className="text-center py-3">
                                {language === 'vi' ? 'Không có lô nào đang chờ mạ' : 'No batches waiting for plating'}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            </div>
            
            {/* Plating in progress items */}
            <div className="card">
              <div className="card-header bg-info text-white">
                <h5 className="mb-0">{language === 'vi' ? 'Lô đang mạ' : 'Batches in Plating Process'}</h5>
              </div>
              <div className="card-body">
                {isLoadingPlating ? (
                  <div className="text-center my-3">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">{language === 'vi' ? 'Đang tải...' : 'Loading...'}</span>
                    </div>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead>
                        <tr>
                          <th>{language === 'vi' ? 'Nhóm ID' : 'Group ID'}</th>
                          <th>{language === 'vi' ? 'Số lượng' : 'Quantity'}</th>
                          <th>{language === 'vi' ? 'Người phụ trách' : 'PIC'}</th>
                          <th>{language === 'vi' ? 'Trạng thái' : 'Status'}</th>
                          <th>{language === 'vi' ? 'Ngày mạ' : 'Plating Date'}</th>
                          <th>{language === 'vi' ? 'Thao tác' : 'Actions'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {platingItems.filter(p => p.status !== 'pending').length > 0 ? (
                          platingItems.filter(p => p.status !== 'pending').map(item => (
                            <tr key={item.id} style={{ cursor: 'pointer' }} onClick={() => handleShowPlatingDetail(item)}>
                              <td>{item.group_id}</td>
                              <td>{item.product_quantity}</td>
                              <td>{item.pic_name}</td>
                              <td>
                                {item.status === 'processing' ? (
                                  <span className="badge bg-primary">
                                    {language === 'vi' ? 'Đang mạ' : 'In Progress'}
                                  </span>
                                ) : item.status === 'completed' ? (
                                  <span className="badge bg-success">
                                    {language === 'vi' ? 'Hoàn thành' : 'Completed'}
                                  </span>
                                ) : (
                                  <span className="badge bg-secondary">
                                    {item.status}
                                  </span>
                                )}
                              </td>
                              <td>{item.platingDate} {item.platingTime}</td>
                              <td>
                                {item.status === 'processing' && (
                                  <button
                                    className="btn btn-sm btn-success"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedPlating(item);
                                      handleCompletePlating();
                                    }}
                                  >
                                    {language === 'vi' ? 'Hoàn thành' : 'Complete'}
                                  </button>
                                )}
                                
                                <button
                                  className="btn btn-sm btn-info ms-2"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleShowPlatingDetail(item);
                                  }}
                                >
                                  {language === 'vi' ? 'Chi tiết' : 'Details'}
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="6" className="text-center py-3">
                              {language === 'vi' ? 'Không có lô nào đang trong quá trình mạ' : 'No batches in plating process'}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Add Production Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3>{language === 'vi' ? 'Tạo lô sản xuất mới' : 'Create New Production Batch'}</h3>
              <button className="close-button" onClick={() => setShowAddModal(false)}>×</button>
            </div>
            
            {/* Wizard Steps */}
            <div className="wizard-steps">
              <div className={`wizard-step ${currentStep === 1 ? 'active' : ''}`}>
                <span className="step-number">1</span>
                <span className="step-label">{language === 'vi' ? 'Thông tin vật liệu' : 'Material Info'}</span>
              </div>
              <div className={`wizard-step ${currentStep === 2 ? 'active' : ''}`}>
                <span className="step-number">2</span>
                <span className="step-label">{language === 'vi' ? 'Thông tin máy' : 'Machine Info'}</span>
              </div>
            </div>
            
            <div className="modal-body">
              {currentStep === 1 ? (
                /* Material Information Step */
                <div className="material-form">
                  <div className="scanner-input-container">
                    <label>{language === 'vi' ? 'Quét mã vạch' : 'Scan Barcode'}</label>
                    <input
                      type="text"
                      ref={scanInputRef}
                      value={scannedInput}
                      onChange={(e) => setScannedInput(e.target.value)}
                      onKeyDown={handleScannerInput}
                      placeholder={language === 'vi' ? 'Quét mã vạch vật liệu...' : 'Scan material barcode...'}
                      className="scanner-input"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>{language === 'vi' ? 'Vật liệu' : 'Material'}</label>
                    <select
                      name="materialId"
                      value={formData.materialId}
                      onChange={handleInputChange}
                    >
                      <option value="">{language === 'vi' ? 'Chọn vật liệu' : 'Select Material'}</option>
                      {materials.map(material => (
                        <option key={material.id} value={material.id}>
                          {material.partName || material.part_name} - {material.materialCode || material.material_code}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {formData.materialId && (
                    <div className="material-details">
                      <div className="detail-row">
                        <span className="detail-label">{language === 'vi' ? 'Tên bộ phận' : 'Part Name'}:</span>
                        <span className="detail-value">{formData.partName}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">{language === 'vi' ? 'Mã vật liệu' : 'Material Code'}:</span>
                        <span className="detail-value">{formData.materialCode}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">{language === 'vi' ? 'Kích thước' : 'Dimensions'}:</span>
                        <span className="detail-value">{formData.length} × {formData.width}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">{language === 'vi' ? 'Nhà cung cấp' : 'Supplier'}:</span>
                        <span className="detail-value">{formData.supplier}</span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Machine Information Step */
                <div className="machine-form">
                  <div className="form-group">
                    <label>{language === 'vi' ? 'Máy' : 'Machine'}</label>
                    <select
                      name="machineId"
                      value={formData.machineId}
                      onChange={handleInputChange}
                    >
                      <option value="">{language === 'vi' ? 'Chọn máy' : 'Select Machine'}</option>
                      {machines.map(machine => (
                        <option 
                          key={machine.id} 
                          value={machine.id}
                          disabled={machine.status === 'running'}
                        >
                          {machine.ten_may_dap} {machine.status === 'running' ? `(${language === 'vi' ? 'Đang sử dụng' : 'In Use'})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label>{language === 'vi' ? 'Khuôn' : 'Mold'}</label>
                    <select
                      name="moldId"
                      value={formData.moldId}
                      onChange={handleInputChange}
                    >
                      <option value="">{language === 'vi' ? 'Chọn khuôn' : 'Select Mold'}</option>
                      {molds.map(mold => (
                        <option key={mold.id} value={mold.id}>
                          {mold.ma_khuon}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {formData.moldId && (
                    <div className="mold-details">
                      <div className="detail-row">
                        <span className="detail-label">{language === 'vi' ? 'Số lượng dự kiến' : 'Expected Output'}:</span>
                        <input
                          type="number"
                          name="expectedOutput"
                          value={formData.expectedOutput}
                          onChange={handleInputChange}
                          className="quantity-input"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="modal-footer">
              {currentStep === 1 ? (
                <>
                  <button 
                    className="cancel-button"
                    onClick={() => setShowAddModal(false)}
                  >
                    {language === 'vi' ? 'Hủy' : 'Cancel'}
                  </button>
                  <button 
                    className="next-button"
                    onClick={handleNextStep}
                  >
                    {language === 'vi' ? 'Tiếp theo' : 'Next'}
                  </button>
                </>
              ) : (
                <>
                  <button 
                    className="prev-button"
                    onClick={handlePrevStep}
                  >
                    {language === 'vi' ? 'Quay lại' : 'Back'}
                  </button>
                  <button 
                    className="finish-button"
                    onClick={handleFinishForm}
                    disabled={createProduction.isPending}
                  >
                    {createProduction.isPending ? 
                      (language === 'vi' ? 'Đang tạo...' : 'Creating...') : 
                      (language === 'vi' ? 'Bắt đầu sản xuất' : 'Start Production')}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Stop Reason Modal */}
      {showStopReasonModal && (
        <div className="modal-overlay">
          <div className="modal-container stop-reason-modal">
            <div className="modal-header">
              <h3>{language === 'vi' ? 'Lý do dừng máy' : 'Machine Stop Reason'}</h3>
              <button className="close-button" onClick={() => {
                setShowStopReasonModal(false);
                setStopReason('');
                setSelectedMachine(null);
              }}>×</button>
            </div>
            <div className="modal-body">
              <div className="time-inputs">
                <div className="form-group">
                  <label>{language === 'vi' ? 'Thời gian' : 'Time'}:</label>
                  <input
                    type="text"
                    value={stopTime}
                    onChange={(e) => setStopTime(e.target.value)}
                    placeholder="hh:mm:ss"
                  />
                </div>
                <div className="form-group">
                  <label>{language === 'vi' ? 'Ngày' : 'Date'}:</label>
                  <input
                    type="text"
                    value={stopDate}
                    onChange={(e) => setStopDate(e.target.value)}
                    placeholder="dd/mm/yyyy"
                  />
                </div>
              </div>
              <div className="form-group reason-input">
                <label>{language === 'vi' ? 'Lý do' : 'Reason'}:</label>
                <textarea
                  value={stopReason}
                  onChange={(e) => setStopReason(e.target.value)}
                  placeholder={language === 'vi' ? 'Nhập lý do dừng máy...' : 'Enter reason for stopping'}
                ></textarea>
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="cancel-button"
                onClick={() => {
                  setShowStopReasonModal(false);
                  setStopReason('');
                  setSelectedMachine(null);
                }}
              >
                {language === 'vi' ? 'Hủy' : 'Cancel'}
              </button>
              <button 
                className="confirm-button"
                onClick={handleSaveStopReason}
                disabled={saveMachineStopReason.isPending}
              >
                {saveMachineStopReason.isPending ? 
                  (language === 'vi' ? 'Đang lưu...' : 'Saving...') : 
                  (language === 'vi' ? 'Xác nhận' : 'Confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Plating Detail Modal */}
      {showPlatingModal && selectedPlating && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3>{language === 'vi' ? 'Chi tiết mạ' : 'Plating Details'}</h3>
              <button className="close-button" onClick={() => {
                setShowPlatingModal(false);
                setSelectedPlating(null);
              }}>×</button>
            </div>
            <div className="modal-body">
              <div className="detail-row">
                <span className="detail-label">{language === 'vi' ? 'Nhóm ID' : 'Group ID'}:</span>
                <span className="detail-value">{selectedPlating.group_id}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">{language === 'vi' ? 'Số lượng' : 'Quantity'}:</span>
                <span className="detail-value">{selectedPlating.product_quantity}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">{language === 'vi' ? 'Người phụ trách' : 'PIC'}:</span>
                <span className="detail-value">{selectedPlating.pic_name}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">{language === 'vi' ? 'Trạng thái' : 'Status'}:</span>
                <span className="detail-value">
                  {selectedPlating.status === 'pending' 
                    ? (language === 'vi' ? 'Chờ mạ' : 'Pending') 
                    : selectedPlating.status === 'inProcess' 
                      ? (language === 'vi' ? 'Đang mạ' : 'In Progress')
                      : (language === 'vi' ? 'Hoàn thành' : 'Completed')}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">{language === 'vi' ? 'Ngày mạ' : 'Plating Date'}:</span>
                <span className="detail-value">{selectedPlating.platingDate} {selectedPlating.platingTime}</span>
              </div>
              {selectedPlating.platingEndTime && (
                <div className="detail-row">
                  <span className="detail-label">{language === 'vi' ? 'Ngày hoàn thành' : 'Completion Date'}:</span>
                  <span className="detail-value">{formatTime(selectedPlating.platingEndTime)}</span>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button 
                className="cancel-button"
                onClick={() => {
                  setShowPlatingModal(false);
                  setSelectedPlating(null);
                }}
              >
                {language === 'vi' ? 'Đóng' : 'Close'}
              </button>
              {selectedPlating.status === 'inProcess' && (
                <button 
                  className="confirm-button"
                  onClick={handleCompletePlating}
                >
                  {language === 'vi' ? 'Hoàn thành mạ' : 'Complete Plating'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Batch Completion Alert */}
      {showCompletionAlert && recentCompletions.length > 0 && (
        <div className="batch-completion-alert">
          <div className="alert-header">
            <h6>
              <i className="fas fa-bell me-2"></i>
              {language === 'vi' ? 'Thông báo hoàn thành lô' : 'Batch Completion Alert'}
            </h6>
            <button 
              className="btn-close" 
              onClick={() => setShowCompletionAlert(false)}
            ></button>
          </div>
          <div className="alert-body">
            {recentCompletions.slice(0, 3).map(completion => (
              <div key={completion.id} className="completion-item">
                <div className="completion-icon">
                  <i className="fas fa-check-circle"></i>
                </div>
                <div className="completion-content">
                  <div className="completion-title">
                    {language === 'vi' 
                      ? `${completion.count} lô đã hoàn thành` 
                      : `${completion.count} batch(es) completed`}
                  </div>
                  <div className="completion-detail">
                    {completion.materialName} (ID: {completion.productionId})
                  </div>
                  <div className="completion-time">
                    {completion.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
            {recentCompletions.length > 3 && (
              <div className="more-completions">
                {language === 'vi' 
                  ? `+ ${recentCompletions.length - 3} thông báo khác` 
                  : `+ ${recentCompletions.length - 3} more notifications`}
              </div>
            )}
          </div>
          <div className="alert-footer">
            <button 
              className="btn btn-sm btn-light"
              onClick={() => {
                // Navigate to batches view
                // You can implement this based on your routing setup
                setShowCompletionAlert(false);
              }}
            >
              {language === 'vi' ? 'Xem lô trong kho' : 'View batches in warehouse'}
            </button>
          </div>
        </div>
      )}
      
      {/* Batch Completion Popup */}
      {showCompletionPopup && completedBatchInfo && (
        <div className="batch-completion-popup">
          <div className="popup-content">
            <div className="completion-header">
              <div className="completion-icon">
                <i className="fas fa-check-circle"></i>
              </div>
              <div className="completion-title">
                <h5>{language === 'vi' ? 'Lô đã hoàn thành!' : 'Batch Completed!'}</h5>
                <p className="completion-subtitle">
                  {language === 'vi' 
                    ? `Lô #${completedBatchInfo.batchNumber} đã hoàn thành sản xuất` 
                    : `Batch #${completedBatchInfo.batchNumber} has completed production`}
                </p>
              </div>
              <button 
                className="popup-close-btn"
                onClick={() => setShowCompletionPopup(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <div className="completion-details">
              <div className="detail-item">
                <span className="detail-label">{language === 'vi' ? 'Tên vật liệu:' : 'Material Name:'}</span>
                <span className="detail-value">{completedBatchInfo.materialName}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">{language === 'vi' ? 'Tên máy:' : 'Machine Name:'}</span>
                <span className="detail-value">{completedBatchInfo.machineName}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">{language === 'vi' ? 'Mã khuôn:' : 'Mold Code:'}</span>
                <span className="detail-value">{completedBatchInfo.moldCode}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">{language === 'vi' ? 'Thời gian hoàn thành:' : 'Completion Time:'}</span>
                <span className="detail-value">{completedBatchInfo.completionTime.toLocaleString()}</span>
              </div>
            </div>
            
            <div className="completion-actions">
              <button 
                className="btn btn-primary"
                onClick={() => {
                  setShowCompletionPopup(false);
                  // Here you can add logic to navigate to the stage warehouse view
                }}
              >
                {language === 'vi' ? 'Xem trong kho công đoạn' : 'View in Stage Warehouse'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Production;