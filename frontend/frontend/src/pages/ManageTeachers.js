import React, { useEffect, useState } from "react";
import axios from "axios";
import API_BASE_URL from "../config/api";
import "../styles/manageTeachers.css";

const ManageTeachers = () => {

  // =====================================================
  // TEACHERS
  // =====================================================

  const [teachers, setTeachers] = useState([]);
  const [filteredTeachers, setFilteredTeachers] = useState([]);

  // =====================================================
  // STATS
  // =====================================================

  const [stats, setStats] = useState({
    total: 0,
    approved: 0,
    pending: 0,
    rejected: 0,
    assigned: 0,
  });

  // =====================================================
  // SEARCH + FILTER
  // =====================================================

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  // =====================================================
  // EDIT CLASSES
  // =====================================================

  const [editingClassesFor, setEditingClassesFor] = useState(null);
  const [editClasses, setEditClasses] = useState([]);

  const TEACHABLE_CLASSES = [
    "Class 5",
    "Class 6",
    "Class 7",
    "Class 8",
    "Class 9",
    "Class 10",
    "Class 11",
    "Class 12",
  ];

  // =====================================================
  // SUBJECT LIST
  // =====================================================

  const SUBJECT_LIST = [
    "Tamil",
    "English",
    "Maths",
    "Science",
    "Social",
    "Botany",
    "Zoology",
    "Physics",
    "Chemistry",
    "Accounts",
    "Economics",
  ];

  // =====================================================
  // EDIT SUBJECT
  // =====================================================

  const [editingSubjectFor, setEditingSubjectFor] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState("");

  // =====================================================
  // FETCH TEACHERS
  // =====================================================

  const fetchTeachers = async () => {
    try {

      const res = await axios.get(
        `${API_BASE_URL}/api/admin/teachers`,
        {
          params: {
            search,
            filter,
          },
        }
      );

      console.log(
        "Teachers API Response:",
        res.data
      );

      const teacherArray =
        res.data.teachers || [];

      setTeachers(teacherArray);
      setFilteredTeachers(teacherArray);

      if (res.data.stats) {
        setStats(res.data.stats);
      }

    } catch (error) {

      console.error(
        "Error fetching teachers:",
        error
      );

      setTeachers([]);
      setFilteredTeachers([]);

      setStats({
        total: 0,
        approved: 0,
        pending: 0,
        rejected: 0,
        assigned: 0,
      });
    }
  };

  // =====================================================
  // LOAD TEACHERS
  // =====================================================

  useEffect(() => {
    fetchTeachers();
  }, [search, filter]);

  // =====================================================
  // UPDATE TEACHER STATUS
  // =====================================================

  const updateStatus = async (id, status) => {

    try {

      let reason = "";

      // -------------------------------------------------
      // FULL REJECTION
      // -------------------------------------------------

      if (status === "Rejected") {

        reason = window.prompt(
          "Enter the reason for rejecting this faculty:"
        );

        if (!reason || !reason.trim()) {
          return;
        }
      }

      // -------------------------------------------------
      // SEND STATUS TO BACKEND
      // -------------------------------------------------

      await axios.put(
        `${API_BASE_URL}/api/teacher/admin/teacher/${id}/approve`,
        {
          status,
          reason: reason.trim(),
        }
      );

      // -------------------------------------------------
      // SUCCESS MESSAGE
      // -------------------------------------------------

      if (status === "Rejected") {

        alert(
          "Faculty rejected successfully."
        );

      } else if (
        status === "Reject Document"
      ) {

        alert(
          "Document rejected successfully."
        );

      } else if (
        status === "Approved"
      ) {

        alert(
          "Faculty approved successfully."
        );
      }

      // -------------------------------------------------
      // REFRESH TEACHER LIST
      // -------------------------------------------------

      await fetchTeachers();

    } catch (error) {

      console.error(
        "Status update failed:",
        error
      );

      alert(
        error.response?.data?.message ||
          "Failed to update faculty."
      );
    }
  };

  // =====================================================
  // EDIT CLASSES
  // =====================================================

  const openEditClasses = (teacher) => {

    setEditingClassesFor(teacher);

    setEditClasses(
      Array.isArray(
        teacher.classesAssigned
      )
        ? teacher.classesAssigned
        : []
    );
  };

  // =====================================================
  // TOGGLE CLASS
  // =====================================================

  const toggleEditClass = (cls) => {

    setEditClasses((prev) =>
      prev.includes(cls)
        ? prev.filter(
            (c) => c !== cls
          )
        : [...prev, cls]
    );
  };

  // =====================================================
  // SAVE CLASSES
  // =====================================================

  const saveClasses = async () => {

    if (editClasses.length === 0) {

      alert(
        "Select at least one class"
      );

      return;
    }

    try {

      await axios.put(
        `${API_BASE_URL}/api/admin/teachers/${editingClassesFor._id}/classes`,
        {
          classes: editClasses,
        }
      );

      setEditingClassesFor(null);

      await fetchTeachers();

      alert(
        "Classes updated successfully"
      );

    } catch (error) {

      console.error(
        "Failed to update classes:",
        error
      );

      alert(
        error.response?.data?.message ||
          "Failed to update classes"
      );
    }
  };

  // =====================================================
  // OPEN EDIT SUBJECT
  // =====================================================

  const openEditSubject = (teacher) => {

    setEditingSubjectFor(teacher);

    let currentSubject = "";

    if (
      Array.isArray(teacher.subjects) &&
      teacher.subjects.length > 0
    ) {

      const subject =
        teacher.subjects[0];

      if (
        typeof subject === "object"
      ) {

        currentSubject =
          subject.name || "";

      } else {

        currentSubject =
          subject;
      }
    }

    setSelectedSubject(
      currentSubject
    );
  };

  // =====================================================
  // SAVE SUBJECT
  // =====================================================

  const saveSubject = async () => {

    const subjectName =
      selectedSubject;

    if (!subjectName) {

      alert(
        "Please select a subject"
      );

      return;
    }

    try {

      const response =
        await axios.put(
          `${API_BASE_URL}/api/admin/teachers/${editingSubjectFor._id}/subject`,
          {
            subjectName,
          }
        );

      console.log(
        "Backend response:",
        response.data
      );

      if (response.data.success) {

        alert(
          "Subject updated successfully"
        );

        setEditingSubjectFor(
          null
        );

        setSelectedSubject("");

        await fetchTeachers();

      } else {

        alert(
          response.data.message ||
            "Failed to update teacher subject"
        );
      }

    } catch (error) {

      console.error(
        "SUBJECT UPDATE ERROR:",
        error.response?.data ||
          error.message
      );

      alert(
        error.response?.data?.message ||
          "Failed to update teacher subject"
      );
    }
  };

  // =====================================================
  // GET CURRENT SUBJECT
  // =====================================================

  const getTeacherSubject = (
    teacher
  ) => {

    // Admin-assigned subject
    if (
      Array.isArray(
        teacher.subjects
      ) &&
      teacher.subjects.length > 0
    ) {

      const subject =
        teacher.subjects[0];

      if (
        typeof subject === "object"
      ) {

        return (
          subject.name ||
          "No subject assigned"
        );
      }

      return "Subject assigned";
    }

    // Subject selected during registration
    if (
      teacher.preferredSubject
    ) {

      return teacher.preferredSubject;
    }

    return "No subject assigned";
  };

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="manage-teachers-container">

      {/* =================================================
          PAGE TITLE
      ================================================= */}

      <h2>
        👨‍🏫 Manage Teachers
      </h2>


      {/* =================================================
          STATS
      ================================================= */}

      <div className="stats-container">

        <div className="stat-card">

          <h3>
            {stats.total}
          </h3>

          <p>
            Total Teachers
          </p>

        </div>


        <div className="stat-card">

          <h3>
            {stats.approved}
          </h3>

          <p>
            Approved
          </p>

        </div>


        <div className="stat-card">

          <h3>
            {stats.pending}
          </h3>

          <p>
            Pending
          </p>

        </div>


        <div className="stat-card">

          <h3>
            {stats.rejected}
          </h3>

          <p>
            Rejected
          </p>

        </div>


        <div className="stat-card">

          <h3>
            {stats.assigned}
          </h3>

          <p>
            Assigned
          </p>

        </div>

      </div>


      {/* =================================================
          SEARCH + FILTER
      ================================================= */}

      <div className="top-controls">

        <input
          type="text"
          placeholder="Search by name, email, mobile..."
          value={search}
          onChange={(e) =>
            setSearch(
              e.target.value
            )
          }
        />


        <select
          value={filter}
          onChange={(e) =>
            setFilter(
              e.target.value
            )
          }
        >

          <option value="all">
            All
          </option>

          <option value="approved">
            Approved
          </option>

          <option value="pending">
            Pending
          </option>

          <option value="rejected">
            Rejected
          </option>

        </select>

      </div>


      {/* =================================================
          TEACHERS GRID
      ================================================= */}

      <div className="teachers-grid">

        {Array.isArray(
          filteredTeachers
        ) &&
        filteredTeachers.length > 0 ? (

          filteredTeachers.map(
            (teacher) => (

              <div
                className="teacher-card"
                key={teacher._id}
              >

                {/* =================================================
                    TEACHER NAME
                ================================================= */}

                <h3>
                  {teacher.firstName}{" "}
                  {teacher.lastName}
                </h3>


                {/* =================================================
                    EMAIL
                ================================================= */}

                <p>

                  <strong>
                    Email:
                  </strong>{" "}

                  {teacher.email}

                </p>


                {/* =================================================
                    MOBILE
                ================================================= */}

                <p>

                  <strong>
                    Mobile:
                  </strong>{" "}

                  {teacher.mobile}

                </p>


                {/* =================================================
                    STATUS
                ================================================= */}

                <p>

                  <strong>
                    Status:
                  </strong>{" "}

                  {teacher.isApproved
                    ? "Approved"
                    : teacher.isRejected
                    ? "Rejected"
                    : "Pending"}

                </p>


                {/* =================================================
                    CLASSES
                ================================================= */}

                <p>

                  <strong>
                    Classes:
                  </strong>{" "}

                  {teacher.classesAssigned &&
                  teacher.classesAssigned.length > 0 ? (

                    teacher.classesAssigned.join(
                      ", "
                    )

                  ) : (

                    <span
                      style={{
                        color:
                          "#9ca3af",
                      }}
                    >
                      None set
                    </span>

                  )}

                </p>


                {/* =================================================
                    SUBJECT
                ================================================= */}

                <p>

                  <strong>
                    Subject:
                  </strong>{" "}

                  <span className="teacher-subject-name">

                    {getTeacherSubject(
                      teacher
                    )}

                  </span>

                </p>


                {/* =================================================
                    DEGREE CERTIFICATE
                ================================================= */}

                {teacher.degreeCertificate && (

                  <div className="teacher-certificate">

                    <span className="certificate-file-name">
                      📄 Degree Certificate.pdf
                    </span>


                    {/* VIEW */}

                    <a
                      href={
                        teacher.degreeCertificate
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="certificate-view-icon"
                      title="View Certificate"
                    >
                      👁
                    </a>


                    {/* DOWNLOAD */}

                    <a
                      href={
                        teacher.degreeCertificate
                      }
                      download="Degree-Certificate.pdf"
                      className="certificate-download-icon"
                      title="Download Certificate"
                    >
                      ↓
                    </a>

                  </div>

                )}


                {/* =================================================
                    ACTION BUTTONS
                ================================================= */}

                <div className="teacher-actions">


                  {/* =================================================
                      STATUS ACTIONS
                  ================================================= */}

                  <div className="action-row action-row-status">


                    {/* ---------------------------------------------
                        FULLY REJECTED
                        Show ONLY "Rejected"
                    --------------------------------------------- */}

                    {teacher.isRejected ? (

                      <span className="rejected-label">
                        Rejected
                      </span>


                    ) : teacher.documentReuploadToken ? (


                      /* ---------------------------------------------
                          DOCUMENT REJECTED
                          WAITING FOR RE-UPLOAD
                      --------------------------------------------- */

                      <span className="document-reupload-label">
                        Waiting for reupload document
                      </span>


                    ) : (


                      <>


                        {/* -----------------------------------------
                            APPROVE
                            Only pending teachers
                        ----------------------------------------- */}

                        {!teacher.isApproved && (

                          <button
                            className="btn-approve"
                            onClick={() =>
                              updateStatus(
                                teacher._id,
                                "Approved"
                              )
                            }
                          >
                            Approve
                          </button>

                        )}


                        {/* -----------------------------------------
                            REJECT DOCUMENT
                            Only pending teachers
                        ----------------------------------------- */}

                        {!teacher.isApproved && (

                          <button
                            className="btn-reject-document"
                            onClick={() =>
                              updateStatus(
                                teacher._id,
                                "Reject Document"
                              )
                            }
                          >
                            Reject Document
                          </button>

                        )}


                        {/* -----------------------------------------
                            FULL REJECT
                        ----------------------------------------- */}

                        <button
                          className="btn-reject"
                          onClick={() =>
                            updateStatus(
                              teacher._id,
                              "Rejected"
                            )
                          }
                        >
                          Reject
                        </button>

                      </>

                    )}

                  </div>


                  {/* =================================================
                      EDIT BUTTONS
                  ================================================= */}

                  <div className="action-row action-row-edit">

                    <button
                      className="btn-edit-classes"
                      onClick={() =>
                        openEditClasses(
                          teacher
                        )
                      }
                    >
                      Edit Classes
                    </button>


                    <button
                      className="btn-edit-subject"
                      onClick={() =>
                        openEditSubject(
                          teacher
                        )
                      }
                    >
                      Edit Subject
                    </button>

                  </div>

                </div>

              </div>

            )

          )

        ) : (

          <div className="no-data">
            No teachers found
          </div>

        )}

      </div>


      {/* =================================================
          EDIT CLASSES MODAL
      ================================================= */}

      {editingClassesFor && (

        <div
          className="edit-classes-overlay"
          onClick={() =>
            setEditingClassesFor(
              null
            )
          }
        >

          <div
            className="edit-classes-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <h3>

              Edit Classes —{" "}

              {
                editingClassesFor.firstName
              }{" "}

              {
                editingClassesFor.lastName
              }

            </h3>


            <p className="edit-classes-sub">

              Select all classes this
              teacher can teach:

            </p>


            <div className="edit-classes-grid">

              {TEACHABLE_CLASSES.map(
                (cls) => {

                  const selected =
                    editClasses.includes(
                      cls
                    );

                  return (

                    <button
                      type="button"
                      key={cls}
                      className={`edit-class-pill ${
                        selected
                          ? "selected"
                          : ""
                      }`}
                      onClick={() =>
                        toggleEditClass(
                          cls
                        )
                      }
                    >

                      {selected
                        ? "✓ "
                        : ""}

                      {cls}

                    </button>

                  );

                }
              )}

            </div>


            <div className="edit-classes-actions">

              <button
                className="btn-cancel"
                onClick={() =>
                  setEditingClassesFor(
                    null
                  )
                }
              >
                Cancel
              </button>


              <button
                className="btn-save"
                onClick={saveClasses}
              >
                Save
              </button>

            </div>

          </div>

        </div>

      )}


      {/* =================================================
          EDIT SUBJECT MODAL
      ================================================= */}

      {editingSubjectFor && (

        <div
          className="edit-subject-overlay"
          onClick={() => {

            setEditingSubjectFor(
              null
            );

            setSelectedSubject("");

          }}
        >

          <div
            className="edit-subject-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <h3>
              Edit Subject
            </h3>


            <p className="edit-subject-teacher">

              Faculty:{" "}

              <strong>

                {
                  editingSubjectFor.firstName
                }{" "}

                {
                  editingSubjectFor.lastName
                }

              </strong>

            </p>


            <label>
              Select Subject
            </label>


            <select
              value={selectedSubject}
              onChange={(e) =>
                setSelectedSubject(
                  e.target.value
                )
              }
            >

              <option value="">
                -- Select Subject --
              </option>


              {SUBJECT_LIST.map(
                (subject) => (

                  <option
                    key={subject}
                    value={subject}
                  >
                    {subject}
                  </option>

                )
              )}

            </select>


            <div className="edit-subject-actions">

              <button
                className="btn-cancel"
                onClick={() => {

                  setEditingSubjectFor(
                    null
                  );

                  setSelectedSubject("");

                }}
              >
                Cancel
              </button>


              <button
                className="btn-save"
                onClick={saveSubject}
                disabled={
                  !selectedSubject
                }
              >
                Save
              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
};

export default ManageTeachers;