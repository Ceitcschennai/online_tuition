import React, { useState, useEffect } from "react";
import axios from "axios";

import Navbar from "../components/Navbar";
import API_BASE_URL from "../config/api";

import {
  FaUserPlus,
  FaEnvelope,
  FaLock,
  FaEye,
  FaEyeSlash,
  FaArrowRight,
  FaPhoneAlt,
  FaIdCard,
  FaUpload,
  FaCheck,
  FaTimes,
} from "react-icons/fa";

import "../styles/register.css";


/* =========================================================
   DROPDOWN OPTIONS
========================================================= */

const TITLE_OPTIONS = [
  "Mr.",
  "Mrs.",
  "Ms.",
  "Dr.",
];

const SYLLABUS_OPTIONS = [
  "Matric",
  "CBSE",
  "ICSE",
  "State Board",
];

const CLASS_OPTIONS = [
  "Class 5",
  "Class 6",
  "Class 7",
  "Class 8",
  "Class 9",
  "Class 10",
  "Class 11",
  "Class 12",
  "Others",
];

const TIMEZONE_OPTIONS = [
  "IST (GMT +5:30)",
  "GMT (GMT +0:00)",
  "EST (GMT -5:00)",
  "PST (GMT -8:00)",
  "CET (GMT +1:00)",
  "GST (GMT +4:00)",
];


/* =========================================================
   STUDENT REGISTER COMPONENT
========================================================= */

const StudentRegister = () => {

  /* =======================================================
     FORM STATE
  ======================================================= */

  const [formData, setFormData] = useState({
    title: "Mr.",
    firstName: "",
    lastName: "",
    mobile: "",
    syllabus: "",
    studentClass: "",
    otherClass: "",
    timezone: "",
    email: "",
    password: "",
    confirmPassword: "",
    emisNumber: "",
  });


  /* =======================================================
     FILE STATE
  ======================================================= */

  const [studentIdFile, setStudentIdFile] =
    useState(null);


  /* =======================================================
     PASSWORD VISIBILITY
  ======================================================= */

  const [showPassword, setShowPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);


  /* =======================================================
     PASSWORD RULES
  ======================================================= */

  const [showPasswordRules, setShowPasswordRules] =
    useState(false);


  /* =======================================================
     LOADING
  ======================================================= */

  const [loading, setLoading] =
    useState(false);


  /* =======================================================
     POPUP
  ======================================================= */

  const [popup, setPopup] = useState({
    show: false,
    type: "",
    title: "",
    message: "",
  });


  /* =======================================================
     BODY CLASS
  ======================================================= */

  useEffect(() => {

    document.body.classList.add(
      "register-active"
    );

    return () => {

      document.body.classList.remove(
        "register-active"
      );

    };

  }, []);


  /* =======================================================
     SHOW POPUP
  ======================================================= */

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


  /* =======================================================
     CLOSE POPUP
  ======================================================= */

  const closePopup = () => {

    setPopup({
      show: false,
      type: "",
      title: "",
      message: "",
    });

  };


  /* =======================================================
     HANDLE INPUT CHANGE
  ======================================================= */

  const handleChange = (event) => {

    const {
      name,
      value,
    } = event.target;


    setFormData((previous) => {

      const updatedData = {
        ...previous,
        [name]: value,
      };


      /*
         If user selects Others,
         show another input.

         If user changes to another class,
         clear the custom class.
      */

      if (
        name === "studentClass" &&
        value !== "Others"
      ) {

        updatedData.otherClass = "";

      }


      return updatedData;

    });

  };


  /* =======================================================
     HANDLE FILE CHANGE
  ======================================================= */

  const handleFileChange = (event) => {

    const selectedFile =
      event.target.files?.[0] || null;

    setStudentIdFile(
      selectedFile
    );

  };


  /* =======================================================
     PASSWORD VALIDATION
  ======================================================= */

  const passwordChecks = {

    length:
      formData.password.length >= 8,

    uppercase:
      /[A-Z]/.test(
        formData.password
      ),

    lowercase:
      /[a-z]/.test(
        formData.password
      ),

    number:
      /\d/.test(
        formData.password
      ),

    special:
      /[@$!%*?&]/.test(
        formData.password
      ),

  };


  /* =======================================================
     VALIDATE FORM
  ======================================================= */

  const validateForm = () => {

    if (
      !formData.firstName.trim()
    ) {

      return "Please enter your first name.";

    }


    if (
      !formData.lastName.trim()
    ) {

      return "Please enter your last name.";

    }


    if (
      !formData.mobile.trim()
    ) {

      return "Please enter your mobile number.";

    }


    if (
      !/^\d{10}$/.test(
        formData.mobile.trim()
      )
    ) {

      return "Please enter a valid 10-digit mobile number.";

    }


    if (
      !formData.syllabus
    ) {

      return "Please select a syllabus.";

    }


    if (
      !formData.studentClass
    ) {

      return "Please select a class.";

    }


    if (
      formData.studentClass === "Others" &&
      !formData.otherClass.trim()
    ) {

      return "Please enter your class.";

    }


    if (
      !formData.timezone
    ) {

      return "Please select a timezone.";

    }


    if (
      !formData.email.trim()
    ) {

      return "Please enter your email address.";

    }


    const emailPattern =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


    if (
      !emailPattern.test(
        formData.email.trim()
      )
    ) {

      return "Please enter a valid email address.";

    }


    if (
      !formData.password
    ) {

      return "Please enter a password.";

    }


    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;


    if (
      !passwordRegex.test(
        formData.password
      )
    ) {

      setShowPasswordRules(true);

      return (
        "Password must contain at least 8 characters, " +
        "one uppercase letter, one lowercase letter, " +
        "one number and one special character."
      );

    }


    if (
      formData.password !==
      formData.confirmPassword
    ) {

      return "Passwords do not match.";

    }


    if (
      !studentIdFile
    ) {

      return "Please upload your student ID.";

    }


    return "";

  };


  /* =======================================================
     HANDLE SUBMIT
  ======================================================= */

  const handleSubmit = async (event) => {

    event.preventDefault();


    const validationError =
      validateForm();


    if (validationError) {

      showPopup(
        "error",
        "Registration Error",
        validationError
      );

      return;

    }


    try {

      setLoading(true);


      const submitData =
        new FormData();


      /* ===================================================
         BASIC DETAILS
      =================================================== */

      submitData.append(
        "title",
        formData.title
      );


      /*
         Backend compatibility
      */

      submitData.append(
        "salutation",
        formData.title
      );


      submitData.append(
        "firstName",
        formData.firstName.trim()
      );


      submitData.append(
        "lastName",
        formData.lastName.trim()
      );


      submitData.append(
        "mobile",
        formData.mobile.trim()
      );


      submitData.append(
        "syllabus",
        formData.syllabus
      );


      /* ===================================================
         CLASS
      =================================================== */

      const finalClass =
        formData.studentClass === "Others"
          ? formData.otherClass.trim()
          : formData.studentClass;


      submitData.append(
        "studentClass",
        finalClass
      );


      /*
         Some existing backend versions
         may expect "class".
      */

      submitData.append(
        "class",
        finalClass
      );


      /* ===================================================
         TIMEZONE
      =================================================== */

      submitData.append(
        "timezone",
        formData.timezone
      );


      /* ===================================================
         EMAIL
      =================================================== */

      submitData.append(
        "email",
        formData.email
          .trim()
          .toLowerCase()
      );


      /* ===================================================
         PASSWORD
      =================================================== */

      submitData.append(
        "password",
        formData.password
      );


      submitData.append(
        "confirmPassword",
        formData.confirmPassword
      );


      /* ===================================================
         EMIS
      =================================================== */

      submitData.append(
        "emisNumber",
        formData.emisNumber.trim()
      );


      /* ===================================================
         STUDENT ID FILE
      =================================================== */

      submitData.append(
        "proof",
        studentIdFile
      );


      /* ===================================================
         API CALL
      =================================================== */

      const response =
        await axios.post(
          `${API_BASE_URL}/api/student/register`,
          submitData,
          {
            headers: {
              "Content-Type":
                "multipart/form-data",
            },
          }
        );


      /* ===================================================
         SUCCESS
      =================================================== */

      showPopup(
        "success",
        "Registration Successful",
        response.data?.message ||
          "Participant registration completed successfully. Please wait for admin approval."
      );


      /* ===================================================
         RESET FORM
      =================================================== */

      setFormData({
        title: "Mr.",
        firstName: "",
        lastName: "",
        mobile: "",
        syllabus: "",
        studentClass: "",
        otherClass: "",
        timezone: "",
        email: "",
        password: "",
        confirmPassword: "",
        emisNumber: "",
      });


      setStudentIdFile(null);


      setShowPasswordRules(
        false
      );


      const fileInput =
        document.getElementById(
          "studentIdFile"
        );


      if (fileInput) {

        fileInput.value = "";

      }


    } catch (error) {

      console.error(
        "Student registration error:",
        error
      );


      let errorMessage =
        "Registration failed. Please try again.";


      if (
        error.response?.data?.message
      ) {

        errorMessage =
          error.response.data.message;

      }

      else if (
        error.response?.data?.error
      ) {

        errorMessage =
          error.response.data.error;

      }

      else if (
        error.response?.data?.errors
      ) {

        const errors =
          error.response.data.errors;


        if (
          typeof errors === "object"
        ) {

          errorMessage =
            Object.values(errors)
              .join(", ");

        }

      }

      else if (
        error.message
      ) {

        errorMessage =
          error.message;

      }


      showPopup(
        "error",
        "Registration Failed",
        errorMessage
      );


    } finally {

      setLoading(false);

    }

  };


  /* =======================================================
     RENDER
  ======================================================= */

  return (

    <div className="register-page">


      {/* ===================================================
          COMMON NAVBAR

          IMPORTANT:
          App.js does not render the global Navbar on
          registration pages.

          Therefore StudentRegister MUST render Navbar here,
          just like TeacherRegister.
      =================================================== */}

      <Navbar />


      {/* ===================================================
          MAIN CONTENT
      =================================================== */}

      <main className="register-main">

        <div className="register-card">


          {/* ===============================================
              HEADER
          =============================================== */}

          <div className="register-card-header">

            <div className="register-title-icon">
              <FaUserPlus />
            </div>


            <h1>
              Participant Registration
            </h1>


            <p>
              Create your participant account to start learning.
            </p>

          </div>


          {/* ===============================================
              FORM
          =============================================== */}

          <form
            className="register-form"
            onSubmit={handleSubmit}
          >


            {/* =============================================
                TITLE + FIRST NAME + LAST NAME
            ============================================= */}

            <div className="form-row three-columns">


              {/* TITLE */}

              <div className="input-group">

                <label>
                  Title
                </label>


                <select
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                >

                  {TITLE_OPTIONS.map(
                    (title) => (

                      <option
                        key={title}
                        value={title}
                      >
                        {title}
                      </option>

                    )
                  )}

                </select>

              </div>


              {/* FIRST NAME */}

              <div className="input-group">

                <label>
                  First Name
                </label>


                <input
                  type="text"
                  name="firstName"
                  placeholder="Enter first name"
                  value={formData.firstName}
                  onChange={handleChange}
                />

              </div>


              {/* LAST NAME */}

              <div className="input-group">

                <label>
                  Last Name
                </label>


                <input
                  type="text"
                  name="lastName"
                  placeholder="Enter last name"
                  value={formData.lastName}
                  onChange={handleChange}
                />

              </div>

            </div>


            {/* =============================================
                MOBILE NUMBER
            ============================================= */}

            <div className="input-group">

              <label>
                Mobile Number
              </label>


              <div className="input-wrapper">

                <FaPhoneAlt
                  className="input-icon"
                />


                <input
                  type="tel"
                  name="mobile"
                  placeholder="Enter mobile number"
                  value={formData.mobile}
                  onChange={handleChange}
                  maxLength="10"
                />

              </div>

            </div>


            {/* =============================================
                SYLLABUS + CLASS
            ============================================= */}

            <div className="form-row">


              {/* SYLLABUS */}

              <div className="input-group">

                <label>
                  Syllabus
                </label>


                <select
                  name="syllabus"
                  value={formData.syllabus}
                  onChange={handleChange}
                >

                  <option value="">
                    Select syllabus
                  </option>


                  {SYLLABUS_OPTIONS.map(
                    (syllabus) => (

                      <option
                        key={syllabus}
                        value={syllabus}
                      >
                        {syllabus}
                      </option>

                    )
                  )}

                </select>

              </div>


              {/* CLASS */}

              <div className="input-group">

                <label>
                  Class
                </label>


                <select
                  name="studentClass"
                  value={formData.studentClass}
                  onChange={handleChange}
                >

                  <option value="">
                    Select class
                  </option>


                  {CLASS_OPTIONS.map(
                    (className) => (

                      <option
                        key={className}
                        value={className}
                      >
                        {className}
                      </option>

                    )
                  )}

                </select>

              </div>

            </div>


            {/* =============================================
                OTHER CLASS
            ============================================= */}

            {formData.studentClass === "Others" && (

              <div className="input-group">

                <label>
                  Enter Class
                </label>


                <input
                  type="text"
                  name="otherClass"
                  placeholder="Enter your class"
                  value={formData.otherClass}
                  onChange={handleChange}
                />

              </div>

            )}


            {/* =============================================
                TIMEZONE
            ============================================= */}

            <div className="input-group">

              <label>
                Timezone
              </label>


              <select
                name="timezone"
                value={formData.timezone}
                onChange={handleChange}
              >

                <option value="">
                  Select timezone
                </option>


                {TIMEZONE_OPTIONS.map(
                  (timezone) => (

                    <option
                      key={timezone}
                      value={timezone}
                    >
                      {timezone}
                    </option>

                  )
                )}

              </select>

            </div>


            {/* =============================================
                EMAIL
            ============================================= */}

            <div className="input-group">

              <label>
                Email Address
              </label>


              <div className="input-wrapper">

                <FaEnvelope
                  className="input-icon"
                />


                <input
                  type="email"
                  name="email"
                  placeholder="Enter email address"
                  value={formData.email}
                  onChange={handleChange}
                />

              </div>

            </div>


            {/* =============================================
                PASSWORD
            ============================================= */}

            <div className="input-group">

              <label>
                Password
              </label>


              <div className="input-wrapper">

                <FaLock
                  className="input-icon"
                />


                <input
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  name="password"
                  placeholder="Create password"
                  value={formData.password}
                  onChange={handleChange}
                  onFocus={() =>
                    setShowPasswordRules(true)
                  }
                />


                <button
                  type="button"
                  className="password-toggle"
                  onClick={() =>
                    setShowPassword(
                      (previous) =>
                        !previous
                    )
                  }
                  aria-label="Toggle password visibility"
                >

                  {showPassword
                    ? <FaEyeSlash />
                    : <FaEye />
                  }

                </button>

              </div>


              {showPasswordRules && (

                <div className="password-rules">

                  <p
                    className={
                      passwordChecks.length
                        ? "valid"
                        : ""
                    }
                  >
                    {passwordChecks.length
                      ? "✓"
                      : "•"}{" "}
                    At least 8 characters
                  </p>


                  <p
                    className={
                      passwordChecks.uppercase
                        ? "valid"
                        : ""
                    }
                  >
                    {passwordChecks.uppercase
                      ? "✓"
                      : "•"}{" "}
                    One uppercase letter
                  </p>


                  <p
                    className={
                      passwordChecks.lowercase
                        ? "valid"
                        : ""
                    }
                  >
                    {passwordChecks.lowercase
                      ? "✓"
                      : "•"}{" "}
                    One lowercase letter
                  </p>


                  <p
                    className={
                      passwordChecks.number
                        ? "valid"
                        : ""
                    }
                  >
                    {passwordChecks.number
                      ? "✓"
                      : "•"}{" "}
                    One number
                  </p>


                  <p
                    className={
                      passwordChecks.special
                        ? "valid"
                        : ""
                    }
                  >
                    {passwordChecks.special
                      ? "✓"
                      : "•"}{" "}
                    One special character
                  </p>

                </div>

              )}

            </div>


            {/* =============================================
                CONFIRM PASSWORD
            ============================================= */}

            <div className="input-group">

              <label>
                Confirm Password
              </label>


              <div className="input-wrapper">

                <FaLock
                  className="input-icon"
                />


                <input
                  type={
                    showConfirmPassword
                      ? "text"
                      : "password"
                  }
                  name="confirmPassword"
                  placeholder="Confirm password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                />


                <button
                  type="button"
                  className="password-toggle"
                  onClick={() =>
                    setShowConfirmPassword(
                      (previous) =>
                        !previous
                    )
                  }
                  aria-label="Toggle confirm password visibility"
                >

                  {showConfirmPassword
                    ? <FaEyeSlash />
                    : <FaEye />
                  }

                </button>

              </div>


              {formData.confirmPassword && (

                <p
                  className={
                    formData.password ===
                    formData.confirmPassword
                      ? "password-match success"
                      : "password-match error"
                  }
                >

                  {formData.password ===
                  formData.confirmPassword
                    ? "✓ Passwords match"
                    : "✕ Passwords do not match"
                  }

                </p>

              )}

            </div>


            {/* =============================================
                EMIS NUMBER
            ============================================= */}

            <div className="input-group">

              <label>
                EMIS Number{" "}

                <span className="optional-text">
                  (Optional)
                </span>

              </label>


              <div className="input-wrapper">

                <FaIdCard
                  className="input-icon"
                />


                <input
                  type="text"
                  name="emisNumber"
                  placeholder="Enter EMIS number"
                  value={formData.emisNumber}
                  onChange={handleChange}
                />

              </div>

            </div>


            {/* =============================================
                UPLOAD STUDENT ID
            ============================================= */}

            <div className="input-group">

              <label className="upload-label">
                Upload Student ID
              </label>


              <label
                className="upload-box"
                htmlFor="studentIdFile"
              >

                <FaUpload
                  className="upload-icon"
                />


                <span className="upload-choose-btn">
                  Choose File
                </span>


                <span className="upload-filename">

                  {studentIdFile
                    ? studentIdFile.name
                    : "No file chosen"
                  }

                </span>

              </label>


              <input
                id="studentIdFile"
                type="file"
                className="upload-input"
                onChange={handleFileChange}
                accept="image/*,.pdf"
              />

            </div>


            {/* =============================================
                REGISTER BUTTON
            ============================================= */}

            <button
              type="submit"
              className="register-button"
              disabled={loading}
            >

              {loading ? (

                <>

                  <span className="button-spinner"></span>

                  Registering...

                </>

              ) : (

                <>

                  Register as Participant

                  

                </>

              )}

            </button>


            {/* =============================================
                DIVIDER
            ============================================= */}

            <div className="register-divider"></div>


            {/* =============================================
                LOGIN LINK
            ============================================= */}

            <p className="already-user">

              Already a User?{" "}

              <a href="/login">
                Continue Here
              </a>

            </p>

          </form>

        </div>

      </main>


      {/* ===================================================
          POPUP
      =================================================== */}

      {popup.show && (

        <div
          className="register-popup-overlay"
          onClick={closePopup}
        >

          <div
            className="register-popup"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <button
              type="button"
              className="register-popup-close"
              onClick={closePopup}
              aria-label="Close popup"
            >
              <FaTimes />
            </button>


            <div
              className={
                `register-popup-icon ${popup.type}`
              }
            >

              {popup.type === "success"
                ? <FaCheck />
                : <FaTimes />
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
              className={
                `register-popup-button ${popup.type}`
              }
              onClick={closePopup}
            >
              Okay
            </button>

          </div>

        </div>

      )}

    </div>

  );

};


export default StudentRegister;