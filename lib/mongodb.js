import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB Atlas-ga muvaffaqiyatli ulandi!");
  } catch (error) {
    console.error("MongoDB ulanishda xatolik:", error);
  }
};

export default connectDB;