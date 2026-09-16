import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import socketService from '../services/socketService';
import API_BASE_URL from '../config/api';

const LiveClassContext = createContext();

export const useLiveClass = () => {
  const context = useContext(LiveClassContext);
  if (!context) {
    throw new Error('useLiveClass must be used within a LiveClassProvider');
  }
  return context;
};

export const LiveClassProvider = ({ children }) => {
  const [liveClasses, setLiveClasses] = useState([]);
  const [currentClass, setCurrentClass] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketInitialized = useRef(false); // Prevent multiple socket connections

  useEffect(() => {
    // Prevent multiple socket connections
    if (socketInitialized.current) return;

    // Get user data from localStorage
    const student = JSON.parse(localStorage.getItem('student') || 'null');
    const teacher = JSON.parse(localStorage.getItem('teacher') || 'null');
    
    const userData = student || teacher;
    if (userData) {
      userData.role = student ? 'student' : 'teacher';
      
      // Connect to socket only once
      socketService.connect(userData);
      setIsConnected(true);
      socketInitialized.current = true;

      // Set up event listeners with duplicate prevention
      socketService.on('liveClassesUpdate', (classes) => {
        console.log('Live classes updated:', classes);
        setLiveClasses(classes);
      });

      socketService.on('classStarted', (data) => {
        console.log('Class started:', data);
        if (data.success && data.liveClass) {
          setCurrentClass(data.liveClass);
          // Prevent duplicates by checking if class already exists
          setLiveClasses(prev => {
            const existingIndex = prev.findIndex(cls => 
              cls.id === data.liveClass.id || 
              (cls.subject === data.liveClass.subject && 
               cls.class === data.liveClass.class && 
               cls.teacherId === data.liveClass.teacherId &&
               cls.isLive)
            );
            
            if (existingIndex >= 0) {
              // Update existing class instead of adding duplicate
              const updated = [...prev];
              updated[existingIndex] = data.liveClass;
              return updated;
            } else {
              // Add new class
              return [...prev, data.liveClass];
            }
          });
        }
      });

      socketService.on('joinClassSuccess', (data) => {
        console.log('Joined class successfully:', data);
        if (data.success) {
          setCurrentClass(data.liveClass);
        }
      });

      socketService.on('joinClassError', (data) => {
        console.error('Join class error:', data);
        alert(data.message || 'Failed to join class');
      });

      // Fetch initial live classes
      fetchLiveClasses();
    }

    return () => {
      if (socketInitialized.current) {
        socketService.disconnect();
        setIsConnected(false);
        socketInitialized.current = false;
      }
    };
  }, []); // Empty dependency array to run only once

  const fetchLiveClasses = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/live-classes`);
      const data = await response.json();
      if (Array.isArray(data)) {
        setLiveClasses(data);
      }
    } catch (error) {
      console.error('Error fetching live classes:', error);
    }
  };

  const startLiveClass = async (classData) => {
    try {
      // Check if class is already live to prevent duplicates
      const existingClass = liveClasses.find(cls =>
        cls.subject === classData.subject &&
        cls.class === classData.class &&
        cls.teacherId === classData.teacherId &&
        cls.isLive
      );

      if (existingClass) {
        console.log('Class already live, skipping duplicate creation');
        return existingClass.meetingId;
      }

      // Call REST API first
      const response = await fetch(`${API_BASE_URL}/api/live-classes/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(classData),
      });

      const data = await response.json();
      
      if (data.success) {
        // Don't emit via socket if REST API already handled it
        // The backend should broadcast the update
        return data.liveClass.meetingId;
      } else {
        throw new Error(data.message || 'Failed to start class');
      }
    } catch (error) {
      console.error('Error starting live class:', error);
      throw error;
    }
  };

  const endLiveClass = async (classId) => {
    try {
      // Call REST API first
      const response = await fetch(`${API_BASE_URL}/api/live-classes/end/${classId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      
      if (data.success) {
        // Update local state immediately
        setLiveClasses(prev => prev.filter(cls => cls.id !== classId));
        
        if (currentClass && currentClass.id === classId) {
          setCurrentClass(null);
        }
      } else {
        throw new Error(data.message || 'Failed to end class');
      }
    } catch (error) {
      console.error('Error ending live class:', error);
      throw error;
    }
  };

  const joinClass = (liveClass) => {
    socketService.joinLiveClass({ classId: liveClass.id });
  };

  const leaveClass = () => {
    setCurrentClass(null);
  };

  return (
    <LiveClassContext.Provider value={{
      liveClasses,
      currentClass,
      isConnected,
      startLiveClass,
      endLiveClass,
      joinClass,
      leaveClass
    }}>
      {children}
    </LiveClassContext.Provider>
  );
};
