const mongoose = require("mongoose");

const db = mongoose.connection;
const getCustomers    = () => db.db.collection("customers");
const getInteractions = () => db.db.collection("interactions");
const getTasks        = () => db.db.collection("tasks");

// ─── GUARDRAIL 1: Field Visibility Registry ───────────────────────────────────
const FIELD_VISIBILITY = {
  panNumber:        { visibleTo: ["student"],                     sensitive: true  },
  emisNumber:       { visibleTo: ["student"],                     sensitive: false },
  syllabus:         { visibleTo: ["student"],                     sensitive: false },
  studentClass:     { visibleTo: ["student"],                     sensitive: false },
  class:            { visibleTo: ["student"],                     sensitive: false },
  qualification:    { visibleTo: ["teacher", "admin"],            sensitive: false },
  preferredSubject: { visibleTo: ["teacher", "admin"],            sensitive: false },
  email:            { visibleTo: ["student", "teacher", "admin"], sensitive: false },
  mobile:           { visibleTo: ["student", "teacher", "admin"], sensitive: false },
  timezone:         { visibleTo: ["student", "teacher", "admin"], sensitive: false },
  salutation:       { visibleTo: ["student", "teacher", "admin"], sensitive: false },
  firstName:        { visibleTo: ["student", "teacher", "admin"], sensitive: false },
  lastName:         { visibleTo: ["student", "teacher", "admin"], sensitive: false },
  password:         { visibleTo: ["student", "teacher", "admin"], sensitive: true  },
  confirmPassword:  { visibleTo: ["student", "teacher", "admin"], sensitive: true  },
};

// ─── GUARDRAIL 2: Sanitizer ───────────────────────────────────────────────────
const sanitizeForRole = (data, role) => {
  const sanitized = { ...data };
  Object.entries(FIELD_VISIBILITY).forEach(([field, rule]) => {
    if (!rule.visibleTo.includes(role)) {
      if (sanitized[field] !== undefined) {
        console.warn(`🚫 Guardrail blocked: field "${field}" not allowed for role "${role}"`);
        delete sanitized[field];
      }
    }
  });
  return sanitized;
};

// ─── GUARDRAIL 3: Role-field mismatch detector ────────────────────────────────
const detectRoleViolations = (data, role) => {
  const violations = [];
  Object.entries(FIELD_VISIBILITY).forEach(([field, rule]) => {
    if (!rule.visibleTo.includes(role) && data[field] !== undefined) {
      violations.push(field);
    }
  });
  return violations;
};

// ─── GUARDRAIL 4: Sensitive field stripper ────────────────────────────────────
const stripSensitiveFields = (data) => {
  const safe = { ...data };
  Object.entries(FIELD_VISIBILITY).forEach(([field, rule]) => {
    if (rule.sensitive && safe[field] !== undefined) {
      delete safe[field];
    }
  });
  return safe;
};

// ─── Knowledge Agent ──────────────────────────────────────────────────────────
const KnowledgeAgent = {
  getCustomer: async (id) => {
    return await getCustomers().findOne({ customerId: id });
  },
  searchInteractions: async (id) => {
    return await getInteractions()
      .find({ customerId: id })
      .sort({ timestamp: -1 })
      .toArray();
  },
  getAllCustomers: async () => {
    return await getCustomers().find({}).toArray();
  },
};

// ─── Action Agent ─────────────────────────────────────────────────────────────
const ActionAgent = {
  updateCustomer: async (id, data) => {
    return await getCustomers().updateOne(
      { customerId: id },
      { $set: { ...data, updatedAt: new Date() } }
    );
  },
  createTask: async (task) => {
    return await getTasks().insertOne({
      ...task,
      createdAt: new Date(),
      status: task.status || "open",
    });
  },
  closeTask: async (taskId) => {
    return await getTasks().updateOne(
      { _id: taskId },
      { $set: { status: "closed", closedAt: new Date() } }
    );
  },
};

// ─── Analytics Agent ──────────────────────────────────────────────────────────
const AnalyticsAgent = {
  logInteraction: async (entry) => {
    return await getInteractions().insertOne({
      ...entry,
      timestamp: new Date(),
    });
  },
  getSummary: async (customerId) => {
    const interactions = await KnowledgeAgent.searchInteractions(customerId);
    return {
      totalInteractions: interactions.length,
      lastContact: interactions[0]?.timestamp || null,
    };
  },
};

// ─── Local Validation Helper ──────────────────────────────────────────────────
function normalizeSalutation(val) {
  if (!val) return val;
  const map = { mr: "Mr.", ms: "Ms.", mrs: "Mrs.", dr: "Dr." };
  const clean = val.toLowerCase().replace(/\.$/, "").trim();
  return map[clean] || val;
}

// ✅ ALL valid syllabus values — matches StudentRegister.jsx form exactly
const VALID_SYLLABUS = [
  "State Board", "CBSE", "ICSE", "Matriculation",
  "Matric", "IGCSE", "IB", "Other",
];

// ✅ ALL valid class values — matches StudentRegister.jsx form exactly
// Form sends: "LKG", "UKG", "Class 1" ... "Class 12"
const VALID_CLASSES = [
  "LKG", "UKG",
  "Class 1","Class 2","Class 3","Class 4","Class 5","Class 6",
  "Class 7","Class 8","Class 9","Class 10","Class 11","Class 12",
  // also accept without "Class " prefix just in case
  "1","2","3","4","5","6","7","8","9","10","11","12",
  "1st","2nd","3rd","4th","5th","6th",
  "7th","8th","9th","10th","11th","12th",
];

// ✅ ALL valid timezones — matches both register forms
const VALID_TIMEZONES = [
  "Asia/Kolkata", "Asia/Dubai", "Europe/London",
  "America/New_York", "America/Los_Angeles",
  "IST", "UTC", "EST", // ← StudentRegister.jsx uses these short codes
];

function validateFields(role, payload, hasFile) {
  const errors = {};
  const normalized = { ...payload };

  // salutation
  const salutations = ["Mr.", "Ms.", "Mrs.", "Dr."];
  const normSal = normalizeSalutation(payload.salutation);
  if (!normSal || !salutations.includes(normSal)) {
    errors.salutation = "Must be Mr. / Ms. / Mrs. / Dr.";
  } else {
    normalized.salutation = normSal;
  }

  // firstName
  if (!payload.firstName || payload.firstName.trim().length < 2 || !/^[a-zA-Z]+$/.test(payload.firstName.trim())) {
    errors.firstName = "Min 2 letters, letters only";
  } else {
    normalized.firstName = payload.firstName.trim();
  }

  // lastName
  if (!payload.lastName || payload.lastName.trim().length < 2 || !/^[a-zA-Z]+$/.test(payload.lastName.trim())) {
    errors.lastName = "Min 2 letters, letters only";
  } else {
    normalized.lastName = payload.lastName.trim();
  }

  // mobile
  if (!payload.mobile || !/^[1-9]\d{9}$/.test(payload.mobile.toString().trim())) {
    errors.mobile = "Must be exactly 10 digits, not starting with 0";
  } else {
    normalized.mobile = payload.mobile.toString().trim();
  }

  // email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const knownTypos = ["gmail.con","gamil.com","gmai.com","gmial.com","yahoo.con","hotmail.con"];
  if (!payload.email || !emailRegex.test(payload.email.trim())) {
    errors.email = "Invalid email format";
  } else if (knownTypos.some((t) => payload.email.toLowerCase().includes(t))) {
    errors.email = "Possible typo in email domain";
  } else {
    normalized.email = payload.email.trim().toLowerCase();
  }

  // password
  const passRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  if (!payload.password || !passRegex.test(payload.password)) {
    errors.password = "Min 8 chars, must include uppercase, lowercase, digit, special (@$!%*?&)";
  }

  // confirmPassword
  if (!payload.confirmPassword || payload.confirmPassword !== payload.password) {
    errors.confirmPassword = "Passwords do not match";
  }

  // timezone — ✅ accepts both short (IST) and long (Asia/Kolkata) formats
  if (!payload.timezone || !VALID_TIMEZONES.includes(payload.timezone)) {
    errors.timezone = "Invalid timezone selected";
  }

  // ── Student-only fields ──────────────────────────────────────────────────────
  if (role === "student") {

    // ✅ syllabus — now includes all form options
    if (!payload.syllabus || !VALID_SYLLABUS.includes(payload.syllabus)) {
      errors.syllabus = `Must be one of: ${VALID_SYLLABUS.join(", ")}`;
    }

    // ✅ class — now accepts "Class 10", "LKG", "UKG", "10th" etc.
    const classVal = (payload.class || payload.studentClass || "").toString().trim();
    if (!classVal || !VALID_CLASSES.includes(classVal)) {
      errors.class = "Invalid class selected";
    } else {
      normalized.class = classVal;
    }

    // emisNumber
    if (!payload.emisNumber || payload.emisNumber.toString().trim().length < 4) {
      errors.emisNumber = "Minimum 4 characters";
    }

    // panNumber
    if (!payload.panNumber || payload.panNumber.toString().trim() === "") {
      errors.panNumber = "PAN number is required";
    } else if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(payload.panNumber.toString().trim().toUpperCase())) {
      errors.panNumber = "Invalid PAN format (e.g. ABCDE1234F)";
    } else {
      normalized.panNumber = payload.panNumber.toString().trim().toUpperCase();
    }

    // file proof
    if (!hasFile) {
      errors._file = "ID Proof is required";
    }

  // ── Teacher-only fields ──────────────────────────────────────────────────────
  } else if (role === "teacher") {

    const validQual = ["B.Ed","M.Ed","B.Sc","M.Sc","B.A","M.A","Ph.D","Other"];
    if (!payload.qualification || !validQual.includes(payload.qualification)) {
      errors.qualification = "Must be one of B.Ed / M.Ed / B.Sc / M.Sc / B.A / M.A / Ph.D / Other";
    }

    if (!payload.preferredSubject || payload.preferredSubject.trim().length < 2) {
      errors.preferredSubject = "Minimum 2 characters";
    }
  }

  const valid = Object.keys(errors).length === 0;
  return {
    valid, errors, normalized,
    summary: valid ? "All fields are valid." : `Validation failed: ${Object.keys(errors).join(", ")}`,
  };
}

function validatePartialFields(role, filledFields, hasFile) {
  const errors = {};

  for (const [key, value] of Object.entries(filledFields)) {
    if (value === null || value === undefined || value === "") continue;

    if (key === "salutation") {
      const norm = normalizeSalutation(value);
      if (!["Mr.", "Ms.", "Mrs.", "Dr."].includes(norm))
        errors.salutation = "Must be Mr. / Ms. / Mrs. / Dr.";
    }

    if (key === "firstName" || key === "lastName") {
      if (value.trim().length < 2 || !/^[a-zA-Z]+$/.test(value.trim()))
        errors[key] = "Min 2 letters, letters only";
    }

    if (key === "mobile") {
      if (!/^[1-9]\d{9}$/.test(value.toString().trim()))
        errors.mobile = "Must be exactly 10 digits, not starting with 0";
    }

    if (key === "email") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const knownTypos = ["gmail.con","gamil.com","gmai.com","gmial.com"];
      if (!emailRegex.test(value.trim()))
        errors.email = "Invalid email format";
      else if (knownTypos.some((t) => value.toLowerCase().includes(t)))
        errors.email = "Possible typo in email domain";
    }

    if (key === "password") {
      const passRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
      if (!passRegex.test(value))
        errors.password = "Min 8 chars, uppercase, lowercase, digit, special (@$!%*?&)";
    }

    if (key === "confirmPassword" && filledFields.password) {
      if (value !== filledFields.password)
        errors.confirmPassword = "Passwords do not match";
    }

    if (key === "timezone") {
      if (!VALID_TIMEZONES.includes(value))
        errors.timezone = "Invalid timezone selected";
    }

    // ✅ Student partial validation with fixed lists
    if (key === "syllabus" && role === "student") {
      if (!VALID_SYLLABUS.includes(value))
        errors.syllabus = `Must be one of: ${VALID_SYLLABUS.join(", ")}`;
    }

    if ((key === "class" || key === "studentClass") && role === "student") {
      if (!VALID_CLASSES.includes(value.toString().trim()))
        errors.class = "Invalid class selected";
    }

    if (key === "emisNumber" && role === "student") {
      if (value.toString().trim().length < 4)
        errors.emisNumber = "Minimum 4 characters";
    }

    if (key === "panNumber" && role === "student") {
      const pan = value.toString().trim().toUpperCase();
      if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan))
        errors.panNumber = "Invalid PAN format (e.g. ABCDE1234F)";
    }

    if (key === "qualification" && role === "teacher") {
      const validQual = ["B.Ed","M.Ed","B.Sc","M.Sc","B.A","M.A","Ph.D","Other"];
      if (!validQual.includes(value))
        errors.qualification = "Must be one of B.Ed / M.Ed / B.Sc / M.Sc / B.A / M.A / Ph.D / Other";
    }

    if (key === "preferredSubject" && role === "teacher") {
      if (value.trim().length < 2)
        errors.preferredSubject = "Minimum 2 characters";
    }
  }

  return { errors };
}

// ─── AI Validation Agent ──────────────────────────────────────────────────────
const AIValidationAgent = {
  validate: async (role, payload, hasFile = false) => {
    const safePayload = sanitizeForRole(payload, role);
    return validateFields(role, safePayload, hasFile);
  },
  validatePartial: async (role, filledFields, hasFile = false) => {
    const safeFields = sanitizeForRole(filledFields, role);
    return validatePartialFields(role, safeFields, hasFile);
  },
};

// ─── Orchestrator ─────────────────────────────────────────────────────────────
async function handleRequest(input, customerId) {
  const profile = await KnowledgeAgent.getCustomer(customerId);
  if (!profile) return `No customer found with ID: ${customerId}`;
  const safeProfile = stripSensitiveFields(profile);
  await ActionAgent.createTask({ customerId, issue: input, status: "open" });
  await AnalyticsAgent.logInteraction({ customerId, message: input });
  return `Ticket created for ${safeProfile.firstName}: ${input}`;
}

async function handleRegistration(role, payload, hasFile = false) {
  return await AIValidationAgent.validate(role, payload, hasFile);
}

async function handlePartialValidation(role, filledFields, hasFile = false) {
  return await AIValidationAgent.validatePartial(role, filledFields, hasFile);
}

module.exports = {
  KnowledgeAgent,
  ActionAgent,
  AnalyticsAgent,
  AIValidationAgent,
  handleRequest,
  handleRegistration,
  handlePartialValidation,
  detectRoleViolations,
  sanitizeForRole,
  stripSensitiveFields,
};