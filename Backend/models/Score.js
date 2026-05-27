import mongoose from 'mongoose';

const scoreSchema = new mongoose.Schema(
  {
    quiz:           { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true, index: true },
    quizTitle:      { type: String, required: true },
    quizCode:       { type: String, required: true, uppercase: true },
    genre:          { type: String, default: 'General' },
    user:           { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    username:       { type: String, required: true },
    score:          { type: Number, required: true, default: 0 },
    totalQuestions: { type: Number, required: true },
    percentage:     { type: Number, required: true },
    selections:     { type: [Number], default: [] }, // selected option index per question (-1 = skipped)
    timeTaken:      { type: Number, default: 0 },    // total seconds taken
  },
  { timestamps: true }
);

export default mongoose.model('Score', scoreSchema);