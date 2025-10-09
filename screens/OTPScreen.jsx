// screens/OTPScreen.jsx
import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import axios from "axios";

const BASE_URL = "http://192.168.0.103:8000";

const OTPScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { email } = route.params || {}; // email passed from Login screen

  const [code, setCode] = useState(["", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(60);
  const inputs = useRef([]);

  // ⏳ Countdown for resend
  useEffect(() => {
    if (timer > 0) {
      const interval = setTimeout(() => setTimer(timer - 1), 1000);
      return () => clearTimeout(interval);
    }
  }, [timer]);

  // Handle OTP digit changes
  const handleChange = (text, index) => {
    if (/^\d?$/.test(text)) {
      const newCode = [...code];
      newCode[index] = text;
      setCode(newCode);
      if (text && index < 3) inputs.current[index + 1].focus();
    }
  };

  // ✅ Verify OTP with backend
  const handleVerify = async () => {
    const enteredCode = code.join("");
    if (enteredCode.length !== 4) {
      Alert.alert("Error", "Please enter the 4-digit verification code.");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(
        `${BASE_URL}/email-verification/verify-login-code/`,
        { email, code: enteredCode },
        { headers: { "Content-Type": "application/json" } }
      );

      const data = response.data;

      if (response.status === 200 && data.verified) {
        Alert.alert("Success", "Email verified successfully!");
        navigation.replace("Home");
      } else {
        Alert.alert("Invalid Code", data.message || "The code is incorrect or expired.");
      }
    } catch (error) {
      console.error("OTP verification error:", error.response?.data || error.message);
      Alert.alert(
        "Error",
        error.response?.data?.message || "Verification failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // ✅ Resend verification code
  const handleResend = async () => {
    if (timer > 0) return;

    try {
      setLoading(true);
      const response = await axios.post(
        `${BASE_URL}/email-verification/send-login-code/`,
        { email },
        { headers: { "Content-Type": "application/json" } }
      );

      if (response.status === 200) {
        Alert.alert("Code Resent", "A new verification code was sent to your email.");
        setTimer(60);
      } else {
        Alert.alert("Error", "Failed to resend verification code.");
      }
    } catch (error) {
      console.error("Resend code error:", error.response?.data || error.message);
      Alert.alert("Error", "Could not resend code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleChangeEmail = () => {
    navigation.replace("Login");
  };

  const handleUsePhone = () => {
    navigation.replace("OTPScreen2");
  };

  return (
    <LinearGradient colors={["#001a4d", "#002366"]} style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="home-outline" size={42} color="#FFD700" />
        <Text style={styles.title}>AUREON</Text>
      </View>

      {/* Card */}
      <View style={styles.card}>
        <Text style={styles.subtitle}>Verify Your Email</Text>
        <Text style={styles.infoText}>A 4-digit code was sent to {email}</Text>

        {/* OTP Inputs */}
        <View style={styles.otpWrapper}>
          {code.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => (inputs.current[index] = ref)}
              style={styles.otpInput}
              keyboardType="number-pad"
              maxLength={1}
              value={digit}
              onChangeText={(text) => handleChange(text, index)}
            />
          ))}
        </View>

        {/* Resend */}
        <View style={styles.resendWrapper}>
          <Text style={styles.resendText}>Didn’t receive the code?</Text>
          <TouchableOpacity onPress={handleResend} disabled={timer > 0}>
            <Text style={styles.resendLink}>
              {timer > 0 ? `Resend in ${timer}s` : "Resend"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Verify Button */}
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

        {/* Other options */}
        <TouchableOpacity
          style={styles.changeEmailWrapper}
          onPress={handleUsePhone}
        >
          <Text style={styles.changeEmailText}>
            Verify with your phone number?
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.changeEmailWrapper}
          onPress={handleChangeEmail}
        >
          <Text style={styles.changeEmailText}>Change email?</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
};

export default OTPScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: "900",
    color: "#FFD700",
    marginTop: 10,
    letterSpacing: 2,
  },
  card: {
    width: "85%",
    backgroundColor: "rgba(0, 26, 77, 0.9)",
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    elevation: 5,
    alignItems: "center",
  },
  subtitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFD700",
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: "#fff",
    textAlign: "center",
    marginBottom: 20,
  },
  otpWrapper: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "80%",
    marginBottom: 15,
  },
  otpInput: {
    borderWidth: 1,
    borderColor: "#FFD700",
    borderRadius: 8,
    width: 50,
    height: 50,
    textAlign: "center",
    fontSize: 18,
    color: "#fff",
  },
  resendWrapper: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  resendText: {
    color: "#fff",
    fontSize: 14,
    marginRight: 5,
  },
  resendLink: {
    color: "#FFD700",
    fontSize: 14,
    fontWeight: "700",
  },
  verifyButton: {
    backgroundColor: "#FFD700",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 40,
    alignItems: "center",
    marginBottom: 15,
  },
  verifyText: {
    color: "#002366",
    fontSize: 18,
    fontWeight: "700",
  },
  changeEmailWrapper: {
    marginTop: 5,
  },
  changeEmailText: {
    color: "#FFD700",
    fontSize: 14,
    textDecorationLine: "underline",
  },
});
