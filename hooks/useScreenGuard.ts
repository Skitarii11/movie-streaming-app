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

  useFocusEffect(
    React.useCallback(() => {
      if (!isActive) return;

      preventCapture();

      return () => {
        allowCapture();
      };
    }, [isActive])
  );

  React.useEffect(() => {
    if (!isActive) return;

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        preventCapture();
      } else {
        allowCapture();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [isActive]);

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