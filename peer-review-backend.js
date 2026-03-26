// ============================================
// PEER REVIEW SYSTEM - DATABASE SCHEMAS & API ROUTES
// ============================================

import mongoose from 'mongoose';

// ============================================
// DATABASE SCHEMAS
// ============================================

// Peer Review Settings Schema
const peerReviewSettingsSchema = new mongoose.Schema({
    assignmentId: { type: String, required: true }, // Using 'git-projects' as default
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' }, // Optional for flexibility

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

// Settings should be unique per assignment within an organization
peerReviewSettingsSchema.index({ assignmentId: 1, organizationId: 1 }, { unique: true });

// Peer Review Schema
const peerReviewSchema = new mongoose.Schema({
    assignmentId: { type: String, required: true },
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },

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

export function setupPeerReviewRoutes(app, authMiddleware, ProjectSubmission, User) {

    // Search users for peer review (Faculty or Students)
    app.get('/api/users/search', authMiddleware, async (req, res) => {
        try {
            const { q, role } = req.query;
            
            const currentUser = await User.findById(req.user.sub);
            const query = {};
            
            // Only filter by organization if the current user belongs to one
            if (currentUser && currentUser.organizationId) {
                query.organizationId = currentUser.organizationId;
            }

            if (q && q.trim().length >= 1) {
                query.$or = [
                    { name: { $regex: q.trim(), $options: 'i' } },
                    { email: { $regex: q.trim(), $options: 'i' } }
                ];
            }

            // role filter: 'faculty' maps to faculty/admin (excluding owner), 'student' to student
            if (role === 'faculty') {
                query.orgRole = { $ne: 'owner' };
                // Match if they have faculty/admin in orgRole OR if their base role is admin
                query.$or = query.$or || [];
                query.$or.push(
                    { orgRole: { $in: ['faculty', 'admin'] } },
                    { role: 'admin' }
                );
            } else if (role === 'student') {
                query.orgRole = 'student';
            }

            const users = await User.find(query)
                .select('name email orgRole role profilePhoto')
                .limit(10)
                .lean();

            res.json({ users: users.map(u => ({
                id: u._id,
                name: u.name,
                email: u.email,
                role: u.orgRole || u.role,
                avatar: u.profilePhoto
            })) });

        } catch (error) {
            console.error('Error searching users:', error);
            res.status(500).json({ error: 'Search failed' });
        }
    });


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
    app.get('/api/peer-review/pending', authMiddleware, async (req, res) => {
        try {
            const currentUser = await User.findById(req.user.sub);
            if (!currentUser) return res.status(404).json({ error: 'User not found' });

            console.log('🔍 Fetching pending reviews for User:', currentUser._id, ' (Email:', currentUser.email, ')');

            const reviews = await PeerReview.find({
                reviewerId: currentUser._id,
                status: 'pending'
            })
                .populate('submissionId')
                .populate('revieweeId', 'name email')
                .sort({ createdAt: -1 });

            console.log(`📋 Found ${reviews.length} pending reviews for user ${currentUser._id}`);

            // Enrich with project names if possible
            const enriched = reviews.map(r => ({
                id: r._id,
                reviewerId: r.reviewerId,
                revieweeId: r.revieweeId,
                revieweeName: r.revieweeId ? r.revieweeId.name : 'Unknown Student',
                projectName: r.submissionId ? (r.submissionId.projectName || 'Project Submission') : 'Project Submission',
                dueDate: r.createdAt, // Or a specific deadline if available
                status: r.status
            }));

            res.json({ reviews: enriched });
        } catch (error) {
            console.error('Error fetching my reviews:', error);
            res.status(500).json({ error: 'Failed to fetch reviews' });
        }
    });

    // Get completed reviews for a student
    app.get('/api/peer-review/completed', authMiddleware, async (req, res) => {
        try {
            console.log('🔍 Fetching COMPLETED reviews for User:', req.user.sub);
            const currentUser = await User.findById(req.user.sub);
            if (!currentUser) return res.status(404).json({ error: 'User not found' });

            const reviews = await PeerReview.find({
                reviewerId: currentUser._id,
                status: 'submitted'
            })
                .populate('submissionId')
                .populate('revieweeId', 'name email')
                .sort({ submittedAt: -1 });

            // Use the same mapping as /pending for frontend consistency
            const enriched = reviews.map(r => ({
                id: r._id,
                reviewerId: r.reviewerId,
                revieweeId: r.revieweeId,
                revieweeName: r.revieweeId ? r.revieweeId.name : 'Unknown Student',
                projectName: r.submissionId ? (r.submissionId.projectName || 'Project Submission') : 'Project Submission',
                dueDate: r.submittedAt || r.createdAt,
                status: r.status,
                ratings: r.ratings,
                feedback: r.feedback
            }));

            console.log(`📋 Found ${enriched.length} completed reviews`);
            res.json({ reviews: enriched });
        } catch (error) {
            console.error('💥 Error fetching completed reviews:', error);
            res.status(500).json({ error: 'Failed to fetch reviews', details: error.message });
        }
    });

    // Create manual peer review invites
    app.post('/api/peer-review/invite', authMiddleware, async (req, res) => {
        try {
            const { projectIds, reviewerIds } = req.body;
            console.log('📨 Peer Review Invite Request:', {
                projectCount: projectIds?.length,
                reviewerIds
            });

            const currentUser = await User.findById(req.user.sub);
            if (!currentUser) {
                return res.status(404).json({ error: 'User not found' });
            }

            if (!projectIds || !reviewerIds || !projectIds.length || !reviewerIds.length) {
                return res.status(400).json({ error: 'Please select both projects and reviewers' });
            }

            // Fetch reviewer user objects to check their roles
            const reviewerUsers = await User.find({ _id: { $in: reviewerIds } }).select('_id name email role').lean();
            const reviewerMap = Object.fromEntries(reviewerUsers.map(u => [u._id.toString(), u]));

            const assignments = [];
            const errors = [];

            for (const projectId of projectIds) {
                const submission = await ProjectSubmission.findById(projectId);
                if (!submission) {
                    console.error(`❌ Project not found: ${projectId}`);
                    errors.push(`Project ID ${projectId} not found.`);
                    continue;
                }

                // Get all existing reviews for this submission
                const existingReviews = await PeerReview.find({ submissionId: submission._id }).lean();

                for (const reviewerId of reviewerIds) {
                    // Skip self-review
                    if (submission.studentId.toString() === reviewerId.toString()) {
                        console.log(`⏩ Skipping self-review for student: ${reviewerId}`);
                        continue;
                    }

                    const reviewer = reviewerMap[reviewerId];
                    const reviewerName = reviewer ? reviewer.name : reviewerId;

                    // Constraint 1: Duplicate check — same reviewer already assigned to this project
                    const alreadyAssigned = existingReviews.some(r =>
                        r.reviewerId.toString() === reviewerId.toString()
                    );
                    if (alreadyAssigned) {
                        const msg = `"${submission.projectName || projectId}" is already assigned to ${reviewerName}.`;
                        console.log(`⏩ ${msg}`);
                        errors.push(msg);
                        continue;
                    }

                    // Constraint 2: Single-faculty rule — if reviewer is faculty/admin, check no other faculty is assigned
                    const reviewerIsFaculty = reviewer && (reviewer.role === 'admin' || reviewer.role === 'faculty');
                    if (reviewerIsFaculty) {
                        // Find any existing reviewer who is also faculty (but not this same reviewer)
                        const existingReviewerIds = existingReviews
                            .filter(r => r.reviewerId.toString() !== reviewerId.toString())
                            .map(r => r.reviewerId);

                        if (existingReviewerIds.length > 0) {
                            const existingFacultyReviewers = await User.find({
                                _id: { $in: existingReviewerIds },
                                role: { $in: ['admin', 'faculty'] }
                            }).select('name').lean();

                            if (existingFacultyReviewers.length > 0) {
                                const existingName = existingFacultyReviewers[0].name;
                                const msg = `"${submission.projectName || projectId}" is already assigned to ${existingName}. A project can only be reviewed by one faculty member.`;
                                console.log(`🚫 ${msg}`);
                                errors.push(msg);
                                continue;
                            }
                        }
                    }

                    console.log(`➕ Adding assignment: Reviewer ${reviewerId} -> Project ${submission._id}`);
                    assignments.push({
                        assignmentId: 'manual-invite',
                        organizationId: currentUser.organizationId,
                        reviewerId: new mongoose.Types.ObjectId(reviewerId),
                        revieweeId: submission.studentId,
                        submissionId: submission._id,
                        status: 'pending',
                        createdAt: new Date()
                    });
                }
            }

            console.log(`📝 Creating ${assignments.length} assignments...`);
            if (assignments.length > 0) {
                await PeerReview.insertMany(assignments);
            }

            console.log('✅ Peer review invites processed.');
            res.json({ success: true, count: assignments.length, errors });
        } catch (error) {
            console.error('💥 ERROR creating invites:', error);
            res.status(500).json({
                error: 'Failed to send invites',
                details: error.message
            });
        }
    });

    // Get full details for a specific review (for the evaluator)
    app.get('/api/peer-review/:id', authMiddleware, async (req, res) => {
        try {
            const review = await PeerReview.findById(req.params.id)
                .populate('submissionId')
                .populate('revieweeId', 'name email profilePhoto');

            if (!review) {
                return res.status(404).json({ error: 'Review not found' });
            }

            // Ensure the requester is the assigned reviewer
            if (review.reviewerId.toString() !== req.user.sub) {
                return res.status(403).json({ error: 'Unauthorized to view this review' });
            }

            res.json({ review });
        } catch (error) {
            console.error('Error fetching review details:', error);
            res.status(500).json({ error: 'Failed to fetch review details' });
        }
    });

    // Submit a peer review assessment
    app.post('/api/peer-review/submit', authMiddleware, async (req, res) => {
        try {
            const { reviewId, ratings, feedback } = req.body;

            if (!reviewId || !ratings || !feedback) {
                return res.status(400).json({ error: 'Missing required review data' });
            }

            const review = await PeerReview.findById(reviewId);

            if (!review) {
                return res.status(404).json({ error: 'Review not found' });
            }

            // Ensure the requester is the assigned reviewer
            if (review.reviewerId.toString() !== req.user.sub) {
                return res.status(403).json({ error: 'Unauthorized to submit this review' });
            }

            if (review.status === 'submitted') {
                return res.status(400).json({ error: 'Review already submitted' });
            }

            // Calculate overall score (average of the 3 ratings)
            const overall = Math.round((ratings.codeQuality + ratings.functionality + ratings.documentation) / 3);

            review.ratings = {
                codeQuality: ratings.codeQuality,
                functionality: ratings.functionality,
                documentation: ratings.documentation,
                overall: overall
            };

            review.feedback = {
                strengths: feedback.strengths,
                improvements: feedback.improvements,
                generalComments: feedback.generalComments
            };

            review.status = 'submitted';
            review.submittedAt = new Date();
            review.updatedAt = new Date();

            await review.save();

            console.log(`✅ Peer Review ${reviewId} submitted by ${req.user.email}`);
            res.json({ success: true, message: 'Review submitted successfully!' });

        } catch (error) {
            console.error('💥 Error submitting review:', error);
            res.status(500).json({ 
                error: 'Failed to submit review',
                details: error.message 
            });
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

    // Faculty/Admin: Get all peer reviews for monitoring
    app.get('/api/peer-review/all', authMiddleware, async (req, res) => {
        try {
            // JWT doesn't include organizationId — look up the user from DB
            const currentUser = await User.findById(req.user.sub).select('organizationId').lean();
            const orgId = currentUser && currentUser.organizationId;

            // Build query: filter by org if available, else return all (super-admin mode)
            const query = orgId ? { organizationId: orgId } : {};

            const reviews = await PeerReview.find(query)
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
