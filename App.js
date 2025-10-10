import React, { useEffect } from "react";
import { Linking } from "react-native";
import { NavigationContainer, createNavigationContainerRef } from "@react-navigation/native";
import AppNavigator from "./navigation/AppNavigator";

export const navigationRef = createNavigationContainerRef();

export default function App() {
  useEffect(() => {
    const handleDeepLink = ({ url }) => {
      if (!url) return;
      const route = url.replace(/.*?:\/\//g, "");
      const [screen, params] = route.split("?");
      if (screen === "reset-password") {
        const tokenParam = params?.split("=")[1];
        if (tokenParam) {
          navigationRef.current?.navigate("ResetPassword", { token: tokenParam });
        }
      }
    };

    Linking.addEventListener("url", handleDeepLink);

    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink({ url });
    });

    return () => Linking.removeEventListener("url", handleDeepLink);
  }, []);

  return (
    <NavigationContainer ref={navigationRef}>
      <AppNavigator />
    </NavigationContainer>
  );
}
