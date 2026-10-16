
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import API_BASE_URL from "../config/api";
import instituteQR from "../assets/tuition-qr.jpg";
import "../styles/feePayment.css";

const FeePayment = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [className, setClassName] = useState(
    location.state?.className || "--"
  );

  const [monthlyFee, setMonthlyFee] = useState(
    Number(location.state?.monthlyFee || 0)
  );

  const [payment, setPayment] = useState(
    location.state?.payment || null
  );

  const [transactionReference, setTransactionReference] =
    useState("");

  const [paymentMethod] = useState("QR");
  const [studentUpiId, setStudentUpiId] = useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showQRViewer, setShowQRViewer] = useState(false);
  const [paymentStep, setPaymentStep] = useState(1);

  /* =========================================================
     LOAD CURRENT PAYMENT
  ========================================================= */

  useEffect(() => {
    const loadCurrentPayment = async () => {
      try {
        const storedStudent = localStorage.getItem("user");

        if (!storedStudent) {
          console.error("Student data not found");
          setLoading(false);
          return;
        }

        const student = JSON.parse(storedStudent);

        const studentId =
          student._id ||
          student.id ||
          student.studentId;

        if (!studentId) {
          console.error("Student ID not found");
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

        console.log("CURRENT PAYMENT API RESPONSE:", data);

        if (!response.ok || !data.success) {
          console.error(
            "Failed to load current payment:",
            data.message
          );
          return;
        }

        if (data.student?.className) {
          setClassName(`Class ${data.student.className}`);
        }

        if (data.fee?.monthlyFee !== undefined) {
          setMonthlyFee(Number(data.fee.monthlyFee));
        }

        if (data.payment) {
          setPayment(data.payment);
        }
      } catch (error) {
        console.error("Current payment error:", error);
      } finally {
        setLoading(false);
      }
    };

    loadCurrentPayment();
  }, []);

  /* =========================================================
     PAYMENT MONTH
  ========================================================= */

  const paymentMonth = new Date().toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });

  /* =========================================================
     QR VIEWER
  ========================================================= */

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setShowQRViewer(false);
      }
    };

    if (showQRViewer) {
      window.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [showQRViewer]);

  const openQRViewer = () => setShowQRViewer(true);
  const closeQRViewer = () => setShowQRViewer(false);

  /* =========================================================
     DOWNLOAD RECEIPT
  ========================================================= */

  const downloadReceipt = async () => {
    if (!payment?._id) {
      alert("Payment ID not available");
      return;
    }

    const storedStudent = localStorage.getItem("user");

    if (!storedStudent) {
      alert("Student data not found");
      return;
    }

    const student = JSON.parse(storedStudent);
    const studentId =
      student._id || student.id || student.studentId;

    if (!studentId) {
      alert("Student ID not found");
      return;
    }

    const token = localStorage.getItem("token");

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/payments/student/${studentId}/payment/${payment._id}/receipt`,
        {
          headers: {
            ...(token
              ? { Authorization: `Bearer ${token}` }
              : {}),
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || "Failed to generate receipt"
        );
      }

      const blob = await response.blob();
      const contentDisposition =
        response.headers.get("Content-Disposition");

      let filename = `receipt-${payment._id}.pdf`;

      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match) filename = match[1];
      }

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = filename;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download receipt error:", error);
      alert(error.message || "Failed to download receipt");
    }
  };

  /* =========================================================
     VALIDATE UPI ID AND GO TO STEP 2
  ========================================================= */

  const goToScanAndPay = () => {
    const upiId = studentUpiId.trim();

    const upiRegex =
      /^[a-zA-Z0-9._-]{2,}@[a-zA-Z]{2,}$/;

    if (!upiRegex.test(upiId)) {
      alert(
        "Please enter a valid UPI ID, for example username@upi."
      );
      return;
    }

    if (monthlyFee <= 0) {
      alert("Invalid payment amount.");
      return;
    }

    setStudentUpiId(upiId);
    setPaymentStep(2);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  /* =========================================================
     SUBMIT PAYMENT
  ========================================================= */

  const handleSubmitPayment = async () => {
    if (!transactionReference.trim()) {
      alert("Please enter the transaction reference / UTR number.");
      return;
    }

    const upiRegex =
      /^[a-zA-Z0-9._-]{2,}@[a-zA-Z]{2,}$/;

    if (!upiRegex.test(studentUpiId.trim())) {
      alert("Please enter a valid UPI ID.");
      setPaymentStep(1);
      return;
    }

    if (monthlyFee <= 0) {
      alert("Invalid payment amount.");
      return;
    }

    try {
      setSubmitting(true);

      const storedStudent = localStorage.getItem("user");

      if (!storedStudent) {
        alert("Student data not found.");
        return;
      }

      const student = JSON.parse(storedStudent);

      const studentId =
        student._id || student.id || student.studentId;

      if (!studentId) {
        alert("Student ID not found.");
        return;
      }

      const token = localStorage.getItem("token");

      const requestBody = {
        transactionReference: transactionReference.trim(),
        paymentMethod,
        studentUpiId: studentUpiId.trim(),
      };

      const response = await fetch(
        `${API_BASE_URL}/api/payments/student/${studentId}/submit`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token
              ? { Authorization: `Bearer ${token}` }
              : {}),
          },
          body: JSON.stringify(requestBody),
        }
      );

      const data = await response.json();

      console.log("PAYMENT SUBMISSION RESPONSE:", data);

      if (!response.ok || !data.success) {
        alert(data.message || "Payment submission failed.");
        return;
      }

      if (data.payment) {
        setPayment(data.payment);
      }

      setPaymentStep(3);

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (error) {
      console.error("Payment submission error:", error);
      alert("Something went wrong while submitting the payment.");
    } finally {
      setSubmitting(false);
    }
  };

  /* =========================================================
     SHARED PAGE HEADER
  ========================================================= */

  const renderHeader = (amountLabel = "Amount to Pay") => (
    <>
      <div className="payment-header">
        <h2>Monthly Tuition Fee</h2>
        <p>
          {className} • {paymentMonth}
        </p>
      </div>

      <div className="payment-amount-section">
        <span>{amountLabel}</span>
        <h1>₹{monthlyFee.toLocaleString("en-IN")}</h1>
      </div>
    </>
  );

  /* =========================================================
     SHARED STEP INDICATOR
  ========================================================= */

  const renderStepIndicator = () => (
    <div className="payment-step-indicator">
      <span
        className={`payment-step ${
          paymentStep === 1
            ? "active"
            : paymentStep > 1
              ? "completed"
              : ""
        }`}
      >
        {paymentStep > 1 ? "✓ " : "1. "}Payment Details
      </span>

      <span
        className={`payment-step ${
          paymentStep === 2
            ? "active"
            : paymentStep > 2
              ? "completed"
              : ""
        }`}
      >
        {paymentStep > 2 ? "✓ " : "2. "}Scan & Pay
      </span>

      <span
        className={`payment-step ${
          paymentStep === 3 ? "active" : ""
        }`}
      >
        3. Confirmation
      </span>
    </div>
  );

  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
    return (
      <div className="fee-payment-page">
        <div className="monthly-payment-container">
          <div className="payment-loading">
            Loading payment details...
          </div>
        </div>
      </div>
    );
  }

  /* =========================================================
     PAYMENT ALREADY SUBMITTED
  ========================================================= */

  if (payment?.status === "Submitted") {
    return (
      <div className="fee-payment-page">
        <div className="monthly-payment-container">
          <div className="payment-card">
            {renderHeader("Payment Submitted")}

            <div className="payment-status-message submitted">
              <strong>Payment Submitted</strong>
              <p>
                Your payment has been submitted and is
                waiting for admin verification.
              </p>
            </div>

            <button
              type="button"
              className="back-payment-btn"
              onClick={() => navigate("/payments")}
            >
              Back to Payments
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* =========================================================
     PAYMENT ALREADY PAID
  ========================================================= */

  if (payment?.status === "Paid") {
    return (
      <div className="fee-payment-page">
        <div className="monthly-payment-container">
          <div className="payment-card">
            {renderHeader("Amount Paid")}

            <div className="payment-status-message paid">
              <strong>Payment Completed</strong>
              <p>This month's tuition fee has already been paid.</p>
            </div>

            <button
              type="button"
              className="back-payment-btn"
              onClick={downloadReceipt}
              style={{
                marginBottom: "10px",
                backgroundColor: "#2f4b8f",
              }}
            >
              Download Receipt
            </button>

            <button
              type="button"
              className="back-payment-btn"
              onClick={() => navigate("/payments")}
            >
              Back to Payments
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* =========================================================
     MAIN PAYMENT PAGE
  ========================================================= */

  return (
    <div className="fee-payment-page">
      <div className="monthly-payment-container">
        <div className="payment-card">
          {renderHeader(
            paymentStep === 3 ? "Payment Submitted" : "Amount to Pay"
          )}

          {renderStepIndicator()}

          {/* =================================================
              STEP 1: PAYMENT DETAILS
          ================================================= */}

          {paymentStep === 1 && (
            <div className="payment-submission-section">
              <h3>Payment Details</h3>

              <div className="payment-summary-details">
                <p>
                  <strong>Class:</strong> {className}
                </p>
                <p>
                  <strong>Billing Month:</strong> {paymentMonth}
                </p>
                <p>
                  <strong>Tuition Fee:</strong>{" "}
                  ₹{monthlyFee.toLocaleString("en-IN")}
                </p>
                <p>
                  <strong>Payment Method:</strong> UPI QR Code
                </p>
              </div>

              <div className="form-group">
                <label htmlFor="studentUpiId">
                  Your UPI ID
                </label>

                <input
                  id="studentUpiId"
                  type="text"
                  value={studentUpiId}
                  onChange={(event) =>
                    setStudentUpiId(event.target.value)
                  }
                  placeholder="e.g. username@upi"
                  autoComplete="off"
                />

                <p className="upi-id-note">
                  Enter the UPI ID associated with the account
                  you will use to make the payment.
                </p>
              </div>

              <button
                type="button"
                className="submit-payment-btn"
                onClick={goToScanAndPay}
                disabled={monthlyFee <= 0}
              >
                Go to Scan & Pay
              </button>

              <button
                type="button"
                className="back-payment-btn"
                onClick={() => navigate("/payments")}
              >
                Back to Payments
              </button>
            </div>
          )}

          {/* =================================================
              STEP 2: SCAN AND PAY
          ================================================= */}

          {paymentStep === 2 && (
            <div className="payment-submission-section">
              <h3>Scan & Pay</h3>

              <p className="qr-description">
                Open your UPI payment app, scan the institute's
                QR code, and pay the exact amount shown above.
              </p>

              <div className="payment-summary-details">
                <p>
                  <strong>Your UPI ID:</strong> {studentUpiId}
                </p>
                <p>
                  <strong>Amount to Pay:</strong>{" "}
                  ₹{monthlyFee.toLocaleString("en-IN")}
                </p>
              </div>

              <div
                className="qr-code-container"
                onClick={openQRViewer}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" ||
                    event.key === " "
                  ) {
                    event.preventDefault();
                    openQRViewer();
                  }
                }}
                aria-label="Enlarge institute QR code"
              >
                <img
                  src={instituteQR}
                  alt="Institute UPI QR Code"
                  className="qr-code-image"
                />
              </div>

              <p className="qr-payment-note">
                Pay{" "}
                <strong>
                  ₹{monthlyFee.toLocaleString("en-IN")}
                </strong>{" "}
                to the institute account. Your payment will remain
                pending until the admin verifies the transaction.
              </p>

              <div className="form-group">
                <label htmlFor="transactionReference">
                  Transaction Reference / UTR
                </label>

                <input
                  id="transactionReference"
                  type="text"
                  value={transactionReference}
                  onChange={(event) =>
                    setTransactionReference(event.target.value)
                  }
                  placeholder="Enter UTR / Transaction ID after payment"
                  autoComplete="off"
                />
              </div>

              <button
                type="button"
                className="submit-payment-btn"
                onClick={handleSubmitPayment}
                disabled={submitting || monthlyFee <= 0}
              >
                {submitting
                  ? "Submitting..."
                  : "Submit Payment"}
              </button>

              <button
                type="button"
                className="back-payment-btn"
                onClick={() => setPaymentStep(1)}
                disabled={submitting}
              >
                Back to Payment Details
              </button>
            </div>
          )}

          {/* =================================================
              STEP 3: PAYMENT CONFIRMATION
          ================================================= */}

          {paymentStep === 3 && (
            <div className="payment-submission-section">
              <div className="payment-status-message submitted">
                <strong>Payment Submitted Successfully!</strong>

                <p>
                  Your payment details have been submitted
                  successfully and are waiting for admin
                  verification.
                </p>

                <p>
                  Your payment will not be marked as paid until
                  the admin verifies the transaction.
                </p>

                <p>
                  <strong>Class:</strong> {className}
                </p>

                <p>
                  <strong>Amount Submitted:</strong>{" "}
                  ₹{monthlyFee.toLocaleString("en-IN")}
                </p>

                <p>
                  <strong>Transaction Reference:</strong>{" "}
                  {transactionReference.trim()}
                </p>

                <p>
                  <strong>Status:</strong> Pending Verification
                </p>
              </div>

              <button
                type="button"
                className="back-payment-btn"
                onClick={() => navigate("/payments")}
              >
                Back to Payments
              </button>
            </div>
          )}
        </div>
      </div>

      {/* =====================================================
          ENLARGED QR CODE VIEWER
      ===================================================== */}

      {showQRViewer && (
        <div
          className="qr-viewer-overlay"
          onClick={closeQRViewer}
          role="dialog"
          aria-modal="true"
          aria-label="Enlarged QR Code"
        >
          <div
            className="qr-viewer-content"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="qr-viewer-close"
              onClick={closeQRViewer}
              aria-label="Close QR Code Viewer"
            >
              &times;
            </button>

            <img
              src={instituteQR}
              alt="Institute UPI QR Code - Enlarged"
              className="qr-viewer-image"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default FeePayment;
