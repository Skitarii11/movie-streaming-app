import { Link } from "expo-router";
import { Text, Image, TouchableOpacity, View } from "react-native";
import { icons } from "@/constants/icons";

// Destructure the new props based on your Appwrite document
const MovieCard = ({
  $id,
  posterUrl,
  title,
  rating,
  releaseYear,
  type,
}: Movie) => {
  return (
    // Navigate using the Appwrite document ID ($id)
    <Link href={`/movie/${$id}`} asChild>
      <TouchableOpacity className="w-[30%]">
        <Image
          // Use posterUrl now
          source={{
            uri: posterUrl || "https://placehold.co/600x400/1a1a1a/FFFFFF.png",
          }}
          className="w-full h-52 rounded-lg"
          resizeMode="cover"
        />

        <Text className="text-sm font-bold text-white mt-2" numberOfLines={1}>
          {title}
        </Text>

        <View className="flex-row items-center justify-start gap-x-1">
          <Image source={icons.star} className="size-4" />
          {/* Use the rating directly */}
          <Text className="text-xs text-white font-bold uppercase">{rating.toFixed(1)}</Text>
        </View>

        <View className="flex-row items-center justify-between">
          {/* Use releaseYear */}
          <Text className="text-xs text-light-300 font-medium mt-1">
            {releaseYear}
          </Text>
          <Text className="text-xs font-medium text-light-300 uppercase">
            {type}
          </Text>
        </View>
      </TouchableOpacity>
    </Link>
  );
};

export default MovieCard;