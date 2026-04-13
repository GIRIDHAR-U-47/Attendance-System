import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, SafeAreaView, Dimensions, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import axios from 'axios';
import { MODEL_URL } from '../config';

const { width, height } = Dimensions.get('window');

const COLORS = {
  primary: '#6A1B9A',
  secondary: '#000000ff',
  white: '#FFFFFF',
  background: '#FAF7FB',
  cardBg: '#FFFFFF',
  textSecondary: '#757575',
};

export default function LiveAttendanceScreen({ navigation, route }) {
  const { subject } = route.params;
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const [presentStudents, setPresentStudents] = useState([]);
  const cameraRef = useRef(null);

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={styles.message}>We need your permission to show the camera</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleScanFeature = async () => {
    if (cameraRef.current && !scanning) {
      setScanning(true);
      try {
        const photo = await cameraRef.current.takePictureAsync({ base64: true });
        
        const response = await axios.post(`${MODEL_URL}/scan_face_mobile`, {
          subject_code: subject.code,
          image: photo.base64
        });
        
        if (response.data.success) {
           const studentData = response.data.student;
           const matchedStudent = {
             id: Math.random().toString(),
             name: studentData.name,
             rollNo: studentData.roll_number,
             time: new Date().toLocaleTimeString(),
           };
           setPresentStudents((prev) => [matchedStudent, ...prev]);
        } else {
           Alert.alert('Scan Failed', response.data.message);
        }
      } catch (error) {
        console.error(error);
        Alert.alert('Error', 'Could not reach Model server.');
      } finally {
        setScanning(false);
      }
    }
  };

  const navToRegistration = () => {
    navigation.navigate('Registration');
  };

  const finishSession = () => {
    navigation.navigate('AttendanceSummary', { subject, presentStudents });
  };

  const renderStudent = ({ item }) => (
    <View style={styles.studentCard}>
      <View>
        <Text style={styles.studentName}>{item.name}</Text>
        <Text style={styles.studentRollNo}>{item.rollNo}</Text>
      </View>
      <Text style={styles.timeText}>{item.time}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.subjectText}>{subject.code} - Live Mode</Text>
        <Text style={styles.countText}>Total: {presentStudents.length}</Text>
      </View>

      <View style={styles.cameraContainer}>
        <CameraView style={styles.camera} facing="back" ref={cameraRef}>
          {scanning && (
            <View style={styles.scanOverlay}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.scanningText}>Analyzing Face...</Text>
            </View>
          )}
        </CameraView>
      </View>

      <View style={styles.controlsRow}>
        <TouchableOpacity style={styles.scanButton} onPress={handleScanFeature} disabled={scanning}>
          <Text style={styles.scanButtonText}>MARK ATTENDENCE</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.registerButton} onPress={navToRegistration}>
          <Text style={styles.registerButtonText}>Register New</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.listContainer}>
        <Text style={styles.listTitle}>Recent Recognitions</Text>
        <FlatList
          data={presentStudents}
          keyExtractor={(item) => item.id}
          renderItem={renderStudent}
          ListEmptyComponent={<Text style={styles.emptyText}>No students marked yet.</Text>}
        />
      </View>

      <TouchableOpacity style={styles.finishButton} onPress={finishSession}>
        <Text style={styles.finishButtonText}>Finish & Review Session</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { padding: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  subjectText: { color: COLORS.primary, fontSize: 18, fontWeight: '800' },
  countText: { color: COLORS.secondary, fontSize: 16, fontWeight: '700' },
  
  cameraContainer: { height: height * 0.45, paddingHorizontal: 15, borderRadius: 16, overflow: 'hidden' },
  camera: { flex: 1, borderRadius: 16 },
  scanOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.7)', justifyContent: 'center', alignItems: 'center', borderRadius: 16 },
  scanningText: { color: COLORS.primary, marginTop: 10, fontWeight: 'bold' },

  controlsRow: { flexDirection: 'row', padding: 15, justifyContent: 'space-between' },
  scanButton: { flex: 1, backgroundColor: COLORS.primary, padding: 15, borderRadius: 12, marginRight: 10, alignItems: 'center', elevation: 3 },
  scanButtonText: { color: COLORS.white, fontWeight: 'bold', fontSize: 16 },
  registerButton: { flex: 0.6, backgroundColor: COLORS.white, padding: 15, borderRadius: 12, alignItems: 'center', borderWidth: 1.5, borderColor: COLORS.primary },
  registerButtonText: { color: COLORS.primary, fontWeight: 'bold', fontSize: 16 },

  listContainer: { flex: 1, paddingHorizontal: 15 },
  listTitle: { color: COLORS.textSecondary, marginBottom: 10, fontWeight: '600', fontSize: 14 },
  studentCard: { backgroundColor: COLORS.cardBg, padding: 15, borderRadius: 12, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#EDE7F6', elevation: 1 },
  studentName: { color: '#333', fontSize: 16, fontWeight: 'bold' },
  studentRollNo: { color: COLORS.textSecondary, fontSize: 14, marginTop: 2 },
  timeText: { color: COLORS.primary, fontSize: 12, fontWeight: '600' },
  emptyText: { color: COLORS.textSecondary, textAlign: 'center', marginTop: 20 },

  finishButton: { backgroundColor: '#4A148C', margin: 15, padding: 18, borderRadius: 12, alignItems: 'center', elevation: 4 },
  finishButtonText: { color: COLORS.white, fontWeight: 'bold', fontSize: 16 },
  
  message: { textAlign: 'center', paddingBottom: 20, color: '#333', fontWeight: '600' },
  button: { backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 },
  buttonText: { color: COLORS.white, fontWeight: 'bold' },
});
