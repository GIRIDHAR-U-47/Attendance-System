import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Linking, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';

const API_URL = 'http://10.109.104.182:8000/api';

const COLORS = {
    primary: '#6A1B9A',
    secondary: '#FFD700',
    white: '#FFFFFF',
    background: '#FAF7FB',
    textDark: '#4A148C',
    textLight: '#7E57C2'
};

export default function NotesScreen() {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedSubject, setExpandedSubject] = useState(null);

  useEffect(() => {
    const fetchNotes = async () => {
      try {
        const res = await axios.get(`${API_URL}/notes/`);
        // Group by Subject
        const grouped = res.data.reduce((acc, note) => {
            const found = acc.find(s => s.name === note.subject);
            if (found) {
                found.notes.push(note);
            } else {
                acc.push({ name: note.subject, notes: [note] });
            }
            return acc;
        }, []);
        setSections(grouped);
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };
    fetchNotes();
  }, []);

  const toggleSubject = (name) => {
      setExpandedSubject(expandedSubject === name ? null : name);
  };

  const renderSubject = ({ item }) => (
    <View style={styles.subjectCard}>
        <TouchableOpacity style={styles.subjectHeader} onPress={() => toggleSubject(item.name)}>
            <View style={styles.subjectIconContainer}>
                <Ionicons name="library" size={24} color={COLORS.primary} />
            </View>
            <View style={{flex: 1}}>
                <Text style={styles.subjectCardTitle}>{item.name}</Text>
                <Text style={styles.noteCountText}>{item.notes.length} Study Materials</Text>
            </View>
            <Ionicons 
                name={expandedSubject === item.name ? "chevron-up" : "chevron-down"} 
                size={20} 
                color="#9E9E9E" 
            />
        </TouchableOpacity>

        {expandedSubject === item.name && (
            <View style={styles.notesContainer}>
                {item.notes.map(note => (
                    <TouchableOpacity 
                        key={note.id} 
                        style={styles.noteItem} 
                        onPress={() => Linking.openURL(note.file_url)}
                    >
                        <View style={styles.noteItemInfo}>
                            <Ionicons name="document-text" size={18} color={COLORS.textLight} style={{marginRight: 10}} />
                            <Text style={styles.noteItemTitle}>{note.title}</Text>
                        </View>
                        <View style={styles.downloadBadge}>
                            <Ionicons name="download" size={14} color="#fff" />
                        </View>
                    </TouchableOpacity>
                ))}
            </View>
        )}
    </View>
  );

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{marginTop: 50}} />
      ) : sections.length === 0 ? (
        <View style={styles.emptyContainer}>
            <Ionicons name="folder-open" size={70} color="#E0E0E0" />
            <Text style={styles.empty}>No notes found for your subjects.</Text>
        </View>
      ) : (
        <FlatList
          data={sections}
          keyExtractor={(item) => item.name}
          renderItem={renderSubject}
          contentContainerStyle={{ padding: 15 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, paddingTop: 30 },
  
  subjectCard: { 
      backgroundColor: COLORS.white, 
      borderRadius: 20, 
      marginBottom: 15, 
      overflow: 'hidden',
      elevation: 4,
      shadowColor: '#6A1B9A',
      shadowOpacity: 0.1,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 }
  },
  subjectHeader: { 
      flexDirection: 'row', 
      alignItems: 'center', 
      padding: 18,
  },
  subjectIconContainer: { 
      width: 50, 
      height: 50, 
      borderRadius: 15, 
      backgroundColor: '#F3E5F5', 
      alignItems: 'center', 
      justifyContent: 'center', 
      marginRight: 15 
  },
  subjectCardTitle: { 
      fontSize: 17, 
      fontWeight: '800', 
      color: COLORS.textDark, 
      marginBottom: 2 
  },
  noteCountText: { 
      fontSize: 12, 
      color: '#9E9E9E',
      fontWeight: '500' 
  },

  notesContainer: { 
      backgroundColor: '#FCFBFF', 
      paddingHorizontal: 15, 
      paddingBottom: 15,
      borderTopWidth: 1,
      borderTopColor: '#F5F5F5'
  },
  noteItem: { 
      flexDirection: 'row', 
      alignItems: 'center', 
      justifyContent: 'row',
      backgroundColor: COLORS.white,
      padding: 15,
      borderRadius: 12,
      marginTop: 10,
      borderWidth: 1,
      borderColor: '#F0F0F0',
      justifyContent: 'space-between'
  },
  noteItemInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  noteItemTitle: { fontSize: 14, fontWeight: '600', color: '#424242' },
  downloadBadge: { 
      backgroundColor: COLORS.primary, 
      width: 24, 
      height: 24, 
      borderRadius: 8, 
      alignItems: 'center', 
      justifyContent: 'center' 
  },

  emptyContainer: { alignItems: 'center', marginTop: 100 },
  empty: { textAlign: 'center', marginTop: 15, fontSize: 16, color: '#9E9E9E', fontWeight: '500' }
});
