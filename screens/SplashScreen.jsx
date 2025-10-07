// screens/SplashScreen.jsx
import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, Easing, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import MaskedView from "@react-native-masked-view/masked-view";
import { useNavigation } from "@react-navigation/native"; // ✅ useNavigation

const SplashScreen = () => {
  const navigation = useNavigation();
  const letters = "AUREON".split("");
  const animations = useRef(
    letters.map(() => ({
      scale: new Animated.Value(0.5),
      opacity: new Animated.Value(0),
    }))
  ).current;

  useEffect(() => {
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

    Animated.stagger(250, animationsSeq).start(() => {
      navigation.replace("Login"); // ✅ navigate with React Navigation
    });
  }, []);

  return (
    <LinearGradient colors={["#001a4d", "#002366"]} style={styles.container}>
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
            <LinearGradient colors={["#FFD700", "#FFA500"]}>
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
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  row: { flexDirection: "row" },
  text: {
    fontSize: 58,
    fontWeight: "900",
    letterSpacing: 6,
    textAlign: "center",
  },
});