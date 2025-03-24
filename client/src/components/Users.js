// client/src/components/Users.js (with complete language support)
import React, { useState, useMemo } from 'react';
import Navbar from './Navbar';
import { useLogout } from '../hooks/useAuth';
import { toast } from 'react-toastify';
import '../styles/users.css';
import { 
  useUsers, 
  useUser,
  useCreateUser, 
  useUpdateUser, 
  useDeleteUser
} from '../hooks/useUsers';
import { 
  hasAdminOnlyAccess, 
  hasAdminOrManagerAccess, 
  canDeleteUser, 
  getAvailableRoles,
  canEditUser as utilsCanEditUser // Import the utility function with a different name
} from '../utils/rolePermissions';
import { useLanguage } from '../contexts/LanguageContext';

function Users({ user }) {
  // Get translation function
  const { t } = useLanguage();
  
  // State for user ID being viewed or edited
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal state
  const [showUserModal, setShowUserModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [modalMode, setModalMode] = useState('view'); // 'view', 'add', or 'edit'
  
  // Form state for add/edit modal
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    fullName: '',
    role: 'nhân viên',
    phone: ''
  });

  // React Query hooks
  const { data: users = [], isLoading, error } = useUsers();
  const { 
    data: selectedUser, 
    isLoading: isLoadingUser,
    error: userError 
  } = useUser(selectedUserId);
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();
  const logoutMutation = useLogout();

  // Get available roles based on current user's role
  const availableRoles = getAvailableRoles(user);

  // Filter users based on search term
  const filteredUsers = useMemo(() => {
    return users.filter(u => 
      u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.username.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [users, searchTerm]);

  // Handle search
  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  // Handle logout
  const handleLogout = () => {
    logoutMutation.mutate();
  };

  // Handle view user
  const handleViewUser = (id) => {
    setSelectedUserId(id);
    setModalMode('view');
    setShowUserModal(true);
  };

  // Handle add user click
  const handleAddClick = () => {
    setSelectedUserId(null);
    setFormData({
      username: '',
      password: '',
      fullName: '',
      role: 'nhân viên',
      phone: ''
    });
    setModalMode('add');
    setShowUserModal(true);
  };

  // Handle edit user click
  const handleEditClick = (id) => {
    const userToEdit = users.find(u => u.id === id);
    
    if (userToEdit) {
      setSelectedUserId(id);
      setFormData({
        username: userToEdit.username,
        password: '', // Password field is empty for security
        fullName: userToEdit.full_name,
        role: userToEdit.role,
        phone: userToEdit.phone || ''
      });
      setModalMode('edit');
      setShowUserModal(true);
    }
  };

  // Handle delete user click
  const handleDeleteClick = (id) => {
    const targetUser = users.find(u => u.id === id);
    
    // Check if user can delete the target user
    if (targetUser && !canDeleteUser(user, targetUser)) {
      toast.error(t("You don't have permission to delete this user"));
      return;
    }
    
    setSelectedUserId(id);
    setShowDeleteModal(true);
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [id]: value
    }));
  };

  // Handle form submission
  const handleSaveClick = () => {
    const userData = {
      username: formData.username,
      fullName: formData.fullName,
      role: formData.role,
      phone: formData.phone
    };

    // Only include password if it's provided (for edit mode)
    if (formData.password) {
      userData.password = formData.password;
    }

    if (modalMode === 'add') {
      // Password is required for new users
      if (!formData.password) {
        toast.error(t('Password is required for new users'));
        return;
      }
      
      createUser.mutate(userData, {
        onSuccess: () => {
          setShowUserModal(false);
          setSelectedUserId(null);
        }
      });
    } else {
      updateUser.mutate({ 
        id: selectedUserId, 
        data: userData 
      }, {
        onSuccess: () => {
          setShowUserModal(false);
          setSelectedUserId(null);
        }
      });
    }
  };

  // Handle delete confirmation
  const handleConfirmDelete = () => {
    deleteUser.mutate(selectedUserId, {
      onSuccess: () => {
        setShowDeleteModal(false);
        setSelectedUserId(null);
      }
    });
  };

  // Close all modals and clear selection
  const closeAllModals = () => {
    setShowUserModal(false);
    setShowDeleteModal(false);
    setSelectedUserId(null);
  };
  
  // Determine if user can edit another user
  const canEditUser = (targetUserId) => {
    const targetUser = users.find(u => u.id === targetUserId);
    if (!targetUser) return false;
    return utilsCanEditUser(user, targetUser);
  };

  return (
    <div>
      <Navbar user={user} onLogout={handleLogout} />

      {/* Main Content */}
      <div className="container-fluid mt-4">
        {/* Search and Action Buttons */}
        <div className="row mb-3">
          <div className="col-md-6">
            <div className="search-container">
              <span className="search-icon"><i className="fas fa-search"></i></span>
              <input 
                type="text" 
                className="form-control" 
                placeholder={t('searchByName')}
                value={searchTerm}
                onChange={handleSearch}
              />
            </div>
          </div>
          <div className="col-md-6 text-end">
            {hasAdminOrManagerAccess(user) && (
              <button 
                className="btn btn-primary btn-action" 
                onClick={handleAddClick}
                disabled={createUser.isPending}
              >
                {createUser.isPending ? t('Adding...') : t('addUser')}
              </button>
            )}
          </div>
        </div>

        {/* Users List */}
        <h4>{t('usersList')} ({filteredUsers.length})</h4>
        
        {isLoading ? (
          <div className="text-center my-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">{t('loading')}</span>
            </div>
          </div>
        ) : error ? (
          <div className="alert alert-danger">{error.message}</div>
        ) : (
          <div className="custom-table-container">
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>{t('id')}</th>
                    <th>{t('username')}</th>
                    <th>{t('fullName')}</th>
                    <th>{t('role')}</th>
                    <th>{t('phone')}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(tableUser => (
                    <tr key={tableUser.id} onClick={() => handleViewUser(tableUser.id)} style={{ cursor: 'pointer' }}>
                      <td>{tableUser.id}</td>
                      <td>{tableUser.username}</td>
                      <td>{tableUser.full_name}</td>
                      <td>{tableUser.role}</td>
                      <td>{tableUser.phone || '-'}</td>
                      <td className="text-end">
                        {canEditUser(tableUser.id) && (
                          <button 
                            className="btn btn-sm" 
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent row click
                              handleEditClick(tableUser.id);
                            }}
                          >
                            <i className="fas fa-edit"></i>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan="6" className="text-center py-3">{t('noRecordsFound')}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* User Modal (View/Edit/Add) */}
      {showUserModal && (
        <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {modalMode === 'view' 
                    ? t('userDetails') 
                    : modalMode === 'add' 
                      ? t('addUser') 
                      : t('editUser')}
                </h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => {
                    setShowUserModal(false);
                    setSelectedUserId(null);
                  }}
                ></button>
              </div>
              <div className="modal-body">
                {modalMode === 'view' ? (
                  isLoadingUser ? (
                    <div className="text-center my-3">
                      <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">{t('loading')}</span>
                      </div>
                    </div>
                  ) : userError ? (
                    <div className="alert alert-danger">
                      {t('Error loading user details')}: {userError.message}
                    </div>
                  ) : selectedUser ? (
                    <div className="user-details-container">
                      <div className="user-detail-row">
                        <div className="user-detail-label">{t('username')}</div>
                        <div className="user-detail-value">{selectedUser.username}</div>
                      </div>
                      <div className="user-detail-row">
                        <div className="user-detail-label">{t('fullName')}</div>
                        <div className="user-detail-value">{selectedUser.full_name}</div>
                      </div>
                      <div className="user-detail-row">
                        <div className="user-detail-label">{t('role')}</div>
                        <div className="user-detail-value">{selectedUser.role}</div>
                      </div>
                      <div className="user-detail-row">
                        <div className="user-detail-label">{t('phone')}</div>
                        <div className="user-detail-value">{selectedUser.phone || '-'}</div>
                      </div>
                      <div className="user-detail-row">
                        <div className="user-detail-label">{t('createdAt')}</div>
                        <div className="user-detail-value">
                          {new Date(selectedUser.created_at).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="alert alert-warning">{t('User not found')}</div>
                  )
                ) : (
                  <form id="userForm">
                    <div className="row mb-3">
                      <div className="col-md-6">
                        <label htmlFor="username" className="form-label">{t('username')}</label>
                        <input 
                          type="text" 
                          className="form-control" 
                          id="username" 
                          value={formData.username}
                          onChange={handleInputChange}
                          required 
                        />
                      </div>
                      <div className="col-md-6">
                        <label htmlFor="password" className="form-label">
                          {modalMode === 'edit' ? t('passwordEdit') : t('password')}
                        </label>
                        <input 
                          type="password" 
                          className="form-control" 
                          id="password" 
                          value={formData.password}
                          onChange={handleInputChange}
                          required={modalMode === 'add'} 
                        />
                      </div>
                    </div>
                    <div className="row mb-3">
                      <div className="col-md-6">
                        <label htmlFor="fullName" className="form-label">{t('fullName')}</label>
                        <input 
                          type="text" 
                          className="form-control" 
                          id="fullName" 
                          value={formData.fullName}
                          onChange={handleInputChange}
                          required 
                        />
                      </div>
                      <div className="col-md-6">
                        <label htmlFor="role" className="form-label">{t('role')}</label>
                        <select 
                          className="form-select" 
                          id="role" 
                          value={formData.role}
                          onChange={handleInputChange}
                        >
                          {availableRoles.map(role => (
                            <option key={role} value={role}>{role}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="mb-3">
                      <label htmlFor="phone" className="form-label">{t('phoneNumber')}</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        id="phone" 
                        value={formData.phone}
                        onChange={handleInputChange}
                      />
                    </div>
                  </form>
                )}
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => {
                    setShowUserModal(false);
                    setSelectedUserId(null);
                  }}
                >
                  {modalMode === 'view' ? t('close') : t('cancel')}
                </button>
                
                {modalMode !== 'view' && (
                  <button 
                    type="button" 
                    className="btn btn-primary" 
                    onClick={handleSaveClick}
                    disabled={createUser.isPending || updateUser.isPending}
                  >
                    {(createUser.isPending || updateUser.isPending) ? t('saving') : t('saveChanges')}
                  </button>
                )}
                
                {modalMode === 'view' && selectedUser && (
                  <>
                    {canEditUser(selectedUser.id) && (
                      <button 
                        type="button" 
                        className="btn btn-primary" 
                        onClick={() => {
                          handleEditClick(selectedUser.id);
                        }}
                      >
                        {t('edit')}
                      </button>
                    )}
                    
                    {/* Only show delete button if user has permission to delete this user */}
                    {canDeleteUser(user, selectedUser) && selectedUser.id !== user.id && (
                      <button 
                        type="button" 
                        className="btn btn-danger" 
                        onClick={() => {
                          setShowUserModal(false);
                          handleDeleteClick(selectedUser.id);
                        }}
                      >
                        {t('delete')}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{t('confirmDelete')}</h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowDeleteModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                {t('Are you sure you want to delete this user?')}
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowDeleteModal(false)}
                >
                  {t('cancel')}
                </button>
                <button 
                  type="button" 
                  className="btn btn-danger" 
                  onClick={handleConfirmDelete}
                  disabled={deleteUser.isPending}
                >
                  {deleteUser.isPending ? t('deleting') : t('delete')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Backdrop for modals */}
      {(showUserModal || showDeleteModal) && (
        <div 
          className="modal-backdrop fade show" 
          onClick={closeAllModals}
        ></div>
      )}
    </div>
  );
}

export default Users;