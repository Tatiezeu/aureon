import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Modal,
  FlatList,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import * as Print from "expo-print";

export default function TransactionHistory() {
  // ✅ Extended static data (more days, months, and years — includes income + expenses)
  const sampleData = [
    // --- Daily transactions ---
    { period: "Day", label: "Room Booking", type: "income", amount: 50000, date: "2025-10-01" },
    { period: "Day", label: "Restaurant Sales", type: "income", amount: 30000, date: "2025-10-01" },
    { period: "Day", label: "Laundry Service", type: "income", amount: 15000, date: "2025-10-01" },
    { period: "Day", label: "Electricity Bill", type: "expense", amount: 10000, date: "2025-10-01" },
    { period: "Day", label: "Water Bill", type: "expense", amount: 8000, date: "2025-10-01" },

    { period: "Day", label: "Room Booking", type: "income", amount: 65000, date: "2025-10-02" },
    { period: "Day", label: "Restaurant Sales", type: "income", amount: 40000, date: "2025-10-02" },
    { period: "Day", label: "Maintenance Supplies", type: "expense", amount: 12000, date: "2025-10-02" },

    { period: "Day", label: "Room Booking", type: "income", amount: 72000, date: "2025-10-03" },
    { period: "Day", label: "Restaurant Sales", type: "income", amount: 50000, date: "2025-10-03" },
    { period: "Day", label: "Staff Meals", type: "expense", amount: 15000, date: "2025-10-03" },

    // --- Monthly transactions ---
    { period: "Month", label: "October Revenue", type: "income", amount: 1250000, date: "2025-10-01" },
    { period: "Month", label: "October Expenses", type: "expense", amount: 450000, date: "2025-10-02" },
    { period: "Month", label: "September Revenue", type: "income", amount: 1180000, date: "2025-09-01" },
    { period: "Month", label: "September Expenses", type: "expense", amount: 380000, date: "2025-09-02" },
    { period: "Month", label: "August Revenue", type: "income", amount: 1320000, date: "2025-08-01" },
    { period: "Month", label: "August Expenses", type: "expense", amount: 500000, date: "2025-08-02" },

    // --- Yearly transactions ---
    { period: "Year", label: "2025 Total Income", type: "income", amount: 12500000, date: "2025-01-01" },
    { period: "Year", label: "2025 Total Expenses", type: "expense", amount: 6000000, date: "2025-01-01" },
    { period: "Year", label: "2026 Total Income", type: "income", amount: 13800000, date: "2026-01-01" },
    { period: "Year", label: "2026 Total Expenses", type: "expense", amount: 7200000, date: "2026-01-01" },
  ];

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const years = Array.from({ length: 11 }, (_, i) => 2025 + i);

  const [activeTab, setActiveTab] = useState("Day");
  const [filteredData, setFilteredData] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    const filtered = sampleData.filter((item) => item.period === activeTab);
    setFilteredData(filtered);
  }, [activeTab, selectedDate]);

  const totalIncome = filteredData
    .filter((i) => i.type === "income")
    .reduce((a, b) => a + b.amount, 0);
  const totalExpenses = filteredData
    .filter((i) => i.type === "expense")
    .reduce((a, b) => a + b.amount, 0);
  const netBalance = totalIncome - totalExpenses;

  const formatFCFA = (num) =>
    `${num.toLocaleString("en-US").replace(/,/g, " ")} FCFA`;

  const handlePrint = async () => {
    const expenseLines = filteredData
      .filter((i) => i.type === "expense")
      .map((i) => `- ${formatFCFA(i.amount)} ${i.label}`)
      .join("<br/>");

    const html = `
      <html>
        <body style="font-family: Arial; padding: 20px;">
          <h2 style="text-align:center;">${activeTab} Report</h2>
          <h3>Total Income = ${formatFCFA(totalIncome)}</h3>
          <div style="margin:10px 0; line-height:1.6;">
            ${expenseLines || "No expenses recorded"}
          </div>
          <hr/>
          <h3>Net Balance = ${formatFCFA(netBalance)}</h3>
        </body>
      </html>
    `;
    await Print.printAsync({ html });
  };

  const daysInMonth = (year, monthIndex) =>
    new Date(year, monthIndex + 1, 0).getDate();

  const openSelector = (tab) => {
    setActiveTab(tab);
    setModalVisible(true);
  };

  const handleSelectDay = (day) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(day);
    setSelectedDate(newDate);
    setModalVisible(false);
  };
  const handleSelectMonth = (monthIndex) => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(monthIndex);
    setSelectedDate(newDate);
    setModalVisible(false);
  };
  const handleSelectYear = (year) => {
    const newDate = new Date(selectedDate);
    newDate.setFullYear(year);
    setSelectedDate(newDate);
    setModalVisible(false);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerText}>Transaction History</Text>
          <TouchableOpacity style={styles.printButton} onPress={handlePrint}>
            <Ionicons name="print-outline" size={20} color="#001F60" />
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          {["Day", "Month", "Year"].map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[
                styles.tabButton,
                activeTab === tab && styles.activeTabButton,
              ]}
              onPress={() => openSelector(tab)}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab && styles.activeTabText,
                ]}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Selected Date Display */}
        <Text style={styles.dateTextDisplay}>
          {activeTab === "Month"
            ? `${months[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`
            : activeTab === "Year"
            ? selectedDate.getFullYear()
            : selectedDate.toDateString()}
        </Text>

        {/* Summary Section */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Income</Text>
            <Text style={styles.summaryValue}>{formatFCFA(totalIncome)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Expenses</Text>
            <Text style={styles.summaryValue}>{formatFCFA(totalExpenses)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Net Balance</Text>
            <Text style={styles.summaryValue}>{formatFCFA(netBalance)}</Text>
          </View>
        </View>

        {/* Transaction List */}
        <ScrollView style={{ marginTop: 15 }}>
          {filteredData.map((item, index) => (
            <View key={index} style={styles.transactionCard}>
              <View style={styles.rowBetween}>
                <Text style={styles.labelText}>{item.label}</Text>
                <Text
                  style={[
                    styles.amountText,
                    { color: item.type === "income" ? "#8AFF8A" : "#FF7373" },
                  ]}
                >
                  {item.type === "income" ? "+" : "-"} {formatFCFA(item.amount)}
                </Text>
              </View>
              <Text style={styles.dateText}>
                {new Date(item.date).toDateString()}
              </Text>
            </View>
          ))}
          {filteredData.length === 0 && (
            <Text style={styles.noDataText}>No transactions found.</Text>
          )}
        </ScrollView>

        {/* Modal Selector */}
        <Modal visible={modalVisible} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>
                {activeTab === "Day"
                  ? "Select a Day"
                  : activeTab === "Month"
                  ? "Select a Month"
                  : "Select a Year"}
              </Text>

              {activeTab === "Day" && (
                <FlatList
                  data={Array.from(
                    { length: daysInMonth(selectedDate.getFullYear(), selectedDate.getMonth()) },
                    (_, i) => i + 1
                  )}
                  numColumns={5}
                  keyExtractor={(item) => item.toString()}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.dayBox}
                      onPress={() => handleSelectDay(item)}
                    >
                      <Text style={styles.modalItemText}>{item}</Text>
                    </TouchableOpacity>
                  )}
                />
              )}

              {activeTab === "Month" && (
                <FlatList
                  data={months}
                  keyExtractor={(item) => item}
                  renderItem={({ item, index }) => (
                    <TouchableOpacity
                      style={styles.modalItem}
                      onPress={() => handleSelectMonth(index)}
                    >
                      <Text style={styles.modalItemText}>{item}</Text>
                    </TouchableOpacity>
                  )}
                />
              )}

              {activeTab === "Year" && (
                <FlatList
                  data={years}
                  keyExtractor={(item) => item.toString()}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.modalItem}
                      onPress={() => handleSelectYear(item)}
                    >
                      <Text style={styles.modalItemText}>{item}</Text>
                    </TouchableOpacity>
                  )}
                />
              )}

              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={{ color: "#001F60", fontWeight: "bold" }}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

/* --- STYLES --- */
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#001F60" },
  container: { flex: 1, paddingHorizontal: 20, paddingBottom: 80 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 10,
  },
  headerText: { color: "#E6C367", fontSize: 22, fontWeight: "bold" },
  printButton: { backgroundColor: "#E6C367", padding: 6, borderRadius: 20 },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#142A75",
    borderRadius: 25,
    marginVertical: 15,
  },
  tabButton: { flex: 1, alignItems: "center", paddingVertical: 8 },
  activeTabButton: { backgroundColor: "#E6C367", borderRadius: 25 },
  tabText: { color: "#E6C367", fontWeight: "600" },
  activeTabText: { color: "#001F60", fontWeight: "bold" },
  dateTextDisplay: {
    color: "#E6C367",
    textAlign: "center",
    marginBottom: 8,
    fontWeight: "600",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "#142A75",
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 3,
    alignItems: "center",
  },
  summaryLabel: { color: "#E6C367", fontSize: 12 },
  summaryValue: { color: "#FFFFFF", fontWeight: "bold", marginTop: 4 },
  transactionCard: {
    backgroundColor: "#142A75",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  labelText: { color: "#FFFFFF", fontWeight: "600", fontSize: 15 },
  amountText: { fontWeight: "bold", fontSize: 15 },
  dateText: { color: "#E6C367", fontSize: 12, marginTop: 3 },
  noDataText: {
    color: "#FFFFFF",
    textAlign: "center",
    marginTop: 20,
    fontStyle: "italic",
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  modalContainer: {
    backgroundColor: "#FFF",
    borderRadius: 15,
    padding: 15,
    width: "90%",
    maxHeight: "75%",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    color: "#001F60",
    marginBottom: 10,
  },
  modalItem: {
    paddingVertical: 10,
    borderBottomColor: "#ddd",
    borderBottomWidth: 1,
  },
  modalItemText: { color: "#001F60", textAlign: "center" },
  dayBox: {
    width: 50,
    margin: 5,
    padding: 8,
    backgroundColor: "#E6C367",
    borderRadius: 8,
    alignItems: "center",
  },
  closeButton: {
    marginTop: 10,
    alignSelf: "center",
    backgroundColor: "#E6C367",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
});
