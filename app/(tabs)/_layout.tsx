import { Tabs } from "expo-router";
import { Image, Text, View } from "react-native";

import { icons } from "@/constants/icons";

function TabIcon({ focused, icon, title }: any) {
  return (
    <View className="items-center justify-start pt-7 gap-1">
      <Image
        source={icon}
        resizeMode="contain"
        tintColor={focused ? "#FF6B6B" : "#8D8D8D"}
        className="w-7 h-7"
      />
      <Text
        className={`${focused ? "font-semibold text-accent" : "font-normal text-lightText"} text-xs`}
      >
        {title}
      </Text>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarShowLabel: false,
        tabBarItemStyle: {
          width: "100%",
          height: "100%",
          justifyContent: "center",
          alignItems: "center",
        },
        tabBarStyle: {
          backgroundColor: "#0F0D23",
          borderRadius: 50,
          marginHorizontal: 20,
          marginBottom: 36,
          height: 60,
          position: "absolute",
          overflow: "hidden",
          borderWidth: 1,
          borderColor: "#0F0D23",
        },
      }}
    >
      {/* 1. Home Screen (Нүүр) */}
      <Tabs.Screen
        name="index"
        options={{
          title: "Нүүр",
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon={icons.home}/>
          ),
        }}
      />

      {/* 2. Search Screen*/}
      <Tabs.Screen
        name="search"
        options={{
          title: "Search",
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon={icons.search} />
          ),
        }}
      />

      {/* 3. Categories Screen (Ангилал) */}
      <Tabs.Screen
        name="categories"
        options={{
          title: "Ангилал",
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <TabIcon
              focused={focused}
              icon={icons.categories}
            />
          ),
        }}
      />

      {/* 4. Profile Screen (Профайл) */}
      <Tabs.Screen
        name="profile"
        options={{
          title: "Профайл",
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon={icons.person}/>
          ),
        }}
      />
    </Tabs>
  );
}
