import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Clock, XCircle, Check, Loader2 } from 'lucide-react';

interface ApproveOrderDialogProps {
  open: boolean;
  orderId: number | null;
  orderNumber: string;
  onClose: () => void;
  onConfirm: (orderId: number, estimatedTime: number) => Promise<void>;
}

export function ApproveOrderDialog({
  open,
  orderId,
  orderNumber,
  onClose,
  onConfirm,
}: ApproveOrderDialogProps) {
  const [estimatedTime, setEstimatedTime] = useState(25);
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (!orderId) return;
    
    setLoading(true);
    try {
      await onConfirm(orderId, estimatedTime);
      setEstimatedTime(25); // Reset for next use
      onClose();
    } catch (error) {
      console.error('Failed to approve order:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Check className="w-5 h-5 text-green-600" />
            Approve Order
          </DialogTitle>
          <DialogDescription>
            Approve order <span className="font-mono font-semibold">{orderNumber}</span> and send it to the kitchen.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="estimatedTime" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Estimated Completion Time (minutes)
            </Label>
            <Input
              id="estimatedTime"
              type="number"
              min={5}
              max={120}
              value={estimatedTime}
              onChange={(e) => setEstimatedTime(Math.max(5, Math.min(120, parseInt(e.target.value) || 25)))}
              className="max-w-[150px]"
            />
            <p className="text-xs text-muted-foreground">
              The customer will see this estimated time. Default is 25 minutes.
            </p>
          </div>

          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800">
              ✓ The kitchen will be notified immediately
            </p>
            <p className="text-sm text-green-800">
              ✓ The customer will receive a notification
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={loading} className="bg-green-600 hover:bg-green-700">
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Approving...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Approve Order
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface RejectOrderDialogProps {
  open: boolean;
  orderId: number | null;
  orderNumber: string;
  onClose: () => void;
  onConfirm: (orderId: number, reason: string) => Promise<void>;
}

export function RejectOrderDialog({
  open,
  orderId,
  orderNumber,
  onClose,
  onConfirm,
}: RejectOrderDialogProps) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (!orderId) return;
    
    if (!reason.trim()) {
      return; // Require a reason
    }
    
    setLoading(true);
    try {
      await onConfirm(orderId, reason);
      setReason(''); // Reset for next use
      onClose();
    } catch (error) {
      console.error('Failed to reject order:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <XCircle className="w-5 h-5 text-red-600" />
            Reject Order
          </DialogTitle>
          <DialogDescription>
            Reject order <span className="font-mono font-semibold">{orderNumber}</span>. Please provide a reason for the customer.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Rejection Reason *</Label>
            <Textarea
              id="reason"
              placeholder="e.g., Out of key ingredients, Kitchen closed, Order too complex..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              This reason will be shown to the customer.
            </p>
          </div>

          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">
              ⚠️ This action cannot be undone
            </p>
            <p className="text-sm text-red-800">
              ⚠️ The customer will be notified of the rejection
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={loading || !reason.trim()} 
            variant="destructive"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Rejecting...
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4 mr-2" />
                Reject Order
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
