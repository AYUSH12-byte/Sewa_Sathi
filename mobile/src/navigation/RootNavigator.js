import React from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useAuth } from "../context/AuthContext";
import AuthNavigator from "./AuthNavigator";
import CustomerNavigator from "./CustomerNavigator";
import ProviderNavigator from "./ProviderNavigator";
import { colors } from "../theme";

export const RootNavigator = () => {
  const { user, token, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!token || !user) {
    return <AuthNavigator />;
  }

  if (user.role === "PROVIDER") {
    return <ProviderNavigator />;
  }

  return <CustomerNavigator />;
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
  },
});

export default RootNavigator;
