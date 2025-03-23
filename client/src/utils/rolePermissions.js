// client/src/utils/rolePermissions.js
/**
 * Utility functions for role-based permissions
 * These functions help determine what actions different user roles can perform
 */

// Check if user has admin or manager permissions
export const hasAdminOrManagerAccess = (user) => {
    if (!user) return false;
    
    // Converting to lowercase and checking for variations of role names
    const role = user.role.toLowerCase();
    return role === 'admin' || 
           role === 'quản lý' || 
           role === 'quan ly' || 
           role === 'manager';
  };
  
  // Check if user has strict admin-only permissions (for some advanced actions)
  export const hasAdminOnlyAccess = (user) => {
    if (!user) return false;
    
    // Strict check for admin role
    const role = user.role.toLowerCase();
    return role === 'admin';
  };
  
  // Function to determine if a user can manage another user based on roles
  export const canManageUser = (currentUser, targetUser) => {
    // Admins can manage anyone
    if (currentUser.role === 'admin') return true;
    
    // Managers can manage anyone except managers and admins
    if (currentUser.role === 'quản lý') {
      return targetUser.role !== 'admin' && targetUser.role !== 'quản lý';
    }
    
    // Other roles can't manage users
    return false;
  };
  
  // Function to determine if a user can delete another user
  export const canDeleteUser = (currentUser, targetUser) => {
    // Self-deletion is not allowed
    if (currentUser.id === targetUser.id) return false;
    
    // Admins can delete anyone except themselves
    if (currentUser.role === 'admin') return true;
    
    // Managers can only delete regular employees
    if (currentUser.role === 'quản lý') {
      return targetUser.role !== 'admin' && targetUser.role !== 'quản lý';
    }
    
    // Other roles can't delete users
    return false;
  };
  
  // Function to get available roles for selection based on user's role
  export const getAvailableRoles = (user) => {
    const role = user.role.toLowerCase();
    
    if (role === 'admin') {
      return ['nhân viên', 'quản lý', 'admin'];
    } else if (role === 'quản lý' || role === 'quan ly' || role === 'manager') {
      return ['nhân viên', 'quản lý']; // Managers can't assign admin role
    } else {
      return ['nhân viên'];
    }
  };
  
  // Function to determine if user can directly manage materials
  export const canManageMaterials = (user) => {
    if (!user) return false;
    
    const role = user.role.toLowerCase();
    return role === 'admin' || 
           role === 'quản lý' || 
           role === 'quan ly' || 
           role === 'manager';
  };
  
  // Function to determine if user can access requests
  export const canAccessRequests = (user) => {
    if (!user) return false;
    
    const role = user.role.toLowerCase();
    return role === 'admin' || 
           role === 'quản lý' || 
           role === 'quan ly' || 
           role === 'manager';
  };
  
  // Function to determine if user can edit another user
  export const canEditUser = (currentUser, targetUser) => {
    // Users can always edit themselves
    if (currentUser.id === targetUser.id) return true;
    
    // Admins can edit anyone
    if (currentUser.role.toLowerCase() === 'admin') return true;
    
    // Managers can edit anyone except admins
    if (currentUser.role.toLowerCase() === 'quản lý' || 
        currentUser.role.toLowerCase() === 'quan ly' ||
        currentUser.role.toLowerCase() === 'manager') {
      return targetUser.role.toLowerCase() !== 'admin';
    }
    
    // Regular employees can only edit themselves (already covered above)
    return false;
  };