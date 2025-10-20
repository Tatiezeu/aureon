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
  Dimensions,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import Ionicons from "react-native-vector-icons/Ionicons";
import * as Print from "expo-print";
import { useNavigation } from "@react-navigation/native";
import DateTimePicker from "@react-native-community/datetimepicker";
import axios from "axios";

const API_URL = "http://192.168.0.122:8000/api/reports/";

const months = [
  "January","February","March","April","May","June","July","August","September","October","November","December",
];

function formatDateToYYYYMMDD(date) {
  if (!date) return "";
  const d = date instanceof Date ? date : new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function toNumber(v) {
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function formatNumberString(v) {
  const n = toNumber(v);
  return n.toFixed(2);
}

const EMPTY_EXPENSE = { label: "", amount: "" };

function TextInputWithLabel({ label, value, onChangeText, keyboardType }) {
  return (
    <View style={{ marginBottom: 8 }}>
      <Text style={{ fontWeight: "600", marginBottom: 4, color: "#001F60", fontSize: 14 }}>{label}</Text>
      <View style={[styles.input, { marginBottom: 0 }]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType || "default"}
          style={{ padding: 8, fontSize: 14, color: "#001F60" }}
          placeholderTextColor="#666"
          placeholder={`Enter ${label.toLowerCase()}`}
        />
      </View>
    </View>
  );
}

function GenerateReportForm({ onClose, onSubmit, reportData, defaultHotel, selectedDate }) {
  const initialHotel = reportData?.hotel_name ?? defaultHotel ?? "Mbolo Hotel";
  const initialDate = reportData?.created_at ? new Date(reportData.created_at) : selectedDate ?? new Date();

  const [hotel, setHotel] = useState(initialHotel);
  const [date, setDate] = useState(initialDate);
  const [showPicker, setShowPicker] = useState(false);

  const [hebergement, setHebergement] = useState(String(reportData?.montant_hebergement ?? reportData?.hebergement ?? ""));
  const [bar, setBar] = useState(String(reportData?.montant_bar ?? reportData?.bar ?? ""));
  const [cuisine, setCuisine] = useState(String(reportData?.montant_cuisine ?? reportData?.cuisine ?? ""));

  const [expenses, setExpenses] = useState(
    reportData?.expenses && reportData.expenses.length > 0
      ? reportData.expenses.map((e) => ({ id: e.id, label: e.label ?? "", amount: String(e.amount ?? "") }))
      : [Object.assign({}, EMPTY_EXPENSE)]
  );

  useEffect(() => {
    if (reportData) {
      setHotel(reportData.hotel_name ?? defaultHotel ?? "Mbolo Hotel");
      setDate(reportData.created_at ? new Date(reportData.created_at) : selectedDate ?? new Date());
      setHebergement(String(reportData.montant_hebergement ?? reportData.hebergement ?? ""));
      setBar(String(reportData.montant_bar ?? reportData.bar ?? ""));
      setCuisine(String(reportData.montant_cuisine ?? reportData.cuisine ?? ""));
      setExpenses(
        reportData.expenses && reportData.expenses.length > 0
          ? reportData.expenses.map((e) => ({ id: e.id, label: e.label ?? "", amount: String(e.amount ?? "") }))
          : [Object.assign({}, EMPTY_EXPENSE)]
      );
    } else {
      setHotel(defaultHotel ?? "Mbolo Hotel");
      setDate(selectedDate ?? new Date());
      setHebergement("");
      setBar("");
      setCuisine("");
      setExpenses([Object.assign({}, EMPTY_EXPENSE)]);
    }
  }, [reportData, defaultHotel, selectedDate]);

  const totalIncome = toNumber(hebergement) + toNumber(bar) + toNumber(cuisine);
  const totalExpenses = expenses.reduce((s, e) => s + toNumber(e.amount), 0);
  const reste = totalIncome - totalExpenses;

  const addExpense = () => setExpenses([...expenses, { label: "", amount: "" }]);

  const updateExpense = (index, key, value) => {
    const copy = [...expenses];
    copy[index][key] = value;
    setExpenses(copy);
  };

  const removeExpense = (index) => {
    const copy = expenses.filter((_, i) => i !== index);
    setExpenses(copy.length ? copy : [Object.assign({}, EMPTY_EXPENSE)]);
  };

  const validateBeforeSubmit = () => {
    if (!hotel || String(hotel).trim() === "") return { ok: false, message: "Hotel name is required." };

    const h = toNumber(hebergement);
    const b = toNumber(bar);
    const c = toNumber(cuisine);
    if (!Number.isFinite(h) || !Number.isFinite(b) || !Number.isFinite(c)) {
      return { ok: false, message: "Montant fields must be numeric." };
    }

    for (let i = 0; i < expenses.length; i++) {
      const e = expenses[i];
      const hasLabel = e.label && String(e.label).trim() !== "";
      const hasAmount = e.amount && String(e.amount).trim() !== "";
      if (hasAmount && !Number.isFinite(toNumber(e.amount))) {
        return { ok: false, message: `Expense amount must be numeric for row ${i + 1}.` };
      }
    }

    return { ok: true };
  };

  const handleSubmit = () => {
    const valid = validateBeforeSubmit();
    if (!valid.ok) {
      Alert.alert("Validation error", valid.message);
      return;
    }

    const isoDate = date instanceof Date ? date.toISOString().slice(0, 10) : String(date);

    const montant_hebergement = Number(toNumber(hebergement).toFixed(2));
    const montant_bar = Number(toNumber(bar).toFixed(2));
    const montant_cuisine = Number(toNumber(cuisine).toFixed(2));

    const hebergement_str = formatNumberString(hebergement);
    const bar_str = formatNumberString(bar);
    const cuisine_str = formatNumberString(cuisine);

    const normalizedExpenses = (expenses || [])
      .filter((e) => (e.label && String(e.label).trim() !== "") || (String(e.amount).trim() !== ""))
      .map((e) => {
        const amountNum = Number(toNumber(e.amount).toFixed(2));
        return {
          label: e.label ?? "",
          amount: amountNum,
          amount_str: formatNumberString(e.amount),
          id: e.id,
        };
      });

    const payload = {
      hotel_name: hotel,
      montant_hebergement,
      montant_bar,
      montant_cuisine,
      hebergement: hebergement_str,
      bar: bar_str,
      cuisine: cuisine_str,
      expenses: normalizedExpenses.map((e) => {
        const out = { label: e.label, amount: e.amount };
        out.amount_str = e.amount_str;
        if (e.id) out.id = e.id;
        return out;
      }),
      created_at: isoDate,
      date: isoDate,
    };

    onSubmit(payload);
  };

  const submitLabel = reportData && reportData.id ? "Update" : "Create";

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
      <ScrollView style={styles.formContainer} contentContainerStyle={{ paddingBottom: 30 }}>
        <Text style={styles.formTitle}>{submitLabel} Report</Text>

        <View style={[styles.input, { padding: 0, marginBottom: 12 }]}>
          <Picker selectedValue={hotel} onValueChange={(v) => setHotel(v)} style={{ color: "#001F60", fontSize: 14 }}>
            <Picker.Item label="Mbolo Hotel" value="Mbolo Hotel" />
            <Picker.Item label="Hotel La Dibamba" value="Hotel La Dibamba" />
          </Picker>
        </View>

        <TouchableOpacity
          style={[styles.input, { justifyContent: "center", marginBottom: 12 }]}
          onPress={() => setShowPicker(true)}
        >
          <Text style={{ fontSize: 14, color: "#001F60" }}>
            {`${date.getDate()}-${months[date.getMonth()]}-${date.getFullYear()}`}
          </Text>
        </TouchableOpacity>

        {showPicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display="inline"
            onChange={(e, selectedDate) => {
              setShowPicker(false);
              if (selectedDate) setDate(selectedDate);
            }}
          />
        )}

        <TextInputWithLabel label="Montant Hébergement" value={hebergement} onChangeText={setHebergement} keyboardType="numeric" />
        <TextInputWithLabel label="Montant Bar" value={bar} onChangeText={setBar} keyboardType="numeric" />
        <TextInputWithLabel label="Montant Cuisine" value={cuisine} onChangeText={setCuisine} keyboardType="numeric" />

        <Text style={[styles.subtitle, { marginTop: 16, marginBottom: 8, fontSize: 16 }]}>Expenses</Text>

        {expenses.map((exp, idx) => (
          <View key={idx} style={styles.expenseRowForm}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={[styles.expenseLabel, { fontSize: 14 }]}>Label</Text>
              <View style={[styles.input, { marginBottom: 4 }]}>
                <TextInput
                  value={exp.label}
                  onChangeText={(v) => updateExpense(idx, "label", v)}
                  placeholder="e.g. Samson"
                  style={{ padding: 8, fontSize: 14, color: "#001F60" }}
                  placeholderTextColor="#666"
                />
              </View>
            </View>

            <View style={{ flex: 1 }}>
              <Text style={[styles.expenseLabel, { fontSize: 14 }]}>Amount</Text>
              <View style={[styles.input, { marginBottom: 4 }]}>
                <TextInput
                  value={exp.amount}
                  onChangeText={(v) => updateExpense(idx, "amount", v)}
                  placeholder="0.00"
                  keyboardType="numeric"
                  style={{ padding: 8, fontSize: 14, color: "#001F60" }}
                  placeholderTextColor="#666"
                />
              </View>
            </View>

            <TouchableOpacity
              style={styles.removeExpenseBtn}
              onPress={() => removeExpense(idx)}
              accessibilityLabel="Remove expense"
            >
              <Ionicons name="trash-outline" size={16} color="#FFF" />
            </TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity style={styles.addBtnForm} onPress={addExpense}>
          <Text style={[styles.addBtnTextForm, { fontSize: 14 }]}>+ Add Expense</Text>
        </TouchableOpacity>

        <View style={{ marginTop: 10 }}>
          <Text style={[styles.summary, { fontSize: 14 }]}>Total Income: {totalIncome.toFixed(2)} FCFA</Text>
          <Text style={[styles.summary, { fontSize: 14 }]}>Total Expenses: {totalExpenses.toFixed(2)} FCFA</Text>
          <Text style={[styles.summary, { fontSize: 14 }]}>Reste en caisse: {reste.toFixed(2)} FCFA</Text>
        </View>

        <TouchableOpacity style={styles.submitBtnForm} onPress={handleSubmit}>
          <Text style={[styles.submitText, { fontSize: 16 }]}>{submitLabel}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.closeBtnForm} onPress={onClose}>
          <Text style={[styles.closeText, { fontSize: 14 }]}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const Home = () => {
  const navigation = useNavigation();

  const [activeTab, setActiveTab] = useState("mbolo");
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [unreadCount, setUnreadCount] = useState(3);

  const [displayReport, setDisplayReport] = useState(null);
  const [formReport, setFormReport] = useState(null);
  const [room, setRoom] = useState("");
  const [bar, setBar] = useState("");
  const [restaurant, setRestaurant] = useState("");
  const [expenses, setExpenses] = useState([Object.assign({}, EMPTY_EXPENSE)]);
  const [updateMode, setUpdateMode] = useState(false);
  const [loading, setLoading] = useState(false);

  const displayMontantH = displayReport ? toNumber(displayReport.montant_hebergement ?? displayReport.hebergement ?? 0) : toNumber(room);
  const displayMontantB = displayReport ? toNumber(displayReport.montant_bar ?? displayReport.bar ?? 0) : toNumber(bar);
  const displayMontantC = displayReport ? toNumber(displayReport.montant_cuisine ?? displayReport.cuisine ?? 0) : toNumber(restaurant);

  const displayExpensesList = displayReport && displayReport.expenses && displayReport.expenses.length ? displayReport.expenses : (!displayReport ? expenses : []);
  const displayTotalAmount = displayMontantH + displayMontantB + displayMontantC;
  const displayTotalExpenses = (displayExpensesList || []).reduce((s, e) => s + toNumber(e.amount), 0);
  const displayReste = displayTotalAmount - displayTotalExpenses;

  const getHotelNameForTab = (tab) => (tab === "mbolo" ? "Mbolo Hotel" : "Hotel La Dibamba");

  const findExactMatchInArray = (arr, hotelName, dateStr) => {
    if (!Array.isArray(arr)) return null;
    return arr.find((item) => {
      const itemHotel = item.hotel_name ?? item.hotel ?? "";
      if (String(itemHotel) !== String(hotelName)) return false;
      const createdAt = item.created_at ?? item.date ?? item.created ?? null;
      if (!createdAt) return false;
      const itemDatePrefix = String(createdAt).slice(0, 10);
      return itemDatePrefix === dateStr;
    });
  };

  const fetchReport = async ({ overrideDate = null, overrideHotel = null } = {}) => {
    setLoading(true);
    try {
      const effectiveDate = overrideDate ? (overrideDate instanceof Date ? overrideDate : new Date(overrideDate)) : date;
      const dateStr = formatDateToYYYYMMDD(effectiveDate);
      const hotelName = overrideHotel ?? getHotelNameForTab(activeTab);

      const url = `${API_URL}?date=${dateStr}&hotel_name=${encodeURIComponent(hotelName)}`;
      const res = await axios.get(url);
      const data = res.data;

      let matchedReport = findExactMatchInArray(data, hotelName, dateStr);
      if (!matchedReport && Array.isArray(data) && data.length === 1) {
        const only = data[0];
        const itemHotel = only.hotel_name ?? only.hotel ?? "";
        const createdAt = only.created_at ?? only.date ?? only.created ?? null;
        const itemDatePrefix = createdAt ? String(createdAt).slice(0, 10) : null;
        if (String(itemHotel) === String(hotelName) && itemDatePrefix === dateStr) {
          matchedReport = only;
        } else {
          matchedReport = null;
        }
      }

      if (matchedReport) {
        setDisplayReport(matchedReport);
        setFormReport(matchedReport);
        setRoom(String(matchedReport.montant_hebergement ?? matchedReport.hebergement ?? ""));
        setBar(String(matchedReport.montant_bar ?? matchedReport.bar ?? ""));
        setRestaurant(String(matchedReport.montant_cuisine ?? matchedReport.cuisine ?? ""));
        setExpenses(
          matchedReport.expenses && matchedReport.expenses.length > 0
            ? matchedReport.expenses.map((e) => ({ id: e.id, label: e.label ?? "", amount: String(e.amount ?? "") }))
            : [Object.assign({}, EMPTY_EXPENSE)]
        );
      } else {
        setDisplayReport(null);
        setFormReport(null);
        setRoom("");
        setBar("");
        setRestaurant("");
        setExpenses([Object.assign({}, EMPTY_EXPENSE)]);
      }
    } catch (err) {
      Alert.alert("Network", "Failed to fetch report. Check backend and network.");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateOrUpdate = async (payload) => {
    try {
      const isUpdate = updateMode && formReport && formReport.id;

      if (!payload.hotel_name) payload.hotel_name = getHotelNameForTab(activeTab);
      const payloadDate = payload.date || payload.created_at || formatDateToYYYYMMDD(date);
      const dateStr = typeof payloadDate === "string" ? payloadDate : formatDateToYYYYMMDD(new Date(payloadDate));

      if (!isUpdate) {
        try {
          const checkRes = await axios.get(`${API_URL}?date=${dateStr}&hotel_name=${encodeURIComponent(payload.hotel_name)}`);
          const checkData = checkRes.data;
          const exact = findExactMatchInArray(checkData, payload.hotel_name, dateStr);
          if (exact) {
            Alert.alert(
              "Already exists",
              `A report for ${payload.hotel_name} on ${dateStr} already exists. Open it to update instead.`,
              [
                {
                  text: "Open",
                  onPress: () => {
                    setDisplayReport(exact);
                    setFormReport(exact);
                    setRoom(String(exact.montant_hebergement ?? exact.hebergement ?? ""));
                    setBar(String(exact.montant_bar ?? exact.bar ?? ""));
                    setRestaurant(String(exact.montant_cuisine ?? exact.cuisine ?? ""));
                    setExpenses(
                      exact.expenses && exact.expenses.length > 0
                        ? exact.expenses.map((e) => ({ id: e.id, label: e.label ?? "", amount: String(e.amount ?? "") }))
                        : [Object.assign({}, EMPTY_EXPENSE)]
                    );
                    setUpdateMode(true);
                    setShowAddModal(true);
                  },
                },
                { text: "OK", style: "cancel" },
              ]
            );
            return;
          }
        } catch {}
      }

      const url = isUpdate ? `${API_URL}${formReport.id}/` : API_URL;
      const method = isUpdate ? "put" : "post";

      const rawH = payload.montant_hebergement !== undefined ? payload.montant_hebergement : payload.hebergement !== undefined ? payload.hebergement : 0;
      const rawB = payload.montant_bar !== undefined ? payload.montant_bar : payload.bar !== undefined ? payload.bar : 0;
      const rawC = payload.montant_cuisine !== undefined ? payload.montant_cuisine : payload.cuisine !== undefined ? payload.cuisine : 0;

      const montant_hebergement = Number(toNumber(rawH).toFixed(2));
      const montant_bar = Number(toNumber(rawB).toFixed(2));
      const montant_cuisine = Number(toNumber(rawC).toFixed(2));

      const finalPayload = {
        hotel_name: payload.hotel_name,
        montant_hebergement,
        montant_bar,
        montant_cuisine,
        hebergement: formatNumberString(rawH),
        bar: formatNumberString(rawB),
        cuisine: formatNumberString(rawC),
        expenses: (payload.expenses || []).map((e) => {
          const amountNum = Number(toNumber(e.amount).toFixed(2));
          const obj = { label: e.label ?? "", amount: amountNum };
          if (e.id) obj.id = e.id;
          return obj;
        }),
        created_at: payload.created_at || payload.date || dateStr,
      };

      await axios({
        method,
        url,
        headers: { "Content-Type": "application/json" },
        data: finalPayload,
      });

      Alert.alert("Success", isUpdate ? "Report updated successfully" : "Report created successfully");
      setShowAddModal(false);
      setUpdateMode(false);

      await fetchReport({ overrideDate: dateStr, overrideHotel: finalPayload.hotel_name });
    } catch (err) {
      const serverMsg = err.response?.data ?? err.message ?? "Unknown error";
      Alert.alert("Error", `Failed to save report. Server response: ${JSON.stringify(serverMsg)}`);
    }
  };

  const handlePrint = async () => {
    try {
      const hotelName = displayReport?.hotel_name ?? getHotelNameForTab(activeTab);
      const dateStr = displayReport?.created_at ? new Date(displayReport.created_at).toLocaleDateString() : date.toLocaleDateString();

      const montantHebergement = displayReport?.montant_hebergement ?? displayReport?.hebergement ?? toNumber(room);
      const montantBar = displayReport?.montant_bar ?? displayReport?.bar ?? toNumber(bar);
      const montantCuisine = displayReport?.montant_cuisine ?? displayReport?.cuisine ?? toNumber(restaurant);

      const expensesList = displayReport?.expenses && displayReport?.expenses.length > 0 ? displayReport.expenses : expenses;

      const totalIncome = toNumber(montantHebergement) + toNumber(montantBar) + toNumber(montantCuisine);
      const totalExpensesValue = (expensesList || []).reduce((s, e) => s + toNumber(e.amount), 0);
      const reste = totalIncome - totalExpensesValue;

      const formatFCFA = (n) => {
        try {
          const num = parseFloat(n) || 0;
          return num.toLocaleString("en-US", { maximumFractionDigits: 2 });
        } catch {
          return String(n);
        }
      };

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
                ${(expensesList || [])
                  .map((e) => `<tr><td>${e.label || "—"}</td><td>${formatFCFA(e.amount)}</td></tr>`)
                  .join("")}
                <tr><th>Total Sorties</th><th>${formatFCFA(totalExpensesValue)}</th></tr>
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
    } catch (err) {
      Alert.alert("Error", "Failed to print report.");
    }
  };

  useEffect(() => {
    fetchReport();
  }, [date, activeTab]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerText}>Accountant Aureon</Text>

          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <TouchableOpacity
              style={styles.notificationButton}
              onPress={() => {
                setUnreadCount(0);
                navigation.navigate("Notifications");
              }}
            >
              <Ionicons name="notifications-outline" size={20} color="#E6C367" />
              {unreadCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>{unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.addButton}
              onPress={() => {
                if (displayReport && displayReport.id) {
                  setFormReport(displayReport);
                  setUpdateMode(true);
                } else {
                  setFormReport(null);
                  setUpdateMode(false);
                }
                setShowAddModal(true);
              }}
            >
              <Ionicons name="add" size={22} color="#001F60" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Net Amount Card */}
        <View style={[styles.cardLarge, { padding: 16 }]}>
          <Text style={styles.cardLabel}>Net Amount</Text>
          <Text style={[styles.cardValue, { fontSize: 20 }]}>{String(Number(displayReste).toFixed(2))} FCFA</Text>
          <Text style={styles.cardSubLabel}>
            {displayReport ? displayReport.hotel_name ?? getHotelNameForTab(activeTab) : getHotelNameForTab(activeTab)}
          </Text>
        </View>

        <View style={styles.row}>
          <View style={[styles.cardSmall, { paddingVertical: 12 }]}>
            <Text style={styles.cardLabel}>Total Amount</Text>
            <Text style={[styles.cardValue, { fontSize: 16 }]}>{String(Number(displayTotalAmount).toFixed(2))} FCFA</Text>
          </View>
          <View style={[styles.cardSmall, { paddingVertical: 12 }]}>
            <Text style={styles.cardLabel}>Total Expenses</Text>
            <Text style={[styles.cardValue, { fontSize: 16 }]}>{String(Number(displayTotalExpenses).toFixed(2))} FCFA</Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === "mbolo" && styles.activeTabButton]}
            onPress={() => {
              if (activeTab !== "mbolo") {
                setActiveTab("mbolo");
                setTimeout(() => fetchReport({ overrideHotel: getHotelNameForTab("mbolo") }), 50);
              }
            }}
          >
            <Text style={[styles.tabText, activeTab === "mbolo" && styles.activeTabText]}>Mbolo</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === "dibamba" && styles.activeTabButton]}
            onPress={() => {
              if (activeTab !== "dibamba") {
                setActiveTab("dibamba");
                setTimeout(() => fetchReport({ overrideHotel: getHotelNameForTab("dibamba") }), 50);
              }
            }}
          >
            <Text style={[styles.tabText, activeTab === "dibamba" && styles.activeTabText]}>Dibamba</Text>
          </TouchableOpacity>
        </View>

        {/* Date Picker */}
        <TouchableOpacity
          style={[styles.input, { backgroundColor: "#142A75", marginTop: 8 }]}
          onPress={() => setShowDatePicker(true)}
          activeOpacity={0.8}
        >
          <Text style={{ color: "#E6C367", fontSize: 14 }}>
            {`${date.getDate()}-${months[date.getMonth()]}-${date.getFullYear()}`}
          </Text>
        </TouchableOpacity>

        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display="inline"
            onChange={(e, selectedDate) => {
              setShowDatePicker(false);
              if (selectedDate) setDate(selectedDate);
            }}
          />
        )}

        {/* Main content */}
        <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>
          <View style={[styles.dayCard, { padding: 16 }]}>
            <Text style={[styles.dateText, { fontSize: 16 }]}>{`Report for ${date.toDateString()} — ${getHotelNameForTab(activeTab)}`}</Text>

            <Text style={[styles.amountText, { fontSize: 14 }]}>Montant Hébergement: FCFA {String(Number(displayMontantH).toFixed(2))}</Text>
            <Text style={[styles.amountText, { fontSize: 14 }]}>Montant Bar: FCFA {String(Number(displayMontantB).toFixed(2))}</Text>
            <Text style={[styles.amountText, { fontSize: 14 }]}>Montant Cuisine: FCFA {String(Number(displayMontantC).toFixed(2))}</Text>

            <Text style={[styles.subtitle, { fontSize: 16 }]}>Expenses</Text>

            {(displayExpensesList && displayExpensesList.length) ? (
              displayExpensesList.map((exp, i) => (
                <View key={i} style={styles.expenseRow}>
                  <Text style={{ color: "#FFF", flex: 1, fontSize: 14 }}>{exp.label || "—"}</Text>
                  <Text style={{ color: "#FFF", flex: 1, fontSize: 14 }}>FCFA {String(Number(toNumber(exp.amount)).toFixed(2))}</Text>
                </View>
              ))
            ) : (
              <Text style={{ color: "#FFF", fontSize: 14 }}>No expenses</Text>
            )}

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.updateButton}
                onPress={() => {
                  if (displayReport && displayReport.id) {
                    setFormReport(displayReport);
                    setUpdateMode(true);
                    setShowAddModal(true);
                    return;
                  }
                  setFormReport(null);
                  setUpdateMode(false);
                  setShowAddModal(true);
                }}
              >
                <Text style={[styles.buttonText, { fontSize: 16 }]}>{displayReport && displayReport.id ? "Update" : "Create"}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.printButton} onPress={handlePrint}>
                <Text style={[styles.buttonText, { fontSize: 16 }]}>Print</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        {/* Modal */}
        <Modal visible={showAddModal} animationType="slide">
          <GenerateReportForm
            reportData={updateMode ? formReport : null}
            defaultHotel={getHotelNameForTab(activeTab)}
            selectedDate={date}
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

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#001F60" },
  container: {
    flex: 1,
    backgroundColor: "#001F60",
    paddingHorizontal: 16,
    paddingBottom: 0,
    minHeight: SCREEN_HEIGHT,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 12,
  },
  headerText: { fontSize: 20, color: "#FFD700", fontWeight: "bold" },

  addButton: {
    backgroundColor: "#FFD700",
    borderRadius: 20,
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },

  cardLarge: {
    backgroundColor: "#FFD700",
    borderRadius: 20,
    marginTop: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 7,
  },
  cardLabel: {
    fontSize: 16,
    color: "#3A2E00",
    fontWeight: "600",
    marginBottom: 4,
  },
  cardValue: {
    fontSize: 20,
    color: "#3A2E00",
    fontWeight: "bold",
    textShadowColor: "rgba(0,0,0,0.2)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  cardSubLabel: {
    color: "#3A2E00",
    fontSize: 12,
    marginTop: 6,
    fontWeight: "600",
  },

  row: { flexDirection: "row", marginTop: 14 },

  cardSmall: {
    flex: 1,
    backgroundColor: "#FFEA7F",
    borderRadius: 16,
    marginHorizontal: 6,
    paddingVertical: 12,
    paddingLeft: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 5,
    elevation: 6,
  },

  tabContainer: {
    flexDirection: "row",
    justifyContent: "center",
    backgroundColor: "#142A75",
    borderRadius: 25,
    marginTop: 16,
    marginBottom: 14,
    overflow: "hidden",
    alignSelf: "center",
    width: "60%",
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
  },
  activeTabButton: {
    backgroundColor: "#FFD700",
    borderRadius: 25,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },
  tabText: {
    color: "#FFD700",
    fontWeight: "600",
    fontSize: 14,
  },
  activeTabText: {
    color: "#001F60",
    fontWeight: "bold",
  },

  input: {
    borderWidth: 1,
    borderColor: "#E6E6E6",
    borderRadius: 10,
    backgroundColor: "#FFF",
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 12 : 8,
    fontSize: 14,
  },

  scrollArea: {
    flex: 1,
    marginBottom: 16,
  },

  dayCard: {
    backgroundColor: "#142A75",
    borderRadius: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 7,
  },
  dateText: {
    color: "#FFD700",
    fontWeight: "700",
    marginBottom: 12,
    fontSize: 16,
  },
  amountText: {
    color: "#FFFFFF",
    marginBottom: 8,
    fontSize: 14,
    fontWeight: "600",
  },

  subtitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFD700",
    marginBottom: 8,
    marginTop: 14,
  },

  expenseRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.15)",
    paddingBottom: 4,
  },

  buttonRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
    gap: 12,
  },

  printButton: {
    flex: 1,
    backgroundColor: "#4CAF50",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginLeft: 8,
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
    marginRight: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  buttonText: {
    color: "#001F60",
    fontWeight: "bold",
    fontSize: 14,
  },

  formContainer: {
    flex: 1,
    backgroundColor: "#FFF",
    paddingHorizontal: 16,
    paddingTop: 30,
    paddingBottom: 30,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#001F60",
    marginBottom: 20,
    textAlign: "center",
  },

  expenseRowForm: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  expenseLabel: {
    fontWeight: "600",
    marginBottom: 2,
    color: "#001F60",
  },

  removeExpenseBtn: {
    backgroundColor: "#E53935",
    padding: 10,
    borderRadius: 8,
    marginLeft: 6,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },

  addBtnForm: {
    backgroundColor: "#001F60",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 20,
    marginTop: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  addBtnTextForm: {
    color: "#FFD700",
    fontWeight: "700",
    fontSize: 14,
  },

  submitBtnForm: {
    backgroundColor: "#001F60",
    padding: 14,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  submitText: {
    color: "#FFD700",
    fontWeight: "bold",
    fontSize: 16,
  },
  closeBtnForm: {
    marginTop: 14,
    alignItems: "center",
  },
  closeText: {
    color: "#666",
    fontSize: 14,
  },

  summary: {
    fontSize: 14,
    color: "#FFD700",
    fontWeight: "600",
    marginBottom: 4,
  },

  notificationButton: {
    position: "relative",
    width: 36,
    height: 36,
    marginRight: -6,
    marginTop: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  notificationBadge: {
    position: "absolute",
    top: 2,
    right: 2,
    backgroundColor: "red",
    borderRadius: 10,
    minWidth: 16,
    height: 16,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 3,
    zIndex: 10,
  },
  notificationBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
});

export default Home;