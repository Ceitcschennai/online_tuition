import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API_BASE_URL from '../config/api';
import '../styles/paymentHistory.css';

/*
  PaymentHistory now reads the student's real payment
  records from the backend (GET /api/payments/student/:id/history).

  The student ID is taken from the logged-in user saved in
  localStorage and the request is authenticated with the JWT
  stored under the "token" key. The backend additionally
  scopes the query to the ID inside the verified token, so a
  student can only ever see their own records.

  Status rules (kept consistent with the admin Manage Payments
  page and the StudentPayment model):
    - "Paid"      -> genuinely paid. Counted as revenue / completed.
    - "Pending"   -> unpaid, awaiting payment. Counted as pending.
    - "Submitted" -> proof uploaded, awaiting admin verification.
                     Counted as pending (NOT yet paid).
    - "Rejected"  -> rejected submission. NEVER counted as paid
                     and NOT counted as pending either.
*/

const COMPLETED_STATUSES = ["Paid"];
const PENDING_STATUSES = ["Pending", "Submitted"];

const PaymentHistory = () => {
  const navigate = useNavigate();

  const [paymentHistory, setPaymentHistory] = useState([]);
  const [pendingPayments, setPendingPayments] = useState([]);
  const [allPayments, setAllPayments] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadPaymentHistory = async () => {
    try {
      setLoading(true);
      setError("");

      const storedStudent = localStorage.getItem("user");

      if (!storedStudent) {
        setPaymentHistory([]);
        setPendingPayments([]);
        setAllPayments([]);
        setLoading(false);
        return;
      }

      const storedUser = JSON.parse(storedStudent);

      const studentId =
        storedUser._id ||
        storedUser.id ||
        storedUser.studentId;

      if (!studentId) {
        setPaymentHistory([]);
        setPendingPayments([]);
        setAllPayments([]);
        setLoading(false);
        return;
      }

      const token = localStorage.getItem("token");

      const response = await fetch(
        `${API_BASE_URL}/api/payments/student/${studentId}/history`,
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
        if (response.status === 401) {
          setError(
            "Your session has expired. Please log in again."
          );
        } else {
          setError(
            data.message ||
              "Failed to load payment history."
          );
        }

        setPaymentHistory([]);
        setPendingPayments([]);
        setAllPayments([]);
        setLoading(false);
        return;
      }

      const payments = Array.isArray(data.payments)
        ? data.payments
        : [];

      setAllPayments(payments);

      setPaymentHistory(
        payments.filter((payment) =>
          COMPLETED_STATUSES.includes(payment.status)
        )
      );

      setPendingPayments(
        payments.filter((payment) =>
          PENDING_STATUSES.includes(payment.status)
        )
      );
    } catch (err) {
      console.error("Payment history error:", err);
      setError("Failed to load payment history.");
      setPaymentHistory([]);
      setPendingPayments([]);
      setAllPayments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPaymentHistory();
  }, []);

  const totalPaid = paymentHistory.reduce(
    (sum, payment) =>
      sum + (Number(payment.amountPaid) || 0),
    0
  );

  const totalPending = pendingPayments.reduce(
    (sum, payment) =>
      sum + (Number(payment.monthlyFee) || 0),
    0
  );

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return 'PAID';
      case 'pending':
        return 'PENDING';
      case 'overdue':
        return 'OVERDUE';
      default:
        return 'UNKNOWN';
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'completed':
        return 'status-completed';
      case 'pending':
        return 'status-pending';
      case 'overdue':
        return 'status-overdue';
      default:
        return 'status-unknown';
    }
  };

  /* Map a backend status to the visual status bucket */
  const mapStatus = (status) => {
    switch (status) {
      case 'Paid':
        return 'completed';
      case 'Pending':
      case 'Submitted':
        return 'pending';
      default:
        return 'pending';
    }
  };

  const formatDate = (value) => {
    if (!value) {
      return '-';
    }

    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) {
      return '-';
    }

    return parsed.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatPaymentMonth = (paymentMonth) => {
    if (!paymentMonth) {
      return '-';
    }

    const parts = String(paymentMonth).split('-');

    if (parts.length !== 2) {
      return paymentMonth;
    }

    const year = Number(parts[0]);
    const month = Number(parts[1]);

    if (!year || !month) {
      return paymentMonth;
    }

    const date = new Date(year, month - 1, 1);

    return date.toLocaleDateString('en-IN', {
      month: 'long',
      year: 'numeric',
    });
  };

  const getTransactionId = (payment) =>
    payment.transactionReference ||
    payment.razorpayPaymentId ||
    payment.billNumber ||
    payment._id ||
    '-';

  const getPaymentFor = (payment) => {
    const className = payment.className
      ? `Class ${String(payment.className).replace(/^Class\s*/i, '')}`
      : 'Tuition';

    return `${className} Monthly Fee - ${formatPaymentMonth(payment.paymentMonth)}`;
  };

  /* Overdue helper: a monthly fee is overdue once its
     payment month has fully passed. */
  const getOverdueInfo = (payment) => {
    if (!payment.paymentMonth) {
      return { dueDate: null, daysOverdue: 0 };
    }

    const parts = String(payment.paymentMonth).split('-');

    if (parts.length !== 2) {
      return { dueDate: null, daysOverdue: 0 };
    }

    const year = Number(parts[0]);
    const month = Number(parts[1]);

    if (!year || !month) {
      return { dueDate: null, daysOverdue: 0 };
    }

    const dueDate = new Date(year, month - 1, 1);
    const now = new Date();

    const daysOverdue = Math.max(
      0,
      Math.floor((now - dueDate) / (1000 * 60 * 60 * 24))
    );

    return { dueDate, daysOverdue };
  };

  /* Download the official PDF receipt for a PAID payment
     from the backend. */
  const downloadReceipt = async (payment) => {
    if (!payment?._id) {
      return;
    }

    const storedStudent = localStorage.getItem("user");
    const token = localStorage.getItem("token");

    if (!storedStudent || !token) {
      alert("Please log in again to download the receipt.");
      return;
    }

    const storedUser = JSON.parse(storedStudent);
    const studentId =
      storedUser._id || storedUser.id || storedUser.studentId;

    if (!studentId) {
      alert("Student ID not found.");
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/payments/student/${studentId}/payment/${payment._id}/receipt`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to download receipt");
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = `receipt-${payment._id}.pdf`;

      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match) filename = match[1];
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("Download receipt error:", err);
      alert(err.message || "Failed to download receipt");
    }
  };

  const pendingLabel = (payment) => {
    const { daysOverdue } = getOverdueInfo(payment);
    if (daysOverdue > 0) {
      return 'overdue';
    }
    return 'pending';
  };

  return (
    <div className="payment-history-page">
      <div className="page-header">
        <h2>Payment History</h2>
        <p>Track all your payments and pending dues</p>
      </div>

      {loading && (
        <div className="empty-state">
          <h3>Loading payment history...</h3>
        </div>
      )}

      {!loading && error && (
        <div className="empty-state">
          <div className="empty-icon">
            <span className="icon-text">ERROR</span>
          </div>
          <h3>Unable to load history</h3>
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Summary Cards */}
          <div className="payment-summary">
            <div className="summary-card total-paid">
              <div className="summary-icon">
                <span className="icon-text">PAID</span>
              </div>
              <div className="summary-content">
                <h3>Total Paid</h3>
                <p>₹{totalPaid.toLocaleString('en-IN')}</p>
              </div>
            </div>
            <div className="summary-card total-pending">
              <div className="summary-icon">
                <span className="icon-text">PENDING</span>
              </div>
              <div className="summary-content">
                <h3>Pending Amount</h3>
                <p>₹{totalPending.toLocaleString('en-IN')}</p>
              </div>
            </div>
            <div className="summary-card total-transactions">
              <div className="summary-icon">
                <span className="icon-text">TOTAL</span>
              </div>
              <div className="summary-content">
                <h3>Total Transactions</h3>
                <p>{allPayments.length}</p>
              </div>
            </div>
          </div>

          {/* Pending Payments */}
          {pendingPayments.length > 0 && (
            <div className="pending-payments-section">
              <h3>Pending Payments</h3>
              <div className="pending-payments-grid">
                {pendingPayments.map(payment => {
                  const status = pendingLabel(payment);
                  const { dueDate, daysOverdue } = getOverdueInfo(payment);

                  return (
                    <div key={payment._id} className={`pending-payment-card ${status}`}>
                      <div className="card-content">
                        <div className="payment-info">
                          <h4>{getPaymentFor(payment)}</h4>
                          <p className="amount">₹{(Number(payment.monthlyFee) || 0).toLocaleString('en-IN')}</p>
                          {dueDate && (
                            <p className="due-date">
                              Due: {dueDate.toLocaleDateString('en-IN', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </p>
                          )}
                          {status === 'overdue' && daysOverdue > 0 && (
                            <p className="overdue-notice">
                              Overdue by {daysOverdue} day{daysOverdue > 1 ? 's' : ''}
                            </p>
                          )}
                          {payment.status === 'Submitted' && (
                            <p className="due-date">
                              Proof submitted - awaiting admin verification
                            </p>
                          )}
                        </div>
                        <div className="payment-actions">
                          {payment.status === 'Pending' && (
                            <button
                              className="pay-now-btn"
                              onClick={() => navigate('/fee-payment')}
                              title={`Pay ₹${payment.monthlyFee} for ${getPaymentFor(payment)}`}
                            >
                              Pay Now
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Payment History Table (completed / paid records) */}
          <div className="payment-history-section">
            <h3>Payment History</h3>

            {paymentHistory.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <span className="icon-text">NO DATA</span>
                </div>
                <h3>No Payment History</h3>
                <p>Your payment history will appear here once your first payment is approved.</p>
              </div>
            ) : (
              <div className="payment-table-container">
                <table className="payment-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Transaction ID</th>
                      <th>Payment For</th>
                      <th>Amount</th>
                      <th>Method</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentHistory.map(payment => (
                      <tr key={payment._id}>
                        <td data-label="Date">{formatDate(payment.paidAt || payment.submittedAt)}</td>
                        <td data-label="Transaction ID">{getTransactionId(payment)}</td>
                        <td data-label="Payment For">{getPaymentFor(payment)}</td>
                        <td data-label="Amount">₹{(Number(payment.amountPaid) || 0).toLocaleString('en-IN')}</td>
                        <td data-label="Method">{payment.transactionReference ? 'UPI / QR' : '-'}</td>
                        <td data-label="Status">
                          <span className={`status-badge ${getStatusClass(mapStatus(payment.status))}`}>
                            {getStatusIcon(mapStatus(payment.status))}
                          </span>
                        </td>
                        <td data-label="Actions">
                          <button
                            className="download-btn"
                            onClick={() => downloadReceipt(payment)}
                            title="Download Receipt"
                          >
                            Download
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default PaymentHistory;
