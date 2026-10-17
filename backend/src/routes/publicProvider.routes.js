const express = require("express");
const validate = require("../middleware/validate");
const asyncHandler = require("../utils/asyncHandler");
const { successResponse } = require("../utils/apiResponse");
const { discover } = require("../controllers/provider.controller");
const { getProviderById } = require("../services/adminProvider.service");
const { ProviderService } = require("../models/ProviderService");
const { providerDiscoverySchema } = require("../validators/provider.validator");

const router = express.Router();

// Search & discover providers
router.get("/", validate(providerDiscoverySchema), discover);

// Get public provider details with services
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const provider = await getProviderById(req.params.id);
    const services = await ProviderService.find({
      provider: req.params.id,
      isActive: true,
    }).populate("service");

    return successResponse({
      res,
      message: "Provider profile retrieved successfully",
      data: {
        provider,
        services,
      },
    });
  })
);

module.exports = router;
