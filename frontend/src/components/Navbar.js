import React, { useState } from 'react';
import '../styles/navbar.css';
import { NavLink, useNavigate } from 'react-router-dom';
import logoIcon from '../assets/video-tutorials.png';
import { FaTimes, FaBars, FaArrowRight, FaArrowLeft } from 'react-icons/fa';

const Navbar = ({ sidebarOpen = false, setSidebarOpen = null, isMobile = false }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleNavLinkClick = () => {
    setIsMobileMenuOpen(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('userRole');
    handleNavLinkClick();
    navigate('/login');
  };

  const handleSidebarToggle = () => {
    if (setSidebarOpen) {
      setSidebarOpen(!sidebarOpen);
    }
  };

  const isLoggedIn = !!localStorage.getItem('userRole');

  return (
    <nav className="main-navbar">
      {/* Left side - Sidebar Toggle for Mobile when logged in + Logo */}
      <div className="navbar-left">
        {isLoggedIn && isMobile && (
          <div
            className="sidebar-toggle-mobile"
            onClick={handleSidebarToggle}
            role="button"
            aria-label="Toggle sidebar"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                handleSidebarToggle();
              }
            }}
          >
            {sidebarOpen ? <FaArrowLeft /> : <FaArrowRight />}
          </div>
        )}
        
        {/* Logo */}
        <div className="nav-logo">
          <img src={logoIcon} alt="logo" className="logo-img" />
          <h2>ONLINE TUITION</h2>
        </div>
      </div>

      {/* Right side - Navigation Links + Hamburger */}
      <div className="navbar-right">
        <ul className={`nav-links ${isMobileMenuOpen ? 'mobile-open' : ''} ${isLoggedIn ? 'logged-in' : ''}`}>
          <li><NavLink to="/" onClick={handleNavLinkClick}>Home</NavLink></li>

          {!isLoggedIn && (
            <li><NavLink to="/login" onClick={handleNavLinkClick}>Login</NavLink></li>
          )}

          {!isLoggedIn && (
            <li className="register-dropdown">
              <span className="register-link">Register</span>
              <ul className="dropdown-menu">
                <li><NavLink to="/register/teacher" onClick={handleNavLinkClick}>Teacher</NavLink></li>
                <li><NavLink to="/register/student" onClick={handleNavLinkClick}>Student</NavLink></li>
              </ul>
            </li>
          )}

          {isLoggedIn && (
            <li>
              <span
                onClick={handleLogout}
                className="logout-link"
              >
                Logout
              </span>
            </li>
          )}
        </ul>
        
        <div
          className={`hamburger ${isLoggedIn ? 'logged-in' : ''}`}
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          role="button"
          aria-label="Toggle navigation menu"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              setIsMobileMenuOpen(!isMobileMenuOpen);
            }
          }}
        >
          {isMobileMenuOpen ? <FaTimes /> : <FaBars />}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;