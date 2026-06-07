import React from 'react';
import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { API_URL } from './config';

const BACKGROUND_LOCATION_TASK = 'BACKGROUND_LOCATION_TASK';

TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error("Background Location Error:", error);
    return;
  }
  if (data) {
    const { locations } = data;
    try {
      const storedSession = await SecureStore.getItemAsync('userSession');
      if (storedSession) {
        const sessionData = JSON.parse(storedSession);
        const { user } = sessionData;
        
        if (locations && locations.length > 0) {
            const loc = locations[0];
            const res = await axios.post(`${API_URL}/location/update/`, {
                student_id: user.roll_number,
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude
            });
            
            // If backend responds that the user is no longer on campus
            if (!res.data.in_campus) {
                console.log("Background Task: User left campus, logging out.");
                await SecureStore.deleteItemAsync('userSession');
                await SecureStore.deleteItemAsync('userSessionDate');
                await SecureStore.deleteItemAsync('autoLogoutMessage');
                await SecureStore.setItemAsync('autoLogoutMessage', 'Security Alert: Auto-log out due to movement outside campus boundary.');
                await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
            }
        }
      } else {
        // Stop tracking if there's no active session
        await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      }
    } catch (err) {
      console.error("Background Task Error:", err);
    }
  }
});
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import NotesScreen from './screens/NotesScreen';
import FaceSetupScreen from './screens/FaceSetupScreen';

import { Ionicons } from '@expo/vector-icons';
const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const COLORS = {
    primary: '#6A1B9A',
    secondary: '#FFD700',
    white: '#FFFFFF',
    textDark: '#4A148C'
};

function MainTabs({ route }) {
  const { user, in_campus, zone_name } = route.params;
  return (
    <Tab.Navigator 
      screenOptions={({ route }) => ({
        headerShown: true,
        headerStyle: { backgroundColor: COLORS.primary },
        headerTintColor: '#fff',
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Dashboard') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'Notes') iconName = focused ? 'journal' : 'journal-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: { height: 80, paddingBottom: 20, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#EEE' },
      })}
    >
      <Tab.Screen name="Dashboard" component={HomeScreen} initialParams={{ user, in_campus, zone_name }} />
      <Tab.Screen name="Notes" component={NotesScreen} initialParams={{ user }} />
    </Tab.Navigator>
  );
}
export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="FaceSetup" component={FaceSetupScreen} />
        <Stack.Screen name="MainTabs" component={MainTabs} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
