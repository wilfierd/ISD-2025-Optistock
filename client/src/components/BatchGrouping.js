<<<<<<< HEAD
=======
// client/src/components/BatchGrouping.js
>>>>>>> aa9def0e9889a298cfcbf130f8a2853fda497849
import React, { useState, useEffect } from 'react';
import Navbar from './Navbar';
import { useLogout } from '../hooks/useAuth';
import { toast } from 'react-toastify';
import { useLanguage } from '../contexts/LanguageContext';
import apiService from '../services/api';
<<<<<<< HEAD
import { useQuery } from '@tanstack/react-query';
=======
>>>>>>> aa9def0e9889a298cfcbf130f8a2853fda497849

function BatchGrouping({ user }) {
  const { t } = useLanguage();
  const logoutMutation = useLogout();
<<<<<<< HEAD

  // State for active tab
  const [activeTab, setActiveTab] = useState('ungrouped'); // 'ungrouped' or 'grouped'

=======
  
  // State for active tab
  const [activeTab, setActiveTab] = useState('ungrouped'); // 'ungrouped' or 'grouped'
  
>>>>>>> aa9def0e9889a298cfcbf130f8a2853fda497849
  // State for batches data
  const [ungroupedBatches, setUngroupedBatches] = useState([]);
  const [groupedBatches, setGroupedBatches] = useState([]);
  const [groupedBatchesMap, setGroupedBatchesMap] = useState({});
<<<<<<< HEAD

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

  // State for assembly modal
  const [showAssemblyModal, setShowAssemblyModal] = useState(false);
  const [selectedGroupForAssembly, setSelectedGroupForAssembly] = useState(null);
  const [assemblyFormData, setAssemblyFormData] = useState({
    picId: '',
    startTime: '',
    completionTime: '',
    completionTimeOption: '',
    productQuantity: ''
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

=======
  
  // State for loading and error
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // State for selected batches
  const [selectedBatches, setSelectedBatches] = useState([]);
  
  // State for grouping modal
  const [showGroupModal, setShowGroupModal] = useState(false);
  
>>>>>>> aa9def0e9889a298cfcbf130f8a2853fda497849
  // Fetch batches data
  const fetchBatches = async () => {
    setIsLoading(true);
    setError(null);
<<<<<<< HEAD

=======
    
>>>>>>> aa9def0e9889a298cfcbf130f8a2853fda497849
    try {
      // Fetch ungrouped batches
      const ungroupedResponse = await apiService.batches.getUngrouped();
      setUngroupedBatches(ungroupedResponse.data.data || []);
<<<<<<< HEAD

=======
      
>>>>>>> aa9def0e9889a298cfcbf130f8a2853fda497849
      // Fetch grouped batches
      const groupedResponse = await apiService.batches.getGrouped();
      const groupedData = groupedResponse.data.data || [];
      setGroupedBatches(groupedData);
<<<<<<< HEAD

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
        
=======
      
      // Organize grouped batches by group number
      const batchesByGroup = {};
      groupedData.forEach(batch => {
>>>>>>> aa9def0e9889a298cfcbf130f8a2853fda497849
        if (!batchesByGroup[batch.group_id]) {
          batchesByGroup[batch.group_id] = [];
        }
        batchesByGroup[batch.group_id].push(batch);
      });
<<<<<<< HEAD
      
      setGroupedBatchesMap(batchesByGroup);
    } catch (error) {
      console.error('Error fetching batches:', error);
      setError(error.response?.data?.error || t('failedToFetchBatches'));
=======
      setGroupedBatchesMap(batchesByGroup);
    } catch (error) {
      console.error('Error fetching batches:', error);
      setError(error.response?.data?.error || 'Failed to fetch batches');
>>>>>>> aa9def0e9889a298cfcbf130f8a2853fda497849
    } finally {
      setIsLoading(false);
    }
  };
<<<<<<< HEAD

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

=======
  
  // Load data on component mount
  useEffect(() => {
    fetchBatches();
    
    // Refresh data periodically (every 30 seconds)
    const interval = setInterval(fetchBatches, 30000);
    
    return () => clearInterval(interval);
  }, []);
  
>>>>>>> aa9def0e9889a298cfcbf130f8a2853fda497849
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
<<<<<<< HEAD

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

=======
  
  // Handle grouping button click
  const handleGroupClick = () => {
    if (selectedBatches.length === 0) {
      toast.error(t('Vui lòng chọn ít nhất một lô để nhóm'));
      return;
    }
    
    setShowGroupModal(true);
  };
  
  // Handle confirm grouping
  const handleConfirmGrouping = async () => {
    if (selectedBatches.length === 0) {
      toast.error(t('Vui lòng chọn ít nhất một lô để nhóm'));
      return;
    }
    
    setIsLoading(true);
    
>>>>>>> aa9def0e9889a298cfcbf130f8a2853fda497849
    try {
      // API call to group batches
      await apiService.batches.groupBatches({
        batchIds: selectedBatches,
        status: 'Grouped for Assembly'
      });
<<<<<<< HEAD

      toast.success(t('batchesGroupedSuccessfully'));

      // Clear selected batches
      setSelectedBatches([]);

      // Close modal
      setShowGroupModal(false);

      // Refresh data
      fetchBatches();

=======
      
      toast.success(t('Các lô đã được nhóm thành công'));
      
      // Clear selected batches
      setSelectedBatches([]);
      
      // Close modal
      setShowGroupModal(false);
      
      // Refresh data
      fetchBatches();
      
>>>>>>> aa9def0e9889a298cfcbf130f8a2853fda497849
      // Switch to grouped tab
      setActiveTab('grouped');
    } catch (error) {
      console.error('Error grouping batches:', error);
<<<<<<< HEAD
      toast.error(error.response?.data?.error || t('errorGroupingBatches'));
=======
      toast.error(error.response?.data?.error || t('Có lỗi xảy ra khi nhóm các lô'));
>>>>>>> aa9def0e9889a298cfcbf130f8a2853fda497849
    } finally {
      setIsLoading(false);
    }
  };
<<<<<<< HEAD

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
      completionTimeOption: 'plus4', // Default option
      productQuantity: calculateTotalQuantity(groupId)
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
    } else if (name === 'customCompletionTime') {
      setAssemblyFormData(prev => ({
        ...prev,
        completionTime: value
      }));
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
    
    // Get final completion time
    let finalCompletionTime = assemblyFormData.completionTime;
    
    if (assemblyFormData.completionTimeOption === 'custom' && !finalCompletionTime) {
      toast.error(t('pleaseEnterCompletionTime'));
      return;
    }

    try {
      // Create the assembly by calling the API
      await apiService.assemblies.create({
        groupId: selectedGroupForAssembly,
        picId: assemblyFormData.picId,
        startTime: assemblyFormData.startTime,
        completionTime: finalCompletionTime,
        productQuantity: assemblyFormData.productQuantity
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
  const handleShowDetails = (assembly) => {
    setSelectedAssembly(assembly);
    setShowDetailsModal(true);
  };

  // Handle plating directly without confirmation
  const handleProceedToPlating = async () => {
    try {
      // Call the API directly without showing confirmation modal
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

=======
  
>>>>>>> aa9def0e9889a298cfcbf130f8a2853fda497849
  // Handle logout
  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <div>
      <Navbar user={user} onLogout={handleLogout} />

      <div className="container-fluid mt-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
<<<<<<< HEAD
          <h2>{t('batchGrouping')}</h2>
=======
          <h2>{t('Nhóm lô linh kiện')}</h2>
>>>>>>> aa9def0e9889a298cfcbf130f8a2853fda497849
          {activeTab === 'ungrouped' && selectedBatches.length > 0 && (
            <button 
              className="btn btn-primary"
              onClick={handleGroupClick}
              disabled={isLoading}
            >
<<<<<<< HEAD
              {t('group')}
            </button>
          )}
        </div>

=======
              {t('Nhóm')}
            </button>
          )}
        </div>
        
>>>>>>> aa9def0e9889a298cfcbf130f8a2853fda497849
        {/* Progress Bar Placeholder */}
        <div className="mb-3 text-muted small">
          &lt;Progression Bar&gt; (COMING soon)
        </div>
<<<<<<< HEAD

=======
        
>>>>>>> aa9def0e9889a298cfcbf130f8a2853fda497849
        {/* Tabs */}
        <ul className="nav nav-tabs mb-3">
          <li className="nav-item">
            <button 
              className={`nav-link ${activeTab === 'ungrouped' ? 'active bg-light' : ''}`} 
              onClick={() => setActiveTab('ungrouped')}
            >
<<<<<<< HEAD
              {t('ungroupedBatches')}
=======
              {t('Lô linh kiện chưa nhóm')}
>>>>>>> aa9def0e9889a298cfcbf130f8a2853fda497849
            </button>
          </li>
          <li className="nav-item">
            <button 
              className={`nav-link ${activeTab === 'grouped' ? 'active bg-light' : ''}`} 
              onClick={() => setActiveTab('grouped')}
            >
<<<<<<< HEAD
              {t('groupedBatches')}
            </button>
          </li>
        </ul>

=======
              {t('Lô linh kiện đã nhóm')}
            </button>
          </li>
        </ul>
        
>>>>>>> aa9def0e9889a298cfcbf130f8a2853fda497849
        {/* Error Message */}
        {error && (
          <div className="alert alert-danger">
            {error}
          </div>
        )}
<<<<<<< HEAD

=======
        
>>>>>>> aa9def0e9889a298cfcbf130f8a2853fda497849
        {/* Ungrouped Batches Tab */}
        {activeTab === 'ungrouped' && (
          <div className="custom-table-container">
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th width="5%"></th>
<<<<<<< HEAD
                    <th>{t('partName')}</th>
                    <th>{t('machineName')}</th>
                    <th>{t('moldCode')}</th>
                    <th>{t('quantity')}</th>
                    <th>{t('warehouseEntryTime')}</th>
                    <th width="5%"></th>
=======
                    <th>{t('Part name')}</th>
                    <th>{t('Tên máy dập')}</th>
                    <th>{t('Mã khuôn')}</th>
                    <th>{t('Số lượng')}</th>
                    <th>{t('Thời gian nhập kho')}</th>
>>>>>>> aa9def0e9889a298cfcbf130f8a2853fda497849
                  </tr>
                </thead>
                <tbody>
                  {isLoading && ungroupedBatches.length === 0 ? (
                    <tr>
<<<<<<< HEAD
                      <td colSpan="7" className="text-center py-3">
=======
                      <td colSpan="6" className="text-center py-3">
>>>>>>> aa9def0e9889a298cfcbf130f8a2853fda497849
                        <div className="spinner-border text-primary" role="status">
                          <span className="visually-hidden">{t('loading')}</span>
                        </div>
                      </td>
                    </tr>
                  ) : ungroupedBatches.length === 0 ? (
                    <tr>
<<<<<<< HEAD
                      <td colSpan="7" className="text-center py-3">
                        {t('noUngroupedBatches')}
=======
                      <td colSpan="6" className="text-center py-3">
                        {t('Không có lô linh kiện nào chưa được nhóm')}
>>>>>>> aa9def0e9889a298cfcbf130f8a2853fda497849
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
<<<<<<< HEAD
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
=======
>>>>>>> aa9def0e9889a298cfcbf130f8a2853fda497849
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
<<<<<<< HEAD

=======
        
>>>>>>> aa9def0e9889a298cfcbf130f8a2853fda497849
        {/* Grouped Batches Tab */}
        {activeTab === 'grouped' && (
          <div className="custom-table-container">
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
<<<<<<< HEAD
                    <th width="5%">{t('groupNo')}</th>
                    <th>{t('partName')}</th>
                    <th>{t('machineName')}</th>
                    <th>{t('moldCode')}</th>
                    <th>{t('quantity')}</th>
                    <th>{t('warehouseEntryTime')}</th>
=======
                    <th width="5%">{t('STT')}</th>
                    <th>{t('Part name')}</th>
                    <th>{t('Tên máy dập')}</th>
                    <th>{t('Mã khuôn')}</th>
                    <th>{t('Số lượng')}</th>
                    <th>{t('Thời gian nhập kho')}</th>
>>>>>>> aa9def0e9889a298cfcbf130f8a2853fda497849
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
<<<<<<< HEAD
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
=======
                        {t('Không có lô linh kiện nào đã được nhóm')}
                      </td>
                    </tr>
                  ) : (
                    Object.entries(groupedBatchesMap).map(([groupId, batches]) => (
                      <React.Fragment key={groupId}>
                        {/* Group Header Row */}
                        <tr className="table-primary">
                          <td colSpan="6" className="text-start">
                            <strong>{t('Nhóm')} #{groupId}</strong>
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
                        
                        {/* Empty row for spacing between groups */}
                        <tr className="table-light">
                          <td colSpan="6" style={{ height: '10px' }}></td>
                        </tr>
                      </React.Fragment>
                    ))
>>>>>>> aa9def0e9889a298cfcbf130f8a2853fda497849
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
              <div className="modal-header">
<<<<<<< HEAD
                <h5 className="modal-title">{t('confirmGrouping')}</h5>
=======
                <h5 className="modal-title">{t('Xác nhận nhóm lô')}</h5>
>>>>>>> aa9def0e9889a298cfcbf130f8a2853fda497849
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowGroupModal(false)}
                ></button>
              </div>
              <div className="modal-body">
<<<<<<< HEAD
                <p>{t('confirmGroupingMessage')}</p>
                <p>{t('selectedBatchesCount')}: <strong>{selectedBatches.length}</strong></p>
                <p>{t('afterGroupingStatus')}</p>
=======
                <p>{t('Bạn có chắc chắn muốn nhóm các lô đã chọn?')}</p>
                <p>{t('Số lô đã chọn')}: <strong>{selectedBatches.length}</strong></p>
                <p>{t('Sau khi nhóm, trạng thái của các lô sẽ được cập nhật thành "Grouped for Assembly"')}</p>
>>>>>>> aa9def0e9889a298cfcbf130f8a2853fda497849
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowGroupModal(false)}
                  disabled={isLoading}
                >
<<<<<<< HEAD
                  {t('cancel')}
=======
                  {t('Hủy')}
>>>>>>> aa9def0e9889a298cfcbf130f8a2853fda497849
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
<<<<<<< HEAD
                      {t('processing')}
                    </>
                  ) : (
                    t('confirm')
=======
                      {t('Đang xử lý...')}
                    </>
                  ) : (
                    t('Xác nhận')
>>>>>>> aa9def0e9889a298cfcbf130f8a2853fda497849
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
<<<<<<< HEAD

      {/* QR Code Modal */}
      {showQrModal && selectedBatchForQR && (
        <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {t('batchQRCode')}: {selectedBatchForQR.part_name}
                </h5>
                <button 
                  type="button" 
                  className="btn-close" 
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
                  className="img-fluid mb-3"
                  style={{ maxWidth: '200px' }}
                />
                <div className="small text-muted">
                  <p><strong>{t('batchDetails')}</strong></p>
                  <p><strong>{t('partName')}:</strong> {selectedBatchForQR.part_name}</p>
                  <p><strong>{t('machineName')}:</strong> {selectedBatchForQR.machine_name}</p>
                  <p><strong>{t('moldCode')}:</strong> {selectedBatchForQR.mold_code}</p>
                  <p><strong>{t('quantity')}:</strong> {selectedBatchForQR.quantity}</p>
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
                          .qr-code { max-width: 300px; margin: 20px auto; }
                          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                          table th, table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                          table th { background-color: #f2f2f2; }
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

      {/* Assembly Modal - Updated with dropdown for completion time */}
      {showAssemblyModal && (
        <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{t('confirmAssembly')}</h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowAssemblyModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label htmlFor="picId" className="form-label">{t('pleaseEnterPIC')}</label>
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
                  <label htmlFor="startTime" className="form-label">{t('startTime')}</label>
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
                <div className="mb-3">
                  <label htmlFor="completionTimeOption" className="form-label">{t('completionTime')}</label>
                  <select
                    id="completionTimeOption"
                    name="completionTimeOption"
                    className="form-select mb-2"
                    value={assemblyFormData.completionTimeOption}
                    onChange={handleAssemblyInputChange}
                  >
                    <option value="plus1">{t('plus1Hour')}</option>
                    <option value="plus2">{t('plus2Hours')}</option>
                    <option value="plus4">{t('plus4Hours')}</option>
                    <option value="plus8">{t('plus8Hours')}</option>
                    <option value="custom">{t('custom')}</option>
                  </select>
                  
                  {assemblyFormData.completionTimeOption === 'custom' && (
                    <input
                      type="text"
                      className="form-control"
                      placeholder="hh:mm:ss - dd/mm/yyyy"
                      name="customCompletionTime"
                      onChange={handleAssemblyInputChange}
                    />
                  )}
                  
                  {assemblyFormData.completionTime && assemblyFormData.completionTimeOption !== 'custom' && (
                    <div className="form-text text-muted">
                      {t('estimatedCompletionTime')}: <strong>{assemblyFormData.completionTime}</strong>
                    </div>
                  )}
                </div>
                <div className="mb-3">
                  <label htmlFor="productQuantity" className="form-label">{t('productQuantity')}</label>
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

      {/* Details Modal - Updated with formatted times */}
      {showDetailsModal && selectedAssembly && (
        <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{t('groupDetails', { groupId: selectedAssembly.group_id })}</h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowDetailsModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <p><strong>{t('startTime')}:</strong> {formatDateForDisplay(selectedAssembly.start_time)}</p>
                  <p><strong>{t('completionTime')}:</strong> {formatDateForDisplay(selectedAssembly.completion_time)}</p>
                  <p><strong>{t('productQuantity')}:</strong> {selectedAssembly.product_quantity || '0'}</p>
                  <p><strong>{t('PIC')}:</strong> {selectedAssembly.pic_name || 'N/A'}</p>
                  <p><strong>{t('status')}:</strong> {selectedAssembly.status}</p>
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
=======
>>>>>>> aa9def0e9889a298cfcbf130f8a2853fda497849
    </div>
  );
}

export default BatchGrouping;