import React from "react";
import { NavLink } from "react-router-dom";
import {
  FaChartBar,
  FaBookOpen,
  FaTasks,
  FaQuestionCircle,
  FaCreditCard,
  FaChalkboardTeacher,
  FaUserGraduate,
  FaUserCheck,
  FaChevronRight,
  FaTimes
} from "react-icons/fa";
import "../styles/sidebar.css";

const menuConfig = {
  student: [
    { to: "/subjects", icon: FaBookOpen, label: "Subjects" },
    { to: "/assignments", icon: FaTasks, label: "Tasks" },
    { to: "/queries", icon: FaQuestionCircle, label: "Queries" },
    { to: "/payments", icon: FaCreditCard, label: "Payments" }
  ],
  teacher: [
    { to: "/teacher-subjects", icon: FaBookOpen, label: "Online Classes" },
    { to: "/teacher-assignments", icon: FaTasks, label: "Assignments" },
    { to: "/take-attendance", icon: FaUserCheck, label: "Attendance" },
    { to: "/student-queries", icon: FaQuestionCircle, label: "Queries" }
  ],
  admin: [
    { to: "/manage-students", icon: FaUserGraduate, label: "Students" },
    { to: "/manage-teachers", icon: FaChalkboardTeacher, label: "Teachers" },
    { to: "/manage-payments", icon: FaCreditCard, label: "Payments" }
  ]
};

const Sidebar = ({ isOpen, setIsOpen, isMobile = false }) => {
  const role = localStorage.getItem("userRole");

  if (!role) return null;

  const dashboardLink = {
    admin: "/admin-dashboard",
    teacher: "/teacher-dashboard",
    student: "/student-dashboard"
  }[role];

  return (
    <>
      {isMobile && isOpen && (
        <div className="sidebar-overlay" onClick={() => setIsOpen(false)} />
      )}

      <aside className={`sidebar ${isOpen ? "open" : ""}`}>
        <div className="sidebar-header">
          {!isMobile && (
            <button
              className="sidebar-toggle-desktop"
              onClick={() => setIsOpen(!isOpen)}
            >
              {isOpen ? <FaTimes /> : <FaChevronRight />}
            </button>
          )}
        </div>

        <nav className="sidebar-nav">
          <NavLink to={dashboardLink} className="nav-link">
            <FaChartBar className="nav-icon" />
            {isOpen && <span>Dashboard</span>}
          </NavLink>

          {(menuConfig[role] || []).map((item, i) => (
            <NavLink key={i} to={item.to} className="nav-link">
              <item.icon className="nav-icon" />
              {isOpen && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;