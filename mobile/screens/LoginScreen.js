import React, { useState, useEffect } from 'react';
import { 
    View, 
    Text, 
    TextInput, 
    TouchableOpacity, 
    StyleSheet, 
    Alert, 
    ActivityIndicator, 
    Image, 
    KeyboardAvoidingView, 
    Platform 
} from 'react-native';
import * as Location from 'expo-location';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { API_URL } from '../config';

const COLORS = {
    primary: '#6A1B9A', // REC Purple
    secondary: '#000000ff', // REC Gold
    white: '#FFFFFF',
    background: '#F8F0FA',
    border: '#ECD9F2',
    textLight: '#8E24AA',
    textDark: '#4A148C'
};

export default function LoginScreen({ navigation, route }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const ensureDeviceId = async () => {
        try {
            let deviceId = await SecureStore.getItemAsync('device_id');
            if (!deviceId) {
                deviceId = Crypto.randomUUID();
                await SecureStore.setItemAsync('device_id', deviceId);
                console.log("Generated Permanent Device ID:", deviceId);
            }
        } catch (e) {
            console.error(e);
        }
    };
    ensureDeviceId();

    const checkAutoLogin = async () => {
      try {
        const storedMessage = await SecureStore.getItemAsync('autoLogoutMessage');
        if (storedMessage) {
            Alert.alert('Logged Out', storedMessage);
            await SecureStore.deleteItemAsync('autoLogoutMessage');
        } else if (route.params?.error) {
            Alert.alert('Logged Out', route.params.error);
            navigation.setParams({ error: undefined });
        }

        const storedDate = await SecureStore.getItemAsync('userSessionDate');
        const today = new Date().toDateString();
        
        if (storedDate === today) {
            const storedSession = await SecureStore.getItemAsync('userSession');
            if (storedSession) {
                const sessionData = JSON.parse(storedSession);
                navigation.replace('MainTabs', sessionData);
            }
        } else {
            // Not today's session, clear it to enforce daily login
            await SecureStore.deleteItemAsync('userSession');
            await SecureStore.deleteItemAsync('userSessionDate');
        }
      } catch (e) {
        console.error(e);
      }
    };
    checkAutoLogin();
  }, [route.params?.error, navigation]);

  const handleLogin = async () => {
    setLoading(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required to log in.');
        setLoading(false);
        return;
      }

      let location;
      try {
        location = await Location.getCurrentPositionAsync({ 
          accuracy: Location.Accuracy.Balanced,
        });

        // Ignore pings that are extremely inaccurate (greater than 50 meters of error)
        if (location.coords.accuracy > 50) {
            console.log("Coarse location ignored, retrying for better data...");
            location = await Location.getCurrentPositionAsync({ 
                accuracy: Location.Accuracy.Balanced,
            });
        }
      } catch (locErr) {
        Alert.alert('Location Error', 'Unable to fetch your current location. Please ensure your GPS is ON and you have a clear view of the sky.');
        setLoading(false);
        return;
      }
      
      const { latitude, longitude } = location.coords;
      const deviceId = await SecureStore.getItemAsync('device_id');

      const res = await axios.post(`${API_URL}/auth/login/`, {
        username,
        password,
        latitude,
        longitude,
        device_id: deviceId
      });

      if (res.data.user) {
        const sessionData = { 
            user: res.data.user,
            in_campus: res.data.in_campus,
            zone_name: res.data.zone_name
        };
        await SecureStore.setItemAsync('userSession', JSON.stringify(sessionData));
        await SecureStore.setItemAsync('userSessionDate', new Date().toDateString());
        
        // INTERCEPT: If they have no facial embeddings yet, force them to Face Setup
        if (!res.data.user.image_path) {
            navigation.replace('FaceSetup', sessionData);
        } else {
            navigation.replace('MainTabs', sessionData);
        }
      }
    } catch (err) {
      console.error(err);
      if (err.response && err.response.data && err.response.data.error) {
        Alert.alert('Login Failed', err.response.data.error);
      } else {
        Alert.alert('Error', 'Unable to connect to the server.');
      }
    }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"} 
        style={styles.container}
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
                <Text style={styles.subtitle}>STUDENT ATTENDANCE SYSTEM</Text>
            </View>

            <View style={styles.form}>
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Student ID / Username</Text>
                    <TextInput 
                        style={styles.input} 
                        placeholder="e.g. 211201001"
                        placeholderTextColor="#B0A0C0"
                        value={username} 
                        onChangeText={setUsername} 
                        autoCapitalize="none"
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Password</Text>
                    <TextInput 
                        style={styles.input} 
                        placeholder="••••••••" 
                        placeholderTextColor="#B0A0C0"
                        secureTextEntry={true} 
                        value={password} 
                        onChangeText={setPassword} 
                    />
                </View>

                <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
                    {loading ? (
                        <ActivityIndicator color={COLORS.white} />
                    ) : (
                        <Text style={styles.buttonText}>Sign In</Text>
                    )}
                </TouchableOpacity>
            </View>
            
            <Text style={styles.footerText}>Developed by REC AIML Department</Text>
        </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAF7FB',
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
    input: {
        backgroundColor: '#FFFFFF',
        padding: 18,
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: '#EDE7F6',
        fontSize: 16,
        color: COLORS.textDark,
        elevation: 2,
        shadowColor: '#6A1B9A',
        shadowOpacity: 0.05,
        shadowRadius: 10,
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
