import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import SplashScreen from "../screens/SplashScreen";
import Login from "../screens/Login";
import Home from "../screens/Home";
import OTPScreen from "../screens/OTPScreen";
import Analytics from "../screens/Analytics";
import Settings from "../screens/Settings";
import History from "../screens/History";
import Notifications from "../screens/Notifications";
import Users from "../screens/Users";
import OTPScreen2 from "../screens/OTPScreen2";
const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <Stack.Navigator initialRouteName="Splash" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="Login" component={Login} />
      <Stack.Screen name="Home" component={Home} />
      <Stack.Screen name="OTPScreen" component={OTPScreen} />
      <Stack.Screen name="OTPScreen2" component={OTPScreen2} />
      <Stack.Screen name="Analytics" component={Analytics} />
      <Stack.Screen name="Settings" component={Settings} />
      <Stack.Screen name="History" component={History} />
      <Stack.Screen name="Notifications" component={Notifications} />
      <Stack.Screen name="Users" component={Users} />
    </Stack.Navigator>
  );
}