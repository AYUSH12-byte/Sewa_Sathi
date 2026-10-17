const { describe, it, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const app = require("../src/app");
const { connectTestDb, clearTestDb, disconnectTestDb } = require("./helpers/db");

describe("Authentication & User Profile Endpoints", () => {
  before(async () => {
    await connectTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  after(async () => {
    await clearTestDb();
    await disconnectTestDb();
  });

  const customerData = {
    firstName: "Ram",
    lastName: "Sharma",
    email: "ram.sharma@example.com",
    phone: "9841234567",
    password: "Password123@",
    role: "CUSTOMER",
  };

  it("POST /api/v1/auth/register — should register a new customer successfully", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send(customerData);

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.user);
    assert.equal(res.body.data.user.email, customerData.email);
    assert.equal(res.body.data.user.role, "CUSTOMER");
    assert.equal(res.body.data.user.password, undefined);
  });

  it("POST /api/v1/auth/register — should reject duplicate email", async () => {
    await request(app).post("/api/v1/auth/register").send(customerData);

    const duplicateRes = await request(app)
      .post("/api/v1/auth/register")
      .send({
        ...customerData,
        phone: "9849999999", // different phone, same email
      });

    assert.equal(duplicateRes.status, 409);
    assert.equal(duplicateRes.body.success, false);
  });

  it("POST /api/v1/auth/login — should log in registered user with valid credentials", async () => {
    await request(app).post("/api/v1/auth/register").send(customerData);

    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: customerData.email,
        password: customerData.password,
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.accessToken);
    assert.ok(res.body.data.refreshToken);
    assert.equal(res.body.data.user.email, customerData.email);
  });

  it("POST /api/v1/auth/login — should reject invalid password", async () => {
    await request(app).post("/api/v1/auth/register").send(customerData);

    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: customerData.email,
        password: "WrongPassword999!",
      });

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
  });

  it("GET /api/v1/auth/me — should retrieve authenticated user profile", async () => {
    await request(app).post("/api/v1/auth/register").send(customerData);

    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: customerData.email,
        password: customerData.password,
      });

    const token = loginRes.body.data.accessToken;

    const meRes = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${token}`);

    assert.equal(meRes.status, 200);
    assert.equal(meRes.body.success, true);
    assert.equal(meRes.body.data.user.email, customerData.email);
    assert.equal(meRes.body.data.user.firstName, customerData.firstName);
  });

  it("GET /api/v1/auth/me — should reject request without token", async () => {
    const res = await request(app).get("/api/v1/auth/me");

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
  });
});
