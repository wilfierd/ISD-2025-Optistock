// client/src/components/WarehouseStockCheck.js
import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import Navbar from './Navbar';
import { useLogout } from '../hooks/useAuth';
import { useMaterials } from '../hooks/useMaterials';
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
  
  // State for modals and views
  const [showUncheckedItems, setShowUncheckedItems] = useState(false);
  const [showFinalReportModal, setShowFinalReportModal] = useState(false);
  
  // Final report form data
  const [finalReportData, setFinalReportData] = useState({
    dateTime: new Date().toLocaleString(),
    totalSlots: 0,
    checkedCount: 0,
    additionalReport: ''
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
  
 
  const extractMaterialIdFromScan = (scanValue) => {
    try {
      console.log('Raw QR scan value:', scanValue);
      
      // Step 1: Try to parse as URL and check for material ID in path
      try {
        const url = new URL(scanValue);
        // Look for material ID in URL path segments
        const pathSegments = url.pathname.split('/').filter(Boolean);
        for (let i = 0; i < pathSegments.length - 1; i++) {
          if (pathSegments[i].toLowerCase() === 'material' && /^\d+$/.test(pathSegments[i+1])) {
            return pathSegments[i+1];
          }
        }
        
        // Check for material ID in query parameters
        const materialParam = url.searchParams.get('material') || 
                             url.searchParams.get('materialId') || 
                             url.searchParams.get('id');
        if (materialParam && /^\d+$/.test(materialParam)) {
          return materialParam;
        }
      } catch (e) {
        // Not a valid URL, continue with other extraction methods
      }
      
      // Step 2: Check for exact match with a material ID pattern (e.g., M12345)
      const materialCodeMatch = scanValue.match(/\b[Mm][0-9]{3,8}\b/);
      if (materialCodeMatch) {
        // Extract just the numeric part if needed
        return materialCodeMatch[0].substring(1);
      }
      
      // Step 3: Check if the entire value is just a number (direct ID)
      if (/^\d+$/.test(scanValue.trim())) {
        return scanValue.trim();
      }
      
      // Step 4: Look for material prefixes followed by numbers
      const prefixMatch = scanValue.match(/\b(material|item|product|part|mat)[^a-zA-Z0-9]*([0-9]+)\b/i);
      if (prefixMatch) {
        return prefixMatch[2];
      }
      
      // Step 5: IMPORTANT - Verify any extracted ID exists in your database
      // This would require an async function and change to the overall design
      
      // For now, log that no reliable material ID could be extracted
      console.log('Could not reliably extract a material ID from scan');
      return null;
    } catch (error) {
      console.error('Error extracting material ID:', error);
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
    setShowUncheckedItems(false);
    
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
    
    // Update final report data
    setFinalReportData(prev => ({
      ...prev,
      dateTime: new Date().toLocaleString(),
      totalSlots: totalCount,
      checkedCount: scannedCount
    }));
    
    setShowSummary(true);
    setShowUncheckedItems(false); // By default, show checked items
    setCheckMode(false);
  };
  
  // Handle final report form input changes
  const handleReportInputChange = (e) => {
    const { id, value } = e.target;
    setFinalReportData(prev => ({
      ...prev,
      [id]: value
    }));
  };
  
  // Handle print final report
  const handlePrintReport = () => {
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    
    // Get unchecked items list
    const uncheckedItems = materials.filter(m => !checkedMaterials[m.id]);
    const uncheckedItemsList = uncheckedItems.length > 0 
      ? uncheckedItems.map(m => `<li>${m.partName} - Packet No: ${m.packetNo}</li>`).join('')
      : `<p class="text-success">${t("Tất cả các vị trí đã được kiểm tra") || "Tất cả các vị trí đã được kiểm tra"}</p>`;
    
    // Format date for report header
    const formattedDate = new Date().toLocaleString();
    
    // Write the HTML content
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${t("Báo cáo kiểm kho") || "Báo cáo kiểm kho"}</title>
        <meta charset="utf-8">
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 20px;
            line-height: 1.5;
          }
          h1 {
            color: #0a4d8c;
            text-align: center;
            margin-bottom: 20px;
          }
          .report-header {
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 1px solid #ccc;
          }
          .report-section {
            margin-bottom: 25px;
          }
          .report-stats {
            display: flex;
            justify-content: space-between;
            margin-bottom: 20px;
          }
          .stat-box {
            border: 1px solid #ddd;
            border-radius: 5px;
            padding: 10px 15px;
            width: 30%;
            text-align: center;
          }
          .stat-box h3 {
            margin: 5px 0;
            font-size: 24px;
          }
          .stat-box p {
            margin: 5px 0;
            color: #666;
          }
          .success {
            color: #198754;
          }
          .warning {
            color: #dc3545;
          }
          .unchecked-list {
            max-height: 300px;
            overflow-y: auto;
            border: 1px solid #ddd;
            border-radius: 5px;
            padding: 15px;
            margin-top: 10px;
            background-color: #f9f9f9;
          }
          .additional-notes {
            border: 1px solid #ddd;
            border-radius: 5px;
            padding: 15px;
            margin-top: 10px;
            background-color: #f9f9f9;
            min-height: 100px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          table th, table td {
            border: 1px solid #ddd;
            padding: 8px 12px;
            text-align: left;
          }
          table th {
            background-color: #f2f2f2;
          }
          .signature-section {
            margin-top: 50px;
            display: flex;
            justify-content: space-between;
          }
          .signature-box {
            width: 45%;
          }
          .signature-line {
            border-top: 1px solid #000;
            margin-top: 50px;
            margin-bottom: 5px;
          }
        </style>
      </head>
      <body>
        <h1>${t("Báo cáo kiểm kho") || "Báo cáo kiểm kho"}</h1>
        
        <div class="report-header">
          <table>
            <tr>
              <th width="30%">${t("Thời gian kiểm kho") || "Thời gian kiểm kho"}</th>
              <td>${formattedDate}</td>
            </tr>
            <tr>
              <th>${t("Người kiểm kho") || "Người kiểm kho"}</th>
              <td>${user.username}</td>
            </tr>
          </table>
        </div>
        
        <div class="report-section">
          <h2>${t("Thống kê") || "Thống kê"}</h2>
          <div class="report-stats">
            <div class="stat-box">
              <h3>${summaryData.total}</h3>
              <p>${t("Tổng số vị trí") || "Tổng số vị trí"}</p>
            </div>
            <div class="stat-box success">
              <h3>${summaryData.scanned}</h3>
              <p>${t("Đã kiểm tra") || "Đã kiểm tra"}</p>
            </div>
            <div class="stat-box warning">
              <h3>${summaryData.unscanned}</h3>
              <p>${t("Chưa kiểm tra") || "Chưa kiểm tra"}</p>
            </div>
          </div>
        </div>
        
        <div class="report-section">
          <h2>${t("Chi tiết các vị trí chưa kiểm tra") || "Chi tiết các vị trí chưa kiểm tra"}</h2>
          <div class="unchecked-list">
            <ul>
              ${uncheckedItemsList}
            </ul>
          </div>
        </div>
        
        <div class="report-section">
          <h2>${t("Báo cáo bổ sung") || "Báo cáo bổ sung"}</h2>
          <div class="additional-notes">
            ${finalReportData.additionalReport || ''}
          </div>
        </div>
        
        <div class="signature-section">
          <div class="signature-box">
            <div class="signature-line"></div>
            <p>${t("Người kiểm kho") || "Người kiểm kho"}</p>
          </div>
          <div class="signature-box">
            <div class="signature-line"></div>
            <p>${t("Người quản lý kho") || "Người quản lý kho"}</p>
          </div>
        </div>
      </body>
      </html>
    `);
    
    // Close the document for writing and focus on printing
    printWindow.document.close();
    
    // Give the browser a moment to render before printing
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
      
      // Close the print window when done (optional)
      // printWindow.close();
      
      // Show success message
      toast.success(t("Báo cáo đã được in") || "Báo cáo đã được in");
      setShowFinalReportModal(false);
    }, 500);
  };
  
  // Handle view unchecked/checked materials toggle
  const handleViewUncheckedToggle = () => {
    setSearchTerm('');
    setShowUncheckedItems(!showUncheckedItems);
  };
  
  // Handle search
  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };
  
  // Handle show final report
  const handleShowFinalReport = () => {
    console.log("Opening final report modal");
    setShowFinalReportModal(true);
  };
  
  // Handle logout
  const handleLogout = () => {
    logoutMutation.mutate();
  };
  
  // Filter materials based on search term and current view mode
  const filteredMaterials = materials.filter(material => {
    // First apply search term filter
    const matchesSearch = 
      material.partName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      material.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(material.packetNo).includes(searchTerm);
    
    if (!matchesSearch) return false;
    
    // Then apply checked/unchecked filter if in summary view
    if (showSummary) {
      if (showUncheckedItems) {
        // Show only unchecked items
        return !checkedMaterials[material.id];
      } else {
        // Show only checked items
        return checkedMaterials[material.id];
      }
    }
    
    // In normal mode, show all materials that match search
    return true;
  });

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
              
              <div className="text-center mt-3">
                <button 
                  className="btn btn-warning me-2"
                  onClick={handleViewUncheckedToggle}
                >
                  <i className={`fas fa-${showUncheckedItems ? 'check' : 'times'}-circle me-2`}></i>
                  {showUncheckedItems ? 
                    // Using a fallback approach since the translation might not exist
                    (t("Xem danh sách đã kiểm tra") === "Xem danh sách đã kiểm tra" ? 
                      "Xem danh sách đã kiểm tra" : t("Xem danh sách đã kiểm tra")) : 
                    t("Xem danh sách chưa kiểm tra")}
                </button>
                
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
                    <th>{t("materialCode")}</th>
                    <th>{t("length")}(mm)</th>
                    <th>{t("width")}(mm)</th>
                    <th>{t("materialType")}</th>
                    <th>{t("quantity")}</th>
                    <th>{t("supplier")}</th>
                    <th>{t("updatedBy")}</th>
                    <th>{t("lastUpdated")}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMaterials.length > 0 ? (
                    filteredMaterials.map(material => (
                      <tr key={material.id}>
                        <td className="text-center">
                          <div 
                            className={`status-dot ${checkedMaterials[material.id] ? 'active' : ''}`}
                            title={checkedMaterials[material.id] ? t("Đã kiểm tra") : t("Chưa kiểm tra")}
                          ></div>
                        </td>
                        <td>{material.partName}</td>
                        <td>{material.packetNo}</td>
                        <td>{material.materialCode}</td>
                        <td>{material.length}</td>
                        <td>{material.width}</td>
                        <td>{material.materialType}</td>
                        <td>{material.quantity}</td>
                        <td>{material.supplier}</td>
                        <td>{material.updatedBy}</td>
                        <td>{material.lastUpdated}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="10" className="text-center py-3">
                        {showSummary ? 
                          (showUncheckedItems ? 
                            t("Tất cả nguyên vật liệu đã được kiểm tra") : 
                            t("Không có nguyên vật liệu nào được kiểm tra")) : 
                          t("noRecordsFound")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Final check button - only shown in summary view */}
            {showSummary && (
              <div className="text-end mt-3">
                <button 
                  className="btn btn-primary"
                  onClick={handleShowFinalReport}
                >
                  <i className="fas fa-clipboard-check me-2"></i>
                  {t("Hoàn thành kiểm kho") || "Hoàn thành kiểm kho"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Final Report Modal */}
      {showFinalReportModal && (
        <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {t("Báo cáo kiểm kho") || "Báo cáo kiểm kho"}
                </h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowFinalReportModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <form id="warehouseReportForm">
                  <div className="row mb-3">
                    <div className="col-md-6">
                      <label htmlFor="dateTime" className="form-label">
                        {t("Thời gian kiểm kho") || "Thời gian kiểm kho"}
                      </label>
                      <input 
                        type="text" 
                        className="form-control" 
                        id="dateTime" 
                        value={finalReportData.dateTime}
                        readOnly
                      />
                    </div>
                    <div className="col-md-6">
                      <label htmlFor="checker" className="form-label">
                        {t("Người kiểm kho") || "Người kiểm kho"}
                      </label>
                      <input 
                        type="text" 
                        className="form-control" 
                        id="checker" 
                        value={user.username}
                        readOnly
                      />
                    </div>
                  </div>
                  <div className="row mb-3">
                    <div className="col-md-4">
                      <label htmlFor="totalSlots" className="form-label">
                        {t("Tổng số vị trí") || "Tổng số vị trí"}
                      </label>
                      <input 
                        type="number" 
                        className="form-control" 
                        id="totalSlots" 
                        value={finalReportData.totalSlots}
                        readOnly
                      />
                    </div>
                    <div className="col-md-4">
                      <label htmlFor="checkedCount" className="form-label">
                        {t("Số lượng đã kiểm tra") || "Số lượng đã kiểm tra"}
                      </label>
                      <input 
                        type="number" 
                        className="form-control" 
                        id="checkedCount" 
                        value={finalReportData.checkedCount}
                        readOnly
                      />
                    </div>
                    <div className="col-md-4">
                      <label htmlFor="uncheckedCount" className="form-label">
                        {t("Số lượng chưa kiểm tra") || "Số lượng chưa kiểm tra"}
                      </label>
                      <input 
                        type="number" 
                        className="form-control" 
                        id="uncheckedCount" 
                        value={summaryData.total - finalReportData.checkedCount}
                        readOnly
                      />
                    </div>
                  </div>
                  
                  {/* Details about unchecked items */}
                  <div className="mb-3">
                    <label className="form-label">
                      {t("Chi tiết các vị trí chưa kiểm tra") || "Chi tiết các vị trí chưa kiểm tra"}
                    </label>
                    <div className="alert alert-light" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                      {materials.filter(m => !checkedMaterials[m.id]).length > 0 ? (
                        <ul className="mb-0">
                          {materials.filter(m => !checkedMaterials[m.id]).map(m => (
                            <li key={m.id}>
                              {m.partName} - Packet No: {m.packetNo}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mb-0 text-success">
                          {t("Tất cả các vị trí đã được kiểm tra") || "Tất cả các vị trí đã được kiểm tra"}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {/* Additional report field */}
                  <div className="mb-3">
                    <label htmlFor="additionalReport" className="form-label">
                      {t("Báo cáo bổ sung") || "Báo cáo bổ sung"}
                    </label>
                    <textarea 
                      className="form-control" 
                      id="additionalReport" 
                      rows="4"
                      value={finalReportData.additionalReport}
                      onChange={handleReportInputChange}
                      placeholder={t("Nhập các ghi chú hoặc nhận xét bổ sung...") || "Nhập các ghi chú hoặc nhận xét bổ sung..."}
                    ></textarea>
                  </div>
                </form>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowFinalReportModal(false)}
                >
                  {t("Đóng") || "Đóng"}
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  onClick={handlePrintReport}
                >
                  <i className="fas fa-print me-2"></i>
                  {t("In báo cáo") || "In báo cáo"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal backdrop */}
      {showFinalReportModal && (
        <div 
          className="modal-backdrop fade show"
          onClick={() => setShowFinalReportModal(false)}
        ></div>
      )}
    </div>
  );
}

export default WarehouseStockCheck;