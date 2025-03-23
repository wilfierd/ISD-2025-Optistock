// client/src/App.js
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import Materials from './components/Materials';
import MaterialDetail from './components/MaterialDetail';
import MaterialRequests from './components/MaterialRequests';
import Users from './components/Users';
import Login from './components/Login';
import { useAuthStatus } from './hooks/useAuth';
import { hasAdminOrManagerAccess, hasAdminOnlyAccess } from './utils/rolePermissions';

function App() {
  const { data: authData, isLoading } = useAuthStatus();
  const user = authData?.user || null;

  if (isLoading) {
    return <div className="text-center mt-5">Loading...</div>;
  }

  return (
    <Routes>
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" />} />
      <Route path="/dashboard" element={user ? <Dashboard user={user} /> : <Navigate to="/login" />} />
      <Route path="/materials" element={user ? <Materials user={user} /> : <Navigate to="/login" />} />
      <Route path="/material/:id" element={user ? <MaterialDetail user={user} /> : <Navigate to="/login" />} />
      
      {/* Allow both admin and manager access to employees route */}
      <Route 
        path="/employees" 
        element={user && hasAdminOrManagerAccess(user) ? <Users user={user} /> : <Navigate to="/dashboard" />} 
      />
      
      {/* Allow both admin and manager access to requests route */}
      <Route 
        path="/requests" 
        element={user && hasAdminOrManagerAccess(user) ? <MaterialRequests user={user} /> : <Navigate to="/dashboard" />} 
      />
      
      <Route path="/" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
}

export default App;