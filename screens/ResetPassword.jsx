import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from "react-native";
import axios from "axios";
import { useNavigation } from "@react-navigation/native";

export default function ResetPassword() {
  const navigation = useNavigation();
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const BACKEND_URL = "http://172.20.10.2:8000";

  const handleSubmit = async () => {
    if (!token) {
      Alert.alert("Error", "Please enter the reset code from your email.");
      return;
    }
    if (password !== confirmPassword) {
      setMessage("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const res = await axios.post(
        `${BACKEND_URL}/password-reset/reset-password/submit/`,
        { token, password },
        { headers: { "Content-Type": "application/json" } }
      );

      setMessage(res.data.message || "✅ Password reset successful");
      Alert.alert("Success", res.data.message || "Password reset successful", [
        { text: "OK", onPress: () => navigation.navigate("Login") },
      ]);
    } catch (err) {
      console.error(err.response?.data || err.message);
      setMessage(err.response?.data?.error || "Error resetting password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Reset Your Password</Text>

      <Text style={styles.infoText}>
        Enter the reset code you received by email and set your new password.
      </Text>

      <View style={styles.form}>
        <TextInput
          placeholder="Reset Code"
          value={token}
          onChangeText={setToken}
          style={styles.input}
          placeholderTextColor="#888"
        />

        <TextInput
          secureTextEntry
          placeholder="New Password"
          value={password}
          onChangeText={setPassword}
          style={styles.input}
          placeholderTextColor="#888"
        />

        <TextInput
          secureTextEntry
          placeholder="Confirm Password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          style={styles.input}
          placeholderTextColor="#888"
        />

        <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Reset Password</Text>
          )}
        </TouchableOpacity>

        {message ? <Text style={styles.message}>{message}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f6fa",
    padding: 20,
    justifyContent: "center",
  },
  header: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#2c3e50",
    textAlign: "center",
    marginBottom: 10,
  },
  infoText: {
    textAlign: "center",
    fontSize: 14,
    color: "#7f8c8d",
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  form: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 5,
    elevation: 3,
  },
  input: {
    borderWidth: 1,
    borderColor: "#dcdde1",
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    fontSize: 16,
    color: "#2c3e50",
  },
  button: {
    backgroundColor: "#2980b9",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  message: {
    marginTop: 15,
    color: "#e74c3c",
    textAlign: "center",
    fontWeight: "500",
  },
});
