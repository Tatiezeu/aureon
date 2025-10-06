import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import Ionicons from "react-native-vector-icons/Ionicons";
import Svg, { Defs, LinearGradient as SvgGradient, Stop } from "react-native-svg";
import { VictoryBar, VictoryChart, VictoryPie, VictoryAxis } from "victory-native";

const screenWidth = Dimensions.get("window").width;

const Analytics = ({ navigation }) => {
  const income = 14500;
  const expenses = 7020;
  const netProfit = income - expenses;

  const barData = [
    { month: "Jan", value: 3.2 },
    { month: "Feb", value: 4.1 },
    { month: "Mar", value: 2.9 },
    { month: "Apr", value: 3.6 },
  ];

  const pieData = [
    { x: "Food", y: 3500 },
    { x: "Utilities", y: 2000 },
    { x: "Transport", y: 1520 },
  ];

  return (
    <LinearGradient colors={["#001F60", "#0A2B85"]} style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerText}>Accountant Aureon</Text>
          <TouchableOpacity>
            <Ionicons name="download-outline" size={26} color="#E6C367" />
          </TouchableOpacity>
        </View>

        {/* Top Cards */}
        <View style={styles.cardLarge}>
          <Text style={styles.cardLabel}>Total Income</Text>
          <Text style={styles.cardValue}>USD {income.toLocaleString()}</Text>
        </View>

        <View style={styles.row}>
          <View style={styles.cardSmall}>
            <Text style={styles.cardLabel}>Total Expenses</Text>
            <Text style={styles.cardValue}>USD {expenses.toLocaleString()}</Text>
          </View>
          <View style={[styles.cardSmall, { backgroundColor: "#D8EACC" }]}>
            <Text style={[styles.cardLabel, { color: "#2C5E1A" }]}>Net Profit</Text>
            <Text style={[styles.cardValue, { color: "#2C5E1A" }]}>
              USD {netProfit.toLocaleString()}
            </Text>
          </View>
        </View>

        {/* Charts */}
        <Text style={styles.sectionTitle}>Monthly Income vs Expenses</Text>
        <View style={styles.chartContainer}>
          {/* Bar Chart */}
          <VictoryChart domainPadding={20} width={screenWidth - 40} height={250}>
            <VictoryAxis
              tickFormat={(t) => t}
              style={{
                tickLabels: { fill: "#E6C367", fontSize: 12 },
                axis: { stroke: "#E6C367" },
              }}
            />
            <VictoryAxis
              dependentAxis
              style={{
                tickLabels: { fill: "#E6C367", fontSize: 12 },
                axis: { stroke: "#E6C367" },
                grid: { stroke: "rgba(230,195,103,0.3)" },
              }}
            />
            <VictoryBar
              data={barData}
              x="month"
              y="value"
              barWidth={25}
              style={{
                data: { fill: "#E6C367", borderRadius: 4 },
              }}
            />
          </VictoryChart>

          {/* Pie Chart with gradient */}
          <View style={{ alignItems: "center", marginTop: 20 }}>
            <Svg width={0} height={0}>
              <Defs>
                <SvgGradient id="goldGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <Stop offset="0%" stopColor="#E6C367" stopOpacity="1" />
                  <Stop offset="100%" stopColor="#BFA24C" stopOpacity="1" />
                </SvgGradient>
              </Defs>
            </Svg>
            <VictoryPie
              data={pieData}
              width={screenWidth - 40}
              height={250}
              innerRadius={50}
              labelRadius={90}
              colorScale={["url(#goldGradient)", "url(#goldGradient)", "url(#goldGradient)"]}
              style={{
                labels: { fill: "#E6C367", fontSize: 12 },
                data: { stroke: "#0A2B85", strokeWidth: 2 },
              }}
            />
          </View>
        </View>

        {/* Insights */}
        <Text style={styles.sectionTitle}>Performance Insights</Text>
        <View style={styles.insightsBox}>
          <Text style={styles.insightText}>⬆ Income increased by 8% this month</Text>
          <Text style={styles.insightText}>⬇ Expenses rose by 3% in health category</Text>
          <Text style={styles.insightText}>
            💡 Your top earning source: Online Business (USD 2,000.00)
          </Text>
        </View>
      </ScrollView>

      {/* Bottom Nav */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate("Home")}>
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
    </LinearGradient>
  );
};

export default Analytics;

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginTop: 15,
  },
  headerText: {
    fontSize: 22,
    color: "#E6C367",
    fontWeight: "bold",
  },
  cardLarge: {
    backgroundColor: "#E6C367",
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 18,
    marginTop: 15,
  },
  cardSmall: {
    flex: 1,
    backgroundColor: "#E6C367",
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 6,
  },
  row: {
    flexDirection: "row",
    marginTop: 10,
    paddingHorizontal: 14,
  },
  cardLabel: {
    fontSize: 14,
    color: "#3A2E00",
  },
  cardValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#3A2E00",
    marginTop: 4,
  },
  sectionTitle: {
    color: "#E6C367",
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 20,
    marginHorizontal: 20,
  },
  chartContainer: {
    marginTop: 10,
    backgroundColor: "#142A75",
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  insightsBox: {
    backgroundColor: "#142A75",
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 12,
    padding: 12,
  },
  insightText: {
    color: "#E6C367",
    marginBottom: 4,
    fontSize: 13,
  },
  bottomNav: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    alignItems: "center",
    backgroundColor: "#142A75",
    paddingVertical: 12,
    position: "absolute",
    bottom: 0,
    width: "100%",
    borderTopWidth: 0.6,
    borderTopColor: "#E6C367",
  },
  navItem: { alignItems: "center", justifyContent: "center", width: "25%" },
  navText: { color: "#E6C367", fontSize: 12, marginTop: 2, fontWeight: "600" },
});