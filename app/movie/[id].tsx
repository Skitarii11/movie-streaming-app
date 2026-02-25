import { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  StyleSheet,
  Alert,
} from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Video, ResizeMode, AVPlaybackStatus } from "expo-av";
import { Query, ExecutionMethod } from "react-native-appwrite";

// --- IMPORTS ---
import { useGlobalContext } from "@/context/GlobalProvider";
import useFetch from "@/services/usefetch";
import { getMovieById, appwrite, DATABASE_ID, PURCHASES_COLLECTION_ID, getUserPurchases } from "@/services/appwrite";
import CustomButton from "@/components/CustomButton";
import { icons } from "@/constants/icons";

const pricingTiers = {
  premium: { '1m': 15000, '3m': 40000, '6m': 75000 },
  series:  { '1m': 7500,  '3m': 21000, '6m': 40000 },
  movies:  { '1m': 11500, '3m': 30000, '6m': 55000 },
};
type BundleOption = 'premium' | 'series' | 'movies';
type TimeOption = '1m' | '3m' | '6m';

const MovieDetails = () => {
  const router = useRouter();
  const { user } = useGlobalContext(); // Get the logged-in user
  const { id } = useLocalSearchParams();

  // --- STATE MANAGEMENT ---
  const [hasAccess, setHasAccess] = useState(false);
  const [isPlayingTrailer, setIsPlayingTrailer] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [qrCodeImage, setQrCodeImage] = useState<string | null>(null);
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);

  // New state for the 2-stage modal
  const [paymentStage, setPaymentStage] = useState<'bundle' | 'time'>('bundle');
  const [selectedBundle, setSelectedBundle] = useState<BundleOption | null>(null);
  // --- DATA FETCHING ---
  const {
    data: movie,
    loading,
    error,
  } = useFetch(() => getMovieById(id as string));

  // --- EFFECT FOR CLEANUP ---
  // This is crucial to stop polling if the user navigates away
  useEffect(() => {
    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
    };
  }, []);

  

  // --- PAYMENT LOGIC ---
  const checkForAccess = useCallback(async (currentMovie: Movie, allPurchases: Purchase[]) => {
    if (!currentMovie) return false;

    const hasPremium = allPurchases.some(p => p.movieId === 'ALL_ACCESS_PREMIUM');
    if (hasPremium) return true;

    if (currentMovie.type === 'series') {
      const hasSeriesAccess = allPurchases.some(p => p.movieId === 'ALL_ACCESS_SERIES');
      if (hasSeriesAccess) return true;
    }

    if (currentMovie.type === 'movie') {
      const hasMoviesAccess = allPurchases.some(p => p.movieId === 'ALL_ACCESS_MOVIES');
      if (hasMoviesAccess) return true;
    }

    return false;
  }, []);

  useFocusEffect(
    useCallback(() => {
      const checkAccessStatus = async () => {
        if (movie && user) {
          const purchases = await getUserPurchases(user.$id);
          const access = await checkForAccess(movie as Movie, purchases);
          setHasAccess(access);
        }
      };
      checkAccessStatus();
    }, [user, movie, checkForAccess])
  );

  const handleBundleSelect = (bundle: BundleOption) => {
    setSelectedBundle(bundle);
    setPaymentStage('time');
  };

  const handleFinalPaymentSelection = async (timeOption: TimeOption) => {
    if (!movie || !user || !selectedBundle) return;
    try {
      const price = pricingTiers[selectedBundle][timeOption];
      const purchaseType = `ALL_ACCESS_${selectedBundle.toUpperCase()}`;
      
      const result = await appwrite.functions.createExecution(
        '68befe5900373eeeff5a',
        JSON.stringify({
          userId: user.$id,
          movieId: purchaseType, // Send the new bundle ID
          amount: price,
          purchaseType: selectedBundle, // 'premium', 'series', or 'movies'
          movieTitle: `Subscription: ${selectedBundle}`,
          duration: timeOption,
        })
      );
      
      const response = JSON.parse(result.responseBody);
      if (response.error) throw new Error(response.error);

      setShowPaymentModal(false);
      setQrCodeImage(response.qrImage);
      pollForPayment(response.purchaseId);

    } catch (e: any) {
      Alert.alert("Error", `Failed to generate QR code: ${e.message}`);
    }
  };

  // --- pollForPayment function ---
  const pollForPayment = (purchaseId: string) => {
    setIsCheckingPayment(true);
    pollingInterval.current = setInterval(async () => {
      try {
        const result = await appwrite.functions.createExecution(
          '68beffcb0028d2ba3881',
          JSON.stringify({ purchaseId })
        );
        
        if (result.status === 'failed') {
          console.error("Polling check failed:", result.errors);
          return; 
        }

        const response = JSON.parse(result.responseBody);

        if (response.status === 'PAID') {
          if (pollingInterval.current) clearInterval(pollingInterval.current);
          setIsCheckingPayment(false);
          setQrCodeImage(null);
          Alert.alert("Success", "Төлбөр амжилттай боллоо! Та одоо хандах эрхтэй.");
          router.push(`/movie/watch/${movie?.$id}`);
        }
      } catch (pollError) {
        console.error("Polling error:", pollError);
      }
    }, 5000);
  };

  const handleWatchNow = async () => {
    if (hasAccess) {
      router.push(`/movie/watch/${movie?.$id}`);
    } else {
      // Reset modal to first stage every time it's opened
      setPaymentStage('bundle');
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

  return (
    <SafeAreaView className="bg-primary flex-1">
      <ScrollView>
        {/* --- HEADER & TRAILER --- */}
        <View className="w-full h-72">
          <Image source={{ uri: movieData.posterUrl }} className="w-full h-full" resizeMode="cover" />
          {movieData.trailerUrl && (
            <TouchableOpacity onPress={() => setIsPlayingTrailer(true)} className="absolute top-1/2 left-1/2 ...">
              <Image source={icons.play} className="size-10" tintColor="#AB8BFF" />
            </TouchableOpacity>
          )}
        </View>

        {/* --- MOVIE INFO --- */}
        <View className="p-5">
          <Text className="text-white text-3xl font-bold">{movieData.title}</Text>
          <Text className="text-light-200 text-sm mt-1 capitalize">
            {movieData.type} • {movieData.releaseYear}
          </Text>
          <View className="flex-row items-center gap-2 mt-3">
            <Image source={icons.star} className="size-5" />
            <Text className="text-white font-bold text-lg">{movieData.rating.toFixed(1)} / 10</Text>
          </View>
          <Text className="text-white text-lg font-bold mt-5">Тойм</Text>
          <Text className="text-light-200 text-base mt-2">{movieData.overview}</Text>
        </View>

        {/* --- ACTION BUTTONS --- */}
          <CustomButton title="Одоо үзээрэй" handlePress={handleWatchNow} containerStyles="mx-5" />
        <TouchableOpacity onPress={() => router.back()} className="bg-dark-200 m-5 p-4 ...">
          <Image source={icons.arrow} className="size-5 mr-2" tintColor="#fff" />
          <Text className="text-white font-bold">Буцах</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* --- DYNAMIC 2-STAGE PAYMENT MODAL --- */}
      <Modal visible={showPaymentModal} transparent={true} animationType="slide">
        <View className="flex-1 justify-end bg-black/60">
          <View className="bg-dark-100 rounded-t-2xl p-5">
            <Text className="text-white text-xl font-bold text-center mb-5">
              {paymentStage === 'bundle' ? 'Төлбөрийг сонгоно уу' : 'Хугацааг сонгоно уу'}
            </Text>

            {paymentStage === 'bundle' ? (
              // STAGE 1: BUNDLE SELECTION
              <>
                <CustomButton title="Бүртгүүлэх (Бүх кинонд хандах)" handlePress={() => handleBundleSelect('premium')} />
                <CustomButton title="Бүх цувралд хандах" handlePress={() => handleBundleSelect('series')} containerStyles="mt-4" />
                <CustomButton title="Бүх кинонд хандах" handlePress={() => handleBundleSelect('movies')} containerStyles="mt-4" />
              </>
            ) : (
              // STAGE 2: TIME & PRICE SELECTION
              selectedBundle && (
                <>
                  <CustomButton title={`1 Сар - ₮${pricingTiers[selectedBundle]['1m']}`} handlePress={() => handleFinalPaymentSelection('1m')} />
                  <CustomButton title={`3 Сар - ₮${pricingTiers[selectedBundle]['3m']}`} handlePress={() => handleFinalPaymentSelection('3m')} containerStyles="mt-4" />
                  <CustomButton title={`6 Сар - ₮${pricingTiers[selectedBundle]['6m']}`} handlePress={() => handleFinalPaymentSelection('6m')} containerStyles="mt-4" />
                  
                  <TouchableOpacity onPress={() => setPaymentStage('bundle')} className="mt-5 p-3">
                    <Text className="text-light-200 text-center">Буцах (Back)</Text>
                  </TouchableOpacity>
                </>
              )
            )}

            <TouchableOpacity onPress={() => setShowPaymentModal(false)} className="mt-2 p-3">
              <Text className="text-red-500 text-center">Цуцлах (Cancel)</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* --- QR CODE MODAL --- */}
      <Modal visible={!!qrCodeImage} transparent={true} animationType="fade">
        <View className="flex-1 justify-center items-center bg-black/80 p-5">
          <View className="bg-white p-5 rounded-lg">
            <Text className="text-secondary text-lg font-bold text-center mb-4">QPay-р төлөхийн тулд сканнердах</Text>
            {qrCodeImage && <Image source={{ uri: qrCodeImage }} className="w-64 h-64 self-center" />}
            {isCheckingPayment && (
              <View className="flex-row items-center justify-center mt-4">
                <ActivityIndicator size="small" />
                <Text className="text-gray-600 ml-2">Төлбөрийн баталгаажуулалтыг хүлээж байна...</Text>
              </View>
            )}
            <TouchableOpacity onPress={() => {
              setQrCodeImage(null);
              setIsCheckingPayment(false);
              if (pollingInterval.current) clearInterval(pollingInterval.current);
            }} className="mt-5">
              <Text className="text-red-500 text-center">Цуцлах</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* --- TRAILER MODAL --- */}
      <Modal visible={isPlayingTrailer} onRequestClose={() => setIsPlayingTrailer(false)}>
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
backgroundColor: 'black',
justifyContent: 'center',
alignItems: 'center',
},
closeButton: {
position: 'absolute',
top: 50,
left: 20,
backgroundColor: 'rgba(0,0,0,0.5)',
padding: 10,
borderRadius: 5,
zIndex: 1,
},
closeButtonText: {
color: 'white',
fontWeight: 'bold',
}
});
export default MovieDetails