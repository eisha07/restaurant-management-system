import React, { useState, useEffect, useRef } from 'react';
import { menuApi } from '../../services/api';
import '../../styles/Menu.css';

const Menu = () => {
  const [menuItems, setMenuItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [cartItems, setCartItems] = useState([]);
  const [cartCount, setCartCount] = useState(0);
  const [showCart, setShowCart] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [usingMockData, setUsingMockData] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState(null);
  
  const fallbackData = useRef([
    {
      id: 1,
      name: 'Chana Masala',
      description: 'Chickpeas cooked in flavorful tomato gravy',
      price: 8.99,
      category: 'DESI',
      image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
      isAvailable: true,
      rating: 4.0
    },
    {
      id: 2,
      name: 'Chicken Biryani',
      description: 'Aromatic basmati rice cooked with tender chicken pieces, herbs, and spices',
      price: 12.99,
      category: 'DESI',
      image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
      isAvailable: true,
      rating: 4.8
    },
    {
      id: 3,
      name: 'Chicken Karahi',
      description: 'Traditional Pakistani curry cooked in wok with tomatoes and ginger',
      price: 13.99,
      category: 'DESI',
      image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
      isAvailable: true,
      rating: 4.7
    },
    {
      id: 4,
      name: 'Beef Burger',
      description: 'Juicy beef patty with cheese, lettuce, tomato, and special sauce',
      price: 9.99,
      category: 'FAST FOOD',
      image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
      isAvailable: true,
      rating: 4.0
    },
    {
      id: 5,
      name: 'Cheese Pizza',
      description: 'Freshly baked pizza with mozzarella cheese and tomato sauce',
      price: 14.99,
      category: 'FAST FOOD',
      image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
      isAvailable: true,
      rating: 4.2
    },
    {
      id: 6,
      name: 'French Fries',
      description: 'Crispy golden fries served with ketchup',
      price: 5.99,
      category: 'FAST FOOD',
      image: 'https://images.unsplash.com/photo-1576107232684-1279f390859f?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
      isAvailable: true,
      rating: 4.1
    },
    {
      id: 7,
      name: 'Paneer Tikka',
      description: 'Cottage cheese cubes marinated in spices and grilled',
      price: 10.99,
      category: 'DESI',
      image: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
      isAvailable: true,
      rating: 4.5
    },
    {
      id: 8,
      name: 'Butter Chicken',
      description: 'Tender chicken in rich tomato and butter sauce',
      price: 14.99,
      category: 'DESI',
      image: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
      isAvailable: true,
      rating: 4.6
    },
    {
      id: 9,
      name: 'Chicken Wings',
      description: 'Crispy chicken wings with your choice of sauce',
      price: 11.99,
      category: 'FAST FOOD',
      image: 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
      isAvailable: true,
      rating: 4.3
    }
  ]);

  // Extract unique categories from fetched data
  const categories = menuItems.length > 0 
    ? ['All', ...new Set(menuItems.map(item => item.category))] 
    : ['All'];

  // Update cart count
  useEffect(() => {
    const totalItems = cartItems.reduce((total, item) => total + (item.quantity || 1), 0);
    setCartCount(totalItems);
  }, [cartItems]);

  // Fetch menu items from backend on component mount
  useEffect(() => {
    fetchMenuItems();
  }, []);

  // Filter and search functionality
  useEffect(() => {
    let filtered = menuItems;

    // Apply category filter
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(item => item.category === selectedCategory);
    }

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(term) ||
        (item.description && item.description.toLowerCase().includes(term))
      );
    }

    setFilteredItems(filtered);
  }, [selectedCategory, searchTerm, menuItems]);

  const fetchMenuItems = async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);
      setUsingMockData(false);
      
      const response = await menuApi.getAll();
      
      if (!response.data || !Array.isArray(response.data)) {
        throw new Error('Invalid response format from server');
      }
      
      if (response.data.length === 0) {
        throw new Error('No menu items available from server');
      }
      
      // Transform the data
      const items = response.data.map(item => ({
        id: item.id || item._id,
        name: item.name || 'Unnamed Item',
        description: item.description || '',
        price: parseFloat(item.price) || 0,
        category: item.category || 'Uncategorized',
        image: item.image || item.image_url || '/images/default-food.jpg',
        isAvailable: item.isAvailable !== false && item.is_available !== false,
        rating: item.rating || 4.0
      }));
      
      setMenuItems(items);
      setFilteredItems(items);
      setRetryCount(0);
      setLastFetchTime(new Date());
      
    } catch (err) {
      const isNetworkError = !err.response;
      const isServerError = err.response && err.response.status >= 500;
      
      if (retryCount >= 2 || isNetworkError || isServerError) {
        const errorMsg = isNetworkError 
          ? 'Network error: Unable to connect to server. Using offline data.'
          : `Server error (${err.response?.status}). Using offline data.`;
        
        setError(errorMsg);
        setMenuItems(fallbackData.current);
        setFilteredItems(fallbackData.current);
        setUsingMockData(true);
      } else {
        setError(`Connection issue: ${err.message}. Retrying...`);
        setRetryCount(prev => prev + 1);
        
        setTimeout(() => {
          fetchMenuItems(true);
        }, 2000 * retryCount);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (item) => {
    setCartItems(prevItems => {
      const existingItem = prevItems.find(i => i.id === item.id);
      if (existingItem) {
        return prevItems.map(i =>
          i.id === item.id
            ? { ...i, quantity: (i.quantity || 1) + 1 }
            : i
        );
      } else {
        return [...prevItems, { ...item, quantity: 1 }];
      }
    });
  };

  const handleUpdateQuantity = (itemId, change) => {
    setCartItems(prevItems =>
      prevItems.map(item => {
        if (item.id === itemId) {
          const newQuantity = (item.quantity || 1) + change;
          return newQuantity > 0 
            ? { ...item, quantity: newQuantity }
            : item;
        }
        return item;
      }).filter(item => (item.quantity || 1) > 0)
    );
  };

  const handleRemoveItem = (itemId) => {
    setCartItems(prevItems => prevItems.filter(item => item.id !== itemId));
  };

  const handleCheckout = () => {
    console.log('Proceeding to checkout with:', cartItems);
    setShowCart(false);
    alert(`Proceeding to checkout with ${cartCount} items!`);
  };

  const toggleCart = () => {
    setShowCart(!showCart);
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleCategorySelect = async (category) => {
    if (category === 'All') {
      setSelectedCategory('All');
      if (!usingMockData) {
        await fetchMenuItems(true);
      }
    } else {
      try {
        setLoading(true);
        
        if (!usingMockData) {
          const response = await menuApi.getByCategory(category);
          
          const items = response.data.map(item => ({
            id: item.id || item._id,
            name: item.name,
            description: item.description || '',
            price: parseFloat(item.price),
            category: item.category || 'Uncategorized',
            image: item.image || item.image_url || '/images/default-food.jpg',
            isAvailable: item.isAvailable !== false && item.is_available !== false,
            rating: item.rating || 4.5
          }));
          
          setMenuItems(items);
          setFilteredItems(items);
        }
        
        setSelectedCategory(category);
      } catch (err) {
        const filtered = menuItems.filter(item => item.category === category);
        if (filtered.length > 0) {
          setFilteredItems(filtered);
          setSelectedCategory(category);
        } else {
          setError(`Could not load ${category} items`);
        }
      } finally {
        setLoading(false);
      }
    }
    setShowFilters(false);
  };

  const handleItemClick = (item) => {
    setSelectedItem(item);
  };

  const closeItemModal = () => {
    setSelectedItem(null);
  };

  const getItemQuantity = (itemId) => {
    const cartItem = cartItems.find(item => item.id === itemId);
    return cartItem ? cartItem.quantity : 0;
  };

  const handleRefreshMenu = () => {
    setError(null);
    setRetryCount(0);
    setUsingMockData(false);
    fetchMenuItems(true);
    setSearchTerm('');
    setSelectedCategory('All');
  };

  const formatTime = (date) => {
    if (!date) return 'Never';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const calculateTotal = () => {
    return cartItems.reduce((total, item) => {
      return total + (item.price * (item.quantity || 1));
    }, 0);
  };

  // Loading state
  if (loading && menuItems.length === 0) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading menu from server...</p>
        {retryCount > 0 && (
          <p className="retry-count">Retry attempt: {retryCount}</p>
        )}
        <button 
          className="cancel-loading"
          onClick={() => {
            setLoading(false);
            setMenuItems(fallbackData.current);
            setFilteredItems(fallbackData.current);
            setUsingMockData(true);
            setError('Loading cancelled. Using offline data.');
          }}
        >
          Use Offline Mode
        </button>
      </div>
    );
  }

  // Error state (only if no items at all)
  if (error && menuItems.length === 0 && !loading) {
    return (
      <div className="error-container">
        <div className="error-icon">⚠️</div>
        <h3>Connection Issue</h3>
        <p className="error-message">{error}</p>
        <div className="error-actions">
          <button onClick={fetchMenuItems} className="retry-button">
            Retry Connection
          </button>
          <button 
            onClick={() => {
              setMenuItems(fallbackData.current);
              setFilteredItems(fallbackData.current);
              setUsingMockData(true);
              setError(null);
            }}
            className="use-offline-button"
          >
            Use Offline Menu
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`menu-container ${showCart ? 'cart-open' : ''}`}>
      {/* Header */}
      <header className="menu-header">
        <div className="restaurant-info">
          <div className="restaurant-logo">
            <h1>🍽️ Spice Haven Restaurant</h1>
            <div className="connection-status">
              {usingMockData ? (
                <span className="offline-badge">🔴 Offline Mode</span>
              ) : (
                <span className="online-badge">🟢 Online</span>
              )}
              {lastFetchTime && (
                <span className="last-fetch">
                  Last updated: {formatTime(lastFetchTime)}
                </span>
              )}
              <button 
                className="refresh-button"
                onClick={handleRefreshMenu}
                title="Force refresh from server"
                disabled={loading}
              >
                {loading ? '🔄 Refreshing...' : '🔄 Refresh'}
              </button>
            </div>
          </div>
          <p className="restaurant-tagline">Authentic Indian & Pakistani Cuisine</p>
          {usingMockData && (
            <p className="offline-warning">
              ⚠️ Using cached data. Click Refresh to retry server connection.
            </p>
          )}
        </div>
        
        <div className="cart-section">
          <button 
            className="cart-button"
            onClick={toggleCart}
          >
            🛒
            {cartCount > 0 && (
              <span className="cart-count">{cartCount}</span>
            )}
          </button>
        </div>
      </header>

      {/* Search and Filter Bar */}
      <div className="search-filter-bar">
        <div className="search-container">
          <input
            type="text"
            placeholder="Search for dishes..."
            value={searchTerm}
            onChange={handleSearch}
            className="search-input"
            disabled={loading}
          />
          <span className="search-icon">🔍</span>
          {searchTerm && (
            <button 
              className="clear-search"
              onClick={() => setSearchTerm('')}
              disabled={loading}
            >
              ×
            </button>
          )}
        </div>

        <div className="filter-container">
          <button 
            className={`filter-button ${showFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
            disabled={loading}
          >
            <span className="filter-icon">⚙️</span>
            Filters
            {selectedCategory !== 'All' && (
              <span className="filter-badge">•</span>
            )}
          </button>

          {showFilters && (
            <div className="filter-dropdown">
              <div className="filter-header">
                <h3>Categories</h3>
                <button 
                  className="close-filters"
                  onClick={() => setShowFilters(false)}
                >
                  ×
                </button>
              </div>
              <div className="filter-categories">
                {categories.map(category => (
                  <button
                    key={category}
                    className={`category-option ${selectedCategory === category ? 'selected' : ''}`}
                    onClick={() => handleCategorySelect(category)}
                    disabled={loading}
                  >
                    {category}
                    {selectedCategory === category && (
                      <span className="checkmark">✓</span>
                    )}
                  </button>
                ))}
              </div>
              <div className="filter-actions">
                <button 
                  className="clear-filters"
                  onClick={() => {
                    setSelectedCategory('All');
                    setSearchTerm('');
                    if (!usingMockData) {
                      fetchMenuItems(true);
                    }
                    setShowFilters(false);
                  }}
                  disabled={loading}
                >
                  Clear All
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Error/warning banner (non-blocking) */}
      {error && menuItems.length > 0 && (
        <div className="warning-banner">
          <span className="warning-icon">⚠️</span>
          <span className="warning-text">{error}</span>
          <div className="warning-actions">
            <button onClick={fetchMenuItems} className="retry-small">
              Retry
            </button>
            <button 
              onClick={() => setError(null)}
              className="dismiss-warning"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Active Filters Display */}
      {(selectedCategory !== 'All' || searchTerm) && (
        <div className="active-filters">
          <span className="active-filters-label">Active Filters:</span>
          {selectedCategory !== 'All' && (
            <span className="filter-tag">
              Category: {selectedCategory}
              <button 
                className="remove-filter"
                onClick={() => setSelectedCategory('All')}
              >
                ×
              </button>
            </span>
          )}
          {searchTerm && (
            <span className="filter-tag">
              Search: "{searchTerm}"
              <button 
                className="remove-filter"
                onClick={() => setSearchTerm('')}
              >
                ×
              </button>
            </span>
          )}
        </div>
      )}

      {/* Data source info */}
      <div className="data-source-info">
        {usingMockData ? (
          <p className="mock-data-info">
            📍 Showing {filteredItems.length} items from offline cache
          </p>
        ) : (
          <p className="server-data-info">
            📍 Showing {filteredItems.length} live items from server
            {lastFetchTime && ` (updated ${formatTime(lastFetchTime)})`}
          </p>
        )}
      </div>

      {/* Menu Items Grid - 3 CARDS PER ROW */}
      <div className="menu-grid">
        {filteredItems.length > 0 ? (
          filteredItems.map(item => {
            const itemQuantity = getItemQuantity(item.id);
            return (
              <div key={item.id} className="menu-item-card">
                {/* Image Container - Fixed better positioning */}
                <div className="item-image-container">
                  <img 
                    src={item.image} 
                    alt={item.name}
                    className="item-image"
                    onClick={() => handleItemClick(item)}
                    onError={(e) => {
                      e.target.src = '/images/default-food.jpg';
                    }}
                    loading="lazy"
                  />
                  
                  {/* Category Badge */}
                  <div className="item-category">{item.category}</div>
                  
                  {/* Rating */}
                  <div className="item-rating">
                    ⭐ {Number(item.rating)?.toFixed(1) || '4.0'}
                  </div>
                </div>
                
                {/* Content Area */}
                <div className="item-content">
                  <div className="item-header">
                    <h3 className="item-name">{item.name}</h3>
                    <span className="item-price">${Number(item.price).toFixed(2)}</span>
                  </div>
                  
                  <p className="item-description">
                    {item.description}
                  </p>
                  
                  <div className="item-actions">
                    {item.isAvailable ? (
                      <button 
                        className="add-to-cart-btn"
                        onClick={() => handleAddToCart(item)}
                        disabled={loading}
                      >
                        <span className="add-icon">+</span>
                        Add to Cart
                        {itemQuantity > 0 && (
                          <span className="item-quantity">{itemQuantity}</span>
                        )}
                      </button>
                    ) : (
                      <button className="out-of-stock-btn" disabled>
                        Out of Stock
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="no-results">
            <div className="no-results-icon">😕</div>
            <h3>No items found</h3>
            <p>No items match your current filters.</p>
            <button 
              className="clear-search-btn"
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('All');
                if (!usingMockData) {
                  fetchMenuItems(true);
                }
              }}
            >
              Clear Filters & Refresh
            </button>
          </div>
        )}
      </div>

      {/* LARGER CART MODAL - IMPROVED */}
      <div className={`cart-overlay ${showCart ? 'active' : ''}`}>
        <div className="cart-modal">
          <div className="cart-header">
            <h2>🛒 Your Order</h2>
            <button className="close-cart" onClick={toggleCart}>
              ×
            </button>
          </div>
          
          <div className="cart-content">
            {cartItems.length > 0 ? (
              <>
                <div className="cart-items">
                  {cartItems.map(item => (
                    <div key={item.id} className="cart-item">
                      <div className="cart-item-image">
                        <img src={item.image} alt={item.name} />
                      </div>
                      <div className="cart-item-details">
                        <div className="cart-item-title">{item.name}</div>
                        <div className="cart-item-price">${Number(item.price).toFixed(2)}</div>
                      </div>
                      <div className="cart-item-controls">
                        <div className="quantity-control">
                          <button 
                            className="quantity-btn"
                            onClick={() => handleUpdateQuantity(item.id, -1)}
                          >
                            -
                          </button>
                          <span className="quantity">{item.quantity || 1}</span>
                          <button 
                            className="quantity-btn"
                            onClick={() => handleUpdateQuantity(item.id, 1)}
                          >
                            +
                          </button>
                        </div>
                        <button 
                          className="remove-item"
                          onClick={() => handleRemoveItem(item.id)}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="cart-summary">
                  <div className="summary-row">
                    <span>Subtotal ({cartCount} items)</span>
                    <span>${calculateTotal().toFixed(2)}</span>
                  </div>
                  <div className="summary-row">
                    <span>Tax (8%)</span>
                    <span>${(calculateTotal() * 0.08).toFixed(2)}</span>
                  </div>
                  <div className="summary-row total">
                    <span>Total Amount</span>
                    <span>${(calculateTotal() * 1.08).toFixed(2)}</span>
                  </div>
                  
                  <button className="checkout-btn" onClick={handleCheckout}>
                    Proceed to Checkout ({cartCount})
                  </button>
                </div>
              </>
            ) : (
              <div className="empty-cart">
                <i>🛒</i>
                <p>Your cart is empty</p>
                <p>Add items from the menu to get started!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Menu;