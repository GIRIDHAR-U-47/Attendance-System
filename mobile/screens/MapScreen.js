import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MapView, { Marker, Polygon } from 'react-native-maps';
import * as Location from 'expo-location';
import axios from 'axios';

const API_URL = 'http://10.109.104.182:8000/api';

export default function MapScreen({ route }) {
  const { user } = route.params;
  const [location, setLocation] = useState(null);
  const [zones, setZones] = useState([]);
  
  useEffect(() => {
    let subscription = null;
    
    const fetchZones = async () => {
      try {
        const res = await axios.get(`${API_URL}/zones/`);
        setZones(res.data);
      } catch (err) {
        console.error("Failed to fetch zones");
      }
    };
    
    const startTracking = async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      subscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Highest, timeInterval: 5000, distanceInterval: 5 },
        async (loc) => {
          // Ignore jumpy pings (greater than 30m of error)
          if (loc.coords.accuracy > 30) return;

          setLocation(loc);
          // Send to backend
          try {
            await axios.post(`${API_URL}/location/update/`, {
              student_id: user.id,
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude
            });
          } catch(e) {}
        }
      );
    };

    fetchZones();
    startTracking();

    return () => {
      if (subscription) subscription.remove();
    };
  }, []);

  return (
    <View style={styles.container}>
      {location ? (
        <MapView 
          style={styles.map}
          initialRegion={{
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
          showsUserLocation={true}
        >
          {zones.map((zone) => (
            zone.polygon_coordinates && zone.polygon_coordinates.length > 0 && (
              <Polygon
                key={zone.id}
                coordinates={zone.polygon_coordinates.map(c => ({ latitude: c.lat, longitude: c.lng }))}
                strokeColor="#F00"
                fillColor="rgba(255,0,0,0.2)"
                strokeWidth={2}
              />
            )
          ))}
          <Marker 
            coordinate={{ latitude: location.coords.latitude, longitude: location.coords.longitude }}
            title="You are here" 
          />
        </MapView>
      ) : (
        <Text style={styles.text}>Fetching your location...</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  map: { width: '100%', height: '100%' },
  text: { fontSize: 18 }
});
