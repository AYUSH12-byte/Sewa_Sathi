# SewaSathi — Nepal Local Service Marketplace
## Final-Year Computing Degree Project • Comprehensive System Overview

---

## 1. Executive Summary

In Nepal's urban and semi-urban centers—including Kathmandu Valley (Kathmandu, Lalitpur, Bhaktapur), Pokhara, and Chitwan—finding reliable, skilled, and fairly-priced home service professionals (plumbers, electricians, appliance technicians, carpenters, and painters) is traditionally an informal, friction-heavy, word-of-mouth process.

Customers face unstandardized pricing, absent background verification, unpredictable availability, and zero recourse in the event of substandard work. Conversely, skilled tradespeople struggle with intermittent demand, lack of digital visibility, and informal payment disputes.

**SewaSathi** ("सेवा साथी" — *Service Companion*) addresses these fundamental challenges by providing a secure, localized, mobile-first marketplace platform tailored specifically to the socio-economic and technical realities of Nepal.

---

## 2. Problem Statement & Motivation

### 2.1 The Customer Dilemma
- **Information Asymmetry:** No centralized repository to compare tradespeople by verified reviews, past work history, and transparent hourly/flat pricing.
- **Safety & Trust Deficit:** Strangers entering private residences without standardized identity or citizenship verification (Citizenship Card / PAN / Trade License).
- **Payment Inconvenience:** Lack of integrated support for local digital payment gateways such as eSewa alongside cultural norms of Cash on Delivery.

### 2.2 The Service Provider Dilemma
- **Marketing Overhead:** High reliance on physical storefronts or localized recommendations.
- **Schedule Inefficiencies:** Inability to digitally broadcast working hours, weekly availability (Sunday through Friday / Saturday), or service boundaries.
- **Unsecured Receivables:** Risk of customer default or dispute after service completion.

---

## 3. Solution Overview

SewaSathi bridges this divide through a three-sided digital ecosystem:

1. **Customer Mobile Experience (React Native / Expo):**
   - Location-aware search for local service categories.
   - Provider profile evaluation with verified customer reviews and aggregate ratings.
   - Transparent appointment scheduling with specific date and morning/afternoon/evening time slots.
   - Dual-mode settlement: digital payment via **eSewa** (HMAC-SHA256 signature verification) and structured **Cash on Delivery** with provider acknowledgment.
   - In-app direct chat and dispute resolution mechanisms.

2. **Provider Partner Application (React Native / Expo):**
   - Real-time notification of inbound booking requests with acceptance and rejection controls.
   - Five-stage job lifecycle management (`ACCEPTED` ➔ `SCHEDULED` ➔ `PROVIDER_ON_WAY` ➔ `IN_PROGRESS` ➔ `COMPLETED`).
   - Earnings overview, job history metrics, and physical cash collection confirmation.
   - Profile customizer with service offerings and availability schedules.

3. **Administrative Governance Center (Web Portal):**
   - Real-time platform KPI dashboard (active users, verified providers, gross booking volume).
   - Identity & KYC audit queue for approving, rejecting, or suspending service providers.
   - End-to-end booking oversight and transaction audit trails.
   - Content moderation for reviews and complaint ticket resolution.

---

## 4. Key Target Personas

| Persona | Role | Key Needs & Goals |
|---|---|---|
| **Urban Resident / Homeowner (Aayush)** | Customer | Needs urgent plumbing/electrical help; values verified ratings, clear pricing, and secure digital payment. |
| **Independent Technician (Ram Bahadur)** | Service Provider | Wants steady incoming work without agency middlemen; needs easy job tracking on mobile and prompt cash confirmation. |
| **Marketplace Operator (Platform Admin)** | Governance / Operations | Ensures quality control, verifies citizenship and trade credentials, mediates disputes, and oversees platform health. |

---

## 5. Technology Stack Summary

- **Backend Runtime:** Node.js (v20+ / LTS) with Express.js.
- **Database:** MongoDB Atlas / Local MongoDB (Mongoose 9 ODM) featuring 2dsphere geospatial indexing and transactional safety.
- **Mobile Client:** React Native with Expo SDK 58, React Navigation 7, and Native Safe Area context.
- **Authentication:** Dual-token JWT (short-lived access tokens + rotating refresh tokens in HTTP-only cookies and headers).
- **Payment Gateway:** eSewa ePay v2 integration (HMAC-SHA256 signed payloads) and Cash on Delivery escrow flow.
- **Testing Suite:** Native Node.js Test Runner (`node:test`) + Supertest for zero-mock end-to-end integration testing.
