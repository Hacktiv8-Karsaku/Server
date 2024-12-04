const request = require("supertest");
const { ApolloServer } = require("@apollo/server");
const { startStandaloneServer } = require("@apollo/server/standalone");
const { usersTypeDefs, usersResolvers } = require("../schema/userSchema");

let server;
let url;

beforeAll(async () => {
  server = new ApolloServer({
    typeDefs: [usersTypeDefs],
    resolvers: [usersResolvers],
  });

  const { url: serverUrl } = await startStandaloneServer(server, {
    listen: { port: 4000 },
  });
  url = serverUrl;
});

afterAll(async () => {
  await server.stop();
});

//test supertest serverLive Query

describe("serverLive Query", () => {
  it("should return all users", async () => {
    const query = `
        query {
             serverLive
             }`;
    const response = await request(url).post("/graphql").send({ query });
    expect(response.status).toBe(200);
  });
});

//test supertest getAllUser query
describe("getAllUser Query", () => {
  it("should return all users", async () => {
    const query = `
        query {
  getAllUsers {
    _id
    name
    username
    email
    password
    job
    dailyActivities
    stressLevel
    preferredFoods
    avoidedFoods
    recommendations {
      todoList
      places {
        name
        description
        address
        coordinates {
          lat
          lng
        }
        photoUrl
      }
      foodVideos {
        title
        url
        thumbnail
        description
      }
    }
    savedTodos
    lastQuestionDate
    createdAt
    updatedAt
    domicile
  }       
             }`;
    const response = await request(url).post("/graphql").send({ query });
    expect(response.status).toBe(200);
  });
});

//test supertest getUserProfile query
describe("getUserProfile Query", () => {
    it("should return user profile", async () => {
        const query = `
      query GetUserProfile($getUserProfileId: ID) {
  getUserProfile(id: $getUserProfileId) {
    _id
    name
    username
    email
    password
    job
    dailyActivities
    stressLevel
    preferredFoods
    avoidedFoods
    recommendations {
      todoList
      places {
        name
        description
        address
        coordinates {
          lat
          lng
        }
        photoUrl
      }
      foodVideos {
        title
        url
        thumbnail
        description
      }
    }
    savedTodos
    lastQuestionDate
    createdAt
    updatedAt
    domicile
  }
}`
             
        const response = await request(url).post("/graphql").send({ query });
        expect(response.status).toBe(200);
    })

})

// //test supertest getSavedTodos query
describe("getSavedTodos Query", () => {
    it("should return all saved todos", async () => {
        const query = `
        query {
            getSavedTodos
             }`
        const response = await request(url).post("/graphql").send({ query });
        expect(response.status).toBe(200);
    })

})

// //test supertest getAllDestionations query
describe("getAllDestionations Query", () => {
    it("should return all destinations", async () => {
        const query = `
        query GetAllDestionations {
  getAllDestionations {
    name
    description
    address
    coordinates {
      lat
      lng
    }
    photoUrl
  }
}`
        const response = await request(url).post("/").send({ query });
        expect(response.status).toBe(200);
    })

})

// // //test supertest createUser query
describe("createUser Mutation", () => {
    it("should create a new user", async () => {
        const mutation = `
       mutation {
  createUser(name: "test", username: "test", email: "test", password: "test", job: "test") {
    _id
    name
    username
    email
    password
    job
    dailyActivities
    stressLevel
    preferredFoods
    avoidedFoods
    recommendations {
      todoList
      places {
        name
        description
        address
        coordinates {
          lat
          lng
        }
        photoUrl
      }
      foodVideos {
        title
        url
        thumbnail
        description
      }
    }
    savedTodos
    lastQuestionDate
    createdAt
    updatedAt
    domicile
  }
}`
//send variables
        // const variables = {
        //     name: "test",
        //     username: "test",
        //     email: "test",
        //     password: "test",
        //     job: "test"
        // }   
        const response = await request(url).post("/").send({ query :mutation});
        // const response = await request(url).post("/graphql").send({ mutation });
        // console.log(response.body, "<<<<< response");
        expect(response.status).toBe(200);
        
        
    })})

// // //test supertest login mutation
describe("login Mutation", () => {
    it("should login a user", async () => {
        const mutation = `
        mutation {
  login(username: "test", password: "test") {
    access_token
    userId
    username
    shouldAskQuestions
  }
}`
        const response = await request(url).post("/graphql").send({ query: mutation });
        expect(response.status).toBe(200);
    })})

// // // //test supertest updateUserPreferences mutation
describe("updateUserPreferences Mutation", () => {
    it("should update user preferences", async () => {
        const mutation = `
       mutation  {
  updateUserPreferences(job: "test", dailyActivities: "test", stressLevel: 7, preferredFoods: "test", avoidedFoods: "test", domicile: "test") {
    _id
    name
    username
    email
    password
    job
    dailyActivities
    stressLevel
    preferredFoods
    avoidedFoods
    recommendations {
      todoList
      places {
        name
        description
        address
        coordinates {
          lat
          lng
        }
        photoUrl
      }
      foodVideos {
        title
        url
        thumbnail
        description
      }
    }
    savedTodos
    lastQuestionDate
    createdAt
    updatedAt
    domicile
  }
}`
        const response = await request(url).post("/graphql").send({ query: mutation });
        console.log(response.body, "<<<<< response ini cokkkk");
        
        expect(response.status).toBe(200);
    })})

// // // //test supertest saveTodoItem mutation
describe("saveTodoItem Mutation", () => {
    it("should save a todo item", async () => {
        const mutation = `
       mutation {
  saveTodoItem(todoItem: "test") {
    _id
    name
    username
    email
    password
    job
    dailyActivities
    stressLevel
    preferredFoods
    avoidedFoods
    recommendations {
      todoList
      places {
        name
        description
        address
        coordinates {
          lat
          lng
        }
        photoUrl
      }
      foodVideos {
        title
        url
        thumbnail
        description
      }
    }
    savedTodos
    lastQuestionDate
    createdAt
    updatedAt
    domicile
  }
}`
        const response = await request(url).post("/graphql").send({ query: mutation });
        expect(response.status).toBe(200);
    })})

// // // //test supertest deleteTodoItem mutation
describe("deleteTodoItem Mutation", () => {
    it("should delete a todo item", async () => {
        const mutation = `
        mutation {
  deleteTodoItem(todoItem: "test") {
    _id
    name
    username
    email
    password
    job
    dailyActivities
    stressLevel
    preferredFoods
    avoidedFoods
    recommendations {
      todoList
      places {
        name
        description
        address
        coordinates {
          lat
          lng
        }
        photoUrl
      }
      foodVideos {
        title
        url
        thumbnail
        description
      }
    }
    savedTodos
    lastQuestionDate
    createdAt
    updatedAt
    domicile
  }
}`
        const response = await request(url).post("/graphql").send({ query: mutation });
        expect(response.status).toBe(200);
    })})

// // // //test supertest regenerateTodos mutation
describe("regenerateTodos Mutation", () => {
    it("should regenerate todos", async () => {
        const mutation = `
       mutation {
  regenerateTodos {
    _id
    name
    username
    email
    password
    job
    dailyActivities
    stressLevel
    preferredFoods
    avoidedFoods
    recommendations {
      todoList
      places {
        name
        description
        address
        coordinates {
          lat
          lng
        }
        photoUrl
      }
      foodVideos {
        title
        url
        thumbnail
        description
      }
    }
    savedTodos
    lastQuestionDate
    createdAt
    updatedAt
    domicile
  }
}`
        const response = await request(url).post("/graphql").send({ query : mutation });
        expect(response.status).toBe(200);
    })})
