import React from 'react';
import '../styles/Footer.scss';

const Footer = () => {
  return <div className="main-footer">The Trackers &copy; {new Date().getFullYear()}</div>;
};

export default Footer;
