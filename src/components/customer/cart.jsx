import React, { useState, useEffect } from 'react';
import '../../styles/Cart.css';

const Cart = ({ 
  cartItems = [], 
  onUpdateQuantity, 
  onRemoveItem, 
  onCheckout,
  onClose,
  restaurantId 
}) => {
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [editingNoteFor, setEditingNoteFor] = useState(null);
  const [tempNote, setTempNote] = useState('');

  // Calculate totals
  const calculateSubtotal = () => {
    return cartItems.reduce((total, item) => total + (item.price * (item.quantity || 1)), 0);
  };

  const calculateTax = () => {
    const subtotal = calculateSubtotal();
    return subtotal * 0.08; // Default 8% tax rate
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax();
  };

  const getItemTotal = (item) => {
    return item.price * (item.quantity || 1);
  };

  const handleIncreaseQuantity = (itemId) => {
    const item = cartItems.find(item => item.id === itemId);
    if (item) {
      onUpdateQuantity(itemId, 1);
    }
  };

  const handleDecreaseQuantity = (itemId) => {
    const item = cartItems.find(item => item.id === itemId);
    if (item && (item.quantity || 1) > 1) {
      onUpdateQuantity(itemId, -1);
    } else {
      onRemoveItem(itemId);
    }
  };

  const handleProceedToCheckout = () => {
    if (cartItems.length === 0) return;
    
    setIsCheckingOut(true);
    
    try {
      // SRS: All orders require manager approval before being sent to kitchen
      console.log('Order requires manager approval (SRS Business Rule 1)');
      
      if (onCheckout) {
        onCheckout();
      }
      
    } catch (error) {
      console.error('Checkout error:', error);
      alert('There was an error processing your checkout. Please try again.');
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handleClearCart = () => {
    if (window.confirm('Are you sure you want to clear your cart? This action cannot be undone.')) {
      // Remove all items
      cartItems.forEach(item => onRemoveItem(item.id));
    }
  };

  const getTotalItems = () => {
    return cartItems.reduce((total, item) => total + (item.quantity || 1), 0);
  };

  // Special instructions/notes handling
  const handleAddNote = (itemId, currentNote = '') => {
    setEditingNoteFor(itemId);
    setTempNote(currentNote);
  };

  const handleSaveNote = (itemId) => {
    console.log(`Saving note for item ${itemId}: ${tempNote}`);
    // In a real implementation, you would update the item in cart with the note
    setEditingNoteFor(null);
  };

  const handleCancelNote = () => {
    setEditingNoteFor(null);
    setTempNote('');
  };

  // If cart is empty
  if (cartItems.length === 0) {
    return (
      <div className="cart-modal-content">
        <div className="cart-header">
          <h2>Your Cart</h2>
          <button className="close-cart" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="empty-cart">
          <div className="empty-cart-icon">🛒</div>
          <h3>Your cart is empty</h3>
          <p className="empty-subtext">Add items from the menu to get started</p>
          
          {/* SRS: QR Code for table access */}
          <div className="qr-prompt">
            <p>Scan the QR code at your table to view the full menu</p>
            <div className="qr-placeholder">
              <div className="qr-code-simulated">
                <div className="qr-pattern"></div>
                <div className="qr-pattern"></div>
                <div className="qr-pattern"></div>
              </div>
              <p className="qr-label">Table #{restaurantId || 1} QR Code</p>
            </div>
          </div>
          
          <button className="browse-menu-btn" onClick={onClose}>
            Browse Menu
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-modal-content">
      {/* Cart Header */}
      <div className="cart-header">
        <h2>Your Order</h2>
        <div className="header-actions">
          <span className="item-count-badge">{getTotalItems()} items</span>
          <button className="close-cart" onClick={onClose}>
            ×
          </button>
        </div>
      </div>

      {/* Cart Items List */}
      <div className="cart-items-scroll">
        <div className="cart-items-list">
          {cartItems.map((item) => (
            <div key={item.id} className="cart-item">
              <div className="item-image">
                <img 
                  src={item.image || '/images/default-food.jpg'} 
                  alt={item.name}
                  onError={(e) => {
                    e.target.src = '/images/default-food.jpg';
                  }}
                />
                {!item.isAvailable && (
                  <div className="item-unavailable">Unavailable</div>
                )}
              </div>
              
              <div className="item-details">
                <div className="item-info">
                  <h4 className="item-name">{item.name}</h4>
                  <span className="item-category">{item.category}</span>
                </div>
                
                {/* Special Instructions/Notes */}
                {editingNoteFor === item.id ? (
                  <div className="note-editor">
                    <textarea
                      value={tempNote}
                      onChange={(e) => setTempNote(e.target.value)}
                      placeholder="Add special instructions (allergies, preferences, etc.)"
                      maxLength="200"
                      rows="2"
                    />
                    <div className="note-actions">
                      <button 
                        className="save-note-btn"
                        onClick={() => handleSaveNote(item.id)}
                      >
                        Save
                      </button>
                      <button 
                        className="cancel-note-btn"
                        onClick={handleCancelNote}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="special-instructions">
                    {item.specialInstructions ? (
                      <>
                        <span className="instructions-label">Note: </span>
                        {item.specialInstructions}
                        <button 
                          className="edit-note-btn"
                          onClick={() => handleAddNote(item.id, item.specialInstructions)}
                        >
                          Edit
                        </button>
                      </>
                    ) : (
                      <button 
                        className="add-note-btn"
                        onClick={() => handleAddNote(item.id)}
                      >
                        + Add Note
                      </button>
                    )}
                  </div>
                )}
                
                <div className="item-price-controls">
                  <div className="item-price">${item.price.toFixed(2)}</div>
                  
                  <div className="quantity-control">
                    <button 
                      className="qty-btn minus"
                      onClick={() => handleDecreaseQuantity(item.id)}
                      aria-label="Decrease quantity"
                      disabled={isCheckingOut}
                    >
                      −
                    </button>
                    <span className="qty-value">{item.quantity || 1}</span>
                    <button 
                      className="qty-btn plus"
                      onClick={() => handleIncreaseQuantity(item.id)}
                      aria-label="Increase quantity"
                      disabled={isCheckingOut}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="item-controls">
                <div className="item-total">
                  ${getItemTotal(item).toFixed(2)}
                </div>
                
                <button 
                  className="remove-item-btn"
                  onClick={() => onRemoveItem(item.id)}
                  aria-label="Remove item"
                  disabled={isCheckingOut}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cart Summary */}
      <div className="cart-summary">
        <div className="summary-row">
          <span>Subtotal ({getTotalItems()} items)</span>
          <span>${calculateSubtotal().toFixed(2)}</span>
        </div>
        <div className="summary-row">
          <span>Tax (8%)</span>
          <span>${calculateTax().toFixed(2)}</span>
        </div>
        <div className="summary-row total">
          <span>Total Amount</span>
          <span className="total-amount">${calculateTotal().toFixed(2)}</span>
        </div>
        
        {/* Promo Code (Optional feature) */}
        <div className="promo-section">
          <input 
            type="text" 
            placeholder="Enter promo code" 
            className="promo-input"
            disabled={isCheckingOut}
          />
          <button className="apply-promo-btn" disabled={isCheckingOut}>
            Apply
          </button>
        </div>
      </div>

      {/* Cart Actions */}
      <div className="cart-actions">
        <button 
          className="clear-cart-btn"
          onClick={handleClearCart}
          disabled={isCheckingOut}
        >
          Clear Cart
        </button>
        
        <button 
          className="checkout-btn"
          onClick={handleProceedToCheckout}
          disabled={cartItems.length === 0 || isCheckingOut}
        >
          {isCheckingOut ? (
            <>
              <span className="spinner"></span>
              Processing...
            </>
          ) : (
            <>
              Proceed to Checkout
              <span className="item-count">({getTotalItems()} items)</span>
            </>
          )}
        </button>
      </div>

      {/* Cart Notes (SRS Business Rules) */}
      <div className="cart-notes">
        <p className="note">
          📋 <strong>Manager Approval Required:</strong> All orders require manager approval before being sent to the kitchen (SRS Business Rule 1).
        </p>
        <p className="note">
          💳 <strong>Payment Method Finality:</strong> Payment method cannot be changed after selection. Any changes require order cancellation (SRS Business Rule 2).
        </p>
        <p className="note">
          ⭐ <strong>Feedback Eligibility:</strong> You can submit feedback only after receiving your order (SRS Business Rule 3).
        </p>
        <p className="note">
          📄 <strong>Digital Receipt:</strong> A digital receipt will be generated for every order (SRS Business Rule 5).
        </p>
        <p className="note">
          ⏰ <strong>Preparation Time:</strong> Estimated preparation time will be shown after manager approval.
        </p>
        <p className="note">
          🔒 <strong>Secure Payment:</strong> All digital payments are handled through secure third-party gateways.
        </p>
      </div>

      {/* Payment Methods Info (SRS Requirement) */}
      <div className="payment-methods-info">
        <h4>Available Payment Methods:</h4>
        <div className="payment-options">
          <div className="payment-option">
            <span className="payment-icon">💵</span>
            <span className="payment-name">Cash</span>
            <span className="payment-desc">Pay at counter</span>
          </div>
          <div className="payment-option">
            <span className="payment-icon">💳</span>
            <span className="payment-name">Card</span>
            <span className="payment-desc">Credit/Debit</span>
          </div>
          <div className="payment-option">
            <span className="payment-icon">📱</span>
            <span className="payment-name">Online Transfer</span>
            <span className="payment-desc">Scan QR to pay</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;