import { validationResult } from 'express-validator';
import Quiz from '../models/Quiz.js';
import Question from '../models/Question.js';
import Score from '../models/Score.js';

// ─── @POST /api/quiz  (protected) ────────────────────────────────────────────
export const createQuiz = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ errors: errors.array() });

  try {
    const { title, description, genre, timeLimit, questions } = req.body;

    const quiz = await Quiz.create({
      title,
      description,
      genre,
      timeLimit,
      creator:     req.user._id,
      creatorName: req.user.username,
    });

    // Persist each question as its own document, ordered by array index
    const questionDocs = await Question.insertMany(
      questions.map((q, i) => ({
        quiz:          quiz._id,
        questionText:  q.questionText,
        options:       q.options,
        correctOption: q.correctOption,
        order:         i,
      }))
    );

    res.status(201).json({ ...quiz.toObject(), questions: questionDocs });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── @GET /api/quiz/code/:code  (protected) ───────────────────────────────────
export const getQuizByCode = async (req, res) => {
  try {
    const quiz = await Quiz.findOne({
      code: req.params.code.toUpperCase(),
      isActive: true,
    });
    if (!quiz) return res.status(404).json({ message: 'No active quiz found with this code' });

    const questions = await Question.find({ quiz: quiz._id }).sort({ order: 1 });
    res.json({ ...quiz.toObject(), questions });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── @GET /api/quiz/my  (protected) ───────────────────────────────────────────
export const getMyQuizzes = async (req, res) => {
  try {
    const quizzes = await Quiz.find({ creator: req.user._id }).sort({ createdAt: -1 });
    res.json(quizzes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── @DELETE /api/quiz/:id  (protected) ───────────────────────────────────────
export const deleteQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

    if (quiz.creator.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'Not authorized to delete this quiz' });

    // Cascade-delete associated questions and scores
    await Promise.all([
      Question.deleteMany({ quiz: quiz._id }),
      Score.deleteMany({ quiz: quiz._id }),
    ]);
    await quiz.deleteOne();

    res.json({ message: 'Quiz deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};