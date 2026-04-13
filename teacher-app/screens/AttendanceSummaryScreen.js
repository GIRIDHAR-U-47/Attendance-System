import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, Alert, ActivityIndicator } from 'react-native';

const COLORS = {
  primary: '#6A1B9A',
  secondary: '#000000ff',
  white: '#FFFFFF',
  background: '#FAF7FB',
  cardBg: '#FFFFFF',
  border: '#EDE7F6',
  textDark: '#4A148C',
  success: '#4CAF50',
};

export default function AttendanceSummaryScreen({ navigation, route }) {
  const { subject, presentStudents } = route.params;
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      // API call to finalize attendance records in backend
      await new Promise(resolve => setTimeout(resolve, 1500));
      Alert.alert('Success', 'Attendance for ' + subject.code + ' has been committed securely.', [
        { text: 'OK', onPress: () => navigation.navigate('Subjects') }
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to commit attendance.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStudent = ({ item }) => (
    <View style={styles.studentCard}>
      <Text style={styles.studentName}>{item.name}</Text>
      <Text style={styles.studentRollNo}>({item.rollNo})</Text>
      <View style={{ flex: 1 }} />
      <Text style={styles.statusBadge}>Present</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Summary View</Text>
        <Text style={styles.subtitle}>{subject.code} - {subject.name}</Text>
      </View>

      <View style={styles.statsCard}>
        <Text style={styles.statsLabel}>Total Present</Text>
        <Text style={styles.statsValue}>{presentStudents.length}</Text>
      </View>

      <FlatList
        data={presentStudents}
        keyExtractor={item => item.id}
        renderItem={renderStudent}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={{textAlign: 'center', marginTop: 20, color: '#888'}}>No students were marked present.</Text>}
      />

      <TouchableOpacity 
        style={[styles.submitButton, submitting && { opacity: 0.7 }]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color={COLORS.white} />
        ) : (
          <Text style={styles.submitButtonText}>Commit to Database</Text>
        )}
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { padding: 25 },
  title: { fontSize: 28, fontWeight: '900', color: COLORS.primary, letterSpacing: -0.5 },
  subtitle: { fontSize: 16, color: '#7E57C2', marginTop: 4, fontWeight: '600' },
  
  statsCard: { backgroundColor: COLORS.cardBg, marginHorizontal: 20, padding: 25, borderRadius: 16, alignItems: 'center', borderWidth: 1.5, borderColor: COLORS.border, elevation: 4, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 },
  statsLabel: { color: COLORS.textDark, fontSize: 16, fontWeight: '700' },
  statsValue: { color: COLORS.primary, fontSize: 44, fontWeight: '900', marginTop: 5 },

  list: { padding: 20 },
  studentCard: { backgroundColor: COLORS.cardBg, padding: 18, borderRadius: 12, marginBottom: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, elevation: 1 },
  studentName: { color: '#333', fontSize: 16, fontWeight: 'bold' },
  studentRollNo: { color: '#7E57C2', fontSize: 14, marginLeft: 8, fontWeight: '500' },
  statusBadge: { backgroundColor: '#E8F5E9', color: COLORS.success, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, fontSize: 12, fontWeight: 'bold', overflow: 'hidden' },

  submitButton: { backgroundColor: COLORS.primary, margin: 20, padding: 18, borderRadius: 14, alignItems: 'center', elevation: 6, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 8 },
  submitButtonText: { color: COLORS.white, fontWeight: '900', fontSize: 18 },
});
