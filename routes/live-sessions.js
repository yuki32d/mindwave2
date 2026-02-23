import express from 'express';
import LiveSession from '../models/LiveSession.js';
import Activity from '../models/Activity.js';
import Response from '../models/Response.js';

const router = express.Router();

// Middleware placeholders (will use server.js auth)
const authenticateToken = (req, res, next) => next();
const requireRole = (roles) => (req, res, next) => {
    if (!req.user || !roles.includes(req.user.orgRole)) {
        return res.status(403).json({ success: false, message: 'Access denied' });
    }
    next();
};

// Start live session (Faculty)
router.post('/:activityId/start', authenticateToken, requireRole(['faculty', 'admin', 'owner']), async (req, res) => {
    try {
        const activity = await Activity.findById(req.params.activityId);

        if (!activity) {
            return res.status(404).json({
                success: false,
                message: 'Activity not found'
            });
        }

        // Check ownership
        if (activity.facultyId.toString() !== req.user.userId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        // Generate unique code
        const code = await LiveSession.generateCode();

        // Create live session
        const session = new LiveSession({
            activityId: activity._id,
            code,
            facultyId: req.user.userId,
            organizationId: req.user.organizationId,
            status: 'waiting'
        });

        await session.save();

        // Update activity stats
        activity.stats.totalSessions += 1;
        await activity.save();

        res.status(201).json({
            success: true,
            message: 'Live session started',
            session: {
                sessionId: session._id,
                code: session.code,
                activityType: activity.type,
                activityTitle: activity.title,
                status: session.status,
                expiresAt: session.expiresAt
            }
        });
    } catch (error) {
        console.error('Error starting live session:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to start live session',
            error: error.message
        });
    }
});

// Get session by code (Student)
router.get('/code/:code', authenticateToken, async (req, res) => {
    try {
        const code = req.params.code.toUpperCase();

        const session = await LiveSession.findOne({
            code,
            status: { $in: ['waiting', 'active'] }
        }).populate('activityId', 'type title description content settings');

        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Session not found or expired'
            });
        }

        // Check if session expired
        if (new Date() > session.expiresAt) {
            session.status = 'ended';
            await session.save();
            return res.status(410).json({
                success: false,
                message: 'Session has expired'
            });
        }

        res.json({
            success: true,
            session: {
                sessionId: session._id,
                code: session.code,
                status: session.status,
                activityType: session.activityId.type,
                activityTitle: session.activityId.title,
                activityDescription: session.activityId.description,
                content: session.activityId.content,
                settings: session.activityId.settings,
                participantCount: session.participants.length
            }
        });
    } catch (error) {
        console.error('Error fetching session:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch session'
        });
    }
});

// Join session (Student)
router.post('/:code/join', authenticateToken, requireRole(['student']), async (req, res) => {
    try {
        const code = req.params.code.toUpperCase();
        const { studentName } = req.body;

        const session = await LiveSession.findOne({
            code,
            status: { $in: ['waiting', 'active'] }
        });

        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Session not found or expired'
            });
        }

        // Add participant
        session.addParticipant(req.user.userId, studentName || req.user.name);
        await session.save();

        res.json({
            success: true,
            message: 'Joined session successfully',
            sessionId: session._id
        });
    } catch (error) {
        console.error('Error joining session:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to join session'
        });
    }
});

// Get session participants (Faculty)
router.get('/:sessionId/participants', authenticateToken, requireRole(['faculty', 'admin', 'owner']), async (req, res) => {
    try {
        const session = await LiveSession.findById(req.params.sessionId);

        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Session not found'
            });
        }

        // Check ownership
        if (session.facultyId.toString() !== req.user.userId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        res.json({
            success: true,
            participants: session.participants,
            count: session.participants.length
        });
    } catch (error) {
        console.error('Error fetching participants:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch participants'
        });
    }
});

// Update session status (Faculty)
router.patch('/:sessionId/status', authenticateToken, requireRole(['faculty', 'admin', 'owner']), async (req, res) => {
    try {
        const { status } = req.body;

        if (!['waiting', 'active', 'ended'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status'
            });
        }

        const session = await LiveSession.findById(req.params.sessionId);

        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Session not found'
            });
        }

        // Check ownership
        if (session.facultyId.toString() !== req.user.userId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        session.status = status;
        if (status === 'active' && !session.startedAt) {
            session.startedAt = new Date();
        }
        if (status === 'ended' && !session.endedAt) {
            session.endedAt = new Date();
        }

        await session.save();

        res.json({
            success: true,
            message: 'Session status updated',
            status: session.status
        });
    } catch (error) {
        console.error('Error updating session status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update session status'
        });
    }
});

// Submit response (Student)
router.post('/:sessionId/responses', authenticateToken, requireRole(['student']), async (req, res) => {
    try {
        const { responses, score, maxScore, timeSpent } = req.body;

        const session = await LiveSession.findById(req.params.sessionId);

        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Session not found'
            });
        }

        // Create response
        const response = new Response({
            sessionId: session._id,
            activityId: session.activityId,
            studentId: req.user.userId,
            studentName: req.user.name,
            responses,
            score: score || 0,
            maxScore,
            timeSpent
        });

        await response.save();

        // Update participant status in session
        const participant = session.participants.find(
            p => p.studentId.toString() === req.user.userId
        );
        if (participant) {
            participant.status = 'submitted';
            participant.score = score;
            participant.responses = responses;
            await session.save();
        }

        res.json({
            success: true,
            message: 'Response submitted successfully',
            responseId: response._id
        });
    } catch (error) {
        console.error('Error submitting response:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to submit response'
        });
    }
});

// Get session results (Faculty)
router.get('/:sessionId/results', authenticateToken, requireRole(['faculty', 'admin', 'owner']), async (req, res) => {
    try {
        const session = await LiveSession.findById(req.params.sessionId)
            .populate('activityId', 'type title');

        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Session not found'
            });
        }

        // Check ownership
        if (session.facultyId.toString() !== req.user.userId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        // Get all responses for this session
        const responses = await Response.find({ sessionId: session._id })
            .sort({ score: -1 });

        res.json({
            success: true,
            session: {
                id: session._id,
                code: session.code,
                activityType: session.activityId.type,
                activityTitle: session.activityId.title,
                status: session.status,
                participantCount: session.participants.length,
                responseCount: responses.length
            },
            responses
        });
    } catch (error) {
        console.error('Error fetching results:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch results'
        });
    }
});

export default router;
