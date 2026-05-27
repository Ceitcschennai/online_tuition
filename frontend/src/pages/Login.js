import React, { useState } from "react";
import axios from "axios";
import "../styles/login.css";
import { FaLaptop, FaTimes } from "react-icons/fa";
import API_BASE_URL from "../config/api";

// ── Mobile detection ───────────────────────────────────────────────────────────
const isMobileDevice = () => {
  const ua = navigator.userAgent || navigator.vendor || window.opera;
  return /android|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile/i.test(ua)
    || window.innerWidth <= 768;
};

// ── Mobile Popup (student only) ────────────────────────────────────────────────
const MobilePopup = ({ onClose }) => (
  <div style={popupStyles.overlay}>
    <div style={popupStyles.card}>
      <button style={popupStyles.closeBtn} onClick={onClose} aria-label="Close">
        <FaTimes />
      </button>
      <div style={popupStyles.iconRing}>
        <FaLaptop style={{ fontSize: "34px", color: "#fff" }} />
      </div>
      <h2 style={popupStyles.title}>Laptop Required</h2>
      <p style={popupStyles.message}>
        <strong>Student login</strong> is only available on a laptop or desktop
        computer for the best learning experience.
      </p>
      <p style={popupStyles.sub}>
        Teachers and Admins can login on any device.
      </p>
      <button style={popupStyles.btn} onClick={onClose}>Got it!</button>
    </div>
  </div>
);

const popupStyles = {
  overlay: {
    position: "fixed", inset: 0,
    background: "rgba(0,0,0,0.65)",
    backdropFilter: "blur(6px)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 9999, padding: "20px",
  },
  card: {
    background: "#fff", borderRadius: "24px",
    padding: "44px 28px 32px",
    maxWidth: "340px", width: "100%",
    textAlign: "center", position: "relative",
    boxShadow: "0 25px 70px rgba(0,0,0,0.35)",
  },
  closeBtn: {
    position: "absolute", top: "14px", right: "16px",
    background: "none", border: "none",
    fontSize: "17px", color: "#aaa", cursor: "pointer",
  },
  iconRing: {
    width: "78px", height: "78px", borderRadius: "50%",
    background: "linear-gradient(135deg, #667eea, #764ba2)",
    display: "flex", alignItems: "center", justifyContent: "center",
    margin: "0 auto 20px",
    boxShadow: "0 8px 24px rgba(102,126,234,0.45)",
  },
  title: { fontSize: "21px", fontWeight: 700, color: "#1a1a2e", margin: "0 0 10px" },
  message: { fontSize: "14px", color: "#444", lineHeight: 1.65, margin: "0 0 6px" },
  sub: { fontSize: "12px", color: "#999", margin: "0 0 26px" },
  btn: {
    background: "linear-gradient(135deg, #667eea, #764ba2)",
    color: "#fff", border: "none", borderRadius: "50px",
    padding: "13px 0", fontSize: "15px", fontWeight: 600,
    cursor: "pointer", width: "100%",
    boxShadow: "0 6px 20px rgba(102,126,234,0.4)",
  },
};

// ── Login Component ────────────────────────────────────────────────────────────
const Login = () => {
  const [email, setEmail]               = useState("");
  const [password, setPassword]         = useState("");
  const [role, setRole]                 = useState("admin");
  const [error, setError]               = useState("");
  const [showMobilePopup, setShowMobilePopup] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    // 🔒 Block student login on mobile
    if (role === "student" && isMobileDevice()) {
      setShowMobilePopup(true);
      return;
    }

     try {
       const res = await axios.post(
         `${API_BASE_URL}/api/auth/login`,
         { email, password, role }
       );

      localStorage.setItem("token", res.data.token);
localStorage.setItem("userRole", role);
localStorage.setItem("user", JSON.stringify(res.data.user));

if (role === "teacher") {
  localStorage.setItem("teacherId", res.data.user._id);
}

if (role === "admin") {
  window.location.href = "/admin-dashboard";
} else if (role === "teacher") {
  window.location.href = "/teacher-dashboard";
} else {
  window.location.href = "/student-dashboard";
}

    } catch (err) {
      console.error("Login error:", err);
      setError(err.response?.data?.message || "Login failed");
    }
  };

  return (
    <div className="login-page">

      {/* Mobile popup — only fires when role is student */}
      {showMobilePopup && <MobilePopup onClose={() => setShowMobilePopup(false)} />}

      <div className="login-card">

        {/* LEFT SIDE */}
        <div className="login-left">
          <h1>Welcome back!</h1>
          <p>You can sign in to access your existing account.</p>
        </div>

        {/* RIGHT SIDE */}
        <div className="login-right">
          <h2>Login</h2>

          {error && <div className="login-error">{error}</div>}

          {/* Warning badge — visible only for students on mobile */}
          {role === "student" && isMobileDevice() && (
            <div style={warningBadge}>
              ⚠️ Student login requires a laptop or desktop computer.
            </div>
          )}

          <form onSubmit={handleLogin}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            {/* Role dropdown — unchanged from your original */}
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="admin">Admin</option>
              <option value="teacher">Teacher</option>
              <option value="student">Student</option>
            </select>

            <button type="submit">Login</button>

            <h4>Default email: poojagokulan2306@gmail.com</h4>
            <h4>Default password: Pooja@2306</h4>
          </form>
        </div>

      </div>
    </div>
  );
};

const warningBadge = {
  background: "#fff8e1",
  border: "1px solid #ffc107",
  borderRadius: "10px",
  padding: "10px 14px",
  fontSize: "13px",
  color: "#7a5c00",
  marginBottom: "14px",
  textAlign: "center",
};

export default Login;