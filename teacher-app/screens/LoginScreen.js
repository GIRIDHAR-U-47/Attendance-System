import React, { useState } from 'react';
import { 
    View, 
    Text, 
    TextInput, 
    TouchableOpacity, 
    StyleSheet, 
    ActivityIndicator, 
    Alert, 
    KeyboardAvoidingView, 
    Platform,
    Image
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import axios from 'axios';
import { API_URL } from '../config';

const COLORS = {
    primary: '#6A1B9A', // REC Purple
    secondary: '#000000ff', // REC Gold
    white: '#FFFFFF',
    background: '#FAF7FB',
    textLight: '#8E24AA',
    textDark: '#4A148C'
};

export default function LoginScreen({ navigation }) {
  const [teacherId, setTeacherId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!teacherId || !password) {
      Alert.alert('Error', 'Please enter Teacher ID and password');
      return;
    }
    
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/auth/login/`, {
        username: teacherId,
        password,
        latitude: 0,
        longitude: 0,
        device_id: 'faculty-device'
      });

      if (res.data.user) {
        const user = res.data.user;
        
        // INTERCEPT: If faculty has no face embeddings, force Face Setup
        if (!user.image_path) {
          navigation.replace('FacultyFaceSetup', { user });
        } else {
          navigation.replace('Subjects', { teacherId: user.roll_number || user.username, user });
        }
      }
    } catch (error) {
      console.error(error);
      if (error.response && error.response.data && error.response.data.error) {
        Alert.alert('Login Failed', error.response.data.error);
      } else {
        Alert.alert('Login Failed', 'Invalid credentials or network error.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <View style={styles.header}>
            <Image
                source={require('../assets/rec_full_logo.png')}
                style={styles.logoImage}
                resizeMode="contain"
            />
            <Text style={styles.welcomeText}>Welcome to</Text>
            <Text style={styles.title}>REC Smart</Text>
            <Text style={styles.subtitle}>FACULTY PORTAL</Text>
        </View>

        <View style={styles.form}>
            <View style={styles.inputGroup}>
                <Text style={styles.label}>Teacher ID / Username</Text>
                <View style={styles.inputWrapper}>
                    <MaterialIcons name="person-outline" size={22} color={COLORS.primary} style={styles.icon} />
                    <TextInput 
                        style={styles.input} 
                        placeholder="e.g. IT212"
                        placeholderTextColor="#B0A0C0"
                        value={teacherId} 
                        onChangeText={setTeacherId} 
                        autoCapitalize="none"
                    />
                </View>
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Password</Text>
                <View style={styles.inputWrapper}>
                    <MaterialIcons name="lock-outline" size={22} color={COLORS.primary} style={styles.icon} />
                    <TextInput 
                        style={styles.input} 
                        placeholder="••••••••" 
                        placeholderTextColor="#B0A0C0"
                        secureTextEntry={true} 
                        value={password} 
                        onChangeText={setPassword} 
                    />
                </View>
            </View>

            <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
                {loading ? (
                    <ActivityIndicator color={COLORS.white} />
                ) : (
                    <Text style={styles.buttonText}>Sign In</Text>
                )}
            </TouchableOpacity>
        </View>
        
        <Text style={styles.footerText}>Secure Login - REC Attendance System</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
      flex: 1,
      backgroundColor: COLORS.background,
  },
  content: {
      flex: 1,
      padding: 30,
      justifyContent: 'center',
  },
  header: {
      alignItems: 'center',
      marginBottom: 50,
  },
  logoImage: {
      width: 180,
      height: 80,
      marginBottom: 20,
  },
  welcomeText: {
      fontSize: 16,
      color: '#7E57C2',
      fontWeight: '500',
      marginBottom: 5,
  },
  title: {
      fontSize: 34,
      fontWeight: '900',
      color: COLORS.primary,
      letterSpacing: -1,
  },
  subtitle: {
      fontSize: 12,
      color: COLORS.secondary,
      fontWeight: '800',
      marginTop: 2,
      letterSpacing: 2,
  },
  form: {
      width: '100%',
  },
  inputGroup: {
      marginBottom: 20,
  },
  label: {
      fontSize: 14,
      fontWeight: '700',
      color: COLORS.textDark,
      marginBottom: 8,
      marginLeft: 4,
  },
  inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: '#EDE7F6',
      elevation: 2,
      shadowColor: '#6A1B9A',
      shadowOpacity: 0.05,
      shadowRadius: 10,
      paddingHorizontal: 15,
  },
  icon: {
      marginRight: 10,
  },
  input: {
      flex: 1,
      paddingVertical: 18,
      fontSize: 16,
      color: COLORS.textDark,
  },
  button: {
      backgroundColor: COLORS.primary,
      padding: 20,
      borderRadius: 18,
      alignItems: 'center',
      marginTop: 15,
      elevation: 8,
      shadowColor: COLORS.primary,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
  },
  buttonText: {
      color: COLORS.white,
      fontSize: 18,
      fontWeight: '800',
  },
  footerText: {
      textAlign: 'center',
      color: '#BDBDBD',
      fontSize: 12,
      marginTop: 40,
      fontWeight: '500',
  }
});
