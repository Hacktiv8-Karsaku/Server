require("dotenv").config();

const { ApolloServer } = require("@apollo/server");
const { startStandaloneServer } = require("@apollo/server/standalone");
const { usersResolvers, usersTypeDefs } = require("./schema/userSchema");
const { taskResolvers, taskTypeDefs } = require("./schema/TaskSchema");
const { verifyToken } = require("./helpers/jwt");
const UserModel = require("./models/UserModel");
const { ObjectId } = require("mongodb");
const { professionalResolvers, professionalTypeDefs } = require("./schema/professionalSchema");
const { chatResolvers, chatTypeDefs } = require("./schema/chatSchema");
const { createServer } = require('http');
const { Server } = require('socket.io');

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

io.on('connection', (socket) => {
  socket.on('join', (chatId) => {
    socket.join(chatId);
  });

  socket.on('leave', (chatId) => {
    socket.leave(chatId);
  });

  socket.on('sendMessage', ({ chatId, message }) => {
    io.to(chatId).emit('message', message);
  });
});

httpServer.listen(4000);

const server = new ApolloServer({
  typeDefs: [usersTypeDefs, taskTypeDefs, professionalTypeDefs, chatTypeDefs],
  resolvers: [usersResolvers, taskResolvers, professionalResolvers, chatResolvers],
  introspection: true,
});

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

        if (!ObjectId.isValid(verified._id)) {
          throw new Error("invalid user ID");
        }

        const user = await UserModel.findById(verified._id);
        return user;
      },
    };
  },
}).then(({ url }) => {
  console.log(`🚀  Server ready at: ${url}`);
});
