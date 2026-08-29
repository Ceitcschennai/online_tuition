// src/services/attendanceService.js
// Call these functions from StudentDashboard when student joins/leaves a live class

import API_BASE_URL from '../config/api';

/**
 * Mark student as joined a live class (call when student clicks "Join Class")
 */
export const markStudentJoin = async (liveClass, student) => {
  try {
    const studentId = student?._id || student?.id;
    const studentName = `${student?.firstName || ''} ${student?.lastName || ''}`.trim();

    if (!studentId || !liveClass?.id) return;

    // 1. Record join in live class participants
    await fetch(`${API_BASE_URL}/api/live-classes/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        classId: liveClass.id,
        studentId,
        studentName,
        studentEmail: student?.email || ''
      })
    });

    // 2. Find attendance session for this class
    const today = new Date().toISOString().split('T')[0];
    const sessionRes = await fetch(
      `${API_BASE_URL}/api/attendance/active-session?teacherId=${liveClass.teacherId}&class=${liveClass.class}&subject=${liveClass.subject}&date=${today}`
    );
    const sessionData = await sessionRes.json();

    if (sessionData.success && sessionData.session) {
      // 3. Mark attendance as joined
      await fetch(`${API_BASE_URL}/api/attendance/mark`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionData.session._id,
          studentId,
          studentName,
          action: 'join',
          timestamp: new Date(),
          class: liveClass.class,
          subject: liveClass.subject,
          isAutoTracked: true
        })
      });
    }

    console.log(`✅ Attendance join marked for ${studentName}`);
  } catch (error) {
    console.error('Error marking student join attendance:', error);
  }
};

/**
 * Mark student as left a live class (call when student closes/leaves the class)
 */
export const markStudentLeave = async (liveClass, student) => {
  try {
    const studentId = student?._id || student?.id;
    const studentName = `${student?.firstName || ''} ${student?.lastName || ''}`.trim();

    if (!studentId || !liveClass?.id) return;

    // 1. Record leave in live class participants
    await fetch(`${API_BASE_URL}/api/live-classes/leave`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        classId: liveClass.id,
        studentId
      })
    });

    // 2. Find attendance session
    const today = new Date().toISOString().split('T')[0];
    const sessionRes = await fetch(
      `${API_BASE_URL}/api/attendance/active-session?teacherId=${liveClass.teacherId}&class=${liveClass.class}&subject=${liveClass.subject}&date=${today}`
    );
    const sessionData = await sessionRes.json();

    if (sessionData.success && sessionData.session) {
      // 3. Mark attendance as left
      await fetch(`${API_BASE_URL}/api/attendance/mark`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionData.session._id,
          studentId,
          studentName,
          action: 'leave',
          timestamp: new Date(),
          class: liveClass.class,
          subject: liveClass.subject,
          isAutoTracked: true
        })
      });
    }

    console.log(`✅ Attendance leave marked for ${studentName}`);
  } catch (error) {
    console.error('Error marking student leave attendance:', error);
  }
};