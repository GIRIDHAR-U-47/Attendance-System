import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import CanteenListScreen from './CanteenListScreen';
import CanteenMenuScreen from './CanteenMenuScreen';
import OrderTokenScreen from './OrderTokenScreen';

const Stack = createNativeStackNavigator();

export default function CanteenNavigator({ route }) {
  const { user } = route.params || {};

  return (
    <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: '#6A1B9A' }, headerTintColor: '#fff' }}>
      <Stack.Screen 
         name="CanteenList" 
         component={CanteenListScreen} 
         options={{ title: 'Campus Canteens' }} 
         initialParams={{ user }}
      />
      <Stack.Screen 
         name="CanteenMenu" 
         component={CanteenMenuScreen} 
         options={({ route }) => ({ title: route.params?.canteen_name || 'Menu' })}
         initialParams={{ user }} 
      />
      <Stack.Screen 
         name="OrderToken" 
         component={OrderTokenScreen} 
         options={{ title: 'Your Order Token', headerBackVisible: false }} 
      />
    </Stack.Navigator>
  );
}
