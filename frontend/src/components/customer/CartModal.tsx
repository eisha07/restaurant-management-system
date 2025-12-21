import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { Minus, Plus, Trash2, ShoppingBag, MessageSquare } from 'lucide-react';
import { useState } from 'react';

interface CartModalProps {
  open: boolean;
  onClose: () => void;
  onCheckout: () => void;
}

export function CartModal({ open, onClose, onCheckout }: CartModalProps) {
  const { items, updateQuantity, removeItem, updateInstructions, subtotal, tax, total, itemCount } = useCart();
  const [editingInstructions, setEditingInstructions] = useState<number | null>(null);

  const handleCheckout = () => {
    onClose();
    onCheckout();
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col">
        <SheetHeader className="border-b border-border pb-4">
          <SheetTitle className="flex items-center gap-2 font-serif text-2xl">
            <ShoppingBag className="w-6 h-6 text-primary" />
            Your Cart
            {itemCount > 0 && (
              <span className="bg-primary text-primary-foreground text-sm px-2 py-0.5 rounded-full">
                {itemCount}
              </span>
            )}
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
            <ShoppingBag className="w-16 h-16 text-muted-foreground/30 mb-4" />
            <p className="text-lg font-medium text-foreground mb-1">Your cart is empty</p>
            <p className="text-muted-foreground text-sm">Add delicious items from our menu!</p>
            <Button onClick={onClose} className="mt-6 bg-gradient-primary">
              Browse Menu
            </Button>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 -mx-6 px-6">
              <div className="space-y-4 py-4">
                {items.map(item => (
                  <div
                    key={item.id}
                    className="bg-muted/50 rounded-lg p-4 animate-fade-in"
                  >
                    <div className="flex gap-3">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-20 h-20 object-cover rounded-lg"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-medium text-foreground truncate">{item.name}</h4>
                          <button
                            onClick={() => removeItem(item.id)}
                            className="text-muted-foreground hover:text-destructive transition-colors p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-primary font-semibold">${item.price.toFixed(2)}</p>

                        {/* Quantity controls */}
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-2 bg-background rounded-lg border border-border">
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              className="p-2 hover:bg-muted rounded-l-lg transition-colors"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="w-8 text-center font-medium">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="p-2 hover:bg-muted rounded-r-lg transition-colors"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                          <span className="font-semibold text-foreground">
                            ${(item.price * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Special instructions */}
                    <div className="mt-3">
                      {editingInstructions === item.id ? (
                        <Input
                          placeholder="Special instructions..."
                          value={item.specialInstructions || ''}
                          onChange={e => updateInstructions(item.id, e.target.value)}
                          onBlur={() => setEditingInstructions(null)}
                          autoFocus
                          className="text-sm"
                        />
                      ) : (
                        <button
                          onClick={() => setEditingInstructions(item.id)}
                          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          {item.specialInstructions || 'Add special instructions'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <SheetFooter className="border-t border-border pt-4 flex-col gap-4">
              {/* Totals */}
              <div className="w-full space-y-2">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Tax (8%)</span>
                  <span>${tax.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-semibold text-lg">
                  <span>Total</span>
                  <span className="text-primary">${total.toFixed(2)}</span>
                </div>
              </div>

              <Button
                onClick={handleCheckout}
                className="w-full h-12 bg-gradient-primary hover:opacity-90 text-lg font-semibold"
              >
                Proceed to Checkout
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
