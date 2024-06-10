import React, { useEffect, useState } from 'react';
import { withUAL } from 'ual-reactjs-renderer';

const Login = ({ ual }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('access_token'));
  const [activeUser, setActiveUser] = useState(localStorage.getItem('activeUser') || null);

  useEffect(() => {
    const user = ual.activeUser;
    if (user && !localStorage.getItem('access_token')) {
      login(user).then(() => {
        setIsLoggedIn(true);
        setActiveUser(user.accountName);
      });
    }
  }, [ual.activeUser]);

  const login = async (user) => {
    const accountName = user.accountName;
    const signature = user.signerProof;
    const signerRequest = user.signerRequest;

    const LOGIN_URL = process.env.NODE_ENV === 'development'
      ? 'http://localhost:3000/login'
      : 'https://your-production-url.com/login';

    const response = await fetch(LOGIN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        signature,
        transaction: signerRequest,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.token) {
        localStorage.setItem('access_token', data.token);
        setIsLoggedIn(true);
        setActiveUser(accountName);
      } else {
        console.error('Access token is empty');
      }
    } else {
      console.error('Failed to login');
    }
  };

  const handleLogin = async () => {
    if (!isLoggedIn) {
      try {
        await ual.showModal();
      } catch (error) {
        console.error('Login failed:', error);
      }
    }
  };

  return (
    <div>
      <button onClick={handleLogin}>Login with Wallet</button>
    </div>
  );
};

export default withUAL(Login);