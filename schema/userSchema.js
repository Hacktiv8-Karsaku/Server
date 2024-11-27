const { isEmail } = require("validator");
const UserModel = require("../models/userModel");
const { hashPass, comparePass } = require("../helpers/bcyrpt");
const { signToken } = require("../helpers/jwt");

const typeDefs = `#graphql
    type User {
        _id: ID
        name: String
        email: String
        job: String
        commuteDistance: Float
        stressLevel: Int
        mood: String
        preferences: [preference]
        totalCaloriesConsumed: Int
        recommendedCalories: Int
        createdAt: String
        updatedAt: String
    }

    type Query {
        getAllUsers: [User]
        getUserProfile(id: ID): User
    }

    type preference {
        food: String
        drink: String
        activity: String
    }

    type LoginResponse{
        access_token: String
        userId: ID
        username: String
    }

    type Mutation {
        createUser(name: String, username: String, email: String, password: String): User
        login(username: String, password: String): LoginResponse
        updateUser(_id: ID, name: String, email: String, job: String, commuteDistance: Float, stressLevel: Int, mood: String, preferences: [String]): User
    }
`;

const resolvers = {
  Query: {
    getAllUsers: async (parent, args, contextValue) => {
      await contextValue.auth();
      const users = await UserModel.findAll();
      return users;
    },

    getUserProfile: async (parent, args, contextValue) => {
      await contextValue.auth();
      const { _id } = await contextValue.auth();
      console.log(args);
      const user = await UserModel.getUserProfile(_id);
      return user;
    },
  },
  Mutation: {
    createUser: async (parent, args, contextValue) => {
      let { name, username, email, password } = args;

      if (!name) {
        throw new Error("Name is required");
      }

      if (!username) {
        throw new Error("Username is required");
      }

      if (!email) {
        throw new Error("Email is required");
      }

      if (!isEmail(email)) {
        throw new Error("Email format is invalid");
      }

      if (!password) {
        throw new Error("Password is required");
      }

      if (password.length < 5) {
        throw new Error("Password length should be at least 5 characters");
      }

      const getUsername = await UserModel.getUserByUsername(username);
      if (getUsername) {
        throw new Error("Username already exists");
      }

      const getEmail = await UserModel.getUserByEmail(email);
      if (getEmail) {
        throw new Error("Email already exists");
      }

      password = hashPass(password);
      const newUser = {
        name,
        username,
        email,
        password,
      };
      const user = await UserModel.register(newUser);
      return user;
    },

    login: async (parent, args, contextValue) => {
      const { username, password } = args;

      if (!username) {
        throw new Error("Username is required");
      }

      if (!password) {
        throw new Error("Password is required");
      }

      const getUsername = await UserModel.getUserByUsername(username);
      if (!getUsername) {
        throw new Error("Username not found");
      }

      const isPasswordValid = comparePass(password, getUsername.password);
      if (!isPasswordValid) {
        throw new Error("Invalid username or password");
      }

      const token = signToken({
        _id: getUsername._id,
        username: getUsername.username,
      });

      await UserModel.login(getUsername);

      return {
        access_token: token,
        userId: getUsername._id,
        username: getUsername.username,
      };
    },
  },
};

module.exports = {
  usersTypeDefs: typeDefs,
  usersResolvers: resolvers,
};
