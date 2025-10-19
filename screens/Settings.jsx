import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  Platform,
  SafeAreaView,
  Modal,
  ScrollView,
  Alert,
  ActivityIndicator
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Menu, Provider, Divider } from "react-native-paper";
import { useTheme } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function Settings({ navigation }) {
  // Use navigation theme from hook, fallback if missing
  const navigationThemeHook = useTheme();
  const navigationTheme = navigationThemeHook ?? {
    colors: {
      background: "#001F60",
      text: "#E6C367",
      border: "#E6C367",
      primary: "#E6C367",
      card: "#001F60",
    },
  };

  const [profileImage, setProfileImage] = useState(null);
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [language, setLanguage] = useState("EN");
  const [themeMode, setThemeMode] = useState("Light");
  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);

  const [langMenuVisible, setLangMenuVisible] = useState(false);
  const [themeMenuVisible, setThemeMenuVisible] = useState(false);
  const [switchMenuVisible, setSwitchMenuVisible] = useState(false);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);

  const BASE_URL = "http://172.20.10.2:8000";

  const colors = useMemo(() => {
    return themeMode === "Dark"
      ? {
          background: "#001F60",
          text: "#E6C367",
          border: "#E6C367",
          primary: "#E6C367",
          card: "#0A2A7E",
        }
      : {
          background: "#F8FAFF",
          text: "#001F60",
          border: "#001F60",
          primary: "#001F60",
          card: "#FFFFFF",
        };
  }, [themeMode]);

  const t = (en, fr) => (language === "FR" ? fr : en);

  // Get token with better error handling
  const getToken = async () => {
    try {
      const token = await AsyncStorage.getItem("access_token");
      console.log("Token retrieved:", token ? token.substring(0, 20) + "..." : "No token found");
      return token;
    } catch (error) {
      console.log("Error getting token:", error);
      return null;
    }
  };

  // Load profile - FIXED VERSION
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setProfileLoading(true);
        const token = await getToken();
        
        if (!token) {
          Alert.alert("Error", "You must be logged in.");
          navigation.replace("Login");
          return;
        }

        console.log("Fetching profile...");

        const response = await axios.get(
          `${BASE_URL}/api/profiles/me/`,
          { 
            headers: { 
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json"
            } 
          }
        );
        
        const user = response.data;
        console.log("Profile data received:", user);
        
        setFullName(user.username || "");
        setPhoneNumber(user.phone || "");
        if (user.profile_picture) {
          // Ensure the full URL is used for profile picture
          const fullImageUrl = user.profile_picture.startsWith('http') 
            ? user.profile_picture 
            : `${BASE_URL}${user.profile_picture}`;
          setProfileImage(fullImageUrl);
        }
        
      } catch (error) {
        console.log("Failed to load profile", error);
        console.log("Error response:", error.response?.data);
        console.log("Error status:", error.response?.status);
        
        if (error.response?.status === 401) {
          Alert.alert("Session Expired", "Please login again.");
          await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user']);
          navigation.replace("Login");
        } else if (error.response?.status === 403) {
          Alert.alert("Permission Denied", "Authentication failed. Please login again.");
          await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user']);
          navigation.replace("Login");
        } else {
          Alert.alert("Error", "Failed to load profile. Please try again.");
        }
      } finally {
        setProfileLoading(false);
      }
    };
    
    fetchProfile();
  }, []);

  // Pick image
  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      alert("Permission to access gallery is required!");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) {
      setProfileImage(result.assets[0].uri);
    }
  };

  // Save profile - COMPLETELY FIXED VERSION
  const handleSaveChanges = async () => {
    try {
      setLoading(true);
      
      // Get token with validation
      const token = await getToken();
      if (!token) {
        Alert.alert("Error", "You must be logged in.");
        navigation.replace("Login");
        return;
      }

      console.log("Starting profile update with token:", token.substring(0, 20) + "...");

      const formData = new FormData();
      
      // Append basic fields
      formData.append("username", fullName);
      formData.append("phone", phoneNumber);
      
      // Only append password if it's not empty
      if (password && password.trim() !== "") {
        console.log("Updating password");
        formData.append("password", password);
      }

      // Handle profile picture upload - FIXED
      if (profileImage && !profileImage.startsWith("http")) {
        console.log("Uploading new profile picture");
        const filename = profileImage.split("/").pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image/jpeg`;
        
        formData.append("profile_picture", {
          uri: profileImage,
          name: filename,
          type,
        });
      } else if (profileImage) {
        console.log("Profile picture is already a URL, not uploading");
      }

      // Log form data contents for debugging
      console.log("FormData contents:");
      for (let [key, value] of formData._parts) {
        console.log(key, value);
      }

      // Make the request with proper headers
      const response = await axios.patch(
        `${BASE_URL}/api/profiles/me/`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
            'Accept': 'application/json',
          },
          timeout: 15000,
        }
      );

      console.log("Update successful:", response.status);
      console.log("Response data:", response.data);

      Alert.alert(
        t("Success", "Succès"),
        t("Profile updated successfully!", "Profil mis à jour avec succès !")
      );
      
      // Clear password field after successful update
      setPassword("");
      
    } catch (error) {
      console.log("Profile update error:", error);
      console.log("Error response:", error.response?.data);
      console.log("Error status:", error.response?.status);
      console.log("Error headers:", error.response?.headers);
      
      // Enhanced error handling
      if (error.response?.status === 401) {
        Alert.alert("Session Expired", "Please login again.");
        await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user']);
        navigation.replace("Login");
      } else if (error.response?.status === 403) {
        // More specific 403 handling
        if (error.response.data?.detail?.includes("Authentication credentials")) {
          Alert.alert(
            "Authentication Failed", 
            "Your session has expired or token is invalid. Please login again."
          );
          await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user']);
          navigation.replace("Login");
        } else {
          Alert.alert("Permission Denied", "You don't have permission to update profile.");
        }
      } else if (error.response?.data) {
        // Show validation errors from backend
        const errors = error.response.data;
        let errorMessage = "Failed to update profile. ";
        
        if (typeof errors === 'object') {
          Object.keys(errors).forEach(key => {
            if (Array.isArray(errors[key])) {
              errorMessage += `${key}: ${errors[key].join(', ')} `;
            } else {
              errorMessage += `${key}: ${errors[key]} `;
            }
          });
        } else if (typeof errors === 'string') {
          errorMessage += errors;
        }
        
        Alert.alert("Update Failed", errorMessage);
      } else if (error.code === 'ECONNABORTED') {
        Alert.alert("Timeout", "Request took too long. Please try again.");
      } else {
        Alert.alert("Error", "Failed to update profile. Please check your connection.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user']);
    navigation.replace("Login");
  };

  const handleSwitchAccount = () => {
    setSwitchMenuVisible(false);
    setConfirmModalVisible(true);
  };

  const confirmSwitch = () => {
    setConfirmModalVisible(false);
    alert("Request sent successfully for treatment");
  };

  if (profileLoading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            Loading profile...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <Provider>
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: colors.background }]}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>
            {t("Settings", "Paramètres")}
          </Text>
          
          <Menu
            visible={switchMenuVisible}
            onDismiss={() => setSwitchMenuVisible(false)}
            anchor={
              <TouchableOpacity
                style={styles.switchIconButton}
                onPress={() => setSwitchMenuVisible(true)}
              >
                <MaterialCommunityIcons
                  name="account-switch-outline"
                  size={28}
                  color={colors.text}
                />
              </TouchableOpacity>
            }
          >
            <Menu.Item onPress={handleSwitchAccount} title="Director" />
          </Menu>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={{ paddingBottom: 30 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Profile Picture */}
          <View style={styles.center}>
            <TouchableOpacity onPress={pickImage}>
              <Image
                source={
                  profileImage
                    ? { uri: profileImage }
                    : require("../../aureon/assets/images/icon.png")
                }
                style={[styles.profileImage, { borderColor: colors.border }]}
              />
              <View style={styles.cameraIcon}>
                <Ionicons name="camera" size={20} color={colors.background} />
              </View>
            </TouchableOpacity>
          </View>

          {/* Full Name */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>
              {t("Full Name", "Nom complet")}
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  borderColor: colors.border,
                  color: colors.text,
                  backgroundColor: colors.card,
                },
              ]}
              placeholder={t("Enter your name", "Entrez votre nom")}
              placeholderTextColor={colors.text + "80"}
              value={fullName}
              onChangeText={setFullName}
            />
          </View>

          {/* Phone */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>
              {t("Phone Number", "Numéro de téléphone")}
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  borderColor: colors.border,
                  color: colors.text,
                  backgroundColor: colors.card,
                },
              ]}
              placeholder="+237 6xx xxx xxx"
              placeholderTextColor={colors.text + "80"}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
            />
          </View>

          {/* Password */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>
              {t("Password", "Mot de passe")}
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  borderColor: colors.border,
                  color: colors.text,
                  backgroundColor: colors.card,
                },
              ]}
              placeholder={t("Enter new password", "Nouveau mot de passe")}
              placeholderTextColor={colors.text + "80"}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            <Text style={[styles.hint, { color: colors.text + "80" }]}>
              {t("Leave empty to keep current password", "Laissez vide pour garder le mot de passe actuel")}
            </Text>
          </View>

          {/* Language */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>
              {t("Language", "Langue")}
            </Text>
            <Menu
              visible={langMenuVisible}
              onDismiss={() => setLangMenuVisible(false)}
              anchor={
                <TouchableOpacity
                  style={[
                    styles.selectBox,
                    { borderColor: colors.border, backgroundColor: colors.card },
                  ]}
                  onPress={() => setLangMenuVisible(true)}
                >
                  <View style={styles.selectRow}>
                    <Ionicons name="globe-outline" size={20} color={colors.text} />
                    <Text style={[styles.selectText, { color: colors.text }]}>
                      {language === "EN" ? "English" : "Français"}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color={colors.text} />
                  </View>
                </TouchableOpacity>
              }
            >
              <Menu.Item
                onPress={() => {
                  setLanguage("EN");
                  setLangMenuVisible(false);
                }}
                title="English"
              />
              <Divider />
              <Menu.Item
                onPress={() => {
                  setLanguage("FR");
                  setLangMenuVisible(false);
                }}
                title="Français"
              />
            </Menu>
          </View>

          {/* Theme */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>
              {t("Theme", "Thème")}
            </Text>
            <Menu
              visible={themeMenuVisible}
              onDismiss={() => setThemeMenuVisible(false)}
              anchor={
                <TouchableOpacity
                  style={[
                    styles.selectBox,
                    { borderColor: colors.border, backgroundColor: colors.card },
                  ]}
                  onPress={() => setThemeMenuVisible(true)}
                >
                  <View style={styles.selectRow}>
                    <Ionicons
                      name={themeMode === "Dark" ? "moon-outline" : "sunny-outline"}
                      size={20}
                      color={colors.text}
                    />
                    <Text style={[styles.selectText, { color: colors.text }]}>
                      {themeMode}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color={colors.text} />
                  </View>
                </TouchableOpacity>
              }
            >
              <Menu.Item
                onPress={() => {
                  setThemeMode("Light");
                  setThemeMenuVisible(false);
                }}
                title="Light"
              />
              <Divider />
              <Menu.Item
                onPress={() => {
                  setThemeMode("Dark");
                  setThemeMenuVisible(false);
                }}
                title="Dark"
              />
            </Menu>
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[
              styles.button, 
              { backgroundColor: colors.primary },
              loading && styles.buttonDisabled
            ]}
            onPress={handleSaveChanges}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <Text style={[styles.buttonText, { color: colors.background }]}>
                {t("Save Changes", "Enregistrer")}
              </Text>
            )}
          </TouchableOpacity>

          {/* Logout */}
          <TouchableOpacity
            style={[styles.button, { backgroundColor: "red", marginTop: 15 }]}
            onPress={handleLogout}
          >
            <Text style={[styles.buttonText, { color: "#fff" }]}>Logout</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Confirm Modal */}
        <Modal
          visible={confirmModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setConfirmModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalText}>
                Ready to Switch Account to Director
              </Text>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={confirmSwitch}
              >
                <Text style={styles.modalButtonText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </Provider>
  );
}

/* ---------------- UPDATED STYLES ---------------- */
const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 50 : 30,
    marginBottom: 15,
  },
  title: { fontSize: 26, fontWeight: "700" },
  switchIconButton: { padding: 4 },

  scrollView: { flex: 1, paddingHorizontal: 20 },
  center: { alignItems: "center", marginBottom: 20 },
  profileImage: { 
    width: 120, 
    height: 120, 
    borderRadius: 60, 
    borderWidth: 3,
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: '#E6C367',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  field: { width: "100%", marginBottom: 10 },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 4, marginLeft: 2 },
  input: {
    borderWidth: 1.5,
    borderRadius: 10,
    padding: 10,
    fontSize: 15,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
    width: "100%",
  },
  hint: {
    fontSize: 12,
    marginTop: 4,
    marginLeft: 2,
    fontStyle: 'italic',
  },
  selectBox: {
    borderWidth: 1.5,
    borderRadius: 10,
    padding: 10,
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
    width: "100%",
  },
  selectRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  selectText: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "500",
  },
  button: {
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 25,
    width: "100%",
    elevation: 2,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: { fontSize: 16, fontWeight: "700", letterSpacing: 0.5 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 12,
    width: "80%",
    alignItems: "center",
  },
  modalText: { fontSize: 16, fontWeight: "600", textAlign: "center", marginBottom: 15 },
  modalButton: {
    backgroundColor: "#001F60",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  modalButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});