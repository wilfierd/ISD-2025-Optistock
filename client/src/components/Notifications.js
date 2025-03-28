// client/src/components/Notifications.js
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import { useLogout } from '../hooks/useAuth';
import { useNotifications, useMarkNotificationsAsRead } from '../hooks/useNotifications';
import { useLanguage } from '../contexts/LanguageContext';
import { toast } from 'react-toastify';
import apiService from '../services/api';

function Notifications({ user }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: notifications = [], isLoading, error, refetch } = useNotifications();
  const markAsRead = useMarkNotificationsAsRead();
  const logoutMutation = useLogout();
  
  // State for filtering and selected notification
  const [filterType, setFilterType] = useState('all');
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [relatedRequest, setRelatedRequest] = useState(null);
  const [loadingRequest, setLoadingRequest] = useState(false);
  const [showDetailView, setShowDetailView] = useState(false);
  
  // Determine if we're viewing all notifications or a specific one from URL
  useEffect(() => {
    // Clear selected notification when navigating to the main notifications page
    if (location.pathname === '/notifications') {
      setSelectedNotification(null);
      setRelatedRequest(null);
      setShowDetailView(false);
    }
  }, [location]);
  
  // Handle logout
  const handleLogout = () => {
    logoutMutation.mutate();
  };
  
  // Handle marking all as read
  const handleMarkAllAsRead = () => {
    const unreadIds = notifications
      .filter(n => !n.is_read)
      .map(n => n.id);
    
    if (unreadIds.length > 0) {
      markAsRead.mutate(unreadIds, {
        onSuccess: () => {
          toast.success(t('allNotificationsRead') || 'Tất cả thông báo đã được đánh dấu là đã đọc');
          refetch();
        }
      });
    }
  };
  
  // Handle notification selection
  const handleSelectNotification = async (notification) => {
    // Mark as read if needed
    if (!notification.is_read) {
      markAsRead.mutate([notification.id]);
    }
    
    setSelectedNotification(notification);
    setShowDetailView(true);
    
    // If there's a related request, fetch its details
    if (notification.related_request_id) {
      try {
        setLoadingRequest(true);
        const response = await apiService.materialRequests.getById(notification.related_request_id);
        setRelatedRequest(response.data.data);
      } catch (error) {
        console.error('Error fetching related request:', error);
        setRelatedRequest(null);
      } finally {
        setLoadingRequest(false);
      }
    } else {
      setRelatedRequest(null);
    }
  };
  
  // Handle view all notifications
  const handleViewAllNotifications = () => {
    setSelectedNotification(null);
    setRelatedRequest(null);
    setShowDetailView(false);
  };
  
  // Filter notifications based on selected type
  const filteredNotifications = notifications.filter(notification => {
    if (filterType === 'all') return true;
    if (filterType === 'unread') return !notification.is_read;
    return notification.notification_type === filterType;
  });
  
  // Format notification date
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString();
  };
  
  // Format time relative to now (e.g., "5 minutes ago")
  const formatRelativeTime = (dateString) => {
    if (!dateString) return '';
    
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    
    if (diffSec < 60) return `${diffSec} ${t('secondsAgo') || 'giây trước'}`;
    if (diffMin < 60) return `${diffMin} ${t('minutesAgo') || 'phút trước'}`;
    if (diffHour < 24) return `${diffHour} ${t('hoursAgo') || 'giờ trước'}`;
    if (diffDay < 7) return `${diffDay} ${t('daysAgo') || 'ngày trước'}`;
    
    return date.toLocaleDateString();
  };
  
  // Render notification detail content
  const renderNotificationDetail = () => {
    if (!selectedNotification) {
      return (
        <div className="d-flex justify-content-center align-items-center h-100 text-center text-muted">
          <div>
            <i className="fas fa-bell fa-3x mb-3"></i>
            {/* <h5>{t('selectNotification') || 'Chọn một thông báo để xem chi tiết'}</h5> */}
          </div>
        </div>
      );
    }
    
    const typeInfo = getNotificationTypeInfo(selectedNotification);
    
    return (
      <div>
        <div className={`card-header bg-${typeInfo.color} text-white d-flex align-items-center`}>
          <i className={`fas ${typeInfo.icon} me-2`}></i>
          <h5 className="mb-0">
            {selectedNotification.notification_type === 'request'
              ? t('requestNotifications') 
              : t('systemNotifications') }
          </h5>
        </div>
        
        <div className="card-body">
          <div className="notification-timestamp mb-3 text-muted">
            <i className="far fa-clock me-2"></i>
            {formatDate(selectedNotification.created_at)}
          </div>
          
          <div className="notification-content p-3 bg-light rounded mb-4">
            <p className="fs-5">{selectedNotification.message}</p>
          </div>
          
          {selectedNotification.related_request_id && (
            <div className="notification-related border-top pt-3">
              <h6>{t('relatedRequest')}:</h6>
              
              {loadingRequest ? (
                <div className="text-center my-3">
                  <div className="spinner-border spinner-border-sm text-primary" role="status">
                    <span className="visually-hidden">{t('loading')}</span>
                  </div>
                </div>
              ) : relatedRequest ? (
                renderMaterialRequestInfo(relatedRequest)
              ) : (
                <div className="alert alert-info">
                  {t('requestInfoNotAvailable')}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };
  
  // Render material request information
  const renderMaterialRequestInfo = (request) => {
    // Get badge color based on status
    const getStatusColor = (status) => {
      switch(status) {
        case 'pending': return 'warning';
        case 'approved': return 'success';
        case 'rejected': return 'danger';
        default: return 'secondary';
      }
    };
    
    // Get badge color based on request type
    const getTypeColor = (type) => {
      switch(type) {
        case 'add': return 'success';
        case 'edit': return 'primary';
        case 'delete': return 'danger';
        default: return 'info';
      }
    };
    
    // Format request data
    const formatRequestData = () => {
      try {
        let data;
        if (typeof request.request_data === 'string') {
          data = JSON.parse(request.request_data);
        } else if (typeof request.request_data === 'object') {
          data = request.request_data;
        } else {
          return <p className="text-muted">{t('noRequestDataAvailable') }</p>;
        }
        
        // If no data
        if (!data || Object.keys(data).length === 0) {
          return <p className="text-muted">{t('noRequestDataAvailable') || 'Không có dữ liệu yêu cầu'}</p>;
        }
        
        // Display data as table
        return (
          <table className="table table-sm table-bordered">
            <tbody>
              {Object.entries(data).map(([key, value]) => (
                <tr key={key}>
                  <th style={{ width: '40%' }}>{formatKey(key)}</th>
                  <td>{value !== null && value !== undefined ? String(value) : 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      } catch (error) {
        console.error("Error handling request data:", error);
        return (
          <div className="alert alert-danger">
            <p>{t('errorParsingRequestData') || 'Lỗi phân tích dữ liệu yêu cầu'}</p>
          </div>
        );
      }
    };
    
    // Format key name to be more readable
    const formatKey = (key) => {
      const formatted = key
        .replace(/_/g, ' ')
        .replace(/([A-Z])/g, ' $1')
        .toLowerCase();
        
      return formatted.charAt(0).toUpperCase() + formatted.slice(1);
    };
    
    return (
      <div>
        <div className="mb-3">
          <div className="d-flex justify-content-between mb-2">
            <span className="fw-bold">{t('id') || 'ID'}:</span>
            <span>{request.id}</span>
          </div>
          
          <div className="d-flex justify-content-between mb-2">
            <span className="fw-bold">{t('type') || 'Loại'}:</span>
            <span>
              <span className={`badge bg-${getTypeColor(request.request_type)}`}>
                {request.request_type === 'add' ? t('add') || 'Thêm' : 
                 request.request_type === 'edit' ? t('edit') || 'Sửa' : 
                 t('delete') || 'Xóa'}
              </span>
            </span>
          </div>
          
          <div className="d-flex justify-content-between mb-2">
            <span className="fw-bold">{t('status') || 'Trạng thái'}:</span>
            <span>
              <span className={`badge bg-${getStatusColor(request.status)}`}>
                {request.status === 'pending' ? t('pending') || 'Đang chờ' : 
                 request.status === 'approved' ? t('approved') || 'Đã duyệt' : 
                 t('rejected') || 'Đã từ chối'}
              </span>
            </span>
          </div>
          
          {request.material_id && (
            <div className="d-flex justify-content-between mb-2">
              <span className="fw-bold">{t('materialID') || 'ID Vật liệu'}:</span>
              <span>{request.material_id}</span>
            </div>
          )}
          
          <div className="d-flex justify-content-between mb-2">
            <span className="fw-bold">{t('requestDate') || 'Ngày yêu cầu'}:</span>
            <span>{formatDate(request.request_date)}</span>
          </div>
          
          {request.response_date && (
            <div className="d-flex justify-content-between mb-2">
              <span className="fw-bold">{t('responseDate') || 'Ngày phản hồi'}:</span>
              <span>{formatDate(request.response_date)}</span>
            </div>
          )}
        </div>
        
        {request.admin_notes && (
          <div className="mb-3">
            <div className="fw-bold mb-1">{t('adminNotes') || 'Ghi chú của quản trị viên'}:</div>
            <div className="p-2 bg-light rounded border">
              {request.admin_notes}
            </div>
          </div>
        )}
        
        <div className="mt-3">
          <h6>{t('requestData') || 'Dữ liệu yêu cầu'}:</h6>
          {formatRequestData()}
        </div>
      </div>
    );
  };
  
  // Get notification type information (icon and color)
  const getNotificationTypeInfo = (notification) => {
    if (!notification) return { icon: 'fa-bell', color: 'primary' };
    
    if (notification.notification_type === 'request') {
      if (notification.message.includes('đã được phê duyệt')) {
        return { icon: 'fa-check-circle', color: 'success' };
      }
      if (notification.message.includes('đã bị từ chối')) {
        return { icon: 'fa-times-circle', color: 'danger' };
      }
      return { icon: 'fa-clipboard-list', color: 'warning' };
    }
    
    return notification.is_important 
      ? { icon: 'fa-exclamation-circle', color: 'danger' }
      : { icon: 'fa-bell', color: 'info' };
  };

  return (
    <div>
      <Navbar user={user} onLogout={handleLogout} />
      
      <div className="container-fluid mt-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h2>{t('notifications') || 'Thông báo'}</h2>
          <div className="d-flex">
            <button 
              className="btn btn-outline-primary me-2" 
              onClick={handleMarkAllAsRead}
              disabled={!notifications.some(n => !n.is_read)}
            >
              <i className="fas fa-check-double me-2"></i>
              {t('markAllAsRead') || 'Đánh dấu tất cả đã đọc'}
            </button>
            <select 
              className="form-select" 
              style={{ width: 'auto' }}
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="all">{t('allNotifications') || 'Tất cả thông báo'}</option>
              <option value="unread">{t('unread') || 'Chưa đọc'}</option>
              <option value="request">{t('requestNotifications') || 'Thông báo yêu cầu'}</option>
              <option value="system">{t('systemNotifications') || 'Thông báo hệ thống'}</option>
            </select>
          </div>
        </div>
        
        {isLoading ? (
          <div className="text-center my-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">{t('loading') || 'Đang tải'}</span>
            </div>
          </div>
        ) : error ? (
          <div className="alert alert-danger">{error.message}</div>
        ) : (
          <div className="row">
            {/* List view (left side) - Always visible */}
            <div className={showDetailView ? "col-md-5 col-lg-4" : "col-12"}>
              <div className="card mb-4">
                <div className="card-header bg-light">
                  <div className="d-flex justify-content-between align-items-center">
                    <h5 className="mb-0">{t('notificationsList')}</h5>
                    {showDetailView && (
                      <button 
                        className="btn btn-sm btn-outline-secondary" 
                        onClick={handleViewAllNotifications}
                        title={t('viewAllNotifications') || 'Xem tất cả thông báo'}
                      >
                        <i className="fas fa-expand-arrows-alt"></i>
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="list-group list-group-flush notification-list" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                  {filteredNotifications.length === 0 ? (
                    <div className="text-center p-4 text-muted">
                      <i className="fas fa-bell-slash fa-2x mb-3"></i>
                      <p>{t('noNotifications') || 'Không có thông báo'}</p>
                    </div>
                  ) : (
                    filteredNotifications.map(notification => {
                      const typeInfo = getNotificationTypeInfo(notification);
                      
                      return (
                        <div 
                          key={notification.id}
                          className={`list-group-item list-group-item-action d-flex align-items-start p-3 notification-item ${!notification.is_read ? 'unread' : ''} ${selectedNotification?.id === notification.id ? 'active' : ''}`}
                          onClick={() => handleSelectNotification(notification)}
                          style={{ cursor: 'pointer' }}
                        >
                          <div className={`notification-badge ${typeInfo.color}`} style={{ minWidth: '36px', height: '36px' }}>
                            <i className={`fas ${typeInfo.icon}`}></i>
                          </div>
                          <div className="ms-3 flex-grow-1">
                            <div className="notification-message fw-bold text-truncate" style={{ maxWidth: '100%' }}>
                              {notification.message}
                            </div>
                            <div className="d-flex justify-content-between align-items-center mt-1">
                              <small className="text-muted">
                                {formatRelativeTime(notification.created_at)}
                              </small>
                              {!notification.is_read && (
                                <span className="badge rounded-pill bg-primary">
                                  {t('new') || 'Mới'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
            
            {/* Detail view (right side) - Shown when a notification is selected */}
            {showDetailView && (
              <div className="col-md-7 col-lg-8">
                <div className="card mb-4">
                  {renderNotificationDetail()}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Notifications;