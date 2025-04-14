// client/src/components/Production.js
import React, { useState, useEffect, useRef } from 'react';
import Navbar from './Navbar';
import { useLogout } from '../hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMaterials } from '../hooks/useMaterials';
import apiService from '../services/api';
import { toast } from 'react-toastify';
import './Production.css';
import { useLanguage } from '../contexts/LanguageContext';

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

function Production({ user }) {
  const { t, language } = useLanguage();
  const queryClient = useQueryClient();
  const scanInputRef = useRef(null);
  
  // State for active tab and filters
  const [activeTab, setActiveTab] = useState('production');
  const [productionFilter, setProductionFilter] = useState('all');
  
  // State for modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showStopReasonModal, setShowStopReasonModal] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [stopReason, setStopReason] = useState('');
  const [stopTime, setStopTime] = useState('');
  const [stopDate, setStopDate] = useState('');
  const [scannedInput, setScannedInput] = useState('');
  
  // State for current step in add wizard
  const [currentStep, setCurrentStep] = useState(1);
  
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
  const { data: materials = [], isLoading: isLoadingMaterials } = useMaterials();
  const { data: productions = [], isLoading: isLoadingProductions } = useProduction(productionFilter);
  const { data: machines = [], isLoading: isLoadingMachines } = useQuery({
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
  const { data: molds = [], isLoading: isLoadingMolds } = useQuery({
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
  
  // Set up scanner input listener
  useEffect(() => {
    // Focus the input field when modal is opened
    if (showAddModal && scanInputRef.current) {
      scanInputRef.current.focus();
    }
  }, [showAddModal, currentStep]);
  
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
  
  // Set current date/time for stop form fields
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
  }, [showStopReasonModal]);
  
  // Handle tab changes
  const handleTabChange = (tab) => {
    setActiveTab(tab);
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
  
  // Handle logout
  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <div className="production-container">
      <Navbar user={user} onLogout={handleLogout} />
      
      <div className="content-wrapper">
        <div className="header-section">
          <h1>{language === 'vi' ? 'Danh sách lô sản xuất' : 'Production Management'}</h1>
          <button className="add-button" onClick={handleAddBatch}>
            {language === 'vi' ? 'Tạo lô mới' : 'New Production Batch'}
          </button>
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
            className={`tab ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => handleTabChange('history')}
          >
            {language === 'vi' ? 'Danh sách mạ' : 'History'}
          </button>
        </div>
        
        {/* Production Table */}
        <div className="table-container">
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
                      <td>{production.expected_output}</td>
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
                    <td colSpan="6" className="no-data">
                      {language === 'vi' ? 'Không tìm thấy lô sản xuất nào' : 'No production batches found'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
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
                  <div className="scanner-input-container">
                    <label>{language === 'vi' ? 'Quét mã vạch' : 'Scan Barcode'}</label>
                    <input
                      type="text"
                      ref={scanInputRef}
                      value={scannedInput}
                      onChange={(e) => setScannedInput(e.target.value)}
                      onKeyDown={handleScannerInput}
                      placeholder={language === 'vi' ? 'Quét mã vạch máy hoặc khuôn...' : 'Scan machine or mold barcode...'}
                      className="scanner-input"
                    />
                  </div>
                  
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
    </div>
  );
}

export default Production;