import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import axios from "axios";
import API_BASE_URL from "../config/api";
import "../styles/studentQueries.css";

const RaiseQuery = () => {
  /* =====================================================
     FORM STATE
  ===================================================== */

  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [queryTeacher, setQueryTeacher] = useState("");

  /* =====================================================
     DATA STATE
  ===================================================== */

  const [subjects, setSubjects] = useState([]);
  const [queries, setQueries] = useState([]);
  const [classRequests, setClassRequests] = useState([]);

  /* =====================================================
     LOADING STATE
  ===================================================== */

  const [fetchingSubjects, setFetchingSubjects] = useState(true);
  const [fetchingQueries, setFetchingQueries] = useState(true);
  const [fetchingClassRequests, setFetchingClassRequests] =
    useState(true);

  const [loading, setLoading] = useState(false);
  const [classRequestLoading, setClassRequestLoading] =
    useState(false);

  /* =====================================================
     ERROR STATE
  ===================================================== */

  const [subjectError, setSubjectError] = useState("");
  const [queryError, setQueryError] = useState("");
  const [classRequestError, setClassRequestError] =
    useState("");

  /* =====================================================
     CLASS REQUEST FORM
  ===================================================== */

  const [classReqSubject, setClassReqSubject] = useState("");
  const [classReqTeacher, setClassReqTeacher] = useState("");
  const [classReqDate, setClassReqDate] = useState("");
  const [classReqTime, setClassReqTime] = useState("");
  const [classReqReason, setClassReqReason] = useState("");

  /* =====================================================
     GET LOGGED-IN USER
  ===================================================== */

  const getUserData = () => {
    try {
      const userData = localStorage.getItem("user");

      if (!userData) {
        return null;
      }

      const parsed = JSON.parse(userData);

      return parsed?.student || parsed;
    } catch (error) {
      console.error(
        "USER DATA PARSE ERROR:",
        error
      );

      return null;
    }
  };

  const student = getUserData();

  /* =====================================================
     STUDENT ID
  ===================================================== */

  const currentStudentId =
    student?.id ||
    student?._id ||
    localStorage.getItem("studentId") ||
    localStorage.getItem("userId");

  /* =====================================================
     STUDENT NAME
  ===================================================== */

  const currentStudentName =
    student?.firstName || student?.lastName
      ? `${student?.salutation || ""} ${
          student?.firstName || ""
        } ${student?.lastName || ""}`.trim()
      : localStorage.getItem("studentName") ||
        localStorage.getItem("userName") ||
        "Student";

  /* =====================================================
     STUDENT CLASS
  ===================================================== */

  const currentStudentClass = String(
    student?.class ||
      student?.className ||
      localStorage.getItem("studentClass") ||
      localStorage.getItem("userClass") ||
      ""
  )
    .replace(/^class\s*/i, "")
    .trim();

  const fullStudentClass = currentStudentClass
    ? `Class ${currentStudentClass}`
    : "";

  /* =====================================================
     HELPERS
  ===================================================== */

  const normalizeClass = (value) => {
    if (
      value === null ||
      value === undefined
    ) {
      return "";
    }

    return String(value)
      .replace(/^class\s*/i, "")
      .trim()
      .toLowerCase();
  };

  const normalizeSubject = (value) => {
    if (
      value === null ||
      value === undefined
    ) {
      return "";
    }

    return String(value)
      .trim()
      .toLowerCase()
      .replace(/[_-]/g, " ")
      .replace(/\s+/g, " ");
  };

  const formatSubjectName = (value) => {
    if (!value) {
      return "";
    }

    return String(value)
      .trim()
      .replace(/\b\w/g, (letter) =>
        letter.toUpperCase()
      );
  };

  const getTeacherId = (teacher) => {
    if (!teacher) {
      return "";
    }

    if (typeof teacher === "string") {
      return teacher;
    }

    return (
      teacher._id ||
      teacher.id ||
      ""
    );
  };

  const getTeacherName = (teacher) => {
    if (!teacher) {
      return "Faculty";
    }

    if (typeof teacher === "string") {
      return "Faculty";
    }

    const fullName = [
      teacher.salutation,
      teacher.firstName,
      teacher.lastName,
    ]
      .filter(Boolean)
      .join(" ")
      .trim();

    return (
      fullName ||
      teacher.name ||
      "Faculty"
    );
  };

  /* =====================================================
     LOAD SUBJECTS FOR CURRENT STUDENT
  ===================================================== */

  const loadClassSubjects = useCallback(
    async () => {
      if (!currentStudentId) {
        setSubjects([]);
        setFetchingSubjects(false);

        setSubjectError(
          "Student ID not found. Please log in again."
        );

        return;
      }

      setFetchingSubjects(true);
      setSubjectError("");

      try {
        console.log(
          "=========================================="
        );

        console.log(
          "LOADING SUBJECTS FOR STUDENT"
        );

        console.log(
          "Student ID:",
          currentStudentId
        );

        console.log(
          "Student Class:",
          currentStudentClass
        );

        const url =
          `${API_BASE_URL}/api/queries/subjects-for-student/` +
          currentStudentId;

        console.log(
          "SUBJECT API:",
          url
        );

        const response =
          await axios.get(url);

        console.log(
          "SUBJECT RESPONSE:",
          response.data
        );

        if (!response.data?.success) {
          throw new Error(
            response.data?.message ||
              "Failed to fetch subjects"
          );
        }

        const receivedSubjects =
          Array.isArray(
            response.data.subjects
          )
            ? response.data.subjects
            : [];

        /*
          Extra frontend safety check.

          Backend should already return only the
          student's class subjects.

          We check classes here too so that a subject
          belonging to another class never appears.
        */

        const filteredSubjects =
          receivedSubjects.filter(
            (item) => {
              if (!item?.name) {
                return false;
              }

              if (
                !Array.isArray(
                  item.classes
                )
              ) {
                return true;
              }

              /*
                If classes is empty, backend data is
                incomplete. Do not display it as a
                class-specific subject.
              */

              if (
                item.classes.length === 0
              ) {
                return false;
              }

              return item.classes.some(
                (classValue) =>
                  normalizeClass(
                    classValue
                  ) ===
                  normalizeClass(
                    currentStudentClass
                  )
              );
            }
          );

        console.log(
          "FINAL SUBJECTS:",
          filteredSubjects
        );

        setSubjects(
          filteredSubjects
        );

        if (
          filteredSubjects.length === 0
        ) {
          setSubjectError(
            `No subjects are assigned to ${fullStudentClass}.`
          );
        }
      } catch (error) {
        console.error(
          "FAILED TO LOAD SUBJECTS:",
          error
        );

        console.error(
          "STATUS:",
          error.response?.status
        );

        console.error(
          "SERVER RESPONSE:",
          error.response?.data
        );

        setSubjects([]);

        setSubjectError(
          error.response?.data?.message ||
            error.message ||
            "Failed to fetch subjects"
        );
      } finally {
        setFetchingSubjects(false);

        console.log(
          "=========================================="
        );
      }
    },
    [
      currentStudentId,
      currentStudentClass,
      fullStudentClass,
    ]
  );

  /* =====================================================
     LOAD STUDENT QUERIES
  ===================================================== */

  const fetchStudentQueries =
    useCallback(async () => {
      if (!currentStudentId) {
        setQueries([]);
        setFetchingQueries(false);
        return;
      }

      setFetchingQueries(true);
      setQueryError("");

      try {
        const url =
          `${API_BASE_URL}/api/queries/student/` +
          currentStudentId;

        console.log(
          "LOADING STUDENT QUERIES:",
          url
        );

        const response =
          await axios.get(url);

        console.log(
          "QUERY RESPONSE:",
          response.data
        );

        if (
          response.data?.success === false
        ) {
          throw new Error(
            response.data?.message ||
              "Failed to load your queries"
          );
        }

        const receivedQueries =
          Array.isArray(
            response.data?.queries
          )
            ? response.data.queries
            : [];

        setQueries(
          receivedQueries
        );
      } catch (error) {
        console.error(
          "FAILED TO LOAD QUERIES:",
          error
        );

        console.error(
          "QUERY STATUS:",
          error.response?.status
        );

        console.error(
          "QUERY SERVER RESPONSE:",
          error.response?.data
        );

        setQueries([]);

        /*
          Do not make a missing query-history
          endpoint prevent the form from working.
        */

        setQueryError(
          error.response?.data?.message ||
            "Failed to load your queries"
        );
      } finally {
        setFetchingQueries(false);
      }
    }, [currentStudentId]);

  /* =====================================================
     LOAD CLASS REQUESTS
  ===================================================== */

  const fetchClassRequests =
    useCallback(async () => {
      if (!currentStudentId) {
        setClassRequests([]);
        setFetchingClassRequests(false);
        return;
      }

      setFetchingClassRequests(true);

      try {
        const response =
          await axios.get(
            `${API_BASE_URL}/api/class-requests/student/${currentStudentId}`
          );

        const receivedRequests =
          Array.isArray(
            response.data?.classRequests
          )
            ? response.data.classRequests
            : [];

        setClassRequests(
          receivedRequests
        );
      } catch (error) {
        console.error(
          "FAILED TO LOAD CLASS REQUESTS:",
          error
        );

        setClassRequests([]);
      } finally {
        setFetchingClassRequests(false);
      }
    }, [currentStudentId]);

  /* =====================================================
     INITIAL LOAD
  ===================================================== */

  useEffect(() => {
    loadClassSubjects();
  }, [loadClassSubjects]);

  useEffect(() => {
    fetchStudentQueries();
    fetchClassRequests();
  }, [
    fetchStudentQueries,
    fetchClassRequests,
  ]);

  /* =====================================================
     SUBJECT OPTIONS
  ===================================================== */

  const subjectOptions = useMemo(() => {
    return subjects.filter(
      (item) =>
        item &&
        item._id &&
        item.name
    );
  }, [subjects]);

  /* =====================================================
     SELECTED QUERY SUBJECT
  ===================================================== */

  const selectedQuerySubject =
    useMemo(() => {
      return subjects.find(
        (item) =>
          normalizeSubject(
            item.name
          ) ===
          normalizeSubject(
            subject
          )
      );
    }, [subject, subjects]);

  /* =====================================================
     FACULTY FOR QUERY
  ===================================================== */

  const queryTeachers = useMemo(() => {
    if (!selectedQuerySubject) {
      return [];
    }

    const teacher =
      selectedQuerySubject.teacher;

    if (!teacher) {
      return [];
    }

    /*
      Backend should populate:

      teacher: {
        _id,
        firstName,
        lastName,
        email
      }
    */

    if (
      typeof teacher === "object"
    ) {
      return [teacher];
    }

    /*
      If only an ObjectId string is returned,
      the frontend cannot display the teacher
      name.

      Backend must populate Subject.teacher.
    */

    return [];
  }, [selectedQuerySubject]);

  /* =====================================================
     SELECTED CLASS REQUEST SUBJECT
  ===================================================== */

  const selectedClassRequestSubject =
    useMemo(() => {
      return subjects.find(
        (item) =>
          normalizeSubject(
            item.name
          ) ===
          normalizeSubject(
            classReqSubject
          )
      );
    }, [
      classReqSubject,
      subjects,
    ]);

  /* =====================================================
     FACULTY FOR CLASS REQUEST
  ===================================================== */

  const classRequestTeachers =
    useMemo(() => {
      if (
        !selectedClassRequestSubject
      ) {
        return [];
      }

      const teacher =
        selectedClassRequestSubject.teacher;

      if (!teacher) {
        return [];
      }

      if (
        typeof teacher === "object"
      ) {
        return [teacher];
      }

      return [];
    }, [
      selectedClassRequestSubject,
    ]);

  /* =====================================================
     RESET QUERY FACULTY
  ===================================================== */

  useEffect(() => {
    setQueryTeacher("");
  }, [subject]);

  /* =====================================================
     RESET CLASS REQUEST FACULTY
  ===================================================== */

  useEffect(() => {
    setClassReqTeacher("");
  }, [classReqSubject]);

  /* =====================================================
     SUBMIT QUERY
  ===================================================== */

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

    if (!subject) {
      alert(
        "Please select a subject."
      );
      return;
    }

    if (!queryTeacher) {
      alert(
        "No faculty is assigned to this subject."
      );
      return;
    }

    if (!message.trim()) {
      alert(
        "Please enter your question."
      );
      return;
    }

    if (!currentStudentId) {
      alert(
        "Student ID not found. Please log in again."
      );
      return;
    }

    const teacher =
      queryTeachers.find(
        (item) =>
          String(
            getTeacherId(item)
          ) ===
          String(queryTeacher)
      );

    if (!teacher) {
      alert(
        "Selected faculty is not assigned to this subject."
      );
      return;
    }

    setLoading(true);

    try {
      const teacherName =
        getTeacherName(teacher);

      const payload = {
        studentId:
          currentStudentId,

        studentName:
          currentStudentName,

        studentClass:
          currentStudentClass,

        subject:
          subject,

        question:
          message.trim(),

        priority:
          priority,

        teacherId:
          queryTeacher,

        teacherName:
          teacherName,
      };

      console.log(
        "SUBMIT QUERY:",
        payload
      );

      const response =
        await axios.post(
          `${API_BASE_URL}/api/queries`,
          payload
        );

      console.log(
        "QUERY SUBMIT RESPONSE:",
        response.data
      );

      if (
        response.status === 200 ||
        response.status === 201
      ) {
        setSubject("");
        setMessage("");
        setPriority("Medium");
        setQueryTeacher("");

        alert(
          "Query submitted successfully!"
        );

        await fetchStudentQueries();
      }
    } catch (error) {
      console.error(
        "QUERY SUBMIT ERROR:",
        error
      );

      alert(
        error.response?.data?.message ||
          "Failed to submit query."
      );
    } finally {
      setLoading(false);
    }
  };

  /* =====================================================
     EDIT QUERY
  ===================================================== */

  const handleEdit = (query) => {
    setSubject(
      query.subject || ""
    );

    setMessage(
      query.question || ""
    );

    setPriority(
      query.priority || "Medium"
    );

    setQueryTeacher(
      query.teacherId ||
        query.teacher?._id ||
        ""
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  /* =====================================================
     DELETE QUERY
  ===================================================== */

  const handleDelete = async (
    queryId
  ) => {
    if (!queryId) {
      return;
    }

    const confirmed =
      window.confirm(
        "Are you sure you want to delete this query?"
      );

    if (!confirmed) {
      return;
    }

    try {
      await axios.delete(
        `${API_BASE_URL}/api/queries/${queryId}`
      );

      alert(
        "Query deleted successfully."
      );

      await fetchStudentQueries();
    } catch (error) {
      console.error(
        "DELETE QUERY ERROR:",
        error
      );

      alert(
        error.response?.data?.message ||
          "Failed to delete query."
      );
    }
  };

  /* =====================================================
     SUBMIT CLASS REQUEST
  ===================================================== */

  const handleClassRequestSubmit =
    async () => {
      setClassRequestError("");

      if (
        !classReqSubject ||
        !classReqTeacher ||
        !classReqDate ||
        !classReqTime
      ) {
        setClassRequestError(
          "Please fill in all required fields."
        );

        return;
      }

      if (!currentStudentId) {
        setClassRequestError(
          "Student ID not found. Please log in again."
        );

        return;
      }

      const teacher =
        classRequestTeachers.find(
          (item) =>
            String(
              getTeacherId(item)
            ) ===
            String(classReqTeacher)
        );

      if (!teacher) {
        setClassRequestError(
          "Selected faculty is not assigned to this subject."
        );

        return;
      }

      setClassRequestLoading(true);

      try {
        const teacherName =
          getTeacherName(teacher);

        const payload = {
          studentId:
            currentStudentId,

          studentName:
            currentStudentName,

          studentClass:
            currentStudentClass,

          teacherId:
            classReqTeacher,

          teacherName:
            teacherName,

          subject:
            classReqSubject,

          preferredDate:
            classReqDate,

          preferredTime:
            classReqTime,

          reason:
            classReqReason.trim(),
        };

        const response =
          await axios.post(
            `${API_BASE_URL}/api/class-requests`,
            payload
          );

        if (
          response.status === 200 ||
          response.status === 201
        ) {
          alert(
            `Class request sent successfully to ${teacherName}!`
          );

          setClassReqSubject("");
          setClassReqTeacher("");
          setClassReqDate("");
          setClassReqTime("");
          setClassReqReason("");

          await fetchClassRequests();
        }
      } catch (error) {
        console.error(
          "CLASS REQUEST ERROR:",
          error
        );

        setClassRequestError(
          error.response?.data?.message ||
            "Failed to submit class request."
        );
      } finally {
        setClassRequestLoading(false);
      }
    };

  /* =====================================================
     DELETE CLASS REQUEST
  ===================================================== */

  const handleDeleteClassRequest =
    async (requestId) => {
      if (!requestId) {
        return;
      }

      const confirmed =
        window.confirm(
          "Are you sure you want to cancel this class request?"
        );

      if (!confirmed) {
        return;
      }

      try {
        await axios.delete(
          `${API_BASE_URL}/api/class-requests/${requestId}`
        );

        alert(
          "Class request cancelled successfully."
        );

        await fetchClassRequests();
      } catch (error) {
        console.error(
          "DELETE CLASS REQUEST ERROR:",
          error
        );

        alert(
          error.response?.data?.message ||
            "Failed to cancel class request."
        );
      }
    };

  /* =====================================================
     STATUS COLOR
  ===================================================== */

  const getClassRequestStatusColor =
    (status) => {
      switch (status) {
        case "Accepted":
          return "#2563eb";

        case "Rejected":
          return "#ef4444";

        case "Completed":
          return "#16a34a";

        case "Pending":
        default:
          return "#f59e0b";
      }
    };

  /* =====================================================
     TIME AGO
  ===================================================== */

  const formatTimeAgo = (
    dateString
  ) => {
    if (!dateString) {
      return "";
    }

    const date =
      new Date(dateString);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return "";
    }

    const now =
      new Date();

    const diff =
      now.getTime() -
      date.getTime();

    const hours =
      Math.floor(
        diff /
          (1000 * 60 * 60)
      );

    const days =
      Math.floor(
        hours / 24
      );

    if (hours < 1) {
      return "Just now";
    }

    if (hours < 24) {
      return `${hours}h ago`;
    }

    if (days < 7) {
      return `${days}d ago`;
    }

    return date.toLocaleDateString(
      "en-IN"
    );
  };

  /* =====================================================
     FORMAT DATE
  ===================================================== */

  const formatDateTime = (
    date,
    time
  ) => {
    if (!date) {
      return "";
    }

    const d =
      new Date(date);

    if (
      Number.isNaN(
        d.getTime()
      )
    ) {
      return "";
    }

    const formatted =
      d.toLocaleDateString(
        "en-IN",
        {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }
      );

    return time
      ? `${formatted} at ${time}`
      : formatted;
  };

  const formatQueryDate = (
    dateString
  ) => {
    if (!dateString) {
      return "";
    }

    const date =
      new Date(dateString);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return "";
    }

    return date.toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }
    );
  };

  /* =====================================================
     REFRESH EVERYTHING
  ===================================================== */

  const handleRefresh = () => {
    loadClassSubjects();
    fetchStudentQueries();
    fetchClassRequests();
  };

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <div className="student-query-page">

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="query-header">

        <h2>
          Ask Your Doubts
        </h2>

        <p>
          Get help from our expert teachers
        </p>

        {(subjectError ||
          queryError) && (
          <div className="query-error-message">

            <span>
              {subjectError ||
                queryError}
            </span>

            <button
              type="button"
              onClick={
                handleRefresh
              }
            >
              Retry
            </button>

          </div>
        )}

      </div>

      {/* =================================================
          QUERY FORM
      ================================================= */}

      <div className="query-form-container">

        <form
          className="modern-query-form"
          onSubmit={
            handleSubmit
          }
        >

          <div className="form-row">

            {/* SUBJECT */}

            <div className="form-group">

              <label>
                SUBJECT *
              </label>

              <select
                value={subject}
                onChange={(event) => {
                  setSubject(
                    event.target.value
                  );
                  setQueryTeacher("");
                }}
                disabled={
                  fetchingSubjects ||
                  loading
                }
                required
              >

                <option value="">
                  {fetchingSubjects
                    ? "Loading subjects..."
                    : subjectOptions.length === 0
                    ? "No subjects available"
                    : "Select Subject"}
                </option>

                {subjectOptions.map(
                  (item) => (
                    <option
                      key={item._id}
                      value={item.name}
                    >
                      {formatSubjectName(
                        item.name
                      )}
                    </option>
                  )
                )}

              </select>

            </div>

            {/* FACULTY */}

            <div className="form-group">

              <label>
                FACULTY *
              </label>

              <select
                value={queryTeacher}
                onChange={(event) =>
                  setQueryTeacher(
                    event.target.value
                  )
                }
                disabled={
                  !subject ||
                  fetchingSubjects ||
                  queryTeachers.length ===
                    0 ||
                  loading
                }
                required
              >

                <option value="">
                  {!subject
                    ? "Select subject first"
                    : fetchingSubjects
                    ? "Loading faculty..."
                    : queryTeachers.length ===
                      0
                    ? "No faculty assigned"
                    : "Select Faculty"}
                </option>

                {queryTeachers.map(
                  (teacher) => {
                    const id =
                      getTeacherId(
                        teacher
                      );

                    return (
                      <option
                        key={id}
                        value={id}
                      >
                        {getTeacherName(
                          teacher
                        )}
                      </option>
                    );
                  }
                )}

              </select>

              {subject &&
                !fetchingSubjects &&
                queryTeachers.length ===
                  0 && (
                  <small className="faculty-help-text">
                    No faculty is assigned
                    to{" "}
                    {formatSubjectName(
                      subject
                    )}{" "}
                    for{" "}
                    {fullStudentClass}.
                  </small>
                )}

            </div>

            {/* PRIORITY */}

            <div className="form-group">

              <label>
                PRIORITY
              </label>

              <select
                value={priority}
                onChange={(event) =>
                  setPriority(
                    event.target.value
                  )
                }
                disabled={loading}
              >

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

          {/* QUESTION */}

          <div className="form-group">

            <label>
              YOUR QUESTION *
            </label>

            <textarea
              value={message}
              onChange={(event) =>
                setMessage(
                  event.target.value
                )
              }
              placeholder="Describe your doubt or question in detail..."
              rows="4"
              maxLength={1000}
              required
              disabled={loading}
            />

            <small className="character-count">
              {message.length}/1000
            </small>

          </div>

          {/* SUBMIT */}

          <div className="query-submit-wrapper">

            <button
              type="submit"
              className="query-submit-btn"
              disabled={
                loading ||
                !subject ||
                !queryTeacher ||
                !message.trim()
              }
            >
              {loading
                ? "Submitting..."
                : "Submit Query"}
            </button>

          </div>

        </form>

      </div>

      {/* =================================================
          CLASS REQUEST SECTION
      ================================================= */}

      <div className="class-request-section">

        <div className="class-request-header">

          <div>
            <h3>
              Request a Class
            </h3>

            <p>
              Request an additional class
              from your faculty.
            </p>
          </div>

          {classRequests.filter(
            (item) =>
              !item.status ||
              item.status ===
                "Pending"
          ).length > 0 && (
            <span className="class-request-pending-badge">

              {
                classRequests.filter(
                  (item) =>
                    !item.status ||
                    item.status ===
                      "Pending"
                ).length
              }{" "}
              Pending

            </span>
          )}

        </div>

        {/* CLASS REQUEST FORM */}

        <div className="class-request-form-body">

          <div className="class-request-grid">

            {/* SUBJECT */}

            <div className="form-group">

              <label>
                Subject *
              </label>

              <select
                value={classReqSubject}
                onChange={(event) =>
                  setClassReqSubject(
                    event.target.value
                  )
                }
                disabled={
                  classRequestLoading ||
                  fetchingSubjects
                }
              >

                <option value="">
                  {fetchingSubjects
                    ? "Loading subjects..."
                    : subjectOptions.length === 0
                    ? "No subjects available"
                    : "Select Subject"}
                </option>

                {subjectOptions.map(
                  (item) => (
                    <option
                      key={
                        `request-${item._id}`
                      }
                      value={
                        item.name
                      }
                    >
                      {formatSubjectName(
                        item.name
                      )}
                    </option>
                  )
                )}

              </select>

            </div>

            {/* FACULTY */}

            <div className="form-group">

              <label>
                Faculty *
              </label>

              <select
                value={classReqTeacher}
                onChange={(event) =>
                  setClassReqTeacher(
                    event.target.value
                  )
                }
                disabled={
                  classRequestLoading ||
                  fetchingSubjects ||
                  !classReqSubject ||
                  classRequestTeachers.length ===
                    0
                }
              >

                <option value="">
                  {!classReqSubject
                    ? "Select subject first"
                    : fetchingSubjects
                    ? "Loading faculty..."
                    : classRequestTeachers.length ===
                      0
                    ? "No faculty assigned"
                    : "Select Faculty"}
                </option>

                {classRequestTeachers.map(
                  (teacher) => {
                    const id =
                      getTeacherId(
                        teacher
                      );

                    return (
                      <option
                        key={`class-${id}`}
                        value={id}
                      >
                        {getTeacherName(
                          teacher
                        )}
                      </option>
                    );
                  }
                )}

              </select>

            </div>

            {/* DATE */}

            <div className="form-group">

              <label>
                Date *
              </label>

              <input
                type="date"
                value={classReqDate}
                onChange={(event) =>
                  setClassReqDate(
                    event.target.value
                  )
                }
                min={
                  new Date()
                    .toISOString()
                    .split("T")[0]
                }
                disabled={
                  classRequestLoading
                }
              />

            </div>

            {/* TIME */}

            <div className="form-group">

              <label>
                Time *
              </label>

              <input
                type="time"
                value={classReqTime}
                onChange={(event) =>
                  setClassReqTime(
                    event.target.value
                  )
                }
                disabled={
                  classRequestLoading
                }
              />

            </div>

          </div>

          {/* REASON */}

          <div className="form-group">

            <label>
              Reason
            </label>

            <textarea
              value={classReqReason}
              onChange={(event) =>
                setClassReqReason(
                  event.target.value
                )
              }
              placeholder="Why do you need this additional class?"
              rows="3"
              maxLength={500}
              disabled={
                classRequestLoading
              }
            />

          </div>

          {classRequestError && (
            <div className="class-request-error">
              {classRequestError}
            </div>
          )}

          <div className="class-request-submit-wrapper">

            <button
              type="button"
              className="class-request-submit-btn"
              onClick={
                handleClassRequestSubmit
              }
              disabled={
                classRequestLoading
              }
            >
              {classRequestLoading
                ? "Sending..."
                : "Submit Class Request"}
            </button>

          </div>

        </div>

        {/* CLASS REQUEST HISTORY */}

        <div className="class-request-history">

          <h4>
            Your Class Requests
          </h4>

          {fetchingClassRequests ? (
            <p className="class-request-message">
              Loading class requests...
            </p>
          ) : classRequests.length ===
            0 ? (
            <p className="class-request-message">
              No class requests yet.
            </p>
          ) : (
            <div className="class-request-list">

              {classRequests.map(
                (request) => {
                  const status =
                    request.status ||
                    "Pending";

                  return (
                    <div
                      key={
                        request._id
                      }
                      className="class-request-card"
                    >

                      <div className="class-request-card-left">

                        <strong>
                          {formatSubjectName(
                            request.subject
                          )}
                        </strong>

                        <p>
                          Faculty:{" "}
                          {request.teacherName ||
                            "Faculty"}
                        </p>

                        {request.preferredDate && (
                          <p>
                            {formatDateTime(
                              request.preferredDate,
                              request.preferredTime
                            )}
                          </p>
                        )}

                        {request.reason && (
                          <p>
                            Reason:{" "}
                            {request.reason}
                          </p>
                        )}

                        {request.responseMessage && (
                          <div className="class-request-response">

                            <strong>
                              Faculty Response:
                            </strong>{" "}

                            {
                              request.responseMessage
                            }

                          </div>
                        )}

                      </div>

                      <div className="class-request-card-right">

                        <span
                          className="class-request-status"
                          style={{
                            color:
                              getClassRequestStatusColor(
                                status
                              ),
                          }}
                        >
                          {status}
                        </span>

                        {status ===
                          "Pending" && (
                          <button
                            type="button"
                            className="class-request-cancel-btn"
                            onClick={() =>
                              handleDeleteClassRequest(
                                request._id
                              )
                            }
                          >
                            Cancel
                          </button>
                        )}

                      </div>

                    </div>
                  );
                }
              )}

            </div>
          )}

        </div>

      </div>

      {/* =================================================
          YOUR QUERIES
      ================================================= */}

      <div className="queries-section">

        <div className="section-header">

          <div>
            <h3>
              Your Queries
            </h3>

            <p className="section-subtitle">
              Track your doubts and get
              expert answers
            </p>
          </div>

          <button
            type="button"
            onClick={
              fetchStudentQueries
            }
            className="query-refresh-btn"
          >
            Refresh
          </button>

        </div>

        <div className="query-list">

          {fetchingQueries ? (

            <div className="query-loading">
              Loading your queries...
            </div>

          ) : queries.length ===
            0 ? (

            <div className="no-queries">

              <div className="empty-state">

                <div className="empty-icon">
                  ?
                </div>

                <h4>
                  No queries yet!
                </h4>

                <p>
                  Submit your first
                  question above to
                  get started.
                </p>

                {queryError && (
                  <small>
                    {queryError}
                  </small>
                )}

              </div>

            </div>

          ) : (

            queries.map(
              (query) => {

                const status =
                  query.status ||
                  "Pending";

                return (
                  <div
                    className="elegant-query-card"
                    key={
                      query._id
                    }
                  >

                    {/* TOP */}

                    <div className="query-card-top-row">

                      <div className="query-subject-badge">

                        <span className="subject-name">
                          {formatSubjectName(
                            query.subject
                          )}
                        </span>

                      </div>

                      <div className="query-date">
                        {formatQueryDate(
                          query.createdAt
                        )}
                      </div>

                    </div>

                    {/* ACTION */}

                    <div className="query-card-action-row">

                      <span className="status-chip">
                        {status}
                      </span>

                      <div className="query-action-buttons">

                        <button
                          type="button"
                          onClick={() =>
                            handleEdit(
                              query
                            )
                          }
                          className="query-edit-btn"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleDelete(
                              query._id
                            )
                          }
                          className="query-delete-btn"
                        >
                          Delete
                        </button>

                      </div>

                    </div>

                    {/* BODY */}

                    <div className="card-body">

                      <div className="question-box">

                        <div className="question-header">
                          Your Question
                        </div>

                        <div className="question-text">
                          {query.question}
                        </div>

                      </div>

                      <div className="reply-box">

                        <div className="reply-header">

                          <span>
                            Faculty's Answer
                          </span>

                          {query.teacherName && (
                            <span className="reply-teacher-name">
                              {" "}
                              -{" "}
                              {
                                query.teacherName
                              }
                            </span>
                          )}

                        </div>

                        <div className="reply-text">

                          {query.reply ||
                            "No answer yet."}

                        </div>

                        {query.repliedAt && (
                          <div className="reply-time">
                            Answered{" "}
                            {formatTimeAgo(
                              query.repliedAt
                            )}
                          </div>
                        )}

                      </div>

                    </div>

                  </div>
                );
              }
            )

          )}

        </div>

      </div>

    </div>
  );
};

export default RaiseQuery;