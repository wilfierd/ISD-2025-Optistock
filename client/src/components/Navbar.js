// client/src/components/Navbar.js with updated role-based access control
import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom'; 
import { useNotifications, useMarkNotificationsAsRead } from '../hooks/useNotifications';
import { hasAdminOnlyAccess, hasAdminOrManagerAccess } from '../utils/rolePermissions';
import { useLanguage } from '../contexts/LanguageContext';

function Navbar({ user, onLogout }) {
  const location = useLocation();
  const navigate = useNavigate();
  const isActive = (path) => location.pathname === path;
  const [showNotifications, setShowNotifications] = useState(false);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [showLogoutDropdown, setShowLogoutDropdown] = useState(false);
  
  const { data: notifications = [] } = useNotifications();
  const markAsRead = useMarkNotificationsAsRead();
  const { language, toggleLanguage, t } = useLanguage();
  
  // Count unread notifications
  const unreadCount = notifications.filter(n => !n.is_read).length;
  
  // Handle viewing all notifications
  const handleViewAllNotifications = () => {
    if (unreadCount > 0) {
      const unreadIds = notifications
        .filter(n => !n.is_read)
        .map(n => n.id);
      
      markAsRead.mutate(unreadIds);
    }
    
    setShowNotifications(false);
    navigate('/notifications');
  };
    // Thêm function handleMarkAllAsRead để sửa lỗi
  const handleMarkAllAsRead = () => {
    if (unreadCount > 0) {
      const unreadIds = notifications
        .filter(n => !n.is_read)
        .map(n => n.id);

      markAsRead.mutate(unreadIds);
    }
  };

  // Helper để xác định màu sắc cho badge dựa trên loại thông báo
  const getNotificationBadgeColor = (notification) => {
    if (notification.notification_type === 'request') {
      return notification.message.includes('đã được phê duyệt') ? 'success' : 
             notification.message.includes('đã bị từ chối') ? 'danger' : 'warning';
    }
    return notification.is_important ? 'danger' : 'info';
  };

  // Helper để xác định icon cho thông báo
  const getNotificationIcon = (notification) => {
    if (notification.notification_type === 'request') {
      return notification.message.includes('đã được phê duyệt') ? 'fa-check-circle' : 
             notification.message.includes('đã bị từ chối') ? 'fa-times-circle' : 'fa-clipboard-list';
    }
    return notification.is_important ? 'fa-exclamation-circle' : 'fa-bell';
  };

  // Helper để định dạng thời gian thông báo
  const formatNotificationTime = (timestamp) => {
    const now = new Date();
    const notificationTime = new Date(timestamp);
    const diffMs = now - notificationTime;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return `${diffSec} giây trước`;
    if (diffMin < 60) return `${diffMin} phút trước`;
    if (diffHour < 24) return `${diffHour} giờ trước`;
    if (diffDay < 7) return `${diffDay} ngày trước`;

    // Format ngày tháng nếu quá 7 ngày
    return notificationTime.toLocaleDateString();
  };

  // Xử lý khi click vào thông báo
  const handleNotificationClick = (notificationId) => {
    // Đánh dấu thông báo là đã đọc
    markAsRead.mutate([notificationId]);

    // Đóng dropdown
    setShowNotifications(false);

    // Chuyển đến trang thông báo
    navigate('/notifications');
  }

  return (
    <nav className="navbar navbar-expand-lg navbar-dark">
      <div className="container-fluid">
        <div className="d-flex">
          <Link 
            className={`navbar-brand ${isActive('/dashboard') ? 'fw-bold' : ''}`} 
            to="/dashboard"
          >
            {t('dashboard')}
          </Link>
            {/* // Add this link inside the navbar links section in client/src/components/Navbar.js */}
            <Link 
            className={`navbar-brand ${isActive('/batch-grouping') ? 'fw-bold' : ''}`} 
            to="/batch-grouping"
          >
            {t('Nhóm lô')}
          </Link>
          <Link 
            className={`navbar-brand ${isActive('/materials') ? 'fw-bold' : ''}`} 
            to="/materials"
          >
            {t('warehouse')}
          </Link>
          
          {/* Show Warehouse Check link only for admin and manager users */}
          
            <Link 
              className={`navbar-brand ${isActive('/warehouse-check') ? 'fw-bold' : ''}`} 
              to="/warehouse-check"
            >
              {t("Kiểm kho")}
            </Link>
          
          
          {/* Show Employees link for admin and manager users */}
          {hasAdminOrManagerAccess(user) && (
            <Link 
              className={`navbar-brand ${isActive('/employees') ? 'fw-bold' : ''}`} 
              to="/employees"
            >
              {t('employees')}
            </Link>
          )}
          
          {/* Show Requests link to both admins and managers */}
          {hasAdminOrManagerAccess(user) && (
            <Link 
              className={`navbar-brand ${isActive('/requests') ? 'fw-bold' : ''}`} 
              to="/requests"
            >
              {t('requests')}
            </Link>
          )}
        </div>
        <div className="d-flex align-items-center">
          {/* Language Switcher */}
          <div className="position-relative me-3">
            <button 
              className="btn btn-link text-white" 
              onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
            >
              <i className="fas fa-globe me-1"></i>
              {language === 'en' ? 'EN' : 'VI'}
            </button>
            
            {/* Language dropdown */}
            {showLanguageDropdown && (
              <div className="position-absolute top-100 end-0 mt-2 dropdown-menu show" style={{ minWidth: '150px' }}>
                <button 
                  className={`dropdown-item ${language === 'en' ? 'active' : ''}`} 
                  onClick={() => {
                    if (language !== 'en') toggleLanguage();
                    setShowLanguageDropdown(false);
                  }}
                >
                  {t('english')}
                </button>
                <button 
                  className={`dropdown-item ${language === 'vi' ? 'active' : ''}`} 
                  onClick={() => {
                    if (language !== 'vi') toggleLanguage();
                    setShowLanguageDropdown(false);
                  }}
                >
                  {t('vietnamese')}
                </button>
              </div>
            )}
          </div>
          
          {/* Notification bell icon */}
          <div className="position-relative me-3">
            <button 
              className="btn btn-link text-white" 
              onClick={() => setShowNotifications(!showNotifications)}
            >
              <i className="fas fa-bell"></i>
              {unreadCount > 0 && (
                <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                  {unreadCount}
                </span>
              )}
            </button>
            
            {/* Notifications dropdown */}
            {showNotifications && (
                  <div className="position-absolute top-100 end-0 mt-2 dropdown-menu show notification-dropdown" style={{ width: '350px' }}>
                <div className="d-flex justify-content-between align-items-center px-3 py-2 dropdown-header">
                  <h6 className="mb-0">{t('notifications')}</h6>
                  {unreadCount > 0 && (
                    <button 
                      className="btn btn-sm btn-link text-decoration-none" 
                      onClick={handleMarkAllAsRead}
                    >
                      <i className="fas fa-check-double me-1"></i> {t('markAllAsRead')}
                    </button>
                  )}
                </div>
                <div className="notifications-scrollable">
                  {notifications.length === 0 ? (
                      <div className="notification-empty">
                      {t('noNotifications')}
                      <i className="fas fa-bell-slash"></i>
                      <p>{t('noNotifications')}</p>
                    </div>
                  ) : (
                    notifications.slice(0, 5).map(notification => (
                      <div 
                        key={notification.id} 
                        className={`dropdown-item py-2 px-3 border-bottom notification-item ${!notification.is_read ? 'unread' : ''}`}
                        style={{ cursor: 'pointer' }}
                        onClick={() => handleNotificationClick(notification.id)}
                      >
                         <div className="d-flex align-items-start">
                          <div className={`notification-badge ${getNotificationBadgeColor(notification)}`}>
                            <i className={`fas ${getNotificationIcon(notification)}`}></i>
                          </div>
                          <div>
                            <div className="notification-message">{notification.message}</div>
                            <div className="notification-time">
                              {formatNotificationTime(notification.created_at)}
                            </div>
                          </div>
                          {!notification.is_read && (
                            <div className="ms-auto">
                              <span className="badge rounded-pill bg-primary">
                                <i className="fas fa-circle fa-xs"></i>
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="dropdown-footer">
                  <Link to="/notifications" className="text-primary" onClick={() => setShowNotifications(false)}>
                    <i className="fas fa-list me-1"></i> {t('viewAllNotifications')}
                  </Link>
                </div>
              </div>
            )}
          </div>
          
          <span className="me-3 text-white">Hi, {user.username}</span>
          
          {/* User Avatar with Dropdown Logout */}
          <div className="position-relative me-3">
            <button 
              className="btn btn-link text-white" 
              onClick={() => setShowLogoutDropdown(!showLogoutDropdown)}
            >
              <div className="avatar">{user.username.charAt(0).toUpperCase()}</div>
            </button>
            
            {/* Logout dropdown */}
            {showLogoutDropdown && (
              <div className="position-absolute top-100 end-0 mt-2 dropdown-menu show" style={{ minWidth: '150px' }}>
                <button 
                  className="dropdown-item" 
                  onClick={onLogout}
                >
                  {t('logout')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;