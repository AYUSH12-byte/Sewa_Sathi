import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";

import ProviderDashboardScreen from "../screens/provider/ProviderDashboardScreen";
import ProviderJobsScreen from "../screens/provider/ProviderJobsScreen";
import ProviderProfileScreen from "../screens/provider/ProviderProfileScreen";
import BookingDetailScreen from "../screens/customer/BookingDetailScreen";
import { colors } from "../theme";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const ProviderTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === "Dashboard") {
            iconName = focused ? "grid" : "grid-outline";
          } else if (route.name === "ProviderJobsTab") {
            iconName = focused ? "briefcase" : "briefcase-outline";
          } else if (route.name === "ProviderProfileTab") {
            iconName = focused ? "person" : "person-outline";
          }
          return <Ionicons name={iconName} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={ProviderDashboardScreen}
        options={{ tabBarLabel: "Dashboard" }}
      />
      <Tab.Screen
        name="ProviderJobsTab"
        component={ProviderJobsScreen}
        options={{ tabBarLabel: "Jobs" }}
      />
      <Tab.Screen
        name="ProviderProfileTab"
        component={ProviderProfileScreen}
        options={{ tabBarLabel: "Profile" }}
      />
    </Tab.Navigator>
  );
};

export const ProviderNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProviderMain" component={ProviderTabs} />
      <Stack.Screen name="BookingDetail" component={BookingDetailScreen} />
    </Stack.Navigator>
  );
};

export default ProviderNavigator;
