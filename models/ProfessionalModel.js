const { ObjectId } = require("mongodb");
const { db } = require("../config/mongodb");
const bcrypt = require("bcrypt");

const collection = db.collection("professionals");

class ProfessionalModel {
  static async findAll() {
    const professionals = await collection.find().toArray();
    return professionals;
  }

  static async findById(_id) {
    const professional = await collection.findOne({ 
      _id: new ObjectId(String(_id)) 
    });
    return professional;
  }

  static async create(professional) {
    if (!professional.name) throw new Error("Name is required");
    if (!professional.specialization) throw new Error("Specialization is required");
    if (!professional.education) throw new Error("Education is required");
    if (!professional.imageUrl) throw new Error("Image URL is required");
    if (!professional.description) throw new Error("Description is required");
    if (!professional.price) throw new Error("Price is required");
    if (!professional.password) throw new Error("Password is required");
    
    const salt = await bcrypt.genSalt(10);
    professional.password = await bcrypt.hash(professional.password, salt);
    
    professional.createdAt = new Date();
    professional.updatedAt = new Date();
    
    const result = await collection.insertOne(professional);
    return result;
  }

  static async update(professionalData) {
    const { _id, ...updateData } = professionalData;
    updateData.updatedAt = new Date();
    
    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(String(_id)) },
      { $set: updateData },
      { returnDocument: 'after' }
    );
    
    return result;
  }

  static async login(email, password) {
    const professional = await collection.findOne({ email });
    if (!professional) throw new Error("Professional not found");

    const isValid = await bcrypt.compare(password, professional.password);
    if (!isValid) throw new Error("Invalid email or password");

    return professional;
  }
}

module.exports = ProfessionalModel; 