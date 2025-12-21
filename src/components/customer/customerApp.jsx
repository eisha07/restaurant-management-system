import React, { useState } from 'react';
// Update import paths based on your structure
import Menu from './menu';
import Cart from './cart';
import Checkout from './Checkout';      // Capital C
import Payment from './Payment';        // Capital P  
import OrderStatus from './OrderStatus'; // Capital O and S
import Feedback from './Feedback';      // Capital F

// Import CSS files
import '../../styles/Menu.css';
import '../../styles/Cart.css';
import '../../styles/Checkout.css';
import '../../styles/Payment.css';
import '../../styles/OrderStatus.css';
import '../../styles/Feedback.css';

const CustomerApp = () => {
  const [currentPage, setCurrentPage] = useState('menu');
  const [cartItems, setCartItems] = useState([]);
  const [currentOrder, setCurrentOrder] = useState(null);

  const handleAddToCart = (item) => {
    setCartItems(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => 
          i.id === item.id 
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const handleRemoveFromCart = (itemId) => {
    setCartItems(prev => prev.filter(item => item.id !== itemId));
  };

  const handleUpdateQuantity = (itemId, newQuantity) => {
    if (newQuantity < 1) {
      handleRemoveFromCart(itemId);
      return;
    }
    setCartItems(prev => 
      prev.map(item => 
        item.id === itemId 
          ? { ...item, quantity: newQuantity }
          : item
      )
    );
  };

  const handlePaymentComplete = (orderData) => {
    console.log('✅ Order completed:', orderData);
    
    // Handle both from Checkout (full order object) and Payment (payment details)
    let order;
    if (orderData.id || orderData.order_id) {
      // This is a full order object from Checkout
      order = orderData;
    } else {
      // This is payment details from Payment component
      order = {
        id: `ORD-${Date.now()}`,
        items: [...cartItems],
        payment: orderData,
        status: 'pending_approval',
        timestamp: new Date().toISOString(),
        total: cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0) * 1.08
      };
    }
    
    console.log('📦 Setting current order:', order);
    setCurrentOrder(order);
    setCartItems([]);
    setCurrentPage('order-status');
  };

  const handleGiveFeedback = (feedbackData) => {
    console.log('Feedback received:', feedbackData);
    alert('Thank you for your feedback!');
    setCurrentPage('menu');
  };

  // Calculate cart total
  const cartTotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="customer-app">
      {/* Top Navigation Bar */}
      <header className="customer-header">
        <div className="header-left">
          <h1>🍽️ Restaurant Ordering</h1>
        </div>
        <div className="header-right">
          {currentPage !== 'menu' && (
            <button 
              className="nav-btn"
              onClick={() => setCurrentPage('menu')}
            >
              Menu
            </button>
          )}
          
          {currentPage !== 'cart' && cartCount > 0 && (
            <button 
              className="nav-btn cart-btn"
              onClick={() => setCurrentPage('cart')}
            >
              🛒 Cart ({cartCount})
            </button>
          )}
          
          {currentOrder && currentPage !== 'order-status' && (
            <button 
              className="nav-btn"
              onClick={() => setCurrentPage('order-status')}
            >
              Order Status
            </button>
          )}
        </div>
      </header>

      <main className="customer-main">
        {/* Page Router */}
        {currentPage === 'menu' && (
          <Menu 
            onAddToCart={handleAddToCart}
            cartItems={cartItems}
            onViewCart={() => setCurrentPage('cart')}
          />
        )}
        
        {currentPage === 'cart' && (
          <Cart
            cartItems={cartItems}
            onUpdateQuantity={handleUpdateQuantity}
            onRemoveItem={handleRemoveFromCart}
            onCheckout={() => setCurrentPage('checkout')}
            onClose={() => setCurrentPage('menu')}
            onBackToMenu={() => setCurrentPage('menu')}
          />
        )}
        
        {currentPage === 'checkout' && (
          <Checkout
            cartItems={cartItems}
            total={cartTotal}
            onClose={() => setCurrentPage('cart')}
            onBackToMenu={() => setCurrentPage('menu')}
            onPlaceOrder={handlePaymentComplete}
            onProceedToPayment={() => setCurrentPage('payment')}
          />
        )}
        
        {currentPage === 'payment' && (
          <Payment
            cartItems={cartItems}
            total={cartTotal}
            onPaymentComplete={handlePaymentComplete}
            onBackToMenu={() => setCurrentPage('menu')}
            orderId={`ORD-${Date.now()}`}
          />
        )}
        
        {currentPage === 'order-status' && currentOrder && (
          <OrderStatus
            order={currentOrder}
            onGiveFeedback={() => setCurrentPage('feedback')}
          />
        )}
        
        {currentPage === 'feedback' && (
          <Feedback
            orderId={currentOrder?.id}
            onSubmitFeedback={handleGiveFeedback}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="customer-footer">
        <p>Restaurant Ordering System v1.0</p>
        <p>Scan QR code to start ordering</p>
      </footer>
    </div>
  );
};

export default CustomerApp;