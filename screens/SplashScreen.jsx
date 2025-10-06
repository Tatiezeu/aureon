// screens/SplashScreen.jsx
import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, Easing } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import MaskedView from "@react-native-masked-view/masked-view";
import { useRouter } from "expo-router"; // Expo Router navigation

const SplashScreen = () => {
  const router = useRouter();

  const letters = "AUREON".split(""); // Each letter animates
  const animations = useRef(
    letters.map(() => ({
      scale: new Animated.Value(0.5),
      opacity: new Animated.Value(0),
    }))
  ).current;

  useEffect(() => {
    // Netflix-like staggered animation sequence
    const animationsSeq = letters.map((_, i) =>
      Animated.parallel([
        Animated.spring(animations[i].scale, {
          toValue: 1,
          friction: 4,
          tension: 50,
          useNativeDriver: true,
        }),
        Animated.timing(animations[i].opacity, {
          toValue: 1,
          duration: 600,
          easing: Easing.out(Easing.exp),
          useNativeDriver: true,
        }),
      ])
    );

    // Start animations one after another
    Animated.stagger(250, animationsSeq).start(() => {
      // Navigate to Login after animation
      router.replace("/login"); // Make sure app/login.jsx exists
    });
  }, []);

  return (
    <LinearGradient
      colors={["#001a4d", "#002366"]} // Deep Royal Blue gradient background
      style={styles.container}
    >
      <View style={styles.row}>
        {letters.map((letter, i) => (
          <MaskedView
            key={i}
            maskElement={
              <Animated.Text
                style={[
                  styles.text,
                  {
                    transform: [{ scale: animations[i].scale }],
                    opacity: animations[i].opacity,
                  },
                ]}
              >
                {letter}
              </Animated.Text>
            }
          >
            <LinearGradient
              colors={["#FFD700", "#FFA500"]} // Gold gradient
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Animated.Text style={[styles.text, { opacity: 0 }]}>
                {letter}
              </Animated.Text>
            </LinearGradient>
          </MaskedView>
        ))}
      </View>
    </LinearGradient>
  );
};

export default SplashScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  row: {
    flexDirection: "row",
  },
  text: {
    fontSize: 58,
    fontWeight: "900",
    letterSpacing: 6,
    textAlign: "center",
  },
});
