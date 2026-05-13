import React, { useEffect, useState } from "react";
import API_BASE_URL from "../config/api";
import "../styles/assignments.css";

const TeacherAssignments = () => {

  const [assignments, setAssignments] = useState([]);
  const [history, setHistory] = useState([]);
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
  const teacherId = teacher?._id || localStorage.getItem("userId");
  const teacherName = teacher?.name || "Teacher";

  //////////////////////////////////////////////////////////
  // Fetch ALL Assignments (Recover History)
  //////////////////////////////////////////////////////////

  const fetchAssignments = async () => {

    try {

      const res = await fetch(`${API_BASE_URL}/api/assignments`);

      const data = await res.json();

      if (data.success) {

        setAssignments(data.assignments);

        // History (latest first)
        const sorted = [...data.assignments].sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );

        setHistory(sorted);

      }

    } catch (error) {
      console.log("Fetch error:", error);
    }
  };

  useEffect(() => {
    fetchAssignments();
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

    try {

      setLoading(true);

      const formattedClass = newAssignment.class
        .toLowerCase()
        .replace("class", "")
        .trim();

      const res = await fetch(`${API_BASE_URL}/api/assignments`, {

        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          ...newAssignment,
          class: formattedClass,
          teacherId,
          teacherName,
        }),

      });

      const data = await res.json();

      if (data.success) {

        alert("Assignment Created Successfully");

        setNewAssignment({
          class: "",
          subject: "",
          title: "",
          dueDate: "",
          priority: "Medium",
          description: "",
        });

        fetchAssignments();

      } else {
        alert(data.message);
      }

    } catch (error) {

      console.log("Create error:", error);
      alert("Server Error");

    } finally {
      setLoading(false);
    }
  };

  //////////////////////////////////////////////////////////
  // Delete Assignment
  //////////////////////////////////////////////////////////

  const handleDelete = async (id) => {

    if (!window.confirm("Delete this assignment?")) return;

    try {

      const res = await fetch(`${API_BASE_URL}/api/assignments/${id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (data.success) {
        alert("Deleted");
        fetchAssignments();
      }

    } catch (error) {
      console.log(error);
    }
  };

  //////////////////////////////////////////////////////////
  // UI
  //////////////////////////////////////////////////////////

  return (

    <div className="assignment-dashboard">

      <h2>Create Assignment</h2>

      <form onSubmit={handleCreate} className="assignment-form">

        <input
          type="text"
          placeholder="Class (Example: 10A)"
          value={newAssignment.class}
          onChange={(e) =>
            setNewAssignment({ ...newAssignment, class: e.target.value })
          }
          required
        />

        <input
          type="text"
          placeholder="Subject"
          value={newAssignment.subject}
          onChange={(e) =>
            setNewAssignment({ ...newAssignment, subject: e.target.value })
          }
          required
        />

        <input
          type="text"
          placeholder="Assignment Title"
          value={newAssignment.title}
          onChange={(e) =>
            setNewAssignment({ ...newAssignment, title: e.target.value })
          }
          required
        />

        <input
          type="date"
          value={newAssignment.dueDate}
          onChange={(e) =>
            setNewAssignment({ ...newAssignment, dueDate: e.target.value })
          }
          required
        />

        <select
          value={newAssignment.priority}
          onChange={(e) =>
            setNewAssignment({ ...newAssignment, priority: e.target.value })
          }
        >
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
        </select>

        <textarea
          placeholder="Description"
          value={newAssignment.description}
          onChange={(e) =>
            setNewAssignment({
              ...newAssignment,
              description: e.target.value,
            })
          }
        />

        <button type="submit" disabled={loading}>
          {loading ? "Creating..." : "Create Assignment"}
        </button>

      </form>

      <hr />

      <h2>Your Assignments</h2>

      {assignments.length === 0 && <p>No assignments created yet</p>}

      {assignments.map((a) => (

        <div key={a._id} className="assignment-card">

          <h3>{a.title}</h3>

          <p><b>Class:</b> {a.class}</p>
          <p><b>Subject:</b> {a.subject}</p>
          <p><b>Due Date:</b> {new Date(a.dueDate).toLocaleDateString()}</p>
          <p><b>Priority:</b> {a.priority}</p>

          {a.description && <p>{a.description}</p>}

          <button onClick={() => handleDelete(a._id)}>
            Delete
          </button>

        </div>

      ))}

      <hr />

      <h2>Student Assignment History</h2>

      {history.length === 0 && <p>No student activity yet</p>}

      {history.map((a) => (

        <div key={a._id} className="assignment-card">

          <h3>{a.title}</h3>

          <p><b>Class:</b> {a.class}</p>
          <p><b>Subject:</b> {a.subject}</p>
          <p>
            <b>Created On:</b>{" "}
            {new Date(a.createdAt).toLocaleDateString()}
          </p>

        </div>

      ))}

    </div>
  );
};

export default TeacherAssignments;