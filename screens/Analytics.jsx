import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  SafeAreaView,
  TouchableOpacity,
  Modal,
  FlatList,
  TouchableWithoutFeedback,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PieChart } from "react-native-chart-kit";
import * as Print from "expo-print";

const screenWidth = Dimensions.get("window").width;

const hotels = [
  { key: "mbolo", label: "Mbolo Hotel", hotel_name_param: "mbolo hotel" },
  { key: "dibamba", label: "Hotel la Dibamba", hotel_name_param: "hotel la dibamba" },
];

const months = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const years = Array.from({ length: 2050 - 2023 + 1 }, (_, i) => 2023 + i);
const tabs = ["Weekly", "Monthly", "Yearly"];

const API_BASE = "http://192.168.0.122:8000/api/reports";

export default function Analytics() {
  const [selectedPeriod, setSelectedPeriod] = useState("Monthly");
  const [selectedHotel, setSelectedHotel] = useState(hotels[0].key);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const [periodPickerVisible, setPeriodPickerVisible] = useState(false);
  const [weekModalVisible, setWeekModalVisible] = useState(false);
  const [monthModalVisible, setMonthModalVisible] = useState(false);
  const [yearModalVisible, setYearModalVisible] = useState(false);
  const [hotelModalVisible, setHotelModalVisible] = useState(false);

  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const formatNumber = (n) => {
    const num = Number(n || 0);
    return num.toLocaleString("en-US").replace(/,/g, " ");
  };

  const pad2 = (n) => n.toString().padStart(2, "0");
  const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
  const hotelParam = (key) => hotels.find((h) => h.key === key)?.hotel_name_param ?? key;
  const dateYMD = (year, monthIndex, day) => `${year}-${pad2(monthIndex + 1)}-${pad2(day)}`;

  // Calculate weeks array dynamically based on days in month
  const calculateWeeks = (year, monthIndex) => {
    const totalDays = daysInMonth(year, monthIndex);
    const weeksCount = Math.ceil(totalDays / 7);
    const arr = [];
    for (let i = 1; i <= weeksCount; i++) {
      arr.push(`Week ${i}`);
    }
    return arr;
  };

  const fetchJSON = async (url, opts = {}) => {
    try {
      const r = await fetch(url, opts);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.json();
    } catch {
      return null;
    }
  };

  const filterByHotelAndDate = (data, hotelLabel, year, monthIndex = null, dateStr = null) => {
    if (!Array.isArray(data)) return [];
    const hlower = hotelLabel.toLowerCase();
    return data.filter((r) => {
      if (!r) return false;
      const hname = (r.hotel_name ?? r.hotel ?? "").toString().toLowerCase();
      if (hname !== hlower) return false;
      if (!r.created_at) return false;
      const created = new Date(r.created_at);
      if (created.getFullYear() !== year) return false;
      if (monthIndex !== null && created.getMonth() !== monthIndex) return false;
      if (dateStr) {
        const createdDateStr = created.toISOString().slice(0, 10);
        if (createdDateStr !== dateStr) return false;
      }
      return true;
    });
  };

  const normalizeReport = (r) => {
    const montant_hebergement = Number(r.montant_hebergement ?? r.hebergement ?? 0) || 0;
    const montant_bar = Number(r.montant_bar ?? r.bar ?? 0) || 0;
    const montant_cuisine = Number(r.montant_cuisine ?? r.cuisine ?? 0) || 0;

    const total_amount = Number(r.total_amount ?? (montant_hebergement + montant_bar + montant_cuisine)) || 0;
    const total_expenses = Number(r.total_expenses ?? 0) || 0;
    const reste_en_caisse = Number(r.reste_en_caisse ?? (total_amount - total_expenses)) || 0;

    const expenses = Array.isArray(r.expenses)
      ? r.expenses.map((e) => ({ label: e.label ?? e.name ?? "Other", amount: Number(e.amount ?? 0) || 0 }))
      : [];

    return {
      montant_hebergement,
      montant_bar,
      montant_cuisine,
      total_amount,
      total_expenses,
      reste_en_caisse,
      expenses,
      created_at: r.created_at,
      hotel_name: r.hotel_name,
      id: r.id,
    };
  };

  const aggregateReports = (data, hotelLabel, year, monthIndex = null, dateStr = null) => {
    const filtered = filterByHotelAndDate(data, hotelLabel, year, monthIndex, dateStr);

    let total_amount = 0;
    let total_expenses = 0;
    let reste_en_caisse = 0;
    let rev_hebergement = 0;
    let rev_bar = 0;
    let rev_cuisine = 0;
    const expenseMap = {};

    filtered.forEach((r) => {
      const n = normalizeReport(r);
      total_amount += n.total_amount;
      total_expenses += n.total_expenses;
      reste_en_caisse += n.reste_en_caisse;
      rev_hebergement += n.montant_hebergement;
      rev_bar += n.montant_bar;
      rev_cuisine += n.montant_cuisine;
      n.expenses.forEach((e) => {
        expenseMap[e.label] = (expenseMap[e.label] || 0) + e.amount;
      });
    });

    const expenses = Object.keys(expenseMap).map((k) => ({ label: k, amount: expenseMap[k] }));

    return {
      total_amount,
      total_expenses,
      reste_en_caisse,
      expenses,
      revenues: {
        hebergement: rev_hebergement,
        bar: rev_bar,
        cuisine: rev_cuisine,
      },
      count: filtered.length,
    };
  };

  const normalizeAggregatedResponse = (obj, hotelLabel, year, monthIndex = null) => {
    if (Array.isArray(obj)) return aggregateReports(obj, hotelLabel, year, monthIndex);

    const total_amount = Number(obj.total_amount ?? obj.total ?? 0) || 0;
    const total_expenses = Number(obj.total_expenses ?? obj.expenses_total ?? 0) || 0;
    const reste_en_caisse = Number(obj.reste_en_caisse ?? obj.net ?? (total_amount - total_expenses)) || 0;

    const rev_hebergement = Number(obj.montant_hebergement ?? obj.hebergement ?? 0) || 0;
    const rev_bar = Number(obj.montant_bar ?? obj.bar ?? 0) || 0;
    const rev_cuisine = Number(obj.montant_cuisine ?? obj.cuisine ?? 0) || 0;

    const expenses = Array.isArray(obj.expenses)
      ? obj.expenses.map(e => ({ label: e.label ?? e.name ?? "Other", amount: Number(e.amount ?? 0) || 0 }))
      : [];

    return {
      total_amount,
      total_expenses,
      reste_en_caisse,
      expenses,
      revenues: { hebergement: rev_hebergement, bar: rev_bar, cuisine: rev_cuisine },
      count: obj.count ?? 1,
    };
  };

  const isDataValid = (data) => {
    if (!data) return false;
    if (typeof data !== "object") return false;
    if ("total_amount" in data && Number(data.total_amount) > 0) return true;
    if ("count" in data && Number(data.count) > 0) return true;
    if (Array.isArray(data) && data.length > 0) return true;
    return false;
  };

  // New: define week ranges strictly (1-7, 8-14, 15-21, 22-end)
  const getWeekDateRange = (year, monthIndex, weekNumber) => {
    const totalDays = daysInMonth(year, monthIndex);
    switch (weekNumber) {
      case 1: return { start: 1, end: 7 };
      case 2: return { start: 8, end: 14 };
      case 3: return { start: 15, end: 21 };
      case 4: return { start: 22, end: totalDays };
      default: return null;
    }
  };

  // Fetch all monthly data and filter by this strict week range
  const fetchWeeklyDataStrictWeekRange = async (year, monthIndex, weekNumber, hotelLabel) => {
    const resp = await fetchJSON(`${API_BASE}/?year=${year}&month=${monthIndex + 1}&hotel_name=${encodeURIComponent(hotelLabel)}`);
    if (!resp) return null;

    const weekRange = getWeekDateRange(year, monthIndex, weekNumber);
    if (!weekRange) return null;

    const allReports = Array.isArray(resp) ? resp : [resp];

    const filteredReports = allReports.filter((r) => {
      if (!r || !r.created_at) return false;
      const created = new Date(r.created_at);
      if (
        created.getFullYear() !== year ||
        created.getMonth() !== monthIndex
      )
        return false;
      const day = created.getDate();
      return day >= weekRange.start && day <= weekRange.end;
    });

    if (filteredReports.length === 0) return null;

    return aggregateReports(filteredReports, hotelLabel, year, monthIndex);
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setErrorMsg(null);
      setReportData(null);

      const hotelLabel = hotelParam(selectedHotel);

      try {
        if (selectedPeriod === "Yearly") {
          const resp = await fetchJSON(`${API_BASE}/?year=${selectedYear}&hotel_name=${encodeURIComponent(hotelLabel)}`);
          if (cancelled) return;
          if (isDataValid(resp)) {
            if (Array.isArray(resp)) {
              const filteredData = aggregateReports(resp, hotelLabel, selectedYear);
              setReportData(filteredData);
            } else {
              const normData = normalizeAggregatedResponse(resp, hotelLabel, selectedYear);
              setReportData(normData);
            }
          } else {
            const monthPromises = [];
            for (let m = 0; m < 12; m++) {
              monthPromises.push(fetchJSON(`${API_BASE}/?year=${selectedYear}&month=${m + 1}&hotel_name=${encodeURIComponent(hotelLabel)}`));
            }
            const monthResults = await Promise.all(monthPromises);
            if (cancelled) return;
            const collected = [];
            monthResults.forEach((mr, idx) => {
              if (!mr) return;
              if (Array.isArray(mr)) {
                const filtered = filterByHotelAndDate(mr, hotelLabel, selectedYear, idx);
                collected.push(...filtered);
              } else if (typeof mr === "object") {
                const hname = (mr.hotel_name ?? "").toLowerCase();
                const created = mr.created_at ? new Date(mr.created_at) : null;
                if (hname === hotelLabel && created && created.getFullYear() === selectedYear && created.getMonth() === idx) {
                  collected.push(mr);
                }
              }
            });
            if (collected.length > 0) setReportData(aggregateReports(collected, hotelLabel, selectedYear));
            else setReportData({ total_amount: 0, total_expenses: 0, reste_en_caisse: 0, expenses: [], revenues: { hebergement: 0, bar: 0, cuisine: 0 }, count: 0 });
          }
        } else if (selectedPeriod === "Monthly") {
          const resp = await fetchJSON(`${API_BASE}/?year=${selectedYear}&month=${selectedMonth + 1}&hotel_name=${encodeURIComponent(hotelLabel)}`);
          if (cancelled) return;
          if (isDataValid(resp)) {
            if (Array.isArray(resp)) {
              const filteredData = filterByHotelAndDate(resp, hotelLabel, selectedYear, selectedMonth);
              setReportData(aggregateReports(filteredData, hotelLabel, selectedYear, selectedMonth));
            } else {
              const hname = (resp.hotel_name ?? "").toLowerCase();
              const created = resp.created_at ? new Date(resp.created_at) : null;
              if (hname === hotelLabel && created && created.getFullYear() === selectedYear && created.getMonth() === selectedMonth) {
                const normData = normalizeAggregatedResponse(resp, hotelLabel, selectedYear, selectedMonth);
                setReportData(normData);
              } else {
                setReportData({ total_amount: 0, total_expenses: 0, reste_en_caisse: 0, expenses: [], revenues: { hebergement: 0, bar: 0, cuisine: 0 }, count: 0 });
              }
            }
          } else {
            const totalDays = daysInMonth(selectedYear, selectedMonth);
            const dayPromises = [];
            for (let d = 1; d <= totalDays; d++) {
              const dateStr = dateYMD(selectedYear, selectedMonth, d);
              dayPromises.push(fetchJSON(`${API_BASE}/?date=${encodeURIComponent(dateStr)}&hotel_name=${encodeURIComponent(hotelLabel)}`));
            }
            const dayResults = await Promise.all(dayPromises);
            if (cancelled) return;
            const collected = [];
            dayResults.forEach((r) => {
              if (!r) return;
              if (Array.isArray(r)) {
                const filtered = filterByHotelAndDate(r, hotelLabel, selectedYear, selectedMonth);
                collected.push(...filtered);
              } else {
                const hname = (r.hotel_name ?? "").toLowerCase();
                const created = r.created_at ? new Date(r.created_at) : null;
                if (hname === hotelLabel && created && created.getFullYear() === selectedYear && created.getMonth() === selectedMonth) {
                  collected.push(r);
                }
              }
            });
            if (collected.length > 0) setReportData(aggregateReports(collected, hotelLabel, selectedYear, selectedMonth));
            else setReportData({ total_amount: 0, total_expenses: 0, reste_en_caisse: 0, expenses: [], revenues: { hebergement: 0, bar: 0, cuisine: 0 }, count: 0 });
          }
        } else {
          // Weekly with strict week ranges
          const weeklyData = await fetchWeeklyDataStrictWeekRange(selectedYear, selectedMonth, selectedWeek, hotelLabel);
          if (cancelled) return;
          if (weeklyData && weeklyData.count > 0) {
            setReportData(weeklyData);
          } else {
            setReportData({ total_amount: 0, total_expenses: 0, reste_en_caisse: 0, expenses: [], revenues: { hebergement: 0, bar: 0, cuisine: 0 }, count: 0 });
          }
        }
      } catch {
        if (!cancelled) {
          setErrorMsg("Unable to load analytics from server");
          setReportData({ total_amount: 0, total_expenses: 0, reste_en_caisse: 0, expenses: [], revenues: { hebergement: 0, bar: 0, cuisine: 0 }, count: 0 });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => (cancelled = true);
  }, [selectedHotel, selectedPeriod, selectedWeek, selectedMonth, selectedYear]);

  const incomeAmount = reportData ? Number(reportData.total_amount) || 0 : 0;
  const expensesAmount = reportData ? Number(reportData.total_expenses) || 0 : 0;
  const netAmount = reportData ? Number(reportData.reste_en_caisse) || (incomeAmount - expensesAmount) : 0;

  const donutData = [
    { name: "Income", population: incomeAmount, color: "#6E3CF7", legendFontColor: "#fff", legendFontSize: 12 },
    { name: "Expenses", population: expensesAmount, color: "#FF6B6B", legendFontColor: "#fff", legendFontSize: 12 },
    { name: "Remainder", population: Math.max(incomeAmount - expensesAmount - netAmount, 0), color: "#DDE3FF", legendFontColor: "#fff", legendFontSize: 12 },
  ];

  const rev = reportData ? reportData.revenues || { hebergement: 0, bar: 0, cuisine: 0 } : { hebergement: 0, bar: 0, cuisine: 0 };
  const totalRevenueParts = rev.hebergement + rev.bar + rev.cuisine;

  const distributionColors = ["#9CED57", "#2E7D6F", "#F2A33A"];

  const revenueDistributionData = [
    { name: "Hebergement", amount: Number(rev.hebergement) || 0, color: distributionColors[0], legendFontColor: "#fff", legendFontSize: 13 },
    { name: "Bar", amount: Number(rev.bar) || 0, color: distributionColors[1], legendFontColor: "#fff", legendFontSize: 13 },
    { name: "Restaurant", amount: Number(rev.cuisine) || 0, color: distributionColors[2], legendFontColor: "#fff", legendFontSize: 13 },
  ];

  const distributionHasData = revenueDistributionData.some(p => p.amount > 0);

  const pieDisplayData = distributionHasData
    ? revenueDistributionData
    : [{ name: "No revenue", amount: 1, color: "#666", legendFontColor: "#fff", legendFontSize: 13 }];

  const handlePrint = async () => {
    if (!reportData) {
      Alert.alert("No data to print");
      return;
    }
    const hotelLabel = hotels.find((h) => h.key === selectedHotel)?.label ?? selectedHotel;
    const periodLabel = selectedPeriod === "Weekly" ? `Week ${selectedWeek} of ${months[selectedMonth]} ${selectedYear}` :
      selectedPeriod === "Monthly" ? `${months[selectedMonth]} ${selectedYear}` : `${selectedYear}`;

    const expenseRows = (reportData.expenses || []).map(e => `
      <tr><td>${e.label}</td><td style="text-align:right">${formatNumber(e.amount)}</td></tr>
    `).join("");

    const html = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; color: #001F60; padding: 20px; }
            h1 { color: #E6C367; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th, td { padding: 8px; border: 1px solid #E6C367; }
            th { background: #001F60; color: #E6C367; }
          </style>
        </head>
        <body>
          <h1>${hotelLabel} — ${periodLabel}</h1>
          <h2>Summary</h2>
          <table>
            <tr><th>Metric</th><th style="text-align:right">Amount (FCFA)</th></tr>
            <tr><td>Total Income</td><td style="text-align:right">${formatNumber(incomeAmount)}</td></tr>
            <tr><td>Total Expenses</td><td style="text-align:right">${formatNumber(expensesAmount)}</td></tr>
            <tr><td>Net</td><td style="text-align:right">${formatNumber(netAmount)}</td></tr>
          </table>
          <h2>Revenue Breakdown</h2>
          <table>
            <tr><th>Source</th><th style="text-align:right">Amount (FCFA)</th></tr>
            <tr><td>Hebergement</td><td style="text-align:right">${formatNumber(rev.hebergement)}</td></tr>
            <tr><td>Bar</td><td style="text-align:right">${formatNumber(rev.bar)}</td></tr>
            <tr><td>Restaurant</td><td style="text-align:right">${formatNumber(rev.cuisine)}</td></tr>
          </table>
          <h2>Expense Breakdown</h2>
          <table>
            <tr><th>Category</th><th style="text-align:right">Amount (FCFA)</th></tr>
            ${expenseRows || `<tr><td>No expenses</td><td style="text-align:right">0</td></tr>`}
          </table>
        </body>
      </html>
    `;
    try {
      await Print.printAsync({ html });
    } catch {
      Alert.alert("Print failed", "Unable to print report.");
    }
  };

  const weeks = calculateWeeks(selectedYear, selectedMonth);

  const onSelectPeriodType = (type) => {
    setSelectedPeriod(type);
    setPeriodPickerVisible(false);
    setTimeout(() => {
      if (type === "Weekly") setWeekModalVisible(true);
      if (type === "Monthly") setMonthModalVisible(true);
      if (type === "Yearly") setYearModalVisible(true);
    }, 200);
  };

  const periodTopLabel = selectedPeriod === "Weekly" ? `Week ${selectedWeek}` : selectedPeriod === "Monthly" ? months[selectedMonth] : `${selectedYear}`;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={styles.header}>
          <Text style={styles.headerText}>Analytics</Text>
          <TouchableOpacity onPress={handlePrint}><Ionicons name="print-outline" size={28} color="#E6C367" /></TouchableOpacity>
        </View>

        <View style={styles.tabsRow}>
          {tabs.map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.tabButton, selectedPeriod === t && styles.activeTabButton]}
              onPress={() => {
                setSelectedPeriod(t);
                if (t === "Weekly") setWeekModalVisible(true);
                if (t === "Monthly") setMonthModalVisible(true);
                if (t === "Yearly") setYearModalVisible(true);
              }}
            >
              <Text style={[styles.tabText, selectedPeriod === t && styles.activeTabText]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.hotelSelectorContainer}>
          <Text style={styles.hotelSelectorLabel}>Hotel</Text>
          <TouchableOpacity style={styles.hotelSelector} onPress={() => setHotelModalVisible(true)}>
            <Text style={styles.hotelSelectorText}>{hotels.find(h => h.key === selectedHotel)?.label}</Text>
            <Ionicons name="chevron-down" size={18} color="#E6C367" />
          </TouchableOpacity>
        </View>

        <Modal visible={hotelModalVisible} transparent animationType="fade" onRequestClose={() => setHotelModalVisible(false)}>
          <TouchableWithoutFeedback onPress={() => setHotelModalVisible(false)}>
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Select Hotel</Text>
                <FlatList
                  data={hotels}
                  keyExtractor={i => i.key}
                  renderItem={({ item }) => (
                    <TouchableOpacity style={styles.modalItem} onPress={() => { setSelectedHotel(item.key); setHotelModalVisible(false); }}>
                      <Text style={styles.modalItemText}>{item.label}</Text>
                    </TouchableOpacity>
                  )}
                />
                <TouchableOpacity style={styles.modalCloseButton} onPress={() => setHotelModalVisible(false)}>
                  <Text style={styles.modalCloseText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        <Modal visible={periodPickerVisible} transparent animationType="fade" onRequestClose={() => setPeriodPickerVisible(false)}>
          <TouchableWithoutFeedback onPress={() => setPeriodPickerVisible(false)}>
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Select Period Type</Text>
                <FlatList
                  data={tabs}
                  keyExtractor={i => i}
                  renderItem={({ item }) => (
                    <TouchableOpacity style={styles.modalItem} onPress={() => onSelectPeriodType(item)}>
                      <Text style={styles.modalItemText}>{item}</Text>
                    </TouchableOpacity>
                  )}
                />
                <TouchableOpacity style={styles.modalCloseButton} onPress={() => setPeriodPickerVisible(false)}>
                  <Text style={styles.modalCloseText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        <Modal visible={weekModalVisible} transparent animationType="fade" onRequestClose={() => setWeekModalVisible(false)}>
          <TouchableWithoutFeedback onPress={() => setWeekModalVisible(false)}>
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Select Week</Text>
                <FlatList
                  data={weeks}
                  keyExtractor={i => i}
                  renderItem={({ item, index }) => (
                    <TouchableOpacity style={styles.modalItem} onPress={() => { setSelectedWeek(index + 1); setWeekModalVisible(false); }}>
                      <Text style={styles.modalItemText}>{item}</Text>
                    </TouchableOpacity>
                  )}
                />
                <TouchableOpacity style={styles.modalCloseButton} onPress={() => setWeekModalVisible(false)}>
                  <Text style={styles.modalCloseText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        <Modal visible={monthModalVisible} transparent animationType="fade" onRequestClose={() => setMonthModalVisible(false)}>
          <TouchableWithoutFeedback onPress={() => setMonthModalVisible(false)}>
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Select Month</Text>
                <FlatList
                  data={months}
                  keyExtractor={i => i}
                  renderItem={({ item, index }) => (
                    <TouchableOpacity style={styles.modalItem} onPress={() => { setSelectedMonth(index); setMonthModalVisible(false); }}>
                      <Text style={styles.modalItemText}>{item}</Text>
                    </TouchableOpacity>
                  )}
                />
                <TouchableOpacity style={styles.modalCloseButton} onPress={() => setMonthModalVisible(false)}>
                  <Text style={styles.modalCloseText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        <Modal visible={yearModalVisible} transparent animationType="fade" onRequestClose={() => setYearModalVisible(false)}>
          <TouchableWithoutFeedback onPress={() => setYearModalVisible(false)}>
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Select Year</Text>
                <FlatList
                  data={years}
                  keyExtractor={(i) => i.toString()}
                  renderItem={({ item }) => (
                    <TouchableOpacity style={styles.modalItem} onPress={() => { setSelectedYear(item); setYearModalVisible(false); }}>
                      <Text style={styles.modalItemText}>{item}</Text>
                    </TouchableOpacity>
                  )}
                />
                <TouchableOpacity style={styles.modalCloseButton} onPress={() => setYearModalVisible(false)}>
                  <Text style={styles.modalCloseText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        {loading && <View style={styles.loadingOverlay}><ActivityIndicator size="large" color="#E6C367" /></View>}
        {errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}

        <View style={{ marginBottom: 18 }}>
          <View style={styles.incomeCard}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View>
                <Text style={styles.incomeTitle}>Total Income</Text>
                <Text style={styles.incomeValue}>FCFA {formatNumber(incomeAmount)}</Text>
              </View>
              <View style={styles.smallBadge}>
                <Text style={{ color: "#001F60", fontWeight: "700" }}>{selectedPeriod === "Weekly" ? `W${selectedWeek}` : selectedPeriod === "Monthly" ? months[selectedMonth] : selectedYear}</Text>
              </View>
            </View>
          </View>

          <View style={styles.rowSides}>
            <View style={[styles.sideCard, { marginRight: 8 }]}>
              <Text style={styles.sideTitle}>Total Expenses</Text>
              <Text style={styles.sideValue}>FCFA {formatNumber(expensesAmount)}</Text>
            </View>
            <View style={[styles.sideCard, { marginLeft: 8 }]}>
              <Text style={styles.sideTitle}>Net Profit</Text>
              <Text style={[styles.sideValue, netAmount >= 0 ? styles.positive : styles.negative]}>FCFA {formatNumber(netAmount)}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Overview — {selectedPeriod} ({selectedPeriod === "Weekly" ? `W${selectedWeek}` : selectedPeriod === "Monthly" ? months[selectedMonth] : selectedYear})</Text>

        <View style={styles.donutWrapper}>
          <View style={styles.donutCard}>
            <View style={styles.donutHeader}>
              <View>
                <Text style={styles.donutHeaderLabel}>Current Balance</Text>
                <Text style={styles.donutHeaderAmount}>FCFA {formatNumber(incomeAmount)}</Text>
              </View>

              <View style={styles.donutHeaderRight}>
                <TouchableOpacity style={styles.dropdownPill} onPress={() => setPeriodPickerVisible(true)}>
                  <Text style={styles.dropdownPillText}>{periodTopLabel}</Text>
                  <Ionicons name="chevron-down" size={16} color="#001F60" style={{ marginLeft: 8 }} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.donutContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ alignItems: "center" }}>
                <View style={{ width: Math.max(320, 320), alignItems: "center" }}>
                  <View style={styles.donutChartOuter}>
                    <PieChart
                      data={donutData.map((d) => ({
                        name: d.name,
                        population: d.population || 0,
                        color: d.color,
                        legendFontColor: d.legendFontColor,
                        legendFontSize: d.legendFontSize,
                      }))}
                      width={320}
                      height={220}
                      accessor={"population"}
                      backgroundColor={"transparent"}
                      paddingLeft={"15"}
                      chartConfig={{
                        backgroundGradientFrom: "#f7f8ff",
                        backgroundGradientTo: "#f7f8ff",
                        color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                      }}
                      center={[0, 0]}
                      hasLegend={false}
                      absolute
                      style={{}}
                    />
                    <View style={styles.donutCenter}>
                      <Text style={styles.centerAmount}>{formatNumber(netAmount)}</Text>
                      <Text style={styles.centerLabel}>Net profit</Text>
                    </View>
                  </View>
                </View>
              </ScrollView>
            </View>
          </View>
        </View>

        <View style={styles.legendContainer}>
          <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: "#6E3CF7" }]} /><Text style={styles.legendText}>Income</Text></View>
          <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: "#FF6B6B" }]} /><Text style={styles.legendText}>Expenses</Text></View>
        </View>

        <Text style={styles.sectionTitle}>Revenue Distribution</Text>

        <View style={styles.distributionWrapper}>
          <View style={styles.distributionCard}>
            <View style={styles.distributionHeader}>
              <Text style={styles.distributionHeaderLabel}>Breakdown (Hebergement / Bar / Restaurant)</Text>
            </View>

            <View style={styles.distributionChartArea}>
              <View style={styles.distributionChartOuter}>
                <PieChart
                  data={pieDisplayData.map((p) => ({ name: p.name, population: p.amount, color: p.color, legendFontColor: p.legendFontColor, legendFontSize: p.legendFontSize }))}
                  width={320}
                  height={240}
                  accessor={"population"}
                  backgroundColor={"transparent"}
                  paddingLeft={"15"}
                  chartConfig={{
                    backgroundGradientFrom: "#efe9ff",
                    backgroundGradientTo: "#efe9ff",
                    color: (opacity = 1) => `rgba(0,0,0, ${opacity})`,
                  }}
                  hasLegend={false}
                  center={[0, 0]}
                  absolute
                />
                <View style={styles.distributionCenter}>
                  <Text style={styles.distributionCenterLabel}>Total Expenses</Text>
                  <Text style={styles.distributionCenterAmount}>FCFA {formatNumber(expensesAmount)}</Text>
                </View>
              </View>

              <View style={styles.distributionLegend}>
                {pieDisplayData.map((p, idx) => {
                  const percent = distributionHasData ? ((p.amount / (totalRevenueParts || 1)) * 100).toFixed(0) : "0";
                  return (
                    <View key={idx} style={styles.distributionLegendRow}>
                      <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                        <View style={{ width: 12, height: 12, backgroundColor: p.color, borderRadius: 6, marginRight: 8 }} />
                        <Text style={styles.distributionLegendText}>{p.name}</Text>
                      </View>
                      <Text style={styles.distributionLegendAmount}>{formatNumber(p.amount)} FCFA</Text>
                      <Text style={styles.distributionLegendPercent}>{percent}%</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 12 }]}>Revenue Distribution Details</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: 16 }}>
          <PieChart
            data={pieDisplayData.map((p) => ({ name: p.name, population: p.amount, color: p.color, legendFontColor: p.legendFontColor, legendFontSize: p.legendFontSize }))}
            width={Math.max(320, pieDisplayData.length * 120)}
            height={220}
            accessor={"population"}
            backgroundColor={"transparent"}
            paddingLeft={"15"}
            chartConfig={{
              backgroundGradientFrom: "#001F60",
              backgroundGradientTo: "#001F60",
              color: (opacity = 1) => `rgba(255,255,255, ${opacity})`,
            }}
            absolute
            style={{ borderRadius: 18 }}
          />
        </ScrollView>

        <View style={{ paddingHorizontal: 16, marginTop: 12 }}>
          {pieDisplayData.map((p, idx) => {
            const percent = distributionHasData ? ((p.amount / (totalRevenueParts || 1)) * 100).toFixed(1) : "0.0";
            return (
              <View key={idx} style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
                <View style={{ width: 12, height: 12, backgroundColor: p.color, borderRadius: 6, marginRight: 8 }} />
                <Text style={{ color: "#fff", flex: 1 }}>{p.name}</Text>
                <Text style={{ color: "#fff", fontWeight: "700" }}>{formatNumber(p.amount)} FCFA ({percent}%)</Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Styles unchanged (same as previous) ...

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#001F60" },
  container: { flex: 1, backgroundColor: "#001F60", paddingHorizontal: 16, paddingTop: 28 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  headerText: { color: "#E6C367", fontSize: 22, fontWeight: "bold" },
  tabsRow: { flexDirection: "row", marginBottom: 12 },
  tabButton: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 22, borderWidth: 1, borderColor: "#E6C367", marginRight: 10, minWidth: 100, alignItems: "center"
  },
  activeTabButton: { backgroundColor: "#E6C367" },
  tabText: { color: "#E6C367", fontWeight: "600" },
  activeTabText: { color: "#001F60", fontWeight: "700" },

  hotelSelectorContainer: { flexDirection: "row", alignItems: "center", marginBottom: 18 },
  hotelSelectorLabel: { color: "#E6C367", fontWeight: "600", marginRight: 12 },
  hotelSelector: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#E6C367", borderRadius: 22, paddingHorizontal: 12, paddingVertical: 8 },
  hotelSelectorText: { color: "#E6C367", fontWeight: "700", marginRight: 8 },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", paddingHorizontal: 20 },
  modalContent: { backgroundColor: "#fff", borderRadius: 12, padding: 16, maxHeight: "75%" },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#001F60", textAlign: "center", marginBottom: 12 },
  modalItem: { paddingVertical: 12, borderBottomColor: "#eee", borderBottomWidth: 1 },
  modalItemText: { color: "#001F60", textAlign: "center", fontWeight: "600" },
  modalCloseButton: { marginTop: 12, backgroundColor: "#E6C367", paddingVertical: 10, borderRadius: 12, alignSelf: "center", paddingHorizontal: 18 },
  modalCloseText: { color: "#001F60", fontWeight: "700" },

  loadingOverlay: { position: "absolute", top: 120, left: 0, right: 0, alignItems: "center" },
  errorText: { color: "#FFBABA", textAlign: "center", marginVertical: 8 },

  // Updated summary styles
  incomeCard: { backgroundColor: "#142A75", borderRadius: 12, padding: 14, marginBottom: 10 },
  incomeTitle: { color: "#E6C367", fontSize: 12, fontWeight: "600" },
  incomeValue: { color: "#fff", fontWeight: "800", fontSize: 24, marginTop: 6 },

  smallBadge: { backgroundColor: "#E6C367", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, alignSelf: "flex-start" },

  rowSides: { flexDirection: "row", marginTop: 8 },
  sideCard: { flex: 1, backgroundColor: "#142A75", borderRadius: 10, padding: 12, alignItems: "center" },
  sideTitle: { color: "#E6C367", fontSize: 12 },
  sideValue: { color: "#fff", fontWeight: "700", fontSize: 16, marginTop: 6 },

  sectionTitle: { color: "#E6C367", fontSize: 18, fontWeight: "700", marginBottom: 12 },

  // Donut styles
  donutWrapper: { alignItems: "center", marginBottom: 12 },
  donutCard: {
    width: Math.max(screenWidth - 32, 320),
    backgroundColor: "#efe9ff",
    borderRadius: 16,
    padding: 12,
    alignSelf: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  donutHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  donutHeaderLabel: { color: "#001F60", fontWeight: "600" },
  donutHeaderAmount: { color: "#001F60", fontWeight: "800", fontSize: 16 },
  donutHeaderRight: { },

  dropdownPill: {
    backgroundColor: "#E6C367",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    minWidth: 84,
    justifyContent: "center",
  },
  dropdownPillText: { color: "#001F60", fontWeight: "700" },

  donutContainer: { alignItems: "center", justifyContent: "center", paddingVertical: 8 },
  donutChartOuter: { width: 320, height: 220, alignItems: "center", justifyContent: "center" },
  donutCenter: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "#efe9ff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 8,
    borderColor: "rgba(0,0,0,0.03)",
  },
  centerAmount: { color: "#001F60", fontWeight: "800", fontSize: 20 },
  centerLabel: { color: "#001F60", fontSize: 12, marginTop: 4 },

  chart: { borderRadius: 16, marginBottom: 12 },

  legendContainer: { flexDirection: "row", justifyContent: "center", marginBottom: 12 },
  legendItem: { flexDirection: "row", alignItems: "center", marginHorizontal: 10 },
  legendDot: { width: 14, height: 14, borderRadius: 7, marginRight: 8 },
  legendText: { color: "#fff", fontWeight: "600" },

  positive: { color: "#20B2AA" },
  negative: { color: "#FF6347" },

  // New distribution styles
  distributionWrapper: { alignItems: "center", marginBottom: 12 },
  distributionCard: {
    width: Math.max(screenWidth - 32, 320),
    backgroundColor: "#efe9ff",
    borderRadius: 16,
    padding: 12,
    alignSelf: "center",
    shadowColor: "#280202ff",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  distributionHeader: { marginBottom: 6 },
  distributionHeaderLabel: { color: "#001F60", fontWeight: "700" },
  distributionChartArea: { flexDirection: "row", alignItems: "center" },
  distributionChartOuter: {  width: 320, height: 220, alignItems: "center", justifyContent: "center" },
  distributionCenter: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 6,
    borderColor: "rgba(0,0,0,0.03)",
  },
 distributionCenterAmount: { color: "#001F60", fontWeight: "800", fontSize: 16 },
  distributionCenterLabel: { color: "#001F60", fontSize: 12, marginTop: 4 },

  distributionLegend: { flex: 1, paddingLeft: 12, paddingRight: 8 },
  distributionLegendRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  distributionLegendText: { color: "#001F60", fontWeight: "700" },
  distributionLegendAmount: { color: "#001F60", fontWeight: "700", marginLeft: 8 },
  distributionLegendPercent: { color: "#6B7280", marginLeft: 8 },
});