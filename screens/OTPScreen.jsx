import React, { useEffect, useRef, useState } from "react";
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
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import axios from "axios";

const BASE_URL = "http://192.168.0.122:8000";

const OTPScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { email, phoneNumber } = route.params || {};

  // Store digits as array for UI
  const [code, setCode] = useState(["", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [sendingOTP, setSendingOTP] = useState(false);
  const [timer, setTimer] = useState(60);

  // Single hidden input that receives paste / autofill / typing
  const hiddenInputRef = useRef(null);

  useEffect(() => {
    if (timer > 0) {
      const t = setTimeout(() => setTimer((p) => p - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [timer]);

  // When hidden input value changes (autofill/paste/typing), distribute to boxes
  const onHiddenChange = (text) => {
    const digits = text.replace(/\D/g, "").slice(0, 4).split("");
    const next = ["", "", "", ""];
    digits.forEach((d, i) => (next[i] = d));
    setCode(next);

    // If complete, dismiss keyboard
    if (digits.length === 4) {
      hiddenInputRef.current?.blur();
      Keyboard.dismiss();
    }
  };

  // To mirror deletion behavior: when user clears hidden input fully, clear boxes
  const onHiddenKeyPress = ({ nativeEvent }) => {
    if (nativeEvent.key === "Backspace") {
      // If hidden input already empty -> clear all boxes
      // Attempt to read last native text if available
      const currentVal =
        (hiddenInputRef.current && hiddenInputRef.current._lastNativeText) || "";
      const lastText = currentVal ?? code.join("");
      if (!lastText || lastText.length === 0) {
        setCode(["", "", "", ""]);
      }
      // Otherwise onChange will handle reduced value
    }
  };

  // Focus hidden input when user taps boxes area
  const focusHidden = () => {
    setTimeout(() => {
      hiddenInputRef.current?.focus();
    }, 50);
  };

  // Send OTP (phone/email) - original phone sending retained
  const sendPhoneOTP = async () => {
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

  // Resend: trigger POST /email-verification/send-login-code/
  const handleResend = async () => {
    if (timer > 0) return;

    try {
      setSendingOTP(true);
      const response = await axios.post(
        `${BASE_URL}/email-verification/send-login-code/`,
        { email },
        { headers: { "Content-Type": "application/json" } }
      );

      if (response.status === 200) {
        Alert.alert("Success", "Verification email has been resent.");
        setTimer(60);
      } else {
        Alert.alert("Error", "Failed to resend verification email.");
      }
    } catch (error) {
      console.error("Resend email OTP error:", error.response?.data || error.message);
      Alert.alert("Error", "Could not resend verification email. Please try again.");
    } finally {
      setSendingOTP(false);
    }
  };

  const handleUsePhone = async () => {
    try {
      setLoading(true);

      const phoneNumberConst = "+237676612597";

      const response = await axios.post(
        `${BASE_URL}/phone-verification/send-code/`,
        { phone_number: phoneNumberConst },
        { headers: { "Content-Type": "application/json" } }
      );

      if (response.status === 200) {
        Alert.alert("Success", "OTP has been sent to your phone.");
        setTimer(60);

        navigation.replace("OTPScreen2", { phoneNumber: phoneNumberConst, email });
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

  // Render digits into boxes (non-editable). All input goes to hiddenInput.
  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <LinearGradient colors={["#001a4d", "#002366"]} style={styles.container}>
        <View style={styles.header}>
          <Ionicons name="home-outline" size={42} color="#FFD700" />
          <Text style={styles.title}>AUREON</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.subtitle}>Verify Your Email</Text>
          <Text style={styles.infoText}>A 4-digit code was sent to {email || phoneNumber}</Text>

          {/* Hidden TextInput receives autofill/paste/typing.
              Using a single input that controls all four visible boxes
              ensures full pasted/autofilled values fill all boxes. */}
          <TextInput
            ref={hiddenInputRef}
            style={styles.hiddenInput}
            keyboardType="number-pad"
            textContentType={Platform.OS === "ios" ? "oneTimeCode" : "none"}
            autoComplete={Platform.OS === "android" ? "sms-otp" : "off"}
            maxLength={4}
            caretHidden={false}
            importantForAutofill="yes"
            onChangeText={onHiddenChange}
            onKeyPress={onHiddenKeyPress}
            placeholder=""
          />

          {/* Visible boxes: render Text inside Touchable to focus hidden input */}
          <TouchableOpacity activeOpacity={1} onPress={focusHidden}>
            <View style={styles.otpWrapper}>
              {code.map((digit, idx) => (
                <View key={idx} style={styles.otpBox}>
                  <Text style={styles.otpDigit}>{digit}</Text>
                </View>
              ))}
            </View>
          </TouchableOpacity>

          <View style={styles.resendWrapper}>
            <Text style={styles.resendText}>Didn’t receive the code?</Text>
            <TouchableOpacity onPress={handleResend} disabled={timer > 0 || sendingOTP}>
              <Text style={[styles.resendLink, timer > 0 || sendingOTP ? { opacity: 0.6 } : null]}>
                {sendingOTP ? "Sending..." : timer > 0 ? `Resend in ${timer}s` : "Resend"}
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

          <TouchableOpacity style={styles.changeEmailWrapper} onPress={handleUsePhone}>
            <Text style={styles.changeEmailText}>Verify with your phone number?</Text>
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
    alignItems: "center",
  },
  subtitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFD700",
    marginBottom: 10,
  },
  infoText: { fontSize: 14, color: "#fff", textAlign: "center", marginBottom: 20 },
  // Hidden input placed off-screen but still focusable; don't set opacity:0 on Android autofill
  hiddenInput: {
    position: "absolute",
    width: 1,
    height: 1,
    top: -1000,
    left: -1000,
    // keep it accessible to autofill engines
  },
  otpWrapper: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "80%",
    marginBottom: 15,
  },
  otpBox: {
    borderWidth: 1,
    borderColor: "#FFD700",
    borderRadius: 8,
    width: 50,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    margin: 5,
    backgroundColor: "transparent",
  },
  otpDigit: { fontSize: 18, color: "#fff" },
  resendWrapper: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  resendText: { color: "#fff", fontSize: 14, marginRight: 5 },
  resendLink: { color: "#FFD700", fontSize: 14, fontWeight: "700" },
  verifyButton: {
    backgroundColor: "#FFD700",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 40,
    alignItems: "center",
    marginBottom: 15,
  },
  verifyText: { color: "#002366", fontSize: 18, fontWeight: "700" },
  changeEmailWrapper: { marginTop: 5 },
  changeEmailText: { color: "#FFD700", fontSize: 14, textDecorationLine: "underline" },
});