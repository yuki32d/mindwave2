import mongoose from 'mongoose';

// MOOC User Credentials
const moocUserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, enum: ['student', 'faculty', 'super_admin'], default: 'student' },
  createdAt: { type: Date, default: Date.now }
});

const moocCourseSchema = new mongoose.Schema({
  courseCode: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: { type: String },
  duration: { type: String }, // e.g. "4 Weeks"
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // SuperAdmin creator
  instructorId: { type: String, default: null },   // Faculty user _id assigned as instructor
  instructorName: { type: String, default: null },  // Faculty display name
  category: { type: String, default: 'General' },
  level: { type: String, enum: ['Beginner', 'Intermediate', 'Advanced'], default: 'Beginner' },
  published: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const moocLessonSchema = new mongoose.Schema({
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'MoocCourse', required: true },
  title: { type: String, required: true },
  description: { type: String },
  // Google Drive file ID or Embed URL
  videoDriveUrl: { type: String },
  order: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

const moocQuizSchema = new mongoose.Schema({
  lessonId: { type: mongoose.Schema.Types.ObjectId, ref: 'MoocLesson', required: true },
  question: { type: String, required: true },
  options: [{ type: String, required: true }],
  correctOptionIndex: { type: Number, required: true, min: 0 }
});

const moocEnrollmentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true }, // References MoocUser or central User
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'MoocCourse', required: true },
  enrolledAt: { type: Date, default: Date.now },
  progressPercentage: { type: Number, default: 0 },
  completedLessons: [{ type: mongoose.Schema.Types.ObjectId, ref: 'MoocLesson' }],
  quizScores: [{
    quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'MoocQuiz' },
    score: { type: Number, default: 0 }
  }]
});

// Since server.js already has a top-level mongoose connection, we can just export the models
export const MoocUser = mongoose.models.MoocUser || mongoose.model('MoocUser', moocUserSchema);
export const MoocCourse = mongoose.models.MoocCourse || mongoose.model('MoocCourse', moocCourseSchema);
export const MoocLesson = mongoose.models.MoocLesson || mongoose.model('MoocLesson', moocLessonSchema);
export const MoocQuiz = mongoose.models.MoocQuiz || mongoose.model('MoocQuiz', moocQuizSchema);
export const MoocEnrollment = mongoose.models.MoocEnrollment || mongoose.model('MoocEnrollment', moocEnrollmentSchema);
