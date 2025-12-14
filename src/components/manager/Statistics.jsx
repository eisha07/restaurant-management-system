// Statistics component for dashboard analytics
import React from 'react';

const Statistics = ({ statistics, onDateRangeChange }) => {
    const [startDate, setStartDate] = React.useState('');
    const [endDate, setEndDate] = React.useState('');

    const handleDateChange = () => {
        if (startDate && endDate) {
            onDateRangeChange(startDate, endDate);
        }
    };

    return (
        <div className="statistics-container">
            <h2>Statistics & Analytics</h2>

            <div className="date-filter">
                <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    placeholder="Start Date"
                />
                <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    placeholder="End Date"
                />
                <button onClick={handleDateChange} className="btn-primary">
                    Filter
                </button>
            </div>

            {statistics && (
                <div className="stats-grid">
                    <div className="stat-card">
                        <h3>Total Revenue</h3>
                        <p className="stat-value">
                            ${Number(statistics.overview?.total_revenue)?.toFixed(2) || '0.00'}
                        </p>
                        <p className="stat-label">
                            {statistics.overview?.total_orders || 0} orders
                        </p>
                    </div>

                    <div className="stat-card">
                        <h3>Average Order Value</h3>
                        <p className="stat-value">
                            ${Number(statistics.overview?.avg_order_value)?.toFixed(2) || '0.00'}
                        </p>
                    </div>

                    <div className="stat-card">
                        <h3>Top Selling Items</h3>
                        <ul>
                            {statistics.topItems?.slice(0, 5).map((item, idx) => (
                                <li key={idx}>
                                    {item.name}: {item.total_quantity} sold
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="stat-card">
                        <h3>Sales by Category</h3>
                        <ul>
                            {statistics.categories?.map((cat, idx) => (
                                <li key={idx}>
                                    {cat.category}: ${Number(cat.category_revenue)?.toFixed(2)}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Statistics;
