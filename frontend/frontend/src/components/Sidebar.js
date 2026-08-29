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
  FaUserCheck
} from "react-icons/fa";

import "../styles/sidebar.css";


const menuConfig = {
  student: [
    {
      to: "/subjects",
      icon: FaBookOpen,
      label: "Subjects"
    },
    {
      to: "/assignments",
      icon: FaTasks,
      label: "Tasks"
    },
    {
      to: "/queries",
      icon: FaQuestionCircle,
      label: "Queries"
    },
    {
      to: "/payments",
      icon: FaCreditCard,
      label: "Payments"
    }
  ],

  teacher: [
    {
      to: "/teacher-subjects",
      icon: FaBookOpen,
      label: "Online Classes"
    },
    {
      to: "/teacher-assignments",
      icon: FaTasks,
      label: "Assignments"
    },
    {
      to: "/take-attendance",
      icon: FaUserCheck,
      label: "Attendance"
    },
    {
      to: "/student-queries",
      icon: FaQuestionCircle,
      label: "Queries"
    }
  ],

  admin: [
    {
      to: "/manage-students",
      icon: FaUserGraduate,
      label: "Students"
    },
    {
      to: "/manage-teachers",
      icon: FaChalkboardTeacher,
      label: "Teachers"
    },
    {
      to: "/manage-payments",
      icon: FaCreditCard,
      label: "Payments"
    }
  ]
};


const Sidebar = ({ isOpen, setIsOpen, isMobile = false }) => {
  const role = localStorage.getItem("userRole");

  if (!role) {
    return null;
  }


  const dashboardLink = {
    admin: "/admin-dashboard",
    teacher: "/teacher-dashboard",
    student: "/student-dashboard"
  }[role];


  const handleToggle = () => {
    setIsOpen(!isOpen);
  };


  return (
    <>
      {/* MOBILE OVERLAY */}
      {isMobile && isOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setIsOpen(false)}
        />
      )}


      {/* SIDEBAR */}
      <aside
        className={`sidebar ${
          isOpen ? "open" : "collapsed"
        } ${isMobile ? "mobile-sidebar" : "desktop-sidebar"}`}
      >

        {/* SIDEBAR HEADER */}
        <div className="sidebar-header">
  {!isMobile && (
    <button
      className="sidebar-toggle-desktop"
      onClick={() => setIsOpen(!isOpen)}
      aria-label="Toggle sidebar"
    >
      <span className="sidebar-toggle-symbol">
  {isOpen ? "<" : ">"}
</span>
    </button>
  )}
</div>


        {/* NAVIGATION */}
        <nav className="sidebar-nav">

          {/* DASHBOARD */}
          <NavLink
            to={dashboardLink}
            className="nav-link"
          >
            <FaChartBar className="nav-icon" />

            <span className="nav-label">
              Dashboard
            </span>
          </NavLink>


          {/* ROLE BASED MENU */}
          {(menuConfig[role] || []).map((item, index) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={index}
                to={item.to}
                className="nav-link"
              >
                <Icon className="nav-icon" />

                <span className="nav-label">
                  {item.label}
                </span>
              </NavLink>
            );
          })}

        </nav>

      </aside>
    </>
  );
};


export default Sidebar;