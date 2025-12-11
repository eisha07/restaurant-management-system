import React, { useState, useEffect } from 'react';
import { orderApi } from '../../services/api';
import '../../styles/OrderStatus.css';

const OrderStatus = ({ orderId, onBackToMenu, onFeedbackComplete }) => {
  // Get orderId from props instead of route params
  const timerRef = useRef(null);
  const pollRef = useRef(null);
  
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expectedTime, setExpectedTime] = useState(25);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [orderHistory, setOrderHistory] = useState([]);

  // Status flow from SRS
  const STATUS_FLOW = [
    { 
      key: 'pending_approval', 
      title: 'Order Submitted', 
      description: 'Waiting for manager approval',
      icon: '📋',
      color: '#ff9800'
    },
    { 
      key: 'approved', 
      title: 'Order Approved', 
      description: 'Manager has approved your order',
      icon: '✅',
      color: '#4caf50'
    },
    { 
      key: 'in_progress', 
      title: 'Preparing Food', 
      description: 'Kitchen is preparing your meal',
      icon: '👨‍🍳',
      color: '#2196f3'
    },
    { 
      key: 'ready', 
      title: 'Ready for Pickup', 
      description: 'Your order is ready!',
      icon: '🎉',
      color: '#9c27b0'
    },
    { 
      key: 'completed', 
      title: 'Order Completed', 
      description: 'Thank you for dining with us!',
      icon: '🌟',
      color: '#795548'
    }
  ];

  useEffect(() => {
    if (!orderId) {
      setError('No order ID provided');
      setLoading(false);
      return;
    }

    fetchOrder();
    startPolling();

    // Start timer for elapsed time
    timerRef.current = setInterval(() => {
      setTimeElapsed(prev => prev + 1);
    }, 1000);

    return () => {
      clearInterval(timerRef.current);
      stopPolling();
    };
  }, [orderId]);

  useEffect(() => {
    // Check if order is ready for feedback (SRS Business Rule 3)
    if (order?.status === 'ready' && !showFeedback) {
      setShowFeedback(true);
    }
    
    // Update order history for timeline
    if (order) {
      addToHistory(order);
    }
  }, [order?.status, showFeedback]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await orderApi.getById(orderId);
      const orderData = response.data;
      
      // Transform backend data to frontend format
      const transformedOrder = {
        id: orderData.id,
        order_number: orderData.order_number,
        items: orderData.items || [],
        subtotal: parseFloat(orderData.subtotal) || 0,
        tax: parseFloat(orderData.tax) || 0,
        total: parseFloat(orderData.total) || 0,
        payment_method: orderData.payment_method,
        table_number: orderData.table_number,
        special_instructions: orderData.special_instructions,
        created_at: orderData.created_at,
        updated_at: orderData.updated_at,
        status: orderData.status,
        approved_at: orderData.approved_at,
        kitchen_status: orderData.kitchen_status,
        expected_completion: orderData.expected_completion,
        customer_id: orderData.customer_id,
        manager_id: orderData.manager_id,
        receipt_generated: orderData.receipt_generated || false,
        receipt_url: orderData.receipt_url
      };
      
      setOrder(transformedOrder);
      
      // Calculate expected time from backend or use default
      if (orderData.expected_completion) {
        const expected = new Date(orderData.expected_completion);
        const now = new Date();
        const minutes = Math.max(1, Math.round((expected - now) / 60000));
        setExpectedTime(minutes);
      }
      
      // Calculate elapsed time since approval
      if (orderData.approved_at) {
        const approved = new Date(orderData.approved_at);
        const now = new Date();
        const seconds = Math.floor((now - approved) / 1000);
        setTimeElapsed(Math.max(0, seconds));
      }
      
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to fetch order:', error);
      setError(error.response?.data?.error || 'Failed to load order status');
      
      // Fallback: Check localStorage for order
      const savedOrder = localStorage.getItem(`order_${orderId}`);
      if (savedOrder) {
        setOrder(JSON.parse(savedOrder));
        setError(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const startPolling = () => {
    setIsPolling(true);
    
    pollRef.current = setInterval(() => {
      fetchOrder();
    }, 5000); // Poll every 5 seconds as per SRS performance requirements
  };

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    setIsPolling(false);
  };

  const addToHistory = (orderData) => {
    setOrderHistory(prev => {
      const newHistory = [...prev];
      const existingIndex = newHistory.findIndex(h => h.status === orderData.status && 
        Math.abs(new Date(h.timestamp) - new Date()) < 30000); // Within 30 seconds
      
      if (existingIndex === -1) {
        newHistory.push({
          status: orderData.status,
          timestamp: new Date().toISOString(),
          message: `Status changed to ${STATUS_FLOW.find(s => s.key === orderData.status)?.title}`
        });
      }
      
      // Keep only last 10 entries
      return newHistory.slice(-10);
    });
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const calculateProgress = () => {
    if (!order?.approved_at || !order?.expected_completion) return 0;
    
    const approvedTime = new Date(order.approved_at);
    const estimatedTime = new Date(order.expected_completion);
    const now = new Date();
    
    const totalDuration = estimatedTime - approvedTime;
    const elapsedDuration = now - approvedTime;
    
    if (totalDuration <= 0) return 100;
    
    return Math.min(100, Math.max(0, (elapsedDuration / totalDuration) * 100));
  };

  const getCurrentStatusIndex = () => {
    if (!order?.status) return -1;
    return STATUS_FLOW.findIndex(s => s.key === order.status);
  };

  const currentStatusIndex = getCurrentStatusIndex();
  const currentStatus = currentStatusIndex >= 0 ? STATUS_FLOW[currentStatusIndex] : null;

  const handleViewReceipt = () => {
    if (order?.receipt_generated && order?.receipt_url) {
      // Open receipt URL or show modal
      window.open(order.receipt_url, '_blank');
    } else {
      // Generate receipt if not available
      generateReceipt();
    }
  };

  const generateReceipt = async () => {
    try {
      const response = await orderApi.getReceipt(orderId);
      const receiptData = response.data;
      
      // Update order with receipt data
      setOrder(prev => ({
        ...prev,
        receipt_generated: true,
        receipt_url: receiptData.receipt_url
      }));
      
      setShowReceipt(true);
    } catch (error) {
      console.error('Failed to generate receipt:', error);
      // Show fallback receipt modal
      setShowReceipt(true);
    }
  };

  const handleNavigateToFeedback = () => {
    navigate(`/feedback/${orderId}`);
  };

  const handleOrderAgain = () => {
    navigate('/');
  };

  const handleNeedHelp = () => {
    // In real app, this would connect to support
    alert('Please speak to restaurant staff or call: (555) 123-4567');
  };

  const renderStatusTimeline = () => (
    <div className="status-timeline">
      {STATUS_FLOW.map((status, index) => (
        <div 
          key={status.key}
          className={`timeline-step ${index <= currentStatusIndex ? 'completed' : ''} ${index === currentStatusIndex ? 'current' : ''}`}
        >
          <div className="step-indicator" style={{ backgroundColor: status.color }}>
            <span className="step-icon">{status.icon}</span>
            {index < currentStatusIndex && (
              <span className="check-mark">✓</span>
            )}
          </div>
          <div className="step-content">
            <h4 className="step-title">{status.title}</h4>
            <p className="step-description">{status.description}</p>
            {order && index === 1 && order.approved_at && (
              <div className="step-time">
                Approved at: {new Date(order.approved_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            )}
          </div>
          {index < STATUS_FLOW.length - 1 && (
            <div className={`step-connector ${index < currentStatusIndex ? 'completed' : ''}`}></div>
          )}
        </div>
      ))}
    </div>
  );

  const renderTimerSection = () => (
    <div className="timer-section">
      <div className="timer-header">
        <h3>⏱️ Preparation Timer</h3>
        <div className="timer-info">
          <div className="order-id">Order #{order?.order_number || order?.id}</div>
          <div className="polling-status">
            {isPolling ? '🔄 Live Updates' : '📡 Updates Paused'}
          </div>
        </div>
      </div>
      
      <div className="timer-display">
        <div className="time-elapsed">
          <div className="time-value">{formatTime(timeElapsed)}</div>
          <div className="time-label">Time Since Approval</div>
          {order?.approved_at && (
            <div className="approval-time">
              Approved: {new Date(order.approved_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
        </div>
        
        <div className="time-progress">
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ width: `${calculateProgress()}%` }}
            ></div>
          </div>
          <div className="progress-labels">
            <span>Started</span>
            <span>Estimated: {expectedTime} min</span>
            <span>Completed</span>
          </div>
        </div>
        
        <div className="kitchen-status">
          <div className="status-badge">
            <span className="status-icon">
              {order?.kitchen_status === 'in_progress' ? '👨‍🍳' : 
               order?.kitchen_status === 'ready' ? '✅' : '⏳'}
            </span>
            <span className="status-text">
              {order?.kitchen_status === 'in_progress' ? 'Kitchen is preparing your order' : 
               order?.kitchen_status === 'ready' ? 'Order is ready for pickup!' : 
               'Waiting for kitchen to start'}
            </span>
          </div>
          {order?.expected_completion && (
            <div className="expected-time">
              Expected by: {new Date(order.expected_completion).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
        </div>
      </div>
      
      {orderHistory.length > 0 && (
        <div className="status-history">
          <h4>Recent Updates:</h4>
          <div className="history-list">
            {orderHistory.slice().reverse().map((entry, index) => (
              <div key={index} className="history-item">
                <span className="history-time">
                  {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="history-message">{entry.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderOrderSummary = () => (
    <div className="order-summary">
      <h3>📋 Order Details</h3>
      
      <div className="order-info-grid">
        <div className="info-item">
          <span className="info-label">Order #:</span>
          <span className="info-value">{order?.order_number || order?.id}</span>
        </div>
        <div className="info-item">
          <span className="info-label">Table:</span>
          <span className="info-value">{order?.table_number || 'Takeaway'}</span>
        </div>
        <div className="info-item">
          <span className="info-label">Order Time:</span>
          <span className="info-value">
            {order?.created_at ? new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
          </span>
        </div>
        <div className="info-item">
          <span className="info-label">Payment:</span>
          <span className="info-value payment-method">
            {order?.payment_method === 'cash' ? '💵 Cash' : 
             order?.payment_method === 'card' ? '💳 Card' : 
             '📱 Online Transfer'}
          </span>
        </div>
        <div className="info-item">
          <span className="info-label">Last Update:</span>
          <span className="info-value">
            {lastUpdate ? lastUpdate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
          </span>
        </div>
      </div>

      <div className="order-items">
        <h4>Items Ordered:</h4>
        <div className="items-list">
          {order?.items?.map((item, index) => (
            <div key={index} className="order-item">
              <span className="item-quantity">{item.quantity}x</span>
              <span className="item-name">{item.name}</span>
              <span className="item-price">${(item.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>

      {order?.special_instructions && (
        <div className="special-instructions">
          <h4>📝 Special Instructions:</h4>
          <p>{order.special_instructions}</p>
        </div>
      )}
      
      <div className="order-totals">
        <div className="total-row">
          <span>Subtotal:</span>
          <span>${order?.subtotal?.toFixed(2) || '0.00'}</span>
        </div>
        <div className="total-row">
          <span>Tax (8%):</span>
          <span>${order?.tax?.toFixed(2) || '0.00'}</span>
        </div>
        <div className="total-row grand-total">
          <span>Total:</span>
          <span>${order?.total?.toFixed(2) || '0.00'}</span>
        </div>
      </div>
    </div>
  );

  const renderFeedbackPrompt = () => (
    <div className="feedback-prompt">
      <div className="feedback-header">
        <h3>🌟 Your Order is Ready!</h3>
        <p>How was your experience?</p>
      </div>
      
      <div className="feedback-instructions">
        <p>Please provide feedback to help us improve our service</p>
        <small>Feedback is only available after order completion (SRS Business Rule 3)</small>
      </div>
      
      <div className="feedback-actions">
        <button 
          className="skip-feedback-btn"
          onClick={() => setShowFeedback(false)}
        >
          Maybe Later
        </button>
        <button 
          className="give-feedback-btn"
          onClick={handleNavigateToFeedback}
        >
          Give Feedback
        </button>
      </div>
    </div>
  );

  const renderActions = () => {
    if (order?.status === 'completed') {
      return (
        <div className="completed-actions">
          <button className="order-again-btn" onClick={handleOrderAgain}>
            🍽️ Order Again
          </button>
          <button className="view-receipt-btn" onClick={handleViewReceipt}>
            📄 View Receipt
          </button>
          {!localStorage.getItem(`feedback_submitted_${orderId}`) && (
            <button 
              className="give-feedback-btn"
              onClick={handleNavigateToFeedback}
            >
              ⭐ Give Feedback
            </button>
          )}
        </div>
      );
    }

    return (
      <div className="status-actions">
        <button className="view-receipt-btn" onClick={handleViewReceipt}>
          📄 View Receipt
        </button>
        <button className="home-btn" onClick={() => navigate('/')}>
          🏠 Back to Menu
        </button>
        <button className="help-btn" onClick={handleNeedHelp}>
          🆘 Need Help?
        </button>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="order-status-container loading">
        <div className="loading-spinner"></div>
        <p>Loading order status...</p>
        <p className="loading-subtext">Order ID: {orderId}</p>
      </div>
    );
  }

  if (error && !order) {
    return (
      <div className="order-status-container error">
        <div className="error-icon">❌</div>
        <h3>Order Not Found</h3>
        <p>{error}</p>
        <div className="error-suggestions">
          <p>Please check:</p>
          <ul>
            <li>Order ID is correct</li>
            <li>You're using the same device/browser</li>
            <li>Try returning to menu and scanning QR again</li>
          </ul>
        </div>
        <button className="back-btn" onClick={() => navigate('/')}>
          Back to Menu
        </button>
      </div>
    );
  }

  return (
    <div className="order-status-container">
      <div className="status-header">
        <div className="header-left">
          <h1>Order Status</h1>
          <p className="order-tagline">Track your order in real-time</p>
          {order?.order_number && (
            <div className="order-identifier">
              Order: <strong>{order.order_number}</strong>
            </div>
          )}
        </div>
        <div className="header-right">
          <div className="restaurant-logo">
            <span className="logo-icon">🍽️</span>
            <span className="logo-text">Delicious Restaurant</span>
          </div>
          <div className="status-indicator">
            {currentStatus && (
              <>
                <span 
                  className="status-dot" 
                  style={{ backgroundColor: currentStatus.color }}
                ></span>
                <span className="status-text">{currentStatus.title}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="status-body">
        <div className="status-main">
          {order?.status !== 'completed' && renderTimerSection()}
          
          <div className="status-flow">
            <h3>Order Journey</h3>
            {renderStatusTimeline()}
          </div>
          
          {order?.status === 'ready' && showFeedback && renderFeedbackPrompt()}
        </div>
        
        <div className="status-sidebar">
          {renderOrderSummary()}
          {renderActions()}
          
          <div className="help-section">
            <h4>ℹ️ Need Assistance?</h4>
            <p>Speak to our staff or call: <strong>(555) 123-4567</strong></p>
            <div className="help-links">
              <button onClick={() => alert('FAQ would open here')}>
                📚 FAQ
              </button>
              <button onClick={handleNeedHelp}>
                🆘 Immediate Help
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Receipt Modal would be here */}
      {showReceipt && (
        <div className="receipt-modal">
          {/* Receipt content */}
        </div>
      )}
    </div>
  );
};

export default OrderStatus;