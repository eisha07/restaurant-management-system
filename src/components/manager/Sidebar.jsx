// Sidebar component for manager dashboard navigation
import React from 'react';

const Sidebar = ({ activeSection, setActiveSection }) => {
    const menuItems = [
        { id: 'orders', label: 'Orders', icon: '📋' },
        { id: 'menu', label: 'Menu Management', icon: '🍽️' },
        { id: 'statistics', label: 'Statistics', icon: '📊' },
        { id: 'feedback', label: 'Customer Feedback', icon: '⭐' }
    ];

    return (
        <aside className="sidebar">
            <nav className="sidebar-nav">
                {menuItems.map(item => (
                    <button
                        key={item.id}
                        className={`sidebar-item ${activeSection === item.id ? 'active' : ''}`}
                        onClick={() => setActiveSection(item.id)}
                    >
                        <span className="sidebar-icon">{item.icon}</span>
                        <span className="sidebar-label">{item.label}</span>
                    </button>
                ))}
            </nav>
        </aside>
    );
};

export default Sidebar;
