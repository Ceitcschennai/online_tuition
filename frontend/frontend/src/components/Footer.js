import React from 'react';
import '../styles/footer.css';

const Footer = () => {
  return (
    <footer className="footer-section">
      <div className="footer-container">
        <div className="footer-content">
          <div className="footer-brand">
            <h2>Online Tuition</h2>
            <p>Empowering learning from anywhere, anytime.</p>
          </div>
          <div className="footer-links">
            <h3>Quick Links</h3>
            <ul>
              <li><a href="/">Home</a></li>
              <li><a href="/subjects">Subjects</a></li>
              <li><a href="/explore-more">Explore More</a></li>
              <li><a href="/login">Login</a></li>
            </ul>
          </div>
          <div className="footer-contact">
            <h3>Contact Us</h3>
            <p><span>Email:</span> support@onlinetuition.com</p>
            <p><span>Phone:</span> +91 98765 43210</p>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} Online Tuition. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
