const { ObjectId } = require("mongodb");
const { db } = require("../config/mongodb");

const collection = db.collection("chats");

class ChatModel {
  static async findChatsByUser(userId) {
    const chats = await collection.find({
      participants: { $in: [new ObjectId(String(userId))] }
    }).toArray();
    return chats;
  }

  static async findChatById(chatId) {
    const chat = await collection.findOne({
      _id: new ObjectId(String(chatId))
    });
    return chat;
  }

  static async createChat(userId, professionalId) {
    const chat = {
      participants: [
        new ObjectId(String(userId)), 
        new ObjectId(String(professionalId))
      ],
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await collection.insertOne(chat);
    return result;
  }

  static async addMessage(chatId, senderId, content) {
    const message = {
      _id: new ObjectId(),
      sender: new ObjectId(String(senderId)),
      content,
      timestamp: new Date()
    };

    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(String(chatId)) },
      { 
        $push: { messages: message },
        $set: { updatedAt: new Date() }
      },
      { returnDocument: 'after' }
    );

    return result;
  }
}

module.exports = ChatModel; 