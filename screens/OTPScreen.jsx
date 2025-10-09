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

const BASE_URL = "http://172.20.10.2:8000";

const OTPScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { email, phoneNumber } = route.params || {};

  const [code, setCode] = useState(["", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [sendingOTP, setSendingOTP] = useState(false);
  const [timer, setTimer] = useState(60);

  const inputs = useRef([]);
  const hiddenInput = useRef(null);

  useEffect(() => {
    if (timer > 0) {
      const interval = setTimeout(() => setTimer(timer - 1), 1000);
      return () => clearTimeout(interval);
    }
  }, [timer]);

  const handleChange = (text, index) => {
    if (/^\d?$/.test(text)) {
      const newCode = [...code];
      newCode[index] = text;
      setCode(newCode);

      if (text && index < 3) {
        inputs.current[index + 1]?.focus();
      } else if (!text && index > 0) {
        inputs.current[index - 1]?.focus();
      }
    }
  };

  const handleAutoFill = (text) => {
    const digits = text.replace(/\D/g, "").slice(0, 4).split("");
    const newCode = ["", "", "", ""];
    digits.forEach((d, i) => (newCode[i] = d));
    setCode(newCode);
  };

  const sendOTP = async () => {
    try {
      setSendingOTP(true);
      const response = await axios.post(
        `${BASE_URL}/phone-verification/send-code/`,
        { phone_number: phoneNumber || email },
        { headers: { "Content-Type": "application/json" } }
      );

      if (response.status === 200) {
        Alert.alert("Success", "OTP has been sent.");
        setTimer(60);
      } else {
        Alert.alert("Error", "Failed to send OTP.");
      }
    } catch (error) {
      console.error("Send OTP error:", error.response?.data || error.message);
      Alert.alert("Error", "Could not send OTP. Please try again.");
    } finally {
      setSendingOTP(false);
    }
  };

  const handleVerify = async () => {
    const enteredCode = code.join("");
    if (enteredCode.length !== 4) {
      Alert.alert("Error", "Please enter the 4-digit verification code.");
      return;
    }

    setLoading(true);
    try {
      const verifyResponse = await axios.post(
        `${BASE_URL}/email-verification/verify-login-code/`,
        { email, code: enteredCode },
        { headers: { "Content-Type": "application/json" } }
      );

      const data = verifyResponse.data;

      if (verifyResponse.status === 200 && data.verified) {
        Alert.alert("Success", "Email verified successfully!", [
          { text: "OK", onPress: () => navigation.replace("Home") },
        ]);
      } else {
        Alert.alert(
          "Invalid Code",
          data.message || "The code is incorrect or expired."
        );
      }
    } catch (error) {
      console.error(
        "OTP verification error:",
        error.response?.data || error.message
      );
      Alert.alert(
        "Error",
        error.response?.data?.message || "Verification failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (timer > 0) return;
    await sendOTP();
  };

  const handleUsePhone = async () => {
    try {
      setLoading(true);

      const phoneNumber = "+237676612597";

      const response = await axios.post(
        `${BASE_URL}/phone-verification/send-code/`,
        { phone_number: phoneNumber },
        { headers: { "Content-Type": "application/json" } }
      );

      if (response.status === 200) {
        Alert.alert("Success", "OTP has been sent to your phone.");
        setTimer(60);

        navigation.replace("OTPScreen2", { phoneNumber , email });
      } else {
        Alert.alert("Error", "Failed to send OTP.");
      }
    } catch (error) {
      console.error("Send OTP error:", error.response?.data || error.message);
      Alert.alert("Error", "Could not send OTP. Please try again.");
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
          <Text style={styles.subtitle}>Verify Your Email</Text>
          <Text style={styles.infoText}>
            A 4-digit code was sent to {email || phoneNumber}
          </Text>

          {/* Hidden input for autofill */}
          <TextInput
            ref={hiddenInput}
            style={styles.hiddenInput}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoComplete="sms-otp"
            value={code.join("")}
            onChangeText={handleAutoFill}
            maxLength={4}
          />

          {/* OTP Inputs */}
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => hiddenInput.current?.focus()}
          >
            <View style={styles.otpWrapper}>
              {code.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(el) => (inputs.current[index] = el)}
                  style={styles.otpBox}
                  keyboardType="number-pad"
                  maxLength={1}
                  value={digit}
                  onChangeText={(text) => handleChange(text, index)}
                />
              ))}
            </View>
          </TouchableOpacity>

          <View style={styles.resendWrapper}>
            <Text style={styles.resendText}>Didn’t receive the code?</Text>
            <TouchableOpacity onPress={handleResend} disabled={timer > 0}>
              <Text style={styles.resendLink}>
                {timer > 0 ? `Resend in ${timer}s` : "Resend"}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.verifyButton}
            onPress={handleVerify}
            disabled={loading || sendingOTP}
          >
            {sendingOTP ? (
              <Text style={styles.verifyText}>Sending OTP...</Text>
            ) : loading ? (
              <ActivityIndicator color="#002366" />
            ) : (
              <Text style={styles.verifyText}>Verify</Text>
            )}
          </TouchableOpacity>

          {/* Verify with your phone number button */}
          <TouchableOpacity
            style={styles.changeEmailWrapper}
            onPress={handleUsePhone}
          >
            <Text style={styles.changeEmailText}>
              Verify with your phone number?
            </Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </TouchableWithoutFeedback>
  );
};

export default OTPScreen;

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
  otpWrapper: { flexDirection: "row", justifyContent: "space-between", width: "80%", marginBottom: 15 },
  otpBox: {
    borderWidth: 1,
    borderColor: "#FFD700",
    borderRadius: 8,
    width: 50,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    fontSize: 18,
    color: "#fff",
    textAlign: "center",
    margin: 5,
  },
  otpDigit: { fontSize: 18, color: "#fff" },
  resendWrapper: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  resendText: { color: "#fff", fontSize: 14, marginRight: 5 },
  resendLink: { color: "#FFD700", fontSize: 14, fontWeight: "700" },
  verifyButton: { backgroundColor: "#FFD700", borderRadius: 8, paddingVertical: 12, paddingHorizontal: 40, alignItems: "center", marginBottom: 15 },
  verifyText: { color: "#002366", fontSize: 18, fontWeight: "700" },
  changeEmailWrapper: { marginTop: 5 },
  changeEmailText: { color: "#FFD700", fontSize: 14, textDecorationLine: "underline" },
});
