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
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import * as Print from "expo-print"; // ✅ Added from second code

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

const Home = () => {
  const [activeTab, setActiveTab] = useState("month");
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());
  const [showMonthModal, setShowMonthModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [updateMode, setUpdateMode] = useState(false);

  const [room, setRoom] = useState("");
  const [bar, setBar] = useState("");
  const [restaurant, setRestaurant] = useState("");
  const [expenses, setExpenses] = useState([{ label: "", amount: "" }]);

  const days = generateDays(selectedMonthIndex, year);

  const handleAddExpense = () => {
    setExpenses([...expenses, { label: "", amount: "" }]);
  };

  const handleExpenseChange = (index, key, value) => {
    const newExpenses = [...expenses];
    newExpenses[index][key] = value;
    setExpenses(newExpenses);
  };

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

  // ✅ Added handlePrint using expo-print
  const handlePrint = async () => {
    const html = `
      <html>
        <body style="font-family: Arial; padding: 20px;">
          <h2 style="color:#001F60;">Report for ${months[selectedMonthIndex]} ${year}</h2>
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
        <View style={styles.cardLarge}>
          <Text style={styles.cardLabel}>Net Amount</Text>
          <Text style={styles.cardValue}>FCFA {netAmount.toFixed(2)}</Text>
        </View>

        <View style={styles.row}>
          <View style={styles.cardSmall}>
            <Text style={styles.cardLabel}>Total Amount</Text>
            <Text style={styles.cardValue}>FCFA {totalAmount.toFixed(2)}</Text>
          </View>
          <View style={styles.cardSmall}>
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

        {/* Year Navigation */}
        {activeTab === "month" && (
          <View style={styles.yearNav}>
            <TouchableOpacity onPress={() => setYear(year - 1)}>
              <Ionicons name="chevron-back" size={22} color="#E6C367" />
            </TouchableOpacity>
            <Text style={styles.yearText}>
              {months[selectedMonthIndex]} {year}
            </Text>
            <TouchableOpacity onPress={() => setYear(year + 1)}>
              <Ionicons name="chevron-forward" size={22} color="#E6C367" />
            </TouchableOpacity>
          </View>
        )}

        {/* Scrollable Days */}
        <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
          {days.map((item) => (
            <View key={item.id} style={styles.dayCard}>
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
                  onPress={handlePrint} // ✅ replaced with new print handler
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
          <TouchableOpacity style={styles.navItem}>
            <Ionicons name="stats-chart-outline" size={22} color="#E6C367" />
            <Text style={styles.navText}>Analytics</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem}>
            <Ionicons name="document-text-outline" size={22} color="#E6C367" />
            <Text style={styles.navText}>History</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem}>
            <Ionicons name="settings-outline" size={22} color="#E6C367" />
            <Text style={styles.navText}>Settings</Text>
          </TouchableOpacity>
        </View>

        {/* Add / Update Modal */}
        <Modal animationType="slide" transparent visible={showAddModal}>
          <View style={styles.modalOverlay}>
            <View style={styles.addModalContainer}>
              <Text style={styles.addModalTitle}>
                {updateMode ? "Update Report" : "Generate Report"}
              </Text>

              <Text style={styles.inputLabel}>Room Amount</Text>
              <TextInput
                style={styles.input}
                placeholder="Room Amount"
                value={room}
                onChangeText={setRoom}
                keyboardType="numeric"
              />

              <Text style={styles.inputLabel}>Bar Amount</Text>
              <TextInput
                style={styles.input}
                placeholder="Bar Amount"
                value={bar}
                onChangeText={setBar}
                keyboardType="numeric"
              />

              <Text style={styles.inputLabel}>Restaurant Amount</Text>
              <TextInput
                style={styles.input}
                placeholder="Restaurant Amount"
                value={restaurant}
                onChangeText={setRestaurant}
                keyboardType="numeric"
              />

              <Text style={styles.sectionTitle}>Expenses</Text>
              {expenses.map((exp, index) => (
                <View key={index} style={styles.expenseRow}>
                  <TextInput
                    placeholder="Label"
                    value={exp.label}
                    onChangeText={(v) => handleExpenseChange(index, "label", v)}
                    style={[styles.input, { flex: 1, marginRight: 5 }]}
                  />
                  <TextInput
                    placeholder="Amount"
                    value={exp.amount}
                    onChangeText={(v) => handleExpenseChange(index, "amount", v)}
                    keyboardType="numeric"
                    style={[styles.input, { flex: 1 }]}
                  />
                </View>
              ))}

              <TouchableOpacity style={styles.addExpenseButton} onPress={handleAddExpense}>
                <Text style={styles.addExpenseText}>+ Add Expense</Text>
              </TouchableOpacity>

              <Text style={styles.summaryText}>Total Amount: FCFA {totalAmount.toFixed(2)}</Text>
              <Text style={styles.summaryText}>Total Expenses: FCFA {totalExpenses.toFixed(2)}</Text>
              <Text style={styles.summaryText}>Net Amount: FCFA {netAmount.toFixed(2)}</Text>

              <TouchableOpacity
                style={styles.previewButton}
                onPress={() => {
                  setShowAddModal(false);
                  setShowPrintModal(true);
                }}
              >
                <Text style={styles.previewText}>Preview & Print</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Print Preview */}
        <Modal animationType="fade" transparent visible={showPrintModal}>
          <View style={styles.modalOverlay}>
            <View style={styles.printContainer}>
              <Text style={styles.printTitle}>Report Preview</Text>
              <Text style={styles.printText}>Room: FCFA {room}</Text>
              <Text style={styles.printText}>Bar: FCFA {bar}</Text>
              <Text style={styles.printText}>Restaurant: FCFA {restaurant}</Text>
              {expenses.map((exp, i) => (
                <Text key={i} style={styles.printText}>
                  {exp.label || "Expense"}: -FCFA {exp.amount || 0}
                </Text>
              ))}
              <Text style={styles.printText}>Total Expenses: FCFA {totalExpenses.toFixed(2)}</Text>
              <Text style={styles.printText}>Net Amount: FCFA {netAmount.toFixed(2)}</Text>

              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowPrintModal(false)}
              >
                <Text style={styles.modalCloseText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* ✅ Custom Month Picker Modal (added) */}
        <Modal animationType="fade" transparent visible={showMonthModal}>
          <View style={styles.modalOverlay}>
            <View style={styles.monthModal}>
              <Text style={styles.addModalTitle}>Select Month</Text>
              <FlatList
                data={months}
                keyExtractor={(item) => item}
                renderItem={({ item, index }) => (
                  <TouchableOpacity
                    style={styles.monthItem}
                    onPress={() => {
                      setSelectedMonthIndex(index);
                      setShowMonthModal(false);
                    }}
                  >
                    <Text style={styles.monthText}>{item}</Text>
                  </TouchableOpacity>
                )}
              />
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowMonthModal(false)}
              >
                <Text style={styles.modalCloseText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
};

export default Home;

/* =================== STYLES =================== */
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#001F60" },
  container: { flex: 1, backgroundColor: "#001F60", paddingHorizontal: 20, paddingBottom: 90 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 5 },
  headerText: { fontSize: 22, color: "#E6C367", fontWeight: "bold" },
  addButton: { backgroundColor: "#E6C367", borderRadius: 20, padding: 5, width: 34, height: 34, alignItems: "center", justifyContent: "center" },
  cardLarge: { backgroundColor: "#E6C367", borderRadius: 12, padding: 18, marginTop: 10 },
  cardSmall: { flex: 1, backgroundColor: "#E6C367", borderRadius: 12, padding: 12, marginHorizontal: 4 },
  cardLabel: { fontSize: 14, color: "#3A2E00" },
  cardValue: { fontSize: 18, color: "#3A2E00", fontWeight: "bold" },
  row: { flexDirection: "row", marginTop: 10 },
  tabContainer: { flexDirection: "row", justifyContent: "center", backgroundColor: "#142A75", borderRadius: 25, marginTop: 16 },
  tabButton: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 25 },
  activeTabButton: { backgroundColor: "#E6C367" },
  tabText: { color: "#E6C367", fontWeight: "600" },
  activeTabText: { color: "#001F60", fontWeight: "bold" },
  yearNav: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginVertical: 8 },
  yearText: { color: "#E6C367", fontWeight: "bold", fontSize: 16, marginHorizontal: 8 },
  scrollArea: { flex: 1 },
  dayCard: { backgroundColor: "#142A75", borderRadius: 10, padding: 12, marginBottom: 10 },
  dateText: { color: "#E6C367", fontWeight: "bold", marginBottom: 4 },
  amountText: { color: "#FFFFFF", marginBottom: 4 },
  buttonRow: { flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 6 },
  printButton: { backgroundColor: "#E6C367", borderRadius: 8, paddingVertical: 6, paddingHorizontal: 12 },
  updateButton: { backgroundColor: "#E6C367", borderRadius: 8, paddingVertical: 6, paddingHorizontal: 12 },
  buttonText: { color: "#001F60", fontWeight: "bold" },
  bottomNav: {
    flexDirection: "row", justifyContent: "space-evenly", alignItems: "center", backgroundColor: "#142A75",
    paddingVertical: 12, position: "absolute", bottom: 0, width: "100%", borderTopWidth: 0.6, borderTopColor: "#E6C367",
  },
  navItem: { alignItems: "center", justifyContent: "center", width: "25%" },
  navText: { color: "#E6C367", fontSize: 12, marginTop: 2, fontWeight: "600" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center" },
  addModalContainer: { backgroundColor: "#fff", borderRadius: 15, padding: 20, width: "90%" },
  addModalTitle: { fontSize: 22, fontWeight: "bold", color: "#001F60", textAlign: "center", marginBottom: 10 },
  inputLabel: { color: "#001F60", fontWeight: "600", marginBottom: 3 },
  input: { borderWidth: 1, borderColor: "#E6C367", borderRadius: 8, padding: 10, marginBottom: 8, color: "#001F60" },
  expenseRow: { flexDirection: "row", justifyContent: "space-between" },
  sectionTitle: { color: "#001F60", fontWeight: "700", fontSize: 16, marginVertical: 6 },
  addExpenseButton: { backgroundColor: "#E6C367", borderRadius: 8, padding: 10, alignItems: "center", marginBottom: 8 },
  addExpenseText: { color: "#001F60", fontWeight: "bold" },
  summaryText: { fontSize: 14, color: "#001F60", marginTop: 4, textAlign: "center" },
  previewButton: { backgroundColor: "#001F60", borderRadius: 8, padding: 12, marginTop: 10 },
  previewText: { color: "#E6C367", fontWeight: "bold", textAlign: "center" },
  printContainer: { backgroundColor: "#fff", borderRadius: 12, padding: 20, width: "85%" },
  printTitle: { color: "#001F60", fontWeight: "bold", fontSize: 18, marginBottom: 10 },
  printText: { color: "#001F60", marginBottom: 4 },
  modalCloseButton: { marginTop: 10, alignItems: "center" },
  modalCloseText: { color: "#E6C367", fontWeight: "bold" },
  monthModal: { backgroundColor: "#fff", borderRadius: 15, padding: 20, width: "85%", maxHeight: "60%" },
  monthItem: { paddingVertical: 10 },
  monthText: { color: "#001F60", fontSize: 16, textAlign: "center" },
});
