// Feedback view component for customer feedback display
import React, { useState, useEffect } from 'react';

const FeedbackView = () => {
    const [feedback, setFeedback] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchFeedback = async () => {
            try {
                const token = localStorage.getItem('manager_token');
                const response = await fetch('/api/manager/feedback', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await response.json();
                if (data.success) {
                    setFeedback(data.feedback);
                } else {
                    setError(data.message);
                }
            } catch (err) {
                setError('Failed to load feedback');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchFeedback();
    }, []);

    const renderStars = (rating) => {
        return '⭐'.repeat(Math.round(rating || 0));
    };

    if (loading) return <div>Loading feedback...</div>;
    if (error) return <div className="error">{error}</div>;

    return (
        <div className="feedback-container">
            <h2>Customer Feedback</h2>
            
            <div className="feedback-list">
                {feedback.length === 0 ? (
                    <p>No feedback available</p>
                ) : (
                    feedback.map(item => (
                        <div key={item.id} className="feedback-card">
                            <div className="feedback-header">
                                <h4>Order #{item.order_number}</h4>
                                <span className="rating">
                                    {renderStars(item.average_rating)}
                                </span>
                            </div>
                            <div className="feedback-body">
                                {item.average_rating && (
                                    <p className="overall-rating">
                                        <strong>Overall:</strong> {item.average_rating.toFixed(1)}/5
                                    </p>
                                )}
                                {item.comment && (
                                    <p className="comment">
                                        <strong>Comment:</strong> {item.comment}
                                    </p>
                                )}
                                {item.food_quality && (
                                    <div className="detailed-ratings">
                                        <p>Food Quality: {item.food_quality}/5</p>
                                        <p>Service Speed: {item.service_speed}/5</p>
                                        <p>Accuracy: {item.accuracy}/5</p>
                                        <p>Value for Money: {item.value_for_money}/5</p>
                                    </div>
                                )}
                            </div>
                            <div className="feedback-date">
                                {new Date(item.submitted_at).toLocaleDateString()}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default FeedbackView;
