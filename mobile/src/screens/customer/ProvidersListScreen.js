import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { searchProvidersApi } from "../../api/providers.api";
import { Card, Badge } from "../../components/common";
import { colors, typography, spacing, borderRadius } from "../../theme";

export const ProvidersListScreen = ({ route, navigation }) => {
  const categoryId = route.params?.categoryId;
  const categoryName = route.params?.categoryName;

  const [searchQuery, setSearchQuery] = useState("");
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchProviders = async (query = searchQuery) => {
    try {
      const params = { limit: 20 };
      if (categoryId) params.category = categoryId;
      if (query.trim()) params.search = query.trim();

      const res = await searchProvidersApi(params);
      const rawProviders = Array.isArray(res.data)
        ? res.data
        : (res.data?.providers || res.data?.data || []);

      const normalized = rawProviders.map((item) =>
        item.provider
          ? { ...item.provider, matchScore: item.matchScore, services: item.services }
          : item
      );

      setProviders(normalized);
    } catch (e) {
      console.warn("Failed to fetch providers", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, [categoryId]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProviders();
  };

  const handleSearchSubmit = () => {
    setLoading(true);
    fetchProviders(searchQuery);
  };

  const renderItem = ({ item }) => (
    <Card
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
            <Badge status={item.verificationStatus || "VERIFIED"} />
          </View>

          <Text style={styles.providerBio} numberOfLines={2}>
            {item.bio || "Professional certified service specialist"}
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

          <View style={styles.rateRow}>
            <Text style={styles.rateLabel}>Hourly Rate: </Text>
            <Text style={styles.rateValue}>NPR {item.hourlyRate || 500} / hr</Text>
          </View>
        </View>
      </View>
    </Card>
  );

  return (
    <View style={styles.container}>
      {/* Search Header */}
      <View style={styles.topHeader}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {categoryName || "Service Providers"}
          </Text>
        </View>

        {/* Search Input Bar */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search provider name or service..."
            placeholderTextColor={colors.textLight}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearchSubmit}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setSearchQuery("");
                fetchProviders("");
              }}
            >
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={providers}
          renderItem={renderItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={48} color={colors.textLight} />
              <Text style={styles.emptyTitle}>No Providers Found</Text>
              <Text style={styles.emptySub}>
                Try adjusting your search criteria or explore other categories.
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
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  backButton: {
    marginRight: spacing.sm,
    padding: 4,
  },
  headerTitle: {
    ...typography.h2,
    color: colors.text,
    flex: 1,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing.sm,
    ...typography.body,
    color: colors.text,
  },
  listContent: {
    padding: spacing.lg,
  },
  providerCard: {
    marginBottom: spacing.md,
  },
  providerRow: {
    flexDirection: "row",
  },
  providerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primarySoft,
    justifyContent: "center",
    alignItems: "center",
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  providerBusinessName: {
    ...typography.h3,
    color: colors.text,
    flex: 1,
    marginRight: spacing.xs,
  },
  providerBio: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 4,
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
    color: colors.textLight,
    marginHorizontal: 6,
  },
  experienceText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  rateRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },
  rateLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  rateValue: {
    ...typography.caption,
    fontWeight: "700",
    color: colors.primary,
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

export default ProvidersListScreen;
