// src/components/customer/Checkout.jsx
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { orderApi } from '../../services/api';
import '../../styles/Checkout.css';

const Checkout = ({ 
  cartItems = [], 
  total = 0, 
  onPlaceOrder, 
  onClose,
  onBackToMenu,
  onProceedToPayment 
}) => {
  const [step, setStep] = useState(1); // 1: Cart Summary, 2: Order Confirmation
  const [paymentMethod, setPaymentMethod] = useState('');
  const [tableNumber, setTableNumber] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [orderDetails, setOrderDetails] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(15); // 15 minutes estimated time
  const [orderStatus, setOrderStatus] = useState('pending_approval');
  
  // Payment methods
  const PAYMENT_METHODS = [
    { id: 'cash', label: 'Cash', icon: '💵', description: 'Pay with cash at counter' },
    { id: 'card', label: 'Card', icon: '💳', description: 'Pay with credit/debit card' },
    { id: 'online', label: 'Online', icon: '📱', description: 'Pay via online transfer' }
  ];

  // Calculate totals
  const subtotal = total / 1.08; // Back-calculate subtotal if total includes tax
  const tax = total - subtotal;

  // Handle payment method selection
  const handlePaymentSelect = (methodId) => {
    console.log('💳 Payment method selected:', methodId);
    setPaymentMethod(methodId);
    setError('');
  };

  // Handle proceed to checkout (Step 1 → Step 2)
  const handleProceedToCheckout = (e) => {
    if (e) e.preventDefault();
    
    console.clear();
    console.log('%c🎯 PROCEED TO CHECKOUT BUTTON CLICKED', 'color: #667eea; font-size: 16px; font-weight: bold;');
    console.log('%cStep 1: Validating Payment Method', 'color: #ff9800; font-weight: bold;');
    console.log('💳 Payment Method Selected:', paymentMethod || '❌ NONE');
    
    if (!paymentMethod) {
      console.log('%c❌ VALIDATION FAILED: No payment method selected', 'color: #f44336; font-weight: bold;');
      setError('Please select a payment method');
      return;
    }
    
    console.log('%cStep 2: Validating Cart', 'color: #ff9800; font-weight: bold;');
    console.log('🛒 Cart Items Count:', cartItems.length);
    console.log('📦 Cart Items:', cartItems);
    
    if (cartItems.length === 0) {
      console.log('%c❌ VALIDATION FAILED: Cart is empty', 'color: #f44336; font-weight: bold;');
      setError('Your cart is empty');
      return;
    }

    console.log('%c✅ ALL VALIDATIONS PASSED!', 'color: #4caf50; font-size: 14px; font-weight: bold;');
    console.log('%c🚀 TRANSITIONING TO STEP 2 (ORDER CONFIRMATION)', 'color: #2196f3; font-size: 14px; font-weight: bold;');
    console.log('Payment Method:', paymentMethod);
    console.log('Cart Total:', cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0));
    console.log('Items:', cartItems.map(item => `${item.quantity}x ${item.name}`).join(', '));
    
    setError(''); // Clear any errors
    setStep(2); // Move to order confirmation page
    
    console.log('%c✨ SUCCESS: Now displaying Step 2 - Order Confirmation Page', 'color: #4caf50; font-size: 14px; font-weight: bold;');
  };

  // Place order (Step 2)
  const handlePlaceOrder = async (e) => {
    if (e) e.preventDefault();
    console.log('🔄 handlePlaceOrder called');
    setIsProcessing(true);
    setError('');

    try {
      // Generate session ID if not exists
      let sessionId = localStorage.getItem('customerSessionId');
      if (!sessionId) {
        sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('customerSessionId', sessionId);
      }

      // Map payment method for backend (must match database payment_methods.code)
      const paymentMethodMap = {
        'cash': 'cash',
        'card': 'card', 
        'online': 'online'
      };

      // Prepare order data
      const orderData = {
        customerSessionId: sessionId,
        paymentMethod: paymentMethodMap[paymentMethod] || 'cash',
        items: cartItems.map(item => ({
          menuItemId: item.id,
          quantity: item.quantity || 1,
          specialInstructions: specialInstructions || null
        })),
        tableNumber: tableNumber || null,
        specialInstructions: specialInstructions,
        totalAmount: total // Add this line
      };

      console.log('📤 Submitting order:', orderData);

      // Call API
      const response = await orderApi.create(orderData);
      console.log('📥 Order API response:', response);
      
      // Handle response - API returns order directly, not wrapped
      const order = response.data;
      if (order && (order.id || order.order_id)) {
        console.log('✅ Order created successfully');
        const orderId = order.id || order.order_id;
        
        // Create full order object for tracking
        const fullOrder = {
          id: orderId,
          order_number: order.order_number || `ORD-${orderId.toString().padStart(6, '0')}`,
          status: order.status || 'pending_approval',  // Use lowercase status code
          status_name: order.status_name || 'Pending Approval',
          items: order.items || [],
          subtotal: order.subtotal || 0,
          tax: order.tax || 0,
          total: order.total_amount || total,
          total_amount: order.total_amount || total,
          payment_method: paymentMethod,
          table_number: tableNumber,
          special_instructions: specialInstructions,
          created_at: order.created_at || new Date().toISOString(),
          updated_at: order.updated_at || new Date().toISOString(),
          kitchen_status: order.kitchen_status || 'pending',
          expected_completion: order.expected_completion,
          customer_id: order.customer_id
        };

        // Store full order info for OrderStatus component
        localStorage.setItem('currentOrder', JSON.stringify(fullOrder));
        setOrderDetails(fullOrder);

        // Notify parent with full order object
        if (onPlaceOrder) {
          onPlaceOrder(fullOrder);
        }

        // Start timer simulation
        startOrderTimer();

      } else {
        throw new Error('Invalid response from server');
      }

    } catch (error) {
      console.error('❌ Order failed:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      setError(error.response?.data?.message || error.message || 'Failed to place order. Please try again.');
      setStep(1); // Go back to payment selection
    } finally {
      setIsProcessing(false);
    }
  };

  // Timer simulation
  const startOrderTimer = () => {
    let timeLeft = 15; // 15 minutes
    
    const timer = setInterval(() => {
      timeLeft--;
      setTimeRemaining(timeLeft);
      
      if (timeLeft <= 0) {
        clearInterval(timer);
        setOrderStatus('ready');
      } else if (timeLeft <= 5) {
        setOrderStatus('in_progress');
      }
    }, 1000); // For demo: 1 second = 1 minute
    
    return () => clearInterval(timer);
  };

  // Handle back to payment selection
  const handleBackToPayment = () => {
    setStep(1);
  };

  // Handle back to menu
  const handleBackToMenu = () => {
    if (onBackToMenu) {
      onBackToMenu();
    }
  };

  // Step 1: Cart Summary & Payment Selection
  const renderStep1 = () => (
    <>
      <div className="checkout-header">
        <h2>Cart Summary & Payment</h2>
        <button className="close-btn" onClick={onClose}>×</button>
      </div>

      <div className="checkout-body">
        {error && (
          <div className="error-alert">
            <span className="error-icon">⚠️</span>
            <span className="error-text">{error}</span>
            <button className="dismiss-error" onClick={() => setError('')}>×</button>
          </div>
        )}

        {/* Order Items Summary */}
        <div className="section">
          <h3>Your Order ({cartItems.length} items)</h3>
          <div className="order-items">
            {cartItems.map((item, index) => (
              <div key={`${item.id}-${index}`} className="order-item">
                <div className="item-info">
                  <span className="item-quantity">{item.quantity}x</span>
                  <span className="item-name">{item.name}</span>
                </div>
                <div className="item-price">
                  ${(Number(item.price) * item.quantity).toFixed(2)}
                </div>
              </div>
            ))}
          </div>

          <div className="price-summary">
            <div className="price-row">
              <span>Subtotal:</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="price-row">
              <span>Tax (8%):</span>
              <span>${tax.toFixed(2)}</span>
            </div>
            <div className="price-row total">
              <span>Total:</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Table Number */}
        <div className="section">
          <label className="section-label">
            <span className="label-icon">🪑</span>
            Table Number (Optional)
          </label>
          <input
            type="text"
            placeholder="e.g., 5 or leave blank for takeaway"
            value={tableNumber}
            onChange={(e) => setTableNumber(e.target.value)}
            disabled={isProcessing}
            className="text-input"
          />
        </div>

        {/* Special Instructions */}
        <div className="section">
          <label className="section-label">
            <span className="label-icon">📝</span>
            Special Instructions
          </label>
          <textarea
            placeholder="Any allergies, preferences, or special requests?"
            value={specialInstructions}
            onChange={(e) => setSpecialInstructions(e.target.value)}
            disabled={isProcessing}
            className="text-area"
            rows="3"
            maxLength="200"
          />
          <div className="char-count">
            {specialInstructions.length}/200 characters
          </div>
        </div>

        {/* Payment Method Selection */}
        <div className="section">
          <h3>Select Payment Method</h3>
          <p className="section-subtitle">Choose how you'd like to pay</p>
          
          <div className="payment-methods">
            {PAYMENT_METHODS.map(method => (
              <button
                key={method.id}
                className={`payment-method ${paymentMethod === method.id ? 'selected' : ''}`}
                onClick={() => handlePaymentSelect(method.id)}
                disabled={isProcessing}
              >
                <div className="payment-icon">{method.icon}</div>
                <div className="payment-details">
                  <div className="payment-label">{method.label}</div>
                  <div className="payment-description">{method.description}</div>
                </div>
                {paymentMethod === method.id && (
                  <div className="checkmark">✓</div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="action-buttons">
          <button 
            className="secondary-btn" 
            onClick={onClose}
            disabled={isProcessing}
          >
            Cancel
          </button>
          <button 
            className="primary-btn" 
            onClick={handleProceedToCheckout}
            disabled={isProcessing || !paymentMethod || cartItems.length === 0}
          >
            Proceed to Checkout →
          </button>
        </div>

        {/* Business Info */}
        <div className="business-info">
          <p><strong>Delicious Restaurant</strong></p>
          <p>123 Food Street, City • (555) 123-4567</p>
        </div>
      </div>
    </>
  );

  // Step 2: Order Confirmation
  const renderStep2 = () => (
    <>
      <div className="checkout-header">
        <h2>Order Confirmation</h2>
        <button className="close-btn" onClick={onClose}>×</button>
      </div>

      <div className="checkout-body">
        {/* Success Message */}
        <div className="success-message">
          <div className="success-icon">✅</div>
          <h3>Your Order Has Been Placed!</h3>
          <p>We're preparing your food. Here's what happens next:</p>
        </div>

        {/* Order Details Card */}
        <div className="order-details-card">
          <div className="detail-row">
            <span className="detail-label">Order Number:</span>
            <span className="detail-value">
              {orderDetails?.orderNumber || `ORD-${Date.now().toString().slice(-6)}`}
            </span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Status:</span>
            <span className={`status-badge status-${orderStatus}`}>
              {orderStatus === 'pending_approval' && '⏳ Pending Approval'}
              {orderStatus === 'in_progress' && '👨‍🍳 Preparing'}
              {orderStatus === 'ready' && '✅ Ready for Pickup'}
            </span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Payment Method:</span>
            <span className="detail-value">
              {PAYMENT_METHODS.find(m => m.id === paymentMethod)?.label || paymentMethod}
            </span>
          </div>
          {tableNumber && (
            <div className="detail-row">
              <span className="detail-label">Table:</span>
              <span className="detail-value">#{tableNumber}</span>
            </div>
          )}
        </div>

        {/* Timer Section */}
        <div className="timer-section">
          <div className="timer-header">
            <span className="timer-icon">⏰</span>
            <h4>Estimated Arrival Time</h4>
          </div>
          <div className="timer-display">
            <div className="timer-circle">
              <div className="timer-minutes">{timeRemaining}</div>
              <div className="timer-label">minutes</div>
            </div>
            <div className="timer-progress">
              <div 
                className="progress-bar" 
                style={{ width: `${((15 - timeRemaining) / 15) * 100}%` }}
              ></div>
            </div>
          </div>
          <p className="timer-note">
            Your food will be ready in approximately {timeRemaining} minutes
          </p>
        </div>

        {/* Order Items Summary */}
        <div className="section">
          <h4>Order Summary</h4>
          <div className="order-items-summary">
            {cartItems.map((item, index) => (
              <div key={`${item.id}-${index}`} className="summary-item">
                <span className="summary-quantity">{item.quantity}x</span>
                <span className="summary-name">{item.name}</span>
                <span className="summary-price">
                  ${(Number(item.price) * item.quantity).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
          
          <div className="total-section">
            <div className="total-row">
              <span>Total:</span>
              <span className="total-amount">${total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Order Status Timeline */}
        <div className="status-timeline">
          <h4>Order Status</h4>
          <div className="timeline-steps">
            <div className={`timeline-step ${orderStatus === 'pending_approval' ? 'active' : 'completed'}`}>
              <div className="step-icon">1</div>
              <div className="step-info">
                <div className="step-title">Order Received</div>
                <div className="step-description">Awaiting manager approval</div>
              </div>
            </div>
            
            <div className={`timeline-step ${orderStatus === 'in_progress' ? 'active' : orderStatus === 'ready' ? 'completed' : ''}`}>
              <div className="step-icon">2</div>
              <div className="step-info">
                <div className="step-title">Preparing</div>
                <div className="step-description">Kitchen is cooking your food</div>
              </div>
            </div>
            
            <div className={`timeline-step ${orderStatus === 'ready' ? 'active' : ''}`}>
              <div className="step-icon">3</div>
              <div className="step-info">
                <div className="step-title">Ready</div>
                <div className="step-description">Food is ready for pickup</div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="action-buttons">
          <button 
            className="secondary-btn" 
            onClick={handleBackToPayment}
            disabled={isProcessing}
          >
            ← Back to Payment
          </button>
          <button 
            className="primary-btn" 
            onClick={handlePlaceOrder}
            disabled={isProcessing || orderDetails}
          >
            {isProcessing ? (
              <>
                <span className="spinner"></span>
                Placing Order...
              </>
            ) : orderDetails ? (
              'Order Placed!'
            ) : (
              'Confirm & Place Order'
            )}
          </button>
        </div>

        {/* Support Info */}
        <div className="support-info">
          <div className="support-item">
            <span className="support-icon">📞</span>
            <span>Need help? Call (555) 123-4567</span>
          </div>
          <div className="support-item">
            <span className="support-icon">📍</span>
            <span>Pickup at counter</span>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div className="checkout-modal">
      <div className="checkout-overlay" onClick={onClose}></div>
      
      <div className="checkout-content">
        {/* Step Indicator */}
        <div className="step-indicator">
          <div className={`step ${step === 1 ? 'active' : 'completed'}`}>
            <div className="step-number">1</div>
            <div className="step-label">Payment</div>
          </div>
          <div className="step-line"></div>
          <div className={`step ${step === 2 ? 'active' : ''}`}>
            <div className="step-number">2</div>
            <div className="step-label">Confirmation</div>
          </div>
        </div>

        {/* Render current step */}
        {step === 1 ? renderStep1() : renderStep2()}

        {/* Loading Overlay */}
        {isProcessing && (
          <div className="loading-overlay">
            <div className="loading-spinner"></div>
            <p>Processing your order...</p>
          </div>
        )}
      </div>
    </div>
  );
};

Checkout.propTypes = {
  cartItems: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      name: PropTypes.string.isRequired,
      price: PropTypes.number.isRequired,
      quantity: PropTypes.number.isRequired,
      image: PropTypes.string,
      description: PropTypes.string
    })
  ),
  total: PropTypes.number,
  onPlaceOrder: PropTypes.func,
  onClose: PropTypes.func.isRequired,
  onBackToMenu: PropTypes.func,
  onProceedToPayment: PropTypes.func
};

Checkout.defaultProps = {
  cartItems: [],
  total: 0,
  onPlaceOrder: () => {},
  onBackToMenu: () => {},
  onProceedToPayment: () => {}
};

export default Checkout;