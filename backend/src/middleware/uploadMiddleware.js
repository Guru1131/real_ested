const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// File filter (optional)
const fileFilter = (req, file, cb) => {
  // Allow all standard images, PDFs, text documents
  cb(null, true);
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Configure multi-field uploads
const propertyUploads = upload.fields([
  { name: 'images', maxCount: 10 },
  { name: 'floor_plans', maxCount: 3 },
  { name: 'brochures', maxCount: 2 },
  { name: 'documents', maxCount: 5 }
]);

module.exports = {
  upload,
  propertyUploads
};
