import { LinearGradient } from "expo-linear-gradient";
import { Link, router } from "expo-router";
import { ImageBackground, Text, TouchableOpacity, View } from "react-native";

interface SlideshowCardProps {
  movie: TrendingMovie;
}

const SlideshowCard = ({ movie }: SlideshowCardProps) => {
  return (
    <Link href={`/movie/${movie.movie_id}`} asChild>
      <TouchableOpacity
        activeOpacity={0.8}
        className="rounded-2xl overflow-hidden mx-4"
      >
        <ImageBackground
          source={{ uri: movie.poster_url }}
          className="w-full h-full justify-end"
          resizeMode="cover"
        >
          {/* This gradient makes the text readable against any background image */}
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.8)"]}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              height: "70%",
            }}
          />

          <View className="p-4">
            <Text className="text-white text-2xl font-bold" numberOfLines={1}>
              {movie.title}
            </Text>
            {/* The subtitle from your design */}
            <Text className="text-white text-sm font-normal mt-1">
              Шинэ анги нэмэгдлээ
            </Text>

            {/* The "Watch" button */}
            <TouchableOpacity
              className="bg-white rounded-full px-5 py-2 mt-3 self-start"
              activeOpacity={0.7}
              onPress={() => router.push(`/movie/${movie.movie_id}`)}
            >
              <Text className="text-darkText font-bold text-sm">Үзэх</Text>
            </TouchableOpacity>
          </View>
        </ImageBackground>
      </TouchableOpacity>
    </Link>
  );
};

export default SlideshowCard;
