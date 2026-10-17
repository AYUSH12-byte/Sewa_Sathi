import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  getBookingsApi,
  acceptBookingApi,
  rejectBookingApi,
  updateJobStatusApi,
} from "../../api/bookings.api";
import { confirmCashPaymentApi } from "../../api/payments.api";
import { Card, Badge, Button } from "../../components/common";
import { colors, typography, spacing, borderRadius } from "../../theme";

const TABS = [
  { id: "REQUESTS", label: "Requests" },
  { id: "ACTIVE", label: "In Progress" },
  { id: "COMPLETED", label: "Completed" },
];

export const ProviderJobsScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState("REQUESTS");
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const fetchJobs = async () => {
    try {
      const res = await getBookingsApi({ limit: 50 });
      if (res.data?.bookings) {
        setBookings(res.data.bookings);
      }
    } catch (e) {
      console.warn("Error fetching provider jobs:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchJobs();
  };

  // Filter jobs based on active tab
  const filteredBookings = bookings.filter((b) => {
    if (activeTab === "REQUESTS") {
      return b.status === "PENDING";
    }
    if (activeTab === "ACTIVE") {
      return ["ACCEPTED", "SCHEDULED", "PROVIDER_ON_WAY", "IN_PROGRESS"].includes(
        b.status
      );
    }
    if (activeTab === "COMPLETED") {
      return ["COMPLETED", "PAID", "CANCELLED", "REJECTED"].includes(b.status);
    }
    return true;
  });

  const handleAccept = async (bookingId) => {
    setActionLoadingId(bookingId);
    try {
      await acceptBookingApi(bookingId);
      Alert.alert("Success", "Booking accepted successfully!");
      fetchJobs();
    } catch (e) {
      Alert.alert(
        "Action Failed",
        e.response?.data?.message || "Could not accept booking"
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = (bookingId) => {
    Alert.prompt
      ? Alert.prompt(
          "Reject Booking",
          "Please state the reason for rejection:",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Reject",
              style: "destructive",
              onPress: async (reason) => {
                setActionLoadingId(bookingId);
                try {
                  await rejectBookingApi(bookingId, reason || "Provider unavailable");
                  fetchJobs();
                } catch (e) {
                  Alert.alert(
                    "Error",
                    e.response?.data?.message || "Could not reject booking"
                  );
                } finally {
                  setActionLoadingId(null);
                }
              },
            },
          ]
        )
      : Alert.alert(
          "Reject Booking",
          "Are you sure you want to reject this request?",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Reject",
              style: "destructive",
              onPress: async () => {
                setActionLoadingId(bookingId);
                try {
                  await rejectBookingApi(bookingId, "Provider unavailable");
                  fetchJobs();
                } catch (e) {
                  Alert.alert(
                    "Error",
                    e.response?.data?.message || "Could not reject booking"
                  );
                } finally {
                  setActionLoadingId(null);
                }
              },
            },
          ]
        );
  };

  const handleStatusAdvance = async (bookingId, nextStatus, nextLabel) => {
    Alert.alert(
      "Update Job Status",
      `Mark this job as "${nextLabel}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            setActionLoadingId(bookingId);
            try {
              await updateJobStatusApi(bookingId, nextStatus);
              Alert.alert("Updated", `Job status updated to ${nextLabel}!`);
              fetchJobs();
            } catch (e) {
              Alert.alert(
                "Error",
                e.response?.data?.message || "Could not update status"
              );
            } finally {
              setActionLoadingId(null);
            }
          },
        },
      ]
    );
  };

  const handleConfirmCash = async (paymentId) => {
    Alert.alert(
      "Confirm Cash Collection",
      "Have you collected the cash payment in full from the customer?",
      [
        { text: "Not Yet", style: "cancel" },
        {
          text: "Yes, Confirmed",
          onPress: async () => {
            try {
              await confirmCashPaymentApi(paymentId);
              Alert.alert("Payment Confirmed", "Cash receipt marked as collected!");
              fetchJobs();
            } catch (e) {
              Alert.alert(
                "Error",
                e.response?.data?.message || "Failed to confirm cash payment"
              );
            }
          },
        },
      ]
    );
  };

  const getNextStatusAction = (currentStatus) => {
    switch (currentStatus) {
      case "ACCEPTED":
        return { status: "SCHEDULED", label: "Mark Scheduled", icon: "calendar" };
      case "SCHEDULED":
        return { status: "PROVIDER_ON_WAY", label: "I am On My Way", icon: "navigate" };
      case "PROVIDER_ON_WAY":
        return { status: "IN_PROGRESS", label: "Start Service", icon: "play" };
      case "IN_PROGRESS":
        return { status: "COMPLETED", label: "Complete Job", icon: "checkmark-circle" };
      default:
        return null;
    }
  };

  const renderJobItem = ({ item }) => {
    const isActing = actionLoadingId === item._id;
    const nextAction = getNextStatusAction(item.status);
    const hasUnconfirmedCash =
      (item.status === "COMPLETED" || item.status === "PAID") &&
      item.payment?.paymentMethod === "CASH" &&
      item.payment?.status !== "COMPLETED";

    return (
      <Card style={styles.jobCard}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.bookingNumber}>{item.bookingNumber}</Text>
            <Text style={styles.serviceName}>{item.service?.name || "Service"}</Text>
          </View>
          <Badge status={item.status} />
        </View>

        {/* Customer & Location */}
        <View style={styles.detailRow}>
          <Ionicons name="person-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.detailText}>
            {item.customer?.firstName} {item.customer?.lastName} ({item.customer?.phone || "No phone"})
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.detailText}>
            {item.address?.street ? `${item.address.street}, ` : ""}
            {item.address?.locality || "Kathmandu"}
            {item.address?.city ? `, ${item.address.city}` : ""}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.detailText}>
            {new Date(item.schedule?.date).toLocaleDateString()} ({item.schedule?.timeSlot})
          </Text>
        </View>

        {/* Price & Payment info */}
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Total Amount:</Text>
          <Text style={styles.priceValue}>NPR {item.pricing?.totalAmount || 0}</Text>
        </View>

        {/* Action Controls */}
        {item.status === "PENDING" && (
          <View style={styles.actionRow}>
            <View style={{ flex: 1, marginRight: spacing.sm }}>
              <Button
                title="Reject"
                variant="outline"
                size="sm"
                loading={isActing}
                onPress={() => handleReject(item._id)}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                title="Accept"
                size="sm"
                loading={isActing}
                onPress={() => handleAccept(item._id)}
              />
            </View>
          </View>
        )}

        {nextAction && (
          <View style={styles.singleAction}>
            <Button
              title={nextAction.label}
              size="sm"
              loading={isActing}
              onPress={() => handleStatusAdvance(item._id, nextAction.status, nextAction.label)}
            />
          </View>
        )}

        {hasUnconfirmedCash && (
          <View style={styles.cashConfirmBox}>
            <View style={{ flex: 1, marginRight: spacing.sm }}>
              <Text style={styles.cashNotice}>Cash payment pending verification</Text>
            </View>
            <Button
              title="Confirm Cash"
              size="sm"
              variant="secondary"
              onPress={() => handleConfirmCash(item.payment._id)}
            />
          </View>
        )}
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <Text style={styles.screenTitle}>My Service Jobs</Text>
        <Text style={styles.screenSub}>Manage your bookings and dispatch status</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tabItem, activeTab === tab.id && styles.activeTabItem]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Text
              style={[
                styles.tabLabel,
                activeTab === tab.id && styles.activeTabLabel,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredBookings}
          renderItem={renderJobItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="clipboard-outline" size={48} color={colors.textLight} />
              <Text style={styles.emptyTitle}>No jobs found</Text>
              <Text style={styles.emptySub}>
                {activeTab === "REQUESTS"
                  ? "You have no pending booking requests right now."
                  : activeTab === "ACTIVE"
                  ? "No jobs are currently in progress."
                  : "No completed jobs history."}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: 54,
    paddingBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  screenTitle: {
    ...typography.h2,
    color: colors.text,
  },
  screenSub: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabItem: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  activeTabItem: {
    borderBottomColor: colors.primary,
  },
  tabLabel: {
    ...typography.bodyBold,
    color: colors.textSecondary,
    fontSize: 13,
  },
  activeTabLabel: {
    color: colors.primary,
  },
  listContent: {
    padding: spacing.lg,
  },
  jobCard: {
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.sm,
  },
  bookingNumber: {
    ...typography.caption,
    fontWeight: "700",
    color: colors.primary,
  },
  serviceName: {
    ...typography.h3,
    color: colors.text,
    marginTop: 2,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },
  detailText: {
    ...typography.body,
    fontSize: 13,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
    flex: 1,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  priceLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  priceValue: {
    ...typography.bodyBold,
    color: colors.primary,
    fontSize: 15,
  },
  actionRow: {
    flexDirection: "row",
    marginTop: spacing.md,
  },
  singleAction: {
    marginTop: spacing.md,
  },
  cashConfirmBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
  },
  cashNotice: {
    ...typography.caption,
    color: "#92400E",
    fontWeight: "600",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xxl,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.text,
    marginTop: spacing.md,
  },
  emptySub: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.xs,
    paddingHorizontal: spacing.lg,
  },
});

export default ProviderJobsScreen;
