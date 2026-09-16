const multer = require("multer");
const path = require("path");

// Store uploaded files in memory
const storage = multer.memoryStorage();

// Allow only image files
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png/;

  const extName = allowedTypes.test(
    path.extname(file.originalname).toLowerCase()
  );

  const mimeType = allowedTypes.test(file.mimetype);

  if (extName && mimeType) {
    cb(null, true);
  } else {
    cb(new Error("Only images are allowed"));
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