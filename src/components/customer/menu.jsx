import React, { useState, useEffect, useRef } from 'react';
import { menuApi } from '../../services/api';
import Cart from './cart';
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
      name: 'Chicken Biryani',
      description: 'Aromatic basmati rice cooked with tender chicken pieces, herbs, and spices',
      price: 12.99,
      category: 'Desi',
      image: '/images/biryani.jpg',
      isAvailable: true,
      rating: 4.8
    },
    {
      id: 2,
      name: 'Beef Burger',
      description: 'Juicy beef patty with fresh vegetables and special sauce',
      price: 8.99,
      category: 'Fast Food',
      image: '/images/burger.jpg',
      isAvailable: true,
      rating: 4.5
    },
    {
      id: 3,
      name: 'Margherita Pizza',
      description: 'Classic pizza with tomato sauce, mozzarella cheese, and fresh basil',
      price: 10.99,
      category: 'Italian',
      image: '/images/pizza.jpg',
      isAvailable: true,
      rating: 4.6
    },
    {
      id: 4,
      name: 'Caesar Salad',
      description: 'Crisp romaine lettuce with Caesar dressing, croutons, and parmesan',
      price: 7.99,
      category: 'Salads',
      image: '/images/salad.jpg',
      isAvailable: true,
      rating: 4.3
    },
    {
      id: 5,
      name: 'Chocolate Brownie',
      description: 'Warm chocolate brownie with vanilla ice cream and chocolate sauce',
      price: 5.99,
      category: 'Desserts',
      image: '/images/brownie.jpg',
      isAvailable: true,
      rating: 4.7
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
      
      console.log('Fetching menu from API...');
      const response = await menuApi.getAll();
      
      console.log('API Response received:', {
        status: response.status,
        dataLength: response.data?.length,
        data: response.data
      });
      
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
      
      console.log(`Processed ${items.length} items from server`);
      setMenuItems(items);
      setFilteredItems(items);
      setRetryCount(0);
      setLastFetchTime(new Date());
      
    } catch (err) {
      console.error('Failed to fetch menu:', {
        message: err.message,
        response: err.response,
        config: err.config
      });
      
      // Determine if we should use mock data
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
        setError(`Connection issue: ${err.message}. Retrying in ${2 * (retryCount + 1)} seconds...`);
        setRetryCount(prev => prev + 1);
        
        // Auto-retry with increasing delay
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
    // Add your checkout logic here
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
      // Don't refetch if we're using mock data
      if (!usingMockData) {
        await fetchMenuItems(true);
      }
    } else {
      try {
        setLoading(true);
        
        // Only fetch from API if not using mock data
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
        console.error(`Failed to fetch ${category} items:`, err);
        
        // If server fails, filter existing data
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

  // Get item quantity in cart
  const getItemQuantity = (itemId) => {
    const cartItem = cartItems.find(item => item.id === itemId);
    return cartItem ? cartItem.quantity : 0;
  };

  // Add refresh functionality
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
            <h1>🍽️ Delicious Bites</h1>
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
          <p className="restaurant-tagline">Fine Dining Experience</p>
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

      {/* Menu Items Grid */}
      <div className="menu-grid">
        {filteredItems.length > 0 ? (
          filteredItems.map(item => {
            const itemQuantity = getItemQuantity(item.id);
            return (
              <div key={item.id} className="menu-item-card">
                <div className="item-image-container">
                  <img 
                    src={item.image} 
                    alt={item.name}
                    className="item-image"
                    onClick={() => handleItemClick(item)}
                    onError={(e) => {
                      e.target.src = '/images/default-food.jpg';
                    }}
                  />
                  {!item.isAvailable && (
                    <div className="out-of-stock-overlay">Out of Stock</div>
                  )}
                  {usingMockData && (
                    <div className="cached-indicator">Cached</div>
                  )}
                  <div className="item-category">{item.category}</div>
                  <div className="item-rating">
                    ⭐ {item.rating.toFixed(1)}
                  </div>
                </div>
                
                <div className="item-details">
                  <div className="item-header">
                    <h3 className="item-name">{item.name}</h3>
                    <span className="item-price">${item.price.toFixed(2)}</span>
                  </div>
                  
                  <p className="item-description">
                    {item.description.length > 80 
                      ? `${item.description.substring(0, 80)}...` 
                      : item.description}
                    {item.description.length > 80 && (
                      <button 
                        className="read-more"
                        onClick={() => handleItemClick(item)}
                      >
                        Read more
                      </button>
                    )}
                  </p>
                  
                  <div className="item-actions">
                    {item.isAvailable ? (
                      <button 
                        className="add-to-cart-btn"
                        onClick={() => handleAddToCart(item)}
                        disabled={loading}
                      >
                        <span className="add-icon">+</span>
                        {loading ? 'Adding...' : 'Add to Cart'}
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

      {/* Item Detail Modal */}
      {selectedItem && (
        <div className="item-modal-overlay" onClick={closeItemModal}>
          <div className="item-modal" onClick={(e) => e.stopPropagation()}>
            <button className="close-modal" onClick={closeItemModal}>
              ×
            </button>
            
            <div className="modal-content">
              <div className="modal-image-container">
                <img 
                  src={selectedItem.image} 
                  alt={selectedItem.name}
                  className="modal-image"
                  onError={(e) => {
                    e.target.src = '/images/default-food.jpg';
                  }}
                />
                {!selectedItem.isAvailable && (
                  <div className="modal-out-of-stock">Currently Unavailable</div>
                )}
              </div>
              
              <div className="modal-details">
                <div className="modal-header">
                  <h2>{selectedItem.name}</h2>
                  <span className="modal-price">${selectedItem.price.toFixed(2)}</span>
                </div>
                
                <div className="modal-meta">
                  <span className="modal-category">{selectedItem.category}</span>
                  <span className="modal-rating">⭐ {selectedItem.rating.toFixed(1)}/5</span>
                  {usingMockData && (
                    <span className="modal-cached">📁 Cached Data</span>
                  )}
                </div>
                
                <p className="modal-description">{selectedItem.description}</p>
                
                <div className="modal-actions">
                  {selectedItem.isAvailable ? (
                    <button 
                      className="modal-add-btn"
                      onClick={() => {
                        handleAddToCart(selectedItem);
                        closeItemModal();
                      }}
                      disabled={loading}
                    >
                      <span className="add-icon">+</span>
                      Add to Cart
                      {getItemQuantity(selectedItem.id) > 0 && (
                        <span className="modal-quantity">
                          {getItemQuantity(selectedItem.id)} in cart
                        </span>
                      )}
                    </button>
                  ) : (
                    <button className="modal-out-of-stock-btn" disabled>
                      Currently Unavailable
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="menu-footer">
        <div className="cart-summary">
          <span className="cart-total">Items in cart: {cartCount}</span>
          <button 
            className="view-cart-btn"
            onClick={toggleCart}
          >
            View Cart →
          </button>
        </div>
        <div className="menu-footer-info">
          <p className="menu-footer-note">
            Total Items: {menuItems.length} | Showing: {filteredItems.length} | 
            Data Source: {usingMockData ? 'Offline Cache' : 'Live Server'}
          </p>
          {lastFetchTime && !usingMockData && (
            <p className="last-update-time">
              Last server sync: {formatTime(lastFetchTime)}
            </p>
          )}
        </div>
      </footer>

      {/* Cart Overlay */}
      {showCart && (
        <div className="cart-overlay">
          <div className="cart-modal">
            <Cart
              cartItems={cartItems}
              onUpdateQuantity={handleUpdateQuantity}
              onRemoveItem={handleRemoveItem}
              onCheckout={handleCheckout}
              onClose={() => setShowCart(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Menu;