import { Audio } from 'expo-av';
import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "react-native";

import "./globals.css";

import GlobalProvider, { useGlobalContext } from "@/context/GlobalProvider";
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync();

const RootLayout = () => {
  const { isLoading, isLoggedIn } = useGlobalContext();
  const router = useRouter();
  const segments = useSegments();

  // This hook handles the initial redirection and splash screen
  useEffect(() => {
    if (!isLoading) {
      const inAuthGroup = segments[0] === "(auth)";
      if (isLoggedIn && inAuthGroup) {
        router.replace("/");
      } else if (!isLoggedIn) {
        router.replace("/sign-in");
      }
      SplashScreen.hideAsync();
    }
  }, [isLoading, isLoggedIn]);

  // This hook configures the audio and only runs once
  useEffect(() => {
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
    });
  }, []);

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="movie/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="movie/watch/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="category/[query]" options={{ headerShown: false }} />
    </Stack>
  );
};

export default function AppLayout() {
  return (
    <>
      <GlobalProvider>
        <RootLayout />
      </GlobalProvider>
      <StatusBar hidden={true} />
    </>
  );
}