const ChatModel = require("../models/ChatModel");
const UserModel = require("../models/UserModel");
const ProfessionalModel = require("../models/ProfessionalModel");

const typeDefs = `#graphql
  type Message {
    _id: ID!
    sender: ID!
    content: String!
    timestamp: String!
    senderDetails: ChatParticipant
  }

  type ChatParticipant {
    _id: ID!
    name: String!
    role: String!
  }

  type Chat {
    _id: ID!
    participants: [ChatParticipant!]!
    messages: [Message!]!
    createdAt: String!
    updatedAt: String!
  }

  type Query {
    getUserChats: [Chat!]!
    getChat(chatId: ID!): Chat
  }

  type Mutation {
    createChat(professionalId: ID!): Chat
    sendMessage(chatId: ID!, content: String!): Chat
  }
`;

const resolvers = {
  Query: {
    getUserChats: async (_, __, contextValue) => {
      const user = await contextValue.auth();
      const chats = await ChatModel.findChatsByUser(user._id);
      
      // Populate participant details
      const populatedChats = await Promise.all(chats.map(async (chat) => {
        const participantDetails = await Promise.all(chat.participants.map(async (participantId) => {
          const userDetails = await UserModel.findById(participantId);
          const professionalDetails = await ProfessionalModel.findById(participantId);
          
          return {
            _id: participantId,
            name: userDetails?.name || professionalDetails?.name,
            role: professionalDetails ? 'professional' : 'user'
          };
        }));
        
        return {
          ...chat,
          participants: participantDetails
        };
      }));
      
      return populatedChats;
    },
    
    getChat: async (_, { chatId }, contextValue) => {
      const user = await contextValue.auth();
      const chat = await ChatModel.findChatById(chatId);
      
      if (!chat.participants.some(p => p.equals(user._id))) {
        throw new Error("Unauthorized to access this chat");
      }
      
      // Populate participant details
      const participantDetails = await Promise.all(chat.participants.map(async (participantId) => {
        const userDetails = await UserModel.findById(participantId);
        const professionalDetails = await ProfessionalModel.findById(participantId);
        
        return {
          _id: participantId,
          name: userDetails?.name || professionalDetails?.name,
          role: professionalDetails ? 'professional' : 'user'
        };
      }));
      
      return {
        ...chat,
        participants: participantDetails
      };
    }
  },

  Mutation: {
    createChat: async (_, { professionalId }, contextValue) => {
      const user = await contextValue.auth();
      const result = await ChatModel.createChat(user._id, professionalId);
      return await ChatModel.findChatById(result.insertedId);
    },

    sendMessage: async (_, { chatId, content }, contextValue) => {
      const user = await contextValue.auth();
      const chat = await ChatModel.findChatById(chatId);
      
      if (!chat.participants.some(p => p.equals(user._id))) {
        throw new Error("Unauthorized to send message in this chat");
      }
      
      const result = await ChatModel.addMessage(chatId, user._id, content);
      return result;
    }
  }
};

module.exports = {
  chatTypeDefs: typeDefs,
  chatResolvers: resolvers
}; 