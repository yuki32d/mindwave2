import express from 'express';
import Activity from '../models/Activity.js';

const router = express.Router();

// Middleware will be added inline for now (server.js has auth logic)
const authenticateToken = (req, res, next) => {
    // This will use the existing auth from server.js
    next();
};

const requireRole = (roles) => (req, res, next) => {
    if (!req.user || !roles.includes(req.user.orgRole)) {
        return res.status(403).json({ success: false, message: 'Access denied' });
    }
    next();
};

// Create new activity
router.post('/', authenticateToken, requireRole(['faculty', 'admin', 'owner']), async (req, res) => {
    try {
        const { type, title, description, content, settings } = req.body;

        // Validate required fields
        if (!type || !title || !content) {
            return res.status(400).json({
                success: false,
                message: 'Type, title, and content are required'
            });
        }

        // Create activity
        const activity = new Activity({
            facultyId: req.user.userId,
            organizationId: req.user.organizationId,
            type,
            title,
            description,
            content,
            settings: settings || {}
        });

        await activity.save();

        res.status(201).json({
            success: true,
            message: 'Activity created successfully',
            activityId: activity._id,
            activity: {
                id: activity._id,
                type: activity.type,
                title: activity.title,
                createdAt: activity.createdAt
            }
        });
    } catch (error) {
        console.error('Error creating activity:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create activity',
            error: error.message
        });
    }
});

// Get all activities for faculty
router.get('/my-activities', authenticateToken, requireRole(['faculty', 'admin', 'owner']), async (req, res) => {
    try {
        const { type, page = 1, limit = 20 } = req.query;

        const query = { facultyId: req.user.userId };
        if (type) query.type = type;

        const activities = await Activity.find(query)
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .select('type title description createdAt stats');

        const count = await Activity.countDocuments(query);

        res.json({
            success: true,
            activities,
            totalPages: Math.ceil(count / limit),
            currentPage: page,
            total: count
        });
    } catch (error) {
        console.error('Error fetching activities:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch activities'
        });
    }
});

// Get single activity by ID
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const activity = await Activity.findById(req.params.id);

        if (!activity) {
            return res.status(404).json({
                success: false,
                message: 'Activity not found'
            });
        }

        // Check if user has access (faculty who created it, or student in same org)
        const hasAccess =
            activity.facultyId.toString() === req.user.userId ||
            activity.organizationId.toString() === req.user.organizationId;

        if (!hasAccess) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        res.json({
            success: true,
            activity
        });
    } catch (error) {
        console.error('Error fetching activity:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch activity'
        });
    }
});

// Update activity
router.patch('/:id', authenticateToken, requireRole(['faculty', 'admin', 'owner']), async (req, res) => {
    try {
        const activity = await Activity.findById(req.params.id);

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

        // Update allowed fields
        const { title, description, content, settings } = req.body;
        if (title) activity.title = title;
        if (description !== undefined) activity.description = description;
        if (content) activity.content = content;
        if (settings) activity.settings = { ...activity.settings, ...settings };

        await activity.save();

        res.json({
            success: true,
            message: 'Activity updated successfully',
            activity
        });
    } catch (error) {
        console.error('Error updating activity:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update activity'
        });
    }
});

// Delete activity
router.delete('/:id', authenticateToken, requireRole(['faculty', 'admin', 'owner']), async (req, res) => {
    try {
        const activity = await Activity.findById(req.params.id);

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

        await activity.deleteOne();

        res.json({
            success: true,
            message: 'Activity deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting activity:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete activity'
        });
    }
});

export default router;
