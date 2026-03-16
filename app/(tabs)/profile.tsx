import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Linking,
  Modal,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useGlobalContext } from "@/context/GlobalProvider";
import {
  appwrite,
  getFavorites,
  getMovieById,
  getUserPurchases,
  getWatchHistory,
} from "@/services/appwrite";

import CustomButton from "@/components/CustomButton";
import MovieCard from "@/components/MovieCard";
import useFetch from "@/services/usefetch";
import { useFocusEffect, useRouter } from "expo-router";

interface DeepLink {
  name: string;
  description: string;
  logo: string;
  link: string;
}

const pricingTiers = {
  premium: { "1m": 15000, "3m": 40000, "6m": 75000 },
  series: { "1m": 7500, "3m": 21000, "6m": 40000 },
  movies: { "1m": 11500, "3m": 30000, "6m": 55000 },
};
type BundleOption = "premium" | "series" | "movies";
type TimeOption = "1m" | "3m" | "6m";

const Profile = () => {
  const router = useRouter();
  const { user, isLoggingOut, logout } = useGlobalContext();

  const [watchHistoryMovies, setWatchHistoryMovies] = useState<Movie[]>([]);
  const [favoriteMovies, setFavoriteMovies] = useState<Movie[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- 2. COPY THE STATE VARIABLES FOR THE PAYMENT FLOW ---
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [qrCodeImage, setQrCodeImage] = useState<string | null>(null);
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);
  const [deepLinks, setDeepLinks] = useState<DeepLink[]>([]);

  const [paymentStage, setPaymentStage] = useState<"bundle" | "time">("bundle");
  const [selectedBundle, setSelectedBundle] = useState<BundleOption | null>(
    null,
  );

  const fetchProfileData = useCallback(async () => {
    if (!user) {
      setWatchHistoryMovies([]);
      setFavoriteMovies([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const [historyItems, favoriteItems] = await Promise.all([
        getWatchHistory(user.$id),
        getFavorites(user.$id),
      ]);

      // Process watch history
      if (historyItems.length > 0) {
        const historyPromises = historyItems.map((item) =>
          getMovieById(item.movieId),
        );
        const historyMovies = await Promise.all(historyPromises);
        setWatchHistoryMovies(historyMovies.filter((m) => m) as Movie[]);
      } else {
        setWatchHistoryMovies([]);
      }

      // Process favorites
      if (favoriteItems.length > 0) {
        const favoritePromises = favoriteItems.map((item) =>
          getMovieById(item.movieId),
        );
        const favoriteMovies = await Promise.all(favoritePromises);
        setFavoriteMovies(favoriteMovies.filter((m) => m) as Movie[]);
      } else {
        setFavoriteMovies([]);
      }
    } catch (error) {
      console.error("Failed to fetch profile data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      fetchProfileData();
    }, [fetchProfileData]),
  );

  const handleBundleSelect = (bundle: BundleOption) => {
    setSelectedBundle(bundle);
    setPaymentStage("time");
  };

  const pollForPayment = (purchaseId: string) => {
    setIsCheckingPayment(true);
    pollingInterval.current = setInterval(async () => {
      try {
        const result = await appwrite.functions.createExecution(
          "68beffcb0028d2ba3881",
          JSON.stringify({ purchaseId }),
        );

        if (result.status === "failed") {
          console.error("Polling check failed:", result.errors);
          return;
        }

        const response = JSON.parse(result.responseBody);

        if (response.status === "PAID") {
          if (pollingInterval.current) clearInterval(pollingInterval.current);
          setIsCheckingPayment(false);
          setQrCodeImage(null); // Close the QR modal
          Alert.alert(
            "Success",
            "Төлбөр амжилттай боллоо! Та одоо хандах эрхтэй.",
          );
          refetchPurchases();
          fetchProfileData();
        }
      } catch (pollError) {
        console.error("Polling error:", pollError);
      }
    }, 5000);
  };

  const handleFinalPaymentSelection = async (timeOption: TimeOption) => {
    if (!user || !selectedBundle) return;
    try {
      const price = pricingTiers[selectedBundle][timeOption];
      const purchaseType = `ALL_ACCESS_${selectedBundle.toUpperCase()}`;

      const result = await appwrite.functions.createExecution(
        "68befe5900373eeeff5a",
        JSON.stringify({
          userId: user.$id,
          movieId: purchaseType,
          amount: price,
          purchaseType: selectedBundle,
          movieTitle: `Subscription: ${selectedBundle}`,
          duration: timeOption,
        }),
      );

      const response = JSON.parse(result.responseBody);
      if (response.error) throw new Error(response.error);

      setShowPaymentModal(false);
      setQrCodeImage(response.qrImage);
      setDeepLinks(response.deepLinks || []);
      pollForPayment(response.purchaseId);
    } catch (e: any) {
      Alert.alert("Error", `Failed to generate QR code: ${e.message}`);
    }
  };

  const handleDeepLinkPress = async (url: string) => {
    // Check if the device can handle the deep link URL
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      // Open the banking app
      await Linking.openURL(url);
    } else {
      Alert.alert(
        "App Not Found",
        "The selected banking app is not installed on your device.",
      );
    }
  };

  const handleSubscribeNow = () => {
    setPaymentStage("bundle");
    setSelectedBundle(null);
    setShowPaymentModal(true);
  };

  const { data: purchases, refetch: refetchPurchases } = useFetch(() =>
    getUserPurchases(user?.$id ?? ""),
  );
  const activeSubscription = purchases?.find((p) =>
    p.movieId.includes("ALL_ACCESS"),
  );

  if (!user) {
    return (
      <SafeAreaView className="bg-primary flex-1 justify-center items-center p-4">
        <Text className="text-lightText text-lg font-semibold text-center">
          Please Log In
        </Text>
        <Text className="text-lightText text-center mt-2">
          Log in to view your profile, history, and favorites.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="bg-primary flex-1">
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={fetchProfileData} />
        }
      >
        <View className="items-center mt-16">
          <Image
            source={{ uri: "https://via.placeholder.com/150" }}
            className="w-24 h-24 rounded-full"
          />
          <Text className="text-2xl font-bold text-white text-lightText mt-4">
            {user?.name}
          </Text>
        </View>

        {isLoading ? (
          <ActivityIndicator size="large" color="#FF6B6B" className="mt-8" />
        ) : (
          <>
            {/* Custom Watch History List */}
            <View className="mt-8">
              <Text className="text-xl font-bold text-lightText text-white px-4 mb-4">
                Миний үзсэн кино
              </Text>
              {watchHistoryMovies.length > 0 ? (
                <FlatList
                  data={watchHistoryMovies}
                  keyExtractor={(item) => `history-${item.$id}`}
                  renderItem={({ item }) => (
                    <MovieCard movie={item} containerStyles="w-36 mr-4" />
                  )}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingLeft: 16 }}
                />
              ) : (
                <Text className="text-lightText text-white px-4">
                  No movies found in this section.
                </Text>
              )}
            </View>

            {/* Custom Favorites List */}
            <View className="mt-8">
              <Text className="text-xl font-bold text-lightText text-white px-4 mb-4">
                Миний дуртай кино
              </Text>
              {favoriteMovies.length > 0 ? (
                <FlatList
                  data={favoriteMovies}
                  keyExtractor={(item) => `favorite-${item.$id}`}
                  renderItem={({ item }) => (
                    <MovieCard movie={item} containerStyles="w-36 mr-4" />
                  )}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingLeft: 16 }}
                />
              ) : (
                <Text className="text-lightText text-white px-4">
                  No movies found in this section.
                </Text>
              )}
            </View>
          </>
        )}

        {/* Subscription Section */}
        <View className="mt-8 mx-4">
          <Text className="text-xl font-bold text-lightText text-white mb-4">
            Миний гишүүнчлэл
          </Text>
          {activeSubscription ? (
            <View className="p-4 bg-secondary rounded-2xl">
              <Text className="text-lg font-bold text-lightText text-white capitalize">
                {activeSubscription.movieId
                  .replace("ALL_ACCESS_", "")
                  .toLowerCase()}{" "}
                Plan
              </Text>
              <Text className="text-sm text-lightText text-white mt-4">
                Дуусах хугацаа:{" "}
                {new Date(activeSubscription.expiresAt).toLocaleDateString()}
              </Text>
              {/* This button could navigate to a "Manage Subscription" page in the future */}
              <TouchableOpacity className="bg-accent rounded-full py-3 mt-4">
                <Text className="text-white font-bold text-center">
                  Сунгах / Засах
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View className="p-4 bg-secondary rounded-2xl items-center">
              <Text className="text-lightText text-white">
                You have no active subscriptions.
              </Text>
              {/* This button now triggers the payment modal */}
              <TouchableOpacity
                onPress={handleSubscribeNow}
                className="bg-accent rounded-full py-3 mt-4 px-8"
              >
                <Text className="text-white font-bold text-center">
                  Subscribe Now
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Logout Button */}
        <View className="px-4 mt-8 mb-12">
          <TouchableOpacity
            onPress={logout}
            disabled={isLoggingOut}
            className="bg-accent rounded-xl py-4"
          >
            <Text className="font-bold text-center text-white text-lg">
              {isLoggingOut ? "Logging out..." : "Гарах (Logout)"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      {/* DYNAMIC 2-STAGE PAYMENT MODAL */}
      <Modal
        visible={showPaymentModal}
        transparent={true}
        animationType="slide"
      >
        <View className="flex-1 justify-end bg-black/60">
          <View className="bg-dark-100 rounded-t-2xl p-5">
            <Text className="text-white text-xl font-bold text-center mb-5">
              {paymentStage === "bundle"
                ? "Төлбөрийн багц сонгоно уу"
                : "Хугацааг сонгоно уу"}
            </Text>
            {paymentStage === "bundle" ? (
              <>
                <CustomButton
                  title="Premium (Бүх кино, цуврал)"
                  handlePress={() => handleBundleSelect("premium")}
                />
                <CustomButton
                  title="Цувралын багц"
                  handlePress={() => handleBundleSelect("series")}
                  containerStyles="mt-4"
                />
                <CustomButton
                  title="Киноны багц"
                  handlePress={() => handleBundleSelect("movies")}
                  containerStyles="mt-4"
                />
              </>
            ) : (
              selectedBundle && (
                <>
                  <CustomButton
                    title={`1 Сар - ₮${pricingTiers[selectedBundle]["1m"]}`}
                    handlePress={() => handleFinalPaymentSelection("1m")}
                  />
                  <CustomButton
                    title={`3 Сар - ₮${pricingTiers[selectedBundle]["3m"]}`}
                    handlePress={() => handleFinalPaymentSelection("3m")}
                    containerStyles="mt-4"
                  />
                  <CustomButton
                    title={`6 Сар - ₮${pricingTiers[selectedBundle]["6m"]}`}
                    handlePress={() => handleFinalPaymentSelection("6m")}
                    containerStyles="mt-4"
                  />
                  <TouchableOpacity
                    onPress={() => setPaymentStage("bundle")}
                    className="mt-5 p-3"
                  >
                    <Text className="text-light-200 text-center">
                      Буцах (Back)
                    </Text>
                  </TouchableOpacity>
                </>
              )
            )}
            <TouchableOpacity
              onPress={() => setShowPaymentModal(false)}
              className="mt-2 p-3"
            >
              <Text className="text-red-500 text-center">Цуцлах (Cancel)</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* --- QR CODE MODAL --- */}
      <Modal visible={!!qrCodeImage} transparent={true} animationType="fade">
        <View className="flex-1 justify-center items-center bg-black/80 p-5">
          <View className="bg-white p-5 rounded-lg">
            <Text className="text-secondary text-lg font-bold text-center mb-4">
              QPay-р төлөхийн тулд сканнердах
            </Text>
            {qrCodeImage && (
              <Image
                source={{ uri: qrCodeImage }}
                className="w-64 h-64 self-center"
              />
            )}
            {isCheckingPayment && (
              <View className="flex-row items-center justify-center mt-4">
                <ActivityIndicator size="small" />
                <Text className="text-gray-600 ml-2">
                  Төлбөрийн баталгаажуулалтыг хүлээж байна...
                </Text>
              </View>
            )}
            <Text className="text-gray-600 text-center font-semibold mt-4 mb-2">
              Эсвэл банкны аппликейшнаа ашиглан нээх:
            </Text>
            <FlatList
              data={deepLinks}
              keyExtractor={(item) => item.name}
              numColumns={4} // Adjust for a nice grid
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => handleDeepLinkPress(item.link)}
                  className="flex-1 items-center justify-center p-2"
                >
                  <Image
                    source={{ uri: item.logo }}
                    className="w-12 h-12 rounded-lg"
                  />
                  <Text className="text-xs text-center mt-1" numberOfLines={1}>
                    {item.name}
                  </Text>
                </TouchableOpacity>
              )}
            />

            <TouchableOpacity
              onPress={() => {
                setQrCodeImage(null);
                setDeepLinks([]); // Clear the deep links as well
                setIsCheckingPayment(false);
                if (pollingInterval.current)
                  clearInterval(pollingInterval.current);
              }}
              className="mt-5"
            >
              <Text className="text-red-500 text-center">Цуцлах</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default Profile;
