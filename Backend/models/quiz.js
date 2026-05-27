import mongoose from 'mongoose';

const quizSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      unique: true,
      uppercase: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Quiz title is required'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    description: {
      type: String,
      default: '',
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    genre: {
      type: String,
      enum: ['Coding', 'General', 'Science', 'History', 'Pop Culture', 'Other'],
      default: 'General',
    },
    timeLimit:   { type: Number, default: 30 },
    creator:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    creatorName: { type: String, required: true },
    isActive:    { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Auto-generate unique 6-char code: QZ + 4 alphanumeric chars
quizSchema.pre('validate', function (next) {
  if (!this.code) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    this.code =
      'QZ' +
      Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  }
  next();
});

export default mongoose.model('Quiz', quizSchema);