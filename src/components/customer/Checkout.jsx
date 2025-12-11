// src/components/customer/Checkout.jsx
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { orderApi, qrApi } from '../../services/api'; // Import API services
import '../../styles/Checkout.css';

const Checkout = ({ 
  cart, 
  subtotal, 
  onPlaceOrder, 
  onClose,
  onBackToMenu 
}) => {
  
  const [paymentMethod, setPaymentMethod] = useState('');
  const [tableNumber, setTableNumber] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPaymentQR, setShowPaymentQR] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderId, setOrderId] = useState(null);
  const [qrCodeData, setQrCodeData] = useState(null);
  const [error, setError] = useState('');
  const [orderDetails, setOrderDetails] = useState(null);
  
  // Payment methods from SRS
  const PAYMENT_METHODS = [
    { id: 'cash', label: 'Pay by Cash', icon: '💵' },
    { id: 'card', label: 'Pay by Card', icon: '💳' },
    { id: 'online', label: 'Online Transfer', icon: '📱' }
  ];

  // Calculate totals
  const calculateTax = () => subtotal * 0.08; // 8% tax as per SRS
  const calculateTotal = () => subtotal + calculateTax();

  // Handle payment method selection
  const handlePaymentMethodSelect = (methodId) => {
    setPaymentMethod(methodId);
    setShowPaymentQR(false);
    setQrCodeData(null);
    setError('');
  };

  // Proceed to payment step
  const handleProceedToPayment = async () => {
    if (!paymentMethod) {
      setError('Please select a payment method');
      return;
    }

    setError('');

    if (paymentMethod === 'cash') {
      // For cash payment, directly place order
      await handlePlaceOrder();
    } else {
      // For card/online payment, generate QR code first
      await generatePaymentQR();
    }
  };

  // Generate QR code for digital payments
  const generatePaymentQR = async () => {
    try {
      setIsProcessing(true);
      
      // Generate QR code for table
      const tableNumber = localStorage.getItem('tableNumber') || 'default';
      const qrResponse = await qrApi.generateTableQR(tableNumber);
      
      // Store QR data
      setQrCodeData({
        url: qrResponse.data.qrCode || qrResponse.data.qr_url || '#',
        amount: calculateTotal(),
        paymentMethod: paymentMethod
      });
      
      setShowPaymentQR(true);
    } catch (error) {
      console.error('QR generation failed:', error);
      setError('Failed to generate payment QR. Please try again or select cash payment.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Place order with backend
  const handlePlaceOrder = async () => {
    if (!paymentMethod) {
      setError('Please select a payment method');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      // Prepare order data according to backend schema
      const orderData = {
        items: cart.map(item => ({
          menu_item_id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          special_instructions: specialInstructions || '',
          notes: item.notes || ''
        })),
        subtotal: subtotal,
        tax: calculateTax(),
        total: calculateTotal(),
        payment_method: paymentMethod,
        table_number: tableNumber || null,
        special_instructions: specialInstructions,
        status: 'pending_approval'
      };

      // Submit order to backend
      const response = await orderApi.create(orderData);
      
      const { orderId, orderNumber } = response.data;
      setOrderId(orderId);
      
      // If digital payment, we need to update QR with actual order ID
      if (paymentMethod !== 'cash' && qrCodeData) {
        // Regenerate QR with actual order details
        const tableNumber = localStorage.getItem('tableNumber') || 'default';
        const qrResponse = await qrApi.generateTableQR(tableNumber);
        setQrCodeData({
          ...qrCodeData,
          url: qrResponse.data.qrCode || qrResponse.data.qr_url,
          orderId: orderId
        });
      }

      // Store order info for status tracking
      const orderInfo = {
        orderId,
        orderNumber,
        paymentMethod,
        total: calculateTotal(),
        items: cart,
        timestamp: new Date().toISOString()
      };
      
      localStorage.setItem('currentOrder', JSON.stringify(orderInfo));
      
      // Set order details for success screen
      setOrderDetails(orderInfo);
      setOrderPlaced(true);
      
      // Call parent function if provided
      if (onPlaceOrder) {
        onPlaceOrder(orderInfo);
      }

    } catch (error) {
      console.error('Order submission failed:', error);
      setError(error.response?.data?.error || 'Failed to submit order. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle QR payment completion
  const handleQRPaymentComplete = async () => {
    setIsProcessing(true);
    try {
      // In real app, this would be handled by webhook
      // For now, we'll simulate payment completion
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (!orderId) {
        await handlePlaceOrder();
      }
      
      setShowPaymentQR(false);
    } catch (error) {
      setError('Payment verification failed. Please contact staff.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleQRPaymentCancel = () => {
    setShowPaymentQR(false);
    setQrCodeData(null);
  };

  // Navigate to order status
  const navigateToOrderStatus = () => {
    if (orderId && onBackToMenu) {
      onBackToMenu('order-status', {
        orderId,
        orderNumber: orderDetails?.orderNumber,
        paymentMethod,
        amount: calculateTotal()
      });
    }
  };

  // Navigate to receipt
  const navigateToReceipt = () => {
    if (orderId) {
      // Receipt would be available after manager approval
      alert('Receipt will be available after manager approval');
      // In future: navigate(`/receipt/${orderId}`);
    }
  };

  // Render QR code section
  const renderPaymentQR = () => {
    if (!qrCodeData) return null;

    if (paymentMethod === 'card') {
      return (
        <div className="payment-qr-section">
          <div className="qr-header">
            <h3>Scan to Pay by Card</h3>
            <p>Use your bank app to scan and complete payment</p>
          </div>
          <div className="qr-code-container">
            {/* In real app, display actual QR code image */}
            <div className="qr-code-placeholder">
              <div className="qr-code">
                <div className="qr-pattern">
                  <div className="qr-corner top-left"></div>
                  <div className="qr-corner top-right"></div>
                  <div className="qr-corner bottom-left"></div>
                  <div className="qr-data">
                    Payment: ${qrCodeData.amount.toFixed(2)}
                    {orderId && <div>Order: {orderId.slice(-8)}</div>}
                  </div>
                </div>
              </div>
              <div className="qr-amount">${qrCodeData.amount.toFixed(2)}</div>
              {orderId && (
                <div className="order-reference">Order: {orderId.slice(-8)}</div>
              )}
            </div>
          </div>
          <div className="qr-instructions">
            <p>1. Open your banking app</p>
            <p>2. Tap "Scan QR" in the app</p>
            <p>3. Point camera at this code</p>
            <p>4. Confirm payment amount</p>
          </div>
          <div className="qr-actions">
            <button 
              className="cancel-payment-btn"
              onClick={handleQRPaymentCancel}
              disabled={isProcessing}
            >
              Cancel Payment
            </button>
            <button 
              className="payment-done-btn"
              onClick={handleQRPaymentComplete}
              disabled={isProcessing}
            >
              {isProcessing ? 'Verifying...' : 'I\'ve Completed Payment'}
            </button>
          </div>
        </div>
      );
    }

    if (paymentMethod === 'online') {
      return (
        <div className="payment-qr-section">
          <div className="qr-header">
            <h3>Online Transfer QR Code</h3>
            <p>Scan with your mobile banking app</p>
          </div>
          <div className="qr-code-container">
            <div className="qr-code-placeholder">
              <div className="qr-code online-qr">
                <div className="qr-pattern">
                  <div className="qr-corner top-left"></div>
                  <div className="qr-corner top-right"></div>
                  <div className="qr-corner bottom-left"></div>
                  <div className="qr-data">
                    <div>Transfer to:</div>
                    <div>Delicious Restaurant</div>
                    <div>Account: ****1234</div>
                    {orderId && <div>Ref: {orderId.slice(-8)}</div>}
                  </div>
                </div>
              </div>
              <div className="qr-amount">${qrCodeData.amount.toFixed(2)}</div>
            </div>
          </div>
          <div className="bank-details">
            <h4>Bank Details (Alternative)</h4>
            <div className="bank-info">
              <p><strong>Bank:</strong> Sample Bank</p>
              <p><strong>Account Name:</strong> Delicious Restaurant</p>
              <p><strong>Account Number:</strong> 1234-5678-9012</p>
              <p><strong>Reference:</strong> {orderId ? `ORD-${orderId.slice(-8)}` : 'Pending'}</p>
            </div>
          </div>
          <div className="qr-actions">
            <button 
              className="cancel-payment-btn"
              onClick={handleQRPaymentCancel}
              disabled={isProcessing}
            >
              Cancel Transfer
            </button>
            <button 
              className="payment-done-btn"
              onClick={handleQRPaymentComplete}
              disabled={isProcessing}
            >
              {isProcessing ? 'Verifying...' : 'Transfer Completed'}
            </button>
          </div>
        </div>
      );
    }

    return null;
  };

  // Render order summary
  const renderOrderSummary = () => (
    <div className="order-summary-section">
      <h3>Order Summary</h3>
      <div className="order-items-list">
        {cart.map((item, index) => (
          <div key={`${item.id}-${index}`} className="order-summary-item">
            <div className="summary-item-left">
              <span className="item-quantity">{item.quantity}x</span>
              <span className="item-name">{item.name}</span>
            </div>
            <div className="summary-item-right">
              ${(item.price * item.quantity).toFixed(2)}
            </div>
          </div>
        ))}
      </div>
      
      <div className="price-breakdown">
        <div className="price-row">
          <span>Subtotal</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>
        <div className="price-row">
          <span>Tax (8%)</span>
          <span>${calculateTax().toFixed(2)}</span>
        </div>
        <div className="price-row total">
          <span>Total Amount</span>
          <span>${calculateTotal().toFixed(2)}</span>
        </div>
      </div>
    </div>
  );

  // Render payment selection
  const renderPaymentSelection = () => (
    <div className="payment-selection-section">
      <h3>Select Payment Method</h3>
      <p className="payment-instruction">Choose how you'd like to pay for your order</p>
      
      <div className="payment-methods-grid">
        {PAYMENT_METHODS.map((method) => (
          <button
            key={method.id}
            className={`payment-method-btn ${
              paymentMethod === method.id ? 'selected' : ''
            }`}
            onClick={() => handlePaymentMethodSelect(method.id)}
            disabled={isProcessing}
          >
            <span className="payment-icon">{method.icon}</span>
            <span className="payment-label">{method.label}</span>
          </button>
        ))}
      </div>
    </div>
  );

  // Render order success
  const renderOrderSuccess = () => (
    <div className="order-success-section">
      <div className="success-icon">✅</div>
      <h3>Order Placed Successfully!</h3>
      <p>Your order has been received and is waiting for manager approval.</p>
      
      {orderDetails && (
        <div className="order-details-success">
          <p><strong>Order ID:</strong> {orderDetails.orderNumber || orderId}</p>
          <p><strong>Total:</strong> ${orderDetails.total.toFixed(2)}</p>
          <p><strong>Payment:</strong> {PAYMENT_METHODS.find(m => m.id === paymentMethod)?.label}</p>
          <p><strong>Status:</strong> ⏳ Waiting for Manager Approval</p>
          <p><strong>Table:</strong> {tableNumber || 'Takeaway'}</p>
        </div>
      )}
      
      <div className="next-steps">
        <h4>What happens next? (SRS Workflow)</h4>
        <ol>
          <li><strong>Manager Approval:</strong> Manager reviews and approves order (REQ-M-2)</li>
          <li><strong>Kitchen Dispatch:</strong> Order sent to Kitchen Display System (REQ-K-1)</li>
          <li><strong>Preparation:</strong> Kitchen staff updates order status (REQ-K-2)</li>
          <li><strong>Timer Starts:</strong> Count-up timer begins on your screen (REQ-C-7)</li>
          <li><strong>Ready Notification:</strong> You'll be notified when food is ready (REQ-K-4)</li>
          <li><strong>Feedback:</strong> Provide feedback after receiving order (REQ-F-1)</li>
        </ol>
      </div>
      
      <div className="success-actions">
        <button 
          className="view-receipt-btn"
          onClick={navigateToReceipt}
        >
          View Receipt (After Approval)
        </button>
        <button 
          className="track-order-btn"
          onClick={navigateToOrderStatus}
        >
          Track My Order →
        </button>
      </div>
    </div>
  );

  // Error display
  const renderError = () => {
    if (!error) return null;
    
    return (
      <div className="checkout-error">
        <div className="error-icon">⚠️</div>
        <div className="error-message">{error}</div>
        <button 
          className="dismiss-error"
          onClick={() => setError('')}
        >
          ×
        </button>
      </div>
    );
  };

  // Loading overlay
  const renderLoadingOverlay = () => {
    if (!isProcessing) return null;
    
    return (
      <div className="loading-overlay">
        <div className="loading-spinner"></div>
        <p>Processing your order...</p>
      </div>
    );
  };

  // Main render logic
  if (orderPlaced) {
    return (
      <div className="checkout-modal">
        <div className="checkout-content">
          {renderOrderSuccess()}
        </div>
      </div>
    );
  }

  if (showPaymentQR) {
    return (
      <div className="checkout-modal">
        <div className="checkout-content">
          <div className="checkout-header">
            <h2>Complete Payment</h2>
            <button 
              className="close-checkout-btn" 
              onClick={onClose}
              disabled={isProcessing}
            >
              ×
            </button>
          </div>
          {renderPaymentQR()}
          {renderError()}
          {renderLoadingOverlay()}
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-modal">
      <div className="checkout-overlay" onClick={isProcessing ? undefined : onClose}></div>
      
      <div className="checkout-content">
        <div className="checkout-header">
          <h2>Checkout</h2>
          <button 
            className="close-checkout-btn" 
            onClick={onClose}
            disabled={isProcessing}
          >
            ×
          </button>
        </div>

        <div className="checkout-body">
          {renderError()}
          
          {/* Table Number Input */}
          <div className="table-section">
            <label htmlFor="tableNumber">
              <span className="label-icon">🪑</span>
              Table Number (Optional)
            </label>
            <input
              type="text"
              id="tableNumber"
              placeholder="e.g., 5, 12, or leave blank for takeaway"
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              maxLength="10"
              disabled={isProcessing}
            />
            <small>If dining in, please enter your table number</small>
          </div>

          {/* Special Instructions */}
          <div className="instructions-section">
            <label htmlFor="specialInstructions">
              <span className="label-icon">📝</span>
              Special Instructions
            </label>
            <textarea
              id="specialInstructions"
              placeholder="Any allergies, preferences, or special requests?"
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              rows="3"
              maxLength="200"
              disabled={isProcessing}
            />
            <small className="char-count">
              {specialInstructions.length}/200 characters
            </small>
          </div>

          {/* Order Summary */}
          {renderOrderSummary()}

          {/* Payment Selection */}
          {renderPaymentSelection()}

          {/* Important Notes from SRS */}
          <div className="checkout-notes">
            <div className="note-item">
              <span className="note-icon">⏰</span>
              <span><strong>Manager Approval:</strong> All orders require manager approval (Business Rule 1)</span>
            </div>
            <div className="note-item">
              <span className="note-icon">💳</span>
              <span><strong>Payment Finality:</strong> Payment method cannot be changed after selection (Business Rule 2)</span>
            </div>
            <div className="note-item">
              <span className="note-icon">📱</span>
              <span><strong>Digital Receipt:</strong> Receipt generated upon approval (Business Rule 5)</span>
            </div>
            <div className="note-item">
              <span className="note-icon">⭐</span>
              <span><strong>Feedback:</strong> Available after order completion (Business Rule 3)</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="checkout-actions">
            <button 
              className="back-to-menu-btn"
              onClick={onBackToMenu}
              disabled={isProcessing}
            >
              ← Back to Menu
            </button>
            
            <div className="primary-actions">
              <button 
                className="cancel-order-btn"
                onClick={onClose}
                disabled={isProcessing}
              >
                Cancel Order
              </button>
              
              <button 
                className="confirm-order-btn"
                onClick={handleProceedToPayment}
                disabled={!paymentMethod || isProcessing}
              >
                {isProcessing ? (
                  <>
                    <span className="spinner"></span>
                    Processing...
                  </>
                ) : paymentMethod === 'cash' ? (
                  'Confirm Cash Order'
                ) : (
                  'Proceed to Payment'
                )}
              </button>
            </div>
          </div>

          {/* Business Info */}
          <div className="business-info">
            <p>Delicious Restaurant</p>
            <p>123 Food Street, City • (555) 123-4567</p>
            <p>All payments processed securely</p>
          </div>
        </div>
        
        {renderLoadingOverlay()}
      </div>
    </div>
  );
};

Checkout.propTypes = {
  cart: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      name: PropTypes.string.isRequired,
      price: PropTypes.number.isRequired,
      quantity: PropTypes.number.isRequired,
      image: PropTypes.string,
      description: PropTypes.string,
      notes: PropTypes.string
    })
  ).isRequired,
  subtotal: PropTypes.number.isRequired,
  onPlaceOrder: PropTypes.func,
  onClose: PropTypes.func.isRequired,
  onBackToMenu: PropTypes.func
};

Checkout.defaultProps = {
  cart: [],
  subtotal: 0,
  onPlaceOrder: null,
  onBackToMenu: () => {}
};

export default Checkout;