const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../src/app");
const { connectTestDb, clearTestDb, disconnectTestDb } = require("./helpers/db");
const Category = require("../src/models/Category");
const Service = require("../src/models/Service");
const { Provider } = require("../src/models/Provider");
const { ProviderService } = require("../src/models/ProviderService");

describe("Booking and Payment Flow Integration Tests", () => {
  let customerToken;
  let customerId;
  let providerToken;
  let providerId;
  let providerProfileId;
  let providerServiceId;
  let serviceId;
  let categoryId;

  before(async () => {
    await connectTestDb();
    await clearTestDb();

    // 1. Create a customer
    const custRes = await request(app).post("/api/v1/auth/register").send({
      firstName: "Hari",
      lastName: "Thapa",
      email: "hari.thapa@example.com",
      phone: "9841112233",
      password: "Password123@",
      role: "CUSTOMER",
    });
    customerId = custRes.body.data.user.id;

    const custLogin = await request(app).post("/api/v1/auth/login").send({
      email: "hari.thapa@example.com",
      password: "Password123@",
    });
    customerToken = custLogin.body.data.accessToken;

    // 2. Create a provider user
    const provRes = await request(app).post("/api/v1/auth/register").send({
      firstName: "Bikash",
      lastName: "Shrestha",
      email: "bikash.plumber@example.com",
      phone: "9841998877",
      password: "Password123@",
      role: "PROVIDER",
    });
    providerId = provRes.body.data.user.id;

    const provLogin = await request(app).post("/api/v1/auth/login").send({
      email: "bikash.plumber@example.com",
      password: "Password123@",
    });
    providerToken = provLogin.body.data.accessToken;

    // 3. Create a Category & Service directly
    const category = await Category.create({
      name: "Plumbing",
      slug: "plumbing",
      description: "Plumbing repair and maintenance",
    });
    categoryId = category._id;

    const service = await Service.create({
      category: categoryId,
      name: "Pipe Repair",
      slug: "pipe-repair",
      description: "Fix leaking and broken pipes",
      basePrice: 500,
    });
    serviceId = service._id;

    const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const availability = {};
    days.forEach((day) => {
      availability[day] = { enabled: true, startTime: "08:00", endTime: "20:00" };
    });

    // 4. Create Provider profile
    const providerDoc = await Provider.create({
      user: providerId,
      businessName: "Bikash Plumbing Services",
      bio: "Expert plumbing services in Kathmandu",
      experienceYears: 5,
      location: {
        type: "Point",
        coordinates: [85.324, 27.7172], // Kathmandu
        address: "Kathmandu, Bagmati",
        city: "Kathmandu",
      },
      serviceAreas: ["Kathmandu", "Thamel"],
      availability,
      verificationStatus: "VERIFIED",
    });
    providerProfileId = providerDoc._id;

    // 5. Add Provider Service offering
    const provServiceDoc = await ProviderService.create({
      provider: providerProfileId,
      service: serviceId,
      price: 750,
      priceType: "FIXED",
      experienceYears: 5,
      isActive: true,
    });
    providerServiceId = provServiceDoc._id;
  });

  after(async () => {
    await clearTestDb();
    await disconnectTestDb();
  });

  let createdBookingId;
  let createdPaymentId;

  it("POST /api/v1/bookings — customer creates a booking with the provider", async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const res = await request(app)
      .post("/api/v1/bookings")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({
        providerId: providerProfileId.toString(),
        providerServiceId: providerServiceId.toString(),
        scheduledDate: tomorrow.toISOString(),
        startTime: "10:00",
        endTime: "11:00",
        address: {
          fullAddress: "123 Lazimpat, Kathmandu",
          city: "Kathmandu",
        },
        customerNote: "Water pipe leaking in the bathroom",
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.booking);
    assert.equal(res.body.data.booking.status, "PENDING");
    createdBookingId = res.body.data.booking._id;
  });

  it("PATCH /api/v1/bookings/:id/accept — provider accepts the booking", async () => {
    const res = await request(app)
      .patch(`/api/v1/bookings/${createdBookingId}/accept`)
      .set("Authorization", `Bearer ${providerToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.booking.status, "ACCEPTED");
  });

  it("PATCH /api/v1/bookings/:id/status — provider advances booking to COMPLETED", async () => {
    // ACCEPTED -> SCHEDULED
    let res = await request(app)
      .patch(`/api/v1/bookings/${createdBookingId}/status`)
      .set("Authorization", `Bearer ${providerToken}`)
      .send({ status: "SCHEDULED" });
    assert.equal(res.status, 200);

    // SCHEDULED -> PROVIDER_ON_WAY
    res = await request(app)
      .patch(`/api/v1/bookings/${createdBookingId}/status`)
      .set("Authorization", `Bearer ${providerToken}`)
      .send({ status: "PROVIDER_ON_WAY" });
    assert.equal(res.status, 200);

    // PROVIDER_ON_WAY -> IN_PROGRESS
    res = await request(app)
      .patch(`/api/v1/bookings/${createdBookingId}/status`)
      .set("Authorization", `Bearer ${providerToken}`)
      .send({ status: "IN_PROGRESS" });
    assert.equal(res.status, 200);

    // IN_PROGRESS -> COMPLETED
    res = await request(app)
      .patch(`/api/v1/bookings/${createdBookingId}/status`)
      .set("Authorization", `Bearer ${providerToken}`)
      .send({ status: "COMPLETED" });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.booking.status, "COMPLETED");
  });

  it("POST /api/v1/payments/bookings/:bookingId — customer initiates CASH payment", async () => {
    const res = await request(app)
      .post(`/api/v1/payments/bookings/${createdBookingId}`)
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ method: "CASH" });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.payment);
    assert.equal(res.body.data.payment.method, "CASH");
    assert.equal(res.body.data.payment.status, "PENDING");
    createdPaymentId = res.body.data.payment._id;
  });

  it("POST /api/v1/payments/:id/confirm-cash — provider confirms physical cash receipt", async () => {
    const res = await request(app)
      .post(`/api/v1/payments/${createdPaymentId}/confirm-cash`)
      .set("Authorization", `Bearer ${providerToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.payment.status, "PAID");
    assert.ok(res.body.data.payment.paidAt);
  });

  it("GET /api/v1/bookings/:id — verify booking status is now PAID", async () => {
    const res = await request(app)
      .get(`/api/v1/bookings/${createdBookingId}`)
      .set("Authorization", `Bearer ${customerToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.booking.status, "PAID");
    assert.equal(res.body.data.booking.payment.status, "PAID");
  });
});
