import React from 'react';
import { Platform, Alert } from 'react-native';
import * as ScreenCapture from 'expo-screen-capture';
import { useFocusEffect } from 'expo-router';

export const useScreenGuard = () => {
  // Android: Block screen capture when the screen is focused
  useFocusEffect(
    React.useCallback(() => {
      if (Platform.OS === 'android') {
        ScreenCapture.preventScreenCaptureAsync();
      }

      return () => {
        if (Platform.OS === 'android') {
          ScreenCapture.allowScreenCaptureAsync();
        }
      };
    }, [])
  );

  // iOS: Listen for screenshots
  React.useEffect(() => {
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
  }, []);
};