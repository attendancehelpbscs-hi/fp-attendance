import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/Footer.scss';

const Footer = () => {
  return (
    <div className="main-footer" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div>The Trackers &copy; {new Date().getFullYear()}</div>
      <div style={{ fontSize: '0.8em', marginTop: '5px' }}>
        <Link to="/privacy-policy" style={{ color: 'inherit', textDecoration: 'underline' }}>
          Data Privacy
        </Link>
        {' | '}
        <Link to="/about" style={{ color: 'inherit', textDecoration: 'underline' }}>
          About
        </Link>
      </div>
    </div>
  );
};

export default Footer;
