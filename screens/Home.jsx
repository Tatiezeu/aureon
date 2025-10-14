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
import axios from "axios";

// Backend API URL
const API_URL = "http://172.20.10.2:8000/api/reports/";

const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// ==========================
// GenerateReportForm Component
// ==========================
// Added `defaultHotel` prop so when creating a new report the form defaults to the currently selected tab's hotel.
function GenerateReportForm({ onClose, onSubmit, reportData, defaultHotel }) {
  // initialize with defaults, but synchronize with reportData via useEffect
  const [hotel, setHotel] = useState(reportData?.hotel_name || defaultHotel || "Mbolo Hotel");
  const [date, setDate] = useState(
    reportData?.created_at ? new Date(reportData.created_at) : new Date()
  );
  const [showPicker, setShowPicker] = useState(false);

  const [hebergement, setHebergement] = useState(
    String(reportData?.montant_hebergement ?? reportData?.hebergement ?? "")
  );
  const [bar, setBar] = useState(String(reportData?.montant_bar ?? reportData?.bar ?? ""));
  const [cuisine, setCuisine] = useState(String(reportData?.montant_cuisine ?? reportData?.cuisine ?? ""));
  const [expenses, setExpenses] = useState(
    reportData?.expenses && reportData.expenses.length > 0
      ? reportData.expenses.map((e) => ({ id: e.id, label: e.label ?? "", amount: String(e.amount ?? "") }))
      : [{ label: "", amount: "" }]
  );

  // Keep form fields in sync when reportData or defaultHotel changes (important for Update/create)
  useEffect(() => {
    if (reportData) {
      setHotel(reportData.hotel_name ?? defaultHotel ?? "Mbolo Hotel");
      setDate(reportData.created_at ? new Date(reportData.created_at) : new Date());
      setHebergement(String(reportData.montant_hebergement ?? reportData.hebergement ?? ""));
      setBar(String(reportData.montant_bar ?? reportData.bar ?? ""));
      setCuisine(String(reportData.montant_cuisine ?? reportData.cuisine ?? ""));
      setExpenses(
        reportData.expenses && reportData.expenses.length > 0
          ? reportData.expenses.map((e) => ({ id: e.id, label: e.label ?? "", amount: String(e.amount ?? "") }))
          : [{ label: "", amount: "" }]
      );
    } else {
      // if no reportData (creating new) reset to defaults, prefer defaultHotel when provided
      setHotel(defaultHotel ?? "Mbolo Hotel");
      setDate(new Date());
      setHebergement("");
      setBar("");
      setCuisine("");
      setExpenses([{ label: "", amount: "" }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportData, defaultHotel]);

  const totalIncome =
    (parseFloat(hebergement) || 0) + (parseFloat(bar) || 0) + (parseFloat(cuisine) || 0);

  const totalExpenses = expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

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

    // Prepare payload: include both backend-friendly keys and your friendly keys
    const isoDate = date instanceof Date ? date.toISOString().slice(0, 10) : String(date);

    const payload = {
      hotel_name: hotel,
      // include both naming conventions to increase robustness against serializer naming
      hebergement: parseFloat(hebergement) || 0,
      bar: parseFloat(bar) || 0,
      cuisine: parseFloat(cuisine) || 0,
      montant_hebergement: parseFloat(hebergement) || 0,
      montant_bar: parseFloat(bar) || 0,
      montant_cuisine: parseFloat(cuisine) || 0,
      date: isoDate,
      created_at: isoDate,
      // expenses array of objects { id?, label, amount }
      expenses: expenses.map((e) => {
        const obj = { label: e.label || "", amount: parseFloat(e.amount) || 0 };
        if (e.id) obj.id = e.id;
        return obj;
      }),
    };

    onSubmit(payload);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
      <ScrollView
        style={styles.formContainer}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={true}
      >
        <Text style={styles.formTitle}>{reportData ? "Update Report" : "Generate Report"}</Text>

        {/* Hotel Picker */}
        <View style={[styles.input, { padding: 0 }]}>
          <Picker selectedValue={hotel} onValueChange={(itemValue) => setHotel(itemValue)} style={{ color: "#001F60" }}>
            <Picker.Item label="Mbolo Hotel" value="Mbolo Hotel" />
            <Picker.Item label="Hotel La Dibamba" value="Hotel La Dibamba" />
          </Picker>
        </View>

        {/* Date Picker */}
        <TouchableOpacity style={[styles.input, { justifyContent: "center" }]} onPress={() => setShowPicker(true)}>
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
        <TextInputWithLabel label="Montant Hébergement" value={hebergement} onChangeText={setHebergement} keyboardType="numeric" />
        <TextInputWithLabel label="Montant Bar" value={bar} onChangeText={setBar} keyboardType="numeric" />
        <TextInputWithLabel label="Montant Cuisine" value={cuisine} onChangeText={setCuisine} keyboardType="numeric" />

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

        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
          <Text style={styles.submitText}>{reportData ? "Update Report" : "Generate Report"}</Text>
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
        <TextInput value={value} onChangeText={onChangeText} keyboardType={keyboardType || "default"} style={{ padding: 10 }} />
      </View>
    </View>
  );
}

// ==========================
// Home Component
// ==========================
const Home = () => {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState("mbolo"); // "mbolo" or "dibamba"
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

  const totalAmount =
    (parseFloat(room) || 0) + (parseFloat(bar) || 0) + (parseFloat(restaurant) || 0);

  const totalExpenses = expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

  const netAmount = totalAmount - totalExpenses;

  // helper mapping for hotel names based on activeTab
  const getHotelNameForTab = (tab) => {
    return tab === "mbolo" ? "Mbolo Hotel" : "Hotel La Dibamba";
  };

  // -------------------------
  // Fetch report for selected date and activeTab hotel
  // -------------------------
  const fetchReport = async () => {
    try {
      const dateStr = date.toISOString().slice(0, 10);
      const hotelName = getHotelNameForTab(activeTab);
      // request with both date and hotel_name to get specific report
      const res = await axios.get(`${API_URL}?date=${dateStr}&hotel_name=${encodeURIComponent(hotelName)}`);
      let data = res.data;

      // If the API returns an array and has items, use the first one
      if (Array.isArray(data) && data.length > 0) {
        setReportData(data[0]);
        // populate local display values
        const report = data[0];
        setRoom(String(report.montant_hebergement ?? report.hebergement ?? ""));
        setBar(String(report.montant_bar ?? report.bar ?? ""));
        setRestaurant(String(report.montant_cuisine ?? report.cuisine ?? ""));
        setExpenses(
          report.expenses && report.expenses.length
            ? report.expenses.map((e) => ({ label: e.label, amount: String(e.amount) }))
            : [{ label: "", amount: "" }]
        );
        return;
      }

      // if not found for that date/hotel, attempt to find latest for that hotel
      const latestRes = await axios.get(`${API_URL}?hotel_name=${encodeURIComponent(hotelName)}`);
      const latestData = latestRes.data;
      if (Array.isArray(latestData) && latestData.length > 0) {
        setReportData(latestData[0]);
        Alert.alert("Info", `No report for ${dateStr}. Showing latest ${hotelName} report instead.`);
        const report = latestData[0];
        setRoom(String(report.montant_hebergement ?? report.hebergement ?? ""));
        setBar(String(report.montant_bar ?? report.bar ?? ""));
        setRestaurant(String(report.montant_cuisine ?? report.cuisine ?? ""));
        setExpenses(
          report.expenses && report.expenses.length
            ? report.expenses.map((e) => ({ label: e.label, amount: String(e.amount) }))
            : [{ label: "", amount: "" }]
        );
        return;
      }

      // fallback: no data at all
      setReportData(null);
      setRoom("");
      setBar("");
      setRestaurant("");
      setExpenses([{ label: "", amount: "" }]);
    } catch (error) {
      console.log("fetchReport error:", error);
      Alert.alert("Error", "Failed to fetch report data");
    }
  };

  // -------------------------
  // Create / Update report
  // -------------------------
  const handleGenerateOrUpdate = async (payload) => {
    try {
      const isUpdate = updateMode && reportData && reportData.id;
      const url = isUpdate ? `${API_URL}${reportData.id}/` : API_URL;
      const method = isUpdate ? "put" : "post";

      // Ensure hotel_name is set (respect activeTab if not provided)
      if (!payload.hotel_name) {
        payload.hotel_name = getHotelNameForTab(activeTab);
      }

      // Send request
      await axios({
        method,
        url,
        headers: { "Content-Type": "application/json" },
        data: payload,
      });

      Alert.alert("Success", isUpdate ? "Report updated" : "Report generated");
      setShowAddModal(false);
      setUpdateMode(false);
      // refresh report after change
      fetchReport();
    } catch (error) {
      console.log("save error:", error.response?.data || error.message || error);
      Alert.alert("Error", "Failed to save report");
    }
  };

  // -------------------------
  // Print PDF with full details
  // -------------------------
  const handlePrint = async () => {
    try {
      if (!reportData) {
        Alert.alert("Error", "No report to print");
        return;
      }

      const dateStr = new Date(reportData.created_at || date).toLocaleDateString();

      // Extract all values with fallbacks
      const hotelName = reportData.hotel_name || getHotelNameForTab(activeTab) || "N/A";
      const montantHebergement = reportData.montant_hebergement ?? reportData.hebergement ?? 0;
      const montantBar = reportData.montant_bar ?? reportData.bar ?? 0;
      const montantCuisine = reportData.montant_cuisine ?? reportData.cuisine ?? 0;

      const expensesList = reportData.expenses && reportData.expenses.length > 0 ? reportData.expenses : expenses;

      const totalIncome =
        (parseFloat(montantHebergement) || 0) + (parseFloat(montantBar) || 0) + (parseFloat(montantCuisine) || 0);

      const totalExpenses = expensesList.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

      const reste = totalIncome - totalExpenses;

      // Format numbers with thousands separators for readability
      const formatFCFA = (n) => {
        try {
          const num = parseFloat(n) || 0;
          return num.toLocaleString("en-US", { maximumFractionDigits: 2 });
        } catch {
          return String(n);
        }
      };

      // HTML content for print
      const html = `
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #001F60; }
            h1 { text-align: center; color: #001F60; margin-bottom: 6px; }
            .meta { text-align: center; margin-bottom: 18px; color: #444; }
            .section { margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
            th { background-color: #FFD700; color: #001F60; }
            .summary { margin-top: 20px; font-weight: bold; font-size: 16px; }
            .footer { text-align: center; margin-top: 40px; font-size: 13px; color: #555; }
          </style>
        </head>
        <body>
          <h1>Daily Financial Report</h1>
          <div class="meta">
            <div><strong>${hotelName}</strong></div>
            <div>${dateStr}</div>
          </div>

          <div class="section">
            <h3>Montants</h3>
            <table>
              <tr><th>Category</th><th>Montant (FCFA)</th></tr>
              <tr><td>Montant Hébergement</td><td>${formatFCFA(montantHebergement)}</td></tr>
              <tr><td>Montant Bar</td><td>${formatFCFA(montantBar)}</td></tr>
              <tr><td>Montant Cuisine</td><td>${formatFCFA(montantCuisine)}</td></tr>
              <tr><th>Total Montants</th><th>${formatFCFA(totalIncome)}</th></tr>
            </table>
          </div>

          <div class="section">
            <h3>Sorties (Expenses)</h3>
            <table>
              <tr><th>Label</th><th>Montant (FCFA)</th></tr>
              ${expensesList
                .map((e) => `<tr><td>${(e.label && e.label !== "undefined") ? e.label : "—"}</td><td>${formatFCFA(e.amount)}</td></tr>`)
                .join("")}
              <tr><th>Total Sorties</th><th>${formatFCFA(totalExpenses)}</th></tr>
            </table>
          </div>

          <div class="section summary">
            <p>Reste en caisse: ${formatFCFA(reste)} FCFA</p>
          </div>

          <div class="footer">
            Generated by Aureon Accounting System
          </div>
        </body>
      </html>
    `;

      await Print.printAsync({ html });
    } catch (error) {
      console.log("Print error:", error);
      Alert.alert("Error", "Failed to print report");
    }
  };

  // Fetch when date or activeTab changes
  useEffect(() => {
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, activeTab]);

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
              // open modal in create mode (no prefill) BUT pass defaultHotel that matches the active tab
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
          <Text style={{ color: "#E6C367" }}>{`${date.getDate()}-${months[date.getMonth()]}-${date.getFullYear()}`}</Text>
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
                  if (!reportData) {
                    Alert.alert("Info", "No report loaded to update.");
                    return;
                  }
                  setUpdateMode(true);
                  // open modal in update mode; GenerateReportForm listens to reportData changes so it will prefill
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
          <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate("Analytics")}>
            <Ionicons name="stats-chart-outline" size={22} color="#E6C367" />
            <Text style={styles.navText}>Analytics</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate("History")}>
            <Ionicons name="stats-chart-outline" size={22} color="#E6C367" />
            <Text style={styles.navText}>History</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate("Settings")}>
            <Ionicons name="settings-outline" size={22} color="#E6C367" />
            <Text style={styles.navText}>Settings</Text>
          </TouchableOpacity>
        </View>

        {/* Add / Update Modal */}
        <Modal visible={showAddModal} animationType="slide">
          <GenerateReportForm
            reportData={updateMode ? reportData : null}
            defaultHotel={getHotelNameForTab(activeTab)}
            onClose={() => {
              setShowAddModal(false);
              setUpdateMode(false);
            }}
            onSubmit={handleGenerateOrUpdate}
          />
        </Modal>
      </View>
    </SafeAreaView>
  );
};

// ==========================
// Styles (merged carefully)
// ==========================
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#001F60" },
  container: { flex: 1, backgroundColor: "#001F60", paddingHorizontal: 20, paddingBottom: 90 },

  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 5 },
  headerText: { fontSize: 22, color: "#FFD700", fontWeight: "bold" },
  addButton: { backgroundColor: "#FFD700", borderRadius: 20, width: 34, height: 34, alignItems: "center", justifyContent: "center" },

  // Professional Cards
  cardLarge: {
    backgroundColor: "#FFD700",
    borderRadius: 20,
    marginTop: 10,
    padding: 25,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  cardSmall: {
    flex: 1,
    backgroundColor: "#FFEA7F",
    borderRadius: 16,
    marginHorizontal: 6,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },
  cardLabel: { fontSize: 16, color: "#3A2E00", fontWeight: "600" },
  cardValue: {
    fontSize: 22,
    color: "#3A2E00",
    fontWeight: "bold",
    textShadowColor: "rgba(0,0,0,0.2)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },

  row: { flexDirection: "row", marginTop: 12 },

  tabContainer: { flexDirection: "row", justifyContent: "center", backgroundColor: "#142A75", borderRadius: 25, marginTop: 16 },
  tabButton: { flex: 1, paddingVertical: 12, alignItems: "center", borderRadius: 25 },
  activeTabButton: { backgroundColor: "#FFD700" },
  tabText: { color: "#FFD700", fontWeight: "600" },
  activeTabText: { color: "#001F60", fontWeight: "bold" },

  scrollArea: { flex: 1 },
  dayCard: {
    backgroundColor: "#142A75",
    borderRadius: 18,
    marginBottom: 12,
    padding: 22,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 7,
  },
  dateText: { color: "#FFD700", fontWeight: "bold", marginBottom: 10, fontSize: 18 },
  amountText: { color: "#FFFFFF", marginBottom: 6, fontSize: 16, fontWeight: "600" },

  // Expenses title
  subtitle: { fontSize: 18, fontWeight: "bold", color: "#86862ba9", marginBottom: 10, marginTop: 14 },

  buttonRow: { flexDirection: "row", justifyContent: "center", gap: 12, marginTop: 12 },

  printButton: {
    flex: 1,
    backgroundColor: "#4CAF50",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  updateButton: {
    flex: 1,
    backgroundColor: "#FFD700",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  buttonText: { color: "#001F60", fontWeight: "bold", fontSize: 16 },

  bottomNav: { position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", justifyContent: "space-around", backgroundColor: "#142A75", paddingVertical: 12 },
  navItem: { alignItems: "center" },
  navText: { color: "#FFD700", fontSize: 12, marginTop: 4 },

  modalOverlay: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.5)" },
  addModalContainer: { width: "100%", height: "100%", backgroundColor: "#FFF", borderRadius: 14, overflow: "hidden" },
  formContainer: { flex: 1, backgroundColor: "#FFF", padding: 10 },
  formTitle: { fontSize: 22, fontWeight: "bold", color: "#001F60", marginBottom: 16, marginTop: 40, textAlign: "center" },

  input: { borderWidth: 1, borderColor: "#CCC", borderRadius: 10, marginTop: 10, marginBottom: 10, backgroundColor: "#FFF" },
  expenseRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  addBtn: { backgroundColor: "#FFD700", paddingVertical: 12, borderRadius: 10, alignItems: "center", marginBottom: 18 },
  addBtnText: { color: "#001F60", fontWeight: "bold" },
  summary: { fontSize: 18, color: "#131212ff", fontWeight: "bold", marginBottom: 6, textAlign: "center", textShadowColor: "rgba(0, 0, 0, 0.33)", textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 },

  submitBtn: { backgroundColor: "#001F60", padding: 16, borderRadius: 14, alignItems: "center", marginTop: 12 },
  submitText: { color: "#FFF", fontWeight: "bold", fontSize: 16 },
  closeBtn: { marginTop: 12, alignItems: "center" },
  closeText: { color: "#999" },

  notificationButton: { position: "relative", width: 34, height: 40, marginRight: -40, marginTop: 5, alignItems: "center", justifyContent: "center" },
  notificationBadge: { position: "absolute", top: 3, right: 3, backgroundColor: "red", borderRadius: 10, minWidth: 16, height: 16, justifyContent: "center", alignItems: "center", paddingHorizontal: 3 },
  notificationBadgeText: { color: "#fff", fontSize: 10, fontWeight: "bold" },
});

export default Home;
