// src/components/customer/Cart.jsx
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom'; // Add navigation
import '../../styles/Cart.css';

const Cart = ({ 
  cartItems, 
  onUpdateQuantity, 
  onRemoveItem, 
  onProceedToCheckout,
  onCloseCart,
  onClearCart, // Add clear cart function
  restaurantId // For SRS requirement of QR codes per restaurant
}) => {
  const [cart, setCart] = useState(cartItems || []);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const navigate = useNavigate();

  // Update local cart when prop changes
  useEffect(() => {
    setCart(cartItems);
  }, [cartItems]);

  const calculateSubtotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const calculateTax = () => {
    const subtotal = calculateSubtotal();
    // You might want to fetch tax rate from backend based on location
    return subtotal * 0.08; // Default 8% tax rate
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax();
  };

  const getItemTotal = (item) => {
    return item.price * item.quantity;
  };

  const handleIncreaseQuantity = (itemId) => {
    const item = cart.find(item => item.id === itemId);
    if (item) {
      onUpdateQuantity(itemId, item.quantity + 1);
    }
  };

  const handleDecreaseQuantity = (itemId) => {
    const item = cart.find(item => item.id === itemId);
    if (item && item.quantity > 1) {
      onUpdateQuantity(itemId, item.quantity - 1);
    } else {
      onRemoveItem(itemId);
    }
  };

  const handleRemoveItem = (itemId) => {
    onRemoveItem(itemId);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    
    setIsCheckingOut(true);
    
    try {
      // Optional: Validate cart items with backend before proceeding
      // const validationResponse = await validateCartWithBackend(cart);
      
      // Close cart modal
      setIsExpanded(false);
      
      // Call parent's proceed to checkout
      if (onProceedToCheckout) {
        onProceedToCheckout();
      }
      
      // Navigate to checkout page (SRS requires separate checkout page)
      navigate('/checkout', { 
        state: { 
          cartItems: cart,
          subtotal: calculateSubtotal(),
          tax: calculateTax(),
          total: calculateTotal(),
          restaurantId: restaurantId || 1 // Default to 1 if not provided
        }
      });
      
    } catch (error) {
      console.error('Checkout error:', error);
      alert('There was an error processing your checkout. Please try again.');
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handleClearCart = () => {
    if (window.confirm('Are you sure you want to clear your cart? This action cannot be undone.')) {
      if (onClearCart) {
        onClearCart();
      } else {
        // Fallback: remove all items individually
        cart.forEach(item => onRemoveItem(item.id));
      }
    }
  };

  const getTotalItems = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  // Add item note/instruction (SRS mentions special instructions capability)
  const [editingNoteFor, setEditingNoteFor] = useState(null);
  const [tempNote, setTempNote] = useState('');

  const handleAddNote = (itemId, currentNote = '') => {
    setEditingNoteFor(itemId);
    setTempNote(currentNote);
  };

  const handleSaveNote = (itemId) => {
    // In a real implementation, you would update the item in cart with the note
    console.log(`Saving note for item ${itemId}: ${tempNote}`);
    // You might want to pass this to parent component
    setEditingNoteFor(null);
  };

  const handleCancelNote = () => {
    setEditingNoteFor(null);
    setTempNote('');
  };

  if (cart.length === 0) {
    return (
      <div className="cart-container">
        <div className="cart-icon" onClick={() => setIsExpanded(!isExpanded)}>
          <svg className="cart-svg" viewBox="0 0 24 24">
            <path d="M17,18C15.89,18 15,18.89 15,20A2,2 0 0,0 17,22A2,2 0 0,0 19,20C19,18.89 18.1,18 17,18M1,2V4H3L6.6,11.59L5.24,14.04C5.09,14.32 5,14.65 5,15A2,2 0 0,0 7,17H19V15H7.42A0.25,0.25 0 0,1 7.17,14.75C7.17,14.7 7.18,14.66 7.2,14.63L8.1,13H15.55C16.3,13 16.96,12.58 17.3,11.97L20.88,5.5C20.95,5.34 21,5.17 21,5A1,1 0 0,0 20,4H5.21L4.27,2M7,18C5.89,18 5,18.89 5,20A2,2 0 0,0 7,22A2,2 0 0,0 9,20C9,18.89 8.1,18 7,18Z" />
          </svg>
          <span className="cart-badge">0</span>
        </div>
        
        {isExpanded && (
          <div className="cart-expanded">
            <div className="cart-header">
              <h3>Your Cart</h3>
              <button className="close-btn" onClick={() => setIsExpanded(false)}>×</button>
            </div>
            <div className="empty-cart">
              <div className="empty-icon">🛒</div>
              <p>Your cart is empty</p>
              <p className="empty-subtext">Add items from the menu to get started</p>
              
              {/* QR Code prompt as per SRS */}
              <div className="qr-prompt">
                <p>Scan the QR code at your table to view the full menu</p>
                <div className="qr-placeholder">
                  {/* In real app, this would be an actual QR code */}
                  [QR CODE]
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="cart-container">
      {/* Cart Icon (Always Visible) */}
      <div className="cart-icon" onClick={() => setIsExpanded(!isExpanded)}>
        <svg className="cart-svg" viewBox="0 0 24 24">
          <path d="M17,18C15.89,18 15,18.89 15,20A2,2 0 0,0 17,22A2,2 0 0,0 19,20C19,18.89 18.1,18 17,18M1,2V4H3L6.6,11.59L5.24,14.04C5.09,14.32 5,14.65 5,15A2,2 0 0,0 7,17H19V15H7.42A0.25,0.25 0 0,1 7.17,14.75C7.17,14.7 7.18,14.66 7.2,14.63L8.1,13H15.55C16.3,13 16.96,12.58 17.3,11.97L20.88,5.5C20.95,5.34 21,5.17 21,5A1,1 0 0,0 20,4H5.21L4.27,2M7,18C5.89,18 5,18.89 5,20A2,2 0 0,0 7,22A2,2 0 0,0 9,20C9,18.89 8.1,18 7,18Z" />
        </svg>
        <span className="cart-badge">{getTotalItems()}</span>
      </div>

      {/* Expanded Cart View */}
      {isExpanded && (
        <div className="cart-expanded">
          <div className="cart-header">
            <h3>Your Order</h3>
            <div className="header-actions">
              <span className="item-count-badge">{getTotalItems()} items</span>
              <button className="close-btn" onClick={() => setIsExpanded(false)}>×</button>
            </div>
          </div>

          {/* Cart Items List */}
          <div className="cart-items-scroll">
            <div className="cart-items">
              {cart.map((item) => (
                <div key={item.id} className="cart-item">
                  <div className="item-image">
                    <img 
                      src={item.image || 'https://via.placeholder.com/60'} 
                      alt={item.name} 
                      onError={(e) => {
                        e.target.src = 'https://via.placeholder.com/60?text=Food';
                      }}
                    />
                    {!item.available && (
                      <div className="item-unavailable">Unavailable</div>
                    )}
                  </div>
                  
                  <div className="item-details">
                    <h4 className="item-name">{item.name}</h4>
                    <p className="item-category">{item.category}</p>
                    <p className="item-description">{item.description?.substring(0, 50)}...</p>
                    
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
                    
                    <div className="item-price">${item.price.toFixed(2)}</div>
                  </div>
                  
                  <div className="item-controls">
                    <div className="quantity-control">
                      <button 
                        className="qty-btn minus"
                        onClick={() => handleDecreaseQuantity(item.id)}
                        aria-label="Decrease quantity"
                        disabled={isCheckingOut}
                      >
                        -
                      </button>
                      <span className="qty-value">{item.quantity}</span>
                      <button 
                        className="qty-btn plus"
                        onClick={() => handleIncreaseQuantity(item.id)}
                        aria-label="Increase quantity"
                        disabled={isCheckingOut}
                      >
                        +
                      </button>
                    </div>
                    
                    <div className="item-total">
                      ${getItemTotal(item).toFixed(2)}
                    </div>
                    
                    <button 
                      className="remove-btn"
                      onClick={() => handleRemoveItem(item.id)}
                      aria-label="Remove item"
                      disabled={isCheckingOut}
                    >
                      <svg viewBox="0 0 24 24" width="16" height="16">
                        <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
                      </svg>
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
              <span>Total</span>
              <span className="total-amount">${calculateTotal().toFixed(2)}</span>
            </div>
            
            {/* Promo Code (Optional feature) */}
            <div className="promo-section">
              <input 
                type="text" 
                placeholder="Promo code" 
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
              onClick={handleCheckout}
              disabled={cart.length === 0 || isCheckingOut}
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

          {/* Cart Notes */}
          <div className="cart-notes">
            <p className="note">
              📋 <strong>Manager Approval Required:</strong> All orders require manager approval before being sent to the kitchen (SRS Business Rule 1).
            </p>
            <p className="note">
              ⚠️ <strong>Payment Finality:</strong> Payment method cannot be changed after selection. Any changes require order cancellation (SRS Business Rule 2).
            </p>
            <p className="note">
              ⏰ <strong>Preparation Time:</strong> Estimated preparation time will be shown after manager approval.
            </p>
            <p className="note">
              📱 <strong>Digital Receipt:</strong> A digital receipt will be generated for every order (SRS Business Rule 5).
            </p>
          </div>
        </div>
      )}

      {/* Cart Overlay */}
      {isExpanded && (
        <div className="cart-overlay" onClick={() => setIsExpanded(false)} />
      )}
    </div>
  );
};

Cart.propTypes = {
  cartItems: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      name: PropTypes.string.isRequired,
      description: PropTypes.string,
      price: PropTypes.number.isRequired,
      quantity: PropTypes.number.isRequired,
      image: PropTypes.string,
      specialInstructions: PropTypes.string,
      available: PropTypes.bool,
      category: PropTypes.string
    })
  ).isRequired,
  onUpdateQuantity: PropTypes.func.isRequired,
  onRemoveItem: PropTypes.func.isRequired,
  onProceedToCheckout: PropTypes.func.isRequired,
  onCloseCart: PropTypes.func,
  onClearCart: PropTypes.func,
  restaurantId: PropTypes.number
};

Cart.defaultProps = {
  cartItems: [],
  onCloseCart: () => {},
  onClearCart: null,
  restaurantId: 1
};

export default Cart;