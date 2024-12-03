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
    getProfessionalChats: [Chat!]!
    getChat(chatId: ID!): Chat
  }

  type Mutation {
    createChat(professionalId: ID!): Chat
    sendMessage(chatId: ID!, content: String!): Chat
    sendMessageProfessional(chatId: ID!, content: String!): Chat
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
    
    getProfessionalChats: async (_, __, contextValue) => {
      try {
        const professional = await contextValue.auth();
        if (!professional || !professional._id) {
          throw new Error("Unauthorized or invalid professional");
        }

        const chats = await ChatModel.findChatsByProfessional(professional._id);
        
        const populatedChats = await Promise.all(chats.map(async (chat) => {
          // Get user details (participants[0])
          const userDetails = await UserModel.findById(chat.participants[0]);
          // Get professional details (participants[1])
          const professionalDetails = await ProfessionalModel.findById(chat.participants[1]);
          
          // Ensure we have names for both participants
          const userName = userDetails?.name || 'Unknown User';
          const professionalName = professionalDetails?.name || 'Unknown Professional';

          return {
            ...chat,
            _id: chat._id.toString(),
            participants: [
              {
                _id: chat.participants[0].toString(),
                name: userName,
                role: 'user'
              },
              {
                _id: chat.participants[1].toString(),
                name: professionalName,
                role: 'professional'
              }
            ],
            messages: chat.messages.map(msg => {
              const isSenderUser = msg.sender.equals(chat.participants[0]);
              return {
                ...msg,
                _id: msg._id.toString(),
                sender: msg.sender.toString(),
                senderDetails: {
                  _id: msg.sender.toString(),
                  name: isSenderUser ? userName : professionalName,
                  role: isSenderUser ? 'user' : 'professional'
                }
              };
            })
          };
        }));
        
        return populatedChats;
      } catch (error) {
        console.error("Error in getProfessionalChats:", error);
        throw error;
      }
    },
    
    getChat: async (_, { chatId }, contextValue) => {
      const user = await contextValue.auth();
      const chat = await ChatModel.findChatById(chatId);
      
      if (!chat.participants.some(p => p.equals(user._id))) {
        throw new Error("Unauthorized to access this chat");
      }
      
      // Get user details (participants[0])
      const userDetails = await UserModel.findById(chat.participants[0]);
      // Get professional details (participants[1])
      const professionalDetails = await ProfessionalModel.findById(chat.participants[1]);
      
      const participantDetails = [
        {
          _id: chat.participants[0].toString(),
          name: userDetails?.name || 'Unknown User',
          role: 'user'
        },
        {
          _id: chat.participants[1].toString(),
          name: professionalDetails?.name || 'Unknown Professional',
          role: 'professional'
        }
      ];

      return {
        ...chat,
        _id: chat._id.toString(),
        participants: participantDetails,
        messages: chat.messages.map(msg => ({
          ...msg,
          _id: msg._id.toString(),
          sender: msg.sender.toString(),
          senderDetails: msg.senderDetails || {
            _id: msg.sender.toString(),
            name: msg.sender.equals(chat.participants[0]) ? userDetails?.name || 'Unknown User' : professionalDetails?.name || 'Unknown Professional',
            role: msg.sender.equals(chat.participants[0]) ? 'user' : 'professional'
          }
        }))
      };
    }
  },

  Mutation: {
    createChat: async (_, { professionalId }, contextValue) => {
      const user = await contextValue.auth();
      const result = await ChatModel.createChat(user._id, professionalId);
      const chat = await ChatModel.findChatById(result.insertedId);
      
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
    },

    sendMessage: async (_, { chatId, content }, contextValue) => {
      const user = await contextValue.auth();
      const chat = await ChatModel.findChatById(chatId);
      
      if (!chat.participants.some(p => p.equals(user._id))) {
        throw new Error("Unauthorized to send message in this chat");
      }
      
      const result = await ChatModel.addMessage(chatId, user._id, content);
      
      // Populate sender details after message is added
      const userDetails = await UserModel.findById(user._id);
      const professionalDetails = await ProfessionalModel.findById(user._id);
      
      // Get the last message and populate its sender details
      const lastMessage = result.messages[result.messages.length - 1];
      lastMessage.senderDetails = {
        _id: user._id.toString(),
        name: userDetails?.name || professionalDetails?.name || 'Unknown',
        role: professionalDetails ? 'professional' : 'user'
      };

      return result;
    },
    
    sendMessageProfessional: async (_, { chatId, content }, contextValue) => {
      try {
        const professional = await contextValue.auth();
        const chat = await ChatModel.findChatById(chatId);
        
        if (!chat) {
          throw new Error("Chat not found");
        }

        // Convert IDs to strings for comparison
        const professionalId = professional._id.toString();
        const participantIds = chat.participants.map(p => p.toString());

        if (!participantIds.includes(professionalId)) {
          throw new Error("Unauthorized to send message in this chat");
        }
        
        const result = await ChatModel.addMessage(chatId, professional._id, content);
        
        // Populate professional details
        const professionalDetails = await ProfessionalModel.findById(professional._id);
        
        // Get the last message and populate its sender details
        const lastMessage = result.messages[result.messages.length - 1];
        lastMessage.senderDetails = {
          _id: professional._id.toString(),
          name: professionalDetails?.name || 'Unknown Professional',
          role: 'professional'
        };

        return result;
      } catch (error) {
        console.error('Error in sendMessageProfessional:', error);
        throw error;
      }
    }
  }
};

module.exports = {
  chatTypeDefs: typeDefs,
  chatResolvers: resolvers
}; 