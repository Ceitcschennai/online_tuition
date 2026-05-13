import React, { useState } from "react";
import API_BASE_URL from "../config/api";
import "../styles/register.css";

const TeacherRegister = () => {
  const [form, setForm] = useState({
    salutation: "Mr.",
    firstName: "",
    lastName: "",
    mobile: "",
    timezone: "",
    email: "",
    password: "",
    confirmPassword: "",
    preferredSubject: "",
    qualification: ""
  });

  const [degreeFile, setDegreeFile] = useState(null);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    setDegreeFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (form.password !== form.confirmPassword) {
      alert("Passwords don't match");
      return;
    }

    // 🔐 Strong Password Validation
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;

    if (!passwordRegex.test(form.password)) {
      alert(
        "Password must be at least 8 characters long and include:\n" +
          "• 1 Uppercase letter\n" +
          "• 1 Lowercase letter\n" +
          "• 1 Number\n" +
          "• 1 Special character (@$!%*?&)"
      );
      return;
    }

    const formData = new FormData();

    for (const key in form) {
      formData.append(key, form[key]);
    }

    if (degreeFile) {
      formData.append("degreeCertificate", degreeFile);
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/teacher/register`,
        {
          method: "POST",
          body: formData
        }
      );

      const data = await response.json();

      if (response.ok) {
        alert("Registration successful! Wait for admin approval.");
        setForm({
          salutation: "Mr.",
          firstName: "",
          lastName: "",
          mobile: "",
          timezone: "",
          email: "",
          password: "",
          confirmPassword: "",
          preferredSubject: ""
        });
        setDegreeFile(null);
      } else {
        alert(data.message || "Registration failed");
      }
     } catch (error) {
       console.error("Teacher registration error:", error);
       console.error("Error details:", {
         message: error.message,
         stack: error.stack,
         name: error.name
       });
       alert("Error connecting to server: " + (error.message || "Unknown error"));
     }
  };

  return (
    <div className="register-page">
      <div className="register-form">
        <h2>Register as Teacher</h2>
        <form onSubmit={handleSubmit} encType="multipart/form-data">
          <div className="name-fields">
            <input
              type="text"
              name="salutation"
              placeholder="Mr./Ms."
              value={form.salutation}
              onChange={handleChange}
              required
            />
            <input
              type="text"
              name="firstName"
              placeholder="First Name"
              value={form.firstName}
              onChange={handleChange}
              required
            />
            <input
              type="text"
              name="lastName"
              placeholder="Last Name"
              value={form.lastName}
              onChange={handleChange}
              required
            />
          </div>

          <input
            type="tel"
            name="mobile"
            placeholder="Mobile Number"
            value={form.mobile}
            onChange={handleChange}
            required
          />

          <select
            name="timezone"
            value={form.timezone}
            onChange={handleChange}
            required
          >
            <option value="">- Select Timezone -</option>
            <option value="IST">India Standard Time (IST)</option>
            <option value="UTC">UTC</option>
            <option value="EST">Eastern Standard Time (EST)</option>
          </select>

          <select
  name="qualification"
  value={form.qualification}
  onChange={handleChange}
  required
>
  <option value="">Select Qualification</option>
  <option value="B.Ed">B.Ed</option>
  <option value="M.Ed">M.Ed</option>
  <option value="B.Sc">B.Sc</option>
  <option value="M.Sc">M.Sc</option>
  <option value="PhD">PhD</option>
</select>

          <input
            type="email"
            name="email"
            placeholder="Email ID"
            value={form.email}
            onChange={handleChange}
            required
          />

          <input
            type="password"
            name="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            required
          />

          <input
            type="password"
            name="confirmPassword"
            placeholder="Confirm Password"
            value={form.confirmPassword}
            onChange={handleChange}
            required
          />

          <input
            type="text"
            name="preferredSubject"
            placeholder="Preferred Subject (e.g., Maths, English)"
            value={form.preferredSubject}
            onChange={handleChange}
            required
          />

          <label style={{ marginTop: "10px" }}>
            Upload Degree Certificate (B.Ed, M.Ed, etc.):
          </label>

          <input
            type="file"
            name="degreeCertificate"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleFileChange}
          />

          <button type="submit">Register</button>

          <div className="register-footer">
            <div className="login-link">
              <a href="/login">Already a User? Continue Here</a>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TeacherRegister;