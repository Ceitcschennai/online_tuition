const nodemailer = require("nodemailer");

console.log("EMAIL CONFIG CHECK:", {
  userSet: Boolean(process.env.EMAIL_USER),
  passSet: Boolean(process.env.EMAIL_PASS),
  passLength: process.env.EMAIL_PASS?.length,
});

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

module.exports = transporter;
