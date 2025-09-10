import { useState, useEffect } from "react";
import { View, Text, Image, FlatList, ActivityIndicator, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { useGlobalContext } from "@/context/GlobalProvider";
import useFetch from "@/services/usefetch";
import { getUserPurchases, getMovieById } from "@/services/appwrite";

import { icons } from "@/constants/icons";

interface SavedMovie extends Movie {
  expiresAt: string;
}

const SavedMovieCard = ({ movie }: { movie: SavedMovie }) => {
  const router = useRouter();

  const expirationDate = new Date(movie.expiresAt).toLocaleDateString();

  return (
    <View className="flex-row items-center mb-6">
      <Image
        source={{ uri: movie.posterUrl }}
        className="w-24 h-36 rounded-lg"
        resizeMode="cover"
      />
      <View className="flex-1 ml-4">
        <Text className="text-white text-lg font-bold" numberOfLines={1}>{movie.title}</Text>
        <Text className="text-light-200 mt-1">Access expires on: {expirationDate}</Text>
        <TouchableOpacity
          onPress={() => router.push(`/movie/watch/${movie.$id}`)}
          className="bg-accent mt-3 py-2 px-4 rounded-lg self-start"
        >
          <Text className="text-primary font-semibold">Watch Now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};


const Save = () => {
  const { user } = useGlobalContext();

  const fetchSavedMovies = async (): Promise<SavedMovie[]> => {
    if (!user) return []; // If no user is logged in, there are no saved movies

    // 1. Get all valid purchase documents for the user
    const purchases = await getUserPurchases(user.$id);

    // Filter out the general subscription for now, we only want specific movies
    const moviePurchases = purchases.filter(p => p.movieId !== 'ALL_ACCESS_SUBSCRIPTION');

    if (moviePurchases.length === 0) return [];

    // 2. For each purchase, fetch the full movie details
    const moviePromises = moviePurchases.map(p => getMovieById(p.movieId));
    const movies = await Promise.all(moviePromises);

    // 3. Combine the movie details with their specific expiration date
    const savedMovies = moviePurchases.map(purchase => {
      const movieDetails = movies.find(m => m?.$id === purchase.movieId);
      return {
        ...(movieDetails as Movie),
        expiresAt: purchase.expiresAt
      };
    }).filter(item => item.$id); // Filter out any potential mismatches

    return savedMovies;
  }

  const { data: savedMovies, loading, error, refetch } = useFetch(fetchSavedMovies);

  // Re-fetch data when the user object changes (e.g., after login)
  useEffect(() => {
    refetch();
  }, [user]);

  return (
    <SafeAreaView className="bg-primary flex-1">
      <FlatList
        data={savedMovies}
        keyExtractor={(item) => item.$id}
        renderItem={({ item }) => <SavedMovieCard movie={item} />}
        contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 10 }}
        ListHeaderComponent={() => (
          <View className="my-6">
            <Text className="text-white text-3xl font-bold">My Movies</Text>
            <Text className="text-light-200 text-base mt-1">
              Movies you have purchased access to.
            </Text>
          </View>
        )}
        ListEmptyComponent={() => (
          !loading && (
            <View className="flex-1 justify-center items-center mt-20">
              <Image source={icons.save} className="size-16" tintColor="#4B5563" />
              <Text className="text-gray-600 text-lg mt-4 text-center">
                You haven't purchased any movies yet.
              </Text>
            </View>
          )
        )}
      />

      {loading && (
        <ActivityIndicator size="large" color="#AB8BFF" className="absolute top-1/2 self-center" />
      )}
    </SafeAreaView>
  );
};

export default Save;