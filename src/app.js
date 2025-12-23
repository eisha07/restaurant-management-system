
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './styles/App.css';

// Import context providers
import { AuthProvider } from './contexts/AuthContext';

// Import customer components
import CustomerApp from './components/customer/customerApp';
// ...existing code...
import LandingPage from './pages/LandingPage';

// Import manager components
import Auth from './components/auth/Auth';
import ManagerDashboard from './components/manager/ManagerDashboard';
import ProtectedRoute from './components/auth/ProtectedRoute';

// Import kitchen components
import KitchenDisplay from './components/kitchen/KitchenDisplay';

function App() {
  return (
    <AuthProvider>
      <Router future={{ v7_relativeSplatPath: true }}>
        <Routes>
          {/* Customer routes */}
          <Route path="/landing" element={<LandingPage />} />
          <Route path="/customer" element={<CustomerApp />} />
          <Route path="/customer/*" element={<CustomerApp />} />
          
          {/* Manager routes */}
          {/* Manager tab always prompts for authentication if not logged in */}
          <Route path="/manager/login" element={<Auth />} />
          <Route 
            path="/manager/dashboard" 
            element={
              <ProtectedRoute>
                <ManagerDashboard />
              </ProtectedRoute>
            } 
          />
          
          {/* Kitchen routes */}
          <Route path="/kitchen/display" element={<KitchenDisplay />} />
          
          {/* Default route - show landing page */}
          <Route path="/" element={<LandingPage />} />
          
          {/* 404 fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;