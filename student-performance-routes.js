// ============================================
// STUDENT PERFORMANCE ANALYTICS - API ROUTES
// ============================================
// Import this file in server.js to add all student performance endpoints

import express from 'express';
import {
    Grade,
    Attendance,
    Assignment,
    Timetable,
    Event,
    StudentUpdate,
    Goal,
    Achievement,
    StudentXP,
    Report,
    calculateGPA,
    calculateAttendanceRate,
    calculateCompletionRate,
    addXP,
    updateStreak
} from './student-performance-models.js';

const router = express.Router();

// ============================================
// 1. PERFORMANCE SUMMARY (Main Dashboard)
// ============================================
router.get('/performance-summary', async (req, res) => {
    try {
        const studentId = req.userId;

        // Calculate all stats
        const gpa = await calculateGPA(studentId);
        const attendance = await calculateAttendanceRate(studentId);
        const completion = await calculateCompletionRate(studentId);

        // Get streak
        let studentXP = await StudentXP.findOne({ studentId });
        const streak = studentXP ? studentXP.streak : 0;

        res.json({
            gpa: parseFloat(gpa),
            attendance,
            completion,
            streak
        });
    } catch (error) {
        console.error('Error fetching performance summary:', error);
        res.status(500).json({ error: 'Failed to fetch performance summary' });
    }
});


// ============================================
// 2. PERFORMANCE CHARTS
// ============================================
router.get('/performance-charts', async (req, res) => {
    try {
        const studentId = req.userId;
        const { range = '30days' } = req.query;

        const now = new Date();
        let startDate = new Date();
        switch (range) {
            case '7days': startDate.setDate(now.getDate() - 7); break;
            case '30days': startDate.setDate(now.getDate() - 30); break;
            case 'semester': startDate.setMonth(now.getMonth() - 4); break;
            case 'year': startDate.setFullYear(now.getFullYear() - 1); break;
        }

        const { default: mongoose } = await import('mongoose');
        const studentObjId = new mongoose.Types.ObjectId(studentId);

        // Grade trend (weekly buckets)
        const grades = await Grade.find({ studentId, createdAt: { $gte: startDate } }).sort({ createdAt: 1 });
        const weekBuckets = {};
        grades.forEach(g => {
            const d = new Date(g.createdAt);
            const ws = new Date(d); ws.setDate(d.getDate() - d.getDay());
            const key = ws.toISOString().split('T')[0];
            if (!weekBuckets[key]) weekBuckets[key] = [];
            weekBuckets[key].push(g.score);
        });
        const sortedWeeks = Object.keys(weekBuckets).sort();
        const gradeTrends = {
            labels: sortedWeeks.map(k => new Date(k).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
            data: sortedWeeks.map(k => { const a = weekBuckets[k]; return Math.round(a.reduce((s, v) => s + v, 0) / a.length * 10) / 10; })
        };

        // Subject performance with trend
        const subjectGrades = await Grade.aggregate([
            { $match: { studentId: studentObjId } },
            { $group: { _id: '$subject', avgScore: { $avg: '$score' }, scores: { $push: { score: '$score', date: '$createdAt' } } } }
        ]);
        const myAvg = subjectGrades.length > 0 ? subjectGrades.reduce((s, g) => s + g.avgScore, 0) / subjectGrades.length : 0;
        const subjectPerformance = {
            labels: subjectGrades.map(s => s._id),
            data: subjectGrades.map(s => Math.round(s.avgScore)),
            trends: subjectGrades.map(s => {
                if (s.scores.length < 2) return 0;
                const sorted = [...s.scores].sort((a, b) => new Date(a.date) - new Date(b.date));
                const mid = Math.floor(sorted.length / 2);
                const fh = sorted.slice(0, mid).reduce((a, b) => a + b.score, 0) / mid;
                const sh = sorted.slice(mid).reduce((a, b) => a + b.score, 0) / (sorted.length - mid);
                return Math.round((sh - fh) * 10) / 10;
            })
        };

        // Attendance trend (weekly)
        const attRecs = await Attendance.find({ studentId, date: { $gte: startDate } }).sort({ date: 1 });
        const attBuckets = {};
        attRecs.forEach(r => {
            const d = new Date(r.date); const ws = new Date(d); ws.setDate(d.getDate() - d.getDay());
            const key = ws.toISOString().split('T')[0];
            if (!attBuckets[key]) attBuckets[key] = { present: 0, total: 0 };
            attBuckets[key].total++;
            if (r.status === 'present' || r.status === 'late') attBuckets[key].present++;
        });
        const sortedAttWeeks = Object.keys(attBuckets).sort();
        const attendance = {
            labels: sortedAttWeeks.map(k => new Date(k).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
            data: sortedAttWeeks.map(k => attBuckets[k].total > 0 ? Math.round(attBuckets[k].present / attBuckets[k].total * 100) : 0)
        };

        // Assignment completion
        const assignments = await Assignment.find({ organizationId: req.organizationId });
        let submitted = 0, pending = 0, missed = 0;
        assignments.forEach(a => {
            const sub = a.submissions.find(s => s.studentId && s.studentId.toString() === studentId.toString());
            if (!sub || sub.status === 'pending') pending++;
            else if (sub.status === 'submitted' || sub.status === 'graded') submitted++;
            else missed++;
        });
        const completionPct = assignments.length > 0 ? Math.round(submitted / assignments.length * 100) : 0;

        // Class rank & percentile
        const allAvgs = await Grade.aggregate([
            { $match: { organizationId: new mongoose.Types.ObjectId(req.organizationId) } },
            { $group: { _id: '$studentId', avgScore: { $avg: '$score' } } },
            { $sort: { avgScore: -1 } }
        ]);
        const rank = (allAvgs.findIndex(s => s._id.toString() === studentId.toString()) + 1) || 1;
        const totalStudents = allAvgs.length || 1;
        const percentile = Math.round(((totalStudents - rank) / totalStudents) * 100);

        // Predicted grade (linear regression)
        let predictedGrade = 'N/A', confidence = 0;
        if (gradeTrends.data.length >= 2) {
            const n = gradeTrends.data.length;
            const xs = gradeTrends.data.map((_, i) => i), ys = gradeTrends.data;
            const sumX = xs.reduce((a, b) => a + b, 0), sumY = ys.reduce((a, b) => a + b, 0);
            const sumXY = xs.reduce((s, x, i) => s + x * ys[i], 0), sumXX = xs.reduce((s, x) => s + x * x, 0);
            const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
            const intercept = (sumY - slope * sumX) / n;
            const projected = Math.min(100, Math.max(0, intercept + slope * (n + 3)));
            predictedGrade = projected >= 90 ? 'A' : projected >= 80 ? 'B' : projected >= 70 ? 'C' : projected >= 60 ? 'D' : 'F';
            confidence = Math.min(92, 40 + n * 5);
        }

        // XP streak
        const xpDoc = await StudentXP.findOne({ studentId });
        const streak = xpDoc ? xpDoc.streak : 0;

        res.json({
            gradeTrends,
            subjectPerformance,
            completion: { submitted, pending, missed, pct: completionPct },
            attendance,
            subjectGrades: { labels: subjectGrades.map(s => s._id), data: subjectGrades.map(s => Math.round(s.avgScore)) },
            classRank: rank, totalStudents, percentile,
            predictedGrade, confidence,
            overallAvg: Math.round(myAvg * 10) / 10,
            streak
        });
    } catch (error) {
        console.error('Performance charts error:', error);
        res.status(500).json({ error: 'Failed to fetch performance charts' });
    }
});

// ============================================
// 2b. ACTIVITY HEATMAP (180 days)
// ============================================
router.get('/performance-charts/heatmap', async (req, res) => {
    try {
        const studentId = req.userId;
        const today = new Date();
        const since = new Date(); since.setDate(today.getDate() - 179); since.setHours(0, 0, 0, 0);

        const [attRecs, gradeRecs, assignRecs] = await Promise.all([
            Attendance.find({ studentId, date: { $gte: since } }),
            Grade.find({ studentId, createdAt: { $gte: since } }),
            Assignment.find({ 'submissions.studentId': studentId })
        ]);

        const dk = d => { const dt = new Date(d); return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`; };
        const dayMap = {};

        attRecs.forEach(r => { if (r.status === 'present' || r.status === 'late') { const k = dk(r.date); dayMap[k] = (dayMap[k]||0) + 2; } });
        gradeRecs.forEach(r => { const k = dk(r.createdAt); dayMap[k] = (dayMap[k]||0) + 1; });
        assignRecs.forEach(a => {
            a.submissions.forEach(s => {
                if (s.studentId && s.studentId.toString() === studentId.toString() && s.submittedAt && new Date(s.submittedAt) >= since) {
                    const k = dk(s.submittedAt); dayMap[k] = (dayMap[k]||0) + 2;
                }
            });
        });

        const maxVal = Math.max(1, ...Object.values(dayMap));
        const heatmap = {};
        for (const [k, v] of Object.entries(dayMap)) heatmap[k] = Math.min(4, Math.ceil((v/maxVal)*4));

        res.json({ heatmap, since: since.toISOString(), today: today.toISOString() });
    } catch (error) {
        console.error('Heatmap error:', error);
        res.status(500).json({ error: 'Failed to fetch heatmap' });
    }
});

// ============================================
// 3. TIMETABLE
// ============================================
router.get('/timetable', async (req, res) => {
    try {
        const organizationId = req.organizationId;

        // Get all timetable entries for this organization
        const schedule = await Timetable.find({ organizationId })
            .populate('teacher', 'name')
            .sort({ dayOfWeek: 1, startTime: 1 });

        // Find next class
        const now = new Date();
        const currentDay = now.getDay();
        const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

        let nextClass = null;
        for (let i = 0; i < 7; i++) {
            const checkDay = (currentDay + i) % 7;
            const dayClasses = schedule.filter(s => s.dayOfWeek === checkDay);

            for (const cls of dayClasses) {
                if (i === 0 && cls.startTime <= currentTime) continue;
                nextClass = cls;
                break;
            }
            if (nextClass) break;
        }

        res.json({
            nextClass: nextClass ? {
                name: nextClass.subject,
                time: `${nextClass.startTime} - ${nextClass.endTime}`,
                teacher: (nextClass.teacher && nextClass.teacher.name) || 'TBA',
                room: nextClass.room,
                meetingCode: nextClass.meetingCode
            } : null,
            schedule: schedule.map(s => ({
                day: s.dayOfWeek,
                time: `${s.startTime} - ${s.endTime}`,
                subject: s.subject,
                teacher: (s.teacher && s.teacher.name) || 'TBA',
                room: s.room
            }))
        });
    } catch (error) {
        console.error('Error fetching timetable:', error);
        res.status(500).json({ error: 'Failed to fetch timetable' });
    }
});

// ============================================
// 4. UPCOMING EVENTS
// ============================================
router.get('/events', async (req, res) => {
    try {
        const organizationId = req.organizationId;
        const now = new Date();

        // Get upcoming events
        const events = await Event.find({
            organizationId,
            date: { $gte: now }
        })
            .populate('teacher', 'name')
            .sort({ date: 1 })
            .limit(20);

        res.json(events.map(e => ({
            id: e._id,
            type: e.type,
            title: e.title,
            date: e.date,
            time: e.startTime && e.endTime ? `${e.startTime} - ${e.endTime}` : null,
            subject: e.subject,
            teacher: e.teacher && e.teacher.name,
            urgent: e.urgent
        })));
    } catch (error) {
        console.error('Error fetching events:', error);
        res.status(500).json({ error: 'Failed to fetch events' });
    }
});

// ============================================
// 5. UPDATES (Activity Feed)
// ============================================
router.get('/updates', async (req, res) => {
    try {
        const studentId = req.userId;

        const updates = await StudentUpdate.find({ studentId })
            .populate('teacher', 'name')
            .sort({ createdAt: -1 })
            .limit(20);

        res.json(updates.map(u => ({
            id: u._id,
            type: u.type,
            title: u.title,
            content: u.content,
            timestamp: u.createdAt,
            read: u.read,
            meta: {
                subject: u.subject,
                teacher: u.teacher && u.teacher.name
            }
        })));
    } catch (error) {
        console.error('Error fetching updates:', error);
        res.status(500).json({ error: 'Failed to fetch updates' });
    }
});

// Mark update as read
router.patch('/updates/:id/read', async (req, res) => {
    try {
        await StudentUpdate.findByIdAndUpdate(req.params.id, { read: true });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to mark as read' });
    }
});

// ============================================
// 6. GOALS
// ============================================
router.get('/goals', async (req, res) => {
    try {
        const studentId = req.userId;

        const goals = await Goal.find({ studentId }).sort({ createdAt: -1 });

        res.json(goals.map(g => ({
            id: g._id,
            title: g.title,
            type: g.type,
            subject: g.subject,
            target: g.target,
            current: g.current,
            progress: Math.min((g.current / g.target * 100).toFixed(0), 100),
            deadline: g.deadline,
            completed: g.completed,
            stats: {
                remaining: Math.max(g.target - g.current, 0),
                timeLeft: g.deadline ? Math.ceil((g.deadline - new Date()) / (1000 * 60 * 60 * 24)) : null
            }
        })));
    } catch (error) {
        console.error('Error fetching goals:', error);
        res.status(500).json({ error: 'Failed to fetch goals' });
    }
});

// Create goal
router.post('/goals', async (req, res) => {
    try {
        const { title, type, subject, target, deadline } = req.body;

        const goal = new Goal({
            studentId: req.userId,
            organizationId: req.organizationId,
            title,
            type,
            subject,
            target,
            deadline
        });

        await goal.save();
        res.json(goal);
    } catch (error) {
        console.error('Error creating goal:', error);
        res.status(500).json({ error: 'Failed to create goal' });
    }
});

// Update goal
router.put('/goals/:id', async (req, res) => {
    try {
        const goal = await Goal.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(goal);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update goal' });
    }
});

// Delete goal
router.delete('/goals/:id', async (req, res) => {
    try {
        await Goal.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete goal' });
    }
});

// ============================================
// 7. STUDY RECOMMENDATIONS
// ============================================
router.get('/recommendations', async (req, res) => {
    try {
        const studentId = req.userId;

        // Get recent grades to identify weak subjects
        const grades = await Grade.find({ studentId }).sort({ createdAt: -1 }).limit(20);

        // Calculate subject averages
        const subjectAvgs = {};
        grades.forEach(g => {
            if (!subjectAvgs[g.subject]) subjectAvgs[g.subject] = [];
            subjectAvgs[g.subject].push(g.score);
        });

        const weakSubjects = [];
        Object.keys(subjectAvgs).forEach(subject => {
            const avg = subjectAvgs[subject].reduce((a, b) => a + b, 0) / subjectAvgs[subject].length;
            if (avg < 80) {
                weakSubjects.push({ subject, avg });
            }
        });

        // Generate AI insight
        const aiInsight = weakSubjects.length > 0
            ? `Based on your recent performance, you could benefit from additional practice in ${weakSubjects.map(s => s.subject).join(', ')}. Focus 30 minutes daily on these areas to improve your grades by 10-15%.`
            : "Great work! You're performing well across all subjects. Keep up the good work!";

        // Generate recommendations
        const recommendations = weakSubjects.map(s => ({
            type: 'topic',
            title: `${s.subject} - Review Fundamentals`,
            description: `Your recent quiz scores indicate difficulty in ${s.subject}. We recommend reviewing the core concepts and practicing with sample problems.`,
            priority: s.avg < 70 ? 'high' : 'medium',
            meta: {
                subject: s.subject,
                currentScore: s.avg.toFixed(0),
                targetScore: 85
            },
            action: 'startPractice'
        }));

        // Study plan
        const studyPlan = weakSubjects.map(s => ({
            subject: s.subject,
            topic: 'Core concepts review',
            duration: '30m',
            frequency: 'Daily'
        }));

        res.json({
            aiInsight,
            recommendations,
            studyPlan
        });
    } catch (error) {
        console.error('Error fetching recommendations:', error);
        res.status(500).json({ error: 'Failed to fetch recommendations' });
    }
});

// ============================================
// 8. REPORTS
// ============================================
router.get('/reports', async (req, res) => {
    try {
        const studentId = req.userId;

        const reports = await Report.find({ studentId })
            .sort({ createdAt: -1 })
            .limit(10);

        res.json(reports.map(r => ({
            id: r._id,
            name: r.title,
            type: r.type,
            date: r.createdAt,
            url: r.url
        })));
    } catch (error) {
        console.error('Error fetching reports:', error);
        res.status(500).json({ error: 'Failed to fetch reports' });
    }
});

// Generate report
router.post('/reports/generate', async (req, res) => {
    try {
        const { type, title, dateRange } = req.body;

        const report = new Report({
            studentId: req.userId,
            organizationId: req.organizationId,
            type,
            title,
            dateRange,
            data: {} // TODO: Generate actual report data
        });

        await report.save();
        res.json(report);
    } catch (error) {
        console.error('Error generating report:', error);
        res.status(500).json({ error: 'Failed to generate report' });
    }
});

// ============================================
// 9. ACHIEVEMENTS
// ============================================
router.get('/achievements', async (req, res) => {
    try {
        const studentId = req.userId;

        // Get student XP
        let studentXP = await StudentXP.findOne({ studentId });
        if (!studentXP) {
            studentXP = new StudentXP({
                studentId,
                organizationId: req.organizationId,
                totalXP: 0,
                level: 1,
                streak: 0
            });
            await studentXP.save();
        }

        // Get unlocked badges
        const unlockedBadges = await Achievement.find({ studentId });

        // Define all available badges
        const allBadges = [
            { id: 'perfect-score', name: 'Perfect Score', icon: '🎯', description: 'Achieved 100% on a quiz', xp: 100 },
            { id: '7-day-streak', name: '7-Day Streak', icon: '🔥', description: 'Logged in 7 days in a row', xp: 150 },
            { id: 'bookworm', name: 'Bookworm', icon: '📚', description: 'Completed 10 reading assignments', xp: 200 },
            { id: 'quick-learner', name: 'Quick Learner', icon: '⚡', description: 'Finished quiz in under 5 minutes', xp: 75 },
            { id: 'honor-roll', name: 'Honor Roll', icon: '🎓', description: 'Maintained 90%+ average', xp: 250 },
            { id: 'team-player', name: 'Team Player', icon: '👥', description: 'Participated in 5 study groups', xp: 100 },
            { id: 'improvement-star', name: 'Improvement Star', icon: '📈', description: 'Improved grade by 15%', xp: 200 },
            { id: 'completionist', name: 'Completionist', icon: '✅', description: '100% assignment completion', xp: 300 }
        ];

        const unlockedIds = unlockedBadges.map(b => b.badgeId);
        const badges = allBadges.map(b => ({
            ...b,
            unlocked: unlockedIds.includes(b.id)
        }));

        // Get leaderboard
        const leaderboard = await StudentXP.find({ organizationId: req.organizationId })
            .populate('studentId', 'name')
            .sort({ totalXP: -1 })
            .limit(10);

        res.json({
            level: studentXP.level,
            xp: studentXP.totalXP,
            xpToNext: (studentXP.level * 1000) - (studentXP.totalXP % 1000),
            streak: studentXP.streak,
            badges,
            leaderboard: leaderboard.map((entry, index) => ({
                rank: index + 1,
                name: (entry.studentId && entry.studentId.name) || 'Anonymous',
                level: entry.level,
                xp: entry.totalXP,
                isCurrentUser: (entry.studentId && entry.studentId._id.toString() === studentId.toString())
            }))
        });
    } catch (error) {
        console.error('Error fetching achievements:', error);
        res.status(500).json({ error: 'Failed to fetch achievements' });
    }
});

export default router;
