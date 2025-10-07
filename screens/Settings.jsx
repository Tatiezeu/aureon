import React, { useState, useMemo } from "react";
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
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Menu, Provider, Divider } from "react-native-paper";
import { useTheme } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { MaterialCommunityIcons } from "@expo/vector-icons"; // 👈 added

export default function Settings({ navigation }) {
  // ✅ fallback theme
  let navigationTheme;
  try {
    navigationTheme = useTheme();
  } catch {
    navigationTheme = {
      colors: {
        background: "#001F60",
        text: "#E6C367",
        border: "#E6C367",
        primary: "#E6C367",
        card: "#001F60",
      },
    };
  }

  const [profileImage, setProfileImage] = useState(null);
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [language, setLanguage] = useState("EN");
  const [themeMode, setThemeMode] = useState("Light");

  const [langMenuVisible, setLangMenuVisible] = useState(false);
  const [themeMenuVisible, setThemeMenuVisible] = useState(false);
  const [switchMenuVisible, setSwitchMenuVisible] = useState(false);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);

  // 🎨 Dynamic theme colors
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

  const handleLogout = () => {
    alert("You have been logged out.");
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

  return (
    <Provider>
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>
            {t("Settings", "Paramètres")}
          </Text>

          {/* 👤 Switch Account Icon */}
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

        {/* Content */}
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
                { borderColor: colors.border, color: colors.text, backgroundColor: colors.card },
              ]}
              placeholder={t("Enter your name", "Entrez votre nom")}
              placeholderTextColor={colors.text + "80"}
              value={fullName}
              onChangeText={setFullName}
            />
          </View>

          {/* Phone Number */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>
              {t("Phone Number", "Numéro de téléphone")}
            </Text>
            <TextInput
              style={[
                styles.input,
                { borderColor: colors.border, color: colors.text, backgroundColor: colors.card },
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
                { borderColor: colors.border, color: colors.text, backgroundColor: colors.card },
              ]}
              placeholder=""
              placeholderTextColor={colors.text + "80"}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          {/* Language Select */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>
              {t("Language", "Langue")}
            </Text>
            <Menu
              visible={langMenuVisible}
              onDismiss={() => setLangMenuVisible(false)}
              anchor={
                <TouchableOpacity
                  style={[styles.selectBox, { borderColor: colors.border, backgroundColor: colors.card }]}
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
              <Menu.Item onPress={() => { setLanguage("EN"); setLangMenuVisible(false); }} title="English" />
              <Divider />
              <Menu.Item onPress={() => { setLanguage("FR"); setLangMenuVisible(false); }} title="Français" />
            </Menu>
          </View>

          {/* Theme Select */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>
              {t("Theme", "Thème")}
            </Text>
            <Menu
              visible={themeMenuVisible}
              onDismiss={() => setThemeMenuVisible(false)}
              anchor={
                <TouchableOpacity
                  style={[styles.selectBox, { borderColor: colors.border, backgroundColor: colors.card }]}
                  onPress={() => setThemeMenuVisible(true)}
                >
                  <View style={styles.selectRow}>
                    <Ionicons
                      name={themeMode === "Dark" ? "moon-outline" : "sunny-outline"}
                      size={20}
                      color={colors.text}
                    />
                    <Text style={[styles.selectText, { color: colors.text }]}>{themeMode}</Text>
                    <Ionicons name="chevron-down" size={20} color={colors.text} />
                  </View>
                </TouchableOpacity>
              }
            >
              <Menu.Item onPress={() => { setThemeMode("Light"); setThemeMenuVisible(false); }} title="Light" />
              <Divider />
              <Menu.Item onPress={() => { setThemeMode("Dark"); setThemeMenuVisible(false); }} title="Dark" />
            </Menu>
          </View>

          {/* Save Changes */}
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={() => alert(t("Changes saved successfully!", "Modifications enregistrées !"))}
          >
            <Text style={[styles.buttonText, { color: colors.background }]}>
              {t("Save Changes", "Enregistrer")}
            </Text>
          </TouchableOpacity>

          {/* Logout */}
          <TouchableOpacity
            style={[styles.button, { backgroundColor: "red", marginTop: 15 }]}
            onPress={handleLogout}
          >
            <Text style={[styles.buttonText, { color: "#fff" }]}>Logout</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Confirmation Modal */}
        <Modal
          visible={confirmModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setConfirmModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalText}>Ready to Switch Account to Director</Text>
              <TouchableOpacity style={styles.modalButton} onPress={confirmSwitch}>
                <Text style={styles.modalButtonText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </Provider>
  );
}

/* ---------------- STYLES ---------------- */
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
  title: {
    fontSize: 26,
    fontWeight: "700",
  },
  switchIconButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  center: {
    alignItems: "center",
    marginBottom: 20,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
  },
  field: {
    width: "100%",
    marginBottom: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
    marginLeft: 2,
  },
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
  buttonText: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.5,
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
  modalText: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 15,
  },
  modalButton: {
    backgroundColor: "#001F60",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  modalButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});