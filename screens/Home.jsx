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

/*
  Home.jsx - Updated to fix "fields required" when creating reports.
  Changes:
  - Robust client-side validation before sending create/update requests.
  - Final payload includes both backend-friendly field names:
      - montant_hebergement, montant_bar, montant_cuisine (numeric)
      - hebergement, bar, cuisine (string formatted as "1234.00") — included in case backend expects these names
  - Expenses amounts normalized to numeric & string forms depending on backend needs.
  - Pre-check logic uses exact matching (hotel_name + YYYY-MM-DD).
  - displayReport remains single source-of-truth for rendering.
*/

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
    <View>
      <Text style={{ fontWeight: "600", marginBottom: 4, color: "#001F60" }}>{label}</Text>
      <View style={[styles.input, { marginBottom: 10 }]}>
        <TextInput value={value} onChangeText={onChangeText} keyboardType={keyboardType || "default"} style={{ padding: 10 }} />
      </View>
    </View>
  );
}

/* Modal Form */
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // Ensure hotel_name present
    if (!hotel || String(hotel).trim() === "") return { ok: false, message: "Hotel name is required." };

    // At least one of the main amounts should be a valid number (or allow zero? Backend may accept 0)
    // We'll consider empty strings as 0 — but ensure numeric conversion valid
    const h = toNumber(hebergement);
    const b = toNumber(bar);
    const c = toNumber(cuisine);
    if (!Number.isFinite(h) || !Number.isFinite(b) || !Number.isFinite(c)) {
      return { ok: false, message: "Montant fields must be numeric." };
    }

    // Validate expenses entries: labels can be empty but if amount provided must be numeric; ignore empty rows
    for (let i = 0; i < expenses.length; i++) {
      const e = expenses[i];
      const hasLabel = e.label && String(e.label).trim() !== "";
      const hasAmount = e.amount && String(e.amount).trim() !== "";
      if (hasAmount && !Number.isFinite(toNumber(e.amount))) {
        return { ok: false, message: `Expense amount must be numeric for row ${i + 1}.` };
      }
      // If label present but no amount, allow (some workflows may allow). If backend requires both, we can enforce here.
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

    // Build payload that covers both field-name conventions:
    // - numeric montant_* fields
    // - string hebergement/bar/cuisine fields matching example structure user provided
    const montant_hebergement = Number(toNumber(hebergement).toFixed(2));
    const montant_bar = Number(toNumber(bar).toFixed(2));
    const montant_cuisine = Number(toNumber(cuisine).toFixed(2));

    const hebergement_str = formatNumberString(hebergement);
    const bar_str = formatNumberString(bar);
    const cuisine_str = formatNumberString(cuisine);

    // Normalize expenses: include numeric amount and string amount for compatibility
    const normalizedExpenses = (expenses || [])
      .filter((e) => (e.label && String(e.label).trim() !== "") || (String(e.amount).trim() !== ""))
      .map((e) => {
        const amountNum = Number(toNumber(e.amount).toFixed(2));
        return {
          label: e.label ?? "",
          amount: amountNum,
          amount_str: formatNumberString(e.amount),
          id: e.id, // include id if exists for updates
        };
      });

    // Final payload includes both name patterns. Backend will pick expected fields.
    const payload = {
      hotel_name: hotel,
      // numeric expected fields
      montant_hebergement,
      montant_bar,
      montant_cuisine,
      // string-named fields (your example)
      hebergement: hebergement_str,
      bar: bar_str,
      cuisine: cuisine_str,
      // expenses: include objects with amount numeric (and amount_str just in case)
      expenses: normalizedExpenses.map((e) => {
        const out = { label: e.label, amount: e.amount };
        // some backends may expect string amounts; include if needed
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
      <ScrollView style={styles.formContainer} contentContainerStyle={{ paddingBottom: 40 }}>
        <Text style={styles.formTitle}>{submitLabel} Report</Text>

        <View style={[styles.input, { padding: 0 }]}>
          <Picker selectedValue={hotel} onValueChange={(v) => setHotel(v)} style={{ color: "#001F60" }}>
            <Picker.Item label="Mbolo Hotel" value="Mbolo Hotel" />
            <Picker.Item label="Hotel La Dibamba" value="Hotel La Dibamba" />
          </Picker>
        </View>

        <TouchableOpacity style={[styles.input, { justifyContent: "center" }]} onPress={() => setShowPicker(true)}>
          <Text>{`${date.getDate()}-${months[date.getMonth()]}-${date.getFullYear()}`}</Text>
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

        <Text style={[styles.subtitle, { marginTop: 6 }]}>Expenses</Text>

        {expenses.map((exp, idx) => (
          <View key={idx} style={styles.expenseRowForm}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.expenseLabel}>Label</Text>
              <View style={[styles.input, { marginBottom: 6 }]}>
                <TextInput
                  value={exp.label}
                  onChangeText={(v) => updateExpense(idx, "label", v)}
                  placeholder="e.g. Samson"
                  style={{ padding: 10 }}
                />
              </View>
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.expenseLabel}>Amount</Text>
              <View style={[styles.input, { marginBottom: 6 }]}>
                <TextInput
                  value={exp.amount}
                  onChangeText={(v) => updateExpense(idx, "amount", v)}
                  placeholder="0.00"
                  keyboardType="numeric"
                  style={{ padding: 10 }}
                />
              </View>
            </View>

            <TouchableOpacity style={styles.removeExpenseBtn} onPress={() => removeExpense(idx)} accessibilityLabel="Remove expense">
              <Ionicons name="trash-outline" size={18} color="#FFF" />
            </TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity style={styles.addBtnForm} onPress={addExpense}>
          <Text style={styles.addBtnTextForm}>+ Add Expense</Text>
        </TouchableOpacity>

        <View style={{ marginTop: 6 }}>
          <Text style={styles.summary}>Total Income: {totalIncome.toFixed(2)} FCFA</Text>
          <Text style={styles.summary}>Total Expenses: {totalExpenses.toFixed(2)} FCFA</Text>
          <Text style={styles.summary}>Reste en caisse: {reste.toFixed(2)} FCFA</Text>
        </View>

        <TouchableOpacity style={styles.submitBtnForm} onPress={handleSubmit}>
          <Text style={styles.submitText}>{submitLabel}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.closeBtnForm} onPress={onClose}>
          <Text style={styles.closeText}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/* Main Home */
const Home = () => {
  const navigation = useNavigation();

  const [activeTab, setActiveTab] = useState("mbolo"); // "mbolo" or "dibamba"
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

  /* Helper: find exact match in array by hotel_name + YYYY-MM-DD date */
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

  /* Fetch report with defensive matching */
  const fetchReport = async ({ overrideDate = null, overrideHotel = null } = {}) => {
    setLoading(true);
    try {
      const effectiveDate = overrideDate ? (overrideDate instanceof Date ? overrideDate : new Date(overrideDate)) : date;
      const dateStr = formatDateToYYYYMMDD(effectiveDate);
      const hotelName = overrideHotel ?? getHotelNameForTab(activeTab);

      const url = `${API_URL}?date=${dateStr}&hotel_name=${encodeURIComponent(hotelName)}`;
      console.log("Fetching report URL:", url);

      const res = await axios.get(url);
      const data = res.data;
      console.log("fetchReport raw response:", data);

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
      console.log("fetchReport error:", err.response?.data ?? err.message ?? err);
      Alert.alert("Network", "Failed to fetch report. Check backend and network.");
    } finally {
      setLoading(false);
    }
  };

  /* Create/Update with robust pre-check and correct payload mapping */
  const handleGenerateOrUpdate = async (payload) => {
    try {
      const isUpdate = updateMode && formReport && formReport.id;

      if (!payload.hotel_name) payload.hotel_name = getHotelNameForTab(activeTab);
      const payloadDate = payload.date || payload.created_at || formatDateToYYYYMMDD(date);
      const dateStr = typeof payloadDate === "string" ? payloadDate : formatDateToYYYYMMDD(new Date(payloadDate));

      // Strict pre-check that finds exact match in response data
      if (!isUpdate) {
        try {
          const checkRes = await axios.get(`${API_URL}?date=${dateStr}&hotel_name=${encodeURIComponent(payload.hotel_name)}`);
          const checkData = checkRes.data;
          console.log("pre-check raw response:", checkData);
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
        } catch (err) {
          console.log("pre-check network error (non-blocking):", err.response?.data ?? err.message ?? err);
        }
      }

      const url = isUpdate ? `${API_URL}${formReport.id}/` : API_URL;
      const method = isUpdate ? "put" : "post";

      // Normalize incoming payload fields (client form already did most of this, but ensure here)
      const rawH = payload.montant_hebergement !== undefined ? payload.montant_hebergement : payload.hebergement !== undefined ? payload.hebergement : 0;
      const rawB = payload.montant_bar !== undefined ? payload.montant_bar : payload.bar !== undefined ? payload.bar : 0;
      const rawC = payload.montant_cuisine !== undefined ? payload.montant_cuisine : payload.cuisine !== undefined ? payload.cuisine : 0;

      const montant_hebergement = Number(toNumber(rawH).toFixed(2));
      const montant_bar = Number(toNumber(rawB).toFixed(2));
      const montant_cuisine = Number(toNumber(rawC).toFixed(2));

      // Provide both sets of fields (numeric montant_* and string hebergement/bar/cuisine)
      const finalPayload = {
        hotel_name: payload.hotel_name,
        montant_hebergement,
        montant_bar,
        montant_cuisine,
        hebergement: formatNumberString(rawH),
        bar: formatNumberString(rawB),
        cuisine: formatNumberString(rawC),
        expenses: (payload.expenses || []).map((e) => {
          // ensure numeric amount for backend
          const amountNum = Number(toNumber(e.amount).toFixed(2));
          const obj = { label: e.label ?? "", amount: amountNum };
          if (e.id) obj.id = e.id;
          return obj;
        }),
        created_at: payload.created_at || payload.date || dateStr,
      };

      console.log("Saving report to:", url, "payload:", finalPayload);

      await axios({
        method,
        url,
        headers: { "Content-Type": "application/json" },
        data: finalPayload,
      });

      Alert.alert("Success", isUpdate ? "Report updated successfully" : "Report created successfully");
      setShowAddModal(false);
      setUpdateMode(false);

      // Re-fetch to set displayReport to the newly created/updated report
      await fetchReport({ overrideDate: dateStr, overrideHotel: finalPayload.hotel_name });
    } catch (err) {
      console.log("save error:", err.response?.data ?? err.message ?? err);
      // Provide more helpful error feedback if backend returns validation errors
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
      console.log("print error:", err);
      Alert.alert("Error", "Failed to print report.");
    }
  };

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

          <View style={{ flexDirection: "row", alignItems: "center" }}>
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
              <Ionicons name="add" size={26} color="#001F60" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Net Amount Card */}
        <View style={[styles.cardLarge, { padding: 20 }]}>
          <Text style={styles.cardLabel}>Net Amount</Text>
          <Text style={[styles.cardValue, { fontSize: 22 }]}>{String(Number(displayReste).toFixed(2))} FCFA</Text>
          <Text style={{ color: "#3A2E00", fontSize: 12, marginTop: 6 }}>{displayReport ? displayReport.hotel_name ?? getHotelNameForTab(activeTab) : getHotelNameForTab(activeTab)}</Text>
        </View>

        <View style={styles.row}>
          <View style={[styles.cardSmall, { padding: 14 }]}>
            <Text style={styles.cardLabel}>Total Amount</Text>
            <Text style={styles.cardValue}>{String(Number(displayTotalAmount).toFixed(2))} FCFA</Text>
          </View>
          <View style={[styles.cardSmall, { padding: 14 }]}>
            <Text style={styles.cardLabel}>Total Expenses</Text>
            <Text style={styles.cardValue}>{String(Number(displayTotalExpenses).toFixed(2))} FCFA</Text>
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
            onChange={(e, selectedDate) => {
              setShowDatePicker(false);
              if (selectedDate) setDate(selectedDate);
            }}
          />
        )}

        {/* Main content */}
        <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
          <View style={[styles.dayCard, { padding: 20 }]}>
            <Text style={styles.dateText}>{`Report for ${date.toDateString()} — ${getHotelNameForTab(activeTab)}`}</Text>

            <Text style={styles.amountText}>Montant Hébergement: FCFA {String(Number(displayMontantH).toFixed(2))}</Text>
            <Text style={styles.amountText}>Montant Bar: FCFA {String(Number(displayMontantB).toFixed(2))}</Text>
            <Text style={styles.amountText}>Montant Cuisine: FCFA {String(Number(displayMontantC).toFixed(2))}</Text>

            <Text style={styles.subtitle}>Expenses</Text>

            {(displayExpensesList && displayExpensesList.length) ? (
              displayExpensesList.map((exp, i) => (
                <View key={i} style={styles.expenseRow}>
                  <Text style={{ color: "#FFF", flex: 1 }}>{exp.label || "—"}</Text>
                  <Text style={{ color: "#FFF", flex: 1 }}>FCFA {String(Number(toNumber(exp.amount)).toFixed(2))}</Text>
                </View>
              ))
            ) : (
              <Text style={{ color: "#FFF" }}>No expenses</Text>
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
                <Text style={styles.buttonText}>{displayReport && displayReport.id ? "Update" : "Create"}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.printButton} onPress={handlePrint}>
                <Text style={styles.buttonText}>Print</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        {/* Bottom nav */}
        <View style={styles.bottomNav}>
          <TouchableOpacity style={styles.navItem}>
            <Ionicons name="home-outline" size={22} color="#E6C367" />
            <Text style={styles.navText}>Home</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate("Analytics")}>
            <Ionicons name="bar-chart-outline" size={22} color="#E6C367" />
            <Text style={styles.navText}>Analytics</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate("History")}>
            <Ionicons name="time-outline" size={22} color="#E6C367" />
            <Text style={styles.navText}>History</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate("Settings")}>
            <Ionicons name="settings-outline" size={22} color="#E6C367" />
            <Text style={styles.navText}>Settings</Text>
          </TouchableOpacity>
        </View>

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

/* Styles */
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#001F60" },
  container: { flex: 1, backgroundColor: "#001F60", paddingHorizontal: 20, paddingBottom: 90 },

  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 5 },
  headerText: { fontSize: 22, color: "#FFD700", fontWeight: "bold" },

  addButton: {
    backgroundColor: "#FFD700",
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 3,
  },

  cardLarge: {
    backgroundColor: "#FFD700",
    borderRadius: 20,
    marginTop: 10,
    padding: 20,
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

  subtitle: { fontSize: 18, fontWeight: "bold", color: "#FFD700", marginBottom: 10, marginTop: 14 },

  buttonRow: { flexDirection: "row", justifyContent: "center", gap: 12, marginTop: 12 },

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
  buttonText: { color: "#001F60", fontWeight: "bold", fontSize: 16 },

  bottomNav: { position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", justifyContent: "space-around", backgroundColor: "#142A75", paddingVertical: 12 },
  navItem: { alignItems: "center" },
  navText: { color: "#FFD700", fontSize: 12, marginTop: 4 },

  formContainer: { flex: 1, backgroundColor: "#FFF", padding: 10 },
  formTitle: { fontSize: 22, fontWeight: "bold", color: "#001F60", marginBottom: 16, marginTop: 40, textAlign: "center" },

  input: { borderWidth: 1, borderColor: "#E6E6E6", borderRadius: 10, marginTop: 10, marginBottom: 10, backgroundColor: "#FFF" },
  expenseRowForm: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  expenseLabel: { fontWeight: "600", marginBottom: 4, color: "#001F60" },

  removeExpenseBtn: {
    backgroundColor: "#E53935",
    padding: 10,
    borderRadius: 8,
    marginLeft: 6,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },

  addBtnForm: { backgroundColor: "#001F60", paddingVertical: 10, borderRadius: 8, alignItems: "center", marginBottom: 18, marginTop: 6 },
  addBtnTextForm: { color: "#FFD700", fontWeight: "700" },

  submitBtnForm: { backgroundColor: "#001F60", padding: 16, borderRadius: 14, alignItems: "center", marginTop: 12 },
  submitText: { color: "#FFD700", fontWeight: "bold", fontSize: 16 },
  closeBtnForm: { marginTop: 12, alignItems: "center" },
  closeText: { color: "#999" },

  expenseRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  addBtn: { backgroundColor: "#FFD700", paddingVertical: 12, borderRadius: 10, alignItems: "center", marginBottom: 18 },
  addBtnText: { color: "#001F60", fontWeight: "bold" },
  summary: { fontSize: 16, color: "#131212ff", fontWeight: "700", marginBottom: 6, textAlign: "center" },

  notificationButton: { position: "relative", width: 40, height: 40, marginRight: -4, marginTop: 5, alignItems: "center", justifyContent: "center" },
  notificationBadge: { position: "absolute", top: 3, right: 3, backgroundColor: "red", borderRadius: 10, minWidth: 16, height: 16, justifyContent: "center", alignItems: "center", paddingHorizontal: 3 },
  notificationBadgeText: { color: "#fff", fontSize: 10, fontWeight: "bold" },
});

export default Home;