require("dotenv").config();

process.env.NODE_ENV = "test";
process.env.PORT = "7001";

const baseUri = process.env.MONGODB_URI || process.env.MONGO_URI || "mongodb://127.0.0.1:27017/sewasathi_test";
const testUri = baseUri.includes("_test") ? baseUri : baseUri.replace(/\/([^/?]+)(\?|$)/, "/$1_test$2");

process.env.MONGODB_URI = testUri;
process.env.MONGO_URI = testUri;

process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "test-jwt-access-secret-minimum-32-chars-long";
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "test-jwt-refresh-secret-minimum-32-chars-long";

process.env.ESEWA_PRODUCT_CODE = process.env.ESEWA_PRODUCT_CODE || "EPAYTEST";
process.env.ESEWA_SECRET_KEY = process.env.ESEWA_SECRET_KEY || "8gBm/:&EnhH.1/q";
process.env.ESEWA_FORM_URL = process.env.ESEWA_FORM_URL || "https://rc-epay.esewa.com.np/api/epay/main/v2/form";
process.env.ESEWA_STATUS_URL = process.env.ESEWA_STATUS_URL || "https://rc.esewa.com.np/api/epay/transaction/status";
process.env.ESEWA_SUCCESS_URL = process.env.ESEWA_SUCCESS_URL || "http://localhost:5173/payment/success";
process.env.ESEWA_FAILURE_URL = process.env.ESEWA_FAILURE_URL || "http://localhost:5173/payment/failure";
