import React from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { colors, spacing, borderRadius, shadows } from "../../theme";

export const Card = ({ children, onPress, style }) => {
  const Container = onPress ? TouchableOpacity : View;

  return (
    <Container
      activeOpacity={0.8}
      onPress={onPress}
      style={[styles.card, shadows.card, style]}
    >
      {children}
    </Container>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
});

export default Card;
