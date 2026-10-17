import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getBookingDetailApi, cancelBookingApi } from "../../api/bookings.api";
import { createPaymentApi } from "../../api/payments.api";
import { Card, Badge, Button } from "../../components/common";
import { colors, typography, spacing, borderRadius } from "../../theme";

export const BookingDetailScreen = ({ route, navigation }) => {
  const { bookingId } = route.params;

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchDetail = async () => {
    try {
      const res = await getBookingDetailApi(bookingId);
      if (res.data?.booking) {
        setBooking(res.data.booking);
      }
    } catch (e) {
      Alert.alert("Error", "Could not load booking details");
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [bookingId]);

  const handleCancel = () => {
    Alert.prompt
      ? Alert.prompt(
          "Cancel Booking",
          "Please enter a reason for cancellation:",
          [
            { text: "Dismiss", style: "cancel" },
            {
              text: "Cancel Booking",
              style: "destructive",
              onPress: async (reason) => {
                setActionLoading(true);
                try {
                  await cancelBookingApi(bookingId, reason || "Customer request");
                  fetchDetail();
                } catch (e) {
                  Alert.alert("Error", e.response?.data?.message || e.message);
                } finally {
                  setActionLoading(false);
                }
              },
            },
          ]
        )
      : Alert.alert("Cancel Booking", "Are you sure you want to cancel this booking?", [
          { text: "No", style: "cancel" },
          {
            text: "Yes, Cancel",
            style: "destructive",
            onPress: async () => {
              setActionLoading(true);
              try {
                await cancelBookingApi(bookingId, "Customer request");
                fetchDetail();
              } catch (e) {
                Alert.alert("Error", e.response?.data?.message || e.message);
              } finally {
                setActionLoading(false);
              }
            },
          },
        ]);
  };

  const handlePay = async (method) => {
    setActionLoading(true);
    try {
      const res = await createPaymentApi(bookingId, method);
      if (method === "CASH") {
        Alert.alert(
          "Cash Payment Initiated",
          "Please hand NPR " +
            booking.pricing?.totalAmount +
            " to the provider upon completion. The provider will confirm your payment."
        );
        fetchDetail();
      } else if (method === "ESEWA") {
        Alert.alert(
          "eSewa Checkout Ready",
          "Generated signed checkout transaction reference: " +
            res.data?.payment?.paymentReference +
            "\nVerification endpoint is active."
        );
        fetchDetail();
      }
    } catch (e) {
      Alert.alert("Payment Error", e.response?.data?.message || e.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!booking) return null;

  const isReadyForPayment =
    (booking.status === "COMPLETED" || booking.status === "PAYMENT_PENDING") &&
    booking.payment?.status !== "PAID";

  const isPaid = booking.status === "PAID" || booking.payment?.status === "PAID";
  const isReviewed = booking.status === "REVIEWED";

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header Info */}
      <Card style={styles.summaryCard}>
        <View style={styles.summaryTop}>
          <Text style={styles.bookingNumberText}>{booking.bookingNumber}</Text>
          <Badge status={booking.status} />
        </View>

        <Text style={styles.serviceTitle}>
          {booking.service?.name || "Local Service"}
        </Text>
        <Text style={styles.providerSubtitle}>
          by {booking.provider?.businessName || "Assigned Provider"}
        </Text>

        <View style={styles.infoGrid}>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Scheduled Date</Text>
            <Text style={styles.infoVal}>
              {new Date(booking.scheduledDate).toLocaleDateString()}
            </Text>
          </View>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Time Slot</Text>
            <Text style={styles.infoVal}>
              {booking.startTime} - {booking.endTime}
            </Text>
          </View>
        </View>
      </Card>

      {/* Service Location */}
      <Card>
        <View style={styles.sectionHeader}>
          <Ionicons name="location-outline" size={18} color={colors.primary} />
          <Text style={styles.cardSectionTitle}>Service Location</Text>
        </View>
        <Text style={styles.addressText}>
          {booking.address?.fullAddress || "Address provided at booking"}
        </Text>
        {booking.customerNote ? (
          <View style={styles.noteContainer}>
            <Text style={styles.noteLabel}>Note:</Text>
            <Text style={styles.noteText}>{booking.customerNote}</Text>
          </View>
        ) : null}
      </Card>

      {/* Pricing Breakdown */}
      <Card>
        <View style={styles.sectionHeader}>
          <Ionicons name="cash-outline" size={18} color={colors.primary} />
          <Text style={styles.cardSectionTitle}>Pricing Summary</Text>
        </View>

        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Base Service Rate</Text>
          <Text style={styles.priceVal}>
            NPR {booking.pricing?.basePrice || 0}
          </Text>
        </View>

        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Quantity</Text>
          <Text style={styles.priceVal}>{booking.pricing?.quantity || 1}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.priceRow}>
          <Text style={styles.totalPriceLabel}>Total Amount</Text>
          <Text style={styles.totalPriceVal}>
            NPR {booking.pricing?.totalAmount || 0}
          </Text>
        </View>

        <View style={styles.paymentStatusRow}>
          <Text style={styles.priceLabel}>Payment Status</Text>
          <Badge status={booking.payment?.status || "PENDING"} />
        </View>
      </Card>

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        {isReadyForPayment && (
          <>
            <Button
              title="Pay with Cash"
              variant="outline"
              icon={<Ionicons name="cash-outline" size={18} color={colors.primary} />}
              onPress={() => handlePay("CASH")}
              loading={actionLoading}
              style={{ marginBottom: spacing.sm }}
            />
            <Button
              title="Pay with eSewa"
              variant="primary"
              icon={<Ionicons name="wallet-outline" size={18} color={colors.textInverse} />}
              onPress={() => handlePay("ESEWA")}
              loading={actionLoading}
              style={{ marginBottom: spacing.sm, backgroundColor: "#60BB46" }} // eSewa Green
            />
          </>
        )}

        {isPaid && !isReviewed && (
          <Button
            title="Write a Review"
            variant="primary"
            icon={<Ionicons name="star-outline" size={18} color={colors.textInverse} />}
            onPress={() =>
              navigation.navigate("SubmitReview", {
                bookingId: booking._id,
                providerName: booking.provider?.businessName,
              })
            }
            style={{ marginBottom: spacing.sm }}
          />
        )}

        {["PENDING", "ACCEPTED"].includes(booking.status) && (
          <Button
            title="Cancel Booking"
            variant="danger"
            onPress={handleCancel}
            loading={actionLoading}
            style={{ marginBottom: spacing.sm }}
          />
        )}

        <Button
          title="Chat with Provider"
          variant="ghost"
          icon={<Ionicons name="chatbubble-outline" size={18} color={colors.primary} />}
          onPress={() =>
            navigation.navigate("Chat", {
              bookingId: booking._id,
              recipientName: booking.provider?.businessName,
            })
          }
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  summaryCard: {
    backgroundColor: colors.primarySoft,
    borderColor: "#BFDBFE",
  },
  summaryTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  bookingNumberText: {
    ...typography.caption,
    fontWeight: "700",
    color: colors.primary,
  },
  serviceTitle: {
    ...typography.h2,
    color: colors.text,
    marginTop: 2,
  },
  providerSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  infoGrid: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#DBEAFE",
    paddingTop: spacing.sm,
  },
  infoCol: {
    flex: 1,
  },
  infoLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  infoVal: {
    ...typography.bodyBold,
    color: colors.text,
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  cardSectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginLeft: spacing.xs,
  },
  addressText: {
    ...typography.body,
    color: colors.text,
  },
  noteContainer: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginTop: spacing.sm,
  },
  noteLabel: {
    ...typography.caption,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  noteText: {
    ...typography.body,
    color: colors.text,
    marginTop: 2,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 4,
  },
  priceLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  priceVal: {
    ...typography.body,
    color: colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  totalPriceLabel: {
    ...typography.h3,
    color: colors.text,
  },
  totalPriceVal: {
    ...typography.h2,
    color: colors.primary,
  },
  paymentStatusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.md,
  },
  actionsContainer: {
    marginTop: spacing.sm,
  },
});

export default BookingDetailScreen;
