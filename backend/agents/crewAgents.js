const mongoose = require("mongoose");

const db = mongoose.connection;
const getCustomers    = () => db.db.collection("customers");
const getInteractions = () => db.db.collection("interactions");
const getTasks        = () => db.db.collection("tasks");

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
  const knownTypos = ["gmail.con", "gamil.com", "gmai.com", "gmial.com", "yahoo.con", "hotmail.con"];
  if (!payload.email || !emailRegex.test(payload.email.trim())) {
    errors.email = "Invalid email format";
  } else if (knownTypos.some(t => payload.email.toLowerCase().includes(t))) {
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

  // timezone
  const validTimezones = ["Asia/Kolkata", "Asia/Dubai", "Europe/London", "America/New_York", "America/Los_Angeles"];
  if (!payload.timezone || !validTimezones.includes(payload.timezone)) {
    errors.timezone = "Must be one of: Asia/Kolkata, Asia/Dubai, Europe/London, America/New_York, America/Los_Angeles";
  }

  if (role === "student") {
    // syllabus
    const validSyllabus = ["State Board", "CBSE", "ICSE", "Matriculation"];
    if (!payload.syllabus || !validSyllabus.includes(payload.syllabus)) {
      errors.syllabus = "Must be State Board / CBSE / ICSE / Matriculation";
    }

    // class
    const validClasses = ["1st","2nd","3rd","4th","5th","6th","7th","8th","9th","10th","11th","12th"];
    const classVal = (payload.class || payload.studentClass || "").toString().trim();
    if (!classVal || !validClasses.includes(classVal)) {
      errors.class = "Must be 1st through 12th";
    } else {
      normalized.class = classVal;
    }

    // emisNumber
    if (!payload.emisNumber || payload.emisNumber.toString().trim().length < 4) {
      errors.emisNumber = "Minimum 4 characters";
    }

    // file (proof)
    if (!hasFile) {
      errors._file = "ID Proof is required";
    }

  } else if (role === "teacher") {
    // qualification
    const validQual = ["B.Ed", "M.Ed", "B.Sc", "M.Sc", "B.A", "M.A", "Ph.D", "Other"];
    if (!payload.qualification || !validQual.includes(payload.qualification)) {
      errors.qualification = "Must be one of B.Ed / M.Ed / B.Sc / M.Sc / B.A / M.A / Ph.D / Other";
    }

    // preferredSubject
    if (!payload.preferredSubject || payload.preferredSubject.trim().length < 2) {
      errors.preferredSubject = "Minimum 2 characters";
    }
  }

  const valid = Object.keys(errors).length === 0;
  return {
    valid,
    errors,
    normalized,
    summary: valid ? "All fields are valid." : `Validation failed: ${Object.keys(errors).join(", ")}`,
  };
}

function validatePartialFields(role, filledFields, hasFile) {
  const errors = {};

  for (const [key, value] of Object.entries(filledFields)) {
    if (value === null || value === undefined || value === "") continue;

    if (key === "salutation") {
      const salutations = ["Mr.", "Ms.", "Mrs.", "Dr."];
      const norm = normalizeSalutation(value);
      if (!salutations.includes(norm)) errors.salutation = "Must be Mr. / Ms. / Mrs. / Dr.";
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
      const knownTypos = ["gmail.con", "gamil.com", "gmai.com", "gmial.com"];
      if (!emailRegex.test(value.trim()))
        errors.email = "Invalid email format";
      else if (knownTypos.some(t => value.toLowerCase().includes(t)))
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
      const validTimezones = ["Asia/Kolkata", "Asia/Dubai", "Europe/London", "America/New_York", "America/Los_Angeles"];
      if (!validTimezones.includes(value))
        errors.timezone = "Invalid timezone";
    }

    if (key === "syllabus" && role === "student") {
      const validSyllabus = ["State Board", "CBSE", "ICSE", "Matriculation"];
      if (!validSyllabus.includes(value))
        errors.syllabus = "Must be State Board / CBSE / ICSE / Matriculation";
    }

    if ((key === "class" || key === "studentClass") && role === "student") {
      const validClasses = ["1st","2nd","3rd","4th","5th","6th","7th","8th","9th","10th","11th","12th"];
      if (!validClasses.includes(value.toString().trim()))
        errors.class = "Must be 1st through 12th";
    }

    if (key === "emisNumber" && role === "student") {
      if (value.toString().trim().length < 4)
        errors.emisNumber = "Minimum 4 characters";
    }

    if (key === "qualification" && role === "teacher") {
      const validQual = ["B.Ed", "M.Ed", "B.Sc", "M.Sc", "B.A", "M.A", "Ph.D", "Other"];
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

// ─── AI Validation Agent (local validation — no API key needed) ───────────────
const AIValidationAgent = {
  validate: async (role, payload, hasFile = false) => {
    return validateFields(role, payload, hasFile);
  },
  validatePartial: async (role, filledFields, hasFile = false) => {
    return validatePartialFields(role, filledFields, hasFile);
  },
};

// ─── Orchestrator ─────────────────────────────────────────────────────────────
async function handleRequest(input, customerId) {
  const profile = await KnowledgeAgent.getCustomer(customerId);
  if (!profile) return `No customer found with ID: ${customerId}`;
  await ActionAgent.createTask({ customerId, issue: input, status: "open" });
  await AnalyticsAgent.logInteraction({ customerId, message: input });
  return `Ticket created for ${profile.name}: ${input}`;
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
};
