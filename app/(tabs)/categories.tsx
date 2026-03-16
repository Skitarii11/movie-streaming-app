import MovieCard from "@/components/MovieCard";
import SectionHeader from "@/components/SectionHeader";
import { getMoviesByCategory } from "@/services/appwrite";
import useFetch from "@/services/usefetch";
import { useRouter } from "expo-router";
import { FlatList, SafeAreaView, ScrollView, Text, View } from "react-native";

const categoriesList = [
  "Орчин үе",
  "Түүхэн",
  "Адал явдал",
  "Инээдмийн",
  // ... add all your categories here
];

interface CategorySectionProps {
  categoryName: string;
}

const CategoriesPage = () => {
  return (
    <SafeAreaView className="bg-primary flex-1">
      <ScrollView>
        <Text className="text-3xl font-bold text-darkText p-4 mt-12">
          Ангилал
        </Text>

        {categoriesList.map((category) => (
          <CategorySection key={category} categoryName={category} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

// Create a helper component to keep the code clean
const CategorySection = ({ categoryName }: CategorySectionProps) => {
  const router = useRouter();
  const { data: movies } = useFetch(() => getMoviesByCategory(categoryName));

  return (
    <View className="mb-8">
      <SectionHeader
        title={categoryName}
        viewAllHref={`/category/${categoryName}`}
      />
      <FlatList
        data={movies}
        keyExtractor={(item) => `${categoryName}-${item.$id}`}
        renderItem={({ item }) => (
          <MovieCard movie={item} containerStyles="w-36 mr-4" />
        )}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingLeft: 16 }}
      />
    </View>
  );
};

export default CategoriesPage;
