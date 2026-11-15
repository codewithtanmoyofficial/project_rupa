const mongoose = require('mongoose');

// One document per role: matrix = { students: { create, read, update, delete }, ... }
const permissionSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ['admin', 'teacher', 'student'], required: true, unique: true },
    matrix: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Permission', permissionSchema);
