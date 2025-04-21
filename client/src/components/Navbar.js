// client/src/components/Navbar.js
import React, { useState, useEffect } from 'react';
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
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showWarehouseDropdown, setShowWarehouseDropdown] = useState(false);
  
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

  // Mark all notifications as read
  const handleMarkAllAsRead = () => {
    if (unreadCount > 0) {
      const unreadIds = notifications
        .filter(n => !n.is_read)
        .map(n => n.id);

      markAsRead.mutate(unreadIds);
    }
  };

  // Get background color for avatar based on username
  const getAvatarColor = (username) => {
    const colors = [
      '#4caf50', '#2196f3', '#9c27b0', '#f44336', '#ff9800',
      '#009688', '#673ab7', '#3f51b5', '#e91e63', '#ffc107'
    ];
    
    // Generate a simple hash from username to pick a consistent color
    const hashCode = username.split('').reduce(
      (acc, char) => acc + char.charCodeAt(0), 0
    );
    
    return colors[hashCode % colors.length];
  };

  // Helper to determine badge color based on notification type
  const getNotificationBadgeColor = (notification) => {
    if (notification.notification_type === 'request') {
      return notification.message.includes('đã được phê duyệt') ? 'success' : 
             notification.message.includes('đã bị từ chối') ? 'danger' : 'warning';
    }
    return notification.is_important ? 'danger' : 'info';
  };

  // Helper to determine icon for notification
  const getNotificationIcon = (notification) => {
    if (notification.notification_type === 'request') {
      return notification.message.includes('đã được phê duyệt') ? 'fa-check-circle' : 
             notification.message.includes('đã bị từ chối') ? 'fa-times-circle' : 'fa-clipboard-list';
    }
    return notification.is_important ? 'fa-exclamation-circle' : 'fa-bell';
  };

  // Helper to format notification time
  const formatNotificationTime = (timestamp) => {
    const now = new Date();
    const notificationTime = new Date(timestamp);
    const diffMs = now - notificationTime;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return `${diffSec} ${language === 'en' ? 'seconds ago' : 'giây trước'}`;
    if (diffMin < 60) return `${diffMin} ${language === 'en' ? 'minutes ago' : 'phút trước'}`;
    if (diffHour < 24) return `${diffHour} ${language === 'en' ? 'hours ago' : 'giờ trước'}`;
    if (diffDay < 7) return `${diffDay} ${language === 'en' ? 'days ago' : 'ngày trước'}`;

    // Format date if more than 7 days
    return notificationTime.toLocaleDateString();
  };

  // Handle notification click
  const handleNotificationClick = (notificationId) => {
    // Mark notification as read
    markAsRead.mutate([notificationId]);

    // Close dropdown
    setShowNotifications(false);

    // Navigate to notifications page
    navigate('/notifications');
  };

  // Navigation Items Dictionary
  const navItems = {
    dashboard: {
      en: 'Dashboard',
      vi: 'Tổng quan'
    },
    warehouse: {
      en: 'Warehouse',
      vi: 'Nhà kho'
    },
    inventoryCheck: {
      en: 'Inventory Check',
      vi: 'Kiểm kho'
    },
    employees: {
      en: 'Employees',
      vi: 'Nhân viên'
    },
    requests: {
      en: 'Requests',
      vi: 'Yêu cầu'
    },
    production: {
      en: 'Production',
      vi: 'Sản xuất'
    },
    warehouseOptions: {
      rawMaterials: {
        en: 'Materials Warehouse',
        vi: 'Kho Nguyên vật liệu'
      },
      processWarehouse: {
        en: 'Stage Warehouse',
        vi: 'Kho công đoạn'
      },
      finishedProducts: {
        en: 'Products Warehouse',
        vi: 'Kho thành phẩm'
      }
    },
    notifications: {
      en: 'Notifications',
      vi: 'Thông báo'
    },
    markAllAsRead: {
      en: 'Mark all as read',
      vi: 'Đánh dấu tất cả đã đọc'
    },
    noNotifications: {
      en: 'No notifications',
      vi: 'Không có thông báo'
    },
    viewAllNotifications: {
      en: 'View all notifications',
      vi: 'Xem tất cả thông báo'
    },
    logout: {
      en: 'Logout',
      vi: 'Đăng xuất'
    },
    english: {
      en: 'English',
      vi: 'English'
    },
    vietnamese: {
      en: 'Vietnamese',
      vi: 'Tiếng Việt'
    }
  };

  // Function to get text based on current language
  const getText = (item) => {
    return language === 'en' ? item.en : item.vi;
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showWarehouseDropdown && !event.target.closest('.warehouse-dropdown-container')) {
        setShowWarehouseDropdown(false);
      }
      
      if (showLanguageDropdown && !event.target.closest('.language-dropdown-container')) {
        setShowLanguageDropdown(false);
      }
      
      if (showNotifications && !event.target.closest('.notifications-dropdown-container')) {
        setShowNotifications(false);
      }
      
      if (showUserDropdown && !event.target.closest('.user-dropdown-container')) {
        setShowUserDropdown(false);
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showWarehouseDropdown, showLanguageDropdown, showNotifications, showUserDropdown]);

  return (
    <nav className="navbar navbar-expand-lg navbar-dark" style={{ backgroundColor: '#1a4b8c' }}>
      <div className="container-fluid">
        <div className="d-flex">
          <Link 
            className={`navbar-brand ${isActive('/dashboard') ? 'fw-bold' : ''}`} 
            to="/dashboard"
            style={{ padding: '10px 20px', margin: '0 5px', borderRadius: '4px' }}
          >
            {getText(navItems.dashboard)}
          </Link>
          
          {/* Warehouse dropdown */}
          <div className="position-relative warehouse-dropdown-container">
            <button 
              className={`btn navbar-brand ${location.pathname.includes('/materials') || location.pathname.includes('/batch-grouping') ? 'fw-bold' : ''}`}
              onClick={() => setShowWarehouseDropdown(!showWarehouseDropdown)}
              style={{ 
                padding: '10px 20px', 
                margin: '0 5px', 
                borderRadius: '4px',
                backgroundColor: showWarehouseDropdown ? 'rgba(255,255,255,0.1)' : 'transparent'
              }}
            >
              {getText(navItems.warehouse)} <i className="fas fa-caret-down ms-1"></i>
            </button>
            
            {showWarehouseDropdown && (
              <div 
                className="position-absolute mt-1 dropdown-menu show" 
                style={{ 
                  minWidth: '200px', 
                  zIndex: 1000, 
                  left: '10px',
                  borderRadius: '4px',
                  boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
                }}
              >
                <Link 
                  to="/materials" 
                  className="dropdown-item"
                  onClick={() => setShowWarehouseDropdown(false)}
                >
                  {getText(navItems.warehouseOptions.rawMaterials)}
                </Link>
                <Link 
                 to="/batch-grouping" 
            
                  className="dropdown-item"
                  onClick={() => setShowWarehouseDropdown(false)}
                >
                  {getText(navItems.warehouseOptions.processWarehouse)}
                </Link>
                <Link 
                  to="/product-warehouse" 
                  className="dropdown-item"
                  onClick={() => setShowWarehouseDropdown(false)}
                >
                  {getText(navItems.warehouseOptions.finishedProducts)}
                </Link>
              </div>
            )}
          </div>
          
          <Link 
            className={`navbar-brand ${isActive('/warehouse-check') ? 'fw-bold' : ''}`} 
            to="/warehouse-check"
            style={{ padding: '10px 20px', margin: '0 5px', borderRadius: '4px' }}
          >
            {getText(navItems.inventoryCheck)}
          </Link>
          
          {/* Only show for admin or manager roles */}
          {hasAdminOrManagerAccess(user) && (
            <Link 
              className={`navbar-brand ${isActive('/employees') ? 'fw-bold' : ''}`} 
              to="/employees"
              style={{ padding: '10px 20px', margin: '0 5px', borderRadius: '4px' }}
            >
              {getText(navItems.employees)}
            </Link>
          )}
          
          {/* Only show for admin or manager roles */}
          {hasAdminOrManagerAccess(user) && (
            <Link 
              className={`navbar-brand ${isActive('/requests') ? 'fw-bold' : ''}`} 
              to="/requests"
              style={{ padding: '10px 20px', margin: '0 5px', borderRadius: '4px' }}
            >
              {getText(navItems.requests)}
            </Link>
          )}
          
          <Link 
            className={`navbar-brand ${isActive('/production') ? 'fw-bold' : ''}`} 
            to="/production"
            style={{ 
              padding: '10px 20px', 
              margin: '0 5px', 
              borderRadius: '4px',
              backgroundColor: isActive('/production') ? 'rgba(255,255,255,0.2)' : 'transparent',
              fontWeight: isActive('/production') ? 'bold' : 'normal'
            }}
          >
            {getText(navItems.production)}
          </Link>
        </div>
        
        <div className="d-flex align-items-center">
          {/* Language Switcher */}
          <div className="position-relative me-3 language-dropdown-container">
            <button 
              className="btn btn-link text-white" 
              onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
              style={{
                backgroundColor: 'rgba(255,255,255,0.1)',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0'
              }}
            >
              <span className="d-flex align-items-center">
                {language === 'en' ? 'EN' : 'VI'}
              </span>
            </button>
            
            {/* Language dropdown */}
            {showLanguageDropdown && (
              <div className="position-absolute top-100 end-0 mt-2 dropdown-menu show" style={{ minWidth: '150px', zIndex: 1000 }}>
                <button 
                  className={`dropdown-item ${language === 'en' ? 'active' : ''}`} 
                  onClick={() => {
                    if (language !== 'en') toggleLanguage();
                    setShowLanguageDropdown(false);
                  }}
                >
                  {getText(navItems.english)}
                </button>
                <button 
                  className={`dropdown-item ${language === 'vi' ? 'active' : ''}`} 
                  onClick={() => {
                    if (language !== 'vi') toggleLanguage();
                    setShowLanguageDropdown(false);
                  }}
                >
                  {getText(navItems.vietnamese)}
                </button>
              </div>
            )}
          </div>
          
          {/* Notification bell icon */}
          <div className="position-relative me-3 notifications-dropdown-container">
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
            
            {/* Enhanced Notifications dropdown */}
            {showNotifications && (
              <div className="position-absolute top-100 end-0 mt-2 dropdown-menu show notification-dropdown" 
                   style={{ width: '350px', zIndex: 1000, maxHeight: '400px', overflowY: 'auto' }}>
                <div className="d-flex justify-content-between align-items-center px-3 py-2 dropdown-header border-bottom">
                  <h6 className="mb-0">{getText(navItems.notifications)}</h6>
                  {unreadCount > 0 && (
                    <button 
                      className="btn btn-sm btn-link text-decoration-none" 
                      onClick={handleMarkAllAsRead}
                    >
                      <i className="fas fa-check-double me-1"></i> {getText(navItems.markAllAsRead)}
                    </button>
                  )}
                </div>
                
                <div className="notifications-scrollable">
                  {notifications.length === 0 ? (
                    <div className="notification-empty text-center py-4">
                      <i className="fas fa-bell-slash mb-2" style={{ fontSize: '24px', opacity: '0.5' }}></i>
                      <p className="mb-0 text-muted">{getText(navItems.noNotifications)}</p>
                    </div>
                  ) : (
                    notifications.slice(0, 5).map(notification => (
                      <div 
                        key={notification.id} 
                        className={`dropdown-item py-2 px-3 border-bottom notification-item ${!notification.is_read ? 'bg-light' : ''}`}
                        style={{ cursor: 'pointer' }}
                        onClick={() => handleNotificationClick(notification.id)}
                      >
                        <div className="d-flex align-items-start">
                          <div className={`me-2 p-2 rounded-circle text-white bg-${getNotificationBadgeColor(notification)}`}
                               style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <i className={`fas ${getNotificationIcon(notification)}`}></i>
                          </div>
                          <div className="flex-grow-1">
                            <div className="notification-message">{notification.message}</div>
                            <div className="notification-time text-muted small">
                              {formatNotificationTime(notification.created_at)}
                            </div>
                          </div>
                          {!notification.is_read && (
                            <div className="ms-auto">
                              <span className="badge rounded-pill bg-primary" style={{ width: '8px', height: '8px', padding: '0' }}></span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
                
                <div className="dropdown-footer p-2 text-center border-top">
                  <Link to="/notifications" className="btn btn-sm btn-link text-primary text-decoration-none w-100" 
                       onClick={() => setShowNotifications(false)}>
                    <i className="fas fa-list me-1"></i> {getText(navItems.viewAllNotifications)}
                  </Link>
                </div>
              </div>
            )}
          </div>
          
          {/* User dropdown with avatar */}
          <div className="position-relative user-dropdown-container">
            <button 
              className="btn btn-link text-white d-flex align-items-center"
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              style={{ textDecoration: 'none' }}
            >
              <div 
                className="avatar d-flex align-items-center justify-content-center me-2"
                style={{
                  width: '35px',
                  height: '35px',
                  borderRadius: '50%',
                  backgroundColor: getAvatarColor(user.username),
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '16px',
                  textTransform: 'uppercase',
                  border: '2px solid rgba(255,255,255,0.3)'
                }}
              >
                {user.username.charAt(0)}
              </div>
              <span className="me-1">Hi, {user.username}</span>
              <i className={`fas ${showUserDropdown ? 'fa-caret-up' : 'fa-caret-down'}`}></i>
            </button>
            
            {/* User dropdown */}
            {showUserDropdown && (
              <div className="position-absolute top-100 end-0 mt-2 dropdown-menu show" 
                   style={{ minWidth: '200px', zIndex: 1000, borderRadius: '4px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
                <button 
                  className="dropdown-item text-danger" 
                  onClick={onLogout}
                >
                  <i className="fas fa-sign-out-alt me-2"></i> 
                  {getText(navItems.logout)}
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