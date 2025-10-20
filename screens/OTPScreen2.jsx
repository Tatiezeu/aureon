import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import axios from "axios";

const BASE_URL = "http://192.168.0.122:8000";

const OTPScreen2 = () => {
  const navigation = useNavigation();
  const route = useRoute();

  const { phoneNumber, email } = route.params || {};
  const [code, setCode] = useState(["", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(60);
  const hiddenInput = useRef(null);

  useEffect(() => {
    if (timer > 0) {
      const interval = setTimeout(() => setTimer(timer - 1), 1000);
      return () => clearTimeout(interval);
    }
  }, [timer]);

  const handleChange = (text) => {
    const digits = text.replace(/\D/g, "").slice(0, 4).split("");
    const newCode = ["", "", "", ""];
    digits.forEach((d, i) => (newCode[i] = d));
    setCode(newCode);
  };

  const handleVerify = async () => {
    const enteredCode = code.join("");
    if (enteredCode.length !== 4) {
      Alert.alert("Error", "Please enter the 4-digit verification code.");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(
        `${BASE_URL}/phone-verification/verify-code/`,
        { phone_number: phoneNumber, code: enteredCode },
        { headers: { "Content-Type": "application/json" } }
      );

      if (response.status === 200 && response.data.verified) {
        Alert.alert("Success", "Phone verified successfully!", [
          { text: "OK", onPress: () => navigation.replace("Home") },
        ]);
      } else {
        Alert.alert(
          "Error",
          response.data.message || "Invalid verification code. Please try again."
        );
      }
    } catch (error) {
      console.error("OTP verification error:", error.response?.data || error.message);
      Alert.alert("Error", "Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (timer > 0) return;

    setLoading(true);
    try {
      const response = await axios.post(
        `${BASE_URL}/phone-verification/send-code/`,
        { phone_number: phoneNumber },
        { headers: { "Content-Type": "application/json" } }
      );

      if (response.status === 200) {
        Alert.alert("Code Resent", "A new verification code has been sent.");
        setTimer(60);
      } else {
        Alert.alert("Error", "Failed to resend OTP.");
      }
    } catch (error) {
      console.error("Resend OTP error:", error.response?.data || error.message);
      Alert.alert("Error", "Could not resend OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleUseEmail = async () => {
    if (!email) {
      Alert.alert("Error", "Email not provided");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(
        `${BASE_URL}/email-verification/send-login-code/`,
        { email },
        { headers: { "Content-Type": "application/json" } }
      );

      if (response.status === 200) {
        Alert.alert("Success", "Verification code sent to your email.");
        navigation.navigate("OTPScreen", { email });
      } else {
        Alert.alert("Error", "Failed to send email verification code.");
      }
    } catch (error) {
      console.error("Email verification error:", error.response?.data || error.message);
      Alert.alert("Error", "Could not send verification code. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <LinearGradient colors={["#001a4d", "#002366"]} style={styles.container}>
        <View style={styles.header}>
          <Ionicons name="home-outline" size={42} color="#FFD700" />
          <Text style={styles.title}>AUREON</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.subtitle}>Verify Your Phone</Text>
          <Text style={styles.infoText}>
            We have sent a 4-digit code to {phoneNumber}
          </Text>

          <TextInput
            ref={hiddenInput}
            style={styles.hiddenInput}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoComplete="sms-otp"
            value={code.join("")}
            onChangeText={handleChange}
            maxLength={4}
          />

          <TouchableOpacity
            activeOpacity={1}
            onPress={() => hiddenInput.current?.focus()}
          >
            <View style={styles.otpWrapper}>
              {code.map((digit, index) => (
                <View key={index} style={styles.otpBox}>
                  <Text style={styles.otpDigit}>{digit}</Text>
                </View>
              ))}
            </View>
          </TouchableOpacity>

          <View style={styles.resendWrapper}>
            <Text style={styles.resendText}>Did not receive the code?</Text>
            <TouchableOpacity onPress={handleResend} disabled={timer > 0}>
              <Text style={styles.resendLink}>
                {timer > 0 ? `Resend in ${timer}s` : "Resend"}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.verifyButton}
            onPress={handleVerify}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#002366" />
            ) : (
              <Text style={styles.verifyText}>Verify</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.changeEmailWrapper}
            onPress={handleUseEmail}
          >
            <Text style={styles.changeEmailText}>
              Verify with your email?
            </Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </TouchableWithoutFeedback>
  );
};

export default OTPScreen2;

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { alignItems: "center", marginBottom: 30 },
  title: { fontSize: 28, fontWeight: "900", color: "#FFD700", marginTop: 10, letterSpacing: 2 },
  card: {
    width: "85%",
    backgroundColor: "rgba(0, 26, 77, 0.9)",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
  },
  subtitle: { fontSize: 18, fontWeight: "700", color: "#FFD700", marginBottom: 10 },
  infoText: { fontSize: 14, color: "#fff", textAlign: "center", marginBottom: 20 },
  hiddenInput: { height: 0, width: 0, opacity: 0 },
  otpWrapper: { flexDirection: "row", justifyContent: "space-between", width: "80%" },
  otpBox: {
    borderWidth: 1,
    borderColor: "#FFD700",
    borderRadius: 8,
    width: 50,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    margin: 5,
  },
  otpDigit: { fontSize: 18, color: "#fff" },
  resendWrapper: { flexDirection: "row", alignItems: "center", marginTop: 20 },
  resendText: { color: "#fff", fontSize: 14, marginRight: 5 },
  resendLink: { color: "#FFD700", fontSize: 14, fontWeight: "700" },
  verifyButton: {
    backgroundColor: "#FFD700",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 40,
    alignItems: "center",
    marginTop: 20,
  },
  verifyText: { color: "#002366", fontSize: 18, fontWeight: "700" },
  changeEmailWrapper: { marginTop: 5 },
  changeEmailText: { color: "#FFD700", fontSize: 14, textDecorationLine: "underline" },
});
