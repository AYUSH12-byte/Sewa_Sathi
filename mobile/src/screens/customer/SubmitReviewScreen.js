import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { submitReviewApi } from "../../api/reviews.api";
import { Card, Button, Input } from "../../components/common";
import { colors, typography, spacing, borderRadius } from "../../theme";

export const SubmitReviewScreen = ({ route, navigation }) => {
  const { bookingId, providerName } = route.params;

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await submitReviewApi(bookingId, { rating, comment });
      Alert.alert(
        "Review Submitted",
        "Thank you! Your feedback helps other customers and improves provider ratings.",
        [{ text: "OK", onPress: () => navigation.navigate("BookingsTab") }]
      );
    } catch (e) {
      Alert.alert("Submission Failed", e.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.card}>
        <Text style={styles.title}>Rate Your Experience</Text>
        <Text style={styles.subtitle}>
          How was the service provided by {providerName || "your provider"}?
        </Text>

        {/* 5-Star Interactive Selector */}
        <View style={styles.starsContainer}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity
              key={star}
              activeOpacity={0.7}
              onPress={() => setRating(star)}
              style={styles.starTouch}
            >
              <Ionicons
                name={star <= rating ? "star" : "star-outline"}
                size={40}
                color={star <= rating ? "#F59E0B" : colors.disabled}
              />
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.ratingText}>
          {rating === 5 && "⭐ Outstanding service!"}
          {rating === 4 && "⭐ Very good service"}
          {rating === 3 && "⭐ Satisfactory"}
          {rating === 2 && "⭐ Below expectations"}
          {rating === 1 && "⭐ Poor experience"}
        </Text>

        <Input
          label="Your Feedback (Optional)"
          placeholder="Describe the quality of work, punctuality, and professionalism..."
          value={comment}
          onChangeText={setComment}
          multiline
          numberOfLines={4}
          style={{ marginTop: spacing.md }}
        />

        <Button
          title="Submit Review"
          onPress={handleSubmit}
          loading={loading}
          style={styles.submitBtn}
        />
      </Card>
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
  },
  card: {
    padding: spacing.lg,
  },
  title: {
    ...typography.h2,
    color: colors.text,
    textAlign: "center",
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  starsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginVertical: spacing.md,
  },
  starTouch: {
    padding: spacing.xs,
  },
  ratingText: {
    ...typography.bodyBold,
    color: colors.text,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  submitBtn: {
    marginTop: spacing.md,
  },
});

export default SubmitReviewScreen;
