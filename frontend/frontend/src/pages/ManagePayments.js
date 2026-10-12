import React, { useEffect, useState } from "react";
import API_BASE_URL from "../config/api";
import "../styles/managePayments.css";

const ManagePayments = () => {

  // =====================================================
  // STATE
  // =====================================================

  const [activeTab, setActiveTab] = useState("students");

  const [payments, setPayments] = useState([]);
  const [teacherPayments, setTeacherPayments] = useState([]);
  const [feeStructures, setFeeStructures] = useState([]);

  const [editingFeeId, setEditingFeeId] = useState(null);
  const [editingFeeValue, setEditingFeeValue] = useState("");
  const [savingFeeId, setSavingFeeId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [teacherLoading, setTeacherLoading] = useState(true);
  const [feeLoading, setFeeLoading] = useState(true);

  const [filterStatus, setFilterStatus] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");

  // =====================================================
  // PAYMENT REVIEW STATE
  // =====================================================

  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showScreenshot, setShowScreenshot] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [processingPaymentId, setProcessingPaymentId] = useState(null);

  // =====================================================
  // FETCH STUDENT PAYMENTS
  // =====================================================

  const fetchPayments = async () => {
    try {
      setLoading(true);

      const response = await fetch(
        `${API_BASE_URL}/api/admin/payments/students`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        setPayments(data.payments || []);
      } else {
        console.error(data.message);
        setPayments([]);
      }
    } catch (error) {
      console.error("Failed to fetch student payments:", error);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // FETCH TEACHER PAYMENTS
  // =====================================================

  const fetchTeacherPayments = async () => {
    try {
      setTeacherLoading(true);

      const response = await fetch(
        `${API_BASE_URL}/api/admin/payments/teachers`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        setTeacherPayments(data.payments || []);
      } else {
        console.error(data.message);
        setTeacherPayments([]);
      }
    } catch (error) {
      console.error("Failed to fetch teacher payments:", error);
      setTeacherPayments([]);
    } finally {
      setTeacherLoading(false);
    }
  };

  // =====================================================
  // FETCH FEE STRUCTURE
  // =====================================================

  const fetchFeeStructures = async () => {
    try {
      setFeeLoading(true);

      const response = await fetch(
        `${API_BASE_URL}/api/admin/payments/fees`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        setFeeStructures(data.feeStructures || []);
      } else {
        console.error(data.message);
        setFeeStructures([]);
      }
    } catch (error) {
      console.error("Failed to fetch fee structure:", error);
      setFeeStructures([]);
    } finally {
      setFeeLoading(false);
    }
  };

  // =====================================================
  // UPDATE FEE STRUCTURE
  // =====================================================

  const updateFeeStructure = async (feeId) => {
    try {
      const fee = feeStructures.find(
        (item) => item._id === feeId
      );

      if (!fee) {
        alert("Fee structure not found");
        return;
      }

      const academicYear = String(
        fee.academicYear || ""
      ).trim();

      const monthlyFee = Number(editingFeeValue);

      if (!academicYear) {
        alert("Academic year is required");
        return;
      }

      if (
        editingFeeValue === "" ||
        Number.isNaN(monthlyFee) ||
        monthlyFee < 0
      ) {
        alert("Monthly fee must be a valid number");
        return;
      }

      setSavingFeeId(feeId);

      const response = await fetch(
        `${API_BASE_URL}/api/admin/payments/fees/${feeId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            academicYear,
            monthlyFee,
            isActive: Boolean(fee.isActive)
          })
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Failed to update fee structure"
        );
      }

      setFeeStructures((prev) =>
        prev.map((item) =>
          item._id === feeId
            ? data.feeStructure
            : item
        )
      );

      setEditingFeeId(null);
      setEditingFeeValue("");

      alert("Fee structure updated successfully");
    } catch (error) {
      console.error(
        "Error updating fee structure:",
        error
      );

      alert(
        error.message ||
          "Failed to update fee structure"
      );
    } finally {
      setSavingFeeId(null);
    }
  };

  // =====================================================
  // INITIAL LOAD
  // =====================================================

  useEffect(() => {
    fetchPayments();
    fetchTeacherPayments();
    fetchFeeStructures();
  }, []);

  // =====================================================
  // FILTER STUDENT PAYMENTS
  // =====================================================

  const filteredPayments = payments.filter((payment) => {
    const studentName =
      `${payment.student?.firstName || ""} ${
        payment.student?.lastName || ""
      }`.trim();

    const className =
      payment.student?.class ||
      payment.className ||
      "";

    const paymentMonth =
      payment.paymentMonth || "";

    const search =
      searchTerm.toLowerCase().trim();

    const matchesStatus =
      filterStatus === "All" ||
      payment.status === filterStatus;

    const matchesSearch =
      studentName
        .toLowerCase()
        .includes(search) ||
      className
        .toLowerCase()
        .includes(search) ||
      paymentMonth
        .toLowerCase()
        .includes(search);

    return (
      matchesStatus &&
      matchesSearch
    );
  });

  // =====================================================
  // STUDENT STATISTICS
  // =====================================================

  const totalRevenue = payments
    .filter(
      (payment) => payment.status === "Paid"
    )
    .reduce(
      (sum, payment) =>
        sum + (payment.amountPaid || 0),
      0
    );

  const pendingAmount = payments
    .filter(
      (payment) =>
        payment.status === "Pending" ||
        payment.status === "Submitted"
    )
    .reduce(
      (sum, payment) =>
        sum + (payment.monthlyFee || 0),
      0
    );

  const pendingStudentCount =
    payments.filter(
      (payment) =>
        payment.status === "Pending" ||
        payment.status === "Submitted"
    ).length;

  // =====================================================
  // TEACHER STATISTICS
  // =====================================================

  const totalTeacherSalary =
    teacherPayments.reduce(
      (sum, payment) =>
        sum +
        (payment.calculatedAmount || 0),
      0
    );

  const pendingTeacherSalary =
    teacherPayments
      .filter(
        (payment) =>
          payment.status === "Pending"
      )
      .reduce(
        (sum, payment) =>
          sum +
          (payment.calculatedAmount || 0),
        0
      );

  // =====================================================
  // FORMAT DATE
  // =====================================================

  const formatDate = (date) => {
    if (!date) {
      return "-";
    }

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "-";
    }

    return parsedDate.toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric"
      }
    );
  };

  // =====================================================
  // FORMAT MONTH
  // =====================================================

  const formatMonth = (month) => {
    if (!month) {
      return "-";
    }

    const parts = month.split("-");

    if (parts.length !== 2) {
      return month;
    }

    const year = Number(parts[0]);
    const monthNumber = Number(parts[1]);

    if (!year || !monthNumber) {
      return month;
    }

    return new Date(
      year,
      monthNumber - 1,
      1
    ).toLocaleDateString(
      "en-IN",
      {
        month: "short",
        year: "numeric"
      }
    );
  };

  // =====================================================
  // APPROVE STUDENT PAYMENT
  // =====================================================

  const approvePayment = async (paymentId) => {
    if (!window.confirm("Approve this payment? This will mark it as Paid.")) {
      return;
    }

    try {
      setProcessingPaymentId(paymentId);

      const response = await fetch(
        `${API_BASE_URL}/api/admin/payments/students/${paymentId}/approve`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          }
        }
      );

      const data = await response.json();

      if (!data.success) {
        alert(data.message || "Failed to approve payment");
        return;
      }

      await fetchPayments();
      setSelectedPayment(null);

      alert("Payment approved successfully!");
    } catch (error) {
      console.error("Approve payment error:", error);
      alert("Failed to approve payment");
    } finally {
      setProcessingPaymentId(null);
    }
  };

  // =====================================================
  // REJECT STUDENT PAYMENT
  // =====================================================

  const rejectPayment = async (paymentId) => {
    const reason = rejectReason.trim();
    if (!reason) {
      alert("Please enter a rejection reason");
      return;
    }

    try {
      setProcessingPaymentId(paymentId);

      const response = await fetch(
        `${API_BASE_URL}/api/admin/payments/students/${paymentId}/reject`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({ rejectionReason: reason })
        }
      );

      const data = await response.json();

      if (!data.success) {
        alert(data.message || "Failed to reject payment");
        return;
      }

      await fetchPayments();
      setSelectedPayment(null);
      setRejectReason("");

      alert("Payment rejected successfully");
    } catch (error) {
      console.error("Reject payment error:", error);
      alert("Failed to reject payment");
    } finally {
      setProcessingPaymentId(null);
    }
  };

  // =====================================================
  // OPEN PAYMENT DETAIL / SCREENSHOT
  // =====================================================

  const openPaymentDetail = (payment) => {
    setSelectedPayment(payment);
  };

  const closePaymentDetail = () => {
    setSelectedPayment(null);
    setRejectReason("");
  };

  const openScreenshot = () => {
    setShowScreenshot(true);
  };

  const closeScreenshot = () => {
    setShowScreenshot(false);
  };

  // =====================================================
  // MARK STUDENT PAYMENT AS PAID
  // =====================================================

  const markAsPaid = async (paymentId) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/admin/payments/students/${paymentId}/mark-paid`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          }
        }
      );

      const data = await response.json();

      if (!data.success) {
        alert(
          data.message ||
            "Failed to mark payment as paid"
        );
        return;
      }

      await fetchPayments();

      alert(
        "Payment marked as paid successfully!"
      );
    } catch (error) {
      console.error(
        "Mark student payment error:",
        error
      );

      alert(
        "Failed to mark payment as paid"
      );
    }
  };

  // =====================================================
  // GENERATE STUDENT PAYMENTS
  // =====================================================

  const generateStudentPayments = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/admin/payments/students/generate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          }
        }
      );

      const data = await response.json();

      if (!data.success) {
        alert(
          data.message ||
            "Failed to generate student payments"
        );
        return;
      }

      await fetchPayments();

      alert(
        `Student payments generated successfully!\n\nCreated: ${data.createdCount}`
      );
    } catch (error) {
      console.error(
        "Generate student payments error:",
        error
      );

      alert(
        "Failed to generate student payments"
      );
    }
  };

  // =====================================================
// GENERATE ALL TEACHER PAYMENTS
// =====================================================

const generateTeacherPayments = async () => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/admin/teacher-payments/generate-all`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      alert(
        data.message ||
          "Failed to generate teacher payments"
      );
      return;
    }

    await fetchTeacherPayments();

    alert(
      `Teacher payments generated successfully!\n\n` +
      `Created: ${data.createdCount}\n` +
      `Skipped: ${data.skippedCount}`
    );

  } catch (error) {
    console.error(
      "Generate teacher payments error:",
      error
    );

    alert(
      "Failed to generate teacher payments"
    );
  }
};

// =====================================================
  // DOWNLOAD RECEIPT PDF (via backend API)
  // =====================================================

  const downloadReceipt = async (payment) => {
    setProcessingPaymentId(payment._id);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/admin/payments/students/${payment._id}/generate-receipt`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
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
    } finally {
      setProcessingPaymentId(null);
    }
  };

  // =====================================================
  // EMAIL RECEIPT (via backend API)
  // =====================================================

  const emailReceipt = async (payment) => {
    setProcessingPaymentId(payment._id);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/admin/payments/students/${payment._id}/email-receipt`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to email receipt");
      }

      alert(
        `Receipt emailed successfully!\nBill Number: ${data.billNumber}\nStudent email: ${data.emailResults.student ? "Sent" : "Failed"}\nAdmin email: ${data.emailResults.admin ? "Sent" : "Failed/Not configured"}`
      );
    } catch (error) {
      console.error("Email receipt error:", error);
      alert(error.message || "Failed to email receipt");
    } finally {
      setProcessingPaymentId(null);
    }
  };

  // =====================================================
  // EXPORT STUDENT PAYMENTS
  // =====================================================

  const exportPayments = () => {
    const csvHeader =
      "Name,Class,Month,Monthly Fee,Amount Paid,Status,Date Paid,Transaction Reference\n";

    const csvRows = payments.map(
      (payment) => {
        const name =
          `${payment.student?.firstName || ""} ${
            payment.student?.lastName || ""
          }`.trim();

        const className =
          payment.student?.class ||
          payment.className ||
          "";

        return [
          `"${name}"`,
          `"${className}"`,
          `"${payment.paymentMonth || ""}"`,
          payment.monthlyFee || 0,
          payment.amountPaid || 0,
          `"${payment.status || ""}"`,
          payment.paidAt
            ? formatDate(payment.paidAt)
            : "",
          `"${payment.transactionReference || ""}"`
        ].join(",");
      }
    );

    const csvContent =
      csvHeader +
      csvRows.join("\n");

    const blob = new Blob(
      [csvContent],
      {
        type: "text/csv;charset=utf-8;"
      }
    );

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement("a");

    link.href = url;

    link.download =
      "student_payments_report.csv";

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  // =====================================================
  // RENDER STUDENT PAYMENTS
  // =====================================================

  const renderStudentPayments = () => {
    return (
      <>
        {/* STUDENT SUMMARY CARDS */}

        <div className="payment-stats">

          <div className="stat-card revenue">
            <div className="stat-icon">
              ₹
            </div>

            <div className="stat-content">
              <h3>Total Revenue</h3>

              <p>
                ₹
                {totalRevenue.toLocaleString(
                  "en-IN"
                )}
              </p>
            </div>
          </div>

          <div className="stat-card pending">
            <div className="stat-icon">
              ₹
            </div>

            <div className="stat-content">
              <h3>Pending Amount</h3>

              <p>
                ₹
                {pendingAmount.toLocaleString(
                  "en-IN"
                )}
              </p>
            </div>
          </div>

          <div className="stat-card overdue">
            <div className="stat-icon">
              !
            </div>

            <div className="stat-content">
              <h3>Pending Payments</h3>

              <p>
                {pendingStudentCount}
              </p>
            </div>
          </div>

        </div>

        {/* CONTROLS */}

        <div className="payment-controls">

          <div className="search-filter">

            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) =>
                setSearchTerm(
                  e.target.value
                )
              }
              className="search-input"
            />

            <select
              value={filterStatus}
              onChange={(e) =>
                setFilterStatus(
                  e.target.value
                )
              }
              className="filter-select"
            >
              <option value="All">
                All Status
              </option>

              <option value="Paid">
                Paid
              </option>

              <option value="Pending">
                Pending
              </option>

              <option value="Submitted">
                Submitted
              </option>
            </select>

          </div>

          <div className="action-buttons">

            <button
              className="export-btn"
              onClick={exportPayments}
            >
              Export
            </button>

            <button
              className="generate-btn"
              onClick={
                generateStudentPayments
              }
            >
              Generate Payments
            </button>

          </div>

        </div>

        {/* STUDENT TABLE */}

        {loading ? (
          <div className="no-payments">
            Loading student payments...
          </div>
        ) : (
          <div className="table-card">

            <div className="table-card-header">
              <div>
                <h3>
                  Student Payments
                </h3>

                <p>
                  Monthly tuition fee
                  payments
                </p>
              </div>
            </div>

            <div className="table-wrapper">

              <table className="payments-table student-table">

                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Class</th>
                    <th>Month</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Payment Date</th>
                    <th>Payment ID</th>
                    <th className="payment-action-column">Action</th>
                  </tr>
                </thead>

                <tbody>

                  {filteredPayments.map(
                    (payment) => {

                      const studentName =
                        `${payment.student?.firstName || ""} ${
                          payment.student?.lastName || ""
                        }`.trim();

                      const className =
                        payment.student?.class ||
                        payment.className ||
                        "-";

                      const isSubmitted = payment.status === "Submitted";
                      const isProcessing = processingPaymentId === payment._id;

                      return (
                        <tr
                          key={payment._id}
                        >

                          <td>
                            <strong>
                              {studentName ||
                                "-"}
                            </strong>
                          </td>

                          <td>
                            {className}
                          </td>

                          <td>
                            {formatMonth(
                              payment.paymentMonth
                            )}
                          </td>

                          <td className="amount-cell">
                            ₹
                            {(
                              payment.amountPaid ||
                              payment.monthlyFee ||
                              0
                            ).toLocaleString(
                              "en-IN"
                            )}
                          </td>

                          <td>
                            <span
                              className={`status-badge ${
                                payment.status?.toLowerCase() ||
                                ""
                              }`}
                            >
                              {payment.status ||
                                "-"}
                            </span>
                          </td>

                          <td>
                            {payment.paidAt
                              ? formatDate(
                                  payment.paidAt
                                )
                              : payment.submittedAt
                              ? formatDate(payment.submittedAt)
                              : "-"}
                          </td>

                          <td className="payment-id">
                            {payment.razorpayPaymentId || payment.transactionReference || "-"}
                          </td>

                          <td>

                            {isSubmitted && (
                                <>
                                  <button
                                    className="table-action primary"
                                    onClick={() => openPaymentDetail(payment)}
                                    disabled={isProcessing}
                                    title="Review payment proof"
                                  >
                                    Review
                                  </button>
                                </>
                              )}

                              {!isSubmitted && payment.status !== "Paid" && (
                                <button
                                  className="table-action primary"
                                  onClick={() => markAsPaid(payment._id)}
                                  disabled={isProcessing}
                                >
                                  Mark Paid
                                </button>
                              )}

                              {payment.status === "Paid" && (
                                <>
                                  <button
                                    className="table-action secondary"
                                    onClick={() => downloadReceipt(payment)}
                                    disabled={isProcessing}
                                  >
                                    Download Receipt
                                  </button>
                                  <button
                                    className="table-action secondary"
                                    onClick={() => emailReceipt(payment)}
                                    disabled={isProcessing}
                                    title="Email receipt to student and admin"
                                  >
                                    Email Receipt
                                  </button>
                                </>
                              )}

                              {(payment.status === "Rejected" || payment.status === "Paid") &&
                                payment.paymentScreenshot && (
                                  <button
                                    className="table-action secondary"
                                    onClick={() => openPaymentDetail(payment)}
                                    disabled={isProcessing}
                                    title="View payment proof"
                                  >
                                    View Proof
                                  </button>
                                )}

                          </td>

                        </tr>
                      );
                    }
                  )}

                </tbody>

              </table>

            </div>

            <div className="table-footer">

              <span>
                Showing{" "}
                {filteredPayments.length}{" "}
                of {payments.length} payments
              </span>

              <strong>
                Total Revenue: ₹
                {totalRevenue.toLocaleString(
                  "en-IN"
                )}
              </strong>

            </div>

          </div>
        )}

      </>
    );
  };

  // =====================================================
  // RENDER TEACHER PAYMENTS
  // =====================================================

  const renderTeacherPayments = () => {
    return (
      <>
        <div className="payment-stats teacher-stats">

          <div className="stat-card revenue">

            <div className="stat-icon">
              ₹
            </div>

            <div className="stat-content">

              <h3>
                Total Teacher Salary
              </h3>

              <p>
                ₹
                {totalTeacherSalary.toLocaleString(
                  "en-IN"
                )}
              </p>

            </div>

          </div>

          <div className="stat-card pending">

            <div className="stat-icon">
              ₹
            </div>

            <div className="stat-content">

              <h3>
                Pending Teacher Salary
              </h3>

              <p>
                ₹
                {pendingTeacherSalary.toLocaleString(
                  "en-IN"
                )}
              </p>

            </div>

          </div>

          <div className="stat-card overdue">

            <div className="stat-icon">
              #
            </div>

            <div className="stat-content">

              <h3>
                Payment Records
              </h3>

              <p>
                {teacherPayments.length}
              </p>

            </div>

          </div>

        </div>

        {teacherLoading ? (

  <div className="no-payments">
    Loading teacher payments...
  </div>

) : (

  <div className="table-card">

            <div className="table-card-header">
  <div>
    <h3>
      Teacher Payments
    </h3>

    <p>
      Monthly teacher salary
      payments
    </p>
  </div>

  <button
    type="button"
    className="generate-btn"
    onClick={generateTeacherPayments}
  >
    Generate Teacher Payments
  </button>
</div>

            <div className="table-wrapper">

              <table className="payments-table teacher-table">

                <thead>

                  <tr>
                    <th>Teacher</th>
                    <th>Bank Details</th>
                    <th>Month</th>
                    <th>Students</th>
                    <th>Rate</th>
                    <th>Amount</th>
                    <th>Class Breakdown</th>
                    <th>Status</th>
                    <th>Payment Date</th>
                    <th>Reference</th>
                  </tr>

                </thead>

                <tbody>

                  {teacherPayments.map(
                    (payment) => {

                      const teacherName =
                        `${payment.teacher?.firstName || ""} ${
                          payment.teacher?.lastName || ""
                        }`.trim();

                      return (

                        <tr
                          key={payment._id}
                        >

                          <td>
  <strong>
    {teacherName || "-"}
  </strong>
</td>

<td>
  {payment.teacher?.bankDetails ? (
    <button
      type="button"
      onClick={() => {
        alert(
          `Account Holder: ${payment.teacher.bankDetails.accountHolderName}\n` +
          `Bank: ${payment.teacher.bankDetails.bankName}\n` +
          `Account Number: ${payment.teacher.bankDetails.accountNumber}\n` +
          `IFSC: ${payment.teacher.bankDetails.ifscCode}\n` +
          `Account Type: ${payment.teacher.bankDetails.accountType}`
        );
      }}
    >
      View Bank Details
    </button>
  ) : (
    "Not Added"
  )}
</td>

<td>
  {formatMonth(
    payment.paymentMonth
  )}
</td>

                          <td className="center">
                            {payment.studentCount ??
                              0}
                          </td>

                          <td>
                            ₹
                            {(
                              payment.ratePerStudent ||
                              0
                            ).toLocaleString(
                              "en-IN"
                            )}
                          </td>

                          <td className="amount-cell">
                            ₹
                            {(
                              payment.calculatedAmount ||
                              0
                            ).toLocaleString(
                              "en-IN"
                            )}
                          </td>

                          <td className="breakdown-cell">

                            {payment.classBreakdown?.length >
                            0 ? (

                              <div className="breakdown-list">

                                {payment.classBreakdown.map(
                                  (
                                    item,
                                    index
                                  ) => (

                                    <span
                                      key={
                                        index
                                      }
                                    >

                                      <strong>
                                        Class{" "}
                                        {String(
                                          item.className
                                        ).replace(
                                          /^Class\s*/i,
                                          ""
                                        )}
                                      </strong>

                                      :{" "}
                                      {
                                        item.studentCount
                                      }{" "}
                                      {item.studentCount ===
                                      1
                                        ? "student"
                                        : "students"}

                                    </span>

                                  )
                                )}

                              </div>

                            ) : (
                              "-"
                            )}

                          </td>

                          <td>

                            <span
                              className={`status-badge ${
                                payment.status?.toLowerCase() ||
                                ""
                              }`}
                            >
                              {payment.status ||
                                "-"}
                            </span>

                          </td>

                          <td>
                            {payment.paymentDate
                              ? formatDate(
                                  payment.paymentDate
                                )
                              : "-"}
                          </td>

                          <td>
                            {payment.transactionReference ||
                              "-"}
                          </td>

                        </tr>

                      );
                    }
                  )}

                </tbody>

              </table>

            </div>

            <div className="table-footer">

              <span>
                Showing{" "}
                {teacherPayments.length}{" "}
                teacher payment records
              </span>

              <strong>
                Total Teacher Salary: ₹
                {totalTeacherSalary.toLocaleString(
                  "en-IN"
                )}
              </strong>

            </div>

          </div>

        )}

      </>
    );
  };

  // =====================================================
  // RENDER FEE STRUCTURE
  // =====================================================

  const renderFeeStructure = () => {
    return (
      <>

        <div className="fee-intro">

          <div>

            <h3>
              Fee Structure
            </h3>

            <p>
              Monthly tuition fees by class
            </p>

          </div>

        </div>

        {feeLoading ? (

          <div className="no-payments">
            Loading fee structure...
          </div>

        ) : feeStructures.length === 0 ? (

          <div className="no-payments">

            <h3>
              No fee structure found
            </h3>

            <p>
              No fee records are available.
            </p>

          </div>

        ) : (

          <div className="table-card fee-card">

            <div className="table-wrapper">

              <table className="payments-table fee-table">

                <thead>

                  <tr>
                    <th>Class</th>
                    <th>Academic Year</th>
                    <th>Monthly Fee</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>

                </thead>

                <tbody>

                  {feeStructures
                    .slice()
                    .sort((a, b) => {
  const classA = parseInt(
    String(a.className).replace(/^Class\s*/i, ""),
    10
  );

  const classB = parseInt(
    String(b.className).replace(/^Class\s*/i, ""),
    10
  );

  return classA - classB;
})
                    .map((fee) => {

                      const isEditing =
                        editingFeeId ===
                        fee._id;

                      return (

                        <tr
                          key={fee._id}
                        >

                          {/* CLASS */}

                          <td>

                            <strong>
                              Class{" "}
                              {String(
                                fee.className
                              ).replace(
                                /^Class\s*/i,
                                ""
                              )}
                            </strong>

                          </td>

                          {/* ACADEMIC YEAR */}

                          <td>

                            {isEditing ? (

                              <input
                                type="text"
                                value={
                                  fee.academicYear ||
                                  ""
                                }
                                onChange={(e) => {

                                  const value =
                                    e.target.value;

                                  setFeeStructures(
                                    (prev) =>
                                      prev.map(
                                        (item) =>
                                          item._id ===
                                          fee._id
                                            ? {
                                                ...item,
                                                academicYear:
                                                  value
                                              }
                                            : item
                                      )
                                  );
                                }}
                                placeholder="2026-2027"
                                className="fee-edit-input"
                              />

                            ) : (

                              fee.academicYear

                            )}

                          </td>

                          {/* MONTHLY FEE */}

                          <td className="amount-cell">

                            {isEditing ? (

                              <input
                                type="number"
                                min="0"
                                value={
                                  editingFeeValue
                                }
                                onChange={(e) =>
                                  setEditingFeeValue(
                                    e.target.value
                                  )
                                }
                                className="fee-edit-input"
                              />

                            ) : (

                              <>
                                ₹
                                {(
                                  fee.monthlyFee ||
                                  0
                                ).toLocaleString(
                                  "en-IN"
                                )}
                              </>

                            )}

                          </td>

                          {/* STATUS */}

                          <td>

                            {isEditing ? (

                              <select
                                value={
                                  fee.isActive
                                    ? "Active"
                                    : "Inactive"
                                }
                                onChange={(e) => {

                                  const isActive =
                                    e.target.value ===
                                    "Active";

                                  setFeeStructures(
                                    (prev) =>
                                      prev.map(
                                        (item) =>
                                          item._id ===
                                          fee._id
                                            ? {
                                                ...item,
                                                isActive
                                              }
                                            : item
                                      )
                                  );
                                }}
                                className="fee-status-select"
                              >

                                <option value="Active">
                                  Active
                                </option>

                                <option value="Inactive">
                                  Inactive
                                </option>

                              </select>

                            ) : (

                              <span
                                className={`status-badge ${
                                  fee.isActive
                                    ? "paid"
                                    : "overdue"
                                }`}
                              >
                                {fee.isActive
                                  ? "Active"
                                  : "Inactive"}
                              </span>

                            )}

                          </td>

                          {/* ACTION */}

                          <td>

                            {isEditing ? (

                              <div className="fee-action-buttons">

                                <button
                                  type="button"
                                  className="fee-save-btn"
                                  onClick={() =>
                                    updateFeeStructure(
                                      fee._id
                                    )
                                  }
                                  disabled={
                                    savingFeeId ===
                                    fee._id
                                  }
                                >

                                  {savingFeeId ===
                                  fee._id
                                    ? "Saving..."
                                    : "Save"}

                                </button>

                                <button
                                  type="button"
                                  className="fee-cancel-btn"
                                  onClick={() => {

                                    setEditingFeeId(
                                      null
                                    );

                                    setEditingFeeValue(
                                      ""
                                    );

                                    fetchFeeStructures();

                                  }}
                                  disabled={
                                    savingFeeId ===
                                    fee._id
                                  }
                                >
                                  Cancel
                                </button>

                              </div>

                            ) : (

                              <button
                                type="button"
                                className="fee-edit-btn"
                                onClick={() => {

                                  setEditingFeeId(
                                    fee._id
                                  );

                                  setEditingFeeValue(
                                    fee.monthlyFee ??
                                    ""
                                  );

                                }}
                              >
                                Edit
                              </button>

                            )}

                          </td>

                        </tr>

                      );

                    })}

                </tbody>

              </table>

            </div>

          </div>

        )}

      </>
    );
  };

  // =====================================================
  // MAIN RENDER
  // =====================================================

  return (
    <div className="manage-payments-page">

      {/* PAGE HEADER */}

      <div className="page-header">

        <h2>
          Manage Payments
        </h2>

        <p>
          View and manage all payments
          in the system
        </p>

      </div>

      {/* THREE OPTIONS */}

      <div className="payment-tabs">

        <button
          className={`payment-tab ${
            activeTab === "students"
              ? "active"
              : ""
          }`}
          onClick={() =>
            setActiveTab("students")
          }
        >

          <span className="tab-icon">
            👤
          </span>

          <span>
            Student Payments
          </span>

        </button>

        <button
          className={`payment-tab ${
            activeTab === "teachers"
              ? "active"
              : ""
          }`}
          onClick={() =>
            setActiveTab("teachers")
          }
        >

          <span className="tab-icon">
            👥
          </span>

          <span>
            Teacher Payments
          </span>

        </button>

        <button
          className={`payment-tab ${
            activeTab === "fees"
              ? "active"
              : ""
          }`}
          onClick={() =>
            setActiveTab("fees")
          }
        >

          <span className="tab-icon">
            ⚙
          </span>

          <span>
            Fee Structure
          </span>

        </button>

      </div>

      {/* ACTIVE TAB CONTENT */}

      <div className="payment-tab-content">

        {activeTab === "students" &&
          renderStudentPayments()}

        {activeTab === "teachers" &&
          renderTeacherPayments()}

        {activeTab === "fees" &&
          renderFeeStructure()}

      </div>

      {/* PAYMENT DETAIL MODAL */}
      {selectedPayment && (
        <div className="modal-overlay" onClick={closePaymentDetail}>
          <div className="modal-content payment-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Payment Details</h3>
              <button className="modal-close" onClick={closePaymentDetail}>✕</button>
            </div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">Student</span>
                  <strong>{selectedPayment.student?.firstName || ""} {selectedPayment.student?.lastName || ""}</strong>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Email</span>
                  <strong>{selectedPayment.student?.email || "-"}</strong>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Class</span>
                  <strong>{selectedPayment.student?.class || selectedPayment.className || "-"}</strong>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Month</span>
                  <strong>{formatMonth(selectedPayment.paymentMonth)}</strong>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Academic Year</span>
                  <strong>{selectedPayment.academicYear || "-"}</strong>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Monthly Fee</span>
                  <strong>₹{(selectedPayment.monthlyFee || 0).toLocaleString("en-IN")}</strong>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Transaction Reference</span>
                  <strong>{selectedPayment.transactionReference || "-"}</strong>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Submitted At</span>
                  <strong>{selectedPayment.submittedAt ? formatDate(selectedPayment.submittedAt) : "-"}</strong>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Status</span>
                  <strong><span className={"status-badge " + (selectedPayment.status?.toLowerCase() || "")}>{selectedPayment.status || "-"}</span></strong>
                </div>
                {selectedPayment.rejectionReason && (
                  <div className="detail-item full-width">
                    <span className="detail-label">Rejection Reason</span>
                    <div className="rejection-reason">{selectedPayment.rejectionReason}</div>
                  </div>
                )}
              </div>

              {selectedPayment.paymentScreenshot && (
                <div className="screenshot-section">
                  <h4>Payment Proof</h4>
                  <button
                    className="view-screenshot-btn"
                    onClick={openScreenshot}
                  >
                    👁 View Screenshot
                  </button>
                </div>
              )}

              {selectedPayment.status === "Submitted" && (
                <div className="modal-actions">
                  <button
                    className="approve-btn"
                    onClick={() => approvePayment(selectedPayment._id)}
                    disabled={processingPaymentId === selectedPayment._id}
                  >
                    {processingPaymentId === selectedPayment._id ? "Processing..." : "✓ Approve Payment"}
                  </button>
                  <button
                    className="reject-btn"
                    onClick={() => {}}
                    disabled={processingPaymentId === selectedPayment._id}
                  >
                    ✕ Reject Payment
                  </button>
                </div>
              )}

              {selectedPayment.status === "Submitted" && (
                <div className="reject-form">
                  <label>Rejection Reason (required)</label>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Enter rejection reason..."
                    rows="3"
                  />
                  <button
                    className="reject-confirm-btn"
                    onClick={() => rejectPayment(selectedPayment._id)}
                    disabled={processingPaymentId === selectedPayment._id || !rejectReason.trim()}
                  >
                    Confirm Rejection
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SCREENSHOT MODAL */}
      {showScreenshot && selectedPayment?.paymentScreenshot && (
        <div className="modal-overlay" onClick={closeScreenshot}>
          <div className="modal-content screenshot-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Payment Screenshot</h3>
              <button className="modal-close" onClick={closeScreenshot}>✕</button>
            </div>
            <div className="modal-body">
              {selectedPayment.paymentScreenshot.startsWith("data:application/pdf") ? (
                <iframe
                  src={selectedPayment.paymentScreenshot}
                  title="Payment Screenshot"
                  className="screenshot-frame"
                />
              ) : (
                <img
                  src={selectedPayment.paymentScreenshot}
                  alt="Payment Screenshot"
                  className="screenshot-image"
                />
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ManagePayments;