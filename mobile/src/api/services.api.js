import api from "./client";

export const getCategoriesApi = async () => {
  const response = await api.get("/categories");
  return response.data;
};

export const getServicesByCategoryApi = async (categoryId) => {
  const response = await api.get(`/services?category=${categoryId}`);
  return response.data;
};

export const getAllServicesApi = async (params = {}) => {
  const response = await api.get("/services", { params });
  return response.data;
};
