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

        // Calculate date range
        const now = new Date();
        let startDate = new Date();

        switch (range) {
            case '7days':
                startDate.setDate(now.getDate() - 7);
                break;
            case '30days':
                startDate.setDate(now.getDate() - 30);
                break;
            case 'semester':
                startDate.setMonth(now.getMonth() - 4);
                break;
            case 'year':
                startDate.setFullYear(now.getFullYear() - 1);
                break;
        }

        // Get grades for trend
        const grades = await Grade.find({
            studentId,
            createdAt: { $gte: startDate }
        }).sort({ createdAt: 1 });

        // Group by week for grade trends
        const weeklyGrades = {};
        grades.forEach(grade => {
            const week = `Week ${Math.ceil((now - grade.createdAt) / (7 * 24 * 60 * 60 * 1000))}`;
            if (!weeklyGrades[week]) weeklyGrades[week] = [];
            weeklyGrades[week].push(grade.score);
        });

        const gradeTrends = {
            labels: Object.keys(weeklyGrades).reverse(),
            data: Object.values(weeklyGrades).map(scores =>
                scores.reduce((a, b) => a + b, 0) / scores.length
            ).reverse()
        };

        // Subject performance (radar chart)
        const subjectGrades = await Grade.aggregate([
            { $match: { studentId: req.userId } },
            {
                $group: {
                    _id: '$subject',
                    avgScore: { $avg: '$score' }
                }
            }
        ]);

        const subjectPerformance = {
            labels: subjectGrades.map(s => s._id),
            data: subjectGrades.map(s => s.avgScore)
        };

        // Attendance trend
        const attendanceRecords = await Attendance.find({
            studentId,
            date: { $gte: startDate }
        }).sort({ date: 1 });

        const weeklyAttendance = {};
        attendanceRecords.forEach(record => {
            const week = `Week ${Math.ceil((now - record.date) / (7 * 24 * 60 * 60 * 1000))}`;
            if (!weeklyAttendance[week]) weeklyAttendance[week] = { present: 0, total: 0 };
            weeklyAttendance[week].total++;
            if (record.status === 'present' || record.status === 'late') {
                weeklyAttendance[week].present++;
            }
        });

        const attendance = {
            labels: Object.keys(weeklyAttendance).reverse(),
            data: Object.values(weeklyAttendance).map(w =>
                (w.present / w.total * 100).toFixed(0)
            ).reverse()
        };

        // Assignment completion (placeholder - needs assignment tracking)
        const completion = {
            labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
            data: [95, 88, 92, 100]
        };

        // Subject-wise grades (bar chart)
        const subjectGradesBar = {
            labels: subjectGrades.map(s => s._id),
            data: subjectGrades.map(s => s.avgScore)
        };

        res.json({
            gradeTrends,
            subjectPerformance,
            completion,
            attendance,
            subjectGrades: subjectGradesBar
        });
    } catch (error) {
        console.error('Error fetching performance charts:', error);
        res.status(500).json({ error: 'Failed to fetch performance charts' });
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
