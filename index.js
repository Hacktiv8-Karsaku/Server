require("dotenv").config();

const { ApolloServer } = require("@apollo/server");
const { startStandaloneServer } = require("@apollo/server/standalone");
const { usersResolvers, usersTypeDefs } = require("./schema/userSchema");
const { taskResolvers, taskTypeDefs } = require("./schema/TaskSchema");
const { professionalResolvers, professionalTypeDefs } = require("./schema/professionalSchema");
const { chatResolvers, chatTypeDefs } = require("./schema/chatSchema");
const { verifyToken } = require("./helpers/jwt");
const UserModel = require("./models/UserModel");
const ProfessionalModel = require("./models/ProfessionalModel");
const { ObjectId } = require("mongodb");
const { createServer } = require('http');
const { Server } = require('socket.io');
const ChatModel = require("./models/ChatModel");

// Create HTTP server for Socket.IO
const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["*"],
    credentials: true
  },
  path: '/socket.io',
  transports: ['websocket', 'polling']
});

// Keep track of connected users and their socket IDs
const connectedUsers = new Map(); // userId -> socketId
const activeRooms = new Map();    // roomId -> Set of participants

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join', async (chatId) => {
    console.log('Client joined room:', chatId);
    socket.join(chatId);

    try {
      // Fetch and broadcast initial chat data
      const chat = await ChatModel.findById(chatId)
        .populate('messages.senderDetails')
        .populate('participants');
      
      if (chat) {
        socket.emit('chatData', chat);
      }
    } catch (error) {
      console.error('Error fetching chat data:', error);
    }
  });

  // Listen for chat updates (triggered by GraphQL mutations)
  socket.on('chatUpdated', async (chatId) => {
    try {
      const updatedChat = await ChatModel.findById(chatId)
        .populate('messages.senderDetails')
        .populate('participants');
      
      // Broadcast to all clients in the room
      io.to(chatId).emit('chatData', updatedChat);
    } catch (error) {
      console.error('Error broadcasting chat update:', error);
    }
  });

  socket.on('leave', (chatId) => {
    socket.leave(chatId);
  });

  // Video Call Handlers
  socket.on('register', ({ userId }) => {
    connectedUsers.set(userId, socket.id);
    console.log(`User ${userId} registered with socket ${socket.id}`);
  });

  socket.on('initiateCall', ({ callerId, receiverId, chatId }) => {
    const receiverSocketId = connectedUsers.get(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('incomingCall', {
        callerId,
        chatId
      });
    }
  });

  socket.on('acceptCall', ({ callerId, receiverId, chatId }) => {
    const callerSocketId = connectedUsers.get(callerId);
    if (callerSocketId) {
      // Create a room for the call
      const roomId = chatId;
      socket.join(roomId);
      io.sockets.sockets.get(callerSocketId)?.join(roomId);
      
      activeRooms.set(roomId, new Set([callerId, receiverId]));
      
      io.to(roomId).emit('callAccepted', { roomId });
    }
  });

  socket.on('rejectCall', ({ callerId }) => {
    const callerSocketId = connectedUsers.get(callerId);
    if (callerSocketId) {
      io.to(callerSocketId).emit('callRejected');
    }
  });

  // WebRTC Signaling
  socket.on('offer', ({ offer, roomId }) => {
    socket.to(roomId).emit('offer', offer);
  });

  socket.on('answer', ({ answer, roomId }) => {
    socket.to(roomId).emit('answer', answer);
  });

  socket.on('ice-candidate', ({ candidate, roomId }) => {
    socket.to(roomId).emit('ice-candidate', candidate);
  });

  socket.on('endCall', ({ roomId }) => {
    if (activeRooms.has(roomId)) {
      io.to(roomId).emit('callEnded');
      // Clean up the room
      const sockets = io.sockets.adapter.rooms.get(roomId);
      if (sockets) {
        sockets.forEach(socketId => {
          io.sockets.sockets.get(socketId)?.leave(roomId);
        });
      }
      activeRooms.delete(roomId);
    }
  });

  socket.on('disconnect', () => {
    // Find and remove the disconnected user
    for (const [userId, socketId] of connectedUsers.entries()) {
      if (socketId === socket.id) {
        connectedUsers.delete(userId);
        // Notify relevant rooms/peers about disconnection
        for (const [roomId, participants] of activeRooms.entries()) {
          if (participants.has(userId)) {
            io.to(roomId).emit('peerDisconnected', { userId });
            participants.delete(userId);
            if (participants.size < 2) {
              activeRooms.delete(roomId);
            }
          }
        }
        break;
      }
    }
    console.log('Client disconnected:', socket.id);
  });
});

// Start Socket.IO server BEFORE Apollo
httpServer.listen(4000, () => {
  console.log('Socket.IO server running on port 4000');
});

// Configure Apollo Server
const server = new ApolloServer({
  typeDefs: [usersTypeDefs, taskTypeDefs, professionalTypeDefs, chatTypeDefs],
  resolvers: [usersResolvers, taskResolvers, professionalResolvers, chatResolvers],
  introspection: true,
});

// Start Apollo Server
startStandaloneServer(server, {
  listen: { port: process.env.PORT || 3000 },
  context: async ({ req }) => {
    return {
      auth: async () => {
        const authorization = req.headers.authorization;
        if (!authorization) throw new Error("unauthorized");

        const [type, token] = authorization.split(" ");
        if (type !== "Bearer") throw new Error("invalid token");

        const verified = verifyToken(token);
        // console.log(verified);

        if (!ObjectId.isValid(verified._id)) {
          throw new Error("invalid user ID");
        }

        if (verified.role) {
          const professional = await ProfessionalModel.findById(verified._id);
          return { professional,_id: professional._id.toString() };
        } else {
          const user = await UserModel.findById(verified._id);
          return { ...user, role: 'user' };
        }
      },
    };
  },
}).then(({ url }) => {
  console.log(`🚀 Server ready at: ${url}`);
});
