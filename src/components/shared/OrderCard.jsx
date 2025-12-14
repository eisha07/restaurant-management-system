import React from 'react';
import '../../styles/Cart.css'; // Using similar card styling

const OrderCard = ({ order, onStatusChange, showTime = false }) => {
    const calculateTimeElapsed = (createdAt) => {
        if (!createdAt) return '0m';
        const created = new Date(createdAt);
        const now = new Date();
        const diffMs = now - created;
        const diffMins = Math.floor(diffMs / 60000);
        
        if (diffMins < 1) return '<1m';
        if (diffMins < 60) return `${diffMins}m`;
        
        const diffHours = Math.floor(diffMins / 60);
        const remainingMins = diffMins % 60;
        return `${diffHours}h ${remainingMins}m`;
    };

    return (
        <div className="order-card">
            <div className="order-header">
                <h3>{order.order_number || `Order #${order.id}`}</h3>
                {showTime && <span className="time-badge">{calculateTimeElapsed(order.created_at)}</span>}
            </div>

            {order.table_number && (
                <div className="order-table">
                    <small>Table: {order.table_number}</small>
                </div>
            )}

            {order.items && order.items.length > 0 && (
                <div className="order-items">
                    {order.items.map((item, idx) => (
                        <div key={idx} className="item-row">
                            <span>{item.quantity}x {item.name}</span>
                            {item.special_instructions && (
                                <small className="instructions">{item.special_instructions}</small>
                            )}
                        </div>
                    ))}
                </div>
            )}

            <div className="order-footer">
                <span className="price">${Number(order.total).toFixed(2) || '0.00'}</span>
                {onStatusChange && (
                    <select
                        value={order.status || 'received'}
                        onChange={(e) => onStatusChange(order.id, e.target.value)}
                        className="status-select"
                    >
                        <option value="received">Received</option>
                        <option value="preparing">Preparing</option>
                        <option value="ready">Ready</option>
                        <option value="completed">Completed</option>
                    </select>
                )}
            </div>
        </div>
    );
};

export default OrderCard;
