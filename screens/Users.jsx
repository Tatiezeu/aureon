import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  Modal,
  TextInput,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { useNavigation } from "@react-navigation/native";

export default function Users() {
  const navigation = useNavigation();
  const [selectedUser, setSelectedUser] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  const [updateModalVisible, setUpdateModalVisible] = useState(false);
  const [userToUpdate, setUserToUpdate] = useState(null);

  const [selectedRequest, setSelectedRequest] = useState(null);
  const [requestModalVisible, setRequestModalVisible] = useState(false);

  const [addUserModalVisible, setAddUserModalVisible] = useState(false);

  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    role: "Accountant",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const [users] = useState([
    { id: "1", name: "John Doe", role: "Admin", status: "Active", email: "john@example.com", phone: "+237 670000000", password: "123456" },
    { id: "2", name: "Jane Smith", role: "Accountant", status: "Inactive", email: "jane@example.com", phone: "+237 680000000", password: "123456" },
    { id: "3", name: "Michael Johnson", role: "Director", status: "Active", email: "michael@example.com", phone: "+237 690000000", password: "123456" },
  ]);

  const [requests, setRequests] = useState([
    { id: "r1", title: "Switch Account", message: "John Doe requested to switch to Director", timestamp: "2025-10-07 10:15", status: "Pending" },
    { id: "r2", title: "Switch Account", message: "Jane Smith requested to switch to Director", timestamp: "2025-10-06 16:42", status: "Pending" },
  ]);

  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.status === "Active").length;
  const inactiveUsers = totalUsers - activeUsers;

  const handleAddUser = () => {
    if (!newUser.name || !newUser.email || !newUser.phone || !newUser.password || !newUser.confirmPassword) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }
    if (newUser.password !== newUser.confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }
    Alert.alert("Success", "User added successfully!");
    setAddUserModalVisible(false);
    setNewUser({ name: "", email: "", role: "Accountant", phone: "", password: "", confirmPassword: "" });
  };

  const handleResolveRequest = (requestId) => {
    setRequests((prev) =>
      prev.map((req) => (req.id === requestId ? { ...req, status: "Resolved" } : req))
    );
    setRequestModalVisible(false);
  };

  const handleIgnoreRequest = (requestId) => {
    setRequests((prev) =>
      prev.map((req) => (req.id === requestId ? { ...req, status: "Ignored" } : req))
    );
    setRequestModalVisible(false);
  };

  const handleSaveUser = () => {
    Alert.alert("Success", "Changes saved successfully!");
    setUpdateModalVisible(false);
  };

  const renderUserRow = ({ item }) => (
    <View style={styles.tableRow}>
      <Text style={[styles.tableCell, styles.nameCell]} numberOfLines={1}>{item.name}</Text>
      <Text style={[styles.tableCell, styles.roleCell]}>{item.role}</Text>
      <Text style={[styles.tableCell, styles.statusCell, item.status === "Active" ? styles.activeStatus : styles.inactiveStatus]}>
        {item.status}
      </Text>
      <TouchableOpacity
        style={styles.manageButton}
        onPress={() => {
          setSelectedUser(item);
          setModalVisible(true);
        }}
      >
        <Ionicons name="ellipsis-vertical" size={18} color="#E6C367" />
      </TouchableOpacity>
    </View>
  );

  const renderRequestItem = ({ item }) => (
    <TouchableOpacity
      style={styles.notificationItem}
      onPress={() => {
        setSelectedRequest(item);
        setRequestModalVisible(true);
      }}
    >
      <View style={styles.notificationTextContainer}>
        <Text style={styles.notificationTitle}>{item.title}</Text>
        <Text style={styles.notificationMessage} numberOfLines={1}>{item.message}</Text>
        <Text style={[styles.requestStatus, item.status === "Resolved" ? styles.resolved : item.status === "Ignored" ? styles.ignored : styles.pending]}>
          {item.status}
        </Text>
        <Text style={styles.notificationTimestamp}>{item.timestamp}</Text>
      </View>
      <Ionicons name="ellipsis-vertical" size={20} color="#E6C367" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.headerContainer}>
          <Text style={styles.headerTitle}>Users Management</Text>
          <TouchableOpacity
            style={styles.settingsIcon}
            onPress={() => navigation.navigate("Settings")} // 👈 Navigate to settings page
          >
            <Ionicons name="settings-outline" size={24} color="#E6C367" />
          </TouchableOpacity>
        </View>


        {/* Cards */}
        <View style={styles.cardFullWidth}>
          <Ionicons name="people" size={28} color="#E6C367" />
          <Text style={styles.cardNumber}>{totalUsers}</Text>
          <Text style={styles.cardLabel}>Total Users</Text>
        </View>

        <View style={styles.twoCardsContainer}>
          <View style={styles.cardHalf}>
            <Ionicons name="person-circle" size={28} color="#00D26A" />
            <Text style={styles.cardNumber}>{activeUsers}</Text>
            <Text style={styles.cardLabel}>Active Users</Text>
          </View>
          <View style={styles.cardHalf}>
            <Ionicons name="person-remove" size={28} color="#FF4D4D" />
            <Text style={styles.cardNumber}>{inactiveUsers}</Text>
            <Text style={styles.cardLabel}>Inactive Users</Text>
          </View>
        </View>

        {/* Manage Users Header with Add User Button */}
        <View style={styles.manageHeader}>
          <Text style={styles.manageTitle}>Manage Users</Text>
          <TouchableOpacity
            style={styles.addUserButton}
            onPress={() => setAddUserModalVisible(true)}
          >
            <Text style={styles.addUserButtonText}>+ Add User</Text>
          </TouchableOpacity>
        </View>

        {/* Users Table */}
        <View style={styles.tableContainer}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.nameCell]}>Name</Text>
            <Text style={[styles.tableHeaderText, styles.roleCell]}>Role</Text>
            <Text style={[styles.tableHeaderText, styles.statusCell]}>Status</Text>
            <Text style={[styles.tableHeaderText, styles.actionCell]}></Text>
          </View>
          <FlatList
            data={users}
            renderItem={renderUserRow}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
          />
        </View>

        {/* Manage Requests */}
        <Text style={styles.manageTitle}>Manage Requests</Text>
        <FlatList
          data={requests}
          renderItem={renderRequestItem}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          style={styles.requestsList}
        />
      </ScrollView>

      {/* User Modal */}
      <Modal transparent visible={modalVisible} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.modalCloseIcon}
              onPress={() => setModalVisible(false)}
            >
              <Ionicons name="close" size={22} color="#FFF" />
            </TouchableOpacity>
            {selectedUser && (
              <>
                <Ionicons name="person-circle-outline" size={55} color="#E6C367" style={styles.modalAvatar} />
                <Text style={styles.modalName}>{selectedUser.name}</Text>
                <View style={styles.infoRow}><Text style={styles.infoLabel}>Email:</Text><Text style={styles.infoValue}>{selectedUser.email}</Text></View>
                <View style={styles.infoRow}><Text style={styles.infoLabel}>Phone:</Text><Text style={styles.infoValue}>{selectedUser.phone}</Text></View>
                <View style={styles.infoRow}><Text style={styles.infoLabel}>Role:</Text><Text style={styles.infoValue}>{selectedUser.role}</Text></View>
                <View style={styles.infoRow}><Text style={styles.infoLabel}>Status:</Text><Text style={[styles.infoValue, selectedUser.status === "Active" ? styles.activeStatus : styles.inactiveStatus]}>{selectedUser.status}</Text></View>
                <View style={styles.modalActions}>
                  <TouchableOpacity style={[styles.modalButton, styles.deleteBtn]}>
                    <Ionicons name="trash-outline" size={18} color="#FFF" />
                    <Text style={styles.modalBtnText}>Delete</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.modalButton, styles.suspendBtn]}>
                    <Ionicons name="pause-circle-outline" size={18} color="#FFF" />
                    <Text style={styles.modalBtnText}>Suspend</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.updateBtn]}
                    onPress={() => {
                      setUserToUpdate(selectedUser);
                      setModalVisible(false);
                      setUpdateModalVisible(true);
                    }}
                  >
                    <Ionicons name="create-outline" size={18} color="#FFF" />
                    <Text style={styles.modalBtnText}>Update</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Update User Modal */}
      <Modal transparent visible={updateModalVisible} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.modalCloseIcon}
              onPress={() => setUpdateModalVisible(false)}
            >
              <Ionicons name="close" size={22} color="#FFF" />
            </TouchableOpacity>
            {userToUpdate && (
              <>
                <Text style={styles.modalName}>Update User</Text>
                <TextInput
                  style={styles.input}
                  value={userToUpdate.name}
                  onChangeText={(text) => setUserToUpdate({ ...userToUpdate, name: text })}
                />
                <TextInput
                  style={styles.input}
                  value={userToUpdate.email}
                  onChangeText={(text) => setUserToUpdate({ ...userToUpdate, email: text })}
                />
                <TextInput
                  style={styles.input}
                  value={userToUpdate.phone}
                  onChangeText={(text) => setUserToUpdate({ ...userToUpdate, phone: text })}
                />
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={userToUpdate.role}
                    onValueChange={(value) => setUserToUpdate({ ...userToUpdate, role: value })}
                    dropdownIconColor="#E6C367"
                    style={styles.picker}
                  >
                    <Picker.Item label="Accountant" value="Accountant" />
                    <Picker.Item label="Director" value="Director" />
                    <Picker.Item label="Admin" value="Admin" />
                  </Picker>
                </View>
                <TextInput
                  style={styles.input}
                  value={userToUpdate.password}
                  secureTextEntry
                  onChangeText={(text) => setUserToUpdate({ ...userToUpdate, password: text })}
                />
                <TouchableOpacity style={styles.submitButton} onPress={handleSaveUser}>
                  <Text style={styles.submitButtonText}>Save</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Request Modal */}
      <Modal transparent visible={requestModalVisible} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.modalCloseIcon}
              onPress={() => setRequestModalVisible(false)}
            >
              <Ionicons name="close" size={22} color="#FFF" />
            </TouchableOpacity>
            {selectedRequest && (
              <>
                <Text style={styles.modalName}>{selectedRequest.title}</Text>
                <Text style={styles.modalInfo}>{selectedRequest.message}</Text>
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.updateBtn]}
                    onPress={() => handleResolveRequest(selectedRequest.id)}
                  >
                    <Ionicons name="checkmark-done-outline" size={18} color="#FFF" />
                    <Text style={styles.modalBtnText}>Resolve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.deleteBtn]}
                    onPress={() => handleIgnoreRequest(selectedRequest.id)}
                  >
                    <Ionicons name="close-circle-outline" size={18} color="#FFF" />
                    <Text style={styles.modalBtnText}>Ignore</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Add User Modal */}
      <Modal transparent visible={addUserModalVisible} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.modalCloseIcon}
              onPress={() => setAddUserModalVisible(false)}
            >
              <Ionicons name="close" size={22} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.modalName}>Add New User</Text>
            <TextInput
              style={styles.input}
              placeholder="Name"
              placeholderTextColor="#ccc"
              value={newUser.name}
              onChangeText={(text) => setNewUser({ ...newUser, name: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#ccc"
              value={newUser.email}
              onChangeText={(text) => setNewUser({ ...newUser, email: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="Phone"
              placeholderTextColor="#ccc"
              value={newUser.phone}
              onChangeText={(text) => setNewUser({ ...newUser, phone: text })}
            />
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={newUser.role}
                onValueChange={(value) => setNewUser({ ...newUser, role: value })}
                dropdownIconColor="#E6C367"
                style={styles.picker}
              >
                <Picker.Item label="Accountant" value="Accountant" />
                <Picker.Item label="Director" value="Director" />
                <Picker.Item label="Admin" value="Admin" />
              </Picker>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#ccc"
              secureTextEntry
              value={newUser.password}
              onChangeText={(text) => setNewUser({ ...newUser, password: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="Confirm Password"
              placeholderTextColor="#ccc"
              secureTextEntry
              value={newUser.confirmPassword}
              onChangeText={(text) => setNewUser({ ...newUser, confirmPassword: text })}
            />
            <TouchableOpacity style={styles.submitButton} onPress={handleAddUser}>
              <Text style={styles.submitButtonText}>Submit</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

    const styles = StyleSheet.create({
          container: { flex: 1, backgroundColor: "#001F60" },
          scrollContainer: { padding: 16, paddingBottom: 40 },
          headerContainer: {
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
            marginTop: 30,
            marginBottom: 16,
            position: "relative",
          },
          settingsIcon: {
            position: "absolute",
            right: 0,
            top: 0,
            padding: 6,
          },
          headerTitle: {
            color: "#E6C367",
            fontSize: 22,
            fontWeight: "bold",
            marginTop: 30,
            marginBottom: 16,
            textAlign: "center",
          },
      
          // ─── Cards ────────────────────────────────────────────────
          cardFullWidth: {
            backgroundColor: "#0D2B7E",
            borderRadius: 12,
            padding: 16,
            alignItems: "center",
            marginBottom: 12,
            width: "100%",
          },
          twoCardsContainer: {
            flexDirection: "row",
            justifyContent: "space-between",
            marginBottom: 20,
          },
          cardHalf: {
            flex: 1,
            backgroundColor: "#0D2B7E",
            borderRadius: 12,
            padding: 14,
            alignItems: "center",
            marginHorizontal: 4,
          },
          cardNumber: {
            color: "#FFF",
            fontSize: 20,
            fontWeight: "bold",
            marginTop: 6,
          },
          cardLabel: {
            color: "#E6C367",
            fontSize: 13,
            marginTop: 2,
            textAlign: "center",
          },
      
          // ─── Manage Header ────────────────────────────────────────
          manageHeader: {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 10,
            marginBottom: 8,
          },
          manageTitle: {
            color: "#E6C367",
            fontSize: 18,
            fontWeight: "bold",
          },
          addUserButton: {
            backgroundColor: "#E6C367",
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 8,
          },
          addUserButtonText: {
            color: "#001F60",
            fontWeight: "bold",
            fontSize: 14,
          },
      
          // ─── Table ────────────────────────────────────────────────
          tableContainer: {
            backgroundColor: "#0D2B7E",
            borderRadius: 12,
            paddingHorizontal: 8,
            paddingVertical: 4,
            marginBottom: 20,
          },
          tableHeader: {
            flexDirection: "row",
            borderBottomWidth: 1,
            borderBottomColor: "#142A75",
            paddingVertical: 8,
            marginBottom: 4,
          },
          tableHeaderText: { color: "#E6C367", fontWeight: "bold", fontSize: 13 },
          tableRow: {
            flexDirection: "row",
            alignItems: "center",
            paddingVertical: 10,
            borderBottomWidth: 1,
            borderBottomColor: "#142A75",
          },
          tableCell: { color: "#FFF", fontSize: 13 },
          nameCell: { flex: 2 },
          roleCell: { flex: 1 },
          statusCell: { flex: 1, textAlign: "center" },
          actionCell: { width: 30, textAlign: "center" },
          activeStatus: { color: "#00D26A", fontWeight: "bold" },
          inactiveStatus: { color: "#FF4D4D", fontWeight: "bold" },
          manageButton: { width: 30, alignItems: "center" },
      
          // ─── Notifications / Requests ─────────────────────────────
          notificationItem: {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            backgroundColor: "#0D2B7E",
            borderRadius: 10,
            padding: 12,
            marginVertical: 6,
          },
          notificationTextContainer: { flex: 1, marginRight: 10 },
          notificationTitle: {
            color: "#E6C367",
            fontWeight: "bold",
            fontSize: 14,
            marginBottom: 2,
          },
          notificationMessage: { color: "#FFF", fontSize: 13 },
          notificationTimestamp: {
            color: "#E6C367",
            fontSize: 11,
            marginTop: 2,
            opacity: 0.8,
          },
          requestStatus: { fontSize: 12, fontWeight: "bold" },
          resolved: { color: "#00D26A" },
          ignored: { color: "#FF4D4D" },
          pending: { color: "#FFD700" },
      
          // ─── Modal ────────────────────────────────────────────────
          modalOverlay: {
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.7)",
            justifyContent: "center",
            alignItems: "center",
          },
          modalContent: {
            width: "85%",
            backgroundColor: "#0D2B7E",
            borderRadius: 14,
            padding: 20,
            position: "relative",
          },
          modalCloseIcon: { position: "absolute", top: 10, right: 10, zIndex: 1 },
          modalName: {
            color: "#E6C367",
            fontSize: 20,
            fontWeight: "bold",
            textAlign: "center",
            marginTop: 8,
            marginBottom: 8,
          },
          modalInfo: {
            color: "#FFF",
            textAlign: "center",
            fontSize: 14,
            marginBottom: 10,
          },
          modalAvatar: { alignSelf: "center", marginBottom: 6 },
          infoRow: {
            flexDirection: "row",
            justifyContent: "space-between",
            marginVertical: 4,
          },
          infoLabel: { color: "#E6C367", fontWeight: "bold" },
          infoValue: { color: "#FFF", flexShrink: 1, textAlign: "right" },
          modalActions: {
            flexDirection: "row",
            justifyContent: "space-between",
            marginTop: 14,
          },
          modalButton: {
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            paddingVertical: 8,
            borderRadius: 8,
            marginHorizontal: 4,
          },
          modalBtnText: { color: "#FFF", fontWeight: "bold", marginLeft: 4, fontSize: 13 },
          deleteBtn: { backgroundColor: "#FF4D4D" },
          suspendBtn: { backgroundColor: "#FFD700" },
          updateBtn: { backgroundColor: "#00D26A" },
      
          // ─── Inputs / Picker ─────────────────────────────────────
          input: {
            backgroundColor: "#142A75",
            color: "#FFF",
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 8,
            marginVertical: 5,
          },
          pickerContainer: {
            backgroundColor: "#142A75",
            borderRadius: 8,
            marginVertical: 5,
          },
          picker: {
            color: "#FFF",
            width: "100%",
          },
      
          // ─── Buttons ─────────────────────────────────────────────
          submitButton: {
            backgroundColor: "#E6C367",
            paddingVertical: 10,
            borderRadius: 8,
            marginTop: 8,
          },
          submitButtonText: {
            color: "#001F60",
            fontWeight: "bold",
            textAlign: "center",
          },
      
          // ─── Update Modal Inputs ────────────────────────────────
          updateInput: {
            backgroundColor: "#142A75",
            color: "#FFF",
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 8,
            marginVertical: 5,
          },
    });

