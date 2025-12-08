import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import nodemailer from "nodemailer";
import path from "path";
import { fileURLToPath } from "url";
import { google } from "googleapis";
import fs from "fs";
import multer from "multer";
import { GoogleGenerativeAI } from "@google/generative-ai";
import cron from "node-cron";

dotenv.config();

const {
  PORT = 8081,
  MONGODB_URI = "mongodb://127.0.0.1:27017/mindwave",
  JWT_SECRET = "mindwave_demo_secret",
  CLIENT_ORIGIN = "http://localhost:8081",
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  SMTP_FROM = "no-reply@mindwave.local",
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI = "http://localhost:8081/auth/google/callback",
  // GitHub OAuth
  GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET,
  GITHUB_REDIRECT_URI = "http://localhost:8081/auth/github/callback",
  // Zoom OAuth
  ZOOM_CLIENT_ID,
  ZOOM_CLIENT_SECRET,
  ZOOM_REDIRECT_URI = "http://localhost:8081/auth/zoom/callback",
  // Auto-cleanup settings
  AUTO_DELETE_DAYS = "20",
  CLEANUP_ENABLED = "true"
} = process.env;

let mailer = null;
if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
  mailer = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS }
  });
}

async function sendResetCodeEmail(to, code) {
  if (!mailer) return false;
  try {
    const info = await mailer.sendMail({
      from: SMTP_FROM,
      to,
      subject: "Mindwave Password Reset Code",
      text: `Your verification code is ${code}. It expires in 10 minutes.`,
      html: `<p>Your verification code is <strong>${code}</strong>.</p><p>It expires in 10 minutes.</p>`
    });
    const preview = nodemailer.getTestMessageUrl(info);
    if (preview) {
      console.log(`Email preview: ${preview}`);
    }
    return true;
  } catch {
    return false;
  }
}

// Enable Ethereal test SMTP automatically when no SMTP is configured
if (!mailer) {
  (async () => {
    try {
      const account = await nodemailer.createTestAccount();
      mailer = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: { user: account.user, pass: account.pass }
      });
      console.log(`Ethereal SMTP enabled: ${account.user}`);
    } catch (error) {
      console.warn('Ethereal SMTP setup failed; will log codes to console only');
    }
  })();
}

mongoose.set("strictQuery", true);
mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("Connected to MongoDB");
    seedSubjects();
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    displayName: { type: String }, // Custom display name for leaderboards/profiles
    bio: { type: String }, // User bio/about me
    phone: { type: String }, // Phone number
    department: { type: String }, // Department/Program
    yearSemester: { type: String }, // Year/Semester
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["student", "admin"], default: "student" },
    googleAccessToken: { type: String },
    googleRefreshToken: { type: String },
    // GitHub Integration
    githubAccessToken: { type: String },
    githubUsername: { type: String },
    // Zoom Integration
    zoomAccessToken: { type: String },
    zoomRefreshToken: { type: String },
    // Activity Tracking
    lastActive: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

const passwordResetSchema = new mongoose.Schema(
  {
    email: { type: String, required: true },
    codeHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    used: { type: Boolean, default: false }
  },
  { timestamps: true }
);

const adminNotificationSchema = new mongoose.Schema(
  {
    message: { type: String, required: true },
    meta: { type: mongoose.Schema.Types.Mixed }
  },
  { timestamps: true }
);

const gameSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    type: { type: String, required: true },
    difficulty: { type: String, default: 'Normal' },
    brief: { type: String }, // Short description
    description: { type: String }, // Full description
    published: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // Game Specific Data
    duration: { type: Number, default: 10 },
    totalPoints: { type: Number, default: 100 },
    questions: { type: Array, default: [] }, // For Quiz
    items: { type: Array, default: [] }, // For Sorter
    categories: { type: Array, default: [] }, // For Sorter
    blanks: { type: Array, default: [] }, // For Fill-in
    content: { type: String }, // For Fill-in
    perfectCode: { type: String }, // For Debug
    buggyCode: { type: String }, // For Debug
    bugCount: { type: Number }, // For Debug
    bugs: { type: Array, default: [] }, // For Debug
    explanation: { type: String }, // For Debug
    language: { type: String }, // For Debug
    blocks: { type: Array, default: [] }, // For SQL
    distractors: { type: Array, default: [] }, // For SQL
    correctQuery: { type: String }, // For SQL
    lines: { type: Array, default: [] } // For Unjumble
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
const PasswordResetRequest = mongoose.model("PasswordResetRequest", passwordResetSchema);
const AdminNotification = mongoose.model("AdminNotification", adminNotificationSchema);
const Game = mongoose.model("Game", gameSchema);

const gameSubmissionSchema = new mongoose.Schema(
  {
    gameId: { type: mongoose.Schema.Types.ObjectId, ref: 'Game', required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    isCorrect: { type: Boolean, required: true },
    score: { type: Number, default: 0 }, // Percentage score (0-100)
    studentAnswers: { type: Array, default: [] }, // Array of student's answers for review
    submittedAt: { type: Date, default: Date.now },
    startedAt: { type: Date }, // When student started the game
    completedAt: { type: Date }, // When student completed/submitted the game
    durationSeconds: { type: Number } // Time taken in seconds
  },
  { timestamps: true }
);

const timeAttackSessionSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    questions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Game' }],
    currentQuestionIndex: { type: Number, default: 0 },
    score: { type: Number, default: 0 },
    startTime: { type: Date, default: Date.now },
    endTime: { type: Date },
    status: { type: String, enum: ['in-progress', 'completed'], default: 'in-progress' }
  },
  { timestamps: true }
);

const timeAttackLeaderboardSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    score: { type: Number, required: true },
    timeTakenMs: { type: Number, required: true },
    date: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

const GameSubmission = mongoose.model("GameSubmission", gameSubmissionSchema);
const TimeAttackSession = mongoose.model("TimeAttackSession", timeAttackSessionSchema);
const TimeAttackLeaderboard = mongoose.model("TimeAttackLeaderboard", timeAttackLeaderboardSchema);

// Pending Admin Signup Schema (for approval workflow)
const pendingAdminSignupSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }, // Hashed password
    requestedAt: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rejectedAt: { type: Date }
  },
  { timestamps: true }
);

const PendingAdminSignup = mongoose.model("PendingAdminSignup", pendingAdminSignupSchema);

// Schema for student project submissions
const projectSubmissionSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  studentName: { type: String, required: true },
  studentEmail: { type: String, required: true },
  projectName: { type: String, required: true },
  description: { type: String, required: true },
  githubRepoUrl: { type: String, required: true },
  liveDemoUrl: { type: String }, // Optional
  submittedAt: { type: Date, default: Date.now },
  grade: { type: Number, min: 0, max: 100 }, // null if not graded yet
  feedback: { type: String },
  status: { type: String, enum: ['pending', 'reviewed', 'graded'], default: 'pending' },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: { type: Date }
}, { timestamps: true });

const ProjectSubmission = mongoose.model("ProjectSubmission", projectSubmissionSchema);

// CONFIGURABLE: Super Admin Email (can be changed for different HODs)
const SUPER_ADMIN_EMAIL = "jeeban.mca@cmrit.ac.in"; // Change this to the HOD's email

// Custom Course Management Schemas
const subjectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  icon: { type: String, default: '📚' },
  description: String
}, { timestamps: true });

const materialSchema = new mongoose.Schema({
  title: { type: String, required: true },
  type: { type: String, required: true }, // 'pdf', 'ppt', 'image', etc.
  fileUrl: { type: String, required: true },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  pinned: { type: Boolean, default: false },
  folder: { type: String, default: 'General' },
  downloads: { type: Number, default: 0 },
  description: { type: String, default: '' },
  fileSize: { type: Number, default: 0 }
}, { timestamps: true });

const notificationSchema = new mongoose.Schema({
  recipientRole: { type: String, enum: ['student', 'all'], default: 'student' },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, default: 'info' }, // 'material', 'game', 'info'
  read: { type: Boolean, default: false },
  link: String,
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

const Subject = mongoose.model("Subject", subjectSchema);
const Material = mongoose.model("Material", materialSchema);
const Notification = mongoose.model("Notification", notificationSchema);

const announcementSchema = new mongoose.Schema({
  title: { type: String, required: true },
  body: { type: String, required: true },
  audience: { type: String, default: 'All Students' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

const Announcement = mongoose.model("Announcement", announcementSchema);

// Community Feature Schemas
const communityPostSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true, maxlength: 300 },
  content: { type: String, required: true, maxlength: 5000 },
  postType: { type: String, enum: ['text', 'image', 'video', 'project'], default: 'text' },
  mediaUrl: { type: String }, // For images/videos
  projectUrl: { type: String }, // For project links
  tags: [{ type: String }], // Hashtags or category tags
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  likeCount: { type: Number, default: 0 },
  commentCount: { type: Number, default: 0 },
  viewCount: { type: Number, default: 0 },
  isPinned: { type: Boolean, default: false },
  isReported: { type: Boolean, default: false },
  reportCount: { type: Number, default: 0 }
}, { timestamps: true });

const communityCommentSchema = new mongoose.Schema({
  postId: { type: mongoose.Schema.Types.ObjectId, ref: 'CommunityPost', required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true, maxlength: 2000 },
  parentComment: { type: mongoose.Schema.Types.ObjectId, ref: 'CommunityComment' }, // For nested replies
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  likeCount: { type: Number, default: 0 },
  isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

const postReportSchema = new mongoose.Schema({
  postId: { type: mongoose.Schema.Types.ObjectId, ref: 'CommunityPost', required: true },
  reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reason: { type: String, required: true },
  status: { type: String, enum: ['pending', 'reviewed', 'resolved'], default: 'pending' }
}, { timestamps: true });

const CommunityPost = mongoose.model("CommunityPost", communityPostSchema);
const CommunityComment = mongoose.model("CommunityComment", communityCommentSchema);
const PostReport = mongoose.model("PostReport", postReportSchema);

const globalSettingsSchema = new mongoose.Schema({
  maintenanceMode: { type: Boolean, default: false },
  registrationOpen: { type: Boolean, default: true },
  doubleXP: { type: Boolean, default: false },
  globalBanner: { type: String, default: "" },
  accentColor: { type: String, default: "#0f62fe" }
}, { timestamps: true });

const GlobalSettings = mongoose.model("GlobalSettings", globalSettingsSchema);


const app = express();

// Trust proxy - required for Render deployment and rate limiting
app.set('trust proxy', 1);
const allowedOrigins = new Set([
  CLIENT_ORIGIN,
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://localhost:8081',
  'http://127.0.0.1:8081'
]);
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.has(origin) ||
        /^http:\/\/localhost(?::\d+)?$/.test(origin) ||
        /^http:\/\/127\.0\.0\.1(?::\d+)?$/.test(origin) ||
        /^http:\/\/192\.168\.\d+\.\d+(?::\d+)?$/.test(origin) ||
        origin === 'null'
      ) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true
  })
);
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "script-src": ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://cdn.cloudflare.com", "https://cdn.jsdelivr.net"],
      "style-src": ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://cdn.cloudflare.com", "https://cdn.jsdelivr.net"],
      "connect-src": ["'self'", "https://cdn.jsdelivr.net"],
      "frame-src": ["'self'", "https://*.vercel.app", "https://*.netlify.app", "https://*.github.io", "https://*.onrender.com", "https://*.herokuapp.com", "https://*.replit.dev", "https://*.glitch.me"]
    }
  }
}));
app.use(express.json());
app.use(cookieParser());
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Serve static files (HTML, CSS, JS, images) from the root directory
app.use(express.static(__dirname, { index: false }));

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false
});

const STUDENT_EMAIL_REGEX = /\.mca25@cmrit\.ac\.in$/i;
const ADMIN_EMAIL_REGEX = /\.mca@cmrit\.ac\.in$/i;

function validateEmail(email, role) {
  if (!email) return false;
  if (role === "admin") {
    return ADMIN_EMAIL_REGEX.test(email);
  }
  if (role === "student") {
    return STUDENT_EMAIL_REGEX.test(email);
  }
  return STUDENT_EMAIL_REGEX.test(email) || ADMIN_EMAIL_REGEX.test(email);
}

function validatePassword(password) {
  return password && password.length >= 6;
}

function sanitizeRole(role) {
  return ["student", "admin"].includes(role) ? role : "student";
}

function signToken(user) {
  return jwt.sign(
    {
      sub: user._id.toString(),
      role: user.role,
      email: user.email,
      name: user.name
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function authMiddleware(req, res, next) {
  const token = req.cookies?.mindwave_token;
  if (!token) return res.status(401).json({ ok: false, message: "Unauthorized" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (error) {
    return res.status(401).json({ ok: false, message: "Invalid token" });
  }
}

app.get("/", (_req, res) => {
  res.redirect("/login.html");
});

async function createAdminNotification(message, meta = {}) {
  try {
    await AdminNotification.create({ message, meta });
  } catch (error) {
    console.error("Failed to create admin notification:", error);
  }
}

app.post("/api/signup", authLimiter, async (req, res) => {
  const { name, email, password, role } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ ok: false, message: "Email and password are required" });
  }

  const safeRole = sanitizeRole(role);
  if (!validateEmail(email, safeRole)) {
    return res.status(400).json({ ok: false, message: "Use your campus email" });
  }
  if (!validatePassword(password)) {
    return res.status(400).json({ ok: false, message: "Password must be at least 6 characters" });
  }

  try {
    // Extract first name from email
    const emailPrefix = email.split('@')[0];
    const firstName = emailPrefix.split('.')[0];
    const capitalizedName = firstName.charAt(0).toUpperCase() + firstName.slice(1);

    const hashed = await bcrypt.hash(password, 10);

    // ADMIN SIGNUP: Create pending request for approval
    if (safeRole === 'admin') {
      // Check if already has a pending request
      const existingPending = await PendingAdminSignup.findOne({
        email: email.toLowerCase(),
        status: 'pending'
      });

      if (existingPending) {
        return res.status(409).json({
          ok: false,
          message: "Admin signup request already pending approval"
        });
      }

      // Check if user already exists
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        return res.status(409).json({ ok: false, message: "Email already registered" });
      }

      // Create pending admin signup request
      const pendingSignup = await PendingAdminSignup.create({
        email: email.toLowerCase(),
        password: hashed,
        status: 'pending'
      });

      // Create notification for super admin
      const superAdmin = await User.findOne({ email: SUPER_ADMIN_EMAIL });
      if (superAdmin) {
        await AdminNotification.create({
          userId: superAdmin._id,
          type: 'admin_signup_request',
          message: `New admin signup request from ${email}`,
          metadata: {
            pendingSignupId: pendingSignup._id,
            email: email
          }
        });
      }

      return res.status(202).json({
        ok: true,
        message: "Admin signup request submitted for approval. You'll be notified once approved.",
        pending: true
      });
    }

    // STUDENT SIGNUP: Create user immediately
    const user = await User.create({
      name: capitalizedName,
      displayName: capitalizedName,
      email: email.toLowerCase(),
      password: hashed,
      role: safeRole
    });

    const token = signToken(user);
    res
      .cookie("mindwave_token", token, {
        httpOnly: true,
        sameSite: "lax",
        secure: false,
        maxAge: 7 * 24 * 60 * 60 * 1000
      })
      .status(201)
      .json({
        ok: true,
        user: { name: user.name, email: user.email, role: user.role }
      });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ ok: false, message: "Email already registered" });
    }
    console.error("Signup error:", error);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

app.post("/api/login", authLimiter, async (req, res) => {
  const { email, password, role } = req.body || {};
  const safeRole = sanitizeRole(role);
  if (!email || !password) {
    return res.status(400).json({ ok: false, message: "Email and password required" });
  }
  if (!validateEmail(email, safeRole)) {
    return res.status(400).json({ ok: false, message: "Use your campus email" });
  }

  try {
    // Check Maintenance Mode for Students
    if (safeRole === 'student') {
      const settings = await GlobalSettings.findOne();
      if (settings && settings.maintenanceMode) {
        return res.status(503).json({ ok: false, message: "System is currently under maintenance. Please try again later." });
      }
    }

    const user = await User.findOne({ email: email.toLowerCase(), role: safeRole });
    if (!user) return res.status(401).json({ ok: false, message: "Invalid credentials" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ ok: false, message: "Invalid credentials" });

    const token = signToken(user);
    res
      .cookie("mindwave_token", token, {
        httpOnly: true,
        sameSite: "lax",
        secure: false,
        maxAge: 7 * 24 * 60 * 60 * 1000
      })
      .json({
        ok: true,
        token: token,
        user: { name: user.name, email: user.email, role: user.role }
      });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

app.post("/api/logout", (_req, res) => {
  res
    .clearCookie("mindwave_token", { httpOnly: true, sameSite: "lax", secure: false })
    .json({ ok: true });
});

app.get("/api/me", authMiddleware, async (req, res) => {
  const user = await User.findById(req.user.sub).select("-password");
  res.json({ ok: true, user });
});

app.post("/api/password/forgot", authLimiter, async (req, res) => {
  const { email } = req.body || {};
  if (!email) {
    return res.status(400).json({ ok: false, message: "Email is required" });
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    return res.status(404).json({ ok: false, message: "No account found for this email" });
  }

  const verificationCode = crypto.randomInt(100000, 999999).toString();
  const codeHash = await bcrypt.hash(verificationCode, 10);

  await PasswordResetRequest.create({
    email: user.email,
    codeHash,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000)
  });

  const sent = await sendResetCodeEmail(user.email, verificationCode);
  if (!sent) {
    console.log(`Password reset code for ${user.email}: ${verificationCode}`);
  }

  res.json({
    ok: true,
    message: sent ? "Password reset code sent to your email." : "Password reset code sent. Please check your email (console log in dev)."
  });
});

app.post("/api/password/reset", authLimiter, async (req, res) => {
  const { email, code, newPassword } = req.body || {};
  if (!email || !code || !newPassword) {
    return res.status(400).json({ ok: false, message: "Email, code, and new password are required" });
  }
  if (!validatePassword(newPassword)) {
    return res.status(400).json({ ok: false, message: "Password must be at least 6 characters" });
  }

  const requestRecord = await PasswordResetRequest.findOne({
    email: email.toLowerCase(),
    used: false,
    expiresAt: { $gt: new Date() }
  }).sort({ createdAt: -1 });

  if (!requestRecord) {
    return res.status(400).json({ ok: false, message: "No valid reset request found" });
  }

  const isValidCode = await bcrypt.compare(code, requestRecord.codeHash);
  if (!isValidCode) {
    return res.status(400).json({ ok: false, message: "Invalid verification code" });
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    return res.status(404).json({ ok: false, message: "User not found" });
  }

  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();

  requestRecord.used = true;
  await requestRecord.save();

  await createAdminNotification("Password reset completed", {
    email: user.email,
    resetAt: new Date().toISOString()
  });

  res.json({ ok: true, message: "Password updated successfully" });
});

// Game endpoints
app.post("/api/games", authMiddleware, async (req, res) => {
  const body = req.body || {};
  const { title, type } = body;

  if (!title || !type) {
    return res.status(400).json({ ok: false, message: "Title and Type are required" });
  }

  if (req.user.role !== "admin") {
    return res.status(403).json({ ok: false, message: "Only admins can create games" });
  }

  try {
    console.log('Received game creation request:', { title, type, body });

    const gameData = {
      ...body,
      brief: body.brief || body.description || 'No description',
      description: body.description || body.brief || 'No description',
      difficulty: body.difficulty || 'Normal',
      published: body.published || body.status === 'active' || false,
      createdBy: req.user.sub
    };

    // Remove _id and id if present to let Mongo generate it
    delete gameData._id;
    delete gameData.id;

    console.log('Creating game with data:', gameData);
    const game = await Game.create(gameData);
    console.log('Game created successfully:', game._id);
    res.status(201).json({ ok: true, game });
  } catch (error) {
    console.error("Game creation error:", error);
    res.status(500).json({ ok: false, message: "Server error: " + error.message });
  }
});

app.put("/api/games/:id/publish", authMiddleware, async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ ok: false, message: "Only admins can publish games" });
  }
  try {
    const game = await Game.findById(req.params.id);
    if (!game) {
      return res.status(404).json({ ok: false, message: "Game not found" });
    }
    if (game.createdBy.toString() !== req.user.sub) {
      return res.status(403).json({ ok: false, message: "You can only publish your own games" });
    }
    game.published = true;
    await game.save();
    res.json({ ok: true, game });
  } catch (error) {
    console.error("Game publish error:", error);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

// GET all games (admin only)
app.get("/api/games", authMiddleware, async (req, res) => {
  try {
    // Only admins can see all games
    if (req.user.role !== 'admin') {
      return res.status(403).json({ ok: false, message: "Admin access required" });
    }

    const games = await Game.find().populate('createdBy', 'name').sort({ createdAt: -1 });
    res.json({ ok: true, games });
  } catch (error) {
    console.error("Get all games error:", error);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

app.get("/api/games/published", async (req, res) => {
  try {
    const games = await Game.find({ published: true }).populate('createdBy', 'name').sort({ createdAt: -1 });
    res.json({ ok: true, games });
  } catch (error) {
    console.error("Get published games error:", error);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

app.get("/api/games/my", authMiddleware, async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ ok: false, message: "Only admins can view their games" });
  }
  try {
    const games = await Game.find({ createdBy: req.user.sub }).sort({ createdAt: -1 });
    res.json({ ok: true, games });
  } catch (error) {
    console.error("Get my games error:", error);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

app.delete("/api/games/:id", authMiddleware, async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ ok: false, message: "Only admins can delete games" });
  }
  try {
    const game = await Game.findById(req.params.id);
    if (!game) {
      return res.status(404).json({ ok: false, message: "Game not found" });
    }
    if (game.createdBy.toString() !== req.user.sub) {
      return res.status(403).json({ ok: false, message: "You can only delete your own games" });
    }
    await Game.findByIdAndDelete(req.params.id);
    res.json({ ok: true, message: "Game deleted successfully" });
  } catch (error) {
    console.error("Delete game error:", error);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

// DEBUG ENDPOINT - Remove after debugging
app.get("/api/games/debug", async (req, res) => {
  try {
    const allGames = await Game.find({}).select('title type published createdAt').sort({ createdAt: -1 });
    const sqlGames = allGames.filter(g => g.type === 'sql-builder' || g.type === 'sql');
    res.json({
      ok: true,
      totalGames: allGames.length,
      publishedGames: allGames.filter(g => g.published).length,
      sqlGames: sqlGames.length,
      allGames: allGames,
      sqlGamesDetails: sqlGames
    });
  } catch (error) {
    console.error("Debug games error:", error);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});


// Announcement Endpoints
app.post("/api/announcements", authMiddleware, async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ ok: false, message: "Only admins can create announcements" });
  }
  const { title, body, audience } = req.body;
  if (!title || !body) {
    return res.status(400).json({ ok: false, message: "Title and body are required" });
  }
  try {
    const announcement = await Announcement.create({
      title,
      body,
      audience,
      createdBy: req.user.sub
    });

    // Create notification for students
    await Notification.create({
      recipientRole: 'student',
      title: `New Announcement: ${title}`,
      message: body.substring(0, 50) + (body.length > 50 ? '...' : ''),
      type: 'info',
      link: '/student-dashboard.html'
    });

    res.status(201).json({ ok: true, announcement });
  } catch (error) {
    console.error("Create announcement error:", error);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

app.get("/api/announcements", async (req, res) => {
  try {
    const announcements = await Announcement.find().sort({ createdAt: -1 }).limit(20);
    res.json({ ok: true, announcements });
  } catch (error) {
    console.error("Get announcements error:", error);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

app.delete("/api/announcements/:id", authMiddleware, async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ ok: false, message: "Only admins can delete announcements" });
  }
  try {
    await Announcement.findByIdAndDelete(req.params.id);
    res.json({ ok: true, message: "Announcement deleted" });
  } catch (error) {
    console.error("Delete announcement error:", error);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

// ============================================
// Engagement Metrics Endpoint
// ============================================

app.get("/api/engagement", authMiddleware, async (req, res) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    // Get total students
    const totalStudents = await User.countDocuments({ role: "student" });

    if (totalStudents === 0) {
      return res.json({
        ok: true,
        summary: { engagementRate: 0, totalActive: 0 },
        students: { active: 0, new: 0, returning: 0, inactive: 0, total: 0 },
        games: { totalPlays: 0, avgCompletion: 0, avgScore: 0, topGames: [] },
        timing: { peakHour: "N/A", trend: "0%", dailyActivity: Array(7).fill(0) }
      });
    }

    // Get active students (submitted games in last 7 days)
    const activeSubmissions = await GameSubmission.find({
      createdAt: { $gte: sevenDaysAgo }
    }).distinct("studentId");

    const activeStudents = activeSubmissions.length;
    const engagementRate = Math.round((activeStudents / totalStudents) * 100);

    // Get detailed analytics
    const submissions = await GameSubmission.find({
      createdAt: { $gte: sevenDaysAgo }
    }).populate('gameId', 'title type');

    const previousWeekSubmissions = await GameSubmission.find({
      createdAt: { $gte: fourteenDaysAgo, $lt: sevenDaysAgo }
    });

    // Student activity breakdown
    const newStudents = await User.countDocuments({
      role: "student",
      createdAt: { $gte: sevenDaysAgo }
    });

    const returningStudents = activeStudents - newStudents;
    const inactiveStudents = totalStudents - activeStudents;

    // Game performance metrics
    const totalPlays = submissions.length;
    const completedGames = submissions.filter(s => s.isCorrect || s.score >= 50).length;
    const avgCompletion = totalPlays > 0 ? Math.round((completedGames / totalPlays) * 100) : 0;
    const avgScore = totalPlays > 0
      ? Math.round(submissions.reduce((sum, s) => sum + (s.score || 0), 0) / totalPlays)
      : 0;

    // Top games
    const gameCounts = {};
    submissions.forEach(s => {
      if (s.gameId && s.gameId.title) {
        gameCounts[s.gameId.title] = (gameCounts[s.gameId.title] || 0) + 1;
      }
    });
    const topGames = Object.entries(gameCounts)
      .map(([name, plays]) => ({ name, plays }))
      .sort((a, b) => b.plays - a.plays)
      .slice(0, 5);

    // Peak hours analysis
    const hourCounts = Array(24).fill(0);
    submissions.forEach(s => {
      const hour = new Date(s.createdAt).getHours();
      hourCounts[hour]++;
    });
    const peakHourIndex = hourCounts.indexOf(Math.max(...hourCounts));
    const peakHour = peakHourIndex >= 0 ? `${peakHourIndex}:00-${peakHourIndex + 1}:00` : "N/A";

    // Trend calculation
    const previousWeekActive = previousWeekSubmissions.length;
    const trend = previousWeekActive > 0
      ? Math.round(((totalPlays - previousWeekActive) / previousWeekActive) * 100)
      : (totalPlays > 0 ? 100 : 0);
    const trendText = trend > 0 ? `+${trend}%` : `${trend}%`;

    // Daily activity (last 7 days)
    const dailyActivity = Array(7).fill(0);
    submissions.forEach(s => {
      const daysAgo = Math.floor((Date.now() - new Date(s.createdAt)) / (1000 * 60 * 60 * 24));
      if (daysAgo >= 0 && daysAgo < 7) {
        dailyActivity[6 - daysAgo]++;
      }
    });

    res.json({
      ok: true,
      summary: {
        engagementRate,
        totalActive: activeStudents
      },
      students: {
        active: activeStudents,
        new: newStudents,
        returning: returningStudents,
        inactive: inactiveStudents,
        total: totalStudents
      },
      games: {
        totalPlays,
        avgCompletion,
        avgScore,
        topGames
      },
      timing: {
        peakHour,
        trend: trendText,
        dailyActivity
      }
    });
  } catch (error) {
    console.error("Engagement error:", error);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

// ============================================
// Analytics Endpoints
// ============================================

// Analytics Overview
app.get("/api/analytics/overview", authMiddleware, async (req, res) => {
  try {
    // Get total students
    const totalStudents = await User.countDocuments({ role: 'student' });

    // Get total game submissions
    const gamesPlayed = await GameSubmission.countDocuments();

    // Get active students (those who submitted games)
    const activeStudents = await GameSubmission.distinct('studentId');
    const totalEngagement = totalStudents > 0 ? Math.round((activeStudents.length / totalStudents) * 100) : 0;

    // Get top performer
    const topPerformerData = await GameSubmission.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'studentId',
          foreignField: '_id',
          as: 'student'
        }
      },
      { $unwind: '$student' },
      {
        $group: {
          _id: '$studentId',
          name: { $first: { $ifNull: ['$student.displayName', '$student.name'] } },
          totalScore: { $sum: 1 } // Count submissions as score
        }
      },
      { $sort: { totalScore: -1 } },
      { $limit: 1 }
    ]);

    const topPerformer = topPerformerData[0] || null;

    // Get consistent students (3+ games)
    const consistentStudentsData = await GameSubmission.aggregate([
      {
        $group: {
          _id: '$studentId',
          count: { $sum: 1 }
        }
      },
      { $match: { count: { $gte: 3 } } }
    ]);

    res.json({
      ok: true,
      gamesPlayed,
      totalEngagement,
      activeStudents: activeStudents.length,
      totalStudents,
      topPerformer: topPerformer ? {
        name: topPerformer.name,
        totalScore: topPerformer.totalScore
      } : null,
      consistentStudents: consistentStudentsData.length
    });
  } catch (error) {
    console.error("Analytics overview error:", error);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

// Analytics Games Breakdown
app.get("/api/analytics/games", authMiddleware, async (req, res) => {
  try {
    const gamesData = await GameSubmission.aggregate([
      {
        $lookup: {
          from: 'games',
          localField: 'gameId',
          foreignField: '_id',
          as: 'game'
        }
      },
      { $unwind: '$game' },
      {
        $lookup: {
          from: 'users',
          localField: 'studentId',
          foreignField: '_id',
          as: 'student'
        }
      },
      { $unwind: '$student' },
      {
        $group: {
          _id: '$gameId',
          title: { $first: '$game.title' },
          type: { $first: '$game.type' },
          completions: { $sum: 1 },
          students: {
            $push: {
              name: '$student.name',
              score: { $cond: [{ $eq: ['$isCorrect', true] }, 100, 0] }
            }
          }
        }
      },
      { $sort: { completions: -1 } }
    ]);

    const games = gamesData.map(game => {
      const scores = game.students.map(s => s.score);
      const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
      const topScorer = game.students.sort((a, b) => b.score - a.score)[0];

      return {
        gameId: game._id,
        title: game.title,
        type: game.type,
        completions: game.completions,
        avgScore,
        avgTime: 0, // Not tracking time in GameSubmission currently
        topScorer: topScorer ? {
          name: topScorer.name,
          score: topScorer.score
        } : null
      };
    });

    res.json({ ok: true, games });
  } catch (error) {
    console.error("Analytics games error:", error);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

// Analytics Students Activity
app.get("/api/analytics/students", authMiddleware, async (req, res) => {
  try {
    const { timeRange = 'all' } = req.query;

    // Calculate date filter
    let dateFilter = {};
    if (timeRange !== 'all') {
      const daysAgo = parseInt(timeRange);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysAgo);
      dateFilter = { submittedAt: { $gte: cutoffDate } };
    }

    const studentsData = await GameSubmission.aggregate([
      { $match: dateFilter },
      {
        $lookup: {
          from: 'users',
          localField: 'studentId',
          foreignField: '_id',
          as: 'student'
        }
      },
      { $unwind: '$student' },
      {
        $group: {
          _id: '$studentId',
          name: { $first: { $ifNull: ['$student.displayName', '$student.name'] } },
          email: { $first: '$student.email' },
          gamesPlayed: { $sum: 1 },
          gamesCompleted: {
            $sum: { $cond: [{ $eq: ['$isCorrect', true] }, 1, 0] }
          },
          lastActive: { $max: '$submittedAt' },
          totalTime: { $sum: '$durationSeconds' }
        }
      },
      { $sort: { lastActive: -1 } }
    ]);

    const students = studentsData.map(student => {
      const completionRate = student.gamesPlayed > 0
        ? Math.round((student.gamesCompleted / student.gamesPlayed) * 100)
        : 0;
      const avgScore = student.gamesCompleted > 0
        ? Math.round((student.gamesCompleted / student.gamesPlayed) * 100)
        : 0;

      return {
        _id: student._id,
        name: student.name,
        email: student.email,
        gamesPlayed: student.gamesPlayed,
        gamesCompleted: student.gamesCompleted,
        avgScore,
        totalTime: student.totalTime || 0,
        lastActive: student.lastActive,
        completionRate
      };
    });

    res.json({ ok: true, students });
  } catch (error) {
    console.error("Analytics students error:", error);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

// Get detailed activities for a specific student
app.get("/api/analytics/students/:studentId/activities", authMiddleware, async (req, res) => {
  try {
    const { studentId } = req.params;

    // Fetch all game submissions for this student with game details
    const activities = await GameSubmission.find({ studentId })
      .populate('gameId', 'title type totalPoints')
      .sort({ submittedAt: -1 })
      .select('gameId score startedAt completedAt durationSeconds submittedAt');

    const formattedActivities = activities.map(activity => {
      const totalPoints = activity.gameId?.totalPoints || 100;
      const earnedPoints = Math.round((activity.score / 100) * totalPoints);

      return {
        gameName: activity.gameId?.title || 'Unknown Game',
        gameType: activity.gameId?.type || 'unknown',
        score: activity.score || 0,
        earnedPoints: earnedPoints,
        totalPoints: totalPoints,
        startTime: activity.startedAt || activity.submittedAt,
        endTime: activity.completedAt || activity.submittedAt,
        duration: activity.durationSeconds || 0,
        submittedAt: activity.submittedAt
      };
    });

    res.json({ ok: true, activities: formattedActivities });
  } catch (error) {
    console.error("Student activities error:", error);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

// ============================================
// Game Leaderboard Endpoint
// ============================================

app.get("/api/games/:gameId/leaderboard", authMiddleware, async (req, res) => {
  try {
    const { gameId } = req.params;
    const studentId = req.user.sub;

    // Get game details
    const game = await Game.findById(gameId);
    if (!game) {
      return res.status(404).json({ ok: false, message: "Game not found" });
    }

    // Get all submissions for this game
    const submissions = await GameSubmission.find({ gameId })
      .populate('studentId', 'name email')
      .sort({ score: -1, submittedAt: 1 })
      .lean();

    const totalParticipants = submissions.length;

    // Calculate rankings
    const rankedSubmissions = submissions.map((sub, index) => ({
      rank: index + 1,
      studentName: sub.studentId.name,
      studentEmail: sub.studentId.email,
      score: sub.score || (sub.isCorrect ? 100 : 0),
      submittedAt: sub.submittedAt,
      isCurrentStudent: sub.studentId._id.toString() === studentId
    }));

    // Find current student's submission
    const currentStudentSubmission = submissions.find(
      sub => sub.studentId._id.toString() === studentId
    );

    let currentStudent = null;
    let answerReview = null;

    if (currentStudentSubmission) {
      const currentRank = rankedSubmissions.findIndex(
        s => s.studentEmail === currentStudentSubmission.studentId.email
      ) + 1;

      currentStudent = {
        rank: currentRank,
        score: currentStudentSubmission.score || (currentStudentSubmission.isCorrect ? 100 : 0),
        isCorrect: currentStudentSubmission.isCorrect,
        submittedAt: currentStudentSubmission.submittedAt
      };

      // Build answer review based on game type
      if (currentStudentSubmission.studentAnswers && currentStudentSubmission.studentAnswers.length > 0) {
        answerReview = {
          questions: currentStudentSubmission.studentAnswers.map(answer => ({
            questionText: answer.questionText || answer.question || 'Question',
            studentAnswer: answer.studentAnswer || answer.answer,
            correctAnswer: answer.correctAnswer || answer.correct,
            isCorrect: answer.isCorrect || false,
            options: answer.options || []
          }))
        };
      } else if (game.type === 'quiz' && game.questions) {
        // Fallback: build from game questions if studentAnswers not stored
        answerReview = {
          questions: game.questions.map(q => ({
            questionText: q.question,
            studentAnswer: 'Not recorded',
            correctAnswer: q.correctAnswer || q.options?.find(o => o.isCorrect)?.text || 'N/A',
            isCorrect: false,
            options: q.options?.map(o => o.text) || []
          }))
        };
      }
    }

    // Get top 10 for leaderboard
    const leaderboard = rankedSubmissions.slice(0, 10);

    // If current student is not in top 10, add them to the list
    if (currentStudent && currentStudent.rank > 10) {
      const currentStudentEntry = rankedSubmissions.find(s => s.isCurrentStudent);
      if (currentStudentEntry) {
        leaderboard.push(currentStudentEntry);
      }
    }

    res.json({
      ok: true,
      gameTitle: game.title,
      gameType: game.type,
      totalParticipants,
      currentStudent,
      answerReview,
      leaderboard
    });
  } catch (error) {
    console.error("Leaderboard error:", error);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

// ============================================
// Game Submission Endpoint
// ============================================

app.post("/api/game-submissions", authMiddleware, async (req, res) => {
  try {
    const { gameId, score, isCorrect, studentAnswers, startedAt, completedAt, durationSeconds } = req.body;
    const studentId = req.user.sub;

    if (!gameId) {
      return res.status(400).json({ ok: false, message: "Game ID is required" });
    }

    // Create game submission with time tracking
    const submission = await GameSubmission.create({
      gameId,
      studentId,
      score: score || 0,
      isCorrect: isCorrect || false,
      studentAnswers: studentAnswers || [],
      submittedAt: new Date(),
      startedAt: startedAt ? new Date(startedAt) : null,
      completedAt: completedAt ? new Date(completedAt) : new Date(),
      durationSeconds: durationSeconds || null
    });

    res.status(201).json({ ok: true, submission });
  } catch (error) {
    console.error("Game submission error:", error);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

// ============================================
// Leaderboard Endpoint
// ============================================

app.get("/api/leaderboard", authMiddleware, async (req, res) => {
  try {
    const { timeFilter, gameType } = req.query;
    const currentUserId = req.user.sub;

    // Build time filter
    let dateFilter = {};
    const now = new Date();

    if (timeFilter === 'today') {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      dateFilter = { submittedAt: { $gte: today } };
    } else if (timeFilter === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      dateFilter = { submittedAt: { $gte: weekAgo } };
    } else if (timeFilter === 'month') {
      const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      dateFilter = { submittedAt: { $gte: monthAgo } };
    }

    // Build game type filter
    let gameTypeFilter = {};
    if (gameType && gameType !== 'all') {
      // Map frontend filter to game types
      const gameTypeMap = {
        'quiz': ['quiz'],
        'unjumble': ['unjumble', 'code-unjumble'],
        'sorter': ['sorter', 'tech-sorter'],
        'fillin': ['fillin', 'syntax-fill'],
        'sql': ['sql', 'sql-builder']
      };

      if (gameTypeMap[gameType]) {
        // Need to join with Game collection to filter by type
        const gamesOfType = await Game.find({ type: { $in: gameTypeMap[gameType] } }).select('_id');
        const gameIds = gamesOfType.map(g => g._id);
        gameTypeFilter = { gameId: { $in: gameIds } };
      }
    }

    // Aggregate leaderboard data
    const leaderboardData = await GameSubmission.aggregate([
      {
        $match: { ...dateFilter, ...gameTypeFilter }
      },
      {
        $group: {
          _id: '$studentId',
          totalPoints: { $sum: '$score' },
          gamesPlayed: { $sum: 1 },
          totalAccuracy: { $avg: '$score' },
          lastActivity: { $max: '$submittedAt' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userInfo'
        }
      },
      {
        $unwind: '$userInfo'
      },
      {
        $project: {
          studentId: '$_id',
          name: { $ifNull: ['$userInfo.displayName', '$userInfo.name'] },
          email: '$userInfo.email',
          totalPoints: 1,
          gamesPlayed: 1,
          avgAccuracy: { $round: ['$totalAccuracy', 0] },
          lastActivity: 1
        }
      },
      {
        $sort: { totalPoints: -1 }
      }
    ]);

    // Find current user's stats
    const currentUserStats = leaderboardData.find(
      entry => entry.studentId.toString() === currentUserId
    );

    const currentUserRank = currentUserStats
      ? leaderboardData.findIndex(entry => entry.studentId.toString() === currentUserId) + 1
      : 0;

    res.json({
      ok: true,
      leaderboard: leaderboardData,
      currentUser: currentUserStats ? {
        rank: currentUserRank,
        totalPoints: currentUserStats.totalPoints,
        gamesPlayed: currentUserStats.gamesPlayed,
        avgAccuracy: currentUserStats.avgAccuracy
      } : {
        rank: 0,
        totalPoints: 0,
        gamesPlayed: 0,
        avgAccuracy: 0
      }
    });

  } catch (error) {
    console.error("Leaderboard error:", error);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

// ============================================
// User Profile Update Endpoint
// ============================================

app.put("/api/user/update-profile", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.sub;
    const { displayName, bio, phone, department, yearSemester } = req.body;

    // Update user profile
    const updateFields = {};
    if (displayName !== undefined) updateFields.displayName = displayName;
    if (bio !== undefined) updateFields.bio = bio;
    if (phone !== undefined) updateFields.phone = phone;
    if (department !== undefined) updateFields.department = department;
    if (yearSemester !== undefined) updateFields.yearSemester = yearSemester;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateFields },
      { new: true, select: '-password' }
    );

    if (!updatedUser) {
      return res.status(404).json({ ok: false, message: "User not found" });
    }

    res.json({ ok: true, user: updatedUser });
  } catch (error) {
    console.error("Profile update error:", error);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

// ============================================
// Admin Student Management Endpoints
// ============================================

// Get all students (admin only)
app.get("/api/admin/students", authMiddleware, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.sub);

    if (!currentUser || currentUser.role !== 'admin') {
      return res.status(403).json({ ok: false, message: "Admin access required" });
    }

    const students = await User.find({ role: 'student' })
      .select('-password')
      .sort({ createdAt: -1 });

    res.json({ ok: true, students });
  } catch (error) {
    console.error("Get students error:", error);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

// Delete student (admin only)
app.delete("/api/admin/students/:id", authMiddleware, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.sub);

    if (!currentUser || currentUser.role !== 'admin') {
      return res.status(403).json({ ok: false, message: "Admin access required" });
    }

    const studentId = req.params.id;

    // Delete student
    const deletedStudent = await User.findByIdAndDelete(studentId);

    if (!deletedStudent) {
      return res.status(404).json({ ok: false, message: "Student not found" });
    }

    // Also delete their game submissions
    await GameSubmission.deleteMany({ studentId: studentId });

    res.json({
      ok: true,
      message: "Student deleted successfully",
      student: {
        name: deletedStudent.name,
        email: deletedStudent.email
      }
    });
  } catch (error) {
    console.error("Delete student error:", error);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

// ============ PENDING ADMIN SIGNUP MANAGEMENT ============

// Get all pending admin signup requests (admin only)
app.get("/api/admin/pending-signups", authMiddleware, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.sub);

    if (!currentUser || currentUser.role !== 'admin') {
      return res.status(403).json({ ok: false, message: "Admin access required" });
    }

    const pendingSignups = await PendingAdminSignup.find({ status: 'pending' })
      .select('-password')
      .sort({ requestedAt: -1 });

    res.json({ ok: true, pendingSignups });
  } catch (error) {
    console.error("Get pending signups error:", error);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

// Approve pending admin signup (admin only)
app.post("/api/admin/approve-signup/:id", authMiddleware, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.sub);

    if (!currentUser || currentUser.role !== 'admin') {
      return res.status(403).json({ ok: false, message: "Admin access required" });
    }

    const pendingSignup = await PendingAdminSignup.findById(req.params.id);

    if (!pendingSignup) {
      return res.status(404).json({ ok: false, message: "Pending signup not found" });
    }

    if (pendingSignup.status !== 'pending') {
      return res.status(400).json({ ok: false, message: "Signup request already processed" });
    }

    // Extract name from email
    const emailPrefix = pendingSignup.email.split('@')[0];
    const firstName = emailPrefix.split('.')[0];
    const capitalizedName = firstName.charAt(0).toUpperCase() + firstName.slice(1);

    // Create the admin user account
    const newAdmin = await User.create({
      name: capitalizedName,
      displayName: capitalizedName,
      email: pendingSignup.email,
      password: pendingSignup.password, // Already hashed
      role: 'admin'
    });

    // Update pending signup status
    pendingSignup.status = 'approved';
    pendingSignup.approvedBy = currentUser._id;
    pendingSignup.approvedAt = new Date();
    await pendingSignup.save();

    // Create notification for the new admin
    await AdminNotification.create({
      userId: newAdmin._id,
      type: 'signup_approved',
      message: `Your admin account has been approved! You can now log in.`,
      metadata: { approvedBy: currentUser.email }
    });

    res.json({
      ok: true,
      message: "Admin signup approved successfully",
      user: { name: newAdmin.name, email: newAdmin.email }
    });
  } catch (error) {
    console.error("Approve signup error:", error);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

// Reject pending admin signup (admin only)
app.post("/api/admin/reject-signup/:id", authMiddleware, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.sub);

    if (!currentUser || currentUser.role !== 'admin') {
      return res.status(403).json({ ok: false, message: "Admin access required" });
    }

    const pendingSignup = await PendingAdminSignup.findById(req.params.id);

    if (!pendingSignup) {
      return res.status(404).json({ ok: false, message: "Pending signup not found" });
    }

    if (pendingSignup.status !== 'pending') {
      return res.status(400).json({ ok: false, message: "Signup request already processed" });
    }

    // Update pending signup status
    pendingSignup.status = 'rejected';
    pendingSignup.rejectedBy = currentUser._id;
    pendingSignup.rejectedAt = new Date();
    await pendingSignup.save();

    res.json({
      ok: true,
      message: "Admin signup rejected successfully"
    });
  } catch (error) {
    console.error("Reject signup error:", error);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});


// ============ USER ACTIVITY TRACKING ============

// Heartbeat endpoint - Update user's last active timestamp
app.put("/api/user/heartbeat", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.sub;

    await User.findByIdAndUpdate(userId, {
      lastActive: new Date()
    });

    res.json({ ok: true });
  } catch (error) {
    console.error("Heartbeat error:", error);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

// Get active users (admin only)
app.get("/api/admin/active-users", authMiddleware, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.sub);

    if (!currentUser || currentUser.role !== 'admin') {
      return res.status(403).json({ ok: false, message: "Admin access required" });
    }

    // Get all students
    const allStudents = await User.find({ role: 'student' })
      .select('-password')
      .sort({ lastActive: -1 });

    // Define active threshold (30 seconds - 3x heartbeat interval of 10s)
    const activeThreshold = new Date(Date.now() - 30 * 1000);

    // Separate online and offline users
    const online = allStudents.filter(user =>
      user.lastActive && new Date(user.lastActive) > activeThreshold
    );

    const offline = allStudents.filter(user =>
      !user.lastActive || new Date(user.lastActive) <= activeThreshold
    );

    res.json({
      ok: true,
      online,
      offline,
      totalOnline: online.length,
      totalOffline: offline.length
    });
  } catch (error) {
    console.error("Get active users error:", error);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});


// ============================================
// PROJECT SUBMISSION ENDPOINTS
// ============================================

// Student submits a project
app.post("/api/projects/submit", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.sub;
    const user = await User.findById(userId);

    if (!user || user.role !== 'student') {
      return res.status(403).json({ ok: false, message: "Only students can submit projects" });
    }

    const { projectName, description, githubRepoUrl, liveDemoUrl } = req.body;

    if (!projectName || !description || !githubRepoUrl) {
      return res.status(400).json({ ok: false, message: "Project name, description, and GitHub URL are required" });
    }

    const newProject = new ProjectSubmission({
      studentId: userId,
      studentName: user.name || user.displayName || user.email,
      studentEmail: user.email,
      projectName,
      description,
      githubRepoUrl,
      liveDemoUrl: liveDemoUrl || null
    });

    await newProject.save();

    res.json({ ok: true, message: "Project submitted successfully", project: newProject });
  } catch (error) {
    console.error("Submit project error:", error);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

// Student gets their own projects
app.get("/api/projects/my", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.sub;

    const projects = await ProjectSubmission.find({ studentId: userId })
      .sort({ submittedAt: -1 })
      .populate('reviewedBy', 'name email');

    res.json({ ok: true, projects });
  } catch (error) {
    console.error("Get my projects error:", error);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

// Faculty gets all projects
app.get("/api/projects/all", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.sub;
    const user = await User.findById(userId);

    if (!user || (user.role !== 'faculty' && user.role !== 'admin')) {
      return res.status(403).json({ ok: false, message: "Access denied" });
    }

    const projects = await ProjectSubmission.find()
      .sort({ submittedAt: -1 })
      .populate('studentId', 'name email')
      .populate('reviewedBy', 'name email');

    res.json({ ok: true, projects });
  } catch (error) {
    console.error("Get all projects error:", error);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

// Faculty grades a project
app.put("/api/projects/:id/grade", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.sub;
    const user = await User.findById(userId);

    if (!user || (user.role !== 'faculty' && user.role !== 'admin')) {
      return res.status(403).json({ ok: false, message: "Access denied" });
    }

    const { id } = req.params;
    const { grade, feedback } = req.body;

    if (grade === undefined || grade < 0 || grade > 100) {
      return res.status(400).json({ ok: false, message: "Grade must be between 0 and 100" });
    }

    const project = await ProjectSubmission.findByIdAndUpdate(
      id,
      {
        grade,
        feedback: feedback || '',
        status: 'graded',
        reviewedBy: userId,
        reviewedAt: new Date()
      },
      { new: true }
    );

    if (!project) {
      return res.status(404).json({ ok: false, message: "Project not found" });
    }

    res.json({ ok: true, message: "Project graded successfully", project });
  } catch (error) {
    console.error("Grade project error:", error);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

// Get single project details
app.get("/api/projects/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const project = await ProjectSubmission.findById(id)
      .populate('studentId', 'name email')
      .populate('reviewedBy', 'name email');

    if (!project) {
      return res.status(404).json({ ok: false, message: "Project not found" });
    }

    res.json({ ok: true, project });
  } catch (error) {
    console.error("Get project error:", error);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

// Delete a project (students can only delete their own)
app.delete("/api/projects/:id", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.sub;
    const { id } = req.params;

    const project = await ProjectSubmission.findById(id);

    if (!project) {
      return res.status(404).json({ ok: false, message: "Project not found" });
    }

    // Check if the user is the owner of the project
    if (project.studentId.toString() !== userId) {
      return res.status(403).json({ ok: false, message: "You can only delete your own projects" });
    }

    await ProjectSubmission.findByIdAndDelete(id);

    res.json({ ok: true, message: "Project deleted successfully" });
  } catch (error) {
    console.error("Delete project error:", error);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});


// ============================================
// Global Settings Endpoints
// ============================================

app.get("/api/settings", async (req, res) => {
  try {
    let settings = await GlobalSettings.findOne();
    if (!settings) {
      settings = await GlobalSettings.create({});
    }
    res.json({ ok: true, settings });
  } catch (error) {
    console.error("Get settings error:", error);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

app.put("/api/settings", authMiddleware, async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ ok: false, message: "Only admins can update settings" });
  }
  try {
    const updates = req.body;
    let settings = await GlobalSettings.findOne();
    if (!settings) {
      settings = await GlobalSettings.create(updates);
    } else {
      Object.assign(settings, updates);
      await settings.save();
    }
    res.json({ ok: true, settings });
  } catch (error) {
    console.error("Update settings error:", error);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

// ============================================
// Community Feature Endpoints
// ============================================

// Configure Multer for preserving extensions
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Keep original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});
const uploadWithExt = multer({ storage: storage });

// Create a new community post
app.post("/api/community/posts", authMiddleware, uploadWithExt.single('media'), async (req, res) => {
  try {
    const { title, content, postType, projectUrl, tags } = req.body;

    if (!title || !content) {
      return res.status(400).json({ ok: false, message: "Title and content are required" });
    }

    const postData = {
      author: req.user.sub,
      title,
      content,
      postType: postType || 'text',
      projectUrl: projectUrl || null,
      tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim())) : []
    };

    // Add media URL if file was uploaded
    if (req.file) {
      postData.mediaUrl = `/uploads/${req.file.filename}`;
    }

    const post = await CommunityPost.create(postData);
    const populatedPost = await CommunityPost.findById(post._id).populate('author', 'name email');

    // Create notification for all students
    await Notification.create({
      recipientRole: 'student',
      title: 'New Community Post',
      message: `${req.user.name} shared: ${title}`,
      type: 'info',
      link: '/student-community.html'
    });

    res.status(201).json({ ok: true, post: populatedPost });
  } catch (error) {
    console.error("Create post error:", error);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

// Get all community posts with pagination and filters
app.get("/api/community/posts", async (req, res) => {
  try {
    const { sort = 'recent', tag, page = 1, limit = 20, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let query = {};

    // Filter by tag if provided
    if (tag) {
      query.tags = tag;
    }

    // Search in title and content
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } }
      ];
    }

    let sortOption = {};
    switch (sort) {
      case 'popular':
        sortOption = { likeCount: -1, createdAt: -1 };
        break;
      case 'trending':
        sortOption = { viewCount: -1, likeCount: -1, createdAt: -1 };
        break;
      case 'recent':
      default:
        sortOption = { isPinned: -1, createdAt: -1 };
    }

    const posts = await CommunityPost.find(query)
      .populate('author', 'name email')
      .sort(sortOption)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await CommunityPost.countDocuments(query);

    res.json({
      ok: true,
      posts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error("Get posts error:", error);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

// Get single post with comments
app.get("/api/community/posts/:id", async (req, res) => {
  try {
    const post = await CommunityPost.findById(req.params.id)
      .populate('author', 'name email');

    if (!post) {
      return res.status(404).json({ ok: false, message: "Post not found" });
    }

    const comments = await CommunityComment.find({ postId: req.params.id, parentComment: null })
      .populate('author', 'name email')
      .sort({ createdAt: -1 });

    res.json({ ok: true, post, comments });
  } catch (error) {
    console.error("Get post error:", error);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

// Update post (author only)
app.put("/api/community/posts/:id", authMiddleware, async (req, res) => {
  try {
    const post = await CommunityPost.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ ok: false, message: "Post not found" });
    }

    if (post.author.toString() !== req.user.sub) {
      return res.status(403).json({ ok: false, message: "You can only edit your own posts" });
    }

    const { title, content, tags } = req.body;

    if (title) post.title = title;
    if (content) post.content = content;
    if (tags) post.tags = Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim());

    await post.save();
    const updatedPost = await CommunityPost.findById(post._id).populate('author', 'name email');

    res.json({ ok: true, post: updatedPost });
  } catch (error) {
    console.error("Update post error:", error);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

// Delete post (author or admin)
app.delete("/api/community/posts/:id", authMiddleware, async (req, res) => {
  try {
    const post = await CommunityPost.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ ok: false, message: "Post not found" });
    }

    if (post.author.toString() !== req.user.sub && req.user.role !== 'admin') {
      return res.status(403).json({ ok: false, message: "Unauthorized" });
    }

    // Delete associated media file if exists
    if (post.mediaUrl) {
      const filePath = path.join(process.cwd(), post.mediaUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // Delete all comments associated with this post
    await CommunityComment.deleteMany({ postId: req.params.id });

    await CommunityPost.findByIdAndDelete(req.params.id);

    res.json({ ok: true, message: "Post deleted successfully" });
  } catch (error) {
    console.error("Delete post error:", error);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

// Toggle like on post
app.post("/api/community/posts/:id/like", authMiddleware, async (req, res) => {
  try {
    const post = await CommunityPost.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ ok: false, message: "Post not found" });
    }

    const userId = req.user.sub;
    const likeIndex = post.likes.indexOf(userId);

    if (likeIndex > -1) {
      // Unlike
      post.likes.splice(likeIndex, 1);
      post.likeCount = Math.max(0, post.likeCount - 1);
    } else {
      // Like
      post.likes.push(userId);
      post.likeCount += 1;
    }

    await post.save();

    res.json({ ok: true, liked: likeIndex === -1, likeCount: post.likeCount });
  } catch (error) {
    console.error("Like post error:", error);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

// Increment view count
app.post("/api/community/posts/:id/view", async (req, res) => {
  try {
    await CommunityPost.findByIdAndUpdate(req.params.id, { $inc: { viewCount: 1 } });
    res.json({ ok: true });
  } catch (error) {
    console.error("View post error:", error);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

// Add comment to post
app.post("/api/community/posts/:id/comments", authMiddleware, async (req, res) => {
  try {
    const { content, parentComment } = req.body;

    if (!content) {
      return res.status(400).json({ ok: false, message: "Content is required" });
    }

    const post = await CommunityPost.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ ok: false, message: "Post not found" });
    }

    const comment = await CommunityComment.create({
      postId: req.params.id,
      author: req.user.sub,
      content,
      parentComment: parentComment || null
    });

    // Increment comment count on post
    post.commentCount += 1;
    await post.save();

    const populatedComment = await CommunityComment.findById(comment._id)
      .populate('author', 'name email');

    res.status(201).json({ ok: true, comment: populatedComment });
  } catch (error) {
    console.error("Add comment error:", error);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

// Get comments for a post
app.get("/api/community/posts/:id/comments", async (req, res) => {
  try {
    const comments = await CommunityComment.find({
      postId: req.params.id,
      parentComment: null,
      isDeleted: false
    })
      .populate('author', 'name email')
      .sort({ createdAt: -1 });

    // Get replies for each comment
    const commentsWithReplies = await Promise.all(
      comments.map(async (comment) => {
        const replies = await CommunityComment.find({
          parentComment: comment._id,
          isDeleted: false
        })
          .populate('author', 'name email')
          .sort({ createdAt: 1 });

        return {
          ...comment.toObject(),
          replies
        };
      })
    );

    res.json({ ok: true, comments: commentsWithReplies });
  } catch (error) {
    console.error("Get comments error:", error);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

// Update comment (author only)
app.put("/api/community/comments/:id", authMiddleware, async (req, res) => {
  try {
    const comment = await CommunityComment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({ ok: false, message: "Comment not found" });
    }

    if (comment.author.toString() !== req.user.sub) {
      return res.status(403).json({ ok: false, message: "You can only edit your own comments" });
    }

    const { content } = req.body;
    if (content) {
      comment.content = content;
      await comment.save();
    }

    const updatedComment = await CommunityComment.findById(comment._id)
      .populate('author', 'name email');

    res.json({ ok: true, comment: updatedComment });
  } catch (error) {
    console.error("Update comment error:", error);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

// Delete comment (author or admin)
app.delete("/api/community/comments/:id", authMiddleware, async (req, res) => {
  try {
    const comment = await CommunityComment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({ ok: false, message: "Comment not found" });
    }

    if (comment.author.toString() !== req.user.sub && req.user.role !== 'admin') {
      return res.status(403).json({ ok: false, message: "Unauthorized" });
    }

    // Mark as deleted instead of actually deleting
    comment.isDeleted = true;
    comment.content = "[This comment has been deleted]";
    await comment.save();

    // Decrement comment count on post
    await CommunityPost.findByIdAndUpdate(comment.postId, { $inc: { commentCount: -1 } });

    res.json({ ok: true, message: "Comment deleted successfully" });
  } catch (error) {
    console.error("Delete comment error:", error);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

// Toggle like on comment
app.post("/api/community/comments/:id/like", authMiddleware, async (req, res) => {
  try {
    const comment = await CommunityComment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({ ok: false, message: "Comment not found" });
    }

    const userId = req.user.sub;
    const likeIndex = comment.likes.indexOf(userId);

    if (likeIndex > -1) {
      comment.likes.splice(likeIndex, 1);
      comment.likeCount = Math.max(0, comment.likeCount - 1);
    } else {
      comment.likes.push(userId);
      comment.likeCount += 1;
    }

    await comment.save();

    res.json({ ok: true, liked: likeIndex === -1, likeCount: comment.likeCount });
  } catch (error) {
    console.error("Like comment error:", error);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

// Report a post
app.post("/api/community/posts/:id/report", authMiddleware, async (req, res) => {
  try {
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ ok: false, message: "Reason is required" });
    }

    const post = await CommunityPost.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ ok: false, message: "Post not found" });
    }

    // Check if user already reported this post
    const existingReport = await PostReport.findOne({
      postId: req.params.id,
      reportedBy: req.user.sub
    });

    if (existingReport) {
      return res.status(400).json({ ok: false, message: "You have already reported this post" });
    }

    await PostReport.create({
      postId: req.params.id,
      reportedBy: req.user.sub,
      reason
    });

    // Update post report count
    post.isReported = true;
    post.reportCount += 1;
    await post.save();

    res.json({ ok: true, message: "Post reported successfully" });
  } catch (error) {
    console.error("Report post error:", error);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

// Get all reports (admin only)
app.get("/api/community/reports", authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ ok: false, message: "Admin access required" });
  }

  try {
    const reports = await PostReport.find({ status: 'pending' })
      .populate('postId')
      .populate('reportedBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({ ok: true, reports });
  } catch (error) {
    console.error("Get reports error:", error);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

// Resolve report (admin only)
app.put("/api/community/reports/:id/resolve", authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ ok: false, message: "Admin access required" });
  }

  try {
    const report = await PostReport.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ ok: false, message: "Report not found" });
    }

    report.status = 'resolved';
    await report.save();

    res.json({ ok: true, message: "Report resolved" });
  } catch (error) {
    console.error("Resolve report error:", error);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

// Pin/unpin post (admin only)
app.put("/api/community/posts/:id/pin", authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ ok: false, message: "Admin access required" });
  }

  try {
    const post = await CommunityPost.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ ok: false, message: "Post not found" });
    }

    post.isPinned = !post.isPinned;
    await post.save();

    res.json({ ok: true, isPinned: post.isPinned });
  } catch (error) {
    console.error("Pin post error:", error);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

// Get posts by specific user
app.get("/api/community/users/:userId/posts", async (req, res) => {
  try {
    const posts = await CommunityPost.find({ author: req.params.userId })
      .populate('author', 'name email')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ ok: true, posts });
  } catch (error) {
    console.error("Get user posts error:", error);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

// Get trending tags
app.get("/api/community/tags/trending", async (req, res) => {
  try {
    const posts = await CommunityPost.find({}).select('tags');
    const tagCounts = {};

    posts.forEach(post => {
      post.tags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });

    const trendingTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag, count]) => ({ tag, count }));

    res.json({ ok: true, tags: trendingTags });
  } catch (error) {
    console.error("Get trending tags error:", error);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

// Time Attack endpoints
const TIME_ATTACK_QUESTION_COUNT = 5;

app.post("/api/time-attack/start", authMiddleware, async (req, res) => {
  try {
    const { type, difficulty } = req.body || {};
    const query = { published: true };
    if (type) query.type = type;
    if (difficulty) query.difficulty = difficulty;

    const questions = await Game.aggregate([
      { $match: query },
      { $sample: { size: TIME_ATTACK_QUESTION_COUNT } },
      { $project: { _id: 1 } }
    ]);

    if (questions.length < 1) {
      return res.status(404).json({ ok: false, message: "Not enough questions available to start a Time Attack session." });
    }

    const questionIds = questions.map(q => q._id);

    const session = await TimeAttackSession.create({
      studentId: req.user.sub,
      questions: questionIds,
    });

    const firstQuestion = await Game.findById(session.questions[0]).select("-createdBy -published");

    res.json({ ok: true, sessionId: session._id, question: firstQuestion });

  } catch (error) {
    console.error("Time Attack start error:", error);
    res.status(500).json({ ok: false, message: "Server error starting Time Attack session" });
  }
});

app.post("/api/time-attack/submit", authMiddleware, async (req, res) => {
  try {
    const { sessionId, isCorrect } = req.body;
    if (!sessionId || isCorrect === undefined) {
      return res.status(400).json({ ok: false, message: "sessionId and isCorrect are required" });
    }

    const session = await TimeAttackSession.findById(sessionId);
    if (!session || session.studentId.toString() !== req.user.sub || session.status !== 'in-progress') {
      return res.status(404).json({ ok: false, message: "Active session not found" });
    }

    if (isCorrect) {
      session.score += 10; // Add 10 points for a correct answer
    }

    // Log the individual submission
    await GameSubmission.create({
      gameId: session.questions[session.currentQuestionIndex],
      studentId: req.user.sub,
      isCorrect: !!isCorrect
    });

    session.currentQuestionIndex += 1;

    if (session.currentQuestionIndex >= session.questions.length) {
      // Game over
      session.status = 'completed';
      session.endTime = new Date();
      const timeTakenMs = session.endTime - session.startTime;

      await TimeAttackLeaderboard.create({
        studentId: req.user.sub,
        score: session.score,
        timeTakenMs: timeTakenMs
      });

      await session.save();

      return res.json({ ok: true, status: 'completed', finalScore: session.score, timeTakenMs });

    } else {
      // Next question
      await session.save();
      const nextQuestion = await Game.findById(session.questions[session.currentQuestionIndex]).select("-createdBy -published");
      return res.json({ ok: true, status: 'in-progress', question: nextQuestion });
    }

  } catch (error) {
    console.error("Time Attack submit error:", error);
    res.status(500).json({ ok: false, message: "Server error submitting answer" });
  }
});


app.get("/api/leaderboard/time-attack", async (req, res) => {
  try {
    const leaderboard = await TimeAttackLeaderboard.find({})
      .sort({ score: -1, timeTakenMs: 1 })
      .limit(10)
      .populate('studentId', 'name');

    res.json({ ok: true, leaderboard });
  } catch (error) {
    console.error("Get Time Attack leaderboard error:", error);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

// Custom Course Management Endpoints

// Seed Subjects
async function seedSubjects() {
  const subjects = [
    { name: "DBMS", code: "DBMS101", icon: "🗄️", description: "Database Management Systems" },
    { name: "C Programming", code: "CS101", icon: "💻", description: "Introduction to C" },
    { name: "Web Technologies", code: "WEB101", icon: "🌐", description: "HTML, CSS, JS" },
    { name: "Mathematics", code: "MATH101", icon: "📐", description: "Engineering Mathematics" },
    { name: "Operating Systems", code: "OS101", icon: "⚙️", description: "OS Concepts" },
    { name: "TYL", code: "TYL101", icon: "🚀", description: "Tie Your Laces (Soft Skills)" }
  ];
  try {
    for (const s of subjects) {
      await Subject.findOneAndUpdate({ code: s.code }, s, { upsert: true });
    }
    console.log("Subjects seeded successfully");
  } catch (err) {
    console.error("Subject seeding failed:", err);
  }
}

app.get("/api/subjects", async (req, res) => {
  try {
    const subjects = await Subject.find({}).sort({ name: 1 });
    res.json({ ok: true, subjects });
  } catch (error) {
    res.status(500).json({ ok: false, message: "Failed to fetch subjects" });
  }
});

app.get("/api/materials/:subjectId", authMiddleware, async (req, res) => {
  try {
    const materials = await Material.find({ subjectId: req.params.subjectId }).sort({ createdAt: -1 });
    res.json({ ok: true, materials });
  } catch (error) {
    res.status(500).json({ ok: false, message: "Failed to fetch materials" });
  }
});

// Configure Multer for preserving extensions


app.post("/api/materials", authMiddleware, uploadWithExt.single('file'), async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ ok: false, message: "Only admins can upload" });
  }
  const { subjectId, title, type } = req.body;
  const file = req.file;

  if (!subjectId || !file || !title) {
    return res.status(400).json({ ok: false, message: "Missing required fields" });
  }

  try {
    const material = await Material.create({
      title,
      type: type || 'file',
      fileUrl: `/uploads/${file.filename}`,
      subjectId,
      createdBy: req.user.sub
    });

    // Create Notification
    const subject = await Subject.findById(subjectId);
    const subjectName = subject ? subject.name : 'a subject';

    await Notification.create({
      recipientRole: 'student',
      title: `New Material in ${subjectName}`,
      message: `New ${type} added: ${title}`,
      type: 'material',
      link: `/student-courses.html?subject=${subjectId}`
    });

    res.json({ ok: true, material });
  } catch (error) {
    console.error("Material upload error:", error);
    res.status(500).json({ ok: false, message: "Upload failed" });
  }
});

// Delete material
app.delete("/api/materials/:id", authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ ok: false, message: "Only admins can delete materials" });
  }

  try {
    const material = await Material.findById(req.params.id);
    if (!material) {
      return res.status(404).json({ ok: false, message: "Material not found" });
    }

    // Delete file from disk
    const filePath = path.join(process.cwd(), material.fileUrl);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await Material.findByIdAndDelete(req.params.id);
    res.json({ ok: true, message: "Material deleted successfully" });
  } catch (error) {
    console.error("Delete material error:", error);
    res.status(500).json({ ok: false, message: "Failed to delete material" });
  }
});

// Update material metadata
app.put("/api/materials/:id", authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ ok: false, message: "Only admins can update materials" });
  }

  const { title, description, pinned, folder } = req.body;

  try {
    const material = await Material.findByIdAndUpdate(
      req.params.id,
      { title, description, pinned, folder },
      { new: true }
    );

    if (!material) {
      return res.status(404).json({ ok: false, message: "Material not found" });
    }

    res.json({ ok: true, material });
  } catch (error) {
    console.error("Update material error:", error);
    res.status(500).json({ ok: false, message: "Failed to update material" });
  }
});

// Bulk upload materials
app.post("/api/materials/bulk", authMiddleware, uploadWithExt.array('files', 10), async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ ok: false, message: "Only admins can upload" });
  }

  const { subjectId, folder } = req.body;
  const files = req.files;

  if (!subjectId || !files || files.length === 0) {
    return res.status(400).json({ ok: false, message: "Missing required fields" });
  }

  try {
    const materials = [];

    for (const file of files) {
      const ext = path.extname(file.originalname).toLowerCase();
      let type = 'file';
      if (ext === '.pdf') type = 'PDF';
      else if (['.ppt', '.pptx'].includes(ext)) type = 'PPT';
      else if (['.doc', '.docx'].includes(ext)) type = 'DOC';
      else if (['.jpg', '.jpeg', '.png', '.gif'].includes(ext)) type = 'Image';
      else if (['.mp4', '.avi', '.mov'].includes(ext)) type = 'Video';

      const material = await Material.create({
        title: file.originalname,
        type,
        fileUrl: `/uploads/${file.filename}`,
        subjectId,
        createdBy: req.user.sub,
        folder: folder || 'General',
        fileSize: file.size
      });

      materials.push(material);
    }

    // Create notification for bulk upload
    const subject = await Subject.findById(subjectId);
    const subjectName = subject ? subject.name : 'a subject';

    await Notification.create({
      recipientRole: 'student',
      title: `New Materials in ${subjectName}`,
      message: `${materials.length} new materials added`,
      type: 'material',
      link: `/student-courses.html?subject=${subjectId}`
    });

    res.json({ ok: true, materials, count: materials.length });
  } catch (error) {
    console.error("Bulk upload error:", error);
    res.status(500).json({ ok: false, message: "Bulk upload failed" });
  }
});

// Get material analytics for a subject
app.get("/api/materials/:subjectId/stats", authMiddleware, async (req, res) => {
  try {
    const materials = await Material.find({ subjectId: req.params.subjectId });

    const stats = {
      totalMaterials: materials.length,
      totalDownloads: materials.reduce((sum, m) => sum + (m.downloads || 0), 0),
      byType: {},
      byFolder: {},
      mostDownloaded: materials.sort((a, b) => (b.downloads || 0) - (a.downloads || 0)).slice(0, 5),
      recentUploads: materials.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5)
    };

    // Count by type
    materials.forEach(m => {
      stats.byType[m.type] = (stats.byType[m.type] || 0) + 1;
      stats.byFolder[m.folder] = (stats.byFolder[m.folder] || 0) + 1;
    });

    res.json({ ok: true, stats });
  } catch (error) {
    console.error("Stats error:", error);
    res.status(500).json({ ok: false, message: "Failed to fetch stats" });
  }
});

// Track material download
app.post("/api/materials/:id/download", authMiddleware, async (req, res) => {
  try {
    await Material.findByIdAndUpdate(req.params.id, { $inc: { downloads: 1 } });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, message: "Failed to track download" });
  }
});

// Send manual notification
app.post("/api/notifications/send", authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ ok: false, message: "Only admins can send notifications" });
  }

  const { title, message, recipientRole, link } = req.body;

  if (!title || !message) {
    return res.status(400).json({ ok: false, message: "Title and message required" });
  }

  try {
    const notification = await Notification.create({
      recipientRole: recipientRole || 'student',
      title,
      message,
      type: 'info',
      link: link || ''
    });

    res.json({ ok: true, notification });
  } catch (error) {
    console.error("Send notification error:", error);
    res.status(500).json({ ok: false, message: "Failed to send notification" });
  }
});

app.get("/api/notifications", authMiddleware, async (req, res) => {
  try {
    const notifications = await Notification.find({
      recipientRole: { $in: ['all', req.user.role] }
    }).sort({ createdAt: -1 }).limit(20);
    res.json({ ok: true, notifications });
  } catch (error) {
    res.status(500).json({ ok: false, message: "Failed to fetch notifications" });
  }
});


app.post("/api/logout", (req, res) => {
  res.clearCookie("mindwave_token");
  res.json({ ok: true, message: "Logged out successfully" });
});


// Google Classroom Integration

const oauth2Client = new google.auth.OAuth2(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI
);

const upload = multer({ dest: 'uploads/' });

app.get("/auth/google", (req, res) => {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return res.status(500).send("Google Credentials not configured in server.");
  }
  const scopes = [
    "https://www.googleapis.com/auth/classroom.courses.readonly",
    "https://www.googleapis.com/auth/classroom.coursework.me",
    "https://www.googleapis.com/auth/drive.file"
  ];
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
    state: req.cookies.mindwave_token // Pass user token to link account
  });
  res.redirect(url);
});

app.get("/auth/google/callback", async (req, res) => {
  const { code, state } = req.query;
  if (!code) return res.status(400).send("No code provided");

  try {
    const { tokens } = await oauth2Client.getToken(code);

    // Verify user from state (original token)
    if (!state) return res.status(401).send("Authentication failed: No state returned");

    let userId;
    try {
      const decoded = jwt.verify(state, JWT_SECRET);
      userId = decoded.sub;
    } catch (e) {
      return res.status(401).send("Authentication failed: Invalid state token");
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).send("User not found");

    user.googleAccessToken = tokens.access_token;
    if (tokens.refresh_token) {
      user.googleRefreshToken = tokens.refresh_token;
    }
    await user.save();

    res.redirect("/"); // Redirect back to homepage
  } catch (error) {
    console.error("Google Auth Error:", error);
    res.status(500).send("Authentication failed");
  }
});

// GitHub Integration
app.get("/auth/github", (req, res) => {
  if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
    return res.status(500).send("GitHub Credentials not configured.");
  }
  const redirectUri = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${GITHUB_REDIRECT_URI}&scope=repo,user&state=${req.cookies.mindwave_token}`;
  res.redirect(redirectUri);
});

app.get("/auth/github/callback", async (req, res) => {
  const { code, state } = req.query;
  if (!code) return res.status(400).send("No code provided");

  try {
    // Verify user from state
    if (!state) return res.status(401).send("Authentication failed: No state returned");

    let userId;
    try {
      const decoded = jwt.verify(state, JWT_SECRET);
      userId = decoded.sub;
    } catch (e) {
      return res.status(401).send("Authentication failed: Invalid state token");
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).send("User not found");

    // Exchange code for token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: GITHUB_REDIRECT_URI
      })
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      throw new Error(tokenData.error_description);
    }

    user.githubAccessToken = tokenData.access_token;

    // Fetch GitHub username
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `token ${tokenData.access_token}`,
        'User-Agent': 'Mindwave-App'
      }
    });
    const userData = await userResponse.json();
    if (userData.login) {
      user.githubUsername = userData.login;
    }

    await user.save();
    res.redirect("/student-github.html");
  } catch (error) {
    console.error("GitHub Auth Error:", error);
    res.status(500).send("GitHub Authentication failed");
  }
});

app.get("/api/github/repos", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.sub);
    if (!user.githubAccessToken) {
      return res.json({ ok: true, connected: false, repos: [] });
    }

    const response = await fetch('https://api.github.com/user/repos?sort=updated&per_page=10', {
      headers: {
        'Authorization': `token ${user.githubAccessToken}`,
        'User-Agent': 'Mindwave-App'
      }
    });

    if (response.status === 401) {
      return res.json({ ok: true, connected: false, repos: [], error: "Token expired" });
    }

    const repos = await response.json();
    res.json({ ok: true, connected: true, repos });
  } catch (error) {
    console.error("GitHub Repos Error:", error);
    res.status(500).json({ ok: false, message: "Failed to fetch repos" });
  }
});

app.get("/api/github/commits/:owner/:repo", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.sub);
    if (!user.githubAccessToken) {
      return res.status(401).json({ ok: false, message: "GitHub not connected" });
    }

    const { owner, repo } = req.params;
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=10`, {
      headers: {
        'Authorization': `token ${user.githubAccessToken}`,
        'User-Agent': 'Mindwave-App'
      }
    });

    const commits = await response.json();
    res.json({ ok: true, commits });
  } catch (error) {
    console.error("GitHub Commits Error:", error);
    res.status(500).json({ ok: false, message: "Failed to fetch commits" });
  }
});

app.post("/api/github/submit-assignment", authMiddleware, async (req, res) => {
  try {
    const { repoUrl, comments } = req.body;
    // In a real app, this would save to a submission schema
    // For now, we'll just log it and return success
    console.log(`Assignment submitted by ${req.user.sub}: ${repoUrl}`);

    res.json({ ok: true, message: "Assignment submitted successfully via GitHub!" });
  } catch (error) {
    res.status(500).json({ ok: false, message: "Submission failed" });
  }
});

// Zoom Integration
app.get("/auth/zoom", (req, res) => {
  if (!ZOOM_CLIENT_ID || !ZOOM_CLIENT_SECRET) {
    return res.status(500).send("Zoom Credentials not configured.");
  }
  const redirectUri = `https://zoom.us/oauth/authorize?response_type=code&client_id=${ZOOM_CLIENT_ID}&redirect_uri=${ZOOM_REDIRECT_URI}&state=${req.cookies.mindwave_token}`;
  res.redirect(redirectUri);
});

app.get("/auth/zoom/callback", async (req, res) => {
  const { code, state } = req.query;
  if (!code) return res.status(400).send("No code provided");

  try {
    if (!state) return res.status(401).send("Authentication failed: No state returned");

    let userId;
    try {
      const decoded = jwt.verify(state, JWT_SECRET);
      userId = decoded.sub;
    } catch (e) {
      return res.status(401).send("Authentication failed: Invalid state token");
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).send("User not found");

    const tokenResponse = await fetch('https://zoom.us/oauth/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: ZOOM_REDIRECT_URI
      })
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      throw new Error(tokenData.error_description || tokenData.reason);
    }

    user.zoomAccessToken = tokenData.access_token;
    user.zoomRefreshToken = tokenData.refresh_token;
    await user.save();

    res.redirect("/student-zoom.html");
  } catch (error) {
    console.error("Zoom Auth Error:", error);
    res.status(500).send("Zoom Authentication failed");
  }
});

app.get("/api/zoom/meetings", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.sub);
    if (!user.zoomAccessToken) {
      return res.json({ ok: true, connected: false, meetings: [] });
    }

    const response = await fetch('https://api.zoom.us/v2/users/me/meetings?type=upcoming', {
      headers: {
        'Authorization': `Bearer ${user.zoomAccessToken}`
      }
    });

    if (response.status === 401) {
      // Token expired - in a real app we'd use refresh token here
      return res.json({ ok: true, connected: false, meetings: [], error: "Token expired" });
    }

    const data = await response.json();
    res.json({ ok: true, connected: true, meetings: data.meetings || [] });
  } catch (error) {
    console.error("Zoom Meetings Error:", error);
    res.status(500).json({ ok: false, message: "Failed to fetch meetings" });
  }
});

app.get("/api/zoom/recordings", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.sub);
    if (!user.zoomAccessToken) {
      return res.status(401).json({ ok: false, message: "Zoom not connected" });
    }

    // Get recordings from the last month
    const fromDate = new Date();
    fromDate.setMonth(fromDate.getMonth() - 1);
    const fromStr = fromDate.toISOString().split('T')[0];

    const response = await fetch(`https://api.zoom.us/v2/users/me/recordings?from=${fromStr}`, {
      headers: {
        'Authorization': `Bearer ${user.zoomAccessToken}`
      }
    });

    const data = await response.json();
    res.json({ ok: true, recordings: data.meetings || [] });
  } catch (error) {
    console.error("Zoom Recordings Error:", error);
    res.status(500).json({ ok: false, message: "Failed to fetch recordings" });
  }
});

async function getGoogleClient(user) {
  if (!user.googleAccessToken) return null;

  const client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
  );

  client.setCredentials({
    access_token: user.googleAccessToken,
    refresh_token: user.googleRefreshToken
  });

  // Handle token refresh if needed (simplified)
  return client;
}

app.get("/api/classroom/courses", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.sub);
    const auth = await getGoogleClient(user);

    if (!auth) {
      return res.json({ ok: true, connected: false, courses: [] });
    }

    const classroom = google.classroom({ version: "v1", auth });
    const response = await classroom.courses.list({
      courseStates: ["ACTIVE"],
      pageSize: 10
    });

    const courses = response.data.courses || [];
    res.json({ ok: true, connected: true, courses });
  } catch (error) {
    console.error("Classroom API Error:", error);
    if (error.code === 401) {
      // Token might be invalid
      return res.json({ ok: true, connected: false, courses: [], error: "Token expired" });
    }
    res.status(500).json({ ok: false, message: "Failed to fetch courses" });
  }
});

// Get coursework (assignments) for a specific course
app.get("/api/classroom/coursework/:courseId", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.sub);
    const auth = await getGoogleClient(user);

    if (!auth) {
      return res.json({ ok: true, connected: false, coursework: [] });
    }

    const classroom = google.classroom({ version: "v1", auth });
    const response = await classroom.courses.courseWork.list({
      courseId: req.params.courseId,
      pageSize: 20,
      orderBy: "dueDate desc"
    });

    const coursework = response.data.courseWork || [];
    res.json({ ok: true, connected: true, coursework });
  } catch (error) {
    console.error("Coursework API Error:", error);
    if (error.code === 401) {
      return res.json({ ok: true, connected: false, coursework: [], error: "Token expired" });
    }
    res.status(500).json({ ok: false, message: "Failed to fetch coursework" });
  }
});

// Get materials for a specific course
app.get("/api/classroom/materials/:courseId", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.sub);
    const auth = await getGoogleClient(user);

    if (!auth) {
      return res.json({ ok: true, connected: false, materials: [] });
    }

    const classroom = google.classroom({ version: "v1", auth });
    const response = await classroom.courses.courseWorkMaterials.list({
      courseId: req.params.courseId,
      pageSize: 20
    });

    const materials = response.data.courseWorkMaterial || [];
    res.json({ ok: true, connected: true, materials });
  } catch (error) {
    console.error("Materials API Error:", error);
    if (error.code === 401) {
      return res.json({ ok: true, connected: false, materials: [], error: "Token expired" });
    }
    res.status(500).json({ ok: false, message: "Failed to fetch materials" });
  }
});

app.post("/api/classroom/upload", authMiddleware, upload.single('file'), async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ ok: false, message: "Only admins can upload" });
  }

  const { courseId } = req.body;
  const file = req.file;

  if (!courseId || !file) {
    return res.status(400).json({ ok: false, message: "Course ID and file are required" });
  }

  try {
    const user = await User.findById(req.user.sub);
    const auth = await getGoogleClient(user);
    if (!auth) return res.status(401).json({ ok: false, message: "Google account not connected" });

    const drive = google.drive({ version: "v3", auth });
    const classroom = google.classroom({ version: "v1", auth });

    // 1. Upload to Drive
    const driveResponse = await drive.files.create({
      requestBody: {
        name: file.originalname,
        mimeType: file.mimetype
      },
      media: {
        mimeType: file.mimetype,
        body: fs.createReadStream(file.path)
      }
    });

    const fileId = driveResponse.data.id;

    // 2. Add to Classroom as CourseWork (Material)
    await classroom.courses.courseWorkMaterials.create({
      courseId: courseId,
      requestBody: {
        title: `New Material: ${file.originalname}`,
        materials: [
          {
            driveFile: {
              driveFile: { id: fileId }
            }
          }
        ],
        state: "PUBLISHED"
      }
    });

    // Cleanup temp file
    fs.unlinkSync(file.path);

    res.json({ ok: true, message: "File uploaded to Classroom successfully" });

  } catch (error) {
    console.error("Upload Error:", error);
    res.status(500).json({ ok: false, message: "Upload failed" });
  }
});

// ============================================
// CHATBOT ENDPOINT - Hugging Face with Gemini Fallback
// ============================================
app.post("/api/chat", async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (!message) {
      return res.status(400).json({ ok: false, error: 'Message is required' });
    }

    const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY;
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    let reply = '';
    let usedAPI = 'huggingface';

    // System prompt to train chatbot about MindWave platform
    const SYSTEM_PROMPT = `You are the MindWave AI Assistant, a helpful chatbot integrated into the MindWave educational platform.

**About MindWave:**
- Interactive learning platform for students and faculty
- Features gamified learning, course materials, announcements, and community
- Students play educational games, track progress, and compete on leaderboards

**Platform Features:**
1. Dashboard - Main hub with announcements, updates, and recent games
2. Games - Interactive challenges (Quiz, SQL Builder, Code Unjumble, Syntax Fill-in, Bug Hunt, Tech Sorter)
3. Leaderboard - Student rankings based on game scores
4. Courses - Access course materials, notes, PDFs, and resources
5. Community - Student discussions and collaboration
6. GitHub Repos - View and manage connected repositories
7. Zoom Classes - Join virtual classes and meetings

**Navigation:**
- Students access features via sidebar menu
- Faculty can create games, post announcements, and manage content
- Games are in "Games" section or "Playground Dropzone" on dashboard

**Common Questions:**
- "How do I play games?" → Go to Games section, click any game card, then click Play
- "Where are my scores?" → Check the Leaderboard section
- "How do I access course materials?" → Go to Courses section
- "Can't find a game?" → Make sure it's published by faculty and refresh the page

**Your Role:**
- Help students navigate the platform
- Explain how features work
- Answer questions about games and scoring
- Provide study tips and encouragement
- Be friendly, concise, and supportive

Keep responses short and helpful. Use emojis occasionally. If you don't know something specific, suggest contacting their instructor.`;

    // Try Hugging Face first
    if (HUGGINGFACE_API_KEY) {
      try {
        console.log('🤖 Using Hugging Face API (OpenAI Compatible)...');
        console.log('URL:', 'https://router.huggingface.co/v1/chat/completions');
        console.log('Key present:', !!HUGGINGFACE_API_KEY);

        const hfResponse = await fetch(
          'https://router.huggingface.co/v1/chat/completions',
          {
            headers: {
              'Authorization': `Bearer ${HUGGINGFACE_API_KEY}`,
              'Content-Type': 'application/json'
            },
            method: 'POST',
            body: JSON.stringify({
              model: "meta-llama/Meta-Llama-3-8B-Instruct",
              messages: [
                { role: "system", content: SYSTEM_PROMPT },
                ...history.map(msg => ({
                  role: msg.role === 'model' ? 'assistant' : 'user',
                  content: msg.parts[0].text
                })),
                { role: "user", content: message }
              ],
              max_tokens: 500,
              temperature: 0.7
            })
          }
        );

        if (hfResponse.ok) {
          const data = await hfResponse.json();
          reply = data.choices[0]?.message?.content || '';

          if (!reply) {
            throw new Error('Empty response from Hugging Face');
          }

          console.log('✅ Hugging Face response received');
        } else {
          const errorText = await hfResponse.text();
          throw new Error(`Hugging Face API error: ${hfResponse.status} - ${errorText}`);
        }
      } catch (hfError) {
        console.log('❌ Hugging Face failed:', hfError.message);
        usedAPI = 'gemini';

        // Fallback to Gemini
        if (!GEMINI_API_KEY) {
          throw new Error('No AI API available. Please configure HUGGINGFACE_API_KEY or GEMINI_API_KEY');
        }

        console.log('🔄 Falling back to Gemini...');
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

        // Try to discover available models
        let modelToUse = 'gemini-pro';
        try {
          const listResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`);
          const listData = await listResponse.json();

          if (listData.models && listData.models.length > 0) {
            const compatibleModels = listData.models.filter(m =>
              m.supportedGenerationMethods &&
              m.supportedGenerationMethods.includes('generateContent')
            );

            const preferredPatterns = [
              /gemini-2\.0-flash(?!-thinking)/,
              /gemini-flash/,
              /gemini/
            ];

            for (const pattern of preferredPatterns) {
              const found = compatibleModels.find(m => pattern.test(m.name));
              if (found) {
                modelToUse = found.name.replace('models/', '');
                break;
              }
            }
          }
        } catch (listError) {
          console.log('Model discovery failed, using default:', modelToUse);
        }

        const model = genAI.getGenerativeModel({
          model: modelToUse,
          systemInstruction: SYSTEM_PROMPT
        });
        const chat = model.startChat({
          history: history,
          generationConfig: {
            maxOutputTokens: 500,
            temperature: 0.7,
          },
        });

        const result = await chat.sendMessage(message);
        reply = result.response.text();
        console.log('✅ Gemini response received');
      }
    } else if (GEMINI_API_KEY) {
      // Use Gemini if no Hugging Face key
      usedAPI = 'gemini';
      console.log('🤖 Using Gemini API (no Hugging Face key)...');

      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

      // Try to discover available models
      let modelToUse = 'gemini-pro';
      try {
        const listResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`);
        const listData = await listResponse.json();

        if (listData.models && listData.models.length > 0) {
          const compatibleModels = listData.models.filter(m =>
            m.supportedGenerationMethods &&
            m.supportedGenerationMethods.includes('generateContent')
          );

          const preferredPatterns = [
            /gemini-2\.0-flash(?!-thinking)/,
            /gemini-flash/,
            /gemini/
          ];

          for (const pattern of preferredPatterns) {
            const found = compatibleModels.find(m => pattern.test(m.name));
            if (found) {
              modelToUse = found.name.replace('models/', '');
              break;
            }
          }
        }
      } catch (listError) {
        console.log('Model discovery failed, using default:', modelToUse);
      }

      const model = genAI.getGenerativeModel({
        model: modelToUse,
        systemInstruction: SYSTEM_PROMPT
      });
      const chat = model.startChat({
        history: history,
        generationConfig: {
          maxOutputTokens: 500,
          temperature: 0.7,
        },
      });

      const result = await chat.sendMessage(message);
      reply = result.response.text();
      console.log('✅ Gemini response received');
    } else {
      return res.status(500).json({
        ok: false,
        reply: "I'm not fully configured yet. Please add HUGGINGFACE_API_KEY or GEMINI_API_KEY to the .env file."
      });
    }

    res.json({
      ok: true,
      reply: reply,
      api: usedAPI
    });

  } catch (error) {
    console.error('❌ Chat Error:', error);
    res.status(500).json({
      ok: false,
      reply: "I'm having trouble connecting right now. Error: " + (error.message || 'Unknown error')
    });
  }

});

// ============================================
// AI GAME BUILDER ENDPOINT
// ============================================
app.post("/api/ai-game-builder", async (req, res) => {
  try {
    const { message, context = {} } = req.body;

    if (!message) {
      return res.status(400).json({ ok: false, error: 'Message is required' });
    }

    // Use admin-specific API key if available, otherwise fall back to regular key
    const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_ADMIN_API_KEY || process.env.HUGGINGFACE_API_KEY;
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    // Enhanced System prompt for AI Game Builder
    const GAME_BUILDER_PROMPT = `You are an AI Game Builder assistant for the MindWave educational platform. Your job is to help faculty create high-quality educational games through conversation.

**Supported Game Types:**
1. **quiz** - Multiple choice questions with 4 options
2. **sql-builder** - SQL query building with draggable blocks
3. **code-unjumble** - Reorder shuffled code lines
4. **syntax-fill** - Fill in missing code syntax
5. **bug-hunt** - Find and fix bugs in code
6. **tech-sorter** - Categorize technologies

**When to Suggest Each Game Type:**
- **Quiz**: Testing knowledge, concepts, definitions, theory
- **SQL Builder**: Database queries, JOIN operations, filtering, aggregation
- **Code Unjumble**: Code structure, syntax order, algorithm steps
- **Syntax Fill**: Missing keywords, parameters, operators, punctuation
- **Bug Hunt**: Debugging skills, error identification, code correction
- **Tech Sorter**: Categorization, classification, grouping concepts

**Common Admin Requests & How to Handle Them:**

"Create a quiz about Python loops"
→ Ask: How many questions? Difficulty level? Specific topics (for, while, nested)?

"Make an SQL challenge about JOIN operations"
→ Ask: Which JOINs? (INNER, LEFT, RIGHT, FULL) Difficulty? Number of tables?

"Generate a code unjumble for JavaScript arrays"
→ Ask: Which array methods? (map, filter, reduce) Difficulty? Code length?

"Create a fill-in exercise for CSS selectors"
→ Ask: Which selectors? (class, id, attribute) How many blanks?

"Build a bug hunt game for Java exceptions"
→ Ask: How many bugs? Types of bugs? (syntax, logic, runtime)

"Make a tech sorter about web technologies"
→ Ask: Which categories? (Frontend, Backend, Database, DevOps) How many items?

**Your Workflow:**
1. Greet warmly and ask what type of game they want
2. Ask clarifying questions about topic, difficulty, and specifics
3. Generate high-quality game data in proper JSON format
4. Show preview and allow modifications
5. When they say "publish", "create it", or "save it", return final JSON with action: "publish"

**Response Format:**

For conversation/questions:
{
  "action": "chat",
  "message": "Your conversational response here"
}

When generating a preview:
{
  "action": "preview",
  "gameData": { /* complete game JSON */ },
  "message": "Here's your game! Review it and say 'publish' to create it, or ask for changes like 'make it harder' or 'add 2 more questions'."
}

When they want to publish:
{
  "action": "publish",
  "gameData": { /* complete game JSON */ },
  "message": "Perfect! Publishing your game now!"
}

**Game Data Formats with Multiple Examples:**

=== QUIZ EXAMPLES ===

Example 1 - Basic Python Loops:
{
  "type": "quiz",
  "title": "Python Loops Fundamentals",
  "description": "Test your understanding of Python loop structures",
  "duration": 10,
  "questions": [
    {
      "text": "Which loop is used when you know the exact number of iterations?",
      "options": ["for loop", "while loop", "do-while loop", "infinite loop"],
      "correctIndex": 0,
      "points": 10,
      "explanation": "For loops are ideal when the number of iterations is known in advance."
    },
    {
      "text": "What does 'break' do in a loop?",
      "options": ["Skips current iteration", "Exits the loop completely", "Restarts the loop", "Does nothing"],
      "correctIndex": 1,
      "points": 10,
      "explanation": "The break statement terminates the loop immediately."
    }
  ],
  "totalPoints": 50,
  "published": true
}

Example 2 - Database Concepts:
{
  "type": "quiz",
  "title": "SQL JOIN Operations",
  "description": "Master different types of SQL JOINs",
  "duration": 15,
  "questions": [
    {
      "text": "Which JOIN returns all records from both tables?",
      "options": ["INNER JOIN", "LEFT JOIN", "RIGHT JOIN", "FULL OUTER JOIN"],
      "correctIndex": 3,
      "points": 15,
      "explanation": "FULL OUTER JOIN returns all records when there is a match in either table."
    },
    {
      "text": "What does INNER JOIN return?",
      "options": ["All records from left table", "All records from right table", "Only matching records", "All records from both"],
      "correctIndex": 2,
      "points": 15,
      "explanation": "INNER JOIN returns only the records that have matching values in both tables."
    }
  ],
  "totalPoints": 60,
  "published": true
}

=== SQL-BUILDER EXAMPLES ===

Example 1 - INNER JOIN:
{
  "type": "sql-builder",
  "title": "JOIN Operations Challenge",
  "description": "Build a query using INNER JOIN",
  "duration": 15,
  "brief": "Write a query to get all orders with customer names",
  "correctQuery": "SELECT customers.name, orders.order_id FROM customers INNER JOIN orders ON customers.id = orders.customer_id",
  "blocks": [
    "SELECT customers.name, orders.order_id",
    "FROM customers",
    "INNER JOIN orders",
    "ON customers.id = orders.customer_id"
  ],
  "distractors": [
    "LEFT JOIN orders",
    "WHERE customers.id = 1",
    "ORDER BY name",
    "GROUP BY customer_id",
    "LIMIT 10"
  ],
  "totalPoints": 100,
  "published": true
}

Example 2 - WHERE Clause Filtering:
{
  "type": "sql-builder",
  "title": "Filtering Customer Data",
  "description": "Use WHERE clause to filter records",
  "duration": 10,
  "brief": "Get all customers from California with age greater than 25",
  "correctQuery": "SELECT * FROM customers WHERE state = 'CA' AND age > 25",
  "blocks": [
    "SELECT *",
    "FROM customers",
    "WHERE state = 'CA'",
    "AND age > 25"
  ],
  "distractors": [
    "OR age < 25",
    "GROUP BY state",
    "ORDER BY name DESC",
    "LIMIT 100",
    "HAVING age > 25"
  ],
  "totalPoints": 80,
  "published": true
}

Example 3 - GROUP BY Aggregation:
{
  "type": "sql-builder",
  "title": "Aggregating Order Data",
  "description": "Count orders per customer using GROUP BY",
  "duration": 12,
  "brief": "Find how many orders each customer has placed",
  "correctQuery": "SELECT customer_id, COUNT(*) as order_count FROM orders GROUP BY customer_id",
  "blocks": [
    "SELECT customer_id, COUNT(*) as order_count",
    "FROM orders",
    "GROUP BY customer_id"
  ],
  "distractors": [
    "ORDER BY order_count DESC",
    "HAVING COUNT(*) > 5",
    "WHERE customer_id IS NOT NULL",
    "LIMIT 10",
    "JOIN customers ON orders.customer_id = customers.id"
  ],
  "totalPoints": 100,
  "published": true
}

=== CODE-UNJUMBLE EXAMPLES ===

Example 1 - JavaScript Array Map:
{
  "type": "code-unjumble",
  "title": "Array Map Method",
  "description": "Reorder the code to correctly use map()",
  "duration": 10,
  "brief": "Fix the array transformation code",
  "lines": [
    "const numbers = [1, 2, 3, 4, 5];",
    "const doubled = numbers.map(num => {",
    "  return num * 2;",
    "});",
    "console.log(doubled);"
  ],
  "totalPoints": 50,
  "published": true
}

Example 2 - Python Function Definition:
{
  "type": "code-unjumble",
  "title": "Python Function Structure",
  "description": "Arrange the function definition correctly",
  "duration": 10,
  "brief": "Order the lines to create a valid Python function",
  "lines": [
    "def calculate_average(numbers):",
    "    total = sum(numbers)",
    "    count = len(numbers)",
    "    average = total / count",
    "    return average"
  ],
  "totalPoints": 60,
  "published": true
}

Example 3 - CSS Flexbox Layout:
{
  "type": "code-unjumble",
  "title": "Flexbox Container Setup",
  "description": "Arrange CSS properties for flexbox",
  "duration": 8,
  "brief": "Order the CSS to create a centered flex container",
  "lines": [
    ".container {",
    "  display: flex;",
    "  justify-content: center;",
    "  align-items: center;",
    "  height: 100vh;",
    "}"
  ],
  "totalPoints": 50,
  "published": true
}

=== SYNTAX-FILL EXAMPLES ===

Example 1 - For Loop:
{
  "type": "syntax-fill",
  "title": "Complete the For Loop",
  "description": "Fill in the missing syntax",
  "duration": 10,
  "brief": "Complete the loop structure",
  "content": "for (let i = ___; i < ___; i___) {\\n  console.log(___);\\n}",
  "blanks": [
    { "answer": "0", "position": 0 },
    { "answer": "10", "position": 1 },
    { "answer": "++", "position": 2 },
    { "answer": "i", "position": 3 }
  ],
  "totalPoints": 50,
  "published": true
}

Example 2 - Function Parameters:
{
  "type": "syntax-fill",
  "title": "Function Definition Syntax",
  "description": "Complete the function declaration",
  "duration": 8,
  "brief": "Fill in the missing parts of the function",
  "content": "function calculateSum(___, ___) {\\n  ___ result = a ___ b;\\n  return ___;\\n}",
  "blanks": [
    { "answer": "a", "position": 0 },
    { "answer": "b", "position": 1 },
    { "answer": "let", "position": 2 },
    { "answer": "+", "position": 3 },
    { "answer": "result", "position": 4 }
  ],
  "totalPoints": 60,
  "published": true
}

Example 3 - If-Else Conditions:
{
  "type": "syntax-fill",
  "title": "Conditional Statement",
  "description": "Complete the if-else structure",
  "duration": 10,
  "brief": "Fill in the conditional syntax",
  "content": "___ (age ___ 18) {\\n  console.log('Adult');\\n} ___ {\\n  console.log('Minor');\\n}",
  "blanks": [
    { "answer": "if", "position": 0 },
    { "answer": ">=", "position": 1 },
    { "answer": "else", "position": 2 }
  ],
  "totalPoints": 45,
  "published": true
}

=== BUG-HUNT EXAMPLES ===

Example 1 - Simple Function Bugs:
{
  "type": "bug-hunt",
  "title": "Debug the Function",
  "description": "Find and fix 3 bugs in this code",
  "duration": 15,
  "brief": "Fix the bugs to make the function work correctly",
  "buggyCode": "function addNumbers(a, b) {\\n  let sum = a + b\\n  return Sum;\\n}\\nconsole.log(addNumbers(5, '10'));",
  "perfectCode": "function addNumbers(a, b) {\\n  let sum = a + b;\\n  return sum;\\n}\\nconsole.log(addNumbers(5, 10));",
  "bugCount": 3,
  "bugs": [
    { "line": 2, "type": "syntax", "fix": "Missing semicolon after sum = a + b" },
    { "line": 3, "type": "logic", "fix": "Variable name case mismatch: Sum should be sum" },
    { "line": 5, "type": "logic", "fix": "String '10' should be number 10" }
  ],
  "language": "javascript",
  "totalPoints": 100,
  "published": true
}

Example 2 - Array Manipulation Bugs:
{
  "type": "bug-hunt",
  "title": "Fix Array Operations",
  "description": "Debug array filtering and mapping",
  "duration": 12,
  "brief": "Correct the bugs in array methods",
  "buggyCode": "const nums = [1, 2, 3, 4, 5];\\nconst evens = nums.filter(n => n % 2 = 0);\\nconst doubled = evens.map(n => n * 2)\\nconsole.log(doubled);",
  "perfectCode": "const nums = [1, 2, 3, 4, 5];\\nconst evens = nums.filter(n => n % 2 === 0);\\nconst doubled = evens.map(n => n * 2);\\nconsole.log(doubled);",
  "bugCount": 2,
  "bugs": [
    { "line": 2, "type": "syntax", "fix": "Use === for comparison, not = (assignment operator)" },
    { "line": 3, "type": "syntax", "fix": "Missing semicolon after map operation" }
  ],
  "language": "javascript",
  "totalPoints": 80,
  "published": true
}

Example 3 - Python Loop Bugs:
{
  "type": "bug-hunt",
  "title": "Debug Python Loop",
  "description": "Fix indentation and logic errors",
  "duration": 15,
  "brief": "Correct the Python loop bugs",
  "buggyCode": "def print_numbers():\\nfor i in range(5):\\nprint(i)\\nprint('Done')",
  "perfectCode": "def print_numbers():\\n    for i in range(5):\\n        print(i)\\n    print('Done')",
  "bugCount": 2,
  "bugs": [
    { "line": 2, "type": "syntax", "fix": "Missing indentation for for loop" },
    { "line": 3, "type": "syntax", "fix": "Missing indentation for print(i)" }
  ],
  "language": "python",
  "totalPoints": 90,
  "published": true
}

=== TECH-SORTER EXAMPLES ===

Example 1 - Web Technologies:
{
  "type": "tech-sorter",
  "title": "Categorize Web Technologies",
  "description": "Sort technologies into correct categories",
  "duration": 10,
  "brief": "Drag each technology to its category",
  "items": ["React", "MongoDB", "Express.js", "Node.js", "PostgreSQL", "Vue.js", "Redis", "Angular"],
  "categories": ["Frontend", "Backend", "Database"],
  "correctMapping": {
    "React": "Frontend",
    "Vue.js": "Frontend",
    "Angular": "Frontend",
    "Express.js": "Backend",
    "Node.js": "Backend",
    "MongoDB": "Database",
    "PostgreSQL": "Database",
    "Redis": "Database"
  },
  "totalPoints": 50,
  "published": true
}

Example 2 - Programming Paradigms:
{
  "type": "tech-sorter",
  "title": "Programming Paradigms",
  "description": "Classify programming languages by paradigm",
  "duration": 12,
  "brief": "Sort languages into their primary paradigm",
  "items": ["Java", "Haskell", "JavaScript", "Python", "Lisp", "C++", "Scala", "Ruby"],
  "categories": ["Object-Oriented", "Functional", "Multi-Paradigm"],
  "correctMapping": {
    "Java": "Object-Oriented",
    "C++": "Object-Oriented",
    "Haskell": "Functional",
    "Lisp": "Functional",
    "JavaScript": "Multi-Paradigm",
    "Python": "Multi-Paradigm",
    "Scala": "Multi-Paradigm",
    "Ruby": "Multi-Paradigm"
  },
  "totalPoints": 60,
  "published": true
}

Example 3 - Data Structures:
{
  "type": "tech-sorter",
  "title": "Data Structure Categories",
  "description": "Group data structures by type",
  "duration": 10,
  "brief": "Categorize each data structure",
  "items": ["Array", "Binary Tree", "Hash Table", "Linked List", "AVL Tree", "Stack", "Queue", "Graph"],
  "categories": ["Linear", "Tree-Based", "Hash-Based", "Graph-Based"],
  "correctMapping": {
    "Array": "Linear",
    "Linked List": "Linear",
    "Stack": "Linear",
    "Queue": "Linear",
    "Binary Tree": "Tree-Based",
    "AVL Tree": "Tree-Based",
    "Hash Table": "Hash-Based",
    "Graph": "Graph-Based"
  },
  "totalPoints": 70,
  "published": true
}

**Difficulty Level Guidelines:**

BEGINNER:
- Quiz: 3-5 questions, basic concepts, clear options
- SQL: Simple SELECT, WHERE clauses
- Unjumble: 3-5 lines, basic syntax
- Fill-in: 2-4 blanks, common keywords
- Bug Hunt: 1-2 obvious bugs (syntax errors)
- Sorter: 6-8 items, 2-3 clear categories

INTERMEDIATE:
- Quiz: 5-8 questions, applied knowledge, tricky options
- SQL: JOINs, GROUP BY, basic subqueries
- Unjumble: 5-8 lines, functions/methods
- Fill-in: 4-6 blanks, operators and logic
- Bug Hunt: 2-4 bugs (syntax + logic)
- Sorter: 8-12 items, 3-4 categories

ADVANCED:
- Quiz: 8-10 questions, edge cases, subtle differences
- SQL: Complex JOINs, nested subqueries, window functions
- Unjumble: 8-12 lines, classes/algorithms
- Fill-in: 6-10 blanks, complex expressions
- Bug Hunt: 4-6 bugs (syntax + logic + runtime)
- Sorter: 12-16 items, 4-5 overlapping categories

**Quality Guidelines:**
- Questions should be clear and unambiguous
- Options should be plausible (no obvious wrong answers)
- Explanations should be educational and helpful
- Code should be syntactically correct and follow best practices
- Difficulty should match admin's request
- Points should be reasonable (10-20 per question for quiz, 50-100 for other types)
- Always include proper JSON structure
- SQL queries should be executable and realistic
- Bugs should be educational (common mistakes students make)
- Distractors should be tempting but incorrect
- Categories should be balanced (similar number of items per category)

**Handling Modifications:**
- "Make it harder" → Increase complexity, add edge cases, more items/questions
- "Add more questions" → Generate additional questions on same topic
- "Change question 2" → Modify specific question while keeping others
- "Make it shorter" → Reduce duration or number of questions/items
- "Add more bugs" → Increase bug count in bug-hunt games
- "Simpler SQL" → Use basic SELECT/WHERE instead of JOINs

**Topic-Specific Tips:**

DATABASE (SQL Builder):
- Use realistic table names (customers, orders, products)
- Include proper JOIN syntax
- Add useful distractors (ORDER BY, GROUP BY, LIMIT)
- Vary query complexity based on difficulty

JAVASCRIPT (Unjumble, Fill-in, Bug Hunt):
- Use modern ES6+ syntax (arrow functions, const/let)
- Include common methods (map, filter, reduce)
- Add realistic bugs (=== vs ==, missing semicolons)

PYTHON (Unjumble, Fill-in, Bug Hunt):
- Focus on indentation issues
- Use common patterns (list comprehensions, functions)
- Include type-related bugs

CSS (Unjumble, Fill-in):
- Use modern layouts (flexbox, grid)
- Include selectors and properties
- Show proper syntax structure

Be conversational, helpful, and generate high-quality educational content. Always ensure JSON is properly formatted and complete. When in doubt, ask clarifying questions rather than making assumptions.`;

    let reply = '';
    let gameData = null;
    let action = 'chat';

    // Try Hugging Face first
    if (HUGGINGFACE_API_KEY) {
      try {
        const hfResponse = await fetch(
          'https://router.huggingface.co/v1/chat/completions',
          {
            headers: {
              'Authorization': `Bearer ${HUGGINGFACE_API_KEY}`,
              'Content-Type': 'application/json'
            },
            method: 'POST',
            body: JSON.stringify({
              model: "meta-llama/Meta-Llama-3-8B-Instruct",
              messages: [
                { role: "system", content: GAME_BUILDER_PROMPT },
                ...(context.history || []).map(msg => ({
                  role: msg.role === 'model' ? 'assistant' : msg.role,
                  content: msg.parts ? msg.parts[0].text : msg.content
                })),
                { role: "user", content: message }
              ],
              max_tokens: 1500,
              temperature: 0.7
            })
          }
        );

        if (hfResponse.ok) {
          const data = await hfResponse.json();
          reply = data.choices[0]?.message?.content || '';
        } else {
          throw new Error('Hugging Face failed');
        }
      } catch (hfError) {
        console.log('HF failed, trying Gemini...');

        if (!GEMINI_API_KEY) {
          throw new Error('No AI API available');
        }

        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({
          model: 'gemini-pro',
          systemInstruction: GAME_BUILDER_PROMPT
        });

        const chat = model.startChat({
          history: context.history || [],
          generationConfig: {
            maxOutputTokens: 1500,
            temperature: 0.7,
          },
        });

        const result = await chat.sendMessage(message);
        reply = result.response.text();
      }
    } else if (GEMINI_API_KEY) {
      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({
        model: 'gemini-pro',
        systemInstruction: GAME_BUILDER_PROMPT
      });

      const chat = model.startChat({
        history: context.history || [],
        generationConfig: {
          maxOutputTokens: 1500,
          temperature: 0.7,
        },
      });

      const result = await chat.sendMessage(message);
      reply = result.response.text();
    } else {
      return res.status(500).json({
        ok: false,
        error: 'No AI API configured'
      });
    }

    // Try to extract JSON from response
    const jsonMatch = reply.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.action) {
          action = parsed.action;
          gameData = parsed.gameData;
          reply = parsed.message || reply;
        } else if (parsed.type) {
          // Direct game data
          gameData = parsed;
          action = 'preview';
        }
      } catch (e) {
        // Not valid JSON, treat as regular chat
      }
    }

    res.json({
      ok: true,
      reply: reply,
      gameData: gameData,
      action: action
    });

  } catch (error) {
    console.error('AI Game Builder Error:', error);
    res.status(500).json({
      ok: false,
      error: error.message || 'Failed to generate game'
    });
  }
});

app.use(express.static(__dirname));

// ============================================
// ============================================
// AUTO-CLEANUP OLD GAMES
// ============================================

async function cleanupOldGames() {
  if (CLEANUP_ENABLED !== 'true') {
    return; // Cleanup disabled
  }

  try {
    const daysToKeep = parseInt(AUTO_DELETE_DAYS) || 20;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await Game.deleteMany({
      createdAt: { $lt: cutoffDate }
    });

    if (result.deletedCount > 0) {
      console.log(`🗑️  Auto-cleanup: Deleted ${result.deletedCount} game(s) older than ${daysToKeep} days`);
    } else {
      console.log(`✅ Auto-cleanup: No games older than ${daysToKeep} days found`);
    }
  } catch (error) {
    console.error('❌ Auto-cleanup error:', error);
  }
}

// Schedule cleanup to run daily at 2 AM
if (CLEANUP_ENABLED === 'true') {
  cron.schedule('0 2 * * *', () => {
    console.log('⏰ Running scheduled game cleanup...');
    cleanupOldGames();
  });
  console.log(`🔧 Auto-cleanup enabled: Games older than ${AUTO_DELETE_DAYS} days will be deleted daily at 2 AM`);
}

// ============================================
// START SERVER
// ============================================

function listenWithFallback(preferred) {
  let port = Number(preferred) || 8080;
  let attempts = 0;
  function attempt() {
    const server = app.listen(port, () => {
      console.log(`\n🚀 MINDWAVE Server running on http://localhost:${port}`);
      console.log(`📊 MongoDB: ${mongoose.connection.readyState === 1 ? 'Connected ✅' : 'Disconnected ❌'}`);
    });
    server.on("error", (err) => {
      if (err && err.code === "EADDRINUSE" && attempts < 10) {
        attempts += 1;
        port += 1;
        attempt();
      } else {
        console.error(err);
        process.exit(1);
      }
    });
  }
  attempt();
}

// Run cleanup on server start
cleanupOldGames();

listenWithFallback(PORT);
