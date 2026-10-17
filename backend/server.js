require("dotenv").config();

const app = require("./src/app");
const connectDB = require("./src/config/db");
const { validateEnvironment } = require("./src/config/env");

const startServer = async () => {
  try {
    const config = validateEnvironment();
    await connectDB();

    const PORT = config.port;
    const server = app.listen(PORT, () => {
      console.log(`🚀 Service Finder API running on port ${PORT}`);
      console.log(`🌍 Environment: ${config.nodeEnv}`);
    });

    const shutdownServer = async (signal) => {
      console.log(`\n${signal} received. Shutting down server...`);

      server.close(async () => {
        try {
          await require("mongoose").connection.close();

          console.log("🟢 MongoDB connection closed");
          console.log("🟢 HTTP server closed");

          process.exit(0);
        } catch (error) {
          console.error("❌ Error while shutting down:", error.message);

          process.exit(1);
        }
      });
    };

    process.on("SIGINT", () => shutdownServer("SIGINT"));
    process.on("SIGTERM", () => shutdownServer("SIGTERM"));
  } catch (error) {
    console.error("❌ Failed to start server:", error.message);

    process.exit(1);
  }
};

startServer();