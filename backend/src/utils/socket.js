const { Server } = require('socket.io');
const env = require('../config/env');

let io;

module.exports = {
    init: (server) => {
        io = new Server(server, {
            cors: {
                origin: env.CORS_ORIGINS,
                methods: ["GET", "POST"],
                credentials: true
            }
        });

        io.on('connection', (socket) => {
            console.log(`🔌 Client connected via Socket.IO: ${socket.id}`);
            
            // Client join room khusus untuk usernya
            socket.on('join_room', (userId) => {
                socket.join(`user_${userId}`);
                console.log(`Client ${socket.id} joined room user_${userId}`);
            });
            
            // Admin join room admin
            socket.on('join_admin', () => {
                socket.join('admin_room');
                console.log(`Client ${socket.id} joined admin_room`);
            });

            socket.on('disconnect', () => {
                console.log(`🔌 Client disconnected: ${socket.id}`);
            });
        });

        return io;
    },
    getIO: () => {
        if (!io) {
            console.warn("Socket.io is not initialized!");
        }
        return io;
    }
};
