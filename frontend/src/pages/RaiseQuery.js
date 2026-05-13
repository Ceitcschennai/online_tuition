import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import API_BASE_URL from '../config/api';
import '../styles/studentQueries.css';

const RaiseQuery = () => {
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [priority, setPriority] = useState('Medium');
    const [queries, setQueries] = useState([]);
    const [loading, setLoading] = useState(false);
    const [fetchingQueries, setFetchingQueries] = useState(true);
    const [fetchingSubjects, setFetchingSubjects] = useState(true);
const [error, setError] = useState('');
     const [teachers, setTeachers] = useState([]);
    const [fetchingTeachers, setFetchingTeachers] = useState(true);
   
   // --- Class Request State ---
   const [classRequests, setClassRequests] = useState([]);
   const [fetchingClassRequests, setFetchingClassRequests] = useState(true);
   const [classRequestLoading, setClassRequestLoading] = useState(false);
   const [classReqSubject, setClassReqSubject] = useState('');
   const [classReqTeacher, setClassReqTeacher] = useState('');
   const [classReqDate, setClassReqDate] = useState('');
   const [classReqTime, setClassReqTime] = useState('');
   const [classReqReason, setClassReqReason] = useState('');
   const [classReqError, setClassReqError] = useState('');
   
   // Get current student data
   const getUserData = () => {
     try {
       const userData = localStorage.getItem('user');
       if (userData) {
         const parsedData = JSON.parse(userData);
         return parsedData.student || parsedData;
       }
     } catch (error) {
       console.error('Error parsing user data:', error);
     }
     return null;
   };
   
   const handleDelete = async (id) => {
     const confirmDelete = window.confirm("Are you sure you want to delete this query?");
     if (!confirmDelete) return;
     try {
       await axios.delete(`${API_BASE_URL}/api/queries/${id}`);
       alert("Query deleted successfully");
       fetchStudentQueries();
     } catch (error) {
       console.error("Delete failed:", error);
       alert("Failed to delete query");
     }
   };
   
   const handleEdit = (query) => {
     setSubject(query.subject);
     setMessage(query.question);
     setPriority(query.priority || "Medium");
     window.scrollTo({ top: 0, behavior: "smooth" });
   };
   
   const student = getUserData();
   const currentStudentId = student?.id || localStorage.getItem('studentId') || localStorage.getItem('userId');
   const currentStudentName = student?.firstName && student?.lastName
     ? `${student.salutation || ''} ${student.firstName} ${student.lastName}`.trim()
     : localStorage.getItem('studentName') || localStorage.getItem('userName') || 'Student';
   const currentStudentClass = (student?.class || localStorage.getItem('studentClass') || localStorage.getItem('userClass') || '10').toString().replace(/^Class\s*/i, '');
   
// Fetch subjects
    const fetchSubjects = useCallback(async () => {
      try {
        setFetchingSubjects(true);
        setError('');
        const response = await axios.get(`${API_BASE_URL}/api/subjects`);
        if (response.status === 200 && response.data.subjects) {
          // Subjects loaded successfully
        } else {
          setError('Failed to load subjects');
        }
      } catch (error) {
        console.error('Failed to fetch subjects:', error);
        setError('Failed to load subjects. Please refresh the page.');
      } finally {
        setFetchingSubjects(false);
      }
    }, []);
   
   // Fetch student's queries
   const fetchStudentQueries = useCallback(async () => {
     if (!currentStudentId) {
       setError('Student ID not found. Please log in again.');
       setFetchingQueries(false);
       return;
     }
     try {
       setFetchingQueries(true);
       setError('');
       const response = await axios.get(`${API_BASE_URL}/api/queries/student/${currentStudentId}`);
       if (response.status === 200) {
         setQueries(response.data.queries || []);
       } else {
         setError('Failed to load your queries');
         setQueries([]);
       }
     } catch (error) {
       console.error('Failed to fetch queries:', error);
       if (error.response?.status === 404) {
         setQueries([]);
       } else {
         setError('Failed to load your queries. Please refresh the page.');
         setQueries([]);
       }
     } finally {
       setFetchingQueries(false);
     }
   }, [currentStudentId]);
   
   // Fetch teachers list
   const fetchTeachers = useCallback(async () => {
     try {
       setFetchingTeachers(true);
       const response = await axios.get(`${API_BASE_URL}/api/teachers`);
       if (response.status === 200 && response.data.teachers) {
         setTeachers(response.data.teachers);
       } else {
         setTeachers([]);
       }
     } catch (error) {
       console.error('Failed to fetch teachers:', error);
       setTeachers([]);
     } finally {
       setFetchingTeachers(false);
     }
   }, []);
   
   // Fetch student's class requests
   const fetchClassRequests = useCallback(async () => {
     if (!currentStudentId) {
       setFetchingClassRequests(false);
       return;
     }
     try {
       setFetchingClassRequests(true);
       const response = await axios.get(`${API_BASE_URL}/api/class-requests/student/${currentStudentId}`);
       if (response.status === 200) {
         setClassRequests(response.data.classRequests || []);
       } else {
         setClassRequests([]);
       }
     } catch (error) {
       console.error('Failed to fetch class requests:', error);
       if (error.response?.status === 404) {
         setClassRequests([]);
       } else {
         setClassRequests([]);
       }
     } finally {
       setFetchingClassRequests(false);
     }
   }, [currentStudentId]);
   
   useEffect(() => {
     fetchSubjects();
     fetchStudentQueries();
     fetchTeachers();
     fetchClassRequests();
   }, [fetchSubjects, fetchStudentQueries, fetchTeachers, fetchClassRequests]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subject || !message.trim()) {
      alert('Please fill in all required fields');
      return;
    }
    if (!currentStudentId) {
      alert('Student ID not found. Please login again.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const newQuery = {
        studentId: currentStudentId,
        studentName: currentStudentName,
        studentClass: currentStudentClass,
        subject,
        question: message.trim(),
        priority
      };
      const response = await axios.post(`${API_BASE_URL}/api/queries`, newQuery);
      if (response.status === 201 || response.status === 200) {
        setSubject('');
        setMessage('');
        setPriority('Medium');
        alert('Query submitted successfully!');
        fetchStudentQueries();
      } else {
        throw new Error('Failed to submit query');
      }
    } catch (error) {
      console.error('Error submitting query:', error);
      if (error.response?.status === 400) {
        alert('Please check your input and try again.');
      } else if (error.response?.status === 401) {
        alert('Session expired. Please log in again.');
      } else {
        alert('Failed to submit query. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle class request submission
  const handleClassRequestSubmit = async () => {
    if (!classReqSubject.trim() || !classReqTeacher || !classReqDate || !classReqTime) {
      setClassReqError('Please fill in all required fields (Subject, Teacher, Date & Time).');
      return;
    }
    if (!currentStudentId) {
      setClassReqError('Student ID not found. Please login again.');
      return;
    }
    setClassReqError('');
    setClassRequestLoading(true);

    const selectedTeacher = teachers.find(t => t._id === classReqTeacher || t.id === classReqTeacher);
    const teacherName = selectedTeacher
      ? `${selectedTeacher.salutation || ''} ${selectedTeacher.firstName} ${selectedTeacher.lastName}`.trim()
      : classReqTeacher;

    try {
      const payload = {
        studentId: currentStudentId,
        studentName: currentStudentName,
        studentClass: currentStudentClass,
        teacherId: classReqTeacher,
        teacherName,
        subject: classReqSubject.trim(),
        preferredDate: classReqDate,
        preferredTime: classReqTime,
        reason: classReqReason.trim(),
      };
      const response = await axios.post(`${API_BASE_URL}/api/class-requests`, payload);
      if (response.status === 201) {
        alert(`Class request sent successfully to ${teacherName}!`);
        setClassReqSubject('');
        setClassReqTeacher('');
        setClassReqDate('');
        setClassReqTime('');
        setClassReqReason('');
        fetchClassRequests();
      } else {
        throw new Error('Failed to submit class request');
      }
    } catch (error) {
      console.error('Error submitting class request:', error);
      if (error.response?.status === 404) {
        alert('Backend route not found (404). Please add the /api/class-requests route to your server — see classRequestRoutes.js.');
      } else if (error.response?.status === 400) {
        alert('Invalid data. Please check all fields and try again.');
      } else if (error.response?.status === 500) {
        alert('Server error. Please check your backend logs.');
      } else {
        alert('Failed to submit class request. Please try again.');
      }
    } finally {
      setClassRequestLoading(false);
    }
  };

  const handleDeleteClassRequest = async (id) => {
    const confirmDelete = window.confirm("Are you sure you want to cancel this class request?");
    if (!confirmDelete) return;
    try {
      await axios.delete(`${API_BASE_URL}/api/class-requests/${id}`);
      alert("Class request cancelled successfully");
      fetchClassRequests();
    } catch (error) {
      console.error("Delete failed:", error);
      alert("Failed to cancel class request");
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending': return '#ff9800';
      case 'Answered': return '#2196f3';
      case 'Resolved': return '#4caf50';
      default: return '#757575';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'Low': return '#4caf50';
      case 'Medium': return '#ff9800';
      case 'High': return '#f44336';
      case 'Urgent': return '#9c27b0';
      default: return '#757575';
    }
  };

  const getClassRequestStatusColor = (status) => {
    switch (status) {
      case 'Pending': return '#ff9800';
      case 'Accepted': return '#4caf50';
      case 'Rejected': return '#f44336';
      case 'Completed': return '#2196f3';
      default: return '#757575';
    }
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now - date;
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString();
  };

  const formatDateTime = (date, time) => {
    if (!date) return '';
    const d = new Date(date);
    const formatted = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    return time ? `${formatted} at ${time}` : formatted;
  };

  const handleRefresh = () => {
    fetchSubjects();
    fetchStudentQueries();
    fetchTeachers();
    fetchClassRequests();
  };

  // Inline styles for class request section (can be moved to CSS)
  const classReqStyles = {
    section: {
      margin: '2rem 0',
      background: '#fff',
      borderRadius: '16px',
      boxShadow: '0 2px 16px rgba(33,150,83,0.08)',
      overflow: 'hidden',
    },
    sectionHeader: {
      background: 'linear-gradient(135deg, #1a9e5c 0%, #27ae60 100%)',
      padding: '1.25rem 1.75rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
    },
    sectionHeaderIcon: {
      fontSize: '1.4rem',
    },
    sectionHeaderText: {
      margin: 0,
      color: '#fff',
      fontSize: '1.15rem',
      fontWeight: 600,
    },
    sectionHeaderSub: {
      margin: '0.15rem 0 0',
      color: 'rgba(255,255,255,0.8)',
      fontSize: '0.82rem',
    },
    formBody: {
      padding: '1.5rem 1.75rem',
    },
    formGrid: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '1rem',
    },
    formGroup: {
      display: 'flex',
      flexDirection: 'column',
      gap: '0.4rem',
    },
    formGroupFull: {
      display: 'flex',
      flexDirection: 'column',
      gap: '0.4rem',
      gridColumn: '1 / -1',
    },
    label: {
      fontSize: '0.82rem',
      fontWeight: 600,
      color: '#444',
      textTransform: 'uppercase',
      letterSpacing: '0.04em',
    },
    input: {
      padding: '0.65rem 0.9rem',
      border: '1.5px solid #e0e0e0',
      borderRadius: '8px',
      fontSize: '0.95rem',
      outline: 'none',
      transition: 'border-color 0.2s',
      background: '#fafafa',
    },
    select: {
      padding: '0.65rem 0.9rem',
      border: '1.5px solid #e0e0e0',
      borderRadius: '8px',
      fontSize: '0.95rem',
      outline: 'none',
      background: '#fafafa',
      cursor: 'pointer',
    },
    textarea: {
      padding: '0.65rem 0.9rem',
      border: '1.5px solid #e0e0e0',
      borderRadius: '8px',
      fontSize: '0.95rem',
      outline: 'none',
      background: '#fafafa',
      resize: 'vertical',
      minHeight: '80px',
      fontFamily: 'inherit',
    },
    errorMsg: {
      color: '#f44336',
      fontSize: '0.85rem',
      marginTop: '0.5rem',
    },
    submitBtn: {
      marginTop: '1.25rem',
      padding: '0.75rem 2rem',
      background: 'linear-gradient(135deg, #27ae60, #1a9e5c)',
      color: '#fff',
      border: 'none',
      borderRadius: '8px',
      fontSize: '0.97rem',
      fontWeight: 600,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      transition: 'opacity 0.2s',
    },
    // Cards list
    cardsList: {
      padding: '0 1.75rem 1.5rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem',
    },
    card: {
      border: '1.5px solid #e8f5e9',
      borderRadius: '12px',
      padding: '1rem 1.25rem',
      background: '#f9fffe',
      position: 'relative',
    },
    cardTopRow: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: '0.5rem',
      flexWrap: 'wrap',
      gap: '0.5rem',
    },
    subjectBadge: {
      background: '#e8f5e9',
      color: '#27ae60',
      borderRadius: '6px',
      padding: '0.2rem 0.7rem',
      fontSize: '0.85rem',
      fontWeight: 600,
    },
    statusBadge: (status) => ({
      background: getClassRequestStatusColor(status),
      color: '#fff',
      borderRadius: '6px',
      padding: '0.2rem 0.75rem',
      fontSize: '0.8rem',
      fontWeight: 600,
    }),
    teacherRow: {
      fontSize: '0.9rem',
      color: '#444',
      marginBottom: '0.35rem',
    },
    dateTimeRow: {
      fontSize: '0.85rem',
      color: '#666',
      marginBottom: '0.35rem',
    },
    reasonRow: {
      fontSize: '0.85rem',
      color: '#555',
      marginBottom: '0.5rem',
      fontStyle: 'italic',
    },
    cardFooter: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: '0.5rem',
    },
    timeAgo: {
      fontSize: '0.78rem',
      color: '#999',
    },
    deleteBtn: {
      background: 'transparent',
      border: '1px solid #f44336',
      color: '#f44336',
      borderRadius: '5px',
      padding: '0.2rem 0.6rem',
      fontSize: '0.78rem',
      cursor: 'pointer',
    },
    emptyState: {
      textAlign: 'center',
      padding: '1.5rem',
      color: '#aaa',
      fontSize: '0.9rem',
    },
    divider: {
      borderTop: '1px solid #e8f5e9',
      margin: '0 1.75rem 1.25rem',
    },
    listTitle: {
      padding: '0.75rem 1.75rem 0.5rem',
      margin: 0,
      fontSize: '1rem',
      fontWeight: 600,
      color: '#333',
    },
  };

  return (
    <div className="student-query-page">
      <div className="query-header">
        <h2>Ask Your Doubts</h2>
        <p>Get help from our expert teachers</p>
        {error && (
          <div style={{
            color: '#f44336',
            fontSize: '0.9rem',
            marginTop: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <span>{error}</span>
            <button
              onClick={handleRefresh}
              style={{
                background: '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '0.25rem 0.5rem',
                fontSize: '0.75rem',
                cursor: 'pointer'
              }}
            >
              Retry
            </button>
          </div>
        )}
      </div>

      {/* ─── Query Form ─── */}
      <div className="query-form-container">
        <form className="modern-query-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Subject *</label>
              <input
                type="text"
                placeholder="Enter subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
              />
              {fetchingSubjects && (
                <small style={{ color: '#666', fontSize: '0.8rem' }}>
                  Loading available subjects...
                </small>
              )}
            </div>

            <div className="form-group">
              <label>Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                disabled={loading}
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Your Question *</label>
            <textarea
              placeholder="Describe your doubt or question in detail..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              rows="5"
              disabled={loading}
              maxLength={1000}
            ></textarea>
            <small style={{ color: '#666', fontSize: '0.8rem' }}>
              {message.length}/1000 characters
            </small>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            className="query-submit-btn"
            disabled={loading || !subject.trim() || !message.trim()}
          >
            {loading ? 'Submitting...' : 'Submit Query'}
          </button>
        </form>
      </div>

      {/* ─── Request a Class Section ─── */}
      <div style={classReqStyles.section}>
        {/* Section Header */}
        <div style={classReqStyles.sectionHeader}>
          <span style={classReqStyles.sectionHeaderIcon}>📅</span>
          <div>
            <h3 style={classReqStyles.sectionHeaderText}>Request a Class</h3>
            <p style={classReqStyles.sectionHeaderSub}>Send a class request directly to your teacher</p>
          </div>
        </div>

        {/* Form */}
        <div style={classReqStyles.formBody}>
          <div style={classReqStyles.formGrid}>

            {/* Subject */}
            <div style={classReqStyles.formGroup}>
              <label style={classReqStyles.label}>Subject / Topic *</label>
              <input
                type="text"
                placeholder="e.g. Science – Photosynthesis"
                value={classReqSubject}
                onChange={(e) => setClassReqSubject(e.target.value)}
                style={classReqStyles.input}
                disabled={classRequestLoading}
              />
            </div>

            {/* Teacher Dropdown */}
            <div style={classReqStyles.formGroup}>
              <label style={classReqStyles.label}>Teacher *</label>
              <select
                value={classReqTeacher}
                onChange={(e) => setClassReqTeacher(e.target.value)}
                style={classReqStyles.select}
                disabled={classRequestLoading || fetchingTeachers}
              >
                <option value="">
                  {fetchingTeachers ? 'Loading teachers...' : '-- Select Teacher --'}
                </option>
                {teachers.map((t) => (
                  <option key={t._id || t.id} value={t._id || t.id}>
                    {`${t.salutation || ''} ${t.firstName} ${t.lastName}`.trim()}
                    {t.subject ? ` (${t.subject})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Preferred Date */}
            <div style={classReqStyles.formGroup}>
              <label style={classReqStyles.label}>Preferred Date *</label>
              <input
                type="date"
                value={classReqDate}
                onChange={(e) => setClassReqDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                style={classReqStyles.input}
                disabled={classRequestLoading}
              />
            </div>

            {/* Preferred Time */}
            <div style={classReqStyles.formGroup}>
              <label style={classReqStyles.label}>Preferred Time *</label>
              <input
                type="time"
                value={classReqTime}
                onChange={(e) => setClassReqTime(e.target.value)}
                style={classReqStyles.input}
                disabled={classRequestLoading}
              />
            </div>

            {/* Reason */}
            <div style={classReqStyles.formGroupFull}>
              <label style={classReqStyles.label}>Reason / Description (Optional)</label>
              <textarea
                placeholder="Why do you need this class? Any specific topics or doubts you'd like to cover..."
                value={classReqReason}
                onChange={(e) => setClassReqReason(e.target.value)}
                style={classReqStyles.textarea}
                disabled={classRequestLoading}
                maxLength={500}
              />
              <small style={{ color: '#999', fontSize: '0.78rem' }}>{classReqReason.length}/500 characters</small>
            </div>
          </div>

          {classReqError && (
            <p style={classReqStyles.errorMsg}>⚠ {classReqError}</p>
          )}

          <button
            type="button"
            onClick={handleClassRequestSubmit}
            style={{
              ...classReqStyles.submitBtn,
              opacity: classRequestLoading ? 0.7 : 1,
              cursor: classRequestLoading ? 'not-allowed' : 'pointer',
            }}
            disabled={classRequestLoading}
          >
            {classRequestLoading ? '⏳ Sending...' : '📨 Send Class Request'}
          </button>
        </div>

        {/* My Class Requests List */}
        <hr style={{ borderTop: '1px solid #e8f5e9', margin: '0 1.75rem' }} />
        <h4 style={classReqStyles.listTitle}>My Class Requests</h4>

        <div style={classReqStyles.cardsList}>
          {fetchingClassRequests ? (
            <p style={{ color: '#999', fontSize: '0.9rem' }}>Loading your class requests...</p>
          ) : classRequests.length === 0 ? (
            <div style={classReqStyles.emptyState}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🏫</div>
              <p>No class requests yet. Use the form above to request a class!</p>
            </div>
          ) : (
            classRequests.map((cr) => (
              <div key={cr._id} style={classReqStyles.card}>
                <div style={classReqStyles.cardTopRow}>
                  <span style={classReqStyles.subjectBadge}>{cr.subject}</span>
                  <span style={classReqStyles.statusBadge(cr.status || 'Pending')}>
                    {cr.status || 'Pending'}
                  </span>
                </div>

                <p style={classReqStyles.teacherRow}>
                  <strong>Teacher:</strong> {cr.teacherName || 'N/A'}
                </p>

                <p style={classReqStyles.dateTimeRow}>
                  📅 {formatDateTime(cr.preferredDate, cr.preferredTime)}
                </p>

                {cr.reason && (
                  <p style={classReqStyles.reasonRow}>"{cr.reason}"</p>
                )}

                {/* Teacher's response message */}
                {cr.responseMessage ? (
                  <div style={{
                    background: '#e8f5e9',
                    borderRadius: '8px',
                    padding: '0.6rem 0.9rem',
                    fontSize: '0.85rem',
                    color: '#2e7d32',
                    marginBottom: '0.5rem',
                    borderLeft: '3px solid #27ae60',
                  }}>
                    <strong>Teacher's Response:</strong> {cr.responseMessage}
                  </div>
                ) : (cr.status === 'Pending' || !cr.status) ? (
                  <div style={{
                    fontSize: '0.82rem', color: '#ff9800',
                    marginBottom: '0.5rem', fontStyle: 'italic'
                  }}>
                    ⏳ Waiting for teacher to respond...
                  </div>
                ) : null}

                <div style={classReqStyles.cardFooter}>
                  <span style={classReqStyles.timeAgo}>
                    Requested {cr.createdAt ? formatTimeAgo(cr.createdAt) : ''}
                  </span>
                  {(cr.status === 'Pending' || !cr.status) && (
                    <button
                      style={classReqStyles.deleteBtn}
                      onClick={() => handleDeleteClassRequest(cr._id)}
                    >
                      Cancel Request
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ─── Existing Queries Section ─── */}
      <div className="queries-section">
        <div className="section-header">
          <h3>Your Queries</h3>
          <p className="section-subtitle">Track your doubts and get expert answers</p>
          {!fetchingQueries && queries.length > 0 && (
            <button
              onClick={fetchStudentQueries}
              style={{
                background: 'transparent',
                border: '1px solid #ddd',
                borderRadius: '4px',
                padding: '0.25rem 0.5rem',
                fontSize: '0.8rem',
                cursor: 'pointer',
                marginLeft: 'auto'
              }}
            >
              Refresh
            </button>
          )}
        </div>

        <div className="query-list">
          {fetchingQueries ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <p>Loading your queries...</p>
            </div>
          ) : queries.length === 0 ? (
            <div className="no-queries">
              <div className="empty-state">
                <div className="empty-icon">?</div>
                <h4>No queries yet!</h4>
                <p>Submit your first question above to get started</p>
              </div>
            </div>
          ) : (
            queries.map((q) => (
              <div className="elegant-query-card" key={q._id}>
                <div className="card-header">
                  <div className="query-subject-badge">
                    <span className="subject-name">{q.subject}</span>
                  </div>

                  <div className="card-meta">
                    <div style={{ display: "flex", gap: "10px", marginBottom: "6px" }}>
                      <button
                        onClick={() => handleEdit(q)}
                        style={{
                          background: "#2196f3",
                          color: "white",
                          border: "none",
                          padding: "4px 10px",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontSize: "12px"
                        }}
                      >
                        Edit
                      </button>

                      <button
                        onClick={() => handleDelete(q._id)}
                        style={{
                          background: "#f44336",
                          color: "white",
                          border: "none",
                          padding: "4px 10px",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontSize: "12px"
                        }}
                      >
                        Delete
                      </button>
                    </div>

                    <div className="badges-container">
                      <span
                        className={`status-chip ${q.status.toLowerCase()}`}
                        style={{ backgroundColor: getStatusColor(q.status) }}
                      >
                        <span className="chip-dot"></span>
                        {q.status}
                      </span>
                      {q.priority && (
                        <span
                          className={`priority-chip ${q.priority.toLowerCase()}`}
                          style={{ backgroundColor: getPriorityColor(q.priority) }}
                        >
                          {q.priority}
                        </span>
                      )}
                    </div>
                    <div className="time-stamp">
                      {formatTimeAgo(q.createdAt)}
                    </div>
                  </div>
                </div>

                <div className="card-body">
                  <div className="question-box">
                    <div className="question-header">
                      <span className="question-label">Your Question</span>
                    </div>
                    <div className="question-text">{q.question}</div>
                  </div>

                  {q.reply ? (
                    <div className="reply-box">
                      <div className="reply-header">
                        <span className="reply-label">Teacher's Answer</span>
                        {q.teacherName && (
                          <span style={{ fontSize: '0.8rem', color: '#666' }}>
                            - {q.teacherName}
                          </span>
                        )}
                      </div>
                      <div className="reply-text">{q.reply}</div>
                      {q.repliedAt && (
                        <div style={{ fontSize: '0.75rem', color: '#999', marginTop: '0.5rem' }}>
                          Answered {formatTimeAgo(q.repliedAt)}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="waiting-reply">
                      <span>Waiting for teacher's response...</span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default RaiseQuery;
