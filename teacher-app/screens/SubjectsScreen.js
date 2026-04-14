import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView,
  Modal, TextInput, ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import axios from 'axios';
import { API_URL } from '../config';

const C = {
  primary:    '#6A1B9A',
  light:      '#F3E5F5',
  border:     '#EDE7F6',
  bg:         '#FAF7FB',
  white:      '#FFFFFF',
  textDark:   '#4A148C',
  textMid:    '#7E57C2',
  textGray:   '#757575',
  textHint:   '#B0A0C0',
  success:    '#2E7D32',
  successBg:  '#E8F5E9',
  warn:       '#EF6C00',
  warnBg:     '#FFF3E0',
  error:      '#C62828',
  errorBg:    '#FFEBEE',
  disabled:   '#E0E0E0',
};

const DEPARTMENTS = ['CSE', 'IT', 'ECE', 'EEE', 'MECH', 'CIVIL', 'AI&DS', 'AIML'];
const YEARS       = ['1', '2', '3', '4'];
const SEMESTERS   = ['Odd', 'Even'];

// ─────── Reusable Dropdown (absolute overlay list so it never clips) ───────
function Dropdown({ label, value, options, onSelect, placeholder }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ zIndex: open ? 999 : 1 }}>
      <Text style={styles.label}>{label} *</Text>
      <TouchableOpacity
        style={styles.pickerBtn}
        onPress={() => setOpen(o => !o)}
        activeOpacity={0.8}
      >
        <Text style={[styles.pickerValue, !value && { color: C.textHint }]} numberOfLines={1}>
          {value || placeholder}
        </Text>
        <Text style={styles.pickerArrow}>{open ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {open && (
        <View style={styles.dropdownList}>
          <ScrollView
            nestedScrollEnabled
            style={{ maxHeight: 220 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {options.map(opt => {
              const optVal   = typeof opt === 'string' ? opt : opt.value;
              const optLabel = typeof opt === 'string' ? opt : opt.label;
              return (
                <TouchableOpacity
                  key={optVal}
                  style={styles.dropdownItem}
                  onPress={() => { onSelect(optVal); setOpen(false); }}
                >
                  <Text style={[
                    styles.dropdownItemText,
                    value === optVal && styles.dropdownItemActive
                  ]}>
                    {optLabel}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

// ─────── Main Screen ───────
export default function SubjectsScreen({ navigation, route }) {
  const { user } = route.params || {};
  const teacherId = user?.roll_number || user?.username || 'Unknown';

  const [subjects, setSubjects]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [modalVisible, setModalVisible] = useState(false);

  // ── Section 1 state
  const [semester, setSemester]     = useState('');
  const [dept, setDept]             = useState('');
  const [year, setYear]             = useState('');

  // ── Section 2 state
  const [catalog, setCatalog]           = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState(null);

  // ── Section 3 state
  const [students, setStudents]         = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentSearch, setStudentSearch]     = useState('');
  const [selectedStudents, setSelectedStudents] = useState([]);

  // ── Saving
  const [saving, setSaving] = useState(false);

  // ────────────────── Data Fetchers ──────────────────
  const fetchSubjects = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/faculty/subjects/`, { params: { faculty_id: teacherId } });
      setSubjects(res.data);
    } catch (e) { console.error('fetch subjects', e); }
    finally { setLoading(false); }
  }, [teacherId]);

  useEffect(() => { fetchSubjects(); }, [fetchSubjects]);

  // Fetch catalog whenever semester+dept+year all set
  useEffect(() => {
    if (!semester || !dept || !year) { setCatalog([]); setSelectedSubject(null); return; }
    const go = async () => {
      setCatalogLoading(true);
      try {
        const res = await axios.get(`${API_URL}/subjects/catalog/`, {
          params: { department: dept, year, semester }
        });
        setCatalog(res.data);
        setSelectedSubject(null);
      } catch (e) { setCatalog([]); }
      finally { setCatalogLoading(false); }
    };
    go();
  }, [semester, dept, year]);

  // Fetch students whenever dept+year set
  useEffect(() => {
    if (!dept || !year) { setStudents([]); setSelectedStudents([]); return; }
    const go = async () => {
      setStudentsLoading(true);
      try {
        const res = await axios.get(`${API_URL}/students/filter/`, { params: { department: dept, year } });
        setStudents(res.data);
        setSelectedStudents([]);
        setStudentSearch('');
      } catch (e) { setStudents([]); }
      finally { setStudentsLoading(false); }
    };
    go();
  }, [dept, year]);

  // ────────────────── Helpers ──────────────────
  const filteredStudents = students.filter(s =>
    s.username.toLowerCase().includes(studentSearch.toLowerCase()) ||
    s.roll_number.toLowerCase().includes(studentSearch.toLowerCase())
  );

  const toggleStudent = (roll) =>
    setSelectedStudents(p => p.includes(roll) ? p.filter(r => r !== roll) : [...p, roll]);

  const selectAll   = () => setSelectedStudents(filteredStudents.map(s => s.roll_number));
  const deselectAll = () => setSelectedStudents([]);

  const isFormValid = semester && dept && year && selectedSubject && selectedStudents.length > 0;

  const resetForm = () => {
    setSemester(''); setDept(''); setYear('');
    setCatalog([]); setSelectedSubject(null);
    setStudents([]); setSelectedStudents([]); setStudentSearch('');
  };

  // ────────────────── Submit ──────────────────
  const handleCreate = async () => {
    if (!isFormValid) return;
    setSaving(true);
    try {
      const res = await axios.post(`${API_URL}/faculty/create-subject/`, {
        subject_code: selectedSubject.subject_code,
        subject_name: selectedSubject.subject_name,
        department:   dept,
        year:         parseInt(year),
        faculty_id:   teacherId,
        student_ids:  selectedStudents,
        semester:     semester,
      });
      if (res.data.success) {
        Alert.alert('✅ Subject Created', res.data.message);
        setModalVisible(false);
        resetForm();
        fetchSubjects();
      } else {
        Alert.alert('Error', res.data.message);
      }
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to create subject.');
    } finally { setSaving(false); }
  };

  // ────────────────── Render: subject card ──────────────────
  const renderSubjectCard = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('TeacherVerification', { subject: item, teacherId, user })}
      activeOpacity={0.8}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardCode}>{item.subject_code}</Text>
        <Text style={styles.cardBadge}>Year {item.year}</Text>
      </View>
      <Text style={styles.cardName}>{item.subject_name}</Text>
      <View style={styles.cardFooter}>
        <Text style={styles.cardDept}>🏛 {item.department}</Text>
        <Text style={styles.cardFaculty}>👤 {item.faculty_name || teacherId}</Text>
      </View>
    </TouchableOpacity>
  );

  // ────────────────── Render ──────────────────
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Hello, {teacherId}</Text>
        <Text style={styles.subtitle}>Manage your subjects & sessions</Text>
      </View>

      {loading
        ? <ActivityIndicator size="large" color={C.primary} style={{ marginTop: 60 }} />
        : <FlatList
            data={subjects}
            keyExtractor={i => i.subject_code}
            renderItem={renderSubjectCard}
            contentContainerStyle={styles.listPad}
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <Text style={styles.emptyIcon}>📚</Text>
                <Text style={styles.emptyTitle}>No subjects yet</Text>
                <Text style={styles.emptyHint}>Tap + to create your first subject</Text>
              </View>
            }
          />
      }

      {/* ── Floating Action Button ── */}
      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

      {/* ════════════════ MODAL ════════════════ */}
      <Modal visible={modalVisible} animationType="slide" transparent statusBarTranslucent>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalBox}
          >
            {/* Modal Header — fixed */}
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>Create New Subject</Text>
              <TouchableOpacity onPress={() => { setModalVisible(false); resetForm(); }}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Scrollable body — takes all space between header and footer */}
            <ScrollView
              style={{ flex: 1 }}
              showsVerticalScrollIndicator
              contentContainerStyle={{ paddingBottom: 16 }}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
            >

                {/* ───── SECTION 1: Academic Selection ───── */}
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionDot} />
                  <Text style={styles.sectionTitle}>SECTION 1 — Academic Selection</Text>
                </View>

                <Dropdown
                  label="Semester"
                  value={semester}
                  options={SEMESTERS}
                  onSelect={setSemester}
                  placeholder="Select Semester"
                />
                <Dropdown
                  label="Department"
                  value={dept}
                  options={DEPARTMENTS}
                  onSelect={setDept}
                  placeholder="Select Department"
                />
                <Dropdown
                  label="Year"
                  value={year}
                  options={YEARS.map(y => ({ value: y, label: `Year ${y}` }))}
                  onSelect={setYear}
                  placeholder="Select Year"
                />

                {/* ───── SECTION 2: Subject Selection ───── */}
                <View style={[styles.sectionHeader, { marginTop: 20 }]}>
                  <View style={[styles.sectionDot, { backgroundColor: '#1565C0' }]} />
                  <Text style={styles.sectionTitle}>SECTION 2 — Subject Selection</Text>
                </View>

                {!semester || !dept || !year ? (
                  <View style={styles.lockedBox}>
                    <Text style={styles.lockedText}>⬆ Complete Section 1 first</Text>
                  </View>
                ) : catalogLoading ? (
                  <ActivityIndicator color={C.primary} style={{ marginVertical: 18 }} />
                ) : catalog.length === 0 ? (
                  <View style={styles.lockedBox}>
                    <Text style={styles.lockedText}>No subjects found for {dept} Year {year} ({semester})</Text>
                  </View>
                ) : (
                  <Dropdown
                    label="Subject"
                    value={selectedSubject ? `${selectedSubject.subject_code} — ${selectedSubject.subject_name}` : ''}
                    options={catalog.map(s => ({
                      value: s.subject_code,
                      label: `${s.subject_code} — ${s.subject_name}`
                    }))}
                    onSelect={(code) => {
                      const found = catalog.find(s => s.subject_code === code);
                      setSelectedSubject(found || null);
                    }}
                    placeholder="Select Subject"
                  />
                )}

                {/* ───── SECTION 3: Student Enrollment ───── */}
                <View style={[styles.sectionHeader, { marginTop: 20 }]}>
                  <View style={[styles.sectionDot, { backgroundColor: C.success }]} />
                  <Text style={styles.sectionTitle}>SECTION 3 — Student Enrollment</Text>
                </View>

                {!dept || !year ? (
                  <View style={styles.lockedBox}>
                    <Text style={styles.lockedText}>⬆ Select Department & Year first</Text>
                  </View>
                ) : studentsLoading ? (
                  <ActivityIndicator color={C.primary} style={{ marginVertical: 18 }} />
                ) : students.length === 0 ? (
                  <View style={styles.lockedBox}>
                    <Text style={styles.lockedText}>No students found for {dept} Year {year}</Text>
                  </View>
                ) : (
                  <View>
                    {/* Count badge */}
                    <View style={styles.enrollHeader}>
                      <Text style={styles.label}>Select Students</Text>
                      <View style={[
                        styles.countBadge,
                        { backgroundColor: selectedStudents.length > 0 ? C.light : C.disabled }
                      ]}>
                        <Text style={[
                          styles.countBadgeText,
                          { color: selectedStudents.length > 0 ? C.primary : '#9E9E9E' }
                        ]}>
                          {selectedStudents.length} / {students.length}
                        </Text>
                      </View>
                    </View>

                    {/* Search */}
                    <View style={styles.searchBox}>
                      <Text style={styles.searchIcon}>🔍</Text>
                      <TextInput
                        style={styles.searchInput}
                        placeholder="Search by name or roll number..."
                        placeholderTextColor={C.textHint}
                        value={studentSearch}
                        onChangeText={setStudentSearch}
                      />
                      {studentSearch.length > 0 && (
                        <TouchableOpacity onPress={() => setStudentSearch('')}>
                          <Text style={{ color: '#9E9E9E', fontSize: 18, paddingHorizontal: 6 }}>✕</Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* Select / Deselect All */}
                    <View style={styles.selectAllRow}>
                      <TouchableOpacity style={styles.selectAllBtn} onPress={selectAll}>
                        <Text style={[styles.selectAllText, { color: C.success }]}>✔ Select All</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.selectAllBtn, styles.deSelectBtn]} onPress={deselectAll}>
                        <Text style={[styles.selectAllText, { color: C.warn }]}>✕ Deselect All</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Student List */}
                    <View style={styles.studentList}>
                      {filteredStudents.length === 0 ? (
                        <Text style={styles.noMatchText}>No students match "{studentSearch}"</Text>
                      ) : (
                        filteredStudents.map(student => {
                          const selected = selectedStudents.includes(student.roll_number);
                          return (
                            <TouchableOpacity
                              key={student.roll_number}
                              style={[styles.studentRow, selected && styles.studentRowSel]}
                              onPress={() => toggleStudent(student.roll_number)}
                              activeOpacity={0.7}
                            >
                              <View style={[styles.cb, selected && styles.cbSel]}>
                                {selected && <Text style={styles.cbCheck}>✓</Text>}
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={styles.studentName}>{student.username}</Text>
                                <Text style={styles.studentMeta}>
                                  {student.roll_number}  •  {student.department}  •  Yr {student.year_of_joining}
                                </Text>
                              </View>
                              {selected && <View style={styles.selectedDot} />}
                            </TouchableOpacity>
                          );
                        })
                      )}
                    </View>
                  </View>
                )}

            </ScrollView>

            {/* ── Sticky Footer: Create Button ── */}
            <View style={styles.modalFooter}>
              {!isFormValid && (
                <Text style={styles.validationHint}>
                  {!semester ? '⚠ Select Semester' :
                   !dept     ? '⚠ Select Department' :
                   !year     ? '⚠ Select Year' :
                   !selectedSubject ? '⚠ Select a Subject' :
                   selectedStudents.length === 0 ? '⚠ Select at least 1 student' : ''}
                </Text>
              )}
              <TouchableOpacity
                style={[styles.createBtn, !isFormValid && styles.createBtnDisabled]}
                onPress={handleCreate}
                disabled={!isFormValid || saving}
              >
                {saving
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.createBtnText}>
                      {isFormValid
                        ? `Create Subject  (${selectedStudents.length} students)`
                        : 'Complete all sections'}
                    </Text>
                }
              </TouchableOpacity>
            </View>

          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ═══════════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════════
const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: C.bg },
  header:     { padding: 20, marginTop: 20 },
  greeting:   { fontSize: 26, fontWeight: '900', color: C.primary },
  subtitle:   { fontSize: 15, color: C.textMid, marginTop: 5, fontWeight: '500' },
  listPad:    { paddingHorizontal: 20, paddingBottom: 100 },

  // Subject cards
  card: {
    backgroundColor: C.white, borderRadius: 16, padding: 20, marginBottom: 15,
    borderWidth: 1.5, borderColor: C.border, elevation: 2,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardCode:   { color: C.textDark, fontSize: 18, fontWeight: '800' },
  cardBadge:  { backgroundColor: C.light, color: C.primary, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, fontSize: 12, fontWeight: '700', overflow: 'hidden' },
  cardName:   { color: '#333', fontSize: 16, marginBottom: 10, fontWeight: '600' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  cardDept:   { color: C.textGray, fontSize: 13, fontWeight: '500' },
  cardFaculty:{ color: '#9C27B0', fontSize: 13, fontWeight: '500' },

  // Empty
  emptyBox:   { alignItems: 'center', marginTop: 80 },
  emptyIcon:  { fontSize: 60, marginBottom: 15 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: C.textDark },
  emptyHint:  { fontSize: 14, color: '#9E9E9E', marginTop: 8 },

  // FAB
  fab: {
    position: 'absolute', bottom: 30, right: 25,
    backgroundColor: C.primary, width: 62, height: 62, borderRadius: 31,
    alignItems: 'center', justifyContent: 'center',
    elevation: 10, shadowColor: C.primary, shadowOpacity: 0.45, shadowRadius: 12, shadowOffset: { width: 0, height: 6 },
  },
  fabIcon: { color: '#fff', fontSize: 34, lineHeight: 38, fontWeight: '300' },

  // Modal shell
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: C.white,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    height: '88%',          // fixed height so ScrollView has real space to expand into
    paddingTop: 20,
    paddingHorizontal: 22,
    // NOTE: no flex:0 here — that was what collapsed the ScrollView to zero height
  },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  modalTitle:{ fontSize: 20, fontWeight: '900', color: C.textDark },
  closeBtn:  { fontSize: 22, color: '#9E9E9E', fontWeight: '600', padding: 4 },

  // Sections
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, marginTop: 4 },
  sectionDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.primary, marginRight: 8 },
  sectionTitle: { fontSize: 11, fontWeight: '800', color: '#9E9E9E', letterSpacing: 0.8, textTransform: 'uppercase' },

  // Dropdown
  label:           { fontSize: 14, fontWeight: '700', color: C.textDark, marginBottom: 7, marginTop: 14, marginLeft: 1 },
  pickerBtn:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FAFAFA', borderWidth: 1.5, borderColor: C.border, borderRadius: 12, padding: 14 },
  pickerValue:     { fontSize: 15, color: '#333', fontWeight: '600', flex: 1 },
  pickerPlaceholder: { fontSize: 15, color: C.textHint, flex: 1 },
  pickerArrow:     { fontSize: 12, color: '#9E9E9E', marginLeft: 8 },
  dropdownList:    { backgroundColor: C.white, borderWidth: 1.5, borderColor: C.border, borderRadius: 12, marginTop: 4, elevation: 10, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  dropdownItem:    { padding: 14, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  dropdownItemText:{ fontSize: 15, color: '#333' },
  dropdownItemActive: { color: C.primary, fontWeight: '800' },

  // Locked placeholder
  lockedBox:  { backgroundColor: '#F9F9F9', borderRadius: 12, padding: 16, borderWidth: 1.5, borderColor: '#EEEEEE', alignItems: 'center', marginTop: 6 },
  lockedText: { color: '#BDBDBD', fontSize: 14, fontWeight: '600' },

  // Enrollment section
  enrollHeader:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  countBadge:  { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  countBadgeText: { fontSize: 13, fontWeight: '800' },

  searchBox:   { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F5', borderRadius: 12, paddingHorizontal: 12, marginTop: 10, marginBottom: 8, borderWidth: 1.5, borderColor: C.border },
  searchIcon:  { marginRight: 8, fontSize: 15 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 14, color: '#333' },

  selectAllRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  selectAllBtn: { flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center', backgroundColor: C.successBg, borderWidth: 1.5, borderColor: C.success },
  deSelectBtn:  { backgroundColor: C.warnBg, borderColor: C.warn },
  selectAllText:{ fontSize: 13, fontWeight: '700' },

  studentList: { maxHeight: 270 },
  studentRow:  { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#FAFAFA', borderRadius: 12, marginBottom: 8, borderWidth: 1.5, borderColor: '#EEE' },
  studentRowSel: { borderColor: C.primary, backgroundColor: C.light },
  cb:          { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: '#CCC', marginRight: 12, alignItems: 'center', justifyContent: 'center' },
  cbSel:       { backgroundColor: C.primary, borderColor: C.primary },
  cbCheck:     { color: '#fff', fontSize: 14, fontWeight: '900' },
  studentName: { fontSize: 15, fontWeight: '700', color: '#333' },
  studentMeta: { fontSize: 12, color: C.textGray, marginTop: 2 },
  selectedDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.primary, marginLeft: 8 },
  noMatchText: { textAlign: 'center', color: '#BDBDBD', marginVertical: 16, fontSize: 14 },

  // Footer
  modalFooter: { paddingTop: 14, paddingBottom: Platform.OS === 'ios' ? 28 : 16, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  validationHint: { textAlign: 'center', color: C.warn, fontWeight: '600', fontSize: 13, marginBottom: 10 },
  createBtn:   { backgroundColor: C.primary, borderRadius: 14, padding: 18, alignItems: 'center', elevation: 4 },
  createBtnDisabled: { backgroundColor: '#BDBDBD', elevation: 0 },
  createBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
