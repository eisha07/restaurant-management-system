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
import { managerApi } from '../../services/api';
import { joinManagerRoom, onNewOrder, offNewOrder, onOrderUpdate, offOrderUpdate, onNewFeedback, offNewFeedback } from '../../services/socket';

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
            const response = await managerApi.getPendingOrders();
            if (response.data.success) {
                setPendingOrders(response.data.orders);
            }
        } catch (err) {
            console.error('Error fetching pending orders:', err);
            setError('Failed to load pending orders');
        }
    };

    const fetchAllOrders = async () => {
        try {
            const response = await managerApi.getAllOrders();
            if (response.data.success) {
                setAllOrders(response.data.orders);
            }
        } catch (err) {
            console.error('Error fetching all orders:', err);
            setError('Failed to load all orders');
        }
    };

    const fetchStatistics = async (startDate = null, endDate = null) => {
        try {
            const response = await managerApi.getStatistics(startDate, endDate);
            if (response.data.success) {
                setStatistics(response.data.statistics);
            }
        } catch (err) {
            console.error('Error fetching statistics:', err);
            setError('Failed to load statistics');
        }
    };

    const handleApproveOrder = async (orderId, expectedCompletion) => {
        try {
            const response = await managerApi.approveOrder(orderId, expectedCompletion);
            
            if (response.data.success) {
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
            const response = await managerApi.rejectOrder(orderId, reason);
            
            if (response.data.success) {
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
            const response = await managerApi.updateOrderStatus(orderId, status, kitchenStatus);
            
            if (response.data.success) {
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

        // Join manager room and listen for new orders
        joinManagerRoom();
        
        const handleNewOrder = (data) => {
            console.log('🔔 New order received via Socket.io:', data);
            // Refresh pending orders when new order arrives
            fetchPendingOrders();
            fetchAllOrders();
        };
        
        const handleOrderUpdate = (data) => {
            console.log('📊 Order status updated via Socket.io:', data);
            // Refresh orders when status changes
            fetchPendingOrders();
            fetchAllOrders();
        };

        const handleNewFeedback = (data) => {
            console.log('⭐ New feedback received via Socket.io:', data);
            // Could show notification or refresh feedback section
        };
        
        onNewOrder(handleNewOrder);
        onOrderUpdate(handleOrderUpdate);
        onNewFeedback(handleNewFeedback);

        // Set up polling for real-time updates as fallback (increased interval since we have Socket.IO)
        const interval = setInterval(() => {
            fetchPendingOrders();
            fetchAllOrders();
        }, 30000); // Update every 30 seconds as fallback

        return () => {
            clearInterval(interval);
            offNewOrder(handleNewOrder);
            offOrderUpdate(handleOrderUpdate);
            offNewFeedback(handleNewFeedback);
        };
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