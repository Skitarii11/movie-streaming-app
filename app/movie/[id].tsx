import { AVPlaybackStatus, ResizeMode, Video } from "expo-av";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import CustomButton from "@/components/CustomButton";
import { icons } from "@/constants/icons";
import { useGlobalContext } from "@/context/GlobalProvider";
import {
  addFavorite,
  appwrite,
  checkForAccess,
  getFavorites,
  getMovieById,
  removeFavorite,
} from "@/services/appwrite";
import useFetch from "@/services/usefetch";

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

const MovieDetails = () => {
  const router = useRouter();
  const { user } = useGlobalContext();
  const { id } = useLocalSearchParams();

  // --- STATE MANAGEMENT ---
  const [hasAccess, setHasAccess] = useState(false);
  const [isPlayingTrailer, setIsPlayingTrailer] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [qrCodeImage, setQrCodeImage] = useState<string | null>(null);
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);
  const [deepLinks, setDeepLinks] = useState<DeepLink[]>([]);
  

  // New state for the 2-stage modal
  const [paymentStage, setPaymentStage] = useState<"bundle" | "time">("bundle");
  const [selectedBundle, setSelectedBundle] = useState<BundleOption | null>(
    null,
  );
  // --- DATA FETCHING ---
  const {
    data: movie,
    loading,
    error,
  } = useFetch(() => getMovieById(id as string));

  const { data: favorites, refetch: refetchFavorites } = useFetch(() =>
    user ? getFavorites(user.$id) : Promise.resolve([]),
  );

  const { isFavorited, favoriteDocId } = useMemo(() => {
    const isFav = favorites?.some(
      (fav: FavoriteItem) => fav.movieId === movie?.$id,
    );
    const docId = favorites?.find(
      (fav: FavoriteItem) => fav.movieId === movie?.$id,
    )?.$id;
    return { isFavorited: isFav, favoriteDocId: docId };
  }, [favorites, movie]);

  const handleFavoriteToggle = async () => {
    if (!user || !movie) return; // Guard clause

    if (isFavorited && favoriteDocId) {
      await removeFavorite(favoriteDocId);
    } else {
      await addFavorite(user.$id, movie.$id);
    }
    // 3. Refetch the favorites list to update the UI
    await refetchFavorites();
  };

  // --- EFFECT FOR CLEANUP ---
  // This is crucial to stop polling if the user navigates away
  useEffect(() => {
    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      const checkAccessStatus = async () => {
        if (movie && user) {
          // Call the new, robust function from appwrite.ts
          const access = await checkForAccess(movie as Movie, user.$id);
          setHasAccess(access);
        }
      };
      checkAccessStatus();
    }, [user, movie]),
  );

  const handleBundleSelect = (bundle: BundleOption) => {
    setSelectedBundle(bundle);
    setPaymentStage("time");
  };

  const handleFinalPaymentSelection = async (timeOption: TimeOption) => {
    if (!movie || !user || !selectedBundle) return;
    try {
      const price = pricingTiers[selectedBundle][timeOption];
      const purchaseType = `ALL_ACCESS_${selectedBundle.toUpperCase()}`;

      const result = await appwrite.functions.createExecution(
        "68befe5900373eeeff5a",
        JSON.stringify({
          userId: user.$id,
          movieId: purchaseType, // Send the new bundle ID
          amount: price,
          purchaseType: selectedBundle, // 'premium', 'series', or 'movies'
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

  // --- pollForPayment function ---
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
          setQrCodeImage(null);
          Alert.alert(
            "Success",
            "Төлбөр амжилттай боллоо! Та одоо хандах эрхтэй.",
          );
          router.push(`/movie/watch/${movie?.$id}`);
        }
      } catch (pollError) {
        console.error("Polling error:", pollError);
      }
    }, 5000);
  };

  const handleWatchNow = async () => {
    if (!user) {
      // If no user, navigate them to the profile tab to sign in.
      Alert.alert(
        "Нэвтрэх шаардлагатай",
        "Кино үзэхийн тулд та эхлээд нэвтрэх эсвэл бүртгүүлэх шаардлагатай.",
        [
          { text: "Цуцлах   " },
          { text: "Профайл руу очих", onPress: () => router.push('/profile') }
        ]
      );
      return;
    }

    if (hasAccess) {
      router.push(`/movie/watch/${movie?.$id}`);
    } else {
      setPaymentStage("bundle");
      setSelectedBundle(null);
      setShowPaymentModal(true);
    }
  };

  // --- RENDER LOGIC ---

  if (loading) {
    return (
      <SafeAreaView className="bg-primary flex-1 justify-center items-center">
        <ActivityIndicator size="large" color="#AB8BFF" />
      </SafeAreaView>
    );
  }

  // 3. Handle the error or "no data" state AFTER loading is false.
  if (error || !movie) {
    return (
      <SafeAreaView className="bg-primary flex-1 justify-center items-center p-4">
        <Text className="text-white text-lg text-center">
          Киноны дэлгэрэнгүй мэдээллийг ачаалж чадсангүй.
        </Text>
        {error && (
          <Text className="text-light-200 text-sm mt-2 text-center">
            {error.message}
          </Text>
        )}
        <TouchableOpacity
          onPress={() => router.back()}
          className="mt-5 bg-accent px-6 py-3 rounded-lg"
        >
          <Text className="text-primary font-bold">Буцах</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const movieData = movie as Movie;

  const CategoryChip = ({ category }: { category: string }) => (
    <TouchableOpacity
      onPress={() => router.push(`/category/${category}`)}
      className="bg-dark-200 rounded-lg px-3 py-1 mr-2"
    >
      <Text className="text-light-200 text-sm">{category}</Text>
    </TouchableOpacity>
  );

  const categoryArray = movieData.categories?.split("  ") || [];

  return (
    <SafeAreaView className="bg-primary flex-1">
      <ScrollView>
        {/* --- HEADER & TRAILER --- */}
        <View className="w-full h-72">
          <Image
            source={{ uri: movieData.posterUrl }}
            className="w-full h-full"
            resizeMode="cover"
          />
          {movieData.trailerUrl && (
            <TouchableOpacity
              onPress={() => setIsPlayingTrailer(true)}
              className="absolute top-1/2 left-1/2 ..."
            >
              <Image
                source={icons.play}
                className="size-10"
                tintColor="#AB8BFF"
              />
            </TouchableOpacity>
          )}
        </View>

        {/* --- MOVIE INFO --- */}
        <View className="p-5">
          <View className="flex-row justify-between items-start">
            <Text className="text-white text-3xl font-bold">
              {movieData.title}
            </Text>
            <TouchableOpacity onPress={handleFavoriteToggle}>
              <Image
                source={icons.heart}
                className="w-8 h-8"
                tintColor={isFavorited ? "#FF6B6B" : "#FFFFFF"}
              />
            </TouchableOpacity>
          </View>
          <Text className="text-light-200 text-sm mt-1 capitalize">
            {movieData.type} • {movieData.releaseYear}
          </Text>
          <View className="flex-row items-center gap-2 mt-3">
            <Image source={icons.star} className="size-5" />
            <Text className="text-white font-bold text-lg">
              {movieData.rating.toFixed(1)} / 10
            </Text>
          </View>
          {categoryArray.length > 0 && (
            <View className="mt-4">
              <Text className="text-white text-lg font-bold mb-2">
                Ангилал
              </Text>
              <FlatList
                // Use the new array we just created
                data={categoryArray}
                keyExtractor={(item) => item}
                renderItem={({ item }) => <CategoryChip category={item} />}
                horizontal
                showsHorizontalScrollIndicator={false}
              />
            </View>
          )}
          <Text className="text-white text-lg font-bold mt-5">Тойм</Text>
          <Text className="text-light-200 text-base mt-2">
            {movieData.overview}
          </Text>
        </View>

        {/* --- ACTION BUTTONS --- */}
        <CustomButton
          title="Одоо үзээрэй"
          handlePress={handleWatchNow}
          containerStyles="mx-5"
        />
        <TouchableOpacity
          onPress={() => router.back()}
          className="bg-dark-200 m-5 p-4 ..."
        >
          <Image
            source={icons.arrow}
            className="size-5 mr-2"
            tintColor="#fff"
          />
          <Text className="text-white font-bold">Буцах</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* --- DYNAMIC 2-STAGE PAYMENT MODAL --- */}
      <Modal
        visible={showPaymentModal}
        transparent={true}
        animationType="slide"
      >
        <View className="flex-1 justify-end bg-black/60">
          <View className="bg-dark-100 rounded-t-2xl p-5">
            <Text className="text-white text-xl font-bold text-center mb-5">
              {paymentStage === "bundle"
                ? "Төлбөрийг сонгоно уу"
                : "Хугацааг сонгоно уу"}
            </Text>

            {paymentStage === "bundle" ? (
              // STAGE 1: BUNDLE SELECTION
              <>
                <CustomButton
                  title="Бүх кино багц"
                  handlePress={() => handleBundleSelect("premium")}
                />
                <CustomButton
                  title="Цувралын багц"
                  handlePress={() => handleBundleSelect("series")}
                  containerStyles="mt-4"
                />
                <CustomButton
                  title="Богино драма багц"
                  handlePress={() => handleBundleSelect("movies")}
                  containerStyles="mt-4"
                />
              </>
            ) : (
              // STAGE 2: TIME & PRICE SELECTION
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

      {/* --- TRAILER MODAL --- */}
      <Modal
        visible={isPlayingTrailer}
        onRequestClose={() => setIsPlayingTrailer(false)}
      >
        <View style={styles.videoContainer}>
          <Video
            source={{ uri: movieData.trailerUrl! }}
            style={StyleSheet.absoluteFillObject}
            useNativeControls
            resizeMode={ResizeMode.CONTAIN}
            shouldPlay
            onPlaybackStatusUpdate={(status: AVPlaybackStatus) => {
              // This is a type-safe way to check if the video finished
              if (status.isLoaded && status.didJustFinish) {
                setIsPlayingTrailer(false);
              }
            }}
          />
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setIsPlayingTrailer(false)}
          >
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  videoContainer: {
    flex: 1,
    backgroundColor: "black",
    justifyContent: "center",
    alignItems: "center",
  },
  closeButton: {
    position: "absolute",
    top: 50,
    left: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 10,
    borderRadius: 5,
    zIndex: 1,
  },
  closeButtonText: {
    color: "white",
    fontWeight: "bold",
  },
});
export default MovieDetails;
