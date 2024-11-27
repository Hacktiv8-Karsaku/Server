const { ObjectId } = require("mongodb");
const { db } = require("../config/mongodb");

const collection = db.collection("tasks");

class TaskModel {
  static async findAll() {
    const tasks = await collection.find().toArray();
    return tasks;
  }

  static async getTaskById(id) {
    const task = await collection.findOne({ _id: new ObjectId(String(id)) });
    return task;
  }

  static async createTask(task) {
    task.createdAt = task.createdAt = new Date();
    const newTask = await collection.insertOne(task);
    return newTask;
  }

  static async updateTask(task) {
    const { _id } = task;
    const updatedTask = await collection.updateOne({ _id }, { $set: task });
    return updatedTask;
  }
}

module.exports = TaskModel;
