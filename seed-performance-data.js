// ============================================
// SAMPLE DATA SEEDER FOR STUDENT PERFORMANCE
// ============================================
// Run this script to populate database with sample data for testing
// Usage: node seed-performance-data.js

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import {
    Grade,
    Attendance,
    Assignment,
    Timetable,
    Event,
    StudentUpdate,
    Goal,
    Achievement,
    StudentXP
} from './student-performance-models.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/mindwave";

// Sample data
async function seedData() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✓ Connected to MongoDB');

        // Get a sample student ID (you'll need to replace this with actual student ID)
        const sampleStudentId = new mongoose.Types.ObjectId();
        const sampleOrgId = new mongoose.Types.ObjectId();
        const sampleTeacherId = new mongoose.Types.ObjectId();

        console.log('\n📝 Seeding sample data...');
        console.log(`Student ID: ${sampleStudentId}`);
        console.log(`Organization ID: ${sampleOrgId}`);

        // 1. Seed Grades
        const grades = [
            { subject: 'Mathematics', title: 'Quiz 1', type: 'quiz', score: 92 },
            { subject: 'Mathematics', title: 'Assignment 1', type: 'assignment', score: 88 },
            { subject: 'Science', title: 'Lab Report', type: 'assignment', score: 95 },
            { subject: 'English', title: 'Essay 1', type: 'assignment', score: 85 },
            { subject: 'History', title: 'Mid-term', type: 'exam', score: 90 },
            { subject: 'Mathematics', title: 'Quiz 2', type: 'quiz', score: 94 },
            { subject: 'Science', title: 'Quiz 1', type: 'quiz', score: 88 },
            { subject: 'English', title: 'Quiz 1', type: 'quiz', score: 82 }
        ];

        for (const grade of grades) {
            await Grade.create({
                studentId: sampleStudentId,
                organizationId: sampleOrgId,
                ...grade,
                gradedBy: sampleTeacherId,
                feedback: 'Good work! Keep it up.'
            });
        }
        console.log('✓ Seeded grades');

        // 2. Seed Attendance
        const attendanceRecords = [];
        for (let i = 0; i < 30; i++) {
            const date = new Date();
            date.setDate(date.getDate() - i);

            attendanceRecords.push({
                studentId: sampleStudentId,
                organizationId: sampleOrgId,
                subject: ['Mathematics', 'Science', 'English', 'History'][i % 4],
                date,
                status: i % 10 === 0 ? 'absent' : 'present'
            });
        }
        await Attendance.insertMany(attendanceRecords);
        console.log('✓ Seeded attendance');

        // 3. Seed Timetable
        const timetable = [
            { dayOfWeek: 1, startTime: '09:00', endTime: '10:00', subject: 'Mathematics', room: '101' },
            { dayOfWeek: 1, startTime: '10:00', endTime: '11:00', subject: 'Science', room: '102' },
            { dayOfWeek: 2, startTime: '09:00', endTime: '10:00', subject: 'English', room: '103' },
            { dayOfWeek: 2, startTime: '11:00', endTime: '12:00', subject: 'History', room: '104' },
            { dayOfWeek: 3, startTime: '09:00', endTime: '10:00', subject: 'Mathematics', room: '101' },
            { dayOfWeek: 4, startTime: '10:00', endTime: '11:00', subject: 'Science', room: '102' },
            { dayOfWeek: 5, startTime: '09:00', endTime: '10:00', subject: 'English', room: '103' }
        ];

        for (const entry of timetable) {
            await Timetable.create({
                organizationId: sampleOrgId,
                teacher: sampleTeacherId,
                ...entry
            });
        }
        console.log('✓ Seeded timetable');

        // 4. Seed Events
        const events = [
            {
                title: 'Mathematics Quiz - Chapter 5',
                type: 'quiz',
                subject: 'Mathematics',
                date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
                startTime: '10:00',
                endTime: '11:00',
                urgent: true
            },
            {
                title: 'Science Project Due',
                type: 'assignment',
                subject: 'Science',
                date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
                urgent: false
            },
            {
                title: 'History Mid-term Exam',
                type: 'exam',
                subject: 'History',
                date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
                startTime: '09:00',
                endTime: '12:00',
                urgent: false
            }
        ];

        for (const event of events) {
            await Event.create({
                organizationId: sampleOrgId,
                teacher: sampleTeacherId,
                ...event
            });
        }
        console.log('✓ Seeded events');

        // 5. Seed Updates
        const updates = [
            {
                type: 'grade',
                title: 'Mathematics Quiz Graded',
                content: 'Your grade has been posted: 92/100. Great work!',
                subject: 'Mathematics'
            },
            {
                type: 'feedback',
                title: 'English Essay Feedback',
                content: 'Excellent analysis! Consider adding more supporting evidence.',
                subject: 'English'
            },
            {
                type: 'announcement',
                title: 'Mid-term Schedule Released',
                content: 'The mid-term examination schedule has been published.'
            }
        ];

        for (const update of updates) {
            await StudentUpdate.create({
                studentId: sampleStudentId,
                organizationId: sampleOrgId,
                teacher: sampleTeacherId,
                ...update
            });
        }
        console.log('✓ Seeded updates');

        // 6. Seed Goals
        const goals = [
            {
                title: 'Overall GPA Target',
                type: 'gpa',
                target: 3.8,
                current: 3.6,
                deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            },
            {
                title: 'Mathematics Grade',
                type: 'grade',
                subject: 'Mathematics',
                target: 95,
                current: 92,
                deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
            },
            {
                title: 'Attendance Rate',
                type: 'attendance',
                target: 95,
                current: 96,
                completed: true
            }
        ];

        for (const goal of goals) {
            await Goal.create({
                studentId: sampleStudentId,
                organizationId: sampleOrgId,
                ...goal
            });
        }
        console.log('✓ Seeded goals');

        // 7. Seed Student XP
        await StudentXP.create({
            studentId: sampleStudentId,
            organizationId: sampleOrgId,
            totalXP: 2450,
            level: 12,
            streak: 7,
            lastLoginDate: new Date()
        });
        console.log('✓ Seeded student XP');

        // 8. Seed Achievements
        const achievements = [
            { badgeId: 'perfect-score', name: 'Perfect Score', icon: '🎯', xp: 100 },
            { badgeId: '7-day-streak', name: '7-Day Streak', icon: '🔥', xp: 150 },
            { badgeId: 'bookworm', name: 'Bookworm', icon: '📚', xp: 200 }
        ];

        for (const achievement of achievements) {
            await Achievement.create({
                studentId: sampleStudentId,
                organizationId: sampleOrgId,
                ...achievement
            });
        }
        console.log('✓ Seeded achievements');

        console.log('\n✅ Sample data seeded successfully!');
        console.log('\n📊 Summary:');
        console.log(`- ${grades.length} grades`);
        console.log(`- ${attendanceRecords.length} attendance records`);
        console.log(`- ${timetable.length} timetable entries`);
        console.log(`- ${events.length} events`);
        console.log(`- ${updates.length} updates`);
        console.log(`- ${goals.length} goals`);
        console.log(`- ${achievements.length} achievements`);
        console.log(`- 1 student XP record`);

        console.log('\n⚠️  IMPORTANT: Update the student ID in your frontend to:', sampleStudentId);

    } catch (error) {
        console.error('❌ Error seeding data:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n✓ Disconnected from MongoDB');
    }
}

seedData();
