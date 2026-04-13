import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { MoocUser, MoocCourse, MoocEnrollment } from '../models/MoocModels.js';
import mongoose from 'mongoose';

// Lazy-load the main User model (defined in server.js before this router is mounted)
function getMainUser() {
  return mongoose.models.User;
}

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-dev';

// Generate MOOC JWT token
function signMoocToken(user, courseId = null, overrideRole = null) {
  return jwt.sign(
    {
      sub: user._id.toString(),
      role: overrideRole || user.role,
      email: user.email,
      name: user.name,
      courseId: courseId
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

// POST /api/mooc/register (Create a MoocUser)
router.post('/register', async (req, res) => {
  const { name, email, password, role } = req.body || {};

  if (!email || !password || !name) {
    return res.status(400).json({ ok: false, message: 'Name, email and password are required.' });
  }

  try {
    const existingUser = await MoocUser.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ ok: false, message: 'Email already registered.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const safeRole = ['student', 'faculty', 'super_admin'].includes(role) ? role : 'student';

    const newUser = await MoocUser.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: safeRole
    });

    const token = signMoocToken(newUser);
    res.cookie('mindwave_mooc_token', token, { httpOnly: true, sameSite: 'lax', maxAge: 7 * 24 * 3600 * 1000 });
    res.json({ ok: true, message: 'Registration successful', token, user: { name: newUser.name, role: newUser.role } });
  } catch (error) {
    console.error('MOOC Register Error:', error);
    res.status(500).json({ ok: false, message: 'Server error during registration.' });
  }
});

// POST /api/mooc/login
// Tries MoocUser first, then falls back to main Mindwave User collection
router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};

  if (typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ ok: false, message: 'Invalid credentials format.' });
  }

  try {
    const normalizedEmail = email.toLowerCase().trim();

    // 1. Try MOOC-specific users first
    let user = await MoocUser.findOne({ email: normalizedEmail });
    let userRole = user?.role || null;
    let isValid = false;

    if (user) {
      isValid = await bcrypt.compare(password, user.password);
    }

    // 2. Fall back to main Mindwave User collection
    if (!user || !isValid) {
      const MainUser = getMainUser();
      if (MainUser) {
        const mainUser = await MainUser.findOne({ email: normalizedEmail });
        if (mainUser) {
          const mainValid = await bcrypt.compare(password, mainUser.password);
          if (mainValid) {
            // Map Mindwave roles to MOOC roles
            // orgRole: 'owner' | 'admin' | 'faculty' → mooc 'faculty'
            // orgRole: 'student' or role: 'student' → mooc 'student'
            // role: 'admin' (platform admin) → mooc 'super_admin'
            let moocRole = 'student';
            if (mainUser.role === 'admin') {
              moocRole = 'super_admin';
            } else if (['owner', 'admin', 'faculty'].includes(mainUser.orgRole)) {
              moocRole = 'faculty';
            }

            const token = jwt.sign(
              {
                sub: mainUser._id.toString(),
                role: moocRole,
                email: mainUser.email,
                name: mainUser.name,
                courseId: null
              },
              JWT_SECRET,
              { expiresIn: '7d' }
            );

            res.cookie('mindwave_mooc_token', token, { httpOnly: true, sameSite: 'lax', maxAge: 7 * 24 * 3600 * 1000 });
            return res.json({ ok: true, message: 'Login successful', token, user: { name: mainUser.name, role: moocRole } });
          }
        }
      }
      // Neither collection matched
      return res.status(401).json({ ok: false, message: 'Invalid credentials.' });
    }

    // MoocUser found and password valid
    const token = signMoocToken(user);
    res.cookie('mindwave_mooc_token', token, { httpOnly: true, sameSite: 'lax', maxAge: 7 * 24 * 3600 * 1000 });
    res.json({ ok: true, message: 'Login successful', token, user: { name: user.name, role: user.role } });
  } catch (error) {
    console.error('MOOC Login Error:', error);
    res.status(500).json({ ok: false, message: 'Server error during login.' });
  }
});

// Middleware to protect MOOC routes
export const moocAuthMiddleware = (req, res, next) => {
  const token = req.cookies?.mindwave_mooc_token || req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ ok: false, message: 'Unauthorized. MOOC token missing.' });

  try {
    req.moocUser = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ ok: false, message: 'Invalid or expired MOOC token.' });
  }
};

// POST /api/mooc/enroll/:courseId
// Enroll current authenticated MOOC user into a course
router.post('/enroll/:courseId', moocAuthMiddleware, async (req, res) => {
  const { courseId } = req.params;
  const userId = req.moocUser.sub;

  if (!mongoose.Types.ObjectId.isValid(courseId)) {
    return res.status(400).json({ ok: false, message: 'Invalid course ID.' });
  }

  try {
    const course = await MoocCourse.findById(courseId);
    if (!course) return res.status(404).json({ ok: false, message: 'Course not found.' });

    const existingEnrollment = await MoocEnrollment.findOne({ userId, courseId });
    if (!existingEnrollment) {
      await MoocEnrollment.create({ userId, courseId });
    }

    // Always issue a course-scoped token ensuring they are treated as 'student' in the context of this course
    const scopedToken = jwt.sign(
      {
        sub: userId,
        role: 'student', // Force student role for course context as requested
        email: req.moocUser.email,
        name: req.moocUser.name,
        courseId: courseId
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.cookie('mindwave_mooc_token', scopedToken, { httpOnly: true, sameSite: 'lax', maxAge: 7 * 24 * 3600 * 1000 });
    res.json({ ok: true, message: 'Enrolled successfully', token: scopedToken, courseId });
  } catch (error) {
    console.error('MOOC Enroll Error:', error);
    res.status(500).json({ ok: false, message: 'Server error during enrollment.' });
  }
});

// GET /api/mooc/courses
// List all published MOOC courses
router.get('/courses', async (req, res) => {
  try {
    const courses = await MoocCourse.find({ published: true })
      .populate('authorId', 'name email')
      .sort({ createdAt: -1 });

    res.json({ ok: true, courses });
  } catch (error) {
    console.error('MOOC Fetch Courses Error:', error);
    res.status(500).json({ ok: false, message: 'Failed to fetch courses.' });
  }
});

// GET /api/mooc/user/dashboard
// Fetch enrolled courses and progress for the student
router.get('/dashboard', moocAuthMiddleware, async (req, res) => {
  try {
    const userId = req.moocUser.sub;
    const enrollments = await MoocEnrollment.find({ userId })
      .populate('courseId')
      .populate('completedLessons');
      
    // Fetch next sequential lesson for each course (basic logic)
    res.json({ ok: true, enrollments });
  } catch (error) {
    console.error('MOOC Dashboard Fetch Error:', error);
    res.status(500).json({ ok: false, message: 'Failed to load dashboard state.' });
  }
});

// GET /api/mooc/user/me
// Validates token
router.get('/user/me', moocAuthMiddleware, (req, res) => {
  res.json({ ok: true, user: req.moocUser });
});

// ============================================
// MOOC SUPER ADMIN CMS ROUTES (Phase 3)
// ============================================

export const moocSuperAdminMiddleware = (req, res, next) => {
  if (req.moocUser.role !== 'super_admin') {
    return res.status(403).json({ ok: false, message: 'Forbidden. Super Admin access only.' });
  }
  next();
};

// POST /api/mooc/admin/courses - Create a course
router.post('/admin/courses', moocAuthMiddleware, moocSuperAdminMiddleware, async (req, res) => {
  try {
    const { courseCode, title, description, duration } = req.body;
    
    if (!courseCode || !title) return res.status(400).json({ ok: false, message: 'Course Code and Title required.' });

    const existing = await MoocCourse.findOne({ courseCode });
    if (existing) return res.status(400).json({ ok: false, message: 'Course Code already exists.' });

    const course = await MoocCourse.create({
      courseCode, title, description, duration,
      authorId: req.moocUser.sub,
      published: true // auto publish for simplicity in CMS
    });

    res.json({ ok: true, message: 'Course created successfully', course });
  } catch (error) {
    console.error('MOOC CMS Course Error:', error);
    res.status(500).json({ ok: false, message: 'Failed to create course.' });
  }
});

// POST /api/mooc/admin/lessons - Create a lesson
router.post('/admin/lessons', moocAuthMiddleware, moocSuperAdminMiddleware, async (req, res) => {
  try {
    const { courseId, title, description, videoDriveUrl, order } = req.body;
    
    if (!courseId || !title || !videoDriveUrl) {
      return res.status(400).json({ ok: false, message: 'Course ID, Title, and Video Drive URL are required.' });
    }

    const lesson = await MoocLesson.create({ courseId, title, description, videoDriveUrl, order });
    res.json({ ok: true, message: 'Lesson added successfully', lesson });
  } catch (error) {
    console.error('MOOC CMS Lesson Error:', error);
    res.status(500).json({ ok: false, message: 'Failed to add lesson.' });
  }
});

// POST /api/mooc/admin/quizzes - Create a quiz
router.post('/admin/quizzes', moocAuthMiddleware, moocSuperAdminMiddleware, async (req, res) => {
  try {
    const { lessonId, question, options, correctOptionIndex } = req.body;
    
    if (!lessonId || !question || !options || options.length < 2 || typeof correctOptionIndex !== 'number') {
      return res.status(400).json({ ok: false, message: 'Invalid quiz payload.' });
    }

    const quiz = await MoocQuiz.create({ lessonId, question, options, correctOptionIndex });
    res.json({ ok: true, message: 'Quiz created successfully', quiz });
  } catch (error) {
    console.error('MOOC CMS Quiz Error:', error);
    res.status(500).json({ ok: false, message: 'Failed to create quiz.' });
  }
});

// ============================================
// MOOC ANALYTICS ROUTES (Phase 4)
// ============================================

router.get('/analytics', moocAuthMiddleware, async (req, res) => {
  try {
    const role = req.moocUser.role;
    if (role === 'student') return res.status(403).json({ ok: false, message: 'Forbidden' });

    let courseFilter = {};
    if (role === 'faculty') {
      courseFilter = { authorId: req.moocUser.sub };
    }

    // 1. Fetch relevant courses
    const courses = await MoocCourse.find(courseFilter).select('_id title courseCode');
    const courseIds = courses.map(c => c._id);

    // 2. Aggregate Enrollments
    const enrollments = await MoocEnrollment.find({ courseId: { $in: courseIds } });

    // 3. Compute Stats
    const totalEnrollments = enrollments.length;
    const uniqueLearners = new Set(enrollments.map(e => e.userId.toString())).size;
    let totalProgress = 0;
    
    enrollments.forEach(e => totalProgress += e.progressPercentage || 0);
    const avgProgress = totalEnrollments > 0 ? (totalProgress / totalEnrollments).toFixed(1) : 0;

    res.json({
      ok: true,
      stats: {
        totalEnrollments,
        uniqueLearners,
        avgProgress: parseFloat(avgProgress),
        coursesLoaded: courses.length
      }
    });

  } catch (error) {
    console.error('MOOC Analytics Error:', error);
    res.status(500).json({ ok: false, message: 'Failed to load analytics.' });
  }
});

export default router;
