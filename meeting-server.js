// Meeting Server - Socket.IO for WebRTC Signaling
import { Server } from 'socket.io';
import { createServer } from 'http';

// Active meetings storage
const activeMeetings = new Map();

// Generate 6-digit meeting code
function generateMeetingCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Initialize Socket.IO server
export function initializeMeetingServer(httpServer) {
    const io = new Server(httpServer, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST']
        }
    });

    console.log('✓ Meeting Socket.IO server initialized');

    // Socket.IO connection handler
    io.on('connection', (socket) => {
        console.log('User connected:', socket.id);

        // Join meeting room
        socket.on('join-meeting', (meetingCode, userId) => {
            socket.join(meetingCode);
            socket.meetingCode = meetingCode;
            socket.userId = userId;

            // Notify others in the room
            socket.to(meetingCode).emit('user-joined', socket.id);

            console.log(`User ${userId} (${socket.id}) joined meeting ${meetingCode}`);
        });

        // WebRTC Signaling - Offer (with target peer)
        socket.on('offer', (offer, meetingCode, targetPeerId) => {
            console.log(`Routing offer from ${socket.id} to ${targetPeerId}`);
            io.to(targetPeerId).emit('offer', offer, socket.id);
        });

        // WebRTC Signaling - Answer (with target peer)
        socket.on('answer', (answer, meetingCode, targetPeerId) => {
            console.log(`Routing answer from ${socket.id} to ${targetPeerId}`);
            io.to(targetPeerId).emit('answer', answer, socket.id);
        });

        // WebRTC Signaling - ICE Candidate (with target peer)
        socket.on('ice-candidate', (candidate, meetingCode, targetPeerId) => {
            io.to(targetPeerId).emit('ice-candidate', candidate, socket.id);
        });

        // Live captions
        socket.on('caption', (text, meetingCode) => {
            socket.to(meetingCode).emit('caption', text, socket.id);
        });

        // Chat messages
        socket.on('chat-message', (message, meetingCode) => {
            io.to(meetingCode).emit('chat-message', message);
        });

        // Mute participant (admin only)
        socket.on('mute-participant', (userId, meetingCode) => {
            io.to(meetingCode).emit('participant-muted', userId);
        });

        // Remove participant (admin only)
        socket.on('remove-participant', (userId, meetingCode) => {
            io.to(meetingCode).emit('participant-removed', userId);
        });

        // Disconnect
        socket.on('disconnect', () => {
            if (socket.meetingCode && socket.userId) {
                socket.to(socket.meetingCode).emit('user-left', socket.userId);
                console.log(`User ${socket.userId} left meeting ${socket.meetingCode}`);
            }
        });
    });

    return io;
}

// Meeting management API routes
export function getMeetingRoutes() {
    return {
        // Create meeting
        createMeeting: async (req, res) => {
            try {
                const code = generateMeetingCode();
                const meeting = {
                    code,
                    hostId: req.user?.id || 'anonymous',
                    participants: [],
                    startTime: new Date(),
                    captions: [],
                    messages: []
                };

                activeMeetings.set(code, meeting);

                res.json({
                    ok: true,
                    code,
                    meeting
                });
            } catch (error) {
                console.error('Error creating meeting:', error);
                res.status(500).json({
                    ok: false,
                    error: 'Failed to create meeting'
                });
            }
        },

        // Get meeting info
        getMeeting: async (req, res) => {
            try {
                const { code } = req.params;
                const meeting = activeMeetings.get(code);

                if (!meeting) {
                    return res.status(404).json({
                        ok: false,
                        error: 'Meeting not found'
                    });
                }

                res.json({
                    ok: true,
                    meeting
                });
            } catch (error) {
                console.error('Error getting meeting:', error);
                res.status(500).json({
                    ok: false,
                    error: 'Failed to get meeting'
                });
            }
        },

        // End meeting
        endMeeting: async (req, res) => {
            try {
                const { code } = req.params;
                const meeting = activeMeetings.get(code);

                if (!meeting) {
                    return res.status(404).json({
                        ok: false,
                        error: 'Meeting not found'
                    });
                }

                // Mark meeting as ended
                meeting.endTime = new Date();
                activeMeetings.delete(code);

                res.json({
                    ok: true,
                    message: 'Meeting ended successfully'
                });
            } catch (error) {
                console.error('Error ending meeting:', error);
                res.status(500).json({
                    ok: false,
                    error: 'Failed to end meeting'
                });
            }
        },

        // Get active meetings
        getActiveMeetings: async (req, res) => {
            try {
                const meetings = Array.from(activeMeetings.values());
                res.json({
                    ok: true,
                    meetings,
                    count: meetings.length
                });
            } catch (error) {
                console.error('Error getting active meetings:', error);
                res.status(500).json({
                    ok: false,
                    error: 'Failed to get active meetings'
                });
            }
        }
    };
}

export { activeMeetings };
