import React, {
  useState,
  useEffect,
  useCallback
} from 'react';

import axios from 'axios';

import API_BASE_URL from '../config/api';

import '../styles/teacherQueries.css';

import {
  FaSearch,
  FaFilter,
  FaUser,
  FaClock,
  FaSortAmountDown,
  FaSortAmountUp,
  FaChevronLeft,
  FaChevronRight,
  FaChalkboardTeacher
} from 'react-icons/fa';


const StudentQueries = () => {

  /* =========================================================
     ACTIVE TAB
  ========================================================= */

  const [activeTab, setActiveTab] = useState('queries');


  /* =========================================================
     STUDENT QUERIES STATE
  ========================================================= */

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

  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    answered: 0,
    resolved: 0
  });

  const [showFilterMenu, setShowFilterMenu] = useState(false);

  const [subjects, setSubjects] = useState([]);

  const [replyingTo, setReplyingTo] = useState(null);


  /* =========================================================
     CLASS REQUESTS STATE
  ========================================================= */

  const [classRequests, setClassRequests] = useState([]);

  const [classRequestsLoading, setClassRequestsLoading] =
    useState(false);

  const [responseMessages, setResponseMessages] =
    useState({});

  const [updatingRequest, setUpdatingRequest] =
    useState(null);


  /* =========================================================
     TEACHER ASSIGNMENTS
     
     IMPORTANT:
     This contains the exact subjects + classes
     assigned to the current teacher.
  ========================================================= */

  const [teacherAssignments, setTeacherAssignments] =
    useState([]);

  const [teacherAssignmentsLoading, setTeacherAssignmentsLoading] =
    useState(false);


  /* =========================================================
     CURRENT TEACHER
  ========================================================= */

  const currentTeacherId =
    localStorage.getItem('teacherId') ||
    localStorage.getItem('userId');


  /* =========================================================
     NORMALIZE CLASS
     
     Handles:
       "12"
       "Class 12"
       "class 12"
  ========================================================= */

  const normalizeClass = useCallback((value) => {

    return String(value || '')
      .replace(/^Class\s*/i, '')
      .trim()
      .toLowerCase();

  }, []);


  /* =========================================================
     NORMALIZE SUBJECT
     
     Handles:
       "English"
       " english "
       "ENGLISH"
  ========================================================= */

  const normalizeSubject = useCallback((value) => {

    return String(value || '')
      .trim()
      .toLowerCase();

  }, []);


  /* =========================================================
     FETCH STUDENT QUERIES
  ========================================================= */

  const fetchQueries = useCallback(async () => {

    setLoading(true);

    try {

      const queryParams = new URLSearchParams({

        page: currentPage,

        limit: 8,

        ...(searchTerm && {
          search: searchTerm
        }),

        ...(filterStatus !== 'All' && {
          status: filterStatus
        }),

        ...(filterSubject !== 'All' && {
          subject: filterSubject
        }),

        ...(filterPriority !== 'All' && {
          priority: filterPriority
        }),

        ...(currentTeacherId && {
          teacherId: currentTeacherId
        }),

        sortBy: 'createdAt',

        sortOrder

      });


      const response = await axios.get(
        `${API_BASE_URL}/api/queries?${queryParams}`
      );


      if (response.status === 200) {

        setQueries(
          response.data.queries || []
        );


        setPagination(
          response.data.pagination || {}
        );


        setStats({

          total: 0,

          pending: 0,

          answered: 0,

          resolved: 0,

          ...(response.data.stats || {})

        });

      }

    } catch (error) {

      console.error(
        'Failed to fetch queries:',
        error
      );


      /*
       * Fallback demo data.
       */

      setQueries([

        {

          _id: '1',

          studentName: 'Rahul Kumar',

          studentClass: '10',

          subject: 'Mathematics',

          question:
            'Can you explain the discriminant method for quadratic equations?',

          reply: '',

          status: 'Pending',

          priority: 'Medium',

          createdAt:
            new Date().toISOString()

        },

        {

          _id: '2',

          studentName: 'Anjali Sharma',

          studentClass: '9',

          subject: 'Physics',

          question:
            "Can you explain Newton's third law with real-life examples?",

          reply:
            'For every action there is an equal and opposite reaction...',

          status: 'Answered',

          priority: 'High',

          createdAt:
            new Date(
              Date.now() - 86400000
            ).toISOString()

        }

      ]);


      setStats({

        total: 2,

        pending: 1,

        answered: 1,

        resolved: 0

      });

    } finally {

      setLoading(false);

    }

  }, [

    currentPage,

    searchTerm,

    filterStatus,

    filterSubject,

    filterPriority,

    sortOrder,

    currentTeacherId

  ]);


  /* =========================================================
     FETCH TEACHER'S EXACT SUBJECT + CLASS ASSIGNMENTS
     
     Example result:
     
     [
       {
         name: "English",
         classes: ["9", "12"]
       },
       {
         name: "Physics",
         classes: ["10"]
       }
     ]
  ========================================================= */

  const fetchTeacherAssignments = useCallback(async () => {

    if (!currentTeacherId) {

      setTeacherAssignments([]);

      return;

    }


    setTeacherAssignmentsLoading(true);


    try {

      const response = await axios.get(

        `${API_BASE_URL}/api/teacher/subjects/${currentTeacherId}`

      );


      if (

        response.status === 200 &&

        response.data?.success

      ) {

        const assignments =
          Array.isArray(response.data.subjects)

            ? response.data.subjects

            : [];


        setTeacherAssignments(
          assignments
        );

      } else {

        setTeacherAssignments([]);

      }

    } catch (error) {

      console.error(

        'Failed to fetch teacher subject assignments:',

        error

      );


      setTeacherAssignments([]);

    } finally {

      setTeacherAssignmentsLoading(false);

    }

  }, [currentTeacherId]);


  /* =========================================================
     CHECK WHETHER THIS TEACHER IS REALLY ASSIGNED
     TO THE REQUEST'S SUBJECT + CLASS
     
     THIS IS THE MAIN FIX.
  ========================================================= */

  const isTeacherAllowedForRequest = useCallback(

    (request) => {

      if (!request) {

        return false;

      }


      const requestSubject =
        normalizeSubject(
          request.subject
        );


      const requestClass =
        normalizeClass(
          request.studentClass
        );


      if (
        !requestSubject ||
        !requestClass
      ) {

        return false;

      }


      return teacherAssignments.some(
        (assignment) => {

          const assignmentSubject =
            normalizeSubject(
              assignment.name ||
              assignment.subjectName ||
              assignment.subject ||
              ''
            );


          const assignmentClasses =
            Array.isArray(
              assignment.classes
            )
              ? assignment.classes
              : [];


          const subjectMatches =
            assignmentSubject ===
            requestSubject;


          const classMatches =
            assignmentClasses.some(
              (assignedClass) =>

                normalizeClass(
                  assignedClass
                ) === requestClass
            );


          return (
            subjectMatches &&
            classMatches
          );

        }
      );

    },

    [
      teacherAssignments,
      normalizeClass,
      normalizeSubject
    ]

  );


  /* =========================================================
     FETCH CLASS REQUESTS
     
     First fetch requests for this teacher.
     
     Then filter them using:
     
       SUBJECT + CLASS
     
     NOT class alone.
  ========================================================= */

  const fetchClassRequests = useCallback(async () => {

    if (!currentTeacherId) {

      setClassRequests([]);

      return;

    }


    setClassRequestsLoading(true);


    try {

      /*
       * Make sure the teacher's assignments
       * are available before filtering.
       */

      let assignments =
        teacherAssignments;


      if (
        assignments.length === 0
      ) {

        try {

          const assignmentResponse =
            await axios.get(

              `${API_BASE_URL}/api/teacher/subjects/${currentTeacherId}`

            );


          if (

            assignmentResponse.status === 200 &&

            assignmentResponse.data?.success

          ) {

            assignments =
              Array.isArray(
                assignmentResponse.data.subjects
              )
                ? assignmentResponse.data.subjects
                : [];


            setTeacherAssignments(
              assignments
            );

          }

        } catch (assignmentError) {

          console.error(

            'Unable to load teacher assignments:',

            assignmentError

          );

        }

      }


      const response = await axios.get(

        `${API_BASE_URL}/api/class-requests/teacher/${currentTeacherId}`

      );


      if (response.status === 200) {

        const receivedRequests =
          Array.isArray(
            response.data.classRequests
          )
            ? response.data.classRequests
            : [];


        /*
         * Filter using the exact subject + class.
         */

        const allowedRequests =
          receivedRequests.filter(
            (request) => {

              const requestSubject =
                normalizeSubject(
                  request.subject
                );


              const requestClass =
                normalizeClass(
                  request.studentClass
                );


              if (
                !requestSubject ||
                !requestClass
              ) {

                return false;

              }


              return assignments.some(
                (assignment) => {

                  const assignmentSubject =
                    normalizeSubject(

                      assignment.name ||

                      assignment.subjectName ||

                      assignment.subject ||

                      ''

                    );


                  const assignmentClasses =
                    Array.isArray(
                      assignment.classes
                    )
                      ? assignment.classes
                      : [];


                  const subjectMatches =
                    assignmentSubject ===
                    requestSubject;


                  const classMatches =
                    assignmentClasses.some(

                      (assignedClass) =>

                        normalizeClass(
                          assignedClass
                        ) === requestClass

                    );


                  return (
                    subjectMatches &&
                    classMatches
                  );

                }
              );

            }
          );


        setClassRequests(
          allowedRequests
        );

      } else {

        setClassRequests([]);

      }

    } catch (error) {

      console.error(

        'Failed to fetch class requests:',

        error

      );


      setClassRequests([]);

    } finally {

      setClassRequestsLoading(false);

    }

  }, [

    currentTeacherId,

    teacherAssignments,

    normalizeClass,

    normalizeSubject

  ]);


  /* =========================================================
     FETCH SUBJECTS
  ========================================================= */

  const fetchSubjects = useCallback(async () => {

    try {

      const response = await axios.get(

        `${API_BASE_URL}/api/subjects`

      );


      if (response.status === 200) {

        const subjectNames =

          Array.isArray(
            response.data.subjects
          )

            ? response.data.subjects.map(
                subject => subject.name
              )

            : [];


        setSubjects([

          ...new Set(
            subjectNames
          )

        ]);

      }

    } catch {

      setSubjects([

        'Mathematics',

        'Physics',

        'Chemistry',

        'Biology',

        'English',

        'History'

      ]);

    }

  }, []);


  /* =========================================================
     EFFECTS
  ========================================================= */

  useEffect(() => {

    fetchQueries();

    fetchSubjects();

  }, [

    fetchQueries,

    fetchSubjects

  ]);


  /* =========================================================
     LOAD TEACHER ASSIGNMENTS
  ========================================================= */

  useEffect(() => {

    fetchTeacherAssignments();

  }, [

    fetchTeacherAssignments

  ]);


  /* =========================================================
     LOAD CLASS REQUESTS
  ========================================================= */

  useEffect(() => {

    if (
      activeTab === 'classRequests'
    ) {

      fetchClassRequests();

    }

  }, [

    activeTab,

    fetchClassRequests,

    teacherAssignments

  ]);


  /* =========================================================
     REPLY TEXT CHANGE
  ========================================================= */

  const handleReplyChange = (
    id,
    text
  ) => {

    setReplies(previous => ({

      ...previous,

      [id]: text

    }));

  };


  /* =========================================================
     SUBMIT QUERY REPLY
  ========================================================= */

  const handleReplySubmit = async (
    queryId
  ) => {

    if (
      !replies[queryId]?.trim()
    ) {

      alert(
        'Please enter a reply'
      );

      return;

    }


    setReplyingTo(queryId);


    try {

      await axios.put(

        `${API_BASE_URL}/api/queries/${queryId}/reply`,

        {

          reply:
            replies[queryId],

          teacherId:
            currentTeacherId,

          status:
            'Answered'

        }

      );


      setQueries(previous =>

        previous.map(query =>

          query._id === queryId

            ? {

                ...query,

                reply:
                  replies[queryId],

                status:
                  'Answered',

                repliedAt:
                  new Date().toISOString()

              }

            : query

        )

      );


      setReplies(previous => ({

        ...previous,

        [queryId]: ''

      }));


      alert(
        'Reply submitted successfully!'
      );

    } catch (error) {

      console.error(

        'Error submitting reply:',

        error

      );


      if (
        error.response?.status === 403
      ) {

        alert(

          'This query is assigned to a different faculty member. You are not authorized to reply to it.'

        );

      } else {

        alert(

          'Failed to submit reply. Please try again.'

        );

      }

    } finally {

      setReplyingTo(null);

    }

  };


  /* =========================================================
     UPDATE QUERY STATUS
  ========================================================= */

  const handleStatusUpdate = async (
    queryId,
    newStatus
  ) => {

    try {

      await axios.put(

        `${API_BASE_URL}/api/queries/${queryId}/status`,

        {

          status:
            newStatus

        }

      );


      setQueries(previous =>

        previous.map(query =>

          query._id === queryId

            ? {

                ...query,

                status:
                  newStatus

              }

            : query

        )

      );

    } catch (error) {

      console.error(

        'Error updating status:',

        error

      );

    }

  };


  /* =========================================================
     CLASS REQUEST ACTION
  ========================================================= */

  const handleClassRequestAction = async (
    requestId,
    status
  ) => {

    setUpdatingRequest(
      requestId
    );


    try {

      const responseMessage =

        responseMessages[
          requestId
        ]?.trim() || '';


      await axios.put(

        `${API_BASE_URL}/api/class-requests/${requestId}/status`,

        {

          status,

          responseMessage,

          teacherId:
            currentTeacherId

        }

      );


      setClassRequests(previous =>

        previous.map(request =>

          request._id === requestId

            ? {

                ...request,

                status,

                responseMessage

              }

            : request

        )

      );


      setResponseMessages(previous => ({

        ...previous,

        [requestId]: ''

      }));


      alert(

        `Class request ${status.toLowerCase()} successfully!`

      );

    } catch (error) {

      console.error(

        'Error updating class request:',

        error

      );


      if (
        error.response?.status === 403
      ) {

        alert(

          'This class request is assigned to a different faculty member. You are not authorized to respond to it.'

        );

      } else {

        alert(

          'Failed to update. Please try again.'

        );

      }

    } finally {

      setUpdatingRequest(null);

    }

  };


  /* =========================================================
     FORMAT TIME AGO
  ========================================================= */

  const formatTimeAgo = (
    dateString
  ) => {

    if (!dateString) {

      return '';

    }


    const date =
      new Date(dateString);


    if (
      Number.isNaN(
        date.getTime()
      )
    ) {

      return '';

    }


    const diffInHours =

      Math.floor(

        (
          new Date() - date
        ) /

        (
          1000 *
          60 *
          60
        )

      );


    const diffInDays =

      Math.floor(
        diffInHours / 24
      );


    if (
      diffInHours < 1
    ) {

      return 'Just now';

    }


    if (
      diffInHours < 24
    ) {

      return `${diffInHours}h ago`;

    }


    if (
      diffInDays < 7
    ) {

      return `${diffInDays}d ago`;

    }


    return date.toLocaleDateString();

  };


  /* =========================================================
     FORMAT DATE + TIME
  ========================================================= */

  const formatDateTime = (
    date,
    time
  ) => {

    if (!date) {

      return '';

    }


    const d =
      new Date(date);


    if (
      Number.isNaN(
        d.getTime()
      )
    ) {

      return '';

    }


    const formatted =
      d.toLocaleDateString(
        'en-IN',
        {

          day: '2-digit',

          month: 'short',

          year: 'numeric'

        }
      );


    return time

      ? `${formatted} at ${time}`

      : formatted;

  };


  /* =========================================================
     CLASS REQUEST STATUS COLOR
  ========================================================= */

  const getClassRequestStatusColor = (
    status
  ) => {

    switch (status) {

      case 'Pending':

        return '#f59e0b';

      case 'Accepted':

        return '#16a34a';

      case 'Rejected':

        return '#ef4444';

      case 'Completed':

        return '#2563eb';

      default:

        return '#64748b';

    }

  };


  /* =========================================================
     PENDING CLASS REQUEST COUNT
  ========================================================= */

  const pendingClassRequests =

    classRequests.filter(

      request =>

        !request.status ||

        request.status ===
        'Pending'

    ).length;


  /* =========================================================
     RENDER
  ========================================================= */

  return (

    <div className="teacher-queries-container">


      {/* =====================================================
          PAGE HEADER
      ===================================================== */}

      <div className="queries-header">

        <div className="queries-header-content">

          <h2>
            Student Queries
          </h2>

          <p>
            View and respond to student questions and class requests
          </p>

        </div>

      </div>


      {/* =====================================================
          STATISTICS
      ===================================================== */}

      <div className="queries-statistics-row">


        <div className="queries-stat-card">

          <span className="queries-stat-number">
            {stats.total}
          </span>

          <span className="queries-stat-label">
            Total
          </span>

        </div>


        <div className="queries-stat-card pending">

          <span className="queries-stat-number">
            {stats.pending}
          </span>

          <span className="queries-stat-label">
            Pending
          </span>

        </div>


        <div className="queries-stat-card answered">

          <span className="queries-stat-number">
            {stats.answered}
          </span>

          <span className="queries-stat-label">
            Answered
          </span>

        </div>


        <div className="queries-stat-card resolved">

          <span className="queries-stat-number">
            {stats.resolved}
          </span>

          <span className="queries-stat-label">
            Resolved
          </span>

        </div>


      </div>


      {/* =====================================================
          TABS
      ===================================================== */}

      <div className="queries-tabs">


        <button

          type="button"

          onClick={() =>
            setActiveTab('queries')
          }

          className={

            `queries-tab ${
              activeTab === 'queries'
                ? 'active'
                : ''
            }`

          }

        >

          <span>
            📋 Student Queries
          </span>

        </button>


        <button

          type="button"

          onClick={() =>
            setActiveTab(
              'classRequests'
            )
          }

          className={

            `queries-tab ${
              activeTab ===
              'classRequests'
                ? 'active'
                : ''
            }`

          }

        >

          <span>
            🏫 Class Requests
          </span>


          {pendingClassRequests > 0 && (

            <span className="queries-tab-badge">

              {pendingClassRequests}

            </span>

          )}

        </button>


      </div>


      {/* =====================================================
          STUDENT QUERIES TAB
      ===================================================== */}

      {activeTab === 'queries' && (

        <>


          {/* =================================================
              SEARCH / FILTER / SORT
          ================================================= */}

          <div className="queries-controls">


            <div className="queries-controls-left">

              <div className="queries-search-container">

                <FaSearch
                  className="queries-search-icon"
                />

                <input

                  type="text"

                  placeholder="Search queries..."

                  value={searchTerm}

                  onChange={(event) =>
                    setSearchTerm(
                      event.target.value
                    )
                  }

                  className="queries-search-input"

                />

              </div>

            </div>


            <div className="queries-controls-right">


              {/* FILTER */}

              <div className="queries-filter-dropdown">

                <button

                  type="button"

                  className="queries-filter-btn"

                  onClick={() =>
                    setShowFilterMenu(
                      !showFilterMenu
                    )
                  }

                >

                  <FaFilter />

                  <span>
                    Filter
                  </span>

                </button>


                {showFilterMenu && (

                  <div className="queries-filter-menu">


                    <div className="filter-group">

                      <label>
                        Status:
                      </label>

                      <select

                        value={filterStatus}

                        onChange={(event) =>
                          setFilterStatus(
                            event.target.value
                          )
                        }

                      >

                        <option value="All">
                          All Status
                        </option>

                        <option value="Pending">
                          Pending
                        </option>

                        <option value="Answered">
                          Answered
                        </option>

                        <option value="Resolved">
                          Resolved
                        </option>

                      </select>

                    </div>


                    <div className="filter-group">

                      <label>
                        Subject:
                      </label>

                      <select

                        value={filterSubject}

                        onChange={(event) =>
                          setFilterSubject(
                            event.target.value
                          )
                        }

                      >

                        <option value="All">
                          All Subjects
                        </option>


                        {subjects.map(

                          (
                            subject,
                            index
                          ) => (

                            <option

                              key={index}

                              value={subject}

                            >

                              {subject}

                            </option>

                          )

                        )}

                      </select>

                    </div>


                    <div className="filter-group">

                      <label>
                        Priority:
                      </label>

                      <select

                        value={filterPriority}

                        onChange={(event) =>
                          setFilterPriority(
                            event.target.value
                          )
                        }

                      >

                        <option value="All">
                          All Priority
                        </option>

                        <option value="Low">
                          Low
                        </option>

                        <option value="Medium">
                          Medium
                        </option>

                        <option value="High">
                          High
                        </option>

                        <option value="Urgent">
                          Urgent
                        </option>

                      </select>

                    </div>


                  </div>

                )}

              </div>


              {/* SORT */}

              <div className="queries-sort-dropdown">

                <label

                  htmlFor="queries-sort-select"

                  className="queries-sort-label"

                >

                  {sortOrder === 'desc'

                    ? <FaSortAmountDown />

                    : <FaSortAmountUp />

                  }

                </label>


                <select

                  id="queries-sort-select"

                  className="queries-sort-select"

                  value={sortOrder}

                  onChange={(event) =>
                    setSortOrder(
                      event.target.value
                    )
                  }

                >

                  <option value="desc">
                    Latest first
                  </option>

                  <option value="asc">
                    Oldest first
                  </option>

                </select>

              </div>


            </div>

          </div>


          {/* =================================================
              QUERY LIST
          ================================================= */}

          <div className="queries-main-container">


            {loading ? (

              <div className="queries-loading-spinner">

                <div className="queries-spinner"></div>

                <p>
                  Loading queries...
                </p>

              </div>

            ) : (

              <div className="queries-cards-grid-restructured">


                {queries.length === 0 ? (

                  <div className="queries-no-data">

                    <p>
                      No queries found
                    </p>

                  </div>

                ) : (

                  queries.map(query => (

                    <div

                      key={query._id}

                      className="query-card-restructured"

                    >


                      {/* STUDENT HEADER */}

                      <div className="card-top-section">

                        <div className="student-profile-area">

                          <div className="student-avatar">

                            <FaUser />

                          </div>


                          <div className="student-info">


                            <div className="student-name-section">

                              <h3 className="student-name">

                                {query.studentName ||
                                  'Student'}

                              </h3>


                              <span className="query-time">

                                <FaClock
                                  className="time-icon"
                                />

                                {formatTimeAgo(
                                  query.createdAt
                                )}

                              </span>

                            </div>


                            <div className="student-meta">

                              <span className="class-badge">

                                Class {
                                  query.studentClass
                                    ?.toString()
                                    .replace(
                                      /^Class\s*/i,
                                      ''
                                    ) ||
                                  '10'
                                }

                              </span>


                              <span className="subject-chip">

                                {query.subject}

                              </span>

                            </div>

                          </div>

                        </div>

                      </div>


                      {/* QUESTION */}

                      <div className="question-container">

                        <h4>
                          Question
                        </h4>


                        <div className="question-content">

                          <p>
                            {query.question}
                          </p>

                        </div>

                      </div>


                      {/* RESPONSE */}

                      <div className="card-interaction-section">


                        {query.status === 'Answered' ||
                         query.status === 'Resolved' ? (

                          <div className="answered-section">


                            <div className="reply-header">

                              <h4>
                                Teacher Reply
                              </h4>


                              {query.repliedAt && (

                                <div className="reply-timestamp">

                                  {formatTimeAgo(
                                    query.repliedAt
                                  )}

                                </div>

                              )}

                            </div>


                            <div className="reply-content">

                              <p>
                                {query.reply}
                              </p>

                            </div>


                            {query.status ===
                              'Answered' && (

                              <div className="post-reply-actions">

                                <button

                                  type="button"

                                  onClick={() =>
                                    handleStatusUpdate(
                                      query._id,
                                      'Resolved'
                                    )
                                  }

                                  className="resolve-button"

                                >

                                  Mark Resolved

                                </button>

                              </div>

                            )}

                          </div>

                        ) : (

                          <div className="pending-section">


                            <h4>
                              Your Response
                            </h4>


                            <div className="reply-compose-area">

                              <textarea

                                placeholder="Type your answer here..."

                                value={
                                  replies[
                                    query._id
                                  ] || ''
                                }

                                onChange={(event) =>
                                  handleReplyChange(
                                    query._id,
                                    event.target.value
                                  )
                                }

                                className="compose-textarea"

                                rows="2"

                              />


                              <div className="compose-actions">

                                <button

                                  type="button"

                                  onClick={() =>
                                    handleReplySubmit(
                                      query._id
                                    )
                                  }

                                  className="submit-reply-button"

                                  disabled={

                                    replyingTo ===
                                      query._id ||

                                    !replies[
                                      query._id
                                    ]?.trim()

                                  }

                                >

                                  {replyingTo ===
                                    query._id

                                    ? 'Sending...'

                                    : 'Reply'

                                  }

                                </button>

                              </div>

                            </div>

                          </div>

                        )}

                      </div>


                    </div>

                  ))

                )}

              </div>

            )}


            {/* PAGINATION */}

            {pagination.totalPages > 1 && (

              <div className="queries-pagination">


                <button

                  type="button"

                  onClick={() =>
                    setCurrentPage(
                      currentPage - 1
                    )
                  }

                  disabled={
                    currentPage === 1
                  }

                  className="queries-pagination-btn"

                >

                  <FaChevronLeft />

                </button>


                <span className="queries-pagination-info">

                  Page {currentPage} of {
                    pagination.totalPages
                  }

                </span>


                <button

                  type="button"

                  onClick={() =>
                    setCurrentPage(
                      currentPage + 1
                    )
                  }

                  disabled={

                    currentPage ===
                    pagination.totalPages

                  }

                  className="queries-pagination-btn"

                >

                  <FaChevronRight />

                </button>


              </div>

            )}

          </div>

        </>

      )}


      {/* =====================================================
          CLASS REQUESTS TAB
      ===================================================== */}

      {activeTab === 'classRequests' && (

        <div className="class-requests-container">


          {classRequestsLoading ||
           teacherAssignmentsLoading ? (

            <div className="queries-loading-spinner">

              <div className="queries-spinner"></div>

              <p>
                Loading class requests...
              </p>

            </div>

          ) : classRequests.length === 0 ? (

            <div className="class-requests-empty">

              <FaChalkboardTeacher />

              <p>
                No class requests for your assigned subjects and classes
              </p>

            </div>

          ) : (

            <div className="class-requests-list">


              {classRequests.map(
                request => (

                  <div

                    key={request._id}

                    className="class-request-card"

                  >


                    {/* =================================================
                        REQUEST HEADER
                    ================================================= */}

                    <div className="class-request-header">


                      <div className="class-request-student">

                        <div className="class-request-avatar">

                          <FaUser />

                        </div>


                        <div>

                          <div className="class-request-student-name">

                            {request.studentName ||
                              'Student'}

                          </div>


                          <div className="class-request-student-meta">

                            Class {
                              request.studentClass
                            }

                            {' · '}

                            {formatTimeAgo(
                              request.createdAt
                            )}

                          </div>

                        </div>

                      </div>


                      <span

                        className="class-request-status"

                        style={{
                          background:
                            getClassRequestStatusColor(
                              request.status ||
                                'Pending'
                            )
                        }}

                      >

                        {request.status ||
                          'Pending'}

                      </span>


                    </div>


                    {/* =================================================
                        REQUEST BODY
                    ================================================= */}

                    <div className="class-request-body">


                      <div className="class-request-info-row">


                        <span className="class-request-subject">

                          📚 {request.subject}

                        </span>


                        <span className="class-request-date">

                          📅 {

                            formatDateTime(

                              request.preferredDate,

                              request.preferredTime

                            )

                          }

                        </span>


                      </div>


                      {request.reason && (

                        <div className="class-request-reason">

                          "{request.reason}"

                        </div>

                      )}


                      {request.responseMessage && (

                        <div className="class-request-response">

                          <strong>
                            Your response:
                          </strong>

                          {' '}

                          {request.responseMessage}

                        </div>

                      )}


                      {/* =================================================
                          PENDING ACTIONS
                      ================================================= */}

                      {(

                        !request.status ||

                        request.status ===
                        'Pending'

                      ) && (

                        <div className="class-request-actions-area">


                          <label>

                            Response Message

                            <span>

                              {' '}(optional)

                            </span>

                          </label>


                          <textarea

                            placeholder="e.g. Class confirmed! Join via the given link..."

                            value={

                              responseMessages[
                                request._id
                              ] || ''

                            }

                            onChange={(event) =>
                              setResponseMessages(
                                previous => ({

                                  ...previous,

                                  [request._id]:
                                    event.target.value

                                })
                              )
                            }

                            rows={2}

                            className="class-request-textarea"

                          />


                          <div className="class-request-buttons">


                            <button

                              type="button"

                              onClick={() =>
                                handleClassRequestAction(

                                  request._id,

                                  'Accepted'

                                )
                              }

                              disabled={

                                updatingRequest ===
                                request._id

                              }

                              className="accept-request-button"

                            >

                              ✅ Accept

                            </button>


                            <button

                              type="button"

                              onClick={() =>
                                handleClassRequestAction(

                                  request._id,

                                  'Rejected'

                                )
                              }

                              disabled={

                                updatingRequest ===
                                request._id

                              }

                              className="reject-request-button"

                            >

                              ❌ Reject

                            </button>


                            {updatingRequest ===
                              request._id && (

                              <span className="request-updating-text">

                                Updating...

                              </span>

                            )}

                          </div>


                        </div>

                      )}


                      {/* =================================================
                          COMPLETED
                      ================================================= */}

                      {request.status ===
                        'Accepted' && (

                        <button

                          type="button"

                          onClick={() =>
                            handleClassRequestAction(

                              request._id,

                              'Completed'

                            )
                          }

                          disabled={

                            updatingRequest ===
                            request._id

                          }

                          className="complete-request-button"

                        >

                          🎓 Mark as Completed

                        </button>

                      )}


                    </div>


                    {/* =================================================
                        REQUEST ID REMOVED
                    ================================================= */}

                  </div>

                )

              )}

            </div>

          )}

        </div>

      )}

    </div>

  );

};


export default StudentQueries;