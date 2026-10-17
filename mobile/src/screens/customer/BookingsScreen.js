import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getBookingsApi } from "../../api/bookings.api";
import { Card, Badge } from "../../components/common";
import { colors, typography, spacing, borderRadius } from "../../theme";

const TABS = ["ALL", "ACTIVE", "COMPLETED", "CANCELLED"];

export const BookingsScreen = ({ navigation }) => {
  const [selectedTab, setSelectedTab] = useState("ALL");
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBookings = async () => {
    try {
      const res = await getBookingsApi();
      if (res.data?.bookings) {
        setBookings(res.data.bookings);
      }
    } catch (e) {
      console.warn("Failed to fetch bookings", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      fetchBookings();
    });
    return unsubscribe;
  }, [navigation]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchBookings();
  };

  const filteredBookings = bookings.filter((b) => {
    if (selectedTab === "ACTIVE") {
      return [
        "PENDING",
        "ACCEPTED",
        "SCHEDULED",
        "PROVIDER_ON_WAY",
        "IN_PROGRESS",
      ].includes(b.status);
    }
    if (selectedTab === "COMPLETED") {
      return ["COMPLETED", "PAYMENT_PENDING", "PAID", "REVIEWED"].includes(
        b.status
      );
    }
    if (selectedTab === "CANCELLED") {
      return [
        "REJECTED",
        "CANCELLED_BY_CUSTOMER",
        "CANCELLED_BY_PROVIDER",
        "EXPIRED",
      ].includes(b.status);
    }
    return true;
  });

  const renderBookingItem = ({ item }) => (
    <Card
      style={styles.bookingCard}
      onPress={() =>
        navigation.navigate("BookingDetail", { bookingId: item._id })
      }
    >
      <View style={styles.cardHeader}>
        <View style={styles.numberRow}>
          <Ionicons name="receipt-outline" size={16} color={colors.primary} />
          <Text style={styles.bookingNumber}>{item.bookingNumber}</Text>
        </View>
        <Badge status={item.status} />
      </View>

      <Text style={styles.serviceName}>{item.service?.name || "Local Service"}</Text>
      <Text style={styles.providerName}>
        Provider: {item.provider?.businessName || "Assigned Provider"}
      </Text>

      <View style={styles.divider} />

      <View style={styles.cardFooter}>
        <View style={styles.dateRow}>
          <Ionicons
            name="calendar-outline"
            size={14}
            color={colors.textSecondary}
          />
          <Text style={styles.dateText}>
            {new Date(item.scheduledDate).toLocaleDateString()} at{" "}
            {item.startTime}
          </Text>
        </View>

        <Text style={styles.priceText}>
          NPR {item.pricing?.totalAmount || 0}
        </Text>
      </View>
    </Card>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Bookings</Text>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabBar}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabButton, selectedTab === tab && styles.tabButtonActive]}
            onPress={() => setSelectedTab(tab)}
          >
            <Text
              style={[
                styles.tabText,
                selectedTab === tab && styles.tabTextActive,
              ]}
            >
              {tab.charAt(0) + tab.slice(1).toLowerCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : filteredBookings.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons
            name="calendar-clear-outline"
            size={64}
            color={colors.disabled}
          />
          <Text style={styles.emptyTitle}>No bookings found</Text>
          <Text style={styles.emptySubtitle}>
            When you book a local service, it will appear here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredBookings}
          keyExtractor={(item) => item._id}
          renderItem={renderBookingItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
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
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: 54,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
  },
  title: {
    ...typography.h2,
    color: colors.text,
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: borderRadius.full,
    marginRight: spacing.xs,
  },
  tabButtonActive: {
    backgroundColor: colors.primarySoft,
  },
  tabText: {
    ...typography.bodyBold,
    color: colors.textSecondary,
    fontSize: 13,
  },
  tabTextActive: {
    color: colors.primary,
  },
  listContent: {
    padding: spacing.lg,
  },
  bookingCard: {
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  numberRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  bookingNumber: {
    ...typography.caption,
    fontWeight: "600",
    color: colors.primary,
    marginLeft: 4,
  },
  serviceName: {
    ...typography.h3,
    color: colors.text,
    marginTop: 2,
  },
  providerName: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  dateText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  priceText: {
    ...typography.bodyBold,
    color: colors.primary,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.text,
    marginTop: spacing.md,
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.xs,
  },
});

export default BookingsScreen;
