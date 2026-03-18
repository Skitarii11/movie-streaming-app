import { useEffect, useState, useMemo  } from "react";
import { ActivityIndicator, FlatList, Image, Text, TouchableOpacity, View } from "react-native";

import { icons } from "@/constants/icons";

import { queryMovies, updateSearchCount } from "@/services/appwrite";
import useFetch from "@/services/usefetch";

import MovieCard from "@/components/MovieCard";
import SearchBar from "@/components/SearchBar";

const typeFilters = ['all', 'series', 'short_drama'];
const categoryFilters = [
  "all", "шинэ кино", "Орчин үе", "Адал явдал", "Анимэйшн", "Инээдмийн", 
  "Гэмт хэрэг", "Тулаан", "Триллер", "Сэтгэл зүй", "Нууцлаг", "Драма", 
  "Аймшиг", "Дайн", "Түүхэн", "Өшөө авалт", "Хайр дурлал", "Sci-Fi", "Уран зөгнөлт",
];

const FilterButton = ({ label, isActive, onPress }: { label: string, isActive: boolean, onPress: () => void }) => (
  <TouchableOpacity
    onPress={onPress}
    className={`px-4 py-2 rounded-lg mr-3 ${isActive ? 'bg-accent' : 'bg-secondary'}`}
  >
    <Text className={`capitalize ${isActive ? 'text-white' : 'text-white'}`}>{label}</Text>
  </TouchableOpacity>
);

const Search = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const [activeType, setActiveType] = useState<'all' | 'series' | 'short_drama'>('all');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const {
    data: movies = [],
    loading,
    error,
    refetch: loadMovies,
    reset,
  } =  useFetch(() => queryMovies(searchQuery, activeType, activeCategory));

  const handleSearch = (text: string) => {
    setSearchQuery(text);
  };

   useEffect(() => {
    loadMovies();
  }, [searchQuery, activeType, activeCategory]);

  useEffect(() => {
    const updateMetrics = async () => {
        if (searchQuery.trim() && movies && movies.length > 0) {
            await updateSearchCount(searchQuery.trim(), movies[0]);
        }
    }
    const timeoutId = setTimeout(updateMetrics, 600);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, movies]);

  return (
    <View className="flex-1 bg-primary">
      <FlatList
        className="px-5"
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
        }}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListHeaderComponent={
          <>
            <View className="w-full flex-row justify-center mt-20 items-center">
              <Image source={icons.logo} className="w-12 h-10" />
            </View>
            <View className="my-5">
              <SearchBar
                placeholder="Кино хайх"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            <View>
              <Text className="text-lightText text-white mb-3">Төрөл</Text>
              <FlatList
                data={typeFilters}
                keyExtractor={item => item}
                renderItem={({item}) => (
                  <FilterButton 
                    label={item} 
                    isActive={item === activeType}
                    onPress={() => setActiveType(item as any)}
                  />
                )}
                horizontal
                showsHorizontalScrollIndicator={false}
              />
            </View>

            <View className="mt-4">
              <Text className="text-lightText text-white mb-3">Ангилал</Text>
              <FlatList
                data={categoryFilters}
                keyExtractor={item => item}
                renderItem={({item}) => (
                  <FilterButton 
                    label={item} 
                    isActive={item === activeCategory}
                    onPress={() => setActiveCategory(item)}
                  />
                )}
                horizontal
                showsHorizontalScrollIndicator={false}
              />
            </View>

            {loading && (
              <ActivityIndicator
                size="large"
                color="#0000ff"
                className="my-3"
              />
            )}
            {error && (
              <Text className="text-red-500 px-5 my-3">
                Error: {error.message}
              </Text>
            )}

            {!loading &&
              !error &&
              searchQuery.trim() &&
              movies &&
              movies.length > 0 && (
                <Text className="text-xl text-white font-bold">
                  Хайлтын үр дүн{" "}
                  <Text className="text-accent">{searchQuery}</Text>
                </Text>
              )}
          </>
        }
        ListEmptyComponent={
          !loading && !error && movies && movies.length === 0 ? (
            <View className="mt-10 px-5">
              <Text className="text-center text-gray-500">
                {searchQuery.trim()
                  ? "Кино олдсонгүй"
                  : "Кино хайхын тулд бичиж эхлээрэй"}
              </Text>
            </View>
          ) : null
        }
      />
      
    </View>
  );
};

export default Search;
