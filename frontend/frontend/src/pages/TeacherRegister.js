import React, { useEffect, useState } from "react";

import Navbar from "../components/Navbar";
import API_BASE_URL from "../config/api";

import {
  FaEye,
  FaEyeSlash,
  FaLock,
  FaCheckCircle,
  FaTimesCircle,
  FaTimes,
  FaChevronDown,
  FaUpload,
} from "react-icons/fa";

import "../styles/teacherRegister.css";


/* =========================================================
   TEACHABLE CLASSES
========================================================= */

const TEACHABLE_CLASSES = [
  "Class 5",
  "Class 6",
  "Class 7",
  "Class 8",
  "Class 9",
  "Class 10",
  "Class 11",
  "Class 12",
];


/* =========================================================
   TIMEZONE OPTIONS
========================================================= */

const TIMEZONE_OPTIONS = [
  {
    value: "Asia/Kolkata",
    label: "India Standard Time (IST)",
  },
  {
    value: "UTC",
    label: "Coordinated Universal Time (UTC)",
  },
  {
    value: "Asia/Dubai",
    label: "Dubai Time",
  },
  {
    value: "Europe/London",
    label: "London Time",
  },
  {
    value: "America/New_York",
    label: "Eastern Time",
  },
];


/* =========================================================
   QUALIFICATION OPTIONS
========================================================= */

const QUALIFICATION_OPTIONS = [
  "B.Ed",
  "M.Ed",
  "B.Sc",
  "M.Sc",
  "PhD",
  "Other",
];


/* =========================================================
   DOCUMENT RE-UPLOAD MODE
========================================================= */

const searchParams = new URLSearchParams(
  window.location.search
);

const reuploadToken =
  searchParams.get("reupload");

const isReuploadMode =
  Boolean(reuploadToken);


/* =========================================================
   TEACHER REGISTER COMPONENT
========================================================= */

const TeacherRegister = () => {

  /* =======================================================
     FORM STATE
  ======================================================= */

  const [form, setForm] = useState({
    salutation: "Mr.",
    firstName: "",
    lastName: "",
    mobile: "",
    timezone: "",
    qualification: "",
    email: "",
    password: "",
    confirmPassword: "",
    preferredSubject: "",
    classes: [],
  });


  /* =======================================================
     FILE STATE
  ======================================================= */

  const [degreeFile, setDegreeFile] =
    useState(null);


  /* =======================================================
     CLASS DROPDOWN
  ======================================================= */

  const [classesOpen, setClassesOpen] =
    useState(false);


  /* =======================================================
     PASSWORD RULES
  ======================================================= */

  const [showPasswordRules, setShowPasswordRules] =
    useState(false);


  /* =======================================================
     PASSWORD VISIBILITY
  ======================================================= */

  const [showPassword, setShowPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);


  /* =======================================================
     LOADING
  ======================================================= */

  const [loading, setLoading] =
    useState(false);

  const [loadingDetails, setLoadingDetails] =
    useState(isReuploadMode);


  /* =======================================================
     POPUP
  ======================================================= */

  const [popup, setPopup] = useState({
    show: false,
    type: "",
    title: "",
    message: "",
  });


  /* =========================================================
     POPUP FUNCTIONS
  ========================================================= */

  const showPopup = (
    type,
    title,
    message
  ) => {
    setPopup({
      show: true,
      type,
      title,
      message,
    });
  };


  const closePopup = () => {
    setPopup({
      show: false,
      type: "",
      title: "",
      message: "",
    });
  };


  /* =========================================================
     LOAD EXISTING DETAILS FOR RE-UPLOAD
  ========================================================= */

  useEffect(() => {

    if (!isReuploadMode) {
      setLoadingDetails(false);
      return;
    }

    const loadTeacherDetails = async () => {

      try {

        const response = await fetch(
          `${API_BASE_URL}/api/teacher/reupload-document/${reuploadToken}`
        );

        let data = {};

        try {
          data = await response.json();
        } catch (jsonError) {
          console.error(
            "Unable to read re-upload response:",
            jsonError
          );
        }

        if (!response.ok) {
          throw new Error(
            data.message ||
            "This re-upload link is invalid or expired."
          );
        }

        const teacher =
          data.teacher;

        setForm({
          salutation:
            teacher.salutation || "Mr.",

          firstName:
            teacher.firstName || "",

          lastName:
            teacher.lastName || "",

          mobile:
            teacher.mobile || "",

          timezone:
            teacher.timezone || "",

          qualification:
            teacher.qualification || "",

          email:
            teacher.email || "",

          password: "",

          confirmPassword: "",

          preferredSubject:
            teacher.preferredSubject || "",

          classes:
            teacher.classesAssigned || [],
        });

      } catch (error) {

        console.error(
          "Teacher re-upload details error:",
          error
        );

        showPopup(
          "error",
          "Re-upload Link Error",
          error.message ||
          "Unable to load your registration details."
        );

      } finally {

        setLoadingDetails(false);

      }
    };

    loadTeacherDetails();

  }, []);


  /* =========================================================
     FORM CHANGE
  ========================================================= */

  const handleChange = (event) => {

    const {
      name,
      value,
    } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

  };


  /* =========================================================
     CLASS SELECTION
  ========================================================= */

  const toggleClass = (className) => {

    if (isReuploadMode) {
      return;
    }

    setForm((previous) => {

      if (
        previous.classes.includes(
          className
        )
      ) {

        return {
          ...previous,

          classes:
            previous.classes.filter(
              (item) =>
                item !== className
            ),
        };

      }

      return {
        ...previous,

        classes: [
          ...previous.classes,
          className,
        ],
      };

    });

  };


  /* =========================================================
     FILE CHANGE
  ========================================================= */

  const handleFileChange = (event) => {

    if (
      event.target.files &&
      event.target.files[0]
    ) {

      setDegreeFile(
        event.target.files[0]
      );

    }

  };


  /* =========================================================
     PASSWORD CHECKS
  ========================================================= */

  const passwordChecks = {

    length:
      form.password.length >= 8,

    upper:
      /[A-Z]/.test(
        form.password
      ),

    lower:
      /[a-z]/.test(
        form.password
      ),

    number:
      /\d/.test(
        form.password
      ),

    special:
      /[@$!%*?&]/.test(
        form.password
      ),

  };


  /* =========================================================
     PASSWORD MATCH
  ========================================================= */

  const passwordsMatch =
    form.confirmPassword.length === 0
      ? null
      : form.password ===
        form.confirmPassword;


  /* =========================================================
     RESET FORM
  ========================================================= */

  const resetForm = () => {

    setForm({
      salutation: "Mr.",
      firstName: "",
      lastName: "",
      mobile: "",
      timezone: "",
      qualification: "",
      email: "",
      password: "",
      confirmPassword: "",
      preferredSubject: "",
      classes: [],
    });

    setDegreeFile(null);

    setClassesOpen(false);

    setShowPasswordRules(false);

    setShowPassword(false);

    setShowConfirmPassword(false);

    const fileInput =
      document.getElementById(
        "degreeCertificate"
      );

    if (fileInput) {
      fileInput.value = "";
    }

  };


  /* =========================================================
     SUBMIT
  ========================================================= */

  const handleSubmit = async (
    event
  ) => {

    event.preventDefault();


    /* =======================================================
       DOCUMENT RE-UPLOAD MODE
    ======================================================= */

    if (isReuploadMode) {

      if (!degreeFile) {

        showPopup(
          "error",
          "Certificate Required",
          "Please upload the corrected degree certificate."
        );

        return;
      }


      const formData =
        new FormData();

      formData.append(
        "degreeCertificate",
        degreeFile
      );


      try {

        setLoading(true);

        const response =
          await fetch(
            `${API_BASE_URL}/api/teacher/reupload-document/${reuploadToken}`,
            {
              method: "POST",
              body: formData,
            }
          );


        let data = {};

        try {

          data =
            await response.json();

        } catch (jsonError) {

          console.error(
            "Unable to read server response:",
            jsonError
          );

        }


        if (response.ok) {

          setDegreeFile(null);

          const fileInput =
            document.getElementById(
              "degreeCertificate"
            );

          if (fileInput) {
            fileInput.value = "";
          }


          showPopup(
            "success",
            "Document Submitted Successfully!",
            data.message ||
            "Your corrected document has been submitted. Please wait for admin approval."
          );


          window.scrollTo({
            top: 0,
            behavior: "smooth",
          });

          return;
        }


        showPopup(
          "error",
          "Re-upload Failed",
          data.message ||
          "Unable to upload the corrected document."
        );


      } catch (error) {

        console.error(
          "Teacher document re-upload error:",
          error
        );

        showPopup(
          "error",
          "Connection Error",
          "Unable to connect to the server. Please try again."
        );

      } finally {

        setLoading(false);

      }

      return;
    }


    /* =======================================================
       NORMAL REGISTRATION
    ======================================================= */

    if (
      !form.firstName.trim() ||
      !form.lastName.trim() ||
      !form.mobile.trim() ||
      !form.timezone ||
      !form.qualification ||
      !form.email.trim() ||
      !form.password ||
      !form.confirmPassword ||
      !form.preferredSubject.trim()
    ) {

      showPopup(
        "error",
        "Registration Error",
        "Please fill in all required fields."
      );

      return;
    }


    /* =======================================================
       MOBILE NUMBER
    ======================================================= */

    if (
      form.mobile.trim().length < 7 ||
      form.mobile.trim().length > 15
    ) {

      showPopup(
        "error",
        "Invalid Mobile Number",
        "Please enter a valid mobile number."
      );

      return;
    }


    /* =======================================================
       PASSWORD MATCH
    ======================================================= */

    if (
      form.password !==
      form.confirmPassword
    ) {

      showPopup(
        "error",
        "Password Mismatch",
        "Password and Confirm Password do not match."
      );

      return;
    }


    /* =======================================================
       CLASS REQUIRED
    ======================================================= */

    if (
      form.classes.length === 0
    ) {

      showPopup(
        "error",
        "Class Required",
        "Please select at least one class you can teach."
      );

      return;
    }


    /* =======================================================
       PASSWORD VALIDATION
    ======================================================= */

    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;


    if (
      !passwordRegex.test(
        form.password
      )
    ) {

      setShowPasswordRules(true);

      showPopup(
        "error",
        "Invalid Password",
        "Password must contain at least 8 characters, including uppercase, lowercase, number and special character."
      );

      return;
    }


    /* =======================================================
       DEGREE CERTIFICATE
    ======================================================= */

    if (!degreeFile) {

      showPopup(
        "error",
        "Certificate Required",
        "Please upload your degree certificate."
      );

      return;
    }


    /* =======================================================
       CREATE FORM DATA
    ======================================================= */

    const formData =
      new FormData();


    formData.append(
      "salutation",
      form.salutation
    );

    formData.append(
      "firstName",
      form.firstName.trim()
    );

    formData.append(
      "lastName",
      form.lastName.trim()
    );

    formData.append(
      "mobile",
      form.mobile.trim()
    );

    formData.append(
      "timezone",
      form.timezone
    );

    formData.append(
      "qualification",
      form.qualification
    );

    formData.append(
      "email",
      form.email
        .trim()
        .toLowerCase()
    );

    formData.append(
      "password",
      form.password
    );

    formData.append(
      "confirmPassword",
      form.confirmPassword
    );

    formData.append(
      "preferredSubject",
      form.preferredSubject.trim()
    );

    formData.append(
      "classes",
      form.classes.join(",")
    );

    formData.append(
      "degreeCertificate",
      degreeFile
    );


    /* =======================================================
       NORMAL REGISTRATION API
    ======================================================= */

    try {

      setLoading(true);

      const response =
        await fetch(
          `${API_BASE_URL}/api/teacher/register`,
          {
            method: "POST",
            body: formData,
          }
        );


      let data = {};

      try {

        data =
          await response.json();

      } catch (jsonError) {

        console.error(
          "Unable to read server response:",
          jsonError
        );

      }


      /* =====================================================
         SUCCESS
      ===================================================== */

      if (response.ok) {

        resetForm();

        showPopup(
          "success",
          "Registration Successful!",
          data.message ||
          "Your teacher registration was successful. Please wait for admin approval before logging in."
        );

        window.scrollTo({
          top: 0,
          behavior: "smooth",
        });

        return;
      }


      /* =====================================================
         BACKEND ERROR
      ===================================================== */

      if (data.errors) {

        const errorMessages =
          Object.values(
            data.errors
          ).join("\n");

        showPopup(
          "error",
          "Registration Failed",
          errorMessages
        );

      } else {

        showPopup(
          "error",
          "Registration Failed",
          data.message ||
          "Registration failed. Please try again."
        );

      }


    } catch (error) {

      console.error(
        "Teacher registration error:",
        error
      );

      showPopup(
        "error",
        "Connection Error",
        "Unable to connect to the server. Please try again."
      );

    } finally {

      setLoading(false);

    }

  };


  /* =========================================================
     RENDER
  ========================================================= */

  return (

    <div className="teacher-register-page">

      <Navbar />


      {/* =====================================================
          POPUP
      ===================================================== */}

      {popup.show && (

        <div
          className="teacher-popup-overlay"
          onClick={closePopup}
        >

          <div
            className={`teacher-popup-card ${popup.type}`}
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <button
              type="button"
              className="teacher-popup-close"
              onClick={closePopup}
            >
              <FaTimes />
            </button>


            <div
              className={`teacher-popup-icon ${popup.type}`}
            >

              {popup.type === "success"
                ? <FaCheckCircle />
                : <FaTimesCircle />
              }

            </div>


            <h2>
              {popup.title}
            </h2>


            <p>
              {popup.message}
            </p>


            <button
              type="button"
              className={`teacher-popup-button ${popup.type}`}
              onClick={closePopup}
            >

              {popup.type === "success"
                ? "Continue"
                : "Try Again"
              }

            </button>

          </div>

        </div>

      )}


      {/* =====================================================
          MAIN
      ===================================================== */}

      <main className="teacher-register-main">

        <div className="teacher-register-card">


          {/* =================================================
              HEADER
          ================================================= */}

          <div className="teacher-register-heading">

            <h1>

              {isReuploadMode
                ? "Document Re-upload"
                : "Faculty Registration"
              }

            </h1>

            <p>

              {isReuploadMode
                ? "Review your registration details and upload a clear, readable document"
                : "Fill in your details to create your teacher account"
              }

            </p>

          </div>


          {/* =================================================
              LOADING EXISTING DETAILS
          ================================================= */}

          {isReuploadMode &&
            loadingDetails && (

              <p
                style={{
                  textAlign: "center",
                  margin: "20px 0",
                }}
              >
                Loading your registration details...
              </p>

          )}


          {/* =================================================
              FORM
          ================================================= */}

          <form
            className="teacher-register-form"
            onSubmit={handleSubmit}
            encType="multipart/form-data"
            noValidate
          >


            {/* ===============================================
                TITLE + FIRST + LAST
            =============================================== */}

            <div className="teacher-name-row">


              {/* TITLE */}

              <div className="teacher-form-group">

                <label>
                  Title
                </label>

                <select
                  name="salutation"
                  value={form.salutation}
                  onChange={handleChange}
                  disabled={isReuploadMode}
                >

                  <option value="Mr.">
                    Mr.
                  </option>

                  <option value="Ms.">
                    Ms.
                  </option>

                  <option value="Mrs.">
                    Mrs.
                  </option>

                  <option value="Dr.">
                    Dr.
                  </option>

                </select>

              </div>


              {/* FIRST NAME */}

              <div className="teacher-form-group">

                <label>
                  First Name
                </label>

                <input
                  type="text"
                  name="firstName"
                  value={form.firstName}
                  onChange={handleChange}
                  placeholder="Enter first name"
                  readOnly={isReuploadMode}
                />

              </div>


              {/* LAST NAME */}

              <div className="teacher-form-group">

                <label>
                  Last Name
                </label>

                <input
                  type="text"
                  name="lastName"
                  value={form.lastName}
                  onChange={handleChange}
                  placeholder="Enter last name"
                  readOnly={isReuploadMode}
                />

              </div>

            </div>


            {/* ===============================================
                MOBILE
            =============================================== */}

            <div className="teacher-form-group">

              <label>
                Mobile Number
              </label>

              <input
                type="tel"
                name="mobile"
                value={form.mobile}
                onChange={handleChange}
                placeholder="Enter mobile number"
                readOnly={isReuploadMode}
              />

            </div>


            {/* ===============================================
                TIMEZONE + QUALIFICATION
            =============================================== */}

            <div className="timezone-qualification-row">


              {/* TIMEZONE */}

              <div className="teacher-form-group">

                <label>
                  Timezone
                </label>

                <select
                  name="timezone"
                  value={form.timezone}
                  onChange={handleChange}
                  disabled={isReuploadMode}
                >

                  <option value="">
                    Select timezone
                  </option>

                  {TIMEZONE_OPTIONS.map(
                    (timezone) => (

                      <option
                        key={timezone.value}
                        value={timezone.value}
                      >
                        {timezone.label}
                      </option>

                    )
                  )}

                </select>

              </div>


              {/* QUALIFICATION */}

              <div className="teacher-form-group">

                <label>
                  Qualification
                </label>

                <select
                  name="qualification"
                  value={form.qualification}
                  onChange={handleChange}
                  disabled={isReuploadMode}
                >

                  <option value="">
                    Select qualification
                  </option>

                  {QUALIFICATION_OPTIONS.map(
                    (qualification) => (

                      <option
                        key={qualification}
                        value={qualification}
                      >
                        {qualification}
                      </option>

                    )
                  )}

                </select>

              </div>

            </div>


            {/* ===============================================
                EMAIL
            =============================================== */}

            <div className="teacher-form-group">

              <label>
                Email ID
              </label>

              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="Enter email address"
                readOnly={isReuploadMode}
              />

            </div>


            {/* ===============================================
                PASSWORD
                HIDDEN DURING DOCUMENT RE-UPLOAD
            =============================================== */}

            {!isReuploadMode && (

              <>

                {/* PASSWORD */}

                <div className="teacher-form-group">

                  <label>
                    Password
                  </label>


                  <div className="teacher-password-wrapper">

                    <FaLock
                      className="teacher-password-icon"
                    />


                    <input
                      type={
                        showPassword
                          ? "text"
                          : "password"
                      }
                      name="password"
                      value={form.password}
                      onChange={handleChange}
                      placeholder="Enter password"

                      onFocus={() =>
                        setShowPasswordRules(true)
                      }

                      onBlur={() =>
                        setShowPasswordRules(false)
                      }

                      autoComplete="new-password"
                    />


                    <button
                      type="button"
                      className="teacher-eye-button"

                      onMouseDown={(event) =>
                        event.preventDefault()
                      }

                      onClick={() =>
                        setShowPassword(
                          (previous) =>
                            !previous
                        )
                      }

                      aria-label={
                        showPassword
                          ? "Hide password"
                          : "Show password"
                      }
                    >

                      {showPassword
                        ? <FaEyeSlash />
                        : <FaEye />
                      }

                    </button>

                  </div>


                  {/* PASSWORD RULES */}

                  {showPasswordRules && (

                    <div className="teacher-password-rules">

                      <div
                        className={
                          passwordChecks.length
                            ? "valid"
                            : ""
                        }
                      >
                        {passwordChecks.length ? "✓" : "•"} At least 8 characters
                      </div>


                      <div
                        className={
                          passwordChecks.upper
                            ? "valid"
                            : ""
                        }
                      >
                        {passwordChecks.length ? "✓" : "•"} One uppercase letter
                      </div>


                      <div
                        className={
                          passwordChecks.lower
                            ? "valid"
                            : ""
                        }
                      >
                        {passwordChecks.length ? "✓" : "•"} One lowercase letter
                      </div>


                      <div
                        className={
                          passwordChecks.number
                            ? "valid"
                            : ""
                        }
                      >
                        {passwordChecks.length ? "✓" : "•"} One number
                      </div>


                      <div
                        className={
                          passwordChecks.special
                            ? "valid"
                            : ""
                        }
                      >
                        {passwordChecks.length ? "✓" : "•"} One special character
                      </div>

                    </div>

                  )}

                </div>


                {/* CONFIRM PASSWORD */}

                <div className="teacher-form-group">

                  <label>
                    Confirm Password
                  </label>


                  <div className="teacher-password-wrapper">

                    <FaLock
                      className="teacher-password-icon"
                    />


                    <input
                      type={
                        showConfirmPassword
                          ? "text"
                          : "password"
                      }
                      name="confirmPassword"
                      value={form.confirmPassword}
                      onChange={handleChange}
                      placeholder="Confirm password"
                      autoComplete="new-password"
                    />


                    <button
                      type="button"
                      className="teacher-eye-button"

                      onMouseDown={(event) =>
                        event.preventDefault()
                      }

                      onClick={() =>
                        setShowConfirmPassword(
                          (previous) =>
                            !previous
                        )
                      }

                      aria-label={
                        showConfirmPassword
                          ? "Hide confirm password"
                          : "Show confirm password"
                      }
                    >

                      {showConfirmPassword
                        ? <FaEyeSlash />
                        : <FaEye />
                      }

                    </button>

                  </div>


                  {passwordsMatch !== null && (

                    <small
                      className={
                        passwordsMatch
                          ? "teacher-password-match valid"
                          : "teacher-password-match invalid"
                      }
                    >

                      {passwordsMatch
                        ? "✓ Passwords match"
                        : "✕ Passwords do not match"
                      }

                    </small>

                  )}

                </div>

              </>

            )}


            {/* ===============================================
                PREFERRED SUBJECT
            =============================================== */}

            <div className="teacher-form-group">

              <label>
                Preferred Subject
              </label>

              <input
                type="text"
                name="preferredSubject"
                value={form.preferredSubject}
                onChange={handleChange}
                placeholder="Example: Mathematics"
                readOnly={isReuploadMode}
              />

            </div>


            {/* ===============================================
                CLASSES
            =============================================== */}

            <div className="teacher-form-group">

              <label>
                Classes You Can Teach
              </label>


              <div className="teacher-classes-dropdown">

                <button
                  type="button"
                  className="teacher-classes-button"

                  onClick={() => {

                    if (!isReuploadMode) {
                      setClassesOpen(
                        !classesOpen
                      );
                    }

                  }}

                  disabled={isReuploadMode}
                >

                  <span>

                    {form.classes.length === 0
                      ? "Select classes"
                      : form.classes.join(", ")
                    }

                  </span>


                  <FaChevronDown
                    className={
                      classesOpen
                        ? "rotate"
                        : ""
                    }
                  />

                </button>


                {classesOpen && !isReuploadMode && (

                  <div className="teacher-classes-menu">

                    {TEACHABLE_CLASSES.map(
                      (className) => (

                        <label
                          key={className}
                          className="teacher-class-option"
                        >

                          <input
                            type="checkbox"
                            checked={
                              form.classes.includes(
                                className
                              )
                            }

                            onChange={() =>
                              toggleClass(
                                className
                              )
                            }
                          />


                          <span>
                            {className}
                          </span>

                        </label>

                      )
                    )}

                  </div>

                )}

              </div>

            </div>


            {/* ===============================================
                DEGREE CERTIFICATE
            =============================================== */}

            <div className="teacher-form-group">

              <label>

                {isReuploadMode
                  ? "Upload Corrected Degree Certificate"
                  : "Degree Certificate"
                }

              </label>


              <label
                className="teacher-file-upload"
                htmlFor="degreeCertificate"
              >

                <FaUpload />


                <span className="teacher-file-button">

                  {isReuploadMode
                    ? "Upload Document"
                    : "Choose File"
                  }

                </span>


                <span className="teacher-file-name">

                  {degreeFile
                    ? degreeFile.name
                    : "No file selected"
                  }

                </span>

              </label>


              <input
                id="degreeCertificate"
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                hidden
              />

            </div>


            {/* ===============================================
                SUBMIT BUTTON
            =============================================== */}

            <button
              type="submit"
              className="teacher-register-button"
              disabled={
                loading ||
                loadingDetails
              }
            >

              {loading

                ? isReuploadMode
                  ? "Uploading..."
                  : "Registering..."

                : isReuploadMode
                  ? "Submit Corrected Document"
                  : "Register as Faculty"

              }

            </button>


            {/* ===============================================
                DIVIDER
            =============================================== */}

            <div className="register-divider"></div>


            {/* ===============================================
                LOGIN LINK
            =============================================== */}

            <p className="already-user">

              Already a User?{" "}

              <a href="/login">
                Continue Here
              </a>

            </p>


          </form>

        </div>

      </main>

    </div>

  );

};


export default TeacherRegister;