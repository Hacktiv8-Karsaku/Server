const { ObjectId } = require("mongodb");
const { db } = require("../config/mongodb");

const collection = db.collection("chats");

class ChatModel {
  static async findChatsByUser(userId) {
    const id = new ObjectId(String(userId));
    return await collection.find({
      'participants.0': id
    }).toArray();
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
    const chat = await this.findChatById(chatId);
    if (!chat) throw new Error('Chat not found');

    const senderObjectId = typeof senderId === 'string' ? new ObjectId(senderId) : senderId;

    const message = {
      _id: new ObjectId(),
      sender: senderObjectId,
      content,
      timestamp: new Date(),
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

  static async findChatsByProfessional(professionalId) {
    const id = new ObjectId(String(professionalId));
    return await collection.find({
      'participants.1': id
    }).toArray();
  }

  static async endChat(chatId) {
    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(String(chatId)) },
      { 
        $set: { 
          isEnded: true,
          endedAt: new Date()
        }
      },
      { returnDocument: 'after' }
    );
    return result;
  }
}

module.exports = ChatModel; 