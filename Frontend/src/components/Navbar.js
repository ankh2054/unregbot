import React from 'react';
import { Link } from 'react-router-dom';

const Navbar = () => {
  return (
    <nav style={{ padding: '10px', background: '#333', color: '#fff' }}>
      <Link to="/" style={{ margin: '10px', color: '#fff', textDecoration: 'none' }}>Home</Link>
      <Link to="/login" style={{ margin: '10px', color: '#fff', textDecoration: 'none' }}>Login</Link>
      <Link to="/profile" style={{ margin: '10px', color: '#fff', textDecoration: 'none' }}>Profile</Link>
    </nav>
  );
};

export default Navbar;
