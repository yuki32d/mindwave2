// Google Classroom Real-Time Service (Proxy Approach)
// Teachers upload directly to Google Classroom, students fetch in real-time

import { google } from 'googleapis';

/**
 * Initialize Google Classroom API with user's OAuth tokens
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
 * Get all active courses for a teacher
 */
export async function getCourses(userId, models) {
    const { User } = models;

    try {
        const user = await User.findById(userId);
        if (!user || !user.googleAccessToken) {
            throw new Error('User not connected to Google');
        }

        const classroom = await getClassroomAPI(user);
        const response = await classroom.courses.list({
            courseStates: ['ACTIVE'],
            pageSize: 100
        });

        return response.data.courses || [];
    } catch (error) {
        console.error('Error fetching courses:', error);
        throw error;
    }
}

/**
 * Get course materials in real-time
 */
export async function getCourseMaterials(userId, courseId, models) {
    const { User } = models;

    try {
        const user = await User.findById(userId);
        if (!user || !user.googleAccessToken) {
            throw new Error('User not connected to Google');
        }

        const classroom = await getClassroomAPI(user);
        const response = await classroom.courses.courseWorkMaterials.list({
            courseId: courseId,
            pageSize: 100
        });

        return response.data.courseWorkMaterial || [];
    } catch (error) {
        console.error('Error fetching materials:', error);
        throw error;
    }
}

/**
 * Get course assignments in real-time
 */
export async function getCourseAssignments(userId, courseId, models) {
    const { User } = models;

    try {
        const user = await User.findById(userId);
        if (!user || !user.googleAccessToken) {
            throw new Error('User not connected to Google');
        }

        const classroom = await getClassroomAPI(user);
        const response = await classroom.courses.courseWork.list({
            courseId: courseId,
            pageSize: 100
        });

        return response.data.courseWork || [];
    } catch (error) {
        console.error('Error fetching assignments:', error);
        throw error;
    }
}

/**
 * Get course announcements in real-time
 */
export async function getCourseAnnouncements(userId, courseId, models) {
    const { User } = models;

    try {
        const user = await User.findById(userId);
        if (!user || !user.googleAccessToken) {
            throw new Error('User not connected to Google');
        }

        const classroom = await getClassroomAPI(user);
        const response = await classroom.courses.announcements.list({
            courseId: courseId,
            pageSize: 100
        });

        return response.data.announcements || [];
    } catch (error) {
        console.error('Error fetching announcements:', error);
        throw error;
    }
}

/**
 * Upload material to Google Classroom (for teachers)
 */
export async function uploadMaterial(userId, courseId, materialData, models) {
    const { User } = models;

    try {
        const user = await User.findById(userId);
        if (!user || !user.googleAccessToken) {
            throw new Error('User not connected to Google');
        }

        const classroom = await getClassroomAPI(user);

        const material = {
            title: materialData.title,
            description: materialData.description,
            state: 'PUBLISHED',
            materials: materialData.materials // Array of material objects
        };

        const response = await classroom.courses.courseWorkMaterials.create({
            courseId: courseId,
            requestBody: material
        });

        return response.data;
    } catch (error) {
        console.error('Error uploading material:', error);
        throw error;
    }
}

/**
 * Create assignment in Google Classroom (for teachers)
 */
export async function createAssignment(userId, courseId, assignmentData, models) {
    const { User } = models;

    try {
        const user = await User.findById(userId);
        if (!user || !user.googleAccessToken) {
            throw new Error('User not connected to Google');
        }

        const classroom = await getClassroomAPI(user);

        const assignment = {
            title: assignmentData.title,
            description: assignmentData.description,
            state: 'PUBLISHED',
            workType: assignmentData.workType || 'ASSIGNMENT',
            maxPoints: assignmentData.maxPoints,
            dueDate: assignmentData.dueDate,
            dueTime: assignmentData.dueTime,
            materials: assignmentData.materials || []
        };

        const response = await classroom.courses.courseWork.create({
            courseId: courseId,
            requestBody: assignment
        });

        return response.data;
    } catch (error) {
        console.error('Error creating assignment:', error);
        throw error;
    }
}

/**
 * Upload file to Google Drive and get shareable link
 * (Google Classroom materials reference Google Drive files)
 */
export async function uploadToGoogleDrive(userId, fileData, models) {
    const { User } = models;

    try {
        const user = await User.findById(userId);
        if (!user || !user.googleAccessToken) {
            throw new Error('User not connected to Google');
        }

        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URI
        );

        oauth2Client.setCredentials({
            access_token: user.googleAccessToken,
            refresh_token: user.googleRefreshToken
        });

        const drive = google.drive({ version: 'v3', auth: oauth2Client });

        const fileMetadata = {
            name: fileData.name,
            mimeType: fileData.mimeType
        };

        const media = {
            mimeType: fileData.mimeType,
            body: fileData.content // File stream or buffer
        };

        const response = await drive.files.create({
            requestBody: fileMetadata,
            media: media,
            fields: 'id, name, webViewLink, thumbnailLink'
        });

        // Make file accessible to anyone with the link
        await drive.permissions.create({
            fileId: response.data.id,
            requestBody: {
                role: 'reader',
                type: 'anyone'
            }
        });

        return {
            id: response.data.id,
            title: response.data.name,
            alternateLink: response.data.webViewLink,
            thumbnailUrl: response.data.thumbnailLink
        };
    } catch (error) {
        console.error('Error uploading to Google Drive:', error);
        throw error;
    }
}

/**
 * Get student submissions for an assignment
 */
export async function getAssignmentSubmissions(userId, courseId, assignmentId, models) {
    const { User } = models;

    try {
        const user = await User.findById(userId);
        if (!user || !user.googleAccessToken) {
            throw new Error('User not connected to Google');
        }

        const classroom = await getClassroomAPI(user);
        const response = await classroom.courses.courseWork.studentSubmissions.list({
            courseId: courseId,
            courseWorkId: assignmentId,
            pageSize: 100
        });

        return response.data.studentSubmissions || [];
    } catch (error) {
        console.error('Error fetching submissions:', error);
        throw error;
    }
}

/**
 * Get student's own submission
 */
export async function getMySubmission(userId, courseId, assignmentId, models) {
    const { User } = models;

    try {
        const user = await User.findById(userId);
        if (!user || !user.googleAccessToken) {
            throw new Error('User not connected to Google');
        }

        const classroom = await getClassroomAPI(user);
        const response = await classroom.courses.courseWork.studentSubmissions.list({
            courseId: courseId,
            courseWorkId: assignmentId,
            userId: 'me', // Current user
            pageSize: 1
        });

        const submissions = response.data.studentSubmissions || [];
        return submissions.length > 0 ? submissions[0] : null;
    } catch (error) {
        console.error('Error fetching my submission:', error);
        throw error;
    }
}
