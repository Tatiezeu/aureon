// screens/OTPScreen.jsx
import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

const OTPScreen = () => {
  const [code, setCode] = useState(["", "", "", ""]);
  const inputs = useRef([]);

  const handleChange = (text, index) => {
    if (/^\d?$/.test(text)) { // only allow single digit
      const newCode = [...code];
      newCode[index] = text;
      setCode(newCode);
      if (text && index < 3) {
        inputs.current[index + 1].focus();
      }
    }
  };

  const handleVerify = () => {
    alert(`Code entered: ${code.join("")}`);
  };

  const handleResend = () => {
    alert("Code resent!");
  };

  const handleChangeEmail = () => {
    alert("Change email pressed");
  };

  return (
    <LinearGradient
      colors={["#001a4d", "#002366"]}
      style={styles.container}
    >
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="home-outline" size={42} color="#FFD700" />
        <Text style={styles.title}>AUREON</Text>
      </View>

      {/* Card */}
      <View style={styles.card}>
        <Text style={styles.subtitle}>Verify Your Email</Text>
        <Text style={styles.infoText}>
          We have sent a 4-digit code to your email
        </Text>

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
          <Text style={styles.resendText}>Didnot receive the code?</Text>
          <TouchableOpacity onPress={handleResend}>
            <Text style={styles.resendLink}>Resend</Text>
          </TouchableOpacity>
        </View>

        {/* Verify Button */}
        <TouchableOpacity style={styles.verifyButton} onPress={handleVerify}>
          <Text style={styles.verifyText}>Verify</Text>
        </TouchableOpacity>

        {/* Change Email */}
        <TouchableOpacity style={styles.changeEmailWrapper} onPress={handleChangeEmail}>
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
  changeEmailWrapper: {},
  changeEmailText: {
    color: "#FFD700",
    fontSize: 14,
    textDecorationLine: "underline",
  },
});