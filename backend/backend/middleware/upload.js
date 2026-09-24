const multer = require("multer");
const path = require("path");

// Store uploaded files in memory
const storage = multer.memoryStorage();

// Allow only PDF files
const fileFilter = (req, file, cb) => {
  const allowedTypes = /pdf/;

  const extName = allowedTypes.test(
    path.extname(file.originalname).toLowerCase()
  );

  const mimeType = file.mimetype === "application/pdf";

  if (extName && mimeType) {
    cb(null, true);
  } else {
    cb(new Error("Only PDF files are allowed"));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
  },
});

module.exports = upload;