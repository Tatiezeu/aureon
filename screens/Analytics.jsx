import React from "react";
import { View, Text, StyleSheet, ScrollView, Dimensions, SafeAreaView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BarChart, PieChart } from "react-native-chart-kit";

const screenWidth = Dimensions.get("window").width;

const Analytics = () => {
  const barData = {
    labels: ["Jan", "Feb", "Mar", "Apr"],
    datasets: [
      {
        data: [4000000, 3000000, 3500000, 2800000], // Example FCFA values
      },
    ],
  };

  const pieData = [
    {
      name: "Food",
      amount: 500000,
      color: "#E6C367",
      legendFontColor: "#fff",
      legendFontSize: 14,
    },
    {
      name: "Transport",
      amount: 250000,
      color: "#FFD700",
      legendFontColor: "#fff",
      legendFontSize: 14,
    },
    {
      name: "Other",
      amount: 120000,
      color: "#B8860B",
      legendFontColor: "#fff",
      legendFontSize: 14,
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerText}>Analytics Overview</Text>
          <Ionicons name="stats-chart-outline" size={24} color="#E6C367" />
        </View>

        {/* Summary Cards */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryCard}>
            <Text style={styles.cardTitle}>Total Income</Text>
            <Text style={styles.cardValue}>FCFA 14,500,000</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.cardTitle}>Total Expenses</Text>
            <Text style={styles.cardValue}>FCFA 7,020,000</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.cardTitle}>Net Profit</Text>
            <Text style={styles.cardValue}>FCFA 7,480,000</Text>
          </View>
        </View>

        {/* Bar Chart */}
        <Text style={styles.sectionTitle}>Monthly Income vs Expenses</Text>
        <BarChart
          data={barData}
          width={screenWidth - 32}
          height={220}
          chartConfig={{
            backgroundGradientFrom: "#001F60",
            backgroundGradientTo: "#001F60",
            color: (opacity = 1) => `rgba(230, 195, 103, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
            barPercentage: 0.5,
          }}
          style={styles.chart}
        />

        {/* Pie Chart */}
        <Text style={styles.sectionTitle}>Expense Breakdown</Text>
        <PieChart
          data={pieData}
          width={screenWidth - 16}
          height={220}
          accessor={"amount"}
          backgroundColor={"transparent"}
          paddingLeft={"15"}
          chartConfig={{
            backgroundGradientFrom: "#001F60",
            backgroundGradientTo: "#001F60",
            color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
          }}
          absolute
        />
      </ScrollView>
    </SafeAreaView>
  );
};

export default Analytics;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#001F60",
  },
  container: {
    flex: 1,
    backgroundColor: "#001F60",
    paddingHorizontal: 16,
    paddingTop: 40,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  headerText: {
    fontSize: 22,
    color: "#E6C367",
    fontWeight: "bold",
  },
  summaryContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  summaryCard: {
    backgroundColor: "#E6C367",
    borderRadius: 10,
    padding: 10,
    flex: 1,
    marginHorizontal: 4,
    alignItems: "center",
  },
  cardTitle: {
    fontSize: 13,
    color: "#3A2E00",
  },
  cardValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#3A2E00",
    marginTop: 4,
  },
  sectionTitle: {
    color: "#E6C367",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
    marginTop: 10,
  },
  chart: {
    borderRadius: 8,
    marginBottom: 20,
    
  },
});
