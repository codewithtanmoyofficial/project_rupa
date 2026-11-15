const mongoose = require('mongoose');
const { gradeFor, resultFor } = require('../utils/grade');

const resultSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    subject: { type: String, required: true, trim: true },
    marks: { type: Number, required: true, min: 0, max: 100 },
    grade: { type: String }, // calculated
    result: { type: String, enum: ['Pass', 'Fail'] }, // calculated
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

resultSchema.index({ student: 1, subject: 1 }, { unique: true });

// Grade + Pass/Fail are always derived on the server whenever marks are saved
resultSchema.pre('validate', function () {
  if (typeof this.marks === 'number') {
    this.grade = gradeFor(this.marks);
    this.result = resultFor(this.marks);
  }
});

module.exports = mongoose.model('Result', resultSchema);
