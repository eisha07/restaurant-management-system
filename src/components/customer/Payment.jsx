import React, { useState, useEffect } from 'react';
import { qrApi, orderApi } from '../../services/api';
import '../../styles/Payment.css';

const Payment = ({ orderId, onPaymentComplete, onBackToMenu }) => {
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState('pending');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [orderDetails, setOrderDetails] = useState(null);
  const [countdown, setCountdown] = useState(600); // 10 minutes for payment completion
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const [error, setError] = useState('');

  // Get order details from location state or fetch from API
  const orderData = location.state || {};

  // Calculate totals
  const calculateTotals = () => {
    if (orderDetails?.items) {
      const subtotal = orderDetails.items.reduce((sum, item) => 
        sum + (item.price * item.quantity), 0);
      const tax = subtotal * 0.08;
      const total = subtotal + tax;
      return { subtotal, tax, total };
    }
    return { subtotal: 0, tax: 0, total: 0 };
  };

  const { subtotal, tax, total } = calculateTotals();

  useEffect(() => {
    // Fetch order details if not provided in state
    const fetchOrderDetails = async () => {
      if (orderId && !orderDetails) {
        try {
          const response = await orderApi.getById(orderId);
          setOrderDetails(response.data);
        } catch (error) {
          console.error('Failed to fetch order:', error);
          setError('Unable to load order details');
        }
      }
    };

    fetchOrderDetails();
  }, [orderId, orderDetails]);

  useEffect(() => {
    // Generate QR code for payment
    const generatePaymentQR = async () => {
      if (!orderId) return;

      try {
        setIsProcessing(true);
        // Generate table QR code for payment reference
        const tableNumber = localStorage.getItem('tableNumber') || 'default';
        const response = await qrApi.generateTableQR(tableNumber);
        setQrCodeUrl(response.data.qrCode || response.data.qr_code);
        setPaymentStatus('qr_generated');
      } catch (error) {
        console.error('QR generation failed:', error);
        setError('Failed to generate payment QR code');
      } finally {
        setIsProcessing(false);
      }
    };

    if (orderId && !qrCodeUrl && paymentStatus === 'pending') {
      generatePaymentQR();
    }
  }, [orderId, total, qrCodeUrl, paymentStatus]);

  // Countdown timer for payment
  useEffect(() => {
    let timer;
    if (paymentStatus === 'qr_generated' && countdown > 0 && !paymentCompleted) {
      timer = setInterval(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
    }

    if (countdown === 0 && !paymentCompleted) {
      setPaymentStatus('expired');
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [paymentStatus, countdown, paymentCompleted]);

  // Check payment status (would be via webhook in real app)
  useEffect(() => {
    const checkPaymentStatus = async () => {
      if (!orderId || paymentCompleted) return;

      try {
        const response = await orderApi.getById(orderId);
        const orderStatus = response.data;
        
        if (orderStatus.payment_status === 'paid') {
          setPaymentCompleted(true);
          setPaymentStatus('success');
        }
      } catch (error) {
        console.error('Payment check failed:', error);
      }
    };

    // Poll every 10 seconds to check payment status
    const interval = setInterval(checkPaymentStatus, 10000);
    
    return () => clearInterval(interval);
  }, [orderId, paymentCompleted]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCancelPayment = () => {
    if (window.confirm('Are you sure you want to cancel payment? Your order will not be processed.')) {
      navigate('/');
    }
  };

  const handleManualPaymentComplete = () => {
    // For development/testing - simulate payment completion
    setPaymentCompleted(true);
    setPaymentStatus('success');
  };

  const handleNavigateToOrderStatus = () => {
    if (orderId) {
      navigate(`/order-status/${orderId}`);
    }
  };

  const renderPaymentSuccess = () => (
    <div className="payment-success-container">
      <div className="success-content">
        <div className="success-icon">✅</div>
        <h2>Payment Successful!</h2>
        <p className="success-message">
          Your payment has been processed. Your order is now pending manager approval.
        </p>
        
        <div className="payment-details">
          <div className="detail-row">
            <span>Amount Paid:</span>
            <span className="detail-value total-amount">${total.toFixed(2)}</span>
          </div>
          <div className="detail-row">
            <span>Order ID:</span>
            <span className="detail-value order-id">{orderId || orderDetails?.order_number}</span>
          </div>
          <div className="detail-row">
            <span>Payment Time:</span>
            <span className="detail-value">{new Date().toLocaleTimeString()}</span>
          </div>
        </div>

        <div className="next-steps">
          <h4>What happens next?</h4>
          <ol>
            <li>Manager reviews and approves your order</li>
            <li>Kitchen begins preparing your food</li>
            <li>You can track progress on the order status page</li>
            <li>Timer will show preparation time</li>
          </ol>
        </div>

        <div className="success-actions">
          <button 
            className="track-order-btn"
            onClick={handleNavigateToOrderStatus}
          >
            Track My Order →
          </button>
          <button 
            className="back-to-menu-btn"
            onClick={() => navigate('/')}
          >
            Back to Menu
          </button>
        </div>
      </div>
    </div>
  );

  const renderQRPayment = () => (
    <div className="payment-container">
      <div className="payment-header">
        <h2>Complete Payment</h2>
        <p className="header-subtitle">Scan QR code to pay for your order</p>
      </div>

      <div className="payment-content">
        {/* Order Summary */}
        <div className="order-summary-card">
          <h3 className="summary-title">Order Summary</h3>
          
          {orderDetails?.items && (
            <div className="order-items">
              {orderDetails.items.map(item => (
                <div key={item.id} className="order-item">
                  <div className="item-info">
                    <span className="item-name">{item.name}</span>
                    <span className="item-quantity">×{item.quantity}</span>
                  </div>
                  <span className="item-price">
                    ${(item.price * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
          
          <div className="order-totals">
            <div className="total-row">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="total-row">
              <span>Tax (8%)</span>
              <span>${tax.toFixed(2)}</span>
            </div>
            <div className="total-row grand-total">
              <span>Total Amount</span>
              <span className="grand-total-amount">${total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* QR Code Section */}
        <div className="qr-payment-section">
          <div className="qr-header">
            <h3>Scan QR Code to Pay</h3>
            <p className="qr-subtitle">Use your mobile banking app to scan and pay</p>
          </div>

          <div className="qr-code-display">
            {isProcessing ? (
              <div className="qr-loading">
                <div className="loading-spinner"></div>
                <p>Generating QR code...</p>
              </div>
            ) : qrCodeUrl ? (
              <div className="qr-code-container">
                {/* In real app, render actual QR code image */}
                <div className="qr-code-placeholder">
                  <div className="qr-code">
                    <div className="qr-pattern">
                      <div className="qr-corner top-left"></div>
                      <div className="qr-corner top-right"></div>
                      <div className="qr-corner bottom-left"></div>
                      <div className="qr-data">
                        <div>Amount: ${total.toFixed(2)}</div>
                        {orderId && <div>Order: {orderId.slice(-8)}</div>}
                      </div>
                    </div>
                  </div>
                  <div className="qr-amount-display">${total.toFixed(2)}</div>
                </div>
                
                <div className="qr-instructions">
                  <h4>How to pay:</h4>
                  <ol>
                    <li>Open your banking app (HBL, UBL, Meezan, etc.)</li>
                    <li>Tap on "Scan QR" or "QR Payments"</li>
                    <li>Point camera at this QR code</li>
                    <li>Confirm amount: <strong>${total.toFixed(2)}</strong></li>
                    <li>Enter your PIN to authorize payment</li>
                  </ol>
                </div>
              </div>
            ) : (
              <div className="qr-error">
                <p>Unable to generate QR code. Please try again.</p>
                <button onClick={() => window.location.reload()}>
                  Retry
                </button>
              </div>
            )}
          </div>

          {/* Timer */}
          <div className="payment-timer">
            <div className="timer-display">
              <span className="timer-icon">⏰</span>
              <span className="timer-text">Payment expires in:</span>
              <span className="timer-countdown">{formatTime(countdown)}</span>
            </div>
            <p className="timer-note">
              Complete payment before timer ends to confirm your order
            </p>
          </div>

          {/* Alternative Payment Methods */}
          <div className="alternative-payment">
            <h4>Payment Issues?</h4>
            <div className="alternative-options">
              <button className="cash-payment-btn" onClick={handleManualPaymentComplete}>
                💵 Pay Cash at Counter
              </button>
              <button className="help-btn" onClick={() => alert('Please call staff for assistance: (555) 123-4567')}>
                🆘 Call for Help
              </button>
            </div>
          </div>

          {/* Security Info */}
          <div className="payment-security">
            <div className="security-header">
              <span className="security-icon">🔒</span>
              <span>Secure Payment</span>
            </div>
            <ul className="security-features">
              <li>PCI-DSS compliant payment processing</li>
              <li>Direct bank transfer to restaurant account</li>
              <li>No card details stored on our servers</li>
              <li>Encrypted transaction data</li>
            </ul>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="payment-actions">
          <button 
            className="cancel-payment-btn"
            onClick={handleCancelPayment}
            disabled={isProcessing}
          >
            Cancel Payment
          </button>
          
          {/* For development/testing only */}
          {process.env.NODE_ENV === 'development' && (
            <button 
              className="simulate-payment-btn"
              onClick={handleManualPaymentComplete}
              disabled={isProcessing}
            >
              Simulate Payment Complete
            </button>
          )}
        </div>
      </div>
    </div>
  );

  const renderPaymentExpired = () => (
    <div className="payment-expired-container">
      <div className="expired-content">
        <div className="expired-icon">⌛</div>
        <h2>Payment Time Expired</h2>
        <p className="expired-message">
          The payment window has closed. Please start a new order.
        </p>
        
        <div className="expired-actions">
          <button 
            className="new-order-btn"
            onClick={() => navigate('/')}
          >
            Start New Order
          </button>
          <button 
            className="contact-support-btn"
            onClick={() => alert('Contact staff for assistance')}
          >
            Contact Support
          </button>
        </div>
      </div>
    </div>
  );

  // Render based on payment status
  if (paymentStatus === 'success' || paymentCompleted) {
    return renderPaymentSuccess();
  }

  if (paymentStatus === 'expired') {
    return renderPaymentExpired();
  }

  return renderQRPayment();
};

export default Payment;