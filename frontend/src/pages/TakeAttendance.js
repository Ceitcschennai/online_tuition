import React, { useState, useEffect, useRef } from 'react';
/* eslint-disable react-hooks/exhaustive-deps */
import axios from 'axios';
import API_BASE_URL from '../config/api';
import {
  FaClock,
  FaCheckCircle,
  FaTimesCircle,
  FaSpinner,
  FaDownload,
  FaEye,
  FaTimes,
  FaChevronLeft,
  FaChevronRight,
  FaExclamationTriangle,
  FaInfoCircle,
  FaCalendarAlt,
  FaHistory,
  FaSignInAlt,
  FaSignOutAlt,
  FaSearch
} from 'react-icons/fa';
import '../styles/takeAttendance.css';

// ── Inline StudentAttendanceSearch Component ──
const StudentAttendanceSearch = ({ students = [], attendanceRecords = [], formatTime, formatDuration }) => {
  const [query, setQuery] = useState('');

  const filtered = query.trim()
    ? students.filter(s => {
        const fullName = `${s.salutation || ''} ${s.firstName} ${s.lastName}`.trim().toLowerCase();
        return (
          fullName.includes(query.toLowerCase()) ||
          (s.email && s.email.toLowerCase().includes(query.toLowerCase()))
        );
      })
    : [];

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 400 }}>
          <FaSearch style={{
            position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
            color: '#94a3b8', fontSize: 14
          }} />
          <input
            type="text"
            placeholder="Search student by name or email..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{
              paddingLeft: 36, paddingRight: 12, paddingTop: 9, paddingBottom: 9,
              borderRadius: 8, border: '1px solid #e2e8f0', width: '100%',
              fontSize: 14, outline: 'none', boxSizing: 'border-box'
            }}
          />
        </div>
        {query && (
          <button
            onClick={() => setQuery('')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 18 }}
          >
            <FaTimes />
          </button>
        )}
      </div>

      {query.trim() && filtered.length === 0 && (
        <p style={{ color: '#94a3b8', fontSize: 14 }}>No students found matching "{query}"</p>
      )}

      {filtered.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(student => {
            const record = attendanceRecords.find(r => r.studentId === student._id);
            const duration = student.duration || 0;
            return (
              <div key={student._id} style={{
                background: '#f8fafc', borderRadius: 10, padding: '12px 16px',
                border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', flexWrap: 'wrap', gap: 8
              }}>
                <div>
                  <p style={{ fontWeight: 600, fontSize: 14, margin: 0, color: '#1e293b' }}>
                    {`${student.salutation || ''} ${student.firstName} ${student.lastName}`.trim()}
                  </p>
                  <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>{student.email}</p>
                </div>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13, color: '#16a34a' }}>
                    <FaSignInAlt style={{ marginRight: 4 }} />
                    {record?.firstJoinTime ? formatTime(record.firstJoinTime) : '—'}
                  </span>
                  <span style={{ fontSize: 13, color: '#ef4444' }}>
                    <FaSignOutAlt style={{ marginRight: 4 }} />
                    {record?.lastLeaveTime
                      ? formatTime(record.lastLeaveTime)
                      : student.isPresent ? 'Still in class' : '—'}
                  </span>
                  <span style={{
                    fontSize: 13, fontWeight: 600,
                    color: duration >= 45 ? '#16a34a' : '#f59e0b'
                  }}>
                    <FaClock style={{ marginRight: 4 }} />
                    {formatDuration(duration)}
                  </span>
                  <span style={{
                    fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                    background: student.status === 'Present' ? '#dcfce7' : '#fee2e2',
                    color: student.status === 'Present' ? '#16a34a' : '#ef4444'
                  }}>
                    {student.status === 'Present' ? <FaCheckCircle style={{ marginRight: 4 }} /> : <FaTimesCircle style={{ marginRight: 4 }} />}
                    {student.status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ── Main TakeAttendance Component ──
const TakeAttendance = () => {
  const [teacher, setTeacher] = useState(null);
  const [assignedClasses, setAssignedClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [students, setStudents] = useState([]);
  const [liveSession, setLiveSession] = useState(null);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterStatus, setFilterStatus] = useState('All');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeLiveClass, setActiveLiveClass] = useState(null);
  const [isAutoTracking, setIsAutoTracking] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [exportStartDate, setExportStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [exportEndDate, setExportEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const studentsPerPage = 10;

  const filterRef = useRef(null);
  const timerRef = useRef(null);
  const trackingIntervalRef = useRef(null);
  const liveClassCheckRef = useRef(null);

  const getTeacherData = () => {
    try {
      const teacherData = localStorage.getItem('teacher');
      if (teacherData) return JSON.parse(teacherData);
      const userData = localStorage.getItem('user');
      if (userData) {
        const parsed = JSON.parse(userData);
        return parsed.teacher || parsed;
      }
      return null;
    } catch (error) {
      console.error('Error getting teacher data:', error);
      return null;
    }
  };

  const loadTeacherAssignments = () => {
    const teacherData = getTeacherData();
    if (!teacherData) { setLoading(false); return; }

    const teacherId = teacherData._id || teacherData.id;
    setTeacher({ id: teacherId, _id: teacherId, ...teacherData });

    let classes =
      teacherData.classesAssigned ||
      teacherData.assignedClasses ||
      teacherData.classes ||
      (teacherData.classAssigned
        ? Array.isArray(teacherData.classAssigned)
          ? teacherData.classAssigned
          : [teacherData.classAssigned]
        : []) ||
      (teacherData.class ? [teacherData.class] : []);

    let subjects =
      teacherData.subjects ||
      teacherData.assignedSubjects ||
      teacherData.subjectsAssigned ||
      (teacherData.subject ? [teacherData.subject] : []);

    classes = (Array.isArray(classes) ? classes : [classes]).flat().filter(Boolean);
    subjects = (Array.isArray(subjects) ? subjects : [subjects]).flat().filter(Boolean);

    console.log('Teacher data loaded:', { teacherData, classes, subjects });

    if (classes.length === 0) {
      classes = ['Class 1','Class 2','Class 3','Class 4','Class 5',
                 'Class 6','Class 7','Class 8','Class 9','Class 10'];
    }
    if (subjects.length === 0) {
      subjects = ['Mathematics','Science','English','History','Geography',
                  'Physics','Chemistry','Biology','Computer Science'];
    }

    setAssignedClasses(classes);
    setAvailableSubjects(subjects);
    setSelectedClass(classes[0]);
    setSelectedSubject(subjects[0]);
    setLoading(false);
  };

  const fetchStudents = async () => {
    if (!selectedClass) return;
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/students/by-class/${selectedClass}`);
      let studentsData = response.data.students || response.data || [];
      setStudents(studentsData.map(s => ({ ...s, status: 'Absent', duration: 0, isPresent: false })));
    } catch (error) {
      console.error('Error fetching students:', error);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const checkForActiveLiveClass = async () => {
    if (!teacher || !selectedClass || !selectedSubject) return;
    try {
      const response = await axios.get(`${API_BASE_URL}/api/live-classes`);
      const liveClasses = response.data || [];
      const matchingClass = liveClasses.find(
        cls => cls.subject === selectedSubject && cls.class === selectedClass &&
               cls.teacherId === teacher.id && cls.isLive
      );
      if (matchingClass) {
        setActiveLiveClass(matchingClass);
        await autoStartAttendanceSession(matchingClass);
      } else {
        if (isAutoTracking) { setIsAutoTracking(false); setActiveLiveClass(null); }
      }
    } catch (error) { console.error('Error checking live class:', error); }
  };

  const autoStartAttendanceSession = async (liveClass) => {
    try {
      const checkResponse = await axios.get(`${API_BASE_URL}/api/attendance/active-session`, {
        params: { teacherId: teacher.id, class: selectedClass, subject: selectedSubject, date: selectedDate }
      });

      if (checkResponse.data.success && checkResponse.data.session) {
        setLiveSession(checkResponse.data.session);
        setSessionStartTime(new Date(checkResponse.data.session.startTime));
        setIsAutoTracking(true);
        loadSessionAttendance(checkResponse.data.session._id);
      } else {
        const teacherName = `${teacher.salutation || ''} ${teacher.firstName || ''} ${teacher.lastName || ''}`.trim();
        const response = await axios.post(`${API_BASE_URL}/api/attendance/start-session`, {
          teacherId: teacher.id, teacherName: teacherName || 'Unknown Teacher',
          class: selectedClass, subject: selectedSubject, date: selectedDate,
          liveClassId: liveClass.id, autoStarted: true
        });
        if (response.data.success) {
          setLiveSession(response.data.session);
          setSessionStartTime(new Date());
          setIsAutoTracking(true);
        }
      }
    } catch (error) { console.error('Error auto-starting session:', error); }
  };

  const loadSessionAttendance = async (sessionId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/attendance/session/${sessionId}`);
      if (response.data.success) {
        const records = response.data.records;
        setAttendanceRecords(records);
        setStudents(prevStudents =>
          prevStudents.map(student => {
            const record = records.find(r => r.studentId === student._id);
            if (record) {
              const duration = record.totalDuration || record.duration || 0;
              const status = duration >= 45 ? 'Present' : 'Absent';
              const isActiveInClass = record.firstJoinTime && !record.lastLeaveTime;
              return { ...student, status, duration, isPresent: isActiveInClass };
            }
            return student;
          })
        );
      }
    } catch (error) { console.error('Error loading session attendance:', error); }
  };

  const autoTrackAttendance = async () => {
    if (!activeLiveClass || !liveSession) return;
    try {
      const response = await axios.get(`${API_BASE_URL}/api/live-classes`);
      const liveClasses = response.data || [];
      const currentClass = liveClasses.find(cls => cls.id === activeLiveClass.id);

      if (!currentClass || !currentClass.isLive) {
        setIsAutoTracking(false); setActiveLiveClass(null);
        await autoEndSession(); return;
      }

      const participants = currentClass.participants || [];
      setLastSyncTime(new Date());

      for (const participant of participants) {
        const student = students.find(s =>
          s.email === participant.email ||
          `${s.firstName} ${s.lastName}`.trim().toLowerCase() === participant.name?.toLowerCase()
        );
        if (student && !student.isPresent) await markAttendance(student, 'join', true);
      }

      const activeStudents = students.filter(s => s.isPresent);
      for (const student of activeStudents) {
        const stillInClass = participants.some(p =>
          p.email === student.email ||
          p.name?.toLowerCase() === `${student.firstName} ${student.lastName}`.trim().toLowerCase()
        );
        if (!stillInClass) await markAttendance(student, 'leave', true);
      }
    } catch (error) { console.error('Error auto-tracking:', error); }
  };

  const autoEndSession = async () => {
    if (!liveSession) return;
    try {
      await axios.post(`${API_BASE_URL}/api/attendance/end-session`, {
        sessionId: liveSession._id, endTime: new Date(), autoEnded: true
      });
      setLiveSession(null); setSessionStartTime(null); setIsAutoTracking(false);
    } catch (error) { console.error('Error auto-ending session:', error); }
  };

  const markAttendance = async (student, action, isAuto = false) => {
    if (!liveSession) return;
    try {
      const response = await axios.post(`${API_BASE_URL}/api/attendance/mark`, {
        sessionId: liveSession._id,
        studentId: student._id,
        studentName: `${student.salutation || ''} ${student.firstName} ${student.lastName}`.trim(),
        action, timestamp: new Date(), class: selectedClass, subject: selectedSubject,
        isAutoTracked: isAuto
      });
      if (response.data.success) loadSessionAttendance(liveSession._id);
    } catch (error) { console.error('Error marking attendance:', error); }
  };

  const handleManualMark = async (student, action) => {
    if (!liveSession) {
      alert('No active session. Please start a live class first.');
      return;
    }
    await markAttendance(student, action, false);
  };

  const startDurationTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      if (liveSession) loadSessionAttendance(liveSession._id);
    }, 60000);
  };

  const exportCurrentSession = async () => {
    if (!liveSession) { alert('No active session to export'); return; }
    try {
      const response = await axios.get(`${API_BASE_URL}/api/attendance/export/${liveSession._id}`, {
        responseType: 'blob'
      });
      if (response.data.size === 0) { alert('No attendance data found.'); return; }
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'text/csv' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `attendance_${selectedClass}_${selectedSubject}_${selectedDate}.csv`);
      document.body.appendChild(link); link.click(); link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) { alert('Failed to export. Please try again.'); }
  };

  const exportByDateRange = async () => {
    if (!exportStartDate || !exportEndDate) { alert('Please select both dates'); return; }
    if (new Date(exportStartDate) > new Date(exportEndDate)) { alert('Start date cannot be later than end date'); return; }
    try {
      const response = await axios.post(`${API_BASE_URL}/api/attendance/export-range`, {
        class: selectedClass, subject: selectedSubject,
        startDate: exportStartDate, endDate: exportEndDate, teacherId: teacher.id
      }, { responseType: 'blob' });
      if (response.data.size === 0) { alert('No records found for this date range.'); return; }
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'text/csv' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `attendance_history_${selectedClass}_${exportStartDate}_to_${exportEndDate}.csv`);
      document.body.appendChild(link); link.click(); link.remove();
      window.URL.revokeObjectURL(url);
      setShowExportModal(false);
    } catch (error) { alert('Export failed. Please try again.'); }
  };

  const formatDuration = (minutes) => {
    if (!minutes || minutes === 0) return '0m';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const formatTime = (dateString) => {
    if (!dateString) return '—';
    try {
      return new Date(dateString).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch (e) { return '—'; }
  };

  const getSessionDuration = () => {
    if (!sessionStartTime) return '0m';
    const diff = Math.floor((new Date() - sessionStartTime) / 1000 / 60);
    return formatDuration(diff);
  };

  const getStudentRecord = (studentId) => {
    return attendanceRecords.find(r => r.studentId === studentId) || null;
  };

  const getFilteredStudents = () => {
    if (filterStatus === 'All') return students;
    if (filterStatus === 'Present') return students.filter(s => s.status === 'Present');
    if (filterStatus === 'Absent') return students.filter(s => s.status === 'Absent');
    if (filterStatus === 'In Class') return students.filter(s => s.isPresent);
    return students;
  };

  const filteredStudents = getFilteredStudents();
  const indexOfLastStudent = currentPage * studentsPerPage;
  const indexOfFirstStudent = indexOfLastStudent - studentsPerPage;
  const currentStudents = filteredStudents.slice(indexOfFirstStudent, indexOfLastStudent);
  const totalPages = Math.ceil(filteredStudents.length / studentsPerPage);

  const getStats = () => {
    const total = students.length;
    const present = students.filter(s => s.status === 'Present').length;
    const inClass = students.filter(s => s.isPresent).length;
    const absent = total - present;
    return { total, present, absent, inClass, attendanceRate: total > 0 ? Math.round((present / total) * 100) : 0 };
  };
  const stats = getStats();

   useEffect(() => {
     loadTeacherAssignments();
     return () => {
       if (timerRef.current) clearInterval(timerRef.current);
       if (trackingIntervalRef.current) clearInterval(trackingIntervalRef.current);
       if (liveClassCheckRef.current) clearInterval(liveClassCheckRef.current);
     };
   }, []); // eslint-disable-line react-hooks/exhaustive-deps

   useEffect(() => { if (selectedClass && selectedSubject) fetchStudents(); }, [selectedClass, selectedSubject]); // eslint-disable-line react-hooks/exhaustive-deps

 useEffect(() => {
      if (selectedClass && selectedSubject && teacher) {
        checkForActiveLiveClass();
        liveClassCheckRef.current = setInterval(checkForActiveLiveClass, 10000);
      }
      return () => { if (liveClassCheckRef.current) clearInterval(liveClassCheckRef.current); };
    }, [selectedClass, selectedSubject, teacher, checkForActiveLiveClass]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
      if (isAutoTracking && liveSession && activeLiveClass) {
        startDurationTimer();
        trackingIntervalRef.current = setInterval(autoTrackAttendance, 15000);
        autoTrackAttendance();
      } else {
        if (trackingIntervalRef.current) clearInterval(trackingIntervalRef.current);
      }
      return () => { if (trackingIntervalRef.current) clearInterval(trackingIntervalRef.current); };
    }, [isAutoTracking, liveSession, activeLiveClass, autoTrackAttendance]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
      if (selectedDate && selectedClass && selectedSubject && teacher) checkForActiveLiveClass();
    }, [selectedDate]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) setShowFilterMenu(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (loading) return (
    <div className="attendance-loading">
      <FaSpinner className="spinner" />
      <p>Loading attendance system...</p>
    </div>
  );

  if (!teacher) return (
    <div className="attendance-loading">
      <FaExclamationTriangle style={{ fontSize: '4rem', color: '#f59e0b' }} />
      <h3>Not Logged In</h3>
      <p>Please log in as a teacher to access attendance.</p>
    </div>
  );

  return (
    <div className="take-attendance-container">

      {/* ── HEADER ── */}
      <div className="attendance-header">
        <div className="att-header-content">
          <h2>Attendance Tracking</h2>
          <p>Automatic real-time attendance tracking for live classes</p>
        </div>
        <div className="attendance-statistics-row">
          <div className="attendance-stat-card">
            <span className="attendance-stat-number">{stats.total}</span>
            <span className="attendance-stat-label">Total</span>
          </div>
          <div className="attendance-stat-card" style={{ borderColor: '#16a34a' }}>
            <span className="attendance-stat-number" style={{ color: '#16a34a' }}>{stats.present}</span>
            <span className="attendance-stat-label">Present</span>
          </div>
          <div className="attendance-stat-card" style={{ borderColor: '#ef4444' }}>
            <span className="attendance-stat-number" style={{ color: '#ef4444' }}>{stats.absent}</span>
            <span className="attendance-stat-label">Absent</span>
          </div>
          <div className="attendance-stat-card" style={{ borderColor: '#0891b2' }}>
            <span className="attendance-stat-number" style={{ color: '#0891b2' }}>{stats.inClass}</span>
            <span className="attendance-stat-label">In Class Now</span>
          </div>
        </div>
      </div>

      {/* ── STATUS BANNER ── */}
      {isAutoTracking && activeLiveClass ? (
        <div className="auto-tracking-active-banner">
          <div className="banner-content">
            <div className="banner-info">
              <p>
                🔴 Live class is running • Attendance is being tracked automatically
                {lastSyncTime && ` • Last sync: ${formatTime(lastSyncTime)}`}
              </p>
            </div>
          </div>
          <div className="banner-meta">
            <span className="duration-badge-large"><FaClock /> {getSessionDuration()}</span>
          </div>
        </div>
      ) : (
        <div className="auto-tracking-waiting-banner">
          <div className="banner-content">
            <FaInfoCircle className="banner-icon" />
            <div className="banner-info">
              <h4>Waiting for Live Class</h4>
              <p>Start a live class from the Subjects page to begin automatic attendance tracking</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Student Attendance Search ── */}
      <section className="search-attendance-section">
        <div className="section-container">
          <div className="section-header">
            <h2>Check Student Attendance</h2>
          </div>
          <StudentAttendanceSearch
            students={students}
            attendanceRecords={attendanceRecords}
            formatTime={formatTime}
            formatDuration={formatDuration}
          />
        </div>
      </section>

      {/* ── CONTROLS ── */}
      <div className="attendance-controls">
        <div className="controls-left">
          <div className="control-group">
            <label>Class</label>
            <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="control-select">
              {assignedClasses.map((cls, i) => <option key={i} value={cls}>{cls}</option>)}
            </select>
          </div>
          <div className="control-group">
            <label>Subject</label>
            <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)} className="control-select">
              {availableSubjects.map((s, i) => <option key={i} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="control-group">
            <label>Date</label>
            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]} className="control-input" />
          </div>
        </div>

        <div className="controls-right">
          <div className="filter-dropdown" ref={filterRef}>
            <button className="filter-btn" onClick={() => setShowFilterMenu(!showFilterMenu)}>
              Filter: {filterStatus}
            </button>
            {showFilterMenu && (
              <div className="filter-menu">
                {['All', 'Present', 'Absent', 'In Class'].map(option => (
                  <div key={option}
                    className={`filter-option ${filterStatus === option ? 'active' : ''}`}
                    onClick={() => { setFilterStatus(option); setShowFilterMenu(false); }}>
                    {option}
                  </div>
                ))}
              </div>
            )}
          </div>
          {liveSession && (
            <button onClick={exportCurrentSession} className="export-btn">
              <FaDownload /> Export
            </button>
          )}
          <button onClick={() => setShowExportModal(true)} className="export-history-btn">
            <FaHistory /> Export History
          </button>
        </div>
      </div>

      {/* ── ATTENDANCE RULE ── */}
      <div className="attendance-rule-info">
        <p>Students must stay in the live class for at least <strong>45 minutes</strong> to be marked Present.</p>
      </div>

      {/* ── STUDENTS TABLE ── */}
      <div className="attendance-table-container">
        {currentStudents.length === 0 ? (
          <div className="no-students">
            <FaExclamationTriangle className="no-data-icon" />
            <p>No students found for this class</p>
          </div>
        ) : (
          <>
            <table className="attendance-table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Student Name</th>
                  <th><FaSignInAlt style={{ marginRight: 5, color: '#16a34a' }} />Join Time</th>
                  <th><FaSignOutAlt style={{ marginRight: 5, color: '#ef4444' }} />Leave Time</th>
                  <th>Duration</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentStudents.map((student, index) => {
                  const record = getStudentRecord(student._id);
                  return (
                    <tr key={student._id} className={student.isPresent ? 'present-row' : ''}>
                      <td>{indexOfFirstStudent + index + 1}</td>
                      <td>
                        <div className="student-name-cell">
                          {student.isPresent && (
                            <span style={{
                              display: 'inline-block', width: 8, height: 8,
                              borderRadius: '50%', background: '#16a34a',
                              marginRight: 8, animation: 'pulse 1.5s infinite'
                            }} title="Currently in class" />
                          )}
                          <span className="student-name">
                            {`${student.salutation || ''} ${student.firstName} ${student.lastName}`.trim()}
                          </span>
                          <span className="student-email">{student.email}</span>
                        </div>
                      </td>

                      {/* Join Time */}
                      <td>
                        <span style={{
                          fontSize: 13, fontWeight: 600,
                          color: record?.firstJoinTime ? '#16a34a' : '#94a3b8'
                        }}>
                          {record?.firstJoinTime ? formatTime(record.firstJoinTime) : '—'}
                        </span>
                      </td>

                      {/* Leave Time */}
                      <td>
                        <span style={{
                          fontSize: 13, fontWeight: 600,
                          color: record?.lastLeaveTime ? '#ef4444' : (student.isPresent ? '#0891b2' : '#94a3b8')
                        }}>
                          {record?.lastLeaveTime
                            ? formatTime(record.lastLeaveTime)
                            : student.isPresent ? 'Still in class' : '—'}
                        </span>
                      </td>

                      {/* Duration */}
                      <td>
                        <span className={`duration-badge ${student.duration >= 45 ? 'sufficient' : 'insufficient'}`}>
                          <FaClock />
                          {formatDuration(student.duration)}
                          {student.duration >= 45 && <span className="sufficient-mark">✓</span>}
                        </span>
                      </td>

                      {/* Status */}
                      <td>
                        <span className={`status-badge ${student.status.toLowerCase()}`}>
                          {student.status === 'Present' ? <FaCheckCircle /> : <FaTimesCircle />}
                          {student.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td>
                        <div className="att-action-buttons">
                          <button
                            onClick={() => { setSelectedStudent({ ...student, record }); setShowDetailsModal(true); }}
                            className="action-btn view-details" title="View Details"
                          >
                            <FaEye />
                          </button>
                          {!student.isPresent && liveSession && (
                            <button
                              onClick={() => handleManualMark(student, 'join')}
                              className="action-btn"
                              title="Manually mark as joined"
                              style={{ background: '#dcfce7', color: '#16a34a', border: '1px solid #16a34a', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', fontSize: 12 }}
                            >
                              <FaSignInAlt />
                            </button>
                          )}
                          {student.isPresent && liveSession && (
                            <button
                              onClick={() => handleManualMark(student, 'leave')}
                              className="action-btn"
                              title="Manually mark as left"
                              style={{ background: '#fee2e2', color: '#ef4444', border: '1px solid #ef4444', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', fontSize: 12 }}
                            >
                              <FaSignOutAlt />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div className="pagination">
                <button onClick={() => setCurrentPage(currentPage - 1)} disabled={currentPage === 1} className="pagination-btn">
                  <FaChevronLeft />
                </button>
                <span className="pagination-info">Page {currentPage} of {totalPages}</span>
                <button onClick={() => setCurrentPage(currentPage + 1)} disabled={currentPage === totalPages} className="pagination-btn">
                  <FaChevronRight />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── EXPORT HISTORY MODAL ── */}
      {showExportModal && (
        <div className="attendance-modal-overlay" onClick={() => setShowExportModal(false)}>
          <div className="attendance-modal-content export-modal" onClick={(e) => e.stopPropagation()}>
            <div className="attendance-modal-header">
              <h3><FaHistory /> Export Attendance History</h3>
              <button className="attendance-modal-close" onClick={() => setShowExportModal(false)}><FaTimes /></button>
            </div>
            <div className="attendance-modal-body">
              <div className="date-range-picker">
                <div className="date-input-group">
                  <label><FaCalendarAlt /> Start Date</label>
                  <input type="date" value={exportStartDate}
                    onChange={(e) => setExportStartDate(e.target.value)}
                    max={new Date().toISOString().split('T')[0]} className="date-input" />
                </div>
                <div className="date-input-group">
                  <label><FaCalendarAlt /> End Date</label>
                  <input type="date" value={exportEndDate}
                    onChange={(e) => setExportEndDate(e.target.value)}
                    max={new Date().toISOString().split('T')[0]} min={exportStartDate} className="date-input" />
                </div>
              </div>
              <div className="export-summary">
                <p><strong>Class:</strong> {selectedClass}</p>
                <p><strong>Subject:</strong> {selectedSubject}</p>
              </div>
              <button onClick={exportByDateRange} className="export-confirm-btn"
                disabled={!exportStartDate || !exportEndDate}>
                <FaDownload /> Export CSV
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── STUDENT DETAILS MODAL ── */}
      {showDetailsModal && selectedStudent && (
        <div className="attendance-modal-overlay" onClick={() => setShowDetailsModal(false)}>
          <div className="attendance-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="attendance-modal-header">
              <h3>Student Attendance Details</h3>
              <button className="attendance-modal-close" onClick={() => setShowDetailsModal(false)}><FaTimes /></button>
            </div>
            <div className="attendance-modal-body">
              <div className="detail-group">
                <label>Student Name</label>
                <p>{`${selectedStudent.salutation || ''} ${selectedStudent.firstName} ${selectedStudent.lastName}`.trim()}</p>
              </div>
              <div className="detail-group">
                <label>Class</label>
                <p>{selectedStudent.class}</p>
              </div>
              <div className="detail-group">
                <label>Email</label>
                <p>{selectedStudent.email}</p>
              </div>
              <div className="detail-group">
                <label><FaSignInAlt style={{ marginRight: 6, color: '#16a34a' }} />First Joined</label>
                <p style={{ color: '#16a34a', fontWeight: 700 }}>
                  {selectedStudent.record?.firstJoinTime ? formatTime(selectedStudent.record.firstJoinTime) : '—'}
                </p>
              </div>
              <div className="detail-group">
                <label><FaSignOutAlt style={{ marginRight: 6, color: '#ef4444' }} />Last Left</label>
                <p style={{ color: '#ef4444', fontWeight: 700 }}>
                  {selectedStudent.record?.lastLeaveTime
                    ? formatTime(selectedStudent.record.lastLeaveTime)
                    : selectedStudent.isPresent ? 'Still in class' : '—'}
                </p>
              </div>
              <div className="detail-group">
                <label>Total Duration</label>
                <p className={`duration-highlight ${selectedStudent.duration >= 45 ? 'sufficient' : 'insufficient'}`}>
                  {formatDuration(selectedStudent.duration)}
                  {selectedStudent.duration >= 45 ? ' ✓ (Sufficient)' : ' (Below 45 min threshold)'}
                </p>
              </div>
              <div className="detail-group">
                <label>Status</label>
                <span className={`status-badge ${selectedStudent.status.toLowerCase()}`}>
                  {selectedStudent.status}
                </span>
              </div>
              {selectedStudent.record?.sessionHistory?.length > 0 && (
                <div className="detail-group">
                  <label>Session History</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
                    {selectedStudent.record.sessionHistory.map((session, i) => (
                      <div key={i} style={{ background: '#f8fafc', borderRadius: 8, padding: '8px 12px', fontSize: 13, display: 'flex', gap: 16 }}>
                        <span style={{ color: '#16a34a' }}>
                          <FaSignInAlt style={{ marginRight: 4 }} />
                          {session.joinedAt ? formatTime(session.joinedAt) : '—'}
                        </span>
                        <span style={{ color: '#94a3b8' }}>→</span>
                        <span style={{ color: '#ef4444' }}>
                          <FaSignOutAlt style={{ marginRight: 4 }} />
                          {session.leftAt ? formatTime(session.leftAt) : 'Still in class'}
                        </span>
                        {session.durationMinutes > 0 && (
                          <span style={{ color: '#475569', marginLeft: 'auto' }}>
                            {formatDuration(session.durationMinutes)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TakeAttendance;
