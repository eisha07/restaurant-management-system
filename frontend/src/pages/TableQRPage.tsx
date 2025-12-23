import React, { useState } from 'react';

const TableQRPage = () => {
  const [tableId, setTableId] = useState('');
  const [qrData, setQrData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    setQrData(null);
    console.log('Requesting QR for table:', tableId);
    try {
      const res = await fetch(`/api/qr/menu/${tableId}`);
      console.log('Fetch response:', res);
      const data = await res.json();
      console.log('QR API response:', data);
      if (data.success) {
        setQrData(data.data);
        console.log('QR data set:', data.data);
      } else {
        setError(data.message || 'Failed to generate QR');
        console.error('QR error:', data.message);
      }
    } catch (e) {
      setError('Network error');
      console.error('Network error:', e);
    }
    setLoading(false);
  };

  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',marginTop:40}}>
      <h2>Generate Table QR</h2>
      <input
        type="text"
        placeholder="Enter Table ID"
        value={tableId}
        onChange={e => setTableId(e.target.value)}
        style={{margin:'12px 0',padding:8,fontSize:16}}
      />
      <button onClick={handleGenerate} disabled={!tableId || loading} style={{padding:'8px 16px',fontSize:16}}>
        {loading ? 'Generating...' : 'Generate QR'}
      </button>
      {error && <div style={{color:'red',marginTop:12}}>{error}</div>}
      {qrData && (
        <div style={{marginTop:24}}>
          <img src={qrData.qrCode} alt="Table QR" style={{width:256,height:256}} />
          <div style={{wordBreak:'break-all',fontSize:12,marginTop:8}}>{qrData.url}</div>
        </div>
      )}
    </div>
  );
};

export default TableQRPage;
