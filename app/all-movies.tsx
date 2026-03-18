import { View, Text, ActivityIndicator, FlatList, TouchableOpacity, Image } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import useFetch from "@/services/usefetch";
import { getAllMovies } from "@/services/appwrite";
import MovieCard from "@/components/MovieCard";
import { icons } from "@/constants/icons";
import { useEffect, useState } from "react";

const AllMoviesPage = () => {
  const router = useRouter();

  const [movies, setMovies] = useState<Movie[]>([]);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    const fetchInitialMovies = async () => {
      setIsLoading(true);
      try {
        const initialMovies = await getAllMovies(1);
        setMovies(initialMovies);
        setPage(1);
        setHasMore(initialMovies.length > 0);
      } catch (error) {
        console.error("Failed to fetch initial movies:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchInitialMovies();
  }, []);

  const loadMore = async () => {
    if (isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    try {
      const nextPage = page + 1;
      const newMovies = await getAllMovies(nextPage);

      if (newMovies.length > 0) {
        setMovies(prevMovies => [...prevMovies, ...newMovies]);
        setPage(nextPage);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error("Failed to load more movies:", error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  return (
    <SafeAreaView className="bg-primary flex-1">
      <FlatList
        data={movies}
        keyExtractor={(item) => item.$id}
        renderItem={({ item }) => <MovieCard movie={item} containerStyles="w-[30%]" />}
        numColumns={3}
        columnWrapperStyle={{
          justifyContent: "flex-start",
          gap: 16,
          marginVertical: 8,
          paddingHorizontal: 16,
        }}
        contentContainerStyle={{ paddingBottom: 100 }}

        // --- PAGINATION PROPS ---
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={() => 
          isLoadingMore && <ActivityIndicator size="large" color="#FF6B6B" className="my-4" />
        }

        ListHeaderComponent={
          <>
            <View className="flex-row items-center p-4 mt-8 mb-4">
              <TouchableOpacity onPress={() => router.back()}>
                <Image source={icons.arrow} className="size-6" tintColor="#4A4A4A" />
              </TouchableOpacity>
              <Text className="text-2xl font-bold text-white ml-4">
                Бүх кинонууд
              </Text>
            </View>
            {isLoading && movies.length === 0 && (
              <ActivityIndicator size="large" color="#FF6B6B" className="my-3" />
            )}
          </>
        }
        ListEmptyComponent={
          !isLoading ? (
            <View className="mt-10 px-5">
              <Text className="text-center text-gray-500">No movies found.</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
};

export default AllMoviesPage;