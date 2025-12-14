// Orders panel component for viewing and managing orders
import React from 'react';

const OrdersPanel = ({ pendingOrders, allOrders, onApprove, onReject, onUpdateStatus }) => {
    const [tab, setTab] = React.useState('pending');
    const [selectedOrder, setSelectedOrder] = React.useState(null);
    const [expectedCompletion, setExpectedCompletion] = React.useState('');

    const handleApprove = async () => {
        if (selectedOrder) {
            const success = await onApprove(selectedOrder.id, expectedCompletion);
            if (success) {
                setSelectedOrder(null);
                setExpectedCompletion('');
            }
        }
    };

    const handleReject = async () => {
        if (selectedOrder) {
            const reason = prompt('Enter rejection reason:');
            if (reason) {
                const success = await onReject(selectedOrder.id, reason);
                if (success) {
                    setSelectedOrder(null);
                }
            }
        }
    };

    return (
        <div className="orders-panel">
            <h2>Order Management</h2>
            
            <div className="tabs">
                <button 
                    className={`tab ${tab === 'pending' ? 'active' : ''}`}
                    onClick={() => setTab('pending')}
                >
                    Pending ({pendingOrders.length})
                </button>
                <button 
                    className={`tab ${tab === 'all' ? 'active' : ''}`}
                    onClick={() => setTab('all')}
                >
                    All Orders ({allOrders.length})
                </button>
            </div>

            <div className="orders-list">
                {tab === 'pending' && pendingOrders.map(order => (
                    <div 
                        key={order.id} 
                        className={`order-card ${selectedOrder?.id === order.id ? 'selected' : ''}`}
                        onClick={() => setSelectedOrder(order)}
                    >
                        <div className="order-header">
                            <h4>Order #{order.order_number}</h4>
                            <span className="order-total">${order.total?.toFixed(2)}</span>
                        </div>
                        <div className="order-details">
                            <p>Items: {order.items?.length || 0}</p>
                            <p>Table: {order.table_number}</p>
                        </div>
                    </div>
                ))}

                {tab === 'all' && allOrders.map(order => (
                    <div 
                        key={order.id} 
                        className={`order-card ${selectedOrder?.id === order.id ? 'selected' : ''}`}
                        onClick={() => setSelectedOrder(order)}
                    >
                        <div className="order-header">
                            <h4>Order #{order.order_number}</h4>
                            <span className={`order-status ${order.status}`}>{order.status}</span>
                        </div>
                        <div className="order-details">
                            <p>Items: {order.items?.length || 0}</p>
                            <p>Total: ${order.total?.toFixed(2)}</p>
                        </div>
                    </div>
                ))}
            </div>

            {selectedOrder && tab === 'pending' && (
                <div className="order-actions">
                    <div className="form-group">
                        <label>Expected Completion Time (minutes):</label>
                        <input
                            type="number"
                            value={expectedCompletion}
                            onChange={(e) => setExpectedCompletion(e.target.value)}
                            placeholder="25"
                            min="5"
                            max="180"
                        />
                    </div>
                    <button onClick={handleApprove} className="btn-approve">
                        ✓ Approve Order
                    </button>
                    <button onClick={handleReject} className="btn-reject">
                        ✗ Reject Order
                    </button>
                </div>
            )}

            {selectedOrder && tab === 'all' && (
                <div className="order-details-full">
                    <h3>Order Details</h3>
                    <div className="details-grid">
                        <p><strong>Status:</strong> {selectedOrder.status}</p>
                        <p><strong>Kitchen Status:</strong> {selectedOrder.kitchen_status}</p>
                        <p><strong>Total:</strong> ${selectedOrder.total?.toFixed(2)}</p>
                        <p><strong>Payment Method:</strong> {selectedOrder.payment_method}</p>
                    </div>
                    <h4>Items:</h4>
                    <ul>
                        {selectedOrder.items?.map((item, idx) => (
                            <li key={idx}>
                                {item.name} x{item.quantity} - ${(item.price * item.quantity).toFixed(2)}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default OrdersPanel;
