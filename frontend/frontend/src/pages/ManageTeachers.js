import React, { useEffect, useState } from "react";
import axios from "axios";
import API_BASE_URL from "../config/api";
import "../styles/manageTeachers.css";

const ManageTeachers = () => {
  const [teachers, setTeachers] = useState([]);
  const [filteredTeachers, setFilteredTeachers] = useState([]);

  const [stats, setStats] = useState({
    total: 0,
    approved: 0,
    pending: 0,
    rejected: 0,
    assigned: 0,
  });

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

//   const fetchSubjects = async () => {
//   try {
//     const res = await axios.get(
//       "http://localhost:5000/api/subjects/admin/all"
//     );

//     console.log("Subjects API Response:", res.data);

//     if (res.data.subjects) {
//       setSubjects(res.data.subjects);
//     } else {
//       setSubjects([]);
//     }

//   } catch (error) {
//     console.error("Failed to fetch subjects:", error);

//     setSubjects([]);

//     alert(
//       error.response?.data?.message ||
//       "Failed to fetch subjects"
//     );
//   }
// };

  // =====================================================
  // INITIAL LOAD
  // =====================================================
  const fetchTeachers = async () => {
  try {
    const res = await axios.get(
      "http://localhost:5000/api/admin/teachers",
      {
        params: { search, filter },
      }
    );

    console.log("Teachers API Response:", res.data);

    const teacherArray = res.data.teachers || [];

    setTeachers(teacherArray);
    setFilteredTeachers(teacherArray);

    if (res.data.stats) {
      setStats(res.data.stats);
    }
  } catch (error) {
    console.error("Error fetching teachers:", error);

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

  // useEffect(() => {
  //   fetchTeachers();
  // }, []);

  // =====================================================
  // SEARCH + FILTER
  // =====================================================

  useEffect(() => {
    fetchTeachers();
  }, [search, filter]);

  // =====================================================
  // UPDATE TEACHER STATUS
  // =====================================================

  const updateStatus = async (id, status) => {
    try {
      await axios.put(
        `http://localhost:5000/api/admin/teachers/${id}/status`,
        { status }
      );

      fetchTeachers();

    } catch (error) {
      console.error("Status update failed:", error);
    }
  };

  // =====================================================
  // EDIT CLASSES
  // =====================================================

  const openEditClasses = (teacher) => {
    setEditingClassesFor(teacher);

    setEditClasses(
      Array.isArray(teacher.classesAssigned)
        ? teacher.classesAssigned
        : []
    );
  };

  const toggleEditClass = (cls) => {
    setEditClasses((prev) =>
      prev.includes(cls)
        ? prev.filter((c) => c !== cls)
        : [...prev, cls]
    );
  };

  const saveClasses = async () => {
    if (editClasses.length === 0) {
      alert("Select at least one class");
      return;
    }

    try {
      await axios.put(
        `http://localhost:5000/api/admin/teachers/${editingClassesFor._id}/classes`,
        {
          classes: editClasses,
        }
      );

      setEditingClassesFor(null);

      await fetchTeachers();

      alert("Classes updated successfully");

    } catch (error) {
      console.error("Failed to update classes:", error);

      alert(
        error.response?.data?.message ||
        "Failed to update classes"
      );
    }
  };

  // =====================================================
  // FETCH SUBJECTS
  // =====================================================

  

  // =====================================================
  // OPEN EDIT SUBJECT
  // =====================================================

  // const openEditSubject = async (teacher) => {
  //   setEditingSubjectFor(teacher);

  //   /*
  //    * Teacher.subjects is expected to contain populated
  //    * subject objects from the backend.
  //    */

  //   let currentSubjectId = "";

  //   if (
  //     Array.isArray(teacher.subjects) &&
  //     teacher.subjects.length > 0
  //   ) {
  //     const currentSubject = teacher.subjects[0];

  //     if (typeof currentSubject === "object") {
  //       currentSubjectId =
  //         currentSubject._id || "";
  //     } else {
  //       currentSubjectId = currentSubject;
  //     }
  //   }

  //   setSelectedSubject(currentSubjectId);

  //   await fetchSubjects();
  // };

//   const openEditSubject = async (teacher) => {
//   setEditingSubjectFor(teacher);

//   let currentSubjectId = "";

//   if (
//     Array.isArray(teacher.subjects) &&
//     teacher.subjects.length > 0
//   ) {
//     const currentSubject = teacher.subjects[0];

//     if (typeof currentSubject === "object") {
//       currentSubjectId = currentSubject._id || "";
//     } else {
//       currentSubjectId = currentSubject;
//     }
//   }

//   setSelectedSubject(currentSubjectId);
// };

const openEditSubject = (teacher) => {
  setEditingSubjectFor(teacher);

  let currentSubject = "";

  if (
    Array.isArray(teacher.subjects) &&
    teacher.subjects.length > 0
  ) {
    const subject = teacher.subjects[0];

    if (typeof subject === "object") {
      currentSubject = subject.name || "";
    } else {
      currentSubject = subject;
    }
  }

  setSelectedSubject(currentSubject);
};

  // =====================================================
  // SAVE SUBJECT
  // =====================================================

//  const saveSubject = async () => {
//   if (!selectedSubject) {
//     alert("Please select a subject");
//     return;
//   }

//   try {
//     const response = await axios.put(
//       `http://localhost:5000/api/admin/teachers/${editingSubjectFor._id}/subject`,
//       {
//         subjectName: selectedSubject,
//       }
//     );

//     console.log("Update subject response:", response.data);

//     alert("Subject updated successfully");

//     setEditingSubjectFor(null);
//     setSelectedSubject("");

//     await fetchTeachers();

//   } catch (error) {
//     console.error(
//       "Failed to update teacher subject:",
//       error.response?.data || error
//     );

//     alert(
//       error.response?.data?.message ||
//       "Failed to update teacher subject"
//     );
//   }
// };
// const saveSubject = async () => {
//   if (!selectedSubject) {
//     alert("Please select a subject");
//     return;
//   }

//   try {
//     const response = await axios.put(
//       `${API_BASE_URL}/api/admin/teachers/${editingSubjectFor._id}/subject`,
//       {
//         subjectId: selectedSubject,
//       }
//     );

//     console.log(
//       "Teacher subject update response:",
//       response.data
//     );

//     if (response.data.success) {
//       alert("Subject updated successfully");

//       setEditingSubjectFor(null);
//       setSelectedSubject("");

//       await fetchTeachers();
//     } else {
//       alert(
//         response.data.message ||
//         "Failed to update teacher subject"
//       );
//     }

//   } catch (error) {
//     console.error(
//       "Failed to update teacher subject:",
//       error.response?.data || error
//     );

//     alert(
//       error.response?.data?.message ||
//       "Failed to update teacher subject"
//     );
//   }
// };

const saveSubject = async () => {
  const subjectName = selectedSubject;

  console.log("Selected subject:", subjectName);
  console.log("Teacher:", editingSubjectFor?._id);

  if (!subjectName) {
    alert("Please select a subject");
    return;
  }

  try {
    const response = await axios.put(
      `http://localhost:5000/api/admin/teachers/${editingSubjectFor._id}/subject`,
      {
        subjectName: subjectName,
      }
    );

    console.log("Backend response:", response.data);

    if (response.data.success) {
      alert("Subject updated successfully");

      setEditingSubjectFor(null);
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
      error.response?.data || error.message
    );

    alert(
      error.response?.data?.message ||
      "Failed to update teacher subject"
    );
  }
};

  // =====================================================
  // GET CURRENT SUBJECT NAME
  // =====================================================

  const getTeacherSubject = (teacher) => {
    if (
      !teacher.subjects ||
      !Array.isArray(teacher.subjects) ||
      teacher.subjects.length === 0
    ) {
      return "No subject assigned";
    }

    const subject = teacher.subjects[0];

    if (typeof subject === "object") {
      return subject.name || "No subject assigned";
    }

    /*
     * If backend only returned ObjectId,
     * don't display the ID to the admin.
     */
    return "Subject assigned";
  };

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="manage-teachers-container">

      <h2>👨‍🏫 Manage Teachers</h2>

      {/* =================================================
          STATS
      ================================================= */}

      <div className="stats-container">

        <div className="stat-card">
          <h3>{stats.total}</h3>
          <p>Total Teachers</p>
        </div>

        <div className="stat-card">
          <h3>{stats.approved}</h3>
          <p>Approved</p>
        </div>

        <div className="stat-card">
          <h3>{stats.pending}</h3>
          <p>Pending</p>
        </div>

        <div className="stat-card">
          <h3>{stats.rejected}</h3>
          <p>Rejected</p>
        </div>

        <div className="stat-card">
          <h3>{stats.assigned}</h3>
          <p>Assigned</p>
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
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">All</option>
          <option value="approved">Approved</option>
          <option value="pending">Pending</option>
          <option value="rejected">Rejected</option>
        </select>

      </div>

      {/* =================================================
          TEACHERS GRID
      ================================================= */}

      <div className="teachers-grid">

        {Array.isArray(filteredTeachers) &&
        filteredTeachers.length > 0 ? (

          filteredTeachers.map((teacher) => (

            <div
              className="teacher-card"
              key={teacher._id}
            >

              <h3>
                {teacher.firstName}{" "}
                {teacher.lastName}
              </h3>

              <p>
                <strong>Email:</strong>{" "}
                {teacher.email}
              </p>

              <p>
                <strong>Mobile:</strong>{" "}
                {teacher.mobile}
              </p>

              <p>
                <strong>Status:</strong>{" "}

                {teacher.isApproved
                  ? "Approved"
                  : teacher.isRejected
                  ? "Rejected"
                  : "Pending"}
              </p>

              <p>
                <strong>Assigned:</strong>{" "}

                {teacher.classAssigned
                  ? "Yes"
                  : "No"}
              </p>

              {/* CLASSES */}

              <p>
                <strong>Classes:</strong>{" "}

                {teacher.classesAssigned &&
                teacher.classesAssigned.length > 0 ? (
                  teacher.classesAssigned.join(", ")
                ) : (
                  <span style={{ color: "#9ca3af" }}>
                    None set
                  </span>
                )}
              </p>

              {/* SUBJECT */}

              <p>
                <strong>Subject:</strong>{" "}

                <span className="teacher-subject-name">
                  {getTeacherSubject(teacher)}
                </span>
              </p>

              {/* ACTION BUTTONS */}

            <div className="teacher-actions">

  {/* ROW 1 — APPROVE & REJECT */}
  <div className="action-row action-row-status">

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

    {!teacher.isRejected && (
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
    )}

  </div>


  {/* ROW 2 — EDIT CLASS & SUBJECT */}
  <div className="action-row action-row-edit">

    <button
      className="btn-edit-classes"
      onClick={() =>
        openEditClasses(teacher)
      }
    >
      Edit Classes
    </button>

    <button
      className="btn-edit-subject"
      onClick={() =>
        openEditSubject(teacher)
      }
    >
      Edit Subject
    </button>

  </div>

</div>

            </div>

          ))

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
            setEditingClassesFor(null)
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
              {editingClassesFor.firstName}{" "}
              {editingClassesFor.lastName}
            </h3>

            <p className="edit-classes-sub">
              Select all classes this teacher can teach:
            </p>

            <div className="edit-classes-grid">

              {TEACHABLE_CLASSES.map((cls) => {

                const selected =
                  editClasses.includes(cls);

                return (

                  <button
                    type="button"
                    key={cls}
                    className={`edit-class-pill ${
                      selected ? "selected" : ""
                    }`}
                    onClick={() =>
                      toggleEditClass(cls)
                    }
                  >
                    {selected ? "✓ " : ""}
                    {cls}
                  </button>

                );

              })}

              

            </div>

            <div className="edit-classes-actions">

              <button
                className="btn-cancel"
                onClick={() =>
                  setEditingClassesFor(null)
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
            setEditingSubjectFor(null);
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
                {editingSubjectFor.firstName}{" "}
                {editingSubjectFor.lastName}
              </strong>
            </p>

            <label>
              Select Subject
            </label>

            <select
  value={selectedSubject}
  onChange={(e) =>
    setSelectedSubject(e.target.value)
  }
>
  <option value="">
    -- Select Subject --
  </option>

  {SUBJECT_LIST.map((subject) => (
    <option
      key={subject}
      value={subject}
    >
      {subject}
    </option>
  ))}
</select>

            <div className="edit-subject-actions">

              <button
                className="btn-cancel"
                onClick={() => {
                  setEditingSubjectFor(null);
                  setSelectedSubject("");
                }}
              >
                Cancel
              </button>

              <button
                className="btn-save"
                onClick={saveSubject}
                disabled={!selectedSubject}
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