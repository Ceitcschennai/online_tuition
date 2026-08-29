import React, { useState, useEffect } from 'react';
import API_BASE_URL from '../config/api';
import '../styles/studentDashboard.css';

import {
  FaTasks,
  FaCreditCard,
  FaChartLine,
  FaExternalLinkAlt,
  FaCopy,
  FaCheck,
  FaClock,
  FaCalendarAlt
} from 'react-icons/fa';

import { useLiveClass } from '../contexts/LiveClassContext';
import { markStudentJoin } from '../service/AttendanceService';


const StudentDashboard = ({ student: propStudent }) => {

  const [student, setStudent] = useState(propStudent || null);

  const [stats, setStats] = useState({
    enrolledSubjects: 0,
    pendingAssignments: 0,
    completedAssignments: 0,
    lastPayment: 'Pending',
    attendance: 0
  });

  const [loading, setLoading] = useState(true);

  const [enrolledSubjectsList, setEnrolledSubjectsList] =
    useState([]);

  const [copiedId, setCopiedId] = useState(null);

  const [scheduledClasses, setScheduledClasses] =
    useState([]);

  const { liveClasses } = useLiveClass();


  // =========================================================
  // GET STUDENT DATA
  // =========================================================

  const getStudentData = () => {

    try {

      const userData = localStorage.getItem('user');

      if (userData) {

        const parsedData = JSON.parse(userData);

        return parsedData.student || parsedData;
      }

    } catch (error) {

      console.error(
        'Error parsing user data:',
        error
      );
    }

    return null;
  };


  // =========================================================
  // LOAD STUDENT FROM LOCAL STORAGE
  // =========================================================

  useEffect(() => {

    if (!student) {

      const loadedStudent = getStudentData();

      if (loadedStudent) {

        setStudent(loadedStudent);
      }
    }

  }, [student]);


  // =========================================================
  // FETCH DASHBOARD DATA
  // =========================================================

  useEffect(() => {

    if (
      student &&
      (student.id || student._id)
    ) {

      fetchDashboardData();
    }

  }, [student]);


  // =========================================================
  // FETCH SCHEDULED CLASSES
  // ================================== =======================

  useEffect(() => {

    const fetchScheduled = async () => {

      try {

        const res = await fetch(
          `${API_BASE_URL}/api/live-classes/scheduled`
        );

        const data = await res.json();

        if (data.success) {

          setScheduledClasses(
            data.scheduledClasses || []
          );
        }

      } catch (error) {

        console.error(
          'Error fetching scheduled classes:',
          error
        );
      }
    };

    fetchScheduled();

  }, []);


  // =========================================================
  // FETCH DASHBOARD DATA
  // =========================================================

  const fetchDashboardData = async () => {

    try {

      const studentId =
        student?.id || student?._id;

      if (!studentId) {

        setLoading(false);

        return;
      }


      const studentClass = (
        student?.class ||
        localStorage.getItem('studentClass') ||
        localStorage.getItem('userClass') ||
        '10'
      )
        .toString()
        .replace(/^Class\s*/i, '');


      // =====================================================
      // FETCH ASSIGNMENTS
      // =====================================================

      const assignmentsResponse =
        await fetch(
          `${API_BASE_URL}/api/assignments/student/${studentId}?class=${studentClass}`
        );


      const assignmentsData =
        await assignmentsResponse.json();


      let pendingCount = 0;

      let completedCount = 0;


      if (
        assignmentsData.success &&
        assignmentsData.assignments
      ) {

        pendingCount =
          assignmentsData.assignments.filter(
            assignment =>
              !assignment.hasSubmitted
          ).length;


        completedCount =
          assignmentsData.assignments.filter(
            assignment =>
              assignment.hasSubmitted
          ).length;
      }


      // =====================================================
      // FETCH STUDENT DASHBOARD
      // =====================================================

      const dashboardResponse =
        await fetch(
          `${API_BASE_URL}/api/student/${studentId}/dashboard`
        );


      if (dashboardResponse.ok) {

        const dashboardData =
          await dashboardResponse.json();


        if (dashboardData.success) {

          setStats({

            enrolledSubjects:
              dashboardData.stats?.enrolledSubjects || 0,

            pendingAssignments:
              pendingCount,

            completedAssignments:
              completedCount,

            lastPayment:
              dashboardData.stats?.lastPayment ||
              'Pending',

            attendance:
              dashboardData.stats?.attendance || 0

          });


          setEnrolledSubjectsList(
            dashboardData.enrolledSubjectsList || []
          );

        } else {

          setStats(prev => ({
            ...prev,

            pendingAssignments:
              pendingCount,

            completedAssignments:
              completedCount
          }));
        }

      } else {

        setStats(prev => ({
          ...prev,

          pendingAssignments:
            pendingCount,

          completedAssignments:
            completedCount
        }));
      }

    } catch (error) {

      console.error(
        'Error fetching dashboard data:',
        error
      );

    } finally {

      setLoading(false);
    }
  };


  // =========================================================
  // COPY CLASS LINK
  // =========================================================

  const handleCopyLink = cls => {

    const link =
      cls.jitsiUrl ||
      (
        cls.roomName
          ? `https://meet.jit.si/${cls.roomName}`
          : null
      ) ||
      cls.manualLink;


    if (!link) return;


    navigator.clipboard.writeText(link);


    setCopiedId(
      cls._id || cls.id
    );


    setTimeout(
      () => setCopiedId(null),
      2000
    );
  };


  // =========================================================
  // JOIN LIVE CLASS
  // =========================================================

  const handleJoinClass = cls => {

    const link =
      cls.jitsiUrl ||
      (
        cls.roomName
          ? `https://meet.jit.si/${cls.roomName}`
          : null
      ) ||
      cls.manualLink;


    if (link) {

      markStudentJoin(
        cls,
        student
      );


      window.open(
        link,
        '_blank'
      );
    }
  };


  // =========================================================
  // STUDENT CLASS
  // =========================================================

  const studentClass =
    student?.class
      ?.toString()
      .replace(/^Class\s*/i, '') ||
    '';


  // =========================================================
  // FILTER LIVE CLASSES
  // =========================================================

  const relevantLiveClasses =
    liveClasses.filter(cls =>

      cls.isLive &&
      (
        (
          studentClass &&
          cls.class
            ?.toString()
            .replace(/^Class\s*/i, '')
            .trim() === studentClass
        ) ||

        enrolledSubjectsList.includes(
          cls.subject
        )
      )
    );


  // =========================================================
  // FILTER SCHEDULED CLASSES
  // =========================================================

  const relevantScheduled =
    scheduledClasses.filter(cls => {

      const clsClass =
        cls.class
          ?.toString()
          .replace(/^Class\s*/i, '')
          .trim();


      return (
        (
          studentClass &&
          clsClass === studentClass
        ) ||

        enrolledSubjectsList.includes(
          cls.subject
        )
      );
    });


  // =========================================================
  // NO STUDENT
  // =========================================================

  if (!student) {

    return (

      <div className="student-portal">

        <div className="student-portal-header">

          <div className="student-welcome-content">

            <div className="student-welcome-text">

              <span className="student-dashboard-label">
                STUDENT DASHBOARD
              </span>

              <h1>
                Welcome to Student Dashboard!
              </h1>

              <p>
                Please log in to view your
                student information
              </p>

            </div>

          </div>

        </div>

      </div>
    );
  }


  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {

    return (

      <div className="student-portal">

        <div className="student-portal-header">

          <div className="student-welcome-content">

            <div className="student-welcome-text">

              <span className="student-dashboard-label">
                STUDENT DASHBOARD
              </span>

              <h1>
                Loading Dashboard...
              </h1>

              <p>
                Please wait while we fetch
                your data
              </p>

            </div>

          </div>

        </div>

      </div>
    );
  }


  // =========================================================
  // MAIN DASHBOARD
  // =========================================================

  return (

    <div className="student-portal">

      <style>{`

        @import url(
          'https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap'
        );


        .live-card {

          transition:
            transform 0.2s,
            box-shadow 0.2s;
        }


        .live-card:hover {

          transform:
            translateY(-3px);

          box-shadow:
            0 10px 28px
            rgba(8,145,178,0.15) !important;
        }


        .join-btn:hover {

          opacity: 0.88;

          transform:
            scale(1.02);
        }


        .sched-card:hover {

          transform:
            translateY(-2px);

          box-shadow:
            0 8px 24px
            rgba(0,0,0,0.1) !important;
        }


        .clickable-stat-card {

          cursor: pointer;

          transition:
            transform 0.2s ease,
            box-shadow 0.2s ease;
        }


        .clickable-stat-card:hover {

          transform:
            translateY(-3px);

          box-shadow:
            0 8px 20px
            rgba(0, 0, 0, 0.12);
        }


        .clickable-stat-card:active {

          transform:
            translateY(-1px);
        }


        @keyframes pulse {

          0%, 100% {
            opacity: 1;
          }

          50% {
            opacity: 0.5;
          }

        }

      `}</style>


      {/* =====================================================
          UNIQUE WELCOME HEADER
      ===================================================== */}

      <div className="student-portal-header">

        <div className="student-welcome-content">

          <div className="student-welcome-text">

            <span className="student-dashboard-label">
              STUDENT DASHBOARD
            </span>


            <h1>

              Welcome back,{' '}

              {student?.firstName
                ? `${student.firstName}${
                    student.lastName
                      ? ` ${student.lastName}`
                      : ''
                  }`
                : 'Student'}

              !

            </h1>


            <p>
              Here's what's happening with
              your studies today
            </p>

          </div>


          <div className="student-today-card">

            <div className="student-today-icon">
              📅
            </div>


            <div className="student-today-content">

              <span>
                Today
              </span>


              <strong>

                {new Date().toLocaleDateString(
                  'en-GB',
                  {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                  }
                )}

              </strong>

            </div>

          </div>

        </div>


        <div className="student-header-stats">

          <div className="student-header-stat">

            <div className="student-header-stat-icon">
              📚
            </div>


            <div>

              <strong>
                {enrolledSubjectsList.length}
              </strong>

              <span>
                Subjects
              </span>

            </div>

          </div>


          <div className="student-header-stat">

            <div className="student-header-stat-icon">
              📝
            </div>


            <div>

              <strong>
                {stats.pendingAssignments}
              </strong>

              <span>
                Pending Assignments
              </span>

            </div>

          </div>


          <div className="student-header-stat">

            <div className="student-header-stat-icon">
              📊
            </div>


            <div>

              <strong>
                {stats.attendance}%
              </strong>

              <span>
                Attendance
              </span>

            </div>

          </div>

        </div>

      </div>


      {/* =====================================================
          STATUS BANNERS
      ===================================================== */}

      <div className="student-header-info">

        {student &&
          student.approvalStatus !==
            'Approved' && (

          <div className="student-reminder-banner">

            ⏳ Your registration is pending
            admin approval.

          </div>

        )}


        {student &&
          student.status !== 'Paid' &&
          student.approvalStatus ===
            'Approved' && (

          <div className="student-reminder-banner">

            ⚠️ You haven't completed the
            payment yet. Please contact admin.

          </div>

        )}


        {student &&
          student.status === 'Paid' && (

          <div className="student-reminder-banner student-success">

            ✅ Your account is active and
            payment is up to date!

          </div>

        )}

      </div>


      {/* =====================================================
          LIVE CLASSES NOW
      ===================================================== */}

      <div style={LS.section}>

        <div style={LS.sectionHeader}>

          <h3 style={LS.sectionTitle}>

            <span style={LS.liveDot} />

            Live Classes Now

          </h3>


          {relevantLiveClasses.length > 0 && (

            <span style={LS.liveBadge}>

              {relevantLiveClasses.length}
              {' '}
              Active

            </span>

          )}

        </div>


        {relevantLiveClasses.length === 0 ? (

          <div style={LS.emptyBox}>

            <FaClock
              style={{
                fontSize: 28,
                color: '#cbd5e1',
                marginBottom: 8
              }}
            />


            <p
              style={{
                margin: 0,
                color: '#94a3b8',
                fontSize: 14,
                fontWeight: 600
              }}
            >
              No live classes right now
            </p>


            <p
              style={{
                margin: '4px 0 0',
                color: '#cbd5e1',
                fontSize: 13
              }}
            >
              Your teacher will start a
              class and you'll see it here
            </p>

          </div>

        ) : (

          <div style={LS.liveGrid}>

            {relevantLiveClasses.map(
              cls => {

                const clsId =
                  cls._id || cls.id;


                return (

                  <div
                    key={clsId}
                    style={LS.liveCard}
                    className="live-card"
                  >

                    <div
                      style={LS.liveCardTop}
                    >

                      <div
                        style={LS.livePill}
                      >
                        🔴 LIVE
                      </div>


                      <span
                        style={LS.classBadge}
                      >
                        {cls.class}
                      </span>

                    </div>


                    <h4
                      style={LS.liveSubject}
                    >
                      {cls.subject}
                    </h4>


                    <p
                      style={LS.liveTeacher}
                    >
                      👨‍🏫 {cls.teacher}
                    </p>


                    <div
                      style={LS.liveLink}
                    >

                      <span
                        style={LS.liveLinkText}
                      >

                        {cls.jitsiUrl ||
                          `https://meet.jit.si/${cls.roomName}`}

                      </span>

                    </div>


                    <div
                      style={LS.liveBtns}
                    >

                      <button
                        style={LS.joinBtn}
                        className="join-btn"
                        onClick={() =>
                          handleJoinClass(cls)
                        }
                      >

                        <FaExternalLinkAlt
                          style={{
                            marginRight: 7
                          }}
                        />

                        Join Class

                      </button>


                      <button
                        style={{
                          ...LS.copyLinkBtn,

                          ...(copiedId === clsId
                            ? LS.copyLinkBtnDone
                            : {})
                        }}

                        onClick={() =>
                          handleCopyLink(cls)
                        }

                        title="Copy link"
                      >

                        {copiedId === clsId
                          ? <FaCheck />
                          : <FaCopy />
                        }

                      </button>

                    </div>

                  </div>
                );
              }
            )}

          </div>

        )}

      </div>


      {/* =====================================================
          UPCOMING CLASSES
      ===================================================== */}

      <div style={LS.section}>

        <div style={LS.sectionHeader}>

          <h3
            style={{
              ...LS.sectionTitle,
              color: '#1e293b'
            }}
          >

            <FaCalendarAlt
              style={{
                marginRight: 10,
                color: '#0891b2'
              }}
            />

            Upcoming Classes

          </h3>


          {relevantScheduled.length > 0 && (

            <span
              style={{
                ...LS.liveBadge,
                background: '#e0f2fe',
                color: '#0369a1'
              }}
            >

              {relevantScheduled.length}
              {' '}
              Scheduled

            </span>

          )}

        </div>


        {relevantScheduled.length === 0 ? (

          <div style={LS.emptyBox}>

            <FaCalendarAlt
              style={{
                fontSize: 28,
                color: '#cbd5e1',
                marginBottom: 8
              }}
            />


            <p
              style={{
                margin: 0,
                color: '#94a3b8',
                fontSize: 14,
                fontWeight: 600
              }}
            >
              No upcoming classes scheduled
            </p>


            <p
              style={{
                margin: '4px 0 0',
                color: '#cbd5e1',
                fontSize: 13
              }}
            >
              Your teacher will schedule
              classes and they'll appear here
            </p>

          </div>

        ) : (

          <div style={LS.liveGrid}>

            {relevantScheduled.map(
              cls => {

                const clsId =
                  cls._id || cls.id;


                const link =
                  cls.jitsiUrl ||
                  (
                    cls.roomName
                      ? `https://meet.jit.si/${cls.roomName}`
                      : null
                  ) ||
                  cls.manualLink;


                return (

                  <div
                    key={clsId}
                    style={LS.schedCard}
                    className="sched-card"
                  >

                    <div
                      style={LS.schedCardTop}
                    >

                      <span
                        style={LS.schedBadge}
                      >
                        {cls.platform ||
                          'Jitsi Meet'}
                      </span>


                      <span
                        style={LS.classBadge}
                      >
                        {cls.class ||
                          cls.studentClass}
                      </span>

                    </div>


                    <h4
                      style={LS.liveSubject}
                    >
                      {cls.className ||
                        cls.subject}
                    </h4>


                    <div className="upcoming-class-details">

                      <div className="upcoming-detail-item">

                        <span className="upcoming-detail-label">
                          Subject
                        </span>

                        <span className="upcoming-detail-value">
                          {cls.subject ||
                            'Not specified'}
                        </span>

                      </div>


                      <div className="upcoming-detail-item">

                        <span className="upcoming-detail-label">
                          Faculty
                        </span>

                        <span className="upcoming-detail-value">
                          {cls.teacher ||
                            cls.teacherName ||
                            'Not specified'}
                        </span>

                      </div>

                    </div>


                    <div
                      style={{
                        ...LS.liveLink,
                        background: '#f8fafc',
                        border:
                          '1px solid #e2e8f0'
                      }}
                    >

                      <span
                        style={{
                          ...LS.liveLinkText,
                          color: '#475569'
                        }}
                      >

                        📅{' '}
                        {cls.date ||
                          cls.scheduledDate}

                        &nbsp;⏰{' '}

                        {cls.time ||
                          cls.scheduledTime}

                      </span>

                    </div>


                    {cls.description && (

                      <p
                        style={{
                          fontSize: 12,
                          color: '#94a3b8',
                          fontStyle: 'italic',
                          margin: '8px 0'
                        }}
                      >
                        "{cls.description}"
                      </p>

                    )}


                    {link ? (

                      <div
                        style={LS.liveBtns}
                      >

                        <button
                          style={{
                            ...LS.joinBtn,
                            background:
                              'linear-gradient(135deg,#7c3aed,#6d28d9)'
                          }}
                          className="join-btn"
                          onClick={() =>
                            window.open(
                              link,
                              '_blank'
                            )
                          }
                        >

                          <FaExternalLinkAlt
                            style={{
                              marginRight: 7
                            }}
                          />

                          Open Link

                        </button>


                        <button
                          style={{
                            ...LS.copyLinkBtn,

                            ...(copiedId === clsId
                              ? LS.copyLinkBtnDone
                              : {})
                          }}

                          onClick={() =>
                            handleCopyLink(cls)
                          }

                          title="Copy link"
                        >

                          {copiedId === clsId
                            ? <FaCheck />
                            : <FaCopy />
                          }

                        </button>

                      </div>

                    ) : (

                      <p
                        style={{
                          fontSize: 12,
                          color: '#f59e0b',
                          fontWeight: 600,
                          marginTop: 10
                        }}
                      >
                        ⏳ Link will be shared
                        by teacher
                      </p>

                    )}

                  </div>
                );
              }
            )}

          </div>

        )}

      </div>


      {/* =====================================================
          STATS CARDS
      ===================================================== */}

      <div className="student-cards-row">

        <div className="student-vertical-cards">


          {/* =================================================
              PENDING ASSIGNMENTS
          ================================================= */}

          <div
            className="
              student-stat-card
              student-primary-vertical
              clickable-stat-card
            "

            onClick={() => {
              window.location.href =
                '/assignments';
            }}

            role="button"

            tabIndex={0}

            onKeyDown={(e) => {

              if (
                e.key === 'Enter' ||
                e.key === ' '
              ) {

                window.location.href =
                  '/assignments';
              }

            }}
          >

            <div className="student-stat-content">

              <FaTasks
                className="student-stat-icon"
              />

              <h4>
                {stats.pendingAssignments}
              </h4>

              <h4>
                Pending Assignments
              </h4>

            </div>

          </div>


          {/* =================================================
              PAYMENT STATUS
          ================================================= */}

          <div
            className="
              student-stat-card
              student-info-vertical
              clickable-stat-card
            "

            onClick={() => {
              window.location.href =
                '/payments';
            }}

            role="button"

            tabIndex={0}

            onKeyDown={(e) => {

              if (
                e.key === 'Enter' ||
                e.key === ' '
              ) {

                window.location.href =
                  '/payments';
              }

            }}
          >

            <div className="student-stat-content">

              <FaCreditCard
                className="student-stat-icon"
              />


              <h4>
                {stats.lastPayment}
              </h4>


              <h4>
                Payment Status
              </h4>

            </div>

          </div>


        </div>


        {/* ===================================================
            PROGRESS OVERVIEW
        =================================================== */}

        <div className="student-progress-overview-card">

          <h3 className="student-section-title">

            <FaChartLine
              className="student-section-icon"
            />

            Progress Overview

          </h3>


          <div className="student-progress-container">


            {/* ATTENDANCE */}

            <div className="student-progress-item">

              <div className="student-progress-header">

                <span>
                  Overall Attendance
                </span>


                <span className="student-progress-value">
                  {stats.attendance}%
                </span>

              </div>


              <div className="student-progress-bar">

                <div
                  className="student-progress-fill"

                  style={{
                    width:
                      `${stats.attendance}%`
                  }}
                />

              </div>

            </div>


            {/* ASSIGNMENT COMPLETION */}

            <div className="student-progress-item">

              <div className="student-progress-header">

                <span>
                  Assignment Completion
                </span>


                <span className="student-progress-value">

                  {
                    stats.completedAssignments +
                    stats.pendingAssignments > 0

                      ? Math.round(
                          (
                            stats.completedAssignments /
                            (
                              stats.completedAssignments +
                              stats.pendingAssignments
                            )
                          ) * 100
                        )

                      : 0
                  }%

                </span>

              </div>


              <div className="student-progress-bar">

                <div
                  className="student-progress-fill"

                  style={{
                    width:
                      `${
                        stats.completedAssignments +
                        stats.pendingAssignments > 0

                          ? Math.round(
                              (
                                stats.completedAssignments /
                                (
                                  stats.completedAssignments +
                                  stats.pendingAssignments
                                )
                              ) * 100
                            )

                          : 0
                      }%`
                  }}
                />

              </div>

            </div>


            {/* COURSE PROGRESS */}

            <div className="student-progress-item">

              <div className="student-progress-header">

                <span>
                  Course Progress
                </span>


                <span className="student-progress-value">
                  0%
                </span>

              </div>


              <div className="student-progress-bar">

                <div
                  className="student-progress-fill"

                  style={{
                    width: '0%'
                  }}
                />

              </div>

            </div>


          </div>


          {/* =================================================
              SUBJECTS
          ================================================= */}

          {enrolledSubjectsList.length > 0 && (

            <div
              className="student-subjects-section"
              style={{
                marginTop: '20px'
              }}
            >

              <h4>
                Subjects Available for Your Class:
              </h4>


              <div className="student-subjects-list">

                {enrolledSubjectsList.map(
                  (subject, index) => (

                    <span
                      key={index}
                      className="student-subject-tag"
                    >
                      {subject}
                    </span>

                  )
                )}

              </div>

            </div>

          )}

        </div>

      </div>

    </div>
  );
};


// =============================================================
// LIVE / SCHEDULED CLASS STYLES
// =============================================================

const LS = {

  section: {
    margin: '24px 0 8px',
    fontFamily:
      "'Nunito', sans-serif"
  },


  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingBottom: 10,
    borderBottom:
      '2px solid #e2e8f0'
  },


  sectionTitle: {
    margin: 0,
    fontSize: 17,
    fontWeight: 800,
    color: '#1e293b',
    display: 'flex',
    alignItems: 'center',
    gap: 10
  },


  liveDot: {
    display: 'inline-block',
    width: 10,
    height: 10,
    borderRadius: '50%',
    background: '#ef4444',
    animation:
      'pulse 1.5s ease-in-out infinite'
  },


  liveBadge: {
    background: '#fee2e2',
    color: '#dc2626',
    fontSize: 12,
    fontWeight: 700,
    padding: '3px 12px',
    borderRadius: 20
  },


  emptyBox: {
    background: '#f8fafc',
    border:
      '2px dashed #e2e8f0',
    borderRadius: 14,
    padding: '32px 20px',
    textAlign: 'center'
  },


  liveGrid: {
    display: 'grid',
    gridTemplateColumns:
      'repeat(auto-fill, minmax(260px, 1fr))',
    gap: 16
  },


  liveCard: {
    background: '#fff',
    borderRadius: 14,
    padding: '18px',
    boxShadow:
      '0 2px 12px rgba(8,145,178,0.08)',
    border:
      '1.5px solid #e0f2fe'
  },


  schedCard: {
    background: '#fff',
    borderRadius: 14,
    padding: '18px',
    boxShadow:
      '0 2px 12px rgba(0,0,0,0.06)',
    border:
      '1.5px solid #ede9fe',
    transition:
      'transform 0.2s, box-shadow 0.2s'
  },


  liveCardTop: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10
  },


  schedCardTop: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10
  },


  livePill: {
    fontSize: 11,
    fontWeight: 800,
    color: '#dc2626',
    background: '#fee2e2',
    padding: '3px 10px',
    borderRadius: 20
  },


  schedBadge: {
    fontSize: 11,
    fontWeight: 700,
    color: '#7c3aed',
    background: '#ede9fe',
    padding: '3px 10px',
    borderRadius: 20
  },


  classBadge: {
    fontSize: 11,
    fontWeight: 700,
    color: '#0369a1',
    background: '#e0f2fe',
    padding: '3px 10px',
    borderRadius: 20
  },


  liveSubject: {
    margin: '0 0 4px',
    fontSize: 16,
    fontWeight: 800,
    color: '#0f172a'
  },


  liveTeacher: {
    margin: '0 0 4px',
    fontSize: 13,
    color: '#64748b'
  },


  liveLink: {
    background: '#f0f9ff',
    border:
      '1px solid #bae6fd',
    borderRadius: 7,
    padding: '7px 10px',
    marginBottom: 12,
    overflow: 'hidden'
  },


  liveLinkText: {
    fontSize: 11,
    color: '#0369a1',
    fontWeight: 600,
    wordBreak: 'break-all'
  },


  liveBtns: {
    display: 'flex',
    gap: 8
  },


  joinBtn: {
    flex: 1,
    background:
      'linear-gradient(135deg,#0891b2,#0e7490)',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '9px 14px',
    fontWeight: 700,
    fontSize: 13,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily:
      "'Nunito', sans-serif",
    transition:
      'opacity 0.15s, transform 0.15s'
  },


  copyLinkBtn: {
    background: '#f0f9ff',
    border:
      '1.5px solid #0891b2',
    color: '#0891b2',
    borderRadius: 8,
    padding: '9px 13px',
    cursor: 'pointer',
    fontSize: 14,
    display: 'flex',
    alignItems: 'center',
    transition:
      'background 0.15s'
  },


  copyLinkBtnDone: {
    background: '#16a34a',
    color: '#fff',
    border:
      '1.5px solid #16a34a'
  }

};


export default StudentDashboard;