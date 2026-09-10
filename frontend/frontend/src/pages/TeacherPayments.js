import React, { useEffect, useState } from "react";
import API_BASE_URL from "../config/api";
import {
  FaMoneyBillWave,
  FaUsers,
  FaCalendarAlt,
  FaCheckCircle,
  FaClock,
  FaHistory
} from "react-icons/fa";

import "../styles/teacherPayments.css";

const TeacherPayments = () => {
  const [currentPayment, setCurrentPayment] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const teacherId = localStorage.getItem("teacherId");
  console.log("Teacher ID:", teacherId);

  const token = localStorage.getItem("token");

useEffect(() => {
  const fetchTeacherPayment = async () => {
    try {
      if (!teacherId || !token) {
        console.error("Teacher ID or token not found");
        setLoading(false);
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/api/teacher-payments/teacher/${teacherId}/current`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const data = await response.json();

      console.log("Teacher payment data:", data);

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Failed to fetch teacher payment"
        );
      }

      setCurrentPayment(data.payment);
      const historyResponse = await fetch(
  `${API_BASE_URL}/api/teacher-payments/teacher/${teacherId}/history`,
  {
    headers: {
      Authorization: `Bearer ${token}`
    }
  }
);

const historyData = await historyResponse.json();

console.log("Teacher payment history:", historyData);

if (historyResponse.ok && historyData.success) {
  setPaymentHistory(historyData.payments || []);
}

    } catch (error) {
      console.error("Teacher payment fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  fetchTeacherPayment();
}, [teacherId, token]);

  

  const studentCount = currentPayment?.studentCount ?? 0;
  const ratePerStudent = currentPayment?.ratePerStudent ?? 1500;
  const currentSalary = currentPayment?.calculatedAmount ?? 0;
  const classBreakdown = currentPayment?.classBreakdown ?? [];

  return (
    <div className="teacher-payments-page">

      {/* Header */}
      <div className="teacher-payments-header">
        <div>
          <span className="teacher-payments-label">
            FACULTY PAYMENTS
          </span>

          <h1>Teacher Payments</h1>

          <p>
            View your monthly salary and payment history.
          </p>
        </div>

        <div className="teacher-payment-month">
          <FaCalendarAlt />
          <div>
            <span>Current Month</span>
            <strong>September 2026</strong>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="teacher-payment-summary">

        <div className="teacher-payment-card">
          <div className="teacher-payment-card-icon">
            <FaUsers />
          </div>

          <div>
            <span>Students</span>
            <strong>{studentCount}</strong>
          </div>
        </div>

        <div className="teacher-payment-card">
          <div className="teacher-payment-card-icon">
            <FaMoneyBillWave />
          </div>

          <div>
            <span>Rate per Student</span>
            <strong>
              ₹{ratePerStudent.toLocaleString("en-IN")}
            </strong>
          </div>
        </div>

        <div className="teacher-payment-card salary-card">
          <div className="teacher-payment-card-icon">
            <FaMoneyBillWave />
          </div>

          <div>
            <span>This Month Salary</span>
            <strong>
              ₹{currentSalary.toLocaleString("en-IN")}
            </strong>
          </div>
        </div>

      </div>

      {/* Current Payment */}
      <div className="teacher-current-payment">

        <div className="section-heading">
          <div>
            <span>MONTHLY SALARY</span>
            <h2>September 2026 Payment</h2>
          </div>

          <div className="payment-status pending">
            <FaClock />
            Pending
          </div>
        </div>

        <div className="class-salary-breakdown">

  <div className="class-salary-header">
    <span>Class</span>
    <span>Students</span>
    <span>Rate / Student</span>
    <span>Class Salary</span>
  </div>

  {classBreakdown.length > 0 ? (
    classBreakdown.map((item) => {
      const classSalary =
        item.studentCount * ratePerStudent;

      return (
        <div
          className="class-salary-row"
          key={item.className}
        >
          <strong>{item.className}</strong>

          <span>{item.studentCount}</span>

          <span>
            ₹{ratePerStudent.toLocaleString("en-IN")}
          </span>

          <strong>
            ₹{classSalary.toLocaleString("en-IN")}
          </strong>
        </div>
      );
    })
  ) : (
    <div className="no-class-data">
      No class-wise student data available.
    </div>
  )}

</div>

        <p className="salary-note">
          Salary is calculated based on the number of students
          assigned to you for the month.
        </p>

      </div>

      {/* Payment History */}
      <div className="teacher-payment-history">

        <div className="section-heading history-heading">
          <div>
            <span>PAYMENT RECORDS</span>
            <h2>Payment History</h2>
          </div>

          <FaHistory className="history-icon" />
        </div>

        <div className="payment-table-wrapper">
          <table className="teacher-payment-table">

            <thead>
              <tr>
                <th>Month</th>
                <th>Students</th>
                <th>Rate</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Payment Date</th>
              </tr>
            </thead>

            <tbody>
              {paymentHistory.map((payment, index) => (
                <tr key={index}>

                  <td>
                    <strong>{payment.month}</strong>
                  </td>

                  <td>{payment.students}</td>

                  <td>
                    ₹{payment.rate.toLocaleString("en-IN")}
                  </td>

                  <td>
                    <strong>
                      ₹{payment.amount.toLocaleString("en-IN")}
                    </strong>
                  </td>

                  <td>
                    <span className="payment-status paid">
                      <FaCheckCircle />
                      {payment.status}
                    </span>
                  </td>

                  <td>{payment.paymentDate}</td>

                </tr>
              ))}
            </tbody>

          </table>
        </div>

      </div>

    </div>
  );
};

export default TeacherPayments;