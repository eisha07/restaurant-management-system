// Menu management component
import React, { useState } from 'react';

const MenuManager = ({ onAddItem, onUpdateItem, onDeleteItem }) => {
    const [menuItems, setMenuItems] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        price: '',
        category: 'Desi',
        image_url: '',
        is_available: true
    });

    const handleInputChange = (e) => {
        const { name, value, checked, type } = e.target;
        setFormData({
            ...formData,
            [name]: type === 'checkbox' ? checked : value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const result = await onAddItem(formData);
        if (result.success) {
            setFormData({
                name: '',
                description: '',
                price: '',
                category: 'Desi',
                image_url: '',
                is_available: true
            });
            setShowForm(false);
        }
    };

    return (
        <div className="menu-manager">
            <h2>Menu Management</h2>
            
            <button 
                onClick={() => setShowForm(!showForm)}
                className="btn-primary"
            >
                {showForm ? '✕ Cancel' : '+ Add New Item'}
            </button>

            {showForm && (
                <form onSubmit={handleSubmit} className="menu-form">
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

                    <button type="submit" className="btn-primary">
                        Add Item
                    </button>
                </form>
            )}

            <div className="menu-items-list">
                {menuItems.length === 0 && (
                    <p>No menu items to display. Load items or add new ones.</p>
                )}
                {menuItems.map(item => (
                    <div key={item.id} className="menu-item-card">
                        <div className="item-info">
                            <h4>{item.name}</h4>
                            <p>{item.description}</p>
                            <p className="item-price">${item.price?.toFixed(2)}</p>
                        </div>
                        <div className="item-actions">
                            <button className="btn-edit">Edit</button>
                            <button className="btn-delete">Delete</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default MenuManager;
