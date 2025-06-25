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
}

const FormField = ({
  title,
  value,
  placeholder,
  handleChangeText,
  otherStyles = "",
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
          secureTextEntry={title === "Password" && !showPassword}
          {...props}
        />
        {title === "Password" && (
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            {/* Make sure you have 'eye.png' and 'eye-hide.png' icons */}
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