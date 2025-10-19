// navigation/AppNavigator.js
import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import SplashScreen from "../screens/SplashScreen";
import Login from "../screens/Login";
import OTPScreen from "../screens/OTPScreen";
import OTPScreen2 from "../screens/OTPScreen2";
import ResetPassword from "../screens/ResetPassword";

import TabNavigator from "./TabNavigator";

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Splash">
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="Login" component={Login} />
      
      {/* Main app with bottom tabs */}
      <Stack.Screen name="Home" component={TabNavigator} />

      {/* Screens that should appear above tabs */}
      <Stack.Screen name="OTPScreen" component={OTPScreen} />
      <Stack.Screen name="OTPScreen2" component={OTPScreen2} />
      <Stack.Screen name="ResetPassword" component={ResetPassword} />
    </Stack.Navigator>
  );
}