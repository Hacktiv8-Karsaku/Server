const UserModel = require("../models/UserModel");
const { comparePass } = require("../helpers/bcyrpt");
const { signToken } = require("../helpers/jwt");
const { generateRecommendations } = require("../helpers/openai");
const { ObjectId } = require("mongodb");

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
        savedTodos: [String]
        lastQuestionDate: String
        createdAt: String
        updatedAt: String
    }

    type Recommendations {
        todoList: [String]
        places: [Place]
        foodVideos: [Video]
    }

    type Place {
        name: String
        description: String
        address: String
        coordinates: Coordinates
    }

    type Video {
        title: String
        url: String
        thumbnail: String
        description: String
    }

    type Query {
        getAllUsers: [User]
        getUserProfile(id: ID): User
        getSavedTodos: [String]
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
        shouldAskQuestions: Boolean
    }

    type Mutation {
        createUser(name: String, username: String, email: String, password: String, job: String): User
        login(username: String, password: String): LoginResponse
        updateUserPreferences(
            job: String
            dailyActivities: [String]
            stressLevel: Int
            preferredFoods: [String]
            avoidedFoods: [String]
        ): User
        saveTodoItem(todoItem: String): User
        deleteTodoItem(todoItem: String): User
        regenerateTodos: User
    }

    type Coordinates {
        lat: Float
        lng: Float
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

    getSavedTodos: async (_, __, contextValue) => {
      try {
        const user = await contextValue.auth();
        return user.savedTodos || [];
      } catch (error) {
        throw new Error(error.message);
      }
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

      if (!username) throw new Error("Username is required");
      if (!password) throw new Error("Password is required");

      const user = await UserModel.getUserByUsername(username);
      if (!user) throw new Error("Username not found");

      const isPasswordValid = comparePass(password, user.password);
      if (!isPasswordValid) throw new Error("Invalid username or password");

      const shouldAskQuestions = await UserModel.shouldAskQuestions(user._id);

      const token = signToken({
        _id: user._id,
        username: user.username,
      });

      return {
        access_token: token,
        userId: user._id,
        username: user.username,
        shouldAskQuestions,
      };
    },
    updateUserPreferences: async (_, args, contextValue) => {
      try {
        const user = await contextValue.auth();
        const { _id } = user;

        const recommendations = await generateRecommendations(args);

        const updatedUser = await UserModel.updateUser({
          _id: new ObjectId(_id),
          ...args,
          recommendations,
          lastQuestionDate: new Date().toISOString(),
          updatedAt: new Date(),
        });

        return updatedUser;
      } catch (error) {
        throw new Error(error.message);
      }
    },
    saveTodoItem: async (_, { todoItem }, contextValue) => {
      try {
        const user = await contextValue.auth();
        const { _id } = user;

        const updatedUser = await UserModel.findOneAndUpdate(
          { _id },
          { $push: { savedTodos: todoItem } },
          { new: true }
        );

        return updatedUser;
      } catch (error) {
        throw new Error(error.message);
      }
    },
    deleteTodoItem: async (_, { todoItem }, contextValue) => {
      try {
        const user = await contextValue.auth();
        const { _id } = user;

        const updatedUser = await UserModel.findOneAndUpdate(
          { _id },
          { $pull: { savedTodos: todoItem } },
          { new: true }
        );

        if (!updatedUser) {
          throw new Error("Todo item not found");
        }

        if (!updatedUser) {
          throw new Error("Video not found");
        }

        return updatedUser;
      } catch (error) {
        throw new Error(error.message);
      }
    },
    regenerateTodos: async (_, __, contextValue) => {
      try {
        const user = await contextValue.auth();
        const { _id } = user;

        // Generate new recommendations
        const recommendations = await generateRecommendations({
          job: user.job,
          dailyActivities: user.dailyActivities,
          stressLevel: user.stressLevel,
          preferredFoods: user.preferredFoods,
          avoidedFoods: user.avoidedFoods,
        });

        // Update user with new recommendations
        const updatedUser = await UserModel.updateUser({
          _id: new ObjectId(_id),
          recommendations,
          updatedAt: new Date(),
        });

        return updatedUser;
      } catch (error) {
        throw new Error(error.message);
      }
    },
  },
};

module.exports = {
  usersTypeDefs: typeDefs,
  usersResolvers: resolvers,
};
