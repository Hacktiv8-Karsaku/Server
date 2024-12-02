const ProfessionalModel = require("../models/ProfessionalModel");

const typeDefs = `#graphql
  type Professional {
    _id: ID
    name: String!
    specialization: String!
    yearsOfExperience: Int!
    isAvailable: Boolean
    imageUrl: String!
    education: String!
    description: String!
    rating: Float
    totalPatients: Int
    price: Float!
    estimatedWaitTime: Int!
    createdAt: String
    updatedAt: String
  }

  type Query {
    getAllProfessionals: [Professional]
    getProfessionalById(id: ID!): Professional
  }

  type Mutation {
    createProfessional(
      name: String!
      specialization: String!
      yearsOfExperience: Int!
      isAvailable: Boolean
      imageUrl: String!
      education: String!
      description: String!
      rating: Float
      totalPatients: Int
      price: Float!
      estimatedWaitTime: Int!
    ): Professional

    updateProfessional(
      _id: ID!
      name: String
      specialization: String
      yearsOfExperience: Int
      isAvailable: Boolean
      imageUrl: String
      education: String
      description: String
      rating: Float
      totalPatients: Int
      price: Float
      estimatedWaitTime: Int
    ): Professional
  }
`;

const resolvers = {
  Query: {
    getAllProfessionals: async (_, __, contextValue) => {
      await contextValue.auth();
      const professionals = await ProfessionalModel.findAll();
      return professionals;
    },
    
    getProfessionalById: async (_, { id }, contextValue) => {
      await contextValue.auth();
      const professional = await ProfessionalModel.findById(id);
      return professional;
    }
  },

  Mutation: {
    createProfessional: async (_, args, contextValue) => {
      await contextValue.auth();
      const result = await ProfessionalModel.create(args);
      return await ProfessionalModel.findById(result.insertedId);
    },

    updateProfessional: async (_, args, contextValue) => {
      await contextValue.auth();
      const result = await ProfessionalModel.update(args);
      return result;
    }
  }
};

module.exports = {
  professionalTypeDefs: typeDefs,
  professionalResolvers: resolvers,
}; 