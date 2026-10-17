import api from "./client";

export const searchProvidersApi = async (params = {}) => {
  const response = await api.get("/discovery/providers", { params });
  return response.data;
};

export const getProviderProfileApi = async (providerId) => {
  const response = await api.get(`/discovery/providers/${providerId}`);
  return response.data;
};

export const getMyProviderProfileApi = async () => {
  const response = await api.get("/providers/profile");
  return response.data;
};

export const updateProviderProfileApi = async (data) => {
  const response = await api.patch("/providers/profile", data);
  return response.data;
};

export const getProviderServicesApi = async () => {
  const response = await api.get("/providers/services");
  return response.data;
};
