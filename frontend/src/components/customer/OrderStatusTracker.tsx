import { useState, useEffect } from 'react';
import { Order } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Clock,
  CheckCircle2,
  ChefHat,
  Package,
  Bell,
  Timer,
  PartyPopper,
} from 'lucide-react';
import { formatDistanceToNow, differenceInMinutes } from 'date-fns';

interface OrderStatusTrackerProps {
  order: Order;
  open: boolean;
  onClose: () => void;
  onLeaveFeedback: () => void;
}

const statusSteps = [
  { key: 'pending_approval', label: 'Placed', icon: Clock },
  { key: 'approved', label: 'Approved', icon: CheckCircle2 },
  { key: 'in_progress', label: 'Preparing', icon: ChefHat },
  { key: 'ready', label: 'Ready', icon: Package },
  { key: 'completed', label: 'Completed', icon: PartyPopper },
];

export function OrderStatusTracker({ order, open, onClose, onLeaveFeedback }: OrderStatusTrackerProps) {
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    if (!open) return;
    
    const timer = setInterval(() => {
      const minutes = differenceInMinutes(new Date(), new Date(order.createdAt));
      setElapsedTime(minutes);
    }, 1000);

    return () => clearInterval(timer);
  }, [open, order.createdAt]);

  const currentStepIndex = statusSteps.findIndex(s => s.key === order.status);
  const progressPercent = ((currentStepIndex + 1) / statusSteps.length) * 100;

  const getTimeRemaining = () => {
    if (!order.expectedCompletion) return null;
    const remaining = differenceInMinutes(new Date(order.expectedCompletion), new Date());
    return remaining > 0 ? remaining : 0;
  };

  const timeRemaining = getTimeRemaining();
  const isReady = order.status === 'ready' || order.status === 'completed';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl flex items-center gap-2">
            {isReady ? (
              <>
                <Bell className="w-6 h-6 text-success animate-bounce" />
                Order Ready!
              </>
            ) : (
              <>
                <Timer className="w-6 h-6 text-primary" />
                Tracking Order
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Order Info */}
          <div className="flex items-center justify-between bg-muted/50 rounded-lg p-4">
            <div>
              <p className="font-mono font-bold text-lg">{order.orderNumber}</p>
              <p className="text-sm text-muted-foreground">Table {order.tableNumber}</p>
            </div>
            <Badge className={`text-sm ${
              isReady ? 'bg-success text-success-foreground' : 
              order.status === 'in_progress' ? 'bg-secondary text-secondary-foreground' :
              'bg-primary/10 text-primary'
            }`}>
              {order.status.replace('_', ' ').toUpperCase()}
            </Badge>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <Progress value={progressPercent} className="h-2" />
            <p className="text-xs text-muted-foreground text-center">
              Step {currentStepIndex + 1} of {statusSteps.length}
            </p>
          </div>

          {/* Status Timeline */}
          <div className="relative">
            {statusSteps.map((step, index) => {
              const isCompleted = index <= currentStepIndex;
              const isCurrent = index === currentStepIndex;
              const Icon = step.icon;

              return (
                <div key={step.key} className="flex items-center gap-4 mb-4 last:mb-0">
                  <div className={`relative flex items-center justify-center w-10 h-10 rounded-full transition-all ${
                    isCompleted 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted text-muted-foreground'
                  } ${isCurrent ? 'ring-4 ring-primary/20 animate-pulse' : ''}`}>
                    <Icon className="w-5 h-5" />
                    {index < statusSteps.length - 1 && (
                      <div className={`absolute top-full left-1/2 w-0.5 h-4 -translate-x-1/2 ${
                        isCompleted ? 'bg-primary' : 'bg-muted'
                      }`} />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className={`font-medium ${isCompleted ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {step.label}
                    </p>
                    {isCurrent && order.status !== 'completed' && (
                      <p className="text-xs text-muted-foreground animate-pulse">
                        In progress...
                      </p>
                    )}
                  </div>
                  {isCompleted && <CheckCircle2 className="w-5 h-5 text-success" />}
                </div>
              );
            })}
          </div>

          {/* Time Info */}
          <div className="grid grid-cols-2 gap-4 bg-muted/30 rounded-lg p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">{elapsedTime}</p>
              <p className="text-xs text-muted-foreground">Minutes elapsed</p>
            </div>
            {timeRemaining !== null && !isReady && (
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{timeRemaining}</p>
                <p className="text-xs text-muted-foreground">Minutes remaining</p>
              </div>
            )}
            {isReady && (
              <div className="text-center">
                <p className="text-2xl font-bold text-success">✓</p>
                <p className="text-xs text-muted-foreground">Ready to pickup!</p>
              </div>
            )}
          </div>

          {/* Order Items */}
          <div className="space-y-2">
            <p className="font-medium text-sm">Order Items</p>
            <div className="bg-muted/30 rounded-lg p-3 space-y-1">
              {order.items.map((item, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span>{item.quantity}x {item.name}</span>
                  <span className="text-muted-foreground">${(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
              <div className="border-t border-border pt-2 mt-2 flex justify-between font-semibold">
                <span>Total</span>
                <span>${order.totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          {isReady && (
            <Button
              onClick={onLeaveFeedback}
              className="w-full h-12 bg-gradient-primary hover:opacity-90"
            >
              Leave Feedback
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
