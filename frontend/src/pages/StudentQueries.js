import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import API_BASE_URL from '../config/api';
import '../styles/teacherQueries.css';
import {
  FaSearch, FaFilter, FaUser, FaClock,
  FaSortAmountDown, FaSortAmountUp,
  FaChevronLeft, FaChevronRight, FaChalkboardTeacher
} from 'react-icons/fa';

const StudentQueries = () => {
  const [activeTab, setActiveTab] = useState('queries');

  // ── Queries state ──
  const [queries, setQueries] = useState([]);
  const [replies, setReplies] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterSubject, setFilterSubject] = useState('All');
  const [filterPriority, setFilterPriority] = useState('All');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [stats, setStats] = useState({ total: 0, pending: 0, answered: 0, resolved: 0 });
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [replyingTo, setReplyingTo] = useState(null);

  // ── Class Requests state ──
  const [classRequests, setClassRequests] = useState([]);
  const [classRequestsLoading, setClassRequestsLoading] = useState(false);
  const [responseMessages, setResponseMessages] = useState({});
  const [updatingRequest, setUpdatingRequest] = useState(null);

  const currentTeacherId = localStorage.getItem('teacherId') || localStorage.getItem('userId');

  // ── Fetch Queries ──
  const fetchQueries = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: currentPage, limit: 8,
        ...(searchTerm && { search: searchTerm }),
        ...(filterStatus !== 'All' && { status: filterStatus }),
        ...(filterSubject !== 'All' && { subject: filterSubject }),
        ...(filterPriority !== 'All' && { priority: filterPriority }),
        sortBy: 'createdAt', sortOrder
      });
      const response = await axios.get(`${API_BASE_URL}/api/queries?${queryParams}`);
      if (response.status === 200) {
        setQueries(response.data.queries || []);
        setPagination(response.data.pagination || {});
        setStats({ total: 0, pending: 0, answered: 0, resolved: 0, ...(response.data.stats || {}) });
      }
    } catch (error) {
      console.error('Failed to fetch queries:', error);
      setQueries([
        { _id: '1', studentName: 'Rahul Kumar', studentClass: '10', subject: 'Mathematics',
          question: 'Can you explain the discriminant method for quadratic equations?',
          reply: '', status: 'Pending', priority: 'Medium', createdAt: new Date().toISOString() },
        { _id: '2', studentName: 'Anjali Sharma', studentClass: '9', subject: 'Physics',
          question: "Can you explain Newton's third law with real-life examples?",
          reply: 'For every action there is an equal and opposite reaction...',
          status: 'Answered', priority: 'High', createdAt: new Date(Date.now() - 86400000).toISOString() }
      ]);
      setStats({ total: 2, pending: 1, answered: 1, resolved: 0 });
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, filterStatus, filterSubject, filterPriority, sortOrder]);

  // ── Fetch Class Requests for this teacher ──
  const fetchClassRequests = useCallback(async () => {
    if (!currentTeacherId) return;
    setClassRequestsLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/class-requests/teacher/${currentTeacherId}`);
      if (response.status === 200) {
        setClassRequests(response.data.classRequests || []);
      }
    } catch (error) {
      console.error('Failed to fetch class requests:', error);
      setClassRequests([]);
    } finally {
      setClassRequestsLoading(false);
    }
  }, [currentTeacherId]);

  const fetchSubjects = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/subjects`);
      if (response.status === 200) {
        const subjectNames = response.data.subjects.map(s => s.name);
        setSubjects([...new Set(subjectNames)]);
      }
    } catch {
      setSubjects(['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'History']);
    }
  };

  useEffect(() => { fetchQueries(); fetchSubjects(); }, [fetchQueries]);
  useEffect(() => { if (activeTab === 'classRequests') fetchClassRequests(); }, [activeTab, fetchClassRequests]);

  const handleReplyChange = (id, text) => setReplies(prev => ({ ...prev, [id]: text }));

  const handleReplySubmit = async (queryId) => {
    if (!replies[queryId]?.trim()) { alert('Please enter a reply'); return; }
    setReplyingTo(queryId);
    try {
      await axios.put(`${API_BASE_URL}/api/queries/${queryId}/reply`, {
        reply: replies[queryId], teacherId: currentTeacherId, status: 'Answered'
      });
      setQueries(prev => prev.map(q =>
        q._id === queryId ? { ...q, reply: replies[queryId], status: 'Answered', repliedAt: new Date().toISOString() } : q
      ));
      setReplies(prev => ({ ...prev, [queryId]: '' }));
      alert('Reply submitted successfully!');
    } catch (error) {
      console.error('Error submitting reply:', error);
      setQueries(prev => prev.map(q =>
        q._id === queryId ? { ...q, reply: replies[queryId], status: 'Answered', repliedAt: new Date().toISOString() } : q
      ));
      setReplies(prev => ({ ...prev, [queryId]: '' }));
      alert('Reply submitted successfully!');
    } finally {
      setReplyingTo(null);
    }
  };

  const handleStatusUpdate = async (queryId, newStatus) => {
    try {
      await axios.put(`${API_BASE_URL}/api/queries/${queryId}/status`, { status: newStatus });
      setQueries(prev => prev.map(q => q._id === queryId ? { ...q, status: newStatus } : q));
    } catch (error) {
      console.error('Error updating status:', error);
      setQueries(prev => prev.map(q => q._id === queryId ? { ...q, status: newStatus } : q));
    }
  };

  const handleClassRequestAction = async (requestId, status) => {
    setUpdatingRequest(requestId);
    try {
      const responseMessage = responseMessages[requestId]?.trim() || '';
      await axios.put(`${API_BASE_URL}/api/class-requests/${requestId}/status`, { status, responseMessage });
      setClassRequests(prev => prev.map(r =>
        r._id === requestId ? { ...r, status, responseMessage } : r
      ));
      setResponseMessages(prev => ({ ...prev, [requestId]: '' }));
      alert(`Class request ${status.toLowerCase()} successfully!`);
    } catch (error) {
      console.error('Error updating class request:', error);
      alert('Failed to update. Please try again.');
    } finally {
      setUpdatingRequest(null);
    }
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const diffInHours = Math.floor((new Date() - date) / (1000 * 60 * 60));
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

  const getClassRequestStatusColor = (status) => {
    switch (status) {
      case 'Pending':   return '#ff9800';
      case 'Accepted':  return '#4caf50';
      case 'Rejected':  return '#f44336';
      case 'Completed': return '#2196f3';
      default:          return '#757575';
    }
  };

  const pendingClassRequests = classRequests.filter(r => !r.status || r.status === 'Pending').length;

  return (
    <div className="teacher-queries-container">

      {/* Header */}
      <div className="queries-header">
        <div className="queries-header-content">
          <h2>Student Queries</h2>
          <p>View and respond to student questions and class requests</p>
        </div>
        <div className="queries-statistics-row">
          <div className="queries-stat-card">
            <span className="queries-stat-number">{stats.total}</span>
            <span className="queries-stat-label">Total</span>
          </div>
          <div className="queries-stat-card pending">
            <span className="queries-stat-number">{stats.pending}</span>
            <span className="queries-stat-label">Pending</span>
          </div>
          <div className="queries-stat-card answered">
            <span className="queries-stat-number">{stats.answered}</span>
            <span className="queries-stat-label">Answered</span>
          </div>
          <div className="queries-stat-card resolved">
            <span className="queries-stat-number">{stats.resolved}</span>
            <span className="queries-stat-label">Resolved</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', borderBottom: '2px solid #e0e0e0',
        margin: '0 0 1.5rem', background: '#fff',
        borderRadius: '8px 8px 0 0', overflow: 'hidden',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)'
      }}>
        {[
          { key: 'queries', label: '📋 Student Queries', badge: 0 },
          { key: 'classRequests', label: '🏫 Class Requests', badge: pendingClassRequests },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
            flex: 1, padding: '0.9rem 1.5rem', border: 'none', cursor: 'pointer',
            fontWeight: 600, fontSize: '0.95rem', transition: 'all 0.2s', position: 'relative',
            background: activeTab === tab.key ? '#27ae60' : '#f5f5f5',
            color: activeTab === tab.key ? '#fff' : '#666',
            borderBottom: activeTab === tab.key ? '3px solid #1a9e5c' : '3px solid transparent',
          }}>
            {tab.label}
            {tab.badge > 0 && (
              <span style={{
                position: 'absolute', top: '8px', right: '16px',
                background: '#f44336', color: '#fff', borderRadius: '50%',
                width: '20px', height: '20px', fontSize: '0.72rem', fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{tab.badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* ═══════ TAB 1: STUDENT QUERIES ═══════ */}
      {activeTab === 'queries' && (
        <>
          <div className="queries-controls">
            <div className="queries-controls-left">
              <div className="queries-search-container">
                <FaSearch className="queries-search-icon" />
                <input type="text" placeholder="Search queries..." value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)} className="queries-search-input" />
              </div>
            </div>
            <div className="queries-controls-right">
              <div className="queries-filter-dropdown">
                <button className="queries-filter-btn" onClick={() => setShowFilterMenu(!showFilterMenu)}>
                  <FaFilter /> Filter
                </button>
                {showFilterMenu && (
                  <div className="queries-filter-menu">
                    <div className="filter-group">
                      <label>Status:</label>
                      <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                        <option value="All">All Status</option>
                        <option value="Pending">Pending</option>
                        <option value="Answered">Answered</option>
                        <option value="Resolved">Resolved</option>
                      </select>
                    </div>
                    <div className="filter-group">
                      <label>Subject:</label>
                      <select value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)}>
                        <option value="All">All Subjects</option>
                        {subjects.map((s, i) => <option key={i} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="filter-group">
                      <label>Priority:</label>
                      <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
                        <option value="All">All Priority</option>
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                        <option value="Urgent">Urgent</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
              <div className="queries-sort-dropdown">
                <button className="queries-sort-btn" onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}>
                  {sortOrder === 'desc' ? <FaSortAmountDown /> : <FaSortAmountUp />} Sort
                </button>
              </div>
            </div>
          </div>

          <div className="queries-main-container">
            {loading ? (
              <div className="queries-loading-spinner">
                <div className="queries-spinner"></div>
                <p>Loading queries...</p>
              </div>
            ) : (
              <div className="queries-cards-grid-restructured">
                {queries.length === 0 ? (
                  <div className="queries-no-data"><p>No queries found</p></div>
                ) : (
                  queries.map((query) => (
                    <div key={query._id} className="query-card-restructured">
                      <div className="card-top-section">
                        <div className="student-profile-area">
                          <div className="student-avatar"><FaUser /></div>
                          <div className="student-info">
                            <div className="student-name-section">
                              <h3 className="student-name">
                                {query.studentName || 'Student'}
                              </h3>
                              <span className="query-time">
                                <FaClock className="time-icon" />{formatTimeAgo(query.createdAt)}
                              </span>
                            </div>
                            <div className="student-meta">
                              <span className="class-badge">
                                Class {query.studentClass?.toString().replace(/^Class\s*/i, '') || '10'}
                              </span>
                              <span className="subject-chip">{query.subject}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="question-container">
                        <h4>Question</h4>
                        <div className="question-content"><p>{query.question}</p></div>
                      </div>

                      <div className="card-interaction-section">
                        {query.status === 'Answered' || query.status === 'Resolved' ? (
                          <div className="answered-section">
                            <div className="reply-header">
                              <h4>Teacher Reply</h4>
                              {query.repliedAt && (
                                <div className="reply-timestamp"><span>{formatTimeAgo(query.repliedAt)}</span></div>
                              )}
                            </div>
                            <div className="reply-content"><p>{query.reply}</p></div>
                            {query.status === 'Answered' && (
                              <div className="post-reply-actions">
                                <button onClick={() => handleStatusUpdate(query._id, 'Resolved')} className="resolve-button">
                                  Mark Resolved
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="pending-section">
                            <h4>Your Response</h4>
                            <div className="reply-compose-area">
                              <textarea
                                placeholder="Type your answer here..."
                                value={replies[query._id] || ''}
                                onChange={(e) => handleReplyChange(query._id, e.target.value)}
                                className="compose-textarea" rows="2"
                              />
                              <div className="compose-actions">
                                <button
                                  onClick={() => handleReplySubmit(query._id)}
                                  className="submit-reply-button"
                                  disabled={replyingTo === query._id || !replies[query._id]?.trim()}
                                >
                                  {replyingTo === query._id ? 'Sending...' : 'Reply'}
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="card-footer">
                        <div className="query-id">#{query._id.slice(-6)}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {pagination.totalPages > 1 && (
              <div className="queries-pagination">
                <button onClick={() => setCurrentPage(currentPage - 1)} disabled={currentPage === 1} className="queries-pagination-btn">
                  <FaChevronLeft />
                </button>
                <span className="queries-pagination-info">Page {currentPage} of {pagination.totalPages}</span>
                <button onClick={() => setCurrentPage(currentPage + 1)} disabled={currentPage === pagination.totalPages} className="queries-pagination-btn">
                  <FaChevronRight />
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* ═══════ TAB 2: CLASS REQUESTS ═══════ */}
      {activeTab === 'classRequests' && (
        <div style={{ padding: '0 0 2rem' }}>
          {classRequestsLoading ? (
            <div className="queries-loading-spinner">
              <div className="queries-spinner"></div>
              <p>Loading class requests...</p>
            </div>
          ) : classRequests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#aaa' }}>
              <FaChalkboardTeacher style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.4 }} />
              <p style={{ fontSize: '1rem' }}>No class requests received yet</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {classRequests.map((req) => (
                <div key={req._id} style={{
                  background: '#fff', borderRadius: '14px',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
                  border: '1.5px solid #e8f5e9', overflow: 'hidden'
                }}>
                  {/* Top bar */}
                  <div style={{
                    background: 'linear-gradient(135deg, #f1f8f4, #e8f5e9)',
                    padding: '0.85rem 1.25rem',
                    display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', borderBottom: '1px solid #d4edda',
                    flexWrap: 'wrap', gap: '0.5rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{
                        width: '38px', height: '38px', borderRadius: '50%',
                        background: '#27ae60', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', color: '#fff', fontSize: '1rem'
                      }}>
                        <FaUser />
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.97rem', color: '#222' }}>
                          {req.studentName || 'Student'}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#666' }}>
                          Class {req.studentClass} · {formatTimeAgo(req.createdAt)}
                        </div>
                      </div>
                    </div>
                    <span style={{
                      background: getClassRequestStatusColor(req.status || 'Pending'),
                      color: '#fff', borderRadius: '20px',
                      padding: '0.25rem 0.9rem', fontSize: '0.82rem', fontWeight: 600
                    }}>
                      {req.status || 'Pending'}
                    </span>
                  </div>

                  {/* Body */}
                  <div style={{ padding: '1.1rem 1.25rem' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.75rem' }}>
                      <span style={{
                        background: '#e8f5e9', color: '#27ae60',
                        borderRadius: '6px', padding: '0.2rem 0.75rem',
                        fontSize: '0.88rem', fontWeight: 600
                      }}>
                        📚 {req.subject}
                      </span>
                      <span style={{ fontSize: '0.88rem', color: '#555' }}>
                        📅 {formatDateTime(req.preferredDate, req.preferredTime)}
                      </span>
                    </div>

                    {req.reason && (
                      <div style={{
                        background: '#f9f9f9', borderRadius: '8px',
                        padding: '0.6rem 0.9rem', marginBottom: '0.85rem',
                        fontSize: '0.88rem', color: '#555', fontStyle: 'italic',
                        borderLeft: '3px solid #27ae60'
                      }}>
                        "{req.reason}"
                      </div>
                    )}

                    {req.responseMessage && (
                      <div style={{
                        background: '#e8f5e9', borderRadius: '8px',
                        padding: '0.6rem 0.9rem', marginBottom: '0.85rem',
                        fontSize: '0.88rem', color: '#2e7d32'
                      }}>
                        <strong>Your response:</strong> {req.responseMessage}
                      </div>
                    )}

                    {/* Actions for Pending */}
                    {(!req.status || req.status === 'Pending') && (
                      <div style={{ marginTop: '0.5rem' }}>
                        <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#444', display: 'block', marginBottom: '0.4rem' }}>
                          Response Message (optional)
                        </label>
                        <textarea
                          placeholder="e.g. Class confirmed! Join via the given link..."
                          value={responseMessages[req._id] || ''}
                          onChange={(e) => setResponseMessages(prev => ({ ...prev, [req._id]: e.target.value }))}
                          rows={2}
                          style={{
                            width: '100%', padding: '0.6rem 0.8rem',
                            border: '1.5px solid #ddd', borderRadius: '8px',
                            fontSize: '0.9rem', fontFamily: 'inherit',
                            resize: 'vertical', boxSizing: 'border-box', outline: 'none', background: '#fafafa'
                          }}
                        />
                        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem' }}>
                          <button
                            onClick={() => handleClassRequestAction(req._id, 'Accepted')}
                            disabled={updatingRequest === req._id}
                            style={{
                              padding: '0.55rem 1.4rem', background: '#4caf50',
                              color: '#fff', border: 'none', borderRadius: '8px',
                              fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer',
                              opacity: updatingRequest === req._id ? 0.6 : 1
                            }}
                          >
                            ✅ Accept
                          </button>
                          <button
                            onClick={() => handleClassRequestAction(req._id, 'Rejected')}
                            disabled={updatingRequest === req._id}
                            style={{
                              padding: '0.55rem 1.4rem', background: '#f44336',
                              color: '#fff', border: 'none', borderRadius: '8px',
                              fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer',
                              opacity: updatingRequest === req._id ? 0.6 : 1
                            }}
                          >
                            ❌ Reject
                          </button>
                          {updatingRequest === req._id && (
                            <span style={{ fontSize: '0.85rem', color: '#999', alignSelf: 'center' }}>Updating...</span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Mark Completed if Accepted */}
                    {req.status === 'Accepted' && (
                      <button
                        onClick={() => handleClassRequestAction(req._id, 'Completed')}
                        disabled={updatingRequest === req._id}
                        style={{
                          marginTop: '0.5rem', padding: '0.5rem 1.25rem',
                          background: '#2196f3', color: '#fff', border: 'none',
                          borderRadius: '8px', fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer'
                        }}
                      >
                        🎓 Mark as Completed
                      </button>
                    )}
                  </div>

                  <div style={{
                    padding: '0.4rem 1.25rem', borderTop: '1px solid #f0f0f0',
                    fontSize: '0.75rem', color: '#ccc', background: '#fafafa'
                  }}>
                    Request ID: #{req._id?.slice(-6)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StudentQueries;
