import { useState } from "react";
import { View, Text, ScrollView, Image, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link, useRouter } from "expo-router";

import { useGlobalContext } from "@/context/GlobalProvider";
import { createUser } from "@/services/appwrite";

import { icons } from "@/constants/icons";
import FormField from "@/components/FormField";
import CustomButton from "@/components/CustomButton";

const SignUp = () => {
  const { setUser, setIsLoggedIn } = useGlobalContext();
  // Change the state to use 'phone'
  const [form, setForm] = useState({ username: "", phone: "", password: "", registrationId: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const submit = async () => {
    // Update the validation check
    if (!form.username || !form.phone || !form.password || !form.registrationId) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    setIsSubmitting(true);
    try {
      // Call the updated createUser function
      const result = await createUser(form.phone, form.password, form.username, form.registrationId);
      setUser(result);
      setIsLoggedIn(true);
      router.replace("/");
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="bg-primary h-full">
      <ScrollView contentContainerStyle={{ height: "100%" }}>
        <View className="w-full justify-center min-h-[85vh] px-4 my-6">
          <Image source={icons.logo} className="w-20 h-16 mx-auto" resizeMode="contain" />
          <Text className="text-2xl text-white text-semibold mt-10 text-center font-bold">
            Бүртгүүлэх (Sign Up)
          </Text>

          <FormField
            title="Нэр"
            value={form.username}
            handleChangeText={(e) => setForm({ ...form, username: e })}
            otherStyles="mt-10"
            placeholder="Choose a unique username"
          />

          <FormField
            title="Утасны дугаар"
            value={form.phone}
            handleChangeText={(e) => setForm({ ...form, phone: e })}
            otherStyles="mt-7"
            keyboardType="phone-pad" // Use a numeric keyboard
            placeholder="Your phone number"
          />

          <FormField
            title="Регистрийн дугаар"
            value={form.registrationId}
            handleChangeText={(e) => setForm({ ...form, registrationId: e })}
            otherStyles="mt-7"
            placeholder="e.g., AB12345678"
          />

          <FormField
            title="Нууц үг"
            value={form.password}
            handleChangeText={(e) => setForm({ ...form, password: e })}
            otherStyles="mt-7"
            placeholder="Your password"
          />

          <CustomButton
            title="Sign Up"
            handlePress={submit}
            containerStyles="mt-7"
            isLoading={isSubmitting}
          />
          
          <View className="justify-center pt-5 flex-row gap-2">
            <Text className="text-lg text-light-200">
              Бүртгэлтэй юу? 
            </Text>
            <Link href="/sign-in" className="text-lg font-semibold text-accent">
              Нэвтрэх
            </Link>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default SignUp;