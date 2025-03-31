
import React, { useState, useEffect } from 'react';
import Navbar from './Navbar';
import { useLogout } from '../hooks/useAuth';
import { toast } from 'react-toastify';
import { useLanguage } from '../contexts/LanguageContext';
import apiService from '../services/api';

function BatchGrouping({ user }) {
  const { t } = useLanguage();
  const logoutMutation = useLogout();

  // State for active tab
  const [activeTab, setActiveTab] = useState('ungrouped'); // 'ungrouped' or 'grouped'

  // State for batches data
  const [ungroupedBatches, setUngroupedBatches] = useState([]);
  const [groupedBatches, setGroupedBatches] = useState([]);
  const [groupedBatchesMap, setGroupedBatchesMap] = useState({});

  // State for loading and error
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // State for selected batches
  const [selectedBatches, setSelectedBatches] = useState([]);

  // State for grouping modal
  const [showGroupModal, setShowGroupModal] = useState(false);

  // Fetch batches data
  const fetchBatches = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch ungrouped batches
      const ungroupedResponse = await apiService.batches.getUngrouped();
      setUngroupedBatches(ungroupedResponse.data.data || []);

      // Fetch grouped batches
      const groupedResponse = await apiService.batches.getGrouped();
      const groupedData = groupedResponse.data.data || [];
      setGroupedBatches(groupedData);

      // Organize grouped batches by group number
      const batchesByGroup = {};
      groupedData.forEach(batch => {
        if (!batchesByGroup[batch.group_id]) {
          batchesByGroup[batch.group_id] = [];
        }
        batchesByGroup[batch.group_id].push(batch);
      });
      setGroupedBatchesMap(batchesByGroup);
    } catch (error) {
      console.error('Error fetching batches:', error);
      setError(error.response?.data?.error || 'Failed to fetch batches');
    } finally {
      setIsLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    fetchBatches();

    // Refresh data periodically (every 30 seconds)
    const interval = setInterval(fetchBatches, 30000);

    return () => clearInterval(interval);
  }, []);

  // Handle batch selection
  const handleBatchSelect = (batchId) => {
    setSelectedBatches(prev => {
      if (prev.includes(batchId)) {
        return prev.filter(id => id !== batchId);
      } else {
        return [...prev, batchId];
      }
    });
  };

  // Handle grouping button click
  const handleGroupClick = () => {
    if (selectedBatches.length === 0) {
      toast.error(t('Vui lòng chọn ít nhất một lô để nhóm'));
      return;
    }

    setShowGroupModal(true);
  };

  // Handle confirm grouping
  const handleConfirmGrouping = async () => {
    if (selectedBatches.length === 0) {
      toast.error(t('Vui lòng chọn ít nhất một lô để nhóm'));
      return;
    }

    setIsLoading(true);

    try {
      // API call to group batches
      await apiService.batches.groupBatches({
        batchIds: selectedBatches,
        status: 'Grouped for Assembly'
      });

      toast.success(t('Các lô đã được nhóm thành công'));

      // Clear selected batches
      setSelectedBatches([]);

      // Close modal
      setShowGroupModal(false);

      // Refresh data
      fetchBatches();

      // Switch to grouped tab
      setActiveTab('grouped');
    } catch (error) {
      console.error('Error grouping batches:', error);
      toast.error(error.response?.data?.error || t('Có lỗi xảy ra khi nhóm các lô'));
    } finally {
      setIsLoading(false);
    }
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
          <h2>{t('Nhóm lô linh kiện')}</h2>
          {activeTab === 'ungrouped' && selectedBatches.length > 0 && (
            <button 
              className="btn btn-primary"
              onClick={handleGroupClick}
              disabled={isLoading}
            >
              {t('Nhóm')}
            </button>
          )}
        </div>

        {/* Progress Bar Placeholder */}
        <div className="mb-3 text-muted small">
          &lt;Progression Bar&gt; (COMING soon)
        </div>

        {/* Tabs */}
        <ul className="nav nav-tabs mb-3">
          <li className="nav-item">
            <button 
              className={`nav-link ${activeTab === 'ungrouped' ? 'active bg-light' : ''}`} 
              onClick={() => setActiveTab('ungrouped')}
            >
              {t('Lô linh kiện chưa nhóm')}
            </button>
          </li>
          <li className="nav-item">
            <button 
              className={`nav-link ${activeTab === 'grouped' ? 'active bg-light' : ''}`} 
              onClick={() => setActiveTab('grouped')}
            >
              {t('Lô linh kiện đã nhóm')}
            </button>
          </li>
        </ul>

        {/* Error Message */}
        {error && (
          <div className="alert alert-danger">
            {error}
          </div>
        )}

        {/* Ungrouped Batches Tab */}
        {activeTab === 'ungrouped' && (
          <div className="custom-table-container">
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th width="5%"></th>
                    <th>{t('Part name')}</th>
                    <th>{t('Tên máy dập')}</th>
                    <th>{t('Mã khuôn')}</th>
                    <th>{t('Số lượng')}</th>
                    <th>{t('Thời gian nhập kho')}</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading && ungroupedBatches.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center py-3">
                        <div className="spinner-border text-primary" role="status">
                          <span className="visually-hidden">{t('loading')}</span>
                        </div>
                      </td>
                    </tr>
                  ) : ungroupedBatches.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center py-3">
                        {t('Không có lô linh kiện nào chưa được nhóm')}
                      </td>
                    </tr>
                  ) : (
                    ungroupedBatches.map(batch => (
                      <tr key={batch.id}>
                        <td>
                          <input 
                            type="checkbox" 
                            className="form-check-input" 
                            checked={selectedBatches.includes(batch.id)}
                            onChange={() => handleBatchSelect(batch.id)}
                          />
                        </td>
                        <td>{batch.part_name}</td>
                        <td>{batch.machine_name}</td>
                        <td>{batch.mold_code}</td>
                        <td>{batch.quantity}</td>
                        <td>{batch.warehouse_entry_time}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Grouped Batches Tab */}
        {activeTab === 'grouped' && (
          <div className="custom-table-container">
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th width="5%">{t('STT')}</th>
                    <th>{t('Part name')}</th>
                    <th>{t('Tên máy dập')}</th>
                    <th>{t('Mã khuôn')}</th>
                    <th>{t('Số lượng')}</th>
                    <th>{t('Thời gian nhập kho')}</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading && Object.keys(groupedBatchesMap).length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center py-3">
                        <div className="spinner-border text-primary" role="status">
                          <span className="visually-hidden">{t('loading')}</span>
                        </div>
                      </td>
                    </tr>
                  ) : Object.keys(groupedBatchesMap).length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center py-3">
                        {t('Không có lô linh kiện nào đã được nhóm')}
                      </td>
                    </tr>
                  ) : (
                    Object.entries(groupedBatchesMap).map(([groupId, batches]) => (
                      <React.Fragment key={groupId}>
                        {/* Group Header Row */}
                        <tr className="table-primary">
                          <td colSpan="6" className="text-start">
                            <strong>{t('Nhóm')} #{groupId}</strong>
                          </td>
                        </tr>

                        {/* Batch Rows */}
                        {batches.map((batch, index) => (
                          <tr key={batch.id}>
                            <td>{groupId}</td>
                            <td>{batch.part_name}</td>
                            <td>{batch.machine_name}</td>
                            <td>{batch.mold_code}</td>
                            <td>{batch.quantity}</td>
                            <td>{batch.warehouse_entry_time}</td>
                          </tr>
                        ))}

                        {/* Empty row for spacing between groups */}
                        <tr className="table-light">
                          <td colSpan="6" style={{ height: '10px' }}></td>
                        </tr>
                      </React.Fragment>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Grouping Confirmation Modal */}
      {showGroupModal && (
        <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{t('Xác nhận nhóm lô')}</h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowGroupModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <p>{t('Bạn có chắc chắn muốn nhóm các lô đã chọn?')}</p>
                <p>{t('Số lô đã chọn')}: <strong>{selectedBatches.length}</strong></p>
                <p>{t('Sau khi nhóm, trạng thái của các lô sẽ được cập nhật thành "Grouped for Assembly"')}</p>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowGroupModal(false)}
                  disabled={isLoading}
                >
                  {t('Hủy')}
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  onClick={handleConfirmGrouping}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      {t('Đang xử lý...')}
                    </>
                  ) : (
                    t('Xác nhận')
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Backdrop */}
      {showGroupModal && (
        <div 
          className="modal-backdrop fade show"
          onClick={() => !isLoading && setShowGroupModal(false)}
        ></div>
      )}
    </div>
  );
}

export default BatchGrouping;