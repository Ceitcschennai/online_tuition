import React, { useEffect, useState } from "react";
import API_BASE_URL from "../config/api";
import "../styles/assignments.css";

const TeacherAssignments = () => {

  const [assignments, setAssignments] = useState([]);
  const [teacherSubjects, setTeacherSubjects] = useState([]);
  const [loading, setLoading] = useState(false);

  const [newAssignment, setNewAssignment] = useState({
    class: "",
    subject: "",
    title: "",
    dueDate: "",
    priority: "Medium",
    description: "",
  });

  //////////////////////////////////////////////////////////
  // Logged Teacher
  //////////////////////////////////////////////////////////

  const teacher = JSON.parse(localStorage.getItem("user")) || {};

  const teacherId =
    teacher?._id || localStorage.getItem("userId");

  const teacherName = teacher?.name || "Teacher";

  //////////////////////////////////////////////////////////
  // Fetch Assignments
  //////////////////////////////////////////////////////////

  const fetchAssignments = async () => {
  try {
    if (!teacherId) {
      console.error("Teacher ID not found");
      return;
    }

    const res = await fetch(
      `${API_BASE_URL}/api/assignments?teacherId=${teacherId}`
    );

    const data = await res.json();

    if (data.success) {
      setAssignments(data.assignments || []);
    }

  } catch (error) {
    console.error("Fetch error:", error);
  }
};

  //////////////////////////////////////////////////////////
  // Fetch Logged-in Teacher's Subjects
  //////////////////////////////////////////////////////////

  const fetchTeacherSubjects = async () => {
    if (!teacherId) {
      console.error("Teacher ID not found");
      return;
    }

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/teacher/subjects/${teacherId}`
      );

      const data = await res.json();

      console.log("Teacher Subjects Response:", data);

      if (data.success) {
        const subjects = data.subjects || [];

        setTeacherSubjects(subjects);

        // If teacher has only one subject,
        // automatically select it.
        if (subjects.length === 1) {
          setNewAssignment((prev) => ({
            ...prev,
            subject: subjects[0].name,
          }));
        }
      } else {
        setTeacherSubjects([]);
      }

    } catch (error) {
      console.error(
        "Failed to fetch teacher subjects:",
        error
      );

      setTeacherSubjects([]);
    }
  };

  //////////////////////////////////////////////////////////
  // Load Data
  //////////////////////////////////////////////////////////

  useEffect(() => {
    fetchAssignments();
    fetchTeacherSubjects();
  }, []);

  //////////////////////////////////////////////////////////
  // Create Assignment
  //////////////////////////////////////////////////////////

const handleCreate = async (e) => {
  e.preventDefault();

  if (!teacherId) {
    alert("Teacher not logged in");
    return;
  }

  if (!newAssignment.subject) {
    alert("Please select a subject");
    return;
  }

  if (!newAssignment.class) {
    alert("Please select a class");
    return;
  }

  try {
    setLoading(true);

    const res = await fetch(
      `${API_BASE_URL}/api/assignments`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          ...newAssignment,

          // Keep the exact class value:
          // "Class 10", "Class 11", etc.
          class: newAssignment.class,

          teacherId,
          teacherName,
        }),
      }
    );

    const data = await res.json();

    if (data.success) {
      alert("Assignment Created Successfully");

      setNewAssignment({
        class: "",
        subject:
          teacherSubjects.length === 1
            ? teacherSubjects[0].name
            : "",
        title: "",
        dueDate: "",
        priority: "Medium",
        description: "",
      });

      fetchAssignments();

    } else {
      alert(
        data.message ||
        "Failed to create assignment"
      );
    }

  } catch (error) {
    console.error("Create error:", error);
    alert("Server Error");

  } finally {
    setLoading(false);
  }
};

  //////////////////////////////////////////////////////////
  // Delete Assignment
  //////////////////////////////////////////////////////////

  const handleDelete = async (id) => {

    if (!window.confirm("Delete this assignment?")) {
      return;
    }

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/assignments/${id}`,
        {
          method: "DELETE",
        }
      );

      const data = await res.json();

      if (data.success) {
        alert("Deleted");
        fetchAssignments();
      } else {
        alert(
          data.message ||
          "Failed to delete assignment"
        );
      }

    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  //////////////////////////////////////////////////////////
  // UI
  //////////////////////////////////////////////////////////

  return (
    <div className="assignment-dashboard">

  {/* ================= CREATE ASSIGNMENT HEADER ================= */}

  <div className="assignment-hero">
    <h1>Create Assignment</h1>
    <p>Create and share assignments with your participants</p>
  </div>

      {/* ================= CREATE ASSIGNMENT FORM ================= */}

<form
  onSubmit={handleCreate}
  className="assignment-form-card"
>

  <div className="assignment-form-grid">

    {/* ================= CLASS ================= */}

    <div className="assignment-field">
      <label>CLASS *</label>

      <select
        value={newAssignment.class}
        onChange={(e) =>
          setNewAssignment({
            ...newAssignment,
            class: e.target.value,
          })
        }
        required
      >
        <option value="">
          Select Class
        </option>

        {(teacher?.classesAssigned?.length > 0
          ? teacher.classesAssigned
          : [
              "Class 1",
              "Class 2",
              "Class 3",
              "Class 4",
              "Class 5",
              "Class 6",
              "Class 7",
              "Class 8",
              "Class 9",
              "Class 10",
              "Class 11",
              "Class 12",
            ]
        ).map((c) => (
          <option
            key={c}
            value={c}
          >
            {c}
          </option>
        ))}
      </select>
    </div>


    {/* ================= SUBJECT ================= */}

    <div className="assignment-field">
      <label>SUBJECT *</label>

      <select
        value={newAssignment.subject}
        onChange={(e) =>
          setNewAssignment({
            ...newAssignment,
            subject: e.target.value,
          })
        }
        required
      >
        <option value="">
          Select Subject
        </option>

        {teacherSubjects.map((subject) => (
          <option
            key={subject._id}
            value={subject.name}
          >
            {subject.name}
          </option>
        ))}
      </select>
    </div>


    {/* ================= PRIORITY ================= */}

    <div className="assignment-field">
      <label>PRIORITY</label>

      <select
        value={newAssignment.priority}
        onChange={(e) =>
          setNewAssignment({
            ...newAssignment,
            priority: e.target.value,
          })
        }
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
      </select>
    </div>


    {/* ================= TITLE ================= */}

    <div className="assignment-field">
      <label>ASSIGNMENT TITLE *</label>

      <input
        type="text"
        placeholder="Enter assignment title"
        value={newAssignment.title}
        onChange={(e) =>
          setNewAssignment({
            ...newAssignment,
            title: e.target.value,
          })
        }
        required
      />
    </div>


    {/* ================= DUE DATE ================= */}

    <div className="assignment-field">
      <label>DUE DATE *</label>

      <input
        type="date"
        value={newAssignment.dueDate}
        onChange={(e) =>
          setNewAssignment({
            ...newAssignment,
            dueDate: e.target.value,
          })
        }
        required
      />
    </div>

  </div>


  {/* ================= DESCRIPTION ================= */}

  <div className="assignment-description-field">
    <label>DESCRIPTION</label>

    <textarea
      placeholder="Enter assignment description..."
      value={newAssignment.description}
      onChange={(e) =>
        setNewAssignment({
          ...newAssignment,
          description: e.target.value,
        })
      }
    />
  </div>


  {/* ================= CREATE BUTTON ================= */}

  <div className="assignment-submit-area">
    <button
      type="submit"
      className="create-assignment-btn"
      disabled={loading}
    >
      {loading
        ? "Creating..."
        : "Create Assignment"}
    </button>
  </div>

</form>
      <hr />

      {/* =====================================================
          YOUR ASSIGNMENTS
      ===================================================== */}

      <h2>Your Assignments</h2>

      {assignments.length === 0 && (
        <p>
          No assignments created yet
        </p>
      )}

      {assignments.map((a) => (

        <div
          key={a._id}
          className="assignment-card"
        >

          <h3>
            {a.title}
          </h3>

          <p>
            <b>Class:</b>{" "}
            {a.class}
          </p>

          <p>
            <b>Subject:</b>{" "}
            {a.subject}
          </p>

          <p>
            <b>Due Date:</b>{" "}
            {new Date(
              a.dueDate
            ).toLocaleDateString()}
          </p>

          <p>
            <b>Priority:</b>{" "}
            {a.priority}
          </p>

          {a.description && (
            <p>
              {a.description}
            </p>
          )}

          <button
            onClick={() =>
              handleDelete(a._id)
            }
          >
            Delete
          </button>

        </div>

      ))}

    </div>
  );
};

export default TeacherAssignments;