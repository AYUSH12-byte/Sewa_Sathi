const express = require("express");

const {
  register,
  login,
  refresh,
  logout,
  getMe,
} = require("../controllers/auth.controller");

const validate = require("../middleware/validate");

const {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
} = require("../validators/auth.validator");

const { authenticate } = require("../middleware/auth");

const router = express.Router();

router.post("/register", validate(registerSchema), register);

router.post("/login", validate(loginSchema), login);

router.post("/refresh", validate(refreshTokenSchema), refresh);

router.post("/logout", authenticate, logout);

router.get("/me", authenticate, getMe);

module.exports = router;
