// client/src/components/QRScan.js
import React, { useState, useRef, useEffect } from 'react';
import Navbar from './Navbar';
import { useLogout } from '../hooks/useAuth';
import { useLanguage } from '../contexts/LanguageContext';
import { toast } from 'react-toastify';
import jsQR from 'jsqr';
import apiService from '../services/api';
import './QRScan.css';

function QRScan({ user }) {
  const { t, language } = useLanguage();
  const logoutMutation = useLogout();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const [scanning, setScanning] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [productData, setProductData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stream, setStream] = useState(null);

  // Start camera for QR scanning
  const startCamera = async () => {
    try {
      setError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' }
      });
      
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
        setScanning(true);
        
        // Start scanning for QR codes
        requestAnimationFrame(scanQRCode);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      setError(language === 'vi' ? 
        'Không thể truy cập camera. Vui lòng cấp quyền hoặc sử dụng chức năng nhập mã thủ công.' : 
        'Cannot access camera. Please grant permissions or use manual code entry.');
    }
  };
  
  // Scan for QR codes in video feed
  const scanQRCode = () => {
    if (!scanning || !videoRef.current || !canvasRef.current) {
      return;
    }
    
    try {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      
      // Make sure video is playing
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        // Set canvas dimensions to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Draw current video frame to canvas
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Get image data for QR code analysis
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        // Use jsQR to find QR codes in the image
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert', // Try only normal orientation
        });
        
        // If a QR code is found
        if (code) {
          console.log('QR Code detected:', code.data);
          
          // Stop scanning and process the QR code
          stopCamera();
          processQRCode(code.data);
          return; // Exit the scanning loop
        }
      }
      
      // Continue scanning
      requestAnimationFrame(scanQRCode);
    } catch (error) {
      console.error('Error scanning QR code:', error);
      // Continue scanning despite error
      requestAnimationFrame(scanQRCode);
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setScanning(false);
  };

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  // Handle file upload for QR code
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Create canvas to process the image
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0, img.width, img.height);
        
        // Get image data for QR code analysis
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        setLoading(true);
        
        // Use jsQR to find QR codes in the image
        try {
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          });
          
          if (code) {
            processQRCode(code.data);
          } else {
            setError(language === 'vi' ? 
              'Không tìm thấy mã QR trong ảnh. Vui lòng thử lại.' : 
              'No QR code found in the image. Please try again.');
            setLoading(false);
          }
        } catch (error) {
          console.error('Error processing QR code from image:', error);
          setError(language === 'vi' ? 
            'Lỗi khi xử lý mã QR. Vui lòng thử lại.' : 
            'Error processing QR code. Please try again.');
          setLoading(false);
        }
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  // Handle manual code submission
  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualCode) {
      toast.error(language === 'vi' ? 'Vui lòng nhập mã QR' : 'Please enter a QR code');
      return;
    }
    processQRCode(manualCode);
  };

  // Process QR code data by fetching from the product warehouse
  const processQRCode = async (code) => {
    setLoading(true);
    setError(null);
    
    try {
      // Try to parse the QR code to determine the product ID
      let productId;
      
      try {
        // First, try to parse as JSON (which might contain an ID)
        const qrData = JSON.parse(code);
        productId = qrData.id;
      } catch (error) {
        // If not valid JSON, check if it's a direct ID
        if (/^\d+$/.test(code.trim())) {
          productId = parseInt(code.trim());
        } else if (code.includes('/product/')) {
          // Extract ID from URL format
          const parts = code.split('/product/');
          const idPart = parts[parts.length - 1].trim();
          const matches = idPart.match(/^(\d+)/);
          if (matches && matches[1]) {
            productId = parseInt(matches[1]);
          }
        } else {
          // Treat code as a product code and search for it
          productId = code;
        }
      }
      
      if (!productId) {
        throw new Error(language === 'vi' ? 'Mã QR không hợp lệ' : 'Invalid QR code');
      }
      
      // Fetch the product data from the finishedProducts API
      const response = await apiService.finishedProducts.getById(productId);
      
      if (!response.data || !response.data.data) {
        throw new Error(language === 'vi' ? 'Không tìm thấy thông tin sản phẩm' : 'Product information not found');
      }
      
      const product = response.data.data;
      
      // Format the product data for display
      const formattedProductData = {
        id: product.id,
        productCode: product.product_code,
        productName: product.product_name,
        quantity: product.quantity,
        dimensions: '120 × 85 × 35 mm', // This would ideally come from the API
        status: product.quality_status || 'OK',
        defects: product.defect_count || 0,
        completionDate: product.completion_date,
        createdBy: product.created_by_name,
        
        // Build production history from product data
        // Replace the productionHistory section in processQRCode function with this:
        productionHistory: [
          // Material input stage
          {
            date: product.history && product.history.material ? 
              formatDate(product.history.material.last_updated) : 
              formatDate(product.created_at),
            stage: 'materialInput',
            title: language === 'vi' ? 'Nguyên liệu đầu vào' : 'Raw Material Input',
            details: {
              partName: product.history && product.history.material ? 
                product.history.material.part_name : 'N/A',  // Changed from materialCode to partName
              materialType: product.history && product.history.material ? 
                product.history.material.material_type : 'N/A',
              supplier: product.history && product.history.material ? 
                product.history.material.supplier : 'N/A'
            }
          },
          // Pressing stage
          {
            date: product.history && product.history.production ? 
              formatDate(product.history.production.start_date) : 
              formatDate(product.created_at),
            stage: 'pressing',
            title: language === 'vi' ? 'Ép/Dập' : 'Pressing',
            details: {
              machineName: product.history && product.history.production ? 
                product.history.production.machine_name : 'N/A',
              moldName: product.history && product.history.production ? 
                product.history.production.mold_code : 'N/A'
            }
          },
          // Assembly stage
          {
            date: product.history && product.history.assembly ? 
              formatDate(product.history.assembly.start_time) : 
              formatDate(product.created_at),
            stage: 'assembly',
            title: language === 'vi' ? 'Lắp ráp' : 'Assembly',
            details: {
              pic: product.history && product.history.assembly ? 
                product.history.assembly.pic_name : 'N/A',
              date: product.history && product.history.assembly ? 
                formatDate(product.history.assembly.completion_time) : 'N/A'
            }
          },
          // Plating stage
          {
            date: product.history && product.history.plating ? 
              `${product.history.plating.platingDate} - ${product.history.plating.platingEndDate || 'N/A'}` : 
              formatDate(product.created_at),
            stage: 'plating',
            title: language === 'vi' ? 'Mạ' : 'Plating',
            details: {
              startDate: product.history && product.history.plating ? 
                product.history.plating.platingDate : 'N/A',
              endDate: product.history && product.history.plating ? 
                product.history.plating.platingEndDate : 'N/A'
            }
          },
          // Quality check stage
          {
            date: formatDate(product.completion_date || product.created_at),
            stage: 'qualityCheck',
            title: language === 'vi' ? 'Kiểm tra chất lượng' : 'Quality Check',
            details: {
              inspector: product.created_by_name || 'N/A',
              date: formatDate(product.completion_date || product.created_at),
              result: product.quality_status === 'NG' ? 
                (language === 'vi' ? 'Lỗi' : 'Fail') : 
                (language === 'vi' ? 'Đạt' : 'Pass')
            }
          }
        ],
        
        // Component parts (would ideally come from the API)
        componentParts: product.components || [
          { code: 'CP-001', name: 'Component 1', quantity: 2 },
          { code: 'CP-002', name: 'Component 2', quantity: 1 }
        ],
        
        // Notes
        notes: product.notes || product.quality_notes || ''
      };
      
      setProductData(formattedProductData);
    } catch (error) {
      console.error('Error processing QR code:', error);
      setError(error.message || (language === 'vi' ? 
        'Mã QR không hợp lệ. Vui lòng thử lại' : 
        'Invalid QR code. Please try again'));
      setProductData(null);
    } finally {
      setLoading(false);
    }
  };
  
  // Helper function to format dates
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      return dateString;
    }
  };

  // Render scanner section
  const renderScanner = () => {
    return (
      <div className="scanner-container">
        <div className="video-container">
          {error ? (
            <div className="error-message">
              <i className="fas fa-exclamation-triangle"></i>
              <p>{error}</p>
            </div>
          ) : (
            <>
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                className="scanner-video"
                onCanPlay={() => videoRef.current.play()}
              />
              <div className="scan-overlay">
                <div className="scan-target"></div>
                <div className="scan-instructions">
                  {language === 'vi' ? 'Quét mã QR để xem thông tin sản phẩm' : 'Scan QR code to view product information'}
                </div>
              </div>
              <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
            </>
          )}
        </div>
        
        <div className="scanner-controls">
          {scanning ? (
            <button 
              className="control-button stop-button" 
              onClick={stopCamera}
            >
              <i className="fas fa-stop-circle me-2"></i>
              {language === 'vi' ? 'Dừng quét' : 'Stop Scanning'}
            </button>
          ) : (
            <button 
              className="control-button start-button" 
              onClick={startCamera}
            >
              <i className="fas fa-camera me-2"></i>
              {language === 'vi' ? 'Bắt đầu quét' : 'Start Scanning'}
            </button>
          )}
          
          <span className="divider">|</span>
          
          <button 
            className="control-button upload-button"
            onClick={() => fileInputRef.current.click()}
          >
            <i className="fas fa-upload me-2"></i>
            {language === 'vi' ? 'Tải ảnh lên' : 'Upload Image'}
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            style={{ display: 'none' }}
            accept="image/*"
            onChange={handleFileUpload}
          />
        </div>
      </div>
    );
  };

  // Render manual code input
  const renderManualInput = () => {
    return (
      <div className="manual-input-container">
        <h3>{language === 'vi' ? 'Quét mã QR sản phẩm' : 'Scan Product QR Code'}</h3>
        <p className="instruction-text">
          {language === 'vi' 
            ? 'Di chuyển mã QR vào vùng quét camera hoặc nhập mã thủ công bên dưới.' 
            : 'Move the QR code into the camera scan area or enter the code manually below.'}
        </p>
        
        <div className="manual-input-form">
          <form onSubmit={handleManualSubmit} className="search-form">
            <div className="manual-search-group">
              <label htmlFor="manualCodeInput">
                {language === 'vi' ? 'Nhập mã QR thủ công:' : 'Enter QR code manually:'}
              </label>
              <div className="input-search-wrapper">
                <input
                  type="text"
                  id="manualCodeInput"
                  className="form-control"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                />
                <button 
                  type="submit" 
                  className="search-button"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                  ) : (
                    <>{language === 'vi' ? 'Tìm kiếm' : 'Search'}</>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // Render product information
  const renderProductInfo = () => {
    if (!productData) return null;
    
    return (
      <div className="product-info-container">
        <div className="product-header">
          <h3>{language === 'vi' ? 'Thông tin sản phẩm' : 'Product Information'}</h3>
          <div className={`product-badge ${productData.status === 'OK' ? 'badge-ok' : productData.status === 'NG' ? 'badge-ng' : 'badge-waiting'}`}>
            {productData.status === 'OK' ? 
              (language === 'vi' ? 'Đạt' : 'OK') :
              productData.status === 'NG' ? 
                (language === 'vi' ? `Lỗi (${productData.defects})` : `NG (${productData.defects})`) :
                (language === 'vi' ? 'Chờ kiểm tra' : 'Awaiting Inspection')}
          </div>
        </div>
        
        {/* Product basic information */}
        <div className="section">
          <h4 className="section-title">{language === 'vi' ? 'Thông tin cơ bản' : 'Basic Information'}</h4>
          <div className="product-details">
            <div className="detail-row">
              <span className="detail-label">{language === 'vi' ? 'Mã sản phẩm' : 'Product Code'}:</span>
              <span className="detail-value">{productData.productCode}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">{language === 'vi' ? 'Tên sản phẩm' : 'Product Name'}:</span>
              <span className="detail-value">{productData.productName}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">ID:</span>
              <span className="detail-value">{productData.id}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">{language === 'vi' ? 'Số lượng' : 'Quantity'}:</span>
              <span className="detail-value">{productData.quantity}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">{language === 'vi' ? 'Kích thước' : 'Dimensions'}:</span>
              <span className="detail-value">{productData.dimensions}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">{language === 'vi' ? 'Ngày hoàn thành' : 'Completion Date'}:</span>
              <span className="detail-value">{formatDate(productData.completionDate)}</span>
            </div>
          </div>
        </div>
        
        {/* Production History */}
        <div className="section">
          <h4 className="section-title">{language === 'vi' ? 'Lịch sử sản xuất' : 'Production History'}</h4>
          <div className="production-timeline">
            {productData.productionHistory.map((stage, index) => (
              <div className="timeline-item" key={index}>
                <div className="timeline-icon">
                  {stage.stage === 'materialInput' && <i className="fas fa-box"></i>}
                  {stage.stage === 'pressing' && <i className="fas fa-cogs"></i>}
                  {stage.stage === 'assembly' && <i className="fas fa-tools"></i>}
                  {stage.stage === 'plating' && <i className="fas fa-tint"></i>}
                  {stage.stage === 'qualityCheck' && <i className="fas fa-check-circle"></i>}
                </div>
                
                <div className="timeline-date">{stage.date}</div>
                
                <div className="timeline-content">
                  <h5 className="timeline-title">{stage.title}</h5>
                  <div className="timeline-details">
                    {Object.entries(stage.details).map(([key, value], i) => (
                      <div className="detail-item" key={i}>
                        <span className="detail-key">
                          {key === 'partName' && (language === 'vi' ? 'Tên linh kiện' : 'Part Name')}
                          {key === 'materialType' && (language === 'vi' ? 'Loại vật liệu' : 'Material Type')}
                          {key === 'supplier' && (language === 'vi' ? 'Nhà cung cấp' : 'Supplier')}
                          {key === 'machineName' && (language === 'vi' ? 'Máy dập' : 'Machine')}
                          {key === 'moldName' && (language === 'vi' ? 'Tên khuôn' : 'Mold Name')}
                          {key === 'pic' && (language === 'vi' ? 'Người phụ trách' : 'Person in Charge')}
                          {key === 'date' && (language === 'vi' ? 'Ngày' : 'Date')}
                          {key === 'startDate' && (language === 'vi' ? 'Ngày bắt đầu' : 'Start Date')}
                          {key === 'endDate' && (language === 'vi' ? 'Ngày kết thúc' : 'End Date')}
                          {key === 'inspector' && (language === 'vi' ? 'Người kiểm tra' : 'Inspector')}
                          {key === 'result' && (language === 'vi' ? 'Kết quả' : 'Result')}
                        </span>
                        <span className="detail-value">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Handle logout
  const handleLogout = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    logoutMutation.mutate();
  };

  return (
    <div className="qr-scan-page">
      <Navbar user={user} onLogout={handleLogout} />
      
      <div className="container-fluid mt-4">
        <div className="page-header">
          <h2>{language === 'vi' ? 'Quét QR Sản phẩm' : 'Product QR Scan'}</h2>
        </div>
        
        <div className="page-content">
          <div className="row mb-4">
            {/* Scanner on the left */}
            <div className="col-md-6">
              {renderScanner()}
            </div>
            
            {/* Manual input on the right */}
            <div className="col-md-6">
              {renderManualInput()}
            </div>
          </div>
          
          {/* Product info takes full width */}
          <div className="row">
            <div className="col-12">
              {loading ? (
                <div className="loading-container">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">{language === 'vi' ? 'Đang tải...' : 'Loading...'}</span>
                  </div>
                  <p>{language === 'vi' ? 'Đang xử lý...' : 'Processing...'}</p>
                </div>
              ) : error ? (
                <div className="error-container">
                  <div className="error-icon">
                    <i className="fas fa-exclamation-circle"></i>
                  </div>
                  <p className="error-message">{error}</p>
                </div>
              ) : productData ? (
                <div>
                  {renderProductInfo()}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default QRScan;