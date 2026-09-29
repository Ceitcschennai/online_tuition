import React, { useEffect, useState } from "react";
import API_BASE_URL from "../config/api";

import {
  FaUser,
  FaUniversity,
  FaBookOpen,
  FaEdit,
  FaSave
} from "react-icons/fa";

import "../styles/teacherProfile.css";


const TeacherProfile = () => {

  const [teacher, setTeacher] = useState(null);
  const [loading, setLoading] = useState(true);

  const [editingBank, setEditingBank] =
    useState(false);

  const [bankDetails, setBankDetails] = useState({
    accountHolderName: "",
    bankName: "",
    accountNumber: "",
    ifscCode: "",
    accountType: ""
  });

  const [savingBank, setSavingBank] =
    useState(false);


  const teacherId =
    localStorage.getItem("teacherId");

  const token =
    localStorage.getItem("token");


  const loggedInUser = JSON.parse(
    localStorage.getItem("user") || "{}"
  );


  const isTeacherApproved =
    teacher?.isApproved === true ||
    loggedInUser?.isApproved === true;


  /* =========================================================
     FETCH TEACHER PROFILE
  ========================================================= */

  useEffect(() => {

    const fetchProfile = async () => {

      try {

        if (!teacherId) {

          console.error(
            "Teacher ID not found"
          );

          setLoading(false);

          return;
        }


        const response = await fetch(
          `${API_BASE_URL}/api/teacher/profile/${teacherId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );


        const data =
          await response.json();


        if (
          !response.ok ||
          !data.success
        ) {

          throw new Error(
            data.message ||
            "Failed to fetch profile"
          );
        }


        setTeacher(data.teacher);


      } catch (error) {

        console.error(
          "Teacher profile error:",
          error
        );

      } finally {

        setLoading(false);

      }

    };


    fetchProfile();

  }, [teacherId, token]);


  /* =========================================================
     EDIT BANK DETAILS
  ========================================================= */

  const handleEditBank = () => {

    setBankDetails({

      accountHolderName:
        teacher.bankDetails?.accountHolderName ||
        "",

      bankName:
        teacher.bankDetails?.bankName ||
        "",

      accountNumber:
        teacher.bankDetails?.accountNumber ||
        "",

      ifscCode:
        teacher.bankDetails?.ifscCode ||
        "",

      accountType:
        teacher.bankDetails?.accountType ||
        ""

    });


    setEditingBank(true);

  };


  /* =========================================================
     REQUEST ACTIVATION
  ========================================================= */

  const handleRequestActivation = async () => {

    try {

      if (!teacherId || !token) {

        alert(
          "Please login again."
        );

        return;
      }


      const response = await fetch(
        `${API_BASE_URL}/api/teacher/request-activation/${teacherId}`,
        {
          method: "POST",

          headers: {
            Authorization:
              `Bearer ${token}`,

            "Content-Type":
              "application/json"
          }
        }
      );


      const data =
        await response.json();


      if (
        !response.ok ||
        !data.success
      ) {

        throw new Error(
          data.message ||
          "Failed to submit activation request"
        );

      }


      /* ==========================================
         UPDATE PROFILE STATE
      ========================================== */

      setTeacher((prev) => ({
        ...prev,

        isActive: false,

        activationRequested:
          true
      }));


      /* ==========================================
         UPDATE LOCAL STORAGE
      ========================================== */

      const storedUser =
        JSON.parse(
          localStorage.getItem(
            "user"
          ) || "null"
        );


      if (storedUser) {

        localStorage.setItem(
          "user",

          JSON.stringify({
            ...storedUser,

            isActive: false,

            activationRequested:
              true
          })
        );

      }


      /* ==========================================
         INFORM SIDEBAR
      ========================================== */

      window.dispatchEvent(
        new Event(
          "userStatusUpdated"
        )
      );


      alert(
        "Activation request submitted successfully. Please wait for admin approval."
      );


    } catch (error) {

      console.error(
        "Activation request error:",
        error
      );


      alert(
        error.message ||
        "Failed to submit activation request"
      );

    }

  };


  /* =========================================================
     BANK INPUT CHANGE
  ========================================================= */

  const handleBankChange = (e) => {

    const {
      name,
      value
    } = e.target;


    setBankDetails((prev) => ({

      ...prev,

      [name]: value

    }));

  };


  /* =========================================================
     SAVE BANK DETAILS
  ========================================================= */

  const handleSaveBank = async () => {

    try {

      setSavingBank(true);


      const response = await fetch(
        `${API_BASE_URL}/api/teacher/profile/${teacherId}/bank-details`,
        {
          method: "PUT",

          headers: {

            "Content-Type":
              "application/json",

            Authorization:
              `Bearer ${token}`

          },

          body:
            JSON.stringify(
              bankDetails
            )

        }
      );


      const data =
        await response.json();


      if (
        !response.ok ||
        !data.success
      ) {

        throw new Error(
          data.message ||
          "Failed to save bank details"
        );

      }


      setTeacher((prev) => ({

        ...prev,

        bankDetails:
          data.bankDetails

      }));


      setEditingBank(false);


      alert(
        "Bank details saved successfully."
      );


    } catch (error) {

      console.error(
        "Bank details save error:",
        error
      );


      alert(
        error.message ||
        "Failed to save bank details."
      );


    } finally {

      setSavingBank(false);

    }

  };


  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {

    return (

      <div className="teacher-profile-page">

        Loading...

      </div>

    );

  }


  /* =========================================================
     PROFILE NOT FOUND
  ========================================================= */

  if (!teacher) {

    return (

      <div className="teacher-profile-page">

        Teacher profile not found.

      </div>

    );

  }


  /* =========================================================
     PAGE
  ========================================================= */

  return (

    <div className="teacher-profile-page">


      {/* =====================================================
          PROFILE HEADER
      ===================================================== */}

      <div className="teacher-profile-header">

        <div>

          <span>
            MY PROFILE
          </span>


          <h1>
            Teacher Profile
          </h1>


          <p>
            View your registered information and
            manage your bank details.
          </p>

        </div>

      </div>


      {/* =====================================================
          PERSONAL DETAILS
      ===================================================== */}

      <div className="teacher-profile-section">


        <div className="teacher-profile-section-title">

          <FaUser />

          <h2>
            Personal Details
          </h2>

        </div>


        <div className="teacher-profile-grid">


          <div>

            <label>
              Name
            </label>

            <p>

              {teacher.salutation || ""}{" "}

              {teacher.firstName}{" "}

              {teacher.lastName}

            </p>

          </div>


          <div>

            <label>
              Email
            </label>

            <p>
              {teacher.email}
            </p>

          </div>


          <div>

            <label>
              Mobile
            </label>

            <p>
              {teacher.mobile || "-"}
            </p>

          </div>


          <div>

            <label>
              Timezone
            </label>

            <p>
              {teacher.timezone || "-"}
            </p>

          </div>


        </div>

      </div>


      {/* =====================================================
          PROFESSIONAL DETAILS
      ===================================================== */}

      <div className="teacher-profile-section">


        <div className="teacher-profile-section-title">

          <FaBookOpen />

          <h2>
            Professional Details
          </h2>

        </div>


        <div className="teacher-profile-grid">


          <div>

            <label>
              Qualification
            </label>

            <p>
              {teacher.qualification || "-"}
            </p>

          </div>


          <div>

            <label>
              Experience
            </label>

            <p>
              {teacher.experience || 0} years
            </p>

          </div>


          <div>

            <label>
              Preferred Subject
            </label>

            <p>
              {teacher.preferredSubject || "-"}
            </p>

          </div>


          <div>

            <label>
              Classes Assigned
            </label>

            <p>

              {teacher.classesAssigned?.length
                ? teacher.classesAssigned.join(", ")
                : "-"}

            </p>

          </div>


        </div>

      </div>


      {/* =====================================================
          BANK DETAILS
      ===================================================== */}

      <div className="teacher-profile-section">


        {/* ===================================================
            BANK HEADER
        =================================================== */}

        <div className="teacher-profile-section-title bank-title-row">


          <div className="bank-title">

            <FaUniversity />

            <h2>
              Bank Details
            </h2>

          </div>


          {/* =================================================
              EDIT BUTTON
              ONLY ACTIVE APPROVED FACULTY
          ================================================= */}

          {isTeacherApproved &&
            teacher.isActive !== false &&
            !editingBank && (

              <button
                type="button"
                className="edit-bank-button"
                onClick={handleEditBank}
              >

                <FaEdit />

                Edit Bank Details

              </button>

            )}

        </div>


        {/* ===================================================
            PENDING TEACHER
        =================================================== */}

        {!isTeacherApproved ? (

          <div className="bank-approval-waiting">


            <div className="bank-approval-waiting-icon">

              ⏳

            </div>


            <div className="bank-approval-waiting-content">


              <h3>
                Waiting for Admin Approval
              </h3>


              <p>

                Bank details can be added only
                after your faculty account is
                approved by the administrator.

              </p>


              <span>

                Your profile is available, but
                bank details will remain locked
                until approval.

              </span>


            </div>


          </div>


        ) : teacher.isActive === false ? (


          /* =================================================
             DEACTIVATED APPROVED FACULTY
          ================================================= */

          <div className="teacher-activation-status-card">


            <div className="teacher-activation-status-icon">

              🔒

            </div>


            <div className="teacher-activation-status-content">


              <h3>
                Faculty Account Deactivated
              </h3>


              <p>

                Your faculty account is currently
                deactivated. You can request
                activation from the admin.

              </p>


            </div>


            {!teacher.activationRequested ? (

              <button
                type="button"
                className="teacher-request-activation-btn"
                onClick={
                  handleRequestActivation
                }
              >

                Request Activation

              </button>

            ) : (

              <div className="teacher-activation-requested">

                ⏳ Activation Requested

              </div>

            )}


          </div>


        ) : (


          /* =================================================
             ACTIVE APPROVED FACULTY
          ================================================= */

          <>


            <p className="bank-details-message">

              Add your bank details so the admin
              can process your monthly salary.

            </p>


            {/* ===============================================
                EDIT BANK FORM
            =============================================== */}

            {editingBank ? (

              <div className="bank-form">


                <div className="teacher-profile-grid">


                  {/* ACCOUNT HOLDER */}

                  <div>

                    <label>
                      Account Holder Name
                    </label>


                    <input
                      type="text"
                      name="accountHolderName"
                      value={
                        bankDetails.accountHolderName
                      }
                      onChange={
                        handleBankChange
                      }
                      placeholder="Enter account holder name"
                    />

                  </div>


                  {/* BANK NAME */}

                  <div>

                    <label>
                      Bank Name
                    </label>


                    <input
                      type="text"
                      name="bankName"
                      value={
                        bankDetails.bankName
                      }
                      onChange={
                        handleBankChange
                      }
                      placeholder="Enter bank name"
                    />

                  </div>


                  {/* ACCOUNT NUMBER */}

                  <div>

                    <label>
                      Account Number
                    </label>


                    <input
                      type="text"
                      name="accountNumber"
                      value={
                        bankDetails.accountNumber
                      }
                      onChange={
                        handleBankChange
                      }
                      placeholder="Enter account number"
                    />

                  </div>


                  {/* IFSC */}

                  <div>

                    <label>
                      IFSC Code
                    </label>


                    <input
                      type="text"
                      name="ifscCode"
                      value={
                        bankDetails.ifscCode
                      }
                      onChange={
                        handleBankChange
                      }
                      placeholder="Enter IFSC code"
                    />

                  </div>


                  {/* ACCOUNT TYPE */}

                  <div>

                    <label>
                      Account Type
                    </label>


                    <select
                      name="accountType"
                      value={
                        bankDetails.accountType
                      }
                      onChange={
                        handleBankChange
                      }
                    >

                      <option value="">
                        Select account type
                      </option>

                      <option value="Savings">
                        Savings
                      </option>

                      <option value="Current">
                        Current
                      </option>

                    </select>

                  </div>


                </div>


                {/* FORM BUTTONS */}

                <div className="bank-form-actions">


                  <button
                    type="button"
                    className="cancel-bank-button"
                    onClick={() =>
                      setEditingBank(false)
                    }
                    disabled={savingBank}
                  >

                    Cancel

                  </button>


                  <button
                    type="button"
                    className="save-bank-button"
                    onClick={
                      handleSaveBank
                    }
                    disabled={savingBank}
                  >

                    <FaSave />

                    {savingBank
                      ? "Saving..."
                      : "Save Bank Details"}

                  </button>


                </div>


              </div>


            ) : (


              /* =============================================
                 DISPLAY BANK DETAILS
              ============================================= */

              <div className="teacher-profile-grid">


                <div>

                  <label>
                    Account Holder Name
                  </label>

                  <p>

                    {
                      teacher.bankDetails
                        ?.accountHolderName ||
                      "Not added"
                    }

                  </p>

                </div>


                <div>

                  <label>
                    Bank Name
                  </label>

                  <p>

                    {
                      teacher.bankDetails
                        ?.bankName ||
                      "Not added"
                    }

                  </p>

                </div>


                <div>

                  <label>
                    Account Number
                  </label>

                  <p>

                    {
                      teacher.bankDetails
                        ?.accountNumber ||
                      "Not added"
                    }

                  </p>

                </div>


                <div>

                  <label>
                    IFSC Code
                  </label>

                  <p>

                    {
                      teacher.bankDetails
                        ?.ifscCode ||
                      "Not added"
                    }

                  </p>

                </div>


                <div>

                  <label>
                    Account Type
                  </label>

                  <p>

                    {
                      teacher.bankDetails
                        ?.accountType ||
                      "Not added"
                    }

                  </p>

                </div>


              </div>

            )}

          </>

        )}


      </div>


    </div>

  );

};


export default TeacherProfile;