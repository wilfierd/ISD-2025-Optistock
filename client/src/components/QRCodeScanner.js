// client/src/components/QRCodeScanner.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import { useLogout } from '../hooks/useAuth';
import { toast } from 'react-toastify';
import { useLanguage } from '../contexts/LanguageContext';
import './QRCodeScanner.css';

function QRCodeScanner({ user }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [scanInput, setScanInput] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanHistory, setScanHistory] = useState([]);
  const [productData, setProductData] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [error, setError] = useState(null);
  
  const logoutMutation = useLogout();
  
  // When component mounts, focus on the input field
  useEffect(() => {
    // Check for previous scans in local storage
    const previousScans = localStorage.getItem('qrScanHistory');
    if (previousScans) {
      try {
        setScanHistory(JSON.parse(previousScans).slice(0, 5)); // Keep last 5 scans
      } catch (e) {
        console.error('Error parsing scan history:', e);
      }
    }
    
    // Set focus on input field
    const timer = setTimeout(() => {
      const inputElement = document.getElementById('qr-scan-input');
      if (inputElement) {
        inputElement.focus();
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Save scan history to local storage
  useEffect(() => {
    if (scanHistory.length > 0) {
      localStorage.setItem('qrScanHistory', JSON.stringify(scanHistory));
    }
  }, [scanHistory]);
  
  // Handle input change
  const handleInputChange = (e) => {
    setScanInput(e.target.value);
  };
  
  // Process QR code data
  const processQRCode = async (qrData) => {
    setIsScanning(true);
    setError(null);
    
    try {
      // Try to parse as JSON
      let productId = null;
      let productInfo = null;
      
      try {
        const parsedData = JSON.parse(qrData);
        productId = parsedData.id;
        productInfo = parsedData;
      } catch (e) {
        // If not valid JSON, try to extract ID directly
        if (/^\d+$/.test(qrData.trim())) {
          productId = qrData.trim();
        } else if (qrData.includes('/product/')) {
          const parts = qrData.split('/product/');
          const idPart = parts[parts.length - 1].trim();
          const matches = idPart.match(/^(\d+)/);
          if (matches && matches[1]) {
            productId = matches[1];
          }
        }
      }
      
      if (!productId) {
        throw new Error(t('invalidQrCode'));
      }
      
      // In a real implementation, this would call the API
      // For demonstration, we'll simulate a server response
      // In a real app, use: const response = await apiService.finishedProducts.getById(productId);
      
      // Simulate API response delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Generate a mock product if we don't have complete info
      if (!productInfo || !productInfo.product_name) {
        productInfo = {
          id: productId,
          product_name: `Product ${productId}`,
          product_code: `PRD-${productId}`,
          qualityStatus: Math.random() > 0.8 ? 'NG' : 'OK',
          dimensions: "150 × 75 × 3 mm",
          quantity: Math.floor(Math.random() * 100) + 10,
          completion_date: new Date().toISOString(),
          // Add production history info
          materialName: 'AL1100',
          materialCode: 'ABC123',
          supplier: 'SHENZEN',
          machine: 'A7-45T',
          mold: 'ZHG513-302-V1',
          assemblyDate: new Date(Date.now() - 24*60*60*1000).toLocaleString(),
          platingDate: new Date(Date.now() - 12*60*60*1000).toLocaleString()
        };
      }
      
      // Set product data and show details
      setProductData(productInfo);
      setShowDetails(true);
      
      // Add to scan history
      const scanTime = new Date();
      const newScan = {
        id: scanTime.getTime(),
        productId,
        productName: productInfo.product_name || `Product ${productId}`,
        scanTime,
        success: true
      };
      
      setScanHistory(prev => {
        const updated = [newScan, ...prev].slice(0, 5); // Keep last 5 scans
        return updated;
      });
      
      toast.success(`${t('productScanned')}: ${productInfo.product_name || `Product ${productId}`}`);
      
    } catch (error) {
      setError(error.message || t('scanError'));
      
      // Add to scan history as failed
      const scanTime = new Date();
      const newScan = {
        id: scanTime.getTime(),
        rawInput: qrData,
        scanTime,
        success: false,
        error: error.message
      };
      
      setScanHistory(prev => {
        const updated = [newScan, ...prev].slice(0, 5); // Keep last 5 scans
        return updated;
      });
      
      toast.error(error.message || t('scanError'));
    } finally {
      setIsScanning(false);
      setScanInput('');
    }
  };
  
  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!scanInput.trim()) {
      toast.warning(t('enterQrCode'));
      return;
    }
    
    processQRCode(scanInput.trim());
  };
  
  // Handle view details button
  const handleViewDetails = () => {
    if (productData && productData.id) {
      navigate(`/product/${productData.id}`);
    }
  };
  
  // Handle logout
  const handleLogout = () => {
    logoutMutation.mutate();
  };
  
  // Format date for display
  const formatDate = (date) => {
    try {
      return new Date(date).toLocaleString();
    } catch (e) {
      return date;
    }
  };
  
  // Get status badge color
  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'OK':
        return 'success';
      case 'NG':
        return 'danger';
      default:
        return 'warning';
    }
  };
  
  return (
    <div>
      <Navbar user={user} onLogout={handleLogout} />
      
      <div className="container-fluid mt-4">
        <div className="row">
          <div className="col-lg-6">
            <div className="card mb-4">
              <div className="card-header bg-primary text-white">
                <h5 className="mb-0">
                  <i className="fas fa-qrcode me-2"></i>
                  {t('scanQrCode')}
                </h5>
              </div>
              <div className="card-body">
                <div className="qr-scan-area mb-4">
                  <div className="text-center">
                    <div className="scan-frame">
                      <div className="scan-animation"></div>
                      <i className="fas fa-qrcode fa-5x scan-icon"></i>
                    </div>
                    <div className="scan-instructions mt-3">
                      {isScanning ? (
                        <div className="scanning-indicator">
                          <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">{t('scanning')}</span>
                          </div>
                          <p className="my-2">{t('scanning')}</p>
                        </div>
                      ) : (
                        <p>
                          {t('scanQRCodeInstructions')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                
                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label htmlFor="qr-scan-input" className="form-label">
                      {t('enterQrCode')}
                    </label>
                    <div className="input-group">
                      <input
                        type="text"
                        className="form-control"
                        id="qr-scan-input"
                        placeholder={t('enterQrCodePlaceholder')}
                        value={scanInput}
                        onChange={handleInputChange}
                        disabled={isScanning}
                        autoFocus
                      />
                      <button 
                        type="submit" 
                        className="btn btn-primary"
                        disabled={isScanning || !scanInput.trim()}
                      >
                        {isScanning ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                            {t('scanning')}
                          </>
                        ) : (
                          <>
                            <i className="fas fa-search me-2"></i>
                            {t('scan')}
                          </>
                        )}
                      </button>
                    </div>
                    <div className="form-text">
                      {t('scanInputHelp')}
                    </div>
                  </div>
                </form>
                
                {error && (
                  <div className="alert alert-danger mt-3">
                    <i className="fas fa-exclamation-triangle me-2"></i>
                    {error}
                  </div>
                )}
                
                <div className="scan-history mt-4">
                  <h6>{t('recentScans')}</h6>
                  {scanHistory.length > 0 ? (
                    <div className="table-responsive">
                      <table className="table table-sm">
                        <thead>
                          <tr>
                            <th>{t('time')}</th>
                            <th>{t('product')}</th>
                            <th>{t('status')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {scanHistory.map(scan => (
                            <tr key={scan.id} className={!scan.success ? 'table-danger' : ''}>
                              <td>{scan.scanTime.toLocaleTimeString()}</td>
                              <td>
                                {scan.success ? (
                                  <a href={`/product/${scan.productId}`}>{scan.productName}</a>
                                ) : (
                                  <span className="text-muted">{scan.rawInput?.substring(0, 20)}{scan.rawInput?.length > 20 ? '...' : ''}</span>
                                )}
                              </td>
                              <td>
                                {scan.success ? (
                                  <span className="badge bg-success">{t('success')}</span>
                                ) : (
                                  <span className="badge bg-danger">{t('failed')}</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-muted">
                      <i className="fas fa-info-circle me-2"></i>
                      {t('noRecentScans')}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <div className="col-lg-6">
            {showDetails && productData ? (
              <div className="card">
                <div className="card-header bg-success text-white">
                  <h5 className="mb-0">
                    <i className="fas fa-info-circle me-2"></i>
                    {t('productDetails')}
                  </h5>
                </div>
                <div className="card-body">
                  <div className="product-header d-flex align-items-center mb-4">
                    <div className="product-icon me-3">
                      <i className="fas fa-box fa-3x text-primary"></i>
                    </div>
                    <div className="product-title">
                      <h4 className="mb-1">{productData.product_name}</h4>
                      <div className="product-meta">
                        <span className="product-code me-3">{productData.product_code}</span>
                        <span className={`badge bg-${getStatusBadgeColor(productData.qualityStatus)}`}>
                          {productData.qualityStatus}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="row mb-4">
                    <div className="col-md-6">
                      <div className="info-group">
                        <label>{t('dimensions')}</label>
                        <div className="info-value">{productData.dimensions}</div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="info-group">
                        <label>{t('quantity')}</label>
                        <div className="info-value">{productData.quantity}</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="production-timeline mb-4">
                    <h6 className="section-title">
                      <i className="fas fa-stream me-2"></i>
                      {t('productionProcess')}
                    </h6>
                    
                    <div className="timeline">
                      <div className="timeline-item">
                        <div className="timeline-point bg-primary"></div>
                        <div className="timeline-content">
                          <div className="timeline-title">{t('rawMaterial')}</div>
                          <div className="timeline-body">
                            <div><strong>{t('materialCode')}:</strong> {productData.materialCode}</div>
                            <div><strong>{t('supplier')}:</strong> {productData.supplier}</div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="timeline-item">
                        <div className="timeline-point bg-info"></div>
                        <div className="timeline-content">
                          <div className="timeline-title">{t('production')}</div>
                          <div className="timeline-body">
                            <div><strong>{t('machine')}:</strong> {productData.machine}</div>
                            <div><strong>{t('mold')}:</strong> {productData.mold}</div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="timeline-item">
                        <div className="timeline-point bg-warning"></div>
                        <div className="timeline-content">
                          <div className="timeline-title">{t('assembly')}</div>
                          <div className="timeline-body">
                            <div><strong>{t('date')}:</strong> {productData.assemblyDate}</div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="timeline-item">
                        <div className="timeline-point bg-secondary"></div>
                        <div className="timeline-content">
                          <div className="timeline-title">{t('plating')}</div>
                          <div className="timeline-body">
                            <div><strong>{t('date')}:</strong> {productData.platingDate}</div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="timeline-item">
                        <div className="timeline-point bg-success"></div>
                        <div className="timeline-content">
                          <div className="timeline-title">{t('qualityCheck')}</div>
                          <div className="timeline-body">
                            <div><strong>{t('status')}:</strong> 
                              <span className={`badge bg-${getStatusBadgeColor(productData.qualityStatus)} ms-2`}>
                                {productData.qualityStatus}
                              </span>
                            </div>
                            <div><strong>{t('date')}:</strong> {formatDate(productData.completion_date)}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="d-grid">
                    <button 
                      className="btn btn-primary"
                      onClick={handleViewDetails}
                    >
                      <i className="fas fa-external-link-alt me-2"></i>
                      {t('viewFullDetails')}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="card">
                <div className="card-header bg-light">
                  <h5 className="mb-0">{t('scanResult')}</h5>
                </div>
                <div className="card-body text-center py-5">
                  <div className="empty-state">
                    <i className="fas fa-qrcode fa-4x text-muted mb-3"></i>
                    <h6 className="mb-3">{t('noProductScanned')}</h6>
                    <p className="text-muted">
                      {t('scanQrToSeeDetails')}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default QRCodeScanner;