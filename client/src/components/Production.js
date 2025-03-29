// client/src/components/Production.js
import React, { useState, useEffect } from 'react';
import Navbar from './Navbar';
import { useLogout } from '../hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { 
  useMachines, 
  useUpdateMachineStatus
} from '../hooks/useMachines';
import { useMolds } from '../hooks/useMolds';
import { useMaterials } from '../hooks/useMaterials';
import apiService from '../services/api';
import { toast } from 'react-toastify';

function Production({ user }) {
  const queryClient = useQueryClient();
  
  // State for batch creation modal
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  
  // Material form state with auto-fill functionality
  const [materialFormData, setMaterialFormData] = useState({
    id: '',
    partName: '',
    length: '',
    width: '',
    height: '0',
    quantity: '',
    supplier: ''
  });
  
  // Machine and mold form state
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
  
  // State for stop reason modal
  const [showStopReasonModal, setShowStopReasonModal] = useState(false);
  const [stopReason, setStopReason] = useState('');
  const [machineToStop, setMachineToStop] = useState(null);
  const [stopTime, setStopTime] = useState('');
  const [stopDate, setStopDate] = useState('');

  // State for batch management
  const [batches, setBatches] = useState([]);
  const [isLoadingBatches, setIsLoadingBatches] = useState(false);

  // React Query hooks
  const { data: machines = [], isLoading: isLoadingMachines } = useMachines();
  const { data: molds = [], isLoading: isLoadingMolds } = useMolds();
  const { data: materials = [], isLoading: isLoadingMaterials } = useMaterials();
  const updateMachineStatus = useUpdateMachineStatus();
  const logoutMutation = useLogout();

  // Load batches on component mount
  useEffect(() => {
    const fetchBatches = async () => {
      setIsLoadingBatches(true);
      try {
        const response = await apiService.batches.getAll();
        if (response.data.success) {
          setBatches(response.data.data || []);
        }
      } catch (error) {
        console.error('Error fetching batches:', error);
        toast.error('Không thể tải dữ liệu lô sản xuất');
      } finally {
        setIsLoadingBatches(false);
      }
    };
    
    fetchBatches();
  }, []);

  // Handle logout
  const handleLogout = () => {
    logoutMutation.mutate();
  };

  // Handle stopping a machine
  const handleStopMachine = (machine) => {
    setMachineToStop(machine);
    // Set current time and date for the form
    const now = new Date();
    setStopTime(now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    setStopDate(now.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }));
    setShowStopReasonModal(true);
  };

  // Handle starting a machine
  const handleStartMachine = (id) => {
    updateMachineStatus.mutate({ 
      id: id, 
      data: { status: 'running' }
    });
  };

  // Handle stop reason confirmation
  const handleConfirmStop = () => {
    if (!stopReason.trim()) {
      toast.error("Vui lòng nhập lý do dừng máy");
      return;
    }

    updateMachineStatus.mutate({ 
      id: machineToStop.id, 
      data: {
        status: 'stopped',
        reason: stopReason,
        stopTime,
        stopDate
      }
    }, {
      onSuccess: () => {
        // Reset the form and close the modal
        setStopReason('');
        setMachineToStop(null);
        setShowStopReasonModal(false);
      }
    });
  };

  // Handle cancel stop
  const handleCancelStop = () => {
    setStopReason('');
    setMachineToStop(null);
    setShowStopReasonModal(false);
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
    
    // If part_name is being changed, look for matching material to auto-fill
    if (id === 'partName') {
      const matchingMaterial = materials.find(m => m.part_name === value);
      
      if (matchingMaterial) {
        // Auto-fill material data
        setMaterialFormData({
          id: matchingMaterial.id,
          partName: matchingMaterial.part_name,
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
      // Prepare the batch data using IDs of existing records
      const batchData = {
        materialId: selectedMaterial?.id,
        machineId: selectedMachine?.id,
        moldId: selectedMold?.id,
        expectedOutput: parseInt(machineFormData.thanhPham || machineFormData.soLuong),
        notes: `Batch created with material: ${materialFormData.partName}, machine: ${machineFormData.tenMayDap}, mold: ${machineFormData.maKhuon}`
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
        const batchesResponse = await apiService.batches.getAll();
        if (batchesResponse.data.success) {
          setBatches(batchesResponse.data.data || []);
        }
      } else {
        throw new Error(response.data.error || 'Không thể tạo lô sản xuất');
      }
    } catch (error) {
      console.error('Error creating batch:', error);
      toast.error(error.message || 'Không thể tạo lô sản xuất');
    }
  };

  return (
    <div>
      <Navbar user={user} onLogout={handleLogout} />

      {/* Main Content */}
      <div className="container-fluid mt-4">
        {/* Search Bar */}
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
                <a className="nav-link active" href="#machines">Danh sách máy dập</a>
              </li>
              <li className="nav-item">
                <a className="nav-link" href="#batches">Danh sách lô sản xuất</a>
              </li>
            </ul>
          </div>
        </div>
        
        {/* Machines Section */}
        <div className="row mb-4">
          <div className="col-md-12">
            <div className="card shadow">
              <div className="card-body p-0">
                {isLoadingMachines ? (
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
                        {machines.map(machine => {
                          // Find mold associated with this machine
                          const associatedMold = molds.find(mold => mold.machine_id === machine.id);
                          const isRunning = machine.status === 'running';
                          
                          return (
                            <tr key={machine.id}>
                              <td>
                                <div className="d-flex align-items-center">
                                  <span 
                                    className={`status-indicator ${isRunning ? 'bg-success' : 'bg-secondary'}`}
                                    style={{ width: '12px', height: '12px', borderRadius: '50%', marginRight: '8px', display: 'inline-block' }}
                                  ></span>
                                  <span>
                                    {isRunning ? 'Đang chạy' : 'Đã dừng'}
                                  </span>
                                </div>
                              </td>
                              <td>{machine.ten_may_dap}</td>
                              <td>{associatedMold ? associatedMold.ma_khuon : '-'}</td>
                              <td>{associatedMold ? associatedMold.so_luong : '-'}</td>
                              <td>
                                {machine.last_updated ? new Date(machine.last_updated).toLocaleString() : '-'}
                              </td>
                              <td>
                                {/* Both buttons are always visible but disabled based on status */}
                                <button 
                                  className="btn btn-sm btn-danger me-2"
                                  onClick={() => handleStopMachine(machine)}
                                  disabled={!isRunning || updateMachineStatus.isPending}
                                >
                                  Dừng
                                </button>
                                <button 
                                  className="btn btn-sm btn-primary"
                                  onClick={() => handleStartMachine(machine.id)}
                                  disabled={isRunning || updateMachineStatus.isPending}
                                >
                                  Bắt đầu
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                        {machines.length === 0 && (
                          <tr>
                            <td colSpan="6" className="text-center py-3">Không tìm thấy máy nào!</td>
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
        
        {/* Batches Section */}
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
                          <th>Số lượng</th>
                          <th>Dự kiến</th>
                          <th>Trạng thái</th>
                          <th>Ngày tạo</th>
                          <th>Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {batches.map(batch => {
                          // Find related data
                          const material = materials.find(m => m.id === batch.material_id);
                          const machine = machines.find(m => m.id === batch.machine_id);
                          const mold = molds.find(m => m.id === batch.mold_id);
                          
                          return (
                            <tr key={batch.id}>
                              <td>{batch.id}</td>
                              <td>{material?.part_name || '-'}</td>
                              <td>
                                {material ? `${material.length}×${material.width}×${material.height}` : '-'}
                              </td>
                              <td>{machine?.ten_may_dap || '-'}</td>
                              <td>{mold?.ma_khuon || '-'}</td>
                              <td>{mold?.so_luong || '-'}</td>
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
                                <button className="btn btn-sm btn-info me-1">
                                  <i className="fas fa-eye"></i>
                                </button>
                                <button className="btn btn-sm btn-primary me-1">
                                  <i className="fas fa-edit"></i>
                                </button>
                                <button className="btn btn-sm btn-danger">
                                  <i className="fas fa-trash"></i>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                        {batches.length === 0 && (
                          <tr>
                            <td colSpan="10" className="text-center py-3">Chưa có lô sản xuất nào được tạo.</td>
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
      </div>

      {/* Multi-Step Batch Creation Modal */}
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
                        <label htmlFor="partName" className="form-label">part_name</label>
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
                            <option key={material.id} value={material.part_name} />
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

      {/* Stop Reason Modal */}
      {showStopReasonModal && (
        <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title text-center">LÝ DO DỪNG MÁY</h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={handleCancelStop}
                ></button>
              </div>
              <div className="modal-body">
                <p className="text-center">(Nhập lý do dừng máy)</p>
                
                <hr />
                
                <div className="row mb-3 align-items-center">
                  <div className="col-4">
                    <label htmlFor="stopTime" className="form-label">Thời gian:</label>
                  </div>
                  <div className="col-8">
                    <input 
                      type="text" 
                      className="form-control" 
                      id="stopTime" 
                      value={stopTime}
                      onChange={(e) => setStopTime(e.target.value)}
                      placeholder="hh:mm:ss"
                    />
                  </div>
                </div>
                
                <div className="row mb-3 align-items-center">
                  <div className="col-4">
                    <label htmlFor="stopDate" className="form-label">Ngày:</label>
                  </div>
                  <div className="col-8">
                    <input 
                      type="text" 
                      className="form-control" 
                      id="stopDate" 
                      value={stopDate}
                      onChange={(e) => setStopDate(e.target.value)}
                      placeholder="dd/mm/yyyy"
                    />
                  </div>
                </div>
                
                <div className="row mb-3 align-items-center">
                  <div className="col-4">
                    <label htmlFor="stopReason" className="form-label">Lý do:</label>
                  </div>
                  <div className="col-8">
                    <textarea 
                      className="form-control" 
                      id="stopReason" 
                      value={stopReason}
                      onChange={(e) => setStopReason(e.target.value)}
                      placeholder="Nhập lý do"
                      rows={4}
                      required
                    ></textarea>
                  </div>
                </div>
              </div>
              <div className="modal-footer justify-content-center">
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  onClick={handleConfirmStop}
                  disabled={updateMachineStatus.isPending}
                >
                  Xác nhận
                </button>
                <button 
                  type="button" 
                  className="btn btn-danger" 
                  onClick={handleCancelStop}
                >
                  Huỷ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Production;
