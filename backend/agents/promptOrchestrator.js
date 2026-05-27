/**
 * AI Prompt Orchestrator – Secure 4-Agent Pipeline
 * File: /agents/promptOrchestrator.js
 */

const Student = require("../models/Student");
const Teacher = require("../models/Teacher");
const Admin   = require("../models/Admin");

const Groq   = require("groq-sdk");
const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ─────────────────────────────────────────────────────────────
// ALLOWED FIELDS  (panNumber only for students)
// ─────────────────────────────────────────────────────────────
const ALLOWED_FIELDS = {
  student: [
    "firstName", "lastName", "email", "mobile", "timezone",
    "class", "syllabus", "emisNumber",
    "panNumber",          // ✅ student-only sensitive field
    "status", "approvalStatus", "salutation", "group",
  ],
  teacher: [
    "firstName", "lastName", "email", "mobile", "timezone",
    "qualification", "preferredSubject", "experience",
    "classAssigned", "classesAssigned", "subjects", "isApproved",
    // ❌ panNumber is NOT in this list — AI cannot see or return it
  ],
  admin: [
    "firstName", "lastName", "email", "mobile",
    // ❌ panNumber is NOT in this list — AI cannot see or return it
  ],
};

// ─────────────────────────────────────────────────────────────
// SENSITIVE FIELDS — never exposed to non-owners
// ─────────────────────────────────────────────────────────────
// These fields are role-locked. If a role is not in the
// ALLOWED_FIELDS list for that field, the AI pipeline will
// return "not available" automatically — no code needed on frontend.
const ROLE_LOCKED_FIELDS = {
  panNumber: ["student"], // only students can ever see panNumber
};

// ─────────────────────────────────────────────────────────────
// AI HELPER
// ─────────────────────────────────────────────────────────────
async function callAI(systemPrompt, userMessage, maxTokens = 512) {
  try {
    const completion = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user",   content: userMessage  },
      ],
      max_tokens: maxTokens,
      temperature: 0.2,
    });
    return completion.choices[0].message.content.trim();
  } catch (error) {
    console.error("❌ Groq API Error:", error.status, error.message);
    throw error;
  }
}

// ─────────────────────────────────────────────────────────────
// AGENT 1 — GUARDRAIL
// Automatically blocks non-students from accessing panNumber.
// No frontend code needed — the AI decides based on role.
// ─────────────────────────────────────────────────────────────
async function guardrailAgent(prompt, authenticatedUser) {
  const role = authenticatedUser.role;

  // ✅ Build a dynamic restriction block so the AI knows
  //    which fields are off-limits for this specific role.
  const restrictedForThisRole = Object.entries(ROLE_LOCKED_FIELDS)
    .filter(([, allowedRoles]) => !allowedRoles.includes(role))
    .map(([field]) => field);

  const systemPrompt = `
You are a strict security guardrail for an educational platform.
The authenticated user is: ${JSON.stringify({ id: authenticatedUser.id, role, name: authenticatedUser.name })}

Rules:
- ALLOW any request asking about the authenticated user's OWN data
  (EMIS number, class, syllabus, mobile, email, status, subjects, etc.)
- BLOCK only if the user is trying to access ANOTHER user's private data
- BLOCK harmful, offensive, or irrelevant requests
- When in doubt about whether it's own data, ALLOW it

${restrictedForThisRole.length > 0 ? `
CRITICAL ROLE RESTRICTION:
The following fields are NOT available for role "${role}": ${restrictedForThisRole.join(", ")}
If the user asks about any of these fields, respond with:
{"safe": false, "reason": "This information is not available for your account type."}
` : ""}

Respond ONLY with valid JSON, no extra text:
{"safe": true, "reason": ""}
or
{"safe": false, "reason": "explanation"}
  `.trim();

  try {
    const raw     = await callAI(systemPrompt, prompt, 256);
    const cleaned = raw.replace(/```json|```/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return { safe: false, reason: "Security system unavailable" };
  }
}

// ─────────────────────────────────────────────────────────────
// AGENT 2 — INTENT ANALYZER
// Only returns fields that are in the role's ALLOWED_FIELDS.
// panNumber will never appear for teacher/admin since it's not
// in their allowed list — automatic, no extra code needed.
// ─────────────────────────────────────────────────────────────
async function intentAnalyzerAgent(prompt, authenticatedUser) {
  const role    = authenticatedUser.role;
  const allowed = ALLOWED_FIELDS[role] || [];

  const systemPrompt = `
You are an intent analyzer for an educational platform.
User role: ${role}
Allowed fields for this role: ${JSON.stringify(allowed)}

Rules for field detection:
- "PAN", "pan number", "PAN no", "my pan"   → panNumber
- "EMIS", "emis number", "EMIS no"           → emisNumber
- "class", "grade", "standard"               → class
- "syllabus", "board"                        → syllabus
- "email"                                    → email
- "mobile", "phone", "contact"               → mobile
- "timezone"                                 → timezone
- "payment", "fee", "paid"                   → status
- "approval", "approved", "account status"   → approvalStatus
- "name"                                     → firstName, lastName

IMPORTANT: Only return fields that exist in the allowed fields list above.
If the user asks for a field that is NOT in the allowed list, do NOT include it.

Respond ONLY with a valid JSON array, no extra text:
["field1", "field2"]
  `.trim();

  try {
    const raw     = await callAI(systemPrompt, prompt, 256);
    const cleaned = raw.replace(/```json|```/g, "").trim();
    const fields  = JSON.parse(cleaned);
    // Hard filter — even if AI hallucinates a field, strip it here
    return fields.filter((f) => allowed.includes(f));
  } catch {
    return allowed;
  }
}

// ─────────────────────────────────────────────────────────────
// AGENT 3 — SECURE DATA FETCH
// ✅ KEY FIX: For students asking about PAN, we explicitly
//    add panNumber to the select query with "+panNumber"
//    to override Mongoose's select:false if set on the model.
// ─────────────────────────────────────────────────────────────
async function secureDataAgent(userId, role, fields) {
  try {
    let userDoc = null;

    const selectFields = [...new Set(fields)];
    // No need for "+field" prefix — model has no select:false fields
    const selectStr = selectFields.join(" ");

    if      (role === "student") userDoc = await Student.findById(userId).select(selectStr).lean();
    else if (role === "teacher") userDoc = await Teacher.findById(userId).select(selectStr).lean();
    else if (role === "admin")   userDoc = await Admin.findById(userId).select(selectStr).lean();

    // ✅ .lean() returns a plain JS object instead of a Mongoose document.
    //    This means user["panNumber"] works correctly — no more undefined.
    //    Without .lean(), Mongoose documents require .get("panNumber") to
    //    access fields, and bracket notation can silently return undefined.

    if (!userDoc) return {};

    console.log("🔎 Raw DB result:", userDoc); // ← shows exactly what came from DB

    const data = {};
    selectFields.forEach((field) => {
      // ✅ Role-lock check — PAN never goes to teacher/admin even if
      //    something slips through the earlier agents
      if (ROLE_LOCKED_FIELDS[field] && !ROLE_LOCKED_FIELDS[field].includes(role)) {
        console.warn(`🚫 SecureDataAgent blocked field "${field}" for role "${role}"`);
        return;
      }

      const value = userDoc[field];
      if (value !== undefined && value !== null && value !== "") {
        data[field] = value;
      }
    });

    return data;
  } catch (error) {
    console.error("❌ Secure Data Agent Error:", error.message);
    return {};
  }
}

// ─────────────────────────────────────────────────────────────
// AGENT 4 — RESPONSE FORMATTER
// ─────────────────────────────────────────────────────────────
async function responseFormatterAgent(prompt, data, authenticatedUser) {
  const systemPrompt = `
You are a helpful, friendly assistant for an educational platform called CEITCS Academy.
The authenticated user: ${JSON.stringify({ role: authenticatedUser.role, name: authenticatedUser.name })}
Their fetched data: ${JSON.stringify(data)}

Instructions:
- Answer the user's question using ONLY the provided data above
- If the data for the asked field is present, show it clearly and directly
- If the data object is empty or the field is missing, say "that information is not available for your account"
- Be concise and friendly
- Do NOT reveal passwords or internal system IDs
- Do NOT make up or guess any data
  `.trim();

  try {
    return await callAI(systemPrompt, prompt, 512);
  } catch {
    return "I'm sorry, I couldn't process your request right now.";
  }
}

// ─────────────────────────────────────────────────────────────
// AGENT 5 — POST FLIGHT GUARD
// ─────────────────────────────────────────────────────────────
async function postFlightGuard(response, authenticatedUser) {
  const role = authenticatedUser.role;

  // Build list of fields that are NOT allowed for this role
  const restrictedForThisRole = Object.entries(ROLE_LOCKED_FIELDS)
    .filter(([, allowedRoles]) => !allowedRoles.includes(role))
    .map(([field]) => field);

  const systemPrompt = `
You are a post-response safety scanner for an educational platform.

It is PERFECTLY FINE and CLEAN to share a user's own data with them, including:
- Their own EMIS number, class, syllabus, email, mobile, timezone
- Their own payment status, approval status, enrolled subjects
${role === "student" ? "- Their own PAN number (students are allowed to see their own PAN)" : ""}

${restrictedForThisRole.length > 0 ? `
CRITICAL: The following fields must NEVER appear in a response for role "${role}": ${restrictedForThisRole.join(", ")}
If the response contains any of these, flag as NOT clean.
` : ""}

Only flag as NOT clean if:
- The response contains another user's private data
- The response contains passwords or secret tokens
- The response contains harmful or inappropriate content
- The response contains a field that is restricted for this role

Respond ONLY with valid JSON, no extra text:
{"clean": true, "reason": ""}
or
{"clean": false, "reason": "explanation"}
  `.trim();

  try {
    const raw     = await callAI(systemPrompt, response, 256);
    const cleaned = raw.replace(/```json|```/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return { clean: true, reason: "Scanner unavailable, passed by default" };
  }
}

// ─────────────────────────────────────────────────────────────
// MAIN ORCHESTRATOR
// ─────────────────────────────────────────────────────────────
async function runPromptPipeline(prompt, authenticatedUser) {
  const trace = [];

  try {
    // STEP 1 — GUARDRAIL
    // ✅ AI automatically blocks teacher/admin from asking about panNumber
    trace.push("GuardrailAgent");
    const guard = await guardrailAgent(prompt, authenticatedUser);
    console.log("🛡️  Guard:", guard);

    if (!guard.safe) {
      return {
        success: false,
        blocked: true,
        message: `Access Denied: ${guard.reason || "You can only access your own information."}`,
        trace,
      };
    }

    // STEP 2 — INTENT
    // ✅ panNumber only appears in fields[] if role === "student"
    trace.push("IntentAnalyzerAgent");
    const fields = await intentAnalyzerAgent(prompt, authenticatedUser);
    console.log("📌 Fields:", fields);

    if (!fields || fields.length === 0) {
      return {
        success: true,
        blocked: false,
        message: authenticatedUser.role === "student"
          ? "I can help you look up your class, syllabus, EMIS number, PAN number, email, mobile, timezone, payment status, and approval status. What would you like to know?"
          : "I can help you look up your assigned classes, subjects, qualifications, or contact details. What would you like to know?",
        trace,
        fieldsAccessed: [],
      };
    }

    // STEP 3 — DATA FETCH
    // ✅ "+panNumber" used in select to bypass Mongoose select:false
    trace.push("SecureDataAgent");
    const data = await secureDataAgent(authenticatedUser.id, authenticatedUser.role, fields);
    console.log("📦 Data:", data);

    // STEP 4 — RESPONSE
    trace.push("ResponseFormatterAgent");
    const response = await responseFormatterAgent(prompt, data, authenticatedUser);
    console.log("💬 Response:", response);

    // STEP 5 — POST SCAN
    // ✅ PostFlight also checks that PAN doesn't leak to wrong roles
    trace.push("PostFlightGuard");
    const scan = await postFlightGuard(response, authenticatedUser);
    console.log("🔍 Scan:", scan);

    if (!scan.clean) {
      return {
        success: false,
        blocked: true,
        message: "Response blocked by security scanner.",
        trace,
      };
    }

    return {
      success: true,
      blocked: false,
      message: response,
      trace,
      fieldsAccessed: fields,
    };

  } catch (error) {
    console.error("❌ Pipeline Error:", error.message);
    return {
      success: false,
      blocked: false,
      message: "Something went wrong. Please try again.",
      trace,
    };
  }
}

module.exports = { runPromptPipeline };