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
        savedTodos: [Todo]
        lastQuestionDate: String
        createdAt: String
        updatedAt: String
        domicile: String
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
        placeId: String
    }

    type Video {
        title: String
        url: String
        thumbnail: String
        description: String
    }

    type Query {
        serverLive: String
        getAllUsers: [User]
        getUserProfile(date: String): User
        getSavedTodos(date: String): [Todo]
        getAllDestionations: [Place]
    }

    type Todo {
        todoItem: String
        date: String
        status: String
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
            domicile: String
            date: String
        ): User
        saveTodoItem(todoItem: String, date: String): User
        deleteTodoItem(todoItem: String): User
        regenerateTodos(date: String): User
        updateTodoStatus(todoItem: String, status: String): User
    }

    type Coordinates {
        lat: Float
        lng: Float
    }
`;

const resolvers = {
  Query: {
    serverLive: () => "Server is live",

    getAllUsers: async (parent, args, contextValue) => {
      await contextValue.auth();
      const users = await UserModel.findAll();
      return users;
    },

    getUserProfile: async (parent, args, contextValue) => {
      await contextValue.auth();
      const { _id } = await contextValue.auth();
      console.log(args);
      const user = await UserModel.getUserProfile(_id, args.date);
      return user;
    },

    getSavedTodos: async (_, { date }, contextValue) => {
      try {
        const user = await contextValue.auth();
        const filteredTodos = user.savedTodos.filter(
          (todo) =>
            new Date(todo.date).toLocaleDateString() ===
            new Date(date).toLocaleDateString()
        );
        console.log(filteredTodos, "<<<filteredTodos");
        return filteredTodos || [];
      } catch (error) {
        throw new Error(error.message);
      }
    },
    getAllDestionations: async (_, __, contextValue) => {
      try {
        const user = await contextValue.auth();
        const { recommendations } = user;
        return recommendations.places;
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
        // console.log(recommendations, "recommendations");
        
        const updatedUser = await UserModel.updateUser({
          _id: new ObjectId(_id),
          ...args,
          lastQuestionDate: new Date().toISOString(),
          updatedAt: new Date(),
          recommendations,
          args.date
        );

        return updatedUser;
      } catch (error) {
        throw new Error(error.message);
      }
    },
    saveTodoItem: async (_, { todoItem, date }, contextValue) => {
      try {
        const user = await contextValue.auth();
        const { _id } = user;

        const updatedUser = await UserModel.findOneAndUpdate(
          { _id },
          {
            $push: {
              savedTodos: {
                todoItem,
                date: new Date(date).toISOString(),
                status: "pending",
              },
            },
          },
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
        const { _id, savedTodos } = user;
        const filteredTodos = savedTodos.filter(
          (todo) => todo.todoItem !== todoItem
        );

        const updatedUser = await UserModel.findOneAndUpdate(
          { _id },
          { $set: { savedTodos: filteredTodos } },
          { new: true }
        );

        if (!updatedUser) {
          throw new Error("Todo item not found");
        }

        return updatedUser;
      } catch (error) {
        throw new Error(error.message);
      }
    },
    regenerateTodos: async (_, { date }, contextValue) => {
      try {
        const user = await contextValue.auth();
        const { _id } = user;

        const recommendations = await generateRecommendations({
          job: user.job,
          dailyActivities: user.dailyActivities,
          stressLevel: user.stressLevel,
          preferredFoods: user.preferredFoods,
          avoidedFoods: user.avoidedFoods,
          domicile: user.domicile,
        });

        const updatedUser = await UserModel.updateUser(
          {
            _id: new ObjectId(_id),
            lastQuestionDate: new Date().toISOString(),
            updatedAt: new Date(),
          },
          recommendations,
          date
        );

        return updatedUser;

        // Generate new recommendations

        // Update user with new recommendations
      } catch (error) {
        throw new Error(error.message);
      }
    },

    updateTodoStatus: async (_, { todoItem, status }, contextValue) => {
      try {
        const user = await contextValue.auth();
        const { _id, savedTodos } = user;
        const selectedTodo = savedTodos.find(
          (todo) => todo.todoItem === todoItem
        );
        selectedTodo.status = status;

        const newTodos = savedTodos.map((todo) =>
          todo.todoItem === todoItem ? selectedTodo : todo
        );

        const updatedUser = await UserModel.findOneAndUpdate(
          { _id },
          { $set: { savedTodos: newTodos } },
          { new: true }
        );

        if (!updatedUser) {
          throw new Error("Todo item not found");
        }

        return updatedUser;
      } catch (error) {
        console.log(error, "<<<error");
        throw new Error(error.message);
      }
    },
  },
};

module.exports = {
  usersTypeDefs: typeDefs,
  usersResolvers: resolvers,
};
