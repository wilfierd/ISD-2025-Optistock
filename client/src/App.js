
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import Materials from './components/Materials';
import MaterialDetail from './components/MaterialDetail';
import MaterialRequests from './components/MaterialRequests';
import Users from './components/Users';
import Login from './components/Login';
import WarehouseStockCheck from './components/WarehouseStockCheck';
import { useAuthStatus } from './hooks/useAuth';
import { hasAdminOrManagerAccess } from './utils/rolePermissions';
import { LanguageProvider } from './contexts/LanguageContext';
import BatchGrouping from './components/BatchGrouping';
import Notifications from './components/Notifications'; // Import thêm component Notifications
<<<<<<< HEAD
import Production from './components/Production'; // Import thêm component Production
=======
>>>>>>> aa9def0e9889a298cfcbf130f8a2853fda497849

function App() {
  const { data: authData, isLoading } = useAuthStatus();
  const user = authData?.user || null;

  if (isLoading) {
    return <div className="text-center mt-5">Loading...</div>;
  }

  return (
    <LanguageProvider>
      <Routes>
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" />} />
        <Route path="/dashboard" element={user ? <Dashboard user={user} /> : <Navigate to="/login" />} />
        <Route path="/materials" element={user ? <Materials user={user} /> : <Navigate to="/login" />} />
        <Route path="/material/:id" element={user ? <MaterialDetail user={user} /> : <Navigate to="/login" />} />
        <Route path="/warehouse-check" element={user ? <WarehouseStockCheck user={user} /> : <Navigate to="/login" />} />
        
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

        {/* Allow only admin and manager access to warehouse check route */}
        <Route 
          path="/warehouse-check" 
          element={user ? <WarehouseStockCheck user={user} /> : <Navigate to="/dashboard" />}         
          />
        <Route 
          path="/batch-grouping" 
          element={user ? <BatchGrouping user={user} /> : <Navigate to="/login" />} 
        />
                <Route 
          path="/notifications" 
          element={user ? <Notifications user={user} /> : <Navigate to="/login" />} 
        />
        <Route path="/" element={<Navigate to="/dashboard" />} />
        <Route path="/production" element={user ? <Production user={user} /> : <Navigate to="/login" />} />
      </Routes>
    </LanguageProvider>
  );
}

export default App;