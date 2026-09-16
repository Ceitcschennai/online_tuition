import React, { useEffect, useState } from "react";
import "../styles/managePayments.css";

const ManagePayments = () => {
  const API_BASE_URL = process.env.REACT_APP_API_URL;

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
  // FETCH STUDENT PAYMENTS
  // =====================================================

  const fetchPayments = async () => {
    try {
      setLoading(true);

      const response = await fetch(
        `${API_BASE_URL}/api/admin/payments/students`
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
        `${API_BASE_URL}/api/admin/payments/teachers`
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
        `${API_BASE_URL}/api/admin/payments/fees`
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
            "Content-Type": "application/json"
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
  // MARK STUDENT PAYMENT AS PAID
  // =====================================================

  const markAsPaid = async (paymentId) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/admin/payments/students/${paymentId}/mark-paid`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json"
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
            "Content-Type": "application/json"
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
  // DOWNLOAD STUDENT RECEIPT
  // =====================================================

  const downloadReceipt = (payment) => {
    const studentName =
      `${payment.student?.firstName || ""} ${
        payment.student?.lastName || ""
      }`.trim();

    const className =
      payment.student?.class ||
      payment.className ||
      "-";

    const receiptContent = `
PAYMENT RECEIPT
===============

Student: ${studentName}
Class: ${className}
Payment Month: ${payment.paymentMonth || "-"}
Academic Year: ${payment.academicYear || "-"}

Amount: ₹${
      payment.amountPaid ||
      payment.monthlyFee ||
      0
    }

Status: ${payment.status || "-"}

Date Paid: ${
      payment.paidAt
        ? formatDate(payment.paidAt)
        : "-"
    }

Transaction Reference:
${payment.transactionReference || "-"}

Payment ID:
${payment._id || "-"}
`;

    const blob = new Blob(
      [receiptContent],
      {
        type: "text/plain"
      }
    );

    const url =
      window.URL.createObjectURL(blob);

    const link =
      document.createElement("a");

    link.href = url;

    link.download =
      `receipt-${payment._id}.txt`;

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    window.URL.revokeObjectURL(url);
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
        ) : filteredPayments.length === 0 ? (
          <div className="no-payments">
            <h3>
              No student payments found
            </h3>

            <p>
              No payment records match
              your current filter.
            </p>
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
                    <th>Action</th>
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
                              : "-"}
                          </td>

                          <td className="payment-id">
                            {payment.razorpayPaymentId ||
                              payment.transactionReference ||
                              "-"}
                          </td>

                          <td>

                            {payment.status !==
                            "Paid" ? (

                              <button
                                className="table-action primary"
                                onClick={() =>
                                  markAsPaid(
                                    payment._id
                                  )
                                }
                              >
                                Mark Paid
                              </button>

                            ) : (

                              <button
                                className="table-action secondary"
                                onClick={() =>
                                  downloadReceipt(
                                    payment
                                  )
                                }
                              >
                                Receipt
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

        ) : teacherPayments.length === 0 ? (

          <div className="no-payments">

            <h3>
              No teacher payments found
            </h3>

            <p>
              No teacher salary records
              have been generated yet.
            </p>

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
                              {teacherName ||
                                "-"}
                            </strong>
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

    </div>
  );
};

export default ManagePayments;