import api from "./client";

export const loginApi = async (credentials) => {
  const response = await api.post("/auth/login", credentials);
  return response.data;
};

export const registerApi = async (userData) => {
  const response = await api.post("/auth/register", userData);
  return response.data;
};

export const getMeApi = async () => {
  const response = await api.get("/auth/me");
  return response.data;
};

export const logoutApi = async () => {
  try {
    await api.post("/auth/logout");
  } catch (e) {
    // ignore server logout failure if network is offline
  }
};
