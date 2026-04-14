import React from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, SafeAreaView
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

const C = {
  primary:   '#6A1B9A',
  light:     '#F3E5F5',
  border:    '#EDE7F6',
  bg:        '#FAF7FB',
  white:     '#FFFFFF',
  textDark:  '#4A148C',
  textMid:   '#7E57C2',
  success:   '#2E7D32',
  successBg: '#E8F5E9',
  absent:    '#C62828',
  absentBg:  '#FFEBEE',
};

export default function AttendanceSummaryScreen({ navigation, route }) {
  const { subject, presentStudents, sessionStats, user } = route.params;

  // Resolve correct field names (normalized model uses subject_code / subject_name)
  const subjectCode = subject?.subject_code || subject?.code || '—';
  const subjectName = subject?.subject_name || subject?.name || '—';

  const expected = sessionStats?.expected ?? presentStudents?.length ?? 0;
  const present  = sessionStats?.present  ?? presentStudents?.length ?? 0;
  const absent   = sessionStats?.absent   ?? (expected - present);

  const renderStudent = ({ item }) => (
    <View style={styles.studentCard}>
      <View style={styles.presentDot} />
      <View style={{ flex: 1 }}>
        <Text style={styles.studentName}>{item.name}</Text>
        <Text style={styles.studentRoll}>{item.rollNo}</Text>
      </View>
      <Text style={styles.timeBadge}>{item.time}</Text>
      <View style={styles.statusBadge}>
        <Ionicons name="checkmark-circle" size={14} color={C.success} style={{ marginRight: 4 }} />
        <Text style={styles.statusText}>Present</Text>
      </View>
    </View>
  );

  const handleDone = () => {
    // Navigate back to Subjects with user param so subjects load correctly
    navigation.navigate('Subjects', { user });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={styles.title}>Session Complete</Text>
          <Ionicons name="checkmark-circle" size={26} color={C.success} style={{ marginLeft: 8 }} />
        </View>
        <Text style={styles.subtitle}>{subjectCode} — {subjectName}</Text>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { borderColor: C.primary }]}>
          <Text style={styles.statNum}>{expected}</Text>
          <Text style={styles.statLabel}>Expected</Text>
        </View>
        <View style={[styles.statCard, { borderColor: C.success }]}>
          <Text style={[styles.statNum, { color: C.success }]}>{present}</Text>
          <Text style={styles.statLabel}>Present</Text>
        </View>
        <View style={[styles.statCard, { borderColor: C.absent }]}>
          <Text style={[styles.statNum, { color: C.absent }]}>{absent}</Text>
          <Text style={styles.statLabel}>Absent</Text>
        </View>
      </View>

      {/* Attendance % bar */}
      <View style={styles.progressWrapper}>
        <View style={styles.progressBg}>
          <View style={[
            styles.progressFill,
            { width: expected > 0 ? `${Math.round((present / expected) * 100)}%` : '0%' }
          ]} />
        </View>
        <Text style={styles.progressLabel}>
          {expected > 0 ? Math.round((present / expected) * 100) : 0}% attendance
        </Text>
      </View>

      {/* Present students list */}
      <Text style={styles.listTitle}>Students Marked Present</Text>
      <FlatList
        data={presentStudents}
        keyExtractor={item => item.id}
        renderItem={renderStudent}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <MaterialCommunityIcons name="clipboard-text-outline" size={50} color={C.border} />
            <Text style={styles.emptyText}>No students were marked present this session.</Text>
          </View>
        }
      />

      {/* Done button → back to Subjects (home) */}
      <TouchableOpacity style={styles.doneBtn} onPress={handleDone}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="home-outline" size={20} color={C.white} style={{ marginRight: 8 }} />
          <Text style={styles.doneBtnText}>Back to Dashboard</Text>
        </View>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  header: { padding: 24, paddingBottom: 12 },
  title:  { fontSize: 26, fontWeight: '900', color: C.primary },
  subtitle: { fontSize: 15, color: C.textMid, marginTop: 4, fontWeight: '600' },

  statsRow: { flexDirection: 'row', marginHorizontal: 20, gap: 10, marginBottom: 14 },
  statCard: {
    flex: 1, backgroundColor: C.white, borderRadius: 14, padding: 14,
    alignItems: 'center', borderWidth: 2, elevation: 2,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 3 },
  },
  statNum:   { fontSize: 32, fontWeight: '900', color: C.primary },
  statLabel: { fontSize: 12, fontWeight: '700', color: '#9E9E9E', marginTop: 4 },

  progressWrapper: { marginHorizontal: 20, marginBottom: 16 },
  progressBg: { height: 10, backgroundColor: '#EDE7F6', borderRadius: 10, overflow: 'hidden' },
  progressFill: { height: 10, backgroundColor: C.success, borderRadius: 10 },
  progressLabel: { fontSize: 13, color: C.textMid, fontWeight: '700', marginTop: 6, textAlign: 'right' },

  listTitle: { fontSize: 13, fontWeight: '800', color: '#9E9E9E', letterSpacing: 0.8, marginHorizontal: 20, marginBottom: 8, textTransform: 'uppercase' },
  list: { paddingHorizontal: 20, paddingBottom: 20 },

  studentCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: C.white,
    borderRadius: 12, padding: 14, marginBottom: 10,
    borderWidth: 1.5, borderColor: C.border, elevation: 1,
  },
  presentDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.success, marginRight: 10 },
  studentName: { fontSize: 15, fontWeight: '700', color: '#333' },
  studentRoll: { fontSize: 12, color: '#757575', marginTop: 2 },
  timeBadge:   { fontSize: 12, color: '#BDBDBD', marginRight: 10 },
  statusBadge: { backgroundColor: C.successBg, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, flexDirection: 'row', alignItems: 'center' },
  statusText:  { color: C.success, fontSize: 12, fontWeight: '800' },

  emptyBox:  { alignItems: 'center', marginTop: 40 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { color: '#BDBDBD', fontSize: 14, textAlign: 'center' },

  doneBtn: {
    backgroundColor: C.primary, margin: 20, padding: 18,
    borderRadius: 14, alignItems: 'center', elevation: 6,
    shadowColor: C.primary, shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 6 },
  },
  doneBtnText: { color: C.white, fontWeight: '900', fontSize: 17 },
});
