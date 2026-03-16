import { useRouter } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";

interface SectionHeaderProps {
  title: string;
  viewAllHref: string;
}

const SectionHeader = ({ title, viewAllHref }: SectionHeaderProps) => {
  const router = useRouter();

  return (
    <View className="flex-row justify-between items-center px-4 mb-4">
      <Text className="text-xl font-bold text-darkText">{title}</Text>
      <TouchableOpacity onPress={() => router.push(viewAllHref)}>
        <Text className="text-sm font-semibold text-accent">Бүгдийг үзэх</Text>
      </TouchableOpacity>
    </View>
  );
};

export default SectionHeader;
