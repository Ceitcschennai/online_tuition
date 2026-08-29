import { useRef } from "react";
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from "react-router-dom";
import API_BASE_URL from "../config/api";
import '../styles/home.css';
import { MdMenuBook } from 'react-icons/md';
import { FaChalkboardTeacher, FaVideo } from 'react-icons/fa';
import Footer from '../components/Footer';

import hero1 from '../assets/HeroBanner.jpg';
import hero2 from '../assets/HeroBanner2.jpg';
import hero3 from '../assets/HeroBanner3.jpg';

// ─── Known subjects (must match the keys used in SubjectDetails.js) ──────────
const KNOWN_SUBJECTS = [
  'English', 'Tamil', 'Maths', 'Science', 'Social',
  'Physics', 'Chemistry', 'Botany', 'Zoology', 'Accounts', 'Economics',
];

// Resolves free-typed search text to a canonical subject name.
// Requires the FULL subject name to be typed (case/whitespace-insensitive only).
// e.g. "tamil", "TAMIL", " Tamil " -> "Tamil". A single letter like "t" will NOT match.
// Returns null if there is no exact full-name match.
const resolveSubject = (rawText) => {
  const query = rawText.trim().toLowerCase();
  if (!query) return null;

  const exact = KNOWN_SUBJECTS.find((s) => s.toLowerCase() === query);
  return exact || null;
};

// ─── Salutation normalizer ────────────────────────────────────────────────────
const normalizeSalutation = (val) => {
  if (!val) return val;
  const map = {
    'mr': 'Mr.', 'mr.': 'Mr.',
    'ms': 'Ms.', 'ms.': 'Ms.',
    'mrs': 'Mrs.', 'mrs.': 'Mrs.',
    'dr': 'Dr.', 'dr.': 'Dr.',
  };
  return map[val.trim().toLowerCase()] || val.trim();
};

// ─── ROLES config ─────────────────────────────────────────────────────────────
const ROLES = {
  student: {
    label: 'Student',
    fields: [
      { key: 'salutation',      backendKey: 'salutation',      label: 'Title (Mr/Ms)',    type: 'select',   options: ['Mr.','Ms.','Mrs.','Dr.'],  required: true },
      { key: 'firstName',       backendKey: 'firstName',       label: 'First Name',       type: 'text',     required: true },
      { key: 'lastName',        backendKey: 'lastName',        label: 'Last Name',        type: 'text',     required: true },
      { key: 'mobile',          backendKey: 'mobile',          label: 'Mobile Number',    type: 'tel',      required: true },
      { key: 'syllabus',        backendKey: 'syllabus',        label: 'Syllabus',         type: 'select',   options: ['State Board','CBSE','ICSE','Matriculation'], required: true },
      { key: 'studentClass',    backendKey: 'class',           label: 'Class',            type: 'select',   options: ['1st','2nd','3rd','4th','5th','6th','7th','8th','9th','10th','11th','12th'], required: true },
      { key: 'timezone',        backendKey: 'timezone',        label: 'Timezone',         type: 'select',   options: ['Asia/Kolkata','Asia/Dubai','Europe/London','America/New_York','America/Los_Angeles'], required: true },
      { key: 'email',           backendKey: 'email',           label: 'Email ID',         type: 'email',    required: true },
      { key: 'password',        backendKey: 'password',        label: 'Password',         type: 'password', required: true },
      { key: 'confirmPassword', backendKey: 'confirmPassword', label: 'Confirm Password', type: 'password', required: true },
      { key: 'emisNumber',      backendKey: 'emisNumber',      label: 'EMIS Number',      type: 'text',     required: true },
    ],
    endpoint: '/api/student/register',
    hint: 'Mr., Ravi, Kumar, 9876543210, State Board, 10th, Asia/Kolkata, ravi@email.com, Pass@123, Pass@123, 123456',
  },
  teacher: {
    label: 'Teacher',
    fields: [
      { key: 'salutation',       backendKey: 'salutation',       label: 'Title (Mr/Ms)',     type: 'select',   options: ['Mr.','Ms.','Mrs.','Dr.'],  required: true },
      { key: 'firstName',        backendKey: 'firstName',        label: 'First Name',        type: 'text',     required: true },
      { key: 'lastName',         backendKey: 'lastName',         label: 'Last Name',         type: 'text',     required: true },
      { key: 'mobile',           backendKey: 'mobile',           label: 'Mobile Number',     type: 'tel',      required: true },
      { key: 'timezone',         backendKey: 'timezone',         label: 'Timezone',          type: 'select',   options: ['Asia/Kolkata','Asia/Dubai','Europe/London','America/New_York','America/Los_Angeles'], required: true },
      { key: 'qualification',    backendKey: 'qualification',    label: 'Qualification',     type: 'select',   options: ['B.Ed','M.Ed','B.Sc','M.Sc','B.A','M.A','Ph.D','Other'], required: true },
      { key: 'email',            backendKey: 'email',            label: 'Email ID',          type: 'email',    required: true },
      { key: 'password',         backendKey: 'password',         label: 'Password',          type: 'password', required: true },
      { key: 'confirmPassword',  backendKey: 'confirmPassword',  label: 'Confirm Password',  type: 'password', required: true },
      { key: 'preferredSubject', backendKey: 'preferredSubject', label: 'Preferred Subject', type: 'text',     required: true },
    ],
    endpoint: '/api/teachers/register',
    hint: 'Mr., Arjun, Sharma, 9876543210, Asia/Kolkata, B.Ed, arjun@email.com, Pass@123, Pass@123, Maths',
  },
};

// ─── CreatedUserCard — left panel shown after successful creation ──────────────
const CreatedUserCard = ({ user, role, onDismiss }) => {
  const initials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase();
  const isStudent = role === 'student';

  const rows = [
    { icon: '📧', label: 'Email',    value: user.email },
    { icon: '📱', label: 'Mobile',   value: user.mobile },
    isStudent && { icon: '📚', label: 'Syllabus', value: user.syllabus },
    isStudent && { icon: '🏫', label: 'Class',    value: user.studentClass },
    isStudent && { icon: '🆔', label: 'EMIS No.', value: user.emisNumber },
    !isStudent && { icon: '🎓', label: 'Qual.',   value: user.qualification },
    !isStudent && { icon: '📖', label: 'Subject', value: user.preferredSubject },
    { icon: '🌍', label: 'Timezone', value: user.timezone },
    { icon: '🕐', label: 'Created',  value: user.createdAt },
  ].filter(Boolean);

  return (
    <div className="cuc-card">
      <div className="cuc-ribbon">
        {isStudent ? '🎓 Student' : '📚 Teacher'} Created Successfully
      </div>
      <div className="cuc-avatar-wrap">
        <div className="cuc-avatar">{initials}</div>
        <div className="cuc-badge-check">✓</div>
      </div>
      <div className="cuc-name">
        {user.salutation} {user.firstName} {user.lastName}
      </div>
      <div className="cuc-status-badge">⏳ Pending Admin Approval</div>
      <div className="cuc-details">
        {rows.map((row, i) => (
          <div key={i} className="cuc-row">
            <span className="cuc-row-icon">{row.icon}</span>
            <span className="cuc-row-label">{row.label}</span>
            <span className="cuc-row-value">{row.value}</span>
          </div>
        ))}
        {user.fileName && (
          <div className="cuc-row">
            <span className="cuc-row-icon">📄</span>
            <span className="cuc-row-label">{isStudent ? 'ID Proof' : 'Cert.'}</span>
            <span className="cuc-row-value cuc-file">{user.fileName}</span>
          </div>
        )}
      </div>
      <button className="cuc-dismiss" onClick={onDismiss}>✕ Dismiss</button>
    </div>
  );
};

// ─── AI Validation Agent — calls agents.js via backend (all 4 agents) ─────────
// Live typing  → POST /api/validate/partial  → agents.js handlePartialValidation()
//                                              → AIValidationAgent.validatePartial()
// Validate btn → POST /api/validate/full     → agents.js handleRegistration()
//                                              → AIValidationAgent.validate()
// Create btn   → POST /api/student/register  → agents.js handleRegistration()
//                                              → AIValidationAgent.validate()
//                                              → ActionAgent.createTask()
//                                              → AnalyticsAgent.logInteraction()
//                                              → KnowledgeAgent.getCustomer() [post-save]
const AIValidationAgent = {

  // Called on every keystroke (debounced 800ms) — hits AIValidationAgent.validatePartial()
  validate: async (role, filledFields, hasFile = false) => {
    const response = await fetch(`${API_BASE_URL}/api/validate/partial`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, fields: filledFields, hasFile }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || `Agent validation error: ${response.status}`);
    }
    return await response.json();
    // agents.js: handlePartialValidation() → AIValidationAgent.validatePartial()
    // returns: { errors: { fieldName: null | "error message" } }
  },

  // Called by the Validate button — hits AIValidationAgent.validate() (full)
  validateFull: async (role, payload, hasFile = false) => {
    const response = await fetch(`${API_BASE_URL}/api/validate/full`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, payload, hasFile }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || `Agent full-validation error: ${response.status}`);
    }
    return await response.json();
    // agents.js: handleRegistration() → AIValidationAgent.validate()
    // returns: { valid, errors, normalized, summary }
  },
};
// ─── Fallback local validators (used if AI is unavailable) ────────────────────
const VALIDATORS = {
  salutation: (v) => {
    if (!v || !v.trim()) return 'Title is required';
    const ok = ['Mr.', 'Ms.', 'Mrs.', 'Dr.'];
    const norm = normalizeSalutation(v);
    return ok.includes(norm) ? null : 'Must be one of: Mr., Ms., Mrs., Dr.';
  },
  firstName: (v) => {
    if (!v || !v.trim()) return 'First name is required';
    if (v.trim().length < 2) return 'At least 2 characters';
    if (!/^[A-Za-z\s]+$/.test(v.trim())) return 'Only letters allowed';
    return null;
  },
  lastName: (v) => {
    if (!v || !v.trim()) return 'Last name is required';
    if (v.trim().length < 2) return 'At least 2 characters';
    if (!/^[A-Za-z\s]+$/.test(v.trim())) return 'Only letters allowed';
    return null;
  },
  mobile: (v) => {
    if (!v || !v.trim()) return 'Mobile number is required';
    if (!/^\d{10}$/.test(v.trim())) return 'Must be exactly 10 digits';
    if (/^0/.test(v.trim())) return 'Must not start with 0';
    return null;
  },
  syllabus:         (v) => (!v || !v.trim() ? 'Syllabus is required' : null),
  studentClass:     (v) => (!v || !v.trim() ? 'Class is required' : null),
  timezone:         (v) => (!v || !v.trim() ? 'Timezone is required' : null),
  qualification:    (v) => (!v || !v.trim() ? 'Qualification is required' : null),
  email: (v) => {
    if (!v || !v.trim()) return 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())) return 'Invalid email format';
    if (v.includes('gmail.con')) return 'Did you mean gmail.com?';
    return null;
  },
  password: (v) => {
    if (!v) return 'Password is required';
    if (v.length < 8) return 'Minimum 8 characters';
    if (!/[A-Z]/.test(v)) return 'Need at least one uppercase letter';
    if (!/[a-z]/.test(v)) return 'Need at least one lowercase letter';
    if (!/\d/.test(v)) return 'Need at least one number';
    if (!/[@$!%*?&]/.test(v)) return 'Need at least one special char (@$!%*?&)';
    return null;
  },
  confirmPassword: (v, all) => {
    if (!v) return 'Please confirm your password';
    if (v !== all.password) return 'Passwords do not match';
    return null;
  },
  preferredSubject: (v) => {
    if (!v || !v.trim()) return 'Subject is required';
    if (v.trim().length < 2) return 'At least 2 characters';
    return null;
  },
  emisNumber: (v) => {
    if (!v || !v.trim()) return 'EMIS number is required';
    if (v.trim().length < 4) return 'At least 4 characters';
    return null;
  },
};

const runLocalValidation = (fields, parsedData, role, file) => {
  const errors = {};
  fields.forEach((field) => {
    const validator = VALIDATORS[field.key];
    errors[field.key] = validator ? validator(parsedData[field.key], parsedData) : null;
  });
  if (role === 'student') errors['_file'] = file ? null : 'Student proof required';
  else errors['_file'] = null;
  return errors;
};

// ─── AdminQuickCreate component ───────────────────────────────────────────────
const AdminQuickCreate = () => {
  const [role, setRole]               = useState('student');
  const [inputText, setInputText]     = useState('');
  const [parsedData, setParsedData]   = useState({});
  const [certFile, setCertFile]       = useState(null);
  const [loading, setLoading]         = useState(false);
  const [message, setMessage]         = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [validated, setValidated]     = useState(false);
  const [createdUser, setCreatedUser] = useState(null);

  // AI validation state
  const [isAiValidating, setIsAiValidating]   = useState(false);
  const [aiStatusText, setAiStatusText]       = useState('');
  const [showAiStatus, setShowAiStatus]       = useState(false);
  const debounceRef = useRef(null);

  const config = ROLES[role];

  useEffect(() => {
    setInputText('');
    setParsedData({});
    setMessage(null);
    setCertFile(null);
    setFieldErrors({});
    setValidated(false);
    setIsAiValidating(false);
    setShowAiStatus(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, [role]);

  // ── AI validation via Anthropic API ──────────────────────────────────────────
  const runAiValidation = useCallback(async (data, file) => {
    const filledFields = {};
    config.fields.forEach(f => {
      if (data[f.key] && data[f.key].trim()) {
        filledFields[f.key] = data[f.key];
      }
    });

    if (Object.keys(filledFields).length === 0) {
      setIsAiValidating(false);
      setShowAiStatus(false);
      return;
    }

    setIsAiValidating(true);
    setShowAiStatus(true);
    setAiStatusText('AI is validating your fields...');

    try {
      const result = await AIValidationAgent.validate(role, filledFields, !!file);

      // Merge AI errors back — only for filled fields
      const newErrors = {};
      config.fields.forEach(f => {
        if (data[f.key] && data[f.key].trim()) {
          // Field is filled — use AI result
          newErrors[f.key] = result.errors?.[f.key] !== undefined
            ? result.errors[f.key]
            : null;
        } else {
          // Field is empty — stay neutral (undefined)
          newErrors[f.key] = undefined;
        }
      });

      // File validation
      if (role === 'student') {
        newErrors['_file'] = file ? null : undefined; // don't show file error until submit attempt
      } else {
        newErrors['_file'] = null;
      }

      setFieldErrors(newErrors);
      setValidated(true);

      const validCount   = Object.values(newErrors).filter(e => e === null).length;
      const invalidCount = Object.values(newErrors).filter(e => e && e !== null && e !== undefined).length;

      setAiStatusText(`✓ AI checked ${validCount + invalidCount} field(s) — ${validCount} valid, ${invalidCount} invalid`);
      setTimeout(() => setShowAiStatus(false), 2500);

    } catch (err) {
      console.error('AI validation failed, falling back to local:', err);
      // Fallback: run local validators only for filled fields
      const newErrors = {};
      config.fields.forEach(f => {
        if (data[f.key] && data[f.key].trim()) {
          const validator = VALIDATORS[f.key];
          newErrors[f.key] = validator ? validator(data[f.key], data) : null;
        } else {
          newErrors[f.key] = undefined;
        }
      });
      if (role === 'student') newErrors['_file'] = file ? null : undefined;
      else newErrors['_file'] = null;

      setFieldErrors(newErrors);
      setValidated(true);
      setAiStatusText('⚠ Using local validation (AI unavailable)');
      setTimeout(() => setShowAiStatus(false), 2500);
    }

    setIsAiValidating(false);
  }, [config, role]);

  // ── Handle textarea input with debounced AI validation ────────────────────────
  const handleInput = (val) => {
    setInputText(val);

    const parts = val.split(',').map(s => s.trim());
    const data = {};
    config.fields.forEach((field, index) => {
      data[field.key] = parts[index] || '';
    });

    setParsedData(data);
    setMessage(null);

    // Immediately mark all filled fields as "checking" so tags show pending state
    const checkingErrors = {};
    config.fields.forEach(f => {
      checkingErrors[f.key] = data[f.key] && data[f.key].trim() ? '__checking__' : undefined;
    });
    setFieldErrors(checkingErrors);
    setValidated(false);

    // Clear any previous debounce
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const hasAnyFilled = config.fields.some(f => data[f.key] && data[f.key].trim());

    if (hasAnyFilled) {
      setShowAiStatus(true);
      setAiStatusText('AI is validating your fields...');
      // Debounce: wait 800ms after user stops typing before calling AI
      debounceRef.current = setTimeout(() => {
        runAiValidation(data, certFile);
      }, 800);
    } else {
      setShowAiStatus(false);
      setFieldErrors({});
      setValidated(false);
    }
  };

const handleValidate = async () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    setIsAiValidating(true);
    setShowAiStatus(true);
    setAiStatusText('AI is validating all fields...');

    try {
      // Calls agents.js → handleRegistration() → AIValidationAgent.validate()
      const result = await AIValidationAgent.validateFull(role, parsedData, !!certFile);

      // Map full validation errors back to field keys
      const newErrors = {};
      config.fields.forEach(f => {
        newErrors[f.key] = result.errors?.[f.key] !== undefined ? result.errors[f.key] : null;
      });
      newErrors['_file'] = result.errors?.['_file'] !== undefined
        ? result.errors['_file']
        : (role === 'student' ? (certFile ? null : 'Student proof required') : null);

      setFieldErrors(newErrors);
      setValidated(true);

      const hasErrors = Object.values(newErrors).some(e => e !== null && e !== undefined);
      const count = Object.values(newErrors).filter(e => e !== null && e !== undefined).length;

      setAiStatusText(hasErrors
        ? `✕ ${count} field(s) invalid — fix the red tags above`
        : '✓ All fields valid — ready to create!'
      );
      setTimeout(() => setShowAiStatus(false), 2500);

      if (!hasErrors) {
        setMessage({ type: 'success', text: `✓ All fields valid! ${result.summary || ''}` });
      } else {
        setMessage({ type: 'error', text: `✕ ${count} field(s) are invalid — fix the red tags above.` });
      }

    } catch (err) {
      // Fallback to local if agent is down
      console.error('Full agent validation failed, using local fallback:', err);
      const errors = runLocalValidation(config.fields, parsedData, role, certFile);
      setFieldErrors(errors);
      setValidated(true);
      const hasErrors = Object.values(errors).some(e => e !== null && e !== undefined);
      const count = Object.values(errors).filter(e => e !== null && e !== undefined).length;
      setAiStatusText('⚠ Using local validation (agent unavailable)');
      setTimeout(() => setShowAiStatus(false), 2500);
      setMessage({
        type: hasErrors ? 'error' : 'success',
        text: hasErrors
          ? `✕ ${count} field(s) are invalid — fix the red tags above.`
          : '✓ All fields are valid! You can now create the user.',
      });
    }

    setIsAiValidating(false);
  };

  // Determine if form is fully valid and ready to create
  const allFieldsValid = validated &&
    config.fields.every(f => fieldErrors[f.key] === null) &&
    (role === 'teacher' || certFile) &&
    !isAiValidating;

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleValidate();
    }
  };

  // ── Create ──
  const handleCreate = async () => {
    // Run a final full validation before submitting
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const errors = runLocalValidation(config.fields, parsedData, role, certFile);
    setFieldErrors(errors);
    setValidated(true);
    if (Object.values(errors).some(e => e !== null && e !== undefined)) {
      setMessage({ type: 'error', text: 'Please fix all invalid fields before creating.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    const formData = new FormData();
    config.fields.forEach((f) => {
      if (f.key === 'confirmPassword') return;
      if (parsedData[f.key] !== undefined && parsedData[f.key] !== '') {
        const value = f.key === 'salutation'
          ? normalizeSalutation(parsedData[f.key])
          : parsedData[f.key];
        formData.append(f.backendKey, value);
      }
    });
    if (role === 'student' && certFile) formData.append('proof', certFile);
    else if (role === 'teacher' && certFile) formData.append('degreeCertificate', certFile);

    try {
      const res  = await fetch(`${API_BASE_URL}${config.endpoint}`, { method: 'POST', body: formData });
      const data = await res.json();

      if (res.ok) {
        setCreatedUser({
          ...parsedData,
          salutation: normalizeSalutation(parsedData.salutation),
          role,
          fileName: certFile?.name || null,
          createdAt: new Date().toLocaleString('en-IN'),
        });
        setMessage({ type: 'success', text: `✓ ${config.label} created successfully!` });
        setInputText('');
        setParsedData({});
        setCertFile(null);
        setFieldErrors({});
        setValidated(false);
      } else {
        setMessage({ type: 'error', text: data.message || 'Something went wrong.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error — is your backend running?' });
    } finally {
      setLoading(false);
    }
  };

  // ── Tag status helper ──
  // Returns 'checking' | 'valid' | 'invalid' | 'neutral'
  const tagStatus = (fieldKey) => {
    const err = fieldErrors[fieldKey];
    if (err === '__checking__') return 'checking';
    if (!validated && err === undefined) return 'neutral';
    if (err === null) return 'valid';
    if (err) return 'invalid';
    return 'neutral';
  };

  const filledCount  = config.fields.filter(f => parsedData[f.key] && parsedData[f.key].trim()).length + (certFile ? 1 : 0);
  const totalCount   = config.fields.length + 1;
  const validCount   = Object.values(fieldErrors).filter(e => e === null).length;
  const invalidCount = Object.values(fieldErrors).filter(e => e && e !== null && e !== undefined && e !== '__checking__').length;

  return (
    <>
      <style>{`
        /* ══ Layout ══ */
        .aqc-layout {
          display: flex;
          gap: 28px;
          align-items: flex-start;
        }
        .aqc-left  { flex: 0 0 290px; min-width: 260px; }
        .aqc-right { flex: 1; min-width: 0; }
        @media (max-width: 820px) {
          .aqc-layout          { flex-direction: column-reverse; }
          .aqc-left            { flex: unset; width: 100%; }
        }

        /* ══ Created User Card ══ */
        .cuc-card {
          background: #fff;
          border-radius: 18px;
          border: 2px solid #28a745;
          box-shadow: 0 6px 28px rgba(40,167,69,.13);
          overflow: hidden;
          animation: cuc-in .35s cubic-bezier(.22,1,.36,1);
        }
        @keyframes cuc-in {
          from { opacity: 0; transform: translateX(-22px) scale(.97); }
          to   { opacity: 1; transform: translateX(0) scale(1); }
        }
        .cuc-ribbon {
          background: linear-gradient(90deg, #28a745 0%, #20c997 100%);
          color: #fff;
          font-size: 0.75rem;
          font-weight: 700;
          padding: 8px 16px;
          letter-spacing: .05em;
          text-transform: uppercase;
        }
        .cuc-avatar-wrap {
          display: flex;
          justify-content: center;
          padding: 22px 0 8px;
          position: relative;
        }
        .cuc-avatar {
          width: 68px; height: 68px; border-radius: 50%;
          background: linear-gradient(135deg, #6c63ff 0%, #a78bfa 100%);
          color: #fff; font-size: 1.6rem; font-weight: 700;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 4px 16px rgba(108,99,255,.3);
        }
        .cuc-badge-check {
          position: absolute;
          top: 18px; left: calc(50% + 22px);
          background: #28a745; color: #fff;
          border-radius: 50%;
          width: 22px; height: 22px;
          font-size: 0.72rem; font-weight: 800;
          display: flex; align-items: center; justify-content: center;
          border: 2px solid #fff;
          box-shadow: 0 2px 6px rgba(40,167,69,.4);
        }
        .cuc-name {
          text-align: center;
          font-size: 1.05rem; font-weight: 700;
          color: #1a1a2e;
          padding: 2px 16px 4px;
        }
        .cuc-status-badge {
          text-align: center;
          display: block;
          margin: 4px auto 0;
          width: fit-content;
          font-size: 0.72rem; font-weight: 600;
          color: #b45309;
          background: #fef9c3;
          border: 1px solid #fde68a;
          padding: 3px 12px;
          border-radius: 99px;
        }
        .cuc-details {
          margin-top: 14px;
          border-top: 1px solid #f0f0f0;
        }
        .cuc-row {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          padding: 7px 14px;
          border-bottom: 1px solid #f7f7f7;
          font-size: 0.79rem;
        }
        .cuc-row:last-child { border-bottom: none; }
        .cuc-row-icon  { flex-shrink: 0; margin-top: 1px; }
        .cuc-row-label { color: #999; font-weight: 600; flex: 0 0 68px; }
        .cuc-row-value { color: #333; font-weight: 500; word-break: break-all; line-height: 1.4; }
        .cuc-file      { color: #6c63ff; font-style: italic; }
        .cuc-dismiss {
          display: block;
          width: calc(100% - 28px);
          margin: 10px 14px 14px;
          padding: 8px;
          border: 1.5px solid #dc354544;
          background: #fff5f5;
          color: #dc3545;
          border-radius: 8px;
          cursor: pointer;
          font-size: 0.82rem; font-weight: 600;
          transition: all .18s;
        }
        .cuc-dismiss:hover { background: #dc3545; color: #fff; border-color: #dc3545; }

        .cuc-empty {
          border: 2px dashed #e2e8f0;
          border-radius: 18px;
          padding: 40px 20px;
          text-align: center;
          color: #c0c0c0;
          font-size: 0.82rem;
          line-height: 1.8;
          background: #fafafa;
        }
        .cuc-empty-icon { font-size: 2.4rem; display: block; margin-bottom: 10px; opacity: .5; }

        /* ══ AI badge ══ */
        .aqc-ai-badge {
          display: inline-flex; align-items: center; gap: 6px;
          background: linear-gradient(135deg, #6c63ff, #a78bfa);
          color: #fff; font-size: 0.72rem; font-weight: 700;
          padding: 3px 11px; border-radius: 99px;
          letter-spacing: .04em; margin-bottom: 14px;
        }

        /* ══ AI status bar ══ */
        .aqc-ai-status {
          display: flex; align-items: center; gap: 8px;
          padding: 7px 12px; border-radius: 8px;
          background: #f0eeff; border: 1px solid #c4b8ff;
          font-size: 0.78rem; font-weight: 600; color: #6c63ff;
          margin-bottom: 10px;
          animation: fade-in .2s ease;
        }
        @keyframes fade-in { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
        .aqc-ai-dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: #6c63ff;
          animation: ai-pulse 1s ease-in-out infinite;
          flex-shrink: 0;
        }
        @keyframes ai-pulse {
          0%,100% { opacity: 1; transform: scale(1); }
          50%      { opacity: .35; transform: scale(.65); }
        }

        /* ══ Role buttons ══ */
        .aqc-role-row { display: flex; gap: 12px; margin-bottom: 18px; }
        .aqc-role-btn {
          flex: 1; padding: 10px 18px; border-radius: 10px; border: 2px solid #e0e0e0;
          background: #fff; cursor: pointer; font-size: 0.95rem; font-weight: 600;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          transition: all .2s;
        }
        .aqc-role-btn.active { background: #6c63ff; color: #fff; border-color: #6c63ff; }
        .aqc-role-icon { font-size: 1.1rem; }

        /* ══ Tags ══ */
        .aqc-tags { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 14px; }
        .aqc-tag {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 5px 11px; border-radius: 20px; font-size: 0.78rem; font-weight: 600;
          border: 1.5px solid #d0d0d0; background: #f5f5f5; color: #555;
          transition: all .25s; cursor: default; position: relative;
        }
        .aqc-tag.filled { background: #eef0ff; border-color: #6c63ff; color: #4b44cc; }

        /* Checking state — yellow/amber (AI is working) */
        .aqc-tag.tag-checking {
          background: #fffbeb !important;
          border-color: #f59e0b !important;
          color: #92400e !important;
          animation: tag-checking-pulse 1s ease-in-out infinite !important;
        }
        .aqc-tag.tag-checking::after { content: ' ···'; font-weight: 800; letter-spacing: 1px; }
        @keyframes tag-checking-pulse {
          0%,100% { opacity: 1; }
          50%      { opacity: .6; }
        }

        /* Valid — green */
        .aqc-tag.tag-valid {
          background: #e8f8ee !important;
          border-color: #28a745 !important;
          color: #176832 !important;
          animation: tag-pop .25s cubic-bezier(.22,1,.36,1);
        }
        .aqc-tag.tag-valid::after { content: ' ✓'; font-weight: 800; }
        @keyframes tag-pop {
          0%   { transform: scale(.92); }
          60%  { transform: scale(1.06); }
          100% { transform: scale(1); }
        }

        /* Invalid — red */
        .aqc-tag.tag-invalid {
          background: #fff0f0 !important;
          border-color: #dc3545 !important;
          color: #b02030 !important;
          animation: aqc-shake .3s ease;
        }
        .aqc-tag.tag-invalid::after { content: ' ✗'; font-weight: 800; }

        /* Error tooltip on hover */
        .aqc-tag.tag-invalid:hover::before {
          content: attr(data-error);
          position: absolute; bottom: calc(100% + 7px); left: 50%; transform: translateX(-50%);
          background: #dc3545; color: #fff; padding: 5px 11px; border-radius: 7px;
          font-size: 0.72rem; font-weight: 500; white-space: nowrap; z-index: 200;
          pointer-events: none; box-shadow: 0 3px 10px rgba(220,53,69,.3);
        }
        @keyframes aqc-shake {
          0%,100% { transform: translateX(0); }
          25%      { transform: translateX(-5px); }
          75%      { transform: translateX(5px); }
        }
        .aqc-tag-val { font-weight: 400; opacity: .8; }

        /* ══ Input box ══ */
        .aqc-box { border: 1.5px solid #ddd; border-radius: 14px; padding: 14px; background: #fff; }
        .aqc-box.has-error { border-color: #dc3545; }
        .aqc-textarea {
          width: 100%; min-height: 90px; border: none; outline: none; resize: vertical;
          font-size: 0.9rem; font-family: inherit; line-height: 1.6; background: transparent;
          box-sizing: border-box;
        }

        /* ══ File row ══ */
        .aqc-file-row { display: flex; align-items: center; gap: 10px; margin-top: 10px; flex-wrap: wrap; }
        .aqc-file-label {
          display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px;
          border-radius: 8px; border: 1.5px dashed #aaa; cursor: pointer; font-size: 0.82rem;
          background: #fafafa; transition: all .2s;
        }
        .aqc-file-label:hover { border-color: #6c63ff; background: #f0eeff; }
        .aqc-file-required { color: #dc3545; font-size: 0.75rem; }
        .aqc-file-input  { display: none; }
        .aqc-file-info   { display: flex; align-items: center; gap: 7px; }
        .aqc-file-name   { font-size: 0.82rem; color: #28a745; font-weight: 600; }
        .aqc-file-remove {
          background: none; border: none; cursor: pointer; color: #999;
          font-size: 1rem; line-height: 1; transition: color .15s;
        }
        .aqc-file-remove:hover { color: #dc3545; }

        /* ══ Footer ══ */
        .aqc-box-footer { margin-top: 12px; }
        .aqc-progress-wrap {
          height: 5px; background: #e9ecef; border-radius: 99px; overflow: hidden; margin-bottom: 10px;
        }
        .aqc-progress-bar { height: 100%; background: #6c63ff; border-radius: 99px; transition: width .3s; }
        .aqc-footer-row   { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
        .aqc-count        { font-size: 0.8rem; color: #888; }
        .aqc-btn-group    { display: flex; gap: 10px; align-items: center; }

        .aqc-validate-btn {
          padding: 9px 20px; border-radius: 8px; border: 2px solid #6c63ff;
          background: transparent; color: #6c63ff; font-weight: 700; font-size: 0.88rem;
          cursor: pointer; transition: all .2s;
        }
        .aqc-validate-btn:hover { background: #6c63ff; color: #fff; }

        .aqc-create-btn {
          padding: 9px 22px; border-radius: 8px; border: none;
          background: #6c63ff; color: #fff; font-weight: 700; font-size: 0.88rem;
          cursor: pointer; transition: all .2s;
        }
        .aqc-create-btn:disabled { opacity: .42; cursor: not-allowed; }
        .aqc-create-btn:not(:disabled):hover { background: #5549e0; transform: translateY(-1px); }

        /* ══ Validation summary bar ══ */
        .aqc-val-summary {
          display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
          margin-top: 12px; padding: 10px 14px; border-radius: 10px;
          font-size: 0.83rem; font-weight: 600;
        }
        .aqc-val-summary.all-valid   { background: #e8f8ee; color: #176832; border: 1.5px solid #28a745; }
        .aqc-val-summary.has-invalid { background: #fff0f0; color: #b02030; border: 1.5px solid #dc3545; }
        .aqc-val-pill {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 3px 10px; border-radius: 99px; font-size: 0.78rem;
        }
        .aqc-val-pill.good { background: #28a745; color: #fff; }
        .aqc-val-pill.bad  { background: #dc3545; color: #fff; }

        /* ══ Messages ══ */
        .aqc-message { margin-top: 12px; padding: 10px 14px; border-radius: 9px; font-size: 0.88rem; font-weight: 600; }
        .aqc-message--success { background: #e8f8ee; color: #176832; border: 1.5px solid #28a745; }
        .aqc-message--error   { background: #fff0f0; color: #b02030; border: 1.5px solid #dc3545; }

        /* ══ Guide ══ */
        .aqc-guide         { margin-top: 16px; font-size: 0.82rem; }
        .aqc-guide summary { cursor: pointer; color: #6c63ff; font-weight: 600; }
        .aqc-guide-list    { padding-left: 20px; margin-top: 8px; line-height: 1.9; }
        .aqc-req-star      { color: #dc3545; }
        .aqc-opt-text      { color: #888; }
      `}</style>

      <div className="aqc-layout">

        {/* ══ LEFT — Created user card ══ */}
        <div className="aqc-left">
          {createdUser ? (
            <CreatedUserCard
              user={createdUser}
              role={createdUser.role}
              onDismiss={() => setCreatedUser(null)}
            />
          ) : (
            <div className="cuc-empty">
              <span className="cuc-empty-icon">👤</span>
              After a successful registration, the new user's details will appear here.
            </div>
          )}
        </div>

        {/* ══ RIGHT — Form ══ */}
        <div className="aqc-right">

          {/* AI badge */}
          <div>
            <span className="aqc-ai-badge">⚡ AI-Powered Live Validation</span>
          </div>

          {/* Role selector */}
          <div className="aqc-role-row">
            {Object.entries(ROLES).map(([key, val]) => (
              <button
                key={key}
                className={`aqc-role-btn ${role === key ? 'active' : ''}`}
                onClick={() => setRole(key)}
              >
                <span className="aqc-role-icon">{key === 'student' ? '🎓' : '📚'}</span>
                {val.label}
              </button>
            ))}
          </div>

          {/* Field tags — show checking/valid/invalid state */}
          <div className="aqc-tags">
            {config.fields.map((f) => {
              const status = tagStatus(f.key);
              const errMsg = fieldErrors[f.key];
              return (
                <span
                  key={f.key}
                  className={`aqc-tag ${parsedData[f.key] ? 'filled' : ''} ${status !== 'neutral' ? `tag-${status}` : ''}`}
                  data-error={errMsg && errMsg !== '__checking__' ? errMsg : ''}
                  title={errMsg && errMsg !== '__checking__' ? errMsg : f.label}
                >
                  {f.label}
                  {parsedData[f.key] && (
                    <span className="aqc-tag-val">
                      {f.type === 'password' ? ' ••••' : `: ${parsedData[f.key]}`}
                    </span>
                  )}
                </span>
              );
            })}

            {/* File tag */}
            {(() => {
              let fileStatus = 'neutral';
              if (certFile) fileStatus = 'valid';
              else if (validated && fieldErrors['_file']) fileStatus = 'invalid';
              return (
                <span
                  className={`aqc-tag ${certFile ? 'filled' : ''} ${fileStatus !== 'neutral' ? `tag-${fileStatus}` : ''}`}
                  data-error={fieldErrors['_file'] || ''}
                  title={fieldErrors['_file'] || (role === 'student' ? 'Student ID / Proof' : 'Degree Certificate')}
                >
                  {role === 'student' ? '🪪 ID Proof' : '📄 Degree Cert'}
                  {certFile && <span className="aqc-tag-val">: {certFile.name}</span>}
                </span>
              );
            })()}
          </div>

          {/* Textarea + file upload + buttons */}
          <div className={`aqc-box ${validated && invalidCount > 0 ? 'has-error' : ''}`}>

            {/* AI status indicator — shown while AI is working */}
            {showAiStatus && (
              <div className="aqc-ai-status">
                {isAiValidating && <div className="aqc-ai-dot" />}
                <span>{aiStatusText}</span>
              </div>
            )}

            <textarea
              className="aqc-textarea"
              value={inputText}
              onChange={(e) => handleInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Enter details separated by commas...\n\nExample: ${config.hint}`}
              rows={4}
            />

            {/* Student ID proof */}
            {role === 'student' && (
              <div className="aqc-file-row">
                <label className="aqc-file-label">
                  🪪 {certFile ? 'Change ID Proof' : 'Upload Student ID / Report Card'}
                  <span className="aqc-file-required"> *required</span>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="aqc-file-input"
                    onChange={(e) => {
                      const f = e.target.files[0] || null;
                      setCertFile(f);
                      setMessage(null);
                      if (validated) {
                        const newErrors = { ...fieldErrors, _file: f ? null : 'Student proof required' };
                        setFieldErrors(newErrors);
                      }
                    }}
                  />
                </label>
                {certFile && (
                  <div className="aqc-file-info">
                    <span className="aqc-file-name">✓ {certFile.name}</span>
                    <button className="aqc-file-remove" onClick={() => {
                      setCertFile(null);
                      if (validated) {
                        setFieldErrors(prev => ({ ...prev, _file: 'Student proof required' }));
                      }
                    }}>✕</button>
                  </div>
                )}
              </div>
            )}

            {/* Teacher degree cert */}
            {role === 'teacher' && (
              <div className="aqc-file-row">
                <label className="aqc-file-label">
                  📄 {certFile ? 'Change Certificate' : 'Upload Degree Certificate'} (optional)
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="aqc-file-input"
                    onChange={(e) => {
                      const f = e.target.files[0] || null;
                      setCertFile(f);
                      setMessage(null);
                    }}
                  />
                </label>
                {certFile && (
                  <div className="aqc-file-info">
                    <span className="aqc-file-name">✓ {certFile.name}</span>
                    <button className="aqc-file-remove" onClick={() => setCertFile(null)}>✕</button>
                  </div>
                )}
              </div>
            )}

            {/* Progress + buttons */}
            <div className="aqc-box-footer">
              <div className="aqc-progress-wrap">
                <div className="aqc-progress-bar" style={{ width: `${(filledCount / totalCount) * 100}%` }} />
              </div>
              <div className="aqc-footer-row">
                <span className="aqc-count">{filledCount}/{totalCount} fields filled</span>
                <div className="aqc-btn-group">
                  <button className="aqc-validate-btn" onClick={handleValidate}>
                    ✦ Validate
                  </button>
                  <button
                    className="aqc-create-btn"
                    onClick={handleCreate}
                    disabled={!allFieldsValid || loading}
                    title={!allFieldsValid ? 'Fix all red fields first' : ''}
                  >
                    {loading ? 'Creating...' : `Create ${config.label}`}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Validation summary */}
          {validated && (
            <div className={`aqc-val-summary ${invalidCount === 0 ? 'all-valid' : 'has-invalid'}`}>
              {invalidCount === 0
                ? '✓ All fields valid — ready to create!'
                : '✕ Fix the red fields before creating'}
              <span className="aqc-val-pill good">✓ {validCount} valid</span>
              {invalidCount > 0 && <span className="aqc-val-pill bad">✗ {invalidCount} invalid</span>}
            </div>
          )}

          {/* Message */}
          {message && (
            <div className={`aqc-message aqc-message--${message.type}`}>
              {message.text}
            </div>
          )}

          {/* Field order reference */}
          <details className="aqc-guide">
            <summary>Field order reference</summary>
            <ol className="aqc-guide-list">
              {config.fields.map((f) => (
                <li key={f.key}>
                  <strong>{f.label}</strong>
                  {f.required && <span className="aqc-req-star"> *</span>}
                  {f.type === 'select' && (
                    <span className="aqc-opt-text"> — options: {f.options.join(', ')}</span>
                  )}
                </li>
              ))}
              <li>
                <strong>{role === 'student' ? 'Student ID / Report Card' : 'Degree Certificate'}</strong>
                {role === 'student' && <span className="aqc-req-star"> *</span>}
                <span className="aqc-opt-text"> — PDF/JPG/PNG via upload button</span>
              </li>
            </ol>
          </details>

        </div>{/* aqc-right */}
      </div>{/* aqc-layout */}
    </>
  );
};

// ─── StudentAttendanceSearch ──────────────────────────────────────────────────
const StudentAttendanceSearch = () => {
  const [nameQuery, setNameQuery]     = useState('');
  const [classQuery, setClassQuery]   = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [result, setResult]           = useState(null);
  const [notFound, setNotFound]       = useState(false);
  const [showDrop, setShowDrop]       = useState(false);
  const [searching, setSearching]     = useState(false);

  const fetchAttendance = async (name, studentClass) => {
    if (!name.trim() || !studentClass.trim()) {
      setResult(null);
      setNotFound(false);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/attendance/student-summary?name=${encodeURIComponent(name.trim())}&class=${encodeURIComponent(studentClass.trim())}`
      );
      const data = await res.json();
      if (res.ok && data.student) { setResult(data.student); setNotFound(false); }
      else { setResult(null); setNotFound(true); }
    } catch { setResult(null); setNotFound(true); }
    finally { setSearching(false); }
  };

  const fetchSuggestions = async (val) => {
    if (!val.trim()) { setSuggestions([]); return; }
    try {
      const res  = await fetch(`${API_BASE_URL}/api/students/search?name=${encodeURIComponent(val)}`);
      const data = await res.json();
      setSuggestions(data.students || []);
    } catch { setSuggestions([]); }
  };

  const handleNameInput = (val) => {
    setNameQuery(val); setResult(null); setNotFound(false);
    fetchSuggestions(val); setShowDrop(true);
  };

  const handleSelect = (student) => {
    setNameQuery(`${student.firstName} ${student.lastName}`);
    setClassQuery(student.class || '');
    setShowDrop(false);
  };

  const handleSearch = () => {
    setShowDrop(false);
    if (!nameQuery.trim() || !classQuery.trim()) {
      alert('Please enter both the student name and their class.');
      return;
    }
    fetchAttendance(nameQuery, classQuery);
  };

  // ✅ No attendance records yet is a valid state — show 0%, not "not found"
  const pct   = result && result.totalClasses > 0
    ? Math.round((result.presentCount / result.totalClasses) * 100)
    : 0;
  const color = pct >= 75 ? '#639922' : pct >= 50 ? '#EF9F27' : '#E24B4A';
  const label = result && result.totalClasses === 0
    ? 'No attendance recorded yet'
    : pct >= 75 ? 'Good standing' : pct >= 50 ? 'Needs improvement' : 'At risk';

  return (
    <div className="sas-container">
      <div className="sas-search-row">
        <div className="sas-rel">
          <input
            className="sas-input" type="text" placeholder="Student name..."
            value={nameQuery}
            onChange={e => handleNameInput(e.target.value)}
            onBlur={() => setTimeout(() => setShowDrop(false), 150)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
          />
          {showDrop && suggestions.length > 0 && (
            <div className="sas-dropdown">
              {suggestions.map(s => (
                <div key={s._id} className="sas-drop-item" onMouseDown={() => handleSelect(s)}>
                  {s.firstName} {s.lastName}
                  <span className="sas-drop-meta"> {s.class}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <input
          className="sas-input sas-class-input" type="text" placeholder="Class..."
          value={classQuery}
          onChange={e => { setClassQuery(e.target.value); setResult(null); setNotFound(false); }}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
        />
        <button className="sas-btn" onClick={handleSearch} disabled={searching}>
          {searching ? 'Checking...' : 'Check Attendance'}
        </button>
      </div>

      {result && (
        <div className="sas-result">
          <div className="sas-header">
            <div className="sas-avatar">
              {result.name?.split(' ').map(w => w[0]).slice(0, 2).join('')}
            </div>
            <div>
              <div className="sas-name">{result.name}</div>
              <div className="sas-meta">{result.class}{result.subject ? ` · ${result.subject}` : ''}</div>
            </div>
            <div className="sas-pct-col">
              <span className="sas-pct" style={{ color }}>{pct}%</span>
              <span className="sas-label" style={{ color }}>{label}</span>
            </div>
          </div>
          <div className="sas-bar-wrap">
            <div className="sas-bar-fill" style={{ width: `${pct}%`, background: color }} />
          </div>
          <div className="sas-stats">
            <div className="sas-stat"><span>{result.totalClasses}</span><small>Total classes</small></div>
            <div className="sas-stat"><span style={{ color: '#639922' }}>{result.presentCount}</span><small>Present</small></div>
            <div className="sas-stat"><span style={{ color: '#E24B4A' }}>{result.totalClasses - result.presentCount}</span><small>Absent</small></div>
          </div>
        </div>
      )}
      {notFound && <p className="sas-empty">No student found with that name and class.</p>}
    </div>
  );
};

// ─── Hero slides ──────────────────────────────────────────────────────────────
const heroImages = [
  {
    image: hero1,
    title: (<>Transform Your Future with <span className="highlight">Elite Online Tutors</span></>),
    description: "Unlock unlimited potential with personalized learning experiences.",
    buttonText: "Start Your Journey",
  },
  {
    image: hero2,
    title: (<>Learn <span className="highlight">Anywhere, Anytime</span></>),
    description: "Break free from classroom boundaries.",
    buttonText: "Explore Classes",
  },
  {
    image: hero3,
    title: (<>World-Class <span className="highlight">Expert Tutors</span></>),
    description: "Connect with certified educators who inspire excellence.",
    buttonText: "Meet Our Tutors",
  },
];

// ─── Main Home component ──────────────────────────────────────────────────────
const Home = () => {
  const navigate = useNavigate();
  const [searchText, setSearchText] = useState("");

  const featuresRef = useRef(null);
  const classesRef  = useRef(null);
  const tutorsRef   = useRef(null);

  const [currentIndex, setCurrentIndex]       = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [teachers, setTeachers]               = useState([]);

  const scrollToFeatures = () => featuresRef.current?.scrollIntoView({ behavior: "smooth" });
  const scrollToClasses  = () => classesRef.current?.scrollIntoView({ behavior: "smooth" });

  const handlePrev = useCallback(() => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentIndex(prev => (prev === 0 ? heroImages.length - 1 : prev - 1));
  }, [isTransitioning]);

  const handleNext = useCallback(() => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentIndex(prev => (prev === heroImages.length - 1 ? 0 : prev + 1));
  }, [isTransitioning]);

  useEffect(() => {
    if (!isSearchFocused) {
      const timer = setInterval(() => { handleNext(); }, 6000);
      return () => clearInterval(timer);
    }
  }, [handleNext, isSearchFocused]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/teachers`)
      .then(res => res.json())
      .then(data => {
        if (data.teachers) setTeachers(data.teachers.filter(t => t.isApproved));
      })
      .catch(err => console.error(err));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setIsTransitioning(false), 600);
    return () => clearTimeout(timer);
  }, [currentIndex]);

  const [searchError, setSearchError] = useState("");

  // A user is considered logged in if a token exists (set by Login.js on sign-in).
  const isLoggedIn = !!localStorage.getItem('token');

  const handleSearch = () => {
    const trimmed = searchText.trim();
    if (trimmed === "") return;

    const matchedSubject = resolveSubject(trimmed);

    if (matchedSubject) {
      setSearchError("");
      navigate(`/subjects/${encodeURIComponent(matchedSubject)}`);
    } else {
      // Graceful fallback: no crash, no dead-end "not found" page —
      // tell the user right there and let them browse everything instead.
      setSearchError(
        `No subject matching "${trimmed}" was found. Try Tamil, English, Maths, Science, Social, Physics, Chemistry, Botany, Zoology, Accounts, or Economics.`
      );
    }
  };

  return (
    <div className="home-container">

      {/* Hero */}
      <section className="hero-carousel">
        <div className="carousel-wrapper">
          {heroImages.map((item, index) => (
            <div
              key={index}
              className={`carousel-slide ${index === currentIndex ? 'active' : ''}`}
              style={{ backgroundImage: `url(${item.image})` }}
            >
              <div className="slide-overlay"></div>
              <div className="carousel-content">
                <h1 className="slide-title">{item.title}</h1>
                <p className="slide-description">{item.description}</p>
                <button
                  className="cta-button"
                  onClick={() => {
                    if (item.buttonText === "Start Your Journey") scrollToFeatures();
                    else if (item.buttonText === "Explore Classes") scrollToClasses();
                    else tutorsRef.current?.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  {item.buttonText}
                </button>
                <div className="search-box">
                  <input
                    type="text"
                    placeholder="Discover your perfect subject..."
                    value={searchText}
                    onChange={(e) => {
                      setSearchText(e.target.value);
                      if (searchError) setSearchError("");
                    }}
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() => setIsSearchFocused(false)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  />
                  <button className="search-button" onClick={handleSearch}>Find Courses</button>
                </div>
                {searchError && (
                  <div className="search-error">
                    <span>{searchError}</span>
                    <button
                      type="button"
                      className="search-browse-all-link"
                      onClick={() => navigate('/subjects')}
                    >
                      Browse all subjects
                    </button>
                  </div>
                )}
                <div className="category-tags">
                  {['Tamil', 'English', 'Maths', 'Science', 'Social'].map((subject) => (
                    <span key={subject} className="subject-tag" onClick={() => navigate(`/subjects/${subject}`)}>
                      {subject}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
          <button className="arrow left" onClick={handlePrev}><span>&#10094;</span></button>
          <button className="arrow right" onClick={handleNext}><span>&#10095;</span></button>
          <div className="carousel-dots">
            {heroImages.map((_, index) => (
              <button
                key={index}
                className={`dot ${index === currentIndex ? 'active' : ''}`}
                onClick={() => setCurrentIndex(index)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* About */}
      <section className="about-section">
        <div className="section-container">
          <div className="section-header">
            <h2>Revolutionizing Education, One Student at a Time</h2>
          </div>
          <div className="about-content">
            <p>Join a community of passionate educators and ambitious learners.</p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="features-section" ref={featuresRef}>
        <div className="section-container">
          <div className="section-header"><h2>What Makes Us Amazing?</h2></div>
          <div className="card-grid">
            <div className="feature-card"><MdMenuBook /> <h3>Complete Subject Universe</h3></div>
            <div className="feature-card"><FaVideo />    <h3>Live + Recorded Learning</h3></div>
            <div className="feature-card"><FaChalkboardTeacher /> <h3>Instant Tutor Connect</h3></div>
          </div>
        </div>
      </section>

      {/* Classes */}
      <section className="classes-section" ref={classesRef}>
        <div className="section-container">
          <div className="section-header"><h2>Explore Our Classes</h2></div>
          <div className="card-grid">
            <div className="class-card"><h3>Weekday Classes</h3>Weekday classes are scheduled throughout Monday to Friday during working hours</div>
            <div className="class-card"><h3>Weekend Classes</h3>Weekend classes are arranged exclusively on Saturdays and Sundays</div>
          </div>
        </div>
      </section>

      {/* Tutors */}
      <section className="tutors-section" ref={tutorsRef}>
        <div className="section-container">
          <div className="section-header"><h2>Meet Our Tutors</h2></div>
          {teachers.length === 0 ? (
            <p>No tutors available</p>
          ) : (
            <div className="card-grid">
              {teachers.map((teacher) => (
                <div key={teacher._id} className="teacher-card">
                  <h3>{teacher.firstName} {teacher.lastName}</h3>
                  <p><strong>Subject:</strong> {teacher.preferredSubject}</p>
                  <p><strong>Qualification:</strong> {teacher.qualification}</p>
                  {isLoggedIn && (
                    <>
                      <p><strong>Email:</strong> {teacher.email}</p>
                      <p><strong>Mobile:</strong> {teacher.mobile}</p>
                      {teacher.degreeCertificate && (
                        <a href={teacher.degreeCertificate} target="_blank" rel="noreferrer">View Certificate</a>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Attendance Search - only visible to logged-in users */}
      {isLoggedIn && (
        <section className="attendance-section">
          <div className="section-container">
            <div className="section-header">
              <h2>Check Student Attendance</h2>
              <p>Search any student by name to view their attendance percentage</p>
            </div>
            <StudentAttendanceSearch />
          </div>
        </section>
      )}

      {/* Quick Create - only visible to logged-in users */}
      {isLoggedIn && (
        <section className="quick-create-section">
          <div className="section-container">
            <div className="section-header">
              <h2>Quick Create User</h2>
            </div>
            <AdminQuickCreate />
          </div>
        </section>
      )}

      <Footer />
    </div>
  );
};

export default Home;
