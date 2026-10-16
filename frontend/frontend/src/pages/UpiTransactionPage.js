import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import API_BASE_URL from "../config/api";
import "../styles/upiTransactionPage.css";

const UpiTransactionPage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [className] = useState(
    location.state?.className || "--"
  );
  const [monthlyFee, setMonthlyFee] = useState(
    Number(location.state?.monthlyFee || 0)
  );
  const [payment, setPayment] = useState(
    location.state?.payment || null
  );
  const [courseName, setCourseName] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStudentCourseDetails = async () => {
      try {
        const storedStudent = localStorage.getItem("user");

        if (!storedStudent) {
          setLoading(false);
          return;
        }

        const student = JSON.parse(storedStudent);

        const studentId =
          student._id ||
          student.id ||
          student.studentId;

        if (!studentId) {
          setLoading(false);
          return;
        }

        const token = localStorage.getItem("token");

        const response = await fetch(
          `${API_BASE_URL}/api/payments/student/${studentId}/current`,
          {
            headers: {
              ...(token
                ? { Authorization: `Bearer ${token}` }
                : {}),
            },
          }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
          console.error(
            "Failed to load course details:",
            data.message
          );
          setLoading(false);
          return;
        }

        if (data.student?.className) {
          const classNum = data.student.className;
          setCourseName(`CEITCS Online Tuition - Class ${classNum}`);
          setCourseCode(`CEITCS-CLASS-${classNum}`);
        }

        if (data.fee?.monthlyFee !== undefined) {
          setMonthlyFee(Number(data.fee.monthlyFee));
        }

        if (data.payment) {
          setPayment(data.payment);
        }
      } catch (error) {
        console.error("Course details error:", error);
      } finally {
        setLoading(false);
      }
    };

    loadStudentCourseDetails();
  }, []);

  const handleUpiTransaction = () => {
    navigate("/fee-payment", {
      replace: true,
      state: {
        className,
        monthlyFee,
        payment,
      },
    });
  };

  const handleBack = () => {
    navigate("/payments", { replace: true });
  };

  if (loading) {
    return (
      <div className="upi-transaction-page">
        <div className="upi-transaction-container">
          <div className="upi-loading">Loading course details...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="upi-transaction-page">
      <div className="upi-transaction-container">
        <div className="upi-card">
          <div className="upi-header">
            <button
              type="button"
              className="upi-back-btn"
              onClick={handleBack}
              aria-label="Back to Payments"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="upi-page-title">Pay Course Fee</h1>
          </div>

          <div className="upi-course-details">
            <div className="upi-detail-row">
              <span className="upi-detail-label">Course Name</span>
              <span className="upi-detail-value">{courseName || className}</span>
            </div>
            <div className="upi-detail-row">
              <span className="upi-detail-label">Course Code</span>
              <span className="upi-detail-value">{courseCode || "CEITCS-TUITION"}</span>
            </div>
            <div className="upi-detail-row upi-fee-row">
              <span className="upi-detail-label">Course Fee</span>
              <span className="upi-detail-value upi-fee-value">
                ₹{monthlyFee.toLocaleString("en-IN")}
              </span>
            </div>
          </div>

          <p className="upi-explanatory-text">
            Amount shown is the institute-configured course fee.
          </p>

          <div className="upi-payment-section">
            <h2 className="upi-section-title">Pay using UPI</h2>

            <button
              type="button"
              className="upi-transaction-btn"
              onClick={handleUpiTransaction}
              disabled={monthlyFee <= 0}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="upi-btn-icon"
              >
                <rect
                  x="1"
                  y="4"
                  width="22"
                  height="16"
                  rx="2"
                  ry="2"
                />
                <line x1="1" y1="10" x2="23" y2="10" />
              </svg>
              UPI Transaction
            </button>

            <p className="upi-note">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="upi-note-icon"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              <span>
                QR code payment requires manual admin verification. Your payment request
                will remain pending until approved by the admin.
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpiTransactionPage;