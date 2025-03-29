// client/src/components/Production.js
import React, { useState, useEffect } from 'react';
import Navbar from './Navbar';
import { useLogout } from '../hooks/useAuth';
import { 
  useMachines, 
  useCreateMachine, 
  useUpdateMachineStatus, 
  useDeleteMachine 
} from '../hooks/useMachines';
import {
  useMolds,
  useCreateMold,
  useUpdateMold,
  useDeleteMold
} from '../hooks/useMolds';
import { useMaterials } from '../hooks/useMaterials';
import apiService from '../services/api';
import { toast } from 'react-toastify';

function Production({ user }) {
  // State for batch creation modal
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [materialFormData, setMaterialFormData] = useState({
    partName: '',
    length: '',
    width: '',
    quantity: '',
    supplier: ''
  });
  const [machineFormData, setMachineFormData] = useState({
    tenMayDap: '',
    maKhuon: '',
    soLuong: '',
    thanhPham: ''
  });
  const [selectedMoldData, setSelectedMoldData] = useState(null);
  
  // State for machine modals
  const [selectedMachineId, setSelectedMachineId] = useState(null);
  
  // State for mold modals
  const [showMoldModal, setShowMoldModal] = useState(false);
  const [moldModalMode, setMoldModalMode] = useState('add'); // 'add' or 'edit'
  const [selectedMoldId, setSelectedMoldId] = useState(null);
  const [moldFormData, setMoldFormData] = useState({
    maKhuon: '',
    soLuong: 0,
    machineId: ''
  });
  
  // State for stop reason modal
  const [showStopReasonModal, setShowStopReasonModal] = useState(false);
  const [stopReason, setStopReason] = useState('');
  const [machineToStop, setMachineToStop] = useState(null);
  const [stopTime, setStopTime] = useState('');
  const [stopDate, setStopDate] = useState('');

  // React Query hooks
  const { data: machines = [], isLoading: isLoadingMachines } = useMachines();
  const { data: molds = [], isLoading: isLoadingMolds } = useMolds();
  const { data: materials = [], isLoading: isLoadingMaterials } = useMaterials();
  const updateMachineStatus = useUpdateMachineStatus();
  const deleteMachine = useDeleteMachine();
  const createMold = useCreateMold();
  const updateMold = useUpdateMold();
  const deleteMold = useDeleteMold();
  const logoutMutation = useLogout();

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
    updateMachineStatus.mutate({ id, status: 'running' });
  };

  // Handle stop reason confirmation
  const handleConfirmStop = () => {
    if (!stopReason.trim()) {
      alert("Vui lòng nhập lý do dừng máy");
      return;
    }

    // Stop the machine with the provided reason
    updateMachineStatus.mutate({ 
      id: machineToStop.id, 
      status: 'stopped',
      reason: stopReason,
      stopTime,
      stopDate
    }, {
      onSuccess: () => {
        // Reset the form and close the modal
        setStopReason('');
        setMachineToStop(null);
        setShowStopReasonModal(false);
      }
    });
  };

  // Handle stop reason cancel
  const handleCancelStop = () => {
    setStopReason('');
    setMachineToStop(null);
    setShowStopReasonModal(false);
  };

  // Handle opening the batch creation modal
  const handleAddBatchClick = () => {
    setCurrentStep(1);
    setMaterialFormData({
      partName: '',
      length: '',
      width: '',
      quantity: '',
      supplier: ''
    });
    setMachineFormData({
      tenMayDap: '',
      maKhuon: '',
      soLuong: '',
      thanhPham: ''
    });
    setSelectedMoldData(null);
    setShowBatchModal(true);
  };

  // Handle material form input changes
  const handleMaterialInputChange = (e) => {
    const { id, value } = e.target;
    setMaterialFormData(prev => ({
      ...prev,
      [id]: value
    }));
  };

  // Handle machine form input changes
  const handleMachineInputChange = (e) => {
    const { id, value } = e.target;
    
    if (id === 'maKhuon') {
      // Find selected mold data
      const selectedMold = molds.find(mold => mold.ma_khuon === value);
      if (selectedMold) {
        setSelectedMoldData(selectedMold);
        // Auto-fill the quantity field with the mold's quantity
        setMachineFormData(prev => ({
          ...prev,
          [id]: value,
          soLuong: selectedMold.so_luong.toString()
        }));
      } else {
        setSelectedMoldData(null);
        setMachineFormData(prev => ({
          ...prev,
          [id]: value
        }));
      }
    } else {
      setMachineFormData(prev => ({
        ...prev,
        [id]: value
      }));
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
      // Step 1: Create material
      const materialResponse = await apiService.materials.create({
        partName: materialFormData.partName,
        length: parseInt(materialFormData.length),
        width: parseInt(materialFormData.width),
        quantity: parseInt(materialFormData.quantity),
        supplier: materialFormData.supplier
      });

      if (!materialResponse.data.success) {
        throw new Error('Failed to create material');
      }

      // Step 2: Create or find machine
      let machineId;
      const existingMachine = machines.find(m => m.ten_may_dap === machineFormData.tenMayDap);
      
      if (existingMachine) {
        machineId = existingMachine.id;
      } else {
        const machineResponse = await apiService.machines.create({
          tenMayDap: machineFormData.tenMayDap,
          status: 'stopped'
        });
        
        if (!machineResponse.data.success) {
          throw new Error('Failed to create machine');
        }
        
        machineId = machineResponse.data.machineId;
      }

      // Step 3: Create mold
      await apiService.molds.create({
        maKhuon: machineFormData.maKhuon,
        soLuong: parseInt(machineFormData.soLuong),
        machineId
      });

      // Success - close modal and refresh data
      toast.success('Đã tạo lô mới thành công');
      setShowBatchModal(false);
      
      // Refresh queries
      // Since we're using React Query, this will happen automatically
      // But we can force a refetch if needed
      
    } catch (error) {
      console.error('Error creating batch:', error);
      toast.error(error.message || 'Failed to create batch');
    }
  };

  // Handle add mold click
  const handleAddMoldClick = () => {
    setMoldFormData({
      maKhuon: '',
      soLuong: 0,
      machineId: ''
    });
    setMoldModalMode('add');
    setShowMoldModal(true);
  };

  // Handle edit mold click
  const handleEditMoldClick = (mold) => {
    setSelectedMoldId(mold.id);
    setMoldFormData({
      maKhuon: mold.ma_khuon,
      soLuong: mold.so_luong,
      machineId: mold.machine_id || ''
    });
    setMoldModalMode('edit');
    setShowMoldModal(true);
  };

  // Handle mold form input changes
  const handleMoldInputChange = (e) => {
    const { id, value } = e.target;
    setMoldFormData(prev => ({
      ...prev,
      [id]: value
    }));
  };

  // Handle mold form submission
  const handleSaveMoldClick = () => {
    const moldData = {
      maKhuon: moldFormData.maKhuon,
      soLuong: parseInt(moldFormData.soLuong),
      machineId: moldFormData.machineId ? parseInt(moldFormData.machineId) : null
    };

    if (moldModalMode === 'add') {
      createMold.mutate(moldData, {
        onSuccess: () => {
          setShowMoldModal(false);
        }
      });
    } else {
      updateMold.mutate({
        id: selectedMoldId,
        data: moldData
      }, {
        onSuccess: () => {
          setShowMoldModal(false);
        }
      });
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
                  placeholder="Tìm sản phẩm theo tên" 
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
                <a className="nav-link" href="#molds">Danh sách mạ</a>
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
        
        {/* Molds Section - Hidden by default */}
        <div className="row" style={{ display: 'none' }}>
          <div className="col-md-12">
            <div className="card shadow">
              <div className="card-header bg-info text-white d-flex justify-content-between align-items-center">
                <h5 className="mb-0">Danh sách mã khuôn</h5>
                <button 
                  className="btn btn-sm btn-light" 
                  onClick={handleAddMoldClick}
                  disabled={createMold.isPending}
                >
                  {createMold.isPending ? 'Adding...' : 'Thêm mã khuôn mới'}
                </button>
              </div>
              <div className="card-body">
                {isLoadingMolds ? (
                  <div className="text-center my-3">
                    <div className="spinner-border text-info" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead>
                        <tr>
                          <th>Mã khuôn</th>
                          <th>Số lượng</th>
                          <th>Thời gian</th>
                          <th>Máy sử dụng</th>
                          <th>Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {molds.map(mold => (
                          <tr key={mold.id}>
                            <td>{mold.ma_khuon}</td>
                            <td>{mold.so_luong}</td>
                            <td>{new Date(mold.time).toLocaleString()}</td>
                            <td>{mold.machine_name || '-'}</td>
                            <td>
                              <button 
                                className="btn btn-sm btn-secondary"
                                onClick={() => handleEditMoldClick(mold)}
                              >
                                <i className="fas fa-edit"></i>
                              </button>
                              <button 
                                className="btn btn-sm btn-danger ms-2"
                                onClick={() => deleteMold.mutate(mold.id)}
                                disabled={deleteMold.isPending}
                              >
                                <i className="fas fa-trash"></i>
                              </button>
                            </td>
                          </tr>
                        ))}
                        {molds.length === 0 && (
                          <tr>
                            <td colSpan="5" className="text-center py-3">Không tìm thấy mã khuôn nào!</td>
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
                      <p className="text-muted">Nhập thông tin NVL để tạo lô mới</p>
                      
                      <div className="mb-3">
                        <label htmlFor="partName" className="form-label">part_name</label>
                        <input 
                          type="text" 
                          className="form-control" 
                          id="partName" 
                          value={materialFormData.partName}
                          onChange={handleMaterialInputChange}
                          required 
                        />
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
                              required 
                            />
                            <span className="input-group-text">mm</span>
                          </div>
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
                      <p className="text-muted">Nhập thông tin máy dập để tạo lô mới</p>
                      
                      <div className="mb-3">
                        <label htmlFor="tenMayDap" className="form-label">Tên máy dập:</label>
                        <select 
                          className="form-select" 
                          id="tenMayDap" 
                          value={machineFormData.tenMayDap}
                          onChange={handleMachineInputChange}
                          required
                        >
                          <option value="">-- Chọn máy dập --</option>
                          {machines.map(machine => (
                            <option key={machine.id} value={machine.ten_may_dap}>
                              {machine.ten_may_dap}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div className="mb-3">
                        <label htmlFor="maKhuon" className="form-label">Mã khuôn:</label>
                        <select 
                          className="form-select" 
                          id="maKhuon" 
                          value={machineFormData.maKhuon}
                          onChange={handleMachineInputChange}
                          required
                        >
                          <option value="">-- Chọn mã khuôn --</option>
                          {molds.map(mold => (
                            <option key={mold.id} value={mold.ma_khuon}>
                              {mold.ma_khuon}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div className="mb-3">
                        <label htmlFor="soLuong" className="form-label">Số lượng:</label>
                        <input 
                          type="number" 
                          className="form-control" 
                          id="soLuong" 
                          value={machineFormData.soLuong}
                          onChange={handleMachineInputChange}
                          readOnly={selectedMoldData !== null}
                          required 
                        />
                        {selectedMoldData && (
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
                          required 
                        />
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
                          Xong
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