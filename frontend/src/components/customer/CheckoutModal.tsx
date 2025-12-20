import { useState } from 'react';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { 
  CreditCard, 
  Banknote, 
  Smartphone, 
  Check, 
  ArrowLeft,
  Loader2,
  PartyPopper
} from 'lucide-react';
import { toast } from 'sonner';
import { PaymentMethod } from '@/types';
import { orderApi } from '@/services/api';

interface CheckoutModalProps {
  open: boolean;
  onClose: () => void;
}

const paymentMethods = [
  { id: 'cash', label: 'Cash', icon: Banknote, description: 'Pay at counter' },
  { id: 'card', label: 'Card', icon: CreditCard, description: 'Debit or Credit' },
  { id: 'online', label: 'Online', icon: Smartphone, description: 'Digital wallet' },
];

export function CheckoutModal({ open, onClose }: CheckoutModalProps) {
  const { items, subtotal, tax, total, clearCart } = useCart();
  const [step, setStep] = useState<'payment' | 'details' | 'success'>('payment');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [tableNumber, setTableNumber] = useState('');
  const [orderInstructions, setOrderInstructions] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');
  const [estimatedTime, setEstimatedTime] = useState<number>(25);
  const [createdOrderId, setCreatedOrderId] = useState<number | null>(null);

  const handleSubmit = async () => {
    if (!tableNumber.trim()) {
      toast.error('Please enter your table number');
      return;
    }

    const tableNum = parseInt(tableNumber);
    if (isNaN(tableNum) || tableNum < 1 || tableNum > 30) {
      toast.error('Table number must be between 1 and 30');
      return;
    }

    if (items.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Get or create persistent session ID for this customer
      let sessionId = localStorage.getItem('customerSessionId');
      if (!sessionId) {
        sessionId = `customer-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
        localStorage.setItem('customerSessionId', sessionId);
      }
      
      // Prepare order data
      const orderData = {
        customerSessionId: sessionId,
        paymentMethod: paymentMethod,
        tableNumber: tableNum,
        items: items.map(item => ({
          menuItemId: item.id,
          quantity: item.quantity,
          specialInstructions: item.specialInstructions || undefined
        })),
        specialInstructions: orderInstructions || undefined
      };

      console.log('📝 Submitting order:', orderData);
      
      // Call API to create order
      const response = await orderApi.createOrder(orderData);
      
      // Get order ID from response
      const newOrderId = response.id || response.order_id;
      
      // Set success state
      setOrderNumber(response.order_number || response.orderNumber || `ORD-${newOrderId}`);
      setCreatedOrderId(newOrderId);
      setEstimatedTime(response.estimated_time || response.estimatedTime || 25);
      setStep('success');
      clearCart();
      
      // Store order info for tracking
      const existingOrders = JSON.parse(localStorage.getItem('customerOrders') || '[]');
      existingOrders.push({
        id: newOrderId,
        orderNumber: response.order_number || response.orderNumber || `ORD-${newOrderId}`,
        estimatedTime: response.estimated_time || response.estimatedTime || 25,
        createdAt: new Date().toISOString()
      });
      localStorage.setItem('customerOrders', JSON.stringify(existingOrders));
      
      // Dispatch custom event to notify CustomerPage
      window.dispatchEvent(new CustomEvent('orderCreated', { detail: { orderId: newOrderId } }));
      
      toast.success('Order placed successfully!');
      console.log('✅ Order created:', response);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('❌ Failed to create order:', errorMsg);
      
      // Check for specific validation errors
      if (errorMsg.includes('table') || errorMsg.includes('Table')) {
        toast.error('Invalid table number. Please choose a valid table (1-30)');
      } else if (errorMsg.includes('not found') || errorMsg.includes('not available')) {
        toast.error('Some items are no longer available. Please update your cart.');
      } else {
        toast.error(`Failed to place order: ${errorMsg}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setStep('payment');
    setPaymentMethod('card');
    setTableNumber('');
    setOrderInstructions('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">
            {step === 'success' ? 'Order Confirmed!' : 'Checkout'}
          </DialogTitle>
          {step !== 'success' && (
            <DialogDescription>
              {step === 'payment' ? 'Select your payment method' : 'Enter your details'}
            </DialogDescription>
          )}
        </DialogHeader>

        {step === 'payment' && (
          <div className="space-y-6 py-4">
            <RadioGroup
              value={paymentMethod}
              onValueChange={(v: PaymentMethod) => setPaymentMethod(v)}
              className="space-y-3"
            >
              {paymentMethods.map(method => (
                <label
                  key={method.id}
                  className={`flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    paymentMethod === method.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <RadioGroupItem value={method.id} className="sr-only" />
                  <div className={`p-2 rounded-lg ${
                    paymentMethod === method.id ? 'bg-primary text-primary-foreground' : 'bg-muted'
                  }`}>
                    <method.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{method.label}</p>
                    <p className="text-sm text-muted-foreground">{method.description}</p>
                  </div>
                  {paymentMethod === method.id && (
                    <Check className="w-5 h-5 text-primary" />
                  )}
                </label>
              ))}
            </RadioGroup>

            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Items ({items.length})</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax</span>
                <span>${tax.toFixed(2)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-semibold text-lg">
                <span>Total</span>
                <span className="text-primary">${total.toFixed(2)}</span>
              </div>
            </div>

            <Button
              onClick={() => setStep('details')}
              className="w-full h-12 bg-gradient-primary hover:opacity-90"
            >
              Continue
            </Button>
          </div>
        )}

        {step === 'details' && (
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="table">Table Number *</Label>
              <Input
                id="table"
                placeholder="Enter your table number"
                value={tableNumber}
                onChange={e => setTableNumber(e.target.value)}
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="instructions">Special Instructions (Optional)</Label>
              <Textarea
                id="instructions"
                placeholder="Any special requests for your order?"
                value={orderInstructions}
                onChange={e => setOrderInstructions(e.target.value)}
                rows={3}
              />
            </div>

            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <span>Payment Method:</span>
                <span className="font-medium text-foreground capitalize">{paymentMethod}</span>
              </div>
              <div className="flex justify-between font-semibold text-lg">
                <span>Total</span>
                <span className="text-primary">${total.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setStep('payment')}
                className="flex-1 h-12"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1 h-12 bg-gradient-primary hover:opacity-90"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Placing Order...
                  </>
                ) : (
                  'Place Order'
                )}
              </Button>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="py-8 text-center space-y-6">
            <div className="w-20 h-20 mx-auto bg-success/10 rounded-full flex items-center justify-center animate-scale-in">
              <PartyPopper className="w-10 h-10 text-success" />
            </div>
            
            <div className="space-y-2">
              <p className="text-muted-foreground">Your order has been placed</p>
              <p className="font-mono text-2xl font-bold text-primary">{orderNumber}</p>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 text-sm">
              <p className="text-muted-foreground mb-1">Payment Method</p>
              <p className="font-medium capitalize">{paymentMethod}</p>
              <p className="text-muted-foreground mt-3 mb-1">Table Number</p>
              <p className="font-medium">{tableNumber}</p>
              <p className="text-muted-foreground mt-3 mb-1">Estimated Completion Time</p>
              <p className="font-medium text-primary">{estimatedTime} minutes</p>
            </div>

            <p className="text-muted-foreground text-sm">
              You'll receive updates when your order is being prepared and when it's ready.
            </p>

            <Button
              onClick={handleClose}
              className="w-full h-12 bg-gradient-primary hover:opacity-90"
            >
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
