import mongoose from 'mongoose';

const activitySchema = new mongoose.Schema({
    facultyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true
    },
    type: {
        type: String,
        required: true,
        enum: ['quiz', 'poll', 'true-false', 'type-answer', 'pin-answer', 'puzzle',
            'slider', 'scale', 'nps', 'ranking', 'drop-pin', 'brainstorm',
            'slide-classic', 'slide-big-title', 'slide-title-text', 'slide-bullets',
            'slide-quote', 'slide-big-media', 'draw', 'video-response', 'spinner', 'sorter']
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    content: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    settings: {
        timeLimit: {
            type: Number,
            default: 0
        },
        allowLateSubmissions: {
            type: Boolean,
            default: false
        },
        showCorrectAnswers: {
            type: Boolean,
            default: true
        },
        shuffleQuestions: {
            type: Boolean,
            default: false
        },
        shuffleOptions: {
            type: Boolean,
            default: false
        }
    },
    stats: {
        totalSessions: {
            type: Number,
            default: 0
        },
        totalParticipants: {
            type: Number,
            default: 0
        },
        averageScore: {
            type: Number,
            default: 0
        }
    }
}, {
    timestamps: true
});

activitySchema.index({ facultyId: 1, createdAt: -1 });
activitySchema.index({ organizationId: 1, type: 1 });

export default mongoose.model('Activity', activitySchema);
