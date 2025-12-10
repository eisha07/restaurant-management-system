import React, { useState, useEffect } from 'react';
import { menuApi } from '../../services/api'; // Import API service
import '../../styles/Menu.css';

const Menu = ({ onAddToCart, cartItems = [] }) => {
  const [menuItems, setMenuItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [cartCount, setCartCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Extract unique categories from fetched data
  const categories = menuItems.length > 0 
    ? ['All', ...new Set(menuItems.map(item => item.category))] 
    : ['All'];

  // Update cart count
  useEffect(() => {
    const totalItems = cartItems.reduce((total, item) => total + (item.quantity || 1), 0);
    setCartCount(totalItems);
  }, [cartItems]);

  // Fetch menu items from backend
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
        item.description.toLowerCase().includes(term)
      );
    }

    setFilteredItems(filtered);
  }, [selectedCategory, searchTerm, menuItems]);

  const fetchMenuItems = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Call the API service
      const response = await menuApi.getAll();
      
      // Transform the data if needed (adjust according to your backend response structure)
      const items = response.data.map(item => ({
        id: item.id,
        name: item.name,
        description: item.description || '',
        price: parseFloat(item.price),
        category: item.category || 'Uncategorized',
        image: item.image_url || '/images/default-food.jpg',
        isAvailable: item.is_available !== false,
        rating: item.rating || 4.5
      }));
      
      setMenuItems(items);
      setFilteredItems(items);
    } catch (err) {
      console.error('Failed to fetch menu:', err);
      setError('Failed to load menu. Please try again later.');
      
      // Fallback to mock data if backend fails (for development only)
      const initialMenuItems = [
        // ... keep your mock data as fallback
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
        // ... other items
      ];
      setMenuItems(initialMenuItems);
      setFilteredItems(initialMenuItems);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (item) => {
    if (onAddToCart) {
      onAddToCart({
        ...item,
        quantity: 1
      });
    }
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleCategorySelect = async (category) => {
    if (category === 'All') {
      setSelectedCategory('All');
    } else {
      try {
        // Optional: Fetch specific category from backend
        setLoading(true);
        const response = await menuApi.getByCategory(category);
        const items = response.data.map(item => ({
          id: item.id,
          name: item.name,
          description: item.description || '',
          price: parseFloat(item.price),
          category: item.category || 'Uncategorized',
          image: item.image_url || '/images/default-food.jpg',
          isAvailable: item.is_available !== false,
          rating: item.rating || 4.5
        }));
        setMenuItems(items);
        setFilteredItems(items);
        setSelectedCategory(category);
      } catch (err) {
        console.error(`Failed to fetch ${category} items:`, err);
        // Fallback to client-side filtering
        setSelectedCategory(category);
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
    fetchMenuItems();
    setSearchTerm('');
    setSelectedCategory('All');
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading menu...</p>
      </div>
    );
  }

  if (error && menuItems.length === 0) {
    return (
      <div className="error-container">
        <p className="error-message">{error}</p>
        <button onClick={fetchMenuItems} className="retry-button">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="menu-container">
      {/* Header */}
      <header className="menu-header">
        <div className="restaurant-info">
          <div className="restaurant-logo">
            <h1>🍽️ Delicious Bites</h1>
            <button 
              className="refresh-button"
              onClick={handleRefreshMenu}
              title="Refresh menu"
            >
              🔄
            </button>
          </div>
          <p className="restaurant-tagline">Fine Dining Experience</p>
        </div>
        
        <div className="cart-section">
          <button className="cart-button">
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
          />
          <span className="search-icon">🔍</span>
          {searchTerm && (
            <button 
              className="clear-search"
              onClick={() => setSearchTerm('')}
            >
              ×
            </button>
          )}
        </div>

        <div className="filter-container">
          <button 
            className={`filter-button ${showFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
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
                    handleRefreshMenu();
                    setShowFilters(false);
                  }}
                >
                  Clear All
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Error banner (non-blocking) */}
      {error && menuItems.length > 0 && (
        <div className="warning-banner">
          ⚠️ {error} Showing cached data.
          <button onClick={fetchMenuItems} className="retry-small">
            Retry
          </button>
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
                    <button 
                      className="read-more"
                      onClick={() => handleItemClick(item)}
                    >
                      Read more
                    </button>
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
            <p>No items found matching your criteria.</p>
            <button 
              className="clear-search-btn"
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('All');
                handleRefreshMenu();
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
            onClick={() => {
              // Navigate to cart or show cart modal
              console.log('Navigate to cart');
            }}
          >
            View Cart →
          </button>
        </div>
        <p className="menu-footer-note">Total Items: {menuItems.length} | Showing: {filteredItems.length}</p>
      </footer>
    </div>
  );
};

export default Menu;