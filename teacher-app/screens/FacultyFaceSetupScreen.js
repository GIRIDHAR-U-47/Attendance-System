import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, Dimensions, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
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

export default function FacultyFaceSetupScreen({ route, navigation }) {
  const { user } = route.params;
  
  const [permission, requestPermission] = useCameraPermissions();
  const [capturedPoses, setCapturedPoses] = useState({ front: false, left: false, right: false });
  const [loading, setLoading] = useState(false);
  const cameraRef = useRef(null);

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 30 }]}>
        <Text style={styles.header}>Camera Permission Required</Text>
        <Text style={styles.subtext}>Camera access is mandatory for faculty biometric registration.</Text>
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
    if (pose === 'front') return "Look straight at the camera (-10° to +10°).";
    if (pose === 'left') return "Turn your head > 15° to the LEFT.";
    if (pose === 'right') return "Turn your head > 15° to the RIGHT.";
    return "All 3 poses captured! Tap below to finalize.";
  };

  const handleCapture = async () => {    
    const pose = getNextPose();
    if (!pose) return;

    if (cameraRef.current) {
      setLoading(true);
      try {
        const photo = await cameraRef.current.takePictureAsync({ base64: true });
        
        const response = await axios.post(`${MODEL_URL}/capture_staff_face`, {
          roll_number: user.roll_number || user.username,
          student_name: user.username,
          pose: pose,
          image: photo.base64
        });
        
        if (response.data.success) {
            setCapturedPoses(prev => ({ ...prev, [pose]: true }));
            Alert.alert('Success', `${pose.toUpperCase()} captured. ${response.data.message}`);
        } else {
            Alert.alert('Adjust Posture', response.data.message);
        }
      } catch (error) {
        console.error('Capture Error', error);
        Alert.alert('Server Error', 'Failed to communicate with Face Recognition Engine.');
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
      // 1. Tell Python AI Model to compute & save embeddings
      const aiResponse = await axios.post(`${MODEL_URL}/register_staff`, {
          roll_number: user.roll_number || user.username,
          student_name: user.username,
          department: "Faculty",
          year: new Date().getFullYear()
      });
      
      if (!aiResponse.data.success) {
          Alert.alert('Registration Failed', aiResponse.data.message);
          setLoading(false);
          return;
      }

      // 2. Tell Django Database that the faculty is officially enrolled
      const dbResponse = await axios.post(`${API_URL}/auth/enroll_face/`, {
          roll_number: user.roll_number || user.username
      });

      if (dbResponse.data.success) {
          Alert.alert('Welcome, Faculty!', 'Your biometric identity has been securely registered. You may now access the Faculty Portal.', [
            { text: 'Continue', onPress: () => {
                navigation.replace('Subjects', { teacherId: user.roll_number || user.username, user: { ...user, image_path: 'enrolled' } });
            } }
          ]);
      } else {
          Alert.alert('Database Sync Failed', 'Face was mapped but the database could not confirm enrollment.');
      }

    } catch (e) {
      console.error('Final Registration Error', e);
      Alert.alert('Error', 'Failed to complete biometric enrollment.');
    } finally {
      setLoading(false);
    }
  };

  const currentPose = getNextPose();
  const allCaptured = !currentPose;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text style={styles.header}>Welcome, {user.username}</Text>
        <Text style={styles.subtext}>One-time faculty biometric setup required before accessing the portal.</Text>
        
        <View style={styles.statusBox}>
            <Text style={styles.statusText}>{getPoseInstructions(currentPose)}</Text>
            <View style={styles.badgeContainer}>
                <View style={[styles.badge, capturedPoses.front ? styles.badgeSuccess : null]}>
                  {capturedPoses.front && <Ionicons name="checkmark-circle" size={14} color="#fff" style={{marginRight:4}} />}
                  <Text style={[styles.badgeText, capturedPoses.front ? {color:'#fff'} : null]}>Front</Text>
                </View>
                <View style={[styles.badge, capturedPoses.left ? styles.badgeSuccess : null]}>
                  {capturedPoses.left && <Ionicons name="checkmark-circle" size={14} color="#fff" style={{marginRight:4}} />}
                  <Text style={[styles.badgeText, capturedPoses.left ? {color:'#fff'} : null]}>Left</Text>
                </View>
                <View style={[styles.badge, capturedPoses.right ? styles.badgeSuccess : null]}>
                  {capturedPoses.right && <Ionicons name="checkmark-circle" size={14} color="#fff" style={{marginRight:4}} />}
                  <Text style={[styles.badgeText, capturedPoses.right ? {color:'#fff'} : null]}>Right</Text>
                </View>
            </View>
        </View>

        <View style={styles.cameraContainer}>
            <CameraView style={styles.camera} facing="front" ref={cameraRef}></CameraView>
            
            {loading && (
                <View style={styles.overlayLoader}>
                    <ActivityIndicator size="large" color={COLORS.white} />
                    <Text style={{color:'white', marginTop:10}}>Processing biometrics...</Text>
                </View>
            )}

            {!allCaptured && !loading && (
                <TouchableOpacity style={styles.captureBtn} onPress={handleCapture}>
                   <Ionicons name="camera" size={20} color={COLORS.primary} style={{marginRight:8}} />
                   <Text style={styles.captureBtnText}>Capture {currentPose.toUpperCase()}</Text>
                </TouchableOpacity>
            )}
        </View>

        <TouchableOpacity 
          style={[styles.submitBtn, (!allCaptured || loading) && { opacity: 0.5 }]} 
          onPress={handleRegister} 
          disabled={!allCaptured || loading}
        >
          <View style={{flexDirection:'row', alignItems:'center'}}>
            <Ionicons name="shield-checkmark" size={22} color={COLORS.white} style={{marginRight:10}} />
            <Text style={styles.submitBtnText}>{loading ? 'Computing...' : 'Complete Setup & Enter Portal'}</Text>
          </View>
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
  badge: { backgroundColor: '#E0E0E0', paddingHorizontal: 15, paddingVertical: 6, borderRadius: 20, flexDirection: 'row', alignItems: 'center' },
  badgeText: { fontSize: 12, fontWeight: 'bold', color: '#757575' },
  badgeSuccess: { backgroundColor: COLORS.success },

  cameraContainer: { height: height * 0.5, borderRadius: 16, overflow: 'hidden', marginBottom: 20, borderWidth: 2, borderColor: COLORS.primary, backgroundColor: '#000' },
  camera: { flex: 1 },
  overlayLoader: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  captureBtn: { position: 'absolute', bottom: 15, alignSelf: 'center', backgroundColor: COLORS.white, paddingHorizontal: 25, paddingVertical: 12, borderRadius: 25, elevation: 5, flexDirection: 'row', alignItems: 'center' },
  captureBtnText: { color: COLORS.primary, fontWeight: 'bold', fontSize: 16 },
  
  submitBtn: { backgroundColor: COLORS.primary, padding: 18, borderRadius: 14, alignItems: 'center', marginBottom: 40, elevation: 4 },
  submitBtnText: { color: COLORS.white, fontWeight: 'bold', fontSize: 18 },
});
