import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import API_BASE_URL from "../config/api";
import {
  FaBook, FaLaptopCode, FaCalculator, FaStop, FaSpinner,
  FaExclamationTriangle, FaVideo, FaPlus, FaTimes, FaCalendarAlt,
  FaClock, FaChalkboardTeacher, FaStickyNote, FaDesktop,
  FaCopy, FaCheck, FaShareAlt, FaTrash
} from "react-icons/fa";
import { useLiveClass } from "../contexts/LiveClassContext";
import { generateRoomName, openJitsiInNewTab } from "../utils/jitsiUtils";

import Maths from "../assets/Maths.jpeg";
import Physics from "../assets/Physics.jpeg";
import Chemistry from "../assets/Chemistry.jpeg";
import English from "../assets/English.jpeg";
import Tamil from "../assets/Tamil.jpeg";
import Science from "../assets/Science.jpeg";
import Social from "../assets/Social.jpeg";
import Zoology from "../assets/Zoology.jpeg";
import Botany from "../assets/Botany.jpeg";
import Geography from "../assets/Geography.jpeg";
import History from "../assets/History.jpeg";
import Economics from "../assets/Economics.jpeg";
import Hindi from "../assets/Hindi.jpeg";
import ComputerScience from "../assets/ComputerScience.jpeg";
import Accounts from "../assets/Accounts.jpeg";

const PLATFORMS = ["Jitsi Meet", "Zoom", "Google Meet", "Microsoft Teams", "Cisco Webex"];

const imageMap = {
  Maths, Physics, Chemistry, English, Tamil, Science, Social,
  Zoology, Botany, Geography, History, Economics, Hindi,
  "Computer Science": ComputerScience, Accounts
};

const getSubjectIcon = (name) => {
  if (name === "Maths") return <FaCalculator />;
  if (name === "Computer Science") return <FaLaptopCode />;
  return <FaBook />;
};

const TeacherSubjects = () => {
  const navigate = useNavigate();
  const { liveClasses, startLiveClass, endLiveClass } = useLiveClass();

  const [teacher, setTeacher] = useState(null);
  const [teacherSubjects, setTeacherSubjects] = useState([]);
  const [startingClass, setStartingClass] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  // createdClasses now loaded from backend
  const [createdClasses, setCreatedClasses] = useState([]);
  const [copiedId, setCopiedId] = useState(null);
  const [showShareModal, setShowShareModal] = useState(null);
  const [savingClass, setSavingClass] = useState(false);
  const [form, setForm] = useState({
    className: "", subject: "", studentClass: "",
    date: "", time: "", platform: "Jitsi Meet",
    description: "", manualLink: ""
  });

  // ── Load teacher from localStorage ──
  useEffect(() => {
    const teacherData = JSON.parse(localStorage.getItem("user"));
    if (teacherData) setTeacher(teacherData);
    else { setError("Please login again"); setLoading(false); }
  }, []);

  // ── Fetch teacher subjects ──
  useEffect(() => {
    const fetchTeacherSubjects = async () => {
      if (!teacher?._id) return;
      try {
        const response = await fetch(`${API_BASE_URL}/api/teachers/subjects/${teacher._id}`);
        const data = await response.json();
        if (data.success) {
          setTeacherSubjects(data.subjects.map((s) => ({
            ...s,
            image: imageMap[s.name] || imageMap["Science"],
            icon: getSubjectIcon(s.name)
          })));
        } else setError(data.message);
      } catch { setError("Server connection failed"); }
      finally { setLoading(false); }
    };
    if (teacher) fetchTeacherSubjects();
  }, [teacher]);

  // ── Fetch scheduled classes from backend ──
  useEffect(() => {
    const fetchScheduledClasses = async () => {
      if (!teacher?._id) return;
      try {
        const res = await fetch(`${API_BASE_URL}/api/live-classes/scheduled?teacherId=${teacher._id}`);
        const data = await res.json();
        if (data.success) {
          // Normalize _id to id for consistency
          setCreatedClasses(data.scheduledClasses.map(c => ({ ...c, id: c._id || c.id })));
        }
      } catch (e) {
        console.error("Failed to fetch scheduled classes:", e);
      }
    };
    if (teacher) fetchScheduledClasses();
  }, [teacher]);

  const isSubjectLive = (subject, className) =>
    liveClasses.some(c =>
      c.subject === subject &&
      c.class === className &&
      c.teacherId === teacher?._id &&
      c.isLive
    );

  const handleStartClass = async (subject, className) => {
    setStartingClass(`${subject.name}-${className}`);
    try {
      const roomName = generateRoomName(subject.name, className, teacher._id);
      await startLiveClass({
        subject: subject.name,
        teacher: teacher.firstName,
        teacherId: teacher._id,
        class: className,
        roomName,
        jitsiUrl: `https://meet.jit.si/${roomName}`
      });
      openJitsiInNewTab(roomName, `${teacher.firstName} (Teacher)`, subject.name, className);
    } catch { alert("Failed to start class"); }
    finally { setStartingClass(null); }
  };

  const handleEndClass = (subject, className) => {
    const liveClass = liveClasses.find(c =>
      c.subject === subject.name &&
      c.class === className &&
      c.teacherId === teacher?._id
    );
    if (liveClass) {
      endLiveClass(liveClass.id);
      if (liveClass.roomName) localStorage.removeItem(`meeting_${liveClass.roomName}`);
      alert(`Class ended for ${subject.name} - ${className}`);
    }
  };

  const handleFormChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  // Returns the Jitsi link for a class (or manualLink for other platforms)
  const getClassLink = (cls) => {
    if (cls.platform === "Jitsi Meet") {
      const roomName = cls.roomName || generateRoomName(cls.subject, cls.studentClass || cls.className, teacher?._id);
      return cls.jitsiUrl || `https://meet.jit.si/${roomName}`;
    }
    return cls.manualLink || null;
  };

  const handleCopyLink = (cls) => {
    const link = getClassLink(cls);
    if (link) {
      navigator.clipboard.writeText(link);
      setCopiedId(cls.id);
      setTimeout(() => setCopiedId(null), 2000);
    } else {
      alert(`Please enter your ${cls.platform} link in the share panel first.`);
    }
  };

  const [queries, setQueries] = useState([]);


useEffect(() => {
  const pending = queries.filter(q => q.status === "Pending");
  if (pending.length > 0) {
    alert(`You have ${pending.length} new queries`);
  }
}, [queries]);
useEffect(() => {
  if (!teacher?._id) return;

  const fetchQueries = async () => {
    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/queries/teacher/${teacher._id}`
      );

      setQueries(res.data.queries || []);
    } catch (err) {
      console.error("Error fetching queries:", err);
    }
  };

  fetchQueries();
}, [teacher?._id]);

  // ── Copy full class details as text ──
  const handleCopyDetails = (cls) => {
    const link = getClassLink(cls);
    const text =
      `📚 Class: ${cls.className}\n` +
      `📖 Subject: ${cls.subject}${cls.studentClass ? ` (${cls.studentClass})` : ""}\n` +
      `📅 Date & Time: ${cls.date} at ${cls.time}\n` +
      `💻 Platform: ${cls.platform}\n` +
      (link ? `🔗 Join Link: ${link}\n` : "") +
      (cls.description ? `📝 Notes: ${cls.description}` : "");
    navigator.clipboard.writeText(text);
    setCopiedId(`details-${cls.id}`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // ── Save manual link for non-Jitsi platforms ──
  const handleSaveManualLink = async (cls, link) => {
    try {
      await fetch(`${API_BASE_URL}/api/live-classes/scheduled/${cls.id}/link`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ manualLink: link })
      });
      setCreatedClasses(prev =>
        prev.map(c => c.id === cls.id ? { ...c, manualLink: link } : c)
      );
      if (showShareModal?.id === cls.id) {
        setShowShareModal(prev => ({ ...prev, manualLink: link }));
      }
    } catch (e) {
      console.error("Failed to save link:", e);
    }
  };

  // ── Delete a scheduled class ──
  const handleDeleteClass = async (cls) => {
    if (!window.confirm(`Delete "${cls.className}"?`)) return;
    try {
      await fetch(`${API_BASE_URL}/api/live-classes/scheduled/${cls.id}`, { method: "DELETE" });
      setCreatedClasses(prev => prev.filter(c => c.id !== cls.id));
    } catch (e) {
      alert("Failed to delete class.");
    }
  };

  // ── Create & save scheduled class to backend ──
  const handleCreateClass = async () => {
    if (!form.className || !form.subject || !form.date || !form.time) {
      alert("Please fill in Class Name, Subject, Date and Time.");
      return;
    }
    setSavingClass(true);
    try {
      const roomName = form.platform === "Jitsi Meet"
        ? generateRoomName(form.subject, form.studentClass || form.className, teacher?._id)
        : null;
      const jitsiUrl = roomName ? `https://meet.jit.si/${roomName}` : null;

      const payload = {
        ...form,
        teacherId: teacher?._id,
        teacherName: teacher?.firstName,
        roomName,
        jitsiUrl,
      };

      const res = await fetch(`${API_BASE_URL}/api/live-classes/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!data.success) throw new Error(data.message || "Failed to save class");

      const savedClass = { ...data.scheduledClass, id: data.scheduledClass._id || Date.now() };
      setCreatedClasses(prev => [savedClass, ...prev]);
      setForm({ className: "", subject: "", studentClass: "", date: "", time: "", platform: "Jitsi Meet", description: "", manualLink: "" });
      setShowModal(false);
      setShowShareModal(savedClass); // auto-open share modal
    } catch (err) {
      alert("Error saving class: " + err.message);
    } finally {
      setSavingClass(false);
    }
  };

  if (loading) return (
    <div style={S.center}>
      <FaSpinner style={{ fontSize: 32, animation: "spin 1s linear infinite", color: "#0891b2" }} />
      <p style={{ marginTop: 12, color: "#64748b" }}>Loading your subjects...</p>
    </div>
  );

  if (error) return (
    <div style={S.center}>
      <FaExclamationTriangle style={{ fontSize: 40, color: "#f59e0b" }} />
      <h3 style={{ margin: "12px 0 4px", color: "#1e293b" }}>Unable to Load Subjects</h3>
      <p style={{ color: "#64748b", marginBottom: 16 }}>{error}</p>
      <button style={S.btnPrimary} onClick={() => navigate("/login")}>Login Again</button>
    </div>
  );

  return (
    <div style={S.wrapper}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap');
        * { box-sizing: border-box; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes modalIn { from { opacity:0; transform:scale(0.93); } to { opacity:1; transform:scale(1); } }
        .ts-card:hover { transform: translateY(-4px); box-shadow: 0 12px 32px rgba(8,145,178,0.13) !important; }
        .ts-btn:hover { opacity: 0.88; transform: scale(1.03); }
        .ts-row:hover { background: #f0f9ff !important; }
        .ts-created:hover { box-shadow: 0 6px 24px rgba(8,145,178,0.14) !important; }
        .ts-input:focus { border-color: #0891b2 !important; background: #fff !important; outline: none; }
        .share-btn-card:hover { border-color: #0891b2 !important; color: #0891b2 !important; }
        .delete-btn:hover { background: #fee2e2 !important; color: #dc2626 !important; }
      `}</style>

      {/* ── HEADER ── */}
      <div style={S.header}>
        <div>
          <h2 style={S.headerTitle}>My Subjects</h2>
          <p style={S.headerSub}>Manage and start live classes for your assigned subjects</p>
        </div>
        <button style={S.btnCreate} className="ts-btn" onClick={() => setShowModal(true)}>
          <FaPlus style={{ marginRight: 8 }} /> Create New Class
        </button>
      </div>

      {/* ── SCHEDULED CLASSES ── */}
      {createdClasses.length > 0 && (
        <div style={S.section}>
          <h3 style={S.sectionTitle}>📅 Scheduled Classes</h3>
          <div style={S.createdGrid}>
            {createdClasses.map((cls) => {
              const link = getClassLink(cls);
              const copied = copiedId === cls.id;
              return (
                <div key={cls.id} style={S.createdCard} className="ts-created">
                  {/* Top row: badge + delete */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <div style={S.createdBadge}>{cls.platform}</div>
                    <button
                      className="delete-btn"
                      style={S.deleteBtn}
                      onClick={() => handleDeleteClass(cls)}
                      title="Delete class"
                    >
                      <FaTrash />
                    </button>
                  </div>

                  <h4 style={S.createdName}>{cls.className}</h4>
                  <p style={S.createdMeta}>
                    <FaBook style={{ marginRight: 6, color: "#0891b2" }} />
                    {cls.subject}{cls.studentClass ? ` · ${cls.studentClass}` : ""}
                  </p>
                  <p style={S.createdMeta}>
                    <FaCalendarAlt style={{ marginRight: 6, color: "#0891b2" }} />
                    {cls.date} at {cls.time}
                  </p>
                  {cls.description && <p style={S.createdDesc}>"{cls.description}"</p>}

                  {/* Link display */}
                  {link ? (
                    <div style={S.linkRow}>
                      <div style={S.linkBox}>
                        <span style={S.linkText}>{link}</span>
                      </div>
                      <button
                        style={{ ...S.copyBtn, ...(copied ? S.copyBtnDone : {}) }}
                        onClick={() => handleCopyLink(cls)}
                        title="Copy link"
                      >
                        {copied ? <FaCheck /> : <FaCopy />}
                        <span style={{ marginLeft: 5 }}>{copied ? "Copied!" : "Copy"}</span>
                      </button>
                    </div>
                  ) : (
                    <p style={{ fontSize: 12, color: "#f59e0b", marginTop: 10, fontWeight: 600 }}>
                      ⚠️ No link yet — add one via Share
                    </p>
                  )}

                  <button
                    style={S.shareCardBtn}
                    className="share-btn-card"
                    onClick={() => setShowShareModal(cls)}
                  >
                    <FaShareAlt style={{ marginRight: 6 }} /> Share Class Details
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── SUBJECT CARDS ── */}
      <div style={S.section}>
        <h3 style={S.sectionTitle}>📚 Assigned Subjects</h3>
        {teacherSubjects.length === 0 ? (
          <p style={{ color: "#94a3b8", textAlign: "center", padding: 32 }}>No subjects assigned yet.</p>
        ) : (
          <div style={S.grid}>
            {teacherSubjects.map((subject, i) => (
              <div key={i} style={S.card} className="ts-card">
                <div style={S.cardImgWrap}>
                  <img src={subject.image} alt={subject.name} style={S.cardImg} />
                  <div style={S.cardOverlay}>
                    <span style={S.cardIcon}>{subject.icon}</span>
                  </div>
                </div>
                <div style={S.cardBody}>
                  <h3 style={S.cardTitle}>{subject.name}</h3>
                  <p style={S.cardClasses}>Classes: {subject.classes?.join(", ")}</p>
                  <div style={S.classRows}>
                    {subject.classes.map((className) => {
                      const isLive = isSubjectLive(subject.name, className);
                      const isStarting = startingClass === `${subject.name}-${className}`;
                      return (
                        <div key={className} style={S.classRow} className="ts-row">
                          <span style={S.classLabel}>{className}</span>
                          {isLive ? (
                            <button style={S.btnEnd} className="ts-btn" onClick={() => handleEndClass(subject, className)}>
                              <FaStop style={{ marginRight: 5 }} /> End
                            </button>
                          ) : (
                            <button
                              style={S.btnStart}
                              className="ts-btn"
                              onClick={() => handleStartClass(subject, className)}
                              disabled={isStarting}
                            >
                              {isStarting
                                ? <><FaSpinner style={{ marginRight: 5 }} />Starting...</>
                                : <><FaVideo style={{ marginRight: 5 }} />Start Live</>}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── CREATE CLASS MODAL ── */}
      {showModal && (
        <div style={S.overlay} onClick={() => setShowModal(false)}>
          <div style={S.modal} onClick={(e) => e.stopPropagation()}>
            <div style={S.modalHeader}>
              <h3 style={S.modalTitle}>
                <FaChalkboardTeacher style={{ marginRight: 10 }} />Create New Class
              </h3>
              <button style={S.closeBtn} onClick={() => setShowModal(false)}><FaTimes /></button>
            </div>
            <div style={S.modalBody}>
              <div style={S.formGrid}>
                <div style={S.formGroup}>
                  <label style={S.label}>Class Name *</label>
                  <input
                    style={S.input} className="ts-input"
                    name="className" value={form.className}
                    onChange={handleFormChange}
                    placeholder="e.g. Morning Maths Session"
                  />
                </div>
               <div style={S.formGroup}>
  <label style={S.label}>Subject *</label>
  <input
    style={S.input}
    className="ts-input"
    name="subject"
    value={form.subject}
    onChange={handleFormChange}
    placeholder="e.g. Maths, Physics, Drawing..."
    autoComplete="off"
  />
</div>
                <div style={S.formGroup}>
                  <label style={S.label}><FaChalkboardTeacher style={{ marginRight: 6 }} />Student Class</label>
                  <input
                    style={S.input} className="ts-input"
                    name="studentClass" value={form.studentClass}
                    onChange={handleFormChange}
                    placeholder="e.g. Grade 10, Class 12A"
                  />
                </div>
                <div style={S.formGroup}>
                  <label style={S.label}><FaDesktop style={{ marginRight: 6 }} />Platform</label>
                  <select style={S.input} className="ts-input" name="platform" value={form.platform} onChange={handleFormChange}>
                    {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div style={S.formGroup}>
                  <label style={S.label}><FaCalendarAlt style={{ marginRight: 6 }} />Date *</label>
                  <input style={S.input} className="ts-input" type="date" name="date" value={form.date} onChange={handleFormChange} />
                </div>
                <div style={S.formGroup}>
                  <label style={S.label}><FaClock style={{ marginRight: 6 }} />Time *</label>
                  <input style={S.input} className="ts-input" type="time" name="time" value={form.time} onChange={handleFormChange} />
                </div>
              </div>
              <div style={{ ...S.formGroup, marginTop: 8 }}>
                <label style={S.label}><FaStickyNote style={{ marginRight: 6 }} />Notes / Description</label>
                <textarea
                  style={{ ...S.input, height: 80, resize: "vertical" }}
                  className="ts-input"
                  name="description" value={form.description}
                  onChange={handleFormChange}
                  placeholder="Topics to cover, materials needed..."
                />
              </div>
              {/* For non-Jitsi: let teacher enter link now */}
              {form.platform !== "Jitsi Meet" && (
                <div style={{ ...S.formGroup, marginTop: 8 }}>
                  <label style={S.label}>🔗 {form.platform} Meeting Link</label>
                  <input
                    style={S.input} className="ts-input"
                    name="manualLink" value={form.manualLink}
                    onChange={handleFormChange}
                    placeholder={`Paste your ${form.platform} invite link here`}
                  />
                </div>
              )}
              {form.platform === "Jitsi Meet" && (
                <div style={S.infoBox}>
                  <FaVideo style={{ marginRight: 8, color: "#0891b2" }} />
                  A Jitsi Meet link will be auto-generated and shared with students.
                </div>
              )}
            </div>
            <div style={S.modalFooter}>
              <button style={S.btnCancel} className="ts-btn" onClick={() => setShowModal(false)}>Cancel</button>
              <button style={S.btnCreate} className="ts-btn" onClick={handleCreateClass} disabled={savingClass}>
                {savingClass
                  ? <><FaSpinner style={{ marginRight: 8 }} />Saving...</>
                  : <><FaCalendarAlt style={{ marginRight: 8 }} /> Schedule Class</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SHARE MODAL ── */}
      {showShareModal && (
        <div style={S.overlay} onClick={() => setShowShareModal(null)}>
          <div style={{ ...S.modal, maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
            <div style={S.modalHeader}>
              <h3 style={S.modalTitle}><FaShareAlt style={{ marginRight: 10 }} />Share Class</h3>
              <button style={S.closeBtn} onClick={() => setShowShareModal(null)}><FaTimes /></button>
            </div>
            <div style={S.modalBody}>

              {/* Class details summary */}
              <div style={S.shareInfoBox}>
                <div style={S.shareRow}><span style={S.shareLabel}>Class</span><span style={S.shareValue}>{showShareModal.className}</span></div>
                <div style={S.shareRow}><span style={S.shareLabel}>Subject</span><span style={S.shareValue}>{showShareModal.subject}</span></div>
                <div style={S.shareRow}><span style={S.shareLabel}>Student Class</span><span style={S.shareValue}>{showShareModal.studentClass || "—"}</span></div>
                <div style={S.shareRow}><span style={S.shareLabel}>Date & Time</span><span style={S.shareValue}>{showShareModal.date} at {showShareModal.time}</span></div>
                <div style={S.shareRow}><span style={S.shareLabel}>Platform</span><span style={S.shareValue}>{showShareModal.platform}</span></div>
              </div>

              {/* Link section */}
              {showShareModal.platform === "Jitsi Meet" ? (
                <>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#374151", margin: "18px 0 8px" }}>
                    🔗 Send this link to your students:
                  </p>
                  <div style={S.shareLinkBox}>
                    <span style={S.shareLinkText}>{getClassLink(showShareModal)}</span>
                  </div>
                </>
              ) : (
                <>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#374151", margin: "18px 0 8px" }}>
                    🔗 Paste your {showShareModal.platform} meeting link:
                  </p>
                  <input
                    style={{ ...S.input, width: "100%" }}
                    className="ts-input"
                    placeholder={`e.g. https://zoom.us/j/...`}
                    value={showShareModal.manualLink || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      setShowShareModal(prev => ({ ...prev, manualLink: val }));
                      // Auto-save after short delay
                      clearTimeout(window._linkSaveTimer);
                      window._linkSaveTimer = setTimeout(() => {
                        handleSaveManualLink(showShareModal, val);
                      }, 800);
                    }}
                  />
                </>
              )}

              {/* Copy join link button */}
              <button
                style={{
                  ...S.btnCreate, width: "100%", justifyContent: "center", marginTop: 12,
                  ...(copiedId === showShareModal.id ? { background: "linear-gradient(135deg,#16a34a,#15803d)" } : {}),
                  ...((!getClassLink(showShareModal)) ? { opacity: 0.5, cursor: "not-allowed" } : {})
                }}
                className="ts-btn"
                onClick={() => handleCopyLink(showShareModal)}
                disabled={!getClassLink(showShareModal)}
              >
                {copiedId === showShareModal.id
                  ? <><FaCheck style={{ marginRight: 8 }} /> Link Copied!</>
                  : <><FaCopy style={{ marginRight: 8 }} /> Copy Join Link</>}
              </button>

              {/* Copy full details button */}
              <button
                style={{
                  ...S.btnCancel, width: "100%", justifyContent: "center", marginTop: 10,
                  display: "flex", alignItems: "center",
                  ...(copiedId === `details-${showShareModal.id}` ? { background: "#dcfce7", color: "#16a34a" } : {})
                }}
                className="ts-btn"
                onClick={() => handleCopyDetails(showShareModal)}
              >
                {copiedId === `details-${showShareModal.id}`
                  ? <><FaCheck style={{ marginRight: 8 }} /> Details Copied!</>
                  : <><FaCopy style={{ marginRight: 8 }} /> Copy All Details (for WhatsApp/Email)</>}
              </button>

              <p style={{ fontSize: 12, color: "#94a3b8", textAlign: "center", marginTop: 10 }}>
                Paste in WhatsApp, email, or your class group to invite students.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const S = {
  wrapper: { fontFamily: "'Nunito', sans-serif", padding: "28px 32px", minHeight: "100vh", background: "#f8fafc", animation: "fadeIn 0.4s ease" },
  center: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", fontFamily: "'Nunito', sans-serif" },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32, flexWrap: "wrap", gap: 16 },
  headerTitle: { margin: 0, fontSize: 26, fontWeight: 800, color: "#0f172a" },
  headerSub: { margin: "4px 0 0", color: "#64748b", fontSize: 14 },
  section: { marginBottom: 36 },
  sectionTitle: { fontSize: 17, fontWeight: 700, color: "#1e293b", marginBottom: 16, paddingBottom: 8, borderBottom: "2px solid #e2e8f0" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 22 },
  card: { background: "#fff", borderRadius: 16, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.07)", transition: "transform 0.2s, box-shadow 0.2s" },
  cardImgWrap: { position: "relative", height: 140 },
  cardImg: { width: "100%", height: "100%", objectFit: "cover" },
  cardOverlay: { position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(8,145,178,0.55), transparent)", display: "flex", alignItems: "flex-end", padding: 12 },
  cardIcon: { color: "#fff", fontSize: 22 },
  cardBody: { padding: "16px 18px 18px" },
  cardTitle: { margin: "0 0 4px", fontSize: 17, fontWeight: 800, color: "#0f172a" },
  cardClasses: { margin: "0 0 12px", fontSize: 12, color: "#94a3b8" },
  classRows: { display: "flex", flexDirection: "column", gap: 8 },
  classRow: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", borderRadius: 8, background: "#f8fafc", transition: "background 0.15s" },
  classLabel: { fontWeight: 700, fontSize: 13, color: "#334155" },
  btnPrimary: { background: "#0891b2", color: "#fff", border: "none", borderRadius: 8, padding: "10px 22px", fontWeight: 700, cursor: "pointer", fontFamily: "'Nunito', sans-serif" },
  btnCreate: { background: "linear-gradient(135deg, #0891b2, #0e7490)", color: "#fff", border: "none", borderRadius: 10, padding: "11px 22px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", fontSize: 14, fontFamily: "'Nunito', sans-serif", transition: "opacity 0.15s, transform 0.15s" },
  btnStart: { background: "linear-gradient(135deg, #0891b2, #06b6d4)", color: "#fff", border: "none", borderRadius: 7, padding: "7px 14px", fontWeight: 700, cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", fontFamily: "'Nunito', sans-serif", transition: "opacity 0.15s, transform 0.15s" },
  btnEnd: { background: "linear-gradient(135deg, #ef4444, #dc2626)", color: "#fff", border: "none", borderRadius: 7, padding: "7px 14px", fontWeight: 700, cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", fontFamily: "'Nunito', sans-serif", transition: "opacity 0.15s, transform 0.15s" },
  btnCancel: { background: "#f1f5f9", color: "#475569", border: "none", borderRadius: 9, padding: "10px 20px", fontWeight: 700, cursor: "pointer", fontFamily: "'Nunito', sans-serif", transition: "opacity 0.15s, transform 0.15s" },
  createdGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 },
  createdCard: { background: "#fff", borderRadius: 14, padding: "18px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", transition: "box-shadow 0.2s" },
  createdBadge: { display: "inline-block", background: "#e0f2fe", color: "#0369a1", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20 },
  createdName: { margin: "0 0 6px", fontSize: 15, fontWeight: 800, color: "#0f172a" },
  createdMeta: { margin: "0 0 4px", fontSize: 13, color: "#475569", display: "flex", alignItems: "center" },
  createdDesc: { marginTop: 6, fontSize: 12, color: "#94a3b8", fontStyle: "italic" },
  linkRow: { display: "flex", alignItems: "center", gap: 8, marginTop: 12 },
  linkBox: { flex: 1, background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 7, padding: "6px 10px", overflow: "hidden" },
  linkText: { fontSize: 11, color: "#0369a1", wordBreak: "break-all", fontWeight: 600 },
  copyBtn: { display: "flex", alignItems: "center", background: "#f0f9ff", border: "1.5px solid #0891b2", color: "#0891b2", borderRadius: 7, padding: "6px 12px", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "'Nunito', sans-serif", whiteSpace: "nowrap", transition: "background 0.15s, color 0.15s" },
  copyBtnDone: { background: "#16a34a", color: "#fff", border: "1.5px solid #16a34a" },
  shareCardBtn: { marginTop: 12, width: "100%", background: "none", border: "1.5px solid #e2e8f0", borderRadius: 8, padding: "8px", fontWeight: 700, fontSize: 13, color: "#475569", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Nunito', sans-serif", transition: "border-color 0.15s, color 0.15s" },
  deleteBtn: { background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: "4px 6px", borderRadius: 6, fontSize: 13, transition: "background 0.15s, color 0.15s" },
  overlay: { position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 },
  modal: { background: "#fff", borderRadius: 20, width: "100%", maxWidth: 620, boxShadow: "0 24px 60px rgba(0,0,0,0.18)", animation: "modalIn 0.25s ease", maxHeight: "90vh", overflowY: "auto" },
  modalHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px 16px", borderBottom: "1px solid #e2e8f0" },
  modalTitle: { margin: 0, fontSize: 18, fontWeight: 800, color: "#0f172a", display: "flex", alignItems: "center" },
  closeBtn: { background: "none", border: "none", fontSize: 18, color: "#94a3b8", cursor: "pointer" },
  modalBody: { padding: "20px 24px" },
  modalFooter: { padding: "16px 24px 20px", borderTop: "1px solid #e2e8f0", display: "flex", gap: 12, justifyContent: "flex-end" },
  formGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 },
  formGroup: { display: "flex", flexDirection: "column", gap: 6 },
  label: { fontSize: 13, fontWeight: 700, color: "#374151", display: "flex", alignItems: "center" },
  input: { border: "1.5px solid #e2e8f0", borderRadius: 9, padding: "10px 12px", fontSize: 14, fontFamily: "'Nunito', sans-serif", color: "#1e293b", outline: "none", transition: "border 0.15s", background: "#fafafa" },
  infoBox: { marginTop: 14, background: "#e0f2fe", borderRadius: 9, padding: "10px 14px", fontSize: 13, color: "#0369a1", fontWeight: 600, display: "flex", alignItems: "center", flexWrap: "wrap", gap: 4 },
  shareInfoBox: { background: "#f8fafc", borderRadius: 12, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 },
  shareRow: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  shareLabel: { fontSize: 12, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.04em" },
  shareValue: { fontSize: 14, fontWeight: 700, color: "#0f172a" },
  shareLinkBox: { background: "#f0f9ff", border: "1.5px solid #bae6fd", borderRadius: 10, padding: "14px 16px" },
  shareLinkText: { fontSize: 13, color: "#0369a1", fontWeight: 700, wordBreak: "break-all" },
};

export default TeacherSubjects;