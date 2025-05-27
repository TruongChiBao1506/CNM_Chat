// const redisDb = require('../app/redis');
// const lastViewService = require('../services/LastViewService');
// const Conversation = require('../models/Conversation');

// const handleLeave = async (userId) => {
//     const cachedUser = await redisDb.get(userId);
//     if (cachedUser)
//         await redisDb.set(userId, {
//             ...cachedUser,
//             isOnline: false,
//             lastLogin: new Date(),
//         });
// };

// const handleJoin = async (userId) => {
//     try {
//         console.log('Handling join for user:', userId);

//         const userIdStr = userId.toString();
//         const cachedUser = await redisDb.get(userIdStr);

//         if (cachedUser) {
//             console.log('Updating cached user status for:', userIdStr);
//             await redisDb.set(userIdStr, {
//                 ...cachedUser,
//                 isOnline: true,
//                 lastLogin: null,
//             });
//         } else {
//             console.log('User not found in cache:', userIdStr);
//         }
//     } catch (error) {
//         console.error('Error in handleJoin:', error);
//     }
// };

// const getUserOnline = async (userId, cb) => {
//     const cachedUser = await redisDb.get(userId);

//     if (cachedUser) {
//         const { isOnline, lastLogin } = cachedUser;
//         cb({ isOnline, lastLogin });
//     }
// };

// const socket = (io) => {
//     io.on('connect', (socket) => {
//         socket.on('disconnect', (reason) => {
//             const userId = socket.userId;
//             console.log('🔴 Disconnected:', socket.id, 'reason:', reason);
//             if (userId)
//                 handleLeave(socket.userId);

//         });
//         socket.on('join', (userId) => {
//             console.log('🟢 User connecting - join socket: ', userId, 'socket ID:', socket.id);
//             console.log('🟢 userId type:', typeof userId);

//             // Store userId in both original form and string form
//             socket.userId = userId;

//             // Ensure userId is joined as a string
//             const userIdStr = userId.toString();
//             socket.join(userIdStr);

//             // Log rooms this socket has joined
//             const rooms = Array.from(socket.rooms);
//             console.log('🟢 User', userId, 'joined rooms:', rooms);

//             // Get all sockets in this room
//             const socketsInRoom = io.sockets.adapter.rooms.get(userIdStr);
//             console.log(`🟢 Room ${userIdStr} has ${socketsInRoom ? socketsInRoom.size : 0} sockets after joining`);

//             // List all sockets in the specific room
//             if (socketsInRoom) {
//                 console.log(`🟢 Sockets in room ${userIdStr}:`, Array.from(socketsInRoom));
//             }

//             handleJoin(userId);

//             // Add debug endpoint for this socket
//             socket.on('debug-rooms', () => {
//                 console.log('🔍 DEBUG: Socket rooms for', socket.id, '(user', userId, ')');
//                 const currentRooms = Array.from(socket.rooms);
//                 console.log('🔍 Currently joined rooms:', currentRooms);

//                 socket.emit('debug-rooms-result', {
//                     socketId: socket.id,
//                     userId: socket.userId,
//                     rooms: currentRooms
//                 });
//             });
//         });

//         socket.on('join-conversations', (conversationIds) => {
//             conversationIds.forEach((id) => socket.join(id));
//         });

//         socket.on('join-conversation', (conversationId) => {
//             socket.join(conversationId);
//         });

//         socket.on('leave-conversation', (conversationId) => {
//             socket.leave(conversationId);
//         });

//         socket.on('typing', (conversationId, me) => {
//             socket.broadcast
//                 .to(conversationId)
//                 .emit('typing', conversationId, me);
//         });

//         socket.on('not-typing', (conversationId, me) => {
//             socket.broadcast
//                 .to(conversationId)
//                 .emit('not-typing', conversationId, me);
//         });
//         // call video
//         // socket.on(
//         //     'subscribe-call-video',
//         //     ({ conversationId, newUserId, peerId }) => {
//         //         console.log(
//         //             'subscribe-call-video: ',
//         //             conversationId,
//         //             newUserId,
//         //             peerId
//         //         );

//         //         socket.join(conversationId + 'call');
//         //         socket.broadcast
//         //             .to(conversationId + 'call')
//         //             .emit('new-user-call', {
//         //                 conversationId,
//         //                 newUserId,
//         //                 peerId,
//         //             });
//         //     }
//         // );

//         socket.on('conversation-last-view', (conversationId, channelId) => {
//             const { userId } = socket;
//             if (channelId) {
//                 lastViewService
//                     .updateLastViewOfChannel(conversationId, channelId, userId)
//                     .then(() => {
//                         socket.to(conversationId + '').emit('user-last-view', {
//                             conversationId,
//                             channelId,
//                             userId,
//                             lastView: new Date(),
//                         });
//                     })
//                     .catch((err) =>
//                         console.log('Error socket conversation-last-view')
//                     );
//             } else {
//                 lastViewService
//                     .updateLastViewOfConversation(conversationId, userId)
//                     .then(() => {
//                         socket.to(conversationId + '').emit('user-last-view', {
//                             conversationId,
//                             userId,
//                             lastView: new Date(),
//                         });
//                     })
//                     .catch((err) =>
//                         console.log('Error socket conversation-last-view')
//                     );
//             }
//         });
//         socket.on(
//             'subscribe-call-audio',
//             ({ conversationId, newUserId, userName, userAvatar }) => {
//                 // Log để debug
//                 console.log('📞 AUDIO CALL REQUEST received:', {
//                     conversationId, newUserId, userName, userAvatar
//                 });

//                 // Broadcast đến TOÀN BỘ phòng conversation, không phải phòng audio-call
//                 socket.broadcast
//                     .to(conversationId) // Sửa ở đây: gửi đến conversation ID gốc
//                     .emit('incoming-voice-call', {
//                         conversationId,
//                         caller: {
//                             userId: newUserId,
//                             name: userName,
//                             avatar: userAvatar
//                         }
//                     });

//                 console.log('📢 Đã broadcast incoming-voice-call đến phòng:', conversationId);
//             }
//         );
//         socket.on(
//             'subscribe-call-video',
//             ({ conversationId, newUserId, userName, userAvatar }) => {
//                 // Log để debug
//                 console.log('📹 VIDEO CALL REQUEST received:', {
//                     conversationId, newUserId, userName, userAvatar
//                 });

//                 // Broadcast đến TOÀN BỘ phòng conversation, không phải phòng khác
//                 socket.broadcast
//                     .to(conversationId) // Sửa ở đây: gửi đến conversation ID gốc
//                     .emit('new-user-call', {
//                         conversationId,
//                         newUserId,
//                         userName,
//                         userAvatar,
//                         peerId: newUserId
//                     });

//                 console.log('📢 Đã broadcast new-user-call đến phòng:', conversationId);
//             }
//         );

//         socket.on('join-call', ({ conversationId, userId }) => {
//             console.log('User joined call:', userId, 'in conversation:', conversationId);
//             // Người dùng tham gia cuộc gọi
//             socket.join(conversationId + 'call');
//             socket.broadcast
//                 .to(conversationId + 'call')
//                 .emit('user-joined-call', {
//                     conversationId,
//                     userId
//                 });
//         });

//         socket.on('end-call', ({ conversationId, userId }) => {
//             console.log('User ended call:', userId, 'in conversation:', conversationId);
//             socket.broadcast
//                 .to(conversationId + 'call')
//                 .emit('user-ended-call', {
//                     conversationId,
//                     userId
//                 });
//             socket.leave(conversationId + 'call');
//         });

//     }); // <-- closes io.on('connect', ...)
// };

// module.exports = socket;
const redisDb = require('../app/redis');
const lastViewService = require('../services/LastViewService');
const Conversation = require('../models/Conversation');

const groupCallParticipants = new Map();

const handleLeave = async (userId) => {
    const cachedUser = await redisDb.get(userId);
    if (cachedUser)
        await redisDb.set(userId, {
            ...cachedUser,
            isOnline: false,
            lastLogin: new Date(),
        });
};

const handleJoin = async (userId) => {
    try {
        console.log('Handling join for user:', userId);

        const userIdStr = userId.toString();
        const cachedUser = await redisDb.get(userIdStr);

        if (cachedUser) {
            console.log('Updating cached user status for:', userIdStr);
            await redisDb.set(userIdStr, {
                ...cachedUser,
                isOnline: true,
                lastLogin: null,
            });
        } else {
            console.log('User not found in cache:', userIdStr);
        }
    } catch (error) {
        console.error('Error in handleJoin:', error);
    }
};

const getUserOnline = async (userId, cb) => {
    const cachedUser = await redisDb.get(userId);

    if (cachedUser) {
        const { isOnline, lastLogin } = cachedUser;
        cb({ isOnline, lastLogin });
    }
};

const socket = (io) => {
    io.on('connect', (socket) => {
        socket.on('disconnect', (reason) => {
            const userId = socket.userId;
            console.log('🔴 Disconnected:', socket.id, 'reason:', reason);
            if (userId)
                handleLeave(socket.userId);

        });

        socket.on('disconnect', () => {
            // Cleanup participants on disconnect
            if (socket.userId) {
                groupCallParticipants.forEach((participants, conversationId) => {
                    if (participants.has(socket.userId)) {
                        participants.delete(socket.userId);

                        if (participants.size === 0) {
                            groupCallParticipants.delete(conversationId);
                        } else {
                            const participantsList = Array.from(participants.values());
                            socket.broadcast.to(conversationId).emit('group-call-participants-updated', {
                                conversationId,
                                participants: participantsList,
                                leftParticipant: { userId: socket.userId }
                            });
                        }
                    }
                });
            }
        });

        socket.on('join', (userId) => {
            console.log('🟢 User connecting - join socket: ', userId, 'socket ID:', socket.id);
            console.log('🟢 userId type:', typeof userId);

            // Store userId in both original form and string form
            socket.userId = userId;

            // Ensure userId is joined as a string
            const userIdStr = userId.toString();
            socket.join(userIdStr);

            // Log rooms this socket has joined
            const rooms = Array.from(socket.rooms);
            console.log('🟢 User', userId, 'joined rooms:', rooms);

            // Get all sockets in this room
            const socketsInRoom = io.sockets.adapter.rooms.get(userIdStr);
            console.log(`🟢 Room ${userIdStr} has ${socketsInRoom ? socketsInRoom.size : 0} sockets after joining`);

            // List all sockets in the specific room
            if (socketsInRoom) {
                console.log(`🟢 Sockets in room ${userIdStr}:`, Array.from(socketsInRoom));
            }

            handleJoin(userId);

            // Add debug endpoint for this socket
            socket.on('debug-rooms', () => {
                console.log('🔍 DEBUG: Socket rooms for', socket.id, '(user', userId, ')');
                const currentRooms = Array.from(socket.rooms);
                console.log('🔍 Currently joined rooms:', currentRooms);

                socket.emit('debug-rooms-result', {
                    socketId: socket.id,
                    userId: socket.userId,
                    rooms: currentRooms
                });
            });
        });

        socket.on('join-conversations', (conversationIds) => {
            conversationIds.forEach((id) => socket.join(id));
        });

        socket.on('join-conversation', (conversationId) => {
            socket.join(conversationId);
        });

        socket.on('leave-conversation', (conversationId) => {
            socket.leave(conversationId);
        });

        socket.on('typing', (conversationId, me) => {
            socket.broadcast
                .to(conversationId)
                .emit('typing', conversationId, me);
        });

        socket.on('not-typing', (conversationId, me) => {
            socket.broadcast
                .to(conversationId)
                .emit('not-typing', conversationId, me);
        });

        socket.on('conversation-last-view', (conversationId, channelId) => {
            const { userId } = socket;
            if (channelId) {
                lastViewService
                    .updateLastViewOfChannel(conversationId, channelId, userId)
                    .then(() => {
                        socket.to(conversationId + '').emit('user-last-view', {
                            conversationId,
                            channelId,
                            userId,
                            lastView: new Date(),
                        });
                    })
                    .catch((err) =>
                        console.log('Error socket conversation-last-view')
                    );
            } else {
                lastViewService
                    .updateLastViewOfConversation(conversationId, userId)
                    .then(() => {
                        socket.to(conversationId + '').emit('user-last-view', {
                            conversationId,
                            userId,
                            lastView: new Date(),
                        });
                    })
                    .catch((err) =>
                        console.log('Error socket conversation-last-view')
                    );
            }
        });

        socket.on(
            'subscribe-call-audio',
            ({ conversationId, newUserId, userName, userAvatar }) => {
                // Log để debug
                console.log('📞 AUDIO CALL REQUEST received:', {
                    conversationId, newUserId, userName, userAvatar
                });

                // Broadcast đến TOÀN BỘ phòng conversation, không phải phòng audio-call
                socket.broadcast
                    .to(conversationId) // Sửa ở đây: gửi đến conversation ID gốc
                    .emit('incoming-voice-call', {
                        conversationId,
                        caller: {
                            userId: newUserId,
                            name: userName,
                            avatar: userAvatar
                        }
                    });

                console.log('📢 Đã broadcast incoming-voice-call đến phòng:', conversationId);
            }
        );

        // socket.on(
        //     'subscribe-call-video',
        //     ({ conversationId, newUserId, userName, userAvatar }) => {
        //         // Log để debug
        //         console.log('📹 VIDEO CALL REQUEST received:', {
        //             conversationId, newUserId, userName, userAvatar
        //         });

        //         // Broadcast đến TOÀN BỘ phòng conversation, không phải phòng khác
        //         socket.broadcast
        //             .to(conversationId) // Sửa ở đây: gửi đến conversation ID gốc
        //             .emit('new-user-call', {
        //                 conversationId,
        //                 newUserId,
        //                 userName,
        //                 userAvatar,
        //                 peerId: newUserId
        //             });

        //         console.log('📢 Đã broadcast new-user-call đến phòng:', conversationId);
        //     }
        // );

        // THÊM: Xử lý từ chối cuộc gọi thoại
        socket.on('reject-voice-call', ({ conversationId, rejectedBy }) => {
            console.log('❌ VOICE CALL REJECTED:', { conversationId, rejectedBy });

            // Gửi thông báo từ chối đến tất cả members trong conversation
            socket.broadcast
                .to(conversationId)
                .emit('voice-call-rejected', {
                    conversationId,
                    rejectedBy
                });

            console.log('📢 Đã broadcast voice-call-rejected đến phòng:', conversationId);
        });

        // THÊM: Xử lý từ chối cuộc gọi video
        // socket.on('reject-video-call', ({ conversationId, rejectedBy }) => {
        //     console.log('❌ VIDEO CALL REJECTED:', { conversationId, rejectedBy });

        //     // Gửi thông báo từ chối đến tất cả members trong conversation
        //     socket.broadcast
        //         .to(conversationId)
        //         .emit('video-call-rejected', {
        //             conversationId,
        //             rejectedBy
        //         });

        //     console.log('📢 Đã broadcast video-call-rejected đến phòng:', conversationId);
        // });

        socket.on('join-call', ({ conversationId, userId }) => {
            console.log('User joined call:', userId, 'in conversation:', conversationId);
            // Người dùng tham gia cuộc gọi
            socket.join(conversationId + 'call');
            socket.broadcast
                .to(conversationId + 'call')
                .emit('user-joined-call', {
                    conversationId,
                    userId
                });
        });

        socket.on('end-call', ({ conversationId, userId }) => {
            console.log('User ended call:', userId, 'in conversation:', conversationId);
            socket.broadcast
                .to(conversationId + 'call')
                .emit('user-ended-call', {
                    conversationId,
                    userId
                });
            socket.leave(conversationId + 'call');
        });
        // Xử lý khi người gọi kết thúc cuộc gọi thoại trước khi có người trả lời
        socket.on('cancel-voice-call', ({ conversationId, callerInfo, reason }) => {
            console.log('🚫 VOICE CALL CANCELLED by caller:', { conversationId, callerInfo });

            socket.broadcast
                .to(conversationId)
                .emit('voice-call-cancelled', {
                    conversationId,
                    callerInfo,
                    reason
                });

            console.log('📢 Đã broadcast voice-call-cancelled đến phòng:', conversationId);
        });

        // Xử lý khi người gọi kết thúc cuộc gọi video trước khi có người trả lời
        socket.on('cancel-video-call', ({ conversationId, callerInfo, reason }) => {
            console.log('🚫 VIDEO CALL CANCELLED by caller:', { conversationId, callerInfo });

            socket.broadcast
                .to(conversationId)
                .emit('video-call-cancelled', {
                    conversationId,
                    callerInfo,
                    reason
                });

            console.log('📢 Đã broadcast video-call-cancelled đến phòng:', conversationId);
        });

        socket.on('user-joined-agora-channel', ({ conversationId, userId, agoraUid, userName, userAvatar }) => {
            console.log('👤 User joined Agora channel:', { conversationId, userId, agoraUid });

            // Track participant for group calls
            if (!groupCallParticipants.has(conversationId)) {
                groupCallParticipants.set(conversationId, new Map());
            }

            const participants = groupCallParticipants.get(conversationId);
            participants.set(userId, {
                userId,
                agoraUid,
                userName: userName || `User ${userId}`,
                userAvatar: userAvatar || null,
                joinedAt: new Date()
            });

            // Broadcast updated participants list to all users in conversation
            const participantsList = Array.from(participants.values());

            socket.broadcast.to(conversationId).emit('group-call-participants-updated', {
                conversationId,
                participants: participantsList,
                newParticipant: {
                    userId,
                    agoraUid,
                    userName: userName || `User ${userId}`,
                    userAvatar
                }
            });

            // Also send to the user who just joined
            socket.emit('group-call-participants-updated', {
                conversationId,
                participants: participantsList,
                newParticipant: null
            });

            console.log('📢 Broadcasted group-call-participants-updated:', participantsList.length, 'participants');
        });
        // Handle user left group call
        socket.on('user-left-agora-channel', ({ conversationId, userId, agoraUid }) => {
            console.log('👋 User left Agora channel:', { conversationId, userId, agoraUid });

            if (groupCallParticipants.has(conversationId)) {
                const participants = groupCallParticipants.get(conversationId);
                participants.delete(userId);

                // If no participants left, cleanup
                if (participants.size === 0) {
                    groupCallParticipants.delete(conversationId);
                }

                // Broadcast updated participants list
                const participantsList = Array.from(participants.values());
                io.to(conversationId).emit('group-call-participants-updated', {
                    conversationId,
                    participants: participantsList,
                    leftParticipant: { userId, agoraUid }
                });

                console.log('📢 Broadcasted participant left:', participantsList.length, 'remaining');
            }
        });
        socket.on('call-answered', ({ conversationId, answeredBy, isGroupCall }) => {
            console.log('📞 Call answered:', { conversationId, answeredBy });

            // Broadcast để caller biết có người đã trả lời
            socket.broadcast.to(conversationId).emit('call-answered-notification', {
                conversationId,
                answeredBy,
                // isGroupCall,
                // timestamp: new Date()
            });

            console.log('📢 Broadcasted call-answered-notification to room:', conversationId);
        });
        socket.on('call-answered-notification', ({ conversationId, answeredBy, isGroupCall, userId }) => {
            console.log('📞 Call answered notification:', { conversationId, answeredBy, isGroupCall, userId });

            // Broadcast đến tất cả members trong conversation để clear timeout
            socket.broadcast.to(conversationId).emit('call-answered-notification', {
                conversationId,
                answeredBy,
                isGroupCall,
                userId,
                timestamp: new Date()
            });

            console.log('📢 Broadcasted call-answered-notification to room:', conversationId);
        });
        socket.on(
            'subscribe-call-video',
            ({ conversationId, newUserId, userName, userAvatar, isGroupCall }) => {
                console.log('📹 VIDEO CALL REQUEST received:', {
                    conversationId, newUserId, userName, userAvatar, isGroupCall
                });

                // ✅ CRITICAL: Emit incoming-video-call thay vì new-user-call
                socket.broadcast
                    .to(conversationId)
                    .emit('incoming-video-call', {
                        conversationId,
                        caller: {
                            userId: newUserId,
                            name: userName,
                            avatar: userAvatar
                        },
                        isGroupCall: isGroupCall || false
                    });

                console.log('📢 Đã broadcast incoming-video-call đến phòng:', conversationId);
            }
        );

        // ✅ SEPARATE: Video call rejection
        socket.on('reject-video-call', ({ conversationId, rejectedBy }) => {
            console.log('❌ VIDEO CALL REJECTED:', { conversationId, rejectedBy });

            socket.broadcast
                .to(conversationId)
                .emit('video-call-rejected', {
                    conversationId,
                    rejectedBy
                });

            console.log('📢 Đã broadcast video-call-rejected đến phòng:', conversationId);
        });

        // ✅ CRITICAL: Video call cancellation
        socket.on('cancel-video-call', ({ conversationId, callerInfo, reason }) => {
            console.log('🚫 VIDEO CALL CANCELLED by caller:', { conversationId, callerInfo });

            socket.broadcast
                .to(conversationId)
                .emit('video-call-cancelled', {
                    conversationId,
                    callerInfo,
                    reason
                });

            console.log('📢 Đã broadcast video-call-cancelled đến phòng:', conversationId);
        });

        // ✅ CRITICAL: Video call answered notification
        socket.on('video-call-answered-notification', ({ conversationId, answeredBy, isGroupCall, userId }) => {
            console.log('📹 Video call answered notification:', { conversationId, answeredBy, isGroupCall, userId });

            socket.broadcast.to(conversationId).emit('video-call-answered-notification', {
                conversationId,
                answeredBy,
                isGroupCall,
                userId,
                timestamp: new Date()
            });

            console.log('📢 Broadcasted video-call-answered-notification to room:', conversationId);
        });

        // ✅ SEPARATE: Video call participants (for group calls)
        socket.on('user-joined-video-channel', ({ conversationId, userId, agoraUid, userName, userAvatar }) => {
            console.log('👤 User joined video channel:', { conversationId, userId, agoraUid });

            // Track participant for video group calls
            if (!groupCallParticipants.has(`video_${conversationId}`)) {
                groupCallParticipants.set(`video_${conversationId}`, new Map());
            }

            const participants = groupCallParticipants.get(`video_${conversationId}`);
            participants.set(userId, {
                userId,
                agoraUid,
                userName: userName || `User ${userId}`,
                userAvatar: userAvatar || null,
                joinedAt: new Date()
            });

            const participantsList = Array.from(participants.values());

            socket.broadcast.to(conversationId).emit('video-call-participants-updated', {
                conversationId,
                participants: participantsList,
                newParticipant: {
                    userId,
                    agoraUid,
                    userName: userName || `User ${userId}`,
                    userAvatar
                }
            });

            socket.emit('video-call-participants-updated', {
                conversationId,
                participants: participantsList,
                newParticipant: null
            });

            console.log('📢 Broadcasted video-call-participants-updated:', participantsList.length, 'participants');
        });

        socket.on('user-left-video-channel', ({ conversationId, userId, agoraUid }) => {
            console.log('👋 User left video channel:', { conversationId, userId, agoraUid });

            if (groupCallParticipants.has(`video_${conversationId}`)) {
                const participants = groupCallParticipants.get(`video_${conversationId}`);
                participants.delete(userId);

                if (participants.size === 0) {
                    groupCallParticipants.delete(`video_${conversationId}`);
                }

                const participantsList = Array.from(participants.values());
                io.to(conversationId).emit('video-call-participants-updated', {
                    conversationId,
                    participants: participantsList,
                    leftParticipant: { userId, agoraUid }
                });

                console.log('📢 Broadcasted video participant left:', participantsList.length, 'remaining');
            }
        });
    }); // <-- closes io.on('connect', ...)
};

module.exports = socket;