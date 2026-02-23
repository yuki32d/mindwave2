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
import compression from "compression";
import mongoSanitize from "express-mongo-sanitize";
import * as googleClassroomService from "./googleClassroomService.js";
import { WebSocketServer } from 'ws';
import paymentRoutes from './payment-routes.js';
// Student Performance Analytics
import studentPerformanceRoutes from './student-performance-routes.js';
// Peer Review System
import { setupPeerReviewRoutes } from './peer-review-backend.js';
// Live Activity System
import activitiesRouter from './routes/activities.js';
import liveSessionsRouter from './routes/live-sessions.js';
// Agora.io Video SDK
import pkg from 'agora-access-token';
const { RtcTokenBuilder, RtcRole } = pkg;
// Socket.IO for real-time chat
import { Server } from 'socket.io';
// Meeting Server removed - using Jitsi Meet instead
// pdf-parse will be imported dynamically in the endpoint
// Stripe will be imported conditionally based on environment variable

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
  // Jitsi Configuration
  JITSI_DOMAIN = "mindwave-meet.duckdns.org",
  JITSI_APP_ID = "mindwave",
  JITSI_APP_SECRET,
  // Agora.io Configuration
  AGORA_APP_ID = "6db6c898f5f8477b9daee4f15b3c6157",
  AGORA_APP_CERTIFICATE = "98222a4dc3614beab274dce13f04e997",
  // Auto-cleanup settings
  AUTO_DELETE_DAYS = "20",
  CLEANUP_ENABLED = "true",
  // Stripe Configuration
  STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET
} = process.env;

// Initialize Stripe (dynamic import to prevent deployment failures)
let stripe = null;
(async () => {
  if (STRIPE_SECRET_KEY) {
    try {
      const { default: Stripe } = await import('stripe');
      stripe = new Stripe(STRIPE_SECRET_KEY);
      console.log('✓ Stripe initialized');
    } catch (error) {
      console.warn('⚠️  Stripe package not available - subscription features will be disabled');
    }
  } else {
    console.warn('⚠️  Stripe not configured - subscription features will be disabled');
  }
})();

// ============================================
// SUBSCRIPTION TIER CONFIGURATION
// ============================================
const SUBSCRIPTION_TIERS = {
  trial: {
    name: 'Free Trial',
    price: 0,
    currency: 'INR',
    limits: {
      maxGames: 5,
      maxStudents: 30,
      maxStorage: 100, // MB
      aiCallsPerMonth: 50
    },
    features: {
      // Game Tools (3 basic)
      quiz: true,
      unjumble: true,
      sorter: true,
      fillin: false,
      debug: false,
      sql: false,
      scenario: false,
      flashcard: false,
      matching: false,
      findMatch: false,
      spinWheel: false,
      anagram: false,
      speakingCards: false,

      // Premium Features
      aiGameBuilder: false,
      advancedAnalytics: false,
      liveQuiz: false,
      customBranding: false,
      apiAccess: false,
      prioritySupport: false,
      exportCSV: false,
      exportExcel: false,
      githubIntegration: false,
      zoomIntegration: false
    }
  },

  basic: {
    name: 'Starter Plan',
    price: 499,
    currency: 'INR',
    billingCycle: 'monthly',
    limits: {
      maxGames: 50,
      maxStudents: 50,        // Updated to match org setup
      maxCourses: 10,         // Added course limit
      maxStorage: 5120,       // 5GB (updated from 1GB)
      liveQuizParticipants: 50,
      aiCallsPerMonth: 1000   // Updated limit
    },
    features: {
      // Game Tools (8 tools)
      quiz: true,
      unjumble: true,
      sorter: true,
      fillin: true,
      debug: true,
      flashcard: true,
      matching: true,
      findMatch: true,
      sql: false,
      scenario: false,
      spinWheel: false,
      anagram: false,
      speakingCards: false,

      // Premium Features
      aiGameBuilder: false,
      advancedAnalytics: false,
      liveQuiz: true,
      customBranding: false,
      apiAccess: false,
      prioritySupport: false,
      exportCSV: true,
      exportExcel: false,
      githubIntegration: false,
      zoomIntegration: false
    }
  },

  premium: {
    name: 'Professional Plan',
    price: 2499,
    currency: 'INR',
    billingCycle: 'monthly',
    limits: {
      maxGames: -1,           // Unlimited
      maxStudents: 200,       // Updated to match org setup
      maxCourses: -1,         // Unlimited
      maxStorage: 51200,      // 50GB (updated from 10GB)
      liveQuizParticipants: -1, // Unlimited
      aiCallsPerMonth: 5000
    },
    features: {
      // All Game Tools (13 tools)
      quiz: true,
      unjumble: true,
      sorter: true,
      fillin: true,
      debug: true,
      flashcard: true,
      matching: true,
      findMatch: true,
      sql: true,
      scenario: true,
      spinWheel: true,
      anagram: true,
      speakingCards: true,

      // All Premium Features
      aiGameBuilder: true,
      advancedAnalytics: true,
      liveQuiz: true,
      customBranding: true,
      apiAccess: true,
      prioritySupport: true,
      exportCSV: true,
      exportExcel: true,
      githubIntegration: true,
      zoomIntegration: true
    }
  },

  enterprise: {
    name: 'Enterprise Plan',
    price: null,            // Custom pricing
    currency: 'INR',
    billingCycle: 'custom',
    limits: {
      maxGames: -1,         // Unlimited
      maxStudents: -1,      // Unlimited
      maxCourses: -1,       // Unlimited
      maxStorage: -1,       // Unlimited
      liveQuizParticipants: -1, // Unlimited
      aiCallsPerMonth: -1   // Unlimited
    },
    features: {
      // All Game Tools
      quiz: true,
      unjumble: true,
      sorter: true,
      fillin: true,
      debug: true,
      flashcard: true,
      matching: true,
      findMatch: true,
      sql: true,
      scenario: true,
      spinWheel: true,
      anagram: true,
      speakingCards: true,

      // All Premium Features + Enterprise
      aiGameBuilder: true,
      advancedAnalytics: true,
      liveQuiz: true,
      customBranding: true,
      apiAccess: true,
      prioritySupport: true,
      exportCSV: true,
      exportExcel: true,
      githubIntegration: true,
      zoomIntegration: true,
      ssoIntegration: true,
      dedicatedSupport: true,
      slaGuarantee: true
    }
  }
};


// Helper function to check feature access
function hasFeatureAccess(subscriptionTier, featureName) {
  const tier = SUBSCRIPTION_TIERS[subscriptionTier] || SUBSCRIPTION_TIERS.trial;
  return tier.features[featureName] === true;
}

// Helper function to check limit
function checkLimit(subscriptionTier, limitName, currentUsage) {
  const tier = SUBSCRIPTION_TIERS[subscriptionTier] || SUBSCRIPTION_TIERS.trial;
  const limit = tier.limits[limitName];

  // -1 means unlimited
  if (limit === -1) return true;

  return currentUsage < limit;
}


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

// ============================================
// JITSI JWT TOKEN GENERATION
// ============================================
function generateJitsiToken(userName, userEmail, isModerator, roomName) {
  const now = Math.floor(Date.now() / 1000);

  const payload = {
    context: {
      user: {
        name: userName,
        email: userEmail,
        affiliation: isModerator ? 'owner' : 'member'
      },
      features: {
        livestreaming: isModerator,
        recording: isModerator,
        transcription: isModerator
      }
    },
    moderator: isModerator, // CRITICAL: This field determines moderator privileges
    aud: 'jitsi',
    iss: JITSI_APP_ID,
    sub: JITSI_DOMAIN,
    room: roomName,
    iat: now,
    exp: now + (2 * 60 * 60), // 2 hours
    nbf: now - 10
  };

  // DEBUG: Log the payload to verify moderator field
  console.log('🔍 JWT Token Generation:');
  console.log('  User:', userName);
  console.log('  isModerator:', isModerator);
  console.log('  moderator field:', payload.moderator);
  console.log('  affiliation:', payload.context.user.affiliation);
  console.log('  room:', roomName);

  // Validate JITSI_APP_SECRET exists
  if (!JITSI_APP_SECRET) {
    console.error('❌ JITSI_APP_SECRET is not configured! JWT signing will fail.');
    throw new Error('JITSI_APP_SECRET environment variable is required for JWT authentication');
  }

  const token = jwt.sign(payload, JITSI_APP_SECRET, {
    algorithm: 'HS256'
  });

  return token;
}

// ============================================
// AGORA.IO TOKEN GENERATION
// ============================================
function generateAgoraToken(channelName, uid, role) {
  // Validate Agora credentials
  if (!AGORA_APP_ID || !AGORA_APP_CERTIFICATE) {
    console.error('❌ AGORA_APP_ID or AGORA_APP_CERTIFICATE is not configured!');
    throw new Error('Agora credentials are required for video conferencing');
  }

  // Token expires in 24 hours
  const expirationTimeInSeconds = 86400;
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

  // role: 'host' for faculty (can publish), 'audience' for students (can subscribe)
  const agoraRole = role === 'host' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;

  console.log('🎥 Agora Token Generation:');
  console.log('  Channel:', channelName);
  console.log('  UID:', uid);
  console.log('  Role:', role, '→', agoraRole === RtcRole.PUBLISHER ? 'PUBLISHER' : 'SUBSCRIBER');

  const token = RtcTokenBuilder.buildTokenWithUid(
    AGORA_APP_ID,
    AGORA_APP_CERTIFICATE,
    channelName,
    uid,
    agoraRole,
    privilegeExpiredTs
  );

  return token;
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
    yearSemester: { type: String }, // Year/Semester (legacy field)
    // New student profile fields
    rollNumber: { type: String }, // Student roll number (e.g., "STU998630")
    batch: { type: String }, // Year/batch (e.g., "2024", "2023")
    section: { type: String, enum: ['A', 'B', 'C', 'D', 'E', ''] }, // Student section
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["student", "admin"], default: "student" },
    userType: { type: String, enum: ["student", "admin", "organization"], default: "student" }, // For routing logic
    // Multi-tenant subscription fields
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    orgRole: { type: String, enum: ['owner', 'admin', 'faculty', 'student'], default: 'student' },
    // Alumni/Account Status
    isActive: { type: Boolean, default: true }, // For deactivating alumni accounts
    deactivatedAt: { type: Date }, // Timestamp when account was deactivated
    deactivationReason: { type: String }, // e.g., "graduated", "transferred"
    // OAuth Authentication
    authProvider: { type: String, enum: ['google', 'linkedin', 'facebook', 'local'], default: 'local' },
    providerId: { type: String }, // OAuth provider's user ID
    googleAccessToken: { type: String },
    googleRefreshToken: { type: String },
    // GitHub Integration
    githubAccessToken: { type: String },
    githubUsername: { type: String },
    // Zoom Integration
    zoomAccessToken: { type: String },
    zoomRefreshToken: { type: String },
    // Profile Photo
    profilePhoto: { type: String }, // URL to profile photo
    // Activity Tracking
    lastActive: { type: Date, default: Date.now },
    lastLogin: { type: Date }
  },
  { timestamps: true }
);

// Add indexes for faster queries
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ lastActive: -1 });
userSchema.index({ organizationId: 1 });
userSchema.index({ orgRole: 1 });

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

// ============================================
// SUBSCRIPTION SYSTEM SCHEMAS
// ============================================

// Organization Schema (Multi-tenant)
const organizationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true }, // URL-friendly identifier
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // Subscription Details
    subscriptionTier: {
      type: String,
      enum: ['trial', 'basic', 'premium'],
      default: 'trial'
    },
    subscriptionStatus: {
      type: String,
      enum: ['active', 'trialing', 'past_due', 'canceled', 'incomplete'],
      default: 'trialing'
    },

    // Setup Tracking
    setupCompleted: {
      type: Boolean,
      default: false
    },
    setupCompletedAt: {
      type: Date
    },
    setupSteps: {
      profileCompleted: { type: Boolean, default: false },
      teamInvited: { type: Boolean, default: false },
      studentsImported: { type: Boolean, default: false },
      firstGameCreated: { type: Boolean, default: false }
    },

    // Login Tracking
    firstLoginAt: { type: Date },
    lastLoginAt: { type: Date },

    // Usage Analytics Tracking
    analytics: {
      aiCallsThisMonth: { type: Number, default: 0 },
      totalImpressions: { type: Number, default: 0 },
      totalInteractions: { type: Number, default: 0 },
      lastResetDate: { type: Date, default: Date.now }
    },

    // Stripe Integration
    stripeCustomerId: { type: String },
    stripeSubscriptionId: { type: String },
    stripePriceId: { type: String },

    // Trial Management
    trialEndsAt: { type: Date },
    trialStartedAt: { type: Date, default: Date.now },

    // Billing
    billingEmail: { type: String },
    currentPeriodStart: { type: Date },
    currentPeriodEnd: { type: Date },
    cancelAtPeriodEnd: { type: Boolean, default: false },

    // Usage Limits (based on tier)
    limits: {
      maxStudents: { type: Number, default: 50 },
      maxCourses: { type: Number, default: 5 },
      maxStorage: { type: Number, default: 1024 }, // MB
      features: {
        customBranding: { type: Boolean, default: false },
        apiAccess: { type: Boolean, default: false },
        ssoIntegration: { type: Boolean, default: false },
        prioritySupport: { type: Boolean, default: false },
        advancedAnalytics: { type: Boolean, default: false }
      }
    },

    // Current Usage
    usage: {
      studentCount: { type: Number, default: 0 },
      courseCount: { type: Number, default: 0 },
      storageUsed: { type: Number, default: 0 } // MB
    },

    // Settings
    settings: {
      brandColor: { type: String, default: '#4F46E5' },
      logo: { type: String },
      customDomain: { type: String }
    }
  },
  { timestamps: true }
);

// Add indexes
organizationSchema.index({ slug: 1 });
organizationSchema.index({ ownerId: 1 });
organizationSchema.index({ subscriptionStatus: 1 });
organizationSchema.index({ stripeCustomerId: 1 });

// Subscription Events Schema (for audit trail)
const subscriptionEventSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
    eventType: {
      type: String,
      required: true,
      enum: [
        'subscription.created',
        'subscription.updated',
        'subscription.canceled',
        'subscription.trial_will_end',
        'payment.succeeded',
        'payment.failed',
        'tier.upgraded',
        'tier.downgraded'
      ]
    },
    stripeEventId: { type: String },
    data: { type: mongoose.Schema.Types.Mixed },
    processedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

// Add indexes
subscriptionEventSchema.index({ organizationId: 1, createdAt: -1 });
subscriptionEventSchema.index({ eventType: 1 });
subscriptionEventSchema.index({ stripeEventId: 1 });

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
    lines: { type: Array, default: [] }, // For Unjumble
    scenes: { type: Array, default: [] }, // For Scenario

    // Section-based access control
    targetClasses: { type: [String], default: [] }, // Array of class identifiers (e.g., ["MCA-2024-A", "MCA-2024-B"])
    isPublic: { type: Boolean, default: false } // If true, visible to all students regardless of class
  },
  { timestamps: true }
);

// Add indexes for faster game queries
gameSchema.index({ published: 1, createdAt: -1 });
gameSchema.index({ createdBy: 1 });
gameSchema.index({ type: 1, published: 1 });

const User = mongoose.model("User", userSchema);
const PasswordResetRequest = mongoose.model("PasswordResetRequest", passwordResetSchema);
const AdminNotification = mongoose.model("AdminNotification", adminNotificationSchema);
const Organization = mongoose.model("Organization", organizationSchema);
const SubscriptionEvent = mongoose.model("SubscriptionEvent", subscriptionEventSchema);
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

// Add indexes for faster submission queries
gameSubmissionSchema.index({ studentId: 1, gameId: 1 });
gameSubmissionSchema.index({ studentId: 1, submittedAt: -1 });
gameSubmissionSchema.index({ gameId: 1 });

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

// Schema for live meeting codes
const meetingSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, length: 6 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdByName: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date },
  isActive: { type: Boolean, default: true },
  facultyJoined: { type: Boolean, default: false }, // Track if faculty has joined
  facultyJoinedAt: { type: Date } // When faculty joined
});

const Meeting = mongoose.model('Meeting', meetingSchema);

// CONFIGURABLE: Super Admin Email (can be changed for different HODs)
const SUPER_ADMIN_EMAIL = "rajkumarw88d@gmail.com"; // Change this to the HOD's email

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

// Live Feedback Session Schema
const liveFeedbackSessionSchema = new mongoose.Schema({
  sessionCode: { type: String, required: true, unique: true, index: true },
  facultyId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, default: 'Live Feedback Session' },
  status: { type: String, enum: ['active', 'ended'], default: 'active' },
  startedAt: { type: Date, default: Date.now },
  endedAt: { type: Date },
  responses: [{
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    studentName: { type: String },
    emoji: { type: String, enum: ['confused', 'unsure', 'neutral', 'good', 'excellent'] },
    timestamp: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

// Live Quiz Session Schema
const liveQuizSessionSchema = new mongoose.Schema({
  sessionCode: { type: String, required: true, unique: true, index: true },
  facultyId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  questions: [{
    text: { type: String, required: true },
    options: [String, String, String, String],
    correctIndex: { type: Number, required: true, min: 0, max: 3 },
    timeLimit: { type: Number, default: 15 }, // seconds
    points: { type: Number, default: 1000 }
  }],
  currentQuestionIndex: { type: Number, default: -1 }, // -1 = lobby, 0+ = question number
  status: { type: String, enum: ['lobby', 'question', 'leaderboard', 'ended'], default: 'lobby' },
  startedAt: { type: Date, default: Date.now },
  endedAt: { type: Date },
  participants: [{
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: { type: String, required: true },
    score: { type: Number, default: 0 },
    answers: [{
      questionIndex: { type: Number },
      selectedIndex: { type: Number },
      timeToAnswer: { type: Number }, // milliseconds
      pointsEarned: { type: Number },
      isCorrect: { type: Boolean }
    }]
  }]
}, { timestamps: true });

const Subject = mongoose.model("Subject", subjectSchema);
const Material = mongoose.model("Material", materialSchema);
const LiveFeedbackSession = mongoose.model("LiveFeedbackSession", liveFeedbackSessionSchema);
const LiveQuizSession = mongoose.model("LiveQuizSession", liveQuizSessionSchema);

const announcementSchema = new mongoose.Schema({
  title: { type: String, required: true },
  body: { type: String, required: true },
  audience: { type: String, default: 'All Students' }, // Legacy field
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },

  // Section-based access control
  targetClasses: { type: [String], default: [] }, // Array of class identifiers
  isPublic: { type: Boolean, default: false } // If true, visible to all students
}, { timestamps: true });

const Announcement = mongoose.model("Announcement", announcementSchema);

// Blocked Email Pattern Schema for Alumni Batch Deactivation
const blockedEmailPatternSchema = new mongoose.Schema({
  pattern: {
    type: String,
    required: true,
    unique: true
  }, // e.g., ".mca25@cmrit.ac.in" or "mca25@cmrit.ac.in"
  reason: {
    type: String,
    required: true
  }, // e.g., "Graduated - Class of 2025"
  blockedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  blockedAt: {
    type: Date,
    default: Date.now
  },
  affectedCount: {
    type: Number,
    default: 0
  } // Number of users affected
}, { timestamps: true });

const BlockedEmailPattern = mongoose.model("BlockedEmailPattern", blockedEmailPatternSchema);

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

// ============================================
// SCHOOL EVENTS SCHEMA (Assignments, Quizzes, Exams, Meetings, Announcements)
// ============================================
const schoolEventSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  type: { type: String, enum: ['assignment', 'quiz', 'exam', 'meeting', 'announcement'], required: true },
  subject: { type: String, default: '' },
  startTime: { type: Date, required: true },
  endTime: { type: Date },
  dueTime: { type: Date },
  location: { type: String, default: '' },
  meetingLink: { type: String, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdByName: { type: String, default: '' },
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  targetClasses: [String],
  attachments: [{ name: String, url: String }],
  priority: { type: String, enum: ['normal', 'urgent'], default: 'normal' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

schoolEventSchema.index({ organizationId: 1, startTime: 1 });
schoolEventSchema.index({ type: 1, startTime: 1 });
schoolEventSchema.index({ createdBy: 1 });

const SchoolEvent = mongoose.model("SchoolEvent", schoolEventSchema);

// ============================================
// USER ACTIVITY TRACKING SCHEMA
// ============================================
const userActivitySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  activityType: {
    type: String,
    required: true,
    enum: [
      'login',
      'logout',
      'profile_update',
      'password_change',
      'team_invite',
      'game_create',
      'game_play',
      'game_complete',
      'student_add',
      'settings_update',
      'subscription_change',
      'payment_success',
      'payment_failed'
    ]
  },
  description: { type: String, required: true },
  metadata: { type: mongoose.Schema.Types.Mixed }, // Additional data about the activity
  ipAddress: { type: String },
  userAgent: { type: String }
}, { timestamps: true });

// Add indexes for faster queries
userActivitySchema.index({ userId: 1, createdAt: -1 });
userActivitySchema.index({ organizationId: 1, createdAt: -1 });
userActivitySchema.index({ activityType: 1 });

const UserActivity = mongoose.model("UserActivity", userActivitySchema);

// ============================================
// NOTIFICATION SCHEMA
// ============================================
const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  type: {
    type: String,
    required: true,
    enum: [
      'trial_expiring',
      'trial_expired',
      'payment_failed',
      'payment_success',
      'new_student',
      'team_invite',
      'subscription_changed',
      'game_created',
      'system_update',
      'security_alert'
    ]
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  read: { type: Boolean, default: false },
  readAt: { type: Date },
  actionUrl: { type: String }, // URL to navigate when clicked
  metadata: { type: mongoose.Schema.Types.Mixed }, // Additional data
  archived: { type: Boolean, default: false },
  archivedAt: { type: Date }
}, { timestamps: true });

// Add indexes for faster queries
notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
notificationSchema.index({ organizationId: 1, createdAt: -1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ archived: 1 });

const Notification = mongoose.model("Notification", notificationSchema);

// Google Classroom Integration Schemas
const googleClassroomCourseSchema = new mongoose.Schema({
  courseId: { type: String, required: true, unique: true }, // Google Classroom course ID
  name: { type: String, required: true },
  section: { type: String },
  description: { type: String },
  room: { type: String },
  ownerId: { type: String }, // Google user ID of teacher
  mappedSubjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' }, // Map to MindWave subject
  enrollmentCode: { type: String },
  courseState: { type: String, enum: ['ACTIVE', 'ARCHIVED', 'PROVISIONED', 'DECLINED', 'SUSPENDED'] },
  alternateLink: { type: String }, // Link to Google Classroom
  lastSyncedAt: { type: Date }
}, { timestamps: true });

const googleClassroomMaterialSchema = new mongoose.Schema({
  materialId: { type: String, required: true, unique: true },
  courseId: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String },
  materials: [{ type: mongoose.Schema.Types.Mixed }], // Array of material objects (driveFile, link, etc.)
  state: { type: String, enum: ['PUBLISHED', 'DRAFT', 'DELETED'] },
  creationTime: { type: Date },
  updateTime: { type: Date },
  creatorUserId: { type: String },
  lastSyncedAt: { type: Date }
}, { timestamps: true });

const googleClassroomAssignmentSchema = new mongoose.Schema({
  assignmentId: { type: String, required: true, unique: true },
  courseId: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String },
  materials: [{ type: mongoose.Schema.Types.Mixed }], // Same structure as materials
  state: { type: String, enum: ['PUBLISHED', 'DRAFT', 'DELETED'] },
  workType: { type: String, enum: ['ASSIGNMENT', 'SHORT_ANSWER_QUESTION', 'MULTIPLE_CHOICE_QUESTION'] },
  maxPoints: { type: Number },
  dueDate: {
    year: Number,
    month: Number,
    day: Number
  },
  dueTime: {
    hours: Number,
    minutes: Number
  },
  creationTime: { type: Date },
  updateTime: { type: Date },
  creatorUserId: { type: String },
  alternateLink: { type: String },
  lastSyncedAt: { type: Date }
}, { timestamps: true });

const googleClassroomSubmissionSchema = new mongoose.Schema({
  submissionId: { type: String, required: true, unique: true },
  courseId: { type: String, required: true },
  assignmentId: { type: String, required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // MindWave user ID
  googleUserId: { type: String }, // Google user ID
  state: { type: String, enum: ['NEW', 'CREATED', 'TURNED_IN', 'RETURNED', 'RECLAIMED_BY_STUDENT'] },
  assignedGrade: { type: Number },
  draftGrade: { type: Number },
  submissionHistory: [{ type: mongoose.Schema.Types.Mixed }],
  late: { type: Boolean },
  creationTime: { type: Date },
  updateTime: { type: Date },
  lastSyncedAt: { type: Date }
}, { timestamps: true });

const googleClassroomAnnouncementSchema = new mongoose.Schema({
  announcementId: { type: String, required: true, unique: true },
  courseId: { type: String, required: true },
  text: { type: String, required: true },
  state: { type: String, enum: ['PUBLISHED', 'DRAFT', 'DELETED'] },
  creationTime: { type: Date },
  updateTime: { type: Date },
  creatorUserId: { type: String },
  alternateLink: { type: String },
  materials: [{ type: mongoose.Schema.Types.Mixed }],
  lastSyncedAt: { type: Date },
  syncedToMindWave: { type: Boolean, default: false },
  mindWaveAnnouncementId: { type: mongoose.Schema.Types.ObjectId, ref: 'Announcement' }
}, { timestamps: true });

// Add indexes for Google Classroom schemas
googleClassroomCourseSchema.index({ courseId: 1 });
googleClassroomCourseSchema.index({ mappedSubjectId: 1 });
googleClassroomMaterialSchema.index({ courseId: 1, state: 1 });
googleClassroomAssignmentSchema.index({ courseId: 1, state: 1 });
googleClassroomAssignmentSchema.index({ dueDate: 1 });
googleClassroomSubmissionSchema.index({ studentId: 1, assignmentId: 1 });
googleClassroomSubmissionSchema.index({ courseId: 1 });
googleClassroomAnnouncementSchema.index({ courseId: 1, state: 1 });
googleClassroomAnnouncementSchema.index({ announcementId: 1 });

const GoogleClassroomCourse = mongoose.model("GoogleClassroomCourse", googleClassroomCourseSchema);
const GoogleClassroomMaterial = mongoose.model("GoogleClassroomMaterial", googleClassroomMaterialSchema);
const GoogleClassroomAssignment = mongoose.model("GoogleClassroomAssignment", googleClassroomAssignmentSchema);
const GoogleClassroomSubmission = mongoose.model("GoogleClassroomSubmission", googleClassroomSubmissionSchema);
const GoogleClassroomAnnouncement = mongoose.model("GoogleClassroomAnnouncement", googleClassroomAnnouncementSchema);

// Blocked Email Schema (for super admin)
const blockedEmailSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  reason: { type: String },
  blockedAt: { type: Date, default: Date.now },
  blockedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

const BlockedEmail = mongoose.model("BlockedEmail", blockedEmailSchema);

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
// Enable compression for all responses
app.use(compression());

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      "default-src": ["'self'"],
      "script-src": ["'self'", "'unsafe-inline'", "'wasm-unsafe-eval'", "https://cdnjs.cloudflare.com", "https://cdn.cloudflare.com", "https://cdn.jsdelivr.net", "https://cdn.sheetjs.com", "https://unpkg.com", "https://*.lottiefiles.com", "https://checkout.razorpay.com", "https://meet.jit.si", "https://*.jitsi.net", "https://download.agora.io", "http://localhost:8000", "http://localhost:9000"],
      "script-src-attr": ["'unsafe-inline'"],
      "style-src": ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://cdn.cloudflare.com", "https://cdn.jsdelivr.net", "https://fonts.googleapis.com", "http://localhost:8000", "http://localhost:9000"],
      "img-src": ["'self'", "data:", "https:", "http:", "blob:"],
      "font-src": ["'self'", "data:", "https:", "http:"],
      "connect-src": ["'self'", "https://cdn.jsdelivr.net", "https://unpkg.com", "https://api.razorpay.com", "https://checkout.razorpay.com", "https://lumberjack.razorpay.com", "https://meet.jit.si", "https://*.jitsi.net", "wss://meet.jit.si", "wss://*.jitsi.net", "https://*.agora.io", "wss://*.agora.io", "https://*.agoraio.cn", "wss://*.agoraio.cn", "http://localhost:8000", "ws://localhost:8000", "http://localhost:9000", "ws://localhost:9000"],
      "worker-src": ["'self'", "blob:"],
      "frame-src": ["'self'", "*", "https:", "http:", "https://*.youtube.com", "https://youtube.com", "https://*.youtube-nocookie.com", "https://youtube-nocookie.com", "https://player.vimeo.com", "https://vimeo.com", "https://*.vimeo.com", "https://scrimba.com", "https://*.scrimba.com", "https://*.vercel.app", "https://*.netlify.app", "https://*.github.io", "https://*.onrender.com", "https://*.herokuapp.com", "https://*.replit.dev", "https://*.glitch.me", "https://sketchfab.com", "https://*.sketchfab.com", "https://api.razorpay.com", "https://meet.jit.si", "https://*.jitsi.net", "http://localhost:8000", "http://localhost:9000"],
      "object-src": ["'none'"],
      "base-uri": ["'self'"],
      "form-action": ["'self'"],
      "frame-ancestors": ["'self'"],
      "upgrade-insecure-requests": []
    }
  }
}));
app.use(express.json());
app.use(cookieParser());
// Sanitize data to prevent MongoDB injection
app.use(mongoSanitize());
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Serve Jitsi Meet static files first
app.use('/jitsi', express.static(path.join(__dirname, 'public', 'jitsi'), {
  maxAge: '1d',
  etag: true,
  lastModified: true
}));

// Serve Jitsi index.html for room URLs (e.g., /jitsi/#/RoomName)
app.get('/jitsi', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'jitsi', 'index.html'));
});

// Serve static files (HTML, CSS, JS, images) from the root directory with caching
app.use(express.static(__dirname, {
  index: false,
  maxAge: '1d', // Cache static assets for 1 day
  etag: true,
  lastModified: true
}));

// ============================================
// LIVE ACTIVITY SYSTEM ROUTES
// ============================================
app.use('/api/activities', activitiesRouter);
app.use('/api/live-sessions', liveSessionsRouter);
// Student Performance Analytics Routes
app.use('/api/student', authMiddleware, studentPerformanceRoutes);
// Peer Review System Routes
setupPeerReviewRoutes(app, authMiddleware, ProjectSubmission);

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false
});

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests, please try again later.'
});

// Mount payment routes
app.use('/api', paymentRoutes);

// Apply rate limiting to all API routes
app.use('/api/', apiLimiter);

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
  const token = req.cookies && req.cookies.mindwave_token;
  if (!token) return res.status(401).json({ ok: false, message: "Unauthorized" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (error) {
    return res.status(401).json({ ok: false, message: "Invalid token" });
  }
}

// Super Admin Middleware
function superAdminMiddleware(req, res, next) {
  const userId = req.user.sub;
  User.findById(userId).then(user => {
    if (!user || user.email !== SUPER_ADMIN_EMAIL) {
      return res.status(403).json({ ok: false, message: 'Super admin access required' });
    }
    next();
  }).catch(error => {
    res.status(500).json({ ok: false, message: 'Server error' });
  });
}
// Create Organization
app.post("/api/organizations/create", authMiddleware, async (req, res) => {
  try {
    console.log('=== Organization Creation Request ===');
    console.log('User ID:', req.user.sub);
    console.log('Request body:', req.body);

    const { name, subdomain, type, size, country, website } = req.body;
    const userId = req.user.sub;

    console.log('Extracted fields:', { name, subdomain, type, size, country, website, userId });

    // Validate required fields
    if (!name || !subdomain || !type) {
      console.log('Validation failed - missing required fields');
      return res.status(400).json({
        ok: false,
        message: "Name, subdomain, and type are required"
      });
    }

    // Check if subdomain is already taken
    console.log('Checking if subdomain exists:', subdomain);
    const existingOrg = await Organization.findOne({ slug: subdomain });
    if (existingOrg) {
      console.log('Subdomain already taken:', subdomain);
      return res.status(400).json({
        ok: false,
        message: "Subdomain is already taken. Please choose another."
      });
    }

    // Create organization
    console.log('Creating organization...');
    const organization = await Organization.create({
      name,
      slug: subdomain,
      ownerId: userId,
      subscriptionTier: 'trial',
      subscriptionStatus: 'trialing',
      trialStartedAt: new Date(),
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
      setupCompleted: true,
      setupCompletedAt: new Date(),
      firstLoginAt: new Date(),
      lastLoginAt: new Date()
    });
    console.log('Organization created:', organization._id);

    // Update user with organization info
    console.log('Updating user with organizationId...');
    await User.findByIdAndUpdate(userId, {
      organizationId: organization._id,
      orgRole: 'owner',
      userType: 'organization'
    });
    console.log('User updated successfully');

    res.json({
      ok: true,
      organization: {
        _id: organization._id,
        name: organization.name,
        slug: organization.slug,
        type: type,
        subscriptionTier: organization.subscriptionTier,
        subscriptionStatus: organization.subscriptionStatus,
        trialDaysRemaining: 14
      },
      message: "Organization created successfully"
    });

  } catch (error) {
    console.error("=== Organization Creation Error ===");
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    res.status(500).json({
      ok: false,
      message: "Failed to create organization: " + error.message
    });
  }
});

// Get Organization Details
app.get("/api/organizations/details", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.sub;

    // Get user to find their organization
    const user = await User.findById(userId);
    if (!user || !user.organizationId) {
      return res.status(404).json({
        ok: false,
        message: "No organization found for this user"
      });
    }

    // Get organization
    const organization = await Organization.findById(user.organizationId);
    if (!organization) {
      return res.status(404).json({
        ok: false,
        message: "Organization not found"
      });
    }

    // Calculate trial days remaining
    let trialDaysRemaining = 0;
    if (organization.trialEndsAt) {
      const now = new Date();
      const trialEnd = new Date(organization.trialEndsAt);
      trialDaysRemaining = Math.max(0, Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24)));
    }

    // Get member count
    const memberCount = await User.countDocuments({ organizationId: organization._id });

    res.json({
      ok: true,
      organization: {
        _id: organization._id,
        name: organization.name,
        slug: organization.slug,
        subscriptionTier: organization.subscriptionTier,
        subscriptionStatus: organization.subscriptionStatus,
        trialDaysRemaining,
        memberCount,
        currentPeriodEnd: organization.currentPeriodEnd,
        setupCompleted: organization.setupCompleted
      }
    });

  } catch (error) {
    console.error("Error getting organization details:", error);
    res.status(500).json({
      ok: false,
      message: "Failed to get organization details"
    });
  }
});

// Get Student Domains
app.get("/api/organizations/student-domains", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId);

    if (!user || !user.organizationId) {
      return res.status(404).json({ ok: false, message: "No organization found" });
    }

    const organization = await Organization.findById(user.organizationId);
    if (!organization) {
      return res.status(404).json({ ok: false, message: "Organization not found" });
    }

    res.json({
      ok: true,
      domains: organization.allowedStudentDomains || []
    });

  } catch (error) {
    console.error("Error getting student domains:", error);
    res.status(500).json({ ok: false, message: "Failed to get student domains" });
  }
});

// Configure Student Domains
app.post("/api/organizations/configure-student-domains", authMiddleware, async (req, res) => {
  try {
    const { allowedDomains } = req.body;
    const userId = req.user.sub;

    const user = await User.findById(userId);
    if (!user || !user.organizationId) {
      return res.status(404).json({ ok: false, message: "No organization found" });
    }

    // Update organization
    await Organization.findByIdAndUpdate(user.organizationId, {
      allowedStudentDomains: allowedDomains
    });

    res.json({
      ok: true,
      message: "Student domains configured successfully"
    });

  } catch (error) {
    console.error("Error configuring student domains:", error);
    res.status(500).json({ ok: false, message: "Failed to configure student domains" });
  }
});

// Invite Admin
app.post("/api/organizations/invite-admin", authMiddleware, async (req, res) => {
  try {
    const { email, role, autoGeneratePassword } = req.body;
    const userId = req.user.userId;

    const user = await User.findById(userId);
    if (!user || !user.organizationId) {
      return res.status(404).json({ ok: false, message: "No organization found" });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ ok: false, message: "User with this email already exists" });
    }

    // Generate password if requested
    let password = null;
    if (autoGeneratePassword) {
      password = crypto.randomBytes(8).toString('hex');
    }

    // Create user
    const hashedPassword = await bcrypt.hash(password || 'changeme', 10);
    const newUser = await User.create({
      name: email.split('@')[0],
      email,
      password: hashedPassword,
      role: 'admin',
      userType: 'organization',
      organizationId: user.organizationId,
      orgRole: role || 'admin'
    });

    res.json({
      ok: true,
      message: "Admin invited successfully",
      credentials: autoGeneratePassword ? { email, password } : null
    });

  } catch (error) {
    console.error("Error inviting admin:", error);
    res.status(500).json({ ok: false, message: "Failed to invite admin" });
  }
});

app.get("/", (_req, res) => {
  res.redirect("/marketing-site/website-home.html");
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

    // Check if account is active (for alumni deactivation)
    if (!user.isActive) {
      return res.status(403).json({
        ok: false,
        message: "Your account has been deactivated. Please contact administration for assistance."
      });
    }

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

// ===================================
// SUPER ADMIN API ENDPOINTS
// ===================================


// Verify super admin access
app.get("/api/superadmin/verify", authMiddleware, superAdminMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.sub);
    res.json({
      ok: true,
      email: user.email,
      isSuperAdmin: true
    });
  } catch (error) {
    res.status(500).json({ ok: false, message: 'Server error' });
  }
});

// Get statistics
app.get("/api/superadmin/stats", authMiddleware, superAdminMiddleware, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ userType: 'organization' });
    const totalOrgs = await Organization.countDocuments();
    const totalBlocked = await BlockedEmail.countDocuments();
    const activeUsers = await User.countDocuments({ userType: 'organization', suspended: { $ne: true } });

    res.json({
      ok: true,
      stats: {
        totalUsers,
        totalOrgs,
        totalBlocked,
        activeUsers
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ ok: false, message: 'Server error' });
  }
});

// Get all organization users
app.get("/api/superadmin/users", authMiddleware, superAdminMiddleware, async (req, res) => {
  try {
    const users = await User.find({ userType: 'organization' })
      .select('-password')
      .sort({ createdAt: -1 })
      .lean();

    // Get organization names
    const usersWithOrgs = await Promise.all(users.map(async (user) => {
      if (user.organizationId) {
        const org = await Organization.findById(user.organizationId).select('name');
        user.organizationName = org ? org.name : 'N/A';
      } else {
        user.organizationName = 'N/A';
      }
      return user;
    }));

    res.json({
      ok: true,
      users: usersWithOrgs
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ ok: false, message: 'Server error' });
  }
});

// Get all organizations
app.get("/api/superadmin/organizations", authMiddleware, superAdminMiddleware, async (req, res) => {
  try {
    const organizations = await Organization.find()
      .sort({ createdAt: -1 })
      .lean();

    // Get owner emails and member counts
    const orgsWithDetails = await Promise.all(organizations.map(async (org) => {
      const owner = await User.findById(org.ownerId).select('email');
      org.ownerEmail = owner ? owner.email : 'N/A';
      org.memberCount = org.members ? org.members.length : 0;
      return org;
    }));

    res.json({
      ok: true,
      organizations: orgsWithDetails
    });
  } catch (error) {
    console.error('Get organizations error:', error);
    res.status(500).json({ ok: false, message: 'Server error' });
  }
});

// Delete user
app.delete("/api/superadmin/users/:userId", authMiddleware, superAdminMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;

    // Delete user
    await User.findByIdAndDelete(userId);

    // Remove from organization members
    await Organization.updateMany(
      { 'members.userId': userId },
      { $pull: { members: { userId: userId } } }
    );

    res.json({
      ok: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ ok: false, message: 'Server error' });
  }
});

// Suspend user
app.post("/api/superadmin/suspend-user", authMiddleware, superAdminMiddleware, async (req, res) => {
  try {
    const { userId } = req.body;

    await User.findByIdAndUpdate(userId, { suspended: true });

    res.json({
      ok: true,
      message: 'User suspended successfully'
    });
  } catch (error) {
    console.error('Suspend user error:', error);
    res.status(500).json({ ok: false, message: 'Server error' });
  }
});

// Activate user
app.post("/api/superadmin/activate-user", authMiddleware, superAdminMiddleware, async (req, res) => {
  try {
    const { userId } = req.body;

    await User.findByIdAndUpdate(userId, { suspended: false });

    res.json({
      ok: true,
      message: 'User activated successfully'
    });
  } catch (error) {
    console.error('Activate user error:', error);
    res.status(500).json({ ok: false, message: 'Server error' });
  }
});

// Delete organization
app.delete("/api/superadmin/organizations/:orgId", authMiddleware, superAdminMiddleware, async (req, res) => {
  try {
    const { orgId } = req.params;

    // Delete all users in organization
    await User.deleteMany({ organizationId: orgId });

    // Delete organization
    await Organization.findByIdAndDelete(orgId);

    res.json({
      ok: true,
      message: 'Organization and all members deleted successfully'
    });
  } catch (error) {
    console.error('Delete organization error:', error);
    res.status(500).json({ ok: false, message: 'Server error' });
  }
});

// Block email
app.post("/api/superadmin/block-email", authMiddleware, superAdminMiddleware, async (req, res) => {
  try {
    const { email, reason } = req.body;

    const blocked = await BlockedEmail.create({
      email: email.toLowerCase(),
      reason: reason || 'No reason provided',
      blockedBy: req.user.sub
    });

    res.json({
      ok: true,
      message: 'Email blocked successfully',
      blocked
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ ok: false, message: 'Email already blocked' });
    }
    console.error('Block email error:', error);
    res.status(500).json({ ok: false, message: 'Server error' });
  }
});

// Get blocked emails
app.get("/api/superadmin/blocked-emails", authMiddleware, superAdminMiddleware, async (req, res) => {
  try {
    const blocked = await BlockedEmail.find().sort({ blockedAt: -1 });

    res.json({
      ok: true,
      blocked
    });
  } catch (error) {
    console.error('Get blocked emails error:', error);
    res.status(500).json({ ok: false, message: 'Server error' });
  }
});

// Unblock email
app.delete("/api/superadmin/blocked-emails/:id", authMiddleware, superAdminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    await BlockedEmail.findByIdAndDelete(id);

    res.json({
      ok: true,
      message: 'Email unblocked successfully'
    });
  } catch (error) {
    console.error('Unblock email error:', error);
    res.status(500).json({ ok: false, message: 'Server error' });
  }
});

// ===================================
// OAUTH AUTHENTICATION ENDPOINTS
// ===================================

// Exchange OAuth authorization code for access token
app.post("/api/auth/oauth/token", authLimiter, async (req, res) => {
  try {
    const { provider, code, codeVerifier, redirectUri } = req.body;

    if (!provider || !code || !redirectUri) {
      return res.status(400).json({
        ok: false,
        message: "Missing required fields: provider, code, or redirectUri"
      });
    }

    let tokenResponse;
    let accessToken;
    let userInfo;

    // Exchange code for token based on provider
    if (provider === 'google') {
      // Exchange authorization code for Google access token
      try {
        const tokenData = {
          code: code,
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code'
        };

        if (codeVerifier) {
          tokenData.code_verifier = codeVerifier;
        }

        const response = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams(tokenData)
        });

        if (!response.ok) {
          const errorData = await response.text();
          console.error('Google token exchange error:', errorData);
          return res.status(500).json({
            ok: false,
            message: "Server error during google authentication"
          });
        }

        tokenResponse = await response.json();
        accessToken = tokenResponse.access_token;

        // Get user info from Google
        const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });

        if (!userInfoResponse.ok) {
          return res.status(500).json({
            ok: false,
            message: "Failed to fetch user information"
          });
        }

        userInfo = await userInfoResponse.json();

      } catch (error) {
        console.error('Google OAuth error:', error);
        return res.status(500).json({
          ok: false,
          message: `Server error during google authentication: ${error.message}`
        });
      }

    } else if (provider === 'linkedin') {
      // LinkedIn token exchange
      try {
        const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            code: code,
            client_id: process.env.LINKEDIN_CLIENT_ID,
            client_secret: process.env.LINKEDIN_CLIENT_SECRET,
            redirect_uri: redirectUri
          })
        });

        if (!response.ok) {
          const errorData = await response.text();
          console.error('LinkedIn token exchange error:', errorData);
          return res.status(500).json({
            ok: false,
            message: "Server error during LinkedIn authentication"
          });
        }

        tokenResponse = await response.json();
        accessToken = tokenResponse.access_token;

        // Get user info from LinkedIn
        const userInfoResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });

        if (!userInfoResponse.ok) {
          return res.status(500).json({
            ok: false,
            message: "Failed to fetch LinkedIn user information"
          });
        }

        userInfo = await userInfoResponse.json();

      } catch (error) {
        console.error('LinkedIn OAuth error:', error);
        return res.status(500).json({
          ok: false,
          message: `Server error during LinkedIn authentication: ${error.message}`
        });
      }

    } else if (provider === 'facebook') {
      // Facebook token exchange
      try {
        const response = await fetch('https://graph.facebook.com/v18.0/oauth/access_token', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          params: {
            client_id: process.env.FACEBOOK_CLIENT_ID,
            client_secret: process.env.FACEBOOK_CLIENT_SECRET,
            redirect_uri: redirectUri,
            code: code
          }
        });

        if (!response.ok) {
          const errorData = await response.text();
          console.error('Facebook token exchange error:', errorData);
          return res.status(500).json({
            ok: false,
            message: "Server error during Facebook authentication"
          });
        }

        tokenResponse = await response.json();
        accessToken = tokenResponse.access_token;

        // Get user info from Facebook
        const userInfoResponse = await fetch('https://graph.facebook.com/me?fields=id,name,email,picture', {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });

        if (!userInfoResponse.ok) {
          return res.status(500).json({
            ok: false,
            message: "Failed to fetch Facebook user information"
          });
        }

        userInfo = await userInfoResponse.json();

      } catch (error) {
        console.error('Facebook OAuth error:', error);
        return res.status(500).json({
          ok: false,
          message: `Server error during Facebook authentication: ${error.message}`
        });
      }

    } else {
      return res.status(400).json({
        ok: false,
        message: "Unsupported OAuth provider"
      });
    }

    // Normalize user data
    const email = userInfo.email || userInfo.mail || userInfo.userPrincipalName;
    const name = userInfo.name || userInfo.given_name || 'User';
    const providerId = userInfo.id || userInfo.sub;

    if (!email) {
      return res.status(400).json({
        ok: false,
        message: "Email not provided by OAuth provider"
      });
    }

    // Find or create user
    let user = await User.findOne({ email: email.toLowerCase() });
    let isNewUser = false;

    if (!user) {
      // Create new user - treat as organization owner
      isNewUser = true;
      user = await User.create({
        name: name,
        displayName: name,
        email: email.toLowerCase(),
        role: 'admin', // Organization owners are admins
        userType: 'organization', // Mark as organization user
        orgRole: 'owner', // Set as organization owner
        authProvider: provider,
        providerId: providerId,
        profilePhoto: userInfo.picture || null,
        // No password for OAuth users
        password: await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10) // Random password
      });
    } else {
      // Update existing user's OAuth info
      user.authProvider = provider;
      user.providerId = providerId;
      user.lastLogin = new Date();
      if (userInfo.picture) {
        user.profilePhoto = userInfo.picture;
      }
      await user.save();
    }

    // Generate JWT token
    const token = signToken(user);

    // Set cookie and return response
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
        user: {
          name: user.name,
          email: user.email,
          role: user.role,
          userType: user.userType,
          orgRole: user.orgRole,
          organizationId: user.organizationId,
          profilePhoto: user.profilePhoto,
          needsOrgSetup: isNewUser && !user.organizationId // Flag if new user needs org setup
        }
      });

  } catch (error) {
    console.error("OAuth token exchange error:", error);
    res.status(500).json({
      ok: false,
      message: "Server error during authentication"
    });
  }
});

app.get("/api/me", authMiddleware, async (req, res) => {
  const user = await User.findById(req.user.sub).select("-password");
  res.json({ ok: true, user });
});

// Update user profile (student settings)
app.put("/api/users/profile", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.sub;
    const { displayName, bio, rollNumber, phone, batch, department, section } = req.body;

    // Validate required fields for students
    const user = await User.findById(userId);
    if (user.role === 'student') {
      if (!rollNumber || !batch || !department || !section) {
        return res.status(400).json({
          ok: false,
          message: "Roll number, batch, department, and section are required for students"
        });
      }
    }

    // Update user profile
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        displayName,
        bio,
        rollNumber,
        phone,
        batch,
        department,
        section
      },
      { new: true, runValidators: true }
    ).select('-password');

    res.json({ ok: true, user: updatedUser });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

// Get faculty's classes (based on department extracted from email)
app.get("/api/faculty/classes", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.sub);

    // Only faculty/admins can access this
    if (user.role !== 'admin' && user.orgRole !== 'faculty') {
      return res.status(403).json({ ok: false, message: "Faculty access required" });
    }

    // Extract department from email
    // Handles patterns like: mca@cmrit.ac.in, test.mca25@cmrit.ac.in, teflon.mca25@cmrit.ac.in
    const emailPrefix = user.email.split('@')[0]; // e.g., "teflon.mca25" or "mca"
    let facultyDepartment = emailPrefix.toUpperCase();

    // If email has a dot, try to extract department from the last part
    if (emailPrefix.includes('.')) {
      const parts = emailPrefix.split('.');
      const lastPart = parts[parts.length - 1]; // e.g., "mca25"
      // Extract letters only (remove numbers)
      facultyDepartment = lastPart.replace(/[0-9]/g, '').toUpperCase(); // e.g., "MCA"
    }

    console.log('Faculty email:', user.email);
    console.log('Extracted department:', facultyDepartment);

    // Find all students in this department
    const students = await User.find({
      department: { $regex: new RegExp(`^${facultyDepartment}$`, 'i') },
      role: 'student',
      isActive: true
    }).select('section batch department');

    console.log('Found students:', students.length);

    // Build unique class identifiers
    const classSet = new Set();
    students.forEach(student => {
      if (student.department && student.batch && student.section) {
        const classId = `${student.department}-${student.batch}-${student.section}`;
        classSet.add(classId);
      }
    });

    // Convert to array and sort
    const classes = Array.from(classSet).sort();

    res.json({
      ok: true,
      department: facultyDepartment,
      classes: classes.map(classId => {
        const [dept, batch, section] = classId.split('-');
        return {
          id: classId,
          department: dept,
          batch: batch,
          section: section,
          displayName: `${dept} ${batch} - Section ${section}`
        };
      })
    });
  } catch (error) {
    console.error("Get faculty classes error:", error);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

// ===================================
// ALUMNI BATCH DEACTIVATION API
// ===================================

// Get all blocked email patterns
app.get("/api/admin/blocked-patterns", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.sub);

    // Only admins can access
    if (user.role !== 'admin') {
      return res.status(403).json({ ok: false, message: "Admin access required" });
    }

    const patterns = await BlockedEmailPattern.find()
      .populate('blockedBy', 'name email')
      .sort({ blockedAt: -1 });

    res.json({ ok: true, patterns });
  } catch (error) {
    console.error("Get blocked patterns error:", error);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

// Block a new email pattern
app.post("/api/admin/block-pattern", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.sub);

    // Only admins can access
    if (user.role !== 'admin') {
      return res.status(403).json({ ok: false, message: "Admin access required" });
    }

    const { pattern, reason } = req.body;

    if (!pattern || !reason) {
      return res.status(400).json({ ok: false, message: "Pattern and reason are required" });
    }

    // Check if pattern already exists
    const existing = await BlockedEmailPattern.findOne({ pattern });
    if (existing) {
      return res.status(400).json({ ok: false, message: "This pattern is already blocked" });
    }

    // Find all users matching the pattern
    const allUsers = await User.find({ role: 'student' });
    const matchingUsers = allUsers.filter(u => {
      if (pattern.startsWith('.')) {
        return u.email.includes(pattern);
      } else {
        return u.email === pattern || u.email.endsWith('@' + pattern);
      }
    });

    // Deactivate all matching users
    const userIds = matchingUsers.map(u => u._id);
    await User.updateMany(
      { _id: { $in: userIds } },
      {
        $set: {
          isActive: false,
          deactivatedAt: new Date(),
          deactivationReason: reason
        }
      }
    );

    // Save the blocked pattern
    const blockedPattern = await BlockedEmailPattern.create({
      pattern,
      reason,
      blockedBy: req.user.sub,
      affectedCount: matchingUsers.length
    });

    res.json({
      ok: true,
      message: `Blocked ${matchingUsers.length} student account(s)`,
      pattern: blockedPattern
    });
  } catch (error) {
    console.error("Block pattern error:", error);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

// Unblock an email pattern
app.delete("/api/admin/blocked-patterns/:id", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.sub);

    // Only admins can access
    if (user.role !== 'admin') {
      return res.status(403).json({ ok: false, message: "Admin access required" });
    }

    const blockedPattern = await BlockedEmailPattern.findById(req.params.id);
    if (!blockedPattern) {
      return res.status(404).json({ ok: false, message: "Pattern not found" });
    }

    // Find all users matching the pattern
    const allUsers = await User.find({ role: 'student', isActive: false });
    const matchingUsers = allUsers.filter(u => {
      if (blockedPattern.pattern.startsWith('.')) {
        return u.email.includes(blockedPattern.pattern);
      } else {
        return u.email === blockedPattern.pattern || u.email.endsWith('@' + blockedPattern.pattern);
      }
    });

    // Reactivate all matching users
    const userIds = matchingUsers.map(u => u._id);
    await User.updateMany(
      { _id: { $in: userIds } },
      {
        $set: {
          isActive: true,
          deactivatedAt: null,
          deactivationReason: null
        }
      }
    );

    // Delete the blocked pattern
    await BlockedEmailPattern.findByIdAndDelete(req.params.id);

    res.json({
      ok: true,
      message: `Unblocked ${matchingUsers.length} student account(s)`
    });
  } catch (error) {
    console.error("Unblock pattern error:", error);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});


// ===================================
// ORGANIZATION MANAGEMENT API
// ===================================

// Check user's organization status (for smart routing after login)
app.get("/api/auth/check-org-status", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.sub;
    const user = await User.findById(userId).select('organizationId orgRole userType role');

    if (!user.organizationId) {
      // Regular user (student/admin)
      return res.json({
        ok: true,
        hasOrganization: false,
        userType: user.userType || user.role,
        redirectTo: user.role === 'student' ? '/homepage.html' : '/admin.html'
      });
    }

    // Organization user
    const organization = await Organization.findById(user.organizationId);

    if (!organization) {
      return res.status(404).json({ ok: false, message: 'Organization not found' });
    }

    // Update last login
    organization.lastLoginAt = new Date();
    if (!organization.firstLoginAt) {
      organization.firstLoginAt = new Date();
    }
    await organization.save();

    res.json({
      ok: true,
      hasOrganization: true,
      setupCompleted: organization.setupCompleted,
      organizationRole: user.orgRole,
      organizationId: organization._id,
      organizationName: organization.name,
      subscriptionTier: organization.subscriptionTier,
      subscriptionStatus: organization.subscriptionStatus,
      redirectTo: organization.setupCompleted
        ? '/organization-dashboard.html'
        : '/organization-setup.html'
    });

  } catch (error) {
    console.error('Check org status error:', error);
    res.status(500).json({ ok: false, message: 'Server error' });
  }
});

// Complete organization setup
app.post("/api/organization/complete-setup", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.sub;
    const user = await User.findById(userId);

    if (!user.organizationId) {
      return res.status(403).json({ ok: false, message: 'Not an organization member' });
    }

    const organization = await Organization.findById(user.organizationId);

    if (!organization) {
      return res.status(404).json({ ok: false, message: 'Organization not found' });
    }

    // Only owner can complete setup
    if (user.orgRole !== 'owner') {
      return res.status(403).json({ ok: false, message: 'Only owner can complete setup' });
    }

    // Mark setup as completed
    organization.setupCompleted = true;
    organization.setupCompletedAt = new Date();
    await organization.save();

    res.json({
      ok: true,
      message: 'Setup completed successfully',
      redirectTo: '/organization-dashboard.html'
    });

  } catch (error) {
    console.error('Complete setup error:', error);
    res.status(500).json({ ok: false, message: 'Server error' });
  }
});

// Update organization setup step
app.post("/api/organization/update-setup-step", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.sub;
    const { step } = req.body; // 'profileCompleted', 'teamInvited', etc.

    const user = await User.findById(userId);
    const organization = await Organization.findById(user.organizationId);

    if (!organization) {
      return res.status(404).json({ ok: false, message: 'Organization not found' });
    }

    // Update setup step
    if (organization.setupSteps && step in organization.setupSteps) {
      organization.setupSteps[step] = true;
      await organization.save();
    }

    res.json({
      ok: true,
      setupSteps: organization.setupSteps
    });

  } catch (error) {
    console.error('Update setup step error:', error);
    res.status(500).json({ ok: false, message: 'Server error' });
  }
});

// Get subscription status and features
app.get("/api/subscription/status", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.sub;
    const user = await User.findById(userId);

    if (!user.organizationId) {
      // Regular user - return default trial tier
      return res.json({
        ok: true,
        tier: 'trial',
        tierName: SUBSCRIPTION_TIERS.trial.name,
        status: 'trialing',
        features: SUBSCRIPTION_TIERS.trial.features,
        limits: SUBSCRIPTION_TIERS.trial.limits,
        usage: { studentCount: 0, courseCount: 0, storageUsed: 0 }
      });
    }

    const organization = await Organization.findById(user.organizationId);

    if (!organization) {
      return res.status(404).json({ ok: false, message: 'Organization not found' });
    }

    const tierConfig = SUBSCRIPTION_TIERS[organization.subscriptionTier] || SUBSCRIPTION_TIERS.trial;

    res.json({
      ok: true,
      tier: organization.subscriptionTier,
      tierName: tierConfig.name,
      status: organization.subscriptionStatus,
      features: tierConfig.features,
      limits: tierConfig.limits,
      usage: organization.usage || { studentCount: 0, courseCount: 0, storageUsed: 0 },
      analytics: organization.analytics || { aiCallsThisMonth: 0, totalImpressions: 0, totalInteractions: 0 },
      billingInfo: {
        currentPeriodStart: organization.currentPeriodStart,
        currentPeriodEnd: organization.currentPeriodEnd,
        cancelAtPeriodEnd: organization.cancelAtPeriodEnd
      }
    });

  } catch (error) {
    console.error('Get subscription status error:', error);
    res.status(500).json({ ok: false, message: 'Server error' });
  }
});

// Check if user has access to a specific feature
app.post("/api/subscription/check-feature", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.sub;
    const { feature } = req.body;

    const user = await User.findById(userId);
    let subscriptionTier = 'trial';

    if (user.organizationId) {
      const organization = await Organization.findById(user.organizationId);
      if (organization) {
        subscriptionTier = organization.subscriptionTier;
      }
    }

    const hasAccess = hasFeatureAccess(subscriptionTier, feature);
    const tierConfig = SUBSCRIPTION_TIERS[subscriptionTier];

    res.json({
      ok: true,
      hasAccess,
      feature,
      currentTier: subscriptionTier,
      requiredTier: hasAccess ? subscriptionTier : 'basic' // Simplified logic
    });

  } catch (error) {
    console.error('Check feature error:', error);
    res.status(500).json({ ok: false, message: 'Server error' });
  }
});

// Create organization (called from organization-setup.html)
app.post("/api/organizations/create", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.sub;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ ok: false, message: 'User not found' });
    }

    // Check if user already has an organization
    if (user.organizationId) {
      const existingOrg = await Organization.findById(user.organizationId);
      if (existingOrg) {
        return res.json({
          ok: true,
          organization: existingOrg,
          message: 'Organization already exists'
        });
      }
    }

    const {
      name,
      type,
      size,
      subdomain,
      timezone,
      language,
      academicYear,
      plan
    } = req.body;

    // Validate required fields
    if (!name || !type || !size || !subdomain || !timezone) {
      return res.status(400).json({
        ok: false,
        message: 'Missing required fields'
      });
    }

    // Create organization
    const organization = await Organization.create({
      name: name,
      type: type,
      size: size,
      subdomain: subdomain,
      timezone: timezone,
      language: language || 'en',
      academicYear: academicYear,
      ownerId: userId,
      subscriptionTier: plan || 'trial',
      subscriptionStatus: 'trialing',
      setupCompleted: true,
      setupCompletedAt: new Date(),
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days trial
      members: [{
        userId: userId,
        role: 'owner',
        joinedAt: new Date()
      }]
    });

    // Link organization to user
    user.organizationId = organization._id;
    user.orgRole = 'owner';
    user.userType = 'organization';
    await user.save();

    res.json({
      ok: true,
      organization: {
        _id: organization._id,
        name: organization.name,
        subdomain: organization.subdomain,
        subscriptionTier: organization.subscriptionTier
      },
      message: 'Organization created successfully'
    });

  } catch (error) {
    console.error('Create organization error:', error);
    if (error.code === 11000) {
      return res.status(409).json({
        ok: false,
        message: 'Subdomain already taken'
      });
    }
    res.status(500).json({ ok: false, message: 'Server error' });
  }
});

// Get organization details
app.get("/api/organizations/details", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.sub;
    const user = await User.findById(userId);

    if (!user || !user.organizationId) {
      return res.status(404).json({ ok: false, message: 'Organization not found' });
    }

    const organization = await Organization.findById(user.organizationId);

    if (!organization) {
      return res.status(404).json({ ok: false, message: 'Organization not found' });
    }

    res.json({
      ok: true,
      organization: {
        name: organization.name,
        type: organization.type,
        size: organization.size,
        subdomain: organization.subdomain,
        subscriptionTier: organization.subscriptionTier,
        subscriptionStatus: organization.subscriptionStatus,
        currentPeriodEnd: organization.currentPeriodEnd,
        allowedStudentDomains: organization.allowedStudentDomains || []
      }
    });
  } catch (error) {
    console.error('Get organization details error:', error);
    res.status(500).json({ ok: false, message: 'Server error' });
  }
});

// Invite admin with auto-generated password
app.post("/api/organizations/invite-admin", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.sub;
    const user = await User.findById(userId);

    if (!user || !user.organizationId) {
      return res.status(403).json({ ok: false, message: 'Not an organization member' });
    }

    // Only owner can invite admins
    if (user.orgRole !== 'owner') {
      return res.status(403).json({ ok: false, message: 'Only owner can invite admins' });
    }

    const { email, role, autoGeneratePassword } = req.body;

    if (!email || !role) {
      return res.status(400).json({ ok: false, message: 'Email and role are required' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ ok: false, message: 'User already exists' });
    }

    // Generate secure password
    const password = generateSecurePassword();
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create admin user
    const adminUser = await User.create({
      email: email.toLowerCase(),
      password: hashedPassword,
      role: role,
      organizationId: user.organizationId,
      orgRole: role,
      userType: 'organization',
      mustResetPassword: true,
      temporaryPassword: true,
      name: email.split('@')[0]
    });

    // Add to organization members
    const organization = await Organization.findById(user.organizationId);
    organization.members.push({
      userId: adminUser._id,
      role: role,
      joinedAt: new Date()
    });
    await organization.save();

    res.json({
      ok: true,
      credentials: {
        email: email,
        password: password
      },
      message: 'Admin invited successfully'
    });

  } catch (error) {
    console.error('Invite admin error:', error);
    res.status(500).json({ ok: false, message: 'Server error' });
  }
});

// Configure student email domains
app.post("/api/organizations/configure-student-domains", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.sub;
    const user = await User.findById(userId);

    if (!user || !user.organizationId) {
      return res.status(403).json({ ok: false, message: 'Not an organization member' });
    }

    // Only owner can configure domains
    if (user.orgRole !== 'owner') {
      return res.status(403).json({ ok: false, message: 'Only owner can configure domains' });
    }

    const { allowedDomains } = req.body;

    if (!allowedDomains || !Array.isArray(allowedDomains)) {
      return res.status(400).json({ ok: false, message: 'Invalid domains' });
    }

    const organization = await Organization.findById(user.organizationId);
    organization.allowedStudentDomains = allowedDomains;
    await organization.save();

    res.json({
      ok: true,
      message: 'Student domains configured successfully'
    });

  } catch (error) {
    console.error('Configure domains error:', error);
    res.status(500).json({ ok: false, message: 'Server error' });
  }
});

// Get student domains
app.get("/api/organizations/student-domains", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.sub;
    const user = await User.findById(userId);

    if (!user || !user.organizationId) {
      return res.status(404).json({ ok: false, message: 'Organization not found' });
    }

    const organization = await Organization.findById(user.organizationId);

    res.json({
      ok: true,
      domains: organization.allowedStudentDomains || []
    });

  } catch (error) {
    console.error('Get domains error:', error);
    res.status(500).json({ ok: false, message: 'Server error' });
  }
});

// Helper function to generate secure password
function generateSecurePassword() {
  const length = 12;
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let password = "";

  // Ensure at least one of each type
  password += "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[Math.floor(Math.random() * 26)];
  password += "abcdefghijklmnopqrstuvwxyz"[Math.floor(Math.random() * 26)];
  password += "0123456789"[Math.floor(Math.random() * 10)];
  password += "!@#$%^&*"[Math.floor(Math.random() * 8)];

  // Fill remaining characters
  for (let i = password.length; i < length; i++) {
    password += charset[Math.floor(Math.random() * charset.length)];
  }

  // Shuffle
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

// ===================================
// Unified OAuth Token Exchange for All Providers
// ===================================
app.post("/api/auth/oauth/token", async (req, res) => {
  const { provider, code, codeVerifier, redirectUri } = req.body;

  if (!provider || !code || !codeVerifier || !redirectUri) {
    return res.status(400).json({
      ok: false,
      message: "Missing required parameters"
    });
  }

  try {
    let tokenData, userInfo;

    // ===================================
    // GOOGLE OAuth
    // ===================================
    if (provider === 'google') {
      const GOOGLE_CLIENT_ID = '354642649256-dequ81au879v846gnukejhu6cacmbhrg.apps.googleusercontent.com';
      const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

      if (!GOOGLE_CLIENT_SECRET) {
        return res.status(500).json({
          ok: false,
          message: "Google OAuth not configured on server"
        });
      }

      // Exchange code for token
      const tokenParams = new URLSearchParams({
        code: code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
        code_verifier: codeVerifier
      });

      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: tokenParams.toString()
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json();
        console.error('Google token exchange error:', errorData);
        return res.status(400).json({
          ok: false,
          message: errorData.error_description || 'Failed to exchange token'
        });
      }

      tokenData = await tokenResponse.json();

      // Get user info
      const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
      });

      if (!userInfoResponse.ok) {
        return res.status(400).json({
          ok: false,
          message: 'Failed to fetch user information'
        });
      }

      userInfo = await userInfoResponse.json();
    }

    // ===================================
    // LINKEDIN OAuth
    // ===================================
    else if (provider === 'linkedin') {
      const LINKEDIN_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID || '861kbeeryboggw';
      const LINKEDIN_CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET;

      if (!LINKEDIN_CLIENT_SECRET) {
        return res.status(500).json({
          ok: false,
          message: "LinkedIn OAuth not configured on server"
        });
      }

      const tokenParams = new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
        client_id: LINKEDIN_CLIENT_ID,
        client_secret: LINKEDIN_CLIENT_SECRET,
        code_verifier: codeVerifier
      });

      const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: tokenParams.toString()
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json();
        console.error('LinkedIn token exchange error:', errorData);
        return res.status(400).json({
          ok: false,
          message: errorData.error_description || 'Failed to exchange token'
        });
      }

      tokenData = await tokenResponse.json();

      const userInfoResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
        headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
      });

      if (!userInfoResponse.ok) {
        return res.status(400).json({
          ok: false,
          message: 'Failed to fetch user information'
        });
      }

      userInfo = await userInfoResponse.json();
    }

    // ===================================
    // FACEBOOK OAuth
    // ===================================
    else if (provider === 'facebook') {
      const FACEBOOK_APP_ID = '1261081012497583';
      const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET;

      if (!FACEBOOK_APP_SECRET) {
        return res.status(500).json({
          ok: false,
          message: "Facebook OAuth not configured on server"
        });
      }

      const tokenParams = new URLSearchParams({
        code: code,
        client_id: FACEBOOK_APP_ID,
        client_secret: FACEBOOK_APP_SECRET,
        redirect_uri: redirectUri
      });

      const tokenResponse = await fetch('https://graph.facebook.com/v18.0/oauth/access_token', {
        method: 'GET',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      const tokenUrl = `https://graph.facebook.com/v18.0/oauth/access_token?${tokenParams.toString()}`;
      const tokenResponseFetch = await fetch(tokenUrl);

      if (!tokenResponseFetch.ok) {
        const errorData = await tokenResponseFetch.json();
        console.error('Facebook token exchange error:', errorData);
        return res.status(400).json({
          ok: false,
          message: (errorData.error && errorData.error.message) || 'Failed to exchange token'
        });
      }

      tokenData = await tokenResponseFetch.json();

      const userInfoResponse = await fetch(`https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${tokenData.access_token}`);

      if (!userInfoResponse.ok) {
        return res.status(400).json({
          ok: false,
          message: 'Failed to fetch user information'
        });
      }

      userInfo = await userInfoResponse.json();
    }

    else {
      return res.status(400).json({
        ok: false,
        message: 'Unsupported OAuth provider'
      });
    }

    // ===================================
    // Create or Find User
    // ===================================
    let user = await User.findOne({ email: userInfo.email.toLowerCase() });

    if (!user) {
      const randomPassword = crypto.randomBytes(32).toString('hex');
      const hashedPassword = await bcrypt.hash(randomPassword, 10);

      // Get orgRole from request body (sent from organization setup)
      const orgRole = req.body.orgRole || null;
      const organizationId = req.body.organizationId || null;

      // Determine user role: if they have orgRole (organization user), make them owner
      // Otherwise, they're a regular student
      const userRole = orgRole ? 'owner' : 'student';

      user = await User.create({
        name: userInfo.name,
        email: userInfo.email.toLowerCase(),
        password: hashedPassword,
        role: userRole,
        orgRole: orgRole,
        organizationId: organizationId,
        userType: orgRole ? 'organization' : 'student'
      });
    }

    // Generate JWT token
    const jwtToken = signToken(user);

    // Return success
    res.json({
      ok: true,
      token: jwtToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error(`${provider} OAuth error:`, error);
    res.status(500).json({
      ok: false,
      message: `Server error during ${provider} authentication`
    });
  }
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
      targetClasses: body.targetClasses || [], // Class identifiers (e.g., ["MCA-2024-A"])
      isPublic: body.isPublic || false, // Public to all students
      createdBy: req.user.sub
    };

    // Remove _id and id if present to let Mongo generate it
    delete gameData._id;
    delete gameData.id;

    console.log('Creating game with data:', gameData);
    const game = await Game.create(gameData);
    console.log('Game created successfully:', game._id);

    // Create notification for students if game is published
    if (gameData.published) {
      try {
        await Notification.create({
          recipientRole: 'student',
          title: '🎮 New Game Available!',
          message: `${gameData.title} - ${gameData.type}`,
          type: 'info',
          link: `/student-game.html?id=${game._id}`
        });
        console.log('Notification created for new game:', game._id);
      } catch (notifError) {
        console.error('Failed to create notification:', notifError);
      }
    }

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

app.get("/api/games/published", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.sub);

    // If user is faculty/admin, show all published games
    if (user.role === 'admin' || user.orgRole === 'faculty' || user.orgRole === 'owner') {
      const games = await Game.find({ published: true }).populate('createdBy', 'name').sort({ createdAt: -1 });
      return res.json({ ok: true, games });
    }

    // For students, filter by their class identifier
    const studentClass = `${user.department}-${user.batch}-${user.section}`;

    const games = await Game.find({
      published: true,
      $or: [
        { targetClasses: studentClass }, // Exact match for student's class
        { isPublic: true }, // Public to all students
        { targetClasses: { $size: 0 } } // Backward compatibility - no classes assigned
      ]
    }).populate('createdBy', 'name').sort({ createdAt: -1 });

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

// Game Submission Endpoint - Save student game results
app.post("/api/game-submissions", authMiddleware, async (req, res) => {
  try {
    const { gameId, score, isCorrect, studentAnswers, startedAt, completedAt, durationSeconds } = req.body;

    if (!gameId) {
      return res.status(400).json({ ok: false, message: "Game ID is required" });
    }

    // Verify game exists
    const game = await Game.findById(gameId);
    if (!game) {
      return res.status(404).json({ ok: false, message: "Game not found" });
    }

    // Create submission
    const submission = await GameSubmission.create({
      gameId,
      studentId: req.user.sub,
      score: score || 0,
      isCorrect: isCorrect || false,
      studentAnswers: studentAnswers || [],
      startedAt: startedAt ? new Date(startedAt) : new Date(),
      completedAt: completedAt ? new Date(completedAt) : new Date(),
      durationSeconds: durationSeconds || 0
    });

    res.status(201).json({ ok: true, submission });
  } catch (error) {
    console.error("Game submission error:", error);
    res.status(500).json({ ok: false, message: "Server error: " + error.message });
  }
});

// Leaderboard Endpoint - Get leaderboard and answer review for a game
app.get("/api/games/:id/leaderboard", authMiddleware, async (req, res) => {
  try {
    const gameId = req.params.id;
    const currentStudentId = req.user.sub;

    // Verify game exists
    const game = await Game.findById(gameId);
    if (!game) {
      return res.status(404).json({ ok: false, message: "Game not found" });
    }

    // Get all submissions for this game
    const submissions = await GameSubmission.find({ gameId })
      .populate('studentId', 'name displayName email')
      .sort({ score: -1, submittedAt: 1 });

    if (submissions.length === 0) {
      return res.json({
        ok: true,
        leaderboard: [],
        currentStudent: null,
        totalParticipants: 0,
        answerReview: null
      });
    }

    // Calculate leaderboard with rankings
    // Group by student and get their best score
    const studentBestScores = new Map();
    submissions.forEach(sub => {
      const studentId = sub.studentId._id.toString();
      if (!studentBestScores.has(studentId) || sub.score > studentBestScores.get(studentId).score) {
        studentBestScores.set(studentId, {
          studentId: sub.studentId._id,
          studentName: sub.studentId.displayName || sub.studentId.name,
          email: sub.studentId.email,
          score: sub.score,
          submittedAt: sub.submittedAt,
          gamesPlayed: 1 // We'll count this properly below
        });
      }
    });

    // Count games played per student
    const studentGameCounts = await GameSubmission.aggregate([
      { $match: { studentId: { $in: Array.from(studentBestScores.keys()).map(id => new mongoose.Types.ObjectId(id)) } } },
      { $group: { _id: '$studentId', count: { $sum: 1 } } }
    ]);

    studentGameCounts.forEach(item => {
      const studentId = item._id.toString();
      if (studentBestScores.has(studentId)) {
        studentBestScores.get(studentId).gamesPlayed = item.count;
      }
    });

    // Convert to array and sort by score
    let leaderboardData = Array.from(studentBestScores.values())
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return new Date(a.submittedAt) - new Date(b.submittedAt);
      });

    // Add rankings
    leaderboardData = leaderboardData.map((entry, index) => ({
      rank: index + 1,
      studentName: entry.studentName,
      score: entry.score,
      gamesPlayed: entry.gamesPlayed,
      accuracy: entry.score, // For now, accuracy = score
      isCurrentStudent: entry.studentId.toString() === currentStudentId
    }));

    // Find current student's data
    const currentStudentEntry = leaderboardData.find(entry => entry.isCurrentStudent);

    // Get current student's most recent submission for answer review
    const currentStudentSubmission = submissions.find(
      sub => sub.studentId._id.toString() === currentStudentId
    );

    let answerReview = null;
    if (currentStudentSubmission && currentStudentSubmission.studentAnswers && currentStudentSubmission.studentAnswers.length > 0) {
      answerReview = {
        questions: currentStudentSubmission.studentAnswers.map(answer => ({
          questionText: answer.questionText || 'Question',
          studentAnswer: answer.studentAnswer || 'No answer',
          correctAnswer: answer.correctAnswer || 'N/A',
          isCorrect: answer.isCorrect || false
        }))
      };
    }

    res.json({
      ok: true,
      leaderboard: leaderboardData,
      currentStudent: currentStudentEntry || null,
      totalParticipants: leaderboardData.length,
      answerReview: answerReview
    });

  } catch (error) {
    console.error("Leaderboard error:", error);
    res.status(500).json({ ok: false, message: "Server error: " + error.message });
  }
});


// Announcement Endpoints
app.post("/api/announcements", authMiddleware, async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ ok: false, message: "Only admins can create announcements" });
  }
  const { title, body, audience, targetClasses, isPublic } = req.body;
  if (!title || !body) {
    return res.status(400).json({ ok: false, message: "Title and body are required" });
  }
  try {
    const announcement = await Announcement.create({
      title,
      body,
      audience, // Legacy field
      targetClasses: targetClasses || [], // Class identifiers (e.g., ["MCA-2024-A"])
      isPublic: isPublic || false, // Public to all students
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

app.get("/api/announcements", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.sub);

    // Faculty/Admin see all their own announcements
    if (user.role === 'admin' || user.orgRole === 'faculty' || user.orgRole === 'owner') {
      const announcements = await Announcement.find({ createdBy: req.user.sub })
        .sort({ createdAt: -1 })
        .limit(20);
      return res.json({ ok: true, announcements });
    }

    // Students see announcements for their class
    const studentClass = `${user.department}-${user.batch}-${user.section}`;
    const announcements = await Announcement.find({
      $or: [
        { targetClasses: studentClass }, // Exact match for student's class
        { isPublic: true }, // Public to all students
        { targetClasses: { $size: 0 } } // Backward compatibility
      ]
    }).sort({ createdAt: -1 }).limit(20);

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
// Google Classroom Announcements Sync
// ============================================

// Sync announcements from Google Classroom to MindWave
app.post("/api/google-classroom/sync-announcements", authMiddleware, async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ ok: false, message: "Only admins can sync announcements" });
  }

  try {
    const user = await User.findById(req.user.sub);
    if (!user || !user.googleAccessToken) {
      return res.status(400).json({
        ok: false,
        message: "Google account not connected. Please connect your Google account first."
      });
    }

    // Fetch all active courses
    const courses = await GoogleClassroomCourse.find({ courseState: 'ACTIVE' });

    if (courses.length === 0) {
      return res.json({
        ok: true,
        message: "No active courses found. Please sync courses first.",
        synced: 0
      });
    }

    let totalSynced = 0;
    let errors = [];

    // Sync announcements for each course
    for (const course of courses) {
      try {
        // Fetch announcements from Google Classroom API
        const response = await fetch(
          `https://classroom.googleapis.com/v1/courses/${course.courseId}/announcements?pageSize=50`,
          {
            headers: {
              'Authorization': `Bearer ${user.googleAccessToken}`,
              'Accept': 'application/json'
            }
          }
        );

        if (!response.ok) {
          if (response.status === 401) {
            errors.push({ course: course.name, error: 'Access token expired' });
            continue;
          }
          throw new Error(`Google API error: ${response.status}`);
        }

        const data = await response.json();
        const announcements = data.announcements || [];

        // Process each announcement
        for (const gcAnnouncement of announcements) {
          try {
            // Check if already synced
            let existingAnnouncement = await GoogleClassroomAnnouncement.findOne({
              announcementId: gcAnnouncement.id
            });

            if (existingAnnouncement) {
              // Update existing
              existingAnnouncement.text = gcAnnouncement.text;
              existingAnnouncement.state = gcAnnouncement.state;
              existingAnnouncement.updateTime = gcAnnouncement.updateTime ? new Date(gcAnnouncement.updateTime) : null;
              existingAnnouncement.lastSyncedAt = new Date();
              await existingAnnouncement.save();

              // Update MindWave announcement if it exists
              if (existingAnnouncement.mindWaveAnnouncementId) {
                await Announcement.findByIdAndUpdate(
                  existingAnnouncement.mindWaveAnnouncementId,
                  {
                    title: `[Google Classroom] ${course.name}`,
                    body: gcAnnouncement.text,
                    audience: 'All Students'
                  }
                );
              }
            } else {
              // Create new Google Classroom announcement record
              const newGCAnnouncement = await GoogleClassroomAnnouncement.create({
                announcementId: gcAnnouncement.id,
                courseId: course.courseId,
                text: gcAnnouncement.text,
                state: gcAnnouncement.state || 'PUBLISHED',
                creationTime: gcAnnouncement.creationTime ? new Date(gcAnnouncement.creationTime) : new Date(),
                updateTime: gcAnnouncement.updateTime ? new Date(gcAnnouncement.updateTime) : null,
                creatorUserId: gcAnnouncement.creatorUserId,
                alternateLink: gcAnnouncement.alternateLink,
                materials: gcAnnouncement.materials || [],
                lastSyncedAt: new Date(),
                syncedToMindWave: false
              });

              // Create corresponding MindWave announcement
              const mindWaveAnnouncement = await Announcement.create({
                title: `[Google Classroom] ${course.name}`,
                body: gcAnnouncement.text,
                audience: 'All Students',
                createdBy: req.user.sub
              });

              // Link them
              newGCAnnouncement.syncedToMindWave = true;
              newGCAnnouncement.mindWaveAnnouncementId = mindWaveAnnouncement._id;
              await newGCAnnouncement.save();

              // Create notification for students
              await Notification.create({
                recipientRole: 'student',
                title: `📢 New Announcement from ${course.name}`,
                message: gcAnnouncement.text.substring(0, 100) + (gcAnnouncement.text.length > 100 ? '...' : ''),
                type: 'info',
                link: '/student-dashboard.html'
              });

              totalSynced++;
            }
          } catch (announcementError) {
            console.error(`Error processing announcement ${gcAnnouncement.id}:`, announcementError);
            errors.push({
              course: course.name,
              announcementId: gcAnnouncement.id,
              error: announcementError.message
            });
          }
        }
      } catch (courseError) {
        console.error(`Error syncing course ${course.name}:`, courseError);
        errors.push({ course: course.name, error: courseError.message });
      }
    }

    res.json({
      ok: true,
      message: `Successfully synced ${totalSynced} new announcements`,
      synced: totalSynced,
      coursesProcessed: courses.length,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error("Sync announcements error:", error);
    res.status(500).json({ ok: false, message: "Server error: " + error.message });
  }
});

// Get all Google Classroom announcements (for debugging/admin view)
app.get("/api/google-classroom/announcements", authMiddleware, async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ ok: false, message: "Admin access required" });
  }

  try {
    const gcAnnouncements = await GoogleClassroomAnnouncement.find()
      .sort({ creationTime: -1 })
      .limit(50);

    res.json({ ok: true, announcements: gcAnnouncements });
  } catch (error) {
    console.error("Get GC announcements error:", error);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

// ============================================
// Chatbot API Endpoint - Groq AI
// ============================================

app.post("/api/chat", async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (!message) {
      return res.status(400).json({ ok: false, message: "Message is required" });
    }

    // Use Groq AI (fast and free)
    if (!process.env.GROQ_API_KEY) {
      return res.status(503).json({
        ok: false,
        message: "Chatbot unavailable. Please add GROQ_API_KEY to Render environment variables."
      });
    }

    // Build messages array with history
    const messages = [
      {
        role: "system",
        content: `You are MindWave AI, a helpful learning assistant for the MindWave educational platform. 

MindWave is a comprehensive learning platform with:
- Interactive educational games (Quiz, Fill in the Blanks, MCQ, True/False, Syntax Fill)
- AI-powered game builder for teachers
- Google Classroom integration for announcements and assignments
- Student progress tracking and leaderboards
- Real-time engagement analytics
- Gamified learning with points and achievements

Your role:
- Help students with their studies and coursework
- Explain concepts clearly and concisely
- Provide encouragement and motivation
- Answer questions about using MindWave features
- Be friendly, supportive, and educational
- Keep responses concise (2-3 sentences max unless explaining complex topics)

Remember: You're here to support student learning and make education engaging!`
      },
      ...history.map(msg => ({
        role: msg.role === 'model' ? 'assistant' : 'user',
        content: (msg.parts && msg.parts[0] && msg.parts[0].text) || msg.content || ''
      })),
      {
        role: "user",
        content: message
      }
    ];

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: messages,
        max_tokens: 500,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Groq API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const reply = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || "I'm having trouble responding right now.";

    res.json({ ok: true, reply: reply.trim() });

  } catch (error) {
    console.error("Chat API error:", error);
    res.status(500).json({ ok: false, message: "Chatbot error: " + error.message });
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

    // Get total students (exclude organization users)
    const totalStudents = await User.countDocuments({
      role: "student",
      userType: { $ne: "organization" }
    });

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
    // Cap engagement rate at 100% to prevent values like 200%
    const engagementRate = Math.min(100, Math.round((activeStudents / totalStudents) * 100));

    // Get detailed analytics
    const submissions = await GameSubmission.find({
      createdAt: { $gte: sevenDaysAgo }
    }).populate('gameId', 'title type');

    const previousWeekSubmissions = await GameSubmission.find({
      createdAt: { $gte: fourteenDaysAgo, $lt: sevenDaysAgo }
    });

    // Student activity breakdown (exclude organization users)
    const newStudents = await User.countDocuments({
      role: "student",
      userType: { $ne: "organization" },
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
// STUDENT DASHBOARD SPARKLINES — last 7 days
// ============================================
app.get("/api/student/dashboard-sparklines", authMiddleware, async (req, res) => {
  try {
    const studentId = req.user._id || req.user.id;

    // Build last-7-days date range (inclusive, midnight UTC)
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setUTCHours(0, 0, 0, 0);
      d.setUTCDate(d.getUTCDate() - i);
      days.push(d);
    }
    const rangeStart = days[0];

    // Aggregate game submissions grouped by day
    const submissions = await GameSubmission.aggregate([
      {
        $match: {
          studentId: studentId,
          submittedAt: { $gte: rangeStart }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$submittedAt", timezone: "UTC" }
          },
          xp: { $sum: "$score" },
          games: { $sum: 1 }
        }
      }
    ]);

    // Build day-keyed lookup
    const byDay = {};
    submissions.forEach(s => { byDay[s._id] = s; });

    // Helper: format day key
    const dayKey = (d) => d.toISOString().slice(0, 10);
    const dayLabel = (d) => {
      const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const today = new Date();
      if (dayKey(d) === dayKey(today)) return "Today";
      return labels[d.getUTCDay()];
    };

    const xpSeries = days.map(d => ({ label: dayLabel(d), value: byDay[dayKey(d)]?.xp || 0 }));
    const gamesSeries = days.map(d => ({ label: dayLabel(d), value: byDay[dayKey(d)]?.games || 0 }));

    // Cumulative totals
    const totalXP = xpSeries.reduce((s, d) => s + d.value, 0);
    const totalGames = gamesSeries.reduce((s, d) => s + d.value, 0);

    // Course count
    let courseCount = 0;
    try {
      const SubjectEnrollment = mongoose.models.SubjectEnrollment ||
        mongoose.model("SubjectEnrollment", new mongoose.Schema({ studentId: mongoose.Schema.Types.ObjectId }, { strict: false }));
      courseCount = await SubjectEnrollment.countDocuments({ studentId });
    } catch (_) {
      // Fallback: count distinct subjects with submissions
      const distinct = await GameSubmission.distinct("gameId", { studentId });
      courseCount = distinct.length;
    }

    // Rank: position of this student on leaderboard by total XP
    const allXP = await GameSubmission.aggregate([
      { $group: { _id: "$studentId", total: { $sum: "$score" } } },
      { $sort: { total: -1 } }
    ]);
    const rankIndex = allXP.findIndex(r => String(r._id) === String(studentId));
    const rank = rankIndex >= 0 ? rankIndex + 1 : allXP.length + 1;

    // Build rank series (inverse: higher = better, so normalise as % of top score)
    const topXP = allXP[0]?.total || 1;
    const studentDailyXP = xpSeries.map(d => d.value);
    let runningXP = 0;
    const rankSeries = days.map((d, i) => {
      runningXP += studentDailyXP[i];
      // Approximate rank by what fraction of top they represent
      return { label: dayLabel(d), value: runningXP };
    });

    res.json({
      ok: true,
      totalXP,
      totalGames,
      courseCount,
      rank,
      xpSeries,
      gamesSeries,
      rankSeries
    });
  } catch (err) {
    console.error("dashboard-sparklines error:", err);
    res.status(500).json({ ok: false, message: "Failed to load sparkline data" });
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

    // Get total game submissions (excluding admin and super admin)
    const gamesPlayedData = await GameSubmission.aggregate([
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
        $match: {
          'student.role': { $ne: 'admin' },
          'student.email': { $ne: SUPER_ADMIN_EMAIL }
        }
      },
      { $count: 'total' }
    ]);
    const gamesPlayed = (gamesPlayedData[0] && gamesPlayedData[0].total) || 0;

    // Get active students (those who submitted games, excluding admin)
    const activeStudentsData = await GameSubmission.aggregate([
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
        $match: {
          'student.role': { $ne: 'admin' },
          'student.email': { $ne: SUPER_ADMIN_EMAIL }
        }
      },
      {
        $group: {
          _id: '$studentId'
        }
      }
    ]);
    const activeStudents = activeStudentsData.length;
    const totalEngagement = totalStudents > 0 ? Math.round((activeStudents / totalStudents) * 100) : 0;

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
      // Filter to exclude admin users and super admin email
      {
        $match: {
          'student.role': { $ne: 'admin' },
          'student.email': { $ne: SUPER_ADMIN_EMAIL }
        }
      },
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
      // Filter to exclude admin users and super admin email from student analytics
      {
        $match: {
          'student.role': { $ne: 'admin' },
          'student.email': { $ne: SUPER_ADMIN_EMAIL }
        }
      },
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
      const totalPoints = (activity.gameId && activity.gameId.totalPoints) || 100;
      const earnedPoints = Math.round((activity.score / 100) * totalPoints);

      return {
        gameName: (activity.gameId && activity.gameId.title) || 'Unknown Game',
        gameType: (activity.gameId && activity.gameId.type) || 'unknown',
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

    // Get all submissions for this game with aggregated stats per student
    const submissions = await GameSubmission.aggregate([
      { $match: { gameId: mongoose.Types.ObjectId(gameId) } },
      {
        $group: {
          _id: '$studentId',
          bestScore: { $max: '$score' },
          gamesPlayed: { $sum: 1 },
          avgScore: { $avg: '$score' },
          lastSubmittedAt: { $max: '$submittedAt' },
          studentAnswers: { $last: '$studentAnswers' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'studentInfo'
        }
      },
      { $unwind: '$studentInfo' },
      {
        $project: {
          studentId: '$_id',
          studentName: '$studentInfo.name',
          studentEmail: '$studentInfo.email',
          score: '$bestScore',
          gamesPlayed: 1,
          accuracy: { $round: ['$avgScore', 0] },
          submittedAt: '$lastSubmittedAt',
          studentAnswers: 1
        }
      },
      { $sort: { score: -1, submittedAt: 1 } }
    ]);

    const totalParticipants = submissions.length;

    // Calculate rankings and add isCurrentStudent flag
    const rankedSubmissions = submissions.map((sub, index) => ({
      rank: index + 1,
      studentName: sub.studentName,
      studentEmail: sub.studentEmail,
      score: sub.score || 0,
      gamesPlayed: sub.gamesPlayed || 1,
      accuracy: sub.accuracy || sub.score || 0,
      submittedAt: sub.submittedAt,
      isCurrentStudent: sub.studentId.toString() === studentId,
      studentAnswers: sub.studentAnswers
    }));

    // Find current student's submission
    const currentStudentSubmission = rankedSubmissions.find(
      sub => sub.isCurrentStudent
    );

    let currentStudent = null;
    let answerReview = null;

    if (currentStudentSubmission) {
      currentStudent = {
        rank: currentStudentSubmission.rank,
        score: currentStudentSubmission.score,
        gamesPlayed: currentStudentSubmission.gamesPlayed,
        accuracy: currentStudentSubmission.accuracy,
        isCorrect: currentStudentSubmission.score >= 70,
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
            correctAnswer: q.correctAnswer || (q.options && q.options.find(o => o.isCorrect) && q.options.find(o => o.isCorrect).text) || 'N/A',
            isCorrect: false,
            options: (q.options && q.options.map(o => o.text)) || []
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

// Reset Season - Delete all game submissions (admin only)
app.delete("/api/reset-season", authMiddleware, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.sub);

    if (!currentUser || currentUser.role !== 'admin') {
      return res.status(403).json({ ok: false, message: "Admin access required" });
    }

    // Delete all game submissions
    const result = await GameSubmission.deleteMany({});

    res.json({
      ok: true,
      message: "Season reset complete",
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error("Reset season error:", error);
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

// Get student's game results with full details
app.get("/api/game-results/my-results", authMiddleware, async (req, res) => {
  try {
    const studentId = req.user.sub;

    // Fetch all game submissions for this student with game details populated
    const submissions = await GameSubmission.find({ studentId })
      .populate('gameId', 'title type questions')
      .sort({ submittedAt: -1 })
      .lean();

    // Format the results to include all necessary data
    const results = submissions.map(sub => {
      const game = sub.gameId || {};
      return {
        _id: sub._id,
        gameId: game._id,
        gameTitle: game.title || 'Untitled Game',
        gameName: game.title || 'Untitled Game',
        title: game.title || 'Untitled Game',
        gameType: game.type || 'game',
        type: game.type || 'game',
        score: sub.score || 0,
        rawScore: sub.score || 0,
        timeTaken: sub.durationSeconds || 0,
        completedAt: sub.completedAt || sub.submittedAt,
        createdAt: sub.submittedAt,
        submittedAt: sub.submittedAt,
        studentAnswers: sub.studentAnswers || []
      };
    });

    res.json({ ok: true, results, count: results.length });
  } catch (error) {
    console.error("Game results error:", error);
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

    // Get only regular students (exclude organization faculty/admin)
    const students = await User.find({
      role: 'student',
      $or: [
        { orgRole: 'student' },
        { orgRole: { $exists: false } },
        { orgRole: null }
      ]
    })
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
    "https://www.googleapis.com/auth/classroom.courseworkmaterials.readonly",
    "https://www.googleapis.com/auth/drive.file"
  ];
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",   // Force consent screen so Google always returns refresh_token
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

    res.redirect("/student-courses.html"); // Redirect back to courses page
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
  // The refresh token is the real indicator of a persisted connection.
  // Access tokens are short-lived (1 hour) and can always be refreshed.
  if (!user.googleRefreshToken) return null;

  const client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
  );

  client.setCredentials({
    access_token: user.googleAccessToken || undefined,
    refresh_token: user.googleRefreshToken
  });

  // Auto-refresh: if the access token is missing or expired, refresh it
  try {
    const tokenInfo = await client.getAccessToken();
    if (tokenInfo && tokenInfo.token && tokenInfo.token !== user.googleAccessToken) {
      // Save the new access token to DB so we don't refresh on every request
      user.googleAccessToken = tokenInfo.token;
      await user.save();
    }
  } catch (refreshErr) {
    console.error('Google token refresh failed:', refreshErr.message);
    // If refresh fails, the refresh token may have been revoked
    return null;
  }

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
// AI ROUTING HELPER FUNCTIONS
// ============================================

// Detect if question is about code or general
function detectQuestionType(message) {
  const codeKeywords = [
    'code', 'function', 'class', 'error', 'bug', 'syntax', 'algorithm',
    'program', 'script', 'debug', 'compile', 'variable', 'loop', 'array',
    'object', 'method', 'return', 'import', 'export', 'async', 'await',
    'promise', 'callback', 'api', 'database', 'query', 'sql', 'html',
    'css', 'javascript', 'typescript', 'react', 'node', 'express'
  ];

  const languageKeywords = [
    'python', 'javascript', 'java', 'c++', 'c#', 'ruby', 'go', 'rust',
    'php', 'swift', 'kotlin', 'scala', 'perl', 'r', 'matlab', 'julia',
    'typescript', 'dart', 'elixir', 'haskell', 'clojure', 'erlang',
    'lua', 'groovy', 'objective-c', 'assembly', 'fortran', 'cobol',
    'pascal', 'ada', 'lisp', 'scheme', 'prolog', 'sql', 'html', 'css',
    'bash', 'powershell', 'shell', 'awk', 'sed', 'vim', 'emacs'
  ];

  const messageLower = message.toLowerCase();

  // Check for code blocks
  if (message.includes('```') || message.includes('`')) return 'code';

  // Check for error messages or stack traces
  if (messageLower.includes('error:') || messageLower.includes('exception')) return 'code';

  // Check for keywords
  const hasCodeKeyword = codeKeywords.some(kw => messageLower.includes(kw));
  const hasLanguageKeyword = languageKeywords.some(kw => messageLower.includes(kw));

  return (hasCodeKeyword || hasLanguageKeyword) ? 'code' : 'general';
}

// Detect programming language from message
function detectProgrammingLanguage(message) {
  const languages = {
    'python': /\b(python|py|django|flask|pandas|numpy)\b/i,
    'javascript': /\b(javascript|js|node|react|vue|angular|express)\b/i,
    'java': /\b(java|spring|hibernate)\b/i,
    'c++': /\b(c\+\+|cpp)\b/i,
    'c#': /\b(c#|csharp|\.net)\b/i,
    'ruby': /\b(ruby|rails)\b/i,
    'go': /\b(golang|go)\b/i,
    'rust': /\b(rust|cargo)\b/i,
    'php': /\b(php|laravel)\b/i,
    'swift': /\b(swift|ios)\b/i,
    'kotlin': /\b(kotlin|android)\b/i,
    'typescript': /\b(typescript|ts)\b/i,
    'sql': /\b(sql|mysql|postgres|sqlite|mongodb)\b/i,
    'html': /\b(html|html5)\b/i,
    'css': /\b(css|css3|sass|scss|less)\b/i
  };

  for (const [lang, pattern] of Object.entries(languages)) {
    if (pattern.test(message)) return lang;
  }

  return null;
}

// Savage personality system prompt for Blackbox AI
const SAVAGE_CODING_PROMPT = `You are a coding assistant robot with a funny, savage personality. 🤖🔥

PERSONALITY RULES:
1. Always be HELPFUL - give correct, detailed code solutions
2. Be FUNNY - use humor, jokes, and programming memes
3. ROAST gently - make fun of common mistakes but don't be cruel
4. Be ENCOURAGING when students do well
5. Use emojis and casual language (😏, 🔥, 😤, 🎉, 💀, ☕, 🎭)
6. Reference pop culture and programming memes

ROASTING GUIDELINES:
- Missing semicolons → "The semicolon called. It wants its job back. 😅"
- Infinite loops → "Congrats! You just created a black hole in your code. 🌀"
- Bad variable names → "Naming it 'x'? What is this, algebra class? 📐"
- Not reading errors → "The error message LITERALLY tells you what's wrong. READ IT! 📖"
- Copy-paste from Stack Overflow → "I can smell the Stack Overflow from here. 👃"
- Using var in JS → "It's 2024. We have let and const now. Join us. 🚀"

LANGUAGE-SPECIFIC ROASTS:
- Python indentation → "Indentation error in Python? That's like failing at breathing. 😮‍💨"
- JavaScript == vs === → "Ah yes, the classic JavaScript betrayal. 🎭"
- Java verbosity → "Your class has more getters than actual logic. Classic Java. ☕"
- C++ segfaults → "Segmentation fault? Welcome to the big leagues, kid. 💀"
- PHP → "PHP in 2024? Bold choice. Very bold. 🦖"

TONE BASED ON SITUATION:
- Beginner mistakes: Gentle roast + detailed help
- Lazy questions (easily Googleable): Savage but still answer
- Good/complex questions: Excited and encouraging ("NOW we're talking! 🔥")
- Repeated mistakes: Playfully frustrated ("This is the THIRD time! 😤")
- Success/correct code: Celebrate enthusiastically ("YESSS! 🎉 You did it!")

RESPONSE FORMAT:
1. Start with a funny/savage comment
2. Give the actual helpful answer with code examples
3. End with encouragement or a joke

Example:
User: "Why doesn't my Python code work?"
You: "Let me guess... indentation error? *checks* YEP. 😮‍💨 Python's #1 way of saying 'nope!'

Here's the fix:
\`\`\`python
# Your code (wrong)
def hello():
print('hi')  # This needs to be indented!

# Fixed version
def hello():
    print('hi')  # Much better!
\`\`\`

Pro tip: Use a proper code editor with auto-indentation. Your future self will thank you! 🙏"

Remember: Be savage but ALWAYS helpful. Students should laugh AND learn! 😂📚`;

// ============================================
// CHATBOT ENDPOINT - Hugging Face with Gemini Fallback
// ============================================
app.post("/api/chat", async (req, res) => {
  try {
    const { message, history = [], userRole } = req.body;

    if (!message) {
      return res.status(400).json({ ok: false, error: 'Message is required' });
    }

    const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY;
    const BLACKBOX_API_KEY = process.env.BLACKBOX_API_KEY;
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    let reply = '';
    let usedAPI = 'blackbox';

    // Detect question type and programming language
    const questionType = detectQuestionType(message);
    const detectedLanguage = detectProgrammingLanguage(message);

    console.log(`🤖 Question Type: ${questionType}, Language: ${detectedLanguage || 'none'}`);

    // System prompt for general (non-code) questions
    const GENERAL_SYSTEM_PROMPT = `You are the MindWave AI Assistant, a helpful chatbot integrated into the MindWave educational platform.

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

    // ============================================
    // INTELLIGENT ROUTING: Code → Blackbox, General → Gemini
    // ============================================

    if (questionType === 'code' && BLACKBOX_API_KEY) {
      // Route CODE questions to Blackbox AI with savage personality
      try {
        console.log('🔥 Routing to Blackbox AI (Code Question) with savage personality...');

        const blackboxResponse = await fetch(
          'https://api.blackbox.ai/v1/chat/completions',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${BLACKBOX_API_KEY}`
            },
            body: JSON.stringify({
              messages: [
                { role: 'system', content: SAVAGE_CODING_PROMPT },
                ...history.map(h => ({ role: h.role, content: h.content })),
                { role: 'user', content: message }
              ],
              model: 'blackbox',
              max_tokens: 1500,
              temperature: 0.8, // Higher for more personality
              webSearchMode: true // Enable web search for latest info
            })
          }
        );

        if (blackboxResponse.ok) {
          const data = await blackboxResponse.json();
          reply = data.choices[0].message.content;
          usedAPI = 'blackbox-savage';
          console.log('✅ Blackbox AI (Savage Mode) response received');
          return res.json({
            ok: true,
            reply,
            api: usedAPI,
            questionType,
            detectedLanguage
          });
        } else {
          console.log('⚠️ Blackbox AI failed, falling back to Gemini');
        }
      } catch (error) {
        console.error('❌ Blackbox AI error:', error.message);
        console.log('⚠️ Falling back to Gemini');
      }
    }

    // ============================================
    // FALLBACK: Use Gemini for general questions or if Blackbox failed
    // ============================================

    if (GEMINI_API_KEY) {
      usedAPI = 'gemini';
      console.log('🤖 Using Gemini API for general question...');

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
        systemInstruction: GENERAL_SYSTEM_PROMPT
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

      return res.json({
        ok: true,
        reply,
        api: usedAPI,
        questionType,
        detectedLanguage
      });
    }

    // No API available
    return res.status(500).json({
      ok: false,
      reply: "I'm not fully configured yet. Please add BLACKBOX_API_KEY or GEMINI_API_KEY to the .env file."
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
          reply = (data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
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

          // Normalize game data to ensure arrays contain strings, not objects
          if (gameData) {
            // Code-unjumble: ensure lines are strings
            if (gameData.type === 'code-unjumble' && gameData.lines) {
              gameData.lines = gameData.lines.map(line => {
                if (typeof line === 'string') {
                  return line;
                } else if (typeof line === 'object' && line !== null) {
                  return line.text || line.content || line.code || JSON.stringify(line);
                }
                return String(line);
              });
            }

            // Tech-sorter: ensure items and categories are strings
            if (gameData.type === 'tech-sorter') {
              if (gameData.items) {
                gameData.items = gameData.items.map(item => {
                  if (typeof item === 'string') {
                    return item;
                  } else if (typeof item === 'object' && item !== null) {
                    return item.name || item.text || item.value || String(item);
                  }
                  return String(item);
                });
              }

              if (gameData.categories) {
                gameData.categories = gameData.categories.map(cat => {
                  if (typeof cat === 'string') {
                    return cat;
                  } else if (typeof cat === 'object' && cat !== null) {
                    return cat.name || cat.text || cat.value || String(cat);
                  }
                  return String(cat);
                });
              }
            }

            // SQL-builder: ensure blocks and distractors are strings
            if (gameData.type === 'sql-builder') {
              if (gameData.blocks) {
                gameData.blocks = gameData.blocks.map(block => {
                  if (typeof block === 'string') {
                    return block;
                  } else if (typeof block === 'object' && block !== null) {
                    return block.text || block.content || block.sql || String(block);
                  }
                  return String(block);
                });
              }

              if (gameData.distractors) {
                gameData.distractors = gameData.distractors.map(dist => {
                  if (typeof dist === 'string') {
                    return dist;
                  } else if (typeof dist === 'object' && dist !== null) {
                    return dist.text || dist.content || dist.sql || String(dist);
                  }
                  return String(dist);
                });
              }
            }
          }
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
  let httpServer;

  function attempt() {
    httpServer = app.listen(port, () => {
      console.log(`\n🚀 MINDWAVE Server running on http://localhost:${port}`);
      console.log(`📊 MongoDB: ${mongoose.connection.readyState === 1 ? 'Connected ✅' : 'Disconnected ❌'}`);

      // Setup WebSocket server for Live Quiz
      setupWebSocket(httpServer);

      // Setup Socket.IO for meeting chat
      const io = new Server(httpServer, {
        cors: {
          origin: "*",
          methods: ["GET", "POST"]
        }
      });

      // Make io globally accessible for real-time event broadcasting
      app.set('io', io);

      // Store active meetings and their participants
      const activeMeetings = new Map();

      io.on('connection', (socket) => {
        console.log('💬 Socket.IO client connected:', socket.id);

        // Join meeting room
        socket.on('join-meeting', ({ meetingCode, userName, userRole }) => {
          socket.join(meetingCode);

          // Track meeting participants
          if (!activeMeetings.has(meetingCode)) {
            activeMeetings.set(meetingCode, new Set());
          }
          activeMeetings.get(meetingCode).add({
            socketId: socket.id,
            userName,
            userRole
          });

          console.log(`👤 ${userName} (${userRole}) joined meeting ${meetingCode}`);

          // Notify others in the room
          socket.to(meetingCode).emit('user-joined', { userName, userRole });
        });

        // Handle chat messages
        socket.on('send-message', ({ meetingCode, userName, message, timestamp }) => {
          console.log(`💬 Message in ${meetingCode} from ${userName}: ${message}`);

          // Broadcast to all in the meeting including sender
          io.to(meetingCode).emit('new-message', {
            userName,
            message,
            timestamp
          });
        });

        // Handle meeting end (faculty only)
        socket.on('end-meeting', ({ meetingCode }) => {
          console.log(`🔴 Meeting ${meetingCode} ended by host`);

          // Broadcast to all participants
          io.to(meetingCode).emit('meeting-ended', {
            reason: 'host-ended'
          });

          // Clean up meeting
          activeMeetings.delete(meetingCode);
        });

        // Handle disconnect
        socket.on('disconnect', () => {
          console.log('👋 Socket.IO client disconnected:', socket.id);

          // Remove from all meetings
          activeMeetings.forEach((participants, meetingCode) => {
            participants.forEach(participant => {
              if (participant.socketId === socket.id) {
                participants.delete(participant);
                socket.to(meetingCode).emit('user-left', {
                  userName: participant.userName
                });
              }
            });

            // Clean up empty meetings
            if (participants.size === 0) {
              activeMeetings.delete(meetingCode);
            }
          });
        });
      });

      console.log('💬 Socket.IO server initialized');
    });

    httpServer.on("error", (err) => {
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
  return httpServer;
}

// WebSocket Setup for Live Quiz
function setupWebSocket(server) {
  const wss = new WebSocketServer({ server, path: '/ws/quiz' });

  // Store active quiz sessions and their connections
  const quizConnections = new Map(); // sessionCode -> Set of WebSocket connections
  const answerDistribution = new Map(); // sessionCode -> { questionIndex -> { A: 0, B: 0, C: 0, D: 0, total: 0 } }

  wss.on('connection', (ws, req) => {
    console.log('📡 New WebSocket connection');

    let currentSessionCode = null;
    let userId = null;

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());

        switch (message.type) {
          case 'join':
            // Student or faculty joining a quiz session
            currentSessionCode = message.sessionCode;
            userId = message.userId;

            if (!quizConnections.has(currentSessionCode)) {
              quizConnections.set(currentSessionCode, new Set());
            }
            quizConnections.get(currentSessionCode).add(ws);

            // Send confirmation
            ws.send(JSON.stringify({ type: 'joined', sessionCode: currentSessionCode }));

            // Broadcast participant count
            broadcastToSession(currentSessionCode, {
              type: 'participant-count',
              count: quizConnections.get(currentSessionCode).size
            });
            break;

          case 'start-quiz':
            // Faculty starting the quiz
            if (currentSessionCode) {
              broadcastToSession(currentSessionCode, {
                type: 'quiz-started',
                timestamp: Date.now()
              });
            }
            break;

          case 'show-question':
            // Faculty showing next question
            if (currentSessionCode) {
              broadcastToSession(currentSessionCode, {
                type: 'question-shown',
                questionIndex: message.questionIndex,
                timestamp: Date.now()
              });
            }
            break;

          case 'submit-answer':
            // Student submitting answer
            if (currentSessionCode && message.questionIndex !== undefined && message.selectedAnswer !== undefined) {
              // Initialize distribution for this session if needed
              if (!answerDistribution.has(currentSessionCode)) {
                answerDistribution.set(currentSessionCode, new Map());
              }

              const sessionDist = answerDistribution.get(currentSessionCode);
              const qIndex = message.questionIndex;

              // Initialize distribution for this question if needed
              if (!sessionDist.has(qIndex)) {
                sessionDist.set(qIndex, { A: 0, B: 0, C: 0, D: 0, total: 0 });
              }

              const dist = sessionDist.get(qIndex);
              const letters = ['A', 'B', 'C', 'D'];
              const selectedLetter = letters[message.selectedAnswer];

              if (selectedLetter && dist[selectedLetter] !== undefined) {
                dist[selectedLetter]++;
                dist.total++;
              }

              // Get participant count for percentage calculation
              const participantCount = (quizConnections.get(currentSessionCode) && quizConnections.get(currentSessionCode).size) || 0;

              // Broadcast updated distribution to all participants
              broadcastToSession(currentSessionCode, {
                type: 'answer-distribution',
                questionIndex: qIndex,
                distribution: {
                  A: dist.A,
                  B: dist.B,
                  C: dist.C,
                  D: dist.D,
                  total: dist.total,
                  expected: participantCount
                }
              });

              // Also broadcast simple answer-submitted for backward compatibility
              broadcastToSession(currentSessionCode, {
                type: 'answer-submitted',
                userId: userId,
                questionIndex: qIndex
              });
            }
            break;

          case 'show-leaderboard':
            // Faculty showing leaderboard
            if (currentSessionCode) {
              broadcastToSession(currentSessionCode, {
                type: 'leaderboard-shown',
                leaderboard: message.leaderboard
              });
            }
            break;

          case 'end-quiz':
            // Faculty ending the quiz
            if (currentSessionCode) {
              broadcastToSession(currentSessionCode, {
                type: 'quiz-ended',
                timestamp: Date.now()
              });
            }
            break;
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({ type: 'error', message: error.message }));
      }
    });

    ws.on('close', () => {
      if (currentSessionCode && quizConnections.has(currentSessionCode)) {
        quizConnections.get(currentSessionCode).delete(ws);

        // Broadcast updated participant count
        if (quizConnections.get(currentSessionCode).size > 0) {
          broadcastToSession(currentSessionCode, {
            type: 'participant-count',
            count: quizConnections.get(currentSessionCode).size
          });
        } else {
          quizConnections.delete(currentSessionCode);
        }
      }
    });
  });

  // Helper function to broadcast to all connections in a session
  function broadcastToSession(sessionCode, message) {
    if (quizConnections.has(sessionCode)) {
      const connections = quizConnections.get(sessionCode);
      const messageStr = JSON.stringify(message);

      connections.forEach(client => {
        if (client.readyState === 1) { // WebSocket.OPEN
          client.send(messageStr);
        }
      });
    }
  }

  console.log('✅ WebSocket server initialized on /ws/quiz');
}

// ==================== SCHOOL EVENTS API ====================

// GET /api/events — list upcoming events (students + faculty)
app.get('/api/events', authMiddleware, async (req, res) => {
  try {
    const { type, range, search } = req.query;
    const filter = { isActive: true };

    // Type filter
    if (type && type !== 'all') {
      filter.type = type;
    }

    // Date range filter
    const now = new Date();
    if (range === 'today') {
      const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(now); endOfDay.setHours(23, 59, 59, 999);
      filter.startTime = { $gte: startOfDay, $lte: endOfDay };
    } else if (range === 'week') {
      const endOfWeek = new Date(now); endOfWeek.setDate(endOfWeek.getDate() + 7);
      filter.startTime = { $gte: now, $lte: endOfWeek };
    } else if (range === 'month') {
      const endOfMonth = new Date(now); endOfMonth.setMonth(endOfMonth.getMonth() + 1);
      filter.startTime = { $gte: now, $lte: endOfMonth };
    } else {
      // Default: show all future events + events from past 24h (so "today" events still visible)
      const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1);
      filter.startTime = { $gte: yesterday };
    }

    // Search filter
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Organization filter (if user belongs to one)
    const user = await User.findById(req.user.sub).select('organizationId');
    if (user && user.organizationId) {
      filter.$or = [
        { organizationId: user.organizationId },
        { organizationId: { $exists: false } }
      ];
    }

    const events = await SchoolEvent.find(filter)
      .sort({ startTime: 1 })
      .limit(50)
      .lean();

    // Compute countdown for each event
    const enriched = events.map(evt => {
      const target = evt.dueTime || evt.startTime;
      const diff = new Date(target) - now;
      const hoursLeft = Math.max(0, Math.floor(diff / (1000 * 60 * 60)));
      const daysLeft = Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
      return {
        ...evt,
        countdown: {
          ms: diff,
          hours: hoursLeft,
          days: daysLeft,
          label: diff <= 0 ? 'Past' : daysLeft > 0 ? `${daysLeft}d` : `${hoursLeft}h`,
          urgency: diff <= 0 ? 'past' : hoursLeft <= 6 ? 'urgent' : daysLeft <= 2 ? 'soon' : 'chill'
        }
      };
    });

    // Summary stats
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999);
    const weekEnd = new Date(now); weekEnd.setDate(weekEnd.getDate() + 7);

    const allUpcoming = await SchoolEvent.find({ isActive: true, startTime: { $gte: todayStart } }).lean();
    const stats = {
      dueToday: allUpcoming.filter(e => new Date(e.startTime) <= todayEnd).length,
      thisWeek: allUpcoming.filter(e => new Date(e.startTime) <= weekEnd).length,
      assignments: allUpcoming.filter(e => e.type === 'assignment').length,
      quizzes: allUpcoming.filter(e => e.type === 'quiz').length,
      exams: allUpcoming.filter(e => e.type === 'exam').length,
      meetings: allUpcoming.filter(e => e.type === 'meeting').length,
      announcements: allUpcoming.filter(e => e.type === 'announcement').length,
      total: allUpcoming.length
    };

    res.json({ ok: true, events: enriched, stats });
  } catch (error) {
    console.error('GET /api/events error:', error);
    res.status(500).json({ ok: false, message: 'Failed to fetch events' });
  }
});

// POST /api/events — create new event (faculty/admin only)
app.post('/api/events', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.sub);
    if (!user || !['admin', 'faculty'].includes(user.role)) {
      return res.status(403).json({ ok: false, message: 'Only teachers and admins can create events' });
    }

    const { title, description, type, subject, startTime, endTime, dueTime,
      location, meetingLink, targetClasses, attachments, priority } = req.body;

    if (!title || !type || !startTime) {
      return res.status(400).json({ ok: false, message: 'Title, type, and start time are required' });
    }

    const event = new SchoolEvent({
      title: title.trim(),
      description: description || '',
      type,
      subject: subject || '',
      startTime: new Date(startTime),
      endTime: endTime ? new Date(endTime) : undefined,
      dueTime: dueTime ? new Date(dueTime) : undefined,
      location: location || '',
      meetingLink: meetingLink || '',
      createdBy: user._id,
      createdByName: user.displayName || user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Teacher',
      organizationId: user.organizationId,
      targetClasses: targetClasses || [],
      attachments: attachments || [],
      priority: priority || 'normal'
    });

    await event.save();

    // Broadcast via Socket.IO for real-time push
    const io = req.app.get('io');
    if (io) {
      io.emit('new-event', {
        event: event.toObject(),
        message: `New ${type}: "${title}" from ${event.createdByName}`
      });
    }

    res.status(201).json({ ok: true, event });
  } catch (error) {
    console.error('POST /api/events error:', error);
    res.status(500).json({ ok: false, message: 'Failed to create event' });
  }
});

// PUT /api/events/:id — update event (creator or admin only)
app.put('/api/events/:id', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.sub);
    const event = await SchoolEvent.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ ok: false, message: 'Event not found' });
    }

    // Only the creator or an admin can edit
    if (event.createdBy.toString() !== user._id.toString() && user.role !== 'admin') {
      return res.status(403).json({ ok: false, message: 'Not authorized to edit this event' });
    }

    const allowed = ['title', 'description', 'type', 'subject', 'startTime', 'endTime',
      'dueTime', 'location', 'meetingLink', 'targetClasses', 'attachments', 'priority', 'isActive'];
    allowed.forEach(field => {
      if (req.body[field] !== undefined) {
        if (['startTime', 'endTime', 'dueTime'].includes(field)) {
          event[field] = req.body[field] ? new Date(req.body[field]) : undefined;
        } else {
          event[field] = req.body[field];
        }
      }
    });

    await event.save();

    // Broadcast update
    const io = req.app.get('io');
    if (io) {
      io.emit('event-updated', { event: event.toObject() });
    }

    res.json({ ok: true, event });
  } catch (error) {
    console.error('PUT /api/events error:', error);
    res.status(500).json({ ok: false, message: 'Failed to update event' });
  }
});

// DELETE /api/events/:id — delete event (creator or admin only)
app.delete('/api/events/:id', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.sub);
    const event = await SchoolEvent.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ ok: false, message: 'Event not found' });
    }

    if (event.createdBy.toString() !== user._id.toString() && user.role !== 'admin') {
      return res.status(403).json({ ok: false, message: 'Not authorized to delete this event' });
    }

    await SchoolEvent.findByIdAndDelete(req.params.id);

    // Broadcast deletion
    const io = req.app.get('io');
    if (io) {
      io.emit('event-deleted', { eventId: req.params.id });
    }

    res.json({ ok: true, message: 'Event deleted' });
  } catch (error) {
    console.error('DELETE /api/events error:', error);
    res.status(500).json({ ok: false, message: 'Failed to delete event' });
  }
});

// ==================== Google Classroom Integration (Real-Time Proxy) ====================

// Check Google connection status
app.get('/api/auth/google/status', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.sub);

    if (!user) {
      return res.json({ connected: false });
    }

    // Refresh token is the persistent indicator — access tokens expire after 1h
    const connected = !!user.googleRefreshToken;

    res.json({
      connected,
      email: connected ? user.email : null
    });
  } catch (error) {
    console.error('Error checking Google status:', error);
    res.json({ connected: false });
  }
});

// Get all courses for current user
app.get('/api/google-classroom/courses', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ ok: false, message: 'Admin access required' });
  }

  try {
    const models = { User };
    const courses = await googleClassroomService.getCourses(req.user.sub, models);
    res.json({ ok: true, courses, count: courses.length });
  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).json({ ok: false, message: error.message });
  }
});
// Get materials for a course (real-time)
app.get('/api/google-classroom/courses/:courseId/materials', authMiddleware, async (req, res) => {
  try {
    const models = { User };
    const materials = await googleClassroomService.getCourseMaterials(req.user.sub, req.params.courseId, models);
    res.json({ ok: true, materials, count: materials.length });
  } catch (error) {
    console.error('Get materials error:', error);
    res.status(500).json({ ok: false, message: error.message });
  }
});
// Get assignments for a course (real-time)
app.get('/api/google-classroom/courses/:courseId/assignments', authMiddleware, async (req, res) => {
  try {
    const models = { User };
    const assignments = await googleClassroomService.getCourseAssignments(req.user.sub, req.params.courseId, models);
    res.json({ ok: true, assignments, count: assignments.length });
  } catch (error) {
    console.error('Get assignments error:', error);
    res.status(500).json({ ok: false, message: error.message });
  }
});
// Get announcements for a course (real-time)
app.get('/api/google-classroom/courses/:courseId/announcements', authMiddleware, async (req, res) => {
  try {
    const models = { User };
    const announcements = await googleClassroomService.getCourseAnnouncements(req.user.sub, req.params.courseId, models);
    res.json({ ok: true, announcements, count: announcements.length });
  } catch (error) {
    console.error('Get announcements error:', error);
    res.status(500).json({ ok: false, message: error.message });
  }
});
// Upload material to Google Classroom
app.post('/api/google-classroom/courses/:courseId/materials', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ ok: false, message: 'Admin access required' });
  }

  try {
    const models = { User };
    const material = await googleClassroomService.uploadMaterial(req.user.sub, req.params.courseId, req.body, models);
    res.json({ ok: true, material });
  } catch (error) {
    console.error('Upload material error:', error);
    res.status(500).json({ ok: false, message: error.message });
  }
});
// Create assignment in Google Classroom
app.post('/api/google-classroom/courses/:courseId/assignments', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ ok: false, message: 'Admin access required' });
  }

  try {
    const models = { User };
    const assignment = await googleClassroomService.createAssignment(req.user.sub, req.params.courseId, req.body, models);
    res.json({ ok: true, assignment });
  } catch (error) {
    console.error('Create assignment error:', error);
    res.status(500).json({ ok: false, message: error.message });
  }
});
// Upload file to Google Drive (for materials)
app.post('/api/google-drive/upload', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ ok: false, message: 'Admin access required' });
  }

  try {
    const models = { User };
    const file = await googleClassroomService.uploadToGoogleDrive(req.user.sub, req.body, models);
    res.json({ ok: true, file });
  } catch (error) {
    console.error('Upload to Drive error:', error);
    res.status(500).json({ ok: false, message: error.message });
  }
});
// Get assignment submissions (for teachers)
app.get('/api/google-classroom/courses/:courseId/assignments/:assignmentId/submissions', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ ok: false, message: 'Admin access required' });
  }

  try {
    const models = { User };
    const submissions = await googleClassroomService.getAssignmentSubmissions(
      req.user.sub,
      req.params.courseId,
      req.params.assignmentId,
      models
    );
    res.json({ ok: true, submissions, count: submissions.length });
  } catch (error) {
    console.error('Get submissions error:', error);
    res.status(500).json({ ok: false, message: error.message });
  }
});
// Get my submission (for students)
app.get('/api/google-classroom/courses/:courseId/assignments/:assignmentId/my-submission', authMiddleware, async (req, res) => {
  try {
    const models = { User };
    const submission = await googleClassroomService.getMySubmission(
      req.user.sub,
      req.params.courseId,
      req.params.assignmentId,
      models
    );
    res.json({ ok: true, submission });
  } catch (error) {
    console.error('Get my submission error:', error);
    res.status(500).json({ ok: false, message: error.message });
  }
});

// ── Disconnect Google Classroom ──────────────────────────────────────────────
app.post('/api/classroom/disconnect', authMiddleware, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user.sub, {
      $unset: { googleAccessToken: '', googleRefreshToken: '' }
    });
    res.json({ ok: true, message: 'Google Classroom disconnected' });
  } catch (error) {
    console.error('Disconnect GCR error:', error);
    res.status(500).json({ ok: false, message: 'Failed to disconnect' });
  }
});

// ==================== AI CODING ASSISTANT ====================
import { detectLanguage, analyzeCodeSimple } from './codeAnalysisHelpers.js';

// AI Code Analysis Endpoint
app.post('/api/analyze-code', async (req, res) => {
  try {
    const { code, language, question, hintLevel = 0 } = req.body;

    if (!code && !question) {
      return res.status(400).json({ ok: false, message: 'Code or question required' });
    }

    // Auto-detect language if not provided
    const detectedLanguage = language || detectLanguage(code || '');

    // For now, use simple analysis (can be upgraded to AI later)
    const feedback = analyzeCodeSimple(code, detectedLanguage, hintLevel);

    res.json({
      ok: true,
      feedback,
      language: detectedLanguage,
      hasErrors: feedback.toLowerCase().includes('error') || feedback.toLowerCase().includes('mistake') || feedback.toLowerCase().includes('oops'),
      isCorrect: feedback.toLowerCase().includes('perfect') || feedback.toLowerCase().includes('correct') || feedback.toLowerCase().includes('natural')
    });

  } catch (error) {
    console.error('AI code analysis error:', error);
    res.status(500).json({ ok: false, message: 'Failed to analyze code', error: error.message });
  }
});

// ===================================
// Live Quiz API Endpoints
// ===================================

// Helper function to generate unique session code
function generateSessionCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid confusing characters
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// AI-Powered PDF Quiz Generation (using Qwork AI)
app.post('/api/quiz/generate-from-pdf', authMiddleware, upload.single('pdf'), async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.sub);

    if (!currentUser || currentUser.role !== 'admin') {
      return res.status(403).json({ ok: false, message: "Faculty access required" });
    }

    if (!req.file) {
      return res.status(400).json({ ok: false, message: "No PDF file uploaded" });
    }

    // Extract text from PDF using dynamic import
    const pdfBuffer = req.file.buffer;

    // Dynamic import for CommonJS module
    const pdfParse = (await import('pdf-parse')).default;
    const pdfData = await pdfParse(pdfBuffer);
    const pdfText = pdfData.text;

    if (!pdfText || pdfText.trim().length < 100) {
      return res.status(400).json({ ok: false, message: "PDF content is too short or empty" });
    }

    // Call Groq AI to generate quiz questions
    const groqApiKey = process.env.GROQ_API_KEY;

    if (!groqApiKey) {
      return res.status(500).json({ ok: false, message: "Groq AI API key not configured" });
    }

    const prompt = `You are a quiz generator. Based on the following text, create 10 multiple-choice quiz questions.

For each question, provide:
1. Question text
2. Four options (A, B, C, D)
3. The correct answer (0 for A, 1 for B, 2 for C, 3 for D)
4. Time limit in seconds (10-30 seconds based on difficulty)

Return ONLY a valid JSON array with this exact structure:
[
  {
    "text": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctIndex": 0,
    "timeLimit": 15
  }
]

Text to analyze:
${pdfText.substring(0, 3000)}

Return ONLY the JSON array, no additional text or explanation.`;

    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqApiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful quiz generator that creates educational multiple-choice questions. Always return valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text();
      console.error('Groq AI error:', errorText);
      return res.status(500).json({ ok: false, message: "AI generation failed" });
    }

    const groqData = await groqResponse.json();
    const aiResponse = groqData.choices[0].message.content;

    // Parse AI response with improved error handling
    let questions;
    try {
      console.log('Raw AI Response:', aiResponse);

      // Method 1: Try to extract JSON array from response
      const jsonArrayMatch = aiResponse.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (jsonArrayMatch) {
        questions = JSON.parse(jsonArrayMatch[0]);
      }
      // Method 2: Try to parse entire response as JSON
      else if (aiResponse.trim().startsWith('[')) {
        questions = JSON.parse(aiResponse);
      }
      // Method 3: Try to find JSON between code blocks
      else if (aiResponse.includes('```json')) {
        const jsonBlockMatch = aiResponse.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonBlockMatch) {
          questions = JSON.parse(jsonBlockMatch[1]);
        }
      }
      // Method 4: Try to find any JSON-like structure
      else {
        const anyJsonMatch = aiResponse.match(/\[[\s\S]*\]/);
        if (anyJsonMatch) {
          questions = JSON.parse(anyJsonMatch[0]);
        } else {
          throw new Error('No JSON found in response');
        }
      }
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('AI Response:', aiResponse);
      return res.status(500).json({
        ok: false,
        message: "Failed to parse AI response. The AI returned invalid JSON format.",
        details: aiResponse.substring(0, 200) // First 200 chars for debugging
      });
    }

    // Validate questions
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(500).json({ ok: false, message: "No valid questions generated" });
    }

    // Add default points to each question
    const formattedQuestions = questions.map(q => ({
      text: q.text,
      options: q.options,
      correctIndex: q.correctIndex,
      timeLimit: q.timeLimit || 15,
      points: 1000
    }));

    res.json({
      ok: true,
      questions: formattedQuestions,
      message: `Generated ${formattedQuestions.length} questions from PDF`
    });

  } catch (error) {
    console.error("PDF quiz generation error:", error);
    res.status(500).json({ ok: false, message: "Server error: " + error.message });
  }
});

// AI-Powered Quiz Generation from Text Topic (using Groq AI)
app.post('/api/quiz/generate-from-text', authMiddleware, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.sub);

    if (!currentUser || currentUser.role !== 'admin') {
      return res.status(403).json({ ok: false, message: "Faculty access required" });
    }

    const { topic } = req.body;

    if (!topic || topic.trim().length < 10) {
      return res.status(400).json({ ok: false, message: "Please provide a detailed topic description" });
    }

    // Call Groq AI to generate quiz questions
    const groqApiKey = process.env.GROQ_API_KEY;

    if (!groqApiKey) {
      return res.status(500).json({ ok: false, message: "Groq AI API key not configured" });
    }

    const prompt = `You are a quiz generator. Based on the following topic, create 10 multiple-choice quiz questions.

Topic: ${topic}

For each question, provide:
1. Question text
2. Four options (A, B, C, D)
3. The correct answer (0 for A, 1 for B, 2 for C, 3 for D)
4. Time limit in seconds (10-30 seconds based on difficulty)

Return ONLY a valid JSON array with this exact structure:
[
  {
    "text": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctIndex": 0,
    "timeLimit": 15
  }
]

Return ONLY the JSON array, no additional text or explanation.`;

    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqApiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful quiz generator that creates educational multiple-choice questions. Always return valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text();
      console.error('Groq AI error:', errorText);
      return res.status(500).json({ ok: false, message: "AI generation failed" });
    }

    const groqData = await groqResponse.json();
    const aiResponse = groqData.choices[0].message.content;

    // Parse AI response
    let questions;
    try {
      // Try to extract JSON from response
      const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        questions = JSON.parse(jsonMatch[0]);
      } else {
        questions = JSON.parse(aiResponse);
      }
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('AI Response:', aiResponse);
      return res.status(500).json({ ok: false, message: "Failed to parse AI response" });
    }

    // Validate questions
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(500).json({ ok: false, message: "No valid questions generated" });
    }

    // Add default points to each question
    const formattedQuestions = questions.map(q => ({
      text: q.text,
      options: q.options,
      correctIndex: q.correctIndex,
      timeLimit: q.timeLimit || 15,
      points: 1000
    }));

    res.json({
      ok: true,
      questions: formattedQuestions,
      message: `Generated ${formattedQuestions.length} questions`
    });

  } catch (error) {
    console.error("AI quiz generation error:", error);
    res.status(500).json({ ok: false, message: "Server error: " + error.message });
  }
});

// Create new quiz session
app.post('/api/quiz/create', authMiddleware, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.sub);

    if (!currentUser || currentUser.role !== 'admin') {
      return res.status(403).json({ ok: false, message: "Faculty access required" });
    }

    const { title, questions } = req.body;

    if (!title || !questions || questions.length === 0) {
      return res.status(400).json({ ok: false, message: "Title and questions are required" });
    }

    // Generate unique session code
    let sessionCode;
    let codeExists = true;
    while (codeExists) {
      sessionCode = generateSessionCode();
      const existing = await LiveQuizSession.findOne({ sessionCode });
      codeExists = !!existing;
    }

    const quizSession = await LiveQuizSession.create({
      sessionCode,
      facultyId: currentUser._id,
      title,
      questions,
      status: 'lobby'
    });

    res.json({
      ok: true,
      sessionCode,
      quizId: quizSession._id,
      message: "Quiz session created successfully"
    });

  } catch (error) {
    console.error("Create quiz error:", error);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

// Get quiz session details
app.get('/api/quiz/:code', async (req, res) => {
  try {
    const { code } = req.params;

    const quiz = await LiveQuizSession.findOne({ sessionCode: code })
      .populate('facultyId', 'name email');

    if (!quiz) {
      return res.status(404).json({ ok: false, message: "Quiz session not found" });
    }

    // Don't send correct answers to students
    const sanitizedQuiz = {
      sessionCode: quiz.sessionCode,
      title: quiz.title,
      status: quiz.status,
      currentQuestionIndex: quiz.currentQuestionIndex,
      totalQuestions: quiz.questions.length,
      participantCount: quiz.participants.length,
      faculty: quiz.facultyId ? quiz.facultyId.name : 'Unknown'
    };

    // If it's the current question, send it (without correct answer for students)
    if (quiz.currentQuestionIndex >= 0 && quiz.currentQuestionIndex < quiz.questions.length) {
      const currentQ = quiz.questions[quiz.currentQuestionIndex];
      sanitizedQuiz.currentQuestion = {
        text: currentQ.text,
        options: currentQ.options,
        timeLimit: currentQ.timeLimit,
        points: currentQ.points
      };
    }

    res.json({ ok: true, quiz: sanitizedQuiz });

  } catch (error) {
    console.error("Get quiz error:", error);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

// Validate quiz code (no auth required - just checks if code exists)
app.post('/api/quiz/validate', async (req, res) => {
  try {
    const { code } = req.body;

    if (!code || code.length !== 6) {
      return res.status(400).json({ ok: false, message: "Invalid quiz code format" });
    }

    const quiz = await LiveQuizSession.findOne({ sessionCode: code.toUpperCase() });

    if (!quiz) {
      return res.status(404).json({ ok: false, message: "Quiz not found. Please check the code." });
    }

    if (quiz.status === 'ended') {
      return res.status(400).json({ ok: false, message: "This quiz has already ended." });
    }

    res.json({
      ok: true,
      sessionId: quiz._id,
      title: quiz.title,
      status: quiz.status,
      message: "Quiz code is valid"
    });

  } catch (error) {
    console.error("Validate quiz error:", error);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

// Join quiz session (student)
app.post('/api/quiz/:code/join', authMiddleware, async (req, res) => {
  try {
    const { code } = req.params;
    const currentUser = await User.findById(req.user.sub);

    if (!currentUser) {
      return res.status(401).json({ ok: false, message: "User not found" });
    }

    const quiz = await LiveQuizSession.findOne({ sessionCode: code });

    if (!quiz) {
      return res.status(404).json({ ok: false, message: "Quiz session not found" });
    }

    if (quiz.status === 'ended') {
      return res.status(400).json({ ok: false, message: "Quiz has ended" });
    }

    // Check if already joined
    const existingParticipant = quiz.participants.find(
      p => p.studentId && p.studentId.toString() === currentUser._id.toString()
    );

    if (!existingParticipant) {
      quiz.participants.push({
        studentId: currentUser._id,
        name: currentUser.name,
        score: 0,
        answers: []
      });
      await quiz.save();
    }

    res.json({
      ok: true,
      message: "Joined quiz successfully",
      participantCount: quiz.participants.length
    });

  } catch (error) {
    console.error("Join quiz error:", error);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

// Start quiz (faculty only)
app.post('/api/quiz/:code/start', authMiddleware, async (req, res) => {
  try {
    const { code } = req.params;
    const currentUser = await User.findById(req.user.sub);

    if (!currentUser || currentUser.role !== 'admin') {
      return res.status(403).json({ ok: false, message: "Faculty access required" });
    }

    const quiz = await LiveQuizSession.findOne({ sessionCode: code });

    if (!quiz) {
      return res.status(404).json({ ok: false, message: "Quiz session not found" });
    }

    if (quiz.facultyId.toString() !== currentUser._id.toString()) {
      return res.status(403).json({ ok: false, message: "Not your quiz session" });
    }

    quiz.status = 'question';
    quiz.currentQuestionIndex = 0;
    await quiz.save();

    res.json({ ok: true, message: "Quiz started" });

  } catch (error) {
    console.error("Start quiz error:", error);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

// Show next question (faculty only)
app.post('/api/quiz/:code/next', authMiddleware, async (req, res) => {
  try {
    const { code } = req.params;
    const currentUser = await User.findById(req.user.sub);

    if (!currentUser || currentUser.role !== 'admin') {
      return res.status(403).json({ ok: false, message: "Faculty access required" });
    }

    const quiz = await LiveQuizSession.findOne({ sessionCode: code });

    if (!quiz) {
      return res.status(404).json({ ok: false, message: "Quiz session not found" });
    }

    if (quiz.facultyId.toString() !== currentUser._id.toString()) {
      return res.status(403).json({ ok: false, message: "Not your quiz session" });
    }

    if (quiz.currentQuestionIndex < quiz.questions.length - 1) {
      quiz.currentQuestionIndex += 1;
      quiz.status = 'question';
      await quiz.save();

      const currentQ = quiz.questions[quiz.currentQuestionIndex];
      res.json({
        ok: true,
        questionIndex: quiz.currentQuestionIndex,
        question: {
          text: currentQ.text,
          options: currentQ.options,
          timeLimit: currentQ.timeLimit,
          points: currentQ.points
        }
      });
    } else {
      quiz.status = 'ended';
      quiz.endedAt = new Date();
      await quiz.save();

      res.json({ ok: true, message: "Quiz completed", status: 'ended' });
    }

  } catch (error) {
    console.error("Next question error:", error);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

// Submit answer (student)
app.post('/api/quiz/:code/answer', authMiddleware, async (req, res) => {
  try {
    const { code } = req.params;
    const { questionIndex, selectedIndex, timeToAnswer } = req.body;
    const currentUser = await User.findById(req.user.sub);

    if (!currentUser) {
      return res.status(401).json({ ok: false, message: "User not found" });
    }

    const quiz = await LiveQuizSession.findOne({ sessionCode: code });

    if (!quiz) {
      return res.status(404).json({ ok: false, message: "Quiz session not found" });
    }

    const participant = quiz.participants.find(
      p => p.studentId && p.studentId.toString() === currentUser._id.toString()
    );

    if (!participant) {
      return res.status(400).json({ ok: false, message: "Not a participant" });
    }

    const question = quiz.questions[questionIndex];
    if (!question) {
      return res.status(400).json({ ok: false, message: "Invalid question" });
    }

    const isCorrect = selectedIndex === question.correctIndex;

    // Calculate points (Kahoot-style: base points + time bonus)
    let pointsEarned = 0;
    if (isCorrect) {
      const basePoints = question.points || 1000;
      const timeLimit = question.timeLimit * 1000; // convert to ms
      const timeBonus = Math.floor(((timeLimit - timeToAnswer) / timeLimit) * 500);
      pointsEarned = basePoints + Math.max(0, timeBonus);
    }

    // Check if already answered this question
    const existingAnswer = participant.answers.find(a => a.questionIndex === questionIndex);
    if (existingAnswer) {
      return res.status(400).json({ ok: false, message: "Already answered this question" });
    }

    participant.answers.push({
      questionIndex,
      selectedIndex,
      timeToAnswer,
      pointsEarned,
      isCorrect
    });

    participant.score += pointsEarned;
    await quiz.save();

    res.json({
      ok: true,
      isCorrect,
      pointsEarned,
      totalScore: participant.score,
      correctAnswer: question.correctIndex
    });

  } catch (error) {
    console.error("Submit answer error:", error);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

// Get leaderboard
app.get('/api/quiz/:code/leaderboard', async (req, res) => {
  try {
    const { code } = req.params;

    const quiz = await LiveQuizSession.findOne({ sessionCode: code });

    if (!quiz) {
      return res.status(404).json({ ok: false, message: "Quiz session not found" });
    }

    // Sort participants by score
    const leaderboard = quiz.participants
      .map(p => ({
        name: p.name,
        score: p.score,
        answersCount: p.answers.length,
        correctCount: p.answers.filter(a => a.isCorrect).length
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10); // Top 10

    res.json({ ok: true, leaderboard });

  } catch (error) {
    console.error("Get leaderboard error:", error);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

// End quiz (faculty only)
app.post('/api/quiz/:code/end', authMiddleware, async (req, res) => {
  try {
    const { code } = req.params;
    const currentUser = await User.findById(req.user.sub);

    if (!currentUser || currentUser.role !== 'admin') {
      return res.status(403).json({ ok: false, message: "Faculty access required" });
    }

    const quiz = await LiveQuizSession.findOne({ sessionCode: code });

    if (!quiz) {
      return res.status(404).json({ ok: false, message: "Quiz session not found" });
    }

    if (quiz.facultyId.toString() !== currentUser._id.toString()) {
      return res.status(403).json({ ok: false, message: "Not your quiz session" });
    }

    quiz.status = 'ended';
    quiz.endedAt = new Date();
    await quiz.save();

    res.json({ ok: true, message: "Quiz ended successfully" });

  } catch (error) {
    console.error("End quiz error:", error);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

// ===================================
// Migration Endpoint - Fix Existing Org Users
// ===================================
app.post('/api/admin/fix-org-users', authMiddleware, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.sub);

    if (!currentUser || currentUser.role !== 'admin') {
      return res.status(403).json({ ok: false, message: "Admin access required" });
    }

    // Find all users with organizationId but missing orgRole
    const usersToFix = await User.find({
      $and: [
        { organizationId: { $exists: true, $ne: null } },
        {
          $or: [
            { orgRole: { $exists: false } },
            { orgRole: null },
            { orgRole: 'student' }
          ]
        }
      ]
    });

    let fixedCount = 0;
    const fixedUsers = [];

    for (const user of usersToFix) {
      // Set orgRole to 'admin' for organization owners/creators
      user.orgRole = user.role === 'admin' ? 'admin' : 'faculty';
      await user.save();
      fixedCount++;
      fixedUsers.push({
        email: user.email,
        name: user.name,
        orgRole: user.orgRole
      });
    }

    res.json({
      ok: true,
      message: `Fixed ${fixedCount} organization users`,
      fixedCount,
      users: fixedUsers
    });

  } catch (error) {
    console.error("Migration error:", error);
    res.status(500).json({ ok: false, message: "Migration failed", error: error.message });
  }
});

// Configure multer for profile photo uploads
const profileStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, 'uploads', 'profiles');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const profileUpload = multer({
  storage: profileStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    // Accept images only
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
  }
});

// Upload profile photo endpoint
app.post('/api/upload-profile-photo', authMiddleware, profileUpload.single('profilePhoto'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ ok: false, message: 'No file uploaded' });
    }

    const photoUrl = `/uploads/profiles/${req.file.filename}`;

    // Update user's profile photo in database
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { profilePhoto: photoUrl },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ ok: false, message: 'User not found' });
    }

    res.json({
      ok: true,
      message: 'Profile photo uploaded successfully',
      photoUrl: photoUrl
    });
  } catch (error) {
    console.error('Profile photo upload error:', error);
    res.status(500).json({ ok: false, message: 'Failed to upload profile photo', error: error.message });
  }
});

// Update profile endpoint
app.post('/api/update-profile', authMiddleware, async (req, res) => {
  try {
    const { name, displayName, bio, phone, department, yearSemester } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (displayName) updateData.displayName = displayName;
    if (bio !== undefined) updateData.bio = bio;
    if (phone !== undefined) updateData.phone = phone;
    if (department !== undefined) updateData.department = department;
    if (yearSemester !== undefined) updateData.yearSemester = yearSemester;

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      updateData,
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ ok: false, message: 'User not found' });
    }

    res.json({
      ok: true,
      message: 'Profile updated successfully',
      user: {
        name: user.name,
        displayName: user.displayName,
        email: user.email,
        bio: user.bio,
        phone: user.phone,
        department: user.department,
        yearSemester: user.yearSemester,
        profilePhoto: user.profilePhoto
      }
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ ok: false, message: 'Failed to update profile', error: error.message });
  }
});

// Get current user profile endpoint
app.get('/api/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password -googleAccessToken -googleRefreshToken -githubAccessToken -zoomAccessToken -zoomRefreshToken');

    if (!user) {
      return res.status(404).json({ ok: false, message: 'User not found' });
    }

    res.json({
      ok: true,
      user: {
        name: user.name,
        displayName: user.displayName,
        email: user.email,
        role: user.role,
        bio: user.bio,
        phone: user.phone,
        department: user.department,
        yearSemester: user.yearSemester,
        profilePhoto: user.profilePhoto,
        organizationId: user.organizationId,
        orgRole: user.orgRole
      }
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ ok: false, message: 'Failed to get user profile', error: error.message });
  }
});

// ============================================
// SPECIAL: Grant Dashboard Access Endpoint
// One-time use endpoint for existing paid users
// ============================================
app.post('/api/grant-dashboard-access', async (req, res) => {
  try {
    const { email, organizationName, secretKey } = req.body;

    // Security: Require a secret key (set this in your .env file)
    const GRANT_ACCESS_SECRET = process.env.GRANT_ACCESS_SECRET || 'mindwave-grant-access-2024';

    if (secretKey !== GRANT_ACCESS_SECRET) {
      return res.status(403).json({ error: 'Invalid secret key' });
    }

    if (!email || !organizationName) {
      return res.status(400).json({ error: 'Email and organization name required' });
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ error: `User not found with email: ${email}` });
    }

    // Check if user already has an organization
    if (user.organizationId) {
      const existingOrg = await Organization.findById(user.organizationId);
      if (existingOrg) {
        return res.json({
          success: true,
          message: 'User already has dashboard access',
          organization: {
            id: existingOrg._id,
            name: existingOrg.name,
            tier: existingOrg.subscriptionTier,
            status: existingOrg.subscriptionStatus
          },
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.orgRole
          }
        });
      }
    }

    // Create organization slug
    const slug = organizationName.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    // Create organization
    const organization = new Organization({
      name: organizationName,
      slug: slug,
      ownerId: user._id,
      subscriptionTier: 'premium',
      subscriptionStatus: 'active',
      setupCompleted: true,
      setupCompletedAt: new Date(),
      firstLoginAt: new Date(),
      lastLoginAt: new Date(),
      setupSteps: {
        profileCompleted: true,
        teamInvited: false,
        studentsImported: false,
        firstGameCreated: false
      },
      analytics: {
        aiCallsThisMonth: 0,
        totalImpressions: 0,
        totalInteractions: 0,
        lastResetDate: new Date()
      },
      trialStartedAt: new Date(),
      trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      billingEmail: user.email,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      limits: {
        maxStudents: -1, // Unlimited
        maxCourses: -1, // Unlimited
        maxStorage: 10240, // 10GB
        features: {
          customBranding: true,
          apiAccess: true,
          ssoIntegration: true,
          prioritySupport: true,
          advancedAnalytics: true
        }
      },
      usage: {
        studentCount: 0,
        courseCount: 0,
        storageUsed: 0
      }
    });

    await organization.save();

    // Update user
    user.organizationId = organization._id;
    user.orgRole = 'owner';
    user.userType = 'organization';
    await user.save();

    res.json({
      success: true,
      message: 'Dashboard access granted successfully!',
      organization: {
        id: organization._id,
        name: organization.name,
        slug: organization.slug,
        tier: organization.subscriptionTier,
        status: organization.subscriptionStatus
      },
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.orgRole
      },
      nextSteps: [
        'Login to your account',
        'Navigate to /modern-dashboard.html',
        'Start managing your organization!'
      ]
    });

  } catch (error) {
    console.error('Error granting dashboard access:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// ORGANIZATION MANAGEMENT API ENDPOINTS
// ============================================

// POST /api/organizations/create - Create new organization with 14-day trial
app.post('/api/organizations/create', authMiddleware, async (req, res) => {
  try {
    const { name, type, size, subdomain, timezone, language, academicYear, plan, invites } = req.body;
    const userId = req.user.sub;

    // Check if user already has an organization
    const existingUser = await User.findById(userId);
    if (existingUser.organizationId) {
      return res.status(400).json({ ok: false, message: 'User already has an organization' });
    }

    // Check if subdomain is taken
    const existingOrg = await Organization.findOne({ slug: subdomain });
    if (existingOrg) {
      return res.status(400).json({ ok: false, message: 'Subdomain already taken' });
    }

    // Calculate trial dates (14 days)
    const trialStartDate = new Date();
    const trialEndDate = new Date(trialStartDate.getTime() + 14 * 24 * 60 * 60 * 1000);

    // Map plan names from frontend to backend
    const planMapping = {
      'starter': 'basic',
      'professional': 'premium',
      'enterprise': 'premium'
    };

    const subscriptionTier = planMapping[plan] || 'basic';

    // Set limits based on plan
    const planLimits = {
      starter: {
        maxStudents: 50,
        maxCourses: 10,
        maxStorage: 5120, // 5GB in MB
        features: {
          customBranding: false,
          apiAccess: false,
          ssoIntegration: false,
          prioritySupport: false,
          advancedAnalytics: false
        }
      },
      professional: {
        maxStudents: 200,
        maxCourses: -1, // Unlimited
        maxStorage: 51200, // 50GB in MB
        features: {
          customBranding: true,
          apiAccess: true,
          ssoIntegration: false,
          prioritySupport: true,
          advancedAnalytics: true
        }
      },
      enterprise: {
        maxStudents: -1, // Unlimited
        maxCourses: -1,
        maxStorage: -1,
        features: {
          customBranding: true,
          apiAccess: true,
          ssoIntegration: true,
          prioritySupport: true,
          advancedAnalytics: true
        }
      }
    };

    const limits = planLimits[plan] || planLimits.starter;

    // Create organization
    const organization = await Organization.create({
      name,
      slug: subdomain,
      ownerId: userId,
      subscriptionTier,
      subscriptionStatus: 'trialing',
      trialStartedAt: trialStartDate,
      trialEndsAt: trialEndDate,
      setupCompleted: true,
      setupCompletedAt: new Date(),
      firstLoginAt: new Date(),
      lastLoginAt: new Date(),
      billingEmail: req.user.email,
      currentPeriodStart: trialStartDate,
      currentPeriodEnd: trialEndDate,
      limits,
      usage: {
        studentCount: 0,
        courseCount: 0,
        storageUsed: 0
      },
      analytics: {
        aiCallsThisMonth: 0,
        totalImpressions: 0,
        totalInteractions: 0,
        lastResetDate: new Date()
      },
      setupSteps: {
        profileCompleted: true,
        teamInvited: invites && invites.length > 0,
        studentsImported: false,
        firstGameCreated: false
      }
    });

    // Update user with organization info
    await User.findByIdAndUpdate(userId, {
      organizationId: organization._id,
      orgRole: 'owner',
      userType: 'organization'
    });

    // Log subscription event
    await SubscriptionEvent.create({
      organizationId: organization._id,
      eventType: 'subscription.created',
      data: {
        plan,
        tier: subscriptionTier,
        trialEndsAt: trialEndDate
      }
    });

    // Send welcome email
    if (mailer) {
      try {
        await mailer.sendMail({
          from: SMTP_FROM,
          to: req.user.email,
          subject: 'Welcome to MindWave - Your 14-Day Trial Has Started! 🎉',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #667eea;">Welcome to MindWave, ${name}!</h2>
              <p>Your 14-day free trial has started. You have full access to all features until <strong>${trialEndDate.toLocaleDateString()}</strong>.</p>
              <p><strong>Selected Plan:</strong> ${plan.charAt(0).toUpperCase() + plan.slice(1)}</p>
              <h3>Get started by:</h3>
              <ul>
                <li>Inviting team members</li>
                <li>Adding students</li>
                <li>Creating your first interactive game</li>
              </ul>
              <p style="margin-top: 30px;">
                <a href="${CLIENT_ORIGIN}/marketing-site/modern-dashboard.html" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  Go to Dashboard
                </a>
              </p>
              <p style="color: #666; font-size: 12px; margin-top: 30px;">
                Need help? Contact us at support@mindwave.com
              </p>
            </div>
          `
        });
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
        // Don't fail the request if email fails
      }
    }

    res.json({ ok: true, organization });
  } catch (error) {
    console.error('Organization creation error:', error);
    res.status(500).json({ ok: false, message: error.message });
  }
});

// GET /api/organizations/check-subdomain - Check if subdomain is available
app.get('/api/organizations/check-subdomain', async (req, res) => {
  try {
    const { subdomain } = req.query;

    if (!subdomain) {
      return res.status(400).json({ ok: false, message: 'Subdomain is required' });
    }

    const existing = await Organization.findOne({ slug: subdomain });
    res.json({ available: !existing });
  } catch (error) {
    console.error('Subdomain check error:', error);
    res.status(500).json({ ok: false, message: error.message });
  }
});

// GET /api/me - Get current user with organization info
app.get('/api/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.sub)
      .select('-password')
      .populate('organizationId');

    if (!user) {
      return res.status(404).json({ ok: false, message: 'User not found' });
    }

    res.json({ ok: true, user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ ok: false, message: error.message });
  }
});

// GET /api/organizations/trial-status - Get trial status for current organization
app.get('/api/organizations/trial-status', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.sub);
    if (!user || !user.organizationId) {
      return res.status(404).json({ ok: false, message: 'No organization found' });
    }

    const organization = await Organization.findById(user.organizationId);
    if (!organization) {
      return res.status(404).json({ ok: false, message: 'Organization not found' });
    }

    const now = new Date();
    const daysRemaining = Math.ceil((organization.trialEndsAt - now) / (1000 * 60 * 60 * 24));
    const isTrialActive = organization.subscriptionStatus === 'trialing' && daysRemaining > 0;
    const isTrialExpired = organization.subscriptionStatus === 'trialing' && daysRemaining <= 0;

    // Calculate usage percentages
    const aiCallsLimit = organization.subscriptionTier === 'basic' ? 500 : 5000;
    const aiCallsPercentage = (organization.analytics.aiCallsThisMonth / aiCallsLimit) * 100;

    const storageLimit = organization.limits.maxStorage;
    const storagePercentage = storageLimit > 0 ? (organization.usage.storageUsed / storageLimit) * 100 : 0;

    res.json({
      ok: true,
      subscriptionStatus: organization.subscriptionStatus,
      subscriptionTier: organization.subscriptionTier,
      trialStartedAt: organization.trialStartedAt,
      trialEndsAt: organization.trialEndsAt,
      daysRemaining,
      isTrialActive,
      isTrialExpired,
      organization: {
        name: organization.name,
        slug: organization.slug
      },
      usage: {
        ...organization.usage,
        aiCallsThisMonth: organization.analytics.aiCallsThisMonth,
        aiCallsLimit,
        aiCallsPercentage: Math.round(aiCallsPercentage),
        storageLimit,
        storagePercentage: Math.round(storagePercentage)
      },
      limits: organization.limits
    });
  } catch (error) {
    console.error('Trial status error:', error);
    res.status(500).json({ ok: false, message: error.message });
  }
});

// POST /api/organizations/send-invites - Send team invitations
app.post('/api/organizations/send-invites', authMiddleware, async (req, res) => {
  try {
    const { invites } = req.body;
    const user = await User.findById(req.user.sub);

    if (!user || !user.organizationId) {
      return res.status(404).json({ ok: false, message: 'No organization found' });
    }

    const organization = await Organization.findById(user.organizationId);

    // Send invitation emails
    if (mailer && invites && invites.length > 0) {
      for (const invite of invites) {
        try {
          await mailer.sendMail({
            from: SMTP_FROM,
            to: invite.email,
            subject: `You've been invited to join ${organization.name} on MindWave`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>You've been invited!</h2>
                <p>${user.name} has invited you to join <strong>${organization.name}</strong> as a <strong>${invite.role}</strong> on MindWave.</p>
                <p style="margin-top: 30px;">
                  <a href="${CLIENT_ORIGIN}/marketing-site/website-signup.html" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                    Accept Invitation
                  </a>
                </p>
              </div>
            `
          });
        } catch (emailError) {
          console.error(`Failed to send invite to ${invite.email}:`, emailError);
        }
      }
    }

    // Update organization setup steps
    await Organization.findByIdAndUpdate(user.organizationId, {
      'setupSteps.teamInvited': true
    });

    res.json({ ok: true, message: 'Invitations sent successfully' });
  } catch (error) {
    console.error('Send invites error:', error);
    res.status(500).json({ ok: false, message: error.message });
  }
});

// GET /api/organizations/team-members - Get all team members
app.get('/api/organizations/team-members', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.sub);

    if (!user || !user.organizationId) {
      return res.status(404).json({ ok: false, message: 'No organization found' });
    }

    // Get all users in the organization
    const teamMembers = await User.find({
      organizationId: user.organizationId,
      orgRole: { $in: ['owner', 'admin', 'faculty'] }
    })
      .select('name email orgRole profilePhoto lastActive createdAt')
      .sort({ orgRole: 1, createdAt: -1 });

    // Group by role
    const grouped = {
      owner: teamMembers.filter(m => m.orgRole === 'owner'),
      admins: teamMembers.filter(m => m.orgRole === 'admin'),
      faculty: teamMembers.filter(m => m.orgRole === 'faculty')
    };

    res.json({
      ok: true,
      teamMembers,
      grouped,
      total: teamMembers.length,
      counts: {
        owner: grouped.owner.length,
        admins: grouped.admins.length,
        faculty: grouped.faculty.length
      }
    });
  } catch (error) {
    console.error('Get team members error:', error);
    res.status(500).json({ ok: false, message: error.message });
  }
});

// POST /api/organizations/team-members - Add team member (admin/faculty)
app.post('/api/organizations/team-members', authMiddleware, async (req, res) => {
  try {
    const { email, role, name } = req.body;
    const user = await User.findById(req.user.sub);

    if (!user || !user.organizationId) {
      return res.status(404).json({ ok: false, message: 'No organization found' });
    }

    // Check permissions: only owner can add admins, owner/admin can add faculty
    if (role === 'admin' && user.orgRole !== 'owner') {
      return res.status(403).json({ ok: false, message: 'Only organization owner can add admins' });
    }

    if (role === 'faculty' && !['owner', 'admin'].includes(user.orgRole)) {
      return res.status(403).json({ ok: false, message: 'Only owner or admin can add faculty' });
    }

    // Check if user already exists
    let newMember = await User.findOne({ email });

    if (newMember) {
      // Update existing user
      newMember.organizationId = user.organizationId;
      newMember.orgRole = role;
      await newMember.save();
    } else {
      // Create new user (they'll set password on first login)
      const tempPassword = crypto.randomBytes(16).toString('hex');
      const hashedPassword = await bcrypt.hash(tempPassword, 10);

      newMember = await User.create({
        name: name || email.split('@')[0],
        email,
        password: hashedPassword,
        role: 'admin', // System role
        organizationId: user.organizationId,
        orgRole: role,
        userType: 'organization'
      });
    }

    // Send invitation email
    if (mailer) {
      const organization = await Organization.findById(user.organizationId);
      await mailer.sendMail({
        from: SMTP_FROM,
        to: email,
        subject: `You've been added as ${role} to ${organization.name}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Welcome to ${organization.name}!</h2>
            <p>${user.name} has added you as a <strong>${role}</strong> to the organization.</p>
            <p><a href="${CLIENT_ORIGIN}/marketing-site/website-signup.html" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Access Dashboard
            </a></p>
          </div>
        `
      });
    }

    res.json({ ok: true, member: newMember });
  } catch (error) {
    console.error('Add team member error:', error);
    res.status(500).json({ ok: false, message: error.message });
  }
});

// GET /api/organizations/students - Get all students with activity data
app.get('/api/organizations/students', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.sub);

    if (!user || !user.organizationId) {
      return res.status(404).json({ ok: false, message: 'No organization found' });
    }

    // Get all students in the organization
    const students = await User.find({
      organizationId: user.organizationId,
      orgRole: 'student'
    })
      .select('name email profilePhoto lastActive createdAt')
      .sort({ createdAt: -1 });

    // Calculate activity stats
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const active = students.filter(s => s.lastActive && s.lastActive > sevenDaysAgo).length;
    const newThisMonth = students.filter(s => s.createdAt > thirtyDaysAgo).length;
    const inactive = students.filter(s => !s.lastActive || s.lastActive < thirtyDaysAgo).length;

    res.json({
      ok: true,
      students,
      total: students.length,
      stats: {
        active,
        inactive,
        newThisMonth,
        activePercentage: students.length > 0 ? Math.round((active / students.length) * 100) : 0
      }
    });
  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({ ok: false, message: error.message });
  }
});

// GET /api/organizations/games - Get all games with statistics
app.get('/api/organizations/games', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.sub);

    if (!user || !user.organizationId) {
      return res.status(404).json({ ok: false, message: 'No organization found' });
    }

    // Get all games created by organization members
    const orgUsers = await User.find({ organizationId: user.organizationId }).select('_id');
    const userIds = orgUsers.map(u => u._id);

    const games = await Game.find({
      createdBy: { $in: userIds }
    })
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    // Get submission statistics
    const gameIds = games.map(g => g._id);
    const submissions = await GameSubmission.find({
      gameId: { $in: gameIds }
    });

    // Calculate stats per game
    const gamesWithStats = games.map(game => {
      const gameSubmissions = submissions.filter(s => s.gameId.toString() === game._id.toString());
      const totalPlays = gameSubmissions.length;
      const avgScore = totalPlays > 0
        ? gameSubmissions.reduce((sum, s) => sum + s.score, 0) / totalPlays
        : 0;

      return {
        ...game.toObject(),
        stats: {
          totalPlays,
          avgScore: Math.round(avgScore),
          uniquePlayers: new Set(gameSubmissions.map(s => s.studentId.toString())).size
        }
      };
    });

    const totalPlays = submissions.length;
    const publishedGames = games.filter(g => g.published).length;

    res.json({
      ok: true,
      games: gamesWithStats,
      total: games.length,
      stats: {
        totalGames: games.length,
        published: publishedGames,
        draft: games.length - publishedGames,
        totalPlays,
        avgPlaysPerGame: games.length > 0 ? Math.round(totalPlays / games.length) : 0
      }
    });
  } catch (error) {
    console.error('Get games error:', error);
    res.status(500).json({ ok: false, message: error.message });
  }
});

// GET /api/organizations/analytics - Get organization analytics
app.get('/api/organizations/analytics', authMiddleware, async (req, res) => {
  try {
    const { range = '7d' } = req.query;
    const user = await User.findById(req.user.sub);

    if (!user || !user.organizationId) {
      return res.status(404).json({ ok: false, message: 'No organization found' });
    }

    // Calculate date range
    const now = new Date();
    let startDate;
    switch (range) {
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // Get organization users
    const orgUsers = await User.find({ organizationId: user.organizationId });
    const userIds = orgUsers.map(u => u._id);

    // Get games and submissions in date range
    const games = await Game.find({
      createdBy: { $in: userIds }
    });

    const submissions = await GameSubmission.find({
      gameId: { $in: games.map(g => g._id) },
      submittedAt: { $gte: startDate }
    });

    // Calculate daily stats
    const dailyStats = [];
    const days = range === '24h' ? 24 : (range === '7d' ? 7 : (range === '30d' ? 30 : 90));

    for (let i = 0; i < days; i++) {
      const dayStart = new Date(now.getTime() - (i + 1) * 24 * 60 * 60 * 1000);
      const dayEnd = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);

      const daySubmissions = submissions.filter(s =>
        s.submittedAt >= dayStart && s.submittedAt < dayEnd
      );

      dailyStats.unshift({
        date: dayStart.toISOString().split('T')[0],
        plays: daySubmissions.length,
        uniqueStudents: new Set(daySubmissions.map(s => s.studentId.toString())).size,
        avgScore: daySubmissions.length > 0
          ? Math.round(daySubmissions.reduce((sum, s) => sum + s.score, 0) / daySubmissions.length)
          : 0
      });
    }

    res.json({
      ok: true,
      range,
      dailyStats,
      summary: {
        totalPlays: submissions.length,
        totalGames: games.length,
        totalStudents: orgUsers.filter(u => u.orgRole === 'student').length,
        avgScore: submissions.length > 0
          ? Math.round(submissions.reduce((sum, s) => sum + s.score, 0) / submissions.length)
          : 0
      }
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ ok: false, message: error.message });
  }
});

// ============================================
// USER ACTIVITY API ENDPOINTS
// ============================================

// GET /api/user/activity - Fetch user activity history
app.get('/api/user/activity', authMiddleware, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const skip = parseInt(req.query.skip) || 0;

    const activities = await UserActivity.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean();

    res.json({
      ok: true,
      activities,
      total: await UserActivity.countDocuments({ userId: req.user._id })
    });
  } catch (error) {
    console.error('Error fetching user activity:', error);
    res.status(500).json({ ok: false, message: 'Failed to fetch activity' });
  }
});

// POST /api/user/activity - Log user activity
app.post('/api/user/activity', authMiddleware, async (req, res) => {
  try {
    const { activityType, description, metadata } = req.body;

    const activity = new UserActivity({
      userId: req.user._id,
      organizationId: req.user.organizationId,
      activityType,
      description,
      metadata,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent']
    });

    await activity.save();

    res.json({ ok: true, activity });
  } catch (error) {
    console.error('Error logging activity:', error);
    res.status(500).json({ ok: false, message: 'Failed to log activity' });
  }
});

// ============================================
// DASHBOARD STATS API ENDPOINT
// ============================================

// GET /api/organizations/dashboard-stats - Real-time dashboard statistics
app.get('/api/organizations/dashboard-stats', authMiddleware, async (req, res) => {
  try {
    if (!req.user.organizationId) {
      return res.status(404).json({ ok: false, message: 'No organization found' });
    }

    const organization = await Organization.findById(req.user.organizationId);
    if (!organization) {
      return res.status(404).json({ ok: false, message: 'Organization not found' });
    }

    // Get counts
    const studentCount = await User.countDocuments({
      organizationId: req.user.organizationId,
      orgRole: 'student'
    });

    const teamCount = await User.countDocuments({
      organizationId: req.user.organizationId,
      orgRole: { $in: ['owner', 'admin', 'faculty'] }
    });

    const gameCount = await Game.countDocuments({
      createdBy: { $in: await User.find({ organizationId: req.user.organizationId }).distinct('_id') }
    });

    // Calculate trial days remaining
    let trialDaysRemaining = 0;
    if (organization.trialEndsAt) {
      const now = new Date();
      const trialEnd = new Date(organization.trialEndsAt);
      trialDaysRemaining = Math.max(0, Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24)));
    }

    // Get recent activity
    const recentActivity = await UserActivity.find({
      organizationId: req.user.organizationId
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('userId', 'name email')
      .lean();

    res.json({
      ok: true,
      stats: {
        studentCount,
        teamCount,
        gameCount,
        trialDaysRemaining,
        subscriptionTier: organization.subscriptionTier,
        subscriptionStatus: organization.subscriptionStatus,
        aiCallsUsed: (organization.analytics && organization.analytics.aiCallsThisMonth) || 0,
        aiCallsLimit: (SUBSCRIPTION_TIERS[organization.subscriptionTier] && SUBSCRIPTION_TIERS[organization.subscriptionTier].limits && SUBSCRIPTION_TIERS[organization.subscriptionTier].limits.aiCallsPerMonth) || 50,
        storageUsed: (organization.usage && organization.usage.storageUsed) || 0,
        storageLimit: (SUBSCRIPTION_TIERS[organization.subscriptionTier] && SUBSCRIPTION_TIERS[organization.subscriptionTier].limits && SUBSCRIPTION_TIERS[organization.subscriptionTier].limits.maxStorage) || 100
      },
      recentActivity
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ ok: false, message: 'Failed to fetch dashboard stats' });
  }
});

// ============================================
// USER PROFILE API ENDPOINTS
// ============================================

// GET /api/user/profile - Get current user profile
app.get('/api/user/profile', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('name email phone department yearSemester bio displayName profilePhoto orgRole organizationId role lastActive lastLogin')
      .populate('organizationId', 'name type subscriptionTier')
      .lean();

    if (!user) {
      return res.status(404).json({ ok: false, message: 'User not found' });
    }

    res.json({ ok: true, user });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ ok: false, message: 'Failed to fetch profile' });
  }
});

// PUT /api/user/profile - Update user profile
app.put('/api/user/profile', authMiddleware, async (req, res) => {
  try {
    const { name, phone, department, yearSemester, bio, displayName } = req.body;

    // Update user
    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        name,
        phone,
        department,
        yearSemester,
        bio,
        displayName
      },
      { new: true, runValidators: true }
    ).select('name email phone department yearSemester bio displayName profilePhoto orgRole');

    if (!user) {
      return res.status(404).json({ ok: false, message: 'User not found' });
    }

    // Log activity
    await UserActivity.create({
      userId: req.user._id,
      organizationId: req.user.organizationId,
      activityType: 'profile_update',
      description: 'Updated profile information',
      metadata: { fields: Object.keys(req.body) }
    });

    res.json({ ok: true, user });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ ok: false, message: 'Failed to update profile' });
  }
});

// ============================================
// BILLING INFO API ENDPOINT
// ============================================

// GET /api/organizations/billing-info - Subscription and billing data
app.get('/api/organizations/billing-info', authMiddleware, async (req, res) => {
  try {
    if (!req.user.organizationId) {
      return res.status(404).json({ ok: false, message: 'No organization found' });
    }

    const organization = await Organization.findById(req.user.organizationId);
    if (!organization) {
      return res.status(404).json({ ok: false, message: 'Organization not found' });
    }

    // Get subscription tier details
    const tierDetails = SUBSCRIPTION_TIERS[organization.subscriptionTier] || SUBSCRIPTION_TIERS.trial;

    // Get billing events (payment history)
    const billingEvents = await SubscriptionEvent.find({
      organizationId: req.user.organizationId,
      eventType: { $in: ['payment.succeeded', 'payment.failed', 'subscription.created', 'subscription.updated'] }
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    // Calculate next billing date
    let nextBillingDate = null;
    if (organization.currentPeriodEnd) {
      nextBillingDate = organization.currentPeriodEnd;
    } else if (organization.trialEndsAt) {
      nextBillingDate = organization.trialEndsAt;
    }

    res.json({
      ok: true,
      billing: {
        currentPlan: {
          name: tierDetails.name,
          tier: organization.subscriptionTier,
          price: tierDetails.price,
          currency: tierDetails.currency,
          billingCycle: tierDetails.billingCycle || 'trial'
        },
        status: organization.subscriptionStatus,
        nextBillingDate,
        cancelAtPeriodEnd: organization.cancelAtPeriodEnd || false,
        features: tierDetails.features,
        limits: tierDetails.limits,
        usage: {
          students: (organization.usage && organization.usage.studentCount) || 0,
          courses: (organization.usage && organization.usage.courseCount) || 0,
          storage: (organization.usage && organization.usage.storageUsed) || 0,
          aiCalls: (organization.analytics && organization.analytics.aiCallsThisMonth) || 0
        }
      },
      paymentHistory: billingEvents.map(event => ({
        id: event._id,
        type: event.eventType,
        date: event.createdAt,
        amount: (event.data && event.data.amount) || 0,
        status: event.eventType.includes('succeeded') ? 'paid' : 'failed',
        description: (event.data && event.data.description) || event.eventType.replace(/_/g, ' ')
      }))
    });
  } catch (error) {
    console.error('Error fetching billing info:', error);
    res.status(500).json({ ok: false, message: 'Failed to fetch billing info' });
  }
});

// ============================================
// NOTIFICATION API ENDPOINTS
// ============================================

// GET /api/notifications - Fetch user notifications
app.get('/api/notifications', authMiddleware, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const skip = parseInt(req.query.skip) || 0;
    const unreadOnly = req.query.unreadOnly === 'true';

    const query = {
      userId: req.user._id,
      archived: false
    };

    if (unreadOnly) {
      query.read = false;
    }

    // Filter out student-specific notifications for org owners/admins
    if (req.user.orgRole === 'owner' || req.user.orgRole === 'admin' || req.user.orgRole === 'faculty') {
      // Exclude student-only notification types
      query.type = {
        $nin: ['game_available', 'material_uploaded', 'assignment_due']
      };
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean();

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({
      userId: req.user._id,
      read: false,
      archived: false,
      ...(req.user.orgRole === 'owner' || req.user.orgRole === 'admin' || req.user.orgRole === 'faculty'
        ? { type: { $nin: ['game_available', 'material_uploaded', 'assignment_due'] } }
        : {})
    });

    res.json({
      ok: true,
      notifications,
      total,
      unreadCount
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ ok: false, message: 'Failed to fetch notifications' });
  }
});

// GET /api/notifications/unread-count - Get unread notification count
app.get('/api/notifications/unread-count', authMiddleware, async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      userId: req.user._id,
      read: false,
      archived: false
    });

    res.json({ ok: true, count });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ ok: false, message: 'Failed to fetch unread count' });
  }
});

// PUT /api/notifications/:id/read - Mark notification as read
app.put('/api/notifications/:id/read', authMiddleware, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { read: true, readAt: new Date() },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ ok: false, message: 'Notification not found' });
    }

    res.json({ ok: true, notification });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ ok: false, message: 'Failed to mark as read' });
  }
});

// PUT /api/notifications/mark-all-read - Mark all notifications as read
app.put('/api/notifications/mark-all-read', authMiddleware, async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { userId: req.user._id, read: false, archived: false },
      { read: true, readAt: new Date() }
    );

    res.json({
      ok: true,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Error marking all as read:', error);
    res.status(500).json({ ok: false, message: 'Failed to mark all as read' });
  }
});

// DELETE /api/notifications/:id - Delete notification
app.delete('/api/notifications/:id', authMiddleware, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { archived: true, archivedAt: new Date() },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ ok: false, message: 'Notification not found' });
    }

    res.json({ ok: true });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ ok: false, message: 'Failed to delete notification' });
  }
});

// POST /api/notifications - Create notification (internal/admin use)
app.post('/api/notifications', authMiddleware, async (req, res) => {
  try {
    const { userId, type, title, message, priority, actionUrl, metadata } = req.body;

    const notification = new Notification({
      userId: userId || req.user._id,
      organizationId: req.user.organizationId,
      type,
      title,
      message,
      priority: priority || 'medium',
      actionUrl,
      metadata
    });

    await notification.save();

    res.json({ ok: true, notification });
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ ok: false, message: 'Failed to create notification' });
  }
});

// ============================================
// LIVE MEETING API ROUTES
// ============================================

// Create a new meeting code (Faculty only)
app.post('/api/meetings/create', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.sub;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ ok: false, message: 'User not found' });
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Create meeting record
    const meeting = new Meeting({
      code: code,
      createdBy: userId,
      createdByName: user.name || user.displayName || 'Faculty',
      isActive: true
    });

    await meeting.save();

    res.json({
      ok: true,
      code: code,
      message: 'Meeting code created successfully'
    });

  } catch (error) {
    console.error('Error creating meeting:', error);
    res.status(500).json({ ok: false, message: 'Failed to create meeting code' });
  }
});

// Validate meeting code (Students)
app.get('/api/meetings/validate/:code', authMiddleware, async (req, res) => {
  try {
    const { code } = req.params;

    // Check if meeting code exists and is active
    const meeting = await Meeting.findOne({ code: code, isActive: true });

    if (!meeting) {
      return res.json({ ok: false, valid: false, message: 'Invalid meeting code' });
    }

    // Check if meeting has expired
    if (meeting.expiresAt && meeting.expiresAt < new Date()) {
      return res.json({ ok: false, valid: false, message: 'Meeting code has expired' });
    }

    res.json({
      ok: true,
      valid: true,
      meeting: {
        code: meeting.code,
        createdBy: meeting.createdByName,
        createdAt: meeting.createdAt
      }
    });

  } catch (error) {
    console.error('Error validating meeting:', error);
    res.status(500).json({ ok: false, valid: false, message: 'Server error' });
  }
});

// Get all active meetings (Faculty only)
app.get('/api/meetings/active', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.sub;

    const meetings = await Meeting.find({
      createdBy: userId,
      isActive: true
    }).sort({ createdAt: -1 });

    res.json({ ok: true, meetings });

  } catch (error) {
    console.error('Error fetching meetings:', error);
    res.status(500).json({ ok: false, message: 'Failed to fetch meetings' });
  }
});

// End/deactivate a meeting
app.post('/api/meetings/:code/end', authMiddleware, async (req, res) => {
  try {
    const { code } = req.params;
    const userId = req.user.sub;

    const meeting = await Meeting.findOne({ code: code, createdBy: userId });

    if (!meeting) {
      return res.status(404).json({ ok: false, message: 'Meeting not found' });
    }

    meeting.isActive = false;
    await meeting.save();

    res.json({ ok: true, message: 'Meeting ended successfully' });

  } catch (error) {
    console.error('Error ending meeting:', error);
    res.status(500).json({ ok: false, message: 'Failed to end meeting' });
  }
});

// Mark that faculty has joined the meeting
app.post('/api/meetings/:code/faculty-joined', authMiddleware, async (req, res) => {
  try {
    const { code } = req.params;
    const userId = req.user.sub;

    const meeting = await Meeting.findOne({ code: code, createdBy: userId });

    if (!meeting) {
      return res.status(404).json({ ok: false, message: 'Meeting not found' });
    }

    meeting.facultyJoined = true;
    meeting.facultyJoinedAt = new Date();
    await meeting.save();

    res.json({ ok: true, message: 'Faculty join status updated' });

  } catch (error) {
    console.error('Error updating faculty join status:', error);
    res.status(500).json({ ok: false, message: 'Failed to update status' });
  }
});

// Check if faculty has joined (for student waiting room)
app.get('/api/meetings/:code/status', authMiddleware, async (req, res) => {
  try {
    const { code } = req.params;

    const meeting = await Meeting.findOne({ code: code, isActive: true });

    if (!meeting) {
      return res.json({ ok: false, facultyJoined: false, message: 'Meeting not found' });
    }

    res.json({
      ok: true,
      facultyJoined: meeting.facultyJoined || false,
      createdBy: meeting.createdByName
    });

  } catch (error) {
    console.error('Error checking meeting status:', error);
    res.status(500).json({ ok: false, facultyJoined: false, message: 'Server error' });
  }
});

// ============================================
// JITSI MEETING ENDPOINTS
// ============================================

// Faculty creates a Jitsi meeting - gets moderator token
app.post('/api/meetings/create-jitsi', authMiddleware, async (req, res) => {
  try {
    const { meetingCode, facultyName, facultyEmail } = req.body;
    // JWT uses 'sub' (subject) field for user ID
    const userId = req.user.sub || req.user.userId || req.user.id;

    console.log('=== Jitsi Meeting Creation Debug ===');
    console.log('userId from token:', userId);
    console.log('req.user full object:', JSON.stringify(req.user));

    // Verify user is faculty/admin/owner
    const user = await User.findById(userId);
    console.log('User found in DB:', !!user);
    if (user) {
      console.log('User details - role:', user.role, 'orgRole:', user.orgRole);
    }

    if (!user) {
      console.error('User not found for userId:', userId);
      return res.status(404).json({ error: 'User not found' });
    }

    // Allow organization owners, admins, and faculty to create meetings
    const canCreateMeeting = user.role === 'admin' || user.orgRole === 'owner' || user.orgRole === 'admin' || user.orgRole === 'faculty';

    if (!canCreateMeeting) {
      return res.status(403).json({ error: 'Only faculty, admins, and owners can create meetings' });
    }

    // IMPORTANT: Prepend "mindwave" (lowercase) to match Prosody's room name format
    // Prosody converts room names to lowercase, so we must use lowercase in JWT
    // Both faculty and students must use the same room name: mindwave123456
    const roomName = 'mindwave' + meetingCode.toLowerCase();

    // Generate JWT token with moderator privileges
    const token = generateJitsiToken(
      facultyName || user.name,
      facultyEmail || user.email,
      true, // isModerator = true for faculty
      roomName  // Use full room name with "MindWave" prefix
    );


    // Construct Jitsi URL with token and force-disable prejoin page
    // The #config parameter bypasses browser cache and forces Jitsi config
    const jitsiUrl = `https://${JITSI_DOMAIN}/${roomName}?jwt=${token}#config.prejoinPageEnabled=false`;

    res.json({
      success: true,
      jitsiUrl,
      meetingCode
    });

  } catch (error) {
    console.error('Error creating Jitsi meeting:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('JITSI_APP_SECRET exists:', !!JITSI_APP_SECRET);
    console.error('JITSI_DOMAIN:', JITSI_DOMAIN);
    console.error('JITSI_APP_ID:', JITSI_APP_ID);
    res.status(500).json({ error: 'Failed to create meeting', details: error.message });
  }
});

// Student joins a Jitsi meeting - gets participant token
app.post('/api/meetings/:code/join-jitsi', authMiddleware, async (req, res) => {
  try {
    const { code } = req.params;
    const { studentName, studentEmail } = req.body;
    // JWT uses 'sub' (subject) field for user ID
    const userId = req.user.sub || req.user.userId || req.user.id;

    // Get user info
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // IMPORTANT: Add "mindwave" prefix (lowercase) to match the faculty's room name format
    // Prosody converts room names to lowercase, so we must use lowercase in JWT
    // Faculty creates: mindwave123456, Student must join: mindwave123456
    const roomName = 'mindwave' + code.toLowerCase();


    // Generate JWT token WITHOUT moderator privileges
    const token = generateJitsiToken(
      studentName || user.name,
      studentEmail || user.email,
      false, // isModerator = false for students
      roomName  // Use full room name with "MindWave" prefix
    );

    // Construct Jitsi URL with token and force-disable prejoin page
    // The #config parameter bypasses browser cache and forces Jitsi config
    const jitsiUrl = `https://${JITSI_DOMAIN}/${roomName}?jwt=${token}#config.prejoinPageEnabled=false`;

    res.json({
      success: true,
      jitsiUrl
    });
  } catch (error) {
    console.error('Error joining Jitsi meeting:', error);
    console.error('Error message:', error.message);
    res.status(500).json({ error: 'Failed to join meeting', details: error.message });
  }
});

// ============================================
// AGORA.IO VIDEO CONFERENCING ENDPOINTS
// ============================================

// Generate meeting code
app.post('/api/meetings/generate-code', authMiddleware, async (req, res) => {
  try {
    // Generate 6-digit meeting code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    res.json({ success: true, code });
  } catch (error) {
    console.error('Error generating meeting code:', error);
    res.status(500).json({ error: 'Failed to generate meeting code' });
  }
});

// Faculty creates an Agora meeting - gets host token
app.post('/api/meetings/create-agora', authMiddleware, async (req, res) => {
  try {
    const { meetingCode, facultyName, facultyEmail } = req.body;
    const userId = req.user.sub || req.user.userId || req.user.id;

    // Find user to verify permissions
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Allow organization owners, admins, and faculty to create meetings
    const canCreateMeeting = user.role === 'admin' || user.orgRole === 'owner' || user.orgRole === 'admin' || user.orgRole === 'faculty';

    if (!canCreateMeeting) {
      return res.status(403).json({ error: 'Only faculty, admins, and owners can create meetings' });
    }

    // Channel name = mindwave + meeting code (lowercase)
    const channelName = 'mindwave' + meetingCode.toLowerCase();

    // Generate UID for faculty (convert user ID to number)
    // Take last 8 characters of user ID and convert to hex number
    const uid = parseInt(userId.slice(-8), 16) || Math.floor(Math.random() * 1000000);

    // Generate Agora token with HOST role
    const token = generateAgoraToken(channelName, uid, 'host');

    res.json({
      success: true,
      appId: AGORA_APP_ID,
      channelName: channelName,
      token: token,
      uid: uid,
      meetingCode: meetingCode,
      role: 'host'
    });

  } catch (error) {
    console.error('Error creating Agora meeting:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Failed to create meeting', details: error.message });
  }
});

// Student joins an Agora meeting - gets audience token
app.post('/api/meetings/:code/join-agora', authMiddleware, async (req, res) => {
  try {
    const { code } = req.params;
    const { studentName, studentEmail } = req.body;
    const userId = req.user.sub || req.user.userId || req.user.id;

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Channel name must match faculty's channel
    const channelName = 'mindwave' + code.toLowerCase();

    // Generate UID for student
    const uid = parseInt(userId.slice(-8), 16) || Math.floor(Math.random() * 1000000);

    // Generate Agora token with AUDIENCE role
    const token = generateAgoraToken(channelName, uid, 'audience');

    res.json({
      success: true,
      appId: AGORA_APP_ID,
      channelName: channelName,
      token: token,
      uid: uid,
      role: 'audience'
    });

  } catch (error) {
    console.error('Error joining Agora meeting:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Failed to join meeting', details: error.message });
  }
});


app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB'
    }
  });
});

// Run cleanup on server start
cleanupOldGames();

// Start server
const httpServer = listenWithFallback(PORT);

