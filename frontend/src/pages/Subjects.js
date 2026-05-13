import React from 'react';
import '../styles/subjects.css';
import { useNavigate } from 'react-router-dom';
import { FaBook, FaLaptopCode, FaCalculator } from 'react-icons/fa';
import { useLiveClass } from '../contexts/LiveClassContext';
import { joinJitsiMeeting } from '../utils/jitsiUtils';

// Images
import English from '../assets/English.jpeg';
import Tamil from '../assets/Tamil.jpeg';
import Maths from '../assets/Maths.jpeg';
import Science from '../assets/Science.jpeg';
import Social from '../assets/Social.jpeg';
import Chemistry from '../assets/Chemistry.jpeg';
import Physics from '../assets/Physics.jpeg';
import Zoology from '../assets/Zoology.jpeg';
import Botany from '../assets/Botany.jpeg';
import Economics from '../assets/Economics.jpeg';
import ComputerScience from '../assets/ComputerScience.jpeg';
import Accounts from '../assets/Accounts.jpeg';

const subjects = [
  { key: 'english', name: 'English', image: English, icon: <FaBook /> },
  { key: 'tamil', name: 'Tamil', image: Tamil, icon: <FaBook /> },
  { key: 'maths', name: 'Maths', image: Maths, icon: <FaCalculator /> },
  { key: 'science', name: 'Science', image: Science, icon: <FaBook /> },
  { key: 'social', name: 'Social', image: Social, icon: <FaBook /> },
  { key: 'physics', name: 'Physics', image: Physics, icon: <FaBook /> },
  { key: 'chemistry', name: 'Chemistry', image: Chemistry, icon: <FaBook /> },
  { key: 'botany', name: 'Botany', image: Botany, icon: <FaBook /> },
  { key: 'zoology', name: 'Zoology', image: Zoology, icon: <FaBook /> },
  { key: 'accounts', name: 'Accounts', image: Accounts, icon: <FaBook /> },
  { key: 'economics', name: 'Economics', image: Economics, icon: <FaBook /> },
  { key: 'cs', name: 'Computer Science', image: ComputerScience, icon: <FaLaptopCode /> }
];

const DEFAULT_SUBJECTS = ['english', 'tamil', 'maths', 'science', 'social'];

const classSubjectsMap = {
  'Class 1':  DEFAULT_SUBJECTS,
  'Class 2':  DEFAULT_SUBJECTS,
  'Class 3':  DEFAULT_SUBJECTS,
  'Class 4':  DEFAULT_SUBJECTS,
  'Class 5':  DEFAULT_SUBJECTS,
  'Class 6':  DEFAULT_SUBJECTS,
  'Class 7':  DEFAULT_SUBJECTS,
  'Class 8':  DEFAULT_SUBJECTS,
  'Class 9':  DEFAULT_SUBJECTS,
  'Class 10': DEFAULT_SUBJECTS,

  'Class 11': {
    'Bio-Maths':        ['english', 'tamil', 'maths', 'physics', 'chemistry', 'botany', 'zoology'],
    'Computer Science': ['english', 'tamil', 'maths', 'physics', 'chemistry', 'cs'],
    'Commerce':         ['english', 'tamil', 'accounts', 'economics'],
  },

  'Class 12': {
    'Bio-Maths':        ['english', 'tamil', 'maths', 'physics', 'chemistry', 'botany', 'zoology'],
    'Computer Science': ['english', 'tamil', 'maths', 'physics', 'chemistry', 'cs'],
    'Commerce':         ['english', 'tamil', 'accounts', 'economics'],
  },
};

// Try to find a matching group key case-insensitively
const findGroup = (groupMap, groupValue) => {
  if (!groupValue) return null;
  const lower = groupValue.trim().toLowerCase();
  const match = Object.keys(groupMap).find(k => k.toLowerCase() === lower);
  return match || null;
};

const Subjects = () => {
  const navigate = useNavigate();
  const { liveClasses } = useLiveClass();

  // ── Read student from localStorage ──
  let student = {};
  try {
    const raw = localStorage.getItem('user') || localStorage.getItem('student') || '{}';
    student = JSON.parse(raw);
    // Handle nested structures e.g. { student: {...} }
    if (student.student) student = student.student;
  } catch (e) {
    console.error('Error parsing student data:', e);
  }

  // ── Normalise class string ──
  let studentClass = (student?.class || student?.className || '').toString().trim();
  if (studentClass && !studentClass.toLowerCase().startsWith('class')) {
    studentClass = `Class ${studentClass}`;
  }

  // ── Normalise group string ──
  const studentGroup = (student?.group || student?.stream || student?.section || '').toString().trim();

  // ── Resolve allowed subject keys ──
  let allowedSubjectKeys = [];

  if (!studentClass) {
    // Not logged in or class missing → show all subjects so page isn't blank
    allowedSubjectKeys = subjects.map(s => s.key);
  } else {
    const classEntry = classSubjectsMap[studentClass];

    if (!classEntry) {
      // Unknown class → show default core subjects as fallback
      allowedSubjectKeys = DEFAULT_SUBJECTS;
    } else if (Array.isArray(classEntry)) {
      // Classes 1–10: flat array
      allowedSubjectKeys = classEntry;
    } else {
      // Classes 11–12: group-based object
      const matchedGroup = findGroup(classEntry, studentGroup);
      if (matchedGroup) {
        allowedSubjectKeys = classEntry[matchedGroup];
      } else {
        // Group undefined or not found → show union of all groups so student sees something
        const allGroupSubjects = Object.values(classEntry).flat();
        allowedSubjectKeys = [...new Set(allGroupSubjects)];
        console.warn(
          `Group "${studentGroup}" not found for ${studentClass}. Showing all group subjects as fallback.`
        );
      }
    }
  }

  console.log('Final Student Class:', studentClass);
  console.log('Student Group:', studentGroup || '(none)');
  console.log('Allowed Subjects:', allowedSubjectKeys);

  // ── Live-class lookup ──
  const getLiveClassForSubject = (subjectName) =>
    liveClasses.find(
      c => c.subject === subjectName && c.class === studentClass && c.isLive
    );

  const visibleSubjects = subjects.filter(sub => allowedSubjectKeys.includes(sub.key));

  return (
    <div className="student-subjects-wrapper">
      <h2>My Subjects</h2>

      {visibleSubjects.length === 0 ? (
        <div style={{
          textAlign: 'center', marginTop: 60, color: '#64748b'
        }}>
          <p style={{ fontSize: 18 }}>No subjects found for your class.</p>
          <p style={{ fontSize: 14 }}>
            Please contact your administrator if this seems incorrect.<br />
            (Class: <strong>{studentClass || 'Unknown'}</strong>
            {studentGroup ? `, Group: ${studentGroup}` : ''})
          </p>
        </div>
      ) : (
        <div className="student-subjects-list">
          {visibleSubjects.map((subject, idx) => {
            const liveClass = getLiveClassForSubject(subject.name);
            const isLive = !!liveClass;

            return (
              <div key={idx} className="student-subjects-card-horizontal">
                <img src={subject.image} alt={subject.name} />
                <h3>{subject.name}</h3>

                {isLive && (
                  <p style={{ color: 'red', fontWeight: 700, margin: '4px 0' }}>🔴 LIVE</p>
                )}

                {isLive ? (
                  <button
                    onClick={() =>
                      joinJitsiMeeting(
                        liveClass.roomName,
                        student.firstName || 'Student'
                      )
                    }
                  >
                    Join Live Class
                  </button>
                ) : (
                  <button onClick={() => navigate(`/subjects/${subject.name}`)}>
                    View Details
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Subjects;
