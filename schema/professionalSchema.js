const ProfessionalModel = require("../models/ProfessionalModel");
const { comparePass } = require("../helpers/bcyrpt");
const { signToken } = require("../helpers/jwt");

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
    email: String!
    password: String!
    createdAt: String
    updatedAt: String
  }

  type ProfessionalLoginResponse {
    access_token: String
    professionalId: ID
    name: String
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
      email: String!
      password: String!
    ): Professional

    loginProfessional(
      email: String!
      password: String!
    ): ProfessionalLoginResponse

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
    },

    loginProfessional: async (_, { email, password }) => {
      if (!email) throw new Error("Email is required");
      if (!password) throw new Error("Password is required");

      const professional = await ProfessionalModel.login(email, password);

      const token = signToken({
        _id: professional._id,
        email: professional.email,
        role: professional.specialization
      });

      return {
        access_token: token,
        professionalId: professional._id,
        name: professional.name
      };
    }
  }
};

module.exports = {
  professionalTypeDefs: typeDefs,
  professionalResolvers: resolvers,
}; 