import api from "./client";

export const createPaymentApi = async (bookingId, method) => {
  const response = await api.post(`/payments/bookings/${bookingId}`, { method });
  return response.data;
};

export const getPaymentDetailApi = async (paymentId) => {
  const response = await api.get(`/payments/${paymentId}`);
  return response.data;
};

export const verifyEsewaPaymentApi = async (paymentId) => {
  const response = await api.post(`/payments/${paymentId}/verify`);
  return response.data;
};

export const confirmCashPaymentApi = async (paymentId) => {
  const response = await api.post(`/payments/${paymentId}/confirm-cash`);
  return response.data;
};
