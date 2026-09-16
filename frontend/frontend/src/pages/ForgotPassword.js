import React, { useState } from "react";
import axios from "axios";
import API_BASE_URL from "../config/api";
import "../styles/forgot-password.css";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("student");

  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [step, setStep] = useState(1);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  /* =========================================================
     SEND OTP
  ========================================================= */

  const handleSendOTP = async (e) => {
    e.preventDefault();

    setMessage("");
    setError("");

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    try {
      setLoading(true);

      const response = await axios.post(
        `${API_BASE_URL}/api/auth/forgot-password/send-otp`,
        {
          email,
          role
        }
      );

      setMessage(response.data.message);
      setStep(2);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to send OTP. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  /* =========================================================
     VERIFY OTP
  ========================================================= */

  const handleVerifyOTP = async (e) => {
    e.preventDefault();

    setMessage("");
    setError("");

    if (!otp.trim()) {
      setError("Please enter the OTP.");
      return;
    }

    if (otp.length !== 6) {
      setError("Please enter a valid 6-digit OTP.");
      return;
    }

    try {
      setLoading(true);

      const response = await axios.post(
        `${API_BASE_URL}/api/auth/forgot-password/verify-otp`,
        {
          email,
          role,
          otp
        }
      );

      setMessage(response.data.message);
      setStep(3);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Invalid OTP. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  /* =========================================================
     RESET PASSWORD
  ========================================================= */

  const handleResetPassword = async (e) => {
    e.preventDefault();

    setMessage("");
    setError("");

    if (!newPassword.trim()) {
      setError("Please enter a new password.");
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (!confirmPassword.trim()) {
      setError("Please confirm your new password.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      const response = await axios.post(
        `${API_BASE_URL}/api/auth/forgot-password/reset-password`,
        {
          email,
          role,
          newPassword
        }
      );

      setMessage(response.data.message);
      setStep(4);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to reset password. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  /* =========================================================
     BACK TO LOGIN
  ========================================================= */

  const goToLogin = () => {
    window.location.href = "/login";
  };

  /* =========================================================
     PAGE
  ========================================================= */

  return (
    <div className="forgot-password-page">
      <div className="forgot-password-card">

        {/* =================================================
            STEP 1 - EMAIL
        ================================================= */}

        {step === 1 && (
          <>
            <div className="forgot-password-icon">
              🔐
            </div>

            <h2 className="forgot-password-title">
              Forgot Password?
            </h2>

            <p className="forgot-password-subtitle">
              Enter your registered email address and we'll
              send you an OTP to reset your password.
            </p>

            <form onSubmit={handleSendOTP}>

              <div className="forgot-password-group">
                <label>EMAIL</label>

                <input
                  type="email"
                  placeholder="Enter your registered email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>

              <div className="forgot-password-group">
                <label>RESET PASSWORD FOR</label>

                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  <option value="student">
                    Participant
                  </option>

                  <option value="teacher">
                    Faculty
                  </option>
                </select>
              </div>

              {error && (
                <div className="forgot-password-error">
                  {error}
                </div>
              )}

              {message && (
                <div className="forgot-password-message">
                  {message}
                </div>
              )}

              <button
                type="submit"
                className="forgot-password-send"
                disabled={loading}
              >
                {loading
                  ? "Sending OTP..."
                  : "Send OTP"}
              </button>

            </form>

            <button
              type="button"
              className="forgot-password-back"
              onClick={goToLogin}
            >
              ← Back to Login
            </button>
          </>
        )}

        {/* =================================================
            STEP 2 - VERIFY OTP
        ================================================= */}

        {step === 2 && (
          <>
            <div className="forgot-password-icon">
              🔑
            </div>

            <h2 className="forgot-password-title">
              Verify OTP
            </h2>

            <p className="forgot-password-subtitle">
              Enter the 6-digit OTP sent to your registered
              email address.
            </p>

            <form onSubmit={handleVerifyOTP}>

              <div className="forgot-password-group">
                <label>ENTER OTP</label>

                <input
                  type="text"
                  placeholder="Enter 6-digit OTP"
                  value={otp}
                  onChange={(e) => {
                    const value = e.target.value
                      .replace(/\D/g, "")
                      .slice(0, 6);

                    setOtp(value);
                  }}
                  maxLength="6"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                />
              </div>

              {error && (
                <div className="forgot-password-error">
                  {error}
                </div>
              )}

              {message && (
                <div className="forgot-password-message">
                  {message}
                </div>
              )}

              <button
                type="submit"
                className="forgot-password-send"
                disabled={loading}
              >
                {loading
                  ? "Verifying..."
                  : "Verify OTP"}
              </button>

            </form>

            <button
              type="button"
              className="forgot-password-back"
              onClick={() => {
                setOtp("");
                setError("");
                setMessage("");
                setStep(1);
              }}
            >
              ← Change Email
            </button>
          </>
        )}

        {/* =================================================
            STEP 3 - NEW PASSWORD
        ================================================= */}

        {step === 3 && (
          <>
            <div className="forgot-password-icon">
              🔒
            </div>

            <h2 className="forgot-password-title">
              Create New Password
            </h2>

            <p className="forgot-password-subtitle">
              Create a new password for your account.
            </p>

            <form onSubmit={handleResetPassword}>

              <div className="forgot-password-group">
                <label>NEW PASSWORD</label>

                <input
                  type="password"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) =>
                    setNewPassword(e.target.value)
                  }
                  autoComplete="new-password"
                  required
                />
              </div>

              <div className="forgot-password-group">
                <label>CONFIRM PASSWORD</label>

                <input
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) =>
                    setConfirmPassword(e.target.value)
                  }
                  autoComplete="new-password"
                  required
                />
              </div>

              {error && (
                <div className="forgot-password-error">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="forgot-password-send"
                disabled={loading}
              >
                {loading
                  ? "Resetting..."
                  : "Reset Password"}
              </button>

            </form>

            <button
              type="button"
              className="forgot-password-back"
              onClick={goToLogin}
            >
              ← Back to Login
            </button>
          </>
        )}

        {/* =================================================
            STEP 4 - SUCCESS
        ================================================= */}

        {step === 4 && (
          <>
            <div className="forgot-password-icon">
              ✓
            </div>

            <h2 className="forgot-password-title">
              Password Reset Successfully
            </h2>

            <p className="forgot-password-subtitle">
              Your password has been changed successfully.
              You can now login using your new password.
            </p>

            {message && (
              <div className="forgot-password-message">
                {message}
              </div>
            )}

            <button
              type="button"
              className="forgot-password-send"
              onClick={goToLogin}
            >
              Go to Login
            </button>
          </>
        )}

      </div>
    </div>
  );
};

export default ForgotPassword;