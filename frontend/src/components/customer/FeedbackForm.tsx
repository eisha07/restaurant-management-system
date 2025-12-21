import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Star, Loader2, Heart } from 'lucide-react';
import { toast } from 'sonner';
import { feedbackApi } from '@/services/api';

interface FeedbackFormProps {
  orderId: number;
  orderNumber: string;
  open: boolean;
  onClose: () => void;
}

interface RatingCategory {
  key: string;
  label: string;
  description: string;
}

const ratingCategories: RatingCategory[] = [
  { key: 'foodQuality', label: 'Food Quality', description: 'Taste & Presentation' },
  { key: 'serviceSpeed', label: 'Service Speed', description: 'How fast was delivery' },
  { key: 'accuracy', label: 'Order Accuracy', description: 'Did we get it right' },
  { key: 'valueForMoney', label: 'Value for Money', description: 'Worth the price' },
  { key: 'overallExperience', label: 'Overall Experience', description: 'Your overall satisfaction' },
];

export function FeedbackForm({ orderId, orderNumber, open, onClose }: FeedbackFormProps) {
  const [ratings, setRatings] = useState<Record<string, number>>({
    foodQuality: 0,
    serviceSpeed: 0,
    accuracy: 0,
    valueForMoney: 0,
    overallExperience: 0,
  });
  const [hoveredRating, setHoveredRating] = useState<{ category: string; star: number } | null>(null);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleRating = (category: string, value: number) => {
    setRatings(prev => ({ ...prev, [category]: value }));
  };

  const getDisplayRating = (category: string, star: number) => {
    if (hoveredRating?.category === category) {
      return star <= hoveredRating.star;
    }
    return star <= ratings[category];
  };

  const isComplete = Object.values(ratings).every(r => r > 0);
  const averageRating = isComplete
    ? (Object.values(ratings).reduce((a, b) => a + b, 0) / Object.values(ratings).length).toFixed(1)
    : null;

  const handleSubmit = async () => {
    if (!isComplete) {
      toast.error('Please rate all categories');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const feedbackData = {
        orderId: orderId,
        rating: ratings.overallExperience,
        foodQuality: ratings.foodQuality,
        serviceSpeed: ratings.serviceSpeed,
        accuracy: ratings.accuracy,
        valueForMoney: ratings.valueForMoney,
        overallExperience: ratings.overallExperience,
        comment: comment || undefined
      };

      console.log('💬 Submitting feedback:', feedbackData);
      
      const response = await feedbackApi.submit(feedbackData);
      
      setIsSubmitted(true);
      toast.success('Thank you for your feedback!');
      console.log('✅ Feedback submitted:', response);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('❌ Failed to submit feedback:', errorMsg);
      toast.error(`Failed to submit feedback: ${errorMsg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setRatings({
      foodQuality: 0,
      serviceSpeed: 0,
      accuracy: 0,
      valueForMoney: 0,
      overallExperience: 0,
    });
    setComment('');
    setIsSubmitted(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">
            {isSubmitted ? 'Thank You!' : 'How was your experience?'}
          </DialogTitle>
          {!isSubmitted && (
            <DialogDescription>
              Order {orderNumber}
            </DialogDescription>
          )}
        </DialogHeader>

        {isSubmitted ? (
          <div className="py-8 text-center space-y-6 animate-scale-in">
            <div className="w-20 h-20 mx-auto bg-success/10 rounded-full flex items-center justify-center">
              <Heart className="w-10 h-10 text-success fill-success" />
            </div>
            
            <div className="space-y-2">
              <p className="text-lg font-medium">Your feedback means a lot to us!</p>
              <p className="text-muted-foreground">
                Average rating: <span className="font-bold text-warning">{averageRating} ★</span>
              </p>
            </div>

            <Button onClick={handleClose} className="bg-gradient-primary hover:opacity-90">
              Done
            </Button>
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Rating Categories */}
            <div className="space-y-4">
              {ratingCategories.map(category => (
                <div key={category.key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{category.label}</p>
                      <p className="text-xs text-muted-foreground">{category.description}</p>
                    </div>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map(star => (
                        <button
                          key={star}
                          onClick={() => handleRating(category.key, star)}
                          onMouseEnter={() => setHoveredRating({ category: category.key, star })}
                          onMouseLeave={() => setHoveredRating(null)}
                          className="p-1 transition-transform hover:scale-110"
                        >
                          <Star
                            className={`w-6 h-6 transition-colors ${
                              getDisplayRating(category.key, star)
                                ? 'text-warning fill-warning'
                                : 'text-muted-foreground/30'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Average Rating Display */}
            {averageRating && (
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <p className="text-sm text-muted-foreground mb-1">Your overall rating</p>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-3xl font-bold text-warning">{averageRating}</span>
                  <Star className="w-6 h-6 text-warning fill-warning" />
                </div>
              </div>
            )}

            {/* Comment */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Additional Comments (Optional)</label>
              <Textarea
                placeholder="Tell us more about your experience..."
                value={comment}
                onChange={e => setComment(e.target.value)}
                rows={3}
                maxLength={500}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground text-right">
                {comment.length}/500 characters
              </p>
            </div>

            {/* Submit Button */}
            <Button
              onClick={handleSubmit}
              disabled={!isComplete || isSubmitting}
              className="w-full h-12 bg-gradient-primary hover:opacity-90"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Feedback'
              )}
            </Button>

            {!isComplete && (
              <p className="text-xs text-center text-muted-foreground">
                Please rate all categories to submit
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
