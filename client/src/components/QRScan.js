// client/src/components/QRScan.js
import React, { useState, useRef, useEffect } from 'react';
import Navbar from './Navbar';
import { useLogout } from '../hooks/useAuth';
import { useLanguage } from '../contexts/LanguageContext';
import { toast } from 'react-toastify';
import jsQR from 'jsqr'; // Import jsQR for QR code scanning
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
        // Process the image to find QR code
        // For demo, we'll just use a timeout
        setLoading(true);
        setTimeout(() => {
          // Mock data for demo purposes
          processQRCode('20250418-001');
          setLoading(false);
        }, 1000);
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

  // Process QR code data
  const processQRCode = (code) => {
    setLoading(true);
    setError(null);

    // For demo purposes, we'll just use a timeout to simulate API call
    setTimeout(() => {
      if (code === '404' || code === 'invalid') {
        setError(language === 'vi' ? 
          'Mã QR không hợp lệ. Vui lòng thử lại' : 
          'Invalid QR code. Please try again');
        setProductData(null);
      } else {
        // Mock product data for demonstration
        setProductData({
          id: code,
          productCode: 'BT-2025-V1',
          productName: 'Bộ nút bấm điều khiển',
          quantity: '1,000',
          dimensions: '120 × 85 × 35 mm',
          productionHistory: [
            {
              date: '01/04/2025',
              stage: 'materialInput',
              title: language === 'vi' ? 'Nguyên liệu đầu vào' : 'Raw Material Input',
              details: {
                materialCode: 'NL-2025-001',
                materialType: language === 'vi' ? 'Thép không gỉ 304' : 'Stainless Steel 304'
              }
            },
            {
              date: '15/04/2025',
              stage: 'pressing',
              title: language === 'vi' ? 'Ép/Dập' : 'Pressing',
              details: {
                machineName: 'ZHG513-302',
                moldCode: 'C2021'
              }
            },
            {
              date: '16/04/2025',
              stage: 'assembly',
              title: language === 'vi' ? 'Lắp ráp' : 'Assembly',
              details: {
                pic: 'nguyen hieu'
              }
            },
            {
              date: '16/04/2025 - 17/04/2025',
              stage: 'plating',
              title: language === 'vi' ? 'Mạ' : 'Plating',
              details: {}
            },
            {
              date: '20/04/2025',
              stage: 'qualityCheck',
              title: language === 'vi' ? 'Kiểm tra chất lượng' : 'Quality Check',
              details: {
                inspector: 'nguyenhieu',
                result: language === 'vi' ? 'Đạt' : 'Pass'
              }
            }
          ]
        });
      }
      setLoading(false);
    }, 1500);
  };

  // Render QR code scanner
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
          <form onSubmit={handleManualSubmit}>
            <div className="input-group">
              <label htmlFor="manualCodeInput">
                {language === 'vi' ? 'Nhập mã QR thủ công:' : 'Enter QR code manually:'}
              </label>
              <input
                type="text"
                id="manualCodeInput"
                className="form-control"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder={language === 'vi' ? 'Nhập mã sản phẩm...' : 'Enter product code...'}
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
          <div className="product-badge">
            {language === 'vi' ? 'Đạt chất lượng' : 'Quality Passed'}
          </div>
        </div>
        
        <div className="product-details">
          <div className="detail-row">
            <span className="detail-label">{language === 'vi' ? 'Mã sản phẩm' : 'Product Code'}:</span>
            <span className="detail-value">{productData.productCode}</span>
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
        </div>
        
        <h4 className="history-title">{language === 'vi' ? 'Lịch sử sản xuất' : 'Production History'}</h4>
        
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
                        {key === 'materialCode' && (language === 'vi' ? 'Mã cuộn nguyên liệu' : 'Material Roll Code')}
                        {key === 'materialType' && (language === 'vi' ? 'Loại vật liệu' : 'Material Type')}
                        {key === 'machineName' && (language === 'vi' ? 'Máy dập' : 'Machine')}
                        {key === 'moldCode' && (language === 'vi' ? 'Tên khuôn' : 'Mold')}
                        {key === 'pic' && (language === 'vi' ? 'Người phụ trách' : 'Person in Charge')}
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
          <div className="row">
            <div className="col-md-6 mb-4">
              {renderScanner()}
              {renderManualInput()}
            </div>
            
            <div className="col-md-6">
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
              ) : (
                renderProductInfo()
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default QRScan;