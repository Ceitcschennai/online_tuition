import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import "../styles/manageTeachers.css";
import API_BASE_URL from "../config/api";

const ManageTeachers = () => {
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

  /* ===============================
     FETCH TEACHERS
   =============================== */
   const fetchTeachers = useCallback(async () => {
     try {
       const res = await axios.get(
         `${API_BASE_URL}/api/admin/teachers`,
         {
           params: { search, filter },
         }
       );

       console.log("Teachers API Response:", res.data);

       // ✅ Extract array safely
       const teacherArray = res.data.teachers || [];

       setFilteredTeachers(teacherArray);

       // ✅ Set stats directly from backend
       if (res.data.stats) {
         setStats(res.data.stats);
       }
     } catch (error) {
       console.error("Error fetching teachers:", error);
       setFilteredTeachers([]);
       setStats({
         total: 0,
         approved: 0,
         pending: 0,
         rejected: 0,
         assigned: 0,
       });
     }
   }, [search, filter]);

/* ===============================
      INITIAL LOAD + SEARCH + FILTER TRIGGER
    =============================== */
   useEffect(() => {
     fetchTeachers();
   }, [fetchTeachers]);

  /* ===============================
     UPDATE TEACHER STATUS
   =============================== */
   const updateStatus = async (id, status) => {
     try {
       await axios.put(
         `${API_BASE_URL}/api/admin/teachers/${id}/status`,
         { status }
       );

       fetchTeachers();
     } catch (error) {
       console.error("Status update failed:", error);
     }
   };

  /* ===============================
     DELETE TEACHER
   =============================== */
   const deleteTeacher = async (id) => {
     try {
       await axios.delete(
         `${API_BASE_URL}/api/admin/teachers/${id}`
       );

       fetchTeachers();
     } catch (error) {
       console.error("Delete failed:", error);
     }
   };

  return (
    <div className="manage-teachers-container">
      <h2>👨‍🏫 Manage Teachers</h2>

      {/* ===============================
           STATS SECTION
       =============================== */}
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

      {/* ===============================
           SEARCH + FILTER
       =============================== */}
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

      {/* ===============================
           TEACHERS GRID
       =============================== */}
      <div className="teachers-grid">
        {Array.isArray(filteredTeachers) &&
        filteredTeachers.length > 0 ? (
          filteredTeachers.map((teacher) => (
            <div className="teacher-card" key={teacher._id}>
              <h3>
                {teacher.firstName} {teacher.lastName}
              </h3>

              <p><strong>Email:</strong> {teacher.email}</p>
              <p><strong>Mobile:</strong> {teacher.mobile}</p>
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
                {teacher.classAssigned ? "Yes" : "No"}
              </p>

              {/* ACTION BUTTONS */}
              <div className="teacher-actions">
                {!teacher.isApproved && (
                  <button
                    className="btn-approve"
                    onClick={() =>
                      updateStatus(teacher._id, "Approved")
                    }
                  >
                    Approve
                  </button>
                )}

                {!teacher.isRejected && (
                  <button
                    className="btn-reject"
                    onClick={() =>
                      updateStatus(teacher._id, "Rejected")
                    }
                  >
                    Reject
                  </button>
                )}

                <button
                  className="btn-delete"
                  onClick={() => deleteTeacher(teacher._id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="no-data">
            No teachers found
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageTeachers;