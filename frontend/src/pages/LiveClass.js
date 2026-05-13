import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveClass } from '../contexts/LiveClassContext';
import JitsiMeet from '../components/JitsiMeet';

const LiveClass = () => {
  const navigate = useNavigate();
  const { currentClass, leaveClass } = useLiveClass();

  useEffect(() => {
    // Redirect if no current class
    if (!currentClass) {
      navigate('/subjects');
      return;
    }
  }, [currentClass, navigate]);

  const handleMeetingEnd = () => {
    leaveClass();
    navigate('/subjects');
  };

  if (!currentClass) {
    return (
      <div className="loading-container">
        <p>Loading class...</p>
      </div>
    );
  }

  // Get user data for display name
  const student = JSON.parse(localStorage.getItem('student') || 'null');
  const teacher = JSON.parse(localStorage.getItem('teacher') || 'null');
  const user = student || teacher;

  return (
    <div className="live-class-container">
      <div className="class-header">
        <h2>{currentClass.subject} - {currentClass.class}</h2>
        <p>Teacher: {currentClass.teacher}</p>
        <button 
          className="leave-class-btn"
          onClick={handleMeetingEnd}
        >
          Leave Class
        </button>
      </div>
      
      <JitsiMeet 
        meetingId={currentClass.meetingId}
        displayName={user?.name || 'Anonymous'}
        onMeetingEnd={handleMeetingEnd}
      />
    </div>
  );
};

export default LiveClass;
