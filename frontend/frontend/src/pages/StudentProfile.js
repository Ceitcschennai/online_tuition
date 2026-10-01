import React, { useEffect, useState } from "react";
import "../styles/studentProfile.css";

const API_BASE_URL =
  process.env.REACT_APP_API_URL ||
  "http://localhost:5000";

const StudentProfile = () => {

  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activationLoading, setActivationLoading] = useState(false);

  useEffect(() => {

    const storedUser =
      JSON.parse(
        localStorage.getItem("user") ||
        localStorage.getItem("student") ||
        "{}"
      );

    const studentId =
      storedUser.id ||
      storedUser._id ||
      storedUser.studentId;

    if (!studentId) {
      setError("Student information not found.");
      setLoading(false);
      return;
    }

    fetch(
      `${API_BASE_URL}/api/student/${studentId}`
    )
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to load profile");
        }
        return res.json();
      })
      .then((data) => {
        setStudent(data.student || data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError("Unable to load student profile.");
        setLoading(false);
      });

    }, []);

  const handleActivationRequest = async () => {
    if (!student?._id || activationLoading) return;

    setActivationLoading(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/student/request-activation/${student._id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
          "Unable to submit activation request."
        );
      }

      const updatedStudent = {
        ...student,
        isActive: false,
        activationRequested: true,
      };

      setStudent(updatedStudent);

      localStorage.setItem(
        "user",
        JSON.stringify(updatedStudent)
      );

      window.dispatchEvent(
        new Event("userStatusUpdated")
      );

    } catch (error) {
      console.error(
        "Activation request error:",
        error
      );

      window.alert(
        error.message ||
        "Unable to submit activation request."
      );

    } finally {
      setActivationLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="student-profile-page">
        <div className="profile-loading">
          Loading profile...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="student-profile-page">
        <div className="profile-error">
          {error}
        </div>
      </div>
    );
  }

   if (!student) return null;

  const isApproved =
    student.approvalStatus === "Approved";

  const isActive =
    student.isActive !== false;

  if (isApproved && !isActive) {
    return (
      <div className="student-profile-page">

        <div className="student-deactivated-card">

          <div className="student-deactivated-icon">
            🔒
          </div>

          <span className="student-eyebrow">
            ACCOUNT ACCESS
          </span>

          <h1>
            Your account is currently inactive
          </h1>

          <p>
            Your profile is approved, but your account
            has been deactivated by the administrator.
            Request activation to restore access.
          </p>

          {student.activationRequested ? (

            <div className="student-pending-box">

              <div>
                <strong>
                  ✓ Activation request pending
                </strong>

                <span>
                  Your request has been sent to the
                  administrator.
                </span>
              </div>

            </div>

          ) : (

            <button
              className="student-primary-btn"
              type="button"
              onClick={handleActivationRequest}
              disabled={activationLoading}
            >
              {activationLoading
                ? "Sending request..."
                : "Request Activation"}
            </button>

          )}

        </div>

      </div>
    );
  }

  const fullName =
    `${student.salutation || ""} ${
      student.firstName || ""
    } ${student.lastName || ""}`.trim();

  return (
    <div className="student-profile-page">

      <div className="student-profile-header">
        <div className="profile-avatar">
          {student.firstName
            ? student.firstName.charAt(0).toUpperCase()
            : "S"}
        </div>

        <div>
          <h1>{fullName || "Student Profile"}</h1>
          <p>View your complete registration details</p>
        </div>
      </div>


      {/* PERSONAL INFORMATION */}
      <div className="profile-section">

        <h2>👤 Personal Information</h2>

        <div className="profile-grid">

          <div className="profile-item">
            <span>Salutation</span>
            <strong>
              {student.salutation || "Not provided"}
            </strong>
          </div>

          <div className="profile-item">
            <span>First Name</span>
            <strong>
              {student.firstName || "Not provided"}
            </strong>
          </div>

          <div className="profile-item">
            <span>Last Name</span>
            <strong>
              {student.lastName || "Not provided"}
            </strong>
          </div>

        </div>

      </div>


      {/* CONTACT INFORMATION */}
      <div className="profile-section">

        <h2>📞 Contact Information</h2>

        <div className="profile-grid">

          <div className="profile-item">
            <span>Email</span>
            <strong>
              {student.email || "Not provided"}
            </strong>
          </div>

          <div className="profile-item">
            <span>Mobile Number</span>
            <strong>
              {student.mobile || "Not provided"}
            </strong>
          </div>

          <div className="profile-item">
            <span>Timezone</span>
            <strong>
              {student.timezone || "Not provided"}
            </strong>
          </div>

        </div>

      </div>


      {/* ACADEMIC INFORMATION */}
      <div className="profile-section">

        <h2>🎓 Academic Information</h2>

        <div className="profile-grid">

          <div className="profile-item">
            <span>Class</span>
            <strong>
              {student.class || "Not provided"}
            </strong>
          </div>

          <div className="profile-item">
            <span>Group</span>
            <strong>
              {student.group || "Not provided"}
            </strong>
          </div>

          <div className="profile-item">
            <span>Syllabus</span>
            <strong>
              {student.syllabus || "Not provided"}
            </strong>
          </div>

          <div className="profile-item">
            <span>EMIS Number</span>
            <strong>
              {student.emisNumber || "Not provided"}
            </strong>
          </div>

        </div>

      </div>


      {/* ACCOUNT INFORMATION */}
      <div className="profile-section">

        <h2>🔐 Account Information</h2>

        <div className="profile-grid">

          <div className="profile-item">
            <span>Approval Status</span>
            <strong className="status-badge">
              {student.approvalStatus || "Pending"}
            </strong>
          </div>

          <div className="profile-item">
            <span>Account Status</span>
            <strong
              className={
                student.isActive === false
                  ? "status-badge inactive"
                  : "status-badge active"
              }
            >
              {student.isActive === false
                ? "Inactive"
                : "Active"}
            </strong>
          </div>

          <div className="profile-item">
            <span>Payment Status</span>
            <strong>
              {student.status || "Not available"}
            </strong>
          </div>

          <div className="profile-item">
            <span>Activation Request</span>
            <strong>
              {student.activationRequested
                ? "Requested"
                : "No Request"}
            </strong>
          </div>

        </div>

      </div>


      {/* STUDENT ID */}
      <div className="profile-section">

        <h2>🆔 Registration Information</h2>

        <div className="profile-grid">

          <div className="profile-item">
            <span>Student ID</span>
            <strong>
              {student._id || student.id || "Not available"}
            </strong>
          </div>

          <div className="profile-item">
            <span>Registered On</span>
            <strong>
              {student.createdAt
                ? new Date(
                    student.createdAt
                  ).toLocaleDateString()
                : "Not available"}
            </strong>
          </div>

          <div className="profile-item">
            <span>Last Updated</span>
            <strong>
              {student.updatedAt
                ? new Date(
                    student.updatedAt
                  ).toLocaleDateString()
                : "Not available"}
            </strong>
          </div>

        </div>

      </div>


      {/* DOCUMENT */}
      {student.proof && (
        <div className="profile-section">

          <h2>📄 Registration Document</h2>

          <a
            href={student.proof}
            target="_blank"
            rel="noopener noreferrer"
            className="view-document-btn"
          >
            View Uploaded Document
          </a>

        </div>
      )}

    </div>
  );
};

export default StudentProfile;