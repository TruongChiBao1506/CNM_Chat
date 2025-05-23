const redisDb = require('../app/redis');
const lastViewService = require('../services/LastViewService');
const Conversation = require('../models/Conversation');

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
        // call video
        socket.on(
            'subscribe-call-video',
            ({ conversationId, newUserId, peerId }) => {
                console.log(
                    'subscribe-call-video: ',
                    conversationId,
                    newUserId,
                    peerId
                );

                socket.join(conversationId + 'call');
                socket.broadcast
                    .to(conversationId + 'call')
                    .emit('new-user-call', {
                        conversationId,
                        newUserId,
                        peerId,
                    });
            }
        );

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

        // AUDIO CALL EVENTS
        // Khi A gọi B hoặc gọi nhóm
        socket.on('call-user', async ({ conversationId, fromUser, toUser, isVideo }) => {
            try {
                // Lấy danh sách thành viên trong conversation
                const conversation = await Conversation.getById(conversationId);
                if (!conversation) return;
                const members = conversation.members || [];
                // Broadcast tới tất cả thành viên trừ người gọi
                members.forEach(userId => {
                    if (String(userId) !== String(fromUser._id)) {
                        io.to(userId.toString()).emit('incoming-call', {
                            fromUser,
                            toUser,
                            conversationId,
                            isVideo: !!isVideo 
                        });
                    }
                });
            } catch (err) {
                console.error('Error in call-user broadcast:', err);
            }
        });

        // Khi B chấp nhận cuộc gọi
        socket.on('accept-call', async ({ conversationId, fromUser, isVideo }) => {
            console.log("chấp nhận cuộc gọi");
            try {
                // Lấy danh sách thành viên trong conversation
                const conversation = await Conversation.getById(conversationId);
                if (!conversation) return;
                const members = conversation.members || [];
                // Broadcast tới tất cả thành viên trừ người vừa accept
                members.forEach(userId => {
                    if (String(userId) !== String(fromUser._id)) {
                        io.to(userId.toString()).emit('start-call', {
                            fromUser,
                            conversationId,
                            isVideo: !!isVideo 
                        });
                    }
                });
                // Gửi tới chính B để bắt đầu giao diện gọi
                socket.emit('start-call', {
                    fromUser,
                    conversationId,
                    isVideo: !!isVideo 
                });
            } catch (err) {
                console.error('Error in accept-call broadcast:', err);
            }
        });

        // Khi B từ chối cuộc gọi
        socket.on('reject-call', async ({ conversationId, fromUser }) => {
            try {
                // Lấy danh sách thành viên trong conversation
                const conversation = await Conversation.getById(conversationId);
                if (!conversation) return;
                const members = conversation.members;
                // Broadcast tới tất cả thành viên trừ người vừa reject
                members.forEach(userId => {
                    if (String(userId) !== String(fromUser._id)) {
                        io.to(userId.toString()).emit('call-rejected', {
                            fromUser,
                            conversationId
                        });
                    }
                });
            } catch (err) {
                console.error('Error in reject-call broadcast:', err);
            }
        });

        // Khi người gọi hoặc bất kỳ ai kết thúc cuộc gọi
        socket.on('end-call', async ({ conversationId, fromUser }) => {
            try {
                // Lấy danh sách thành viên trong conversation
                const conversation = await Conversation.getById(conversationId);
                if (!conversation) return;
                const members = conversation.members;
                // Broadcast tới tất cả thành viên trừ người vừa end
                members.forEach(userId => {
                    if (String(userId) !== String(fromUser._id)) {
                        io.to(userId.toString()).emit('end-call', {
                            fromUser,
                            conversationId
                        });
                    }
                });
            } catch (err) {
                console.error('Error in end-call broadcast:', err);
            }
        });
        // Xử lý trao đổi peer-id cho kết nối WebRTC
        socket.on('peer-id', async ({ conversationId, fromUser, peerId }) => {
            console.log(`Nhận peer-id từ ${fromUser._id}: ${peerId} cho cuộc gọi ${conversationId}`);

            try {
                // Tìm cuộc hội thoại để lấy danh sách thành viên
                const conversation = await Conversation.getById(conversationId);

                if (!conversation) {
                    console.error('Không tìm thấy cuộc hội thoại:', conversationId);
                    return;
                }

                // Lấy danh sách ID thành viên - sửa để phù hợp với cấu trúc dữ liệu thực tế
                const members = conversation.members || [];

                // Gửi đến tất cả thành viên khác
                for (const memberId of members) {
                    // Kiểm tra kiểu dữ liệu và chuyển đổi thành string nếu cần
                    const memberIdStr = typeof memberId === 'object' ?
                        (memberId._id ? memberId._id.toString() : memberId.toString()) :
                        memberId.toString();

                    if (memberIdStr !== fromUser._id.toString()) {
                        console.log(`Chuyển tiếp peer-id từ ${fromUser._id} đến ${memberIdStr}`);
                        io.to(memberIdStr).emit('peer-id', {
                            fromUser,
                            peerId,
                            conversationId
                        });
                    }
                }
            } catch (error) {
                console.error('Lỗi khi xử lý peer-id:', error);
            }
        });
        // Audio call peer signal (thêm sau các sự kiện audio call hiện có)
        socket.on('audio-peer-signal', async ({ conversationId, fromUser, signal }) => {
            try {
                // Lấy danh sách thành viên trong conversation
                const conversation = await Conversation.getById(conversationId);
                if (!conversation) return;
                const members = conversation.members;

                // Broadcast tín hiệu peer đến tất cả thành viên khác
                members.forEach(userId => {
                    if (String(userId) !== String(fromUser._id)) {
                        io.to(userId.toString()).emit('audio-peer-signal', {
                            fromUser,
                            conversationId,
                            signal
                        });
                    }
                });
            } catch (err) {
                console.error('Error in audio-peer-signal broadcast:', err);
            }
        });
    }); // <-- closes io.on('connect', ...)
};

module.exports = socket;