import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  Dispatch,
  SetStateAction,
} from "react";
import { getCurrentUser, signOut } from "../services/appwrite";
import { useRouter } from "expo-router";
import { Alert } from "react-native";
import { Models } from "react-native-appwrite";

// 1. UPDATE THE INTERFACE to include the setter functions
interface IGlobalContext {
  isLoggedIn: boolean;
  setIsLoggedIn: Dispatch<SetStateAction<boolean>>; // <-- ADD THIS
  user: Models.User<Models.Preferences> | null;
  setUser: Dispatch<SetStateAction<Models.User<Models.Preferences> | null>>; // <-- ADD THIS
  isLoading: boolean;
  isLoggingOut: boolean;
  logout: () => Promise<void>;
}

const GlobalContext = createContext<IGlobalContext | null>(null);

export const useGlobalContext = () => {
  const context = useContext(GlobalContext);
  if (!context) {
    throw new Error("useGlobalContext must be used within a GlobalProvider");
  }
  return context;
};

interface GlobalProviderProps {
  children: ReactNode;
}

const GlobalProvider = ({ children }: GlobalProviderProps) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const router = useRouter();

  useEffect(() => {
    getCurrentUser()
      .then((res) => {
        if (res) {
          setIsLoggedIn(true);
          setUser(res);
        } else {
          setIsLoggedIn(false);
          setUser(null);
        }
      })
      .catch((error) => {
        console.log(error);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const logout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
      setUser(null);
      setIsLoggedIn(false);
      router.replace("/sign-in");
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <GlobalContext.Provider
      // 2. UPDATE THE VALUE to pass the setter functions down
      value={{
        isLoading,
        isLoggedIn,
        setIsLoggedIn, // <-- ADD THIS
        user,
        setUser,       // <-- ADD THIS
        logout,
        isLoggingOut,
      }}
    >
      {children}
    </GlobalContext.Provider>
  );
};

export default GlobalProvider;