const { ObjectId } = require("mongodb");
const { db } = require("../config/mongodb");
const { isEmail } = require("validator");
const { hashPass } = require("../helpers/bcyrpt");
const collection = db.collection("users");

class UserModel {
  static async register(user) {
    try {
      // Validate required fields
      if (!user.name) throw new Error("Name is required");
      if (!user.username) throw new Error("Username is required");
      if (!user.email) throw new Error("Email is required");
      if (!user.password) throw new Error("Password is required");
      if (!user.job) throw new Error("Job is required");

      // Validate email format
      if (!isEmail(user.email)) {
        throw new Error("Email format is invalid");
      }

      // Validate password length
      if (user.password.length < 5) {
        throw new Error("Password length should be at least 5 characters");
      }

      // Check for existing username
      const existingUsername = await this.getUserByUsername(user.username);
      if (existingUsername) {
        throw new Error("Username already exists");
      }

      // Check for existing email
      const existingEmail = await this.getUserByEmail(user.email);
      if (existingEmail) {
        throw new Error("Email already exists");
      }

      // Hash password
      user.password = hashPass(user.password);

      // Insert user
      const result = await collection.insertOne(user);
      return result;
    } catch (error) {
      throw error;
    }
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

  static async getUserProfile(_id, date) {
    const user = await collection.findOne({
      _id: new ObjectId(String(_id))
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Ensure recommendations is always an object with the correct structure
    if (!user.recommendations) {
      user.recommendations = {
        todoList: [],
        places: [],
        foodVideos: []
      };
    }

    return user;
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

  static async updateUser(userData, recommendations, date) {
    const { _id, ...updateData } = userData;

    // Ensure recommendations has the correct structure
    const formattedRecommendations = {
      todoList: recommendations.todoList || [],
      places: recommendations.places || [],
      foodVideos: recommendations.foodVideos || []
    };

    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(String(_id)) },
      { 
        $set: {
          ...updateData,
          recommendations: formattedRecommendations
        }
      },
      { returnDocument: "after" }
    );

    if (recommendations && date) {
      await collection.updateOne(
        { _id: new ObjectId(String(_id)) },
        {
          $push: {
            recommendationsHistory: {
              date: new Date(date).toLocaleDateString(),
              recommendations: formattedRecommendations,
            },
          },
        }
      );
    }

    return result;
  }

  static async findOneAndUpdate(filter, update, options) {
    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(String(filter._id)) },
      update,
      { ...options, returnDocument: "after" }
    );
    return result;
  }

  static async shouldAskQuestions(userId) {
    const user = await collection.findOne({
      _id: new ObjectId(String(userId)),
    });

    if (!user.dailyActivities) {
      return true;
    }

    if (!user.lastQuestionDate) {
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
