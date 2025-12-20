import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { feedbackApi } from '../../services/api';
import '../../styles/Feedback.css';

const Feedback = ({ orderId, onBackToMenu, onFeedbackComplete }) => {
  
  const [ratings, setRatings] = useState({
    food_quality: 0,
    service_speed: 0,
    overall_experience: 0,
    accuracy: 0,  // Added based on SRS requirement for order accuracy
    value_for_money: 0
  });
  
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [orderDetails, setOrderDetails] = useState(null);
  const [isEligible, setIsEligible] = useState(true); // Check if order is ready for feedback

  // Enhanced questions based on SRS requirements
  const questions = [
    { id: 'food_quality', label: 'How was the food quality?' },
    { id: 'service_speed', label: 'How was the service speed?' },
    { id: 'accuracy', label: 'Was your order accurate?' },
    { id: 'value_for_money', label: 'Value for money?' },
    { id: 'overall_experience', label: 'Overall dining experience?' }
  ];

  // Check if feedback is eligible (SRS Business Rule 3)
  useEffect(() => {
    const checkEligibility = async () => {
      if (!orderId) {
        setIsEligible(false);
        setError('No order ID provided');
        return;
      }

      try {
        // In real app, check if order status is "ready" or "completed"
        // This would be an API call to verify order status
        const orderStatus = localStorage.getItem(`order_${orderId}_status`);
        
        if (orderStatus !== 'ready' && orderStatus !== 'completed') {
          setIsEligible(false);
          setError('Feedback is only available after receiving your order');
        }
        
        // Get order details if available
        const savedOrder = localStorage.getItem('currentOrder');
        if (savedOrder) {
          setOrderDetails(JSON.parse(savedOrder));
        }
        
      } catch (error) {
        console.error('Eligibility check failed:', error);
        // Continue anyway for demo purposes
      }
    };

    checkEligibility();
  }, [orderId]);

  const handleStarClick = (questionId, rating) => {
    setRatings(prev => ({
      ...prev,
      [questionId]: rating
    }));
    setError(''); // Clear error when user interacts
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate that all ratings are provided
    const allRated = Object.values(ratings).every(rating => rating > 0);
    
    if (!allRated) {
      setError('Please provide a rating for all questions before submitting.');
      return;
    }

    if (!orderId) {
      setError('Order ID is required to submit feedback');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const feedbackData = {
        order_id: orderId,
        ratings: {
          food_quality: ratings.food_quality,
          service_speed: ratings.service_speed,
          overall_experience: ratings.overall_experience,
          accuracy: ratings.accuracy,
          value_for_money: ratings.value_for_money
        },
        average_rating: calculateAverageRating(),
        comment: comment.trim() || null,
        submitted_at: new Date().toISOString()
      };

      // Submit to backend API
      const response = await feedbackApi.submit(feedbackData);
      
      console.log('Feedback submitted:', response.data);

      // Call parent component's submit handler if provided
      if (onSubmitFeedback) {
        onSubmitFeedback(feedbackData);
      }

      // Mark as submitted and save to localStorage
      setSubmitted(true);
      localStorage.setItem(`feedback_submitted_${orderId}`, 'true');
      
      // Optional: Clear form after successful submission
      setTimeout(() => {
        // Call parent callback with feedback data
        if (onFeedbackComplete) {
          onFeedbackComplete(feedbackData);
        }
      }, 3000);

    } catch (error) {
      console.error('Feedback submission failed:', error);
      setError(error.response?.data?.error || 'Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculateAverageRating = () => {
    const values = Object.values(ratings).filter(r => r > 0);
    if (values.length === 0) return 0;
    const sum = values.reduce((a, b) => a + b, 0);
    return (sum / values.length).toFixed(1);
  };

  const renderStars = (questionId, currentRating) => {
    return (
      <div className="stars-container">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className={`star-btn ${star <= currentRating ? 'active' : ''}`}
            onClick={() => handleStarClick(questionId, star)}
            disabled={isSubmitting}
            aria-label={`Rate ${star} star${star !== 1 ? 's' : ''}`}
          >
            <span className="star-icon">★</span>
          </button>
        ))}
        <span className="rating-text">
          {currentRating === 0 ? 'Not rated' : `${currentRating}/5`}
        </span>
      </div>
    );
  };

  const renderStarDescriptions = () => (
    <div className="star-descriptions">
      <div className="description-item">
        <span className="star-icon">★</span>
        <span>1 - Very Poor</span>
      </div>
      <div className="description-item">
        <span className="star-icon">★★</span>
        <span>2 - Poor</span>
      </div>
      <div className="description-item">
        <span className="star-icon">★★★</span>
        <span>3 - Average</span>
      </div>
      <div className="description-item">
        <span className="star-icon">★★★★</span>
        <span>4 - Good</span>
      </div>
      <div className="description-item">
        <span className="star-icon">★★★★★</span>
        <span>5 - Excellent</span>
      </div>
    </div>
  );

  // Check if already submitted
  useEffect(() => {
    if (orderId && localStorage.getItem(`feedback_submitted_${orderId}`)) {
      setSubmitted(true);
    }
  }, [orderId]);

  if (!isEligible) {
    return (
      <div className="feedback-container">
        <div className="not-eligible-message">
          <h2>Feedback Not Available</h2>
          <div className="error-icon">⏰</div>
          <p>Feedback is only available after you have received your order.</p>
          <p>Please wait until your order is marked as "Ready" before providing feedback.</p>
          <button 
            className="back-button"
            onClick={() => onBackToMenu && onBackToMenu('order-status', { orderId })}
          >
            ← Back to Order Status
          </button>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="feedback-container">
        <div className="thank-you-message">
          <div className="success-icon">✅</div>
          <h2>Thank You for Your Feedback!</h2>
          <p>Your feedback has been submitted successfully.</p>
          <p>We appreciate your input and will use it to improve our service.</p>
          
          <div className="submitted-details">
            {orderId && (
              <p className="order-reference">Order: #{orderId.substring(0, 8)}</p>
            )}
            {calculateAverageRating() > 0 && (
              <p className="average-rating">
                Average Rating: {calculateAverageRating()}/5
              </p>
            )}
          </div>
          
          <div className="thank-you-actions">
            <button 
              className="back-to-home-btn"
              onClick={() => onBackToMenu && onBackToMenu('menu')}
            >
              Return to Menu
            </button>
            <button 
              className="view-order-btn"
              onClick={() => onBackToMenu && onBackToMenu('order-status', { orderId })}
            >
              View Order Details
            </button>
          </div>
          
          <div className="thank-you-note">
            <p>💡 <strong>Note:</strong> Your feedback will be reviewed by management and may be displayed anonymously in our statistics dashboard.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="feedback-container">
      <div className="feedback-header">
        <h2>Share Your Feedback</h2>
        <p>Help us improve your dining experience</p>
        
        {orderId && (
          <div className="order-info-badge">
            <span className="order-icon">📦</span>
            <span>Order: #{orderId.substring(0, 8)}</span>
          </div>
        )}
        
        {orderDetails && (
          <div className="order-summary">
            <p>You're providing feedback for your recent order</p>
            <small>Submitted feedback will help us improve service quality</small>
          </div>
        )}
      </div>

      <div className="rating-guidelines">
        <h3>Rating Guidelines</h3>
        {renderStarDescriptions()}
      </div>

      {error && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="feedback-form">
        {questions.map((question) => (
          <div key={question.id} className="question-group">
            <label className="question-label">{question.label}</label>
            {renderStars(question.id, ratings[question.id])}
          </div>
        ))}

        <div className="average-rating-display">
          <span>Average Rating: </span>
          <span className="average-value">{calculateAverageRating()}/5</span>
        </div>

        <div className="comment-group">
          <label htmlFor="comment" className="comment-label">
            Additional Comments (Optional)
          </label>
          <textarea
            id="comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share any specific feedback, suggestions, or compliments..."
            className="comment-input"
            rows="4"
            disabled={isSubmitting}
            maxLength="500"
          />
          <div className="char-counter">
            {comment.length}/500 characters
          </div>
        </div>

        <div className="button-group">
          <button 
            type="button" 
            className="cancel-btn"
            onClick={() => onBackToMenu && onBackToMenu('order-status', { orderId })}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            className="submit-btn"
            disabled={isSubmitting || Object.values(ratings).some(r => r === 0)}
          >
            {isSubmitting ? (
              <>
                <span className="spinner"></span>
                Submitting...
              </>
            ) : (
              'Submit Feedback'
            )}
          </button>
        </div>
      </form>

      <div className="feedback-info">
        <div className="info-item">
          <span className="info-icon">🔒</span>
          <span>All responses are anonymous and confidential</span>
        </div>
        <div className="info-item">
          <span className="info-icon">📊</span>
          <span>Your feedback helps us improve service quality</span>
        </div>
        <div className="info-item">
          <span className="info-icon">⭐</span>
          <span>Feedback is only available after order completion (SRS Business Rule 3)</span>
        </div>
        <div className="info-item">
          <span className="info-icon">👨‍💼</span>
          <span>Reviewed by management and used for improvements</span>
        </div>
      </div>

      {isSubmitting && (
        <div className="submission-overlay">
          <div className="submission-spinner"></div>
          <p>Submitting your feedback...</p>
        </div>
      )}
    </div>
  );
};

export default Feedback;