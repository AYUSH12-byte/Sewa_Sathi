const asyncHandler = require("../utils/asyncHandler");
const { createdResponse, successResponse } = require("../utils/apiResponse");

const {
  registerUser,
  loginUser,
  refreshUserToken,
  logoutUser,
} = require("../services/auth.service");

const register = asyncHandler(async (req, res) => {
  const user = await registerUser(req.validated.body);

  return createdResponse({
    res,
    message: "Account registered successfully",
    data: {
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneVerified,
        createdAt: user.createdAt,
      },
    },
  });
});

const login = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken } = await loginUser(
    req.validated.body,
  );

  return successResponse({
    res,
    message: "Login successful",
    data: {
      accessToken,

      refreshToken,

      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneVerified,
        lastLoginAt: user.lastLoginAt,
      },
    },
  });
});

const refresh = asyncHandler(async (req, res) => {
  const refreshToken = req.body.refreshToken;

  const result = await refreshUserToken(refreshToken);

  return successResponse({
    res,
    message: "Token refreshed successfully",
    data: {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,

      user: {
        id: result.user._id,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        fullName: result.user.fullName,
        email: result.user.email,
        phone: result.user.phone,
        role: result.user.role,
        status: result.user.status,
      },
    },
  });
});

const logout = asyncHandler(async (req, res) => {
  await logoutUser(req.user._id);

  return successResponse({
    res,
    message: "Logout successful",
  });
});


const getMe = asyncHandler(async (req, res) => {
  return successResponse({
    res,
    message: "Current user retrieved successfully",
    data: {
      user: {
        id: req.user._id,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        fullName: req.user.fullName,
        email: req.user.email,
        phone: req.user.phone,
        role: req.user.role,
        status: req.user.status,
        emailVerified: req.user.emailVerified,
        phoneVerified: req.user.phoneVerified,
        profileImage: req.user.profileImage,
        lastLoginAt: req.user.lastLoginAt,
        createdAt: req.user.createdAt,
        updatedAt: req.user.updatedAt,
      },
    },
  });
});

module.exports = {
  register,
  login,
  refresh,
  logout,
  getMe,
};
