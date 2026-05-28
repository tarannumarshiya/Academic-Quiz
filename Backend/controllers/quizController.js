const Quiz = require('../models/Quiz');
const Question = require('../models/Question');

// Helper to generate a unique room code
const generateRoomCode = async () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let isUnique = false;
  let code = '';

  while (!isUnique) {
    code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const exists = await Quiz.findOne({ code });
    if (!exists) {
      isUnique = true;
    }
  }

  return code;
};

// @desc    Create a new quiz room with questions
// @route   POST /api/quizzes
// @access  Private
const createQuiz = async (req, res, next) => {
  const { title, description, genre, timeLimit, questions } = req.body;

  try {
    if (!title || !genre || !questions || !Array.isArray(questions) || questions.length === 0) {
      res.status(400);
      throw new Error('Please provide title, genre, and at least one question');
    }

    // Step 1: Create all questions in the db
    const questionIds = [];
    for (const q of questions) {
      if (!q.questionText || !q.options || q.options.length !== 4 || q.correctOption === undefined) {
        res.status(400);
        throw new Error('Each question must have text, exactly 4 options, and a correct option index');
      }

      const newQuestion = await Question.create({
        questionText: q.questionText,
        options: q.options,
        correctOption: q.correctOption,
      });

      questionIds.push(newQuestion._id);
    }

    // Step 2: Generate a room code
    const roomCode = await generateRoomCode();

    // Step 3: Create the quiz
    const quiz = await Quiz.create({
      title,
      description,
      genre,
      timeLimit: timeLimit || 30,
      code: roomCode,
      creator: req.user._id,
      questions: questionIds,
    });

    // Populate questions to return complete details
    const populatedQuiz = await Quiz.findById(quiz._id).populate('questions');

    res.status(201).json({
      id: populatedQuiz.code, // client uses activeQuiz.id as the Room Code
      _id: populatedQuiz._id,
      title: populatedQuiz.title,
      description: populatedQuiz.description,
      genre: populatedQuiz.genre,
      timeLimit: populatedQuiz.timeLimit,
      code: populatedQuiz.code,
      questions: populatedQuiz.questions,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all quizzes (list metadata)
// @route   GET /api/quizzes
// @access  Public
const getAllQuizzes = async (req, res, next) => {
  try {
    const quizzes = await Quiz.find({}).populate('creator', 'username').select('-questions');
    res.json(quizzes);
  } catch (error) {
    next(error);
  }
};

// @desc    Get single quiz by room code or MongoDB ID
// @route   GET /api/quizzes/:code
// @access  Public
const getQuizByCode = async (req, res, next) => {
  const { code } = req.params;

  try {
    // Search first by code, if not found then check if code is a valid MongoId and search by _id
    let quiz = await Quiz.findOne({ code: code.toUpperCase() }).populate('questions');

    if (!quiz && code.match(/^[0-9a-fA-F]{24}$/)) {
      quiz = await Quiz.findById(code).populate('questions');
    }

    if (!quiz) {
      res.status(404);
      throw new Error(`Quiz room "${code}" not found.`);
    }

    res.json({
      id: quiz.code, // Client expects activeQuiz.id for saving attempts
      _id: quiz._id,
      title: quiz.title,
      description: quiz.description,
      genre: quiz.genre,
      timeLimit: quiz.timeLimit,
      code: quiz.code,
      questions: quiz.questions,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createQuiz,
  getAllQuizzes,
  getQuizByCode,
};