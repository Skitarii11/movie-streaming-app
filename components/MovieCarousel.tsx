import { Href, useRouter } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import MovieCard from "@/components/MovieCard";

interface MovieCarouselProps {
  title: string;
  movies: Movie[];
  isLoading: boolean;
  viewAllHref?: Href;
}

const MovieCarousel = ({
  title,
  movies,
  isLoading,
  viewAllHref,
}: MovieCarouselProps) => {
  const router = useRouter();

  const renderContent = () => {
    if (isLoading) {
      return (
        <ActivityIndicator size="large" color="#FF6B6B" className="mt-8" />
      );
    }

    if (!movies || movies.length === 0) {
      return (
        <View className="px-4">
          <Text className="text-lightText">
            No movies found in this section.
          </Text>
        </View>
      );
    }

    return (
      <FlatList
        data={movies}
        keyExtractor={(item) => item.$id}
        renderItem={({ item }) => <MovieCard movie={item} />}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingLeft: 16 }}
      />
    );
  };

  return (
    <View className="mt-8">
      {/* Section Header */}
      <View className="flex-row justify-between items-center px-4 mb-4">
        <Text className="text-xl font-bold text-darkText">{title}</Text>
        {viewAllHref && (
          <TouchableOpacity onPress={() => router.push(viewAllHref)}>
            <Text className="text-sm font-semibold text-accent">
              Бүгдийг үзэх
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Content */}
      {isLoading ? (
        <ActivityIndicator size="large" color="#FF6B6B" className="mt-8" />
      ) : movies.length > 0 ? (
        <FlatList
          data={movies}
          keyExtractor={(item) => item.$id}
          renderItem={({ item }) => <MovieCard movie={item} />}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingLeft: 16 }}
        />
      ) : (
        <View className="px-4">
          <Text className="text-lightText">
            No movies found in this section.
          </Text>
        </View>
      )}
      {renderContent()}
    </View>
  );
};

export default MovieCarousel;
