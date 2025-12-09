// Google Classroom API Service
// This file handles all Google Classroom API interactions and data syncing

import { google } from 'googleapis';

/**
 * Initialize Google Classroom API with user's OAuth tokens
 * @param {Object} user - User object with Google tokens
 * @returns {Object} - Google Classroom API instance
 */
export async function getClassroomAPI(user) {
    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials({
        access_token: user.googleAccessToken,
        refresh_token: user.googleRefreshToken
    });

    return google.classroom({ version: 'v1', auth: oauth2Client });
}

/**
 * Sync all courses from Google Classroom
 * @param {String} userId - MindWave user ID
 * @param {Object} models - Mongoose models
 * @returns {Array} - Synced courses
 */
export async function syncCourses(userId, models) {
    const { User, GoogleClassroomCourse } = models;

    try {
        const user = await User.findById(userId);
        if (!user || !user.googleAccessToken) {
            throw new Error('User not found or not connected to Google');
        }

        const classroom = await getClassroomAPI(user);

        const response = await classroom.courses.list({
            courseStates: ['ACTIVE'],
            pageSize: 100
        });

        const courses = response.data.courses || [];
        const syncedCourses = [];

        for (const course of courses) {
            const syncedCourse = await GoogleClassroomCourse.findOneAndUpdate(
                { courseId: course.id },
                {
                    courseId: course.id,
                    name: course.name,
                    section: course.section,
                    description: course.description,
                    room: course.room,
                    ownerId: course.ownerId,
                    enrollmentCode: course.enrollmentCode,
                    courseState: course.courseState,
                    alternateLink: course.alternateLink,
                    lastSyncedAt: new Date()
                },
                { upsert: true, new: true }
            );

            syncedCourses.push(syncedCourse);
        }

        console.log(`Synced ${syncedCourses.length} courses for user ${userId}`);
        return syncedCourses;

    } catch (error) {
        console.error('Error syncing courses:', error);
        throw error;
    }
}

/**
 * Sync course materials from Google Classroom
 * @param {String} userId - MindWave user ID
 * @param {String} courseId - Google Classroom course ID
 * @param {Object} models - Mongoose models
 * @returns {Array} - Synced materials
 */
export async function syncCourseMaterials(userId, courseId, models) {
    const { User, GoogleClassroomMaterial } = models;

    try {
        const user = await User.findById(userId);
        if (!user || !user.googleAccessToken) {
            throw new Error('User not found or not connected to Google');
        }

        const classroom = await getClassroomAPI(user);

        const response = await classroom.courses.courseWorkMaterials.list({
            courseId: courseId,
            pageSize: 100
        });

        const materials = response.data.courseWorkMaterial || [];
        const syncedMaterials = [];

        for (const material of materials) {
            const syncedMaterial = await GoogleClassroomMaterial.findOneAndUpdate(
                { materialId: material.id },
                {
                    materialId: material.id,
                    courseId: courseId,
                    title: material.title,
                    description: material.description,
                    materials: material.materials,
                    state: material.state,
                    creationTime: material.creationTime,
                    updateTime: material.updateTime,
                    creatorUserId: material.creatorUserId,
                    lastSyncedAt: new Date()
                },
                { upsert: true, new: true }
            );

            syncedMaterials.push(syncedMaterial);
        }

        console.log(`Synced ${syncedMaterials.length} materials for course ${courseId}`);
        return syncedMaterials;

    } catch (error) {
        console.error('Error syncing materials:', error);
        throw error;
    }
}

/**
 * Sync course assignments from Google Classroom
 * @param {String} userId - MindWave user ID
 * @param {String} courseId - Google Classroom course ID
 * @param {Object} models - Mongoose models
 * @returns {Array} - Synced assignments
 */
export async function syncCourseAssignments(userId, courseId, models) {
    const { User, GoogleClassroomAssignment } = models;

    try {
        const user = await User.findById(userId);
        if (!user || !user.googleAccessToken) {
            throw new Error('User not found or not connected to Google');
        }

        const classroom = await getClassroomAPI(user);

        const response = await classroom.courses.courseWork.list({
            courseId: courseId,
            pageSize: 100
        });

        const assignments = response.data.courseWork || [];
        const syncedAssignments = [];

        for (const assignment of assignments) {
            const syncedAssignment = await GoogleClassroomAssignment.findOneAndUpdate(
                { assignmentId: assignment.id },
                {
                    assignmentId: assignment.id,
                    courseId: courseId,
                    title: assignment.title,
                    description: assignment.description,
                    materials: assignment.materials,
                    state: assignment.state,
                    workType: assignment.workType,
                    maxPoints: assignment.maxPoints,
                    dueDate: assignment.dueDate,
                    dueTime: assignment.dueTime,
                    creationTime: assignment.creationTime,
                    updateTime: assignment.updateTime,
                    creatorUserId: assignment.creatorUserId,
                    alternateLink: assignment.alternateLink,
                    lastSyncedAt: new Date()
                },
                { upsert: true, new: true }
            );

            syncedAssignments.push(syncedAssignment);
        }

        console.log(`Synced ${syncedAssignments.length} assignments for course ${courseId}`);
        return syncedAssignments;

    } catch (error) {
        console.error('Error syncing assignments:', error);
        throw error;
    }
}

/**
 * Sync student submissions for an assignment
 * @param {String} userId - MindWave user ID (teacher)
 * @param {String} courseId - Google Classroom course ID
 * @param {String} assignmentId - Google Classroom assignment ID
 * @param {Object} models - Mongoose models
 * @returns {Array} - Synced submissions
 */
export async function syncAssignmentSubmissions(userId, courseId, assignmentId, models) {
    const { User, GoogleClassroomSubmission } = models;

    try {
        const user = await User.findById(userId);
        if (!user || !user.googleAccessToken) {
            throw new Error('User not found or not connected to Google');
        }

        const classroom = await getClassroomAPI(user);

        const response = await classroom.courses.courseWork.studentSubmissions.list({
            courseId: courseId,
            courseWorkId: assignmentId,
            pageSize: 100
        });

        const submissions = response.data.studentSubmissions || [];
        const syncedSubmissions = [];

        for (const submission of submissions) {
            // Try to find MindWave user by Google user ID (email)
            const studentUser = await User.findOne({ email: submission.userId });

            const syncedSubmission = await GoogleClassroomSubmission.findOneAndUpdate(
                { submissionId: submission.id },
                {
                    submissionId: submission.id,
                    courseId: courseId,
                    assignmentId: assignmentId,
                    studentId: studentUser?._id, // May be null if user not found
                    googleUserId: submission.userId,
                    state: submission.state,
                    assignedGrade: submission.assignedGrade,
                    draftGrade: submission.draftGrade,
                    submissionHistory: submission.submissionHistory,
                    late: submission.late,
                    creationTime: submission.creationTime,
                    updateTime: submission.updateTime,
                    lastSyncedAt: new Date()
                },
                { upsert: true, new: true }
            );

            syncedSubmissions.push(syncedSubmission);
        }

        console.log(`Synced ${syncedSubmissions.length} submissions for assignment ${assignmentId}`);
        return syncedSubmissions;

    } catch (error) {
        console.error('Error syncing submissions:', error);
        throw error;
    }
}

/**
 * Sync all data for a course (materials + assignments + submissions)
 * @param {String} userId - MindWave user ID
 * @param {String} courseId - Google Classroom course ID
 * @param {Object} models - Mongoose models
 * @returns {Object} - Sync results
 */
export async function syncFullCourse(userId, courseId, models) {
    try {
        const materials = await syncCourseMaterials(userId, courseId, models);
        const assignments = await syncCourseAssignments(userId, courseId, models);

        // Sync submissions for each assignment
        const allSubmissions = [];
        for (const assignment of assignments) {
            const submissions = await syncAssignmentSubmissions(userId, courseId, assignment.assignmentId, models);
            allSubmissions.push(...submissions);
        }

        return {
            materials: materials.length,
            assignments: assignments.length,
            submissions: allSubmissions.length
        };

    } catch (error) {
        console.error('Error syncing full course:', error);
        throw error;
    }
}
