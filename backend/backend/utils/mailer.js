const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const sendOTPEmail = async (email, otp) => {
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Online Tuition - Password Reset OTP",
    html: `
      <div style="font-family: Arial, sans-serif;">
        <h2>Password Reset</h2>
        <p>Your OTP for resetting your Online Tuition password is:</p>

        <h1 style="letter-spacing: 6px;">${otp}</h1>

        <p>This OTP is valid for <strong>10 minutes</strong>.</p>
        <p>If you did not request a password reset, please ignore this email.</p>
      </div>
    `
  });
};

module.exports = sendOTPEmail;