import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  StyleSheet,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Video, ResizeMode, AVPlaybackStatus } from "expo-av";

import useFetch from "@/services/usefetch";
import { getMovieById } from "@/services/appwrite";
import CustomButton from "@/components/CustomButton";
import { icons } from "@/constants/icons";

const MovieDetails = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [isPlaying, setIsPlaying] = useState(false);

  const {
    data: movie,
    loading,
    error,
  } = useFetch(() => getMovieById(id as string));

  const handlePlay = () => {
    if (movie?.streamUrl) {
      setIsPlaying(true);
    } else {
      alert("No trailer is available for this movie.");
    }
  };

  // --- THIS IS THE ROBUST LOGIC FIX ---

  // 2. Handle the loading state FIRST and separately.
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
          Could not load movie details.
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
          <Text className="text-primary font-bold">Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // 4. If we reach this point, we are GUARANTEED that 'movie' is a valid object.
  const movieData = movie as Movie;

  return (
    <SafeAreaView className="bg-primary flex-1">
      {/* ... The rest of your JSX from the previous step ... */}
      <ScrollView>
        <View className="w-full h-72">
          <Image
            source={{ uri: movieData.posterUrl }}
            className="w-full h-full"
            resizeMode="cover"
          />
          {movieData.streamUrl && (
            <TouchableOpacity
              onPress={handlePlay}
              className="absolute top-1/2 left-1/2 -translate-x-8 -translate-y-8 size-16 justify-center items-center bg-white/50 rounded-full"
            >
              <Image source={icons.play} className="size-10" tintColor="#AB8BFF" />
            </TouchableOpacity>
          )}
        </View>

        <View className="p-5">
          <Text className="text-white text-3xl font-bold">{movieData.title}</Text>
          <Text className="text-light-200 text-sm mt-1 capitalize">
            {movieData.type} • {movieData.releaseYear} • 110m (placeholder)
          </Text>
          <View className="flex-row items-center gap-2 mt-3">
            <Image source={icons.star} className="size-5" />
            <Text className="text-white font-bold text-lg">{movieData.rating.toFixed(1)} / 10</Text>
          </View>
          <Text className="text-white text-lg font-bold mt-5">Overview</Text>
          <Text className="text-light-200 text-base mt-2">{movieData.overview}</Text>
        </View>

        {movieData.episodeUrls && movieData.episodeUrls.length > 0 && (
          <CustomButton
            title="Watch Now"
            handlePress={() => router.push(`/movie/watch/${movieData.$id}`)}
            containerStyles="mx-5"
          />
        )}

        <TouchableOpacity
          onPress={() => router.back()}
          className="bg-dark-200 m-5 p-4 rounded-full flex-row justify-center items-center"
        >
          <Image source={icons.arrow} className="size-5 mr-2" tintColor="#fff" />
          <Text className="text-white font-bold">Go Back</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        animationType="slide"
        transparent={false}
        visible={isPlaying}
        onRequestClose={() => setIsPlaying(false)}
      >
        <View style={styles.videoContainer}>
          <Video
            source={{ uri: movieData.streamUrl! }}
            style={StyleSheet.absoluteFillObject}
            useNativeControls
            resizeMode={ResizeMode.CONTAIN}
            shouldPlay
            onPlaybackStatusUpdate={(status: AVPlaybackStatus) => {
              // This is a type-safe way to check if the video finished
              if (status.isLoaded && status.didJustFinish) {
                setIsPlaying(false);
              }
            }}
          />
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setIsPlaying(false)}
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

export default MovieDetails;