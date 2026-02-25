import { useState } from "react";
import { View, Text, ScrollView, Image, Alert, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link, useRouter } from "expo-router";

import { useGlobalContext } from "@/context/GlobalProvider"; // You will create this
import { signIn, getCurrentUser, appwrite } from "@/services/appwrite"; // You will add 'signIn' to this file

import { icons } from "@/constants/icons";
import FormField from "@/components/FormField";
import CustomButton from "@/components/CustomButton";

const SignIn = () => {
  const { setUser, setIsLoggedIn } = useGlobalContext();
  // Change the state to use 'phone'
  const [form, setForm] = useState({ phone: "", password: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  type ForgotPasswordStep = 'default' | 'enterId' | 'enterNewPassword';
  const [forgotPasswordStep, setForgotPasswordStep] = useState<ForgotPasswordStep>('default');

  const [signInForm, setSignInForm] = useState({ phone: "", password: "" });

  const [resetForm, setResetForm] = useState({ registrationId: "", newPassword: "" });
  const [userIdToReset, setUserIdToReset] = useState<string | null>(null);

  const submit = async () => {
    // Update the validation check
    if (!form.phone || !form.password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    setIsSubmitting(true);
    try {
      // Call the updated signIn function
      await signIn(form.phone, form.password);
      const result = await getCurrentUser();
      setUser(result);
      setIsLoggedIn(true);

      Alert.alert("Success", "User signed in successfully");
      router.replace("/");
    } catch (error: any) {
      Alert.alert("Error", error.message);
      setForgotPasswordStep('enterId');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyId = async () => {
    if (!resetForm.registrationId) {
      Alert.alert("Error", "Please enter your registration ID.");
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await appwrite.functions.createExecution(
        '699ed6870003839aaad4',
        JSON.stringify({ registrationId: resetForm.registrationId })
      );
      const response = JSON.parse(result.responseBody);

      if (response.success) {
        setUserIdToReset(response.userId);
        setForgotPasswordStep('enterNewPassword');
      } else {
        Alert.alert("Error", response.message || "Verification failed.");
      }
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetForm.newPassword) {
      Alert.alert("Error", "Please enter a new password.");
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await appwrite.functions.createExecution(
        '699ed7afb4a586fcf44f',
        JSON.stringify({ userId: userIdToReset, newPassword: resetForm.newPassword })
      );
      const response = JSON.parse(result.responseBody);

      if (response.success) {
        Alert.alert("Success", "Your password has been reset successfully. Please log in.");
        setForgotPasswordStep('default'); // Reset the form
        setResetForm({ registrationId: "", newPassword: "" });
      } else {
        Alert.alert("Error", response.message || "Failed to reset password.");
      }
    } catch (e: any) {
      Alert.alert("Error", e.message);
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
            {forgotPasswordStep === 'default' ? 'Нэвтрэх (Log In)' : 'Нууц үг сэргээх (Reset Password)'}
          </Text>
            {forgotPasswordStep === 'default' && (
              <>
                <FormField
                  title="Утасны дугаар"
                  value={form.phone}
                  handleChangeText={(e) => setForm({ ...form, phone: e })}
                  otherStyles="mt-7"
                  keyboardType="phone-pad" // Use a numeric keyboard
                  placeholder="Your phone number"
                />

                <FormField
                  title="Нууц үг"
                  value={form.password}
                  handleChangeText={(e) => setForm({ ...form, password: e })}
                  otherStyles="mt-7"
                  placeholder="Your password"
                  isPassword={true}
                />

                <CustomButton
                  title="Sign In"
                  handlePress={submit}
                  containerStyles="mt-7"
                  isLoading={isSubmitting}
                />

                <View className="justify-center pt-5 flex-row gap-2">
                  <Text className="text-lg text-light-200">
                    Бүртгэлгүй юу? 
                  </Text>
                  <Link href="/sign-up" className="text-lg font-semibold text-accent">
                    Бүртгүүлэх
                  </Link>
                </View>
             </>
            )}

            {forgotPasswordStep === 'enterId' && (
              <>
                <FormField
                  title="Регистрийн дугаар"
                  value={resetForm.registrationId}
                  handleChangeText={(e) => setResetForm({ ...resetForm, registrationId: e })}
                  otherStyles="mt-7"
                  placeholder="Enter your registration ID"
                />
                <CustomButton title="Verify" handlePress={handleVerifyId} containerStyles="mt-7" isLoading={isSubmitting} />
                <TouchableOpacity onPress={() => setForgotPasswordStep('default')} className="mt-5">
                  <Text className="text-light-200 text-center">Back to Login</Text>
                </TouchableOpacity>
              </>
            )}

            {forgotPasswordStep === 'enterNewPassword' && (
              <>
                <FormField
                  title="New Password"
                  value={resetForm.newPassword}
                  handleChangeText={(e) => setResetForm({ ...resetForm, newPassword: e })}
                  otherStyles="mt-7"
                  placeholder="Enter your new password"
                  isPassword={true}
                />
                <CustomButton title="Reset Password" handlePress={handleResetPassword} containerStyles="mt-7" isLoading={isSubmitting} />
              </>
            )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default SignIn;