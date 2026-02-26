import { useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  StyleSheet,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Video, ResizeMode, AVPlaybackStatus } from "expo-av";

import useFetch from "@/services/usefetch";
import { getMovieById } from "@/services/appwrite";
import { icons } from "@/constants/icons";
import { useScreenGuard } from '@/hooks/useScreenGuard';

const WatchPage = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);

  // Call the screen guard hook unconditionally at the top
  useScreenGuard();

  // Call the data fetching hook unconditionally
  const { data: movie, loading, error } = useFetch(() => getMovieById(id as string));

  // --- RENDER LOGIC MOVED INTO A HELPER FUNCTION ---
  // This function will decide what to show based on the loading/error state
  const renderContent = () => {
    // 1. Handle loading state
    if (loading) {
      return (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#AB8BFF" />
        </View>
      );
    }

    // 2. Handle error or no data state
    if (error || !movie) {
      return (
        <View className="flex-1 justify-center items-center p-4">
          <Text className="text-white text-center text-lg">
            Could not load episodes.
          </Text>
          {error && <Text className="text-light-200 text-center mt-2">{error.message}</Text>}
        </View>
      );
    }
    
    // 3. If data is loaded successfully, render the list
    const movieData = movie as Movie;
    return (
      <FlatList
        data={movieData.episodeUrl}
        keyExtractor={(item, index) => `${item}-${index}`}
        renderItem={({ item, index }) => (
          <TouchableOpacity
            onPress={() => setSelectedVideo(item)}
            className="p-5 border-b-2 border-dark-200 flex-row justify-between items-center"
          >
            <Text className="text-white text-lg font-semibold">
              Анги {index + 1}
            </Text>
            <Image source={icons.play} className="size-8" tintColor="#AB8BFF" />
          </TouchableOpacity>
        )}
        ListHeaderComponent={() => (
          <View className="p-5">
            <TouchableOpacity
              onPress={() => router.back()}
              className="flex-row items-center mb-5"
            >
              <Image source={icons.arrow} className="size-5 mr-2" tintColor="#fff" />
              <Text className="text-white font-bold">Дэлгэрэнгүй мэдээлэл рүү буцах</Text>
            </TouchableOpacity>
            <Text className="text-white text-2xl font-bold">
              {movieData.title}
            </Text>
            <Text className="text-light-200 mt-1">Тоглуулах анги сонгоно уу</Text>
          </View>
        )}
        ListEmptyComponent={() => (
          <View className="p-5">
            <Text className="text-light-200 text-center">No episodes found for this title.</Text>
          </View>
        )}
      />
    );
  };

  return (
    <SafeAreaView className="bg-primary flex-1">
      {renderContent()}
      <Modal
        animationType="slide"
        transparent={false}
        visible={!!selectedVideo}
        onRequestClose={() => setSelectedVideo(null)}
      >
        <View style={styles.videoContainer}>
          {selectedVideo && (
            <Video
              source={{ uri: selectedVideo }}
              style={StyleSheet.absoluteFillObject}
              useNativeControls
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay
              onPlaybackStatusUpdate={(status: AVPlaybackStatus) => {
                if (status.isLoaded && status.didJustFinish) {
                  setSelectedVideo(null);
                }
              }}
            />
          )}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setSelectedVideo(null)}
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

export default WatchPage;