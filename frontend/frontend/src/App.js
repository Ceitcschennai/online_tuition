import React, { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";

/* =========================================================
   PAGES
========================================================= */

import Home from "./pages/Home";
import Login from "./pages/Login";

import Subjects from "./pages/Subjects";
import SubjectDetails from "./pages/SubjectDetails";

import StudentRegister from "./pages/StudentRegister";
import TeacherRegister from "./pages/TeacherRegister";
import AdminRegister from "./pages/AdminRegister";

import TeacherDetails from "./pages/TeacherDetails";

import AdminDashboard from "./pages/AdminDashboard";
import TeacherDashboard from "./pages/TeacherDashboard";
import StudentDashboard from "./pages/StudentDashboard";

import Assignments from "./pages/Assignments";
import TeacherAssignments from "./pages/TeacherAssignments";

import ExtraClasses from "./pages/ExploreMore";
import TakeAttendance from "./pages/TakeAttendance";

import StudentQueries from "./pages/StudentQueries";
import RaiseQuery from "./pages/RaiseQuery";

import ManageStudents from "./pages/ManageStudents";
import ManageTeachers from "./pages/ManageTeachers";
import ManagePayments from "./pages/ManagePayments";
import ManageSubjects from "./pages/ManageSubjects";

import FeePayment from "./pages/FeePayment";
import PaymentHistory from "./pages/PaymentHistory";
import Payments from "./pages/Payments";

import LiveClass from "./pages/LiveClass";
import TeacherSubjects from "./pages/TeacherSubjects";

import NotFound from "./pages/NotFound";

/* =========================================================
   COMPONENTS
========================================================= */

import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import ErrorBoundary from "./components/ErrorBoundary";
import JitsiRedirectHandler from "./components/JitsiRedirectHandler";

/* =========================================================
   CONTEXT
========================================================= */

import { LiveClassProvider } from "./contexts/LiveClassContext";

/* =========================================================
   STYLES
========================================================= */

import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

import "./styles/layout.css";

/* =========================================================
   SAFE USER HELPER
========================================================= */

const getStoredUser = () => {
  try {
    const raw = localStorage.getItem("user");

    if (!raw || raw === "undefined" || raw === "null") {
      return null;
    }

    const parsed = JSON.parse(raw);

    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    return parsed;
  } catch (error) {
    console.error(
      "Error reading user from localStorage:",
      error
    );

    return null;
  }
};

/* =========================================================
   APP CONTENT
========================================================= */

const AppContent = () => {

  /* =======================================================
     STATE
  ======================================================= */

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [isMobile, setIsMobile] = useState(
    window.innerWidth <= 768
  );

  const [student, setStudent] = useState(
    getStoredUser
  );

  /* =======================================================
     LOCATION
  ======================================================= */

  const location = useLocation();

  /* =======================================================
     LOGIN STATUS
  ======================================================= */

  const userRole = localStorage.getItem("userRole");

  const isLoggedIn = !!userRole;

  /* =======================================================
     SPECIAL PAGES
  ======================================================= */

  const isLoginPage =
    location.pathname === "/login";

  const isStudentRegisterPage =
    location.pathname === "/register/student";

  const isTeacherRegisterPage =
    location.pathname === "/register/teacher";

  const isAdminRegisterPage =
    location.pathname === "/admin-register";

  /*
     Registration and login pages
     do not use the dashboard sidebar.
  */

  const isRegistrationPage =
    isStudentRegisterPage ||
    isTeacherRegisterPage ||
    isAdminRegisterPage;

  const isSpecialPage =
    isLoginPage ||
    isRegistrationPage;

  /* =======================================================
     UPDATE USER WHEN ROUTE CHANGES
  ======================================================= */

  useEffect(() => {
    const storedUser = getStoredUser();

    setStudent(storedUser);
  }, [location.pathname]);

  /* =======================================================
     HANDLE SCREEN RESIZE
  ======================================================= */

  useEffect(() => {

    const handleResize = () => {

      const mobile =
        window.innerWidth <= 768;

      setIsMobile(mobile);

      /*
         Login and registration pages
         never use the dashboard sidebar.
      */

      if (isSpecialPage) {
        setSidebarOpen(false);
        return;
      }

      /*
         Mobile does not keep
         the sidebar permanently open.
      */

      if (mobile) {
        setSidebarOpen(false);
        return;
      }

      /*
         Desktop logged-in user
      */

      if (isLoggedIn) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };

    handleResize();

    window.addEventListener(
      "resize",
      handleResize
    );

    return () => {
      window.removeEventListener(
        "resize",
        handleResize
      );
    };

  }, [
    isLoggedIn,
    isSpecialPage,
  ]);

  /* =======================================================
     CLOSE MOBILE SIDEBAR ON ROUTE CHANGE
  ======================================================= */

  useEffect(() => {

    if (isMobile || isSpecialPage) {
      setSidebarOpen(false);
    }

  }, [
    location.pathname,
    isMobile,
    isSpecialPage,
  ]);

  /* =======================================================
     APPLICATION ROUTES
  ======================================================= */

  const AppRoutes = () => (
    <Routes>

      {/* =================================================
          HOME
      ================================================= */}

      <Route
        path="/"
        element={<Home />}
      />

      {/* =================================================
          LOGIN
      ================================================= */}

      <Route
        path="/login"
        element={<Login />}
      />

      {/* =================================================
          REGISTRATION
      ================================================= */}

      <Route
        path="/register/student"
        element={<StudentRegister />}
      />

      <Route
        path="/register/teacher"
        element={<TeacherRegister />}
      />

      <Route
        path="/admin-register"
        element={<AdminRegister />}
      />

      {/* =================================================
          SUBJECTS
      ================================================= */}

      <Route
        path="/subjects"
        element={<Subjects />}
      />

      <Route
  path="/subjects/:subjectName"
  element={<SubjectDetails />}
/>

      <Route
        path="/teacher-subjects"
        element={<TeacherSubjects />}
      />

      {/* =================================================
          TEACHER DETAILS
      ================================================= */}

      <Route
        path="/teacher-details"
        element={<TeacherDetails />}
      />

      {/* =================================================
          DASHBOARDS
      ================================================= */}

      <Route
        path="/admin-dashboard"
        element={<AdminDashboard />}
      />

      <Route
        path="/teacher-dashboard"
        element={<TeacherDashboard />}
      />

      <Route
        path="/student-dashboard"
        element={
          <StudentDashboard
            student={student}
          />
        }
      />

      {/* =================================================
          ASSIGNMENTS
      ================================================= */}

      <Route
        path="/assignments"
        element={<Assignments />}
      />

      <Route
        path="/teacher-assignments"
        element={<TeacherAssignments />}
      />

      {/* =================================================
          EXTRA CLASSES
      ================================================= */}

      <Route
        path="/explore-more"
        element={<ExtraClasses />}
      />

      {/* =================================================
          ATTENDANCE
      ================================================= */}

      <Route
        path="/take-attendance"
        element={<TakeAttendance />}
      />

      {/* =================================================
          QUERIES
      ================================================= */}

      <Route
        path="/student-queries"
        element={<StudentQueries />}
      />

      <Route
        path="/queries"
        element={<RaiseQuery />}
      />

      {/* =================================================
          ADMIN MANAGEMENT
      ================================================= */}

      <Route
        path="/manage-students"
        element={<ManageStudents />}
      />

      <Route
        path="/manage-teachers"
        element={<ManageTeachers />}
      />

      <Route
        path="/manage-payments"
        element={<ManagePayments />}
      />

      <Route
        path="/manage-subjects"
        element={<ManageSubjects />}
      />

      {/* =================================================
          PAYMENTS
      ================================================= */}

      <Route
        path="/payments"
        element={<Payments />}
      />

      <Route
        path="/fee-payment"
        element={<FeePayment />}
      />

      <Route
        path="/payment-history"
        element={<PaymentHistory />}
      />

      {/* =================================================
          LIVE CLASS
      ================================================= */}

      <Route
        path="/live-class"
        element={<LiveClass />}
      />

      {/* =================================================
          404 PAGE
      ================================================= */}

      <Route
        path="*"
        element={<NotFound />}
      />

    </Routes>
  );

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <>
      {/* ===============================================
          JITSI REDIRECT HANDLER
      =============================================== */}

      <JitsiRedirectHandler />

      {/* ===============================================
          SPECIAL PAGES

          Login and registration pages have
          their own layout and navbar.
      =============================================== */}

      {isSpecialPage ? (

        <div className="special-page-wrapper">
          <AppRoutes />
        </div>

      ) : (

        <>

          {/* ===========================================
              GLOBAL NAVBAR
          =========================================== */}

          <Navbar
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
            isMobile={isMobile}
          />

          {/* ===========================================
              SIDEBAR

              Only show for logged-in users.
          =========================================== */}

          {isLoggedIn && (

            <Sidebar
              isOpen={sidebarOpen}
              setIsOpen={setSidebarOpen}
              isMobile={isMobile}
            />

          )}

          {/* ===========================================
              MAIN CONTENT
          =========================================== */}

          <main
            className={
              /*
                 PUBLIC PAGES

                 Home page must use public-content.
                 This removes:
                 - 70px sidebar space
                 - 24px outer border space

                 DASHBOARD PAGES

                 Logged-in users use sidebar layout.
              */

              !isLoggedIn
                ? "main-content public-content"

                : isMobile
                ? "main-content"

                : sidebarOpen
                ? "main-content sidebar-open"

                : "main-content sidebar-collapsed"
            }
          >

            <AppRoutes />

          </main>

        </>

      )}

    </>
  );
};

/* =========================================================
   MAIN APP
========================================================= */

function App() {

  return (
    <ErrorBoundary>

      <Router>

        <LiveClassProvider>

          <AppContent />

        </LiveClassProvider>

      </Router>

    </ErrorBoundary>
  );
}

/* =========================================================
   EXPORT
========================================================= */

export default App;