import { useState, useEffect, useRef } from "react";
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
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Video, ResizeMode, AVPlaybackStatus } from "expo-av";
import { Query, ExecutionMethod } from "react-native-appwrite";

// --- IMPORTS ---
import { useGlobalContext } from "@/context/GlobalProvider";
import useFetch from "@/services/usefetch";
import { getMovieById, appwrite, DATABASE_ID, PURCHASES_COLLECTION_ID } from "@/services/appwrite";
import CustomButton from "@/components/CustomButton";
import { icons } from "@/constants/icons";

const MovieDetails = () => {
  const router = useRouter();
  const { user } = useGlobalContext(); // Get the logged-in user
  const { id } = useLocalSearchParams();

  // --- STATE MANAGEMENT ---
  const [isPlayingTrailer, setIsPlayingTrailer] = useState(false);
  const [showPaymentOptions, setShowPaymentOptions] = useState(false);
  const [qrCodeImage, setQrCodeImage] = useState<string | null>(null);
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const pollingInterval = useRef<NodeJS.Timeout | null>(null); // Ref to hold the interval ID

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
  const checkForAccess = async (movieId: string, userId: string) => {
    try {
      const now = new Date().toISOString();
      const purchases = await appwrite.database.listDocuments(
        DATABASE_ID,
        PURCHASES_COLLECTION_ID,
        [
          Query.equal('userId', userId),
          Query.equal('status', 'PAID'),
          Query.greaterThan('expiresAt', now),
          Query.equal('movieId', ['ALL_ACCESS_SUBSCRIPTION', movieId])
        ]
      );
      return purchases.documents.length > 0;
    } catch (e) {
      console.error("Error checking for access:", e);
      return false;
    }
  };

  // --- The Definitive, Correct handlePaymentOption function ---
  const handlePaymentOption = async (option: 'subscription' | 'movie') => {
    if (!movie || !user) return;

    try {
      const price = option === 'subscription' ? 15000 : movie.price;
      
      const payload = JSON.stringify({
        userId: user.$id,
        movieId: movie.$id,
        amount: price,
        purchaseType: option,
        movieTitle: movie.title
      });

      const result = await appwrite.functions.createExecution(
        '68befe5900373eeeff5a',
        payload,
        false,
        'POST' 
      );

      // Use the properties we discovered from your log!
      if (result.status === 'failed') {
        // If the function failed, the 'errors' property should contain the reason.
        throw new Error(result.errors || "Function execution failed. Check the function logs in your Appwrite console.");
      }

      const response = JSON.parse(result.responseBody);
      if (response.error) throw new Error(response.error);

      setShowPaymentOptions(false);
      setQrCodeImage(response.qrImage);
      pollForPayment(response.purchaseId);

    } catch (e: any) {
      Alert.alert("Error", `Failed to generate QR code: ${e.message}`);
    }
  };

  // --- The Definitive, Correct pollForPayment function ---
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
    if (!movie || !user) return;
    const hasAccess = await checkForAccess(movie.$id, user.$id);
    if (hasAccess) {
      router.push(`/movie/watch/${movie.$id}`);
    } else {
      setShowPaymentOptions(true);
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

      {/* --- PAYMENT OPTIONS MODAL --- */}
      <Modal visible={showPaymentOptions} transparent={true} animationType="slide">
        <View className="flex-1 justify-end bg-black/60">
          <View className="bg-dark-100 rounded-t-2xl p-5">
            <Text className="text-white text-xl font-bold text-center mb-5">Төлбөрийг сонгоно уу</Text>
            <CustomButton title="Бүртгүүлэх (Бүх кинонд хандах) - ₮15,000 / сар" handlePress={() => handlePaymentOption('subscription')} />
            <CustomButton title={`Зөвхөн энэ киног худалдаж аваарай - ₮${movieData.price}`} handlePress={() => handlePaymentOption('movie')} containerStyles="mt-4" />
            <TouchableOpacity onPress={() => setShowPaymentOptions(false)} className="mt-5 p-3">
              <Text className="text-light-200 text-center">Цуцлах</Text>
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