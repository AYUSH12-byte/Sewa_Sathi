import api from "./client";

export const createBookingApi = async (bookingData) => {
  const response = await api.post("/bookings", bookingData);
  return response.data;
};

export const getBookingsApi = async (params = {}) => {
  const response = await api.get("/bookings", { params });
  return response.data;
};

export const getBookingDetailApi = async (bookingId) => {
  const response = await api.get(`/bookings/${bookingId}`);
  return response.data;
};

export const acceptBookingApi = async (bookingId) => {
  const response = await api.patch(`/bookings/${bookingId}/accept`);
  return response.data;
};

export const rejectBookingApi = async (bookingId, reason) => {
  const response = await api.patch(`/bookings/${bookingId}/reject`, { reason });
  return response.data;
};

export const cancelBookingApi = async (bookingId, reason) => {
  const response = await api.patch(`/bookings/${bookingId}/cancel`, { reason });
  return response.data;
};

export const updateJobStatusApi = async (bookingId, status) => {
  const response = await api.patch(`/bookings/${bookingId}/status`, { status });
  return response.data;
};
