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
     INITIAL FETCH
  ===================================================== */

  useEffect(() => {

    fetchStudents();
    fetchStats();

  }, [
    fetchStudents,
    fetchStats,
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

                {student.documentReuploadToken ? (

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


                    {/* =================================
                        APPROVED STUDENT
                        SHOW ONLY REJECT
                    ================================= */}

                    {student.approvalStatus ===
                      "Approved" ? (

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

    </div>

  );

};


export default ManageStudents;