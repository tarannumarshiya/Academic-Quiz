const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema(
  {
    questionText: {
      type: String,
      required: [true, 'Please provide the question text'],
      trim: true,
    },
    options: {
      type: [String],
      required: [true, 'Please provide four options'],
      validate: {
        validator: function (val) {
          return val.length === 4;
        },
        message: 'A question must have exactly 4 options',
      },
    },
    correctOption: {
      type: Number,
      required: [true, 'Please specify the correct option index (0-3)'],
      min: [0, 'Correct option index must be at least 0 (Option A)'],
      max: [3, 'Correct option index must be at most 3 (Option D)'],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Question', questionSchema);
