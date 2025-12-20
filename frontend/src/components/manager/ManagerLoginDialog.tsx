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

      // First check if backend is reachable (optional - don't block if it fails)
      try {
        const healthUrl = API_BASE_URL.includes('/api') 
          ? API_BASE_URL.replace('/api', '') + '/api/health'
          : API_BASE_URL + '/health';
        await axios.get(healthUrl, {
          timeout: 5000,
        });
      } catch (healthError) {
        // Don't throw - just log a warning, continue with login attempt
        console.warn('Backend health check failed, but continuing with login attempt:', healthError);
      }

      // Call backend to authenticate using axios
      const response = await axios.post(
        `${API_BASE_URL}/auth/manager-login`,
        { password },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 30000, // Increased to 30 seconds
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
      let message = 'Authentication failed';
      
      if (axios.isAxiosError(err)) {
        if (err.code === 'ECONNABORTED' || err.message.includes('timeout')) {
          message = 'Request timed out. Please check if the backend server is running on http://localhost:5000';
        } else if (err.code === 'ECONNREFUSED' || err.code === 'ERR_NETWORK') {
          message = 'Cannot connect to server. Please ensure the backend is running on http://localhost:5000';
        } else if (err.response) {
          // Server responded with error
          message = err.response.data?.message || err.response.data?.error || err.message;
        } else {
          message = err.message || 'Network error occurred';
        }
      } else if (err instanceof Error) {
        message = err.message;
      }
      
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
