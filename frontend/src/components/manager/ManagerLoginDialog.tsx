import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle } from 'lucide-react';
import axios from 'axios';

interface ManagerLoginProps {
  open: boolean;
  onLogin: (token: string) => void;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export function ManagerLoginDialog({ open, onLogin }: ManagerLoginProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError('');

      // Call backend to authenticate using axios
      const response = await axios.post(
        `${API_BASE_URL}/auth/manager-login`,
        { password },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );

      const data = response.data;
      
      if (data.token) {
        // Store token
        localStorage.setItem('managerToken', data.token);
        setPassword('');
        onLogin(data.token);
      } else {
        throw new Error('No token received');
      }
    } catch (err) {
      const message = axios.isAxiosError(err)
        ? err.response?.data?.message || err.message
        : err instanceof Error
        ? err.message
        : 'Authentication failed';
      setError(message);
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Manager Authentication</DialogTitle>
          <DialogDescription>
            Enter the manager password to access the dashboard
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleLogin} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="password">Manager Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
            <p className="text-xs text-gray-500">Default: admin123</p>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={loading || !password}
          >
            {loading ? 'Authenticating...' : 'Login'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
