import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const COLORS = {
    primary: '#6A1B9A',
    secondary: '#FFD700',
    white: '#FFFFFF',
    background: '#FAF7FB',
    textDark: '#4A148C',
    textLight: '#7E57C2'
};

const COURSES = [
    { id: '1', name: 'Natural Language Processing', code: 'AI23632', group: 'NLP_AIML_2023_Group_2', type: 'Lecture', status: 'On Going' },
    { id: '2', name: 'Natural Language Processing', code: 'AI23632', group: 'NLP_AIML_2023_Practical_2', type: 'Practical', status: 'Previous' },
    { id: '3', name: 'Secure Systems Engineering', code: 'AI23611', group: 'SSE_AIML_2023_Group_3', type: 'Lecture', status: 'On Going' },
    { id: '4', name: 'Predictive and Prescriptive Analytics', code: 'AI23631', group: 'PPA_AIML_2023_Group_1', type: 'Lecture', status: 'On Going' },
    { id: '5', name: 'Predictive and Prescriptive Analytics', code: 'AI23631', group: 'PPA_AIML_2023_Practical_1', type: 'Practical', status: 'Previous' },
    { id: '6', name: 'Design Thinking and Innovation', code: 'GE23627', group: 'DTI_AIML_2023_Group_3', type: 'Practical', status: 'On Going' },
    { id: '7', name: 'Problem Solving Techniques', code: 'GE23621', group: 'PST_AIML_2023_Practical_1', type: 'Practical', status: 'Previous' },
    { id: '8', name: 'Generative AI', code: 'AD23633', group: 'GEN_AI_2023_Group2', type: 'Lecture', status: 'On Going' },
    { id: '9', name: 'Generative AI', code: 'AD23633', group: 'GEN_AI_2023_PRACTICAL_2A', type: 'Practical', status: 'On Going' },
];

export default function AttendanceScreen() {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('On Going');

    const filteredCourses = COURSES.filter(course => 
        (course.status === activeTab || activeTab === 'Classroom') &&
        (course.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
         course.code.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const renderCourse = ({ item }) => (
        <TouchableOpacity style={styles.courseCard}>
            <View style={styles.cardHeader}>
                <View style={styles.iconContainer}>
                    <Ionicons name={item.type === 'Lecture' ? 'book' : 'flask'} size={24} color={COLORS.primary} />
                </View>
                <View style={styles.headerText}>
                    <Text style={styles.courseName}>{item.name} [{item.code}]</Text>
                    <Text style={styles.groupName}>{item.group}</Text>
                </View>
            </View>
            <View style={styles.cardFooter}>
                <View style={[styles.typeBadge, { backgroundColor: item.type === 'Lecture' ? '#E1F5FE' : '#F3E5F5' }]}>
                    <Text style={[styles.typeText, { color: item.type === 'Lecture' ? '#0288D1' : '#7B1FA2' }]}>{item.type}</Text>
                </View>
                <Text style={styles.statusText}>{item.status}</Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            {/* Tab Navigation */}
            <View style={styles.tabBar}>
                {['Classroom', 'On Going', 'Previous'].map(tab => (
                    <TouchableOpacity 
                        key={tab} 
                        onPress={() => setActiveTab(tab)}
                        style={[styles.tabItem, activeTab === tab && styles.activeTabItem]}
                    >
                        <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{tab}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#9E9E9E" style={styles.searchIcon} />
                <TextInput 
                    style={styles.searchInput}
                    placeholder="Search by course, code, faculty..."
                    placeholderTextColor="#9E9E9E"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            {/* Course List */}
            <FlatList
                data={filteredCourses}
                keyExtractor={item => item.id}
                renderItem={renderCourse}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={<Text style={styles.emptyText}>No courses found.</Text>}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    tabBar: { flexDirection: 'row', backgroundColor: COLORS.white, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#EEE' },
    tabItem: { flex: 1, alignItems: 'center', paddingVertical: 8 },
    activeTabItem: { borderBottomWidth: 3, borderBottomColor: COLORS.primary },
    tabText: { fontSize: 14, fontWeight: '700', color: '#9E9E9E' },
    activeTabText: { color: COLORS.primary },
    
    searchContainer: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        backgroundColor: COLORS.white, 
        margin: 15, 
        paddingHorizontal: 15, 
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        height: 50
    },
    searchIcon: { marginRight: 10 },
    searchInput: { flex: 1, fontSize: 15, color: COLORS.textDark },

    listContent: { paddingHorizontal: 15, paddingBottom: 20 },
    courseCard: { 
        backgroundColor: COLORS.white, 
        borderRadius: 16, 
        padding: 16, 
        marginBottom: 15,
        elevation: 3,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 }
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center' },
    iconContainer: { width: 45, height: 45, borderRadius: 12, backgroundColor: '#F3E5F5', alignItems: 'center', justifyContent: 'center', marginRight: 15 },
    headerText: { flex: 1 },
    courseName: { fontSize: 16, fontWeight: '800', color: COLORS.textDark, marginBottom: 4 },
    groupName: { fontSize: 13, color: '#757575', fontWeight: '500' },
    
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 15, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F5F5F5' },
    typeBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 },
    typeText: { fontSize: 11, fontWeight: '800' },
    statusText: { fontSize: 12, color: '#9E9E9E', fontWeight: '600' },
    
    emptyText: { textAlign: 'center', marginTop: 40, color: '#9E9E9E', fontSize: 16 }
});
