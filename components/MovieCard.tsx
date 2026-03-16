import { Link } from "expo-router";
import { Image, Text, TouchableOpacity, View } from "react-native";

interface MovieCardProps {
  movie: Movie;
  containerStyles?: string;
}

const MovieCard = ({ movie, containerStyles }: MovieCardProps) => {
  return (
    <Link href={`/movie/${movie.$id}`} asChild>
      {/* 2. Apply the custom styles to the main container */}
      <TouchableOpacity className={`space-y-2 ${containerStyles}`}>
        <View className="w-full h-48">
          <Image
            source={{
              uri:
                movie.posterUrl ||
                "https://placehold.co/600x400/1a1a1a/FFFFFF.png?text=No+Image",
            }}
            className="w-full h-full rounded-xl"
            resizeMode="cover"
          />
        </View>

        <Text className="text-white text-sm font-semibold" numberOfLines={1}>
          {movie.title}
        </Text>
      </TouchableOpacity>
    </Link>
  );
};

export default MovieCard;
