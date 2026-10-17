const mongoose = require("mongoose");

const connectTestDb = async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI, {
      driverInfo: { name: "mongoose", version: mongoose.version || "8.0.0" },
      serverSelectionTimeoutMS: 5000,
    });
  }
};

const clearTestDb = async () => {
  if (mongoose.connection.readyState === 1) {
    const collections = mongoose.connection.collections;
    const promises = Object.values(collections).map((col) => col.deleteMany({}));
    await Promise.all(promises);
  }
};

const disconnectTestDb = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
};

module.exports = {
  connectTestDb,
  clearTestDb,
  disconnectTestDb,
};
