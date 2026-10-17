import api from "./client";

export const submitReviewApi = async (bookingId, { rating, comment }) => {
  const response = await api.post(`/reviews/bookings/${bookingId}`, { rating, comment });
  return response.data;
};

export const getProviderReviewsApi = async (providerId, params = {}) => {
  const response = await api.get(`/reviews/provider/${providerId}`, { params });
  return response.data;
};

export const getMyReviewsApi = async (params = {}) => {
  const response = await api.get("/reviews/me", { params });
  return response.data;
};

export const submitComplaintApi = async (complaintData) => {
  const response = await api.post("/complaints", complaintData);
  return response.data;
};

export const getMyComplaintsApi = async (params = {}) => {
  const response = await api.get("/complaints/me", { params });
  return response.data;
};
