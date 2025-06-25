import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

const AuthLayout = () => {
  return (
    <>
      <Stack>
        <Stack.Screen
          name="sign-in"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="sign-up"
          options={{
            headerShown: false,
          }}
        />
      </Stack>

      {/* It's good practice to keep this StatusBar component here 
          to style the status bar specifically for the auth screens */}
      <StatusBar backgroundColor="#030014" style="light" />
    </>
  );
};

export default AuthLayout;