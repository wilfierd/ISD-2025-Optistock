// Create a new file: client/src/components/ProductDetail.js

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import { useLogout } from '../hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import apiService from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';

function ProductDetail({ user }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('overview');
  
  // Fetch product data
  const { data: product, isLoading, error } = useQuery({
    queryKey: ['product', id],
    queryFn: async () => {
      const response = await apiService.finishedProducts.getById(id);
      return response.data.data || null;
    },
    retry: 1,
  });
  
  const logoutMutation = useLogout();
  
  // Handle logout
  const handleLogout = () => {
    logoutMutation.mutate();
  };
  
  // Handle back button
  const handleBack = () => {
    navigate('/product-warehouse');
  };
  
  // Render timestamps
  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch (e) {
      return dateString;
    }
  };
  
  return (
    <div>
      <Navbar user={user} onLogout={handleLogout} />
      
      <div className="container-fluid mt-4">
        {/* Back button */}
        <button 
          className="btn btn-outline-secondary mb-3"
          onClick={handleBack}
        >
          <i className="fas fa-arrow-left me-2"></i> {t('backToWarehouse')}
        </button>
        
        {isLoading ? (
          <div className="text-center my-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">{t('loading')}</span>
            </div>
          </div>
        ) : error ? (
          <div className="alert alert-danger">
            <h4>{t('error')}</h4>
            <p>{error.message || t('productNotFound')}</p>
          </div>
        ) : !product ? (
          <div className="alert alert-warning">
            <h4>{t('productNotFound')}</h4>
            <p>{t('productDoesNotExist')}</p>
          </div>
        ) : (
          <div className="row">
            {/* Product Overview */}
            <div className="col-md-12 mb-4">
              <div className="card">
                <div className="card-header bg-primary text-white">
                  <h4 className="mb-0">{product.product_name}</h4>
                </div>
                <div className="card-body">
                  <div className="row">
                    <div className="col-md-6">
                      <h5>{t('productDetails')}</h5>
                      <table className="table table-borderless">
                        <tbody>
                          <tr>
                            <th style={{ width: "40%" }}>{t('productCode')}</th>
                            <td>{product.product_code}</td>
                          </tr>
                          <tr>
                            <th>{t('quantity')}</th>
                            <td>{product.quantity}</td>
                          </tr>
                          <tr>
                            <th>{t('completionDate')}</th>
                            <td>{formatDateTime(product.completion_date)}</td>
                          </tr>
                          <tr>
                            <th>{t('status')}</th>
                            <td>
                              <span className={`badge bg-${product.status === 'in_stock' ? 'success' : 'secondary'}`}>
                                {product.status === 'in_stock' ? t('inStock') : product.status}
                              </span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <div className="col-md-6">
                      <h5>{t('manufacturingInfo')}</h5>
                      <table className="table table-borderless">
                        <tbody>
                          <tr>
                            <th style={{ width: "40%" }}>{t('groupId')}</th>
                            <td>{product.group_id}</td>
                          </tr>
                          <tr>
                            <th>{t('createdBy')}</th>
                            <td>{product.created_by_name}</td>
                          </tr>
                          <tr>
                            <th>{t('createdAt')}</th>
                            <td>{formatDateTime(product.created_at)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Tabs for Production History */}
            <div className="col-md-12">
              <div className="card">
                <div className="card-header">
                  <ul className="nav nav-tabs card-header-tabs">
                    <li className="nav-item">
                      <button 
                        className={`nav-link ${activeTab === 'overview' ? 'active' : ''}`} 
                        onClick={() => setActiveTab('overview')}
                      >
                        {t('overview')}
                      </button>
                    </li>
                    <li className="nav-item">
                      <button 
                        className={`nav-link ${activeTab === 'material' ? 'active' : ''}`} 
                        onClick={() => setActiveTab('material')}
                      >
                        {t('materialInfo')}
                      </button>
                    </li>
                    <li className="nav-item">
                      <button 
                        className={`nav-link ${activeTab === 'production' ? 'active' : ''}`} 
                        onClick={() => setActiveTab('production')}
                      >
                        {t('productionInfo')}
                      </button>
                    </li>
                    <li className="nav-item">
                      <button 
                        className={`nav-link ${activeTab === 'assembly' ? 'active' : ''}`} 
                        onClick={() => setActiveTab('assembly')}
                      >
                        {t('assemblyInfo')}
                      </button>
                    </li>
                    <li className="nav-item">
                      <button 
                        className={`nav-link ${activeTab === 'plating' ? 'active' : ''}`} 
                        onClick={() => setActiveTab('plating')}
                      >
                        {t('platingInfo')}
                      </button>
                    </li>
                  </ul>
                </div>
                <div className="card-body">
                  {activeTab === 'overview' && (
                    <div className="product-timeline">
                      <h5>{t('manufacturingTimeline')}</h5>
                      <div className="timeline">
                        {product.history?.material && (
                          <div className="timeline-item">
                            <div className="timeline-marker bg-primary"></div>
                            <div className="timeline-content">
                              <h6>{t('rawMaterial')}</h6>
                              <p><strong>{t('material')}:</strong> {product.history.material.part_name}</p>
                              <p><strong>{t('supplier')}:</strong> {product.history.material.supplier}</p>
                            </div>
                          </div>
                        )}
                        
                        {product.history?.production && (
                          <div className="timeline-item">
                            <div className="timeline-marker bg-info"></div>
                            <div className="timeline-content">
                              <h6>{t('production')}</h6>
                              <p><strong>{t('startDate')}:</strong> {formatDateTime(product.history.production.start_date)}</p>
                              <p><strong>{t('machine')}:</strong> {product.history.production.machine_name}</p>
                            </div>
                          </div>
                        )}
                        
                        {product.history?.assembly && (
                          <div className="timeline-item">
                            <div className="timeline-marker bg-warning"></div>
                            <div className="timeline-content">
                              <h6>{t('assembly')}</h6>
                              <p><strong>{t('assemblyDate')}:</strong> {formatDateTime(product.history.assembly.start_time)}</p>
                              <p><strong>{t('assembledBy')}:</strong> {product.history.assembly.pic_name}</p>
                            </div>
                          </div>
                        )}
                        
                        {product.history?.plating && (
                          <div className="timeline-item">
                            <div className="timeline-marker bg-success"></div>
                            <div className="timeline-content">
                              <h6>{t('plating')}</h6>
                              <p><strong>{t('platingDate')}:</strong> {product.history.plating.platingDate} {product.history.plating.platingTime}</p>
                              <p><strong>{t('completionDate')}:</strong> {formatDateTime(product.history.plating.platingEndTime)}</p>
                            </div>
                          </div>
                        )}
                        
                        <div className="timeline-item">
                          <div className="timeline-marker bg-dark"></div>
                          <div className="timeline-content">
                            <h6>{t('finalProduct')}</h6>
                            <p><strong>{t('completionDate')}:</strong> {formatDateTime(product.completion_date)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Material Information Tab */}
                  {activeTab === 'material' && product.history?.material && (
                    <div className="material-info">
                      <h5>{t('materialInformation')}</h5>
                      <div className="row mt-3">
                        <div className="col-md-6">
                          <table className="table table-striped">
                            <tbody>
                              <tr>
                                <th>{t('partName')}</th>
                                <td>{product.history.material.part_name}</td>
                              </tr>
                              <tr>
                                <th>{t('materialCode')}</th>
                                <td>{product.history.material.material_code}</td>
                              </tr>
                              <tr>
                                <th>{t('materialType')}</th>
                                <td>{product.history.material.material_type}</td>
                              </tr>
                              <tr>
                                <th>{t('dimensions')}</th>
                                <td>{product.history.material.length} x {product.history.material.width}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                        <div className="col-md-6">
                          <table className="table table-striped">
                            <tbody>
                              <tr>
                                <th>{t('packetNo')}</th>
                                <td>{product.history.material.packet_no}</td>
                              </tr>
                              <tr>
                                <th>{t('supplier')}</th>
                                <td>{product.history.material.supplier}</td>
                              </tr>
                              <tr>
                                <th>{t('updatedBy')}</th>
                                <td>{product.history.material.updated_by}</td>
                              </tr>
                              <tr>
                                <th>{t('lastUpdated')}</th>
                                <td>{product.history.material.last_updated}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Production Information Tab */}
                  {activeTab === 'production' && product.history?.production && (
                    <div className="production-info">
                      <h5>{t('productionInformation')}</h5>
                      <div className="row mt-3">
                        <div className="col-md-6">
                          <table className="table table-striped">
                            <tbody>
                              <tr>
                                <th>{t('machine')}</th>
                                <td>{product.history.production.machine_name}</td>
                              </tr>
                              <tr>
                                <th>{t('mold')}</th>
                                <td>{product.history.production.mold_code}</td>
                              </tr>
                              <tr>
                                <th>{t('startDate')}</th>
                                <td>{formatDateTime(product.history.production.start_date)}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                        <div className="col-md-6">
                          <table className="table table-striped">
                            <tbody>
                              <tr>
                                <th>{t('expectedOutput')}</th>
                                <td>{product.history.production.expected_output}</td>
                              </tr>
                              <tr>
                                <th>{t('actualOutput')}</th>
                                <td>{product.history.production.actual_output}</td>
                              </tr>
                              <tr>
                                <th>{t('status')}</th>
                                <td>{product.history.production.status}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Assembly Information Tab */}
                  {activeTab === 'assembly' && product.history?.assembly && (
                    <div className="assembly-info">
                      <h5>{t('assemblyInformation')}</h5>
                      <div className="row mt-3">
                        <div className="col-md-6">
                          <table className="table table-striped">
                            <tbody>
                              <tr>
                                <th>{t('assembledBy')}</th>
                                <td>{product.history.assembly.pic_name}</td>
                              </tr>
                              <tr>
                                <th>{t('startTime')}</th>
                                <td>{formatDateTime(product.history.assembly.start_time)}</td>
                              </tr>
                              <tr>
                                <th>{t('completionTime')}</th>
                                <td>{formatDateTime(product.history.assembly.completion_time)}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                        <div className="col-md-6">
                          <table className="table table-striped">
                            <tbody>
                              <tr>
                                <th>{t('productQuantity')}</th>
                                <td>{product.history.assembly.product_quantity}</td>
                              </tr>
                              <tr>
                                <th>{t('groupId')}</th>
                                <td>{product.history.assembly.group_id}</td>
                              </tr>
                              <tr>
                                <th>{t('status')}</th>
                                <td>{product.history.assembly.status}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                      
                      {/* Batch Information */}
                      {product.history?.batches && product.history.batches.length > 0 && (
                        <div className="mt-4">
                          <h6>{t('batchesInformation')}</h6>
                          <div className="table-responsive">
                            <table className="table table-sm table-bordered">
                              <thead className="table-light">
                                <tr>
                                  <th>{t('partName')}</th>
                                  <th>{t('machineName')}</th>
                                  <th>{t('moldCode')}</th>
                                  <th>{t('quantity')}</th>
                                  <th>{t('warehouseEntryTime')}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {product.history.batches.map((batch, index) => (
                                  <tr key={index}>
                                    <td>{batch.part_name}</td>
                                    <td>{batch.machine_name}</td>
                                    <td>{batch.mold_code}</td>
                                    <td>{batch.quantity}</td>
                                    <td>{batch.warehouse_entry_time}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Plating Information Tab */}
                  {activeTab === 'plating' && product.history?.plating && (
                    <div className="plating-info">
                      <h5>{t('platingInformation')}</h5>
                      <div className="row mt-3">
                        <div className="col-md-6">
                          <table className="table table-striped">
                            <tbody>
                              <tr>
                                <th>{t('platingDate')}</th>
                                <td>{product.history.plating.platingDate}</td>
                              </tr>
                              <tr>
                                <th>{t('platingTime')}</th>
                                <td>{product.history.plating.platingTime}</td>
                              </tr>
                              <tr>
                                <th>{t('startTime')}</th>
                                <td>{formatDateTime(product.history.plating.plating_start_time)}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                        <div className="col-md-6">
                          <table className="table table-striped">
                            <tbody>
                              <tr>
                                <th>{t('endTime')}</th>
                                <td>{formatDateTime(product.history.plating.platingEndTime)}</td>
                              </tr>
                              <tr>
                                <th>{t('status')}</th>
                                <td>{product.history.plating.status}</td>
                              </tr>
                              <tr>
                                <th>{t('assemblyId')}</th>
                                <td>{product.history.plating.assembly_id}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Add some CSS for the timeline */}
      <style jsx="true">{`
        .timeline {
          position: relative;
          padding: 20px 0;
        }
        
        .timeline:before {
          content: '';
          position: absolute;
          height: 100%;
          width: 4px;
          background: #e9ecef;
          left: 15px;
          top: 0;
        }
        
        .timeline-item {
          position: relative;
          margin-bottom: 30px;
          padding-left: 40px;
        }
        
        .timeline-marker {
          position: absolute;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          left: 9px;
          top: 6px;
        }
        
        .timeline-content {
          padding: 15px;
          background: #f8f9fa;
          border-radius: 4px;
          border-left: 3px solid #dee2e6;
        }
        
        .timeline-content h6 {
          margin-top: 0;
          color: #495057;
        }
      `}</style>
    </div>
  );
}

export default ProductDetail;