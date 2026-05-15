import React, { useEffect, useState, useCallback, useRef } from "react";
import API_BASE_URL from "../config/api";
import "../styles/adminDashboard.css";

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

// ─── CreatedUserCard ──────────────────────────────────────────────────────────
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

// ─── AI Validation Agent ──────────────────────────────────────────────────────
const AIValidationAgent = {
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
  },

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
  },
};

// ─── Local validators (fallback) ─────────────────────────────────────────────
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

// ─── AdminQuickCreate ─────────────────────────────────────────────────────────
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

  const [isAiValidating, setIsAiValidating] = useState(false);
  const [aiStatusText, setAiStatusText]     = useState('');
  const [showAiStatus, setShowAiStatus]     = useState(false);
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

  const runAiValidation = useCallback(async (data, file) => {
    const filledFields = {};
    config.fields.forEach(f => {
      if (data[f.key] && data[f.key].trim()) filledFields[f.key] = data[f.key];
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
      const newErrors = {};
      config.fields.forEach(f => {
        if (data[f.key] && data[f.key].trim()) {
          newErrors[f.key] = result.errors?.[f.key] !== undefined ? result.errors[f.key] : null;
        } else {
          newErrors[f.key] = undefined;
        }
      });
      if (role === 'student') newErrors['_file'] = file ? null : undefined;
      else newErrors['_file'] = null;
      setFieldErrors(newErrors);
      setValidated(true);
      const validCount   = Object.values(newErrors).filter(e => e === null).length;
      const invalidCount = Object.values(newErrors).filter(e => e && e !== null && e !== undefined).length;
      setAiStatusText(`✓ AI checked ${validCount + invalidCount} field(s) — ${validCount} valid, ${invalidCount} invalid`);
      setTimeout(() => setShowAiStatus(false), 2500);
    } catch (err) {
      console.error('AI validation failed, falling back to local:', err);
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

  const handleInput = (val) => {
    setInputText(val);
    const parts = val.split(',').map(s => s.trim());
    const data = {};
    config.fields.forEach((field, index) => { data[field.key] = parts[index] || ''; });
    setParsedData(data);
    setMessage(null);
    const checkingErrors = {};
    config.fields.forEach(f => {
      checkingErrors[f.key] = data[f.key] && data[f.key].trim() ? '__checking__' : undefined;
    });
    setFieldErrors(checkingErrors);
    setValidated(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const hasAnyFilled = config.fields.some(f => data[f.key] && data[f.key].trim());
    if (hasAnyFilled) {
      setShowAiStatus(true);
      setAiStatusText('AI is validating your fields...');
      debounceRef.current = setTimeout(() => { runAiValidation(data, certFile); }, 800);
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
      const result = await AIValidationAgent.validateFull(role, parsedData, !!certFile);
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

  const allFieldsValid = validated &&
    config.fields.every(f => fieldErrors[f.key] === null) &&
    (role === 'teacher' || certFile) &&
    !isAiValidating;

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleValidate(); }
  };

  const handleCreate = async () => {
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
        const value = f.key === 'salutation' ? normalizeSalutation(parsedData[f.key]) : parsedData[f.key];
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
    <div className="aqc-layout">
      {/* LEFT — Created user card */}
      <div className="aqc-left">
        {createdUser ? (
          <CreatedUserCard user={createdUser} role={createdUser.role} onDismiss={() => setCreatedUser(null)} />
        ) : (
          <div className="cuc-empty">
            <span className="cuc-empty-icon">👤</span>
            After a successful registration, the new user's details will appear here.
          </div>
        )}
      </div>

      {/* RIGHT — Form */}
      <div className="aqc-right">
        <div>
          <span className="aqc-ai-badge">⚡ AI-Powered Live Validation</span>
        </div>

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

        <div className={`aqc-box ${validated && invalidCount > 0 ? 'has-error' : ''}`}>
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
                    if (validated) setFieldErrors(prev => ({ ...prev, _file: 'Student proof required' }));
                  }}>✕</button>
                </div>
              )}
            </div>
          )}

          {role === 'teacher' && (
            <div className="aqc-file-row">
              <label className="aqc-file-label">
                📄 {certFile ? 'Change Certificate' : 'Upload Degree Certificate'} (optional)
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="aqc-file-input"
                  onChange={(e) => { setCertFile(e.target.files[0] || null); setMessage(null); }}
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

          <div className="aqc-box-footer">
            <div className="aqc-progress-wrap">
              <div className="aqc-progress-bar" style={{ width: `${(filledCount / totalCount) * 100}%` }} />
            </div>
            <div className="aqc-footer-row">
              <span className="aqc-count">{filledCount}/{totalCount} fields filled</span>
              <div className="aqc-btn-group">
                <button className="aqc-validate-btn" onClick={handleValidate}>✦ Validate</button>
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

        {validated && (
          <div className={`aqc-val-summary ${invalidCount === 0 ? 'all-valid' : 'has-invalid'}`}>
            {invalidCount === 0 ? '✓ All fields valid — ready to create!' : '✕ Fix the red fields before creating'}
            <span className="aqc-val-pill good">✓ {validCount} valid</span>
            {invalidCount > 0 && <span className="aqc-val-pill bad">✗ {invalidCount} invalid</span>}
          </div>
        )}

        {message && (
          <div className={`aqc-message aqc-message--${message.type}`}>{message.text}</div>
        )}

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
      </div>
    </div>
  );
};

// ─── StudentAttendanceSearch ──────────────────────────────────────────────────
const StudentAttendanceSearch = () => {
  const [query, setQuery]             = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [result, setResult]           = useState(null);
  const [notFound, setNotFound]       = useState(false);
  const [showDrop, setShowDrop]       = useState(false);

  const fetchAttendance = async (name) => {
    try {
      const res  = await fetch(`${API_BASE_URL}/api/attendance/student-summary?name=${encodeURIComponent(name)}`);
      const data = await res.json();
      if (res.ok && data.student) { setResult(data.student); setNotFound(false); }
      else { setResult(null); setNotFound(true); }
    } catch { setResult(null); setNotFound(true); }
  };

  const fetchSuggestions = async (val) => {
    if (!val.trim()) { setSuggestions([]); return; }
    try {
      const res  = await fetch(`${API_BASE_URL}/api/students/search?name=${encodeURIComponent(val)}`);
      const data = await res.json();
      setSuggestions(data.students || []);
    } catch { setSuggestions([]); }
  };

  const handleInput = (val) => {
    setQuery(val); setResult(null); setNotFound(false);
    fetchSuggestions(val); setShowDrop(true);
  };

  const handleSelect = (student) => {
    setQuery(`${student.firstName} ${student.lastName}`);
    setShowDrop(false);
    fetchAttendance(`${student.firstName} ${student.lastName}`);
  };

  const handleSearch = () => { setShowDrop(false); fetchAttendance(query); };

  const pct   = result ? Math.round((result.presentCount / result.totalClasses) * 100) : 0;
  const color = pct >= 75 ? '#639922' : pct >= 50 ? '#EF9F27' : '#E24B4A';
  const label = pct >= 75 ? 'Good standing' : pct >= 50 ? 'Needs improvement' : 'At risk';

  return (
    <div className="sas-container">
      <div className="sas-search-row">
        <div className="sas-rel">
          <input
            className="sas-input" type="text" placeholder="Search student name..."
            value={query}
            onChange={e => handleInput(e.target.value)}
            onBlur={() => setTimeout(() => setShowDrop(false), 150)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
          />
          {showDrop && suggestions.length > 0 && (
            <div className="sas-dropdown">
              {suggestions.map(s => (
                <div key={s._id} className="sas-drop-item" onMouseDown={() => handleSelect(s)}>
                  {s.firstName} {s.lastName}
                  <span className="sas-drop-meta"> {s.studentClass}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <button className="sas-btn" onClick={handleSearch}>Check Attendance</button>
      </div>

      {result && (
        <div className="sas-result">
          <div className="sas-header">
            <div className="sas-avatar">
              {result.name?.split(' ').map(w => w[0]).slice(0, 2).join('')}
            </div>
            <div>
              <div className="sas-name">{result.name}</div>
              <div className="sas-meta">{result.class} · {result.subject}</div>
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
      {notFound && <p className="sas-empty">No student found with that name.</p>}
    </div>
  );
};

// ─── AdminDashboard ───────────────────────────────────────────────────────────
const AdminDashboard = () => {
  const [pendingStudents, setPendingStudents] = useState([]);
  const [pendingTeachers, setPendingTeachers] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [rejectReason, setRejectReason]       = useState("");
  const [loading, setLoading]                 = useState(false);

  useEffect(() => {
    fetchPendingStudents();
    fetchPendingTeachers();
  }, []);

  const fetchPendingStudents = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/students/admin/pending`);
      if (!res.ok) throw new Error("Failed to fetch students");
      const data = await res.json();
      setPendingStudents(Array.isArray(data.students) ? data.students : []);
    } catch (err) {
      console.error("Error fetching students:", err.message);
      setPendingStudents([]);
    }
  };

  const fetchPendingTeachers = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/teachers/admin/pending`);
      if (!res.ok) throw new Error("Failed to fetch teachers");
      const data = await res.json();
      setPendingTeachers(Array.isArray(data.teachers) ? data.teachers : []);
    } catch (err) {
      console.error("Error fetching teachers:", err.message);
      setPendingTeachers([]);
    }
  };

  const handleStudentApproval = async (status) => {
    if (!selectedStudent) return;
    if (status === "Rejected" && !rejectReason.trim()) { alert("Please enter a rejection reason."); return; }
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/students/admin/${selectedStudent._id}/approve`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, reason: status === "Rejected" ? rejectReason : "" })
      });
      if (!res.ok) throw new Error("Failed to update student");
      const data = await res.json();
      alert(data.message || "Student updated successfully");
      resetState();
      fetchPendingStudents();
    } catch (err) { console.error(err); alert("Action failed"); }
    finally { setLoading(false); }
  };

  const handleTeacherApproval = async (status) => {
    if (!selectedTeacher) return;
    if (status === "Rejected" && !rejectReason.trim()) { alert("Please enter a rejection reason."); return; }
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/teachers/admin/teacher/${selectedTeacher._id}/approve`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, reason: status === "Rejected" ? rejectReason : "" })
      });
      if (!res.ok) throw new Error("Failed to update teacher");
      const data = await res.json();
      alert(data.message || "Teacher updated successfully");
      resetState();
      fetchPendingTeachers();
    } catch (err) { console.error(err); alert("Action failed"); }
    finally { setLoading(false); }
  };

  const resetState = () => {
    setSelectedStudent(null);
    setSelectedTeacher(null);
    setRejectReason("");
  };

  return (
    <div className="admin-dashboard">
      <h1>Admin Dashboard</h1>

      {/* ── Pending Students ── */}
      <h2>Pending Students</h2>
      {pendingStudents.length === 0 ? (
        <p>No pending students</p>
      ) : (
        pendingStudents.map((student) => (
          <div
            key={student._id}
            className="card"
            onClick={() => { setSelectedStudent(student); setSelectedTeacher(null); setRejectReason(""); }}
          >
            <strong>{student.firstName} {student.lastName}</strong> ({student.email})
          </div>
        ))
      )}

      {selectedStudent && (
        <div className="detail-box">
          <h3>Student Details</h3>
          <p><strong>Name:</strong> {selectedStudent.salutation} {selectedStudent.firstName} {selectedStudent.lastName}</p>
          <p><strong>Email:</strong> {selectedStudent.email}</p>
          <p><strong>Mobile:</strong> {selectedStudent.mobile}</p>
          <p><strong>Timezone:</strong> {selectedStudent.timezone}</p>
          <p><strong>Class:</strong> {selectedStudent.class}</p>
          <p><strong>Group:</strong> {selectedStudent.group || "—"}</p>
          <p><strong>Syllabus:</strong> {selectedStudent.syllabus}</p>
          <p><strong>EMIS Number:</strong> {selectedStudent.emisNumber}</p>
          <p><strong>Status:</strong> {selectedStudent.status}</p>
          <p><strong>Approval Status:</strong> {selectedStudent.approvalStatus}</p>
          <p><strong>Registered At:</strong> {new Date(selectedStudent.registeredAt).toLocaleString()}</p>
          {selectedStudent.proof ? (
            <div style={{ marginTop: "10px" }}>
              <strong>Student Proof:</strong><br />
              {selectedStudent.proof.endsWith(".pdf") ? (
                <iframe src={`${API_BASE_URL}/uploads/${selectedStudent.proof}`} title="Student proof document" width="100%" height="400px" style={{ marginTop: "8px", borderRadius: "10px" }} />
              ) : (
                <img src={`${API_BASE_URL}/uploads/${selectedStudent.proof}`} alt="Student Proof" style={{ width: "100%", maxHeight: "300px", objectFit: "cover", borderRadius: "10px", marginTop: "10px" }} />
              )}
            </div>
          ) : (
            <p>No proof uploaded</p>
          )}
          <div className="button-group">
            <button disabled={loading} onClick={() => handleStudentApproval("Approved")} className="approve-btn">
              {loading ? "Processing..." : "Approve"}
            </button>
          </div>
          <div className="reject-section">
            <textarea placeholder="Enter rejection reason..." value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows="3" />
            <button disabled={loading} onClick={() => handleStudentApproval("Rejected")} className="reject-btn">
              {loading ? "Processing..." : "Reject"}
            </button>
          </div>
        </div>
      )}

      {/* ── Pending Teachers ── */}
      <h2>Pending Teachers</h2>
      {pendingTeachers.length === 0 ? (
        <p>No pending teachers</p>
      ) : (
        pendingTeachers.map((teacher) => (
          <div
            key={teacher._id}
            className="card"
            onClick={() => { setSelectedTeacher(teacher); setSelectedStudent(null); setRejectReason(""); }}
          >
            <strong>{teacher.firstName} {teacher.lastName}</strong> ({teacher.email})
          </div>
        ))
      )}

      {selectedTeacher && (
        <div className="detail-box">
          <h3>Teacher Details</h3>
          <p><strong>First Name:</strong> {selectedTeacher.firstName}</p>
          <p><strong>Last Name:</strong> {selectedTeacher.lastName}</p>
          <p><strong>Email:</strong> {selectedTeacher.email}</p>
          <p><strong>Phone:</strong> {selectedTeacher.mobile}</p>
          <p><strong>Timezone:</strong> {selectedTeacher.timezone}</p>
          <p><strong>Qualification:</strong> {selectedTeacher.qualification}</p>
          <p><strong>Preferred Subject:</strong> {selectedTeacher.preferredSubject}</p>
          {selectedTeacher.degreeCertificate ? (
            <div>
              <strong>Certificate:</strong><br />
              {selectedTeacher.degreeCertificate.startsWith("data:image") ? (
                <img src={selectedTeacher.degreeCertificate} alt="Certificate" style={{ width: "100%", maxHeight: "400px", objectFit: "contain", border: "1px solid #ccc", marginTop: "10px" }} />
              ) : (
                <iframe src={selectedTeacher.degreeCertificate} title="Teacher degree certificate document" width="100%" height="400px" style={{ marginTop: "10px" }} />
              )}
            </div>
          ) : (
            <p>No certificate uploaded</p>
          )}
          <p><strong>Subjects:</strong> {selectedTeacher.subjects?.join(", ") || "N/A"}</p>
          <div className="button-group">
            <button disabled={loading} onClick={() => handleTeacherApproval("Approved")} className="approve-btn">
              {loading ? "Processing..." : "Approve"}
            </button>
          </div>
          <div className="reject-section">
            <textarea placeholder="Enter rejection reason..." value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows="3" />
            <button disabled={loading} onClick={() => handleTeacherApproval("Rejected")} className="reject-btn">
              {loading ? "Processing..." : "Reject"}
            </button>
          </div>
        </div>
      )}

      {/* ── Check Attendance ── */}
      <h2>Check Student Attendance</h2>
      <p className="admin-section-subtitle">Search any student by name to view their attendance percentage</p>
      <StudentAttendanceSearch />

      {/* ── Quick Create User ── */}
      <h2>Quick Create User</h2>
      <AdminQuickCreate />
    </div>
  );
};

export default AdminDashboard;