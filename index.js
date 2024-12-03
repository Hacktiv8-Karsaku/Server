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

  socket.on('disconnect', () => {
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
