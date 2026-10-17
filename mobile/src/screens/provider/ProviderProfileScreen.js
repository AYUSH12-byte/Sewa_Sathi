import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import { getMyProviderProfileApi } from "../../api/providers.api";
import { Card, Badge, Button } from "../../components/common";
import { colors, typography, spacing, borderRadius } from "../../theme";

export const ProviderProfileScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const [providerProfile, setProviderProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await getMyProviderProfileApi();
        if (res.data?.provider) {
          setProviderProfile(res.data.provider);
        }
      } catch (e) {
        console.warn("Could not load provider profile details", e);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to log out of SewaSathi?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Top Header Profile Card */}
      <Card style={styles.profileCard}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>
            {user?.firstName?.[0]?.toUpperCase() || "P"}
          </Text>
        </View>

        <Text style={styles.userName}>
          {providerProfile?.businessName || `${user?.firstName} ${user?.lastName}`}
        </Text>
        <Text style={styles.userRole}>
          {user?.firstName} {user?.lastName} • Service Partner
        </Text>

        <View style={styles.badgeRow}>
          <Badge
            status={providerProfile?.verificationStatus || "VERIFIED"}
            label={`Status: ${providerProfile?.verificationStatus || "VERIFIED"}`}
          />
        </View>
      </Card>

      {/* Provider Details Card */}
      <Text style={styles.sectionTitle}>Business & Experience</Text>
      <Card style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Ionicons name="briefcase-outline" size={20} color={colors.primary} />
          <View style={styles.infoTextContainer}>
            <Text style={styles.infoLabel}>Experience</Text>
            <Text style={styles.infoValue}>
              {providerProfile?.experienceYears || 2} Years in Service
            </Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="cash-outline" size={20} color={colors.primary} />
          <View style={styles.infoTextContainer}>
            <Text style={styles.infoLabel}>Standard Hourly Rate</Text>
            <Text style={styles.infoValue}>
              NPR {providerProfile?.hourlyRate || 500} / hr
            </Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="mail-outline" size={20} color={colors.primary} />
          <View style={styles.infoTextContainer}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{user?.email}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="call-outline" size={20} color={colors.primary} />
          <View style={styles.infoTextContainer}>
            <Text style={styles.infoLabel}>Phone</Text>
            <Text style={styles.infoValue}>{user?.phone || "+977 9800000000"}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="location-outline" size={20} color={colors.primary} />
          <View style={styles.infoTextContainer}>
            <Text style={styles.infoLabel}>Base City / Area</Text>
            <Text style={styles.infoValue}>
              {providerProfile?.address?.city || "Kathmandu"},{" "}
              {providerProfile?.address?.locality || "Bagmati"}
            </Text>
          </View>
        </View>

        {providerProfile?.bio && (
          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Bio</Text>
              <Text style={styles.infoValue}>{providerProfile.bio}</Text>
            </View>
          </View>
        )}
      </Card>

      {/* Services Offered */}
      {providerProfile?.servicesOffered && providerProfile.servicesOffered.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Enrolled Services</Text>
          <Card style={styles.infoCard}>
            {providerProfile.servicesOffered.map((srv, idx) => (
              <View
                key={srv._id || idx}
                style={[
                  styles.serviceRow,
                  idx === providerProfile.servicesOffered.length - 1 && { borderBottomWidth: 0 },
                ]}
              >
                <Ionicons name="construct-outline" size={18} color={colors.primary} />
                <Text style={styles.serviceItemName}>
                  {srv.service?.name || "Service Item"}
                </Text>
                <Text style={styles.serviceItemPrice}>
                  NPR {srv.price || 0}
                </Text>
              </View>
            ))}
          </Card>
        </>
      )}

      {/* App Support & Settings */}
      <Text style={styles.sectionTitle}>App Preferences</Text>
      <Card style={styles.infoCard}>
        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuLeft}>
            <Ionicons name="shield-checkmark-outline" size={20} color={colors.textSecondary} />
            <Text style={styles.menuLabel}>KYC Verification Documents</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuLeft}>
            <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} />
            <Text style={styles.menuLabel}>Weekly Availability Schedule</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.menuItem, { borderBottomWidth: 0 }]}>
          <View style={styles.menuLeft}>
            <Ionicons name="help-circle-outline" size={20} color={colors.textSecondary} />
            <Text style={styles.menuLabel}>SewaSathi Partner Support</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
        </TouchableOpacity>
      </Card>

      {/* Logout */}
      <View style={styles.logoutContainer}>
        <Button
          title="Log Out of Partner Account"
          variant="outline"
          onPress={handleLogout}
        />
      </View>

      <Text style={styles.versionText}>SewaSathi Provider v1.0.0 (Nepal)</Text>
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
    paddingTop: 54,
    paddingBottom: spacing.xxl,
  },
  profileCard: {
    alignItems: "center",
    paddingVertical: spacing.xl,
    marginBottom: spacing.lg,
  },
  avatarContainer: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  avatarText: {
    ...typography.h1,
    color: "#fff",
  },
  userName: {
    ...typography.h2,
    color: colors.text,
  },
  userRole: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: 2,
  },
  badgeRow: {
    marginTop: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  infoCard: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoTextContainer: {
    marginLeft: spacing.md,
    flex: 1,
  },
  infoLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  infoValue: {
    ...typography.bodyBold,
    color: colors.text,
    marginTop: 2,
  },
  serviceRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  serviceItemName: {
    ...typography.bodyBold,
    color: colors.text,
    marginLeft: spacing.sm,
    flex: 1,
  },
  serviceItemPrice: {
    ...typography.bodyBold,
    color: colors.primary,
  },
  menuItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  menuLabel: {
    ...typography.body,
    color: colors.text,
    marginLeft: spacing.md,
  },
  logoutContainer: {
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  versionText: {
    ...typography.caption,
    textAlign: "center",
    color: colors.textLight,
  },
});

export default ProviderProfileScreen;
