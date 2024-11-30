const UserModel = require("../models/userModel");
const { comparePass } = require("../helpers/bcyrpt");
const { signToken } = require("../helpers/jwt");
const { generateRecommendations } = require('../helpers/openai');
const { ObjectId } = require('mongodb');

const typeDefs = `#graphql
    type User {
        _id: ID
        name: String
        username: String
        email: String
        password: String
        job: String
        dailyActivities: [String]
        stressLevel: Int
        preferredFoods: [String]
        avoidedFoods: [String]
        recommendations: Recommendations
        createdAt: String
        updatedAt: String
    }

    type Recommendations {
        todoList: [String]
        places: [Place]
        foods: [String]
    }

    type Place {
        name: String
        description: String
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

    type LoginResponse {
        access_token: String
        userId: ID
        username: String
    }

    type Mutation {
        createUser(name: String, username: String, email: String, password: String): User
        login(username: String, password: String): LoginResponse
        updateUser(_id: ID, name: String, email: String, job: String, commuteDistance: Float, stressLevel: Int, mood: String, preferences: [String]): User
        updateUserPreferences(
            job: String
            dailyActivities: [String]
            stressLevel: Int
            preferredFoods: [String]
            avoidedFoods: [String]
        ): User
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
      const newUser = args;
      const result = await UserModel.register(newUser);
      newUser._id = result.insertedId;

      return newUser;
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
    updateUserPreferences: async (_, args, contextValue) => {
      try {
        const user = await contextValue.auth();
        const { _id } = user;

        // Generate AI recommendations
        const recommendations = await generateRecommendations(args);

        // Update user in database
        const updatedUser = await UserModel.updateUser({
          _id: new ObjectId(_id),
          ...args,
          recommendations,
          updatedAt: new Date()
        });

        return updatedUser;
      } catch (error) {
        throw new Error(error.message);
      }
    }
  },
};

module.exports = {
  usersTypeDefs: typeDefs,
  usersResolvers: resolvers,
};
