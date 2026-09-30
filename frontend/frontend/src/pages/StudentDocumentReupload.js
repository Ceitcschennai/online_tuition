import React, { useEffect, useState } from "react";
import axios from "axios";

const API_BASE_URL =
  process.env.REACT_APP_API_URL || "";

const StudentDocumentReupload = () => {

  const [student, setStudent] = useState(null);
  const [proof, setProof] = useState(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const searchParams = new URLSearchParams(
    window.location.search
  );

  const reuploadToken =
    searchParams.get("reuploadToken");

  /* =====================================================
     LOAD STUDENT DETAILS
  ===================================================== */

  useEffect(() => {

    const loadStudent = async () => {

      if (!reuploadToken) {

        setError(
          "Invalid document re-upload link."
        );

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

          setError(
            "Unable to load your student details."
          );

        }

      } catch (err) {

        console.error(
          "Load re-upload details error:",
          err
        );

        setError(
          err.response?.data?.message ||
          "Invalid or expired document re-upload link."
        );

      } finally {

        setLoading(false);

      }

    };

    loadStudent();

  }, [reuploadToken]);


  /* =====================================================
     FILE CHANGE
  ===================================================== */

  const handleFileChange = (event) => {

    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    setProof(file);
    setError("");
    setSuccess("");

  };


  /* =====================================================
     SUBMIT DOCUMENT
  ===================================================== */

  const handleSubmit = async (event) => {

    event.preventDefault();

    setError("");
    setSuccess("");

    if (!proof) {

      setError(
        "Please upload your new ID proof."
      );

      return;
    }

    try {

      setSubmitting(true);

      const formData =
        new FormData();

      formData.append(
        "proof",
        proof
      );

      const response =
        await axios.post(
          `${API_BASE_URL}/api/student/document-reupload/${reuploadToken}`,
          formData,
          {
            headers: {
              "Content-Type":
                "multipart/form-data"
            }
          }
        );

      setSuccess(
        response.data?.message ||
        "Document uploaded successfully."
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

      setError(
        err.response?.data?.message ||
        "Failed to upload the document. Please try again."
      );

    } finally {

      setSubmitting(false);

    }

  };


  /* =====================================================
     LOADING
  ===================================================== */

  if (loading) {

    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f4f8ff",
          padding: "20px"
        }}
      >

        <div
          style={{
            background: "#ffffff",
            padding: "35px",
            borderRadius: "14px",
            boxShadow:
              "0 8px 30px rgba(0,0,0,0.08)",
            textAlign: "center"
          }}
        >

          <h2>
            Loading...
          </h2>

          <p>
            Please wait while we load your
            student details.
          </p>

        </div>

      </div>
    );

  }


  /* =====================================================
     MAIN PAGE
  ===================================================== */

  return (

    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg, #eef6ff, #ffffff)",
        padding: "40px 20px"
      }}
    >

      <div
        style={{
          maxWidth: "700px",
          margin: "0 auto",
          background: "#ffffff",
          borderRadius: "18px",
          padding: "35px",
          boxShadow:
            "0 10px 35px rgba(0,0,0,0.10)"
        }}
      >

        {/* =================================================
            HEADER
        ================================================= */}

        <div
          style={{
            textAlign: "center",
            marginBottom: "30px"
          }}
        >

          <div
            style={{
              fontSize: "45px",
              marginBottom: "10px"
            }}
          >
            📄
          </div>

          <h1
            style={{
              margin: 0,
              color: "#1f3c88",
              fontSize: "28px"
            }}
          >
            Document Re-upload
          </h1>

          <p
            style={{
              color: "#666",
              marginTop: "10px",
              lineHeight: "1.6"
            }}
          >
            Please upload a new valid ID proof
            for verification.
          </p>

        </div>


        {/* =================================================
            ERROR
        ================================================= */}

        {error && (

          <div
            style={{
              background: "#fff1f1",
              border: "1px solid #ffcccc",
              color: "#c62828",
              padding: "14px 16px",
              borderRadius: "8px",
              marginBottom: "20px"
            }}
          >
            {error}
          </div>

        )}


        {/* =================================================
            SUCCESS
        ================================================= */}

        {success && (

          <div
            style={{
              background: "#effaf0",
              border: "1px solid #b7dfb9",
              color: "#237a2a",
              padding: "16px",
              borderRadius: "8px",
              marginBottom: "20px",
              lineHeight: "1.6"
            }}
          >

            <strong>
              ✓ Document submitted successfully
            </strong>

            <br />

            {success}

            <br />
            <br />

            Your account is now waiting for
            administrator verification.

          </div>

        )}


        {student && !success && (

          <form
            onSubmit={handleSubmit}
          >

            {/* =============================================
                STUDENT DETAILS
            ============================================= */}

            <div
              style={{
                background: "#f7faff",
                border:
                  "1px solid #dce8ff",
                borderRadius: "12px",
                padding: "20px",
                marginBottom: "25px"
              }}
            >

              <h3
                style={{
                  marginTop: 0,
                  color: "#1f3c88"
                }}
              >
                Student Details
              </h3>


              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: "15px"
                }}
              >

                <div>
                  <strong>
                    Name
                  </strong>

                  <p>
                    {student.title || ""}
                    {" "}
                    {student.firstName || ""}
                    {" "}
                    {student.lastName || ""}
                  </p>
                </div>


                <div>
                  <strong>
                    Email
                  </strong>

                  <p>
                    {student.email || "-"}
                  </p>
                </div>


                <div>
                  <strong>
                    Mobile
                  </strong>

                  <p>
                    {student.mobile || "-"}
                  </p>
                </div>


                <div>
                  <strong>
                    Class
                  </strong>

                  <p>
                    {student.studentClass || "-"}
                  </p>
                </div>


                <div>
                  <strong>
                    Syllabus
                  </strong>

                  <p>
                    {student.syllabus || "-"}
                  </p>
                </div>


                <div>
                  <strong>
                    EMIS Number
                  </strong>

                  <p>
                    {student.emisNumber || "-"}
                  </p>
                </div>

              </div>

            </div>


            {/* =============================================
                DOCUMENT UPLOAD
            ============================================= */}

            <div
              style={{
                marginBottom: "25px"
              }}
            >

              <label
                htmlFor="student-reupload-proof"
                style={{
                  display: "block",
                  fontWeight: "600",
                  marginBottom: "10px",
                  color: "#333"
                }}
              >
                Upload New ID Proof
              </label>


              <input
                id="student-reupload-proof"
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                onChange={
                  handleFileChange
                }
                disabled={submitting}
                style={{
                  width: "100%",
                  padding: "12px",
                  border:
                    "1px solid #ccd6e5",
                  borderRadius: "8px",
                  background: "#ffffff",
                  boxSizing: "border-box"
                }}
              />


              <small
                style={{
                  display: "block",
                  marginTop: "8px",
                  color: "#777"
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
              disabled={submitting}
              style={{
                width: "100%",
                border: "none",
                borderRadius: "9px",
                padding: "14px",
                background:
                  submitting
                    ? "#9bb8dc"
                    : "#1683f7",
                color: "#ffffff",
                fontSize: "16px",
                fontWeight: "600",
                cursor:
                  submitting
                    ? "not-allowed"
                    : "pointer"
              }}
            >

              {submitting
                ? "Uploading..."
                : "Submit New Document"}

            </button>

          </form>

        )}

      </div>

    </div>

  );

};

export default StudentDocumentReupload;