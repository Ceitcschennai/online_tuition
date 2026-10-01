import React, {
  useEffect,
  useState,
  useCallback,
} from "react";

import API_BASE_URL from "../config/api";

import "../styles/manageStudents.css";

import {
  FaUsers,
  FaSearch,
  FaFilter,
  FaEye,
  FaDownload,
} from "react-icons/fa";


const ManageStudents = () => {

  /* =====================================================
     STUDENTS
  ===================================================== */

  const [students, setStudents] = useState([]);


  /* =====================================================
     STATS
  ===================================================== */

  const [stats, setStats] = useState({
    total: 0,
    approved: 0,
    pending: 0,
    paid: 0,
  });


  /* =====================================================
     FILTERS
  ===================================================== */

  const [searchTerm, setSearchTerm] =
    useState("");

  const [filterStatus, setFilterStatus] =
    useState("all");

  const [filterClass, setFilterClass] =
    useState("all");


  /* =====================================================
     CLASS OPTIONS
  ===================================================== */

  const [classOptions, setClassOptions] =
    useState([]);


  /* =====================================================
     LOADING
  ===================================================== */

  const [loading, setLoading] =
    useState(true);


  /* =====================================================
     ACTION LOADING
  ===================================================== */

  const [actionLoading, setActionLoading] =
    useState(null);

    const [selectedStudent, setSelectedStudent] =
  useState(null);

const [profileLoading, setProfileLoading] =
  useState(false);  

const [studentActivationRequests, setStudentActivationRequests] =
  useState([]);

  /* =====================================================
     FETCH STUDENTS
  ===================================================== */

  const fetchStudents = useCallback(
    async () => {

      setLoading(true);

      try {

        const res = await fetch(
          `${API_BASE_URL}/api/admin/students?search=${encodeURIComponent(
            searchTerm
          )}&filter=${filterStatus}&studentClass=${encodeURIComponent(
            filterClass
          )}`
        );

        const data = await res.json();

        if (data.success) {

          setStudents(
            data.students || []
          );

        }

      } catch (err) {

        console.error(
          "Failed to fetch students:",
          err
        );

      } finally {

        setLoading(false);

      }

    },
    [
      searchTerm,
      filterStatus,
      filterClass,
    ]
  );


  /* =====================================================
     FETCH STATS
  ===================================================== */

  const fetchStats = useCallback(
    async () => {

      try {

        const res = await fetch(
          `${API_BASE_URL}/api/admin/students/stats`
        );

        const data = await res.json();

        if (data.success) {

          setStats(
            data.stats
          );

        }

      } catch (err) {

        console.error(
          "Failed to fetch stats:",
          err
        );

      }

    },
    []
  );

  /* =====================================================
   FETCH ACTIVATION REQUESTS
===================================================== */

const fetchStudentActivationRequests = useCallback(
  async () => {

    try {

      const res = await fetch(
        `${API_BASE_URL}/api/student/admin/activation-requests`
      );

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(
          data.message ||
          "Failed to fetch activation requests"
        );
      }

      setStudentActivationRequests(
        Array.isArray(data.students)
          ? data.students
          : []
      );

    } catch (err) {

      console.error(
        "Failed to fetch student activation requests:",
        err
      );

      setStudentActivationRequests([]);
    }
  },
  []
);


  /* =====================================================
     FETCH CLASS OPTIONS
  ===================================================== */

  const fetchClassOptions = useCallback(
    async () => {

      try {

        const res = await fetch(
          `${API_BASE_URL}/api/admin/students/classes`
        );

        const data = await res.json();

        if (data.success) {

          setClassOptions(
            data.classes || []
          );

        }

      } catch (err) {

        console.error(
          "Failed to fetch classes:",
          err
        );

      }

    },
    []
  );


  /* =====================================================
     UPDATE STUDENT STATUS
     
     Supported:
     Approved
     Rejected
     Reject Document
  ===================================================== */

  const updateStatus = async (
    id,
    status
  ) => {

    try {

      setActionLoading(id);


      const res = await fetch(
        `${API_BASE_URL}/api/admin/students/${id}/status`,
        {
          method: "PUT",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            status,
          }),
        }
      );


      const data =
        await res.json();


      if (data.success) {

        await fetchStudents();

        await fetchStats();

      } else {

        alert(
          data.message ||
            "Failed to update status"
        );

      }

    } catch (err) {

      console.error(
        "Status update failed:",
        err
      );

      alert(
        "Failed to update student status"
      );

    } finally {

      setActionLoading(null);

    }

  };

  /* =====================================================
   ACTIVATE / DEACTIVATE STUDENT
===================================================== */

const handleStudentStatus = async (
  studentId,
  action
) => {

  try {

    setActionLoading(studentId);

    const res = await fetch(
      `${API_BASE_URL}/api/student/admin/${studentId}/status`,
      {
        method: "PUT",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          action,
        }),
      }
    );

    const data = await res.json();

    if (!res.ok || !data.success) {

      throw new Error(
        data.message ||
        "Failed to update student status"
      );
    }

    alert(
      data.message ||
      "Student status updated successfully"
    );

    await fetchStudents();
    await fetchStats();
    await fetchStudentActivationRequests();

  } catch (err) {

    console.error(
      "Student status update error:",
      err
    );

    alert(
      err.message ||
      "Failed to update student status"
    );

  } finally {

    setActionLoading(null);

  }
};

/* =====================================================
   VIEW STUDENT PROFILE
===================================================== */

const handleViewProfile = async (studentId) => {

  try {

    setProfileLoading(true);

    const res = await fetch(
      `${API_BASE_URL}/api/student/${studentId}`
    );

    const data = await res.json();

    if (!res.ok) {
      throw new Error(
        data?.message ||
        "Failed to load student profile"
      );
    }

    setSelectedStudent(data);

  } catch (err) {

    console.error(
      "Failed to load student profile:",
      err
    );

    alert(
      err.message ||
      "Failed to load student profile"
    );

  } finally {

    setProfileLoading(false);

  }
};

  /* =====================================================
     INITIAL FETCH
  ===================================================== */

  useEffect(() => {

  fetchStudents();
  fetchStats();
  fetchStudentActivationRequests();

}, [
  fetchStudents,
  fetchStats,
  fetchStudentActivationRequests,
]);


  /* =====================================================
     CLASS FETCH
  ===================================================== */

  useEffect(() => {

    fetchClassOptions();

  }, [
    fetchClassOptions,
  ]);


  /* =====================================================
     RENDER
  ===================================================== */

  return (

    <div className="student-management-container">


      {/* =================================================
          HEADER
      ================================================= */}

      <h2>
        <FaUsers /> Manage Students
      </h2>


      {/* =================================================
          STATS
      ================================================= */}

      <div className="stats-row">

        <div className="stat-card">

          <h3>
            {stats.total}
          </h3>

          <p>
            Total Students
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
            {stats.paid}
          </h3>

          <p>
            Paid
          </p>

        </div>

      </div>


      {/* =================================================
          SEARCH + STATUS FILTER
      ================================================= */}

      <div className="controls">


        {/* SEARCH */}

        <div className="search-box">

          <FaSearch />

          <input
            type="text"
            placeholder="Search by name, email, class, EMIS..."
            value={searchTerm}
            onChange={(e) =>
              setSearchTerm(
                e.target.value
              )
            }
          />

        </div>


        {/* STATUS FILTER */}

        <div className="filter-box">

          <FaFilter />

          <select
            value={filterStatus}
            onChange={(e) =>
              setFilterStatus(
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

            <option value="paid">
              Paid
            </option>

            <option value="unpaid">
              Unpaid
            </option>

           

            <option value="activationRequested">
  Activation Requested
</option>

          </select>

        </div>

      </div>


      {/* =================================================
          CLASS FILTER
      ================================================= */}

      <div className="class-filter-row">

        <button
          className={`class-filter-btn ${
            filterClass === "all"
              ? "active"
              : ""
          }`}
          onClick={() =>
            setFilterClass("all")
          }
        >
          All Classes
        </button>


        {classOptions.map(
          (cls) => (

            <button
              key={cls}
              className={`class-filter-btn ${
                filterClass === cls
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                setFilterClass(cls)
              }
            >
              {cls}
            </button>

          )
        )}

      </div>



      {/* =================================================
          STUDENT LIST
      ================================================= */}

      {loading ? (

        <p>
          Loading students...
        </p>

      ) : students.length === 0 ? (

        <p>
          No students found
        </p>

      ) : (

        <div className="students-list">


          {students.map(
            (student) => (

              <div
                key={student._id}
                className="student-card"
              >


                {/* =======================================
                    STUDENT NAME
                ======================================= */}

                <h4>

                  {student.firstName}{" "}

                  {student.lastName}

                </h4>


                {/* =======================================
                    STUDENT DETAILS
                ======================================= */}

                <p>
                  <strong>
                    Email:
                  </strong>{" "}
                  {student.email}
                </p>


                <p>
                  <strong>
                    Class:
                  </strong>{" "}
                  {student.class}
                </p>


                <p>
                  <strong>
                    EMIS:
                  </strong>{" "}
                  {student.emisNumber ||
                    "-"}
                </p>


                <p>
                  <strong>
                    Status:
                  </strong>{" "}
                  {student.approvalStatus}
                </p>


                <p>
                  <strong>
                    Payment:
                  </strong>{" "}
                  {student.status}
                </p>


                {/* =======================================
                    ID PROOF
                ======================================= */}

                {student.proof && (

                  <div
                    className="student-proof"
                    style={{
                      marginTop:
                        "15px",
                    }}
                  >

                    <span
                      style={{
                        display:
                          "inline-flex",
                        alignItems:
                          "center",
                        gap: "8px",
                        marginRight:
                          "15px",
                      }}
                    >

                      <strong>
                        ID Proof
                      </strong>

                    </span>


                    {/* VIEW */}

                    <button
                      type="button"
                      onClick={() =>
                        window.open(
                          student.proof,
                          "_blank"
                        )
                      }
                      style={{
                        border:
                          "none",
                        background:
                          "#ffffff",
                        padding:
                          "8px 12px",
                        borderRadius:
                          "6px",
                        cursor:
                          "pointer",
                        marginRight:
                          "5px",
                      }}
                      title="View ID Proof"
                    >

                      <FaEye />

                    </button>


                    {/* DOWNLOAD */}

                    <a
                      href={
                        student.proof
                      }
                      download={`ID-Proof-${student.firstName}-${student.lastName}`}
                      style={{
                        display:
                          "inline-flex",
                        alignItems:
                          "center",
                        justifyContent:
                          "center",
                        border:
                          "none",
                        background:
                          "#ffffff",
                        padding:
                          "8px 12px",
                        borderRadius:
                          "6px",
                        cursor:
                          "pointer",
                        textDecoration:
                          "none",
                        color:
                          "inherit",
                      }}
                      title="Download ID Proof"
                    >

                      <FaDownload />

                    </a>

                  </div>

                )}


                {/* =======================================
                    WAITING FOR RE-UPLOAD
                ======================================= */}

                {student.approvalStatus === "Pending" &&
 student.documentReuploadToken ? (

                  <div
                    style={{
                      width:
                        "100%",
                      padding:
                        "12px 15px",
                      borderRadius:
                        "8px",
                      background:
                        "#fff7ed",
                      border:
                        "1px solid #fdba74",
                      color:
                        "#ea580c",
                      fontWeight:
                        "600",
                      textAlign:
                        "center",
                      marginTop:
                        "15px",
                    }}
                  >

                    Waiting for
                    re-upload document

                  </div>

                ) : (


                  /* =====================================
                     ACTION BUTTONS
                  ===================================== */

                  <div className="student-actions">

<button
  type="button"
  className="btn-view-profile"
  onClick={() =>
    handleViewProfile(student._id)
  }
>
  <FaEye />
  View Profile
</button>

                    {/* =================================
                        APPROVED STUDENT
                        SHOW ONLY REJECT
                    ================================= */}

                    {/* =================================
    APPROVED STUDENT
================================= */}

{student.approvalStatus === "Approved" ? (

  <>
    {/* =================================
        ACTIVE STUDENT
        SHOW DEACTIVATE
    ================================= */}

    {student.isActive === true && (
      <button
        className="btn-deactivate"
        disabled={
          actionLoading === student._id
        }
        onClick={() =>
          handleStudentStatus(
            student._id,
            "deactivate"
          )
        }
      >
        {actionLoading === student._id
          ? "Processing..."
          : "⏸ Deactivate"}
      </button>
    )}

    {/* =================================
        DEACTIVATED + ACTIVATION REQUEST
    ================================= */}

    {student.isActive === false &&
      student.activationRequested === true && (
        <>
          <div
            style={{
              width: "100%",
              padding: "10px 14px",
              borderRadius: "8px",
              background: "#fff7ed",
              border: "1px solid #fdba74",
              color: "#ea580c",
              fontWeight: "700",
              textAlign: "center",
              marginBottom: "10px"
            }}
          >
            🔔 Activation Requested
          </div>

          <button
  className="btn-approve"
  style={{ width: "100%" }}
  disabled={
    actionLoading === student._id
  }
            onClick={() =>
              handleStudentStatus(
                student._id,
                "activate"
              )
            }
          >
            {actionLoading === student._id
              ? "Activating..."
              : "Activate Student"}
          </button>

          
        </>
      )}

    {/* =================================
        DEACTIVATED
        NO ACTIVATION REQUEST
    ================================= */}

    {student.isActive === false &&
  student.activationRequested === false && (
    <button
      className="btn-approve"
      disabled={
        actionLoading === student._id
      }
      onClick={() =>
        handleStudentStatus(
          student._id,
          "activate"
        )
      }
    >
      {actionLoading === student._id
        ? "Activating..."
        : "✓ Activate Student"}
    </button>
)}
  </>



                    ) : student.approvalStatus ===
  "Rejected" ? (

  <span className="student-rejected-label">
    Rejected
  </span>

) : (


                      /* =================================
                         PENDING STUDENT
                         SHOW ALL 3 BUTTONS
                      ================================= */

                      <>

                        <button
                          className="btn-approve"
                          disabled={
                            actionLoading ===
                            student._id
                          }
                          onClick={() =>
                            updateStatus(
                              student._id,
                              "Approved"
                            )
                          }
                        >

                          {actionLoading ===
                          student._id
                            ? "Processing..."
                            : "Approve"}

                        </button>


                        <button
                          className="btn-reject-document"
                          disabled={
                            actionLoading ===
                            student._id
                          }
                          onClick={() =>
                            updateStatus(
                              student._id,
                              "Reject Document"
                            )
                          }
                        >

                          {actionLoading ===
                          student._id
                            ? "Processing..."
                            : "Reject Document"}

                        </button>


                        <button
                          className="btn-reject"
                          disabled={
                            actionLoading ===
                            student._id
                          }
                          onClick={() =>
                            updateStatus(
                              student._id,
                              "Rejected"
                            )
                          }
                        >

                          {actionLoading ===
                          student._id
                            ? "Processing..."
                            : "Reject"}

                        </button>

                      </>

                    )}

                  </div>

                )}

              </div>

            )
          )}

        </div>

      )}

          {/* =================================================
          STUDENT PROFILE MODAL
      ================================================= */}

      {selectedStudent && (
        <div
          className="student-profile-overlay"
          onClick={() =>
            setSelectedStudent(null)
          }
        >

          <div
            className="student-profile-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            {/* PROFILE HEADER */}

            <div className="student-profile-modal-header">

              <div>

                <span className="student-profile-label">
                  STUDENT PROFILE
                </span>

                <h2>
                  {selectedStudent.salutation || ""}
                  {" "}
                  {selectedStudent.firstName || ""}
                  {" "}
                  {selectedStudent.lastName || ""}
                </h2>

                <p>
                  Complete registration details
                </p>

              </div>

              <button
                type="button"
                className="student-profile-close"
                onClick={() =>
                  setSelectedStudent(null)
                }
              >
                ×
              </button>

            </div>


            {/* PERSONAL INFORMATION */}

            <div className="student-profile-section">

              <h3>
                Personal Information
              </h3>

              <div className="student-profile-grid">

                <div className="student-profile-field">
                  <span>Salutation</span>
                  <strong>
                    {selectedStudent.salutation || "-"}
                  </strong>
                </div>

                <div className="student-profile-field">
                  <span>First Name</span>
                  <strong>
                    {selectedStudent.firstName || "-"}
                  </strong>
                </div>

                <div className="student-profile-field">
                  <span>Last Name</span>
                  <strong>
                    {selectedStudent.lastName || "-"}
                  </strong>
                </div>

                <div className="student-profile-field">
                  <span>Mobile</span>
                  <strong>
                    {selectedStudent.mobile || "-"}
                  </strong>
                </div>

                <div className="student-profile-field">
                  <span>Email</span>
                  <strong>
                    {selectedStudent.email || "-"}
                  </strong>
                </div>

                <div className="student-profile-field">
                  <span>Timezone</span>
                  <strong>
                    {selectedStudent.timezone || "-"}
                  </strong>
                </div>

              </div>

            </div>


            {/* ACADEMIC INFORMATION */}

            <div className="student-profile-section">

              <h3>
                Academic Information
              </h3>

              <div className="student-profile-grid">

                <div className="student-profile-field">
                  <span>Class</span>
                  <strong>
                    {selectedStudent.class || "-"}
                  </strong>
                </div>

                <div className="student-profile-field">
                  <span>Group</span>
                  <strong>
                    {selectedStudent.group || "-"}
                  </strong>
                </div>

                <div className="student-profile-field">
                  <span>Syllabus</span>
                  <strong>
                    {selectedStudent.syllabus || "-"}
                  </strong>
                </div>

                <div className="student-profile-field">
                  <span>EMIS Number</span>
                  <strong>
                    {selectedStudent.emisNumber || "-"}
                  </strong>
                </div>

              </div>

            </div>


            {/* ACCOUNT INFORMATION */}

            <div className="student-profile-section">

              <h3>
                Account Information
              </h3>

              <div className="student-profile-grid">

                <div className="student-profile-field">
                  <span>Approval Status</span>

                  <strong
                    className={
                      selectedStudent.approvalStatus ===
                      "Approved"
                        ? "profile-status approved"
                        : selectedStudent.approvalStatus ===
                          "Rejected"
                          ? "profile-status rejected"
                          : "profile-status pending"
                    }
                  >
                    {selectedStudent.approvalStatus || "-"}
                  </strong>

                </div>


                <div className="student-profile-field">
                  <span>Account Status</span>

                  <strong
                    className={
                      selectedStudent.isActive
                        ? "profile-status approved"
                        : "profile-status rejected"
                    }
                  >
                    {selectedStudent.isActive
                      ? "Active"
                      : "Deactivated"}
                  </strong>

                </div>


                <div className="student-profile-field">
                  <span>Payment Status</span>

                  <strong
                    className={
                      selectedStudent.status ===
                      "Paid"
                        ? "profile-status approved"
                        : "profile-status pending"
                    }
                  >
                    {selectedStudent.status || "-"}
                  </strong>

                </div>


                <div className="student-profile-field">
                  <span>Activation Request</span>

                  <strong>
                    {selectedStudent.activationRequested
                      ? "Requested"
                      : "No Request"}
                  </strong>

                </div>

              </div>

            </div>


            {/* REGISTRATION INFORMATION */}

            <div className="student-profile-section">

              <h3>
                Registration Information
              </h3>

              <div className="student-profile-grid">

                <div className="student-profile-field">
                  <span>Student ID</span>
                  <strong>
                    {selectedStudent._id || "-"}
                  </strong>
                </div>

                <div className="student-profile-field">
                  <span>Registration Date</span>
                  <strong>
                    {selectedStudent.createdAt
                      ? new Date(
                          selectedStudent.createdAt
                        ).toLocaleString("en-IN")
                      : "-"}
                  </strong>
                </div>

                <div className="student-profile-field">
                  <span>Updated Date</span>
                  <strong>
                    {selectedStudent.updatedAt
                      ? new Date(
                          selectedStudent.updatedAt
                        ).toLocaleString("en-IN")
                      : "-"}
                  </strong>
                </div>

              </div>

            </div>


            {/* ID PROOF */}

            <div className="student-profile-section">

              <h3>
                ID Proof
              </h3>

              {selectedStudent.proof ? (

                <div className="student-profile-proof">

                  <span>
                    ID Proof Document
                  </span>

                  <div>

                    <button
                      type="button"
                      className="profile-proof-view"
                      onClick={() =>
                        window.open(
                          selectedStudent.proof,
                          "_blank"
                        )
                      }
                    >
                      <FaEye />
                      View ID Proof
                    </button>

                    <a
                      href={selectedStudent.proof}
                      download={`ID-Proof-${selectedStudent.firstName}-${selectedStudent.lastName}`}
                      className="profile-proof-download"
                    >
                      <FaDownload />
                      Download
                    </a>

                  </div>

                </div>

              ) : (

                <div className="student-profile-no-proof">
                  No ID proof uploaded.
                </div>

              )}

            </div>


            {/* FOOTER */}

            <div className="student-profile-modal-footer">

              <button
                type="button"
                onClick={() =>
                  setSelectedStudent(null)
                }
              >
                Close
              </button>

            </div>

          </div>

        </div>
      )}

    </div>

  );

};

export default ManageStudents;