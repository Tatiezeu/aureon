// screens/Login.jsx
import React, { useState } from "react";
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
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

const BASE_URL = "http://192.168.0.103:8000/api";

const Login = () => {
  const navigation = useNavigation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter email and password");
      return;
    }

    setLoading(true);

    try {
      // Step 1: Login user
      const response = await axios.post(
        `${BASE_URL}/auth/login/`,
        { email, password },
        {
          headers: { "Content-Type": "application/json" },
          timeout: 10000,
        }
      );

      const data = response.data;

      // Step 2: Save tokens & user info locally
      await AsyncStorage.setItem("access_token", data.access);
      await AsyncStorage.setItem("refresh_token", data.refresh);
      await AsyncStorage.setItem("user", JSON.stringify(data.user));

      // Step 3: Trigger OTP email after successful login
      await axios.post(
        `${BASE_URL.replace("/api", "")}/email-verification/send-login-code/`,
        { email },
        { headers: { "Content-Type": "application/json" } }
      );

      Alert.alert("Verification", "A verification code has been sent to your email.");

      // Step 4: Navigate to OTP screen with email passed as param
      navigation.navigate("OTPScreen", { email });

    } catch (error) {
      console.error("Login error:", error.response?.data || error.message);

      if (error.response?.status === 400) {
        Alert.alert("Login Failed", "Invalid credentials or bad request");
      } else if (error.response?.status === 500) {
        Alert.alert("Server Error", "Please try again later");
      } else {
        Alert.alert(
          "Error",
          error.response?.data?.detail || "Could not connect to the server"
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={["#001a4d", "#002366"]} style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="home-outline" size={42} color="#FFD700" />
        <Text style={styles.title}>AUREON</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.subtitle}>Verify Your Email</Text>

        <View style={styles.inputWrapper}>
          <Ionicons name="mail-outline" size={20} color="#FFD700" />
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#b3b3b3"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

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

        <TouchableOpacity style={styles.forgotWrapper}>
          <Text style={styles.forgotText}>Forgot Password?</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.loginButton}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#002366" />
          ) : (
            <Text style={styles.loginText}>Login</Text>
          )}
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
