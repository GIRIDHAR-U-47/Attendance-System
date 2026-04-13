import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import axios from 'axios';
import { MODEL_URL } from '../config';

const COLORS = {
  primary: '#6A1B9A',
  white: '#FFFFFF',
  background: '#FAF7FB',
};

export default function TeacherVerificationScreen({ navigation, route }) {
  const { subject, teacherId } = route.params;
  const [permission, requestPermission] = useCameraPermissions();
  const [verifying, setVerifying] = useState(false);
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

  const handleVerify = async () => {
    if (cameraRef.current) {
      setVerifying(true);
      try {
        const photo = await cameraRef.current.takePictureAsync({ base64: true });
        
        // Send base64 frame to Flask Model server
        const response = await axios.post(`${MODEL_URL}/verify_staff`, {
          subject_code: subject.code,
          image: photo.base64
        });
        
        if (response.data.success) {
          Alert.alert('Success', 'Teacher Authenticated! Timestamp recorded.', [
            { text: 'OK', onPress: () => navigation.replace('LiveAttendance', { subject, teacherId }) }
          ]);
        } else {
          Alert.alert('Verification Failed', response.data.message || 'Staff not recognized.');
        }
      } catch (error) {
        console.error('Verify Staff Error:', error);
        Alert.alert('Error', 'Face verification failed due to network or server error.');
      } finally {
        setVerifying(false);
      }
    }
  };

  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} facing="front" ref={cameraRef}>
        <View style={styles.overlay}>
          <View style={styles.guideBox} />
          <Text style={styles.guideText}>Center your face for verification</Text>
        </View>

        <View style={styles.bottomControls}>
          {verifying ? (
            <ActivityIndicator size="large" color={COLORS.primary} />
          ) : (
            <TouchableOpacity style={styles.captureButton} onPress={handleVerify}>
              <View style={styles.captureInner} />
            </TouchableOpacity>
          )}
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  camera: {
    flex: 1,
  },
  message: {
    textAlign: 'center',
    paddingBottom: 20,
    color: '#333',
    fontWeight: '600',
  },
  button: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: COLORS.white,
    fontWeight: 'bold',
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)', // Slightly brighter overlay for light mode context
  },
  guideBox: {
    width: 250,
    height: 250,
    borderWidth: 3,
    borderColor: COLORS.primary,
    borderRadius: 16,
    backgroundColor: 'transparent',
  },
  guideText: {
    color: COLORS.white,
    fontSize: 16,
    marginTop: 20,
    fontWeight: '700',
    backgroundColor: 'rgba(106, 27, 154, 0.8)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    overflow: 'hidden',
  },
  bottomControls: {
    height: 120,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  captureButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: '#E1BEE7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
  },
});
