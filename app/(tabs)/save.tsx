import { useState, useEffect, useCallback } from "react";
import { View, Text, Image, FlatList, ActivityIndicator, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";

import { useGlobalContext } from "@/context/GlobalProvider";
import useFetch from "@/services/usefetch";
import { getUserPurchases, getMovieById } from "@/services/appwrite";
import { icons } from "@/constants/icons";

interface SavedItem {
  type: 'subscription' | 'movie';
  title: string;
  expiresAt: string;
  movieDetails?: Movie;
}

const SavedItemCard = ({ item }: { item: SavedItem }) => {
    const router = useRouter();
    const expirationDate = new Date(item.expiresAt).toLocaleDateString();

    return (
        <View className="flex-row items-center mb-6">
            <Image
                source={item.movieDetails ? { uri: item.movieDetails.posterUrl } : icons.save}
                className="w-24 h-36 rounded-lg bg-dark-200"
                resizeMode={item.movieDetails ? "cover" : "contain"}
                tintColor={!item.movieDetails ? "#A8B5DB" : undefined}
            />
            <View className="flex-1 ml-4">
                <Text className="text-white text-lg font-bold" numberOfLines={1}>{item.title}</Text>
                <Text className="text-light-200 mt-1">Access expires on: {expirationDate}</Text>
                {item.type === 'movie' && item.movieDetails && (
                    <TouchableOpacity
                        onPress={() => router.push(`/movie/watch/${item.movieDetails?.$id}`)}
                        className="bg-accent mt-3 py-2 px-4 rounded-lg self-start">
                        <Text className="text-primary font-semibold">Watch Movie</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};


const Save = () => {
  const { user } = useGlobalContext();

  const fetchSavedItems = async (): Promise<SavedItem[]> => {
    if (!user) return [];

    const purchases = await getUserPurchases(user.$id);
    if (purchases.length === 0) return [];

    // --- THIS IS THE FIX ---
    const savedItems: SavedItem[] = [];
    const moviePurchasePromises: Promise<Movie | null>[] = [];
    const moviePurchases: Purchase[] = [];

    // 1. Separate subscriptions from single movie purchases
    for (const p of purchases) {
      if (p.movieId === 'ALL_ACCESS_PREMIUM') {
        savedItems.push({ type: 'subscription', title: 'Premium Subscription', expiresAt: p.expiresAt });
      } else if (p.movieId === 'ALL_ACCESS_SERIES') {
        savedItems.push({ type: 'subscription', title: 'Series Subscription', expiresAt: p.expiresAt });
      } else if (p.movieId === 'ALL_ACCESS_MOVIES') {
        savedItems.push({ type: 'subscription', title: 'Movies Subscription', expiresAt: p.expiresAt });
      } else {
        // It's a real movie ID, add it to the list to be fetched
        moviePurchasePromises.push(getMovieById(p.movieId));
        moviePurchases.push(p);
      }
    }

    // 2. Fetch all movie details at once
    const movies = await Promise.all(moviePurchasePromises);

    // 3. Combine the fetched movie details with their purchase info
    moviePurchases.forEach((purchase, index) => {
      const movieDetails = movies[index];
      if (movieDetails) { // Only add if the movie was found
        savedItems.push({
          type: 'movie',
          title: movieDetails.title,
          expiresAt: purchase.expiresAt,
          movieDetails: movieDetails as Movie
        });
      }
    });

    return savedItems;
  }

  const { data: savedItems, loading, error, refetch } = useFetch(fetchSavedItems);

  useFocusEffect(useCallback(() => { refetch(); }, []));

  return (
    <SafeAreaView className="bg-primary flex-1">
      <FlatList
        data={savedItems}
        keyExtractor={(item, index) => `${item.type}-${index}`}
        renderItem={({ item }) => <SavedItemCard item={item} />}
        contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 10 }}
        ListHeaderComponent={() => (
          <View className="my-6">
            <Text className="text-white text-3xl font-bold">My Library</Text>
            <Text className="text-light-200 text-base mt-1">Your active subscriptions and purchased movies.</Text>
          </View>
        )}
        ListEmptyComponent={() => (
          !loading && (
            <View className="flex-1 justify-center items-center mt-20">
              <Image source={icons.save} className="size-16" tintColor="#4B5563" />
              <Text className="text-gray-600 text-lg mt-4 text-center">
                Та хараахан ямар ч кино худалдаж аваагүй байна.
              </Text>
            </View>
          )
        )}
      />
      {loading && (<ActivityIndicator size="large" color="#AB8BFF" className="absolute top-1/2 self-center" />)}
    </SafeAreaView>
  );
};

export default Save;