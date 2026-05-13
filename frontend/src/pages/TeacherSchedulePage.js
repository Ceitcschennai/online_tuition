// // src/pages/TeacherSchedulePage.jsx

// import React, { useState } from 'react';
// import '../styles/schedule.css';

// const classOptions = ['6', '7', '8', '9', '10', '11', '12'];
// const subjectOptions = ['Maths', 'Science', 'Physics', 'Chemistry', 'Biology', 'English', 'History'];
// const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// const TeacherSchedulePage = () => {
//   const [schedule, setSchedule] = useState([]);
//   const [form, setForm] = useState({
//     class: '',
//     subject: '',
//     day: '',
//     time: ''
//   });

//   const handleChange = (e) => {
//     const { name, value } = e.target;
//     setForm(prev => ({ ...prev, [name]: value }));
//   };

//   const handleAddSchedule = () => {
//     if (!form.class || !form.subject || !form.day || !form.time) {
//       alert('Please fill all fields.');
//       return;
//     }

//     setSchedule(prev => [...prev, form]);
//     setForm({ class: '', subject: '', day: '', time: '' });
//   };

//   return (
//     <div className="schedule-page">
//       <h2>Set Your Class Schedule</h2>

//       <div className="schedule-form">
//         <select name="class" value={form.class} onChange={handleChange}>
//           <option value="">Select Class</option>
//           {classOptions.map(cls => (
//             <option key={cls} value={cls}>{cls}</option>
//           ))}
//         </select>

//         <select name="subject" value={form.subject} onChange={handleChange}>
//           <option value="">Select Subject</option>
//           {subjectOptions.map(sub => (
//             <option key={sub} value={sub}>{sub}</option>
//           ))}
//         </select>

//         <select name="day" value={form.day} onChange={handleChange}>
//           <option value="">Select Day</option>
//           {daysOfWeek.map(day => (
//             <option key={day} value={day}>{day}</option>
//           ))}
//         </select>

//         <input
//           type="time"
//           name="time"
//           value={form.time}
//           onChange={handleChange}
//         />

//         <button onClick={handleAddSchedule}>Add</button>
//       </div>

//       <h3>Scheduled Classes</h3>
//       <table className="schedule-table">
//         <thead>
//           <tr>
//             <th>Class</th>
//             <th>Subject</th>
//             <th>Day</th>
//             <th>Time</th>
//           </tr>
//         </thead>
//         <tbody>
//           {schedule.map((s, idx) => (
//             <tr key={idx}>
//               <td>{s.class}</td>
//               <td>{s.subject}</td>
//               <td>{s.day}</td>
//               <td>{s.time}</td>
//             </tr>
//           ))}
//         </tbody>
//       </table>
//     </div>
//   );
// };

// export default TeacherSchedulePage;













// src/pages/TeacherSchedulePage.jsx

import React, { useState } from 'react';
import '../styles/schedule.css';

const classOptions = ['6', '7', '8', '9', '10', '11', '12'];
const subjectOptions = ['Maths', 'Science', 'Physics', 'Chemistry', 'Biology', 'English', 'History'];

const TeacherSchedulePage = () => {
  const [schedule, setSchedule] = useState([]);
  const [form, setForm] = useState({
    class: '',
    subject: '',
    date: '',
    time: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleAddSchedule = () => {
    if (!form.class || !form.subject || !form.date || !form.time) {
      alert('Please fill all fields.');
      return;
    }

    setSchedule(prev => [...prev, form]);
    setForm({ class: '', subject: '', date: '', time: '' });
  };

  return (
    <div className="schedule-page">
      <h2>Set Your Class Schedule</h2>

      <div className="schedule-form">
        <select name="class" value={form.class} onChange={handleChange}>
          <option value="">Select Class</option>
          {classOptions.map(cls => (
            <option key={cls} value={cls}>{cls}</option>
          ))}
        </select>

        <select name="subject" value={form.subject} onChange={handleChange}>
          <option value="">Select Subject</option>
          {subjectOptions.map(sub => (
            <option key={sub} value={sub}>{sub}</option>
          ))}
        </select>

        <input
          type="date"
          name="date"
          value={form.date}
          onChange={handleChange}
        />

        <input
          type="time"
          name="time"
          value={form.time}
          onChange={handleChange}
        />

        <button onClick={handleAddSchedule}>Add</button>
      </div>

      <h3>Scheduled Classes</h3>
      <table className="schedule-table">
        <thead>
          <tr>
            <th>Class</th>
            <th>Subject</th>
            <th>Date</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody>
          {schedule.map((s, idx) => (
            <tr key={idx}>
              <td>{s.class}</td>
              <td>{s.subject}</td>
              <td>{s.date}</td>
              <td>{s.time}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TeacherSchedulePage;
