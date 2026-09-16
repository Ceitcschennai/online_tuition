import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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

        const API_BASE_URL =
          process.env.REACT_APP_API_URL;

        const response = await fetch(
          `${API_BASE_URL}/api/payments/student/${studentId}/current`
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

      const API_BASE_URL =
        process.env.REACT_APP_API_URL;

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
                "Content-Type": "application/json"
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

            <div className="qr-code-container">

              <img
                src="/images/institute-qr.png"
                alt="Institute UPI QR Code"
                className="qr-code-image"
              />

            </div>

            <p className="qr-payment-note">

              Pay exactly{" "}

              <strong>
                ₹{monthlyFee.toLocaleString("en-IN")}
              </strong>

              {" "}to the institute account.

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

    </div>
  );
};

export default FeePayment;