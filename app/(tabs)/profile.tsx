// app/(tabs)/profile.tsx

import { View, Text, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useGlobalContext } from "@/context/GlobalProvider";
import { icons } from "@/constants/icons";
import CustomButton from "@/components/CustomButton";

const Profile = () => {
  // Destructure the user object and the new logout function
  const { user, logout, isLoggingOut } = useGlobalContext();

  return (
    <SafeAreaView className="bg-primary flex-1 px-10">
      <View className="flex justify-center items-center flex-1">
        <Image
          source={icons.person} // Or a user-specific avatar later
          className="size-20"
          tintColor="#A8B5DB"
          resizeMode="contain"
        />

        {/* Display user information */}
        <Text className="text-white text-2xl font-bold mt-4">
          {user?.name ?? "Guest User"}
        </Text>
        <Text className="text-light-200 text-base mt-1">
          {user?.email ?? ""}
        </Text>

        {/* Use the CustomButton for consistency and to show loading state */}
        <CustomButton
          title="Logout"
          handlePress={logout}
          containerStyles="mt-10 mx-8"
          isLoading={isLoggingOut}
        />
      </View>
    </SafeAreaView>
  );
};

export default Profile;