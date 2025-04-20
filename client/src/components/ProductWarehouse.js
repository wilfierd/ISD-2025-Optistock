// client/src/components/ProductWarehouse.js
import React, { useState } from 'react';
import Navbar from './Navbar';
import { useLogout } from '../hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import apiService from '../services/api';
import { toast } from 'react-toastify';
import { useLanguage } from '../contexts/LanguageContext';

function ProductWarehouse({ user }) {
  const { t, language } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  
  // Fetch finished products
  const { data: products = [], isLoading, error } = useQuery({
    queryKey: ['finished-products'],
    queryFn: async () => {
      const response = await apiService.finishedProducts.getAll();
      return response.data.data || [];
    },
    retry: 1,
  });
  
  const logoutMutation = useLogout();
  
  // Filter products based on search
  const filteredProducts = products.filter(product => 
    product.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.product_code.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Handle product click - show details
  const handleProductClick = (product) => {
    setSelectedProduct(product);
    setShowDetailsModal(true);
  };
  
  // Handle QR code generation
  const handleGenerateQR = (e, product) => {
    e.stopPropagation();
    setSelectedProduct(product);
    setShowQrModal(true);
  };
  
  // Handle search input change
  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };
  
  // Handle logout
  const handleLogout = () => {
    logoutMutation.mutate();
  };
  
  return (
    <div>
      <Navbar user={user} onLogout={handleLogout} />

      <div className="container-fluid mt-4">
        {/* Title and Search */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h2>{t('productWarehouse')}</h2>
          <div className="search-container" style={{ width: '300px' }}>
            <input
              type="text"
              className="form-control"
              placeholder={t('searchProducts')}
              value={searchTerm}
              onChange={handleSearch}
            />
          </div>
        </div>
        
        {/* Products Table */}
        <div className="card">
          <div className="card-header bg-primary text-white">
            <h5 className="mb-0">{t('finishedProducts')}</h5>
          </div>
          <div className="card-body">
            {isLoading ? (
              <div className="text-center my-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">{t('loading')}</span>
                </div>
              </div>
            ) : error ? (
              <div className="alert alert-danger">{error.message}</div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>{t('productName')}</th>
                      <th>{t('productCode')}</th>
                      <th>{t('quantity')}</th>
                      <th>{t('completionDate')}</th>
                      <th>{t('status')}</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.length > 0 ? (
                      filteredProducts.map(product => (
                        <tr 
                          key={product.id} 
                          onClick={() => handleProductClick(product)}
                          style={{ cursor: 'pointer' }}
                        >
                          <td>{product.product_name}</td>
                          <td>{product.product_code}</td>
                          <td>{product.quantity}</td>
                          <td>{new Date(product.completion_date).toLocaleString()}</td>
                          <td>
                            <span className={`badge bg-${product.status === 'in_stock' ? 'success' : 'secondary'}`}>
                              {product.status === 'in_stock' ? t('inStock') : product.status}
                            </span>
                          </td>
                          <td>
                            <button
                              className="btn btn-sm"
                              onClick={(e) => handleGenerateQR(e, product)}
                              title={t('generateQRCode')}
                            >
                              <i className="fas fa-qrcode"></i>
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="text-center py-3">
                          {t('noProductsFound')}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Product Details Modal */}
      {showDetailsModal && selectedProduct && (
        <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{t('productDetails')}</h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedProduct(null);
                  }}
                ></button>
              </div>
              <div className="modal-body">
                <div className="row mb-3">
                  <div className="col-md-6">
                    <p><strong>{t('productName')}:</strong> {selectedProduct.product_name}</p>
                    <p><strong>{t('productCode')}:</strong> {selectedProduct.product_code}</p>
                    <p><strong>{t('quantity')}:</strong> {selectedProduct.quantity}</p>
                    <p><strong>{t('completionDate')}:</strong> {new Date(selectedProduct.completion_date).toLocaleString()}</p>
                  </div>
                  <div className="col-md-6">
                    <p><strong>{t('status')}:</strong> {selectedProduct.status}</p>
                    <p><strong>{t('groupId')}:</strong> {selectedProduct.group_id}</p>
                    <p><strong>{t('createdBy')}:</strong> {selectedProduct.created_by_name}</p>
                  </div>
                </div>
                
                <div className="mt-4">
                  <h6>{t('productHistory')}</h6>
                  <div className="accordion" id="productHistoryAccordion">
                    {/* Material Information */}
                    <div className="accordion-item">
                      <h2 className="accordion-header">
                        <button className="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#materialInfo">
                          {t('materialInformation')}
                        </button>
                      </h2>
                      <div id="materialInfo" className="accordion-collapse collapse show">
                        <div className="accordion-body">
                          {selectedProduct.history?.material && (
                            <div>
                              <p><strong>{t('materialName')}:</strong> {selectedProduct.history.material.part_name}</p>
                              <p><strong>{t('materialCode')}:</strong> {selectedProduct.history.material.material_code}</p>
                              <p><strong>{t('supplier')}:</strong> {selectedProduct.history.material.supplier}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Production Information */}
                    <div className="accordion-item">
                      <h2 className="accordion-header">
                        <button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#productionInfo">
                          {t('productionInformation')}
                        </button>
                      </h2>
                      <div id="productionInfo" className="accordion-collapse collapse">
                        <div className="accordion-body">
                          {selectedProduct.history?.production && (
                            <div>
                              <p><strong>{t('machine')}:</strong> {selectedProduct.history.production.machine_name}</p>
                              <p><strong>{t('mold')}:</strong> {selectedProduct.history.production.mold_code}</p>
                              <p><strong>{t('startDate')}:</strong> {new Date(selectedProduct.history.production.start_date).toLocaleString()}</p>
                              <p><strong>{t('operator')}:</strong> {selectedProduct.history.production.created_by_name}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Assembly Information */}
                    <div className="accordion-item">
                      <h2 className="accordion-header">
                        <button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#assemblyInfo">
                          {t('assemblyInformation')}
                        </button>
                      </h2>
                      <div id="assemblyInfo" className="accordion-collapse collapse">
                        <div className="accordion-body">
                          {selectedProduct.history?.assembly && (
                            <div>
                              <p><strong>{t('assemblyDate')}:</strong> {new Date(selectedProduct.history.assembly.start_time).toLocaleString()}</p>
                              <p><strong>{t('assembledBy')}:</strong> {selectedProduct.history.assembly.pic_name}</p>
                              <p><strong>{t('completionTime')}:</strong> {new Date(selectedProduct.history.assembly.completion_time).toLocaleString()}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Plating Information */}
                    <div className="accordion-item">
                      <h2 className="accordion-header">
                        <button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#platingInfo">
                          {t('platingInformation')}
                        </button>
                      </h2>
                      <div id="platingInfo" className="accordion-collapse collapse">
                        <div className="accordion-body">
                          {selectedProduct.history?.plating && (
                            <div>
                              <p><strong>{t('platingDate')}:</strong> {selectedProduct.history.plating.platingDate} {selectedProduct.history.plating.platingTime}</p>
                              <p><strong>{t('completionDate')}:</strong> {new Date(selectedProduct.history.plating.platingEndTime).toLocaleString()}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedProduct(null);
                  }}
                >
                  {t('close')}
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={(e) => {
                    setShowDetailsModal(false);
                    handleGenerateQR(e, selectedProduct);
                  }}
                >
                  {t('generateQRCode')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* QR Code Modal */}
      {showQrModal && selectedProduct && (
        <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{t('productQRCode')}</h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => {
                    setShowQrModal(false);
                    setSelectedProduct(null);
                  }}
                ></button>
              </div>
              <div className="qr-code-container text-center mb-3">
                {/* Create a simplified QR data structure that's easier to scan */}
                <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
                    JSON.stringify({
                        id: selectedProduct.id,
                        product_code: selectedProduct.product_code,
                        product_name: selectedProduct.product_name,
                        scan_url: `${window.location.origin}/product/${selectedProduct.id}`
                    })
                    )}`}
                    alt="QR Code"
                    className="img-fluid"
                    style={{ maxWidth: '250px' }}
                />
                <p className="text-muted mt-2">
                    {t('scanQRCodeToTrack')}
                </p>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => {
                    setShowQrModal(false);
                    setSelectedProduct(null);
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
                        <title>${t('productQRCode')}: ${selectedProduct.product_name}</title>
                        <style>
                          body { font-family: Arial, sans-serif; margin: 20px; text-align: center; }
                          h2 { color: #0a4d8c; }
                          .product-info { margin: 20px 0; }
                          .qr-code { max-width: 300px; margin: 20px auto; }
                          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                          table th, table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                          table th { background-color: #f2f2f2; }
                        </style>
                      </head>
                      <body>
                        <h2>${t('productQRCode')}</h2>
                        <div class="product-info">
                          <h3>${selectedProduct.product_name}</h3>
                          <table>
                            <tr>
                              <th>${t('productCode')}</th>
                              <td>${selectedProduct.product_code}</td>
                            </tr>
                            <tr>
                              <th>${t('quantity')}</th>
                              <td>${selectedProduct.quantity}</td>
                            </tr>
                            <tr>
                              <th>${t('completionDate')}</th>
                              <td>${new Date(selectedProduct.completion_date).toLocaleString()}</td>
                            </tr>
                            <tr>
                              <th>${t('status')}</th>
                              <td>${selectedProduct.status}</td>
                            </tr>
                          </table>
                        </div>
                        <img src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(JSON.stringify(selectedProduct.qr_code_data || selectedProduct))}" class="qr-code" />
                        <p>${t('scanToViewProductHistory')}</p>
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
      
      {/* Modal Backdrop */}
      {(showDetailsModal || showQrModal) && (
        <div 
          className="modal-backdrop fade show"
          onClick={() => {
            setShowDetailsModal(false);
            setShowQrModal(false);
            setSelectedProduct(null);
          }}
        ></div>
      )}
    </div>
  );
}

export default ProductWarehouse;