import React, { useState } from 'react';



import Navbar from './Navbar';


import { useLogout } from '../hooks/useAuth';


import { useNotifications, useMarkNotificationsAsRead } from '../hooks/useNotifications';


import { useLanguage } from '../contexts/LanguageContext';


import { toast } from 'react-toastify';





function Notifications({ user }) {


  const { t } = useLanguage();


  const { data: notifications = [], isLoading, error, refetch } = useNotifications();


  const markAsRead = useMarkNotificationsAsRead();


  const logoutMutation = useLogout();


  


  // State for filtering notifications


  const [filterType, setFilterType] = useState('all');


  


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


          toast.success(t('Tất cả thông báo đã được đánh dấu là đã đọc'));


          refetch();


        }


      });


    }


  };


  


  // Handle marking single notification as read


  const handleMarkAsRead = (id) => {


    markAsRead.mutate([id], {


      onSuccess: () => {


        refetch();


      }


    });


  };


  


  // Filter notifications based on selected type


  const filteredNotifications = notifications.filter(notification => {


    if (filterType === 'all') return true;


    if (filterType === 'unread') return !notification.is_read;


    return notification.notification_type === filterType;


  });


  


  // Format notification date


  const formatDate = (dateString) => {


    const date = new Date(dateString);


    return date.toLocaleString();


  };





  return (


    <div>


      <Navbar user={user} onLogout={handleLogout} />


      


      <div className="container-fluid mt-4">


        <div className="d-flex justify-content-between align-items-center mb-4">


          <h2>{t('notifications')}</h2>


          <div>


            <button 


              className="btn btn-outline-primary me-2" 


              onClick={handleMarkAllAsRead}


              disabled={!notifications.some(n => !n.is_read)}


            >


              <i className="fas fa-check-double me-2"></i>


              {t('markAllAsRead')}


            </button>


            <select 


              className="form-select d-inline-block" 


              style={{ width: 'auto' }}


              value={filterType}


              onChange={(e) => setFilterType(e.target.value)}


            >


              <option value="all">{t('Tất cả thông báo')}</option>


              <option value="unread">{t('Chưa đọc')}</option>


              <option value="request">{t('Yêu cầu')}</option>


              <option value="system">{t('Hệ thống')}</option>


            </select>


          </div>


        </div>


        


        {isLoading ? (


          <div className="text-center my-5">


            <div className="spinner-border text-primary" role="status">


              <span className="visually-hidden">{t('loading')}</span>


            </div>


          </div>


        ) : error ? (


          <div className="alert alert-danger">{error.message}</div>


        ) : (


          <div className="row">


            {filteredNotifications.length === 0 ? (


              <div className="col-12">


                <div className="alert alert-info text-center">


                  {t('noNotifications')}


                </div>


              </div>


            ) : (


              filteredNotifications.map(notification => (


                <div className="col-md-6 mb-3" key={notification.id}>


                  <div className={`card ${!notification.is_read ? 'border-primary' : ''}`}>


                    <div className={`card-header d-flex justify-content-between ${!notification.is_read ? 'bg-light' : ''}`}>


                      <span>


                        <i className={`fas ${notification.notification_type === 'request' ? 'fa-clipboard-list' : 'fa-bell'} me-2`}></i>


                        {formatDate(notification.created_at)}


                      </span>


                      {!notification.is_read && (


                        <button 


                          className="btn btn-sm btn-link text-primary" 


                          onClick={() => handleMarkAsRead(notification.id)}


                        >


                          <i className="fas fa-check"></i> {t('Đánh dấu đã đọc')}


                        </button>


                      )}


                    </div>


                    <div className="card-body">


                      <p className="card-text">{notification.message}</p>


                      {notification.related_request_id && (


                        <div className="text-end">


                          <small className="text-muted">


                            {t('Request ID')}: {notification.related_request_id}


                          </small>


                        </div>


                      )}


                    </div>


                  </div>


                </div>


              ))


            )}


          </div>


        )}


      </div>


    </div>


  );


}





export default Notifications;