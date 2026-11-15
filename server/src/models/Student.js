const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    semester: { type: Number, required: true, min: 1, max: 8 },
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

studentSchema.index({ course: 1 });

module.exports = mongoose.model('Student', studentSchema);
