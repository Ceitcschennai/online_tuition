import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/payments.css";

const Payments = () => {
  const navigate = useNavigate();

  const [payment, setPayment] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);

  /* =========================================================
     LOAD CURRENT PAYMENT DETAILS
  ========================================================= */

  useEffect(() => {
    const loadPaymentDetails = async () => {
      try {
        const storedStudent = localStorage.getItem("user");

        if (!storedStudent) {
          setLoading(false);
          return;
        }

        const storedUser = JSON.parse(storedStudent);

        setStudent(storedUser);

        const studentId =
          storedUser._id ||
          storedUser.id ||
          storedUser.studentId;

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

        if (!response.ok || !data.success) {
          console.error(
            "Failed to load payment details:",
            data.message
          );
          return;
        }

        /*
          IMPORTANT:
          Always use the current FeeStructure amount
          returned by the backend.

          This prevents an old monthlyFee value inside
          StudentPayment from being displayed.
        */

        setPayment({
          ...data.payment,
          monthlyFee: Number(
            data.fee?.monthlyFee ??
              data.payment?.monthlyFee ??
              0
          ),
          academicYear:
            data.fee?.academicYear ??
            data.payment?.academicYear,
          paymentMonth:
            data.fee?.paymentMonth ??
            data.payment?.paymentMonth
        });

        /*
          Use the backend class value when available.
        */

        if (data.student) {
          setStudent((previousStudent) => ({
            ...previousStudent,
            ...data.student
          }));
        }
      } catch (error) {
        console.error(
          "Payment details error:",
          error
        );
      } finally {
        setLoading(false);
      }
    };

    loadPaymentDetails();
  }, []);

  /* =========================================================
     LOAD PAYMENT HISTORY
  ========================================================= */

  useEffect(() => {
    const loadPaymentHistory = async () => {
      try {
        const storedStudent = localStorage.getItem("user");

        if (!storedStudent) {
          setHistoryLoading(false);
          return;
        }

        const storedUser = JSON.parse(storedStudent);

        const studentId =
          storedUser._id ||
          storedUser.id ||
          storedUser.studentId;

        if (!studentId) {
          setHistoryLoading(false);
          return;
        }

        const API_BASE_URL =
          process.env.REACT_APP_API_URL;

        const response = await fetch(
          `${API_BASE_URL}/api/payments/student/${studentId}/history`
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
          console.error(
            "Failed to load payment history:",
            data.message
          );
          return;
        }

        setPaymentHistory(
          Array.isArray(data.payments)
            ? data.payments
            : []
        );
      } catch (error) {
        console.error(
          "Payment history error:",
          error
        );
      } finally {
        setHistoryLoading(false);
      }
    };

    loadPaymentHistory();
  }, []);

  /* =========================================================
     FORMAT PAYMENT MONTH
     Example:
     2026-09 -> September 2026
  ========================================================= */

  const formatPaymentMonth = (paymentMonth) => {
    if (!paymentMonth) {
      return "--";
    }

    const parts = String(paymentMonth).split("-");

    if (parts.length !== 2) {
      return paymentMonth;
    }

    const year = Number(parts[0]);
    const month = Number(parts[1]);

    if (!year || !month) {
      return paymentMonth;
    }

    const date = new Date(
      year,
      month - 1,
      1
    );

    return date.toLocaleString("en-US", {
      month: "long",
      year: "numeric"
    });
  };

  /* =========================================================
     FORMAT DATE
  ========================================================= */

  const formatDate = (dateValue) => {
    if (!dateValue) {
      return "-";
    }

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return "-";
    }

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  };

  /* =========================================================
     STATUS CLASS
  ========================================================= */

  const getStatusClass = (status) => {
    const normalizedStatus = String(
      status || "Pending"
    ).toLowerCase();

    if (
      normalizedStatus === "paid" ||
      normalizedStatus === "completed"
    ) {
      return "paid";
    }

    if (
      normalizedStatus === "failed" ||
      normalizedStatus === "refunded"
    ) {
      return "failed";
    }

    if (
      normalizedStatus === "submitted"
    ) {
      return "submitted";
    }

    return "pending";
  };

  /* =========================================================
     HANDLE PAY NOW
  ========================================================= */

  const handlePayment = () => {
    const className =
      student?.class ||
      student?.className ||
      "--";

    const monthlyFee = Number(
      payment?.monthlyFee || 0
    );

    navigate("/fee-payment", {
      state: {
        className,
        monthlyFee,
        payment
      }
    });
  };

  /* =========================================================
     CURRENT MONTH
  ========================================================= */

  const currentMonth = payment?.paymentMonth
    ? formatPaymentMonth(payment.paymentMonth)
    : new Date().toLocaleString("en-US", {
        month: "long",
        year: "numeric"
      });

  /* =========================================================
     CURRENT CLASS
  ========================================================= */

  const currentClass =
    student?.class ||
    student?.className ||
    "--";

  /* =========================================================
     CURRENT FEE
  ========================================================= */

  const currentFee = Number(
    payment?.monthlyFee || 0
  );

  /* =========================================================
     CURRENT STATUS
  ========================================================= */

  const currentStatus =
    payment?.status || "Pending";

  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
    return (
      <div className="payments-page">
        <div className="payments-loading">
          Loading payment details...
        </div>
      </div>
    );
  }

  /* =========================================================
     PAGE
  ========================================================= */

  return (
    <div className="payments-page">

      {/* =====================================================
          PAGE HEADER
      ===================================================== */}

      <div className="payments-header">
        <div>
          <h1>Payments</h1>
          <p>
            Manage your monthly tuition fee payments
          </p>
        </div>
      </div>

      {/* =====================================================
          CURRENT MONTH FEE
      ===================================================== */}

      <div className="payment-current-card">

        <div className="payment-card-header">

          <div>
            <h2>Current Month Fee</h2>

            <p>
              Monthly tuition fee
            </p>
          </div>

          <span
            className={`payment-status ${getStatusClass(
              currentStatus
            )}`}
          >
            {currentStatus}
          </span>

        </div>

        <div className="payment-details">

          {/* MONTH */}

          <div className="payment-detail-item">

            <span>Month</span>

            <strong>
              {currentMonth}
            </strong>

          </div>

          {/* CLASS */}

          <div className="payment-detail-item">

            <span>Class</span>

            <strong>
              {currentClass}
            </strong>

          </div>

          {/* MONTHLY FEE */}

          <div className="payment-detail-item">

            <span>Monthly Fee</span>

            <strong>
              {currentFee > 0
                ? `₹${currentFee.toLocaleString(
                    "en-IN"
                  )}`
                : "₹ --"}
            </strong>

          </div>

        </div>

        {/* PAY NOW */}

        <button
  className="pay-now-btn"
  onClick={handlePayment}
  disabled={currentFee <= 0}
>
  Pay Now
</button>

      </div>

      {/* =====================================================
          PAYMENT HISTORY
      ===================================================== */}

      <div className="payment-history-section">

        <div className="section-header">

          <h2>
            Payment History
          </h2>

          <p>
            Your previous monthly payments
          </p>

        </div>

        {/* HISTORY LOADING */}

        {historyLoading ? (
          <div className="no-payment-history">
            <p>
              Loading payment history...
            </p>
          </div>
        ) : paymentHistory.length === 0 ? (

          /* NO HISTORY */

          <div className="no-payment-history">

            <h3>
              No payment history
            </h3>

            <p>
              Your completed monthly payments
              will appear here.
            </p>

          </div>

        ) : (

          /* HISTORY TABLE */

          <div className="payment-history-table-wrapper">

            <table className="payment-history-table">

              <thead>

                <tr>

                  <th>
                    Month
                  </th>

                  <th>
                    Amount
                  </th>

                  <th>
                    Status
                  </th>

                  <th>
                    Payment Date
                  </th>

                  <th>
                    Payment ID
                  </th>

                </tr>

              </thead>

              <tbody>

                {paymentHistory.map((item) => (

                  <tr
                    key={
                      item._id ||
                      item.id ||
                      `${item.paymentMonth}-${item.createdAt}`
                    }
                  >

                    {/* MONTH */}

                    <td>
                      {formatPaymentMonth(
                        item.paymentMonth
                      )}
                    </td>

                    {/* AMOUNT */}

                    <td>
                      ₹
                      {Number(
                        item.amountPaid ||
                          item.monthlyFee ||
                          0
                      ).toLocaleString(
                        "en-IN"
                      )}
                    </td>

                    {/* STATUS */}

                    <td>

                      <span
                        className={`history-status ${getStatusClass(
                          item.status
                        )}`}
                      >
                        {item.status ||
                          "Pending"}
                      </span>

                    </td>

                    {/* PAYMENT DATE */}

                    <td>
                      {formatDate(
                        item.paidAt ||
                          item.paymentDate ||
                          item.updatedAt
                      )}
                    </td>

                    {/* PAYMENT ID */}

                    <td>
                      {item.razorpayPaymentId ||
                        item.transactionReference ||
                        "-"}
                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        )}

      </div>

    </div>
  );
};

export default Payments;