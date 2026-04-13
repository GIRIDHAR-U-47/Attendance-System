import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, Dimensions, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import axios from 'axios';
import { MODEL_URL, API_URL } from '../config';

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

export default function FaceSetupScreen({ route, navigation }) {
  const { user } = route.params; // Has roll_number, username
  
  const [permission, requestPermission] = useCameraPermissions();
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
        <Text style={styles.subtext}>You must grant camera access to setup your face embeddings.</Text>
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
    return "All 3 poses captured! Ready to finalize.";
  };

  const handleCapture = async () => {    
    const pose = getNextPose();
    if (!pose) return;

    if (cameraRef.current) {
      setLoading(true);
      try {
        const photo = await cameraRef.current.takePictureAsync({ base64: true });
        
        const response = await axios.post(`${MODEL_URL}/api/capture_face`, {
          roll_number: user.roll_number,
          student_name: user.username,
          pose: pose,
          image: photo.base64
        });
        
        if (response.data.success) {
            setCapturedPoses(prev => ({ ...prev, [pose]: true }));
            Alert.alert(`Success`, `${pose.toUpperCase()} captured. ${response.data.message}`);
        } else {
            Alert.alert('Adjust Posture', response.data.message);
        }
      } catch (error) {
        console.error('Capture Error', error);
        Alert.alert('Server Error', 'Failed to communicate with Face Detection Matrix.');
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
      // 1. Tell Python Model to Compute & Save Embeddings
      const aiResponse = await axios.post(`${MODEL_URL}/api/register_student`, {
          roll_number: user.roll_number,
          student_name: user.username,
          department: "StudentApp",
          year: new Date().getFullYear()
      });
      
      if (!aiResponse.data.success) {
          Alert.alert('Registration Failed', aiResponse.data.message);
          setLoading(false);
          return;
      }

      // 2. Tell Django Database that the user is officially enrolled
      const dbResponse = await axios.post(`${API_URL}/auth/enroll_face/`, {
          roll_number: user.roll_number
      });

      if (dbResponse.data.success) {
          Alert.alert('Welcome!', 'Your biometrics are firmly locked. You can now access your dashboard.', [
            { text: 'Enter Dashboard', onPress: () => {
                // To keep state consistent, inject image_path back into the active session
                const updatedSession = { ...route.params };
                updatedSession.user.image_path = "enrolled"; 
                navigation.replace('MainTabs', updatedSession);
            } }
          ]);
      } else {
          Alert.alert('Database Sync Failed', 'Your face was mapped but the database could not link it.');
      }

    } catch (e) {
      console.error('Final Registration Error', e);
      Alert.alert('Error', 'Failed to complete final biometric enrollment.');
    } finally {
      setLoading(false);
    }
  };

  const currentPose = getNextPose();
  const allCaptured = !currentPose;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text style={styles.header}>Hello, {user.username}</Text>
        <Text style={styles.subtext}>Before entering, we need to map your face.</Text>
        
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
                    <Text style={{color:'white', marginTop:10}}>Analyzing Vector Map...</Text>
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
          <Text style={styles.submitBtnText}>{loading ? 'Computing...' : 'Enter App'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { fontSize: 26, fontWeight: '900', color: COLORS.primary, marginTop: 40, letterSpacing: -0.5 },
  subtext: { color: '#7E57C2', marginBottom: 25, fontSize: 14, fontWeight: '500', marginTop: 5 },
  
  statusBox: { backgroundColor: COLORS.white, padding: 15, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, marginBottom: 15 },
  statusText: { fontSize: 16, fontWeight: 'bold', color: COLORS.warning, textAlign: 'center', marginBottom: 10 },
  badgeContainer: { flexDirection: 'row', justifyContent: 'space-around' },
  badge: { backgroundColor: '#E0E0E0', paddingHorizontal: 15, paddingVertical: 5, borderRadius: 20, fontSize: 12, fontWeight: 'bold', color: '#757575', overflow: 'hidden' },
  badgeSuccess: { backgroundColor: COLORS.success, color: COLORS.white },

  cameraContainer: { height: height * 0.5, borderRadius: 16, overflow: 'hidden', marginBottom: 20, borderWidth: 2, borderColor: COLORS.primary, backgroundColor: '#000' },
  camera: { flex: 1 },
  overlayLoader: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  captureBtn: { position: 'absolute', bottom: 15, alignSelf: 'center', backgroundColor: COLORS.white, paddingHorizontal: 25, paddingVertical: 12, borderRadius: 25, elevation: 5 },
  captureBtnText: { color: COLORS.primary, fontWeight: 'bold', fontSize: 16 },
  
  submitBtn: { backgroundColor: COLORS.primary, padding: 18, borderRadius: 14, alignItems: 'center', marginBottom: 40, elevation: 4 },
  submitBtnText: { color: COLORS.white, fontWeight: 'bold', fontSize: 18 },
});
