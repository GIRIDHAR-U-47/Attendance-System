import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import LoginScreen from './screens/LoginScreen';
import SubjectsScreen from './screens/SubjectsScreen';
import TeacherVerificationScreen from './screens/TeacherVerificationScreen';
import LiveAttendanceScreen from './screens/LiveAttendanceScreen';
import RegistrationScreen from './screens/RegistrationScreen';
import AttendanceSummaryScreen from './screens/AttendanceSummaryScreen';
import FacultyFaceSetupScreen from './screens/FacultyFaceSetupScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator 
          initialRouteName="Login" 
          screenOptions={{ 
            headerShown: false, 
            contentStyle: { backgroundColor: '#FAF7FB' }
          }}
        >
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="FacultyFaceSetup" component={FacultyFaceSetupScreen} />
          <Stack.Screen name="Subjects" component={SubjectsScreen} />
          <Stack.Screen name="TeacherVerification" component={TeacherVerificationScreen} />
          <Stack.Screen name="LiveAttendance" component={LiveAttendanceScreen} />
          <Stack.Screen name="Registration" component={RegistrationScreen} />
          <Stack.Screen name="AttendanceSummary" component={AttendanceSummaryScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
