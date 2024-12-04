const request = require("supertest")
const { ApolloServer } = require("@apollo/server");
const { startStandaloneServer } = require("@apollo/server/standalone")
const { usersTypeDefs, usersResolvers } = require("../schema/userSchema");


let server;
let url;

beforeAll(async () => {
    server = new ApolloServer({
        typeDefs: [usersTypeDefs],
        resolvers: [usersResolvers],
    })

    const { url: serverUrl } = await startStandaloneServer(server, {
        listen: { port: 4000 },
    });
    url = serverUrl;

})

afterAll(async () => {
    await server.stop();

})

//test supertest serverLive Query

describe("serverLive Query", () => {
    it("should return all users", async () => {
        const query = `
        query {
             serverLive
             }`
        const response = await request(url).post("/graphql").send({ query });
        expect(response.status).toBe(200);
    })

})


//test supertest getAllUser query
describe("getAllUser Query", () => {
    it("should return all users", async () => {
        const query = `
        query {
            getAllUser {
                _id: ID
        name
        username
        email
        password
        job
        dailyActivities
        stressLevel
        preferredFoods
        avoidedFoods
        recommendations 
        savedTodos
        lastQuestionDate
        createdAt
        updatedAt
        domicile
             }`
        const response = await request(url).post("/graphql").send({ query });
        expect(response.status).toBe(200);
    })
})

//test supertest getUserProfile query
describe("getUserProfile Query", () => {
    it("should return user profile", async () => {
        const query = `
        query {
            getUserProfile(id: "60f6a9b6a1c6f80015c5e7a2") {
                _id
                name
                email
                job
                dailyActivities
                stressLevel
                preferredFoods
                avoidedFoods
                domicile
                recommendations {
                  _id
                  title
                  description
                  videoUrl
                  thumbnailUrl
                }
              }
             }`
        const response = await request(url).post("/graphql").send({ query });
        expect(response.status).toBe(200);
    })

})

//test supertest getSavedTodos query
describe("getSavedTodos Query", () => {
    it("should return all saved todos", async () => {
        const query = `
        query {
            getSavedTodos {
                _id
                name
                email
                job
                dailyActivities
                stressLevel
                preferredFoods
                avoidedFoods
                domicile
                recommendations {
                  _id
                  title
                  description
                  videoUrl
                  thumbnailUrl
                }
              }
             }`
        const response = await request(url).post("/graphql").send({ query });
        expect(response.status).toBe(200);
    })

})

//test supertest getAllDestionations query
describe("getAllDestionations Query", () => {
    it("should return all destinations", async () => {
        const query = `
        query {
            getAllDestionations {
                _id
                name
                description
                address
                coordinates
                photoUrl
              }
             }`
        const response = await request(url).post("/graphql").send({ query });
        expect(response.status).toBe(200);
    })

})

//test supertest createUser query
describe("createUser Mutation", () => {
    it("should create a new user", async () => {
        const mutation = `
        mutation {
            createUser(
                name: "test",
                email: "test",
                job: "test",
                password: "test",
                dailyActivities: ["test"],
                stressLevel: 1,
                preferredFoods: ["test"],
                avoidedFoods: ["test"],
                domicile: "test",
                recommendations: {
                    todoList: ["test"],
                    places: ["test"],
                    foodVideos: ["test"]
                }
            ) {
                _id
                name
                email
                job
                dailyActivities
                stressLevel
                preferredFoods
                avoidedFoods
                domicile
                recommendations {
                  _id
                  title
                  description
                  videoUrl
                  thumbnailUrl
                }
              }
             }`
        const response = await request(url).post("/graphql").send({ mutation });
        expect(response.status).toBe(200);
    })})

//test supertest login mutation
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
        const response = await request(url).post("/graphql").send({ mutation });
        expect(response.status).toBe(200);
    })})

//test supertest updateUserPreferences mutation
describe("updateUserPreferences Mutation", () => {
    it("should update user preferences", async () => {
        const mutation = `
        mutation {
            updateUserPreferences(
                food: "test",
                drink: "test",
                activity: "test"
            ) {
                _id
                name
                email
                job
                dailyActivities
                stressLevel
                preferredFoods
                avoidedFoods
                domicile
                recommendations {
                  _id
                  title
                  description
                  videoUrl
                  thumbnailUrl
                }
              }
             }`
        const response = await request(url).post("/graphql").send({ mutation });
        expect(response.status).toBe(200);
    })})

//test supertest saveTodoItem mutation
describe("saveTodoItem Mutation", () => {
    it("should save a todo item", async () => {
        const mutation = `
        mutation {
            saveTodoItem(todoItem: "test") {
                _id
                name
                email
                job
                dailyActivities
                stressLevel
                preferredFoods
                avoidedFoods
                domicile
                recommendations {
                  _id
                  title
                  description
                  videoUrl
                  thumbnailUrl
                }
              }
             }`
        const response = await request(url).post("/graphql").send({ mutation });
        expect(response.status).toBe(200);
    })})

//test supertest deleteTodoItem mutation
describe("deleteTodoItem Mutation", () => {
    it("should delete a todo item", async () => {
        const mutation = `
        mutation {
            deleteTodoItem(todoItem: "test") {
                _id
                name
                email
                job
                dailyActivities
                stressLevel
                preferredFoods
                avoidedFoods
                domicile
                recommendations {
                  _id
                  title
                  description
                  videoUrl
                  thumbnailUrl
                }
              }
             }`
        const response = await request(url).post("/graphql").send({ mutation });
        expect(response.status).toBe(200);
    })})

//test supertest regenerateTodos mutation
describe("regenerateTodos Mutation", () => {
    it("should regenerate todos", async () => {
        const mutation = `
        mutation {
            regenerateTodos {
                _id
                name
                email
                job
                dailyActivities
                stressLevel
                preferredFoods
                avoidedFoods
                domicile
                recommendations {
                  _id
                  title
                  description
                  videoUrl
                  thumbnailUrl
                }
              }
             }`
        const response = await request(url).post("/graphql").send({ mutation });
        expect(response.status).toBe(200);
    })})

