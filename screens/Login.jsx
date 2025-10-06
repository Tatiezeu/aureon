// screens/Login.jsx
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons"; // for icons

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <LinearGradient
      colors={["#001a4d", "#002366"]} // Royal Blue gradient
      style={styles.container}
    >
      {/* Logo / Title */}
      <View style={styles.header}>
        <Ionicons name="home-outline" size={42} color="#FFD700" />
        <Text style={styles.title}>AUREON</Text>
      </View>

      {/* Card */}
      <View style={styles.card}>
        <Text style={styles.subtitle}>Verify Your Email</Text>

        {/* Email Input */}
        <View style={styles.inputWrapper}>
          <Ionicons name="mail-outline" size={20} color="#FFD700" />
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#b3b3b3"
            value={email}
            onChangeText={setEmail}
          />
        </View>

        {/* Password Input */}
        <View style={styles.inputWrapper}>
          <Ionicons name="lock-closed-outline" size={20} color="#FFD700" />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#b3b3b3"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </View>

        {/* Forgot Password */}
        <TouchableOpacity style={styles.forgotWrapper}>
          <Text style={styles.forgotText}>Forgot Password?</Text>
        </TouchableOpacity>

        {/* Login Button */}
        <TouchableOpacity style={styles.loginButton}>
          <Text style={styles.loginText}>Login</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
};

export default Login;

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
    color: "#FFD700", // Gold
    marginTop: 10,
    letterSpacing: 2,
  },
  card: {
    width: "85%",
    backgroundColor: "rgba(0, 26, 77, 0.9)", // deep blue card
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    elevation: 5,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFD700",
    textAlign: "center",
    marginBottom: 20,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FFD700",
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 15,
  },
  input: {
    flex: 1,
    padding: 10,
    color: "#fff",
    fontSize: 16,
  },
  forgotWrapper: {
    alignItems: "flex-end",
    marginBottom: 20,
  },
  forgotText: {
    color: "#FFD700",
    fontSize: 14,
  },
  loginButton: {
    backgroundColor: "#FFD700",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  loginText: {
    color: "#002366",
    fontSize: 18,
    fontWeight: "700",
  },
});