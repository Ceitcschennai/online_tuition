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

  const [paymentScreenshot, setPaymentScreenshot] =
    useState(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [showQRViewer, setShowQRViewer] = useState(false);

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

        const token =
          localStorage.getItem("token");

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

        console.log(
          "CURRENT PAYMENT API RESPONSE:",
          data
        );

        if (!response.ok || !data.success) {
          console.error(
            "Failed to load current payment:",
            data.message
          );

          setLoading(false);
          return;
        }

        /* -----------------------------------------------------
           CURRENT CLASS
        ----------------------------------------------------- */

        if (data.student?.className) {
          setClassName(
            `Class ${data.student.className}`
          );
        }

        /* -----------------------------------------------------
           CURRENT FEE
        ----------------------------------------------------- */

        if (data.fee?.monthlyFee !== undefined) {
          setMonthlyFee(
            Number(data.fee.monthlyFee)
          );
        }

        /* -----------------------------------------------------
           CURRENT PAYMENT
        ----------------------------------------------------- */

        if (data.payment) {
          setPayment(data.payment);
        }

      } catch (error) {
        console.error(
          "Current payment error:",
          error
        );
      } finally {
        setLoading(false);
      }
    };

    loadCurrentPayment();
  }, []);

  /* =========================================================
     PAYMENT MONTH
  ========================================================= */

  const paymentMonth = new Date().toLocaleString(
    "en-US",
    {
      month: "long",
      year: "numeric"
    }
  );

  /* =========================================================
     QR VIEWER OVERLAY
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

  const openQRViewer = () => {
    setShowQRViewer(true);
  };

  const closeQRViewer = () => {
    setShowQRViewer(false);
  };

  /* =========================================================
     DOWNLOAD RECEIPT (Student)
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
    const studentId = student._id || student.id || student.studentId;

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
        throw new Error(errorData.message || "Failed to generate receipt");
      }

      // Get the PDF blob
      const blob = await response.blob();
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = `receipt-${payment._id}.pdf`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match) filename = match[1];
      }

      // Create download link
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
     SCREENSHOT SELECT
  ========================================================= */

  const handleScreenshotChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      setPaymentScreenshot(null);
      return;
    }

    /* Only allow image files */
    if (!file.type.startsWith("image/")) {
      alert("Please select a valid image file.");
      event.target.value = "";
      setPaymentScreenshot(null);
      return;
    }

    setPaymentScreenshot(file);
  };

  /* =========================================================
     SUBMIT PAYMENT
  ========================================================= */

  const handleSubmitPayment = async () => {
    /* -------------------------------------------------------
       Validate UTR
    ------------------------------------------------------- */

    if (!transactionReference.trim()) {
      alert(
        "Please enter the transaction reference / UTR number."
      );
      return;
    }

    /* -------------------------------------------------------
       Validate Screenshot
    ------------------------------------------------------- */

    if (!paymentScreenshot) {
      alert(
        "Please upload the payment screenshot."
      );
      return;
    }

    /* -------------------------------------------------------
       Validate Fee
    ------------------------------------------------------- */

    if (monthlyFee <= 0) {
      alert(
        "Invalid payment amount."
      );
      return;
    }

    try {
      setSubmitting(true);

      const storedStudent =
        localStorage.getItem("user");

      if (!storedStudent) {
        alert("Student data not found.");
        setSubmitting(false);
        return;
      }

      const student =
        JSON.parse(storedStudent);

      const studentId =
        student._id ||
        student.id ||
        student.studentId;

      if (!studentId) {
        alert("Student ID not found.");
        setSubmitting(false);
        return;
      }

      const token =
        localStorage.getItem("token");

      /* -----------------------------------------------------
         Convert Screenshot to Base64
       ----------------------------------------------------- */

      const reader = new FileReader();

      reader.onload = async () => {
        try {
          const screenshotBase64 =
            reader.result;

          /* -------------------------------------------------
             Send Payment Submission
           ------------------------------------------------- */

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

              body: JSON.stringify({
                transactionReference:
                  transactionReference.trim(),

                paymentScreenshot:
                  screenshotBase64
              })
            }
          );

          const data =
            await response.json();

          console.log(
            "PAYMENT SUBMISSION RESPONSE:",
            data
          );

          if (!response.ok || !data.success) {
            alert(
              data.message ||
                "Payment submission failed."
            );

            return;
          }

          /* -------------------------------------------------
             Success
          ------------------------------------------------- */

          alert(
            "Payment submitted successfully! Admin will verify your payment."
          );

          navigate("/payments");

        } catch (error) {
          console.error(
            "Payment submission error:",
            error
          );

          alert(
            "Something went wrong while submitting the payment."
          );

        } finally {
          setSubmitting(false);
        }
      };

      /* -------------------------------------------------------
         File Reader Error
      ------------------------------------------------------- */

      reader.onerror = () => {
        alert(
          "Unable to read the payment screenshot."
        );

        setSubmitting(false);
      };

      reader.readAsDataURL(
        paymentScreenshot
      );

    } catch (error) {
      console.error(
        "Payment error:",
        error
      );

      alert(
        "Something went wrong. Please try again."
      );

      setSubmitting(false);
    }
  };

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

            <div className="payment-header">
              <h2>
                Monthly Tuition Fee
              </h2>

              <p>
                {className} • {paymentMonth}
              </p>
            </div>

            <div className="payment-amount-section">
              <span>
                Amount to Pay
              </span>

              <h1>
                ₹{monthlyFee.toLocaleString("en-IN")}
              </h1>
            </div>

            <div className="payment-status-message submitted">
              <strong>
                Payment Submitted
              </strong>

              <p>
                Your payment has already been submitted
                and is waiting for admin verification.
              </p>
            </div>

            <button
              type="button"
              className="back-payment-btn"
              onClick={() =>
                navigate("/payments")
              }
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

            <div className="payment-header">
              <h2>
                Monthly Tuition Fee
              </h2>

              <p>
                {className} • {paymentMonth}
              </p>
            </div>

            <div className="payment-amount-section">
              <span>
                Amount Paid
              </span>

              <h1>
                ₹{monthlyFee.toLocaleString("en-IN")}
              </h1>
            </div>

            <div className="payment-status-message paid">
              <strong>
                Payment Completed
              </strong>

              <p>
                This month's tuition fee has already
                been paid.
              </p>
            </div>

            <button
              type="button"
              className="back-payment-btn"
              onClick={downloadReceipt}
              style={{ marginBottom: "10px", backgroundColor: "#2f4b8f" }}
            >
              Download Receipt
            </button>

            <button
              type="button"
              className="back-payment-btn"
              onClick={() =>
                navigate("/payments")
              }
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

          {/* =================================================
              HEADER
          ================================================= */}

          <div className="payment-header">

            <h2>
              Monthly Tuition Fee
            </h2>

            <p>
              {className} • {paymentMonth}
            </p>

          </div>


          {/* =================================================
              AMOUNT
          ================================================= */}

          <div className="payment-amount-section">

            <span>
              Amount to Pay
            </span>

            <h1>
              ₹{monthlyFee.toLocaleString("en-IN")}
            </h1>

          </div>


          {/* =================================================
              QR PAYMENT
          ================================================= */}

          <div className="qr-payment-section">

            <h3>
              Scan & Pay
            </h3>

            <p className="qr-description">
              Scan the institute QR code using
              any UPI payment app.
            </p>

            <div className="qr-code-container" onClick={openQRViewer} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openQRViewer(); } }}>

              <img
                src={instituteQR}
                alt="Institute UPI QR Code"
                className="qr-code-image"
              />

            </div>

            <p className="qr-payment-note">

              Pay exactly{" "}

              <strong>
                ₹{monthlyFee.toLocaleString("en-IN")}
              </strong>

              {" "}to the institute account and Admin will verify and confirm your payment. You will receive a mail with receipt once the payment is verified.

            </p>

          </div>


          {/* =================================================
              PAYMENT DETAILS
          ================================================= */}

          <div className="payment-submission-section">

            <h3>
              Payment Details
            </h3>


            {/* =================================================
                UTR
            ================================================= */}

            <div className="form-group">

              <label htmlFor="transactionReference">
                Transaction Reference / UTR
              </label>

              <input
                id="transactionReference"
                type="text"
                value={transactionReference}
                onChange={(event) =>
                  setTransactionReference(
                    event.target.value
                  )
                }
                placeholder="Enter UTR / Transaction ID"
                autoComplete="off"
              />

            </div>


            {/* =================================================
                SCREENSHOT
            ================================================= */}

            <div className="form-group">

              <label htmlFor="paymentScreenshot">
                Payment Screenshot
              </label>

              <input
                id="paymentScreenshot"
                type="file"
                accept="image/*"
                onChange={
                  handleScreenshotChange
                }
              />

              {paymentScreenshot && (
                <div className="selected-file">

                  <span>
                    Selected:
                  </span>

                  <strong>
                    {paymentScreenshot.name}
                  </strong>

                </div>
              )}

            </div>


            {/* =================================================
                SUBMIT BUTTON
            ================================================= */}

            <button
              type="button"
              className="submit-payment-btn"
              onClick={handleSubmitPayment}
              disabled={
                submitting ||
                monthlyFee <= 0
              }
            >

              {submitting
                ? "Submitting..."
                : "Submit Payment"}

            </button>

          </div>


          {/* =================================================
              BACK BUTTON
          ================================================= */}

          <button
            type="button"
            className="back-payment-btn"
            onClick={() =>
              navigate("/payments")
            }
          >
            Back to Payments
          </button>
</div>

      </div>

      {showQRViewer && (
        <div
          className="qr-viewer-overlay"
          onClick={closeQRViewer}
          role="dialog"
          aria-modal="true"
          aria-label="Enlarged QR Code"
        >
          <div className="qr-viewer-content" onClick={(e) => e.stopPropagation()}>
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