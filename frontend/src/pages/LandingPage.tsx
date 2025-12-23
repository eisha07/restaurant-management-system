import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const LandingPage = () => {
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const table_id = params.get('table_id');
    const session_token = params.get('session_token');
    if (!table_id || !session_token) {
      setStatus('error');
      setError('Missing table or session info.');
      return;
    }
    fetch('/api/qr/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table_id, session_token })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setStatus('success');
          setTimeout(() => navigate(`/customer?table_id=${table_id}&session_token=${session_token}`), 1000);
        } else {
          setStatus('error');
          setError(data.message || 'Invalid session.');
        }
      })
      .catch(() => {
        setStatus('error');
        setError('Network error.');
      });
  }, [location, navigate]);

  if (status === 'loading') return <div style={{textAlign:'center',marginTop:40}}>Validating session...</div>;
  if (status === 'error') return <div style={{color:'red',textAlign:'center',marginTop:40}}>{error}</div>;
  return <div style={{textAlign:'center',marginTop:40}}>Session valid! Redirecting...</div>;
};

export default LandingPage;
