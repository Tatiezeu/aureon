// screens/SplashScreen.jsx
import React, { useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
  Text,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import MaskedView from "@react-native-masked-view/masked-view";
import { useNavigation } from "@react-navigation/native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const BRAND = "AUREON";

export default function SplashScreen() {
  const navigation = useNavigation();
  const letters = BRAND.split("");

  // Per-letter animations: scale, translateY, opacity
  const letterAnims = useRef(
    letters.map(() => ({
      scale: new Animated.Value(0.65),
      translateY: new Animated.Value(22),
      opacity: new Animated.Value(0),
    }))
  ).current;

  // Layered sweep animations (two separate sweeps for depth)
  const sweepA = useRef(new Animated.Value(-SCREEN_WIDTH * 1.2)).current;
  const sweepB = useRef(new Animated.Value(-SCREEN_WIDTH * 1.5)).current;

  // Camera-like zoom subtle effect for cinematic feel
  const cameraScale = useRef(new Animated.Value(1)).current;

  // Accent particle pulse (small dot)
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Letter entrance: staggered pop with slight overshoot (cinematic)
    const entranceSeq = letters.map((_, i) =>
      Animated.parallel([
        Animated.spring(letterAnims[i].scale, {
          toValue: 1,
          friction: 7,
          tension: 120,
          useNativeDriver: true,
        }),
        Animated.timing(letterAnims[i].translateY, {
          toValue: 0,
          duration: 520,
          easing: Easing.out(Easing.back(1.2)),
          useNativeDriver: true,
        }),
        Animated.timing(letterAnims[i].opacity, {
          toValue: 1,
          duration: 360,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ])
    );

    // Sweep A: bright, fast
    const sweepAAnim = Animated.sequence([
      Animated.delay(260),
      Animated.timing(sweepA, {
        toValue: SCREEN_WIDTH * 1.2,
        duration: 760,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(sweepA, { toValue: -SCREEN_WIDTH * 1.2, duration: 0, useNativeDriver: true }),
      Animated.delay(120),
      Animated.timing(sweepA, {
        toValue: SCREEN_WIDTH * 1.2,
        duration: 560,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);

    // Sweep B: softer, slower for depth
    const sweepBAnim = Animated.sequence([
      Animated.delay(380),
      Animated.timing(sweepB, {
        toValue: SCREEN_WIDTH * 1.6,
        duration: 1100,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
    ]);

    // Camera subtle zoom in slightly during animation
    const cameraAnim = Animated.sequence([
      Animated.delay(200),
      Animated.timing(cameraScale, { toValue: 1.02, duration: 1400, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(cameraScale, { toValue: 1, duration: 420, easing: Easing.in(Easing.quad), useNativeDriver: true }),
    ]);

    // Pulse single cycle instead of infinite loop
    const pulseOnce = Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
    ]);

    // Complete sequence: entrance -> layered sweeps + camera + pulse (parallel) -> navigate directly
    Animated.sequence([
      Animated.stagger(110, entranceSeq),
      Animated.delay(180),
      Animated.parallel([sweepAAnim, sweepBAnim, cameraAnim, pulseOnce]),
    ]).start(() => {
      // Navigate immediately after the above animations complete
      navigation.replace("Login");
    });

    return () => pulse.stopAnimation();
  }, [letters, letterAnims, sweepA, sweepB, cameraScale, pulse, navigation]);

  // Dot interpolations
  const dotScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.24] });
  const dotOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] });

  // Mask element (animated letters) - used by MaskedView
  const MaskLetters = () => (
    <View style={styles.maskWrap}>
      <View style={styles.letterRow}>
        {letters.map((ch, i) => (
          <Animated.Text
            key={i}
            allowFontScaling
            style={[
              styles.letter,
              {
                transform: [
                  { translateY: letterAnims[i].translateY },
                  { scale: letterAnims[i].scale },
                ],
                opacity: letterAnims[i].opacity,
              },
            ]}
          >
            {ch}
          </Animated.Text>
        ))}
      </View>
    </View>
  );

  // Gradient sweep layer (do not pass animated values into LinearGradient props)
  const SweepLayer = ({ translateX, colors, widthMultiplier = 1.6, height }) => {
    const overlayWidth = SCREEN_WIDTH * widthMultiplier;
    return (
      <Animated.View
        pointerEvents="none"
        style={[
          styles.sweepWrapper,
          {
            width: overlayWidth,
            height,
            transform: [{ translateX }],
          },
        ]}
      >
        <LinearGradient
          colors={colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.sweepGradient, { width: overlayWidth, height }]}
        />
      </Animated.View>
    );
  };

  // Responsive size for masked area
  const maskedHeight = Math.round(Math.min(160, SCREEN_WIDTH * 0.19));
  const maskedWidth = Math.min(860, SCREEN_WIDTH - 40);

  return (
    <View style={styles.container}>
      {/* Background deep gradient (maintain color theme) */}
      <LinearGradient colors={["#001a4d", "#002366"]} style={styles.background} />

      {/* Cinematic center card with subtle vignette */}
      <View style={styles.center}>
        <Animated.View style={[styles.cinematicCard, { transform: [{ scale: cameraScale }] }]}>
          {/* Vignette shadow to emulate cinematic feel */}
          <View style={styles.vignette} pointerEvents="none" />

          {/* Masked brand text */}
          <MaskedView maskElement={<MaskLetters />} style={[styles.maskedView, { width: maskedWidth, height: maskedHeight }]}>
            {/* Base dark fill under mask for contrast */}
            <View style={[styles.baseFill, { width: maskedWidth, height: maskedHeight }]} />

            {/* Premium golden gradient fill (static) */}
            <LinearGradient
              colors={["#C7A23B", "#FFD700", "#FFB84D"]}
              style={[styles.baseGradient, { width: maskedWidth, height: maskedHeight }]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />

            {/* Two layered sweep layers for depth and polish */}
            <SweepLayer
              translateX={sweepA}
              colors={["transparent", "rgba(255,255,255,0.96)", "transparent"]}
              widthMultiplier={1.6}
              height={maskedHeight}
            />
            <SweepLayer
              translateX={sweepB}
              colors={["transparent", "rgba(230,195,103,0.65)", "transparent"]}
              widthMultiplier={2.2}
              height={maskedHeight}
            />
          </MaskedView>

          {/* Subtitle and microcopy for professional touch */}
          <Text style={styles.subtitle}>Insights & Performance</Text>

          <View style={styles.statusRow}>
            <Animated.View style={[styles.pulseDot, { transform: [{ scale: dotScale }], opacity: dotOpacity }]} />
            <Text style={styles.statusText}>Preparing your dashboard</Text>
          </View>
        </Animated.View>
      </View>

      {/* Footer: simple branding */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>© {new Date().getFullYear()} AUREON</Text>
      </View>
    </View>
  );
}

/* Styles */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#001a4d",
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 22,
  },
  cinematicCard: {
    width: Math.min(920, SCREEN_WIDTH - 32),
    borderRadius: 16,
    alignItems: "center",
    paddingVertical: 26,
    paddingHorizontal: 22,
    backgroundColor: Platform.OS === "ios" ? "rgba(255,255,255,0.02)" : "#08182f",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.28,
    shadowRadius: 34,
    elevation: 14,
    overflow: "hidden",
  },
  vignette: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "transparent",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.16,
    shadowRadius: 46,
    elevation: 8,
    opacity: 0.6,
  },
  maskedView: {
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  maskWrap: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  letterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  letter: {
    color: "black",
    fontWeight: "900",
    letterSpacing: 8,
    textAlign: "center",
    fontSize: Math.round(Math.min(86, SCREEN_WIDTH * 0.13)),
    includeFontPadding: false,
  },
  baseFill: {
    backgroundColor: "#001a4d",
  },
  baseGradient: {
    position: "absolute",
    left: 0,
    top: 0,
  },
  sweepWrapper: {
    position: "absolute",
    left: -SCREEN_WIDTH * 1.2,
    top: 0,
    overflow: "hidden",
  },
  sweepGradient: {
    height: "100%",
  },
  subtitle: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 14,
    marginTop: 6,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  statusRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  pulseDot: {
    width: 10,
    height: 10,
    borderRadius: 6,
    backgroundColor: "#20B2AA",
    marginRight: 10,
    shadowColor: "#20B2AA",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.26,
    shadowRadius: 18,
    elevation: 8,
  },
  statusText: {
    color: "rgba(255,255,255,0.88)",
    fontSize: 13,
    fontWeight: "600",
  },
  footer: {
    paddingBottom: 20,
    alignItems: "center",
  },
  footerText: {
    color: "rgba(255,255,255,0.32)",
    fontSize: 12,
  },
});
