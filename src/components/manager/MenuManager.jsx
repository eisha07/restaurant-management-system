// Menu management component
import React, { useState, useEffect } from 'react';

const MenuManager = ({ onAddItem, onUpdateItem, onDeleteItem }) => {
    const [menuItems, setMenuItems] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        price: '',
        category: 'Desi',
        image_url: '',
        is_available: true
    });

    // Load menu items on component mount
    useEffect(() => {
        loadMenuItems();
    }, []);

    const loadMenuItems = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('manager_token');
            const response = await fetch('/api/manager/menu', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                setMenuItems(data.items);
                setError(null);
            } else {
                setError(data.message);
            }
        } catch (err) {
            console.error('Error loading menu items:', err);
            setError('Failed to load menu items');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value, checked, type } = e.target;
        setFormData({
            ...formData,
            [name]: type === 'checkbox' ? checked : value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            let result;
            if (editingId) {
                result = await onUpdateItem(editingId, formData);
            } else {
                result = await onAddItem(formData);
            }
            
            if (result.success) {
                // Reload menu items to reflect changes
                await loadMenuItems();
                setFormData({
                    name: '',
                    description: '',
                    price: '',
                    category: 'Desi',
                    image_url: '',
                    is_available: true
                });
                setShowForm(false);
                setEditingId(null);
            } else {
                setError(result.message || 'Failed to save item');
            }
        } catch (err) {
            setError('Error saving item');
            console.error(err);
        }
    };

    const handleEdit = (item) => {
        setFormData({
            name: item.name,
            description: item.description,
            price: item.price,
            category: item.category,
            image_url: item.image_url,
            is_available: item.is_available
        });
        setEditingId(item.id);
        setShowForm(true);
        setError(null);
    };

    const handleDelete = async (itemId, itemName) => {
        if (window.confirm(`Are you sure you want to delete "${itemName}"?`)) {
            try {
                const result = await onDeleteItem(itemId);
                if (result.success) {
                    await loadMenuItems();
                    setError(null);
                } else {
                    setError(result.message || 'Failed to delete item');
                }
            } catch (err) {
                setError('Error deleting item');
                console.error(err);
            }
        }
    };

    const handleCancel = () => {
        setShowForm(false);
        setEditingId(null);
        setFormData({
            name: '',
            description: '',
            price: '',
            category: 'Desi',
            image_url: '',
            is_available: true
        });
    };

    if (loading) {
        return (
            <div className="menu-manager">
                <h2>Menu Management</h2>
                <p>Loading menu items...</p>
            </div>
        );
    }

    return (
        <div className="menu-manager">
            <h2>Menu Management</h2>
            
            {error && <div className="error-alert">{error}</div>}
            
            <button 
                onClick={() => !showForm ? setShowForm(true) : handleCancel()}
                className="btn-primary"
            >
                {showForm ? '✕ Cancel' : '+ Add New Item'}
            </button>

            {showForm && (
                <form onSubmit={handleSubmit} className="menu-form">
                    <h3>{editingId ? 'Edit Menu Item' : 'Add New Menu Item'}</h3>
                    
                    <div className="form-group">
                        <label htmlFor="name">Item Name</label>
                        <input
                            type="text"
                            id="name"
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="description">Description</label>
                        <textarea
                            id="description"
                            name="description"
                            value={formData.description}
                            onChange={handleInputChange}
                            rows="3"
                        ></textarea>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="price">Price ($)</label>
                            <input
                                type="number"
                                id="price"
                                name="price"
                                value={formData.price}
                                onChange={handleInputChange}
                                step="0.01"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="category">Category</label>
                            <select
                                id="category"
                                name="category"
                                value={formData.category}
                                onChange={handleInputChange}
                            >
                                <option value="Desi">Desi</option>
                                <option value="Fast Food">Fast Food</option>
                                <option value="Italian">Italian</option>
                                <option value="Dessert">Dessert</option>
                                <option value="Beverage">Beverage</option>
                            </select>
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="image_url">Image URL</label>
                        <input
                            type="url"
                            id="image_url"
                            name="image_url"
                            value={formData.image_url}
                            onChange={handleInputChange}
                            placeholder="https://..."
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="is_available">
                            <input
                                type="checkbox"
                                id="is_available"
                                name="is_available"
                                checked={formData.is_available}
                                onChange={handleInputChange}
                            />
                            Available
                        </label>
                    </div>

                    <div className="form-actions">
                        <button type="submit" className="btn-primary">
                            {editingId ? 'Update Item' : 'Add Item'}
                        </button>
                        <button type="button" onClick={handleCancel} className="btn-secondary">
                            Cancel
                        </button>
                    </div>
                </form>
            )}

            <div className="menu-items-list">
                <h3>Menu Items ({menuItems.length})</h3>
                {menuItems.length === 0 && (
                    <p>No menu items available. Add your first item!</p>
                )}
                {menuItems.map(item => (
                    <div key={item.id} className="menu-item-card">
                        <div className="item-info">
                            <div className="item-header">
                                <h4>{item.name}</h4>
                                <span className={`category-badge ${item.category?.toLowerCase()}`}>
                                    {item.category}
                                </span>
                            </div>
                            <p className="item-description">{item.description}</p>
                            <div className="item-footer">
                                <p className="item-price">${item.price?.toFixed(2)}</p>
                                <p className={`item-status ${item.is_available ? 'available' : 'unavailable'}`}>
                                    {item.is_available ? '✓ Available' : '✗ Unavailable'}
                                </p>
                            </div>
                        </div>
                        <div className="item-actions">
                            <button 
                                onClick={() => handleEdit(item)}
                                className="btn-edit"
                                title="Edit this item"
                            >
                                ✎ Edit
                            </button>
                            <button 
                                onClick={() => handleDelete(item.id, item.name)}
                                className="btn-delete"
                                title="Delete this item"
                            >
                                🗑 Delete
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default MenuManager;
