import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

import API_BASE_URL from "../config/api";

import {
  FaBook,
  FaLaptopCode,
  FaCalculator,
  FaStop,
  FaSpinner,
  FaExclamationTriangle,
  FaVideo,
  FaPlus,
  FaTimes,
  FaCalendarAlt,
  FaClock,
  FaChalkboardTeacher,
  FaStickyNote,
  FaDesktop,
  FaCopy,
  FaCheck,
  FaShareAlt,
  FaTrash,
} from "react-icons/fa";

import { useLiveClass } from "../contexts/LiveClassContext";

import {
  generateRoomName,
  openJitsiInNewTab,
} from "../utils/jitsiUtils";

import Maths from "../assets/Maths.jpeg";
import Physics from "../assets/Physics.jpeg";
import Chemistry from "../assets/Chemistry.jpeg";
import English from "../assets/English.jpeg";
import Tamil from "../assets/Tamil.jpeg";
import Science from "../assets/Science.jpeg";
import Social from "../assets/Social.jpeg";
import Zoology from "../assets/Zoology.jpeg";
import Botany from "../assets/Botany.jpeg";
import Geography from "../assets/Geography.jpeg";
import History from "../assets/History.jpeg";
import Economics from "../assets/Economics.jpeg";
import Hindi from "../assets/Hindi.jpeg";
import ComputerScience from "../assets/ComputerScience.jpeg";
import Accounts from "../assets/Accounts.jpeg";


const PLATFORMS = [
  "Jitsi Meet",
  "Zoom",
  "Google Meet",
  "Microsoft Teams",
  "Cisco Webex",
];


const imageMap = {
  Maths,
  Physics,
  Chemistry,
  English,
  Tamil,
  Science,
  Social,
  Zoology,
  Botany,
  Geography,
  History,
  Economics,
  Hindi,
  "Computer Science": ComputerScience,
  Accounts,
};


const getSubjectIcon = (name) => {
  if (name === "Maths") {
    return <FaCalculator />;
  }

  if (name === "Computer Science") {
    return <FaLaptopCode />;
  }

  return <FaBook />;
};


const TeacherSubjects = () => {

  const navigate = useNavigate();

  const {
    liveClasses,
    startLiveClass,
    endLiveClass,
  } = useLiveClass();


  // =====================================================
  // STATE
  // =====================================================

  const [teacher, setTeacher] =
    useState(null);

  const [teacherSubjects, setTeacherSubjects] =
    useState([]);

  const [createdClasses, setCreatedClasses] =
    useState([]);

  const [startingClass, setStartingClass] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [showModal, setShowModal] =
    useState(false);

  const [showShareModal, setShowShareModal] =
    useState(null);

  const [copiedId, setCopiedId] =
    useState(null);

  const [savingClass, setSavingClass] =
    useState(false);


  const [form, setForm] =
    useState({
      className: "",
      subject: "",
      studentClass: "",
      date: "",
      time: "",
      platform: "Jitsi Meet",
      description: "",
      manualLink: "",
    });


  // =====================================================
  // GET TEACHER DATA
  // =====================================================

  useEffect(() => {

    try {

      const teacherData =
        JSON.parse(
          localStorage.getItem("teacher") || "null"
        );

      const userData =
        JSON.parse(
          localStorage.getItem("user") || "null"
        );


      const currentTeacher =
        teacherData ||
        userData?.teacher ||
        userData;


      if (
        currentTeacher &&
        (
          currentTeacher._id ||
          currentTeacher.id
        )
      ) {

        setTeacher({
          ...currentTeacher,
          _id:
            currentTeacher._id ||
            currentTeacher.id,
        });

      } else {

        setError(
          "Teacher information not found. Please login again."
        );

        setLoading(false);

      }

    } catch (error) {

      console.error(
        "Error reading teacher data:",
        error
      );

      setError(
        "Please login again."
      );

      setLoading(false);

    }

  }, []);


  // =====================================================
  // NORMALIZE SCHEDULED CLASS
  //
  // Backend fields:
  // class
  // scheduledDate
  // scheduledTime
  //
  // Frontend fields:
  // studentClass
  // date
  // time
  // =====================================================

  const normalizeScheduledClass =
    (classData) => {

      return {

        ...classData,

        id:
          classData.id ||
          classData._id,

        className:
          classData.className ||
          classData.name ||
          classData.subject ||
          "Untitled Class",

        subject:
          classData.subject ||
          "Not specified",

        studentClass:
          classData.studentClass ||
          classData.class ||
          "",

        date:
          classData.date ||
          classData.scheduledDate ||
          "",

        time:
          classData.time ||
          classData.scheduledTime ||
          "",

        platform:
          classData.platform ||
          "Jitsi Meet",

        description:
          classData.description ||
          "",

        manualLink:
          classData.manualLink ||
          "",

        roomName:
          classData.roomName ||
          "",

        jitsiUrl:
          classData.jitsiUrl ||
          "",

      };

    };


  // =====================================================
  // FETCH TEACHER SUBJECTS
  // =====================================================

  useEffect(() => {

    const fetchTeacherSubjects =
      async () => {

        if (!teacher?._id) {
          return;
        }

        try {

          setLoading(true);

          const response =
            await fetch(
              `${API_BASE_URL}/api/teacher/subjects/${teacher._id}`
            );

          const data =
            await response.json();
          console.log("Teacher Subjects API Response:", data);


          if (data.success) {

            const subjects =
              (data.subjects || []).map(
                (subject) => ({

                  ...subject,

                  classes:
                    Array.isArray(subject.classes)
                      ? subject.classes
                      : [],

                  image:
                    imageMap[subject.name] ||
                    imageMap["Science"],

                  icon:
                    getSubjectIcon(
                      subject.name
                    ),

                })
              );


            setTeacherSubjects(
              subjects
            );

          } else {

            setError(
              data.message ||
              "Unable to load subjects."
            );

          }

        } catch (error) {

          console.error(
            "Error fetching teacher subjects:",
            error
          );

          setError(
            "Server connection failed."
          );

        } finally {

          setLoading(false);

        }

      };


    fetchTeacherSubjects();

  }, [teacher]);


  // =====================================================
  // FETCH SCHEDULED CLASSES
  // =====================================================

  const fetchScheduledClasses =
    async () => {

      if (!teacher?._id) {
        return;
      }

      try {

        const response =
          await fetch(
            `${API_BASE_URL}/api/live-classes/scheduled?teacherId=${teacher._id}`
          );

        const data =
          await response.json();


        if (data.success) {

          const normalizedClasses =
            (data.scheduledClasses || []).map(
              normalizeScheduledClass
            );


          setCreatedClasses(
            normalizedClasses
          );

        }

      } catch (error) {

        console.error(
          "Failed to fetch scheduled classes:",
          error
        );

      }

    };


  useEffect(() => {

    fetchScheduledClasses();

  }, [teacher]);


  // =====================================================
  // CHECK IF SUBJECT CLASS IS LIVE
  // =====================================================

  const isSubjectLive =
    (subjectName, className) => {

      return liveClasses.some(
        (liveClass) => {

          return (
            liveClass.subject ===
              subjectName &&
            liveClass.class ===
              className &&
            liveClass.teacherId ===
              teacher?._id &&
            liveClass.isLive
          );

        }
      );

    };


  // =====================================================
  // START LIVE CLASS
  // =====================================================

  const handleStartClass =
    async (
      subject,
      className
    ) => {

      const startId =
        `${subject.name}-${className}`;

      setStartingClass(
        startId
      );


      try {

        const roomName =
          generateRoomName(
            subject.name,
            className,
            teacher._id
          );


        await startLiveClass({

          subject:
            subject.name,

          teacher:
            teacher.firstName ||
            teacher.name ||
            "Teacher",

          teacherId:
            teacher._id,

          class:
            className,

          roomName,

          jitsiUrl:
            `https://meet.jit.si/${roomName}`,

        });


        openJitsiInNewTab(
          roomName,

          `${
            teacher.firstName ||
            teacher.name ||
            "Teacher"
          } (Teacher)`,

          subject.name,

          className
        );

      } catch (error) {

        console.error(
          "Failed to start class:",
          error
        );

        alert(
          "Failed to start live class."
        );

      } finally {

        setStartingClass(
          null
        );

      }

    };


  // =====================================================
  // END LIVE CLASS
  // =====================================================

  const handleEndClass =
    (
      subject,
      className
    ) => {

      const liveClass =
        liveClasses.find(
          (item) => {

            return (
              item.subject ===
                subject.name &&
              item.class ===
                className &&
              item.teacherId ===
                teacher?._id
            );

          }
        );


      if (!liveClass) {

        alert(
          "Live class not found."
        );

        return;

      }


      endLiveClass(
        liveClass.id ||
        liveClass._id
      );


      if (
        liveClass.roomName
      ) {

        localStorage.removeItem(
          `meeting_${liveClass.roomName}`
        );

      }


      alert(
        `Class ended for ${subject.name} - ${className}`
      );

    };


  // =====================================================
  // FORM CHANGE
  // =====================================================

  const handleFormChange =
    (event) => {

      const {
        name,
        value,
      } = event.target;


      setForm(
        (previous) => ({

          ...previous,

          [name]:
            value,

        })
      );

    };


  // =====================================================
  // GET CLASS LINK
  // =====================================================

  const getClassLink =
    (classData) => {

      if (!classData) {
        return null;
      }


      if (
        classData.platform ===
        "Jitsi Meet"
      ) {

        if (
          classData.jitsiUrl
        ) {

          return classData.jitsiUrl;

        }


        if (
          classData.roomName
        ) {

          return (
            `https://meet.jit.si/${classData.roomName}`
          );

        }


        return null;

      }


      return (
        classData.manualLink ||
        null
      );

    };


  // =====================================================
  // COPY JOIN LINK
  // =====================================================

  const handleCopyLink =
    async (
      classData
    ) => {

      const link =
        getClassLink(
          classData
        );


      if (!link) {

        alert(
          "No meeting link available."
        );

        return;

      }


      try {

        await navigator.clipboard.writeText(
          link
        );


        setCopiedId(
          classData.id
        );


        setTimeout(
          () => {

            setCopiedId(
              null
            );

          },
          2000
        );

      } catch (error) {

        console.error(
          "Copy failed:",
          error
        );

      }

    };


  // =====================================================
  // COPY FULL DETAILS
  // =====================================================

  const handleCopyDetails =
    async (
      classData
    ) => {

      const link =
        getClassLink(
          classData
        );


      const text =
        `📚 Class: ${
          classData.className || "Not specified"
        }\n` +

        `📖 Subject: ${
          classData.subject || "Not specified"
        }\n` +

        `🎓 Student Class: ${
          classData.studentClass ||
          classData.class ||
          "Not specified"
        }\n` +

        `📅 Date: ${
          classData.date ||
          classData.scheduledDate ||
          "Not specified"
        }\n` +

        `⏰ Time: ${
          classData.time ||
          classData.scheduledTime ||
          "Not specified"
        }\n` +

        `💻 Platform: ${
          classData.platform ||
          "Not specified"
        }\n` +

        (
          link
            ? `🔗 Join Link: ${link}\n`
            : ""
        ) +

        (
          classData.description
            ? `📝 Notes: ${classData.description}`
            : ""
        );


      try {

        await navigator.clipboard.writeText(
          text
        );


        setCopiedId(
          `details-${classData.id}`
        );


        setTimeout(
          () => {

            setCopiedId(
              null
            );

          },
          2000
        );

      } catch (error) {

        console.error(
          "Failed to copy details:",
          error
        );

      }

    };


  // =====================================================
  // SAVE MANUAL LINK
  // =====================================================

  const handleSaveManualLink =
    async (
      classData,
      link
    ) => {

      try {

        const response =
          await fetch(
            `${API_BASE_URL}/api/live-classes/scheduled/${classData.id}/link`,
            {

              method:
                "PATCH",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  manualLink:
                    link,
                }),

            }
          );


        if (
          !response.ok
        ) {

          throw new Error(
            "Failed to save link"
          );

        }


        setCreatedClasses(
          (previous) =>
            previous.map(
              (item) => {

                if (
                  item.id ===
                  classData.id
                ) {

                  return {

                    ...item,

                    manualLink:
                      link,

                  };

                }

                return item;

              }
            )
        );


        setShowShareModal(
          (previous) => {

            if (!previous) {
              return previous;
            }

            return {

              ...previous,

              manualLink:
                link,

            };

          }
        );

      } catch (error) {

        console.error(
          "Failed to save manual link:",
          error
        );

      }

    };


  // =====================================================
  // DELETE SCHEDULED CLASS
  // =====================================================

  const handleDeleteClass =
    async (
      classData
    ) => {

      const confirmed =
        window.confirm(
          `Delete "${classData.className}"?`
        );


      if (!confirmed) {
        return;
      }


      try {

        const response =
          await fetch(
            `${API_BASE_URL}/api/live-classes/scheduled/${classData.id}`,
            {

              method:
                "DELETE",

            }
          );


        if (
          !response.ok
        ) {

          throw new Error(
            "Failed to delete class"
          );

        }


        setCreatedClasses(
          (previous) =>
            previous.filter(
              (item) =>
                item.id !==
                classData.id
            )
        );


        setShowShareModal(
          null
        );

      } catch (error) {

        console.error(
          "Delete error:",
          error
        );

        alert(
          "Failed to delete class."
        );

      }

    };


  // =====================================================
  // CREATE SCHEDULED CLASS
  // =====================================================

  const handleCreateClass =
    async () => {

      if (
        !form.className ||
        !form.subject ||
        !form.studentClass ||
        !form.date ||
        !form.time
      ) {

        alert(
          "Please fill in Class Name, Subject, Student Class, Date and Time."
        );

        return;

      }


      if (!teacher?._id) {

        alert(
          "Teacher ID not found. Please login again."
        );

        return;

      }


      setSavingClass(
        true
      );


      try {

        let roomName =
          null;

        let jitsiUrl =
          null;


        if (
          form.platform ===
          "Jitsi Meet"
        ) {

          roomName =
            generateRoomName(
              form.subject,
              form.studentClass,
              teacher._id
            );


          jitsiUrl =
            `https://meet.jit.si/${roomName}`;

        }


        const payload = {

          className:
            form.className,

          subject:
            form.subject,

          studentClass:
            form.studentClass,

          date:
            form.date,

          time:
            form.time,

          platform:
            form.platform,

          description:
            form.description,

          manualLink:
            form.manualLink,

          teacherId:
            teacher._id,

          teacherName:
            `${
              teacher.firstName || ""
            } ${
              teacher.lastName || ""
            }`.trim() ||
            teacher.name ||
            "Teacher",

          roomName,

          jitsiUrl,

        };


        const response =
          await fetch(
            `${API_BASE_URL}/api/live-classes/schedule`,
            {

              method:
                "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify(
                  payload
                ),

            }
          );


        const data =
          await response.json();


        if (
          !data.success
        ) {

          throw new Error(
            data.message ||
            "Failed to create class"
          );

        }


        const savedClass =
          normalizeScheduledClass(
            data.scheduledClass
          );


        setCreatedClasses(
          (previous) => [

            savedClass,

            ...previous,

          ]
        );


        setForm({

          className:
            "",

          subject:
            "",

          studentClass:
            "",

          date:
            "",

          time:
            "",

          platform:
            "Jitsi Meet",

          description:
            "",

          manualLink:
            "",

        });


        setShowModal(
          false
        );


        setShowShareModal(
          savedClass
        );


      } catch (error) {

        console.error(
          "Create class error:",
          error
        );

        alert(
          error.message ||
          "Failed to create class."
        );

      } finally {

        setSavingClass(
          false
        );

      }

    };


  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {

    return (

      <div style={S.center}>

        <FaSpinner
          style={S.spinner}
        />

        <p>
          Loading subjects...
        </p>

      </div>

    );

  }


  // =====================================================
  // ERROR
  // =====================================================

  if (error) {

    return (

      <div style={S.center}>

        <FaExclamationTriangle
          style={S.errorIcon}
        />

        <h2>
          Unable to Load Subjects
        </h2>

        <p>
          {error}
        </p>

        <button
          style={S.btnCreate}
          onClick={() =>
            window.location.reload()
          }
        >
          Retry
        </button>

      </div>

    );

  }


  // =====================================================
  // RETURN
  // =====================================================

  return (

    <div style={S.wrapper}>


      {/* =================================================
          HEADER
      ================================================= */}

      <div style={S.header}>

        <div>

          <h2 style={S.headerTitle}>
            My Subjects
          </h2>

          <p style={S.headerSub}>
            Manage and start live classes for your assigned subjects
          </p>

        </div>


        <button
          style={S.btnCreate}
          className="ts-btn"
          onClick={() =>
            setShowModal(true)
          }
        >

          <FaPlus
            style={{
              marginRight: 8,
            }}
          />

          Create New Class

        </button>

      </div>



      {/* =================================================
          SCHEDULED CLASSES
      ================================================= */}

      <div style={S.section}>

        <h3 style={S.sectionTitle}>

          <FaCalendarAlt
            style={{
              marginRight: 8,
            }}
          />

          Scheduled Classes

        </h3>


        {createdClasses.length === 0 ? (

          <div style={S.emptyBox}>

            <FaClock
              style={{
                fontSize: 28,
                color: "#94a3b8",
                marginBottom: 10,
              }}
            />

            <p>
              No scheduled classes yet.
            </p>

          </div>

        ) : (

          <div style={S.createdGrid}>

            {createdClasses.map(
              (cls) => {

                const link =
                  getClassLink(
                    cls
                  );


                const copied =
                  copiedId ===
                  cls.id;


                return (

                  <div
                    key={cls.id}
                    style={S.createdCard}
                    className="ts-created"
                  >


                    <div style={S.createdTop}>

                      <span style={S.createdBadge}>

                        {cls.platform}

                      </span>


                      <button
                        style={S.deleteBtn}
                        onClick={() =>
                          handleDeleteClass(
                            cls
                          )
                        }
                        title="Delete class"
                      >

                        <FaTrash />

                      </button>

                    </div>


                    <h4 style={S.createdName}>

                      {cls.className}

                    </h4>


                    <p style={S.createdMeta}>

                      <FaBook
                        style={{
                          marginRight: 6,
                          color: "#0891b2",
                        }}
                      />

                      {cls.subject}

                      {cls.studentClass
                        ? ` · ${cls.studentClass}`
                        : ""}

                    </p>


                    <p style={S.createdMeta}>

                      <FaCalendarAlt
                        style={{
                          marginRight: 6,
                          color: "#0891b2",
                        }}
                      />

                      {cls.date || "No date"}

                      {" at "}

                      {cls.time || "No time"}

                    </p>


                    {cls.description && (

                      <p style={S.createdDesc}>

                        "
                        {cls.description}
                        "

                      </p>

                    )}


                    {link ? (

                      <div style={S.linkRow}>

                        <div style={S.linkBox}>

                          <span style={S.linkText}>

                            {link}

                          </span>

                        </div>


                        <button
                          style={{
                            ...S.copyBtn,

                            ...(copied
                              ? S.copyBtnDone
                              : {}),
                          }}
                          onClick={() =>
                            handleCopyLink(
                              cls
                            )
                          }
                        >

                          {copied
                            ? <FaCheck />
                            : <FaCopy />}

                          <span
                            style={{
                              marginLeft: 5,
                            }}
                          >

                            {copied
                              ? "Copied!"
                              : "Copy"}

                          </span>

                        </button>

                      </div>

                    ) : (

                      <p style={S.noLink}>

                        No meeting link available.

                      </p>

                    )}


                    <button
                      style={S.shareCardBtn}
                      className="ts-btn"
                      onClick={() =>
                        setShowShareModal(
                          normalizeScheduledClass(
                            cls
                          )
                        )
                      }
                    >

                      <FaShareAlt
                        style={{
                          marginRight: 7,
                        }}
                      />

                      Share Class Details

                    </button>

                  </div>

                );

              }
            )}

          </div>

        )}

      </div>



      {/* =================================================
          ASSIGNED SUBJECTS
      ================================================= */}

      <div style={S.section}>

        <h3 style={S.sectionTitle}>

          Assigned Subjects

        </h3>


        {teacherSubjects.length === 0 ? (

          <div style={S.emptyBox}>

            No subjects assigned yet.

          </div>

        ) : (

          <div style={S.grid}>

            {teacherSubjects.map(
              (
                subject,
                index
              ) => (

                <div
                  key={
                    subject._id ||
                    index
                  }
                  style={S.card}
                  className="ts-card"
                >

                  <div style={S.cardImgWrap}>

                    <img
                      src={subject.image}
                      alt={subject.name}
                      style={S.cardImg}
                    />

                    <div style={S.cardOverlay}>

                      <span style={S.cardIcon}>

                        {subject.icon}

                      </span>

                    </div>

                  </div>


                  <div style={S.cardBody}>

                    <h3 style={S.cardTitle}>

                      {subject.name}

                    </h3>


                    <p style={S.cardClasses}>

                      Classes:{" "}

                      {subject.classes?.length
                        ? subject.classes.join(", ")
                        : "No classes assigned"}

                    </p>


                    <div style={S.classRows}>

                      {(subject.classes || []).map(
                        (
                          className
                        ) => {

                          const isLive =
                            isSubjectLive(
                              subject.name,
                              className
                            );


                          const isStarting =
                            startingClass ===
                            `${subject.name}-${className}`;


                          return (

                            <div
                              key={className}
                              style={S.classRow}
                              className="ts-row"
                            >

                              <span
                                style={S.classLabel}
                              >

                                {className}

                              </span>


                              {isLive ? (

                                <button
                                  style={S.btnEnd}
                                  className="ts-btn"
                                  onClick={() =>
                                    handleEndClass(
                                      subject,
                                      className
                                    )
                                  }
                                >

                                  <FaStop
                                    style={{
                                      marginRight: 5,
                                    }}
                                  />

                                  End

                                </button>

                              ) : (

                                <button
                                  style={S.btnStart}
                                  className="ts-btn"
                                  onClick={() =>
                                    handleStartClass(
                                      subject,
                                      className
                                    )
                                  }
                                  disabled={
                                    isStarting
                                  }
                                >

                                  {isStarting
                                    ? (
                                      <>
                                        <FaSpinner
                                          style={{
                                            marginRight: 5,
                                          }}
                                        />

                                        Starting...
                                      </>
                                    )
                                    : (
                                      <>
                                        <FaVideo
                                          style={{
                                            marginRight: 5,
                                          }}
                                        />

                                        Start Live
                                      </>
                                    )}

                                </button>

                              )}

                            </div>

                          );

                        }
                      )}

                    </div>

                  </div>

                </div>

              )
            )}

          </div>

        )}

      </div>



      {/* =================================================
          CREATE CLASS MODAL
      ================================================= */}

      {showModal && (

        <div
          style={S.overlay}
          onClick={() =>
            setShowModal(false)
          }
        >

          <div
            style={S.modal}
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div style={S.modalHeader}>

              <h3 style={S.modalTitle}>

                <FaChalkboardTeacher
                  style={{
                    marginRight: 10,
                  }}
                />

                Create New Class

              </h3>


              <button
                style={S.closeBtn}
                onClick={() =>
                  setShowModal(false)
                }
              >

                <FaTimes />

              </button>

            </div>


            <div style={S.modalBody}>

              <div style={S.formGrid}>


                {/* CLASS NAME */}

                <div style={S.formGroup}>

                  <label style={S.label}>

                    Class Name *

                  </label>

                  <input
                    style={S.input}
                    name="className"
                    value={form.className}
                    onChange={
                      handleFormChange
                    }
                    placeholder="e.g. English Revision Class"
                  />

                </div>


                {/* SUBJECT */}

                <div style={S.formGroup}>

                  <label style={S.label}>

                    <FaBook
                      style={{
                        marginRight: 6,
                      }}
                    />

                    Subject *

                  </label>

                  <select
                    style={S.input}
                    name="subject"
                    value={form.subject}
                    onChange={
                      handleFormChange
                    }
                  >

                    <option value="">

                      Select Subject

                    </option>


                    {teacherSubjects.map(
                      (subject) => (

                        <option
                          key={
                            subject._id ||
                            subject.name
                          }
                          value={
                            subject.name
                          }
                        >

                          {subject.name}

                        </option>

                      )
                    )}

                  </select>

                </div>


                {/* STUDENT CLASS */}

                <div style={S.formGroup}>

                  <label style={S.label}>

                    <FaChalkboardTeacher
                      style={{
                        marginRight: 6,
                      }}
                    />

                    Student Class *

                  </label>

                  <select
                    style={S.input}
                    name="studentClass"
                    value={
                      form.studentClass
                    }
                    onChange={
                      handleFormChange
                    }
                  >

                    <option value="">

                      Select Class

                    </option>


                    {[
                      ...new Set(
                        teacherSubjects.flatMap(
                          (subject) =>
                            subject.classes ||
                            []
                        )
                      ),
                    ].map(
                      (className) => (

                        <option
                          key={className}
                          value={className}
                        >

                          {className}

                        </option>

                      )
                    )}

                  </select>

                </div>


                {/* PLATFORM */}

                <div style={S.formGroup}>

                  <label style={S.label}>

                    <FaDesktop
                      style={{
                        marginRight: 6,
                      }}
                    />

                    Platform

                  </label>

                  <select
                    style={S.input}
                    name="platform"
                    value={
                      form.platform
                    }
                    onChange={
                      handleFormChange
                    }
                  >

                    {PLATFORMS.map(
                      (platform) => (

                        <option
                          key={platform}
                          value={platform}
                        >

                          {platform}

                        </option>

                      )
                    )}

                  </select>

                </div>


                {/* DATE */}

                <div style={S.formGroup}>

                  <label style={S.label}>

                    <FaCalendarAlt
                      style={{
                        marginRight: 6,
                      }}
                    />

                    Date *

                  </label>

                  <input
                    type="date"
                    style={S.input}
                    name="date"
                    value={form.date}
                    onChange={
                      handleFormChange
                    }
                  />

                </div>


                {/* TIME */}

                <div style={S.formGroup}>

                  <label style={S.label}>

                    <FaClock
                      style={{
                        marginRight: 6,
                      }}
                    />

                    Time *

                  </label>

                  <input
                    type="time"
                    style={S.input}
                    name="time"
                    value={form.time}
                    onChange={
                      handleFormChange
                    }
                  />

                </div>

              </div>


              {/* DESCRIPTION */}

              <div
                style={{
                  ...S.formGroup,
                  marginTop: 16,
                }}
              >

                <label style={S.label}>

                  <FaStickyNote
                    style={{
                      marginRight: 6,
                    }}
                  />

                  Description

                </label>

                <textarea
                  style={{
                    ...S.input,
                    minHeight: 80,
                    resize: "vertical",
                  }}
                  name="description"
                  value={
                    form.description
                  }
                  onChange={
                    handleFormChange
                  }
                  placeholder="Add class details..."
                />

              </div>


              {/* MANUAL LINK */}

              {form.platform !==
                "Jitsi Meet" && (

                <div
                  style={{
                    ...S.formGroup,
                    marginTop: 16,
                  }}
                >

                  <label style={S.label}>

                    Meeting Link

                  </label>

                  <input
                    style={S.input}
                    name="manualLink"
                    value={
                      form.manualLink
                    }
                    onChange={
                      handleFormChange
                    }
                    placeholder={`Paste ${form.platform} meeting link`}
                  />

                </div>

              )}


              {/* JITSI INFO */}

              {form.platform ===
                "Jitsi Meet" && (

                <div style={S.infoBox}>

                  <FaVideo
                    style={{
                      marginRight: 8,
                    }}
                  />

                  A Jitsi Meet link will be automatically generated.

                </div>

              )}

            </div>


            <div style={S.modalFooter}>

              <button
                style={S.btnCancel}
                className="ts-btn"
                onClick={() =>
                  setShowModal(false)
                }
              >

                Cancel

              </button>


              <button
                style={S.btnCreate}
                className="ts-btn"
                onClick={
                  handleCreateClass
                }
                disabled={
                  savingClass
                }
              >

                {savingClass
                  ? (
                    <>
                      <FaSpinner
                        style={{
                          marginRight: 8,
                        }}
                      />

                      Saving...
                    </>
                  )
                  : (
                    <>
                      <FaCalendarAlt
                        style={{
                          marginRight: 8,
                        }}
                      />

                      Schedule Class
                    </>
                  )}

              </button>

            </div>

          </div>

        </div>

      )}



      {/* =================================================
          SHARE CLASS MODAL
      ================================================= */}

      {showShareModal && (

        <div
          style={S.overlay}
          onClick={() =>
            setShowShareModal(null)
          }
        >

          <div
            style={{
              ...S.modal,
              maxWidth: 460,
            }}
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div style={S.modalHeader}>

              <h3 style={S.modalTitle}>

                <FaShareAlt
                  style={{
                    marginRight: 10,
                  }}
                />

                Share Class

              </h3>


              <button
                style={S.closeBtn}
                onClick={() =>
                  setShowShareModal(null)
                }
              >

                <FaTimes />

              </button>

            </div>


            <div style={S.modalBody}>


              {/* CLASS DETAILS */}

              <div style={S.shareInfoBox}>


                <div style={S.shareRow}>

                  <span style={S.shareLabel}>

                    Class

                  </span>

                  <span style={S.shareValue}>

                    {showShareModal.className ||
                      showShareModal.subject ||
                      "—"}

                  </span>

                </div>


                <div style={S.shareRow}>

                  <span style={S.shareLabel}>

                    Subject

                  </span>

                  <span style={S.shareValue}>

                    {showShareModal.subject ||
                      "—"}

                  </span>

                </div>


                {/* IMPORTANT FIX */}

                <div style={S.shareRow}>

                  <span style={S.shareLabel}>

                    Student Class

                  </span>

                  <span style={S.shareValue}>

                    {showShareModal.studentClass ||
                      showShareModal.class ||
                      "—"}

                  </span>

                </div>


                {/* IMPORTANT FIX */}

                <div style={S.shareRow}>

                  <span style={S.shareLabel}>

                    Date & Time

                  </span>

                  <span style={S.shareValue}>

                    {
                      showShareModal.date ||
                      showShareModal.scheduledDate ||
                      "—"
                    }

                    {" at "}

                    {
                      showShareModal.time ||
                      showShareModal.scheduledTime ||
                      "—"
                    }

                  </span>

                </div>


                <div style={S.shareRow}>

                  <span style={S.shareLabel}>

                    Platform

                  </span>

                  <span style={S.shareValue}>

                    {showShareModal.platform ||
                      "Jitsi Meet"}

                  </span>

                </div>

              </div>



              {/* JITSI LINK */}

              {showShareModal.platform ===
                "Jitsi Meet" ? (

                <>

                  <p style={S.shareHeading}>

                    Send this link to your students:

                  </p>


                  <div style={S.shareLinkBox}>

                    <span style={S.shareLinkText}>

                      {getClassLink(
                        showShareModal
                      ) ||
                        "Meeting link not available"}

                    </span>

                  </div>

                </>

              ) : (

                <>

                  <p style={S.shareHeading}>

                    Paste your{" "}

                    {
                      showShareModal.platform
                    }

                    {" "}meeting link:

                  </p>


                  <input
                    style={{
                      ...S.input,
                      width: "100%",
                    }}
                    placeholder="Paste meeting link here"
                    value={
                      showShareModal.manualLink ||
                      ""
                    }
                    onChange={(event) => {

                      const value =
                        event.target.value;


                      setShowShareModal(
                        (previous) => ({

                          ...previous,

                          manualLink:
                            value,

                        })
                      );


                      clearTimeout(
                        window._linkSaveTimer
                      );


                      window._linkSaveTimer =
                        setTimeout(
                          () => {

                            handleSaveManualLink(
                              showShareModal,
                              value
                            );

                          },
                          800
                        );

                    }}
                  />

                </>

              )}



              {/* COPY JOIN LINK */}

              <button
                style={{
                  ...S.btnCreate,

                  width: "100%",

                  justifyContent:
                    "center",

                  marginTop: 14,

                  ...(
                    copiedId ===
                    showShareModal.id
                      ? {
                          background:
                            "linear-gradient(135deg,#16a34a,#15803d)",
                        }
                      : {}
                  ),

                  ...(
                    !getClassLink(
                      showShareModal
                    )
                      ? {
                          opacity: 0.5,
                          cursor: "not-allowed",
                        }
                      : {}
                  ),

                }}
                className="ts-btn"
                onClick={() =>
                  handleCopyLink(
                    showShareModal
                  )
                }
                disabled={
                  !getClassLink(
                    showShareModal
                  )
                }
              >

                {copiedId ===
                  showShareModal.id
                  ? (
                    <>
                      <FaCheck
                        style={{
                          marginRight: 8,
                        }}
                      />

                      Link Copied!

                    </>
                  )
                  : (
                    <>
                      <FaCopy
                        style={{
                          marginRight: 8,
                        }}
                      />

                      Copy Join Link

                    </>
                  )}

              </button>



              {/* COPY ALL DETAILS */}

              <button
                style={{
                  ...S.btnCancel,

                  width: "100%",

                  justifyContent:
                    "center",

                  marginTop: 10,

                  display:
                    "flex",

                  alignItems:
                    "center",

                  ...(
                    copiedId ===
                    `details-${showShareModal.id}`
                      ? {
                          background:
                            "#dcfce7",

                          color:
                            "#16a34a",
                        }
                      : {}
                  ),

                }}
                className="ts-btn"
                onClick={() =>
                  handleCopyDetails(
                    showShareModal
                  )
                }
              >

                {copiedId ===
                  `details-${showShareModal.id}`
                  ? (
                    <>
                      <FaCheck
                        style={{
                          marginRight: 8,
                        }}
                      />

                      Details Copied!

                    </>
                  )
                  : (
                    <>
                      <FaCopy
                        style={{
                          marginRight: 8,
                        }}
                      />

                      Copy All Details
                      {" "}
                      (WhatsApp/Email)

                    </>
                  )}

              </button>


              <p style={S.shareHint}>

                Copy the details and paste them into
                WhatsApp, email, or your class group.

              </p>

            </div>

          </div>

        </div>

      )}

    </div>

  );

};



// =====================================================
// STYLES
// =====================================================

const S = {

  wrapper: {
    fontFamily:
      "'Nunito', sans-serif",

    padding:
      "28px 32px",

    minHeight:
      "100vh",

    background:
      "#f8fafc",

  },


  center: {
    display:
      "flex",

    flexDirection:
      "column",

    alignItems:
      "center",

    justifyContent:
      "center",

    minHeight:
      "60vh",

    fontFamily:
      "'Nunito', sans-serif",

  },


  spinner: {
    fontSize:
      32,

    color:
      "#7c3aed",

    marginBottom:
      12,

  },


  errorIcon: {
    fontSize:
      40,

    color:
      "#f59e0b",

    marginBottom:
      12,

  },


  header: {
    display:
      "flex",

    alignItems:
      "center",

    justifyContent:
      "space-between",

    marginBottom:
      32,

    flexWrap:
      "wrap",

    gap:
      16,

  },


  headerTitle: {
    margin:
      0,

    fontSize:
      26,

    fontWeight:
      800,

    color:
      "#0f172a",

  },


  headerSub: {
    margin:
      "5px 0 0",

    color:
      "#64748b",

    fontSize:
      14,

  },


  section: {
    marginBottom:
      36,

  },


  sectionTitle: {
    fontSize:
      18,

    fontWeight:
      800,

    color:
      "#1e293b",

    marginBottom:
      16,

    paddingBottom:
      12,

    borderBottom:
      "1px solid #e2e8f0",

    display:
      "flex",

    alignItems:
      "center",

  },


  grid: {
    display:
      "grid",

    gridTemplateColumns:
      "repeat(auto-fill, minmax(280px, 1fr))",

    gap:
      22,

  },


  createdGrid: {
    display:
      "grid",

    gridTemplateColumns:
      "repeat(auto-fill, minmax(280px, 1fr))",

    gap:
      20,

  },


  card: {
    background:
      "#ffffff",

    border:
      "1px solid #e2e8f0",

    borderRadius:
      18,

    overflow:
      "hidden",

    boxShadow:
      "0 8px 22px rgba(15,23,42,0.06)",

  },


  cardImgWrap: {
    height:
      150,

    position:
      "relative",

    overflow:
      "hidden",

  },


  cardImg: {
    width:
      "100%",

    height:
      "100%",

    objectFit:
      "cover",

  },


  cardOverlay: {
    position:
      "absolute",

    inset:
      0,

    background:
      "linear-gradient(135deg,rgba(15,23,42,0.1),rgba(124,58,237,0.35))",

    display:
      "flex",

    alignItems:
      "center",

    justifyContent:
      "center",

  },


  cardIcon: {
    width:
      50,

    height:
      50,

    borderRadius:
      "50%",

    background:
      "rgba(255,255,255,0.92)",

    display:
      "flex",

    alignItems:
      "center",

    justifyContent:
      "center",

    color:
      "#7c3aed",

    fontSize:
      22,

  },


  cardBody: {
    padding:
      18,

  },


  cardTitle: {
    margin:
      "0 0 8px",

    fontSize:
      19,

    fontWeight:
      800,

    color:
      "#0f172a",

  },


  cardClasses: {
    margin:
      "0 0 16px",

    fontSize:
      13,

    color:
      "#64748b",

  },


  classRows: {
    display:
      "flex",

    flexDirection:
      "column",

    gap:
      8,

  },


  classRow: {
    display:
      "flex",

    alignItems:
      "center",

    justifyContent:
      "space-between",

    gap:
      10,

    padding:
      "10px 12px",

    borderRadius:
      10,

    background:
      "#f8fafc",

    border:
      "1px solid #e2e8f0",

  },


  classLabel: {
    fontSize:
      14,

    fontWeight:
      700,

    color:
      "#334155",

  },


  btnStart: {
    border:
      "none",

    background:
      "linear-gradient(135deg,#0891b2,#0e7490)",

    color:
      "#fff",

    padding:
      "8px 12px",

    borderRadius:
      8,

    cursor:
      "pointer",

    fontWeight:
      700,

    fontSize:
      12,

  },


  btnEnd: {
    border:
      "none",

    background:
      "linear-gradient(135deg,#ef4444,#dc2626)",

    color:
      "#fff",

    padding:
      "8px 12px",

    borderRadius:
      8,

    cursor:
      "pointer",

    fontWeight:
      700,

    fontSize:
      12,

  },


  btnCreate: {
    border:
      "none",

    background:
      "linear-gradient(135deg,#0891b2,#0e7490)",

    color:
      "#fff",

    padding:
      "12px 20px",

    borderRadius:
      10,

    cursor:
      "pointer",

    fontWeight:
      800,

    fontSize:
      14,

    display:
      "inline-flex",

    alignItems:
      "center",

  },


  btnCancel: {
    border:
      "1px solid #cbd5e1",

    background:
      "#fff",

    color:
      "#475569",

    padding:
      "11px 18px",

    borderRadius:
      10,

    cursor:
      "pointer",

    fontWeight:
      700,

  },


  emptyBox: {
    padding:
      32,

    background:
      "#fff",

    border:
      "1px dashed #cbd5e1",

    borderRadius:
      14,

    textAlign:
      "center",

    color:
      "#64748b",

  },


  createdCard: {
    background:
      "#fff",

    border:
      "1px solid #e2e8f0",

    borderRadius:
      16,

    padding:
      18,

    boxShadow:
      "0 8px 20px rgba(15,23,42,0.06)",

  },


  createdTop: {
    display:
      "flex",

    alignItems:
      "center",

    justifyContent:
      "space-between",

    marginBottom:
      10,

  },


  createdBadge: {
    padding:
      "6px 11px",

    borderRadius:
      20,

    background:
      "#e0f2fe",

    color:
      "#0369a1",

    fontSize:
      12,

    fontWeight:
      800,

  },


  deleteBtn: {
    border:
      "none",

    background:
      "transparent",

    color:
      "#ef4444",

    cursor:
      "pointer",

    fontSize:
      16,

  },


  createdName: {
    margin:
      "0 0 10px",

    color:
      "#0f172a",

    fontSize:
      17,

    fontWeight:
      800,

  },


  createdMeta: {
    margin:
      "7px 0",

    color:
      "#475569",

    fontSize:
      13,

    display:
      "flex",

    alignItems:
      "center",

  },


  createdDesc: {
    margin:
      "10px 0",

    color:
      "#64748b",

    fontSize:
      12,

    fontStyle:
      "italic",

  },


  linkRow: {
    display:
      "flex",

    gap:
      8,

    alignItems:
      "stretch",

    marginTop:
      12,

  },


  linkBox: {
    flex:
      1,

    background:
      "#f0f9ff",

    border:
      "1px solid #bae6fd",

    borderRadius:
      9,

    padding:
      "9px 10px",

    overflow:
      "hidden",

  },


  linkText: {
    fontSize:
      11,

    color:
      "#0369a1",

    fontWeight:
      700,

    wordBreak:
      "break-all",

  },


  copyBtn: {
    border:
      "1px solid #0891b2",

    background:
      "#fff",

    color:
      "#0891b2",

    borderRadius:
      8,

    padding:
      "8px 10px",

    cursor:
      "pointer",

    fontWeight:
      700,

    fontSize:
      12,

    display:
      "flex",

    alignItems:
      "center",

  },


  copyBtnDone: {
    border:
      "1px solid #16a34a",

    background:
      "#dcfce7",

    color:
      "#16a34a",

  },


  noLink: {
    color:
      "#f59e0b",

    fontSize:
      12,

    fontWeight:
      700,

  },


  shareCardBtn: {
    width:
      "100%",

    marginTop:
      14,

    padding:
      "10px",

    border:
      "1px solid #cbd5e1",

    background:
      "#f8fafc",

    color:
      "#334155",

    borderRadius:
      9,

    cursor:
      "pointer",

    fontWeight:
      700,

  },


  overlay: {
    position:
      "fixed",

    inset:
      0,

    background:
      "rgba(15,23,42,0.55)",

    zIndex:
      9999,

    display:
      "flex",

    justifyContent:
      "center",

    alignItems:
      "flex-start",

    padding:
      "90px 20px 30px",

    overflowY:
      "auto",

  },


  modal: {
    background:
      "#fff",

    borderRadius:
      20,

    width:
      "100%",

    maxWidth:
      620,

    boxShadow:
      "0 24px 60px rgba(0,0,0,0.22)",

    maxHeight:
      "calc(100vh - 120px)",

    overflowY:
      "auto",

    flexShrink: 0,

  },


  modalHeader: {
    display:
      "flex",

    alignItems:
      "center",

    justifyContent:
      "space-between",

    padding:
      "20px 24px",

    borderBottom:
      "1px solid #e2e8f0",

    position:
      "sticky",

    top:
      0,

    background:
      "#fff",

    zIndex:
      2,

  },


  modalTitle: {
    margin:
      0,

    fontSize:
      18,

    fontWeight:
      800,

    color:
      "#0f172a",

    display:
      "flex",

    alignItems:
      "center",

  },


  closeBtn: {
    border:
      "none",

    background:
      "transparent",

    color:
      "#94a3b8",

    fontSize:
      20,

    cursor:
      "pointer",

  },


  modalBody: {
    padding:
      "22px 24px",

  },


  modalFooter: {
    padding:
      "16px 24px",

    borderTop:
      "1px solid #e2e8f0",

    display:
      "flex",

    justifyContent:
      "flex-end",

    gap:
      10,

  },


  formGrid: {
    display:
      "grid",

    gridTemplateColumns:
      "1fr 1fr",

    gap:
      16,

  },


  formGroup: {
    display:
      "flex",

    flexDirection:
      "column",

    gap:
      7,

  },


  label: {
    fontSize:
      13,

    fontWeight:
      800,

    color:
      "#334155",

    display:
      "flex",

    alignItems:
      "center",

  },


  input: {
    width:
      "100%",

    boxSizing:
      "border-box",

    border:
      "1.5px solid #e2e8f0",

    borderRadius:
      9,

    padding:
      "11px 12px",

    fontSize:
      14,

    color:
      "#1e293b",

    background:
      "#fafafa",

    outline:
      "none",

  },


  infoBox: {
    marginTop:
      16,

    background:
      "#e0f2fe",

    border:
      "1px solid #bae6fd",

    borderRadius:
      10,

    padding:
      "12px 14px",

    fontSize:
      13,

    color:
      "#0369a1",

    fontWeight:
      700,

    display:
      "flex",

    alignItems:
      "center",

  },


  shareInfoBox: {
    background:
      "#f8fafc",

    border:
      "1px solid #e2e8f0",

    borderRadius:
      12,

    padding:
      "14px 16px",

    display:
      "flex",

    flexDirection:
      "column",

    gap:
      12,

  },


  shareRow: {
    display:
      "flex",

    justifyContent:
      "space-between",

    alignItems:
      "center",

    gap:
      16,

  },


  shareLabel: {
    fontSize:
      12,

    fontWeight:
      800,

    color:
      "#64748b",

    textTransform:
      "uppercase",

  },


  shareValue: {
    fontSize:
      14,

    fontWeight:
      800,

    color:
      "#0f172a",

    textAlign:
      "right",

  },


  shareHeading: {
    fontSize:
      13,

    fontWeight:
      800,

    color:
      "#374151",

    margin:
      "18px 0 8px",

  },


  shareLinkBox: {
    background:
      "#f0f9ff",

    border:
      "1.5px solid #bae6fd",

    borderRadius:
      10,

    padding:
      "14px",

  },


  shareLinkText: {
    fontSize:
      13,

    color:
      "#0369a1",

    fontWeight:
      700,

    wordBreak:
      "break-all",

  },


  shareHint: {
    fontSize:
      12,

    color:
      "#94a3b8",

    textAlign:
      "center",

    marginTop:
      12,

  },

};


export default TeacherSubjects;