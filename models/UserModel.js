const { ObjectId } = require("mongodb");
const { db } = require("../config/mongodb");
const { isEmail } = require("validator");
const { hashPass } = require("../helpers/bcyrpt");

const collection = db.collection("users");

class UserModel {
  static async register(user) {
    if (!user.name) {
      throw new Error("Name is required");
    }

    if (!user.username) {
      throw new Error("Username is required");
    }

    if (!user.email) {
      throw new Error("Email is required");
    }

    if (!isEmail(user.email)) {
      throw new Error("Email format is invalid");
    }

    if (!user.password) {
      throw new Error("Password is required");
    }

    if (user.password.length < 5) {
      throw new Error("Password length should be at least 5 characters");
    }

    if (!user.job) {
      throw new Error("Job is required");
    }

    const getUsername = await UserModel.getUserByUsername(user.username);
    if (getUsername) {
      throw new Error("Username already exists");
    }

    const getEmail = await UserModel.getUserByEmail(user.email);
    if (getEmail) {
      throw new Error("Email already exists");
    }

    user.password = hashPass(user.password);

    const newUser = await collection.insertOne(user);
    return newUser;
  }

  static async login(username, password) {
    const data = await collection.findOne({ username, password });
    return data;
  }

  static async findAll() {
    const data = await collection.find().toArray();
    return data;
  }

  static async findById(_id) {
    const data = await collection.findOne({ _id: new ObjectId(String(_id)) });
    return data;
  }

  static async getUserProfile(_id) {
    const data = await collection.findOne({ _id: new ObjectId(String(_id)) });
    return data;
  }

  static async getUserByName(name) {
    const data = await collection.findOne({ name });
    return data;
  }

  static async getUserByUsername(username) {
    const data = await collection.findOne({ username });
    return data;
  }
  static async getUserByEmail(email) {
    const data = await collection.findOne({ email });
    return data;
  }

  static async updateUser(userData) {
    const { _id, ...updateData } = userData;
    
    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(String(_id)) },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    return result;
  }

  static async findOneAndUpdate(filter, update, options) {
    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(String(filter._id)) },
      update,
      { ...options, returnDocument: 'after' }
    );
    return result;
  }

  static async shouldAskQuestions(userId) {
    const user = await collection.findOne({ _id: new ObjectId(String(userId)) });
    
    if (!user.job || !user.dailyActivities || !user.lastQuestionDate) {
      return true;
    }

    const lastDate = new Date(user.lastQuestionDate);
    const today = new Date();
    
    return lastDate.toDateString() !== today.toDateString();
  }

  static async updateLastQuestionDate(userId) {
    await collection.updateOne(
      { _id: new ObjectId(String(userId)) },
      { $set: { lastQuestionDate: new Date().toISOString() } }
    );
  }
}

module.exports = UserModel;
