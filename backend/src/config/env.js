const requiredEnvKeys = [
  "MONGODB_URI",
  "JWT_ACCESS_SECRET",
  "JWT_REFRESH_SECRET",
];

const normalizeEnv = () => {
  if (!process.env.MONGODB_URI && process.env.MONGO_URI) {
    process.env.MONGODB_URI = process.env.MONGO_URI;
  }

  if (!process.env.MONGO_URI && process.env.MONGODB_URI) {
    process.env.MONGO_URI = process.env.MONGODB_URI;
  }

  return process.env;
};

const validateEnvironment = () => {
  normalizeEnv();

  const missing = requiredEnvKeys.filter((key) => {
    const value = process.env[key];
    return !value || !String(value).trim();
  });

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}. ` +
        "Set them in the .env file before starting the server."
    );
  }

  return {
    mongoUri: process.env.MONGODB_URI || process.env.MONGO_URI,
    jwtAccessSecret: process.env.JWT_ACCESS_SECRET,
    jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
    nodeEnv: process.env.NODE_ENV || "development",
    port: Number(process.env.PORT || 7000),
  };
};

module.exports = {
  normalizeEnv,
  validateEnvironment,
  requiredEnvKeys,
};
