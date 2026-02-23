// ============================================
// STUDENT PERFORMANCE ANALYTICS - SCHEMAS & APIS
// ============================================
// This file contains all database schemas and API endpoints
// for the student performance analytics system

import mongoose from 'mongoose';

// ============================================
// DATABASE SCHEMAS
// ============================================

// Grade Schema - Stores individual grades for assignments/quizzes/exams
const gradeSchema = new mongoose.Schema({
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
    subject: { type: String, required: true },
    title: { type: String, required: true }, // Assignment/Quiz/Exam name
    type: { type: String, enum: ['assignment', 'quiz', 'exam', 'project'], required: true },
    score: { type: Number, required: true }, // Percentage (0-100)
    maxScore: { type: Number, default: 100 },
    weight: { type: Number, default: 1 }, // Weight for GPA calculation
    feedback: { type: String },
    gradedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    gradedAt: { type: Date, default: Date.now }
}, { timestamps: true });

gradeSchema.index({ studentId: 1, createdAt: -1 });
gradeSchema.index({ organizationId: 1 });
gradeSchema.index({ subject: 1 });

// Attendance Schema - Tracks class attendance
const attendanceSchema = new mongoose.Schema({
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
    subject: { type: String, required: true },
    date: { type: Date, required: true },
    status: { type: String, enum: ['present', 'absent', 'late', 'excused'], required: true },
    notes: { type: String }
}, { timestamps: true });

attendanceSchema.index({ studentId: 1, date: -1 });
attendanceSchema.index({ organizationId: 1 });

// Assignment Schema - Stores assignment details and submissions
const assignmentSchema = new mongoose.Schema({
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
    title: { type: String, required: true },
    description: { type: String },
    subject: { type: String, required: true },
    dueDate: { type: Date, required: true },
    maxScore: { type: Number, default: 100 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    submissions: [{
        studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        submittedAt: { type: Date },
        score: { type: Number },
        feedback: { type: String },
        status: { type: String, enum: ['pending', 'submitted', 'graded', 'late'], default: 'pending' }
    }]
}, { timestamps: true });

assignmentSchema.index({ organizationId: 1, dueDate: -1 });
assignmentSchema.index({ subject: 1 });

// Timetable Schema - Class schedule
const timetableSchema = new mongoose.Schema({
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
    subject: { type: String, required: true },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    dayOfWeek: { type: Number, required: true, min: 0, max: 6 }, // 0 = Sunday
    startTime: { type: String, required: true }, // Format: "HH:MM"
    endTime: { type: String, required: true },
    room: { type: String },
    meetingCode: { type: String }
}, { timestamps: true });

timetableSchema.index({ organizationId: 1, dayOfWeek: 1 });

// Event Schema - Upcoming events (assignments, quizzes, exams, meetings)
const eventSchema = new mongoose.Schema({
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
    title: { type: String, required: true },
    description: { type: String },
    type: { type: String, enum: ['assignment', 'quiz', 'exam', 'meeting'], required: true },
    subject: { type: String },
    date: { type: Date, required: true },
    startTime: { type: String },
    endTime: { type: String },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    urgent: { type: Boolean, default: false }
}, { timestamps: true });

eventSchema.index({ organizationId: 1, date: 1 });
eventSchema.index({ type: 1 });

// Student Update Schema - Activity feed updates
const studentUpdateSchema = new mongoose.Schema({
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
    type: { type: String, enum: ['grade', 'feedback', 'announcement'], required: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
    subject: { type: String },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    read: { type: Boolean, default: false },
    meta: { type: mongoose.Schema.Types.Mixed } // Additional data
}, { timestamps: true });

studentUpdateSchema.index({ studentId: 1, createdAt: -1 });
studentUpdateSchema.index({ read: 1 });

// Goal Schema - Student goals and progress tracking
const goalSchema = new mongoose.Schema({
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
    title: { type: String, required: true },
    type: { type: String, enum: ['gpa', 'grade', 'attendance', 'completion'], required: true },
    subject: { type: String }, // For subject-specific goals
    target: { type: Number, required: true },
    current: { type: Number, default: 0 },
    deadline: { type: Date },
    completed: { type: Boolean, default: false },
    completedAt: { type: Date }
}, { timestamps: true });

goalSchema.index({ studentId: 1 });
goalSchema.index({ completed: 1 });

// Achievement Schema - Badges and XP system
const achievementSchema = new mongoose.Schema({
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
    badgeId: { type: String, required: true }, // Unique badge identifier
    name: { type: String, required: true },
    description: { type: String },
    icon: { type: String },
    xp: { type: Number, default: 0 },
    unlockedAt: { type: Date, default: Date.now }
}, { timestamps: true });

achievementSchema.index({ studentId: 1 });
achievementSchema.index({ badgeId: 1 });

// Student XP Schema - Track XP and level
const studentXPSchema = new mongoose.Schema({
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
    totalXP: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    streak: { type: Number, default: 0 }, // Login streak
    lastLoginDate: { type: Date }
}, { timestamps: true });

studentXPSchema.index({ studentId: 1 });
studentXPSchema.index({ totalXP: -1 }); // For leaderboard

// Report Schema - Generated reports
const reportSchema = new mongoose.Schema({
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
    type: { type: String, enum: ['weekly', 'monthly', 'semester', 'certificate'], required: true },
    title: { type: String, required: true },
    dateRange: {
        start: { type: Date },
        end: { type: Date }
    },
    data: { type: mongoose.Schema.Types.Mixed }, // Report data
    url: { type: String } // PDF URL if generated
}, { timestamps: true });

reportSchema.index({ studentId: 1, createdAt: -1 });

// Create models
export const Grade = mongoose.model('Grade', gradeSchema);
export const Attendance = mongoose.model('Attendance', attendanceSchema);
export const Assignment = mongoose.model('Assignment', assignmentSchema);
export const Timetable = mongoose.model('Timetable', timetableSchema);
export const Event = mongoose.model('Event', eventSchema);
export const StudentUpdate = mongoose.model('StudentUpdate', studentUpdateSchema);
export const Goal = mongoose.model('Goal', goalSchema);
export const Achievement = mongoose.model('Achievement', achievementSchema);
export const StudentXP = mongoose.model('StudentXP', studentXPSchema);
export const Report = mongoose.model('Report', reportSchema);

// ============================================
// HELPER FUNCTIONS
// ============================================

// Calculate GPA from grades
export async function calculateGPA(studentId) {
    const grades = await Grade.find({ studentId }).sort({ createdAt: -1 }).limit(20);
    if (grades.length === 0) return 0;

    const totalWeightedScore = grades.reduce((sum, grade) => sum + (grade.score * grade.weight), 0);
    const totalWeight = grades.reduce((sum, grade) => sum + grade.weight, 0);

    const avgPercentage = totalWeightedScore / totalWeight;
    // Convert to 4.0 scale
    return (avgPercentage / 100 * 4).toFixed(2);
}

// Calculate attendance rate
export async function calculateAttendanceRate(studentId) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const records = await Attendance.find({
        studentId,
        date: { $gte: thirtyDaysAgo }
    });

    if (records.length === 0) return 0;

    const presentCount = records.filter(r => r.status === 'present' || r.status === 'late').length;
    return Math.round((presentCount / records.length) * 100);
}

// Calculate assignment completion rate
export async function calculateCompletionRate(studentId) {
    const assignments = await Assignment.find({
        'submissions.studentId': studentId
    });

    if (assignments.length === 0) return 0;

    const completedCount = assignments.filter(a => {
        const submission = a.submissions.find(s => s.studentId.toString() === studentId.toString());
        return submission && submission.status !== 'pending';
    }).length;

    return Math.round((completedCount / assignments.length) * 100);
}

// Update student XP and level
export async function addXP(studentId, organizationId, xpAmount) {
    let studentXP = await StudentXP.findOne({ studentId });

    if (!studentXP) {
        studentXP = new StudentXP({ studentId, organizationId, totalXP: 0, level: 1 });
    }

    studentXP.totalXP += xpAmount;

    // Calculate level (1000 XP per level)
    const newLevel = Math.floor(studentXP.totalXP / 1000) + 1;
    studentXP.level = newLevel;

    await studentXP.save();
    return studentXP;
}

// Update login streak
export async function updateStreak(studentId, organizationId) {
    let studentXP = await StudentXP.findOne({ studentId });

    if (!studentXP) {
        studentXP = new StudentXP({ studentId, organizationId, streak: 1, lastLoginDate: new Date() });
    } else {
        const today = new Date();
        const lastLogin = studentXP.lastLoginDate;

        if (lastLogin) {
            const daysDiff = Math.floor((today - lastLogin) / (1000 * 60 * 60 * 24));

            if (daysDiff === 1) {
                // Consecutive day
                studentXP.streak += 1;
            } else if (daysDiff > 1) {
                // Streak broken
                studentXP.streak = 1;
            }
            // If daysDiff === 0, same day, don't update
        }

        studentXP.lastLoginDate = today;
    }

    await studentXP.save();
    return studentXP;
}
