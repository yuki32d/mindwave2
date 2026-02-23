import mongoose from 'mongoose';

const responseSchema = new mongoose.Schema({
    sessionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'LiveSession',
        required: true
    },
    activityId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Activity',
        required: true
    },
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    studentName: String,
    responses: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    score: {
        type: Number,
        default: 0
    },
    maxScore: Number,
    timeSpent: {
        type: Number,
        default: 0
    },
    submittedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

responseSchema.index({ sessionId: 1, studentId: 1 });
responseSchema.index({ activityId: 1 });
responseSchema.index({ studentId: 1, submittedAt: -1 });

export default mongoose.model('Response', responseSchema);
