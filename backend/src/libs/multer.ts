import multer from 'multer';

// Configure storage for temporary files
const storage = multer.memoryStorage();

// Create upload middleware with file size limits
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit per file
    files: 10, // Maximum 10 files
    fields: 10, // Maximum number of non-file fields
  },
  fileFilter: (req, file, cb) => {
    // Accept images, videos, and common file types
    const allowedMimeTypes = [
      // Images
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
      // Videos
      'video/mp4',
      'video/webm',
      'video/ogg',
      'video/avi',
      'video/mov',
      // Documents
      'application/pdf',
      'text/plain',
      'application/json',
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          `File type ${file.mimetype} is not allowed. Allowed types: images, videos, PDF, text files.`
        )
      );
    }
  },
});

// Ticket/support upload: images only, 2MB per file, max 10 files (supportTicket folder)
const ticketUpload = multer({
  storage,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB per file
    files: 10,
    fields: 5,
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
    ];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (JPEG, PNG, GIF, WebP). Max 2MB per file.'));
    }
  },
});

// Blog image upload: single file, 5MB, images only (R2 blog folder)
const blogImageUpload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 1,
    fields: 2,
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
    ];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (JPEG, PNG, GIF, WebP). Max 5MB.'));
    }
  },
});

// Profile image upload: single file, 2MB, images only (R2 profileImage folder)
const profileImageUpload = multer({
  storage,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB
    files: 1,
    fields: 2,
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
    ];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (JPEG, PNG, GIF, WebP). Max 2MB.'));
    }
  },
});

export { ticketUpload, blogImageUpload, profileImageUpload };
export default upload;
