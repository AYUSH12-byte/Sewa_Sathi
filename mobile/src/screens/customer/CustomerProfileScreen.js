import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import { Card, Button, Badge } from "../../components/common";
import { colors, typography, spacing, borderRadius } from "../../theme";

export const CustomerProfileScreen = ({ navigation }) => {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert("Log Out", "Are you sure you want to log out of SewaSathi?", [
      { text: "Cancel", style: "cancel" },
      { text: "Log Out", style: "destructive", onPress: logout },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profile Card */}
      <Card style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.firstName ? user.firstName.charAt(0) : "U"}
          </Text>
        </View>

        <Text style={styles.userName}>
          {user?.firstName} {user?.lastName}
        </Text>
        <Text style={styles.userEmail}>{user?.email}</Text>

        <View style={styles.badgeRow}>
          <Badge status="ACTIVE" label="Customer Account" />
        </View>
      </Card>

      {/* Account Details */}
      <Card>
        <Text style={styles.sectionTitle}>Contact Details</Text>

        <View style={styles.detailRow}>
          <Ionicons name="call-outline" size={18} color={colors.textSecondary} />
          <Text style={styles.detailLabel}>Mobile</Text>
          <Text style={styles.detailVal}>{user?.phone || "Not set"}</Text>
        </View>

        <View style={styles.detailRow}>
          <Ionicons name="mail-outline" size={18} color={colors.textSecondary} />
          <Text style={styles.detailLabel}>Email</Text>
          <Text style={styles.detailVal}>{user?.email}</Text>
        </View>

        <View style={styles.detailRow}>
          <Ionicons name="location-outline" size={18} color={colors.textSecondary} />
          <Text style={styles.detailLabel}>Region</Text>
          <Text style={styles.detailVal}>Nepal</Text>
        </View>
      </Card>

      {/* Logout */}
      <Button
        title="Log Out"
        variant="outline"
        onPress={handleLogout}
        icon={<Ionicons name="log-out-outline" size={18} color={colors.primary} />}
        style={styles.logoutBtn}
      />
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
  },
  profileCard: {
    alignItems: "center",
    paddingVertical: spacing.xl,
    marginBottom: spacing.md,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  avatarText: {
    ...typography.h1,
    color: colors.primary,
  },
  userName: {
    ...typography.h2,
    color: colors.text,
  },
  userEmail: {
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
    marginBottom: spacing.md,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailLabel: {
    ...typography.body,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
    flex: 1,
  },
  detailVal: {
    ...typography.bodyBold,
    color: colors.text,
  },
  logoutBtn: {
    marginTop: spacing.lg,
  },
});

export default CustomerProfileScreen;
