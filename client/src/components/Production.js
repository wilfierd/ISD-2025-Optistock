// client/src/components/Production.js
import React, { useState, useEffect } from 'react';
import Navbar from './Navbar';
import { useLogout } from '../hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { useMachines } from '../hooks/useMachines';
import { useMolds } from '../hooks/useMolds';
import { useMaterials } from '../hooks/useMaterials';
import apiService from '../services/api';
import { toast } from 'react-toastify';
import './Production.css';

function Production({ user }) {
  // State for active tab
  const [activeTab, setActiveTab] = useState('production');
  
  // State for batch management
  const [batches, setBatches] = useState([]);
  const [isLoadingBatches, setIsLoadingBatches] = useState(false);
  
  // State for batch creation modal
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  
  // Form state with data selection
  const [materialFormData, setMaterialFormData] = useState({
    id: '',
    partName: '',
    length: '',
    width: '',
    height: '0',
    quantity: '',
    supplier: ''
  });
  
  const [machineFormData, setMachineFormData] = useState({
    id: '',
    tenMayDap: '',
    maKhuon: '',
    soLuong: '',
    thanhPham: ''
  });
  
  // Selected data references
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [selectedMold, setSelectedMold] = useState(null);
  
  // Detail view state
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  
  // Production view filter - Add a filter state for production view
  const [productionFilter, setProductionFilter] = useState('active'); // 'active', 'all'
  
  // React Query hooks
  const { data: machines = [], isLoading: isLoadingMachines } = useMachines();
  const { data: molds = [], isLoading: isLoadingMolds } = useMolds();
  const { data: materials = [], isLoading: isLoadingMaterials } = useMaterials();
  const logoutMutation = useLogout();

  // Load batches on component mount
  useEffect(() => {
    fetchBatches();
  }, []);

  // Function to fetch batches
  const fetchBatches = async () => {
    setIsLoadingBatches(true);
    try {
      const response = await apiService.batches.getAll();
      if (response.data && response.data.success) {
        setBatches(response.data.data || []);
      } else {
        console.error('Unexpected response format:', response);
        toast.error('Định dạng phản hồi không mong đợi khi lấy dữ liệu lô');
      }
    } catch (error) {
      console.error('Error fetching batches:', error);
      toast.error('Không thể tải dữ liệu lô sản xuất');
    } finally {
      setIsLoadingBatches(false);
    }
  };

  // Handle logout
  const handleLogout = () => {
    logoutMutation.mutate();
  };

  // Handle tab changes
  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  // Handle filter changes for production view
  const handleFilterChange = (filter) => {
    setProductionFilter(filter);
  };

  // Handle opening the batch creation modal
  const handleAddBatchClick = () => {
    setCurrentStep(1);
    
    // Reset all form data
    setMaterialFormData({
      id: '',
      partName: '',
      length: '',
      width: '',
      height: '0',
      quantity: '',
      supplier: ''
    });
    
    setMachineFormData({
      id: '',
      tenMayDap: '',
      maKhuon: '',
      soLuong: '',
      thanhPham: ''
    });
    
    setSelectedMaterial(null);
    setSelectedMachine(null);
    setSelectedMold(null);
    
    setShowBatchModal(true);
  };

  // Handle material form input changes with auto-fill
  const handleMaterialInputChange = (e) => {
    const { id, value } = e.target;
    
    // Update the form data
    setMaterialFormData(prev => ({
      ...prev,
      [id]: value
    }));
    
    // If partName is being changed, look for matching material to auto-fill
    if (id === 'partName') {
      // Find the matching material using the transformed partName property
      const matchingMaterial = materials.find(m => m.partName === value);
      
      if (matchingMaterial) {
        // Auto-fill material data
        setMaterialFormData({
          id: matchingMaterial.id,
          partName: matchingMaterial.partName,
          length: matchingMaterial.length,
          width: matchingMaterial.width,
          height: matchingMaterial.height || '0',
          quantity: matchingMaterial.quantity,
          supplier: matchingMaterial.supplier
        });
        
        setSelectedMaterial(matchingMaterial);
      } else {
        // Reset the selected material reference if no match
        setSelectedMaterial(null);
      }
    }
  };

  // Handle machine form input changes with auto-fill
  const handleMachineInputChange = (e) => {
    const { id, value } = e.target;
    
    // Update the form data
    setMachineFormData(prev => ({
      ...prev,
      [id]: value
    }));
    
    // If machine name is being changed, look for matching machine
    if (id === 'tenMayDap') {
      const matchingMachine = machines.find(m => m.ten_may_dap === value);
      
      if (matchingMachine) {
        setMachineFormData(prev => ({
          ...prev,
          id: matchingMachine.id,
          tenMayDap: matchingMachine.ten_may_dap
        }));
        
        setSelectedMachine(matchingMachine);
      } else {
        setSelectedMachine(null);
      }
    }
    
    // If mold code is being changed, look for matching mold
    if (id === 'maKhuon') {
      const matchingMold = molds.find(m => m.ma_khuon === value);
      
      if (matchingMold) {
        setMachineFormData(prev => ({
          ...prev,
          maKhuon: matchingMold.ma_khuon,
          soLuong: matchingMold.so_luong.toString()
        }));
        
        setSelectedMold(matchingMold);
      } else {
        setSelectedMold(null);
      }
    }
  };

  // Handle next step in batch creation
  const handleNextStep = () => {
    // Basic validation for first step
    if (!materialFormData.partName || !materialFormData.length || !materialFormData.width || !materialFormData.quantity || !materialFormData.supplier) {
      toast.error('Vui lòng điền đầy đủ thông tin nguyên vật liệu');
      return;
    }

    setCurrentStep(2);
  };

  // Handle previous step in batch creation
  const handlePreviousStep = () => {
    setCurrentStep(1);
  };

  // Handle batch creation submission
  const handleCreateBatch = async () => {
    // Basic validation for second step
    if (!machineFormData.tenMayDap || !machineFormData.maKhuon || !machineFormData.soLuong) {
      toast.error('Vui lòng điền đầy đủ thông tin máy dập');
      return;
    }

    try {
      // Check if material is selected properly
      if (!selectedMaterial) {
        toast.error('Vui lòng chọn nguyên vật liệu có sẵn trong hệ thống');
        return;
      }
      
      // Prepare the batch data using IDs of existing records
      const batchData = {
        materialId: selectedMaterial?.id,
        machineId: selectedMachine?.id,
        moldId: selectedMold?.id,
        expectedOutput: parseInt(machineFormData.thanhPham || machineFormData.soLuong),
        notes: `Lô sản xuất: ${materialFormData.partName}, máy: ${machineFormData.tenMayDap}, khuôn: ${machineFormData.maKhuon}`,
        status: 'in_progress', // Automatically set status to in_progress
        start_date: new Date().toISOString() // Set start date to now
      };
      
      // Handle case where material, machine, or mold doesn't exist in database yet
      if (!batchData.materialId || !batchData.machineId || !batchData.moldId) {
        toast.error('Vui lòng chọn nguyên vật liệu, máy dập và khuôn đã có trong hệ thống');
        return;
      }

      // Create the batch
      const response = await apiService.batches.create(batchData);
      
      if (response.data.success) {
        toast.success('Tạo lô sản xuất thành công');
        setShowBatchModal(false);
        
        // Refresh the batches list
        fetchBatches();
      } else {
        throw new Error(response.data.error || 'Không thể tạo lô sản xuất');
      }
    } catch (error) {
      console.error('Error creating batch:', error);
      toast.error(error.message || 'Không thể tạo lô sản xuất');
    }
  };

  // Handle stopping a machine/batch
  const handleStopBatch = async (batch) => {
    try {
      // Update batch status to completed
      await apiService.batches.updateStatus(batch.id, { 
        status: 'completed',
        end_date: new Date().toISOString()
      });
      
      toast.success('Đã dừng lô sản xuất thành công');
      fetchBatches();
    } catch (error) {
      console.error('Error stopping batch:', error);
      toast.error('Không thể dừng lô sản xuất');
    }
  };

  // Handle starting a machine/batch  
  const handleStartBatch = async (batch) => {
    try {
      // Update batch status to running
      await apiService.batches.updateStatus(batch.id, { 
        status: 'in_progress',
        start_date: new Date().toISOString()
      });
      
      toast.success('Đã bắt đầu lô sản xuất thành công');
      fetchBatches();
    } catch (error) {
      console.error('Error starting batch:', error);
      toast.error('Không thể bắt đầu lô sản xuất');
    }
  };
  
  // Handle batch deletion
  const handleDeleteBatch = async (batchId) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa lô sản xuất này?')) {
      try {
        await apiService.batches.delete(batchId);
        toast.success('Xóa lô sản xuất thành công');
        fetchBatches();
      } catch (error) {
        console.error('Error deleting batch:', error);
        toast.error('Không thể xóa lô sản xuất');
      }
    }
  };
  
  // Handle viewing batch details
  const handleViewDetails = (batch) => {
    setSelectedBatch(batch);
    setShowDetailModal(true);
  };

  // Filter batches for production tab based on filter state
  const getFilteredProductionBatches = () => {
    if (productionFilter === 'active') {
      return batches.filter(batch => batch.status === 'in_progress' || batch.status === 'planned');
    } else {
      // Show all batches including completed ones
      return batches;
    }
  };

  return (
    <div>
      <Navbar user={user} onLogout={handleLogout} />

      {/* Main Content */}
      <div className="container-fluid mt-4">
        {/* Search Bar and Add Button */}
        <div className="row mb-4">
          <div className="col-md-8">
            <div className="search-container d-flex">
              <div className="position-relative flex-grow-1 me-2">
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Tìm lô sản xuất theo tên sản phẩm" 
                  style={{ paddingLeft: '40px' }}
                />
                <span className="position-absolute" style={{ left: '15px', top: '10px' }}>
                  <i className="fas fa-search"></i>
                </span>
              </div>
              <button className="btn btn-outline-secondary">
                <i className="fas fa-filter me-1"></i> Tìm theo
              </button>
            </div>
          </div>
          <div className="col-md-4 text-end">
            <button 
              className="btn btn-primary" 
              onClick={handleAddBatchClick}
            >
              Tạo lô mới
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="row mb-3">
          <div className="col-12">
            <ul className="nav nav-tabs">
              <li className="nav-item">
                <a 
                  className={`nav-link ${activeTab === 'production' ? 'active' : ''}`} 
                  href="#production"
                  onClick={(e) => {
                    e.preventDefault();
                    handleTabChange('production');
                  }}
                >
                  Danh sách lô đang sản xuất
                </a>
              </li>
              <li className="nav-item">
                <a 
                  className={`nav-link ${activeTab === 'planning' ? 'active' : ''}`} 
                  href="#planning"
                  onClick={(e) => {
                    e.preventDefault();
                    handleTabChange('planning');
                  }}
                >
                  Danh sách mặt
                </a>
              </li>
            </ul>
          </div>
        </div>
        
        {/* Production Tab Content */}
        {activeTab === 'production' && (
          <div className="row mb-4">
            <div className="col-md-12">
              <div className="card shadow">
                <div className="card-header bg-light d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">Lô sản xuất đang hoạt động</h5>
                  {/* Add filter options */}
                  <div className="btn-group">
                    <button 
                      className={`btn btn-sm ${productionFilter === 'active' ? 'btn-primary' : 'btn-outline-primary'}`}
                      onClick={() => handleFilterChange('active')}
                    >
                      Đang hoạt động
                    </button>
                    <button 
                      className={`btn btn-sm ${productionFilter === 'all' ? 'btn-primary' : 'btn-outline-primary'}`}
                      onClick={() => handleFilterChange('all')}
                    >
                      Tất cả
                    </button>
                  </div>
                </div>
                <div className="card-body p-0">
                  {isLoadingBatches ? (
                    <div className="text-center my-3">
                      <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </div>
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-hover mb-0">
                        <thead className="bg-light">
                          <tr>
                            <th>Trạng thái</th>
                            <th>Tên máy dập</th>
                            <th>Mã khuôn</th>
                            <th>Số lượng</th>
                            <th>Ngày, giờ bắt đầu</th>
                            <th style={{ width: '180px' }}>Thao tác</th>
                          </tr>
                        </thead>
                        <tbody>
                          {getFilteredProductionBatches()
                            .map(batch => {
                              // Find related data using foreign keys
                              const machine = machines.find(m => m.id === batch.machine_id);
                              const mold = molds.find(m => m.id === batch.mold_id);
                              const isRunning = batch.status === 'in_progress';
                              const isCompleted = batch.status === 'completed';
                              
                              return (
                                <tr key={batch.id}>
                                  <td>
                                    <div className="d-flex align-items-center">
                                      <span 
                                        className={`status-indicator ${isRunning ? 'bg-success' : isCompleted ? 'bg-danger' : 'bg-secondary'}`}
                                        style={{ width: '12px', height: '12px', borderRadius: '50%', marginRight: '8px', display: 'inline-block' }}
                                      ></span>
                                      <span>
                                        {isRunning ? 'Đang chạy' : isCompleted ? 'Đã dừng' : 'Chưa bắt đầu'}
                                      </span>
                                    </div>
                                  </td>
                                  <td>{machine?.ten_may_dap || '-'}</td>
                                  <td>{mold?.ma_khuon || '-'}</td>
                                  <td>{batch.expected_output || mold?.so_luong || '-'}</td>
                                  <td>
                                    {batch.start_date ? new Date(batch.start_date).toLocaleString() : '19:00:10 05/03/2025'}
                                  </td>
                                  <td>
                                    {/* Show both buttons but disable one based on status */}
                                    {isCompleted ? (
                                      <>
                                        <button 
                                          className="btn btn-sm btn-success me-2"
                                          onClick={() => handleStartBatch(batch)}
                                        >
                                          Tiếp tục
                                        </button>
                                        <button 
                                          className="btn btn-sm btn-danger"
                                          onClick={() => handleDeleteBatch(batch.id)}
                                        >
                                          Xóa
                                        </button>
                                      </>
                                    ) : (
                                      <>
                                        <button 
                                          className="btn btn-sm btn-danger me-2"
                                          onClick={() => handleStopBatch(batch)}
                                          disabled={!isRunning}
                                        >
                                          Dừng
                                        </button>
                                        <button 
                                          className="btn btn-sm btn-primary"
                                          onClick={() => handleStartBatch(batch)}
                                          disabled={isRunning}
                                        >
                                          {batch.status === 'planned' ? 'Bắt đầu' : 'Tiếp tục'}
                                        </button>
                                      </>
                                    )}
                                  </td>
                                </tr>
                              );
                            })
                          }
                          {getFilteredProductionBatches().length === 0 && (
                            <tr>
                              <td colSpan="6" className="text-center py-3">Không có lô sản xuất nào đang hoạt động!</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Planning Tab Content */}
        {activeTab === 'planning' && (
          <div className="row mb-4">
            <div className="col-md-12">
              <div className="card shadow">
                <div className="card-header bg-light">
                  <h5 className="mb-0">Danh sách lô sản xuất</h5>
                </div>
                <div className="card-body p-0">
                  {isLoadingBatches ? (
                    <div className="text-center my-3">
                      <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </div>
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-hover mb-0">
                        <thead className="bg-light">
                          <tr>
                            <th>ID</th>
                            <th>Nguyên vật liệu</th>
                            <th>Kích thước (D×R×C)</th>
                            <th>Máy dập</th>
                            <th>Mã khuôn</th>
                            <th>Dự kiến</th>
                            <th>Trạng thái</th>
                            <th>Ngày tạo</th>
                            <th>Thao tác</th>
                          </tr>
                        </thead>
                        <tbody>
                          {batches.map(batch => {
                            // Find related data using foreign keys
                            const material = materials.find(m => m.id === batch.material_id);
                            const machine = machines.find(m => m.id === batch.machine_id);
                            const mold = molds.find(m => m.id === batch.mold_id);
                            
                            return (
                              <tr key={batch.id}>
                                <td>{batch.id}</td>
                                <td>{material?.partName || '-'}</td>
                                <td>
                                  {material ? `${material.length}×${material.width}×${material.height}` : '-'}
                                </td>
                                <td>{machine?.ten_may_dap || '-'}</td>
                                <td>{mold?.ma_khuon || '-'}</td>
                                <td>{batch.expected_output || '-'}</td>
                                <td>
                                  <span className={`badge bg-${
                                    batch.status === 'planned' ? 'secondary' :
                                    batch.status === 'in_progress' ? 'primary' :
                                    batch.status === 'completed' ? 'success' : 'danger'
                                  }`}>
                                    {batch.status === 'planned' ? 'Lên kế hoạch' :
                                     batch.status === 'in_progress' ? 'Đang thực hiện' :
                                     batch.status === 'completed' ? 'Hoàn thành' : 'Đã hủy'}
                                  </span>
                                </td>
                                <td>{new Date(batch.created_at).toLocaleDateString()}</td>
                                <td>
                                  <button 
                                    className="btn btn-sm btn-info me-1"
                                    onClick={() => handleViewDetails(batch)}
                                  >
                                    <i className="fas fa-eye"></i>
                                  </button>
                                  <button 
                                    className="btn btn-sm btn-primary me-1"
                                    onClick={() => {
                                      if (batch.status === 'in_progress') {
                                        handleStopBatch(batch);
                                      } else {
                                        handleStartBatch(batch);
                                      }
                                    }}
                                  >
                                    <i className="fas fa-edit"></i>
                                  </button>
                                  <button 
                                    className="btn btn-sm btn-danger"
                                    onClick={() => handleDeleteBatch(batch.id)}
                                  >
                                    <i className="fas fa-trash"></i>
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                          {batches.length === 0 && (
                            <tr>
                              <td colSpan="9" className="text-center py-3">Chưa có lô sản xuất nào được tạo.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Batch Creation Modal */}
      {showBatchModal && (
        <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <button 
                type="button" 
                className="btn-close position-absolute end-0 top-0 m-3" 
                onClick={() => setShowBatchModal(false)}
                style={{ zIndex: 1050 }}
              ></button>
              
              <div className="row g-0">
                {/* Sidebar */}
                <div className="col-md-3 bg-light p-4">
                  <div className={`step-item mb-3 ${currentStep === 1 ? 'active' : ''}`}>
                    <div className="d-flex align-items-center">
                      <span className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center me-2" style={{ width: '30px', height: '30px' }}>1</span>
                      <span className={currentStep === 1 ? 'fw-bold' : ''}>Thông tin NVL</span>
                    </div>
                  </div>
                  <div className={`step-item mb-3 ${currentStep === 2 ? 'active' : ''}`}>
                    <div className="d-flex align-items-center">
                      <span className={`rounded-circle ${currentStep === 2 ? 'bg-primary' : 'bg-secondary'} text-white d-flex align-items-center justify-content-center me-2`} style={{ width: '30px', height: '30px' }}>2</span>
                      <span className={currentStep === 2 ? 'fw-bold' : ''}>Thông tin máy dập</span>
                    </div>
                  </div>
                </div>
                
                {/* Content */}
                <div className="col-md-9 p-4">
                  {currentStep === 1 && (
                    <div>
                      <h5 className="mb-3">Thông tin NVL</h5>
                      <p className="text-muted">Chọn nguyên vật liệu có sẵn hoặc nhập thông tin của nguyên vật liệu mới</p>
                      
                      <div className="mb-3">
                        <label htmlFor="partName" className="form-label">Tên bộ phận</label>
                        <input 
                          type="text" 
                          className="form-control" 
                          id="partName" 
                          value={materialFormData.partName}
                          onChange={handleMaterialInputChange}
                          list="partNameOptions"
                          required 
                        />
                        <datalist id="partNameOptions">
                          {materials.map(material => (
                            <option key={material.id} value={material.partName} />
                          ))}
                        </datalist>
                        <small className="text-muted">
                          {selectedMaterial ? 'Nguyên vật liệu có sẵn trong hệ thống' : 'Nhập tên để tìm kiếm nguyên vật liệu có sẵn'}
                        </small>
                      </div>
                      
                      <div className="row mb-3">
                        <div className="col-md-6">
                          <label htmlFor="length" className="form-label">Dài:</label>
                          <div className="input-group">
                            <input 
                              type="number" 
                              className="form-control" 
                              id="length" 
                              value={materialFormData.length}
                              onChange={handleMaterialInputChange}
                              readOnly={!!selectedMaterial}
                              required 
                            />
                            <span className="input-group-text">mm</span>
                          </div>
                        </div>
                        <div className="col-md-6">
                          <label htmlFor="width" className="form-label">Rộng:</label>
                          <div className="input-group">
                            <input 
                              type="number" 
                              className="form-control" 
                              id="width" 
                              value={materialFormData.width}
                              onChange={handleMaterialInputChange}
                              readOnly={!!selectedMaterial}
                              required 
                            />
                            <span className="input-group-text">mm</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mb-3">
                        <label htmlFor="height" className="form-label">Cao:</label>
                        <div className="input-group">
                          <input 
                            type="number" 
                            className="form-control" 
                            id="height" 
                            value={materialFormData.height}
                            onChange={handleMaterialInputChange}
                            readOnly={!!selectedMaterial}
                          />
                          <span className="input-group-text">mm</span>
                        </div>
                      </div>
                      
                      <div className="mb-3">
                        <label htmlFor="quantity" className="form-label">Số lượng:</label>
                        <input 
                          type="number" 
                          className="form-control" 
                          id="quantity" 
                          value={materialFormData.quantity}
                          onChange={handleMaterialInputChange}
                          readOnly={!!selectedMaterial}
                          required 
                        />
                      </div>
                      
                      <div className="mb-3">
                        <label htmlFor="supplier" className="form-label">Supplier:</label>
                        <input 
                          type="text" 
                          className="form-control" 
                          id="supplier" 
                          value={materialFormData.supplier}
                          onChange={handleMaterialInputChange}
                          readOnly={!!selectedMaterial}
                          required 
                        />
                      </div>
                      
                      <div className="text-end mt-4">
                        <button 
                          type="button" 
                          className="btn btn-primary" 
                          onClick={handleNextStep}
                        >
                          Tiếp
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {currentStep === 2 && (
                    <div>
                      <h5 className="mb-3">Thông tin máy dập</h5>
                      <p className="text-muted">Chọn máy dập và khuôn có sẵn để tạo lô sản xuất</p>
                      
                      {/* Machine selection with autocomplete */}
                      <div className="mb-3">
                        <label htmlFor="tenMayDap" className="form-label">Tên máy dập:</label>
                        <input 
                          type="text" 
                          className="form-control" 
                          id="tenMayDap" 
                          value={machineFormData.tenMayDap}
                          onChange={handleMachineInputChange}
                          list="machineOptions"
                          required 
                        />
                        <datalist id="machineOptions">
                          {machines.map(machine => (
                            <option key={machine.id} value={machine.ten_may_dap} />
                          ))}
                        </datalist>
                        <small className="text-muted">
                          {selectedMachine ? 'Máy dập có sẵn trong hệ thống' : 'Nhập tên để tìm kiếm máy dập có sẵn'}
                        </small>
                      </div>
                      
                      {/* Mold selection with autocomplete */}
                      <div className="mb-3">
                        <label htmlFor="maKhuon" className="form-label">Mã khuôn:</label>
                        <input 
                          type="text" 
                          className="form-control" 
                          id="maKhuon" 
                          value={machineFormData.maKhuon}
                          onChange={handleMachineInputChange}
                          list="moldOptions"
                          required 
                        />
                        <datalist id="moldOptions">
                          {molds.map(mold => (
                            <option key={mold.id} value={mold.ma_khuon} />
                          ))}
                        </datalist>
                        <small className="text-muted">
                          {selectedMold ? 'Khuôn có sẵn trong hệ thống' : 'Nhập mã để tìm kiếm khuôn có sẵn'}
                        </small>
                      </div>
                      
                      <div className="mb-3">
                        <label htmlFor="soLuong" className="form-label">Số lượng:</label>
                        <input 
                          type="number" 
                          className="form-control" 
                          id="soLuong" 
                          value={machineFormData.soLuong}
                          onChange={handleMachineInputChange}
                          readOnly={!!selectedMold}
                          required 
                        />
                        {selectedMold && (
                          <small className="text-muted">
                            Số lượng được cập nhật tự động từ mã khuôn đã chọn.
                          </small>
                        )}
                      </div>
                      
                      <div className="mb-3">
                        <label htmlFor="thanhPham" className="form-label">Thành phẩm (dự kiến):</label>
                        <input 
                          type="number" 
                          className="form-control" 
                          id="thanhPham" 
                          value={machineFormData.thanhPham}
                          onChange={handleMachineInputChange}
                        />
                        <small className="text-muted">
                          Để trống sẽ sử dụng số lượng từ khuôn.
                        </small>
                      </div>
                      
                      <div className="text-end mt-4">
                        <button 
                          type="button" 
                          className="btn btn-light me-2" 
                          onClick={handlePreviousStep}
                        >
                          Quay lại
                        </button>
                        <button 
                          type="button" 
                          className="btn btn-primary" 
                          onClick={handleCreateBatch}
                        >
                          Tạo lô
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Batch Detail Modal */}
      {showDetailModal && selectedBatch && (
        <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Chi tiết lô sản xuất #{selectedBatch.id}</h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowDetailModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="row">
                  <div className="col-md-6">
                    <h6 className="border-bottom pb-2 mb-3">Thông tin cơ bản</h6>
                    <p>
                      <strong>Trạng thái:</strong> 
                      <span className={`badge bg-${
                        selectedBatch.status === 'planned' ? 'secondary' :
                        selectedBatch.status === 'in_progress' ? 'primary' :
                        selectedBatch.status === 'completed' ? 'success' : 'danger'
                      } ms-2`}>
                        {selectedBatch.status === 'planned' ? 'Lên kế hoạch' :
                         selectedBatch.status === 'in_progress' ? 'Đang thực hiện' :
                         selectedBatch.status === 'completed' ? 'Hoàn thành' : 'Đã hủy'}
                      </span>
                    </p>
                    <p><strong>Ngày tạo:</strong> {new Date(selectedBatch.created_at).toLocaleString()}</p>
                    <p><strong>Bắt đầu:</strong> {selectedBatch.start_date ? new Date(selectedBatch.start_date).toLocaleString() : 'Chưa bắt đầu'}</p>
                    <p><strong>Kết thúc:</strong> {selectedBatch.end_date ? new Date(selectedBatch.end_date).toLocaleString() : 'Chưa kết thúc'}</p>
                    <p><strong>Ghi chú:</strong> {selectedBatch.notes || 'Không có ghi chú'}</p>
                  </div>
                  <div className="col-md-6">
                    <h6 className="border-bottom pb-2 mb-3">Thông tin sản xuất</h6>
                    <p><strong>Dự kiến sản xuất:</strong> {selectedBatch.expected_output || 'Không xác định'}</p>
                    <p><strong>Đã sản xuất:</strong> {selectedBatch.actual_output || 'Chưa có dữ liệu'}</p>
                    
                    {/* Related data from other tables */}
                    {(() => {
                      const material = materials.find(m => m.id === selectedBatch.material_id);
                      const machine = machines.find(m => m.id === selectedBatch.machine_id);
                      const mold = molds.find(m => m.id === selectedBatch.mold_id);
                      
                      return (
                        <>
                          <h6 className="border-bottom pb-2 mb-2 mt-4">Thông tin liên quan</h6>
                          <p><strong>Nguyên vật liệu:</strong> {material?.partName || 'Không xác định'}</p>
                          <p><strong>Kích thước:</strong> {material ? `${material.length}×${material.width}×${material.height}` : 'Không xác định'}</p>
                          <p><strong>Máy dập:</strong> {machine?.ten_may_dap || 'Không xác định'}</p>
                          <p><strong>Mã khuôn:</strong> {mold?.ma_khuon || 'Không xác định'}</p>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowDetailModal(false)}
                >
                  Đóng
                </button>
                {selectedBatch.status === 'planned' && (
                  <button 
                    type="button" 
                    className="btn btn-primary"
                    onClick={() => {
                      handleStartBatch(selectedBatch);
                      setShowDetailModal(false);
                    }}
                  >
                    Bắt đầu sản xuất
                  </button>
                )}
                {selectedBatch.status === 'in_progress' && (
                  <button 
                    type="button" 
                    className="btn btn-success"
                    onClick={() => {
                      handleStopBatch(selectedBatch);
                      setShowDetailModal(false);
                    }}
                  >
                    Hoàn thành sản xuất
                  </button>
                )}
                {selectedBatch.status === 'completed' && (
                  <button 
                    type="button" 
                    className="btn btn-primary"
                    onClick={() => {
                      handleStartBatch(selectedBatch);
                      setShowDetailModal(false);
                    }}
                  >
                    Tiếp tục sản xuất
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Backdrop */}
      {(showBatchModal || showDetailModal) && (
        <div className="modal-backdrop fade show"></div>
      )}
    </div>
  );
}

export default Production;