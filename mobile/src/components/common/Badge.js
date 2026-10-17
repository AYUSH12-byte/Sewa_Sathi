import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, typography, spacing, borderRadius } from "../../theme";

export const Badge = ({ status, label, style }) => {
  const getBadgeStyle = () => {
    const s = String(status).toUpperCase();
    switch (s) {
      case "ACCEPTED":
      case "VERIFIED":
      case "PAID":
      case "ACTIVE":
      case "COMPLETED":
        return {
          bg: colors.successSoft,
          text: colors.success,
        };
      case "PENDING":
      case "SCHEDULED":
      case "PROVIDER_ON_WAY":
      case "IN_PROGRESS":
      case "UNDER_REVIEW":
        return {
          bg: colors.warningSoft,
          text: colors.warning,
        };
      case "REJECTED":
      case "CANCELLED":
      case "CANCELLED_BY_CUSTOMER":
      case "CANCELLED_BY_PROVIDER":
      case "FAILED":
      case "SUSPENDED":
        return {
          bg: colors.dangerSoft,
          text: colors.danger,
        };
      default:
        return {
          bg: colors.infoSoft,
          text: colors.info,
        };
    }
  };

  const bStyle = getBadgeStyle();
  const displayLabel = label || String(status).replace(/_/g, " ");

  return (
    <View style={[styles.badge, { backgroundColor: bStyle.bg }, style]}>
      <Text style={[styles.text, { color: bStyle.text }]}>{displayLabel}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    alignSelf: "flex-start",
  },
  text: {
    ...typography.caption,
    fontWeight: "700",
    textTransform: "uppercase",
    fontSize: 11,
  },
});

export default Badge;
