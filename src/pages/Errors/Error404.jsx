import React from 'react';

export default function Error404() {
  return (
    <div style={{ height: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <img src="https://i.pinimg.com/1200x/40/12/cd/4012cdc2cf44b21bfcb51ccf5c09c42e.jpg" alt="404 Not Found" style={{ maxWidth: '400px', marginBottom: '20px', borderRadius: '16px' }} />
      <h2 style={{ color: '#1C2E4A', fontFamily: '"Source Serif 4", serif' }}>404 - NOT FOUND</h2>
      <p style={{ color: '#52677D' }}>Oops!</p>
    </div>
  );
}