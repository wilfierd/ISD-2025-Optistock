// Update your App.js file with these router fixes
import React from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
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
import Notifications from './components/Notifications';
import Production from './components/Production';
import ProductWarehouse from './components/ProductWarehouse';
import ProductDetail from './components/ProductDetail';
import QRScan from './components/QRScan'; // Import the new QRScan component
import QRCodeScanner from './components/QRCodeScanner';
import ReportFieldSelection from './components/ReportFieldSelection';

function App() {
  const { data: authData, isLoading } = useAuthStatus();
  const user = authData?.user || null;

  if (isLoading) {
    return <div className="text-center mt-5">Loading...</div>;
  }

  return (
    <LanguageProvider>
      <Routes>
        {/* Add key prop to force re-render when routes change */}
        <Route key="login" path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" />} />
        <Route key="dashboard" path="/dashboard" element={user ? <Dashboard user={user} /> : <Navigate to="/login" />} />
        <Route key="materials" path="/materials" element={user ? <Materials user={user} /> : <Navigate to="/login" />} />
        <Route key="material-detail" path="/material/:id" element={user ? <MaterialDetail user={user} /> : <Navigate to="/login" />} />
        <Route key="warehouse" path="/warehouse-check" element={user ? <WarehouseStockCheck user={user} /> : <Navigate to="/login" />} />
        
        {/* Allow both admin and manager access to employees route */}
        <Route 
          key="employees"
          path="/employees" 
          element={user && hasAdminOrManagerAccess(user) ? <Users user={user} /> : <Navigate to="/dashboard" />} 
        />
        
        {/* Allow both admin and manager access to requests route */}
        <Route 
          key="requests"
          path="/requests" 
          element={user && hasAdminOrManagerAccess(user) ? <MaterialRequests user={user} /> : <Navigate to="/dashboard" />} 
        />

        {/* Allow only admin and manager access to warehouse check route */}
        <Route 
          key="warehouse-check"
          path="/warehouse-check" 
          element={user ? <WarehouseStockCheck user={user} /> : <Navigate to="/dashboard" />}         
        />
        <Route 
          key="batch-grouping"
          path="/batch-grouping" 
          element={user ? <BatchGrouping user={user} /> : <Navigate to="/login" />} 
        />
        <Route 
          key="notifications"
          path="/notifications" 
          element={user ? <Notifications user={user} /> : <Navigate to="/login" />} 
        />
        <Route 
          key="production"
          path="/production" 
          element={user ? <Production user={user} /> : <Navigate to="/login" />} 
        />
        <Route 
          key="product-warehouse"
          path="/product-warehouse" 
          element={user ? <ProductWarehouse user={user} /> : <Navigate to="/login" />} 
        />
        <Route 
          key="product-detail"
          path="/product/:id" 
          element={user ? <ProductDetail user={user} /> : <Navigate to="/login" />}
        />
        <Route key="default" path="/" element={<Navigate to="/dashboard" />} />
        <Route path="/qr-scan" element={user ? <QRScan user={user} /> : <Navigate to="/login" />} />
        <Route 
          key="qr-scanner"
          path="/qr-scanner" 
          element={user ? <QRCodeScanner user={user} /> : <Navigate to="/login" />}
        />
        <Route 
          key="report-fields"
          path="/report-fields" 
          element={user ? <ReportFieldSelection user={user} /> : <Navigate to="/login" />}
        />
      </Routes>
    </LanguageProvider>
  );
}

export default App;