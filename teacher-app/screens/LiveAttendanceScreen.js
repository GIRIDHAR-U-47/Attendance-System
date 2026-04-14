import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  ActivityIndicator, SafeAreaView, Dimensions, Alert
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { MODEL_URL, API_URL } from '../config';

const { height } = Dimensions.get('window');

const COLORS = {
  primary: '#6A1B9A',
  white: '#FFFFFF',
  background: '#FAF7FB',
  cardBg: '#FFFFFF',
  textSecondary: '#757575',
  success: '#4CAF50',
  error: '#F44336',
};

export default function LiveAttendanceScreen({ navigation, route }) {
  const { subject, teacherId, user } = route.params;
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const [cameraFacing, setCameraFacing] = useState('back');
  const [sessionId, setSessionId] = useState(null);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState('');
  const [stopping, setStopping] = useState(false);
  
  // Track present students with confidence/spoof data
  const [presentStudents, setPresentStudents] = useState([]);
  const presentMetaRef = useRef({ ids: [], confidences: {}, spoof: {} });

  const cameraRef = useRef(null);
  const facultyId = user?.roll_number || teacherId;

  const startSession = useCallback(async () => {
    try {
      const res = await axios.post(`${API_URL}/faculty/start-session/`, {
        subject_code: subject.subject_code || subject.code,
        faculty_id: facultyId,
      });
      if (res.data.success) {
        setSessionId(res.data.session_id);
        setSessionStarted(true);
        setSessionStartTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        console.log('[Session] Started:', res.data.session_id);
      } else {
        Alert.alert('Session Error', res.data.message);
      }
    } catch (e) {
      console.error('Start session error:', e);
      Alert.alert('Error', 'Could not start attendance session. Check backend connection.');
    }
  }, [subject, facultyId]);

  useEffect(() => {
    startSession();
  }, [startSession]);

  if (!permission) return <View style={styles.container} />;
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

  const handleScanFace = async () => {
    if (!cameraRef.current || scanning || !sessionId) return;
    setScanning(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: true });
      const response = await axios.post(`${MODEL_URL}/scan_face_mobile`, {
        subject_code: subject.subject_code || subject.code,
        image: photo.base64,
      });

      if (response.data.success) {
        const studentData = response.data.student;
        const rollNo = studentData.roll_number;
        const confidence = response.data.confidence || null;
        const spoofStatus = response.data.spoof_status || 'LIVE';

        // Avoid duplicate entries in the list
        if (!presentMetaRef.current.ids.includes(rollNo)) {
          const matchedStudent = {
            id: rollNo,
            name: studentData.name,
            rollNo: rollNo,
            time: new Date().toLocaleTimeString(),
            confidence: confidence ? `${(confidence * 100).toFixed(1)}%` : 'N/A',
          };
          presentMetaRef.current.ids.push(rollNo);
          presentMetaRef.current.confidences[rollNo] = confidence;
          presentMetaRef.current.spoof[rollNo] = spoofStatus;
          setPresentStudents(prev => [matchedStudent, ...prev]);
        } else {
          Alert.alert('Already Marked', `${studentData.name} is already marked present.`);
        }
      } else {
        Alert.alert('Scan Failed', response.data.message || 'Face not recognized.');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Could not reach Model server.');
    } finally {
      setScanning(false);
    }
  };

  const handleStopSession = () => {
    Alert.alert(
      'Stop Session',
      `You have marked ${presentStudents.length} student(s) present. All other enrolled students will be marked Absent. Continue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Stop & Finalize', style: 'destructive', onPress: finalizeSession },
      ]
    );
  };

  const finalizeSession = async () => {
    if (!sessionId) {
      Alert.alert('Error', 'No active session found.');
      return;
    }
    setStopping(true);
    try {
      const res = await axios.post(`${API_URL}/faculty/stop-session/`, {
        session_id: sessionId,
        present_student_ids: presentMetaRef.current.ids,
        confidences: presentMetaRef.current.confidences,
        spoof_statuses: presentMetaRef.current.spoof,
      });

      if (res.data.success) {
        navigation.replace('AttendanceSummary', {
          subject,
          presentStudents,
          user,       // ← passed so Done button can return to Subjects with user param
          sessionStats: {
            expected: res.data.expected,
            present: res.data.present,
            absent: res.data.absent,
            session_id: res.data.session_id,
          },
        });
      } else {
        Alert.alert('Finalization Error', res.data.message);
      }
    } catch (e) {
      console.error('Stop session error:', e);
      Alert.alert('Error', 'Failed to finalize session.');
    } finally {
      setStopping(false);
    }
  };

  const navToRegistration = () => navigation.navigate('Registration');

  const renderStudent = ({ item }) => (
    <View style={styles.studentCard}>
      <View style={styles.studentInfo}>
        <View style={styles.presentDot} />
        <View>
          <Text style={styles.studentName}>{item.name}</Text>
          <Text style={styles.studentRollNo}>{item.rollNo}</Text>
        </View>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={styles.timeText}>{item.time}</Text>
        <Text style={styles.confidenceText}>Conf: {item.confidence}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.subjectText}>{subject.subject_code || subject.code}</Text>
          <Text style={styles.subjectNameText}>{subject.subject_name || subject.name}</Text>
          <Text style={styles.academicInfoText}>
            {subject.department} • Year {subject.year}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <View style={[styles.sessionBadge, { backgroundColor: sessionStarted ? '#E8F5E9' : '#FFF3E0' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {sessionStarted && <View style={styles.liveDot} />}
              <Text style={[styles.sessionBadgeText, { color: sessionStarted ? COLORS.success : '#EF6C00' }]}>
                {sessionStarted ? 'LIVE' : 'Starting...'}
              </Text>
            </View>
          </View>
          {sessionStarted && (
            <Text style={styles.startTimeText}>Started: {sessionStartTime}</Text>
          )}
        </View>
      </View>

      <Text style={styles.countText}>{presentStudents.length} Marked Present</Text>

      {/* Camera */}
      <View style={styles.cameraContainer}>
        <CameraView style={styles.camera} facing={cameraFacing} ref={cameraRef}>
          {scanning && (
            <View style={styles.scanOverlay}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.scanningText}>Analyzing Face...</Text>
            </View>
          )}
          {/* Flip Camera Button */}
          {!scanning && (
            <TouchableOpacity
              style={styles.flipButton}
              onPress={() => setCameraFacing(f => (f === 'back' ? 'front' : 'back'))}
              activeOpacity={0.75}
            >
              <Ionicons name="camera-reverse" size={24} color="#fff" />
            </TouchableOpacity>
          )}
        </CameraView>
      </View>

      {/* Controls */}
      <View style={styles.controlsRow}>
        <TouchableOpacity
          style={[styles.scanButton, (!sessionStarted || scanning) && { opacity: 0.5 }]}
          onPress={handleScanFace}
          disabled={!sessionStarted || scanning}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="camera" size={24} color={COLORS.white} style={{ marginRight: 10 }} />
            <Text style={styles.scanButtonText}>MARK PRESENT</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Student List */}
      <View style={styles.listContainer}>
        <Text style={styles.listTitle}>Recognized This Session</Text>
        <FlatList
          data={presentStudents}
          keyExtractor={(item) => item.id}
          renderItem={renderStudent}
          ListEmptyComponent={<Text style={styles.emptyText}>No students recognized yet.</Text>}
        />
      </View>

      {/* Stop Session */}
      <TouchableOpacity
        style={[styles.stopButton, stopping && { opacity: 0.7 }]}
        onPress={handleStopSession}
        disabled={stopping}
      >
        {stopping ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="stop-circle" size={22} color={COLORS.white} style={{ marginRight: 10 }} />
            <Text style={styles.stopButtonText}>STOP & FINALIZE SESSION</Text>
          </View>
        )}
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { padding: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  subjectText: { color: COLORS.primary, fontSize: 18, fontWeight: '800' },
  subjectNameText: { color: '#333', fontSize: 13, fontWeight: '700', marginTop: 2 },
  academicInfoText: { color: COLORS.textSecondary, fontSize: 11, marginTop: 2 },
  sessionBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  sessionBadgeText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.success, marginRight: 6 },
  startTimeText: { fontSize: 10, color: COLORS.textSecondary, marginTop: 4, fontWeight: '600' },
  countText: { textAlign: 'center', color: COLORS.primary, fontWeight: '700', fontSize: 15, marginBottom: 8 },

  cameraContainer: { height: height * 0.38, marginHorizontal: 15, borderRadius: 16, overflow: 'hidden' },
  camera: { flex: 1, borderRadius: 16 },
  scanOverlay: {
    ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.7)',
    justifyContent: 'center', alignItems: 'center', borderRadius: 16,
  },
  scanningText: { color: COLORS.primary, marginTop: 10, fontWeight: 'bold' },
  flipButton: {
    position: 'absolute', top: 10, right: 10,
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center', alignItems: 'center',
    elevation: 5,
    shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
  },
  flipIcon: { fontSize: 20 },

  controlsRow: { flexDirection: 'row', padding: 15, justifyContent: 'center' },
  scanButton: {
    flex: 1, backgroundColor: COLORS.primary, padding: 18,
    borderRadius: 14, alignItems: 'center', elevation: 4,
    shadowColor: COLORS.primary, shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
  },
  scanButtonText: { color: COLORS.white, fontWeight: 'bold', fontSize: 16, letterSpacing: 0.5 },

  listContainer: { flex: 1, paddingHorizontal: 15 },
  listTitle: { color: COLORS.textSecondary, marginBottom: 8, fontWeight: '600', fontSize: 13 },
  studentCard: {
    backgroundColor: COLORS.cardBg, padding: 14, borderRadius: 12, marginBottom: 8,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1, borderColor: '#E8F5E9', elevation: 1,
  },
  studentInfo: { flexDirection: 'row', alignItems: 'center' },
  presentDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.success, marginRight: 12 },
  studentName: { color: '#333', fontSize: 15, fontWeight: 'bold' },
  studentRollNo: { color: COLORS.textSecondary, fontSize: 13, marginTop: 2 },
  timeText: { color: COLORS.primary, fontSize: 12, fontWeight: '600' },
  confidenceText: { color: '#9C27B0', fontSize: 11, marginTop: 2 },
  emptyText: { color: COLORS.textSecondary, textAlign: 'center', marginTop: 20 },

  stopButton: {
    backgroundColor: '#B71C1C', margin: 15, padding: 18,
    borderRadius: 12, alignItems: 'center', elevation: 4,
  },
  stopButtonText: { color: COLORS.white, fontWeight: '800', fontSize: 15, letterSpacing: 0.5 },

  message: { textAlign: 'center', paddingBottom: 20, color: '#333', fontWeight: '600' },
  button: { backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 },
  buttonText: { color: COLORS.white, fontWeight: 'bold' },
});
