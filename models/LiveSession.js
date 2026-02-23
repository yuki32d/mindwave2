import mongoose from 'mongoose';

const liveSessionSchema = new mongoose.Schema({
    activityId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Activity',
        required: true
    },
    code: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        length: 6
    },
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
    status: {
        type: String,
        enum: ['waiting', 'active', 'ended'],
        default: 'waiting'
    },
    participants: [{
        studentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        studentName: String,
        joinedAt: {
            type: Date,
            default: Date.now
        },
        status: {
            type: String,
            enum: ['joined', 'active', 'submitted', 'left'],
            default: 'joined'
        },
        score: Number,
        responses: mongoose.Schema.Types.Mixed
    }],
    startedAt: Date,
    endedAt: Date,
    expiresAt: {
        type: Date,
        required: true,
        default: () => new Date(Date.now() + 24 * 60 * 60 * 1000)
    }
}, {
    timestamps: true
});

liveSessionSchema.index({ code: 1 });
liveSessionSchema.index({ facultyId: 1, status: 1 });
liveSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Generate unique 6-character code
liveSessionSchema.statics.generateCode = async function () {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code;
    let exists = true;

    while (exists) {
        code = '';
        for (let i = 0; i < 6; i++) {
            code += characters.charAt(Math.floor(Math.random() * characters.length));
        }

        const session = await this.findOne({ code, status: { $ne: 'ended' } });
        exists = !!session;
    }

    return code;
};

// Method to add participant
liveSessionSchema.methods.addParticipant = function (studentId, studentName) {
    const existing = this.participants.find(p => p.studentId.toString() === studentId.toString());
    if (existing) {
        existing.status = 'active';
        existing.joinedAt = new Date();
        return this;
    }

    this.participants.push({
        studentId,
        studentName,
        status: 'active'
    });

    return this;
};

export default mongoose.model('LiveSession', liveSessionSchema);
