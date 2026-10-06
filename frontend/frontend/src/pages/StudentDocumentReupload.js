import React, { useEffect, useState } from "react";
import axios from "axios";

import Navbar from "../components/Navbar";
import API_BASE_URL from "../config/api";

import {
  FaUserPlus,
  FaEnvelope,
  FaPhoneAlt,
  FaIdCard,
  FaUpload,
  FaCheck,
  FaTimes,
} from "react-icons/fa";

import "../styles/register.css";

/* =========================================================
   DROPDOWN OPTIONS
======================================================== */

const TITLE_OPTIONS = [
  "Mr.",
  "Mrs.",
  "Ms.",
  "Dr.",
];

const SYLLABUS_OPTIONS = [
  "Matric",
  "CBSE",
  "ICSE",
  "State Board",
];

const CLASS_OPTIONS = [
  "Class 5",
  "Class 6",
  "Class 7",
  "Class 8",
  "Class 9",
  "Class 10",
  "Class 11",
  "Class 12",
  "Others",
];

const TIMEZONE_OPTIONS = [
  "IST (GMT +5:30)",
  "GMT (GMT +0:00)",
  "EST (GMT -5:00)",
  "PST (GMT -8:00)",
  "CET (GMT +1:00)",
  "GST (GMT +4:00)",
];

/* =========================================================
   STUDENT DOCUMENT RE-UPLOAD COMPONENT
======================================================== */

const StudentDocumentReupload = () => {
  const [student, setStudent] = useState(null);
  const [proof, setProof] = useState(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [popup, setPopup] = useState({
    show: false,
    type: "",
    title: "",
    message: "",
  });

  const searchParams = new URLSearchParams(
    window.location.search
  );

  const reuploadToken =
    searchParams.get("reuploadToken");

  /* =======================================================
      BODY CLASS
   ======================================================= */

  useEffect(() => {
    document.body.classList.add(
      "register-active"
    );

    return () => {
      document.body.classList.remove(
        "register-active"
      );
    };
  }, []);

  /* =======================================================
      LOAD STUDENT DETAILS
   ======================================================= */

  useEffect(() => {
    const loadStudent = async () => {
      if (!reuploadToken) {
        setPopup({
          show: true,
          type: "error",
          title: "Invalid Link",
          message:
            "This document re-upload link is invalid or expired.",
        });

        setLoading(false);

        return;
      }

      try {
        const response = await axios.get(
          `${API_BASE_URL}/api/student/document-reupload/${reuploadToken}`
        );

        if (
          response.data?.success &&
          response.data?.student
        ) {
          setStudent(
            response.data.student
          );
        } else {
          setPopup({
            show: true,
            type: "error",
            title: "Unable to Load",
            message:
              "Unable to load your student details.",
          });
        }
      } catch (err) {
        console.error(
          "Load re-upload details error:",
          err
        );

        setPopup({
          show: true,
          type: "error",
          title: "Unable to Load",
          message:
            err.response?.data?.message ||
            "Invalid or expired document re-upload link.",
        });
      } finally {
        setLoading(false);
      }
    };

    loadStudent();
  }, [reuploadToken]);

  /* =======================================================
      SHOW POPUP
   ======================================================= */

  const showPopup = (type, title, message) => {
    setPopup({
      show: true,
      type,
      title,
      message,
    });
  };

  const closePopup = () => {
    setPopup({
      show: false,
      type: "",
      title: "",
      message: "",
    });
  };

  /* =======================================================
      FILE CHANGE
   ======================================================= */

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setProof(file);
  };

  /* =======================================================
      SUBMIT DOCUMENT
   ======================================================= */

  const handleSubmit = async (event) => {
    event.preventDefault();

    closePopup();

    if (!proof) {
      showPopup(
        "error",
        "Upload Required",
        "Please upload your new ID proof."
      );

      return;
    }

    try {
      setSubmitting(true);

      const formData = new FormData();

      formData.append("proof", proof);

      const response =
        await axios.post(
          `${API_BASE_URL}/api/student/document-reupload/${reuploadToken}`,
          formData,
          {
            headers: {
              "Content-Type":
                "multipart/form-data",
            },
          }
        );

      showPopup(
        "success",
        "Document Re-uploaded",
        response.data?.message ||
          "Your document has been re-uploaded successfully. Please wait for admin review."
      );

      setProof(null);

      const fileInput =
        document.getElementById(
          "student-reupload-proof"
        );

      if (fileInput) {
        fileInput.value = "";
      }
    } catch (err) {
      console.error(
        "Document re-upload error:",
        err
      );

      showPopup(
        "error",
        "Upload Failed",
        err.response?.data?.message ||
          "Failed to upload the document. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  /* =======================================================
      LOADING
   ======================================================= */

  if (loading) {
    return (
      <div className="register-page">
        <Navbar />

        <main className="register-main">
          <div
            className="register-card"
            style={{
              textAlign: "center",
              padding: "50px",
            }}
          >
            <div
              className="button-spinner"
              style={{
                margin: "0 auto 20px",
              }}
            ></div>

            <h2
              style={{
                margin: 0,
                color: "#17233f",
              }}
            >
              Loading...
            </h2>

            <p
              style={{
                color: "#7b879d",
                marginTop: "10px",
              }}
            >
              Please wait while we load your
              student details.
            </p>
          </div>
        </main>
      </div>
    );
  }

  /* =======================================================
      NO STUDENT DATA
   ======================================================= */

  if (!student) {
    return (
      <div className="register-page">
        <Navbar />

        <main className="register-main">
          <div
            className="register-card"
            style={{
              textAlign: "center",
              padding: "50px",
            }}
          >
            <h2
              style={{
                margin: 0,
                color: "#17233f",
              }}
            >
              Student Not Found
            </h2>

            <p
              style={{
                color: "#7b879d",
                marginTop: "10px",
              }}
            >
              Unable to load your student
              details. Please try again later.
            </p>
          </div>
        </main>
      </div>
    );
  }

  /* =======================================================
      MAIN PAGE
   ======================================================= */

  return (
    <div className="register-page">
      <Navbar />

      <main className="register-main">
        <div className="register-card">
          {/* ===============================================
               HEADER
            =============================================== */}

          <div className="register-card-header">
            <div className="register-title-icon">
              <FaUserPlus />
            </div>

            <h1>
              Document Re-upload
            </h1>

            <p>
              Please upload a new valid ID proof
              for verification.
            </p>
          </div>

          {/* ===============================================
               FORM
            =============================================== */}

          <form
            className="register-form"
            onSubmit={handleSubmit}
          >
            {/* =============================================
                 TITLE + FIRST NAME + LAST NAME
            ============================================= */}

            <div className="form-row three-columns">

              <div className="input-group">
                <label>Title</label>

                <select
                  value={
                    student.title || ""
                  }
                  disabled
                >
                  {TITLE_OPTIONS.map(
                    (title) => (
                      <option
                        key={title}
                        value={title}
                      >
                        {title}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div className="input-group">
                <label>First Name</label>

                <input
                  type="text"
                  value={
                    student.firstName ||
                    ""
                  }
                  disabled
                />
              </div>

              <div className="input-group">
                <label>Last Name</label>

                <input
                  type="text"
                  value={
                    student.lastName ||
                    ""
                  }
                  disabled
                />
              </div>

            </div>

            {/* =============================================
                 EMAIL
            ============================================= */}

            <div className="input-group">
              <label>Email Address</label>

              <div className="input-wrapper">
                <FaEnvelope
                  className="input-icon"
                />

                <input
                  type="email"
                  value={
                    student.email || ""
                  }
                  disabled
                />
              </div>
            </div>

            {/* =============================================
                 MOBILE NUMBER
            ============================================= */}

            <div className="input-group">
              <label>Mobile Number</label>

              <div className="input-wrapper">
                <FaPhoneAlt
                  className="input-icon"
                />

                <input
                  type="tel"
                  value={
                    student.mobile ||
                    ""
                  }
                  disabled
                />
              </div>
            </div>

            {/* =============================================
                 SYLLABUS + CLASS
            ============================================= */}

            <div className="form-row">

              <div className="input-group">
                <label>Syllabus</label>

                <select
                  value={
                    student.syllabus ||
                    ""
                  }
                  disabled
                >
                  <option value="">
                    Select syllabus
                  </option>

                  {SYLLABUS_OPTIONS.map(
                    (syllabus) => (
                      <option
                        key={
                          syllabus
                        }
                        value={
                          syllabus
                        }
                      >
                        {syllabus}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div className="input-group">
                <label>Class</label>

                <select
                  value={
                    student.studentClass ||
                    ""
                  }
                  disabled
                >
                  <option value="">
                    Select class
                  </option>

                  {CLASS_OPTIONS.map(
                    (className) => (
                      <option
                        key={
                          className
                        }
                        value={
                          className
                        }
                      >
                        {className}
                      </option>
                    )
                  )}
                </select>
              </div>

            </div>

            {/* =============================================
                 TIMEZONE
            ============================================= */}

            <div className="input-group">
              <label>Timezone</label>

              <select
                value={
                  student.timezone ||
                  ""
                }
                disabled
              >
                <option value="">
                  Select timezone
                </option>

                {TIMEZONE_OPTIONS.map(
                  (timezone) => (
                    <option
                      key={timezone}
                      value={timezone}
                    >
                      {timezone}
                    </option>
                  )
                )}
              </select>
            </div>

            {/* =============================================
                 EMIS NUMBER
            ============================================= */}

            <div className="input-group">
              <label>
                EMIS Number{" "}
                <span className="optional-text">
                  (Optional)
                </span>
              </label>

              <div className="input-wrapper">
                <FaIdCard
                  className="input-icon"
                />

                <input
                  type="text"
                  value={
                    student.emisNumber ||
                    ""
                  }
                  disabled
                />
              </div>
            </div>

            {/* =============================================
                 DOCUMENT UPLOAD
            ============================================= */}

            <div className="input-group">
              <label className="upload-label">
                Upload New ID Proof
              </label>

              <label
                className="upload-box"
                htmlFor="student-reupload-proof"
              >
                <FaUpload
                  className="upload-icon"
                />

                <span className="upload-choose-btn">
                  Choose File
                </span>

                <span className="upload-filename">
                  {proof
                    ? proof.name
                    : "No file chosen"}
                </span>
              </label>

              <input
                id="student-reupload-proof"
                type="file"
                className="upload-input"
                onChange={handleFileChange}
                accept=".pdf,.jpg,.jpeg,.png"
                disabled={submitting}
              />

              <small
                style={{
                  display: "block",
                  marginTop: "8px",
                  color: "#777",
                }}
              >
                Please upload a clear and
                readable document.
              </small>
            </div>

            {/* =============================================
                 SUBMIT BUTTON
            ============================================= */}

            <button
              type="submit"
              className="register-button"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <span className="button-spinner"></span>
                  Uploading...
                </>
              ) : (
                "Submit New Document"
              )}
            </button>

            <div className="register-divider"></div>

            <p className="already-user">
              Already a User{" "}

              <a href="/login">
                Continue Here
              </a>
            </p>

          </form>
        </div>
      </main>

      {/* ===================================================
          POPUP
      =================================================== */}

      {popup.show && (
        <div
          className="register-popup-overlay"
          onClick={closePopup}
        >
          <div
            className="register-popup"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <button
              type="button"
              className="register-popup-close"
              onClick={closePopup}
              aria-label="Close popup"
            >
              <FaTimes />
            </button>

            <div
              className={`register-popup-icon ${popup.type}`}
            >
              {popup.type ===
                "success" ? (
                <FaCheck />
              ) : (
                <FaTimes />
              )}
            </div>

            <h2>{popup.title}</h2>

            <p>{popup.message}</p>

            <button
              type="button"
              className={`register-popup-button ${popup.type}`}
              onClick={closePopup}
            >
              Okay
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDocumentReupload;
