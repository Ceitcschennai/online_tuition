import React, { useState } from "react";
import "../styles/navbar.css";

import {
  NavLink,
  useNavigate,
} from "react-router-dom";

import logoIcon from "../assets/video-tutorials.png";

import {
  FaTimes,
  FaBars,
  FaArrowRight,
  FaArrowLeft,
  FaChevronDown,
} from "react-icons/fa";

const Navbar = ({
  sidebarOpen = false,
  setSidebarOpen = null,
  isMobile = false,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] =
    useState(false);

  const [isRegisterOpen, setIsRegisterOpen] =
    useState(false);

  const [showLogoutConfirm, setShowLogoutConfirm] =
    useState(false);

  const navigate = useNavigate();

  const isLoggedIn =
    !!localStorage.getItem("userRole");

  // =========================================================
  // CLOSE MENUS
  // =========================================================

  const closeMenus = () => {
    setIsMobileMenuOpen(false);
    setIsRegisterOpen(false);
  };

  // =========================================================
  // NAVIGATION
  // =========================================================

  const handleNavLinkClick = () => {
    closeMenus();
  };

  // =========================================================
  // REGISTER DROPDOWN
  // =========================================================

  const toggleRegisterDropdown = () => {
    setIsRegisterOpen((previous) => !previous);
  };

  // =========================================================
  // LOGOUT
  // =========================================================

  const requestLogout = () => {
    setShowLogoutConfirm(true);
  };

  const cancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  const confirmLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userRole");
    localStorage.removeItem("user");
    localStorage.removeItem("teacherId");
    localStorage.removeItem("student");
    localStorage.removeItem("teacher");

    setShowLogoutConfirm(false);

    closeMenus();

    navigate("/login");
  };

  // =========================================================
  // SIDEBAR
  // =========================================================

  const handleSidebarToggle = () => {
    if (setSidebarOpen) {
      setSidebarOpen(!sidebarOpen);
    }
  };

  return (
    <>
      <nav className="main-navbar">

        {/* LEFT SIDE */}

        <div className="navbar-left">

          {isLoggedIn && isMobile && (
            <button
              type="button"
              className="sidebar-toggle-mobile"
              onClick={handleSidebarToggle}
              aria-label="Toggle sidebar"
            >
              {sidebarOpen
                ? <FaArrowLeft />
                : <FaArrowRight />}
            </button>
          )}

          <NavLink
            to="/"
            className="nav-logo"
            onClick={handleNavLinkClick}
          >
            <img
              src={logoIcon}
              alt="Online Tuition"
              className="logo-img"
            />

            <div className="nav-brand-text">
              <h2>ONLINE TUITION</h2>

              <span>
                Learn • Grow • Achieve
              </span>
            </div>
          </NavLink>

        </div>

        {/* RIGHT SIDE */}

        <div className="navbar-right">

          <ul
            className={`nav-links ${
              isMobileMenuOpen
                ? "mobile-open"
                : ""
            }`}
          >

            {/* HOME */}

            <li>
              <NavLink
                to="/"
                end
                onClick={handleNavLinkClick}
              >
                Home
              </NavLink>
            </li>

            {/* LOGIN */}

            {!isLoggedIn && (
              <li>
                <NavLink
                  to="/login"
                  onClick={handleNavLinkClick}
                >
                  Login
                </NavLink>
              </li>
            )}

            {/* REGISTER */}

            {!isLoggedIn && (
              <li className="register-dropdown">

                <button
                  type="button"
                  className={`register-link ${
                    isRegisterOpen
                      ? "active"
                      : ""
                  }`}
                  onClick={toggleRegisterDropdown}
                  aria-expanded={isRegisterOpen}
                >
                  <span>Register</span>

                  <FaChevronDown
                    className={`register-arrow ${
                      isRegisterOpen
                        ? "rotate"
                        : ""
                    }`}
                  />
                </button>

                <ul
                  className={`dropdown-menu ${
                    isRegisterOpen
                      ? "dropdown-open"
                      : ""
                  }`}
                >

                  <li>
                    <NavLink
                      to="/register/teacher"
                      onClick={handleNavLinkClick}
                    >
                      Faculty
                    </NavLink>
                  </li>

                  <li>
                    <NavLink
                      to="/register/student"
                      onClick={handleNavLinkClick}
                    >
                      Participant
                    </NavLink>
                  </li>

                </ul>

              </li>
            )}

            {/* LOGOUT */}

            {isLoggedIn && (
              <li>
                <button
                  type="button"
                  className="logout-link"
                  onClick={requestLogout}
                >
                  Logout
                </button>
              </li>
            )}

          </ul>

          {/* MOBILE MENU */}

          <button
            type="button"
            className="hamburger"
            onClick={() =>
              setIsMobileMenuOpen(
                (previous) => !previous
              )
            }
            aria-label="Toggle navigation menu"
          >
            {isMobileMenuOpen
              ? <FaTimes />
              : <FaBars />}
          </button>

        </div>

      </nav>

      {/* LOGOUT POPUP */}

      {showLogoutConfirm && (
        <div
          className="logout-confirm-overlay"
          onClick={cancelLogout}
        >
          <div
            className="logout-confirm-dialog"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <h3>Log out?</h3>

            <p>
              Are you sure you want to log out
              of your account?
            </p>

            <div className="logout-confirm-actions">

              <button
                type="button"
                className="logout-confirm-cancel"
                onClick={cancelLogout}
              >
                Cancel
              </button>

              <button
                type="button"
                className="logout-confirm-ok"
                onClick={confirmLogout}
              >
                Logout
              </button>

            </div>

          </div>
        </div>
      )}

    </>
  );
};

export default Navbar;