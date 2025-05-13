// client/src/components/ProductWarehouse.js
import React, { useState, useEffect } from 'react';
import Navbar from './Navbar';
import { useLogout } from '../hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiService from '../services/api';
import { toast } from 'react-toastify';
import { useLanguage } from '../contexts/LanguageContext';
import './ProductWarehouse.css';

function ProductWarehouse({ user }) {
  const { t, language } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [productDetailLoading, setProductDetailLoading] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [isStatusUpdating, setIsStatusUpdating] = useState(false);
  const [defectCount, setDefectCount] = useState(0);
  
  const queryClient = useQueryClient();

  // Fetch finished products
  const { data: products = [], isLoading, error, refetch } = useQuery({
    queryKey: ['finished-products'],
    queryFn: async () => {
      const response = await apiService.finishedProducts.getAll();
      return response.data.data || [];
    },
    retry: 1,
  });
  
  // Mutation for updating product status with defect count
  const updateStatusMutation = useMutation({
    mutationFn: async ({ productId, status, defect_count }) => {
      return await apiService.finishedProducts.updateStatus(productId, status, defect_count);
    },
    onSuccess: (data) => {
      toast.success(t('statusUpdatedSuccessfully'));
      queryClient.invalidateQueries(['finished-products']);
      setShowDetailsModal(false);
      setSelectedProduct(null);
      setSelectedStatus('');
      setDefectCount(0);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || t('errorUpdatingStatus'));
      console.error('Error updating status:', error);
    },
    onSettled: () => {
      setIsStatusUpdating(false);
    }
  });
  
  const logoutMutation = useLogout();
  
  // Helper function to categorize products' quality status
  const getQualityDisplayStatus = (product) => {
    if (product.qualityStatus === 'OK') return 'OK';
    if (product.qualityStatus === 'NG') return 'NG';
    return 'Chờ kiểm tra';
  };
  
  // Transform products to display the correct status
  const productsWithQualityStatus = React.useMemo(() => {
    return products.map(product => {
      return {
        ...product,
        displayStatus: getQualityDisplayStatus(product),
        // Use defect_count directly from the product
        defectCount: product.defectCount || 0,
        // Calculate usable count if not already provided
        usableCount: product.usableCount !== undefined ? 
          product.usableCount : 
          Math.max(0, product.quantity - (product.defectCount || 0))
      };
    });
  }, [products]);
  
  // Fetch complete product data
  const fetchCompleteProduct = async (productId) => {
    try {
      setProductDetailLoading(true);
      const response = await apiService.finishedProducts.getById(productId);
      if (response.data && response.data.data) {
        const product = response.data.data;
        
        // Set initial values based on product data
        setSelectedProduct(product);
        
        // Set the selected status based on the quality status
        if (product.qualityStatus === 'OK') {
          setSelectedStatus('OK');
          setDefectCount(0);
        } else if (product.qualityStatus === 'NG') {
          setSelectedStatus('NG');
          setDefectCount(product.defect_count || 1);
        } else {
          // Default for Pending status
          setSelectedStatus('OK');
          setDefectCount(0);
        }
      } else {
        toast.error(t('productDataNotFound'));
      }
    } catch (error) {
      console.error('Error fetching product details:', error);
      toast.error(t('errorFetchingProductDetails'));
    } finally {
      setProductDetailLoading(false);
    }
  };

  // Handle product click
  const handleProductClick = (product) => {
    // Fetch the complete product data with history
    fetchCompleteProduct(product.id);
    setShowDetailsModal(true);
  };
  
  // Handle status change
  const handleStatusChange = (e) => {
    const newStatus = e.target.value;
    setSelectedStatus(newStatus);
    
    // Reset defect count when switching to OK
    if (newStatus !== 'NG') {
      setDefectCount(0);
    } else if (newStatus === 'NG' && selectedProduct) {
      // When switching to NG, set a default of 1 defect if none currently
      setDefectCount(Math.max(1, selectedProduct.defect_count || 0));
    }
  };
  
  // Handle defect count change
  const handleDefectCountChange = (e) => {
    const value = parseInt(e.target.value, 10);
    
    // Validate the defect count value
    if (!isNaN(value) && value >= 0 && selectedProduct) {
      if (value > selectedProduct.quantity) {
        toast.warning(t('defectCountCannotExceedTotal'));
        setDefectCount(selectedProduct.quantity);
      } else {
        setDefectCount(value);
      }
    }
  };
  
  // Handle saving the status
  const handleSaveStatus = () => {
    if (!selectedProduct) {
      toast.error(t('productNotSelected'));
      return;
    }
    
    // Validate status selection
    if (!selectedStatus) {
      toast.error(t('pleaseSelectStatus'));
      return;
    }
    
    // Validate defect count if status is NG
    if (selectedStatus === 'NG') {
      if (defectCount <= 0 || isNaN(defectCount)) {
        toast.error(t('pleaseEnterDefectCount'));
        return;
      }
      
      if (selectedProduct && defectCount > selectedProduct.quantity) {
        toast.error(t('defectCountCannotExceedTotal'));
        return;
      }
    }
    
    setIsStatusUpdating(true);
    
    // Call the updateStatus mutation with the defect_count parameter
    updateStatusMutation.mutate({
      productId: selectedProduct.id,
      status: selectedStatus,
      defect_count: selectedStatus === 'NG' ? defectCount : 0
    });
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
  
  // Handle status filter change
  const handleStatusFilterChange = (e) => {
    setStatusFilter(e.target.value);
  };
  
  // Handle date filter change
  const handleDateFilterChange = (e) => {
    setDateFilter(e.target.value);
  };
  
  // Handle logout
  const handleLogout = () => {
    logoutMutation.mutate();
  };
  
  // Helper functions
  const isSameDay = (date1, date2) => {
    return date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear();
  };
  
  const filteredProducts = React.useMemo(() => {
    return productsWithQualityStatus.filter(product => {
      // Search filter
      const matchesSearch = 
        product.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.product_code.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Status filter - now only have 'OK', 'NG', and 'Pending'
      const matchesStatus = 
        statusFilter === 'all' || 
        (statusFilter === 'ok' && product.qualityStatus === 'OK') ||
        (statusFilter === 'ng' && product.qualityStatus === 'NG') ||
        (statusFilter === 'pending' && product.qualityStatus === 'Pending');
      
      // Date filter (example implementation)
      let matchesDate = true;
      if (dateFilter !== 'all') {
        const today = new Date();
        const productDate = new Date(product.completion_date);
        
        switch (dateFilter) {
          case 'today':
            matchesDate = isSameDay(productDate, today);
            break;
          case 'week':
            const weekAgo = new Date();
            weekAgo.setDate(today.getDate() - 7);
            matchesDate = productDate >= weekAgo;
            break;
          case 'month':
            const monthAgo = new Date();
            monthAgo.setMonth(today.getMonth() - 1);
            matchesDate = productDate >= monthAgo;
            break;
          default:
            matchesDate = true;
        }
      }
      
      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [productsWithQualityStatus, searchTerm, statusFilter, dateFilter]);
  
  // Get status badge color
  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'OK':
        return 'success';
      case 'NG':
        return 'danger';
      case 'Pending':
      case 'Chờ kiểm tra':
        return 'warning';
      default:
        return 'secondary';
    }
  };
  
  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      // Check if date is valid before formatting
      if (isNaN(date.getTime())) {
        return 'N/A';
      }
      return date.toLocaleString();
    } catch (e) {
      return 'N/A';
    }
  };
  
  return (
    <div>
      <Navbar user={user} onLogout={handleLogout} />

      <div className="container-fluid mt-4">
        {/* Title and Actions */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h2>{t('productWarehouse')}</h2>
          {/* Removed scanQRCode and reportSettings buttons */}
        </div>
        
        {/* Filters */}
        <div className="card mb-4">
          <div className="card-body">
            <div className="row">
              <div className="col-md-4">
                <div className="input-group">
                  <span className="input-group-text">
                    <i className="fas fa-search"></i>
                  </span>
                  <input
                    type="text"
                    className="form-control"
                    placeholder={t('searchProducts')}
                    value={searchTerm}
                    onChange={handleSearch}
                  />
                </div>
              </div>
              <div className="col-md-3">
                <select 
                  className="form-select"
                  value={statusFilter}
                  onChange={handleStatusFilterChange}
                  aria-label={t('filterByStatus')}
                >
                  <option value="all">{t('allStatuses')}</option>
                  <option value="ok">{t('statusOK')}</option>
                  <option value="ng">{t('statusNG')}</option>
                  <option value="pending">{t('statusPending')}</option>
                </select>
              </div>
              <div className="col-md-3">
                <select 
                  className="form-select"
                  value={dateFilter}
                  onChange={handleDateFilterChange}
                  aria-label={t('filterByDate')}
                >
                  <option value="all">{t('allDates')}</option>
                  <option value="today">{t('today')}</option>
                  <option value="week">{t('lastWeek')}</option>
                  <option value="month">{t('lastMonth')}</option>
                </select>
              </div>
              <div className="col-md-2">
                <button 
                  className="btn btn-outline-secondary w-100"
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('all');
                    setDateFilter('all');
                  }}
                >
                  {t('resetFilters')}
                </button>
              </div>
            </div>
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
                      <th>{t('batchId')}</th>
                      <th>{t('productName')}</th>
                      <th>{t('productCode')}</th>
                      <th>{t('dimensions')}</th>
                      <th>{t('quantity')}</th>
                      <th>{t('completionDate')}</th>
                      <th>{t('qualityStatus')}</th>
                      <th>{t('actions')}</th>
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
                          <td>
                            <span className="batch-id">
                              #{product.id}
                              <small className="text-muted d-block">
                                {t('groupId')}: {product.group_id}
                              </small>
                            </span>
                          </td>
                          <td>{product.product_name}</td>
                          <td>{product.product_code}</td>
                          <td>
                            {/* Simulated dimensions - in a real implementation, these would come from the API */}
                            150 × 75 × 3 mm
                          </td>
                          <td>{product.quantity}</td>
                          <td>{new Date(product.completion_date).toLocaleString()}</td>
                          <td>
                            <span className={`badge bg-${getStatusBadgeColor(product.qualityStatus)}`}>
                              {product.displayStatus}
                              {product.qualityStatus === 'NG' && product.defectCount > 0 && 
                                ` (${product.defectCount})`
                              }
                            </span>
                          </td>
                          <td>
                            <div className="action-buttons">
                              <button
                                className="btn btn-sm btn-outline-primary me-1"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleProductClick(product);
                                }}
                                title={t('viewDetails')}
                              >
                                <i className="fas fa-info-circle"></i>
                              </button>
                              <button
                                className="btn btn-sm btn-outline-secondary"
                                onClick={(e) => handleGenerateQR(e, product)}
                                title={t('generateQRCode')}
                              >
                                <i className="fas fa-qrcode"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="8" className="text-center py-3">
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
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{t('productDetails')}</h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedProduct(null);
                    setSelectedStatus('');
                    setDefectCount(0);
                  }}
                ></button>
              </div>
              <div className="modal-body">
                {productDetailLoading ? (
                  <div className="text-center my-5">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">{t('loading')}</span>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="row mb-3">
                      <div className="col-md-6">
                        <div className="product-detail-field">
                          <span className="detail-label">{t('productName')}:</span>
                          <span className="detail-value">{selectedProduct.product_name}</span>
                        </div>
                        <div className="product-detail-field">
                          <span className="detail-label">{t('productCode')}:</span>
                          <span className="detail-value">{selectedProduct.product_code}</span>
                        </div>
                        <div className="product-detail-field">
                          <span className="detail-label">{t('quantity')}:</span>
                          <span className="detail-value">{selectedProduct.quantity}</span>
                        </div>
                        <div className="product-detail-field">
                          <span className="detail-label">{t('dimensions')}:</span>
                          <span className="detail-value">150 × 75 × 3 mm</span>
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="product-detail-field">
                          <span className="detail-label">{t('groupId')}:</span>
                          <span className="detail-value">{selectedProduct.group_id}</span>
                        </div>
                        <div className="product-detail-field">
                          <span className="detail-label">{t('completionDate')}:</span>
                          <span className="detail-value">{formatDateTime(selectedProduct.completion_date)}</span>
                        </div>
                        <div className="product-detail-field">
                          <span className="detail-label">{t('qualityStatus')}:</span>
                          <span className="detail-value">
                            <span className={`badge bg-${getStatusBadgeColor(selectedProduct.qualityStatus)}`}>
                              {selectedProduct.displayStatus || 'Chờ kiểm tra'}
                              {selectedProduct.qualityStatus === 'NG' && selectedProduct.defect_count > 0 && 
                                ` (${selectedProduct.defect_count})`
                              }
                            </span>
                          </span>
                        </div>
                        <div className="product-detail-field">
                          <span className="detail-label">{t('createdBy')}:</span>
                          <span className="detail-value">{selectedProduct.created_by_name}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Status Update Section - Only OK and NG options */}
                    <div className="card mt-3 mb-4">
                      <div className="card-header bg-light">
                        <h6 className="mb-0">{t('updateStatus')}</h6>
                      </div>
                      <div className="card-body">
                        <div className="row">
                          <div className="col-md-5">
                            <span className="detail-label">{t('currentStatus')}:</span>
                            <span className={`badge bg-${getStatusBadgeColor(selectedProduct.qualityStatus)} ms-2`}>
                              {selectedProduct.displayStatus || 'Chờ kiểm tra'}
                              {selectedProduct.qualityStatus === 'NG' && selectedProduct.defect_count > 0 && 
                                ` (${selectedProduct.defect_count})`
                              }
                            </span>
                          </div>
                          <div className="col-md-7">
                            <div className="mb-3">
                              <label className="form-label">{t('newStatus')}:</label>
                              <div className="d-flex align-items-center">
                                <div className="form-check form-check-inline">
                                  <input
                                    className="form-check-input"
                                    type="radio"
                                    name="statusOption"
                                    id="statusOK"
                                    value="OK"
                                    checked={selectedStatus === 'OK'}
                                    onChange={handleStatusChange}
                                  />
                                  <label className="form-check-label" htmlFor="statusOK">
                                    OK
                                  </label>
                                </div>
                                <div className="form-check form-check-inline">
                                  <input
                                    className="form-check-input"
                                    type="radio"
                                    name="statusOption"
                                    id="statusNG"
                                    value="NG"
                                    checked={selectedStatus === 'NG'}
                                    onChange={handleStatusChange}
                                  />
                                  <label className="form-check-label" htmlFor="statusNG">
                                    NG
                                  </label>
                                </div>
                              </div>
                            </div>
                            
                            {/* Defect count input appears when NG is selected */}
                            {selectedStatus === 'NG' && (
                              <div className="mb-3">
                                <label htmlFor="defectCount" className="form-label">{t('defectCount')}:</label>
                                <input
                                  id="defectCount"
                                  type="number"
                                  className="form-control"
                                  value={defectCount}
                                  onChange={handleDefectCountChange}
                                  min="1"
                                  max={selectedProduct.quantity}
                                  required
                                />
                                <div className="form-text">
                                  {t('maxDefects')}: {selectedProduct.quantity}
                                </div>
                              </div>
                            )}
                            
                            <button 
                              className="btn btn-primary" 
                              onClick={handleSaveStatus}
                              disabled={isStatusUpdating}
                            >
                              {isStatusUpdating ? (
                                <>
                                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                  {t('saving')}
                                </>
                              ) : t('saveStatus')}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Display the defect details section if NG (using defect_count from API) */}
                    {selectedProduct.qualityStatus === 'NG' && selectedProduct.defect_count > 0 && (
                      <div className="alert alert-warning mt-3">
                        <h6 className="mb-2">{t('defectDetails')}</h6>
                        <div className="row">
                          <div className="col">
                            <div className="product-detail-field">
                              <span className="detail-label">{t('totalQuantity')}:</span>
                              <span className="detail-value">{selectedProduct.quantity}</span>
                            </div>
                          </div>
                          <div className="col">
                            <div className="product-detail-field">
                              <span className="detail-label">{t('defectCount')}:</span>
                              <span className="detail-value">{selectedProduct.defect_count}</span>
                            </div>
                          </div>
                          <div className="col">
                            <div className="product-detail-field">
                              <span className="detail-label">{t('usableCount')}:</span>
                              <span className="detail-value">
                                {Math.max(0, selectedProduct.quantity - selectedProduct.defect_count)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Display quality check history if available */}
                    {selectedProduct.history?.quality_checks?.length > 0 && (
                      <div className="mt-4">
                        <h6>{t('qualityCheckHistory')}</h6>
                        <div className="table-responsive">
                          <table className="table table-sm table-bordered">
                            <thead className="table-light">
                              <tr>
                                <th>{t('date')}</th>
                                <th>{t('status')}</th>
                                <th>{t('defectCount')}</th>
                                <th>{t('inspector')}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedProduct.history.quality_checks.map((check, index) => (
                                <tr key={check.id || index}>
                                  <td>{check.formatted_check_date || formatDateTime(check.check_date)}</td>
                                  <td>
                                    <span className={`badge bg-${getStatusBadgeColor(check.status)}`}>
                                      {check.status === 'Pending' ? 'Chờ kiểm tra' : check.status}
                                    </span>
                                  </td>
                                  <td>{check.defect_count}</td>
                                  <td>{check.inspector_name}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                    
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
                              {selectedProduct.history?.material ? (
                                <div>
                                  <p><strong>{t('materialName')}:</strong> {selectedProduct.history.material.part_name}</p>
                                  <p><strong>{t('materialCode')}:</strong> {selectedProduct.history.material.material_code}</p>
                                  <p><strong>{t('supplier')}:</strong> {selectedProduct.history.material.supplier}</p>
                                  <p><strong>{t('lastUpdated')}:</strong> {selectedProduct.history.material.last_updated}</p>
                                </div>
                              ) : (
                                <p>{t('noMaterialInformation')}</p>
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
      {selectedProduct.history?.production ? (
        <div>
          <p><strong>{t('machine')}:</strong> {selectedProduct.history.production.machine_name}</p>
          <p><strong>{t('mold')}:</strong> {selectedProduct.history.production.mold_code}</p>
          <p><strong>{t('startDate')}:</strong> {selectedProduct.history.production.formatted_start_date || formatDateTime(selectedProduct.history.production.start_date)}</p>
          {selectedProduct.history.production.end_date && (
            <p><strong>{t('endDate')}:</strong> {selectedProduct.history.production.formatted_end_date || formatDateTime(selectedProduct.history.production.end_date)}</p>
          )}
          <p><strong>{t('operator')}:</strong> {selectedProduct.history.production.operator_name || selectedProduct.history.production.created_by_username}</p>
        </div>
      ) : (
        <p>{t('noProductionInformation')}</p>
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
                              {selectedProduct.history?.assembly ? (
                                <div>
                                  <p><strong>{t('assemblyDate')}:</strong> {formatDateTime(selectedProduct.history.assembly.start_time)}</p>
                                  <p><strong>{t('assembledBy')}:</strong> {selectedProduct.history.assembly.pic_name}</p>
                                  <p><strong>{t('completionTime')}:</strong> {formatDateTime(selectedProduct.history.assembly.completion_time)}</p>
                                </div>
                              ) : (
                                <p>{t('noAssemblyInformation')}</p>
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
                              {selectedProduct.history?.plating ? (
                                <div>
                                  <p><strong>{t('platingDate')}:</strong> {formatDateTime(selectedProduct.history.plating.plating_start_time)}</p>
                                  <p><strong>{t('completionDate')}:</strong> {formatDateTime(selectedProduct.history.plating.plating_end_time)}</p>
                                </div>
                              ) : (
                                <p>{t('noPlatingInformation')}</p>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Quality Control Information */}
                        <div className="accordion-item">
                          <h2 className="accordion-header">
                            <button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#qualityInfo">
                              {t('qualityControlInformation')}
                            </button>
                          </h2>
                          <div id="qualityInfo" className="accordion-collapse collapse">
                            <div className="accordion-body">
                              {selectedProduct.quality_status && selectedProduct.quality_status !== 'Pending' ? (
                                <div>
                                  <p><strong>{t('inspectionDate')}:</strong> {formatDateTime(selectedProduct.inspection_date)}</p>
                                  <p><strong>{t('inspector')}:</strong> {selectedProduct.inspector_name}</p>
                                  <p><strong>{t('qualityStatus')}:</strong> 
                                    <span className={`badge bg-${getStatusBadgeColor(selectedProduct.quality_status)} ms-2`}>
                                      {selectedProduct.quality_status}
                                      {selectedProduct.quality_status === 'NG' && selectedProduct.defect_count > 0 && 
                                        ` (${selectedProduct.defect_count})`
                                      }
                                    </span>
                                  </p>
                                  {selectedProduct.quality_status === 'NG' && selectedProduct.defect_count > 0 && (
                                    <div className="mt-2">
                                      <p><strong>{t('defectDetails')}:</strong></p>
                                      <ul>
                                        <li>{t('defectType')}: {t('surfaceDefect')}</li>
                                        <li>{t('affectedQuantity')}: {selectedProduct.defect_count}</li>
                                        <li>{t('repairability')}: {t('notRepairable')}</li>
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="placeholder-info">
                                  <p>{t('pendingQualityCheck')}</p>
                                  <p>{t('completeQualityCheckInstructions')}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedProduct(null);
                    setSelectedStatus('');
                    setDefectCount(0);
                  }}
                >
                  {t('close')}
                </button>
                <button
                  type="button" 
                  className="btn btn-primary"
                  onClick={() => {
                    window.location.href = `/product/${selectedProduct.id}`;
                  }}
                >
                  {t('viewFullDetails')}
                </button>
                <button
                  type="button"
                  className="btn btn-outline-primary"
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
              <div className="modal-body text-center">
                <h6 className="mb-3">{selectedProduct.product_name} ({selectedProduct.product_code})</h6>
                
                <div className="qr-code-container">
                  {/* Create a simplified QR data structure that's easier to scan */}
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
                      JSON.stringify({
                        id: selectedProduct.id,
                        product_code: selectedProduct.product_code,
                        product_name: selectedProduct.product_name,
                        qualityStatus: selectedProduct.qualityStatus,
                        dimensions: "150 × 75 × 3 mm",
                        quantity: selectedProduct.quantity,
                        defect_count: selectedProduct.defect_count || 0,
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
                
                <div className="qr-details mt-3">
                  <div className="row">
                    <div className="col-6 text-start">
                      <p className="mb-1"><strong>{t('batchId')}:</strong> #{selectedProduct.id}</p>
                      <p className="mb-1"><strong>{t('quantity')}:</strong> {selectedProduct.quantity}</p>
                    </div>
                    <div className="col-6 text-start">
                      <p className="mb-1"><strong>{t('groupId')}:</strong> {selectedProduct.group_id}</p>
                      <p className="mb-1">
                        <strong>{t('qualityStatus')}:</strong>
                        <span className={`badge bg-${getStatusBadgeColor(selectedProduct.qualityStatus)} ms-2`}>
                          {selectedProduct.displayStatus || 'Chờ kiểm tra'}
                          {selectedProduct.qualityStatus === 'NG' && selectedProduct.defect_count > 0 && 
                            ` (${selectedProduct.defect_count})`
                          }
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
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
                          .badge {
                            padding: 3px 8px;
                            border-radius: 4px;
                            font-size: 12px;
                            font-weight: bold;
                            color: white;
                          }
                          .badge-success { background-color: #28a745; }
                          .badge-danger { background-color: #dc3545; }
                          .badge-warning { background-color: #ffc107; color: #212529; }
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
                              <th>${t('dimensions')}</th>
                              <td>150 × 75 × 3 mm</td>
                            </tr>
                            <tr>
                              <th>${t('qualityStatus')}</th>
                              <td>
                                <span class="badge badge-${getStatusBadgeColor(selectedProduct.qualityStatus)}">
                                  ${selectedProduct.displayStatus || 'Chờ kiểm tra'}
                                  ${selectedProduct.qualityStatus === 'NG' && selectedProduct.defect_count > 0 ? 
                                    ` (${selectedProduct.defect_count})` : ''}
                                </span>
                              </td>
                            </tr>
                            <tr>
                              <th>${t('completionDate')}</th>
                              <td>${new Date(selectedProduct.completion_date).toLocaleString()}</td>
                            </tr>
                            <tr>
                              <th>${t('batchId')}</th>
                              <td>#${selectedProduct.id}</td>
                            </tr>
                          </table>
                        </div>
                        <img src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
                          JSON.stringify({
                            id: selectedProduct.id,
                            product_code: selectedProduct.product_code,
                            product_name: selectedProduct.product_name,
                            qualityStatus: selectedProduct.qualityStatus,
                            dimensions: "150 × 75 × 3 mm",
                            quantity: selectedProduct.quantity,
                            defect_count: selectedProduct.defect_count || 0,
                            scan_url: `${window.location.origin}/product/${selectedProduct.id}`
                          })
                        )}" class="qr-code" />
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
            setSelectedStatus('');
            setDefectCount(0);
          }}
        ></div>
      )}
    </div>
  );
}

export default ProductWarehouse;