import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getProviderProfileApi } from "../../api/providers.api";
import { getProviderReviewsApi } from "../../api/reviews.api";
import { createBookingApi } from "../../api/bookings.api";
import { Card, Badge, Button, Input } from "../../components/common";
import { colors, typography, spacing, borderRadius } from "../../theme";

export const ProviderDetailScreen = ({ route, navigation }) => {
  const { providerId } = route.params;

  const [provider, setProvider] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  // Booking modal state
  const [selectedService, setSelectedService] = useState(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [fullAddress, setFullAddress] = useState("");
  const [customerNote, setCustomerNote] = useState("");
  const [bookingLoading, setBookingLoading] = useState(false);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const [profileRes, reviewRes] = await Promise.all([
          getProviderProfileApi(providerId),
          getProviderReviewsApi(providerId),
        ]);

        if (profileRes.data?.provider) {
          setProvider(profileRes.data.provider);
          setServices(profileRes.data.services || []);
        }
        if (reviewRes.data?.reviews) {
          setReviews(reviewRes.data.reviews);
        }
      } catch (e) {
        Alert.alert("Error", "Could not load provider profile");
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [providerId]);

  const handleBookService = async () => {
    if (!selectedService) {
      Alert.alert("Select a Service", "Please select a service offering to book.");
      return;
    }
    if (!fullAddress.trim()) {
      Alert.alert("Address Required", "Please enter your service address.");
      return;
    }

    setBookingLoading(true);
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const res = await createBookingApi({
        providerId: provider._id,
        providerServiceId: selectedService._id,
        scheduledDate: tomorrow.toISOString(),
        startTime: "10:00",
        endTime: "11:00",
        address: {
          fullAddress: fullAddress.trim(),
          city: provider.location?.city || "Kathmandu",
        },
        customerNote: customerNote.trim() || undefined,
      });

      if (res.success && res.data?.booking) {
        Alert.alert(
          "Booking Request Sent!",
          `Booking ${res.data.booking.bookingNumber} has been submitted. The provider will review and accept shortly.`
        );
        setIsBookingModalOpen(false);
        navigation.navigate("BookingsTab");
      }
    } catch (e) {
      Alert.alert("Booking Failed", e.response?.data?.message || e.message);
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!provider) return null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Provider Hero Header */}
      <Card style={styles.heroCard}>
        <View style={styles.heroRow}>
          <View style={styles.avatarCircle}>
            <Ionicons name="person" size={36} color={colors.primary} />
          </View>
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <View style={styles.titleBadgeRow}>
              <Text style={styles.businessTitle} numberOfLines={1}>
                {provider.businessName}
              </Text>
              <Badge status={provider.verificationStatus} />
            </View>
            <Text style={styles.locationSub}>
              <Ionicons name="location-outline" size={13} color={colors.textSecondary} />{" "}
              {provider.location?.city || "Kathmandu"}, Nepal
            </Text>
            <View style={styles.statsRow}>
              <Ionicons name="star" size={15} color="#F59E0B" />
              <Text style={styles.ratingVal}>
                {provider.stats?.averageRating ? provider.stats.averageRating.toFixed(1) : "5.0"}
              </Text>
              <Text style={styles.reviewsVal}>
                ({provider.stats?.totalReviews || 0} reviews)
              </Text>
              <Text style={styles.dot}>•</Text>
              <Text style={styles.expVal}>{provider.experienceYears || 1} yrs exp</Text>
            </View>
          </View>
        </View>

        {provider.bio ? (
          <Text style={styles.bioText}>{provider.bio}</Text>
        ) : null}
      </Card>

      {/* Services Offered */}
      <View style={styles.sectionHeading}>
        <Text style={styles.sectionTitle}>Services & Rates</Text>
        <Text style={styles.sectionSub}>Select a service to request a booking</Text>
      </View>

      {services.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Text style={styles.emptyText}>No services listed by this provider yet.</Text>
        </Card>
      ) : (
        services.map((srv) => {
          const isSelected = selectedService?._id === srv._id;
          return (
            <Card
              key={srv._id}
              style={[styles.serviceCard, isSelected && styles.selectedServiceCard]}
              onPress={() => setSelectedService(srv)}
            >
              <View style={styles.serviceRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.serviceName}>{srv.service?.name || "Service"}</Text>
                  {srv.description ? (
                    <Text style={styles.serviceDesc} numberOfLines={2}>
                      {srv.description}
                    </Text>
                  ) : null}
                </View>
                <View style={styles.priceContainer}>
                  <Text style={styles.priceVal}>NPR {srv.price}</Text>
                  <Text style={styles.priceType}>{srv.priceType || "FIXED"}</Text>
                </View>
              </View>
            </Card>
          );
        })
      )}

      {/* Booking Form (when service selected) */}
      {selectedService && (
        <Card style={styles.bookingFormCard}>
          <Text style={styles.formTitle}>Book {selectedService.service?.name}</Text>
          <Text style={styles.formSub}>Price: NPR {selectedService.price}</Text>

          <Input
            label="Service Address in Kathmandu Valley"
            placeholder="e.g. House #14, Baneshwor, Kathmandu"
            value={fullAddress}
            onChangeText={setFullAddress}
          />

          <Input
            label="Special Instructions / Note (Optional)"
            placeholder="e.g. Please bring extra 1-inch pipe fittings"
            value={customerNote}
            onChangeText={setCustomerNote}
            multiline
          />

          <Button
            title={`Confirm Booking (NPR ${selectedService.price})`}
            onPress={handleBookService}
            loading={bookingLoading}
          />
        </Card>
      )}

      {/* Reviews Section */}
      <View style={[styles.sectionHeading, { marginTop: spacing.lg }]}>
        <Text style={styles.sectionTitle}>Customer Reviews ({reviews.length})</Text>
      </View>

      {reviews.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Text style={styles.emptyText}>No reviews yet. Be the first to leave one!</Text>
        </Card>
      ) : (
        reviews.map((rev) => (
          <Card key={rev._id} style={styles.reviewCard}>
            <View style={styles.reviewTop}>
              <Text style={styles.reviewerName}>
                {rev.customer?.firstName} {rev.customer?.lastName}
              </Text>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Ionicons
                    key={star}
                    name={star <= rev.rating ? "star" : "star-outline"}
                    size={14}
                    color="#F59E0B"
                  />
                ))}
              </View>
            </View>
            <Text style={styles.reviewComment}>{rev.comment}</Text>
            <Text style={styles.reviewDate}>
              {new Date(rev.createdAt).toLocaleDateString()}
            </Text>
          </Card>
        ))
      )}
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
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  heroCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  titleBadgeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  businessTitle: {
    ...typography.h3,
    color: colors.text,
    flex: 1,
    marginRight: spacing.xs,
  },
  locationSub: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },
  ratingVal: {
    ...typography.caption,
    fontWeight: "700",
    color: colors.text,
    marginLeft: 3,
  },
  reviewsVal: {
    ...typography.caption,
    color: colors.textSecondary,
    marginLeft: 2,
  },
  dot: {
    marginHorizontal: spacing.xs,
    color: colors.textSecondary,
  },
  expVal: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  bioText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  sectionHeading: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
  },
  sectionSub: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  serviceCard: {
    marginBottom: spacing.sm,
  },
  selectedServiceCard: {
    borderColor: colors.primary,
    borderWidth: 2,
    backgroundColor: colors.primarySoft,
  },
  serviceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  serviceName: {
    ...typography.bodyBold,
    color: colors.text,
  },
  serviceDesc: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  priceContainer: {
    alignItems: "flex-end",
    marginLeft: spacing.sm,
  },
  priceVal: {
    ...typography.bodyBold,
    color: colors.primary,
  },
  priceType: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 10,
  },
  bookingFormCard: {
    backgroundColor: colors.surface,
    borderColor: colors.primaryLight,
    borderWidth: 1.5,
    marginVertical: spacing.md,
  },
  formTitle: {
    ...typography.h3,
    color: colors.text,
  },
  formSub: {
    ...typography.bodyBold,
    color: colors.primary,
    marginBottom: spacing.md,
  },
  reviewCard: {
    marginBottom: spacing.sm,
  },
  reviewTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  reviewerName: {
    ...typography.bodyBold,
    color: colors.text,
  },
  starsRow: {
    flexDirection: "row",
  },
  reviewComment: {
    ...typography.body,
    color: colors.text,
    marginVertical: 4,
  },
  reviewDate: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 11,
  },
  emptyCard: {
    padding: spacing.md,
    alignItems: "center",
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
  },
});

export default ProviderDetailScreen;
