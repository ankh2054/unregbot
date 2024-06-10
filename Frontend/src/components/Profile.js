import React, { useState } from 'react';

const Login = () => {
  const [accountName, setAccountName] = useState('');
  const [privateKey, setPrivateKey] = useState('');

  const handleLogin = async (event) => {
    event.preventDefault();

    const response = await fetch('http://localhost:3000/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ accountName, privateKey }),
    });

    const data = await response.json();

    if (data.success) {
      alert('Login successful!');
    } else {
      alert('Login failed. Please check your credentials.');
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>Login</h2>
      <form onSubmit={handleLogin}>
        <div>
          <label>Account Name</label>
          <input type="text" value={accountName} onChange={(e) => setAccountName(e.target.value)} />
        </div>
        <div>
          <label>Private Key</label>
          <input type="password" value={privateKey} onChange={(e) => setPrivateKey(e.target.value)} />
        </div>
        <button type="submit">Login</button>
      </form>
    </div>
  );
};

export default Login;
