import React from 'react';
import { Platform, Alert, AppState } from 'react-native';
import * as ScreenCapture from 'expo-screen-capture';
import { useFocusEffect } from 'expo-router';

export const useScreenGuard = (isActive: boolean = true) => {

  // This function activates screen capture prevention on Android
  const preventCapture = async () => {
    if (Platform.OS === 'android') {
      try {
        await ScreenCapture.preventScreenCaptureAsync();
      } catch (e) {
        console.error("Failed to prevent screen capture:", e);
      }
    }
  };

  // This function allows screen capture on Android
  const allowCapture = async () => {
    if (Platform.OS === 'android') {
      try {
        await ScreenCapture.allowScreenCaptureAsync();
      } catch (e) {
        console.error("Failed to allow screen capture:", e);
      }
    }
  };

  // --- THE DEFINITIVE FIX: COMBINING HOOKS ---

  // 1. useFocusEffect: Handles navigation TO and FROM the screen
  useFocusEffect(
    React.useCallback(() => {
      if (!isActive) return;

      // When the screen is focused, prevent capture
      preventCapture();

      // When the screen is unfocused, allow capture again
      return () => {
        allowCapture();
      };
    }, [isActive])
  );

  // 2. useEffect for AppState: Handles the app being backgrounded or foregrounded
  React.useEffect(() => {
    if (!isActive) return;

    // Listen for changes in the app's state (active, background, etc.)
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        // When the app becomes active, re-apply the protection
        preventCapture();
      } else {
        // When the app goes to the background, we can allow capture
        // This is important for letting other apps function normally
        allowCapture();
      }
    });

    // Cleanup the listener when the component unmounts
    return () => {
      subscription.remove();
    };
  }, [isActive]);


  // 3. useEffect for iOS screenshot detection (this logic is correct)
  React.useEffect(() => {
    if (!isActive) return;
    
    let subscription: ScreenCapture.Subscription | undefined;
    if (Platform.OS === 'ios') {
      subscription = ScreenCapture.addScreenshotListener(() => {
        Alert.alert("Notice", "Screen capture is not permitted on this screen.");
      });
    }

    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, [isActive]);
};