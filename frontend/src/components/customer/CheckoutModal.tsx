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

  const handleSubmit = async () => {
    if (!tableNumber.trim()) {
      toast.error('Please enter your table number');
      return;
    }

    setIsSubmitting(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const newOrderNumber = `ORD-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
    setOrderNumber(newOrderNumber);
    setStep('success');
    setIsSubmitting(false);
    clearCart();
    
    toast.success('Order placed successfully!');
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
