import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Modal,
  FlatList,
  TouchableWithoutFeedback,
  ActivityIndicator,
  Alert,
  Dimensions,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import * as Print from "expo-print";

export default function TransactionHistory() {
  // ---------- Configuration ----------
  const API_BASE = "http://172.20.10.2:8000/api/reports";

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

  const years = Array.from({ length: 2050 - 2023 + 1 }, (_, i) => 2023 + i);
  const branches = [
    { key: "mbolo", label: "Mbolo Hotel" },
    { key: "dibamba", label: "Hotel la Dibamba" },
  ];

  // ---------- UI State ----------
  const [activeTab, setActiveTab] = useState("Month");
  const [selectedBranch, setSelectedBranch] = useState("mbolo");
  const [branchDropdownOpen, setBranchDropdownOpen] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Backend data state
  const [reportsForMonth, setReportsForMonth] = useState([]);
  const [reportsForYear, setReportsForYear] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const formatFCFA = (num) =>
    `${Number(num || 0).toLocaleString("en-US").replace(/,/g, " ")} FCFA`;

  const daysInMonth = (year, monthIndex) =>
    new Date(year, monthIndex + 1, 0).getDate();

  // ---------- Fetching from backend ----------
  const fetchReportsForMonth = async (year, monthIndex, branch) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const month = monthIndex + 1;
      const resp = await fetch(
        `${API_BASE}/?year=${year}&month=${month}&branch=${encodeURIComponent(
          branch
        )}`
      );
      if (!resp.ok) throw new Error(`Server returned ${resp.status}`);
      const data = await resp.json();
      const branchLabel =
        branches.find((b) => b.key === branch)?.label.toLowerCase() || "";
      const filtered = Array.isArray(data)
        ? data.filter(
            (r) =>
              (r.hotel_name ?? "").toLowerCase() === branchLabel &&
              r.created_at &&
              new Date(r.created_at).getFullYear() === year &&
              new Date(r.created_at).getMonth() === monthIndex
          )
        : [];
      setReportsForMonth(filtered);
    } catch (err) {
      setReportsForMonth([]);
      setErrorMsg("Failed to load monthly data.");
      console.error("fetchReportsForMonth:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchReportsForYear = async (year, branch) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const resp = await fetch(
        `${API_BASE}/?year=${year}&branch=${encodeURIComponent(branch)}`
      );
      if (!resp.ok) throw new Error(`Server returned ${resp.status}`);
      const data = await resp.json();
      const branchLabel =
        branches.find((b) => b.key === branch)?.label.toLowerCase() || "";
      const filtered = Array.isArray(data)
        ? data.filter(
            (r) =>
              (r.hotel_name ?? "").toLowerCase() === branchLabel &&
              r.created_at &&
              new Date(r.created_at).getFullYear() === year
          )
        : [];
      setReportsForYear(filtered);
    } catch (err) {
      setReportsForYear([]);
      setErrorMsg("Failed to load yearly data.");
      console.error("fetchReportsForYear:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const year = selectedDate.getFullYear();
    const monthIndex = selectedDate.getMonth();

    if (activeTab === "Month") {
      fetchReportsForMonth(year, monthIndex, selectedBranch);
    } else if (activeTab === "Year") {
      fetchReportsForYear(year, selectedBranch);
    }
  }, [activeTab, selectedDate, selectedBranch]);

  // ---------- Data transformation ----------
  const dayAggregates = useMemo(() => {
    if (activeTab !== "Month") return [];

    const year = selectedDate.getFullYear();
    const monthIndex = selectedDate.getMonth();
    const totalDays = daysInMonth(year, monthIndex);

    const mapByDay = {};
    reportsForMonth.forEach((r) => {
      const created = r.created_at ? new Date(r.created_at) : null;
      if (!created) return;
      if (created.getFullYear() !== year || created.getMonth() !== monthIndex)
        return;
      const day = created.getDate();
      if (!mapByDay[day]) mapByDay[day] = [];
      mapByDay[day].push(r);
    });

    const aggregates = [];
    for (let d = 1; d <= totalDays; d++) {
      const reports = mapByDay[d] || [];

      if (reports.length === 0) {
        aggregates.push({
          day: d,
          dayLabel: new Date(year, monthIndex, d).toDateString(),
          totalIncome: 0,
          totalExpenses: 0,
          net: 0,
          reports: [],
        });
        continue;
      }

      let totalIncome = 0;
      let totalExpenses = 0;
      let net = 0;
      const flattenedReports = [];

      reports.forEach((r) => {
        const tAmount =
          Number(
            r.total_amount ??
              (Number(r.hebergement || 0) +
                Number(r.bar || 0) +
                Number(r.cuisine || 0))
          ) || 0;

        const tExpenses = Number(r.total_expenses ?? 0) || 0;
        const tNet = Number(r.reste_en_caisse ?? (tAmount - tExpenses)) || 0;

        totalIncome += tAmount;
        totalExpenses += tExpenses;
        net += tNet;

        flattenedReports.push(r);
      });

      aggregates.push({
        day: d,
        dayLabel: new Date(year, monthIndex, d).toDateString(),
        totalIncome,
        totalExpenses,
        net,
        reports: flattenedReports,
      });
    }

    return aggregates;
  }, [reportsForMonth, selectedDate, activeTab]);

  const monthAggregates = useMemo(() => {
    if (activeTab !== "Year") return [];

    const year = selectedDate.getFullYear();

    const mapByMonth = {};
    for (let m = 0; m < 12; m++) {
      mapByMonth[m] = {
        month: m,
        monthLabel: months[m],
        totalIncome: 0,
        totalExpenses: 0,
        net: 0,
        reports: [],
      };
    }

    reportsForYear.forEach((r) => {
      const created = r.created_at ? new Date(r.created_at) : null;
      if (!created) return;
      if (created.getFullYear() !== year) return;

      const month = created.getMonth();
      const tAmount =
        Number(
          r.total_amount ??
            (Number(r.hebergement || 0) +
              Number(r.bar || 0) +
              Number(r.cuisine || 0))
        ) || 0;
      const tExpenses = Number(r.total_expenses ?? 0) || 0;
      const tNet = Number(r.reste_en_caisse ?? (tAmount - tExpenses)) || 0;

      mapByMonth[month].totalIncome += tAmount;
      mapByMonth[month].totalExpenses += tExpenses;
      mapByMonth[month].net += tNet;
      mapByMonth[month].reports.push(r);
    });

    return Object.values(mapByMonth).filter((m) => m.reports.length > 0);
  }, [reportsForYear, selectedDate, activeTab]);

  const yearSummary = useMemo(() => {
    if (activeTab !== "Year")
      return { totalIncome: 0, totalExpenses: 0, netBalance: 0 };

    let totalIncome = 0;
    let totalExpenses = 0;
    let netBalance = 0;

    reportsForYear.forEach((r) => {
      const tAmount =
        Number(
          r.total_amount ??
            (Number(r.hebergement || 0) +
              Number(r.bar || 0) +
              Number(r.cuisine || 0))
        ) || 0;
      const tExpenses = Number(r.total_expenses ?? 0) || 0;
      const tNet = Number(r.reste_en_caisse ?? (tAmount - tExpenses)) || 0;

      totalIncome += tAmount;
      totalExpenses += tExpenses;
      netBalance += tNet;
    });

    return { totalIncome, totalExpenses, netBalance };
  }, [reportsForYear, activeTab]);

  const monthSummary = useMemo(() => {
    if (activeTab !== "Month")
      return { totalIncome: 0, totalExpenses: 0, netBalance: 0 };
    const totalIncome = dayAggregates.reduce((s, d) => s + (d.totalIncome || 0), 0);
    const totalExpenses = dayAggregates.reduce(
      (s, d) => s + (d.totalExpenses || 0),
      0
    );
    const netBalance = dayAggregates.reduce((s, d) => s + (d.net || 0), 0);
    return { totalIncome, totalExpenses, netBalance };
  }, [dayAggregates, activeTab]);

  const { totalIncome, totalExpenses, netBalance } =
    activeTab === "Month" ? monthSummary : yearSummary;

  // ---------- Print handler ----------
  const handlePrint = async () => {
    // ... same print code as in your context ...
  };

  // ---------- Handlers for UI selectors ----------
  const openSelector = (tab) => {
    if (tab === "Branch") {
      setBranchDropdownOpen(!branchDropdownOpen);
      return;
    }
    setActiveTab(tab === "Month" ? "Month" : "Year");
    setModalVisible(true);
  };

  const handleSelectMonth = (monthIndex) => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(monthIndex);
    setSelectedDate(newDate);
    setModalVisible(false);
    setActiveTab("Month");
  };

  const handleSelectYear = (year) => {
    const newDate = new Date(selectedDate);
    newDate.setFullYear(year);
    setSelectedDate(newDate);
    setModalVisible(false);
    setActiveTab("Year");
  };

  const onSelectBranch = (b) => {
    setSelectedBranch(b);
    setBranchDropdownOpen(false);
  };

  // Get screen height to fill space excluding bottom tabs (assumed ~80 height)
  const screenHeight = Dimensions.get("window").height;
  const contentHeight = screenHeight - 140; // header + tabs + margins approx

  // ---------- Render ----------
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
          <TouchableWithoutFeedback onPress={() => openSelector("Branch")}>
            <View style={styles.branchTab}>
              <Text style={styles.branchLabel}>Branch</Text>
              <View style={styles.branchSelectorRow}>
                <Text style={styles.branchSelectedText}>
                  {branches.find((b) => b.key === selectedBranch)?.label || selectedBranch}
                </Text>
                <Ionicons
                  name={branchDropdownOpen ? "chevron-up" : "chevron-down"}
                  size={18}
                  color="#E6C367"
                />
              </View>
            </View>
          </TouchableWithoutFeedback>

          {["Month", "Year"].map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tabButton, activeTab === tab && styles.activeTabButton]}
              onPress={() => openSelector(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {branchDropdownOpen && (
          <View style={styles.branchDropdown}>
            {branches.map((b) => (
              <TouchableOpacity key={b.key} style={styles.branchDropdownItem} onPress={() => onSelectBranch(b.key)}>
                <Text style={[styles.branchDropdownText, selectedBranch === b.key && styles.branchDropdownSelected]}>
                  {b.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Selected Date Display */}
        <Text style={styles.dateTextDisplay}>
          {activeTab === "Month"
            ? `${months[selectedDate.getMonth()]} ${selectedDate.getFullYear()} — ${
                branches.find((b) => b.key === selectedBranch)?.label || selectedBranch
              }`
            : activeTab === "Year"
            ? `${selectedDate.getFullYear()} — ${
                branches.find((b) => b.key === selectedBranch)?.label || selectedBranch
              }`
            : branches.find((b) => b.key === selectedBranch)?.label || selectedBranch}
        </Text>

        {/* Summary Section: total income large card, expenses & net small cards */}
        <View style={styles.summarySection}>
          <View style={styles.totalIncomeCard}>
            <Text style={styles.totalIncomeLabel}>Total Income</Text>
            <Text style={styles.totalIncomeValue}>{formatFCFA(totalIncome)}</Text>
          </View>
          <View style={styles.expensesNetRow}>
            <View style={styles.expensesCard}>
              <Text style={styles.expensesLabel}>Total Expenses</Text>
              <Text style={styles.expensesValue}>{formatFCFA(totalExpenses)}</Text>
            </View>
            <View style={styles.netCard}>
              <Text style={styles.netLabel}>Net Balance</Text>
              <Text style={styles.netValue}>{formatFCFA(netBalance)}</Text>
            </View>
          </View>
        </View>

        {/* Main Content */}
        <View style={[styles.mainContent, { height: contentHeight }]}>
          {loading && (
            <View style={{ paddingVertical: 20 }}>
              <ActivityIndicator size="large" color="#E6C367" />
            </View>
          )}

          {errorMsg && (
            <Text style={{ color: "#FFBABA", textAlign: "center", marginBottom: 10 }}>
              {errorMsg}
            </Text>
          )}

          <ScrollView style={{ flex: 1 }}>
            {activeTab === "Month" ? (
              <>
                {dayAggregates.length === 0 && !loading ? (
                  <Text style={styles.noDataText}>
                    No daily transactions for this month & branch.
                  </Text>
                ) : (
                  dayAggregates.map((dayAgg) => (
                    <View key={dayAgg.day} style={styles.dayAggregateCard}>
                      <View style={styles.rowBetween}>
                        <Text style={styles.dayTitle}>{dayAgg.dayLabel}</Text>
                        <Text style={[styles.amountText, { color: dayAgg.net >= 0 ? "#8AFF8A" : "#FF7373" }]}>
                          {dayAgg.net >= 0 ? "+" : "-"} {formatFCFA(Math.abs(dayAgg.net))}
                        </Text>
                      </View>

                      <View style={styles.dayStatsRow}>
                        <View style={styles.dayStat}>
                          <Text style={styles.statLabel}>Income</Text>
                          <Text style={styles.statValue}>{formatFCFA(dayAgg.totalIncome)}</Text>
                        </View>
                        <View style={styles.dayStat}>
                          <Text style={styles.statLabel}>Expenses</Text>
                          <Text style={styles.statValue}>{formatFCFA(dayAgg.totalExpenses)}</Text>
                        </View>
                        <View style={styles.dayStat}>
                          <Text style={styles.statLabel}>Net</Text>
                          <Text style={styles.statValue}>{formatFCFA(dayAgg.net)}</Text>
                        </View>
                      </View>

                      <View style={{ marginTop: 8 }}>
                        {dayAgg.reports.length === 0 ? (
                          <Text style={{ color: "#FFFFFF", fontStyle: "italic" }}>
                            No report for this day.
                          </Text>
                        ) : (
                          dayAgg.reports.map((r, idx) => (
                            <View key={r.id ?? idx} style={{ marginTop: idx === 0 ? 0 : 8 }}>
                              <View style={styles.transactionLine}>
                                <Text style={styles.transactionLabel}>{r.hotel_name ?? `Report ${r.id}`}</Text>
                                <Text style={[styles.transactionAmount, { color: "#E6C367" }]}>
                                  {formatFCFA(
                                    r.total_amount ??
                                      (Number(r.hebergement || 0) +
                                        Number(r.bar || 0) +
                                        Number(r.cuisine || 0))
                                  )}
                                </Text>
                              </View>

                              {Array.isArray(r.expenses) &&
                                r.expenses.length > 0 &&
                                r.expenses.map((exp) => (
                                  <View key={exp.id ?? exp.label} style={styles.transactionLine}>
                                    <Text style={[styles.transactionLabel, { color: "#E6C367" }]}>{exp.label}</Text>
                                    <Text style={[styles.transactionAmount, { color: "#FF7373" }]}>
                                      {formatFCFA(exp.amount)}
                                    </Text>
                                  </View>
                                ))}
                            </View>
                          ))
                        )}
                      </View>
                    </View>
                  ))
                )}
              </>
            ) : (
              <>
                {monthAggregates.length === 0 && !loading ? (
                  <Text style={styles.noDataText}>No transactions found for this year & branch.</Text>
                ) : (
                  monthAggregates.map((month) => (
                    <View key={month.month} style={styles.monthAggregateCard}>
                      <View style={styles.rowBetween}>
                        <Text style={styles.monthTitle}>{month.monthLabel}</Text>
                        <Text style={[styles.amountText, { color: month.net >= 0 ? "#8AFF8A" : "#FF7373" }]}>
                          {month.net >= 0 ? "+" : "-"} {formatFCFA(Math.abs(month.net))}
                        </Text>
                      </View>

                      <View style={styles.monthStatsRow}>
                        <View style={styles.monthStat}>
                          <Text style={styles.statLabel}>Income</Text>
                          <Text style={styles.statValue}>{formatFCFA(month.totalIncome)}</Text>
                        </View>
                        <View style={styles.monthStat}>
                          <Text style={styles.statLabel}>Expenses</Text>
                          <Text style={styles.statValue}>{formatFCFA(month.totalExpenses)}</Text>
                        </View>
                        <View style={styles.monthStat}>
                          <Text style={styles.statLabel}>Net</Text>
                          <Text style={styles.statValue}>{formatFCFA(month.net)}</Text>
                        </View>
                      </View>
                    </View>
                  ))
                )}
              </>
            )}
          </ScrollView>
        </View>

        {/* Modal Selector for Month / Year */}
        <Modal visible={modalVisible} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>
                {activeTab === "Month" ? "Select a Month" : "Select a Year"}
              </Text>

              {activeTab === "Month" && (
                <FlatList
                  data={months}
                  keyExtractor={(item) => item}
                  renderItem={({ item, index }) => (
                    <TouchableOpacity style={styles.modalItem} onPress={() => handleSelectMonth(index)}>
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
                    <TouchableOpacity style={styles.modalItem} onPress={() => handleSelectYear(item)}>
                      <Text style={styles.modalItemText}>{item}</Text>
                    </TouchableOpacity>
                  )}
                />
              )}

              <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}>
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
  container: {
    flex: 1,
    backgroundColor: "#001F60",
    paddingHorizontal: 16,
    paddingBottom: 0,
  
  },
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
    alignItems: "center",
    padding: 6,
  },
  branchTab: {
    flex: 1.2,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#0F2358",
    marginRight: 8,
  },
  branchLabel: { color: "#E6C367", fontSize: 12, fontWeight: "600" },
  branchSelectorRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
  },
  branchSelectedText: { color: "#E6C367", fontWeight: "700" },

  tabButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 20,
  },
  activeTabButton: { backgroundColor: "#E6C367", borderRadius: 25 },
  tabText: { color: "#E6C367", fontWeight: "600" },
  activeTabText: { color: "#001F60", fontWeight: "bold" },

  branchDropdown: {
    backgroundColor: "#142A75",
    borderRadius: 10,
    paddingVertical: 6,
    marginBottom: 8,
  },
  branchDropdownItem: { paddingVertical: 10, paddingHorizontal: 12 },
  branchDropdownText: { color: "#E6C367" },
  branchDropdownSelected: { fontWeight: "700", color: "#FFF" },

  dateTextDisplay: {
    color: "#E6C367",
    textAlign: "center",
    marginBottom: 8,
    fontWeight: "600",
  },

  // Summary Section
  summarySection: {
    marginTop: 10,
    marginBottom: 10,
  },
  totalIncomeCard: {
   backgroundColor: "#FFD700",
    borderRadius: 20,
    marginTop: 6,
    paddingVertical: 12,
    paddingHorizontal: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 7,
  },
  totalIncomeLabel: {
   fontSize: 16,
    color: "#3A2E00",
    fontWeight: "600",
    marginBottom: 4,
  },
  totalIncomeValue: {
    fontSize: 20,
    color: "#3A2E00",
    fontWeight: "bold",
    textShadowColor: "rgba(0,0,0,0.2)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },

  expensesNetRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  expensesCard: {
    flex: 1,
    backgroundColor: "#FFEA7F",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginRight: 8,
    marginTop: 10,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },
  expensesLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#3A2E00",
    marginBottom: 4,
  },
  expensesValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#3A2E00",
  },
  netCard: {
    flex: 1,
    backgroundColor: "#FFEA7F",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginRight: 8,
    marginTop: 10,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },
  netLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#3A2E00",
    marginBottom: 4,
  },
  netValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#3A2E00",
  },

  mainContent: {
    flex: 1,
  },

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

  dayAggregateCard: {
    backgroundColor: "#142A75",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#E6C367",
  },
  dayTitle: { color: "#E6C367", fontWeight: "700" },
  dayStatsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  dayStat: { flex: 1, alignItems: "center" },
  statLabel: { color: "#E6C367", fontSize: 11 },
  statValue: { color: "#FFFFFF", fontWeight: "700", marginTop: 4 },

  monthAggregateCard: {
    backgroundColor: "#142A75",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#E6C367",
  },
  monthTitle: { color: "#E6C367", fontWeight: "700", fontSize: 16 },
  monthStatsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  monthStat: { flex: 1, alignItems: "center" },

  transactionLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
    paddingVertical: 4,
    borderBottomColor: "rgba(255,255,255,0.03)",
    borderBottomWidth: 1,
  },
  transactionLabel: { color: "#FFF", fontSize: 13 },
  transactionAmount: { fontWeight: "700" },

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
    paddingVertical: 12,
    borderBottomColor: "#eee",
    borderBottomWidth: 1,
  },
  modalItemText: { color: "#001F60", textAlign: "center", fontWeight: "600" },
  closeButton: {
    marginTop: 10,
    alignSelf: "center",
    backgroundColor: "#E6C367",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
});