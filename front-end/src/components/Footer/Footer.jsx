import React from 'react';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-links">
          <a href="#" className="footer-link">About</a>
          <a href="#" className="footer-link">Privacy</a>
          <a href="#" className="footer-link">Terms</a>
          <a href="#" className="footer-link">Help</a>
        </div>
        <div className="footer-text">
          © 2024 Bird Social Media
        </div>
      </div>
    </footer>
  );
};

export default Footer;
