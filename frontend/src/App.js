import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';

import Home from './pages/Home';
import Login from './pages/Login';
import Subjects from './pages/Subjects';
import SubjectDetails from './pages/SubjectDetails';   // 
import StudentRegister from './pages/StudentRegister';
import TeacherRegister from './pages/TeacherRegister';

import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import TeacherDetails from './pages/TeacherDetails';
import AdminRegister from './pages/AdminRegister';
import AdminDashboard from './pages/AdminDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import StudentDashboard from './pages/StudentDashboard';
import Assignments from './pages/Assignments';
import TeacherAssignments from './pages/TeacherAssignments';
import ExtraClasses from './pages/ExploreMore';
import TakeAttendance from './pages/TakeAttendance';
import StudentQueries from './pages/StudentQueries';
import RaiseQuery from './pages/RaiseQuery';
import ManageStudents from './pages/ManageStudents';
import ManageTeachers from './pages/ManageTeachers';
import ManagePayments from './pages/ManagePayments';
import ManageSubjects from './pages/ManageSubjects';
import FeePayment from './pages/FeePayment';
import PaymentHistory from './pages/PaymentHistory';
import Payments from './pages/Payments';
import NotFound from './pages/NotFound';
import ErrorBoundary from './components/ErrorBoundary';

import { LiveClassProvider } from './contexts/LiveClassContext';
import LiveClass from './pages/LiveClass';
import TeacherSubjects from './pages/TeacherSubjects';
import JitsiRedirectHandler from './components/JitsiRedirectHandler';

import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import './styles/layout.css';

const AppContent = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const location = useLocation();
  const userRole = localStorage.getItem('userRole');
  const isLoggedIn = !!userRole;

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (!mobile && isLoggedIn) {
        setSidebarOpen(true);
      } else if (mobile) {
        setSidebarOpen(false);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isLoggedIn]);

  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [location.pathname, isMobile]);

  const getMainContentClass = () => {
    if (!isLoggedIn) return 'main-content';
    if (isMobile) return 'main-content';
    return `main-content ${sidebarOpen ? 'sidebar-open' : 'sidebar-collapsed'}`;
  };

  return (
    <>
      <JitsiRedirectHandler />

      <Navbar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        isMobile={isMobile}
      />

      {isLoggedIn && (
        <Sidebar
          isOpen={sidebarOpen}
          setIsOpen={setSidebarOpen}
          isMobile={isMobile}
        />
      )}

      <main className={getMainContentClass()}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />

          {/* SUBJECT ROUTES */}
          <Route path="/subjects" element={<Subjects />} />
  <Route path="/subjects/:subjectName" element={<SubjectDetails />} />

          {/* TEACHER */}
          <Route path="/teacher-subjects" element={<TeacherSubjects />} />
          <Route path="/teacher-details" element={<TeacherDetails />} />

          {/* REGISTRATION */}
          <Route path="/register/student" element={<StudentRegister />} />
          <Route path="/register/teacher" element={<TeacherRegister />} />
          <Route path="/admin-register" element={<AdminRegister />} />

          {/* DASHBOARDS */}
          <Route path="/admin-dashboard" element={<AdminDashboard />} />
          <Route path="/teacher-dashboard" element={<TeacherDashboard />} />
          <Route path="/student-dashboard" element={<StudentDashboard />} />

          {/* FEATURES */}
          <Route path="/assignments" element={<Assignments />} />
          <Route path="/teacher-assignments" element={<TeacherAssignments />} />
          <Route path="/explore-more" element={<ExtraClasses />} />
          <Route path="/take-attendance" element={<TakeAttendance />} />
          <Route path="/student-queries" element={<StudentQueries />} />
          <Route path="/queries" element={<RaiseQuery />} />
          <Route path="/manage-students" element={<ManageStudents />} />
          <Route path="/manage-teachers" element={<ManageTeachers />} />
          <Route path="/manage-payments" element={<ManagePayments />} />
          <Route path="/manage-subjects" element={<ManageSubjects />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="/fee-payment" element={<FeePayment />} />
          <Route path="/payment-history" element={<PaymentHistory />} />

          {/* LIVE CLASS */}
          <Route path="/live-class" element={<LiveClass />} />

          

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </>
  );
};

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

export default App;