const nodemailer = require("nodemailer");



const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});


transporter.verify((error, success) => {
  if (error) {
    console.error("❌ EMAIL CONFIGURATION FAILED");
    console.error(error);
  } else {
    console.log("✅ EMAIL SERVER READY");
  }
});
module.exports = transporter;
