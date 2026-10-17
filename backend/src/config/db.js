const mongoose = require("mongoose");
const { validateEnvironment } = require("./env");

const connectDB = async () => {
  try {
    const { mongoUri } = validateEnvironment();

    const connection = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
    });

    console.log(
      `🟢 MongoDB connected: ${connection.connection.host}`
    );

    return connection;
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);

    throw error;
  }
};

module.exports = connectDB;