
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import '../styles/teacherDetails.css';

const TeacherDetails = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { subjectName, teachers } = location.state || {};

  if (!subjectName || !teachers) return <p>Invalid subject</p>;

  const handleJoinClass = (teacherName) => {
    const roomName = encodeURIComponent(`${subjectName}-${teacherName}`);
    navigate(`/classroom/${roomName}`);
  };

  return (
    <div className="teacher-details-container">
      <h2 className='teacher-heading'>{subjectName} - Available Tutors</h2>
      <button className="back-btn" onClick={() => navigate(-1)}>Back</button>

      <div className="teacher-list">
        {teachers.map((teacher, idx) => (
          <div className="teacher-card" key={idx}>
            <h3>{teacher.name}</h3>
            <p>⭐ Rating: {teacher.rating} / 5</p>
            <p>📧 Email: {teacher.email}</p>
            <button className="join-btn" onClick={() => handleJoinClass(teacher.name)}>
              Join Class
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TeacherDetails;
