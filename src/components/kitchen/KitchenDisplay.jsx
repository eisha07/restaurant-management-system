// client/src/components/kitchen/KitchenDisplay.jsx
import React, { useState, useEffect, useRef } from 'react';
import '../../styles/KitchenDisplay.css';

const KitchenDisplay = () => {
    const [orders, setOrders] = useState({
        received: [],
        preparing: [],
        ready: []
    });
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [showTimers, setShowTimers] = useState(true);
    const [newOrderAlert, setNewOrderAlert] = useState(false);
    const audioRef = useRef(null);

    // Fetch orders from API
    const fetchOrders = async () => {
        try {
            const response = await fetch('/api/kitchen/orders/active');
            const data = await response.json();
            
            if (data.success) {
                const previousCount = Object.values(orders).flat().length;
                const newCount = Object.values(data.groupedOrders).flat().length;
                
                // Play sound if new order arrived
                if (soundEnabled && newCount > previousCount && previousCount > 0) {
                    setNewOrderAlert(true);
                    if (audioRef.current) {
                        audioRef.current.play().catch(e => console.log('Audio play failed:', e));
                    }
                    setTimeout(() => setNewOrderAlert(false), 3000);
                }
                
                setOrders(data.groupedOrders);
                setLoading(false);
            }
        } catch (error) {
            console.error('Error fetching kitchen orders:', error);
            setLoading(false);
        }
    };

    // Update order status
    const updateOrderStatus = async (orderId, newStatus, notes = '') => {
        try {
            const response = await fetch(`/api/kitchen/orders/${orderId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus, notes })
            });
            
            const data = await response.json();
            if (data.success) {
                fetchOrders(); // Refresh orders
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error updating order status:', error);
            return false;
        }
    };

    // Set expected completion time
    const setExpectedTime = async (orderId, minutes) => {
        try {
            const response = await fetch(`/api/kitchen/orders/${orderId}/expected-time`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ minutes })
            });
            
            const data = await response.json();
            if (data.success) {
                fetchOrders();
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error setting expected time:', error);
            return false;
        }
    };

    // Calculate time elapsed
    const calculateTimeElapsed = (createdAt) => {
        const created = new Date(createdAt);
        const now = new Date();
        const diffMs = now - created;
        const diffMins = Math.floor(diffMs / 60000);
        const diffSecs = Math.floor((diffMs % 60000) / 1000);
        return `${diffMins}:${diffSecs.toString().padStart(2, '0')}`;
    };

    // Format time remaining
    const formatTimeRemaining = (expectedTime) => {
        if (!expectedTime) return '--:--';
        const expected = new Date(expectedTime);
        const now = new Date();
        const diffMs = expected - now;
        
        if (diffMs < 0) return 'Overdue';
        
        const diffMins = Math.floor(diffMs / 60000);
        const diffSecs = Math.floor((diffMs % 60000) / 1000);
        return `${diffMins}:${diffSecs.toString().padStart(2, '0')}`;
    };

    // Handle drag and drop for Kanban
    const handleDragStart = (e, orderId, fromStatus) => {
        e.dataTransfer.setData('orderId', orderId);
        e.dataTransfer.setData('fromStatus', fromStatus);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
    };

    const handleDrop = async (e, toStatus) => {
        e.preventDefault();
        const orderId = e.dataTransfer.getData('orderId');
        const fromStatus = e.dataTransfer.getData('fromStatus');
        
        if (fromStatus !== toStatus) {
            await updateOrderStatus(orderId, toStatus, `Moved from ${fromStatus} to ${toStatus}`);
        }
    };

    // Initialize
    useEffect(() => {
        fetchOrders();
        
        // Set up real-time updates (polling every 5 seconds)
        const interval = setInterval(fetchOrders, 5000);
        
        // Set up WebSocket connection for real-time (alternative)
        // const ws = new WebSocket('ws://localhost:5000/kitchen-ws');
        
        return () => {
            clearInterval(interval);
            // ws.close();
        };
    }, []);

    // Sound effects
    useEffect(() => {
        audioRef.current = new Audio('/sounds/new-order.mp3');
        audioRef.current.volume = 0.3;
    }, []);

    if (loading && Object.values(orders).flat().length === 0) {
        return (
            <div className="kitchen-loading">
                <div className="spinner-large"></div>
                <h2>Loading Kitchen Display...</h2>
            </div>
        );
    }

    return (
        <div className="kitchen-display">
            {/* Header */}
            <header className="kitchen-header">
                <div className="header-left">
                    <h1>KITCHEN DISPLAY SYSTEM</h1>
                    <div className="kitchen-stats">
                        <span className="stat-item">
                            <strong>Active:</strong> {Object.values(orders).flat().length}
                        </span>
                        <span className="stat-item">
                            <strong>New:</strong> {orders.received.length}
                        </span>
                        <span className="stat-item">
                            <strong>Preparing:</strong> {orders.preparing.length}
                        </span>
                        <span className="stat-item">
                            <strong>Ready:</strong> {orders.ready.length}
                        </span>
                    </div>
                </div>
                
                <div className="header-right">
                    <div className="header-controls">
                        <button 
                            className={`sound-btn ${soundEnabled ? 'enabled' : 'disabled'}`}
                            onClick={() => setSoundEnabled(!soundEnabled)}
                        >
                            🔔 {soundEnabled ? 'ON' : 'OFF'}
                        </button>
                        <button 
                            className="refresh-btn"
                            onClick={fetchOrders}
                        >
                            🔄 Refresh
                        </button>
                        <button 
                            className="timer-btn"
                            onClick={() => setShowTimers(!showTimers)}
                        >
                            ⏰ {showTimers ? 'Hide' : 'Show'} Timers
                        </button>
                    </div>
                    <div className="current-time">
                        {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                </div>
            </header>

            {/* New Order Alert */}
            {newOrderAlert && (
                <div className="new-order-alert">
                    🆕 NEW ORDER RECEIVED! 🆕
                </div>
            )}

            {/* Main Kanban Board */}
            <main className="kanban-board">
                {/* Received Column */}
                <div 
                    className="kanban-column received-column"
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, 'received')}
                >
                    <div className="column-header">
                        <h2>📥 RECEIVED</h2>
                        <span className="order-count">{orders.received.length}</span>
                    </div>
                    <div className="order-list">
                        {orders.received.map(order => (
                            <OrderCard 
                                key={order.id}
                                order={order}
                                onDragStart={(e) => handleDragStart(e, order.id, 'received')}
                                onClick={() => setSelectedOrder(order)}
                                showTimers={showTimers}
                                onSetTime={(minutes) => setExpectedTime(order.id, minutes)}
                                onStart={() => updateOrderStatus(order.id, 'preparing', 'Started preparation')}
                            />
                        ))}
                        {orders.received.length === 0 && (
                            <div className="empty-column">
                                <p>No new orders</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Preparing Column */}
                <div 
                    className="kanban-column preparing-column"
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, 'preparing')}
                >
                    <div className="column-header">
                        <h2>👨‍🍳 PREPARING</h2>
                        <span className="order-count">{orders.preparing.length}</span>
                    </div>
                    <div className="order-list">
                        {orders.preparing.map(order => (
                            <OrderCard 
                                key={order.id}
                                order={order}
                                onDragStart={(e) => handleDragStart(e, order.id, 'preparing')}
                                onClick={() => setSelectedOrder(order)}
                                showTimers={showTimers}
                                onSetTime={(minutes) => setExpectedTime(order.id, minutes)}
                                onReady={() => updateOrderStatus(order.id, 'ready', 'Order ready for pickup')}
                            />
                        ))}
                        {orders.preparing.length === 0 && (
                            <div className="empty-column">
                                <p>No orders in progress</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Ready Column */}
                <div 
                    className="kanban-column ready-column"
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, 'ready')}
                >
                    <div className="column-header">
                        <h2>✅ READY</h2>
                        <span className="order-count">{orders.ready.length}</span>
                    </div>
                    <div className="order-list">
                        {orders.ready.map(order => (
                            <OrderCard 
                                key={order.id}
                                order={order}
                                onDragStart={(e) => handleDragStart(e, order.id, 'ready')}
                                onClick={() => setSelectedOrder(order)}
                                showTimers={showTimers}
                                onComplete={() => updateOrderStatus(order.id, 'completed', 'Order collected')}
                            />
                        ))}
                        {orders.ready.length === 0 && (
                            <div className="empty-column">
                                <p>No orders ready</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Order Detail Modal */}
            {selectedOrder && (
                <OrderDetailModal
                    order={selectedOrder}
                    onClose={() => setSelectedOrder(null)}
                    onUpdateStatus={updateOrderStatus}
                    onSetTime={setExpectedTime}
                />
            )}

            {/* Quick Time Setter */}
            <div className="quick-time-setter">
                <h3>Quick Time Set:</h3>
                {[10, 15, 20, 25, 30].map(minutes => (
                    <button 
                        key={minutes}
                        className="time-btn"
                        onClick={() => {
                            if (selectedOrder) {
                                setExpectedTime(selectedOrder.id, minutes);
                            }
                        }}
                    >
                        {minutes} min
                    </button>
                ))}
            </div>
        </div>
    );
};

// Order Card Component
const OrderCard = ({ order, onDragStart, onClick, showTimers, onSetTime, onStart, onReady, onComplete }) => {
    const isOverdue = order.expected_completion && new Date(order.expected_completion) < new Date();
    
    const calculateTimeElapsed = (createdAt) => {
        const created = new Date(createdAt);
        const now = new Date();
        const diffMs = now - created;
        const diffMins = Math.floor(diffMs / 60000);
        const diffSecs = Math.floor((diffMs % 60000) / 1000);
        return `${diffMins}:${diffSecs.toString().padStart(2, '0')}`;
    };

    const formatTimeRemaining = (expectedTime) => {
        if (!expectedTime) return '--:--';
        const expected = new Date(expectedTime);
        const now = new Date();
        const diffMs = expected - now;
        
        if (diffMs < 0) return 'Overdue';
        
        const diffMins = Math.floor(diffMs / 60000);
        const diffSecs = Math.floor((diffMs % 60000) / 1000);
        return `${diffMins}:${diffSecs.toString().padStart(2, '0')}`;
    };
    
    return (
        <div 
            className={`order-card ${isOverdue ? 'overdue' : ''}`}
            draggable
            onDragStart={onDragStart}
            onClick={onClick}
        >
            <div className="order-card-header">
                <div className="order-number">{order.order_number}</div>
                <div className="order-table">
                    {order.table_number === 'TAKEAWAY' ? '🚗 Takeaway' : `Table ${order.table_number}`}
                </div>
            </div>
            
            {showTimers && (
                <div className="order-timers">
                    <div className="timer">
                        <span className="timer-label">Elapsed:</span>
                        <span className="timer-value">{calculateTimeElapsed(order.created_at)}</span>
                    </div>
                    {order.expected_completion && (
                        <div className={`timer ${isOverdue ? 'overdue-timer' : ''}`}>
                            <span className="timer-label">Remaining:</span>
                            <span className="timer-value">
                                {formatTimeRemaining(order.expected_completion)}
                            </span>
                        </div>
                    )}
                </div>
            )}
            
            <div className="order-items">
                {order.items && order.items.slice(0, 3).map((item, index) => (
                    <div key={index} className="order-item">
                        <span className="item-quantity">{item.quantity}x</span>
                        <span className="item-name">{item.name}</span>
                        {item.special_instructions && <span className="item-note">📝</span>}
                    </div>
                ))}
                {order.items && order.items.length > 3 && (
                    <div className="more-items">+{order.items.length - 3} more items</div>
                )}
            </div>
            
            {order.special_instructions && (
                <div className="special-instructions">
                    <span className="instructions-icon">💡</span>
                    {order.special_instructions.substring(0, 50)}
                    {order.special_instructions.length > 50 && '...'}
                </div>
            )}
            
            <div className="order-actions">
                {order.kitchen_status === 'received' && onStart && (
                    <button 
                        className="action-btn start-btn"
                        onClick={(e) => {
                            e.stopPropagation();
                            onStart();
                        }}
                    >
                        Start
                    </button>
                )}
                
                {order.kitchen_status === 'preparing' && onReady && (
                    <button 
                        className="action-btn ready-btn"
                        onClick={(e) => {
                            e.stopPropagation();
                            onReady();
                        }}
                    >
                        Mark Ready
                    </button>
                )}
                
                {order.kitchen_status === 'ready' && onComplete && (
                    <button 
                        className="action-btn complete-btn"
                        onClick={(e) => {
                            e.stopPropagation();
                            onComplete();
                        }}
                    >
                        Collected
                    </button>
                )}
                
                {onSetTime && (
                    <button 
                        className="action-btn time-btn"
                        onClick={(e) => {
                            e.stopPropagation();
                            const minutes = prompt('Set expected completion time (minutes):', '25');
                            if (minutes && !isNaN(minutes)) {
                                onSetTime(parseInt(minutes));
                            }
                        }}
                    >
                        Set Time
                    </button>
                )}
            </div>
        </div>
    );
};

// Order Detail Modal
const OrderDetailModal = ({ order, onClose, onUpdateStatus, onSetTime }) => {
    const [timeline, setTimeline] = useState([]);
    
    useEffect(() => {
        const fetchTimeline = async () => {
            try {
                const response = await fetch(`/api/kitchen/orders/${order.id}/timeline`);
                const data = await response.json();
                if (data.success) {
                    setTimeline(data.timeline);
                }
            } catch (error) {
                console.error('Error fetching timeline:', error);
            }
        };
        
        fetchTimeline();
    }, [order.id]);
    
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="order-detail-modal" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose}>✕</button>
                
                <div className="modal-header">
                    <h2>Order Details: {order.order_number}</h2>
                    <div className="order-status-badge">{order.kitchen_status}</div>
                </div>
                
                <div className="modal-content">
                    <div className="detail-section">
                        <h3>Customer Info</h3>
                        <div className="detail-grid">
                            <div className="detail-item">
                                <span className="detail-label">Table:</span>
                                <span className="detail-value">
                                    {order.table_number === 'TAKEAWAY' ? 'Takeaway' : `Table ${order.table_number}`}
                                </span>
                            </div>
                            <div className="detail-item">
                                <span className="detail-label">Order Time:</span>
                                <span className="detail-value">
                                    {new Date(order.created_at).toLocaleTimeString()}
                                </span>
                            </div>
                            <div className="detail-item">
                                <span className="detail-label">Total:</span>
                                <span className="detail-value">${order.total}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="detail-section">
                        <h3>Order Items</h3>
                        <div className="items-list">
                            {order.items && order.items.map((item, index) => (
                                <div key={index} className="detail-item-row">
                                    <div className="item-quantity">{item.quantity}x</div>
                                    <div className="item-name">{item.name}</div>
                                    <div className="item-price">${(Number(item.price) * item.quantity).toFixed(2)}</div>
                                    {item.special_instructions && (
                                        <div className="item-instructions">
                                            <span className="instructions-icon">📝</span>
                                            {item.special_instructions}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    {order.special_instructions && (
                        <div className="detail-section">
                            <h3>Special Instructions</h3>
                            <div className="instructions-box">
                                {order.special_instructions}
                            </div>
                        </div>
                    )}
                    
                    <div className="detail-section">
                        <h3>Order Timeline</h3>
                        <div className="timeline">
                            {timeline.map((log, index) => (
                                <div key={index} className="timeline-item">
                                    <div className="timeline-time">
                                        {new Date(log.created_at).toLocaleTimeString()}
                                    </div>
                                    <div className="timeline-status">{log.status}</div>
                                    <div className="timeline-notes">{log.notes}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                
                <div className="modal-actions">
                    <button 
                        className="btn btn-primary"
                        onClick={() => {
                            const minutes = prompt('Set expected completion time (minutes):', '25');
                            if (minutes && !isNaN(minutes)) {
                                onSetTime(order.id, parseInt(minutes));
                            }
                        }}
                    >
                        Set Completion Time
                    </button>
                    
                    {order.kitchen_status === 'received' && (
                        <button 
                            className="btn btn-success"
                            onClick={() => onUpdateStatus(order.id, 'preparing', 'Started preparation')}
                        >
                            Start Preparation
                        </button>
                    )}
                    
                    {order.kitchen_status === 'preparing' && (
                        <button 
                            className="btn btn-warning"
                            onClick={() => onUpdateStatus(order.id, 'ready', 'Order ready for pickup')}
                        >
                            Mark as Ready
                        </button>
                    )}
                    
                    {order.kitchen_status === 'ready' && (
                        <button 
                            className="btn btn-danger"
                            onClick={() => onUpdateStatus(order.id, 'completed', 'Order collected by customer')}
                        >
                            Mark as Collected
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default KitchenDisplay;