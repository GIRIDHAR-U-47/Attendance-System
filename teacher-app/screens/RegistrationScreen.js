import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView, Dimensions, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import axios from 'axios';
import { MODEL_URL } from '../config';

const { height } = Dimensions.get('window');

const COLORS = {
  primary: '#6A1B9A',
  white: '#FFFFFF',
  background: '#FAF7FB',
  textDark: '#4A148C',
  border: '#EDE7F6',
  success: '#4CAF50',
  warning: '#FF9800',
};

export default function RegistrationScreen({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [name, setName] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [department, setDepartment] = useState('');
  const [year, setYear] = useState('');
  
  const [capturedPoses, setCapturedPoses] = useState({ front: false, left: false, right: false });
  const [loading, setLoading] = useState(false);
  const cameraRef = useRef(null);

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={styles.header}>Camera Permission Required</Text>
        <TouchableOpacity style={styles.submitBtn} onPress={requestPermission}>
          <Text style={styles.submitBtnText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const getNextPose = () => {
    if (!capturedPoses.front) return 'front';
    if (!capturedPoses.left) return 'left';
    if (!capturedPoses.right) return 'right';
    return null;
  };

  const getPoseInstructions = (pose) => {
    if (pose === 'front') return "Please look straight ahead (-10° to +10°).";
    if (pose === 'left') return "Please turn your head > 15° LEFT.";
    if (pose === 'right') return "Please turn your head > 15° RIGHT.";
    return "All 3 poses captured! Ready to register.";
  };

  const handleCapture = async () => {
    if (!name || !rollNo || !department || !year) {
      Alert.alert('Error', 'Please fill all student details first.');
      return;
    }
    
    const pose = getNextPose();
    if (!pose) return;

    if (cameraRef.current) {
      setLoading(true);
      try {
        const photo = await cameraRef.current.takePictureAsync({ base64: true });
        
        const response = await axios.post(`${MODEL_URL}/capture_face`, {
          roll_number: rollNo,
          student_name: name,
          pose: pose,
          image: photo.base64
        });
        
        if (response.data.success) {
            setCapturedPoses(prev => ({ ...prev, [pose]: true }));
            // We use a small toast-style alert for success so it's not too intrusive
            Alert.alert(`Success`, `${pose.toUpperCase()} captured. ${response.data.message}`);
        } else {
            Alert.alert('Adjust Posture', response.data.message);
        }
      } catch (error) {
        console.error('Capture Error', error);
        Alert.alert('Server Error', 'Failed to communicate with Model Backend.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleRegister = async () => {
    const pose = getNextPose();
    if (pose) {
      Alert.alert('Incomplete', 'Please capture all three face poses first.');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${MODEL_URL}/register_student`, {
          roll_number: rollNo,
          student_name: name,
          department: department,
          year: year
      });
      
      if (response.data.success) {
          Alert.alert('Success', 'Student Face Registered Successfully! Embeddings generated.', [
            { text: 'OK', onPress: () => navigation.goBack() }
          ]);
      } else {
          Alert.alert('Registration Failed', response.data.message);
      }
    } catch (e) {
      console.error('Register Error', e);
      Alert.alert('Error', 'Failed to complete registration.');
    } finally {
      setLoading(false);
    }
  };

  const currentPose = getNextPose();
  const allCaptured = !currentPose;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text style={styles.header}>Student Enrollment</Text>
        <Text style={styles.subtext}>Register unique subject poses mapped to DB.</Text>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput style={styles.input} placeholder="e.g. Alice Smith" placeholderTextColor="#B0A0C0" value={name} onChangeText={setName} />
        </View>

        <View style={styles.inputRow}>
            <View style={[styles.inputContainer, { flex: 1, marginRight: 10 }]}>
                <Text style={styles.label}>Roll Number</Text>
                <TextInput style={styles.input} placeholder="e.g. 21CS001" placeholderTextColor="#B0A0C0" value={rollNo} onChangeText={setRollNo} autoCapitalize="characters" />
            </View>
            <View style={[styles.inputContainer, { flex: 1 }]}>
                <Text style={styles.label}>Year</Text>
                <TextInput style={styles.input} placeholder="e.g. 2024" placeholderTextColor="#B0A0C0" value={year} onChangeText={setYear} keyboardType="numeric" />
            </View>
        </View>
        
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Department</Text>
          <TextInput style={styles.input} placeholder="e.g. COMPUTER SCIENCE" placeholderTextColor="#B0A0C0" value={department} onChangeText={setDepartment} autoCapitalize="characters" />
        </View>

        <Text style={styles.label}>Biometric Face Capture (3 Poses)</Text>
        
        <View style={styles.statusBox}>
            <Text style={styles.statusText}>{getPoseInstructions(currentPose)}</Text>
            <View style={styles.badgeContainer}>
                <Text style={[styles.badge, capturedPoses.front ? styles.badgeSuccess : null]}>Front</Text>
                <Text style={[styles.badge, capturedPoses.left ? styles.badgeSuccess : null]}>Left</Text>
                <Text style={[styles.badge, capturedPoses.right ? styles.badgeSuccess : null]}>Right</Text>
            </View>
        </View>

        <View style={styles.cameraContainer}>
            <CameraView style={styles.camera} facing="front" ref={cameraRef}></CameraView>
            
            {loading && (
                <View style={styles.overlayLoader}>
                    <ActivityIndicator size="large" color={COLORS.white} />
                    <Text style={{color:'white', marginTop:10}}>Analyzing...</Text>
                </View>
            )}

            {!allCaptured && !loading && (
                <TouchableOpacity style={styles.captureBtn} onPress={handleCapture}>
                   <Text style={styles.captureBtnText}>Capture {currentPose.toUpperCase()}</Text>
                </TouchableOpacity>
            )}
        </View>

        <TouchableOpacity 
          style={[styles.submitBtn, (!allCaptured || loading) && { opacity: 0.5 }]} 
          onPress={handleRegister} 
          disabled={!allCaptured || loading}
        >
          <Text style={styles.submitBtnText}>{loading ? 'Processing...' : 'Complete Registration'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { fontSize: 26, fontWeight: '900', color: COLORS.primary, marginTop: 20, letterSpacing: -0.5 },
  subtext: { color: '#7E57C2', marginBottom: 25, fontSize: 14, fontWeight: '500' },
  
  inputRow: { flexDirection: 'row', justifyContent: 'space-between' },
  inputContainer: { marginBottom: 15 },
  label: { color: COLORS.textDark, marginBottom: 8, fontSize: 14, fontWeight: '700', marginLeft: 4 },
  input: { backgroundColor: COLORS.white, padding: 14, borderRadius: 12, borderWidth: 1.5, borderColor: COLORS.border, fontSize: 15, color: '#333' },
  
  statusBox: { backgroundColor: COLORS.white, padding: 15, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, marginBottom: 15 },
  statusText: { fontSize: 16, fontWeight: 'bold', color: COLORS.warning, textAlign: 'center', marginBottom: 10 },
  badgeContainer: { flexDirection: 'row', justifyContent: 'space-around' },
  badge: { backgroundColor: '#E0E0E0', paddingHorizontal: 15, paddingVertical: 5, borderRadius: 20, fontSize: 12, fontWeight: 'bold', color: '#757575' },
  badgeSuccess: { backgroundColor: COLORS.success, color: COLORS.white },

  cameraContainer: { height: height * 0.4, borderRadius: 16, overflow: 'hidden', marginBottom: 20, borderWidth: 2, borderColor: COLORS.primary, backgroundColor: '#000' },
  camera: { flex: 1 },
  overlayLoader: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  captureBtn: { position: 'absolute', bottom: 15, alignSelf: 'center', backgroundColor: COLORS.white, paddingHorizontal: 25, paddingVertical: 12, borderRadius: 25, elevation: 5 },
  captureBtnText: { color: COLORS.primary, fontWeight: 'bold', fontSize: 16 },
  
  submitBtn: { backgroundColor: COLORS.primary, padding: 18, borderRadius: 14, alignItems: 'center', marginBottom: 40, elevation: 4 },
  submitBtnText: { color: COLORS.white, fontWeight: 'bold', fontSize: 18 },
});
