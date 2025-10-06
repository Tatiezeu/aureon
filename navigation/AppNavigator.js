import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import SplashScreen from "../screens/SplashScreen";
import Login from "../screens/Login";
import Home from "../screens/Home";
import OTPScreen from "../screens/OTPScreen";
// import Analytics from "../screens/Analytics";
import Settings from "../screens/Settings";

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <Stack.Navigator initialRouteName="Settings" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="Login" component={Login} />
      <Stack.Screen name="Home" component={Home} />
      <Stack.Screen name="OTPScreen" component={OTPScreen} />
      {/* <Stack.Screen name="Analytics" component={Analytics} /> */}
      <Stack.Screen name="Settings" component={Settings} />
    </Stack.Navigator>
  );
}