require("dotenv").config();

const { ApolloServer } = require("@apollo/server");
const { startStandaloneServer } = require("@apollo/server/standalone");
const { usersResolvers, usersTypeDefs } = require("./schema/userSchema");
const { verifyToken } = require("./helpers/jwt");
const UserModel = require("./models/UserModel");
const { ObjectId } = require("mongodb");

const server = new ApolloServer({
  typeDefs: [usersTypeDefs],
  resolvers: [usersResolvers],
  introspection: true,
});

startStandaloneServer(server, {
  listen: { port: process.env.PORT || 3000 },
  context: async ({ req }) => {
    return {
      auth: async () => {
        const authorization = req.headers.authorization;

        // Check if the Authorization header is present
        if (!authorization) throw new Error("Unauthorized: No authorization header provided");

        const [type, token] = authorization.split(" ");

        // Validate the token type
        if (type !== "Bearer") throw new Error("Invalid token: Expected Bearer token");

        let verified;
        try {
          verified = verifyToken(token); // Verify and decode the JWT
        } catch (error) {
          throw new Error("Invalid token: Token verification failed");
        }

        // Validate the user ID in the token
        if (!ObjectId.isValid(verified._id)) {
          throw new Error("Invalid user ID in token");
        }

        // Fetch the user from the database
        const user = await UserModel.findById(verified._id);
        if (!user) throw new Error("User not found: Invalid user ID");

        // Return the authenticated user
        return user;
      }

    };
  },
}).then(({ url }) => {
  console.log(`🚀  Server ready at: ${url}`);
});
