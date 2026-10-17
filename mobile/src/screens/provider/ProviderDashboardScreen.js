import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import { getMyProviderProfileApi } from "../../api/providers.api";
import { getBookingsApi } from "../../api/bookings.api";
import { Card, Badge, Button } from "../../components/common";
import { colors, typography, spacing, borderRadius } from "../../theme";

export const ProviderDashboardScreen = ({ navigation }) => {
  const { user } = useAuth();

  const [providerProfile, setProviderProfile] = useState(null);
  const [activeJobs, setActiveJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const [profRes, bookRes] = await Promise.all([
        getMyProviderProfileApi().catch(() => ({ data: { provider: null } })),
        getBookingsApi({ limit: 5 }).catch(() => ({ data: { bookings: [] } })),
      ]);

      if (profRes.data?.provider) {
        setProviderProfile(profRes.data.provider);
      }
      if (bookRes.data?.bookings) {
        setActiveJobs(bookRes.data.bookings);
      }
    } catch (e) {
      console.warn("Failed to load provider dashboard", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  return (
    <View style={styles.container}>
      {/* Provider Header */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.greetingText}>
            Namaste, {providerProfile?.businessName || user?.firstName} 🛠️
          </Text>
          <Text style={styles.roleSub}>Provider Dashboard</Text>
        </View>

        <Badge
          status={providerProfile?.verificationStatus || "VERIFIED"}
          label={providerProfile?.verificationStatus || "VERIFIED"}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Statistics Grid */}
        <View style={styles.statsGrid}>
          <Card style={styles.statCard}>
            <Ionicons name="star" size={24} color="#F59E0B" />
            <Text style={styles.statVal}>
              {providerProfile?.stats?.averageRating
                ? providerProfile.stats.averageRating.toFixed(1)
                : "5.0"}
            </Text>
            <Text style={styles.statLabel}>Avg Rating</Text>
          </Card>

          <Card style={styles.statCard}>
            <Ionicons name="checkmark-done-circle" size={24} color={colors.success} />
            <Text style={styles.statVal}>
              {providerProfile?.stats?.completedJobs || activeJobs.filter(j => j.status === 'PAID').length}
            </Text>
            <Text style={styles.statLabel}>Completed</Text>
          </Card>

          <Card style={styles.statCard}>
            <Ionicons name="chatbubbles" size={24} color={colors.primary} />
            <Text style={styles.statVal}>
              {providerProfile?.stats?.totalReviews || 0}
            </Text>
            <Text style={styles.statLabel}>Reviews</Text>
          </Card>
        </View>

        {/* Quick Action Banner */}
        <Card style={styles.actionBanner}>
          <View style={styles.bannerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerTitle}>Manage Your Job Requests</Text>
              <Text style={styles.bannerSub}>
                Accept incoming bookings and track job lifecycle progress
              </Text>
            </View>
            <Button
              title="View Jobs"
              size="sm"
              onPress={() => navigation.navigate("ProviderJobsTab")}
            />
          </View>
        </Card>

        {/* Recent Bookings Overview */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Bookings</Text>
          <TouchableOpacity onPress={() => navigation.navigate("ProviderJobsTab")}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : activeJobs.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyText}>No recent booking requests yet.</Text>
          </Card>
        ) : (
          activeJobs.slice(0, 3).map((job) => (
            <Card
              key={job._id}
              style={styles.jobCard}
              onPress={() => navigation.navigate("ProviderJobsTab")}
            >
              <View style={styles.jobTop}>
                <Text style={styles.jobNumber}>{job.bookingNumber}</Text>
                <Badge status={job.status} />
              </View>
              <Text style={styles.jobService}>
                {job.service?.name || "Service Request"}
              </Text>
              <Text style={styles.jobCustomer}>
                Customer: {job.customer?.firstName} {job.customer?.lastName}
              </Text>
              <Text style={styles.jobPrice}>NPR {job.pricing?.totalAmount || 0}</Text>
            </Card>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: 54,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  greetingText: {
    ...typography.h3,
    color: colors.text,
  },
  roleSub: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: "600",
    marginTop: 2,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.md,
    marginHorizontal: 4,
  },
  statVal: {
    ...typography.h2,
    color: colors.text,
    marginTop: spacing.xs,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  actionBanner: {
    backgroundColor: colors.primarySoft,
    borderColor: "#BFDBFE",
    marginBottom: spacing.lg,
  },
  bannerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  bannerTitle: {
    ...typography.bodyBold,
    color: colors.primaryDark,
  },
  bannerSub: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
    marginRight: spacing.sm,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
  },
  viewAllText: {
    ...typography.bodyBold,
    color: colors.primary,
  },
  jobCard: {
    marginBottom: spacing.sm,
  },
  jobTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  jobNumber: {
    ...typography.caption,
    fontWeight: "700",
    color: colors.primary,
  },
  jobService: {
    ...typography.bodyBold,
    color: colors.text,
    marginTop: 4,
  },
  jobCustomer: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: 2,
  },
  jobPrice: {
    ...typography.bodyBold,
    color: colors.primary,
    marginTop: 6,
  },
  emptyCard: {
    padding: spacing.lg,
    alignItems: "center",
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
  },
});

export default ProviderDashboardScreen;
