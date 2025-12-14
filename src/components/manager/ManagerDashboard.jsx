// client/src/components/manager/ManagerDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../styles/ManagerDashboard.css';

// Components
import Sidebar from './Sidebar';
import OrdersPanel from './OrdersPanel';
import MenuManager from './MenuManager';
import Statistics from './Statistics';
import FeedbackView from './FeedbackView';
import { useAuth } from '../../contexts/AuthContext';

const ManagerDashboard = () => {
    const [activeSection, setActiveSection] = useState('orders');
    const [pendingOrders, setPendingOrders] = useState([]);
    const [allOrders, setAllOrders] = useState([]);
    const [statistics, setStatistics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { logout } = useAuth();
    const navigate = useNavigate();

    const fetchPendingOrders = async () => {
        try {
            const token = localStorage.getItem('manager_token');
            const response = await fetch('/api/manager/orders/pending', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                setPendingOrders(data.orders);
            }
        } catch (err) {
            console.error('Error fetching pending orders:', err);
        }
    };

    const fetchAllOrders = async () => {
        try {
            const token = localStorage.getItem('manager_token');
            const response = await fetch('/api/manager/orders/all', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                setAllOrders(data.orders);
            }
        } catch (err) {
            console.error('Error fetching all orders:', err);
        }
    };

    const fetchStatistics = async (startDate = null, endDate = null) => {
        try {
            const token = localStorage.getItem('manager_token');
            let url = '/api/manager/statistics';
            if (startDate && endDate) {
                url += `?start_date=${startDate}&end_date=${endDate}`;
            }
            
            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                setStatistics(data.statistics);
            }
        } catch (err) {
            console.error('Error fetching statistics:', err);
        }
    };

    const handleApproveOrder = async (orderId, expectedCompletion) => {
        try {
            const token = localStorage.getItem('manager_token');
            const response = await fetch(`/api/manager/orders/${orderId}/approve`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ expectedCompletion })
            });
            
            const data = await response.json();
            if (data.success) {
                // Refresh orders
                await fetchPendingOrders();
                await fetchAllOrders();
                return true;
            }
            return false;
        } catch (err) {
            console.error('Error approving order:', err);
            return false;
        }
    };

    const handleRejectOrder = async (orderId, reason) => {
        try {
            const token = localStorage.getItem('manager_token');
            const response = await fetch(`/api/manager/orders/${orderId}/reject`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ reason })
            });
            
            const data = await response.json();
            if (data.success) {
                await fetchPendingOrders();
                return true;
            }
            return false;
        } catch (err) {
            console.error('Error rejecting order:', err);
            return false;
        }
    };

    const handleUpdateOrderStatus = async (orderId, status, kitchenStatus) => {
        try {
            const token = localStorage.getItem('manager_token');
            const response = await fetch(`/api/manager/orders/${orderId}/status`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status, kitchen_status: kitchenStatus })
            });
            
            const data = await response.json();
            if (data.success) {
                await fetchAllOrders();
                return true;
            }
            return false;
        } catch (err) {
            console.error('Error updating order status:', err);
            return false;
        }
    };

    const handleAddMenuItem = async (itemData) => {
        try {
            const token = localStorage.getItem('manager_token');
            const response = await fetch('/api/manager/menu', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(itemData)
            });
            
            const data = await response.json();
            return data;
        } catch (err) {
            console.error('Error adding menu item:', err);
            return { success: false, message: 'Server error' };
        }
    };

    const handleUpdateMenuItem = async (itemId, itemData) => {
        try {
            const token = localStorage.getItem('manager_token');
            const response = await fetch(`/api/manager/menu/${itemId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(itemData)
            });
            
            const data = await response.json();
            return data;
        } catch (err) {
            console.error('Error updating menu item:', err);
            return { success: false, message: 'Server error' };
        }
    };

    const handleDeleteMenuItem = async (itemId) => {
        try {
            const token = localStorage.getItem('manager_token');
            const response = await fetch(`/api/manager/menu/${itemId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            const data = await response.json();
            return data;
        } catch (err) {
            console.error('Error deleting menu item:', err);
            return { success: false, message: 'Server error' };
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/manager/login');
    };

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                await Promise.all([
                    fetchPendingOrders(),
                    fetchAllOrders(),
                    fetchStatistics()
                ]);
            } catch (err) {
                setError('Failed to load dashboard data');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        loadData();

        // Set up polling for real-time updates
        const interval = setInterval(() => {
            fetchPendingOrders();
            fetchAllOrders();
        }, 10000); // Update every 10 seconds

        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <div className="loading-container">
                <div className="spinner"></div>
                <p>Loading dashboard...</p>
            </div>
        );
    }

    return (
        <div className="manager-dashboard">
            <header className="dashboard-header">
                <h1>Restaurant Management System</h1>
                <div className="user-info">
                    <span>Manager Dashboard</span>
                    <button onClick={handleLogout} className="logout-btn">Log Out</button>
                </div>
            </header>

            <div className="dashboard-content">
                <Sidebar 
                    activeSection={activeSection}
                    setActiveSection={setActiveSection}
                />
                
                <main className="main-content">
                    {error && <div className="error-alert">{error}</div>}
                    
                    {activeSection === 'orders' && (
                        <OrdersPanel
                            pendingOrders={pendingOrders}
                            allOrders={allOrders}
                            onApprove={handleApproveOrder}
                            onReject={handleRejectOrder}
                            onUpdateStatus={handleUpdateOrderStatus}
                        />
                    )}
                    
                    {activeSection === 'menu' && (
                        <MenuManager
                            onAddItem={handleAddMenuItem}
                            onUpdateItem={handleUpdateMenuItem}
                            onDeleteItem={handleDeleteMenuItem}
                        />
                    )}
                    
                    {activeSection === 'statistics' && (
                        <Statistics
                            statistics={statistics}
                            onDateRangeChange={fetchStatistics}
                        />
                    )}
                    
                    {activeSection === 'feedback' && (
                        <FeedbackView />
                    )}
                </main>
            </div>
        </div>
    );
};

export default ManagerDashboard;