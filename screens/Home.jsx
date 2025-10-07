import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  SafeAreaView,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import * as Print from "expo-print";
import { useNavigation } from "@react-navigation/native";
import DateTimePicker from "@react-native-community/datetimepicker";

const months = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const generateDays = (monthIndex, year) => {
  const totalDays = new Date(year, monthIndex + 1, 0).getDate();
  const days = [];
  for (let i = 1; i <= totalDays; i++) {
    days.push({
      id: i.toString(),
      date: `${i < 10 ? "0" + i : i}-${months[monthIndex]}-${year}`,
      amount: (Math.random() * 100000).toFixed(2),
    });
  }
  return days;
};

// ==========================
// GenerateReportForm Component
// ==========================
function GenerateReportForm({ onClose, onSubmit }) {
  const [hotel, setHotel] = useState("");
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [hebergement, setHebergement] = useState("");
  const [bar, setBar] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [expenses, setExpenses] = useState([{ label: "", amount: "" }]);

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

        <TouchableOpacity
          style={styles.input}
          onPress={() => setShowPicker(true)}
        >
          <Text>
            {date
              ? `${date.getDate()}-${months[date.getMonth()]}-${date.getFullYear()}`
              : "Select Date"}
          </Text>
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

        <TextInput
          style={styles.input}
          placeholder="Hotel Name"
          value={hotel}
          onChangeText={setHotel}
        />
        <TextInput
          style={styles.input}
          placeholder="Montant Hébergement"
          value={hebergement}
          onChangeText={setHebergement}
          keyboardType="numeric"
        />
        <TextInput
          style={styles.input}
          placeholder="Montant Bar"
          value={bar}
          onChangeText={setBar}
          keyboardType="numeric"
        />
        <TextInput
          style={styles.input}
          placeholder="Montant Cuisine"
          value={cuisine}
          onChangeText={setCuisine}
          keyboardType="numeric"
        />

        <Text style={styles.subtitle}>Expenses</Text>
        {expenses.map((exp, i) => (
          <View key={i} style={styles.expenseRow}>
            <TextInput
              style={[styles.input, { flex: 1, marginRight: 6 }]}
              placeholder="Label"
              value={exp.label}
              onChangeText={(v) => updateExpense(i, "label", v)}
            />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Amount"
              value={exp.amount}
              onChangeText={(v) => updateExpense(i, "amount", v)}
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
          onPress={() =>
            onSubmit({
              date,
              hotel,
              hebergement,
              bar,
              cuisine,
              expenses,
              reste,
            })
          }
        >
          <Text style={styles.submitText}>Generate Report</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <Text style={styles.closeText}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ==========================
// Home Component
// ==========================
const Home = () => {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState("month");
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());
  const [showMonthModal, setShowMonthModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);

  const [room, setRoom] = useState("");
  const [bar, setBar] = useState("");
  const [restaurant, setRestaurant] = useState("");
  const [expenses, setExpenses] = useState([{ label: "", amount: "" }]);
  const [updateMode, setUpdateMode] = useState(false);
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const days = generateDays(selectedMonthIndex, year);
  const totalExpenses = expenses.reduce(
    (acc, exp) => acc + (parseFloat(exp.amount) || 0),
    0
  );
  const totalAmount =
    (parseFloat(room) || 0) + (parseFloat(bar) || 0) + (parseFloat(restaurant) || 0);
  const netAmount = totalAmount - totalExpenses;

  const prefillData = {
    room: "25000",
    bar: "12000",
    restaurant: "8000",
  };

  const handlePrint = async () => {
    const html = `
      <html>
        <body style="font-family: Arial; padding: 20px;">
          <h2 style="color:#001F60;">Report for ${months[selectedMonthIndex]} ${year}</h2>
          <p><strong>Date:</strong> ${date.toDateString()}</p>
          <p><strong>Room:</strong> FCFA ${room}</p>
          <p><strong>Bar:</strong> FCFA ${bar}</p>
          <p><strong>Restaurant:</strong> FCFA ${restaurant}</p>
          <h3>Expenses:</h3>
          ${expenses
            .map(
              (e) => `<p>${e.label || "Expense"}: -FCFA ${e.amount || 0}</p>`
            )
            .join("")}
          <p><strong>Total Expenses:</strong> FCFA ${totalExpenses.toFixed(2)}</p>
          <p><strong>Net Amount:</strong> FCFA ${netAmount.toFixed(2)}</p>
        </body>
      </html>
    `;
    await Print.printAsync({ html });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerText}>Accountant Aureon</Text>
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
        <View style={[styles.cardLarge, { padding: 14 }]}>
          <Text style={styles.cardLabel}>Net Amount</Text>
          <Text style={styles.cardValue}>FCFA {netAmount.toFixed(2)}</Text>
        </View>

        <View style={styles.row}>
          <View style={[styles.cardSmall, { padding: 10 }]}>
            <Text style={styles.cardLabel}>Total Amount</Text>
            <Text style={styles.cardValue}>FCFA {totalAmount.toFixed(2)}</Text>
          </View>
          <View style={[styles.cardSmall, { padding: 10 }]}>
            <Text style={styles.cardLabel}>Total Expenses</Text>
            <Text style={styles.cardValue}>FCFA {totalExpenses.toFixed(2)}</Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === "month" && styles.activeTabButton]}
            onPress={() => setActiveTab("month")}
          >
            <Text style={[styles.tabText, activeTab === "month" && styles.activeTabText]}>
              Month
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === "custom" && styles.activeTabButton]}
            onPress={() => {
              setActiveTab("custom");
              setShowMonthModal(true);
            }}
          >
            <Text style={[styles.tabText, activeTab === "custom" && styles.activeTabText]}>
              Custom
            </Text>
          </TouchableOpacity>
        </View>

        {/* Inline Date Picker */}
        <TouchableOpacity
          style={[styles.input, { backgroundColor: "#142A75", marginTop: 10 }]}
          onPress={() => setShowDatePicker(true)}
        >
          <Text style={{ color: "#E6C367" }}>
            {date
              ? `${date.getDate()}-${months[date.getMonth()]}-${date.getFullYear()}`
              : "Select Date"}
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

        {/* Scrollable Days */}
        <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
          {days.map((item) => (
            <View key={item.id} style={[styles.dayCard, { padding: 10 }]}>
              <Text style={styles.dateText}>{item.date}</Text>
              <Text style={styles.amountText}>Net Amount: FCFA {netAmount.toFixed(2)}</Text>
              <Text style={styles.amountText}>Total Amount: FCFA {totalAmount.toFixed(2)}</Text>
              <Text style={styles.amountText}>Total Expenses: FCFA {totalExpenses.toFixed(2)}</Text>
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={styles.updateButton}
                  onPress={() => {
                    setUpdateMode(true);
                    setRoom(prefillData.room);
                    setBar(prefillData.bar);
                    setRestaurant(prefillData.restaurant);
                    setShowAddModal(true);
                  }}
                >
                  <Text style={styles.buttonText}>Update</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.printButton}
                  onPress={handlePrint}
                >
                  <Text style={styles.buttonText}>Print</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
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
                onSubmit={(data) => {
                  console.log("Report Data:", data);
                  setShowAddModal(false);
                }}
              />
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
};

export default Home;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#001F60" },
  container: { flex: 1, backgroundColor: "#001F60", paddingHorizontal: 20, paddingBottom: 90 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 5 },
  headerText: { fontSize: 22, color: "#E6C367", fontWeight: "bold" },
  addButton: { backgroundColor: "#E6C367", borderRadius: 20, padding: 5, width: 34, height: 34, alignItems: "center", justifyContent: "center" },
  cardLarge: { backgroundColor: "#E6C367", borderRadius: 12, marginTop: 10 },
  cardSmall: { flex: 1, backgroundColor: "#E6C367", borderRadius: 12, marginHorizontal: 4 },
  cardLabel: { fontSize: 14, color: "#3A2E00" },
  cardValue: { fontSize: 18, color: "#3A2E00", fontWeight: "bold" },
  row: { flexDirection: "row", marginTop: 10 },
  tabContainer: { flexDirection: "row", justifyContent: "center", backgroundColor: "#142A75", borderRadius: 25, marginTop: 16 },
  tabButton: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 25 },
  activeTabButton: { backgroundColor: "#E6C367" },
  tabText: { color: "#E6C367", fontWeight: "600" },
  activeTabText: { color: "#001F60", fontWeight: "bold" },
  scrollArea: { flex: 1 },
  dayCard: { backgroundColor: "#142A75", borderRadius: 10, marginBottom: 10 },
  dateText: { color: "#E6C367", fontWeight: "bold", marginBottom: 4 },
  amountText: { color: "#FFFFFF", marginBottom: 4 },
  buttonRow: { flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 6 },
  printButton: { backgroundColor: "#E6C367", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  updateButton: { backgroundColor: "#FFC107", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  buttonText: { color: "#001F60", fontWeight: "bold" },
  bottomNav: { position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", justifyContent: "space-around", backgroundColor: "#142A75", paddingVertical: 10 },
  navItem: { alignItems: "center" },
  navText: { color: "#E6C367", fontSize: 12, marginTop: 4 },
  modalOverlay: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.5)" },
  addModalContainer: { width: "95%", height: "90%", backgroundColor: "#FFF", borderRadius: 12, overflow: "hidden" },
  formContainer: { flex: 1, backgroundColor: "#FFF", padding: 20 },
  formTitle: { fontSize: 20, fontWeight: "bold", color: "#001F60", marginBottom: 16 },
  input: { borderWidth: 1, borderColor: "#CCC", borderRadius: 8, padding: 10, marginBottom: 10, backgroundColor: "#FFF" },
  subtitle: { fontSize: 16, fontWeight: "bold", color: "#001F60", marginBottom: 8, marginTop: 12 },
  expenseRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  addBtn: { backgroundColor: "#E6C367", paddingVertical: 10, borderRadius: 8, alignItems: "center", marginBottom: 16 },
  addBtnText: { color: "#001F60", fontWeight: "bold" },
  summary: { fontSize: 16, color: "#001F60", marginBottom: 6 },
  submitBtn: { backgroundColor: "#001F60", padding: 12, borderRadius: 8, alignItems: "center", marginTop: 10 },
  submitText: { color: "#FFF", fontWeight: "bold" },
  closeBtn: { marginTop: 10, alignItems: "center" },
  closeText: { color: "#999" },
});
