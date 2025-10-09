// screens/Notifications.jsx
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  SafeAreaView,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";

const initialNotifications = [
  {
    id: "1",
    title: "Report Generated",
    message: "Your monthly report for September is now ready to view.",
    timestamp: "10:45 AM",
    read: false,
  },
  {
    id: "2",
    title: "New Feature Update",
    message: "Discover the new analytics dashboard we've added.",
    timestamp: "Yesterday",
    read: false,
  },
  {
    id: "3",
    title: "Backup Completed",
    message: "Your data backup was completed successfully.",
    timestamp: "2 days ago",
    read: true,
  },
  {
    id: "4",
    title: "Expense Alert",
    message: "Expenses in the 'Bar' category increased by 12%.",
    timestamp: "3 days ago",
    read: false,
  },
];

const Notifications = () => {
  const navigation = useNavigation();
  const [notifications, setNotifications] = useState(initialNotifications);
  const [selectedNotification, setSelectedNotification] = useState(null);

  const handlePress = (item) => {
    // Mark as read
    setNotifications((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, read: true } : n))
    );
    setSelectedNotification(item);
  };

  const handleClearAll = () => {
    setNotifications([]);
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.notificationCard}
      onPress={() => handlePress(item)}
    >
      <View style={styles.notificationLeft}>
        {!item.read && <View style={styles.unreadDot} />}
      </View>
      <View style={styles.notificationBody}>
        <Text style={styles.notificationTitle}>{item.title}</Text>
        <Text style={styles.notificationMessage} numberOfLines={1}>
          {item.message}
        </Text>
      </View>
      <Text style={styles.notificationTime}>{item.timestamp}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate("Home")}>
          <Ionicons name="arrow-back" size={24} color="#E6C367" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={{ width: 24 }} /> 
      </View>

      {/* Notifications List */}
      {notifications.length > 0 ? (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="notifications-off-outline" size={50} color="#E6C367" />
          <Text style={styles.emptyText}>No notifications</Text>
        </View>
      )}

      {/* Clear All Button */}
      {notifications.length > 0 && (
        <TouchableOpacity style={styles.clearButton} onPress={handleClearAll}>
          <Text style={styles.clearButtonText}>Clear All</Text>
        </TouchableOpacity>
      )}

      {/* Notification Modal */}
      <Modal
        visible={!!selectedNotification}
        animationType="slide"
        transparent
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedNotification && (
              <>
                <Text style={styles.modalTitle}>{selectedNotification.title}</Text>
                <Text style={styles.modalMessage}>{selectedNotification.message}</Text>
                <TouchableOpacity
                  style={styles.closeModalBtn}
                  onPress={() => setSelectedNotification(null)}
                >
                  <Text style={styles.closeModalText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default Notifications;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#001F60" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(230, 195, 103, 0.2)",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#E6C367",
    textAlign: "center",
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    paddingBottom: 80,
  },
  notificationCard: {
    flexDirection: "row",
    backgroundColor: "#142A75",
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    alignItems: "center",
  },
  notificationLeft: {
    width: 20,
    alignItems: "center",
  },
  unreadDot: {
    width: 10,
    height: 10,
    backgroundColor: "#E6C367",
    borderRadius: 5,
  },
  notificationBody: {
    flex: 1,
    marginHorizontal: 10,
  },
  notificationTitle: {
    color: "#E6C367",
    fontSize: 16,
    fontWeight: "bold",
  },
  notificationMessage: {
    color: "#FFFFFF",
    fontSize: 14,
    opacity: 0.8,
    marginTop: 2,
  },
  notificationTime: {
    color: "#E6C367",
    fontSize: 12,
    opacity: 0.7,
  },
  clearButton: {
    backgroundColor: "#E6C367",
    margin: 20,
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: "center",
  },
  clearButtonText: {
    color: "#001F60",
    fontWeight: "bold",
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    color: "#E6C367",
    fontSize: 16,
    marginTop: 10,
    opacity: 0.8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 20,
    width: "100%",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#001F60",
    marginBottom: 10,
  },
  modalMessage: {
    fontSize: 16,
    color: "#333",
    marginBottom: 20,
  },
  closeModalBtn: {
    backgroundColor: "#001F60",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  closeModalText: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 16,
  },
});
