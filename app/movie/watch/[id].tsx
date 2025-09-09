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

const WatchPage = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);

  const {
    data: movie,
    loading,
    error,
  } = useFetch(() => getMovieById(id as string));

  if (loading || error || !movie) {
    return (
      <SafeAreaView className="bg-primary flex-1 justify-center items-center">
        {loading ? (
          <ActivityIndicator size="large" color="#AB8BFF" />
        ) : (
          <Text className="text-white text-center">
            Could not load episodes.
          </Text>
        )}
      </SafeAreaView>
    );
  }

  const movieData = movie as Movie;

  return (
    <SafeAreaView className="bg-primary flex-1">
      <FlatList
        data={movieData.episodeUrl}
        keyExtractor={(item, index) => `${item}-${index}`}
        renderItem={({ item, index }) => (
          <TouchableOpacity
            onPress={() => setSelectedVideo(item)}
            className="p-5 border-b-2 border-dark-200 flex-row justify-between items-center"
          >
            <Text className="text-white text-lg font-semibold">
              Episode {index + 1}
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
              <Image
                source={icons.arrow}
                className="size-5 mr-2"
                tintColor="#fff"
              />
              <Text className="text-white font-bold">Back to Details</Text>
            </TouchableOpacity>
            <Text className="text-white text-2xl font-bold">
              {movieData.title}
            </Text>
            <Text className="text-light-200 mt-1">Select an episode to play</Text>
          </View>
        )}
      />

      {/* Video Player Modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={!!selectedVideo} // Show modal if a video is selected
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