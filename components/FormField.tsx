import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  KeyboardTypeOptions,
} from "react-native";
import { icons } from "@/constants/icons";

interface FormFieldProps {
  title: string;
  value: string;
  placeholder: string;
  handleChangeText: (text: string) => void;
  otherStyles?: string;
  keyboardType?: KeyboardTypeOptions;
  isPassword?: boolean; // <-- 1. ADD THE NEW PROP
}

const FormField = ({
  title,
  value,
  placeholder,
  handleChangeText,
  otherStyles = "",
  isPassword = false, // <-- 2. Give it a default value
  ...props
}: FormFieldProps) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View className={`space-y-2 ${otherStyles}`}>
      <Text className="text-base text-light-200 font-medium">{title}</Text>
      <View className="w-full h-16 px-4 bg-dark-100 rounded-2xl border-2 border-dark-200 focus:border-accent flex-row items-center">
        <TextInput
          className="flex-1 text-white font-semibold text-base"
          value={value}
          placeholder={placeholder}
          placeholderTextColor="#A8B5DB"
          onChangeText={handleChangeText}
          // 3. Use the new prop for the logic
          secureTextEntry={isPassword && !showPassword}
          {...props}
        />
        {/* Also use the new prop here */}
        {isPassword && (
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <Image
              source={!showPassword ? icons.eye : icons.eyeHide}
              className="w-6 h-6"
              resizeMode="contain"
              tintColor="#A8B5DB"
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export default FormField;