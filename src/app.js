import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './styles/App.css';

// Import context providers
import { AuthProvider } from './contexts/AuthContext';

// Import customer components
import CustomerApp from './components/customer/customerApp';

// Import manager components
import Auth from './components/auth/Auth';
import ManagerDashboard from './components/manager/ManagerDashboard';
import ProtectedRoute from './components/auth/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Customer routes */}
          <Route path="/customer/*" element={<CustomerApp />} />
          
          {/* Manager routes */}
          <Route path="/manager/login" element={<Auth />} />
          <Route 
            path="/manager/dashboard" 
            element={
              <ProtectedRoute>
                <ManagerDashboard />
              </ProtectedRoute>
            } 
          />
          
          {/* Default route - redirect to customer */}
          <Route path="/" element={<Navigate to="/customer" replace />} />
          
          {/* 404 fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;