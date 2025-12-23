import React, { useEffect, useState } from 'react';

const CustomerQRPage = () => {
  const [qrData, setQrData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchQR = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/qr/session');
        const data = await res.json();
        if (data.success && data.data) {
          setQrData(data.data);
        } else {
          setError(data.message || 'Failed to fetch QR code');
        }
      } catch (e) {
        setError('Failed to fetch QR code');
      }
      setLoading(false);
    };
    fetchQR();
  }, []);

  if (loading) return <div style={{textAlign:'center',marginTop:40}}>Loading QR code...</div>;
  if (error) return <div style={{color:'red',textAlign:'center',marginTop:40}}>{error}</div>;
  if (!qrData) return null;

  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',marginTop:40}}>
      <h2>Scan to Start Your Session</h2>
      <img src={qrData.qrCode} alt="Customer Session QR" style={{width:256,height:256,margin:'24px 0'}} />
      <div style={{wordBreak:'break-all',fontSize:12,marginTop:8}}>{qrData.url}</div>
    </div>
  );
};

export default CustomerQRPage;
