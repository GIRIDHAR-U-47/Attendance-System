import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import * as Location from 'expo-location';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_URL } from '../config';

const BACKGROUND_LOCATION_TASK = 'BACKGROUND_LOCATION_TASK';

const COLORS = {
    primary: '#6A1B9A', // REC Purple
    secondary: '#FFD700', // REC Gold
    white: '#FFFFFF',
    background: '#F8F0FA',
    border: '#ECD9F2',
    textLight: '#8E24AA',
    textDark: '#4A148C'
};

export default function HomeScreen({ route, navigation }) {
  const { user, in_campus: initialInCampus, zone_name: initialZoneName } = route.params;
  
  const [isActive, setIsActive] = useState(
      initialInCampus ? 'Active' : (initialInCampus === false ? 'Outside Campus' : 'Fetching...')
  );
  const [currentZone, setCurrentZone] = useState(initialZoneName || null);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedSubject, setExpandedSubject] = useState(null);
  
  const consecutiveOffCampusCount = React.useRef(0);
  const isRedirecting = React.useRef(false);

  useEffect(() => {
    let subscription = null;

    const handleLogout = async (message) => {
      if (isRedirecting.current) return;
      isRedirecting.current = true;
      if (subscription) subscription.remove();
      
      try {
        await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      } catch (e) {}
      
      await SecureStore.deleteItemAsync('userSession');
      await SecureStore.deleteItemAsync('userSessionDate');
      
      navigation.reset({
          index: 0,
          routes: [{ name: 'Login', params: { error: message } }],
      });
    };

    const fetchAttendance = async () => {
      try {
        const res = await axios.get(`${API_URL}/student/attendance-summary/?student_id=${user.roll_number}`);
        setAttendance(res.data);
      } catch (err) {
        console.error("Failed to fetch attendance summary");
      }
      setLoading(false);
    };

    const startTracking = async () => {
      let { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
      if (fgStatus !== 'granted') {
          setIsActive('Permission Denied');
          return;
      }

      try {
          let { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
          if (bgStatus === 'granted') {
              await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
                  accuracy: Location.Accuracy.Highest,
                  timeInterval: 15000,
                  distanceInterval: 10,
                  foregroundService: {
                      notificationTitle: "REC Smart Sync",
                      notificationBody: "Monitoring campus location securely.",
                      notificationColor: "#6A1B9A",
                  }
              });
          }
      } catch (e) {
          console.log('Background location error:', e);
      }

      subscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Highest, timeInterval: 5000, distanceInterval: 5 },
        async (loc) => {
          if (loc.coords.accuracy > 40) return;
          try {
            const res = await axios.post(`${API_URL}/location/update/`, {
              student_id: user.id,
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude
            });
            
            const inCampus = res.data.in_campus;
            setIsActive(inCampus ? 'Active' : 'Outside Campus');
            if (res.data.current_zone) setCurrentZone(res.data.current_zone.name);
            
            if (!inCampus) {
                consecutiveOffCampusCount.current += 1;
                if (consecutiveOffCampusCount.current >= 3) {
                    handleLogout('Security Alert: Auto-log out due to movement outside campus boundary.');
                }
            } else {
                consecutiveOffCampusCount.current = 0;
            }
          } catch(e) {}
        }
      );
    };

    fetchAttendance();
    startTracking();

    return () => {
      if (subscription) subscription.remove();
    };
  }, [user.id, navigation]);

  const subjectData = attendance; // Each item already has all required analytics fields


  const toggleSubject = (subjName) => {
      setExpandedSubject(expandedSubject === subjName ? null : subjName);
  };

  const totalClasses = subjectData.reduce((s, x) => s + (x.total_classes || 0), 0);
  const presentClasses = subjectData.reduce((s, x) => s + (x.present || 0), 0);
  const overallPercentage = totalClasses === 0 ? 0 : Math.round((presentClasses / totalClasses) * 100);

  const renderSubject = ({ item }) => {
    const pct = item.percentage ?? 0;
    return (
      <View style={styles.subjectCard}>
          <TouchableOpacity onPress={() => toggleSubject(item.subject_code)} style={styles.subjectHeader}>
              <View style={{flex: 1}}>
                  <Text style={styles.subjectTitle}>{item.subject_name}</Text>
                  <Text style={styles.subjectStats}>{item.present} / {item.total_classes} Classes  ·  {item.department} Yr {item.year}</Text>
              </View>
              <View style={[styles.percentageBadge, { backgroundColor: pct >= 75 ? '#E8F5E9' : '#FFF3E0' }]}>
                  <Text style={[styles.subjectPercentageText, { color: pct >= 75 ? '#2E7D32' : '#EF6C00' }]}>{pct}%</Text>
              </View>
          </TouchableOpacity>
          
          {expandedSubject === item.subject_code && (
              <View style={styles.recordsList}>
                  <View style={styles.statsRow}>
                      <View style={styles.statBox}><Text style={[styles.statNum, {color: '#2E7D32'}]}>{item.present}</Text><Text style={styles.statLabel}>Present</Text></View>
                      <View style={styles.statBox}><Text style={[styles.statNum, {color: '#C62828'}]}>{item.absent}</Text><Text style={styles.statLabel}>Absent</Text></View>
                      <View style={styles.statBox}><Text style={[styles.statNum, {color: COLORS.primary}]}>{item.total_classes}</Text><Text style={styles.statLabel}>Total</Text></View>
                  </View>
                  {item.latest_date && (
                      <Text style={styles.latestDate}>Last session: {new Date(item.latest_date).toLocaleString()}</Text>
                  )}
              </View>
          )}
      </View>
    );
  };

  const handleManualLogout = async () => {
      Alert.alert('Logout', 'Are you sure you want to securely log out?', [
          { text: 'Cancel', style: 'cancel' },
          { 
              text: 'Logout', 
              style: 'destructive', 
              onPress: async () => {
                  try { await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK); } catch (e) {}
                  await SecureStore.deleteItemAsync('userSession');
                  await SecureStore.deleteItemAsync('userSessionDate');
                  navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
              }
          }
      ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.modernHeader}>
          <View style={styles.headerTop}>
              <View>
                  <Text style={styles.welcomeText}>Welcome,</Text>
                  <Text style={styles.profileName}>{user.username}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={[styles.activeBadge, { backgroundColor: isActive === 'Active' ? '#4CAF50' : '#F44336', marginRight: 10 }]}>
                      <Text style={styles.activeBadgeText}>{isActive}</Text>
                  </View>
                  <TouchableOpacity onPress={handleManualLogout} style={styles.logoutBtn}>
                      <Text style={styles.logoutText}>Logout</Text>
                  </TouchableOpacity>
              </View>
          </View>
          <View style={styles.infoRow}>
              <Text style={styles.rollNumberText}>ID: {user.rfid_tag || user.username}</Text>
              {currentZone && <Text style={styles.zoneText}>📍 {currentZone}</Text>}
          </View>
      </View>

      <View style={styles.mainScoreCard}>
          <Text style={styles.scoreTitle}>Total Attendance</Text>
          <Text style={styles.scoreSub}>Overall academic performance</Text>
          <View style={styles.progressCircle}>
              <Text style={styles.overallPercentage}>{overallPercentage}%</Text>
          </View>
      </View>

      <Text style={styles.sectionTitle}>Course Breakdown</Text>
      
      {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{marginTop: 20}} />
      ) : subjectData.length === 0 ? (
          <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No attendance records found.</Text>
          </View>
      ) : (
          <FlatList
              data={subjectData}
              keyExtractor={item => item.name}
              renderItem={renderSubject}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 30 }}
          />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF7FB', padding: 20, paddingTop: 30 },
  modernHeader: { marginBottom: 20 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  welcomeText: { fontSize: 16, color: '#7E57C2', fontWeight: '500' },
  profileName: { fontSize: 26, fontWeight: '800', color: COLORS.textDark },
  activeBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  activeBadgeText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
  logoutBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: '#FFEBEE', borderWidth: 1, borderColor: '#FFCDD2' },
  logoutText: { color: '#D32F2F', fontWeight: 'bold', fontSize: 12 },
  infoRow: { flexDirection: 'row', marginTop: 10, alignItems: 'center' },
  rollNumberText: { fontSize: 13, color: '#9E9E9E' },
  zoneText: { fontSize: 13, color: COLORS.primary, marginLeft: 15, fontWeight: '600' },
  mainScoreCard: { backgroundColor: COLORS.primary, borderRadius: 24, padding: 25, alignItems: 'center', marginBottom: 30, elevation: 6 },
  scoreTitle: { color: 'rgba(255,255,255,0.9)', fontSize: 18, fontWeight: '700' },
  scoreSub: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 2 },
  progressCircle: { width: 100, height: 100, borderRadius: 50, borderWidth: 8, borderColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginTop: 15 },
  overallPercentage: { color: COLORS.secondary, fontSize: 32, fontWeight: '900' },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textDark, marginBottom: 15 },
  subjectCard: { backgroundColor: '#ffffff', borderRadius: 18, marginBottom: 15, elevation: 3 },
  subjectHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, alignItems: 'center' },
  subjectTitle: { fontSize: 17, fontWeight: '700', color: '#2c3e50', marginBottom: 4 },
  subjectStats: { fontSize: 13, color: '#9E9E9E' },
  percentageBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  subjectPercentageText: { fontWeight: '800', fontSize: 15 },
  recordsList: { padding: 20, backgroundColor: '#FCFBFF', borderTopWidth: 1, borderColor: '#F5F0F8', borderBottomLeftRadius: 18, borderBottomRightRadius: 18 },
  typeSection: { marginBottom: 5 },
  typeSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, borderBottomWidth: 1, borderBottomColor: '#EEE', paddingBottom: 5 },
  typeTitle: { fontSize: 14, fontWeight: '800', color: COLORS.primary },
  recordItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderColor: '#F5F5F5', alignItems: 'center' },
  recordDate: { fontSize: 14, color: '#616161' },
  statusTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  recordStatus: { fontSize: 13, fontWeight: '700' },
  emptyContainer: { alignItems: 'center', marginTop: 40 },
  emptyText: { color: '#BDBDBD', fontSize: 16 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 10 },
  statBox: { alignItems: 'center', flex: 1 },
  statNum: { fontSize: 24, fontWeight: '900' },
  statLabel: { fontSize: 12, color: '#9E9E9E', fontWeight: '600', marginTop: 2 },
  latestDate: { textAlign: 'center', color: '#9E9E9E', fontSize: 12, marginTop: 8, borderTopWidth: 1, borderTopColor: '#F5F5F5', paddingTop: 8 },
});
