import React from "react";
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { colors, typography, spacing, borderRadius } from "../../theme";

export const Button = ({
  title,
  onPress,
  variant = "primary", // primary, secondary, outline, danger, ghost
  size = "md", // sm, md, lg
  disabled = false,
  loading = false,
  icon,
  style,
  textStyle,
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case "secondary":
        return {
          container: { backgroundColor: colors.secondary },
          text: { color: colors.textInverse },
        };
      case "outline":
        return {
          container: {
            backgroundColor: "transparent",
            borderWidth: 1.5,
            borderColor: colors.primary,
          },
          text: { color: colors.primary },
        };
      case "danger":
        return {
          container: { backgroundColor: colors.danger },
          text: { color: colors.textInverse },
        };
      case "ghost":
        return {
          container: { backgroundColor: "transparent" },
          text: { color: colors.primary },
        };
      case "primary":
      default:
        return {
          container: { backgroundColor: colors.primary },
          text: { color: colors.textInverse },
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case "sm":
        return {
          container: { paddingVertical: 8, paddingHorizontal: 12 },
          text: { fontSize: 13 },
        };
      case "lg":
        return {
          container: { paddingVertical: 16, paddingHorizontal: 24 },
          text: { fontSize: 16 },
        };
      case "md":
      default:
        return {
          container: { paddingVertical: 12, paddingHorizontal: 20 },
          text: { fontSize: 15 },
        };
    }
  };

  const vStyles = getVariantStyles();
  const sStyles = getSizeStyles();

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.baseContainer,
        vStyles.container,
        sStyles.container,
        (disabled || loading) && styles.disabledContainer,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === "outline" ? colors.primary : colors.textInverse}
        />
      ) : (
        <>
          {icon}
          <Text
            style={[
              styles.baseText,
              vStyles.text,
              sStyles.text,
              icon && { marginLeft: spacing.sm },
              textStyle,
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  baseContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: borderRadius.md,
  },
  baseText: {
    ...typography.button,
  },
  disabledContainer: {
    opacity: 0.6,
  },
});

export default Button;
