import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API_BASE_URL from '../config/api';
import '../styles/register.css';
import { FaLaptop, FaTimes } from 'react-icons/fa';

// ── Mobile detection ───────────────────────────────────────────────────────────
const isMobileDevice = () => {
  const ua = navigator.userAgent || navigator.vendor || window.opera;
  return /android|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile/i.test(ua)
    || window.innerWidth <= 768;
};

// ── Mobile Popup ───────────────────────────────────────────────────────────────
const MobilePopup = ({ onClose }) => (
  <div style={popupStyles.overlay}>
    <div style={popupStyles.card}>
      <button style={popupStyles.closeBtn} onClick={onClose} aria-label="Close">
        <FaTimes />
      </button>
      <div style={popupStyles.iconRing}>
        <FaLaptop style={{ fontSize: '34px', color: '#fff' }} />
      </div>
      <h2 style={popupStyles.title}>Laptop Required</h2>
      <p style={popupStyles.message}>
        <strong>Student registration</strong> is only available on a laptop or
        desktop computer for the best experience.
      </p>
      <p style={popupStyles.sub}>
        Please switch to a laptop or desktop to complete your registration.
      </p>
      <button style={popupStyles.btn} onClick={onClose}>Got it!</button>
    </div>
  </div>
);

const popupStyles = {
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.65)',
    backdropFilter: 'blur(6px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 9999, padding: '20px',
  },
  card: {
    background: '#fff', borderRadius: '24px',
    padding: '44px 28px 32px',
    maxWidth: '340px', width: '100%',
    textAlign: 'center', position: 'relative',
    boxShadow: '0 25px 70px rgba(0,0,0,0.35)',
  },
  closeBtn: {
    position: 'absolute', top: '14px', right: '16px',
    background: 'none', border: 'none',
    fontSize: '17px', color: '#aaa', cursor: 'pointer',
  },
  iconRing: {
    width: '78px', height: '78px', borderRadius: '50%',
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    margin: '0 auto 20px',
    boxShadow: '0 8px 24px rgba(102,126,234,0.45)',
  },
  title: { fontSize: '21px', fontWeight: 700, color: '#1a1a2e', margin: '0 0 10px' },
  message: { fontSize: '14px', color: '#444', lineHeight: 1.65, margin: '0 0 6px' },
  sub: { fontSize: '12px', color: '#999', margin: '0 0 26px' },
  btn: {
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    color: '#fff', border: 'none', borderRadius: '50px',
    padding: '13px 0', fontSize: '15px', fontWeight: 600,
    cursor: 'pointer', width: '100%',
    boxShadow: '0 6px 20px rgba(102,126,234,0.4)',
  },
};

// ── StudentRegister Component ──────────────────────────────────────────────────
const StudentRegister = () => {
  const navigate = useNavigate();
  const [showMobilePopup, setShowMobilePopup] = useState(false);

  const [form, setForm] = useState({
    salutation: 'Mr.',
    firstName: '',
    lastName: '',
    mobile: '',
    timezone: '',
    email: '',
    password: '',
    confirmPassword: '',
    class: '',
    group: '',
    syllabus: '',
    emisNumber: '',
    proof: null,
  });

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === 'proof') {
      setForm((prev) => ({ ...prev, proof: files[0] }));
    } else if (name === 'class') {
      setForm((prev) => ({
        ...prev,
        class: value,
        group: value === 'Class 11' || value === 'Class 12' ? prev.group : '',
      }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 🔒 Block student registration on mobile
    if (isMobileDevice()) {
      setShowMobilePopup(true);
      return;
    }

    // Password validation
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;
    if (!passwordRegex.test(form.password)) {
      alert(
        "Password must be at least 8 characters long and include:\n\n" +
        "• 1 Uppercase letter\n• 1 Lowercase letter\n• 1 Number\n• 1 Special character (@$!%*?&)"
      );
      return;
    }

    if (form.password !== form.confirmPassword) {
      alert("Passwords don't match");
      return;
    }

    const formData = new FormData();
    for (const key in form) {
      formData.append(key, form[key]);
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/student/register`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        alert('✅ Registration successful!\n\nPlease wait for admin approval before logging in.');
        setForm({
          salutation: 'Mr.',
          firstName: '', lastName: '', mobile: '', timezone: '',
          email: '', password: '', confirmPassword: '',
          class: '', group: '', syllabus: '', emisNumber: '', proof: null,
        });
        navigate('/login');
    } else {
  console.log(result);

  if (result.errors) {
    const errorMessages = Object.values(result.errors).join("\n");
    alert(`❌ Validation Failed:\n\n${errorMessages}`);
  } else {
    alert(`❌ ${result.message}`);
  }
}
    } catch (error) {
      console.error('Error:', error);
      alert('❌ Registration failed');
    }
  };

  return (
    <div className="register-page">

      {/* Mobile Popup */}
      {showMobilePopup && <MobilePopup onClose={() => setShowMobilePopup(false)} />}

      <div className="register-form">
        <h2>Register as Student</h2>

        {/* Warning banner shown passively on mobile before they even try */}
        {isMobileDevice() && (
          <div style={warningBanner}>
            ⚠️ Student registration is only available on a laptop or desktop computer.
          </div>
        )}

        <form onSubmit={handleSubmit} encType="multipart/form-data">

          <div className="name-fields">
            <input
              type="text"
              name="salutation"
              value={form.salutation}
              onChange={handleChange}
              required
            />
            <input
              type="text"
              name="firstName"
              placeholder="First Name"
              value={form.firstName}
              onChange={handleChange}
              required
            />
            <input
              type="text"
              name="lastName"
              placeholder="Last Name"
              value={form.lastName}
              onChange={handleChange}
              required
            />
          </div>

          <input
            type="tel"
            name="mobile"
            placeholder="Mobile Number"
            value={form.mobile}
            onChange={handleChange}
            required
          />

          <select name="syllabus" value={form.syllabus} onChange={handleChange} required>
            <option value="">Select Syllabus</option>
            <option value="Matric">Matric</option>
            <option value="CBSE">CBSE</option>
            <option value="ICSE">ICSE</option>
            <option value="IGCSE">IGCSE</option>
            <option value="IB">IB</option>
            <option value="State Board">State Board</option>
            <option value="Other">Other</option>
          </select>

          <select name="class" value={form.class} onChange={handleChange} required>
            <option value="">Select Class</option>
            <option value="LKG">LKG</option>
            <option value="UKG">UKG</option>
            {[...Array(12)].map((_, i) => (
              <option key={i + 1} value={`Class ${i + 1}`}>Class {i + 1}</option>
            ))}
          </select>

          {(form.class === 'Class 11' || form.class === 'Class 12') && (
            <select name="group" value={form.group} onChange={handleChange} required>
              <option value="">Select Group</option>
              <option value="Bio-Maths">Bio-Maths</option>
              <option value="Computer Science">Computer Science</option>
              <option value="Commerce">Commerce</option>
              <option value="General">General</option>
            </select>
          )}

          <select name="timezone" value={form.timezone} onChange={handleChange} required>
            <option value="">- Select Timezone -</option>
            <option value="IST">India Standard Time (IST)</option>
            <option value="UTC">UTC</option>
            <option value="EST">Eastern Standard Time (EST)</option>
          </select>

          <input
            type="email"
            name="email"
            placeholder="Email ID"
            value={form.email}
            onChange={handleChange}
            required
          />

          <input
            type="password"
            name="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            required
          />

          <input
            type="password"
            name="confirmPassword"
            placeholder="Confirm Password"
            value={form.confirmPassword}
            onChange={handleChange}
            required
          />

          <input
            type="text"
            name="emisNumber"
            placeholder="Enter EMIS Number"
            value={form.emisNumber}
            onChange={handleChange}
            required
          />

          <label className="file-label">Upload Student ID / Report Card</label>
          <input
            type="file"
            name="proof"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleChange}
            required
          />

          <button type="submit">Register</button>

          <div className="register-footer">
            <div className="login-link">
              <a href="/login">Already a User? Continue Here</a>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
};

const warningBanner = {
  background: '#fff8e1',
  border: '1px solid #ffc107',
  borderRadius: '10px',
  padding: '12px 16px',
  fontSize: '13px',
  color: '#7a5c00',
  marginBottom: '18px',
  textAlign: 'center',
};

export default StudentRegister;