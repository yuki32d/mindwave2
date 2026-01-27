// ============================================
// PEER REVIEW SYSTEM - DATABASE SCHEMAS & API ROUTES
// ============================================

import mongoose from 'mongoose';

// ============================================
// DATABASE SCHEMAS
// ============================================

// Peer Review Settings Schema
const peerReviewSettingsSchema = new mongoose.Schema({
    assignmentId: { type: String, required: true, unique: true }, // Using 'git-projects' as default
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },

    enabled: { type: Boolean, default: false },
    reviewsPerStudent: { type: Number, default: 3, min: 1, max: 5 },
    deadline: { type: Date },
    isAnonymous: { type: Boolean, default: true },
    gradeWeight: { type: Number, default: 20, min: 0, max: 50 }, // Percentage

    rubric: [{
        id: String,
        name: String,
        description: String,
        maxScore: Number
    }],

    autoAssign: { type: Boolean, default: true },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Peer Review Schema
const peerReviewSchema = new mongoose.Schema({
    assignmentId: { type: String, required: true },
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },

    reviewerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    revieweeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    submissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProjectSubmission', required: true },

    ratings: {
        codeQuality: { type: Number, min: 1, max: 5 },
        functionality: { type: Number, min: 1, max: 5 },
        documentation: { type: Number, min: 1, max: 5 },
        overall: { type: Number, min: 1, max: 5 }
    },

    feedback: {
        strengths: String,
        improvements: String,
        generalComments: String
    },

    status: { type: String, enum: ['pending', 'submitted'], default: 'pending' },
    submittedAt: { type: Date },

    // Faculty moderation
    moderatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    moderationNotes: String,
    isHidden: { type: Boolean, default: false },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Indexes
peerReviewSchema.index({ reviewerId: 1, status: 1 });
peerReviewSchema.index({ revieweeId: 1 });
peerReviewSchema.index({ submissionId: 1 });
peerReviewSchema.index({ organizationId: 1 });

// Create models
export const PeerReviewSettings = mongoose.model('PeerReviewSettings', peerReviewSettingsSchema);
export const PeerReview = mongoose.model('PeerReview', peerReviewSchema);

// ============================================
// HELPER FUNCTIONS
// ============================================

// Auto-assign peer reviews
export async function assignPeerReviews(organizationId, reviewsPerStudent, ProjectSubmission) {
    try {
        // Get all submitted projects for this organization
        const submissions = await ProjectSubmission.find({
            organizationId,
            status: { $in: ['pending', 'reviewed', 'graded'] }
        }).select('_id studentId');

        if (submissions.length < 2) {
            return { success: false, message: 'Need at least 2 submissions for peer review' };
        }

        // Shuffle submissions for random assignment
        const shuffled = submissions.sort(() => Math.random() - 0.5);

        const assignments = [];

        for (let i = 0; i < submissions.length; i++) {
            const reviewer = submissions[i];

            for (let j = 1; j <= Math.min(reviewsPerStudent, submissions.length - 1); j++) {
                const revieweeIndex = (i + j) % submissions.length;
                const reviewee = shuffled[revieweeIndex];

                // Don't assign self-review
                if (reviewer.studentId.toString() !== reviewee.studentId.toString()) {
                    assignments.push({
                        assignmentId: 'git-projects',
                        organizationId,
                        reviewerId: reviewer.studentId,
                        revieweeId: reviewee.studentId,
                        submissionId: reviewee._id,
                        status: 'pending'
                    });
                }
            }
        }

        // Remove existing assignments and create new ones
        await PeerReview.deleteMany({ organizationId, assignmentId: 'git-projects' });
        await PeerReview.insertMany(assignments);

        return { success: true, assignmentsCreated: assignments.length };
    } catch (error) {
        console.error('Error assigning peer reviews:', error);
        return { success: false, message: error.message };
    }
}

// Calculate aggregated grade with peer reviews
export async function calculateFinalGrade(submissionId, facultyGrade) {
    try {
        // Get peer review settings
        const settings = await PeerReviewSettings.findOne({
            assignmentId: 'git-projects'
        });

        if (!settings || !settings.enabled) {
            return facultyGrade;
        }

        // Get all peer reviews for this submission
        const peerReviews = await PeerReview.find({
            submissionId,
            status: 'submitted',
            isHidden: false
        });

        if (peerReviews.length === 0) {
            return facultyGrade;
        }

        // Calculate average peer grade
        const avgPeerGrade = peerReviews.reduce((sum, review) => {
            return sum + (review.ratings.overall || 0);
        }, 0) / peerReviews.length;

        // Convert 1-5 stars to 0-100 scale
        const peerGradeScaled = (avgPeerGrade / 5) * 100;

        // Weighted average
        const weight = settings.gradeWeight / 100;
        const finalGrade = (facultyGrade * (1 - weight)) + (peerGradeScaled * weight);

        return Math.round(finalGrade);
    } catch (error) {
        console.error('Error calculating final grade:', error);
        return facultyGrade;
    }
}

// ============================================
// API ROUTES
// ============================================

export function setupPeerReviewRoutes(app, authMiddleware, ProjectSubmission) {

    // Get peer review settings
    app.get('/api/peer-review/settings', authMiddleware, async (req, res) => {
        try {
            const settings = await PeerReviewSettings.findOne({
                organizationId: req.user.organizationId,
                assignmentId: 'git-projects'
            });

            res.json({ settings: settings || null });
        } catch (error) {
            console.error('Error fetching peer review settings:', error);
            res.status(500).json({ error: 'Failed to fetch settings' });
        }
    });

    // Save peer review settings
    app.post('/api/peer-review/settings', authMiddleware, async (req, res) => {
        try {
            const { enabled, reviewsPerStudent, deadline, isAnonymous, gradeWeight } = req.body;

            let settings = await PeerReviewSettings.findOne({
                organizationId: req.user.organizationId,
                assignmentId: 'git-projects'
            });

            if (!settings) {
                settings = new PeerReviewSettings({
                    assignmentId: 'git-projects',
                    organizationId: req.user.organizationId,
                    createdBy: req.user._id
                });
            }

            settings.enabled = enabled;
            settings.reviewsPerStudent = reviewsPerStudent || 3;
            settings.deadline = deadline;
            settings.isAnonymous = isAnonymous !== false;
            settings.gradeWeight = gradeWeight || 20;
            settings.updatedAt = new Date();

            await settings.save();

            let assignmentsCreated = 0;

            // If enabled, auto-assign reviews
            if (enabled) {
                const result = await assignPeerReviews(
                    req.user.organizationId,
                    reviewsPerStudent || 3,
                    ProjectSubmission
                );

                if (result.success) {
                    assignmentsCreated = result.assignmentsCreated;
                }
            }

            res.json({
                success: true,
                settings,
                assignmentsCreated
            });
        } catch (error) {
            console.error('Error saving peer review settings:', error);
            res.status(500).json({ error: 'Failed to save settings' });
        }
    });

    // Get assigned reviews for a student
    app.get('/api/peer-review/my-reviews', authMiddleware, async (req, res) => {
        try {
            const reviews = await PeerReview.find({
                reviewerId: req.user._id,
                organizationId: req.user.organizationId
            })
                .populate('submissionId')
                .populate('revieweeId', 'name email')
                .sort({ createdAt: -1 });

            res.json({ reviews });
        } catch (error) {
            console.error('Error fetching my reviews:', error);
            res.status(500).json({ error: 'Failed to fetch reviews' });
        }
    });

    // Submit a peer review
    app.post('/api/peer-review/submit', authMiddleware, async (req, res) => {
        try {
            const { reviewId, ratings, feedback } = req.body;

            const review = await PeerReview.findById(reviewId);

            if (!review) {
                return res.status(404).json({ error: 'Review not found' });
            }

            if (review.reviewerId.toString() !== req.user._id.toString()) {
                return res.status(403).json({ error: 'Not authorized' });
            }

            review.ratings = ratings;
            review.feedback = feedback;
            review.status = 'submitted';
            review.submittedAt = new Date();
            review.updatedAt = new Date();

            await review.save();

            res.json({ success: true, review });
        } catch (error) {
            console.error('Error submitting peer review:', error);
            res.status(500).json({ error: 'Failed to submit review' });
        }
    });

    // Get peer feedback received for a submission
    app.get('/api/peer-review/feedback/:submissionId', authMiddleware, async (req, res) => {
        try {
            const settings = await PeerReviewSettings.findOne({
                organizationId: req.user.organizationId,
                assignmentId: 'git-projects'
            });

            const reviews = await PeerReview.find({
                submissionId: req.params.submissionId,
                status: 'submitted',
                isHidden: false
            })
                .populate('reviewerId', (settings && settings.isAnonymous) ? '' : 'name');

            res.json({ reviews, isAnonymous: settings && settings.isAnonymous });
        } catch (error) {
            console.error('Error fetching feedback:', error);
            res.status(500).json({ error: 'Failed to fetch feedback' });
        }
    });

    // Faculty: Get all peer reviews for monitoring
    app.get('/api/peer-review/all', authMiddleware, async (req, res) => {
        try {
            const reviews = await PeerReview.find({
                organizationId: req.user.organizationId
            })
                .populate('reviewerId', 'name email')
                .populate('revieweeId', 'name email')
                .populate('submissionId')
                .sort({ createdAt: -1 });

            const stats = {
                total: reviews.length,
                pending: reviews.filter(r => r.status === 'pending').length,
                submitted: reviews.filter(r => r.status === 'submitted').length
            };

            res.json({ reviews, stats });
        } catch (error) {
            console.error('Error fetching all reviews:', error);
            res.status(500).json({ error: 'Failed to fetch reviews' });
        }
    });
}
