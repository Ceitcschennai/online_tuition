import React, { useEffect, useState, useCallback, useRef } from "react";
import API_BASE_URL from "../config/api";
import "../styles/adminDashboard.css";

// ─── Salutation normalizer ────────────────────────────────────────────────────
const normalizeSalutation = (val) => {
  if (!val) return val;

  const map = {
    "mr": "Mr.",
    "mr.": "Mr.",
    "ms": "Ms.",
    "ms.": "Ms.",
    "mrs": "Mrs.",
    "mrs.": "Mrs.",
    "dr": "Dr.",
    "dr.": "Dr.",
  };

  return map[val.trim().toLowerCase()] || val.trim();
};

// ─── FIELD REGISTRY ───────────────────────────────────────────────────────────
// Single source of truth — defines WHO can see WHAT
const FIELD_REGISTRY = {
  email: {
    icon: "📧",
    label: "Email",
    visibleTo: ["student", "teacher", "admin"],
  },

  mobile: {
    icon: "📱",
    label: "Mobile",
    visibleTo: ["student", "teacher", "admin"],
  },

  syllabus: {
    icon: "📚",
    label: "Syllabus",
    visibleTo: ["student"],
  },

  studentClass: {
    icon: "🏫",
    label: "Class",
    visibleTo: ["student"],
  },

  emisNumber: {
    icon: "🆔",
    label: "EMIS No.",
    visibleTo: ["student"],
  },

  panNumber: {
    icon: "🪪",
    label: "PAN No.",
    visibleTo: ["student"],
    sensitive: true,
  },

  qualification: {
    icon: "🎓",
    label: "Qual.",
    visibleTo: ["teacher", "admin"],
  },

  preferredSubject: {
    icon: "📖",
    label: "Subject",
    visibleTo: ["teacher", "admin"],
  },

  timezone: {
    icon: "🌍",
    label: "Timezone",
    visibleTo: ["student", "teacher", "admin"],
  },

  createdAt: {
    icon: "🕐",
    label: "Created",
    visibleTo: ["student", "teacher", "admin"],
  },
};

// Ordered list of fields to show on the card
const CARD_FIELD_ORDER = [
  "email",
  "mobile",
  "syllabus",
  "studentClass",
  "emisNumber",
  "panNumber",
  "qualification",
  "preferredSubject",
  "timezone",
  "createdAt",
];

// ─── ROLES config ─────────────────────────────────────────────────────────────
const ROLES = {
  student: {
    label: "Student",

    fields: [
      {
        key: "salutation",
        backendKey: "salutation",
        label: "Title (Mr/Ms)",
        type: "select",
        options: ["Mr.", "Ms.", "Mrs.", "Dr."],
        required: true,
      },

      {
        key: "firstName",
        backendKey: "firstName",
        label: "First Name",
        type: "text",
        required: true,
      },

      {
        key: "lastName",
        backendKey: "lastName",
        label: "Last Name",
        type: "text",
        required: true,
      },

      {
        key: "mobile",
        backendKey: "mobile",
        label: "Mobile Number",
        type: "tel",
        required: true,
      },

      {
        key: "syllabus",
        backendKey: "syllabus",
        label: "Syllabus",
        type: "select",
        options: [
          "State Board",
          "CBSE",
          "ICSE",
          "Matriculation",
        ],
        required: true,
      },

      {
        key: "studentClass",
        backendKey: "class",
        label: "Class",
        type: "select",
        options: [
          "1st",
          "2nd",
          "3rd",
          "4th",
          "5th",
          "6th",
          "7th",
          "8th",
          "9th",
          "10th",
          "11th",
          "12th",
        ],
        required: true,
      },

      {
        key: "timezone",
        backendKey: "timezone",
        label: "Timezone",
        type: "select",
        options: [
          "Asia/Kolkata",
          "Asia/Dubai",
          "Europe/London",
          "America/New_York",
          "America/Los_Angeles",
        ],
        required: true,
      },

      {
        key: "email",
        backendKey: "email",
        label: "Email ID",
        type: "email",
        required: true,
      },

      {
        key: "password",
        backendKey: "password",
        label: "Password",
        type: "password",
        required: true,
      },

      {
        key: "confirmPassword",
        backendKey: "confirmPassword",
        label: "Confirm Password",
        type: "password",
        required: true,
      },

      {
        key: "emisNumber",
        backendKey: "emisNumber",
        label: "EMIS Number",
        type: "text",
        required: true,
      },

      {
        key: "panNumber",
        backendKey: "panNumber",
        label: "PAN Number",
        type: "text",
        required: true,
      },
    ],

    endpoint: "/api/student/register",

    hint:
      "Mr., Ravi, Kumar, 9876543210, State Board, 10th, Asia/Kolkata, ravi@email.com, Pass@123, Pass@123, 123456, ABCDE1234F",
  },

  teacher: {
    label: "Teacher",

    fields: [
      {
        key: "salutation",
        backendKey: "salutation",
        label: "Title (Mr/Ms)",
        type: "select",
        options: ["Mr.", "Ms.", "Mrs.", "Dr."],
        required: true,
      },

      {
        key: "firstName",
        backendKey: "firstName",
        label: "First Name",
        type: "text",
        required: true,
      },

      {
        key: "lastName",
        backendKey: "lastName",
        label: "Last Name",
        type: "text",
        required: true,
      },

      {
        key: "mobile",
        backendKey: "mobile",
        label: "Mobile Number",
        type: "tel",
        required: true,
      },

      {
        key: "timezone",
        backendKey: "timezone",
        label: "Timezone",
        type: "select",
        options: [
          "Asia/Kolkata",
          "Asia/Dubai",
          "Europe/London",
          "America/New_York",
          "America/Los_Angeles",
        ],
        required: true,
      },

      {
        key: "qualification",
        backendKey: "qualification",
        label: "Qualification",
        type: "select",
        options: [
          "B.Ed",
          "M.Ed",
          "B.Sc",
          "M.Sc",
          "B.A",
          "M.A",
          "Ph.D",
          "Other",
        ],
        required: true,
      },

      {
        key: "email",
        backendKey: "email",
        label: "Email ID",
        type: "email",
        required: true,
      },

      {
        key: "password",
        backendKey: "password",
        label: "Password",
        type: "password",
        required: true,
      },

      {
        key: "confirmPassword",
        backendKey: "confirmPassword",
        label: "Confirm Password",
        type: "password",
        required: true,
      },

      {
        key: "preferredSubject",
        backendKey: "preferredSubject",
        label: "Preferred Subject",
        type: "text",
        required: true,
      },
    ],

    endpoint: "/api/teachers/register",

    hint:
      "Mr., Arjun, Sharma, 9876543210, Asia/Kolkata, B.Ed, arjun@email.com, Pass@123, Pass@123, Maths",
  },
};

// ─── CreatedUserCard ──────────────────────────────────────────────────────────
const CreatedUserCard = ({
  user,
  role,
  onDismiss,
}) => {
  const initials =
    `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase();

  const rows = CARD_FIELD_ORDER.map((key) => {
    const meta = FIELD_REGISTRY[key];

    if (!meta) return null;

    const canSee = meta.visibleTo.includes(role);

    return {
      key,
      icon: meta.icon,
      label: meta.label,
      value: canSee ? user[key] || "—" : null,
      restricted: !canSee,
      sensitive: meta.sensitive || false,
    };
  }).filter(Boolean);

  return (
    <div className="cuc-card">

      <div className="cuc-ribbon">
        {role === "student"
          ? "🎓 Student"
          : "📚 Teacher"}{" "}
        Created Successfully
      </div>

      <div className="cuc-avatar-wrap">
        <div className="cuc-avatar">
          {initials}
        </div>

        <div className="cuc-badge-check">
          ✓
        </div>
      </div>

      <div className="cuc-name">
        {user.salutation} {user.firstName} {user.lastName}
      </div>

      <div className="cuc-status-badge">
        ⏳ Pending Admin Approval
      </div>

      <div className="cuc-details">
        {rows.map((row) => (
          <div
            key={row.key}
            className="cuc-row"
          >
            <span className="cuc-row-icon">
              {row.icon}
            </span>

            <span className="cuc-row-label">
              {row.label}
            </span>

            {row.restricted ? (
              <span className="cuc-row-value cuc-restricted">
                N/A
              </span>
            ) : (
              <span className="cuc-row-value">
                {row.value}
              </span>
            )}
          </div>
        ))}

        {user.fileName && (
          <div className="cuc-row">
            <span className="cuc-row-icon">
              📄
            </span>

            <span className="cuc-row-label">
              {role === "student"
                ? "ID Proof"
                : "Cert."}
            </span>

            <span className="cuc-row-value cuc-file">
              {user.fileName}
            </span>
          </div>
        )}
      </div>

      <button
        className="cuc-dismiss"
        onClick={onDismiss}
      >
        ✕ Dismiss
      </button>

    </div>
  );
};

// ─── AI Validation Agent ──────────────────────────────────────────────────────
const AIValidationAgent = {

  validate: async (
    role,
    filledFields,
    hasFile = false
  ) => {
    const response = await fetch(
      `${API_BASE_URL}/api/validate/partial`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          role,
          fields: filledFields,
          hasFile,
        }),
      }
    );

    if (!response.ok) {
      const err =
        await response
          .json()
          .catch(() => ({}));

      throw new Error(
        err.message ||
        `Agent validation error: ${response.status}`
      );
    }

    return await response.json();
  },

  validateFull: async (
    role,
    payload,
    hasFile = false
  ) => {
    const response = await fetch(
      `${API_BASE_URL}/api/validate/full`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          role,
          payload,
          hasFile,
        }),
      }
    );

    if (!response.ok) {
      const err =
        await response
          .json()
          .catch(() => ({}));

      throw new Error(
        err.message ||
        `Agent full-validation error: ${response.status}`
      );
    }

    return await response.json();
  },
};

// ─── Local validators ─────────────────────────────────────────────────────────
const VALIDATORS = {

  salutation: (v) => {
    if (!v || !v.trim())
      return "Title is required";

    const ok = [
      "Mr.",
      "Ms.",
      "Mrs.",
      "Dr.",
    ];

    const norm = normalizeSalutation(v);

    return ok.includes(norm)
      ? null
      : "Must be one of: Mr., Ms., Mrs., Dr.";
  },

  firstName: (v) => {
    if (!v || !v.trim())
      return "First name is required";

    if (v.trim().length < 2)
      return "At least 2 characters";

    if (!/^[A-Za-z\s]+$/.test(v.trim()))
      return "Only letters allowed";

    return null;
  },

  lastName: (v) => {
    if (!v || !v.trim())
      return "Last name is required";

    if (v.trim().length < 2)
      return "At least 2 characters";

    if (!/^[A-Za-z\s]+$/.test(v.trim()))
      return "Only letters allowed";

    return null;
  },

  mobile: (v) => {
    if (!v || !v.trim())
      return "Mobile number is required";

    if (!/^\d{10}$/.test(v.trim()))
      return "Must be exactly 10 digits";

    if (/^0/.test(v.trim()))
      return "Must not start with 0";

    return null;
  },

  syllabus: (v) =>
    !v || !v.trim()
      ? "Syllabus is required"
      : null,

  studentClass: (v) =>
    !v || !v.trim()
      ? "Class is required"
      : null,

  timezone: (v) =>
    !v || !v.trim()
      ? "Timezone is required"
      : null,

  qualification: (v) =>
    !v || !v.trim()
      ? "Qualification is required"
      : null,

  email: (v) => {
    if (!v || !v.trim())
      return "Email is required";

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()))
      return "Invalid email format";

    if (v.includes("gmail.con"))
      return "Did you mean gmail.com?";

    return null;
  },

  password: (v) => {
    if (!v)
      return "Password is required";

    if (v.length < 8)
      return "Minimum 8 characters";

    if (!/[A-Z]/.test(v))
      return "Need at least one uppercase letter";

    if (!/[a-z]/.test(v))
      return "Need at least one lowercase letter";

    if (!/\d/.test(v))
      return "Need at least one number";

    if (!/[@$!%*?&]/.test(v))
      return "Need at least one special char (@$!%*?&)";

    return null;
  },

  confirmPassword: (v, all) => {
    if (!v)
      return "Please confirm your password";

    if (v !== all.password)
      return "Passwords do not match";

    return null;
  },

  preferredSubject: (v) => {
    if (!v || !v.trim())
      return "Subject is required";

    if (v.trim().length < 2)
      return "At least 2 characters";

    return null;
  },

  emisNumber: (v) => {
    if (!v || !v.trim())
      return "EMIS number is required";

    if (v.trim().length < 4)
      return "At least 4 characters";

    return null;
  },

  panNumber: (v) => {
    if (!v || !v.trim())
      return "PAN number is required";

    if (
      !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(
        v.trim().toUpperCase()
      )
    ) {
      return "Invalid PAN format (e.g. ABCDE1234F)";
    }

    return null;
  },
};

const runLocalValidation = (
  fields,
  parsedData,
  role,
  file
) => {
  const errors = {};

  fields.forEach((field) => {
    const validator =
      VALIDATORS[field.key];

    errors[field.key] = validator
      ? validator(
          parsedData[field.key],
          parsedData
        )
      : null;
  });

  if (role === "student")
    errors["_file"] = file
      ? null
      : "Student proof required";
  else
    errors["_file"] = null;

  return errors;
};

// ─── AdminQuickCreate ─────────────────────────────────────────────────────────
const AdminQuickCreate = () => {

  const [role, setRole] =
    useState("student");

  const [inputText, setInputText] =
    useState("");

  const [parsedData, setParsedData] =
    useState({});

  const [certFile, setCertFile] =
    useState(null);

  const [loading, setLoading] =
    useState(false);

  const [message, setMessage] =
    useState(null);

  const [fieldErrors, setFieldErrors] =
    useState({});

  const [validated, setValidated] =
    useState(false);

  const [createdUser, setCreatedUser] =
    useState(null);

  const [isAiValidating, setIsAiValidating] =
    useState(false);

  const [aiStatusText, setAiStatusText] =
    useState("");

  const [showAiStatus, setShowAiStatus] =
    useState(false);

  const debounceRef =
    useRef(null);

  const config = ROLES[role];

  useEffect(() => {

    setInputText("");
    setParsedData({});
    setMessage(null);
    setCertFile(null);
    setFieldErrors({});
    setValidated(false);
    setIsAiValidating(false);
    setShowAiStatus(false);

    if (debounceRef.current)
      clearTimeout(debounceRef.current);

  }, [role]);

  const runAiValidation =
    useCallback(
      async (data, file) => {

        const filledFields = {};

        config.fields.forEach((f) => {
          if (
            data[f.key] &&
            data[f.key].trim()
          ) {
            filledFields[f.key] =
              data[f.key];
          }
        });

        if (
          Object.keys(filledFields)
            .length === 0
        ) {
          setIsAiValidating(false);
          setShowAiStatus(false);
          return;
        }

        setIsAiValidating(true);
        setShowAiStatus(true);
        setAiStatusText(
          "AI is validating your fields..."
        );

        try {

          const result =
            await AIValidationAgent.validate(
              role,
              filledFields,
              !!file
            );

          const newErrors = {};

          config.fields.forEach((f) => {

            if (
              data[f.key] &&
              data[f.key].trim()
            ) {
              newErrors[f.key] =
                result.errors?.[f.key] !== undefined
                  ? result.errors[f.key]
                  : null;
            } else {
              newErrors[f.key] =
                undefined;
            }

          });

          if (role === "student")
            newErrors["_file"] =
              file
                ? null
                : undefined;
          else
            newErrors["_file"] =
              null;

          setFieldErrors(newErrors);
          setValidated(true);

          const validCount =
            Object.values(newErrors)
              .filter(
                (e) => e === null
              ).length;

          const invalidCount =
            Object.values(newErrors)
              .filter(
                (e) =>
                  e &&
                  e !== null &&
                  e !== undefined
              ).length;

          setAiStatusText(
            `✓ AI checked ${
              validCount + invalidCount
            } field(s) — ${validCount} valid, ${invalidCount} invalid`
          );

          setTimeout(
            () => setShowAiStatus(false),
            2500
          );

        } catch (err) {

          console.error(
            "AI validation failed, falling back to local:",
            err
          );

          const newErrors = {};

          config.fields.forEach((f) => {

            if (
              data[f.key] &&
              data[f.key].trim()
            ) {
              const validator =
                VALIDATORS[f.key];

              newErrors[f.key] =
                validator
                  ? validator(
                      data[f.key],
                      data
                    )
                  : null;

            } else {
              newErrors[f.key] =
                undefined;
            }

          });

          if (role === "student")
            newErrors["_file"] =
              file
                ? null
                : undefined;
          else
            newErrors["_file"] =
              null;

          setFieldErrors(newErrors);
          setValidated(true);

          setAiStatusText(
            "⚠ Using local validation (AI unavailable)"
          );

          setTimeout(
            () => setShowAiStatus(false),
            2500
          );
        }

        setIsAiValidating(false);
      },
      [config, role]
    );

  const handleInput = (val) => {

    setInputText(val);

    const parts =
      val
        .split(",")
        .map((s) => s.trim());

    const data = {};

    config.fields.forEach(
      (field, index) => {
        data[field.key] =
          parts[index] || "";
      }
    );

    setParsedData(data);
    setMessage(null);

    const checkingErrors = {};

    config.fields.forEach((f) => {
      checkingErrors[f.key] =
        data[f.key] &&
        data[f.key].trim()
          ? "__checking__"
          : undefined;
    });

    setFieldErrors(checkingErrors);
    setValidated(false);

    if (debounceRef.current)
      clearTimeout(
        debounceRef.current
      );

    const hasAnyFilled =
      config.fields.some(
        (f) =>
          data[f.key] &&
          data[f.key].trim()
      );

    if (hasAnyFilled) {

      setShowAiStatus(true);

      setAiStatusText(
        "AI is validating your fields..."
      );

      debounceRef.current =
        setTimeout(() => {
          runAiValidation(
            data,
            certFile
          );
        }, 800);

    } else {

      setShowAiStatus(false);
      setFieldErrors({});
      setValidated(false);

    }
  };

  const handleValidate = async () => {

    if (debounceRef.current)
      clearTimeout(
        debounceRef.current
      );

    setIsAiValidating(true);
    setShowAiStatus(true);

    setAiStatusText(
      "AI is validating all fields..."
    );

    try {

      const result =
        await AIValidationAgent.validateFull(
          role,
          parsedData,
          !!certFile
        );

      const newErrors = {};

      config.fields.forEach((f) => {
        newErrors[f.key] =
          result.errors?.[f.key] !== undefined
            ? result.errors[f.key]
            : null;
      });

      newErrors["_file"] =
        result.errors?.["_file"] !== undefined
          ? result.errors["_file"]
          : role === "student"
          ? certFile
            ? null
            : "Student proof required"
          : null;

      setFieldErrors(newErrors);
      setValidated(true);

      const hasErrors =
        Object.values(newErrors).some(
          (e) =>
            e !== null &&
            e !== undefined
        );

      const count =
        Object.values(newErrors).filter(
          (e) =>
            e !== null &&
            e !== undefined
        ).length;

      setAiStatusText(
        hasErrors
          ? `✕ ${count} field(s) invalid — fix the red tags above`
          : "✓ All fields valid — ready to create!"
      );

      setTimeout(
        () => setShowAiStatus(false),
        2500
      );

      if (!hasErrors) {

        setMessage({
          type: "success",
          text: `✓ All fields valid! ${
            result.summary || ""
          }`,
        });

      } else {

        setMessage({
          type: "error",
          text: `✕ ${count} field(s) are invalid — fix the red tags above.`,
        });

      }

    } catch (err) {

      console.error(
        "Full agent validation failed, using local fallback:",
        err
      );

      const errors =
        runLocalValidation(
          config.fields,
          parsedData,
          role,
          certFile
        );

      setFieldErrors(errors);
      setValidated(true);

      const hasErrors =
        Object.values(errors).some(
          (e) =>
            e !== null &&
            e !== undefined
        );

      const count =
        Object.values(errors).filter(
          (e) =>
            e !== null &&
            e !== undefined
        ).length;

      setAiStatusText(
        "⚠ Using local validation (agent unavailable)"
      );

      setTimeout(
        () => setShowAiStatus(false),
        2500
      );

      setMessage({
        type: hasErrors
          ? "error"
          : "success",

        text: hasErrors
          ? `✕ ${count} field(s) are invalid — fix the red tags above.`
          : "✓ All fields are valid! You can now create the user.",
      });
    }

    setIsAiValidating(false);
  };

  const allFieldsValid =
    validated &&
    config.fields.every(
      (f) =>
        fieldErrors[f.key] === null
    ) &&
    (role === "teacher" ||
      certFile) &&
    !isAiValidating;

  const handleKeyDown = (e) => {

    if (
      e.key === "Enter" &&
      !e.shiftKey
    ) {
      e.preventDefault();
      handleValidate();
    }
  };

  const handleCreate = async () => {

    if (debounceRef.current)
      clearTimeout(
        debounceRef.current
      );

    const errors =
      runLocalValidation(
        config.fields,
        parsedData,
        role,
        certFile
      );

    setFieldErrors(errors);
    setValidated(true);

    if (
      Object.values(errors).some(
        (e) =>
          e !== null &&
          e !== undefined
      )
    ) {
      setMessage({
        type: "error",
        text:
          "Please fix all invalid fields before creating.",
      });

      return;
    }

    setLoading(true);
    setMessage(null);

    const formData =
      new FormData();

    config.fields.forEach((f) => {

      if (
        f.key ===
        "confirmPassword"
      )
        return;

      if (
        parsedData[f.key] !==
          undefined &&
        parsedData[f.key] !== ""
      ) {

        const value =
          f.key === "salutation"
            ? normalizeSalutation(
                parsedData[f.key]
              )
            : f.key === "panNumber"
            ? parsedData[
                f.key
              ].toUpperCase()
            : parsedData[f.key];

        formData.append(
          f.backendKey,
          value
        );
      }
    });

    if (
      role === "student" &&
      certFile
    ) {
      formData.append(
        "proof",
        certFile
      );

    } else if (
      role === "teacher" &&
      certFile
    ) {
      formData.append(
        "degreeCertificate",
        certFile
      );
    }

    try {

      const res =
        await fetch(
          `${API_BASE_URL}${config.endpoint}`,
          {
            method: "POST",
            body: formData,
          }
        );

      const data =
        await res.json();

      if (res.ok) {

        setCreatedUser({
          ...parsedData,
          salutation:
            normalizeSalutation(
              parsedData.salutation
            ),
          panNumber:
            parsedData.panNumber?.toUpperCase(),
          role,
          fileName:
            certFile?.name || null,
          createdAt:
            new Date().toLocaleString(
              "en-IN"
            ),
        });

        setMessage({
          type: "success",
          text: `✓ ${config.label} created successfully!`,
        });

        setInputText("");
        setParsedData({});
        setCertFile(null);
        setFieldErrors({});
        setValidated(false);

      } else {

        setMessage({
          type: "error",
          text:
            data.message ||
            "Something went wrong.",
        });
      }

    } catch {

      setMessage({
        type: "error",
        text:
          "Network error — is your backend running?",
      });

    } finally {

      setLoading(false);
    }
  };

  const tagStatus = (
    fieldKey
  ) => {

    const err =
      fieldErrors[fieldKey];

    if (
      err ===
      "__checking__"
    )
      return "checking";

    if (
      !validated &&
      err === undefined
    )
      return "neutral";

    if (err === null)
      return "valid";

    if (err)
      return "invalid";

    return "neutral";
  };

  const filledCount =
    config.fields.filter(
      (f) =>
        parsedData[f.key] &&
        parsedData[f.key].trim()
    ).length +
    (certFile ? 1 : 0);

  const totalCount =
    config.fields.length + 1;

  const validCount =
    Object.values(fieldErrors)
      .filter(
        (e) => e === null
      ).length;

  const invalidCount =
    Object.values(fieldErrors)
      .filter(
        (e) =>
          e &&
          e !== null &&
          e !== undefined &&
          e !== "__checking__"
      ).length;

  return (
    <div className="aqc-layout">

      <div className="aqc-left">

        {createdUser ? (

          <CreatedUserCard
            user={createdUser}
            role={createdUser.role}
            onDismiss={() =>
              setCreatedUser(null)
            }
          />

        ) : (

          <div className="cuc-empty">
            <span className="cuc-empty-icon">
              👤
            </span>

            After a successful registration,
            the new user's details will appear
            here.
          </div>
        )}

      </div>


      <div className="aqc-right">

        <div>
          <span className="aqc-ai-badge">
            ⚡ AI-Powered Live Validation
          </span>
        </div>


        <div className="aqc-role-row">

          {Object.entries(
            ROLES
          ).map(([key, val]) => (

            <button
              key={key}
              className={`aqc-role-btn ${
                role === key
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                setRole(key)
              }
            >

              <span className="aqc-role-icon">
                {key === "student"
                  ? "🎓"
                  : "📚"}
              </span>

              {val.label}

            </button>
          ))}

        </div>


        <div className="aqc-tags">

          {config.fields.map((f) => {

            const status =
              tagStatus(f.key);

            const errMsg =
              fieldErrors[f.key];

            return (
              <span
                key={f.key}
                className={`aqc-tag ${
                  parsedData[f.key]
                    ? "filled"
                    : ""
                } ${
                  status !== "neutral"
                    ? `tag-${status}`
                    : ""
                }`}
                data-error={
                  errMsg &&
                  errMsg !==
                    "__checking__"
                    ? errMsg
                    : ""
                }
                title={
                  errMsg &&
                  errMsg !==
                    "__checking__"
                    ? errMsg
                    : f.label
                }
              >

                {f.label}

                {parsedData[f.key] && (
                  <span className="aqc-tag-val">
                    {f.type === "password"
                      ? " ••••"
                      : `: ${parsedData[f.key]}`}
                  </span>
                )}

              </span>
            );
          })}


          {(() => {

            let fileStatus =
              "neutral";

            if (certFile)
              fileStatus =
                "valid";

            else if (
              validated &&
              fieldErrors["_file"]
            )
              fileStatus =
                "invalid";

            return (
              <span
                className={`aqc-tag ${
                  certFile
                    ? "filled"
                    : ""
                } ${
                  fileStatus !==
                  "neutral"
                    ? `tag-${fileStatus}`
                    : ""
                }`}
                data-error={
                  fieldErrors["_file"] ||
                  ""
                }
                title={
                  fieldErrors["_file"] ||
                  (
                    role === "student"
                      ? "Student ID / Proof"
                      : "Degree Certificate"
                  )
                }
              >

                {role === "student"
                  ? "🪪 ID Proof"
                  : "📄 Degree Cert"}

                {certFile && (
                  <span className="aqc-tag-val">
                    : {certFile.name}
                  </span>
                )}

              </span>
            );
          })()}

        </div>


        <div
          className={`aqc-box ${
            validated &&
            invalidCount > 0
              ? "has-error"
              : ""
          }`}
        >

          {showAiStatus && (
            <div className="aqc-ai-status">

              {isAiValidating && (
                <div className="aqc-ai-dot" />
              )}

              <span>
                {aiStatusText}
              </span>

            </div>
          )}


          <textarea
            className="aqc-textarea"
            value={inputText}
            onChange={(e) =>
              handleInput(
                e.target.value
              )
            }
            onKeyDown={
              handleKeyDown
            }
            placeholder={`Enter details separated by commas...\n\nExample: ${config.hint}`}
            rows={4}
          />


          {role === "student" && (
            <div className="aqc-file-row">

              <label className="aqc-file-label">

                🪪{" "}
                {certFile
                  ? "Change ID Proof"
                  : "Upload Student ID"}

                <span className="aqc-file-required">
                  {" "}
                  *required
                </span>

                <input
                  type="file"
                  accept=".pdf"
                  className="aqc-file-input"
                  onChange={(e) => {

                    const f =
                      e.target.files[0] ||
                      null;

                    setCertFile(f);
                    setMessage(null);

                    if (validated) {

                      const newErrors = {
                        ...fieldErrors,
                        _file: f
                          ? null
                          : "Student proof required",
                      };

                      setFieldErrors(
                        newErrors
                      );
                    }
                  }}
                />

              </label>


              {certFile && (
                <div className="aqc-file-info">

                  <span className="aqc-file-name">
                    ✓ {certFile.name}
                  </span>

                  <button
                    className="aqc-file-remove"
                    onClick={() => {

                      setCertFile(null);

                      if (validated) {
                        setFieldErrors(
                          (prev) => ({
                            ...prev,
                            _file:
                              "Student proof required",
                          })
                        );
                      }

                    }}
                  >
                    ✕
                  </button>

                </div>
              )}

            </div>
          )}


          {role === "teacher" && (
            <div className="aqc-file-row">

              <label className="aqc-file-label">

                📄{" "}
                {certFile
                  ? "Change Certificate"
                  : "Upload Degree Certificate"}{" "}
                (optional)

                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="aqc-file-input"
                  onChange={(e) => {
                    setCertFile(
                      e.target.files[0] ||
                      null
                    );

                    setMessage(null);
                  }}
                />

              </label>


              {certFile && (
                <div className="aqc-file-info">

                  <span className="aqc-file-name">
                    ✓ {certFile.name}
                  </span>

                  <button
                    className="aqc-file-remove"
                    onClick={() =>
                      setCertFile(null)
                    }
                  >
                    ✕
                  </button>

                </div>
              )}

            </div>
          )}


          <div className="aqc-box-footer">

            <div className="aqc-progress-wrap">
              <div
                className="aqc-progress-bar"
                style={{
                  width: `${
                    (filledCount /
                      totalCount) *
                    100
                  }%`,
                }}
              />
            </div>


            <div className="aqc-footer-row">

              <span className="aqc-count">
                {filledCount}/
                {totalCount} fields filled
              </span>


              <div className="aqc-btn-group">

                <button
                  className="aqc-validate-btn"
                  onClick={
                    handleValidate
                  }
                >
                  ✦ Validate
                </button>


                <button
                  className="aqc-create-btn"
                  onClick={
                    handleCreate
                  }
                  disabled={
                    !allFieldsValid ||
                    loading
                  }
                  title={
                    !allFieldsValid
                      ? "Fix all red fields first"
                      : ""
                  }
                >
                  {loading
                    ? "Creating..."
                    : `Create ${config.label}`}
                </button>

              </div>

            </div>

          </div>

        </div>


        {validated && (
          <div
            className={`aqc-val-summary ${
              invalidCount === 0
                ? "all-valid"
                : "has-invalid"
            }`}
          >

            {invalidCount === 0
              ? "✓ All fields valid — ready to create!"
              : "✕ Fix the red fields before creating"}

            <span className="aqc-val-pill good">
              ✓ {validCount} valid
            </span>

            {invalidCount > 0 && (
              <span className="aqc-val-pill bad">
                ✗ {invalidCount} invalid
              </span>
            )}

          </div>
        )}


        {message && (
          <div
            className={`aqc-message aqc-message--${message.type}`}
          >
            {message.text}
          </div>
        )}


        <details className="aqc-guide">

          <summary>
            Field order reference
          </summary>

          <ol className="aqc-guide-list">

            {config.fields.map((f) => (
              <li key={f.key}>

                <strong>
                  {f.label}
                </strong>

                {f.required && (
                  <span className="aqc-req-star">
                    {" "}
                    *
                  </span>
                )}

                {f.type === "select" && (
                  <span className="aqc-opt-text">
                    {" "}
                    — options:{" "}
                    {f.options.join(", ")}
                  </span>
                )}

              </li>
            ))}

            <li>

              <strong>
                {role === "student"
                  ? "Student ID"
                  : "Degree Certificate"}
              </strong>

              {role === "student" && (
                <span className="aqc-req-star">
                  {" "}
                  *
                </span>
              )}

              <span className="aqc-opt-text">
                {" "}
                — PDF/JPG/PNG via upload button
              </span>

            </li>

          </ol>

        </details>

      </div>

    </div>
  );
};

// ─── StudentAttendanceSearch ──────────────────────────────────────────────────
const StudentAttendanceSearch = () => {

  const [nameQuery, setNameQuery] =
    useState("");

  const [classQuery, setClassQuery] =
    useState("");

  const [suggestions, setSuggestions] =
    useState([]);

  const [result, setResult] =
    useState(null);

  const [notFound, setNotFound] =
    useState(false);

  const [showDrop, setShowDrop] =
    useState(false);

  const [searching, setSearching] =
    useState(false);

  const fetchAttendance = async (
    name,
    studentClass
  ) => {

    if (
      !name.trim() ||
      !studentClass.trim()
    ) {
      setResult(null);
      setNotFound(false);
      return;
    }

    setSearching(true);

    try {

      const res =
        await fetch(
          `${API_BASE_URL}/api/attendance/student-summary?name=${encodeURIComponent(
            name.trim()
          )}&class=${encodeURIComponent(
            studentClass.trim()
          )}`
        );

      const data =
        await res.json();

      if (
        res.ok &&
        data.student
      ) {

        setResult(
          data.student
        );

        setNotFound(false);

      } else {

        setResult(null);
        setNotFound(true);

      }

    } catch {

      setResult(null);
      setNotFound(true);

    } finally {

      setSearching(false);
    }
  };

  const fetchSuggestions =
    async (val) => {

      if (!val.trim()) {
        setSuggestions([]);
        return;
      }

      try {

        const res =
          await fetch(
            `${API_BASE_URL}/api/student/search?name=${encodeURIComponent(
              val
            )}`
          );

        const data =
          await res.json();

        setSuggestions(
          data.students || []
        );

      } catch {

        setSuggestions([]);
      }
    };

  const handleNameInput =
    (val) => {

      setNameQuery(val);
      setResult(null);
      setNotFound(false);

      fetchSuggestions(val);

      setShowDrop(true);
    };

  const handleSelect =
    (student) => {

      setNameQuery(
        `${student.firstName} ${student.lastName}`
      );

      setClassQuery(
        student.class || ""
      );

      setShowDrop(false);
    };

  const handleSearch = () => {

    setShowDrop(false);

    if (
      !nameQuery.trim() ||
      !classQuery.trim()
    ) {

      alert(
        "Please enter both the student name and their class."
      );

      return;
    }

    fetchAttendance(
      nameQuery,
      classQuery
    );
  };

  const pct =
    result &&
    result.totalClasses > 0
      ? Math.round(
          (result.presentCount /
            result.totalClasses) *
            100
        )
      : 0;

  const color =
    pct >= 75
      ? "#639922"
      : pct >= 50
      ? "#EF9F27"
      : "#E24B4A";

  const label =
    result &&
    result.totalClasses === 0
      ? "No attendance recorded yet"
      : pct >= 75
      ? "Good standing"
      : pct >= 50
      ? "Needs improvement"
      : "At risk";

  return (
    <div className="sas-container">

      <div className="sas-search-row">

        <div className="sas-rel">

          <input
            className="sas-input"
            type="text"
            placeholder="Student name..."
            value={nameQuery}
            onChange={(e) =>
              handleNameInput(
                e.target.value
              )
            }
            onBlur={() =>
              setTimeout(
                () =>
                  setShowDrop(false),
                150
              )
            }
            onKeyDown={(e) =>
              e.key === "Enter" &&
              handleSearch()
            }
          />


          {showDrop &&
            suggestions.length >
              0 && (

              <div className="sas-dropdown">

                {suggestions.map(
                  (s) => (

                    <div
                      key={s._id}
                      className="sas-drop-item"
                      onMouseDown={() =>
                        handleSelect(s)
                      }
                    >

                      {s.firstName}{" "}
                      {s.lastName}

                      <span className="sas-drop-meta">
                        {" "}
                        {s.class}
                      </span>

                    </div>
                  )
                )}

              </div>
            )}

        </div>


        <input
          className="sas-input sas-class-input"
          type="text"
          placeholder="Class..."
          value={classQuery}
          onChange={(e) => {
            setClassQuery(
              e.target.value
            );

            setResult(null);
            setNotFound(false);
          }}
          onKeyDown={(e) =>
            e.key === "Enter" &&
            handleSearch()
          }
        />


        <button
          className="sas-btn"
          onClick={handleSearch}
          disabled={searching}
        >
          {searching
            ? "Checking..."
            : "Check Attendance"}
        </button>

      </div>


      {result && (
        <div className="sas-result">

          <div className="sas-header">

            <div className="sas-avatar">
              {result.name
                ?.split(" ")
                .map(
                  (w) => w[0]
                )
                .slice(0, 2)
                .join("")}
            </div>


            <div>

              <div className="sas-name">
                {result.name}
              </div>

              <div className="sas-meta">
                {result.class}
                {result.subject
                  ? ` · ${result.subject}`
                  : ""}
              </div>

            </div>


            <div className="sas-pct-col">

              <span
                className="sas-pct"
                style={{
                  color,
                }}
              >
                {pct}%
              </span>

              <span
                className="sas-label"
                style={{
                  color,
                }}
              >
                {label}
              </span>

            </div>

          </div>


          <div className="sas-bar-wrap">

            <div
              className="sas-bar-fill"
              style={{
                width: `${pct}%`,
                background: color,
              }}
            />

          </div>


          <div className="sas-stats">

            <div className="sas-stat">
              <span>
                {result.totalClasses}
              </span>

              <small>
                Total classes
              </small>
            </div>


            <div className="sas-stat">

              <span
                style={{
                  color: "#639922",
                }}
              >
                {result.presentCount}
              </span>

              <small>
                Present
              </small>

            </div>


            <div className="sas-stat">

              <span
                style={{
                  color: "#E24B4A",
                }}
              >
                {
                  result.totalClasses -
                  result.presentCount
                }
              </span>

              <small>
                Absent
              </small>

            </div>

          </div>

        </div>
      )}


      {notFound && (
        <p className="sas-empty">
          No student found with that name and class.
        </p>
      )}

    </div>
  );
};

// ─── AdminDashboard ───────────────────────────────────────────────────────────
const AdminDashboard = () => {

  const [pendingStudents, setPendingStudents] =
    useState([]);

  const [pendingTeachers, setPendingTeachers] =
    useState([]);
  const [activationRequests, setActivationRequests] =
  useState([]);



  const [selectedStudent, setSelectedStudent] =
    useState(null);

  const [selectedTeacher, setSelectedTeacher] =
    useState(null);
    

  const [rejectReason, setRejectReason] =
    useState("");

  const [loading, setLoading] =
    useState(false);


 useEffect(() => {

  fetchPendingStudents();
  fetchPendingTeachers();
  fetchActivationRequests();

}, []);


  const fetchPendingStudents =
    async () => {

      try {

        const res =
          await fetch(
            `${API_BASE_URL}/api/student/admin/pending`
          );

        if (!res.ok)
          throw new Error(
            "Failed to fetch students"
          );

        const data =
          await res.json();

        setPendingStudents(
          Array.isArray(
            data.students
          )
            ? data.students
            : []
        );

      } catch (err) {

        console.error(
          "Error fetching students:",
          err.message
        );

        setPendingStudents([]);
      }
    };


  const fetchPendingTeachers =
    async () => {
      const fetchActivationRequests =
  async () => {

    try {

      const res =
        await fetch(
          `${API_BASE_URL}/api/teacher/admin/activation-requests`
        );

      if (!res.ok)
        throw new Error(
          "Failed to fetch activation requests"
        );

      const data =
        await res.json();

      setActivationRequests(
        Array.isArray(data.teachers)
          ? data.teachers
          : []
      );

    } catch (err) {

      console.error(
        "Error fetching activation requests:",
        err.message
      );

      setActivationRequests([]);
    }
  };

      try {

        const res =
          await fetch(
            `${API_BASE_URL}/api/teacher/admin/pending`
          );

        if (!res.ok)
          throw new Error(
            "Failed to fetch teachers"
          );

        const data =
          await res.json();

        setPendingTeachers(
          Array.isArray(
            data.teachers
          )
            ? data.teachers
            : []
        );

      } catch (err) {

        console.error(
          "Error fetching teachers:",
          err.message
        );

        setPendingTeachers([]);
      }
    };
    const fetchActivationRequests =
  async () => {

    try {

      const res =
        await fetch(
          `${API_BASE_URL}/api/teacher/admin/activation-requests`
        );

      if (!res.ok)
        throw new Error(
          "Failed to fetch activation requests"
        );

      const data =
        await res.json();

      setActivationRequests(
        Array.isArray(data.teachers)
          ? data.teachers
          : []
      );

    } catch (err) {

      console.error(
        "Error fetching activation requests:",
        err.message
      );

      setActivationRequests([]);
    }
  };


  // ─────────────────────────────────────────────
  // STUDENT APPROVAL
  // ─────────────────────────────────────────────
  const handleStudentApproval =
    async (status) => {

      if (!selectedStudent)
        return;

      if (
        status === "Rejected" &&
        !rejectReason.trim()
      ) {

        alert(
          "Please enter a rejection reason."
        );

        return;
      }

      try {

        setLoading(true);

        const res =
          await fetch(
            `${API_BASE_URL}/api/student/admin/${selectedStudent._id}/approve`,
            {
              method: "PUT",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                status,

                reason:
                  status === "Rejected"
                    ? rejectReason
                    : "",
              }),
            }
          );

        if (!res.ok)
          throw new Error(
            "Failed to update student"
          );

        const data =
          await res.json();

        alert(
          data.message ||
          "Student updated successfully"
        );

        resetState();

        fetchPendingStudents();

      } catch (err) {

        console.error(err);

        alert("Action failed");

      } finally {

        setLoading(false);
      }
    };


  // ─────────────────────────────────────────────
  // TEACHER APPROVAL / DOCUMENT REJECTION
  // ─────────────────────────────────────────────
  const handleTeacherApproval =
    async (status) => {

      if (!selectedTeacher)
        return;


      // Full rejection requires a reason.
      // Document rejection does NOT require a reason.
      if (
        status === "Rejected" &&
        !rejectReason.trim()
      ) {

        alert(
          "Please enter a rejection reason."
        );

        return;
      }


      try {

        setLoading(true);


        const res =
          await fetch(
            `${API_BASE_URL}/api/teacher/admin/teacher/${selectedTeacher._id}/approve`,
            {
              method: "PUT",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                status,

                reason:
                  status === "Rejected"
                    ? rejectReason.trim()
                    : "",
              }),
            }
          );


        const data =
          await res.json();


        if (!res.ok) {

          throw new Error(
            data.message ||
            "Failed to update teacher"
          );
        }


        alert(
          data.message ||
          (
            status ===
            "Reject Document"
              ? "Document rejected. Re-upload email sent to the faculty."
              : "Teacher updated successfully"
          )
        );


        resetState();


        await fetchPendingTeachers();


      } catch (err) {

        console.error(
          "Teacher approval error:",
          err
        );

        alert(
          err.message ||
          "Action failed"
        );

      } finally {

        setLoading(false);
      }
    };

const handleTeacherStatus = async (
  teacherId,
  action
) => {
  try {
    setLoading(true);

    const res = await fetch(
      `${API_BASE_URL}/api/teacher/admin/teacher/${teacherId}/status`,
      {
        method: "PUT",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          action,
        }),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      throw new Error(
        data.message ||
          "Failed to update teacher status"
      );
    }

    alert(
      data.message ||
        "Faculty status updated successfully"
    );

    resetState();

    await fetchPendingTeachers();

  } catch (err) {
    console.error(
      "Teacher status update error:",
      err
    );

    alert(
      err.message ||
        "Failed to update faculty status"
    );

  } finally {
    setLoading(false);
  }
};

  const resetState = () => {

    setSelectedStudent(null);

    setSelectedTeacher(null);

    setRejectReason("");
  };


  return (
    <div className="admin-dashboard">
{activationRequests.length > 0 && (
  <div className="activation-request-popup">

    <div className="activation-request-popup-icon">
      🔔
    </div>

    <div className="activation-request-popup-content">
      <h3>Faculty Activation Request</h3>

      <p>
        {activationRequests.length} faculty member
        {activationRequests.length > 1 ? "s" : ""} requested
        account activation.
      </p>
    </div>

    <button
      type="button"
      className="activation-request-popup-btn"
      onClick={() => {
        window.location.href = "/manage-teachers";
      }}
    >
      View Requests
    </button>

  </div>
)}
      <h1>
        Admin Dashboard
      </h1>


      {/* ── Pending Students ── */}
<div className="admin-section-header">
  <div>
    <h2>Pending Students</h2>
    <p className="admin-section-subtitle">
      Review student registration details and documents
    </p>
  </div>

  <div className="admin-section-count">
    {pendingStudents.length} Pending
  </div>
</div>

{pendingStudents.length === 0 ? (

  <div className="empty-state-card">
    <div className="empty-state-icon">🎓</div>
    <h3>No Pending Students</h3>
    <p>
      There are currently no students waiting for approval.
    </p>
  </div>

) : (

  <div className="pending-student-list">

    {pendingStudents.map((student) => (

      <React.Fragment key={student._id}>

        {/* STUDENT CARD */}
        <div
          className={`student-request-card ${
            selectedStudent?._id === student._id
              ? "student-request-card-active"
              : ""
          }`}
          onClick={() => {

            if (
              selectedStudent?._id ===
              student._id
            ) {

              setSelectedStudent(null);

            } else {

              setSelectedStudent(student);
              setSelectedTeacher(null);
              setRejectReason("");

            }

          }}
        >

          {/* Avatar */}
          <div className="student-request-avatar">

            {(
              `${student.firstName?.[0] || ""}${
                student.lastName?.[0] || ""
              }`
            ).toUpperCase()}

          </div>


          {/* Main Information */}
          <div className="student-request-info">

            <div className="student-request-name">

              {student.salutation}{" "}
              {student.firstName}{" "}
              {student.lastName}

            </div>

            <div className="student-request-email">
              {student.email}
            </div>

            <div className="student-request-meta">

              <span>
                🏫 {student.class || "N/A"}
              </span>

              <span>
                📚 {student.syllabus || "N/A"}
              </span>

              <span>
                📱 {student.mobile || "N/A"}
              </span>

            </div>

          </div>


          {/* Status */}
          <div className="student-request-status">

            <span className="pending-status-badge">
              ● Pending
            </span>

          </div>


          {/* Arrow */}
          <div className="student-request-arrow">

            {selectedStudent?._id ===
            student._id
              ? "▲"
              : "›"}

          </div>

        </div>


        {/* STUDENT DETAILS */}
        {selectedStudent?._id === student._id && (

          <div className="student-detail-panel">

            {/* PANEL HEADER */}
            <div className="student-detail-header">

              <div className="student-detail-title">

                <div className="student-detail-avatar">

                  {(
                    `${selectedStudent.firstName?.[0] || ""}${
                      selectedStudent.lastName?.[0] || ""
                    }`
                  ).toUpperCase()}

                </div>

                <div>

                  <h3>
                    {selectedStudent.salutation}{" "}
                    {selectedStudent.firstName}{" "}
                    {selectedStudent.lastName}
                  </h3>

                  <p>
                    {selectedStudent.email}
                  </p>

                </div>

              </div>


              <button
                type="button"
                className="student-detail-close"
                onClick={() =>
                  setSelectedStudent(null)
                }
              >
                ✕
              </button>

            </div>


            {/* STATUS BAR */}
            <div className="student-detail-status-bar">

              <div>

                <span className="detail-status-label">
                  Registration Status
                </span>

                <strong>
                  {selectedStudent.approvalStatus ||
                    "Pending"}
                </strong>

              </div>

              <div>

                <span className="detail-status-label">
                  Payment
                </span>

                <strong>
                  {selectedStudent.paymentStatus ||
                    selectedStudent.payment ||
                    "Unpaid"}
                </strong>

              </div>

            </div>


            {/* DETAILS GRID */}
            <div className="student-details-grid">

              <div className="student-detail-item">
                <span>👤 Full Name</span>
                <strong>
                  {selectedStudent.salutation}{" "}
                  {selectedStudent.firstName}{" "}
                  {selectedStudent.lastName}
                </strong>
              </div>


              <div className="student-detail-item">
                <span>✉ Email</span>
                <strong>
                  {selectedStudent.email || "N/A"}
                </strong>
              </div>


              <div className="student-detail-item">
                <span>📱 Mobile</span>
                <strong>
                  {selectedStudent.mobile || "N/A"}
                </strong>
              </div>


              <div className="student-detail-item">
                <span>🌍 Timezone</span>
                <strong>
                  {selectedStudent.timezone || "N/A"}
                </strong>
              </div>


              <div className="student-detail-item">
                <span>🏫 Class</span>
                <strong>
                  {selectedStudent.class || "N/A"}
                </strong>
              </div>


              <div className="student-detail-item">
                <span>📚 Syllabus</span>
                <strong>
                  {selectedStudent.syllabus || "N/A"}
                </strong>
              </div>


              <div className="student-detail-item">
                <span>🆔 EMIS Number</span>
                <strong>
                  {selectedStudent.emisNumber || "N/A"}
                </strong>
              </div>


              <div className="student-detail-item">
                <span>🪪 PAN Number</span>
                <strong>
                  {selectedStudent.panNumber || "N/A"}
                </strong>
              </div>


              <div className="student-detail-item">
                <span>👨‍👩‍👦 Group</span>
                <strong>
                  {selectedStudent.group || "N/A"}
                </strong>
              </div>


              <div className="student-detail-item">
                <span>📅 Registered</span>
                <strong>
                  {selectedStudent.registeredAt
                    ? new Date(
                        selectedStudent.registeredAt
                      ).toLocaleString()
                    : "N/A"}
                </strong>
              </div>

            </div>


            {/* ID PROOF */}
            <div className="student-document-section">

              <div className="student-document-header">

                <div>
                  <h4>🪪 Student ID Proof</h4>

                  <p>
                    Review the uploaded student document
                    before approving the registration.
                  </p>
                </div>

              </div>


              {selectedStudent.proof ? (

                <div className="student-document-preview">

                  {selectedStudent.proof.startsWith(
                    "data:application/pdf"
                  ) ? (

                    <iframe
                      src={selectedStudent.proof}
                      title="Student ID Proof"
                      className="student-proof-frame"
                    />

                  ) : (

                    <img
                      src={selectedStudent.proof}
                      alt="Student ID Proof"
                      className="student-proof-image"
                    />

                  )}

                </div>

              ) : (

                <div className="no-document-box">

                  <span>📄</span>

                  <strong>
                    No document uploaded
                  </strong>

                  <p>
                    The student has not uploaded an ID
                    proof.
                  </p>

                </div>

              )}


              {selectedStudent.proof && (

                <div className="document-actions">

                  <button
                    type="button"
                    className="document-view-btn"
                    onClick={() => {

                      const win =
                        window.open(
                          "",
                          "_blank"
                        );

                      if (!win) return;

                      win.document.write(`
                        <html>
                          <head>
                            <title>Student ID Proof</title>
                            <style>
                              body {
                                margin: 0;
                                background: #111827;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                min-height: 100vh;
                              }

                              img,
                              iframe {
                                max-width: 95vw;
                                max-height: 95vh;
                                border: none;
                              }
                            </style>
                          </head>

                          <body>
                            ${
                              selectedStudent.proof.startsWith(
                                "data:application/pdf"
                              )
                                ? `<iframe src="${selectedStudent.proof}" width="100%" height="1000px"></iframe>`
                                : `<img src="${selectedStudent.proof}" />`
                            }
                          </body>
                        </html>
                      `);

                      win.document.close();

                    }}
                  >
                    👁 View Document
                  </button>


                  <a
                    href={selectedStudent.proof}
                    download="student-id-proof"
                    className="document-download-btn"
                  >
                    ⬇ Download
                  </a>

                </div>

              )}

            </div>

            {/* =========================================
                WAITING FOR DOCUMENT RE-UPLOAD
            ========================================= */}

            {/* =========================================
    WAITING FOR DOCUMENT RE-UPLOAD
========================================= */}

{selectedStudent.documentReuploadToken && (
  <div className="student-reupload-waiting-card">

    <div className="student-reupload-waiting-icon">
      📄
    </div>

    <div className="student-reupload-waiting-content">

      <h4>
        Waiting for Document Re-upload
      </h4>

      <p>
        The student has been asked to upload
        a new ID proof.
      </p>

      <span>
        The approval actions will become available
        after the student submits the new document.
      </span>

    </div>

  </div>
)}
            {/* =========================================
    REJECTION REASON
========================================= */}

{!selectedStudent.documentReuploadToken && (
  <div className="student-rejection-section">

    <label>
      Rejection Reason
    </label>

    <textarea
      value={rejectReason}
      onChange={(e) =>
        setRejectReason(
          e.target.value
        )
      }
      placeholder="Enter rejection reason..."
      rows="3"
    />

    <small>
      A reason is required only for full
      student rejection.
    </small>

  </div>
)}


            {/* ACTION BUTTONS */}

{!selectedStudent.documentReuploadToken && (
  <div className="student-detail-actions">

    <button
      type="button"
      disabled={loading}
      className="student-approve-btn"
      onClick={() =>
        handleStudentApproval("Approved")
      }
    >
      {loading
        ? "Processing..."
        : "✓ Approve Participant"}
    </button>


    <button
      type="button"
      disabled={loading}
      className="student-reject-document-btn"
      onClick={() =>
        handleStudentApproval(
          "Reject Document"
        )
      }
    >
      {loading
        ? "Processing..."
        : "📄 Reject Document"}
    </button>


    <button
      type="button"
      disabled={loading}
      className="student-reject-btn"
      onClick={() =>
        handleStudentApproval("Rejected")
      }
    >
      {loading
        ? "Processing..."
        : "✕ Reject Participant"}
    </button>

  </div>
)}

          </div>

        )}

      </React.Fragment>

    ))}

  </div>

)}


      {/* =====================================================
    PENDING TEACHERS
===================================================== */}

<div className="admin-section-header">

  <div>
    <h2>Pending Teachers</h2>

    <p className="admin-section-subtitle">
      Review teacher registration details and certificates
    </p>
  </div>

  <div className="admin-section-count">
    {pendingTeachers.length} Pending
  </div>

</div>


{pendingTeachers.length === 0 ? (

  <div className="empty-state-card">

    <div className="empty-state-icon">
      👨‍🏫
    </div>

    <h3>
      No Pending Teachers
    </h3>

    <p>
      There are currently no teachers waiting for approval.
    </p>

  </div>

) : (

  <div className="pending-teacher-list">

    {pendingTeachers.map((teacher) => (

      <React.Fragment key={teacher._id}>

        {/* =========================================
            TEACHER CARD
        ========================================= */}

        <div
          className={`teacher-request-card ${
            selectedTeacher?._id === teacher._id
              ? "teacher-request-card-active"
              : ""
          }`}
          onClick={() => {

            if (
              selectedTeacher?._id ===
              teacher._id
            ) {

              setSelectedTeacher(null);

            } else {

              setSelectedTeacher(teacher);
              setSelectedStudent(null);
              setRejectReason("");

            }

          }}
        >

          {/* AVATAR */}

          <div className="teacher-request-avatar">

            {(
              `${teacher.firstName?.[0] || ""}${
                teacher.lastName?.[0] || ""
              }`
            ).toUpperCase()}

          </div>


          {/* INFORMATION */}

          <div className="teacher-request-info">

            <div className="teacher-request-name">

              {teacher.firstName}{" "}
              {teacher.lastName}

            </div>

            <div className="teacher-request-email">

              {teacher.email}

            </div>


            <div className="teacher-request-meta">

              <span>
                📚{" "}
                {teacher.preferredSubject ||
                  "N/A"}
              </span>

              <span>
                🎓{" "}
                {teacher.qualification ||
                  "N/A"}
              </span>

              <span>
                📱{" "}
                {teacher.mobile ||
                  "N/A"}
              </span>

            </div>

          </div>


          {/* STATUS */}

          <div className="teacher-request-status">

            {teacher.documentReuploadToken ? (

              <span className="teacher-waiting-badge">
                ● Waiting for Re-upload
              </span>

            ) : (

              <span className="pending-status-badge">
                ● Pending
              </span>

            )}

          </div>


          {/* ARROW */}

          <div className="teacher-request-arrow">

            {selectedTeacher?._id ===
            teacher._id
              ? "▲"
              : "›"}

          </div>

        </div>


        {/* =========================================
            TEACHER DETAILS
        ========================================= */}

        {selectedTeacher?._id === teacher._id && (

          <div className="teacher-detail-panel">

            {/* HEADER */}

            <div className="teacher-detail-header">

              <div className="teacher-detail-title">

                <div className="teacher-detail-avatar">

                  {(
                    `${selectedTeacher.firstName?.[0] || ""}${
                      selectedTeacher.lastName?.[0] || ""
                    }`
                  ).toUpperCase()}

                </div>


                <div>

                  <h3>
                    {selectedTeacher.firstName}{" "}
                    {selectedTeacher.lastName}
                  </h3>

                  <p>
                    {selectedTeacher.email}
                  </p>

                </div>

              </div>


              <button
                type="button"
                className="teacher-detail-close"
                onClick={() =>
                  setSelectedTeacher(null)
                }
              >
                ✕
              </button>

            </div>


            {/* STATUS */}

            <div className="teacher-detail-status-bar">

              <div>

                <span className="detail-status-label">
                  Registration Status
                </span>

                <strong>

                  {selectedTeacher.documentReuploadToken
                    ? "Waiting for Re-upload"
                    : "Pending"}

                </strong>

              </div>


              <div>

                <span className="detail-status-label">
                  Subject
                </span>

                <strong>
                  {selectedTeacher.preferredSubject ||
                    "N/A"}
                </strong>

              </div>

            </div>


            {/* DETAILS GRID */}

            <div className="teacher-details-grid">

              <div className="teacher-detail-item">

                <span>
                  👤 First Name
                </span>

                <strong>
                  {selectedTeacher.firstName ||
                    "N/A"}
                </strong>

              </div>


              <div className="teacher-detail-item">

                <span>
                  👤 Last Name
                </span>

                <strong>
                  {selectedTeacher.lastName ||
                    "N/A"}
                </strong>

              </div>


              <div className="teacher-detail-item">

                <span>
                  ✉ Email
                </span>

                <strong>
                  {selectedTeacher.email ||
                    "N/A"}
                </strong>

              </div>


              <div className="teacher-detail-item">

                <span>
                  📱 Mobile
                </span>

                <strong>
                  {selectedTeacher.mobile ||
                    "N/A"}
                </strong>

              </div>


              <div className="teacher-detail-item">

                <span>
                  🌍 Timezone
                </span>

                <strong>
                  {selectedTeacher.timezone ||
                    "N/A"}
                </strong>

              </div>


              <div className="teacher-detail-item">

                <span>
                  🎓 Qualification
                </span>

                <strong>
                  {selectedTeacher.qualification ||
                    "N/A"}
                </strong>

              </div>


              <div className="teacher-detail-item">

                <span>
                  📚 Preferred Subject
                </span>

                <strong>
                  {selectedTeacher.preferredSubject ||
                    "N/A"}
                </strong>

              </div>

            </div>


            {/* =========================================
                DEGREE CERTIFICATE
            ========================================= */}

            <div className="teacher-document-section">

              <div className="teacher-document-header">

                <div>

                  <h4>
                    🎓 Degree Certificate
                  </h4>

                  <p>
                    Review the uploaded certificate
                    before approving the teacher.
                  </p>

                </div>

              </div>


              {selectedTeacher.degreeCertificate ? (

                <div className="teacher-document-preview">

                  {selectedTeacher.degreeCertificate.startsWith(
                    "data:application/pdf"
                  ) ? (

                    <iframe
                      src={
                        selectedTeacher.degreeCertificate
                      }
                      title="Teacher Degree Certificate"
                      className="teacher-certificate-frame"
                    />

                  ) : (

                    <img
                      src={
                        selectedTeacher.degreeCertificate
                      }
                      alt="Teacher Degree Certificate"
                      className="teacher-certificate-image"
                    />

                  )}

                </div>

              ) : (

                <div className="teacher-no-document">

                  <span>
                    📄
                  </span>

                  <strong>
                    No certificate uploaded
                  </strong>

                  <p>
                    The teacher has not uploaded
                    a degree certificate.
                  </p>

                </div>

              )}


              {/* VIEW + DOWNLOAD */}

              {selectedTeacher.degreeCertificate && (

                <div className="teacher-document-actions">

                  <button
                    type="button"
                    className="teacher-view-document-btn"
                    onClick={() => {

                      const win =
                        window.open(
                          "",
                          "_blank"
                        );

                      if (!win) {

                        alert(
                          "Please allow pop-ups to view the certificate."
                        );

                        return;

                      }


                      const certificate =
                        selectedTeacher.degreeCertificate;


                      win.document.write(`
                        <html>

                          <head>

                            <title>
                              Teacher Degree Certificate
                            </title>

                            <style>

                              body {
                                margin: 0;
                                background: #111827;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                min-height: 100vh;
                              }

                              img {
                                max-width: 95vw;
                                max-height: 95vh;
                                object-fit: contain;
                              }

                              iframe {
                                width: 95vw;
                                height: 95vh;
                                border: none;
                              }

                            </style>

                          </head>

                          <body>

                            ${
                              certificate.startsWith(
                                "data:application/pdf"
                              )

                                ? `
                                  <iframe
                                    src="${certificate}"
                                  ></iframe>
                                `

                                : `
                                  <img
                                    src="${certificate}"
                                    alt="Certificate"
                                  />
                                `
                            }

                          </body>

                        </html>
                      `);

                      win.document.close();

                    }}
                  >
                    👁 View Certificate
                  </button>


                  <a
                    href={
                      selectedTeacher.degreeCertificate
                    }
                    download="teacher-degree-certificate"
                    className="teacher-download-document-btn"
                  >
                    ↓ Download
                  </a>

                </div>

              )}

            </div>


            {/* =========================================
                WAITING FOR RE-UPLOAD
            ========================================= */}

            {selectedTeacher.documentReuploadToken ? (

              <div className="teacher-reupload-waiting-card">

                <div className="teacher-reupload-waiting-icon">
                  📄
                </div>


                <div className="teacher-reupload-waiting-content">

                  <h4>
                    Waiting for Document Re-upload
                  </h4>

                  <p>
                    The teacher has been asked to
                    upload a new certificate.
                  </p>

                  <span>
                    Approval actions will become
                    available after the teacher
                    submits the new document.
                  </span>

                </div>

              </div>

            ) : (

              <>
                {/* =========================================
                    REJECTION REASON
                ========================================= */}

                <div className="teacher-rejection-section">

                  <label>
                    Rejection Reason
                  </label>

                  <textarea
                    placeholder="Enter rejection reason..."
                    value={rejectReason}
                    onChange={(e) =>
                      setRejectReason(
                        e.target.value
                      )
                    }
                    rows="3"
                  />

                  <small>
                    A reason is required only
                    for full teacher rejection.
                  </small>

                </div>


                {/* =========================================
    ACTION BUTTONS
========================================= */}

<div className="teacher-detail-actions">

  {!selectedTeacher.isApproved && (
    <>
      <button
        type="button"
        disabled={loading}
        className="teacher-approve-btn"
        onClick={() =>
          handleTeacherApproval(
            "Approved"
          )
        }
      >
        {loading
          ? "Processing..."
          : "✓ Approve Faculty"}
      </button>


      <button
        type="button"
        disabled={loading}
        className="teacher-reject-document-btn"
        onClick={() =>
          handleTeacherApproval(
            "Reject Document"
          )
        }
      >
        {loading
          ? "Processing..."
          : "📄 Reject Document"}
      </button>


      <button
        type="button"
        disabled={loading}
        className="teacher-reject-btn"
        onClick={() =>
          handleTeacherApproval(
            "Rejected"
          )
        }
      >
        {loading
          ? "Processing..."
          : "✕ Reject Faculty"}
      </button>
    </>
  )}


  {selectedTeacher.isApproved &&
    selectedTeacher.isActive && (
      <button
        type="button"
        disabled={loading}
        className="teacher-deactivate-btn"
        onClick={() =>
          handleTeacherStatus(
            selectedTeacher._id,
            "deactivate"
          )
        }
      >
        {loading
          ? "Processing..."
          : "⏸ Deactivate Faculty"}
      </button>
  )}


  {selectedTeacher.isApproved &&
    !selectedTeacher.isActive && (
      <button
        type="button"
        disabled={loading}
        className="teacher-activate-btn"
        onClick={() =>
          handleTeacherStatus(
            selectedTeacher._id,
            "activate"
          )
        }
      >
        {loading
          ? "Processing..."
          : "✓ Activate Faculty"}
      </button>
  )}

</div>

              </>

            )}

          </div>

        )}

      </React.Fragment>

    ))}

  </div>

)}

      {/* =====================================================
          CHECK STUDENT ATTENDANCE
      ===================================================== */}

      <h2>
        Check Student Attendance
      </h2>

      <p className="admin-section-subtitle">
        Search any student by name and class
        to view their attendance percentage
      </p>

      <StudentAttendanceSearch />


      {/* =====================================================
          QUICK CREATE USER
      ===================================================== */}

      <h2>
        Quick Create User
      </h2>

      <AdminQuickCreate />

    </div>
  );
};

export default AdminDashboard;