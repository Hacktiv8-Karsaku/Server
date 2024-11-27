const { Query } = require("pg");
const TaskModel = require("../models/TaskModel");

const typeDefs = `#graphql
    type Task {
        _id: ID
        title: String
        description: String
        stressLevel: String
        moodLevel: String
        status: String
        authorId: ID
        createdAt: String
        updatedAt: String
        author: AuthorDetail
    }

    type AuthorDetail {
        _id: ID
        name: String
        username: String
        email: String
    }

    type Query {
        getAllTasks: [Task]
        getTaskById(_id: ID): Task
    }

    type Mutation {
        createTask(title: String, description: String): Task
        updateTask(_id: ID, title: String, description: String): Task
    }
`;

const resolvers = {
  Query: {
    getAllTasks: async (_, __, contextValue) => {
      await contextValue.auth();

      const tasks = await TaskModel.findAll();
      return tasks;
    },
    getTaskById: async (_, args, contextValue) => {
      await contextValue.auth();
      const { _id } = args;
      const task = await TaskModel.getTaskById(_id);
      return task;
    },
  },
  Mutation: {
    createTask: async (_, args, contextValue) => {
      const { _id } = await contextValue.auth();
      const { title, description } = args;

      const newTask = {
        title,
        description,
        authorId: _id,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const task = await TaskModel.createTask(newTask);
      const inserted = await TaskModel.getTaskById(task.insertedId);
      return inserted;
    },
  },
};

module.exports = {
  taskTypeDefs: typeDefs,
  taskResolvers: resolvers,
};
