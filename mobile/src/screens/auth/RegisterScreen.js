import React, { useState } from "react";
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import { Button, Input } from "../../components/common";
import { colors, typography, spacing, borderRadius } from "../../theme";

export const RegisterScreen = ({ navigation }) => {
  const { register } = useAuth();

  const [role, setRole] = useState("CUSTOMER"); // CUSTOMER or PROVIDER
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const newErrors = {};

    if (!firstName.trim()) {
      newErrors.firstName = "First name is required";
    }

    if (!lastName.trim()) {
      newErrors.lastName = "Last name is required";
    }

    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (!/^[0-9]{10}$/.test(phone.trim())) {
      newErrors.phone = "Phone must be a valid 10-digit number";
    }

    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;

    setLoading(true);
    const result = await register({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      password,
      role,
    });
    setLoading(false);

    if (!result.success) {
      Alert.alert("Registration Failed", result.message);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Create Account</Text>
          <Text style={styles.formSubtitle}>Join SewaSathi marketplace</Text>

          {/* Role Selector Tabs */}
          <View style={styles.roleContainer}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={[
                styles.roleButton,
                role === "CUSTOMER" && styles.roleButtonActive,
              ]}
              onPress={() => setRole("CUSTOMER")}
            >
              <Ionicons
                name="person-outline"
                size={18}
                color={role === "CUSTOMER" ? colors.primary : colors.textSecondary}
              />
              <Text
                style={[
                  styles.roleText,
                  role === "CUSTOMER" && styles.roleTextActive,
                ]}
              >
                Customer
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              style={[
                styles.roleButton,
                role === "PROVIDER" && styles.roleButtonActive,
              ]}
              onPress={() => setRole("PROVIDER")}
            >
              <Ionicons
                name="construct-outline"
                size={18}
                color={role === "PROVIDER" ? colors.primary : colors.textSecondary}
              />
              <Text
                style={[
                  styles.roleText,
                  role === "PROVIDER" && styles.roleTextActive,
                ]}
              >
                Service Provider
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.nameRow}>
            <View style={{ flex: 1, marginRight: spacing.sm }}>
              <Input
                label="First Name"
                placeholder="e.g. Ram"
                value={firstName}
                onChangeText={(text) => {
                  setFirstName(text);
                  if (errors.firstName) setErrors({ ...errors, firstName: null });
                }}
                error={errors.firstName}
              />
            </View>
            <View style={{ flex: 1, marginLeft: spacing.sm }}>
              <Input
                label="Last Name"
                placeholder="e.g. Sharma"
                value={lastName}
                onChangeText={(text) => {
                  setLastName(text);
                  if (errors.lastName) setErrors({ ...errors, lastName: null });
                }}
                error={errors.lastName}
              />
            </View>
          </View>

          <Input
            label="Email Address"
            placeholder="e.g. ram@example.com"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (errors.email) setErrors({ ...errors, email: null });
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email}
            leftIcon={
              <Ionicons
                name="mail-outline"
                size={20}
                color={colors.textSecondary}
              />
            }
          />

          <Input
            label="Mobile Phone"
            placeholder="e.g. 9841234567"
            value={phone}
            onChangeText={(text) => {
              setPhone(text);
              if (errors.phone) setErrors({ ...errors, phone: null });
            }}
            keyboardType="phone-pad"
            error={errors.phone}
            leftIcon={
              <Ionicons
                name="call-outline"
                size={20}
                color={colors.textSecondary}
              />
            }
          />

          <Input
            label="Password"
            placeholder="At least 8 characters"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (errors.password) setErrors({ ...errors, password: null });
            }}
            secureTextEntry
            error={errors.password}
            leftIcon={
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color={colors.textSecondary}
              />
            }
          />

          <Button
            title={role === "PROVIDER" ? "Register as Provider" : "Register as Customer"}
            onPress={handleRegister}
            loading={loading}
            style={styles.registerButton}
          />

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate("Login")}>
              <Text style={styles.loginLink}>Log In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.lg,
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingBottom: 40,
  },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  formTitle: {
    ...typography.h2,
    color: colors.text,
  },
  formSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  roleContainer: {
    flexDirection: "row",
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: 4,
    marginBottom: spacing.lg,
  },
  roleButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: borderRadius.md,
  },
  roleButtonActive: {
    backgroundColor: colors.surface,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  roleText: {
    ...typography.bodyBold,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
  roleTextActive: {
    color: colors.primary,
  },
  nameRow: {
    flexDirection: "row",
  },
  registerButton: {
    marginTop: spacing.sm,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: spacing.lg,
  },
  footerText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  loginLink: {
    ...typography.bodyBold,
    color: colors.primary,
  },
});

export default RegisterScreen;
