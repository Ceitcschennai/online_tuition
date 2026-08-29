import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import API_BASE_URL from '../config/api';

import {
  FaUserCheck,
  FaUsers,
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


/* =========================================================
   STUDENT ATTENDANCE SEARCH
   ========================================================= */

const StudentAttendanceSearch = ({
  students = [],
  attendanceRecords = [],
  formatTime,
  formatDuration
}) => {

  const [query, setQuery] = useState('');

  const filtered = query.trim()
    ? students.filter(student => {

        const fullName =
          `${student.salutation || ''} ${student.firstName || ''} ${student.lastName || ''}`
            .trim()
            .toLowerCase();

        const email =
          student.email
            ? student.email.toLowerCase()
            : '';

        const searchText =
          query.toLowerCase();

        return (
          fullName.includes(searchText) ||
          email.includes(searchText)
        );
      })
    : [];

  return (
    <div className="student-search-wrapper">

      <div className="student-search-box">

        <FaSearch className="student-search-icon" />

        <input
          type="text"
          placeholder="Search student by name or email..."
          value={query}
          onChange={(e) =>
            setQuery(e.target.value)
          }
        />

        {query && (
          <button
            type="button"
            className="student-search-clear"
            onClick={() => setQuery('')}
          >
            <FaTimes />
          </button>
        )}

      </div>


      {query.trim() && filtered.length === 0 && (

        <div className="student-search-empty">
          No students found matching "{query}"
        </div>

      )}


      {filtered.length > 0 && (

        <div className="student-search-results">

          {filtered.map(student => {

            const record =
              attendanceRecords.find(
                record =>
                  record.studentId === student._id
              );

            const duration =
              student.duration || 0;

            return (

              <div
                key={student._id}
                className="student-search-result"
              >

                <div className="student-result-info">

                  <div className="student-result-name">

                    {student.isPresent && (
                      <span className="student-live-dot" />
                    )}

                    {`${student.salutation || ''} ${student.firstName || ''} ${student.lastName || ''}`
                      .trim()}

                  </div>

                  <div className="student-result-email">
                    {student.email}
                  </div>

                </div>


                <div className="student-result-details">

                  <span className="join-time">

                    <FaSignInAlt />

                    {record?.firstJoinTime
                      ? formatTime(record.firstJoinTime)
                      : '—'}

                  </span>


                  <span className="leave-time">

                    <FaSignOutAlt />

                    {record?.lastLeaveTime
                      ? formatTime(record.lastLeaveTime)
                      : student.isPresent
                      ? 'Still in class'
                      : '—'}

                  </span>


                  <span
                    className={
                      duration >= 45
                        ? 'duration-good'
                        : 'duration-low'
                    }
                  >

                    <FaClock />

                    {formatDuration(duration)}

                  </span>


                  <span
                    className={
                      student.status === 'Present'
                        ? 'search-status present'
                        : 'search-status absent'
                    }
                  >

                    {student.status === 'Present'
                      ? <FaCheckCircle />
                      : <FaTimesCircle />}

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


/* =========================================================
   MAIN COMPONENT
   ========================================================= */

const TakeAttendance = () => {

  const [teacher, setTeacher] = useState(null);

  const [assignedClasses, setAssignedClasses] =
    useState([]);

  const [selectedClass, setSelectedClass] =
    useState('');

  const [selectedSubject, setSelectedSubject] =
    useState('');

  const [selectedSubjectId, setSelectedSubjectId] =
    useState('');

  const [availableSubjects, setAvailableSubjects] =
    useState([]);

  const [students, setStudents] =
    useState([]);

  const [liveSession, setLiveSession] =
    useState(null);

  const [sessionStartTime, setSessionStartTime] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [selectedDate, setSelectedDate] =
    useState(
      new Date()
        .toISOString()
        .split('T')[0]
    );

  const [filterStatus, setFilterStatus] =
    useState('All');

  const [showFilterMenu, setShowFilterMenu] =
    useState(false);

  const [showDetailsModal, setShowDetailsModal] =
    useState(false);

  const [showExportModal, setShowExportModal] =
    useState(false);

  const [selectedStudent, setSelectedStudent] =
    useState(null);

  const [currentPage, setCurrentPage] =
    useState(1);

  const [activeLiveClass, setActiveLiveClass] =
    useState(null);

  const [isAutoTracking, setIsAutoTracking] =
    useState(false);

  const [lastSyncTime, setLastSyncTime] =
    useState(null);

  const [exportStartDate, setExportStartDate] =
    useState(
      new Date()
        .toISOString()
        .split('T')[0]
    );

  const [exportEndDate, setExportEndDate] =
    useState(
      new Date()
        .toISOString()
        .split('T')[0]
    );

  const [attendanceRecords, setAttendanceRecords] =
    useState([]);


  const studentsPerPage = 10;

  const filterRef = useRef(null);

  const timerRef = useRef(null);

  const trackingIntervalRef =
    useRef(null);

  const liveClassCheckRef =
    useRef(null);


  /* =========================================================
     GET TEACHER DATA
     ========================================================= */

  const getTeacherData = () => {

    try {

      const teacherData =
        localStorage.getItem('teacher');

      if (teacherData) {
        return JSON.parse(teacherData);
      }


      const userData =
        localStorage.getItem('user');

      if (userData) {

        const parsed =
          JSON.parse(userData);

        return (
          parsed.teacher ||
          parsed
        );
      }


      return null;

    } catch (error) {

      console.error(
        'Error getting teacher data:',
        error
      );

      return null;
    }
  };


  /* =========================================================
     LOAD TEACHER ASSIGNMENTS
     ========================================================= */

  const loadTeacherAssignments =
    async () => {

      const teacherData =
        getTeacherData();

      if (!teacherData) {

        setLoading(false);

        return;
      }


      const teacherId =
        teacherData._id ||
        teacherData.id;


      setTeacher({
        id: teacherId,
        _id: teacherId,
        ...teacherData
      });


      let classes =
        teacherData.classesAssigned ||
        teacherData.assignedClasses ||
        teacherData.classes ||
        (
          teacherData.classAssigned
            ? Array.isArray(
                teacherData.classAssigned
              )
              ? teacherData.classAssigned
              : [
                  teacherData.classAssigned
                ]
            : []
        ) ||
        (
          teacherData.class
            ? [teacherData.class]
            : []
        );


      let subjects =
        teacherData.subjects ||
        teacherData.assignedSubjects ||
        teacherData.subjectsAssigned ||
        (
          teacherData.subject
            ? [teacherData.subject]
            : []
        );


      classes =
        (
          Array.isArray(classes)
            ? classes
            : [classes]
        )
          .flat()
          .filter(Boolean);


      subjects =
        (
          Array.isArray(subjects)
            ? subjects
            : [subjects]
        )
          .flat()
          .filter(Boolean);


      const subjectOptions = [];


      for (const subject of subjects) {

        try {

          if (
            subject &&
            typeof subject === 'object'
          ) {

            const id =
              subject._id ||
              subject.id ||
              '';

            const name =
              subject.name ||
              subject.subjectName ||
              '';

            if (name) {

              subjectOptions.push({
                id: id
                  ? String(id)
                  : '',
                name: String(name)
              });

              continue;
            }
          }


          const subjectValue =
            String(subject);


          if (
            !/^[a-fA-F0-9]{24}$/.test(
              subjectValue
            )
          ) {

            subjectOptions.push({
              id: '',
              name: subjectValue
            });

            continue;
          }


          const response =
            await axios.get(
              `${API_BASE_URL}/api/subjects/id/${subjectValue}`
            );


          const subjectData =
            response.data?.subject;


          if (
            response.data?.success &&
            subjectData?.name
          ) {

            subjectOptions.push({

              id: subjectData._id
                ? String(
                    subjectData._id
                  )
                : subjectValue,

              name: String(
                subjectData.name
              )

            });

          }

        } catch (error) {

          console.error(
            `Failed to load subject: ${subject}`,
            error
          );

        }
      }


      const uniqueSubjects =
        subjectOptions.filter(
          (subject, index, self) =>
            index ===
            self.findIndex(
              item =>
                item.name
                  .toLowerCase() ===
                subject.name
                  .toLowerCase()
            )
        );


      if (classes.length === 0) {

        classes = [
          'Class 1',
          'Class 2',
          'Class 3',
          'Class 4',
          'Class 5',
          'Class 6',
          'Class 7',
          'Class 8',
          'Class 9',
          'Class 10'
        ];
      }


      if (uniqueSubjects.length === 0) {

        const fallbackSubjects = [
          'Mathematics',
          'Science',
          'English',
          'History',
          'Geography',
          'Physics',
          'Chemistry',
          'Biology',
          'Computer Science'
        ].map(name => ({
          id: '',
          name
        }));


        setAvailableSubjects(
          fallbackSubjects
        );

        setSelectedSubject(
          fallbackSubjects[0].name
        );

        setSelectedSubjectId('');

      } else {

        setAvailableSubjects(
          uniqueSubjects
        );

        setSelectedSubject(
          uniqueSubjects[0].name
        );

        setSelectedSubjectId(
          uniqueSubjects[0].id || ''
        );
      }


      setAssignedClasses(classes);

      setSelectedClass(classes[0]);

      setLoading(false);
    };


  /* =========================================================
     FETCH STUDENTS
     ========================================================= */

  const fetchStudents = async () => {

    if (!selectedClass) {
      return;
    }


    setLoading(true);


    try {

      const response =
        await axios.get(
          `${API_BASE_URL}/api/students/by-class/${selectedClass}`
        );


      const studentsData =
        response.data.students ||
        response.data ||
        [];


      setStudents(
        studentsData.map(student => ({
          ...student,
          status: 'Absent',
          duration: 0,
          isPresent: false
        }))
      );

    } catch (error) {

      console.error(
        'Error fetching students:',
        error
      );

      setStudents([]);

    } finally {

      setLoading(false);

    }
  };


  /* =========================================================
     CHECK ACTIVE LIVE CLASS
     ========================================================= */

  const checkForActiveLiveClass =
    async () => {

      if (
        !teacher ||
        !selectedClass ||
        !selectedSubject
      ) {
        return;
      }


      try {

        const response =
          await axios.get(
            `${API_BASE_URL}/api/live-classes`
          );


        const liveClasses =
          response.data || [];


        const matchingClass =
          liveClasses.find(
            cls =>

              (
                cls.subject ===
                  selectedSubject ||

                (
                  selectedSubjectId &&
                  cls.subject ===
                    selectedSubjectId
                )
              ) &&

              cls.class ===
                selectedClass &&

              cls.teacherId ===
                teacher.id &&

              cls.isLive
          );


        if (matchingClass) {

          setActiveLiveClass(
            matchingClass
          );

          await autoStartAttendanceSession(
            matchingClass
          );

        } else {

          if (isAutoTracking) {

            setIsAutoTracking(false);

            setActiveLiveClass(null);
          }
        }

      } catch (error) {

        console.error(
          'Error checking live class:',
          error
        );
      }
    };


  /* =========================================================
     AUTO START SESSION
     ========================================================= */

  const autoStartAttendanceSession =
    async liveClass => {

      try {

        const checkResponse =
          await axios.get(
            `${API_BASE_URL}/api/attendance/active-session`,
            {
              params: {
                teacherId:
                  teacher.id,

                class:
                  selectedClass,

                subject:
                  selectedSubject,

                date:
                  selectedDate
              }
            }
          );


        if (
          checkResponse.data.success &&
          checkResponse.data.session
        ) {

          setLiveSession(
            checkResponse.data.session
          );


          setSessionStartTime(
            new Date(
              checkResponse.data.session.startTime
            )
          );


          setIsAutoTracking(true);


          loadSessionAttendance(
            checkResponse.data.session._id
          );

        } else {

          const teacherName =
            `${teacher.salutation || ''} ${
              teacher.firstName || ''
            } ${
              teacher.lastName || ''
            }`.trim();


          const response =
            await axios.post(
              `${API_BASE_URL}/api/attendance/start-session`,
              {
                teacherId:
                  teacher.id,

                teacherName:
                  teacherName ||
                  'Unknown Teacher',

                class:
                  selectedClass,

                subject:
                  selectedSubject,

                date:
                  selectedDate,

                liveClassId:
                  liveClass.id,

                autoStarted:
                  true
              }
            );


          if (response.data.success) {

            setLiveSession(
              response.data.session
            );

            setSessionStartTime(
              new Date()
            );

            setIsAutoTracking(true);
          }
        }

      } catch (error) {

        console.error(
          'Error auto-starting session:',
          error
        );
      }
    };


  /* =========================================================
     LOAD SESSION ATTENDANCE
     ========================================================= */

  const loadSessionAttendance =
    async sessionId => {

      try {

        const response =
          await axios.get(
            `${API_BASE_URL}/api/attendance/session/${sessionId}`
          );


        if (response.data.success) {

          const records =
            response.data.records || [];


          setAttendanceRecords(
            records
          );


          setStudents(
            previousStudents =>

              previousStudents.map(
                student => {

                  const record =
                    records.find(
                      record =>
                        record.studentId ===
                        student._id
                    );


                  if (!record) {
                    return student;
                  }


                  const duration =
                    record.totalDuration ||
                    record.duration ||
                    0;


                  const status =
                    duration >= 45
                      ? 'Present'
                      : 'Absent';


                  const isActiveInClass =
                    record.firstJoinTime &&
                    !record.lastLeaveTime;


                  return {
                    ...student,

                    status,

                    duration,

                    isPresent:
                      isActiveInClass
                  };
                }
              )
          );
        }

      } catch (error) {

        console.error(
          'Error loading session attendance:',
          error
        );
      }
    };


  /* =========================================================
     AUTO TRACK ATTENDANCE
     ========================================================= */

  const autoTrackAttendance =
    async () => {

      if (
        !activeLiveClass ||
        !liveSession
      ) {
        return;
      }


      try {

        const response =
          await axios.get(
            `${API_BASE_URL}/api/live-classes`
          );


        const liveClasses =
          response.data || [];


        const currentClass =
          liveClasses.find(
            cls =>
              cls.id ===
              activeLiveClass.id
          );


        if (
          !currentClass ||
          !currentClass.isLive
        ) {

          setIsAutoTracking(false);

          setActiveLiveClass(null);

          await autoEndSession();

          return;
        }


        const participants =
          currentClass.participants || [];


        setLastSyncTime(
          new Date()
        );


        for (
          const participant of participants
        ) {

          const student =
            students.find(
              student =>

                student.email ===
                  participant.email ||

                `${student.firstName} ${student.lastName}`
                  .trim()
                  .toLowerCase() ===
                  participant.name
                    ?.toLowerCase()
            );


          if (
            student &&
            !student.isPresent
          ) {

            await markAttendance(
              student,
              'join',
              true
            );
          }
        }


        const activeStudents =
          students.filter(
            student =>
              student.isPresent
          );


        for (
          const student of activeStudents
        ) {

          const stillInClass =
            participants.some(
              participant =>

                participant.email ===
                  student.email ||

                participant.name
                  ?.toLowerCase() ===
                  `${student.firstName} ${student.lastName}`
                    .trim()
                    .toLowerCase()
            );


          if (!stillInClass) {

            await markAttendance(
              student,
              'leave',
              true
            );
          }
        }

      } catch (error) {

        console.error(
          'Error auto-tracking:',
          error
        );
      }
    };


  /* =========================================================
     END SESSION
     ========================================================= */

  const autoEndSession =
    async () => {

      if (!liveSession) {
        return;
      }


      try {

        await axios.post(
          `${API_BASE_URL}/api/attendance/end-session`,
          {
            sessionId:
              liveSession._id,

            endTime:
              new Date(),

            autoEnded:
              true
          }
        );


        setLiveSession(null);

        setSessionStartTime(null);

        setIsAutoTracking(false);

      } catch (error) {

        console.error(
          'Error auto-ending session:',
          error
        );
      }
    };


  /* =========================================================
     MARK ATTENDANCE
     ========================================================= */

  const markAttendance =
    async (
      student,
      action,
      isAuto = false
    ) => {

      if (!liveSession) {
        return;
      }


      try {

        const response =
          await axios.post(
            `${API_BASE_URL}/api/attendance/mark`,
            {
              sessionId:
                liveSession._id,

              studentId:
                student._id,

              studentName:
                `${student.salutation || ''} ${
                  student.firstName || ''
                } ${
                  student.lastName || ''
                }`.trim(),

              action,

              timestamp:
                new Date(),

              class:
                selectedClass,

              subject:
                selectedSubject,

              isAutoTracked:
                isAuto
            }
          );


        if (response.data.success) {

          await loadSessionAttendance(
            liveSession._id
          );
        }

      } catch (error) {

        console.error(
          'Error marking attendance:',
          error
        );
      }
    };


  /* =========================================================
     MANUAL ATTENDANCE
     ========================================================= */

  const handleManualMark =
    async (
      student,
      action
    ) => {

      if (!liveSession) {

        alert(
          'No active session. Please start a live class first.'
        );

        return;
      }


      await markAttendance(
        student,
        action,
        false
      );
    };


  /* =========================================================
     TIMER
     ========================================================= */

  const startDurationTimer =
    () => {

      if (timerRef.current) {

        clearInterval(
          timerRef.current
        );
      }


      timerRef.current =
        setInterval(() => {

          if (liveSession) {

            loadSessionAttendance(
              liveSession._id
            );
          }

        }, 60000);
    };


  /* =========================================================
     EXPORT ERROR
     ========================================================= */

  const extractBlobErrorMessage =
    async (
      error,
      fallback
    ) => {

      const data =
        error?.response?.data;


      if (data instanceof Blob) {

        try {

          const text =
            await data.text();

          const parsed =
            JSON.parse(text);

          return (
            parsed.message ||
            fallback
          );

        } catch {

          return fallback;
        }
      }


      return (
        error?.response?.data?.message ||
        fallback
      );
    };


  /* =========================================================
     EXPORT CURRENT SESSION
     ========================================================= */

  const exportCurrentSession =
    async () => {

      if (!liveSession) {

        alert(
          'No active session to export'
        );

        return;
      }


      try {

        const response =
          await axios.get(
            `${API_BASE_URL}/api/attendance/export/${liveSession._id}`,
            {
              responseType:
                'blob'
            }
          );


        if (
          response.data.size === 0
        ) {

          alert(
            'No attendance data found.'
          );

          return;
        }


        const url =
          window.URL.createObjectURL(
            new Blob(
              [response.data],
              {
                type:
                  'text/csv'
              }
            )
          );


        const link =
          document.createElement('a');


        link.href = url;


        link.setAttribute(
          'download',
          `attendance_${selectedClass}_${selectedSubject}_${selectedDate}.csv`
        );


        document.body.appendChild(
          link
        );


        link.click();


        link.remove();


        window.URL.revokeObjectURL(
          url
        );

      } catch (error) {

        const message =
          await extractBlobErrorMessage(
            error,
            'Failed to export. Please try again.'
          );


        alert(message);
      }
    };


  /* =========================================================
     EXPORT HISTORY
     ========================================================= */

  const exportByDateRange =
    async () => {

      if (
        !exportStartDate ||
        !exportEndDate
      ) {

        alert(
          'Please select both dates'
        );

        return;
      }


      if (
        new Date(exportStartDate) >
        new Date(exportEndDate)
      ) {

        alert(
          'Start date cannot be later than end date'
        );

        return;
      }


      try {

        const response =
          await axios.post(
            `${API_BASE_URL}/api/attendance/export-range`,
            {
              class:
                selectedClass,

              subject:
                selectedSubject,

              startDate:
                exportStartDate,

              endDate:
                exportEndDate,

              teacherId:
                teacher.id
            },
            {
              responseType:
                'blob'
            }
          );


        if (
          response.data.size === 0
        ) {

          alert(
            'No records found for this date range.'
          );

          return;
        }


        const url =
          window.URL.createObjectURL(
            new Blob(
              [response.data],
              {
                type:
                  'text/csv'
              }
            )
          );


        const link =
          document.createElement('a');


        link.href = url;


        link.setAttribute(
          'download',
          `attendance_history_${selectedClass}_${exportStartDate}_to_${exportEndDate}.csv`
        );


        document.body.appendChild(
          link
        );


        link.click();


        link.remove();


        window.URL.revokeObjectURL(
          url
        );


        setShowExportModal(false);

      } catch (error) {

        const message =
          await extractBlobErrorMessage(
            error,
            'Export failed. Please try again.'
          );


        alert(message);
      }
    };


  /* =========================================================
     FORMAT HELPERS
     ========================================================= */

  const formatDuration =
    minutes => {

      if (
        !minutes ||
        minutes === 0
      ) {
        return '0m';
      }


      const hours =
        Math.floor(
          minutes / 60
        );


      const mins =
        minutes % 60;


      return hours > 0
        ? `${hours}h ${mins}m`
        : `${mins}m`;
    };


  const formatTime =
    dateString => {

      if (!dateString) {
        return '—';
      }


      try {

        return new Date(
          dateString
        ).toLocaleTimeString(
          'en-US',
          {
            hour:
              '2-digit',

            minute:
              '2-digit',

            hour12:
              true
          }
        );

      } catch {

        return '—';
      }
    };


  const getSessionDuration =
    () => {

      if (!sessionStartTime) {
        return '0m';
      }


      const diff =
        Math.floor(
          (
            new Date() -
            sessionStartTime
          ) /
            1000 /
            60
        );


      return formatDuration(
        diff
      );
    };


  const getStudentRecord =
    studentId => {

      return (
        attendanceRecords.find(
          record =>
            record.studentId ===
            studentId
        ) || null
      );
    };


  /* =========================================================
     FILTER
     ========================================================= */

  const getFilteredStudents =
    () => {

      if (
        filterStatus ===
        'All'
      ) {
        return students;
      }


      if (
        filterStatus ===
        'Present'
      ) {

        return students.filter(
          student =>
            student.status ===
            'Present'
        );
      }


      if (
        filterStatus ===
        'Absent'
      ) {

        return students.filter(
          student =>
            student.status ===
            'Absent'
        );
      }


      if (
        filterStatus ===
        'In Class'
      ) {

        return students.filter(
          student =>
            student.isPresent
        );
      }


      return students;
    };


  const filteredStudents =
    getFilteredStudents();


  const indexOfLastStudent =
    currentPage *
    studentsPerPage;


  const indexOfFirstStudent =
    indexOfLastStudent -
    studentsPerPage;


  const currentStudents =
    filteredStudents.slice(
      indexOfFirstStudent,
      indexOfLastStudent
    );


  const totalPages =
    Math.ceil(
      filteredStudents.length /
        studentsPerPage
    );


  /* =========================================================
     STATISTICS
     ========================================================= */

  const getStats = () => {

    const total =
      students.length;


    const present =
      students.filter(
        student =>
          student.status ===
          'Present'
      ).length;


    const inClass =
      students.filter(
        student =>
          student.isPresent
      ).length;


    const absent =
      total - present;


    return {
      total,
      present,
      absent,
      inClass
    };
  };


  const stats =
    getStats();


  /* =========================================================
     EFFECTS
     ========================================================= */

  useEffect(() => {

    loadTeacherAssignments();


    return () => {

      if (timerRef.current) {

        clearInterval(
          timerRef.current
        );
      }


      if (
        trackingIntervalRef.current
      ) {

        clearInterval(
          trackingIntervalRef.current
        );
      }


      if (
        liveClassCheckRef.current
      ) {

        clearInterval(
          liveClassCheckRef.current
        );
      }
    };

  }, []);


  useEffect(() => {

    if (
      selectedClass &&
      selectedSubject
    ) {

      fetchStudents();

      setCurrentPage(1);
    }

  }, [
    selectedClass,
    selectedSubject
  ]);


  useEffect(() => {

    if (
      selectedClass &&
      selectedSubject &&
      teacher
    ) {

      checkForActiveLiveClass();


      liveClassCheckRef.current =
        setInterval(
          checkForActiveLiveClass,
          10000
        );
    }


    return () => {

      if (
        liveClassCheckRef.current
      ) {

        clearInterval(
          liveClassCheckRef.current
        );
      }
    };

  }, [
    selectedClass,
    selectedSubject,
    teacher
  ]);


  useEffect(() => {

    if (
      isAutoTracking &&
      liveSession &&
      activeLiveClass
    ) {

      startDurationTimer();


      trackingIntervalRef.current =
        setInterval(
          autoTrackAttendance,
          15000
        );


      autoTrackAttendance();

    } else {

      if (
        trackingIntervalRef.current
      ) {

        clearInterval(
          trackingIntervalRef.current
        );
      }
    }


    return () => {

      if (
        trackingIntervalRef.current
      ) {

        clearInterval(
          trackingIntervalRef.current
        );
      }
    };

  }, [
    isAutoTracking,
    liveSession,
    activeLiveClass
  ]);


  useEffect(() => {

    if (
      selectedDate &&
      selectedClass &&
      selectedSubject &&
      teacher
    ) {

      checkForActiveLiveClass();
    }

  }, [selectedDate]);


  useEffect(() => {

    const handleClickOutside =
      event => {

        if (
          filterRef.current &&
          !filterRef.current.contains(
            event.target
          )
        ) {

          setShowFilterMenu(
            false
          );
        }
      };


    document.addEventListener(
      'mousedown',
      handleClickOutside
    );


    return () =>
      document.removeEventListener(
        'mousedown',
        handleClickOutside
      );

  }, []);


  /* =========================================================
     LOADING SCREEN
     ========================================================= */

  if (loading) {

    return (

      <div className="attendance-loading">

        <FaSpinner className="spinner" />

        <p>
          Loading attendance system...
        </p>

      </div>
    );
  }


  /* =========================================================
     NOT LOGGED IN
     ========================================================= */

  if (!teacher) {

    return (

      <div className="attendance-loading">

        <FaExclamationTriangle
          className="attendance-error-icon"
        />

        <h3>
          Not Logged In
        </h3>

        <p>
          Please log in as a teacher to
          access attendance.
        </p>

      </div>
    );
  }


  /* =========================================================
     MAIN UI
     ========================================================= */

  return (

    <div className="take-attendance-container">


      {/* =====================================================
          COMPACT BLUE HEADING
          ===================================================== */}

      <section className="attendance-title-card">

        <div className="attendance-title-left">

          <div className="attendance-title-icon">
            <FaCalendarAlt />
          </div>


          <div>

            <h1>
              ATTENDANCE TRACKING
            </h1>

            <p>
              Automatic real-time attendance
              tracking for live classes
            </p>

          </div>

        </div>


        <div className="attendance-date-box">

          <div className="attendance-date-icon">
            <FaCalendarAlt />
          </div>

          <div>

            <span>
              Today
            </span>

            <strong>
              {new Date(
                selectedDate
              ).toLocaleDateString(
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

      </section>


      {/* =====================================================
          SEARCH
          ===================================================== */}

      <section className="attendance-search-section">

        <h2>
          Check Student Attendance
        </h2>


        <StudentAttendanceSearch
          students={students}
          attendanceRecords={
            attendanceRecords
          }
          formatTime={
            formatTime
          }
          formatDuration={
            formatDuration
          }
        />

      </section>


      {/* =====================================================
          CONTROLS
          ===================================================== */}

      <section className="attendance-controls-card">


        <div className="attendance-control-group">

          <label>
            Class
          </label>

          <select
            value={selectedClass}
            onChange={e => {
              setSelectedClass(
                e.target.value
              );
            }}
          >

            {assignedClasses.map(
              (cls, index) => (

                <option
                  key={index}
                  value={cls}
                >
                  {cls}
                </option>

              )
            )}

          </select>

        </div>


        <div className="attendance-control-group">

          <label>
            Subject
          </label>

          <select
            value={selectedSubject}
            onChange={e => {

              const selectedName =
                e.target.value;


              const selectedOption =
                availableSubjects.find(
                  subject =>
                    subject.name ===
                    selectedName
                );


              setSelectedSubject(
                selectedName
              );


              setSelectedSubjectId(
                selectedOption?.id ||
                ''
              );
            }}
          >

            {availableSubjects.map(
              (subject, index) => (

                <option
                  key={
                    subject.id ||
                    `${subject.name}-${index}`
                  }
                  value={subject.name}
                >
                  {subject.name}
                </option>

              )
            )}

          </select>

        </div>


        <div className="attendance-control-group">

          <label>
            Date
          </label>

          <div className="attendance-date-input-wrapper">

            <input
              type="date"
              value={selectedDate}
              onChange={e =>
                setSelectedDate(
                  e.target.value
                )
              }
              max={
                new Date()
                  .toISOString()
                  .split('T')[0]
              }
            />

            <FaCalendarAlt />

          </div>

        </div>


        <div
          className="attendance-control-group filter-control"
          ref={filterRef}
        >

          <label>
            Filter
          </label>

          <button
            type="button"
            className="attendance-filter-button"
            onClick={() =>
              setShowFilterMenu(
                !showFilterMenu
              )
            }
          >

            {filterStatus}

            <span>
              ▾
            </span>

          </button>


          {showFilterMenu && (

            <div className="attendance-filter-menu">

              {[
                'All',
                'Present',
                'Absent',
                'In Class'
              ].map(option => (

                <button
                  type="button"
                  key={option}
                  className={
                    filterStatus === option
                      ? 'active'
                      : ''
                  }
                  onClick={() => {

                    setFilterStatus(
                      option
                    );

                    setShowFilterMenu(
                      false
                    );

                    setCurrentPage(1);
                  }}
                >
                  {option}
                </button>

              ))}

            </div>

          )}

        </div>


        <div className="attendance-control-actions">

          {liveSession && (

            <button
              type="button"
              className="attendance-export-button"
              onClick={
                exportCurrentSession
              }
            >

              <FaDownload />

              Export

            </button>

          )}


          <button
            type="button"
            className="attendance-history-button"
            onClick={() =>
              setShowExportModal(
                true
              )
            }
          >

            <FaHistory />

            History

          </button>

        </div>

      </section>


      {/* =====================================================
          LIVE CLASS STATUS
          ===================================================== */}

      {isAutoTracking &&
      activeLiveClass ? (

        <section className="attendance-live-banner active">

          <div className="attendance-live-icon">
            <span />
          </div>


          <div className="attendance-live-content">

            <h3>
              Live Class Running
            </h3>

            <p>

              Attendance is being tracked
              automatically

              {lastSyncTime &&
                ` • Last sync: ${formatTime(
                  lastSyncTime
                )}`}

            </p>

          </div>


          <div className="attendance-live-duration">

            <FaClock />

            {getSessionDuration()}

          </div>

        </section>

      ) : (

        <section className="attendance-live-banner waiting">

          <div className="attendance-info-icon">
            <FaInfoCircle />
          </div>


          <div className="attendance-live-content">

            <h3>
              Waiting for Live Class
            </h3>

            <p>
              Start a live class from the
              Subjects page to begin automatic
              attendance tracking.
            </p>

          </div>

        </section>

      )}


      {/* =====================================================
          ATTENDANCE RULE
          ===================================================== */}

      <div className="attendance-rule">

        <FaInfoCircle />

        <span>
          Students must stay in the live class
          for at least <strong>45 minutes</strong>
          to be marked Present.
        </span>

      </div>


      {/* =====================================================
          TABLE
          ===================================================== */}

      <section className="attendance-table-card">


        <div className="attendance-table-header">

          <div>

            <h2>
              Student Attendance
            </h2>

            <p>
              {stats.total} students •{' '}
              {stats.present} present •{' '}
              {stats.absent} absent
            </p>

          </div>


          <div className="attendance-table-count">

            {stats.inClass}

            <span>
              In Class Now
            </span>

          </div>

        </div>


        {currentStudents.length === 0 ? (

          <div className="attendance-no-students">

            <FaExclamationTriangle />

            <h3>
              No Students Found
            </h3>

            <p>
              No students are available for
              the selected class.
            </p>

          </div>

        ) : (

          <>

            <div className="attendance-table-wrapper">

              <table className="attendance-table">

                <thead>

                  <tr>

                    <th>
                      No
                    </th>

                    <th>
                      Student Name
                    </th>

                    <th>
                      <FaSignInAlt />
                      Join Time
                    </th>

                    <th>
                      <FaSignOutAlt />
                      Leave Time
                    </th>

                    <th>
                      Duration
                    </th>

                    <th>
                      Status
                    </th>

                    <th>
                      Actions
                    </th>

                  </tr>

                </thead>


                <tbody>

                  {currentStudents.map(
                    (
                      student,
                      index
                    ) => {

                      const record =
                        getStudentRecord(
                          student._id
                        );


                      return (

                        <tr
                          key={
                            student._id
                          }
                          className={
                            student.isPresent
                              ? 'student-present-row'
                              : ''
                          }
                        >


                          <td className="student-number">

                            {
                              indexOfFirstStudent +
                              index +
                              1
                            }

                          </td>


                          <td>

                            <div className="table-student">

                              <div className="table-student-name">

                                {student.isPresent && (

                                  <span className="table-live-dot" />

                                )}

                                {`${student.salutation || ''} ${
                                  student.firstName || ''
                                } ${
                                  student.lastName || ''
                                }`.trim()}

                              </div>


                              <div className="table-student-email">

                                {student.email}

                              </div>

                            </div>

                          </td>


                          <td>

                            <span className="table-join-time">

                              {record?.firstJoinTime
                                ? formatTime(
                                    record.firstJoinTime
                                  )
                                : '—'}

                            </span>

                          </td>


                          <td>

                            <span className="table-leave-time">

                              {record?.lastLeaveTime

                                ? formatTime(
                                    record.lastLeaveTime
                                  )

                                : student.isPresent

                                ? 'Still in class'

                                : '—'}

                            </span>

                          </td>


                          <td>

                            <span
                              className={
                                student.duration >=
                                45
                                  ? 'table-duration sufficient'
                                  : 'table-duration insufficient'
                              }
                            >

                              <FaClock />

                              {formatDuration(
                                student.duration
                              )}

                            </span>

                          </td>


                          <td>

                            <span
                              className={
                                student.status ===
                                'Present'
                                  ? 'table-status present'
                                  : 'table-status absent'
                              }
                            >

                              {student.status ===
                              'Present'
                                ? <FaCheckCircle />
                                : <FaTimesCircle />}

                              {student.status}

                            </span>

                          </td>


                          <td>

                            <div className="table-actions">

                              <button
                                type="button"
                                className="table-view-button"
                                title="View Details"
                                onClick={() => {

                                  setSelectedStudent({
                                    ...student,
                                    record
                                  });

                                  setShowDetailsModal(
                                    true
                                  );

                                }}
                              >

                                <FaEye />

                              </button>


                              {!student.isPresent &&
                                liveSession && (

                                  <button
                                    type="button"
                                    className="table-join-button"
                                    title="Mark as joined"
                                    onClick={() =>
                                      handleManualMark(
                                        student,
                                        'join'
                                      )
                                    }
                                  >

                                    <FaSignInAlt />

                                  </button>

                                )}


                              {student.isPresent &&
                                liveSession && (

                                  <button
                                    type="button"
                                    className="table-leave-button"
                                    title="Mark as left"
                                    onClick={() =>
                                      handleManualMark(
                                        student,
                                        'leave'
                                      )
                                    }
                                  >

                                    <FaSignOutAlt />

                                  </button>

                                )}

                            </div>

                          </td>

                        </tr>

                      );
                    }
                  )}

                </tbody>

              </table>

            </div>


            {totalPages > 1 && (

              <div className="attendance-pagination">

                <button
                  type="button"
                  disabled={
                    currentPage === 1
                  }
                  onClick={() =>
                    setCurrentPage(
                      currentPage - 1
                    )
                  }
                >

                  <FaChevronLeft />

                </button>


                <span>

                  Page {currentPage} of{' '}
                  {totalPages}

                </span>


                <button
                  type="button"
                  disabled={
                    currentPage ===
                    totalPages
                  }
                  onClick={() =>
                    setCurrentPage(
                      currentPage + 1
                    )
                  }
                >

                  <FaChevronRight />

                </button>

              </div>

            )}

          </>

        )}

      </section>


      {/* =====================================================
          EXPORT HISTORY MODAL
          ===================================================== */}

      {showExportModal && (

        <div
          className="attendance-modal-overlay"
          onClick={() =>
            setShowExportModal(
              false
            )
          }
        >

          <div
            className="attendance-modal"
            onClick={e =>
              e.stopPropagation()
            }
          >

            <div className="attendance-modal-header">

              <h3>

                <FaHistory />

                Export Attendance History

              </h3>


              <button
                type="button"
                onClick={() =>
                  setShowExportModal(
                    false
                  )
                }
              >

                <FaTimes />

              </button>

            </div>


            <div className="attendance-modal-body">

              <div className="modal-date-grid">


                <div className="modal-field">

                  <label>
                    Start Date
                  </label>

                  <input
                    type="date"
                    value={
                      exportStartDate
                    }
                    max={
                      new Date()
                        .toISOString()
                        .split('T')[0]
                    }
                    onChange={e =>
                      setExportStartDate(
                        e.target.value
                      )
                    }
                  />

                </div>


                <div className="modal-field">

                  <label>
                    End Date
                  </label>

                  <input
                    type="date"
                    value={
                      exportEndDate
                    }
                    min={
                      exportStartDate
                    }
                    max={
                      new Date()
                        .toISOString()
                        .split('T')[0]
                    }
                    onChange={e =>
                      setExportEndDate(
                        e.target.value
                      )
                    }
                  />

                </div>

              </div>


              <div className="modal-summary">

                <p>
                  <strong>
                    Class:
                  </strong>{' '}
                  {selectedClass}
                </p>

                <p>
                  <strong>
                    Subject:
                  </strong>{' '}
                  {selectedSubject}
                </p>

              </div>


              <button
                type="button"
                className="modal-export-button"
                onClick={
                  exportByDateRange
                }
                disabled={
                  !exportStartDate ||
                  !exportEndDate
                }
              >

                <FaDownload />

                Export CSV

              </button>

            </div>

          </div>

        </div>

      )}


      {/* =====================================================
          STUDENT DETAILS MODAL
          ===================================================== */}

      {showDetailsModal &&
        selectedStudent && (

          <div
            className="attendance-modal-overlay"
            onClick={() =>
              setShowDetailsModal(
                false
              )
            }
          >

            <div
              className="attendance-modal student-details-modal"
              onClick={e =>
                e.stopPropagation()
              }
            >

              <div className="attendance-modal-header">

                <h3>
                  Student Attendance Details
                </h3>


                <button
                  type="button"
                  onClick={() =>
                    setShowDetailsModal(
                      false
                    )
                  }
                >

                  <FaTimes />

                </button>

              </div>


              <div className="attendance-modal-body">

                <div className="student-detail-item">

                  <span>
                    Student Name
                  </span>

                  <strong>
                    {`${selectedStudent.salutation || ''} ${
                      selectedStudent.firstName || ''
                    } ${
                      selectedStudent.lastName || ''
                    }`.trim()}
                  </strong>

                </div>


                <div className="student-detail-item">

                  <span>
                    Class
                  </span>

                  <strong>
                    {selectedStudent.class ||
                      selectedClass}
                  </strong>

                </div>


                <div className="student-detail-item">

                  <span>
                    Email
                  </span>

                  <strong>
                    {selectedStudent.email}
                  </strong>

                </div>


                <div className="student-detail-item">

                  <span>
                    <FaSignInAlt />
                    First Joined
                  </span>

                  <strong className="detail-join">

                    {selectedStudent.record
                      ?.firstJoinTime
                      ? formatTime(
                          selectedStudent
                            .record
                            .firstJoinTime
                        )
                      : '—'}

                  </strong>

                </div>


                <div className="student-detail-item">

                  <span>
                    <FaSignOutAlt />
                    Last Left
                  </span>

                  <strong className="detail-leave">

                    {selectedStudent.record
                      ?.lastLeaveTime

                      ? formatTime(
                          selectedStudent
                            .record
                            .lastLeaveTime
                        )

                      : selectedStudent.isPresent

                      ? 'Still in class'

                      : '—'}

                  </strong>

                </div>


                <div className="student-detail-item">

                  <span>
                    Total Duration
                  </span>

                  <strong className="detail-duration">

                    {formatDuration(
                      selectedStudent.duration
                    )}

                    {selectedStudent.duration >=
                    45
                      ? ' ✓'
                      : ''}

                  </strong>

                </div>


                <div className="student-detail-item">

                  <span>
                    Status
                  </span>

                  <strong
                    className={
                      selectedStudent.status ===
                      'Present'
                        ? 'detail-status present'
                        : 'detail-status absent'
                    }
                  >

                    {selectedStudent.status}

                  </strong>

                </div>


                {selectedStudent.record
                  ?.sessionHistory?.length >
                  0 && (

                  <div className="session-history">

                    <h4>
                      Session History
                    </h4>


                    {selectedStudent.record.sessionHistory.map(
                      (
                        session,
                        index
                      ) => (

                        <div
                          key={index}
                          className="session-history-item"
                        >

                          <span className="history-join">

                            <FaSignInAlt />

                            {session.joinedAt
                              ? formatTime(
                                  session.joinedAt
                                )
                              : '—'}

                          </span>


                          <span>
                            →
                          </span>


                          <span className="history-leave">

                            <FaSignOutAlt />

                            {session.leftAt
                              ? formatTime(
                                  session.leftAt
                                )
                              : 'Still in class'}

                          </span>


                          {session.durationMinutes >
                            0 && (

                            <span className="history-duration">

                              {formatDuration(
                                session.durationMinutes
                              )}

                            </span>

                          )}

                        </div>

                      )
                    )}

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