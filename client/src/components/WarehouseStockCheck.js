// client/src/components/WarehouseStockCheck.js
import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import Navbar from './Navbar';
import { useLogout } from '../hooks/useAuth';
import { useMaterials } from '../hooks/useMaterials';
import apiService from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';

function WarehouseStockCheck({ user }) {
  const { t } = useLanguage();
  const { data: materials = [], isLoading, error, refetch } = useMaterials();
  const logoutMutation = useLogout();
  const scanInputRef = useRef(null);
  
  // State for stock check
  const [checkMode, setCheckMode] = useState(false);
  const [checkedMaterials, setCheckedMaterials] = useState({});
  const [scanValue, setScanValue] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showSummary, setShowSummary] = useState(false);
  const [summaryData, setSummaryData] = useState({
    scanned: 0,
    unscanned: 0,
    total: 0
  });
  
  // Focus the input field when entering check mode and maintain focus
  useEffect(() => {
    if (!checkMode) return;
    
    // Function to keep focus on scan input
    const maintainFocus = () => {
      if (scanInputRef.current && document.activeElement !== scanInputRef.current) {
        scanInputRef.current.focus();
      }
    };
    
    // Set initial focus
    maintainFocus();
    
    // Add event listener for clicks anywhere on the page
    const handleClick = () => {
      setTimeout(maintainFocus, 10); // Small delay to ensure focus after click events
    };
    
    document.body.addEventListener('click', handleClick);
    
    // Auto-refocus every 500ms as a fallback
    const interval = setInterval(maintainFocus, 500);
    
    // Clean up event listeners
    return () => {
      document.body.removeEventListener('click', handleClick);
      clearInterval(interval);
    };
  }, [checkMode]);
  
  // Initialize checked materials state when materials data loads
  useEffect(() => {
    if (materials.length > 0) {
      const initialCheckedState = {};
      materials.forEach(material => {
        initialCheckedState[material.id] = false;
      });
      setCheckedMaterials(initialCheckedState);
    }
  }, [materials]);
  
  // Handle scan input change
  const handleScanInputChange = (e) => {
    setScanValue(e.target.value);
  };
  
  // Handle material scanning
  const handleScanSubmit = async (e) => {
    e.preventDefault();
    
    if (!scanValue.trim()) return;
    
    try {
      // Extract material ID from QR code value
      // Assuming QR code contains the full URL like http://localhost:3000/material/5
      const materialId = extractMaterialIdFromScan(scanValue);
      
      if (!materialId) {
        toast.error(t("Không tìm thấy nguyên vật liệu. Vui lòng thử lại"));
        setScanValue('');
        scanInputRef.current.focus();
        return;
      }
      
      // Check if material exists
      const material = materials.find(m => m.id === parseInt(materialId));
      if (!material) {
        toast.error(t("Không tìm thấy nguyên vật liệu. Vui lòng thử lại"));
        setScanValue('');
        scanInputRef.current.focus();
        return;
      }
      
      // Check if material was already scanned
      if (checkedMaterials[materialId]) {
        toast.error(t("Nguyên vật liệu đã kiểm tra"));
        setScanValue('');
        scanInputRef.current.focus();
        return;
      }
      
      // Update status in local state
      setCheckedMaterials(prev => ({
        ...prev,
        [materialId]: true
      }));
      
      // Update status on server (if needed)
      // This would be a new API endpoint you'd need to add
      /*
      await apiService.materials.updateCheckStatus(materialId, {
        checked: true,
        checkedBy: user.id,
        checkDate: new Date()
      });
      */
      
      toast.success(`${material.partName} ${t("đã được kiểm tra")}`);
      setScanValue('');
      scanInputRef.current.focus();
      
    } catch (error) {
      console.error('Error processing scan:', error);
      toast.error(t("Lỗi khi quét mã QR. Vui lòng thử lại."));
      setScanValue('');
      scanInputRef.current.focus();
    }
  };
  
  // Extract material ID from scan value (URL)
  const extractMaterialIdFromScan = (scanValue) => {
    try {
      // If the scanner captures a URL like http://localhost:3000/material/5
      if (scanValue.includes('/material/')) {
        const parts = scanValue.split('/material/');
        return parts[parts.length - 1].trim();
      }
      
      // If the scanner just captures the ID directly
      if (/^\d+$/.test(scanValue.trim())) {
        return scanValue.trim();
      }
      
      return null;
    } catch (error) {
      console.error('Error extracting material ID from scan:', error);
      return null;
    }
  };
  
  // Handle start check mode
  const handleStartCheck = () => {
    // Reset all checked states
    const resetCheckedState = {};
    materials.forEach(material => {
      resetCheckedState[material.id] = false;
    });
    setCheckedMaterials(resetCheckedState);
    setCheckMode(true);
    setScanValue('');
    setShowSummary(false);
    
    // Set focus to scan input
    setTimeout(() => {
      if (scanInputRef.current) {
        scanInputRef.current.focus();
      }
    }, 100);
  };
  
  // Handle finish check mode
  const handleFinishCheck = () => {
    // Calculate summary data
    const scannedCount = Object.values(checkedMaterials).filter(Boolean).length;
    const totalCount = materials.length;
    const unscannedCount = totalCount - scannedCount;
    
    setSummaryData({
      scanned: scannedCount,
      unscanned: unscannedCount,
      total: totalCount
    });
    
    setShowSummary(true);
    setCheckMode(false);
  };
  
  // Handle search
  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };
  
  // Filter materials based on search term
  const filteredMaterials = materials.filter(material => 
    material.partName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    material.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(material.packetNo).includes(searchTerm)
  );
  
  // Handle view unchecked materials
  const handleViewUnchecked = () => {
    setSearchTerm('');
    setShowSummary(false);
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
          <h2>{t("Kiểm kho")}</h2>
          
          {!checkMode && !showSummary && (
            <button 
              className="btn btn-primary"
              onClick={handleStartCheck}
            >
              <i className="fas fa-qrcode me-2"></i>
              {t("Bắt đầu kiểm kho")}
            </button>
          )}
          
          {checkMode && (
            <button 
              className="btn btn-success"
              onClick={handleFinishCheck}
            >
              <i className="fas fa-check-circle me-2"></i>
              {t("Hoàn thành")}
            </button>
          )}
        </div>
        
        {/* Scan input when in check mode */}
        {checkMode && (
          <div className="card mb-4">
            <div className="card-header bg-primary text-white">
              <h5 className="mb-0">
                <i className="fas fa-qrcode me-2"></i>
                {t("Quét mã QR")}
                <span className="badge bg-success ms-2 pulse-animation">
                  {t("Sẵn sàng quét")}
                </span>
              </h5>
            </div>
            <div className="card-body">
              <form onSubmit={handleScanSubmit}>
                <div className="input-group">
                  <input
                    type="text"
                    className="form-control focus-highlight"
                    placeholder={t("Sẵn sàng nhận dữ liệu từ máy quét...")}
                    value={scanValue}
                    onChange={handleScanInputChange}
                    ref={scanInputRef}
                    autoFocus
                  />
                  <button 
                    className="btn btn-primary" 
                    type="submit"
                  >
                    <i className="fas fa-barcode me-2"></i>
                    {t("Quét")}
                  </button>
                </div>
                <div className="alert alert-success mt-3">
                  <i className="fas fa-info-circle me-2"></i>
                  {t("Bạn không cần phải nhấp vào ô nhập liệu. Chỉ cần quét trực tiếp mã QR trên vật liệu.")}
                </div>
              </form>
            </div>
          </div>
        )}
        
        {/* Summary Modal */}
        {showSummary && (
          <div className="card mb-4">
            <div className="card-header bg-primary text-white">
              <h5 className="mb-0">{t("Tổng kết kiểm kho")}</h5>
            </div>
            <div className="card-body">
              <div className="row text-center">
                <div className="col-md-4">
                  <div className="summary-item border rounded p-3 m-2 bg-light">
                    <h3>{summaryData.total}</h3>
                    <p>{t("Tổng số nguyên vật liệu")}</p>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="summary-item border rounded p-3 m-2 bg-success text-white">
                    <h3>{summaryData.scanned}</h3>
                    <p>{t("Đã kiểm tra")}</p>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="summary-item border rounded p-3 m-2 bg-danger text-white">
                    <h3>{summaryData.unscanned}</h3>
                    <p>{t("Chưa kiểm tra")}</p>
                  </div>
                </div>
              </div>
              
              {summaryData.unscanned > 0 && (
                <div className="text-center mt-3">
                  <button 
                    className="btn btn-warning"
                    onClick={handleViewUnchecked}
                  >
                    <i className="fas fa-eye me-2"></i>
                    {t("Xem danh sách chưa kiểm tra")}
                  </button>
                </div>
              )}
              
              <div className="text-center mt-3">
                <button 
                  className="btn btn-primary me-2"
                  onClick={handleStartCheck}
                >
                  <i className="fas fa-redo me-2"></i>
                  {t("Kiểm tra lại")}
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Search Bar */}
        {!checkMode && !showSummary && (
          <div className="row mb-3">
            <div className="col-md-6">
              <div className="search-container">
                <span className="search-icon"><i className="fas fa-search"></i></span>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder={t("Tìm kiếm nguyên vật liệu")}
                  value={searchTerm}
                  onChange={handleSearch}
                />
              </div>
            </div>
          </div>
        )}
        
        {/* Materials List */}
        {isLoading ? (
          <div className="text-center my-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">{t("loading")}</span>
            </div>
          </div>
        ) : error ? (
          <div className="alert alert-danger">{error.message}</div>
        ) : (
          <div className="custom-table-container">
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>{t("Trạng thái")}</th>
                    <th>{t("partName")}</th>
                    <th>{t("packetNo")}</th>
                    <th>{t("length")}(mm)</th>
                    <th>{t("width")}(mm)</th>
                    <th>{t("height")}(mm)</th>
                    <th>{t("quantity")}</th>
                    <th>{t("supplier")}</th>
                    <th>{t("updatedBy")}</th>
                    <th>{t("lastUpdated")}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMaterials.map(material => {
                    // For the summary view, only show unchecked items
                    if (showSummary && checkedMaterials[material.id]) {
                      return null;
                    }
                    
                    return (
                      <tr key={material.id}>
                        <td className="text-center">
                          <div 
                            className={`status-dot ${checkedMaterials[material.id] ? 'active' : ''}`}
                            title={checkedMaterials[material.id] ? t("Đã kiểm tra") : t("Chưa kiểm tra")}
                          ></div>
                        </td>
                        <td>{material.partName}</td>
                        <td>{material.packetNo}</td>
                        <td>{material.length}</td>
                        <td>{material.width}</td>
                        <td>{material.height}</td>
                        <td>{material.quantity}</td>
                        <td>{material.supplier}</td>
                        <td>{material.updatedBy}</td>
                        <td>{material.lastUpdated}</td>
                      </tr>
                    );
                  })}
                  {filteredMaterials.length === 0 && (
                    <tr>
                      <td colSpan="10" className="text-center py-3">{t("noRecordsFound")}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default WarehouseStockCheck;