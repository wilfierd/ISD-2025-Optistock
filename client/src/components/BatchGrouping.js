import React, { useState, useEffect } from 'react';
import Navbar from './Navbar';
import { useLogout } from '../hooks/useAuth';
import { toast } from 'react-toastify';
import { useLanguage } from '../contexts/LanguageContext';
import apiService from '../services/api';
import { useQuery } from '@tanstack/react-query';

function BatchGrouping({ user }) {
  const { t } = useLanguage();
  const logoutMutation = useLogout();

  // State for active tab
  const [activeTab, setActiveTab] = useState('ungrouped'); // 'ungrouped' or 'grouped'

  // State for batches data
  const [ungroupedBatches, setUngroupedBatches] = useState([]);
  const [groupedBatches, setGroupedBatches] = useState([]);
  const [groupedBatchesMap, setGroupedBatchesMap] = useState({});

  // State for loading and error
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // State for selected batches
  const [selectedBatches, setSelectedBatches] = useState([]);

  // State for grouping modal
  const [showGroupModal, setShowGroupModal] = useState(false);
  
  // State for QR code modal
  const [showQrModal, setShowQrModal] = useState(false);
  const [selectedBatchForQR, setSelectedBatchForQR] = useState(null);
  // State for process tracking
  const [processSteps, setProcessSteps] = useState({
    ungrouped: { count: 0, percentage: 0 },
    grouped: { count: 0, percentage: 0 },
    assembly: { count: 0, percentage: 0 },
    plating: { count: 0, percentage: 0 },
    completed: { count: 0, percentage: 0 }
  });
  // State for assembly modal
  const [showAssemblyModal, setShowAssemblyModal] = useState(false);
  const [selectedGroupForAssembly, setSelectedGroupForAssembly] = useState(null);
  const [assemblyFormData, setAssemblyFormData] = useState({
    picId: '',
    startTime: '',
    completionTime: '',
    completionTimeOption: '', // Empty string as default
    customHours: '',
    customMinutes: '',
    productQuantity: '',
    productName: '',
    productCode: '',
    notes: ''
  });

  // State for details modal
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedAssembly, setSelectedAssembly] = useState(null);

  // Get users for PIC dropdown
  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      try {
        const response = await apiService.users.getAll();
        return response.data.data || [];
      } catch (error) {
        console.error('Error fetching users:', error);
        return [];
      }
    }
  });

  // Get assemblies data
  const { data: assemblies = [], refetch: refetchAssemblies } = useQuery({
    queryKey: ['assemblies'],
    queryFn: async () => {
      try {
        const response = await apiService.assemblies?.getAll() || { data: { data: [] } };
        return response.data.data || [];
      } catch (error) {
        console.error('Error fetching assemblies:', error);
        return [];
      }
    },
    enabled: activeTab === 'grouped' // Only run when grouped tab is active
  });

  // Fetch batches data
  const fetchBatches = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch ungrouped batches
      const ungroupedResponse = await apiService.batches.getUngrouped();
      setUngroupedBatches(ungroupedResponse.data.data || []);

      // Fetch grouped batches
      const groupedResponse = await apiService.batches.getGrouped();
      const groupedData = groupedResponse.data.data || [];
      setGroupedBatches(groupedData);

      // Organize grouped batches by group number
      const batchesByGroup = {};
      
      // Filter out groups that are in plating
      const platingGroupIds = assemblies
        .filter(assembly => assembly.status === 'plating')
        .map(assembly => assembly.group_id);
      
      groupedData.forEach(batch => {
        // Skip groups that are in plating
        if (platingGroupIds.includes(parseInt(batch.group_id))) {
          return;
        }
        
        if (!batchesByGroup[batch.group_id]) {
          batchesByGroup[batch.group_id] = [];
        }
        batchesByGroup[batch.group_id].push(batch);
      });
      
      setGroupedBatchesMap(batchesByGroup);
      updateProcessSteps(ungroupedResponse.data.data || [], groupedData, assemblies);

    } catch (error) {
      console.error('Error fetching batches:', error);
      setError(error.response?.data?.error || t('failedToFetchBatches'));
    } finally {
      setIsLoading(false);
    }
  };
// Update process steps tracking data
const updateProcessSteps = (ungrouped, grouped, assemblies) => {
  const totalBatches = ungrouped.length + grouped.length;
  
  // Count batches in different stages
  const ungroupedCount = ungrouped.length;
  
  // Get unique group IDs for grouped batches
  const groupIds = [...new Set(grouped.map(batch => batch.group_id))];
  const groupedCount = groupIds.length;
  
  // Count assemblies in different states
  const assemblyCount = assemblies.filter(a => a.status === 'pending').length;
  const platingCount = assemblies.filter(a => a.status === 'plating').length;
  const completedCount = assemblies.filter(a => a.status === 'completed').length;
  
  // Calculate percentages (avoid division by zero)
  const totalSteps = totalBatches > 0 ? totalBatches : 1;
  
  setProcessSteps({
    ungrouped: { 
      count: ungroupedCount, 
      percentage: Math.round((ungroupedCount / totalSteps) * 100) 
    },
    grouped: { 
      count: groupedCount, 
      percentage: Math.round((groupedCount / totalSteps) * 100) 
    },
    assembly: { 
      count: assemblyCount, 
      percentage: Math.round((assemblyCount / totalSteps) * 100) 
    },
    plating: { 
      count: platingCount, 
      percentage: Math.round((platingCount / totalSteps) * 100) 
    },
    completed: { 
      count: completedCount, 
      percentage: Math.round((completedCount / totalSteps) * 100) 
    }
  });
};
  // Load data on component mount
  useEffect(() => {
    fetchBatches();

    // Refresh data periodically (every 30 seconds)
    const interval = setInterval(fetchBatches, 30000);

    return () => clearInterval(interval);
  }, []);

  // Update grouped batch map when assemblies changes
  useEffect(() => {
    if (assemblies.length > 0 && groupedBatches.length > 0) {
      // Filter out groups that are in plating
      const platingGroupIds = assemblies
        .filter(assembly => assembly.status === 'plating')
        .map(assembly => assembly.group_id);
      
      const batchesByGroup = {};
      groupedBatches.forEach(batch => {
        // Skip groups that are in plating
        if (platingGroupIds.includes(parseInt(batch.group_id))) {
          return;
        }
        
        if (!batchesByGroup[batch.group_id]) {
          batchesByGroup[batch.group_id] = [];
        }
        batchesByGroup[batch.group_id].push(batch);
      });
      
      setGroupedBatchesMap(batchesByGroup);
    }
  }, [assemblies, groupedBatches]);

  // Handle batch selection
  const handleBatchSelect = (batchId) => {
    setSelectedBatches(prev => {
      if (prev.includes(batchId)) {
        return prev.filter(id => id !== batchId);
      } else {
        return [...prev, batchId];
      }
    });
  };

  // Handle grouping button click
  const handleGroupClick = () => {
    if (selectedBatches.length === 0) {
      toast.error(t('pleaseSelectAtLeastOneBatch'));
      return;
    }

    setShowGroupModal(true);
  };

  // Handle confirm grouping
  const handleConfirmGrouping = async () => {
    if (selectedBatches.length === 0) {
      toast.error(t('pleaseSelectAtLeastOneBatch'));
      return;
    }

    setIsLoading(true);

    try {
      // API call to group batches
      await apiService.batches.groupBatches({
        batchIds: selectedBatches,
        status: 'Grouped for Assembly'
      });

      toast.success(t('batchesGroupedSuccessfully'));

      // Clear selected batches
      setSelectedBatches([]);

      // Close modal
      setShowGroupModal(false);

      // Refresh data
      fetchBatches();

      // Switch to grouped tab
      setActiveTab('grouped');
    } catch (error) {
      console.error('Error grouping batches:', error);
      toast.error(error.response?.data?.error || t('errorGroupingBatches'));
    } finally {
      setIsLoading(false);
    }
  };

  // Handle QR code generation
  const handleGenerateQR = (batch) => {
    setSelectedBatchForQR(batch);
    setShowQrModal(true);
  };

  // Handle showing assembly modal
  const handleAssemblyClick = (groupId) => {
    // Set default values for form
    setAssemblyFormData({
      picId: user.id, // Default to current user
      startTime: formatDateTime(new Date()),
      completionTime: '',
      completionTimeOption: '',  // Empty by default - requires selection
      customHours: '',
      customMinutes: '',
      productQuantity: calculateTotalQuantity(groupId),
      productName: '',
      productCode: '',
      notes: ''
    });

    setSelectedGroupForAssembly(groupId);
    setShowAssemblyModal(true);
  };

  // Handle assembly form input changes
  const handleAssemblyInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'completionTimeOption') {
      const now = new Date();
      let completionTime = '';
      
      switch (value) {
        case 'plus1':
          completionTime = formatDateTime(new Date(now.getTime() + 1 * 60 * 60 * 1000));
          break;
        case 'plus2':
          completionTime = formatDateTime(new Date(now.getTime() + 2 * 60 * 60 * 1000));
          break;
        case 'plus4':
          completionTime = formatDateTime(new Date(now.getTime() + 4 * 60 * 60 * 1000));
          break;
        case 'plus8':
          completionTime = formatDateTime(new Date(now.getTime() + 8 * 60 * 60 * 1000));
          break;
        case 'custom':
          // When custom is selected, let the user input hours and minutes
          completionTime = '';
          break;
        default:
          completionTime = '';
      }
      
      setAssemblyFormData(prev => ({
        ...prev,
        completionTimeOption: value,
        completionTime: completionTime
      }));
    } else if (name === 'customHours' || name === 'customMinutes') {
      // Update the custom hours or minutes
      setAssemblyFormData(prev => {
        const newData = {
          ...prev,
          [name]: value
        };
        
        // If both hours and minutes are set, calculate the completion time
        if (newData.customHours && newData.customMinutes) {
          const now = new Date();
          const hours = parseInt(newData.customHours, 10);
          const minutes = parseInt(newData.customMinutes, 10);
          
          if (!isNaN(hours) && !isNaN(minutes)) {
            const completionDate = new Date(now.getTime() + (hours * 60 * 60 * 1000) + (minutes * 60 * 1000));
            newData.completionTime = formatDateTime(completionDate);
          }
        }
        
        return newData;
      });
    } else {
      setAssemblyFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // Handle assembly form submission
  const handleAssemblySubmit = async () => {
    // Validate form
    if (!assemblyFormData.picId) {
      toast.error(t('pleaseSelectPIC'));
      return;
    }

    if (!assemblyFormData.productQuantity) {
      toast.error(t('pleaseEnterProductQuantity'));
      return;
    }

    if (!assemblyFormData.productName?.trim()) {
        toast.error(t('pleaseEnterProductName'));
        return;
    }
      
    if (!assemblyFormData.productCode?.trim()) {
        toast.error(t('pleaseEnterProductCode'));
        return;
    }
      
    
    if (!assemblyFormData.completionTimeOption) {
      toast.error(t('pleaseSelectCompletionTime'));
      return;
    }
    
    // Get final completion time
    let finalCompletionTime = assemblyFormData.completionTime;
    
    if (assemblyFormData.completionTimeOption === 'custom') {
      if (!finalCompletionTime) {
        toast.error(t('pleaseEnterCompletionTime'));
        return;
      }
    }

    try {
      // Create the assembly by calling the API
      await apiService.assemblies.create({
        groupId: selectedGroupForAssembly,
        picId: assemblyFormData.picId,
        startTime: assemblyFormData.startTime,
        completionTime: finalCompletionTime,
        productQuantity: assemblyFormData.productQuantity,
        productName: assemblyFormData.productName,
        productCode: assemblyFormData.productCode,
        notes: assemblyFormData.notes
      });

      toast.success(t('assemblyCreatedSuccessfully'));
      setShowAssemblyModal(false);
      
      // Refetch assemblies data
      refetchAssemblies();
      
      // Refresh batch data to update UI
      fetchBatches();
    } catch (error) {
      console.error('Error creating assembly:', error);
      toast.error(error.response?.data?.error || t('errorCreatingAssembly'));
    }
  };

  // Handle show details modal
  const handleShowDetails = async (assembly) => {
    try {
      // Fetch detailed assembly data including batches
      const response = await apiService.assemblies.getById(assembly.id);
      setSelectedAssembly(response.data.data);
      setShowDetailsModal(true);
    } catch (error) {
      console.error('Error fetching assembly details:', error);
      toast.error(t('errorFetchingAssemblyDetails'));
    }
  };

  // Handle proceed to plating directly without confirmation modal
  const handleProceedToPlating = async () => {
    try {
      // Call the API with current notes from the assembly details
      await apiService.assemblies.proceedToPlating(selectedAssembly.id);

      toast.success(t('successfullyProceededToPlating'));
      setShowDetailsModal(false);
      
      // Refetch assemblies data
      refetchAssemblies();
      
      // Refresh batch data
      fetchBatches();
    } catch (error) {
      console.error('Error proceeding to plating:', error);
      toast.error(error.response?.data?.error || t('errorProceedingToPlating'));
    }
  };

  // Helper to calculate total quantity for a group
  const calculateTotalQuantity = (groupId) => {
    const batches = groupedBatchesMap[groupId] || [];
    return batches.reduce((sum, batch) => sum + (parseInt(batch.quantity) || 0), 0);
  };

  // Helper to format date time string
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

  // Helper to format date string for display
  const formatDateForDisplay = (dateString) => {
    if (!dateString) return '';
    
    // Check if the date is already in our expected format
    if (dateString.includes(' - ')) {
      return dateString;
    }
    
    // Try to parse the date
    try {
      const date = new Date(dateString);
      return formatDateTime(date);
    } catch (e) {
      console.error('Error formatting date:', e);
      return dateString;
    }
  };

  // Handle logout
  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <div>
      <Navbar user={user} onLogout={handleLogout} />

      <div className="container-fluid mt-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h2>{t('batchGrouping')}</h2>
          {activeTab === 'ungrouped' && selectedBatches.length > 0 && (
            <button 
              className="btn btn-primary"
              onClick={handleGroupClick}
              disabled={isLoading}
            >
              {t('group')}
            </button>
          )}
        </div>

{/* Process Tracking Bar */}
<div className="mb-4">
          <h5 className="mb-2">{t('processProgress')}</h5>
          <div className="progress" style={{ height: '25px' }}>
            <div className="progress-bar bg-secondary" role="progressbar" 
                style={{ width: `${processSteps.ungrouped.percentage}%` }} 
                aria-valuenow={processSteps.ungrouped.percentage} aria-valuemin="0" aria-valuemax="100">
              {t('ungrouped')} ({processSteps.ungrouped.count})
            </div>
            <div className="progress-bar bg-primary" role="progressbar" 
                style={{ width: `${processSteps.grouped.percentage}%` }} 
                aria-valuenow={processSteps.grouped.percentage} aria-valuemin="0" aria-valuemax="100">
              {t('grouped')} ({processSteps.grouped.count})
            </div>
            <div className="progress-bar bg-info" role="progressbar" 
                style={{ width: `${processSteps.assembly.percentage}%` }} 
                aria-valuenow={processSteps.assembly.percentage} aria-valuemin="0" aria-valuemax="100">
              {t('assembly')} ({processSteps.assembly.count})
            </div>
            <div className="progress-bar bg-warning" role="progressbar" 
                style={{ width: `${processSteps.plating.percentage}%` }} 
                aria-valuenow={processSteps.plating.percentage} aria-valuemin="0" aria-valuemax="100">
              {t('plating')} ({processSteps.plating.count})
            </div>
            <div className="progress-bar bg-success" role="progressbar" 
                style={{ width: `${processSteps.completed.percentage}%` }} 
                aria-valuenow={processSteps.completed.percentage} aria-valuemin="0" aria-valuemax="100">
              {t('completed')} ({processSteps.completed.count})
            </div>
          </div>
        </div>
        {/* Tabs */}
        <ul className="nav nav-tabs mb-3">
          <li className="nav-item">
            <button 
              className={`nav-link ${activeTab === 'ungrouped' ? 'active bg-light' : ''}`} 
              onClick={() => setActiveTab('ungrouped')}
            >
              {t('ungroupedBatches')}
            </button>
          </li>
          <li className="nav-item">
            <button 
              className={`nav-link ${activeTab === 'grouped' ? 'active bg-light' : ''}`} 
              onClick={() => setActiveTab('grouped')}
            >
              {t('groupedBatches')}
            </button>
          </li>
        </ul>

        {/* Error Message */}
        {error && (
          <div className="alert alert-danger">
            {error}
          </div>
        )}

        {/* Ungrouped Batches Tab */}
        {activeTab === 'ungrouped' && (
          <div className="custom-table-container">
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th width="5%"></th>
                    <th>{t('partName')}</th>
                    <th>{t('machineName')}</th>
                    <th>{t('moldCode')}</th>
                    <th>{t('quantity')}</th>
                    <th>{t('warehouseEntryTime')}</th>
                    <th width="5%"></th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading && ungroupedBatches.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center py-3">
                        <div className="spinner-border text-primary" role="status">
                          <span className="visually-hidden">{t('loading')}</span>
                        </div>
                      </td>
                    </tr>
                  ) : ungroupedBatches.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center py-3">
                        {t('noUngroupedBatches')}
                      </td>
                    </tr>
                  ) : (
                    ungroupedBatches.map(batch => (
                      <tr key={batch.id}>
                        <td>
                          <input 
                            type="checkbox" 
                            className="form-check-input" 
                            checked={selectedBatches.includes(batch.id)}
                            onChange={() => handleBatchSelect(batch.id)}
                          />
                        </td>
                        <td>{batch.part_name}</td>
                        <td>{batch.machine_name}</td>
                        <td>{batch.mold_code}</td>
                        <td>{batch.quantity}</td>
                        <td>{batch.warehouse_entry_time}</td>
                        <td>
                          <button 
                            className="btn btn-sm" 
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent row click
                              handleGenerateQR(batch);
                            }}
                            title={t('generateQRCode')}
                          >
                            <i className="fas fa-qrcode"></i>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Grouped Batches Tab */}
        {activeTab === 'grouped' && (
          <div className="custom-table-container">
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th width="5%">{t('groupNo')}</th>
                    <th>{t('partName')}</th>
                    <th>{t('machineName')}</th>
                    <th>{t('moldCode')}</th>
                    <th>{t('quantity')}</th>
                    <th>{t('warehouseEntryTime')}</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading && Object.keys(groupedBatchesMap).length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center py-3">
                        <div className="spinner-border text-primary" role="status">
                          <span className="visually-hidden">{t('loading')}</span>
                        </div>
                      </td>
                    </tr>
                  ) : Object.keys(groupedBatchesMap).length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center py-3">
                        {t('noGroupedBatches')}
                      </td>
                    </tr>
                  ) : (
                    Object.entries(groupedBatchesMap).map(([groupId, batches]) => {
                      // Check if group has an existing assembly process
                      const existingAssembly = assemblies.find(a => a.group_id === parseInt(groupId));
                      
                      return (
                        <React.Fragment key={groupId}>
                          {/* Group Header Row */}
                          <tr className="table-primary">
                            <td colSpan="6" className="text-start">
                              <strong>{t('group')} #{groupId}</strong>
                            </td>
                          </tr>

                          {/* Batch Rows */}
                          {batches.map((batch, index) => (
                            <tr key={batch.id}>
                              <td>{groupId}</td>
                              <td>{batch.part_name}</td>
                              <td>{batch.machine_name}</td>
                              <td>{batch.mold_code}</td>
                              <td>{batch.quantity}</td>
                              <td>{batch.warehouse_entry_time}</td>
                            </tr>
                          ))}

                          {/* Group Action Row */}
                          <tr className="table-secondary">
                            <td colSpan="6" className="text-end">
                              {/* Always show Lắp ráp button, but disabled if there's an existing assembly */}
                              <button
                                className={`btn btn-success btn-sm me-2 ${existingAssembly ? 'disabled' : ''}`}
                                onClick={() => !existingAssembly && handleAssemblyClick(groupId)}
                                style={{ opacity: existingAssembly ? 0.6 : 1 }}
                              >
                                {t('assembly')}
                              </button>
                              
                              {/* Show Chi tiết button only if there's an existing assembly */}
                              {existingAssembly && (
                                <button
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => handleShowDetails(existingAssembly)}
                                >
                                  {t('details')}
                                </button>
                              )}
                            </td>
                          </tr>

                          {/* Empty row for spacing between groups */}
                          <tr className="table-light">
                            <td colSpan="6" style={{ height: '10px' }}></td>
                          </tr>
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Grouping Confirmation Modal */}
      {showGroupModal && (
        <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title">{t('confirmGrouping')}</h5>
                <button 
                  type="button" 
                  className="btn-close btn-close-white"
                  onClick={() => setShowGroupModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <p>{t('confirmGroupingMessage')}</p>
                <p><strong>{t('selectedBatchesCount')}:</strong> <span className="text-primary">{selectedBatches.length}</span></p>
                <p>{t('afterGroupingStatus')}</p>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowGroupModal(false)}
                  disabled={isLoading}
                >
                  {t('cancel')}
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  onClick={handleConfirmGrouping}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      {t('processing')}
                    </>
                  ) : (
                    t('confirm')
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Backdrop */}
      {showGroupModal && (
        <div 
          className="modal-backdrop fade show"
          onClick={() => !isLoading && setShowGroupModal(false)}
        ></div>
      )}

      {/* QR Code Modal */}
      {showQrModal && selectedBatchForQR && (
        <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title">
                  {t('batchQRCode')}: {selectedBatchForQR.part_name}
                </h5>
                <button 
                  type="button" 
                  className="btn-close btn-close-white" 
                  onClick={() => {
                    setShowQrModal(false);
                    setSelectedBatchForQR(null);
                  }}
                ></button>
              </div>
              <div className="modal-body text-center">
                <p>{t('scanQRCode')}</p>
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(JSON.stringify({
                    id: selectedBatchForQR.id,
                    part_name: selectedBatchForQR.part_name,
                    machine_name: selectedBatchForQR.machine_name,
                    mold_code: selectedBatchForQR.mold_code,
                    quantity: selectedBatchForQR.quantity,
                    warehouse_entry_time: selectedBatchForQR.warehouse_entry_time
                  }))}`}
                  alt="QR Code"
                  className="img-fluid mb-3 border p-2"
                  style={{ maxWidth: '250px' }}
                />
                <div className="text-muted mt-3">
                  <div className="card">
                    <div className="card-header bg-light">
                      <h6 className="mb-0">{t('batchDetails')}</h6>
                    </div>
                    <div className="card-body">
                      <table className="table table-sm table-borderless">
                        <tbody>
                          <tr>
                            <th style={{width: "40%"}}>{t('partName')}:</th>
                            <td>{selectedBatchForQR.part_name}</td>
                          </tr>
                          <tr>
                            <th>{t('machineName')}:</th>
                            <td>{selectedBatchForQR.machine_name}</td>
                          </tr>
                          <tr>
                            <th>{t('moldCode')}:</th>
                            <td>{selectedBatchForQR.mold_code}</td>
                          </tr>
                          <tr>
                            <th>{t('quantity')}:</th>
                            <td>{selectedBatchForQR.quantity}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => {
                    setShowQrModal(false);
                    setSelectedBatchForQR(null);
                  }}
                >
                  {t('close')}
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    // Print functionality
                    const printWindow = window.open('', '_blank');
                    printWindow.document.write(`
                      <html>
                      <head>
                        <title>${t('batchQRCode')}: ${selectedBatchForQR.part_name}</title>
                        <style>
                          body { font-family: Arial, sans-serif; margin: 20px; text-align: center; }
                          h2 { color: #0a4d8c; }
                          .batch-info { margin: 20px 0; }
                          .qr-code { max-width: 300px; margin: 20px auto; border: 1px solid #ddd; padding: 10px; }
                          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                          table th, table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                          table th { background-color: #f2f2f2; width: 40%; }
                        </style>
                      </head>
                      <body>
                        <h2>${t('batchQRCode')}</h2>
                        <div class="batch-info">
                          <h3>${selectedBatchForQR.part_name}</h3>
                          <table>
                            <tr>
                              <th>${t('partName')}</th>
                              <td>${selectedBatchForQR.part_name}</td>
                            </tr>
                            <tr>
                              <th>${t('machineName')}</th>
                              <td>${selectedBatchForQR.machine_name}</td>
                            </tr>
                            <tr>
                              <th>${t('moldCode')}</th>
                              <td>${selectedBatchForQR.mold_code}</td>
                            </tr>
                            <tr>
                              <th>${t('quantity')}</th>
                              <td>${selectedBatchForQR.quantity}</td>
                            </tr>
                            <tr>
                              <th>${t('warehouseEntryTime')}</th>
                              <td>${selectedBatchForQR.warehouse_entry_time}</td>
                            </tr>
                          </table>
                        </div>
                        <img src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(JSON.stringify({
                          id: selectedBatchForQR.id,
                          part_name: selectedBatchForQR.part_name,
                          machine_name: selectedBatchForQR.machine_name,
                          mold_code: selectedBatchForQR.mold_code,
                          quantity: selectedBatchForQR.quantity,
                          warehouse_entry_time: selectedBatchForQR.warehouse_entry_time
                        }))}" class="qr-code" />
                      </body>
                      </html>
                    `);
                    printWindow.document.close();
                    setTimeout(() => {
                      printWindow.print();
                    }, 300);
                  }}
                >
                  {t('print')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal Backdrop */}
      {showQrModal && (
        <div 
          className="modal-backdrop fade show"
          onClick={() => {
            setShowQrModal(false);
            setSelectedBatchForQR(null);
          }}
        ></div>
      )}

      {/* Assembly Modal - With notes field */}
      {showAssemblyModal && (
        <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title">{t('confirmAssembly')}</h5>
                <button 
                  type="button" 
                  className="btn-close btn-close-white" 
                  onClick={() => setShowAssemblyModal(false)}
                ></button>
              </div>
              <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                <div className="card mb-3">
                  <div className="card-header bg-light">
                    <h6 className="mb-0 fw-bold">{t('basicAssemblyInfo')}</h6>
                  </div>
                  <div className="card-body">
                    <div className="mb-3">
                      <label htmlFor="picId" className="form-label fw-bold">{t('pleaseEnterPIC')}</label>
                      <select
                        id="picId"
                        name="picId"
                        className="form-select"
                        value={assemblyFormData.picId}
                        onChange={handleAssemblyInputChange}
                      >
                        <option value="">{t('selectPIC')}</option>
                        {users.map(user => (
                          <option key={user.id} value={user.id}>{user.username}</option>
                        ))}
                      </select>
                    </div>
                    <div className="mb-3">
                      <label htmlFor="startTime" className="form-label fw-bold">{t('startTime')}</label>
                      <input
                        type="text"
                        className="form-control"
                        id="startTime"
                        name="startTime"
                        value={assemblyFormData.startTime}
                        readOnly
                      />
                      <small className="form-text text-muted">{t('currentTime')}</small>
                    </div>
                    
                    {/* Improved completion time selection */}
                    <div className="mb-3">
                      <label htmlFor="completionTimeOption" className="form-label fw-bold">{t('completionTime')}</label>
                      <select
                        id="completionTimeOption"
                        name="completionTimeOption"
                        className="form-select mb-2"
                        value={assemblyFormData.completionTimeOption}
                        onChange={handleAssemblyInputChange}
                        required
                      >
                        <option value="">{t('pleaseSelectCompletionTime')}</option>
                        <option value="plus1">{t('plus1Hour')}</option>
                        <option value="plus2">{t('plus2Hours')}</option>
                        <option value="plus4">{t('plus4Hours')}</option>
                        <option value="plus8">{t('plus8Hours')}</option>
                        <option value="custom">{t('custom')}</option>
                      </select>
                      
                      {/* Custom time inputs - show when custom option is selected */}
                      {assemblyFormData.completionTimeOption === 'custom' && (
                        <div className="row">
                          <div className="col-6">
                            <div className="input-group mb-2">
                              <input
                                type="number"
                                className="form-control"
                                placeholder={t('hours')}
                                name="customHours"
                                min="0"
                                max="24"
                                value={assemblyFormData.customHours}
                                onChange={handleAssemblyInputChange}
                              />
                              <span className="input-group-text">{t('hours')}</span>
                            </div>
                          </div>
                          <div className="col-6">
                            <div className="input-group mb-2">
                              <input
                                type="number"
                                className="form-control"
                                placeholder={t('minutes')}
                                name="customMinutes"
                                min="0"
                                max="59"
                                value={assemblyFormData.customMinutes}
                                onChange={handleAssemblyInputChange}
                              />
                              <span className="input-group-text">{t('minutes')}</span>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Display estimated completion time */}
                      {assemblyFormData.completionTime && (
                        <div className="form-text">
                          {t('estimatedCompletionTime')}: <strong>{assemblyFormData.completionTime}</strong>
                        </div>
                      )}
                    </div>
                    
                    <div className="mb-3">
                      <label htmlFor="productQuantity" className="form-label fw-bold">{t('productQuantity')}</label>
                      <input
                        type="number"
                        className="form-control"
                        id="productQuantity"
                        name="productQuantity"
                        value={assemblyFormData.productQuantity}
                        onChange={handleAssemblyInputChange}
                      />
                    </div>
                  </div>
                </div>

                <div className="card mb-3">
                  <div className="card-header bg-light">
                    <h6 className="mb-0 fw-bold">{t('productInfoAfterAssembly')}</h6>
                  </div>
                  <div className="card-body">
                    <div className="mb-3">
                      <label htmlFor="productName" className="form-label fw-bold">{t('productName')}:</label>
                      <input
                        type="text"
                        className="form-control"
                        id="productName"
                        name="productName"
                        value={assemblyFormData.productName}
                        onChange={handleAssemblyInputChange}
                        placeholder={t('enterProductName')}
                      />
                    </div>
                    <div className="mb-3">
                      <label htmlFor="productCode" className="form-label fw-bold">{t('productCode')}:</label>
                      <input
                        type="text"
                        className="form-control"
                        id="productCode"
                        name="productCode"
                        value={assemblyFormData.productCode}
                        onChange={handleAssemblyInputChange}
                        placeholder={t('enterProductCode')}
                      />
                    </div>
                    <div className="mb-3">
                      <label htmlFor="notes" className="form-label fw-bold">{t('notes')}:</label>
                      <textarea
                        className="form-control"
                        id="notes"
                        name="notes"
                        rows="3"
                        value={assemblyFormData.notes}
                        onChange={handleAssemblyInputChange}
                        placeholder={t('enterNotes')}
                      ></textarea>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowAssemblyModal(false)}
                >
                  {t('cancel')}
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  onClick={handleAssemblySubmit}
                >
                  {t('confirm')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assembly Modal Backdrop */}
      {showAssemblyModal && (
        <div 
          className="modal-backdrop fade show"
          onClick={() => setShowAssemblyModal(false)}
        ></div>
      )}

      {/* Details Modal - Cải tiến với maxHeight và scrollable */}
      {showDetailsModal && selectedAssembly && (
        <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title">{t('groupDetails', {groupId: selectedAssembly.group_id})}</h5>
                <button 
                  type="button" 
                  className="btn-close btn-close-white" 
                  onClick={() => setShowDetailsModal(false)}
                ></button>
              </div>
              <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                {/* Thông tin lắp ráp - vertical layout */}
                <div className="card mb-3">
                  <div className="card-header bg-light">
                    <h6 className="mb-0 fw-bold">{t('assemblyInfo')}</h6>
                  </div>
                  <div className="card-body">
                    <p><strong>{t('startTime')}:</strong> <span className="text-primary">{formatDateForDisplay(selectedAssembly.start_time)}</span></p>
                    <p><strong>{t('completionTime')}:</strong> <span className="text-primary">{formatDateForDisplay(selectedAssembly.completion_time)}</span></p>
                    <p><strong>{t('productQuantity')}:</strong> <span className="text-primary">{selectedAssembly.product_quantity || '0'}</span></p>
                    <p><strong>{t('PIC')}:</strong> <span className="text-primary">{selectedAssembly.pic_name || 'N/A'}</span></p>
                    <p><strong>{t('status')}:</strong> <span className={`badge ${selectedAssembly.status === 'completed' ? 'bg-success' : selectedAssembly.status === 'processing' ? 'bg-success' : 'bg-warning'}`}>{selectedAssembly.status}</span></p>
                  </div>
                </div>
                
                {/* Thông tin sản phẩm sau lắp ráp */}
                <div className="card mb-3">
                  <div className="card-header bg-light">
                    <h6 className="mb-0 fw-bold">{t('productInfoAfterAssembly')}</h6>
                  </div>
                  <div className="card-body">
                    <p><strong>{t('productName')}:</strong> <span className="text-primary">{selectedAssembly.product_name || t('noProductName')}</span></p>
                    <p><strong>{t('productCode')}:</strong> <span className="text-primary">{selectedAssembly.product_code || t('noProductCode')}</span></p>
                  </div>
                </div>
                
                {/* Thành phần tình hiện */}
                <div className="card mb-3">
                  <div className="card-header bg-light">
                    <h6 className="mb-0 fw-bold">{t('assemblyComponents')}</h6>
                  </div>
                  <div className="card-body p-0">
                    <div className="table-responsive">
                      <table className="table table-sm table-striped mb-0">
                        <thead>
                          <tr>
                            <th>{t('partName')}</th>
                            <th>{t('machineName')}</th>
                            <th>{t('moldCode')}</th>
                            <th className="text-end">{t('quantity')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedAssembly.batches?.map(batch => (
                            <tr key={batch.id}>
                              <td>{batch.part_name}</td>
                              <td>{batch.machine_name}</td>
                              <td>{batch.mold_code}</td>
                              <td className="text-end">{batch.quantity}</td>
                            </tr>
                          )) || (
                            <tr>
                              <td colSpan="4" className="text-center">{t('noData')}</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
                
                {/* Ghi chú - chỉ hiển thị nội dung, không cho phép chỉnh sửa */}
                <div className="card mb-3">
                  <div className="card-header bg-light">
                    <h6 className="mb-0 fw-bold">{t('notes')}</h6>
                  </div>
                  <div className="card-body">
                    {selectedAssembly.notes ? (
                      <div className="p-2 bg-light rounded">
                        {selectedAssembly.notes}
                      </div>
                    ) : (
                      <div className="text-muted fst-italic">
                        {t('noNotes')}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowDetailsModal(false)}
                >
                  {t('close')}
                </button>
                {selectedAssembly.status !== 'plating' && (
                  <button 
                    type="button" 
                    className="btn btn-primary" 
                    onClick={handleProceedToPlating}
                  >
                    {t('finishAndProceedToPlating')}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal Backdrop */}
      {showDetailsModal && (
        <div 
          className="modal-backdrop fade show"
          onClick={() => setShowDetailsModal(false)}
        ></div>
      )}
    </div>
  );
}

export default BatchGrouping;