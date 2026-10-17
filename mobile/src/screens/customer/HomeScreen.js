import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import { getCategoriesApi } from "../../api/services.api";
import { searchProvidersApi } from "../../api/providers.api";
import { Card, Badge, Button } from "../../components/common";
import { colors, typography, spacing, borderRadius } from "../../theme";

export const HomeScreen = ({ navigation }) => {
  const { user } = useAuth();

  const [categories, setCategories] = useState([]);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const [catRes, provRes] = await Promise.all([
        getCategoriesApi().catch(() => ({ data: { categories: [] } })),
        searchProvidersApi({ limit: 5 }).catch(() => ({ data: { providers: [] } })),
      ]);

      if (catRes.data?.categories) {
        setCategories(catRes.data.categories);
      } else if (Array.isArray(catRes.data)) {
        setCategories(catRes.data);
      }

      const rawProviders = Array.isArray(provRes.data)
        ? provRes.data
        : (provRes.data?.providers || provRes.data?.data || []);

      const normalizedProviders = rawProviders.map((item) =>
        item.provider
          ? { ...item.provider, matchScore: item.matchScore, services: item.services }
          : item
      );

      setProviders(normalizedProviders);
    } catch (e) {
      console.warn("Failed to load home data", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const getCategoryIcon = (slug) => {
    switch (slug?.toLowerCase()) {
      case "plumbing":
        return "water-outline";
      case "electrical":
        return "flash-outline";
      case "cleaning":
        return "sparkles-outline";
      case "carpentry":
        return "hammer-outline";
      case "painting":
        return "color-palette-outline";
      case "appliance-repair":
        return "tv-outline";
      default:
        return "construct-outline";
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Bar Header */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.greetingText}>
            Namaste, {user?.firstName || "Customer"} 👋
          </Text>
          <View style={styles.locationRow}>
            <Ionicons name="location-sharp" size={14} color={colors.secondary} />
            <Text style={styles.locationText}>Kathmandu Valley, Nepal</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.profileBadge}>
          <Text style={styles.profileInitial}>
            {user?.firstName ? user.firstName.charAt(0) : "U"}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Hero Search Box */}
        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.searchBar}
          onPress={() => navigation.navigate("ProvidersList")}
        >
          <Ionicons name="search" size={20} color={colors.textSecondary} />
          <Text style={styles.searchPlaceholder}>
            Find plumber, electrician, mechanic...
          </Text>
        </TouchableOpacity>

        {/* Categories Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Categories</Text>
          <Text style={styles.sectionSubtitle}>Select a service need</Text>
        </View>

        {loading ? (
          <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 20 }} />
        ) : (
          <View style={styles.categoriesGrid}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat._id}
                style={styles.categoryItem}
                activeOpacity={0.7}
                onPress={() =>
                  navigation.navigate("ProvidersList", { categoryId: cat._id, categoryName: cat.name })
                }
              >
                <View style={styles.categoryIconCircle}>
                  <Ionicons
                    name={getCategoryIcon(cat.slug)}
                    size={24}
                    color={colors.primary}
                  />
                </View>
                <Text style={styles.categoryName} numberOfLines={1}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Top Service Providers */}
        <View style={[styles.sectionHeader, { marginTop: spacing.lg }]}>
          <Text style={styles.sectionTitle}>Verified Local Providers</Text>
          <Text style={styles.sectionSubtitle}>Top rated professionals ready to serve</Text>
        </View>

        {loading ? (
          <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 20 }} />
        ) : providers.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyText}>No service providers available right now.</Text>
          </Card>
        ) : (
          providers.map((item) => (
            <Card
              key={item._id}
              style={styles.providerCard}
              onPress={() =>
                navigation.navigate("ProviderDetail", { providerId: item._id })
              }
            >
              <View style={styles.providerRow}>
                <View style={styles.providerAvatar}>
                  <Ionicons name="person" size={24} color={colors.primary} />
                </View>

                <View style={{ flex: 1, marginLeft: spacing.md }}>
                  <View style={styles.titleRow}>
                    <Text style={styles.providerBusinessName} numberOfLines={1}>
                      {item.businessName || `${item.user?.firstName} ${item.user?.lastName}`}
                    </Text>
                    <Badge status="VERIFIED" />
                  </View>

                  <Text style={styles.providerBio} numberOfLines={1}>
                    {item.bio || "Local service specialist"}
                  </Text>

                  <View style={styles.metaRow}>
                    <Ionicons name="star" size={14} color="#F59E0B" />
                    <Text style={styles.ratingText}>
                      {item.stats?.averageRating ? item.stats.averageRating.toFixed(1) : "5.0"}
                    </Text>
                    <Text style={styles.reviewsCount}>
                      ({item.stats?.totalReviews || 0} reviews)
                    </Text>
                    <Text style={styles.bullet}>•</Text>
                    <Text style={styles.experienceText}>
                      {item.experienceYears || 1} yrs exp
                    </Text>
                  </View>
                </View>
              </View>
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
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  locationText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginLeft: 3,
  },
  profileBadge: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  profileInitial: {
    ...typography.bodyBold,
    color: colors.primary,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  searchPlaceholder: {
    ...typography.body,
    color: colors.placeholder,
    marginLeft: spacing.sm,
  },
  sectionHeader: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
  },
  sectionSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  categoriesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -spacing.xs,
  },
  categoryItem: {
    width: "33.33%",
    padding: spacing.xs,
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  categoryIconCircle: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  categoryName: {
    ...typography.caption,
    fontWeight: "600",
    color: colors.text,
    textAlign: "center",
  },
  providerCard: {
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  providerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  providerAvatar: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  providerBusinessName: {
    ...typography.bodyBold,
    color: colors.text,
    flex: 1,
    marginRight: spacing.xs,
  },
  providerBio: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },
  ratingText: {
    ...typography.caption,
    fontWeight: "700",
    color: colors.text,
    marginLeft: 3,
  },
  reviewsCount: {
    ...typography.caption,
    color: colors.textSecondary,
    marginLeft: 2,
  },
  bullet: {
    marginHorizontal: spacing.xs,
    color: colors.textSecondary,
  },
  experienceText: {
    ...typography.caption,
    color: colors.textSecondary,
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

export default HomeScreen;
