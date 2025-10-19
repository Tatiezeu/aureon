import React, { useState, useEffect, useMemo } from "react";
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
import { BarChart, PieChart } from "react-native-chart-kit";
import * as Print from "expo-print";

const screenWidth = Dimensions.get("window").width;

/*
  Analytics.jsx (updated)
  - Ensures all backend requests include hotel_name param and client-side filters to only include
    reports where report.hotel_name matches the selected hotel's hotel_name_param (case-insensitive).
  - Pie chart is now static and shows distribution of revenue sources:
      montant_hebergement, montant_bar, montant_cuisine (aggregated for selected period & hotel).
    Each slice is labeled and colored.
  - Bar chart shows Income / Expenses / Net for the selected hotel & period.
  - Maintains original UI and behavior.
*/

/* HOTEL CONFIG: UI key -> hotel_name param expected by backend */
const hotels = [
  { key: "mbolo", label: "Mbolo Hotel", hotel_name_param: "Mbolo Hotel" },
  { key: "dibamba", label: "Hotel la Dibamba", hotel_name_param: "Hotel la Dibamba" },
];

const months = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const years = Array.from({ length: 2050 - 2023 + 1 }, (_, i) => 2023 + i);
const tabs = ["Weekly", "Monthly", "Yearly"];

/* Set your API base (no trailing slash) to match your environment.
   Example: "http://172.20.10.2:8000/api/reports" */
const API_BASE = "http://172.20.10.2:8000/api/reports";

export default function Analytics() {
  // UI selection state
  const [selectedPeriod, setSelectedPeriod] = useState("Monthly");
  const [selectedHotel, setSelectedHotel] = useState(hotels[0].key);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // modal state
  const [weekModalVisible, setWeekModalVisible] = useState(false);
  const [monthModalVisible, setMonthModalVisible] = useState(false);
  const [yearModalVisible, setYearModalVisible] = useState(false);
  const [hotelModalVisible, setHotelModalVisible] = useState(false);

  // data/loading/error
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null); // aggregated { total_amount, total_expenses, reste_en_caisse, expenses: [], revenues: {hebergement,bar,cuisine} }
  const [errorMsg, setErrorMsg] = useState(null);

  // helpers
  const formatNumber = (n) => {
    const num = Number(n || 0);
    return num.toLocaleString("en-US").replace(/,/g, " ");
  };

  const pad2 = (n) => n.toString().padStart(2, "0");
  const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
  const hotelParam = (key) => hotels.find((h) => h.key === key)?.hotel_name_param ?? key;
  const dateYMD = (year, monthIndex, day) => `${year}-${pad2(monthIndex + 1)}-${pad2(day)}`;

  // fetch helpers - normalized JSON fetch
  const fetchJSON = async (url, opts = {}) => {
    try {
      const r = await fetch(url, opts);
      if (!r.ok) {
        console.warn("fetch failed", r.status, url);
        return null;
      }
      return await r.json();
    } catch (e) {
      console.error("fetchJSON error", e, url);
      return null;
    }
  };

  // Backend endpoints based on your logs / serializer:
  // - GET /api/reports/?date=YYYY-MM-DD&hotel_name=...
  // - GET /api/reports/?year=YYYY&month=MM&hotel_name=...
  // - GET /api/reports/?year=YYYY&hotel_name=...
  const fetchReportForDate = async (dateStr, hotelNameParam) => {
    const url = `${API_BASE}/?date=${encodeURIComponent(dateStr)}&hotel_name=${encodeURIComponent(hotelNameParam)}`;
    return await fetchJSON(url);
  };
  const fetchMonthAggregated = async (year, monthIndex, hotelNameParam) => {
    const month = monthIndex + 1;
    const url = `${API_BASE}/?year=${year}&month=${month}&hotel_name=${encodeURIComponent(hotelNameParam)}`;
    return await fetchJSON(url);
  };
  const fetchYearAggregated = async (year, hotelNameParam) => {
    const url = `${API_BASE}/?year=${year}&hotel_name=${encodeURIComponent(hotelNameParam)}`;
    return await fetchJSON(url);
  };

  // Ensure we only use reports matching the exact hotel_name (case-insensitive)
  const filterReportsByHotelName = (arr, hotelNameParam) => {
    if (!Array.isArray(arr)) return [];
    return arr.filter((r) => {
      if (!r) return false;
      const name = (r.hotel_name || r.hotel || "").toString().trim().toLowerCase();
      return name === hotelNameParam.toString().trim().toLowerCase();
    });
  };

  // Normalize a single backend report object into numeric fields we use
  const normalizeReport = (r) => {
    // The models.py uses montant_* fields and total fields. Normalize both.
    const montant_hebergement = Number(r.montant_hebergement ?? r.montant_hebergement ?? r.hebergement ?? 0) || 0;
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

  // Aggregate an array of reports into one summary
  const aggregateReports = (arr, hotelNameParam) => {
    let total_amount = 0;
    let total_expenses = 0;
    let reste_en_caisse = 0;
    let rev_hebergement = 0;
    let rev_bar = 0;
    let rev_cuisine = 0;
    const expenseMap = {};

    // Filter first by hotel_name to ensure different hotels don't mix
    const filtered = filterReportsByHotelName(arr, hotelNameParam);

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

  // Normalize aggregated object that backend may return directly (and ensure hotel_name filtering if array)
  function normalizeAggregatedResponse(obj, hotelNameParam) {
    // If obj is array, aggregate it
    if (Array.isArray(obj)) return aggregateReports(obj, hotelNameParam);

    // object case - still check for hotel-specific fields
    const total_amount = Number(obj.total_amount ?? obj.total ?? 0) || 0;
    const total_expenses = Number(obj.total_expenses ?? obj.expenses_total ?? 0) || 0;
    const reste_en_caisse = Number(obj.reste_en_caisse ?? obj.net ?? (total_amount - total_expenses)) || 0;

    // revenue breakdown might be present, otherwise fallback to 0
    const rev_hebergement = Number(obj.montant_hebergement ?? obj.hebergement ?? 0) || 0;
    const rev_bar = Number(obj.montant_bar ?? obj.bar ?? 0) || 0;
    const rev_cuisine = Number(obj.montant_cuisine ?? obj.cuisine ?? 0) || 0;

    const expenses = Array.isArray(obj.expenses) ? obj.expenses.map(e => ({ label: e.label ?? e.name ?? "Other", amount: Number(e.amount ?? 0) || 0 })) : [];

    // If backend returned an aggregated object that covers multiple hotels, we cannot disambiguate. We assume server respects hotel_name param.
    return {
      total_amount,
      total_expenses,
      reste_en_caisse,
      expenses,
      revenues: { hebergement: rev_hebergement, bar: rev_bar, cuisine: rev_cuisine },
      count: obj.count ?? 1,
    };
  }

  // Main loader: depending on selectedPeriod try aggregated endpoints first, fallback to per-day date requests
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setErrorMsg(null);
      setReportData(null);

      const hotelNameParam = hotelParam(selectedHotel);

      try {
        if (selectedPeriod === "Yearly") {
          // Try aggregated yearly endpoint
          const resp = await fetchYearAggregated(selectedYear, hotelNameParam);
          if (cancelled) return;
          if (resp && (Array.isArray(resp) ? resp.length > 0 : Object.keys(resp).length > 0)) {
            // If it's array, aggregate with filter
            if (Array.isArray(resp)) {
              setReportData(aggregateReports(resp, hotelNameParam));
            } else {
              setReportData(normalizeAggregatedResponse(resp, hotelNameParam));
            }
          } else {
            // fallback: request month-by-month aggregated and combine
            const monthPromises = [];
            for (let m = 0; m < 12; m++) monthPromises.push(fetchMonthAggregated(selectedYear, m, hotelNameParam));
            const monthResults = await Promise.all(monthPromises);
            if (cancelled) return;
            const collected = [];
            monthResults.forEach((mr) => {
              if (!mr) return;
              if (Array.isArray(mr)) collected.push(...mr);
              else if (typeof mr === "object") collected.push(mr);
            });
            if (collected.length > 0) setReportData(aggregateReports(collected, hotelNameParam));
            else setReportData({ total_amount: 0, total_expenses: 0, reste_en_caisse: 0, expenses: [], revenues: { hebergement: 0, bar: 0, cuisine: 0 }, count: 0 });
          }
        } else if (selectedPeriod === "Monthly") {
          const resp = await fetchMonthAggregated(selectedYear, selectedMonth, hotelNameParam);
          if (cancelled) return;
          if (resp && (Array.isArray(resp) ? resp.length > 0 : Object.keys(resp).length > 0)) {
            if (Array.isArray(resp)) setReportData(aggregateReports(resp, hotelNameParam));
            else setReportData(normalizeAggregatedResponse(resp, hotelNameParam));
          } else {
            // fallback: request each day for month
            const totalDays = daysInMonth(selectedYear, selectedMonth);
            const dayPromises = [];
            for (let d = 1; d <= totalDays; d++) {
              const dateStr = dateYMD(selectedYear, selectedMonth, d);
              dayPromises.push(fetchReportForDate(dateStr, hotelNameParam));
            }
            const dayResults = await Promise.all(dayPromises);
            if (cancelled) return;
            const collected = [];
            dayResults.forEach((r) => {
              if (!r) return;
              if (Array.isArray(r)) collected.push(...r);
              else collected.push(r);
            });
            if (collected.length > 0) setReportData(aggregateReports(collected, hotelNameParam));
            else setReportData({ total_amount: 0, total_expenses: 0, reste_en_caisse: 0, expenses: [], revenues: { hebergement: 0, bar: 0, cuisine: 0 }, count: 0 });
          }
        } else {
          // Weekly: weeks defined: week1 1-7, week2 8-14, week3 15-21, week4 22-end
          const startDay = (selectedWeek - 1) * 7 + 1;
          const endDay = selectedWeek < 4 ? startDay + 6 : daysInMonth(selectedYear, selectedMonth);

          // Attempt weekly aggregated endpoint (if server supports)
          const weeklyTryUrl = `${API_BASE}/?year=${selectedYear}&month=${selectedMonth + 1}&week=${selectedWeek}&hotel_name=${encodeURIComponent(hotelNameParam)}`;
          const weeklyResp = await fetchJSON(weeklyTryUrl);
          if (cancelled) return;
          if (weeklyResp && (Array.isArray(weeklyResp) ? weeklyResp.length > 0 : Object.keys(weeklyResp).length > 0)) {
            if (Array.isArray(weeklyResp)) setReportData(aggregateReports(weeklyResp, hotelNameParam));
            else setReportData(normalizeAggregatedResponse(weeklyResp, hotelNameParam));
          } else {
            // fallback to per-day
            const dayPromises = [];
            for (let d = startDay; d <= endDay; d++) {
              const dateStr = dateYMD(selectedYear, selectedMonth, d);
              dayPromises.push(fetchReportForDate(dateStr, hotelNameParam));
            }
            const dayResults = await Promise.all(dayPromises);
            if (cancelled) return;
            const collected = [];
            dayResults.forEach((r) => {
              if (!r) return;
              if (Array.isArray(r)) collected.push(...r);
              else collected.push(r);
            });
            if (collected.length > 0) setReportData(aggregateReports(collected, hotelNameParam));
            else setReportData({ total_amount: 0, total_expenses: 0, reste_en_caisse: 0, expenses: [], revenues: { hebergement: 0, bar: 0, cuisine: 0 }, count: 0 });
          }
        }
      } catch (e) {
        console.error("load error", e);
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

  // Chart data preparation
  const incomeAmount = reportData ? Number(reportData.total_amount) || 0 : 0;
  const expensesAmount = reportData ? Number(reportData.total_expenses) || 0 : 0;
  const netAmount = reportData ? Number(reportData.reste_en_caisse) || (incomeAmount - expensesAmount) : 0;

  const barData = {
    labels: ["Income", "Expenses", "Net"],
    datasets: [
      {
        data: [incomeAmount, expensesAmount, netAmount],
      },
    ],
  };

  // Pie chart: static revenue distribution (hebergement, bar, cuisine) aggregated for selected hotel & period
  const rev = reportData ? reportData.revenues || { hebergement: 0, bar: 0, cuisine: 0 } : { hebergement: 0, bar: 0, cuisine: 0 };
  const totalRevenueParts = rev.hebergement + rev.bar + rev.cuisine;
  const palette = ["#E6C367", "#FF7F50", "#20B2AA"];
  const pieData = [
    {
      name: "Hebergement",
      amount: Number(rev.hebergement) || 0,
      color: palette[0],
      legendFontColor: "#fff",
      legendFontSize: 13,
    },
    {
      name: "Bar",
      amount: Number(rev.bar) || 0,
      color: palette[1],
      legendFontColor: "#fff",
      legendFontSize: 13,
    },
    {
      name: "Cuisine",
      amount: Number(rev.cuisine) || 0,
      color: palette[2],
      legendFontColor: "#fff",
      legendFontSize: 13,
    },
  ];

  // If all zero, keep small placeholder slice to avoid empty chart rendering
  const pieHasData = pieData.some((p) => p.amount > 0);
  const pieDisplayData = pieHasData ? pieData : [{ name: "No revenue", amount: 1, color: "#666", legendFontColor: "#fff", legendFontSize: 13 }];

  // Print helper
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
            <tr><td>Cuisine</td><td style="text-align:right">${formatNumber(rev.cuisine)}</td></tr>
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
    } catch (e) {
      Alert.alert("Print failed", "Unable to print report.");
      console.error("print failed", e);
    }
  };

  // UI lists
  const weeks = ["Week 1", "Week 2", "Week 3", "Week 4"];

  // Render
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerText}>Analytics</Text>
          <TouchableOpacity onPress={handlePrint}><Ionicons name="print-outline" size={28} color="#E6C367" /></TouchableOpacity>
        </View>

        {/* Tabs */}
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

        {/* Hotel selector */}
        <View style={styles.hotelSelectorContainer}>
          <Text style={styles.hotelSelectorLabel}>Hotel</Text>
          <TouchableOpacity style={styles.hotelSelector} onPress={() => setHotelModalVisible(true)}>
            <Text style={styles.hotelSelectorText}>{hotels.find(h => h.key === selectedHotel)?.label}</Text>
            <Ionicons name="chevron-down" size={18} color="#E6C367" />
          </TouchableOpacity>
        </View>

        {/* Modals */}
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

        {/* Loading / error */}
        {loading && <View style={styles.loadingOverlay}><ActivityIndicator size="large" color="#E6C367" /></View>}
        {errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}

        {/* Summary cards */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryCard}>
            <Text style={styles.cardTitle}>Total Income</Text>
            <Text style={styles.cardValue}>FCFA {formatNumber(incomeAmount)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.cardTitle}>Total Expenses</Text>
            <Text style={styles.cardValue}>FCFA {formatNumber(expensesAmount)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.cardTitle}>Net</Text>
            <Text style={[styles.cardValue, netAmount >= 0 ? styles.positive : styles.negative]}>FCFA {formatNumber(netAmount)}</Text>
          </View>
        </View>

        {/* Charts */}
        <Text style={styles.sectionTitle}>Income / Expenses / Net — {selectedPeriod} ({selectedPeriod === "Weekly" ? `W${selectedWeek}` : selectedPeriod === "Monthly" ? months[selectedMonth] : selectedYear})</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: 16 }}>
          <BarChart
            data={barData}
            width={Math.max(screenWidth - 32, 360)}
            height={280}
            fromZero
            chartConfig={{
              backgroundGradientFrom: "#001F60",
              backgroundGradientTo: "#001F60",
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(230,195,103, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(255,255,255, ${opacity})`,
              style: { borderRadius: 16 },
            }}
            style={styles.chart}
            yAxisSuffix=" FCFA"
            showBarTops
            withInnerLines={false}
            flatColor
          />
        </ScrollView>

        <View style={styles.legendContainer}>
          <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: "#E6C367" }]} /><Text style={styles.legendText}>Income</Text></View>
          <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: "#FF6347" }]} /><Text style={styles.legendText}>Expenses</Text></View>
          <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: "#20B2AA" }]} /><Text style={styles.legendText}>Net</Text></View>
        </View>

        <Text style={styles.sectionTitle}>Revenue Distribution (Hebergement / Bar / Cuisine)</Text>
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

        {/* Legend for pie (explicit labels + percentages) */}
        <View style={{ paddingHorizontal: 16, marginTop: 12 }}>
          {pieDisplayData.map((p, idx) => {
            const percent = pieHasData ? ((p.amount / (totalRevenueParts || 1)) * 100).toFixed(1) : "0.0";
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

/* --- Styles --- */
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

  summaryContainer: { flexDirection: "row", justifyContent: "space-between", marginBottom: 18 },
  summaryCard: { flex: 1, backgroundColor: "#142A75", borderRadius: 10, padding: 12, marginHorizontal: 4, alignItems: "center" },
  cardTitle: { color: "#E6C367", fontSize: 12 },
  cardValue: { color: "#fff", fontWeight: "700", fontSize: 20, marginTop: 6 },

  sectionTitle: { color: "#E6C367", fontSize: 18, fontWeight: "700", marginBottom: 12 },

  chart: { borderRadius: 16, marginBottom: 12 },

  legendContainer: { flexDirection: "row", justifyContent: "center", marginBottom: 12 },
  legendItem: { flexDirection: "row", alignItems: "center", marginHorizontal: 10 },
  legendDot: { width: 14, height: 14, borderRadius: 7, marginRight: 8 },
  legendText: { color: "#fff", fontWeight: "600" },

  positive: { color: "#20B2AA" },
  negative: { color: "#FF6347" },
});