import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import MovieCard from "@/components/MovieCard";
import { icons } from "@/constants/icons";
import { getMoviesByCategory } from "@/services/appwrite";
import useFetch from "@/services/usefetch";

const CategoryPage = () => {
  const router = useRouter();
  const { query } = useLocalSearchParams();
  const categoryName = Array.isArray(query) ? query[0] : query;

  const {
    data: movies,
    loading,
    error,
  } = useFetch(() => getMoviesByCategory(categoryName as string));

  return (
    <SafeAreaView className="bg-primary flex-1">
      <FlatList
        data={movies}
        keyExtractor={(item) => item.$id}
        renderItem={({ item }) => (
          <MovieCard movie={item} containerStyles="w-[30%]" />
        )}
        numColumns={3}
        columnWrapperStyle={{
          justifyContent: "flex-start",
          gap: 16,
          marginVertical: 16,
          paddingHorizontal: 16,
        }}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListHeaderComponent={
          <>
            <View className="flex-row items-center p-4">
              <TouchableOpacity onPress={() => router.back()}>
                <Image
                  source={icons.arrow}
                  className="size-6"
                  tintColor="#fff"
                />
              </TouchableOpacity>
              <Text className="text-white text-2xl font-bold ml-4">
                Ангилал: <Text className="text-accent">{categoryName}</Text>
              </Text>
            </View>

            {loading && (
              <ActivityIndicator
                size="large"
                color="#AB8BFF"
                className="my-3"
              />
            )}
            {error && (
              <Text className="text-red-500 px-5 my-3">
                Error: {error.message}
              </Text>
            )}
          </>
        }
        ListEmptyComponent={
          !loading && !error ? (
            <View className="mt-10 px-5">
              <Text className="text-center text-gray-500">
                No movies found in this category.
              </Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
};

export default CategoryPage;
