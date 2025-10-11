import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TextInput,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import Ionicons from "react-native-vector-icons/Ionicons";
import * as Print from "expo-print";
import { useNavigation } from "@react-navigation/native";
import DateTimePicker from "@react-native-community/datetimepicker";

// Backend API URL
const API_URL = "http://172.20.10.2:8000/api/"; // replace with your backend

const months = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

// ==========================
// GenerateReportForm Component
// ==========================
function GenerateReportForm({ onClose, onSubmit, reportData }) {
  const [hotel, setHotel] = useState(reportData?.hotel || "Mbolo Hotel");
  const [date, setDate] = useState(reportData?.date ? new Date(reportData.date) : new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [hebergement, setHebergement] = useState(reportData?.hebergement || "");
  const [bar, setBar] = useState(reportData?.bar || "");
  const [cuisine, setCuisine] = useState(reportData?.cuisine || "");
  const [expenses, setExpenses] = useState(reportData?.expenses || [{ label: "", amount: "" }]);

  const totalIncome =
    (parseFloat(hebergement) || 0) +
    (parseFloat(bar) || 0) +
    (parseFloat(cuisine) || 0);

  const totalExpenses = expenses.reduce(
    (sum, e) => sum + (parseFloat(e.amount) || 0),
    0
  );

  const reste = totalIncome - totalExpenses;

  const addExpense = () => setExpenses([...expenses, { label: "", amount: "" }]);
  const updateExpense = (index, key, value) => {
    const newExpenses = [...expenses];
    newExpenses[index][key] = value;
    setExpenses(newExpenses);
  };

  const handleSubmit = () => {
    if (!hotel) {
      Alert.alert("Error", "Please select a hotel");
      return;
    }
    onSubmit({
      date,
      hotel,
      hebergement,
      bar,
      cuisine,
      expenses,
      reste,
    });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1 }}
    >
      <ScrollView
        style={styles.formContainer}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={true}
      >
        <Text style={styles.formTitle}>Generate Report</Text>

        {/* Hotel Picker */}
        <View style={[styles.input, { padding: 0 }]}>
          <Picker
            selectedValue={hotel}
            onValueChange={(itemValue) => setHotel(itemValue)}
            style={{ color: "#001F60" }}
          >
            <Picker.Item label="Mbolo Hotel" value="Mbolo Hotel" />
            <Picker.Item label="Hotel La Dibamba" value="Hotel La Dibamba" />
          </Picker>
        </View>

        {/* Date Picker */}
        <TouchableOpacity
          style={[styles.input, { justifyContent: "center" }]}
          onPress={() => setShowPicker(true)}
        >
          <Text>{`${date.getDate()}-${months[date.getMonth()]}-${date.getFullYear()}`}</Text>
        </TouchableOpacity>

        {showPicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display="inline"
            onChange={(event, selectedDate) => {
              setShowPicker(false);
              if (selectedDate) setDate(selectedDate);
            }}
          />
        )}

        {/* Amount Inputs */}
        <TextInputWithLabel
          label="Montant Hébergement"
          value={hebergement}
          onChangeText={setHebergement}
        />
        <TextInputWithLabel label="Montant Bar" value={bar} onChangeText={setBar} />
        <TextInputWithLabel
          label="Montant Cuisine"
          value={cuisine}
          onChangeText={setCuisine}
        />

        <Text style={styles.subtitle}>Expenses</Text>
        {expenses.map((exp, i) => (
          <View key={i} style={styles.expenseRow}>
            <TextInputWithLabel
              label="Label"
              value={exp.label}
              onChangeText={(v) => updateExpense(i, "label", v)}
              containerStyle={{ flex: 1, marginRight: 6 }}
            />
            <TextInputWithLabel
              label="Amount"
              value={exp.amount}
              onChangeText={(v) => updateExpense(i, "amount", v)}
              containerStyle={{ flex: 1 }}
              keyboardType="numeric"
            />
          </View>
        ))}

        <TouchableOpacity style={styles.addBtn} onPress={addExpense}>
          <Text style={styles.addBtnText}>+ Add Expense</Text>
        </TouchableOpacity>

        <Text style={styles.summary}>Total Income: {totalIncome} FCFA</Text>
        <Text style={styles.summary}>Total Expenses: {totalExpenses} FCFA</Text>
        <Text style={styles.summary}>Reste en caisse: {reste} FCFA</Text>

        <TouchableOpacity
          style={styles.submitBtn}
          onPress={handleSubmit}
        >
          <Text style={styles.submitText}>
            {reportData ? "Update Report" : "Generate Report"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <Text style={styles.closeText}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ==========================
// Custom TextInput with Label
// ==========================
function TextInputWithLabel({ label, value, onChangeText, containerStyle, keyboardType }) {
  return (
    <View style={containerStyle}>
      <Text style={{ fontWeight: "600", marginBottom: 4, color: "#001F60" }}>{label}</Text>
      <View style={[styles.input, { marginBottom: 10 }]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType || "default"}
          style={{ padding: 10 }}
        />
      </View>
    </View>
  );
}

// ==========================
// Home Component
// ==========================
const Home = () => {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState("mbolo");
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [unreadCount, setUnreadCount] = useState(3);

  const [reportData, setReportData] = useState(null);
  const [room, setRoom] = useState("");
  const [bar, setBar] = useState("");
  const [restaurant, setRestaurant] = useState("");
  const [expenses, setExpenses] = useState([{ label: "", amount: "" }]);
  const [updateMode, setUpdateMode] = useState(false);

  // Calculate amounts for summary cards
  const totalAmount =
    (parseFloat(room) || 0) +
    (parseFloat(bar) || 0) +
    (parseFloat(restaurant) || 0);

  const totalExpenses = expenses.reduce(
    (sum, e) => sum + (parseFloat(e.amount) || 0),
    0
  );

  const netAmount = totalAmount - totalExpenses;

  const fetchReport = async () => {
  try {
    // 1️⃣ Try fetching report for selected date
    let response = await fetch(`${API_URL}/reports/?date=${date.toISOString().slice(0,10)}`);
    let data = await response.json();

    if (data.length > 0) {
      setReportData(data[0]);
    } else {
      // 2️⃣ If no report for selected date, fetch latest report
      response = await fetch(`${API_URL}/reports/`);
      data = await response.json();
      if (data.length > 0) {
        setReportData(data[0]);
        Alert.alert("Info", "No report for selected date. Showing latest report instead.");
      } else {
        // 3️⃣ No report exists at all
        setReportData(null);
      }
    }

    // Update state fields for display
    if (data.length > 0) {
      const report = data[0];
      setRoom(report.hebergement);
      setBar(report.bar);
      setRestaurant(report.cuisine);
      setExpenses(report.expenses.length ? report.expenses : [{ label: "", amount: "" }]);
    } else {
      setRoom("");
      setBar("");
      setRestaurant("");
      setExpenses([{ label: "", amount: "" }]);
    }
  } catch (error) {
    console.log(error);
    Alert.alert("Error", "Failed to fetch report data");
  }
};


  const handleGenerateOrUpdate = async (data) => {
    try {
      const method = reportData ? "PUT" : "POST";
      const url = reportData ? `${API_URL}/reports/${reportData.id}/` : `${API_URL}/reports/`;

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hotel: data.hotel,
          date: data.date.toISOString().slice(0,10),
          hebergement: data.hebergement,
          bar: data.bar,
          cuisine: data.cuisine,
          expenses: data.expenses,
          reste: data.reste,
        }),
      });

      if (response.ok) {
        Alert.alert("Success", reportData ? "Report updated" : "Report generated");
        setShowAddModal(false);
        fetchReport();
      } else {
        Alert.alert("Error", "Failed to save report");
      }
    } catch (error) {
      console.log(error);
      Alert.alert("Error", "Failed to save report");
    }
  };

  const handlePrint = async () => {
    try {
      const response = await fetch(`${API_URL}/reports/${reportData?.id}/print/`);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      await Print.printAsync({ uri: url });
    } catch (error) {
      console.log(error);
      Alert.alert("Error", "Failed to print report");
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerText}>Accountant Aureon</Text>
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={() => {
              setUnreadCount(0);
              navigation.navigate("Notifications");
            }}
          >
            <Ionicons name="notifications-outline" size={24} color="#E6C367" />
            {unreadCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>{unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => {
              setUpdateMode(false);
              setShowAddModal(true);
            }}
          >
            <Ionicons name="add" size={26} color="#001F60" />
          </TouchableOpacity>
        </View>

        {/* Summary Cards */}
        <View style={[styles.cardLarge, { padding: 20 }]}>
          <Text style={styles.cardLabel}>Net Amount</Text>
          <Text style={[styles.cardValue, { fontSize: 22 }]}>{netAmount.toFixed(2)} FCFA</Text>
        </View>

        <View style={styles.row}>
          <View style={[styles.cardSmall, { padding: 14 }]}>
            <Text style={styles.cardLabel}>Total Amount</Text>
            <Text style={styles.cardValue}>{totalAmount.toFixed(2)} FCFA</Text>
          </View>
          <View style={[styles.cardSmall, { padding: 14 }]}>
            <Text style={styles.cardLabel}>Total Expenses</Text>
            <Text style={styles.cardValue}>{totalExpenses.toFixed(2)} FCFA</Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === "mbolo" && styles.activeTabButton]}
            onPress={() => setActiveTab("mbolo")}
          >
            <Text style={[styles.tabText, activeTab === "mbolo" && styles.activeTabText]}>Mbolo</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === "dibamba" && styles.activeTabButton]}
            onPress={() => setActiveTab("dibamba")}
          >
            <Text style={[styles.tabText, activeTab === "dibamba" && styles.activeTabText]}>Dibamba</Text>
          </TouchableOpacity>
        </View>

        {/* Inline Date Picker */}
        <TouchableOpacity
          style={[styles.input, { backgroundColor: "#142A75", marginTop: 10 }]}
          onPress={() => setShowDatePicker(true)}
        >
          <Text style={{ color: "#E6C367" }}>
            {`${date.getDate()}-${months[date.getMonth()]}-${date.getFullYear()}`}
          </Text>
        </TouchableOpacity>

        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display="inline"
            onChange={(event, selectedDate) => {
              setShowDatePicker(false);
              if (selectedDate) setDate(selectedDate);
            }}
          />
        )}

        {/* Single Card with Inputs */}
        <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
          <View style={[styles.dayCard, { padding: 20 }]}>
            <Text style={styles.dateText}>Report for {date.toDateString()}</Text>

            <Text style={styles.amountText}>Montant Hébergement: FCFA {room}</Text>
            <Text style={styles.amountText}>Montant Bar: FCFA {bar}</Text>
            <Text style={styles.amountText}>Montant Cuisine: FCFA {restaurant}</Text>

            <Text style={styles.subtitle}>Expenses</Text>
            {expenses.map((exp, i) => (
              <View key={i} style={styles.expenseRow}>
                <Text style={{ color: "#FFF", flex: 1 }}>{exp.label || "Label"}</Text>
                <Text style={{ color: "#FFF", flex: 1 }}>FCFA {exp.amount || 0}</Text>
              </View>
            ))}

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.updateButton}
                onPress={() => {
                  setUpdateMode(true);
                  setShowAddModal(true);
                }}
              >
                <Text style={styles.buttonText}>Update</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.printButton} onPress={handlePrint}>
                <Text style={styles.buttonText}>Print</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        {/* Bottom Navigation */}
        <View style={styles.bottomNav}>
          <TouchableOpacity style={styles.navItem}>
            <Ionicons name="home-outline" size={22} color="#E6C367" />
            <Text style={styles.navText}>Home</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => navigation.navigate("Analytics")}
          >
            <Ionicons name="stats-chart-outline" size={22} color="#E6C367" />
            <Text style={styles.navText}>Analytics</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => navigation.navigate("History")}
          >
            <Ionicons name="document-text-outline" size={22} color="#E6C367" />
            <Text style={styles.navText}>History</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => navigation.navigate("Settings")}
          >
            <Ionicons name="settings-outline" size={22} color="#E6C367" />
            <Text style={styles.navText}>Settings</Text>
          </TouchableOpacity>
        </View>

        {/* Add / Update Modal */}
        <Modal animationType="slide" transparent visible={showAddModal}>
          <View style={styles.modalOverlay}>
            <View style={styles.addModalContainer}>
              <GenerateReportForm
                onClose={() => setShowAddModal(false)}
                onSubmit={handleGenerateOrUpdate}
                reportData={updateMode ? reportData : null}
              />
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
};

export default Home;

// ==========================
// Styles
// ==========================
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#001F60" },
  container: { flex: 1, backgroundColor: "#001F60", paddingHorizontal: 20, paddingBottom: 90 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 5 },
  headerText: { fontSize: 22, color: "#E6C367", fontWeight: "bold" },
  addButton: { backgroundColor: "#E6C367", borderRadius: 20, width: 34, height: 34, alignItems: "center", justifyContent: "center" },
  cardLarge: { backgroundColor: "#E6C367", borderRadius: 14, marginTop: 10 },
  cardSmall: { flex: 1, backgroundColor: "#E6C367", borderRadius: 14, marginHorizontal: 4 },
  cardLabel: { fontSize: 16, color: "#3A2E00", fontWeight: "600" },
  cardValue: { fontSize: 20, color: "#3A2E00", fontWeight: "bold" },
  row: { flexDirection: "row", marginTop: 12 },
  tabContainer: { flexDirection: "row", justifyContent: "center", backgroundColor: "#142A75", borderRadius: 25, marginTop: 16 },
  tabButton: { flex: 1, paddingVertical: 12, alignItems: "center", borderRadius: 25 },
  activeTabButton: { backgroundColor: "#E6C367" },
  tabText: { color: "#E6C367", fontWeight: "600" },
  activeTabText: { color: "#001F60", fontWeight: "bold" },
  scrollArea: { flex: 1 },
  dayCard: { backgroundColor: "#142A75", borderRadius: 12, marginBottom: 10 },
  dateText: { color: "#E6C367", fontWeight: "bold", marginBottom: 6},
  amountText: { color: "#FFFFFF", marginBottom: 6 },
  buttonRow: { flexDirection: "row", justifyContent: "center", gap: 10,padding:10, marginTop: 8 },
  printButton: { backgroundColor: "#E6C367", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  updateButton: { backgroundColor: "#FFC107", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  buttonText: { color: "#001F60", fontWeight: "bold" },
  bottomNav: { position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", justifyContent: "space-around", backgroundColor: "#142A75", paddingVertical: 12 },
  navItem: { alignItems: "center" },
  navText: { color: "#E6C367", fontSize: 12, marginTop: 4 },
  modalOverlay: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.5)" },
  addModalContainer: { width: "100%", height: "100%", backgroundColor: "#FFF", borderRadius: 14, overflow: "hidden" },
  formContainer: { flex: 1, backgroundColor: "#FFF", padding: 10 },
  formTitle: { fontSize: 22, fontWeight: "bold", color: "#001F60", marginBottom: 16, marginTop: 40, textAlign: "center" },
  input: { borderWidth: 1, borderColor: "#CCC", borderRadius: 10,marginTop:10,  marginBottom: 10, backgroundColor: "#FFF" },
  subtitle: { fontSize: 18, fontWeight: "bold", color: "#001F60", marginBottom: 10, marginTop: 14 },
  expenseRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  addBtn: { backgroundColor: "#E6C367", paddingVertical: 12, borderRadius: 10, alignItems: "center", marginBottom: 18 },
  addBtnText: { color: "#001F60", fontWeight: "bold" },
  summary: { fontSize: 16, color: "#001F60", marginBottom: 8 },
  submitBtn: { backgroundColor: "#001F60", padding: 14, borderRadius: 10, alignItems: "center", marginTop: 12 },
  submitText: { color: "#FFF", fontWeight: "bold" },
  closeBtn: { marginTop: 12, alignItems: "center" },
  closeText: { color: "#999" },
  notificationButton: { position: "relative", width: 34, height: 40, marginRight: -40, marginTop: 5, alignItems: "center", justifyContent: "center" },
  notificationBadge: { position: "absolute", top: 3, right: 3, backgroundColor: "red", borderRadius: 10, minWidth: 16, height: 16, justifyContent: "center", alignItems: "center", paddingHorizontal: 3 },
  notificationBadgeText: { color: "#fff", fontSize: 10, fontWeight: "bold" },
});
