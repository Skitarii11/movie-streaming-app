import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { getAllMovies, getMoviesByCategory, getTrendingMovies } from "@/services/appwrite";
import useFetch from "@/services/usefetch";

import { icons } from "@/constants/icons";

import MovieCard from "@/components/MovieCard";
import SlideshowCard from "@/components/SlideshowCard";
import TrendingCard from "@/components/TrendingCard";
import MovieCarousel from "@/components/MovieCarousel";
import SectionHeader from "@/components/SectionHeader";

const { width } = Dimensions.get("window");

const Index = () => {
  const router = useRouter();

  const { data: newMovies, loading: newMoviesLoading } = useFetch(() => getMoviesByCategory("шинэ кино"));

  const {
    data: trendingMovies,
    loading: trendingLoading,
    error: trendingError,
  } = useFetch(getTrendingMovies);

  const {
    data: movies,
    loading: moviesLoading,
    error: moviesError,
  } = useFetch(() => getAllMovies(1));

  const flatListRef = useRef<FlatList<TrendingMovie>>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    if (trendingMovies && trendingMovies.length > 0) {
      interval = setInterval(() => {
        const nextIndex = (activeIndex + 1) % trendingMovies.length;
        flatListRef.current?.scrollToIndex({
          index: nextIndex,
          animated: true,
        });
        setActiveIndex(nextIndex);
      }, 4000);
    }
    return () => clearInterval(interval); // Cleanup on unmount
  }, [activeIndex, trendingMovies]);

  return (
    <SafeAreaView className="bg-primary flex-1">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <View className="px-4">
          <View className="flex-row items-center justify-between px-4 mt-12 mb-6">
            <Image source={icons.logo} className="w-12 h-10" />
            <TouchableOpacity onPress={() => router.push("/search")}>
              <Image
                source={icons.search}
                className="w-7 h-7"
                tintColor="#4A4A4A"
              />
            </TouchableOpacity>
          </View>
        </View>

        {trendingLoading ? (
          <ActivityIndicator size="large" color="#FF6B6B" />
        ) : (
          trendingMovies &&
          trendingMovies.length > 0 && (
            <FlatList
              ref={flatListRef}
              data={trendingMovies}
              keyExtractor={(item) => `slideshow-${item.movie_id}`}
              renderItem={({ item }) => (
                <View style={{ width: width, height: 220 }}>
                  <SlideshowCard movie={item} />
                </View>
              )}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(event) => {
                const index = Math.floor(
                  event.nativeEvent.contentOffset.x / width,
                );
                setActiveIndex(index);
              }}
            />
          )
        )}

        <View className="px-4">
          {trendingMovies && trendingMovies.length > 0 && (
            <View className="mt-10">
              <Text className="text-lg text-white font-bold mb-3">
                Тренд кинонууд
              </Text>
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                className="mb-4 mt-3"
                data={trendingMovies as TrendingMovie[]}
                contentContainerStyle={{
                  gap: 26,
                }}
                renderItem={({ item, index }) => (
                  <TrendingCard movie={item} index={index} />
                )}
                keyExtractor={(item) => `trending-${item.movie_id.toString()}`}
                ItemSeparatorComponent={() => <View className="w-4" />}
              />
            </View>
          )}

          <View className="mb-8">
                <SectionHeader
                  title='шинэ кинонууд'
                  viewAllHref={`/category/шинэ кино`}
                />
                <FlatList
                  data={newMovies || []}
                  keyExtractor={(item) => `шинэ кино-${item.$id}`}
                  renderItem={({ item }) => (
                    <MovieCard movie={item} containerStyles="w-36 mr-4" />
                  )}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingLeft: 16 }}
                />
          </View>

          <View className="mt-8">
            <SectionHeader
              title='Бүх кинонууд'
              viewAllHref={`/all-movies`}
            />
            <FlatList
              data={movies as Movie[]}
              renderItem={({ item }) => (
                <MovieCard movie={item} containerStyles="w-36 mr-4" />
              )}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingLeft: 16 }}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default Index;
