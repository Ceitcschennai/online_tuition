import React, { useState } from "react";
import axios from "axios";

import {
  FaBookOpen,
  FaGraduationCap,
  FaChartLine,
  FaChevronDown,
  FaUsers,
  FaUserShield,
  FaChalkboardTeacher,
  FaUserGraduate,
  FaEnvelope,
  FaLock,
  FaEye,
  FaEyeSlash,
  FaArrowRight,
  FaUserPlus,
  FaTimes,
  FaLaptop,
  FaBars,
} from "react-icons/fa";

import "../styles/login.css";
import API_BASE_URL from "../config/api";

// ============================================================
// MOBILE DEVICE DETECTION
// ============================================================

const isMobileDevice = () => {
  const ua =
    navigator.userAgent ||
    navigator.vendor ||
    window.opera;

  return (
    /android|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile/i.test(
      ua
    ) || window.innerWidth <= 768
  );
};

// ============================================================
// MOBILE POPUP
// ============================================================

const MobilePopup = ({ onClose }) => {
  return (
    <div className="mobile-popup-overlay">
      <div className="mobile-popup-card">
        <button
          type="button"
          className="mobile-popup-close"
          onClick={onClose}
          aria-label="Close"
        >
          <FaTimes />
        </button>

        <div className="mobile-popup-icon">
          <FaLaptop />
        </div>

        <h2>Laptop Required</h2>

        <p>
          <strong>Participant login</strong> is available only
          on a laptop or desktop computer for the best learning
          experience.
        </p>

        <span>
          Faculty and Admin can login from any device.
        </span>

        <button
          type="button"
          className="mobile-popup-button"
          onClick={onClose}
        >
          Got it
        </button>
      </div>
    </div>
  );
};

// ============================================================
// LOGIN COMPONENT
// ============================================================

const Login = () => {
  // ==========================================================
  // STATES
  // ==========================================================

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [role, setRole] = useState("admin");

  const [showPassword, setShowPassword] =
    useState(false);

  const [rememberMe, setRememberMe] =
    useState(false);

  const [error, setError] = useState("");

  const [loading, setLoading] = useState(false);

  const [showMobilePopup, setShowMobilePopup] =
    useState(false);

  const [mobileMenuOpen, setMobileMenuOpen] =
    useState(false);

  const [registerMenuOpen, setRegisterMenuOpen] =
    useState(false);

  // ==========================================================
  // CLOSE MENUS
  // ==========================================================

  const closeAllMenus = () => {
    setMobileMenuOpen(false);
    setRegisterMenuOpen(false);
  };

  // ==========================================================
  // LOGIN
  // ==========================================================

  const handleLogin = async (e) => {
    e.preventDefault();

    setError("");

    // Participant cannot login from mobile

    if (role === "student" && isMobileDevice()) {
      setShowMobilePopup(true);
      return;
    }

    // Email validation

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    // Password validation

    if (!password.trim()) {
      setError("Please enter your password.");
      return;
    }

    try {
      setLoading(true);

      const response = await axios.post(
        `${API_BASE_URL}/api/auth/login`,
        {
          email,
          password,
          role,
        }
      );

      // ======================================================
      // SAVE LOGIN INFORMATION
      // ======================================================

      localStorage.setItem(
        "token",
        response.data.token
      );

      localStorage.setItem(
        "userRole",
        role
      );

      localStorage.setItem(
        "user",
        JSON.stringify(response.data.user)
      );

      if (role === "teacher") {
        localStorage.setItem(
          "teacherId",
          response.data.user._id
        );
      }

      // ======================================================
      // REMEMBER ME
      // ======================================================

      if (rememberMe) {
        localStorage.setItem(
          "rememberEmail",
          email
        );
      } else {
        localStorage.removeItem(
          "rememberEmail"
        );
      }

      // ======================================================
      // REDIRECT
      // ======================================================

      if (role === "admin") {
        window.location.href =
          "/admin-dashboard";
      } else if (role === "teacher") {
        window.location.href =
          "/teacher-dashboard";
      } else {
        window.location.href =
          "/student-dashboard";
      }
    } catch (err) {
      console.error(
        "Login error:",
        err
      );

      setError(
        err.response?.data?.message ||
          "Login failed. Please check your email and password."
      );
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================
  // LOGIN PAGE BODY CLASS
  // ==========================================================

  React.useEffect(() => {
    document.body.classList.add(
      "login-active"
    );

    return () => {
      document.body.classList.remove(
        "login-active"
      );
    };
  }, []);

  // ==========================================================
  // LOAD REMEMBERED EMAIL
  // ==========================================================

  React.useEffect(() => {
    const savedEmail =
      localStorage.getItem(
        "rememberEmail"
      );

    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  // ==========================================================
  // SELECT ROLE
  // ==========================================================

  const selectRole = (selectedRole) => {
    setRole(selectedRole);
    setError("");
  };

  // ==========================================================
  // JSX
  // ==========================================================

  return (
    <div className="login-page">

      {/* ====================================================
          MOBILE POPUP
      ==================================================== */}

      {showMobilePopup && (
        <MobilePopup
          onClose={() =>
            setShowMobilePopup(false)
          }
        />
      )}

      {/* ====================================================
          HEADER
      ==================================================== */}

      <header className="login-header">

        {/* BRAND */}

        <div className="login-brand">

          <div className="brand-icon">
            <FaBookOpen />
          </div>

          <div className="brand-text">
            <h2>ONLINE TUITION</h2>
            <span>
              Learn • Grow • Achieve
            </span>
          </div>

        </div>

        {/* ==================================================
            DESKTOP NAVIGATION
        ================================================== */}

        <nav className="login-navigation">

          {/* HOME */}

          <a
            href="/"
            onClick={closeAllMenus}
          >
            Home
          </a>

          {/* LOGIN */}

          <a
            href="/login"
            className="active"
            onClick={closeAllMenus}
          >
            Login
          </a>

          {/* REGISTER DROPDOWN */}

          <div className="login-register-dropdown">

            <button
              type="button"
              className={`login-register-button ${
                registerMenuOpen ? "open" : ""
              }`}
              onClick={() =>
                setRegisterMenuOpen(
                  (previous) => !previous
                )
              }
              aria-expanded={registerMenuOpen}
            >
              <span>Register</span>

              <FaChevronDown
                className={`login-register-arrow ${
                  registerMenuOpen
                    ? "rotate"
                    : ""
                }`}
              />
            </button>

            {/* REGISTER MENU */}

            {registerMenuOpen && (
              <div className="login-register-menu">

                <a
                  href="/register/teacher"
                  onClick={closeAllMenus}
                >
                  Faculty
                </a>

                <a
                  href="/register/student"
                  onClick={closeAllMenus}
                >
                  Participant
                </a>

              </div>
            )}

          </div>

        </nav>

        {/* ==================================================
            MOBILE HAMBURGER
        ================================================== */}

        <button
          type="button"
          className="mobile-menu-toggle"
          onClick={() => {
            setMobileMenuOpen(
              (previous) => !previous
            );

            setRegisterMenuOpen(false);
          }}
          aria-label="Toggle menu"
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? (
            <FaTimes />
          ) : (
            <FaBars />
          )}
        </button>

      </header>

      {/* ====================================================
          MOBILE NAVIGATION
      ==================================================== */}

      {mobileMenuOpen && (
        <nav className="mobile-nav-dropdown">

          {/* HOME */}

          <a
            href="/"
            onClick={closeAllMenus}
          >
            Home
          </a>

          {/* LOGIN */}

          <a
            href="/login"
            className="active"
            onClick={closeAllMenus}
          >
            Login
          </a>

          {/* MOBILE REGISTER DROPDOWN */}

          <div className="mobile-register-dropdown">

            <button
              type="button"
              className="mobile-register-button"
              onClick={() =>
                setRegisterMenuOpen(
                  (previous) => !previous
                )
              }
              aria-expanded={registerMenuOpen}
            >
              <span>Register</span>

              <FaChevronDown
                className={`login-register-arrow ${
                  registerMenuOpen
                    ? "rotate"
                    : ""
                }`}
              />
            </button>

            {registerMenuOpen && (
              <div className="mobile-register-options">

                <a
                  href="/register/teacher"
                  onClick={closeAllMenus}
                >
                  Teacher
                </a>

                <a
                  href="/register/student"
                  onClick={closeAllMenus}
                >
                  Student
                </a>

              </div>
            )}

          </div>

        </nav>
      )}

      {/* ====================================================
          MAIN CONTENT
      ==================================================== */}

      <main className="login-main">

        {/* ==================================================
            LEFT SIDE
        ================================================== */}

        <section className="login-hero">

          <div className="hero-content">

            <div className="hero-label">
              YOUR LEARNING JOURNEY
            </div>

            <h1>
              Build Your Future
              <br />
              With <span>Education</span>
            </h1>

            <p className="hero-description">
              Join learners around the world and start your
              learning journey with expert faculty,
              interactive classes and real progress.
            </p>

            {/* FEATURES */}

            <div className="hero-features">

              <div className="feature-item">

                <div className="feature-icon purple">
                  <FaBookOpen />
                </div>

                <div>
                  <strong>Quality</strong>
                  <span>Education</span>
                </div>

              </div>

              <div className="feature-item">

                <div className="feature-icon green">
                  <FaGraduationCap />
                </div>

                <div>
                  <strong>Expert</strong>
                  <span>Faculty</span>
                </div>

              </div>

              <div className="feature-item">

                <div className="feature-icon orange">
                  <FaChartLine />
                </div>

                <div>
                  <strong>Track Your</strong>
                  <span>Progress</span>
                </div>

              </div>

              <div className="feature-item">

                <div className="feature-icon blue">
                  <FaUsers />
                </div>

                <div>
                  <strong>Community</strong>
                  <span>Support</span>
                </div>

              </div>

            </div>

            {/* LEARN MORE */}

            <div className="learning-box">

              <div className="learning-box-icon">
                <FaGraduationCap />
              </div>

              <div className="learning-box-content">

                <p>
                  Start learning today and unlock endless
                  possibilities for tomorrow.
                </p>

                <button type="button">
                  Learn More
                  <FaArrowRight />
                </button>

              </div>

            </div>

          </div>

        </section>

        {/* ==================================================
            RIGHT LOGIN SIDE
        ================================================== */}

        <section className="login-panel">

          <div className="login-card">

            <h2 className="login-title">
              <FaGraduationCap className="login-title-icon" />
              Welcome Back!
            </h2>

            <div className="login-title-line"></div>

            <p className="login-subtitle">
              Sign in to continue to your account
            </p>

            {/* ERROR */}

            {error && (
              <div className="login-error">
                {error}
              </div>
            )}

            {/* FORM */}

            <form onSubmit={handleLogin}>

              {/* EMAIL */}

              <div className="input-group">

                <label>EMAIL</label>

                <div className="input-wrapper">

                  <FaEnvelope className="input-icon" />

                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) =>
                      setEmail(e.target.value)
                    }
                    autoComplete="email"
                    required
                  />

                </div>

              </div>

              {/* PASSWORD */}

              <div className="input-group">

                <div className="password-label-row">

                  <label>PASSWORD</label>

                  <button
                    type="button"
                    className="forgot-password"
                    onClick={() =>
                      alert(
                        "Please contact the administrator to reset your password."
                      )
                    }
                  >
                    Forgot Password?
                  </button>

                </div>

                <div className="input-wrapper">

                  <FaLock className="input-icon" />

                  <input
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) =>
                      setPassword(e.target.value)
                    }
                    autoComplete="current-password"
                    required
                  />

                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() =>
                      setShowPassword(
                        !showPassword
                      )
                    }
                    aria-label={
                      showPassword
                        ? "Hide password"
                        : "Show password"
                    }
                  >
                    {showPassword ? (
                      <FaEyeSlash />
                    ) : (
                      <FaEye />
                    )}
                  </button>

                </div>

              </div>

              {/* LOGIN AS */}

              <div className="role-section">

                <label className="role-title">
                  LOGIN AS
                </label>

                <div className="role-options">

                  {/* ADMIN */}

                  <button
                    type="button"
                    className={`role-card ${
                      role === "admin"
                        ? "selected"
                        : ""
                    }`}
                    onClick={() =>
                      selectRole("admin")
                    }
                  >

                    <div className="role-icon">
                      <FaUserShield />
                    </div>

                    <span>Admin</span>

                    {role === "admin" && (
                      <div className="role-check">
                        ✓
                      </div>
                    )}

                  </button>

                  {/* FACULTY */}

                  <button
                    type="button"
                    className={`role-card ${
                      role === "teacher"
                        ? "selected"
                        : ""
                    }`}
                    onClick={() =>
                      selectRole("teacher")
                    }
                  >

                    <div className="role-icon">
                      <FaChalkboardTeacher />
                    </div>

                    <span>Faculty</span>

                    {role === "teacher" && (
                      <div className="role-check">
                        ✓
                      </div>
                    )}

                  </button>

                  {/* PARTICIPANT */}

                  <button
                    type="button"
                    className={`role-card ${
                      role === "student"
                        ? "selected"
                        : ""
                    }`}
                    onClick={() =>
                      selectRole("student")
                    }
                  >

                    <div className="role-icon">
                      <FaUserGraduate />
                    </div>

                    <span>Participant</span>

                    {role === "student" && (
                      <div className="role-check">
                        ✓
                      </div>
                    )}

                  </button>

                </div>

              </div>

              {/* REMEMBER ME */}

              <div className="login-options">

                <label className="remember-me">

                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) =>
                      setRememberMe(
                        e.target.checked
                      )
                    }
                  />

                  <span className="custom-checkbox"></span>

                  Remember me

                </label>

                <button
                  type="button"
                  className="forgot-link"
                  onClick={() =>
                    alert(
                      "Please contact the administrator to reset your password."
                    )
                  }
                >
                  Forgot Password?
                </button>

              </div>

              {/* SIGN IN */}

              <button
                type="submit"
                className="sign-in-button"
                disabled={loading}
              >

                {loading ? (
                  <>
                    <span className="button-spinner"></span>
                    Signing In...
                  </>
                ) : (
                  <>
                    Sign In
                    <FaArrowRight />
                  </>
                )}

              </button>

              {/* DIVIDER */}

              <div className="login-divider">

                <span></span>

                <strong>OR</strong>

                <span></span>

              </div>

              {/* CREATE ACCOUNT */}

              <button
                type="button"
                className="create-account-button"
                onClick={() =>
                  (window.location.href =
                    "/register/student")
                }
              >

                <FaUserPlus />

                Create New Account

              </button>

            </form>

          </div>

        </section>

      </main>

    </div>
  );
};

export default Login;