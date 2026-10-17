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
const { Booking } = require("../src/models/Booking");

describe("Reviews and Complaints Flow Integration Tests", () => {
  let customerToken;
  let customerId;
  let providerToken;
  let providerId;
  let providerProfileId;
  let serviceId;
  let categoryId;
  let paidBookingId;

  before(async () => {
    await connectTestDb();
    await clearTestDb();

    // 1. Customer
    const custRes = await request(app).post("/api/v1/auth/register").send({
      firstName: "Sita",
      lastName: "Rai",
      email: "sita.rai@example.com",
      phone: "9842223344",
      password: "Password123@",
      role: "CUSTOMER",
    });
    customerId = custRes.body.data.user.id;

    const custLogin = await request(app).post("/api/v1/auth/login").send({
      email: "sita.rai@example.com",
      password: "Password123@",
    });
    customerToken = custLogin.body.data.accessToken;

    // 2. Provider
    const provRes = await request(app).post("/api/v1/auth/register").send({
      firstName: "Kiran",
      lastName: "Karki",
      email: "kiran.electrician@example.com",
      phone: "9843334455",
      password: "Password123@",
      role: "PROVIDER",
    });
    providerId = provRes.body.data.user.id;

    const provLogin = await request(app).post("/api/v1/auth/login").send({
      email: "kiran.electrician@example.com",
      password: "Password123@",
    });
    providerToken = provLogin.body.data.accessToken;

    // 3. Category & Service
    const category = await Category.create({
      name: "Electrical",
      slug: "electrical",
      description: "Home electrical installation and repair",
    });
    categoryId = category._id;

    const service = await Service.create({
      category: categoryId,
      name: "Wiring Repair",
      slug: "wiring-repair",
      description: "Short circuit and wiring inspection",
      basePrice: 600,
    });
    serviceId = service._id;

    // 4. Provider profile
    const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const availability = {};
    days.forEach((day) => {
      availability[day] = { enabled: true, startTime: "08:00", endTime: "20:00" };
    });

    const providerDoc = await Provider.create({
      user: providerId,
      businessName: "Kiran Electricals",
      bio: "Certified electrician in Lalitpur",
      experienceYears: 7,
      location: {
        type: "Point",
        coordinates: [85.3188, 27.671],
        address: "Patan, Lalitpur",
        city: "Lalitpur",
      },
      serviceAreas: ["Lalitpur", "Patan"],
      availability,
      verificationStatus: "VERIFIED",
    });
    providerProfileId = providerDoc._id;

    // 5. Create Provider Service offering
    const provServiceDoc = await ProviderService.create({
      provider: providerProfileId,
      service: serviceId,
      price: 600,
      priceType: "FIXED",
      experienceYears: 7,
      isActive: true,
    });

    // 6. Create a PAID Booking directly
    const booking = await Booking.create({
      customer: customerId,
      provider: providerProfileId,
      service: serviceId,
      providerService: provServiceDoc._id,
      bookingNumber: "SFB-TEST-PAID-01",
      status: "PAID",
      scheduledDate: new Date(),
      startTime: "10:00",
      endTime: "11:00",
      address: {
        fullAddress: "Patan Durbar Square, Lalitpur",
        city: "Lalitpur",
      },
      pricing: {
        basePrice: 600,
        quantity: 1,
        subtotal: 600,
        totalAmount: 600,
        currency: "NPR",
      },
      payment: {
        status: "PAID",
        method: "CASH",
        transactionId: "CASH-TEST-PAID-01",
        paidAt: new Date(),
      },
    });
    paidBookingId = booking._id;
  });

  after(async () => {
    await clearTestDb();
    await disconnectTestDb();
  });

  it("POST /api/v1/reviews/bookings/:bookingId — customer submits a review for a paid booking", async () => {
    const res = await request(app)
      .post(`/api/v1/reviews/bookings/${paidBookingId}`)
      .set("Authorization", `Bearer ${customerToken}`)
      .send({
        rating: 5,
        comment: "Excellent and quick service! Fixed the issue cleanly.",
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.review);
    assert.equal(res.body.data.review.rating, 5);

    // Verify booking transitioned to REVIEWED
    const booking = await Booking.findById(paidBookingId);
    assert.equal(booking.status, "REVIEWED");

    // Verify provider stats were updated
    const provider = await Provider.findById(providerProfileId);
    assert.equal(provider.stats.averageRating, 5);
    assert.equal(provider.stats.totalReviews, 1);
  });

  it("POST /api/v1/reviews/bookings/:bookingId — should prevent duplicate reviews for the same booking", async () => {
    const res = await request(app)
      .post(`/api/v1/reviews/bookings/${paidBookingId}`)
      .set("Authorization", `Bearer ${customerToken}`)
      .send({
        rating: 4,
        comment: "Trying to submit another review.",
      });

    assert.equal(res.status, 400); // Booking is now REVIEWED, not eligible
  });

  it("GET /api/v1/reviews/provider/:providerId — should publicly list provider reviews", async () => {
    const res = await request(app)
      .get(`/api/v1/reviews/provider/${providerProfileId}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.reviews.length, 1);
    assert.equal(res.body.data.reviews[0].rating, 5);
  });

  it("POST /api/v1/complaints — customer files a complaint", async () => {
    const res = await request(app)
      .post("/api/v1/complaints")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({
        type: "SERVICE_QUALITY",
        subject: "Late arrival for service",
        description: "The provider arrived 45 minutes late without giving a heads up.",
        bookingId: paidBookingId.toString(),
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.complaint);
    assert.equal(res.body.data.complaint.status, "PENDING");
    assert.equal(res.body.data.complaint.type, "SERVICE_QUALITY");
  });

  it("GET /api/v1/complaints/me — customer retrieves their complaints", async () => {
    const res = await request(app)
      .get("/api/v1/complaints/me")
      .set("Authorization", `Bearer ${customerToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.complaints.length, 1);
  });
});
