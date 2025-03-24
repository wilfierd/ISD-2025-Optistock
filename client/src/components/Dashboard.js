// client/src/components/Dashboard.js
import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Chart from 'chart.js/auto';
import Navbar from './Navbar';
import { useDashboard } from '../hooks/useDashboard';
import { useLogout } from '../hooks/useAuth';
import { useLanguage } from '../contexts/LanguageContext';

function Dashboard({ user }) {
  const { data: dashboardData, isLoading, error } = useDashboard();
  const logoutMutation = useLogout();
  const { t } = useLanguage(); // Import translation function
  
  // Using refs to store chart instances for cleanup
  const materialTypesChartRef = useRef(null);
  const inventoryChartRef = useRef(null);

  useEffect(() => {
    // Initialize charts when data is available
    const initializeCharts = () => {
      if (typeof Chart !== 'undefined' && dashboardData) {
        // Clear any existing charts to avoid duplicates
        if (materialTypesChartRef.current) {
          materialTypesChartRef.current.destroy();
        }
        
        if (inventoryChartRef.current) {
          inventoryChartRef.current.destroy();
        }
        
        // Material Types Chart
        const materialTypesCtx = document.getElementById('materialTypesChart')?.getContext('2d');
        if (materialTypesCtx) {
          materialTypesChartRef.current = new Chart(materialTypesCtx, {
            type: 'pie',
            data: {
              labels: dashboardData.materialTypeLabels || ['Máy móc', 'Other'],
              datasets: [{
                data: dashboardData.materialTypeData || [5, 1],
                backgroundColor: [
                  'rgba(54, 162, 235, 0.8)',
                  'rgba(255, 206, 86, 0.8)'
                ],
                borderColor: [
                  'rgba(54, 162, 235, 1)',
                  'rgba(255, 206, 86, 1)'
                ],
                borderWidth: 1
              }]
            },
            options: {
              responsive: true,
              plugins: {
                legend: {
                  position: 'bottom'
                }
              }
            }
          });
        }
        
        // Inventory Changes Chart
        const inventoryCtx = document.getElementById('inventoryChart')?.getContext('2d');
        if (inventoryCtx) {
          inventoryChartRef.current = new Chart(inventoryCtx, {
            type: 'line',
            data: {
              labels: dashboardData.inventoryChanges?.labels || ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
              datasets: [{
                label: 'Inventory Level',
                data: dashboardData.inventoryChanges?.data || [42, 49, 55, 60, 66],
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 2,
                tension: 0.3
              }]
            },
            options: {
              responsive: true,
              scales: {
                y: {
                  beginAtZero: true
                }
              }
            }
          });
        }
      }
    };
    
    if (!isLoading && !error && dashboardData) {
      initializeCharts();
    }
    
    // Cleanup charts on component unmount
    return () => {
      if (materialTypesChartRef.current) {
        materialTypesChartRef.current.destroy();
      }
      
      if (inventoryChartRef.current) {
        inventoryChartRef.current.destroy();
      }
    };
  }, [dashboardData, isLoading, error]);

  const handleLogout = () => {
    logoutMutation.mutate();
  };
  
  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">{t('loading')}</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mt-5">
        <div className="alert alert-danger">{error.message}</div>
      </div>
    );
  }

  return (
    <>
      <Navbar user={user} onLogout={handleLogout} />

      {/* Main Content */}
      <div className="container-fluid mt-4">
        <h2 className="mb-4">{t('dashboard')}</h2>
        
        {/* Stats Cards Row */}
        <div className="row mb-4">
          <div className="col-md-3 mb-3">
            <div className="dashboard-card bg-primary text-white p-4 text-center">
              <i className="fas fa-box card-icon"></i>
              <div className="stat-value">{dashboardData?.totalMaterials || 0}</div>
              <div>{t('totalMaterials')}</div>
            </div>
          </div>
          <div className="col-md-3 mb-3">
            <div className="dashboard-card bg-success text-white p-4 text-center">
              <i className="fas fa-truck card-icon"></i>
              <div className="stat-value">{dashboardData?.totalSuppliers || 0}</div>
              <div>{t('suppliers')}</div>
            </div>
          </div>
          <div className="col-md-3 mb-3">
            <div className="dashboard-card bg-warning text-white p-4 text-center">
              <i className="fas fa-shopping-cart card-icon"></i>
              <div className="stat-value">{dashboardData?.ordersThisWeek || 0}</div>
              <div>{t('thisWeeksOrders')}</div>
            </div>
          </div>
          <div className="col-md-3 mb-3">
            <div className="dashboard-card bg-info text-white p-4 text-center">
              <i className="fas fa-users card-icon"></i>
              <div className="stat-value">{dashboardData?.systemUsers || 0}</div>
              <div>{t('systemUsers')}</div>
            </div>
          </div>
        </div>
        
        {/* Charts Row */}
        <div className="row mb-4">
          <div className="col-md-6">
            <div className="dashboard-chart bg-white p-3 rounded shadow-sm">
              <h4>{t('materialTypesDistribution')}</h4>
              <canvas id="materialTypesChart"></canvas>
            </div>
          </div>
          <div className="col-md-6">
            <div className="dashboard-chart bg-white p-3 rounded shadow-sm">
              <h4>{t('monthlyInventoryChanges')}</h4>
              <canvas id="inventoryChart"></canvas>
            </div>
          </div>
        </div>
        
        {/* Recent Items */}
        <div className="row mb-4">
          <div className="col-md-12">
            <div className="recent-items bg-white p-3 rounded shadow-sm">
              <h4 className="mb-4">{t('recentlyUpdatedMaterials')}</h4>
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>{t('packetNo')}</th>
                      <th>{t('partName')}</th>
                      <th>{t('dimensions')}</th>
                      <th>{t('quantity')}</th>
                      <th>{t('supplier')}</th>
                      <th>{t('updatedBy')}</th>
                      <th>{t('lastUpdated')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(dashboardData?.recentMaterials || []).length > 0 ? (
                      dashboardData.recentMaterials.map(material => (
                        <tr key={material.id}>
                          <td>{material.packet_no}</td>
                          <td>{material.part_name}</td>
                          <td>{material.length} x {material.width} x {material.height}</td>
                          <td>{material.quantity}</td>
                          <td>{material.supplier}</td>
                          <td>{material.updated_by}</td>
                          <td>{material.last_updated}</td>
                        </tr>
                      ))
                    ) : (
                      <>
                        <tr>
                          <td>1</td>
                          <td>Máy móc</td>
                          <td>3000 x 345 x 345</td>
                          <td>10</td>
                          <td>Khai</td>
                          <td>Khai</td>
                          <td>05/03/2025</td>
                        </tr>
                        <tr>
                          <td>1</td>
                          <td>Máy móc</td>
                          <td>3000 x 345 x 35</td>
                          <td>10</td>
                          <td>Khai</td>
                          <td>Khai</td>
                          <td>05/03/2025</td>
                        </tr>
                        <tr>
                          <td>1</td>
                          <td>xxxxxxxxxxxxxxxxxxxxxxxxx</td>
                          <td>3000 x 3455 x 2255</td>
                          <td>10</td>
                          <td>SHENZEN</td>
                          <td>Khai</td>
                          <td>05/03/2025</td>
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="text-end mt-3">
                <Link to="/materials" className="btn btn-primary">{t('viewAllMaterials')}</Link>
              </div>
            </div>
          </div>
        </div>
        
        {/* Quick Actions */}
        <div className="row mb-4">
          <div className="col-md-12">
            <div className="recent-items bg-white p-3 rounded shadow-sm">
              <h4 className="mb-4">{t('quickActions')}</h4>
              <div className="row">
                <div className="col-md-3 mb-2">
                  <Link to="/materials" className="btn btn-outline-primary w-100">
                    <i className="fas fa-boxes me-2"></i> {t('manageMaterials')}
                  </Link>
                </div>
                <div className="col-md-3 mb-2">
                  <button className="btn btn-outline-success w-100">
                    <i className="fas fa-file-export me-2"></i> {t('exportInventoryReport')}
                  </button>
                </div>
                <div className="col-md-3 mb-2">
                  <button className="btn btn-outline-warning w-100">
                    <i className="fas fa-truck-loading me-2"></i> {t('registerNewShipment')}
                  </button>
                </div>
                <div className="col-md-3 mb-2">
                  <button className="btn btn-outline-info w-100">
                    <i className="fas fa-user-plus me-2"></i> {t('addNewUser')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default Dashboard;