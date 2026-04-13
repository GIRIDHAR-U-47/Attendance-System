import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView } from 'react-native';

const COLORS = {
  primary: '#6A1B9A', // REC Purple
  white: '#FFFFFF',
  background: '#FAF7FB',
  textLight: '#8E24AA',
  textDark: '#4A148C',
  cardBg: '#FFFFFF',
  border: '#EDE7F6',
};

export default function SubjectsScreen({ navigation, route }) {
  const { teacherId } = route.params || { teacherId: 'Unknown' };

  // Hardcoded mockup for subjects
  const subjects = [
    { id: '1', code: 'CS101', name: 'Introduction to Computer Science', department: 'CSE', year: '1st Year' },
    { id: '2', code: 'IT202', name: 'Data Structures and Algorithms', department: 'IT', year: '2nd Year' },
    { id: '3', code: 'AI304', name: 'Machine Learning Basics', department: 'AI&DS', year: '3rd Year' },
  ];

  const handleSelectSubject = (subject) => {
    navigation.navigate('TeacherVerification', { subject, teacherId });
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.card} onPress={() => handleSelectSubject(item)}>
      <View style={styles.cardHeader}>
        <Text style={styles.subjectCode}>{item.code}</Text>
        <Text style={styles.badge}>{item.year}</Text>
      </View>
      <Text style={styles.subjectName}>{item.name}</Text>
      <Text style={styles.department}>Dept: {item.department}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Hello, {teacherId}</Text>
        <Text style={styles.subtitle}>Select a subject to take attendance</Text>
      </View>

      <FlatList
        data={subjects}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    padding: 20,
    marginTop: 20,
  },
  greeting: {
    fontSize: 26,
    fontWeight: '900',
    color: COLORS.primary,
  },
  subtitle: {
    fontSize: 16,
    color: '#7E57C2',
    marginTop: 5,
    fontWeight: '500',
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  card: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 20,
    marginBottom: 15,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    elevation: 2,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  subjectCode: {
    color: COLORS.textDark,
    fontSize: 18,
    fontWeight: '800',
  },
  badge: {
    backgroundColor: '#F3E5F5',
    color: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    fontSize: 12,
    fontWeight: '700',
    overflow: 'hidden',
  },
  subjectName: {
    color: '#333',
    fontSize: 16,
    marginBottom: 8,
    fontWeight: '600',
  },
  department: {
    color: '#757575',
    fontSize: 14,
    fontWeight: '500',
  },
});
