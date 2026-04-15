import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import axios from 'axios';
import { API_URL } from '../../config';

export default function CanteenListScreen({ navigation }) {
    const [canteens, setCanteens] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        axios.get(`${API_URL}/student/canteens/`)
            .then(res => {
                setCanteens(res.data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#6A1B9A" /></View>;

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Campus Canteens</Text>
            <FlatList
                data={canteens}
                keyExtractor={item => item.canteen_id}
                renderItem={({ item }) => (
                    <TouchableOpacity 
                        style={styles.card}
                        onPress={() => navigation.navigate('CanteenMenu', { canteen_id: item.canteen_id, canteen_name: item.canteen_name })}
                    >
                        <Text style={styles.canteenName}>{item.canteen_name}</Text>
                        <Text style={styles.subtext}>{item.location_inside_campus}</Text>
                        <Text style={styles.status}>🟢 Open Now</Text>
                    </TouchableOpacity>
                )}
                ListEmptyComponent={<Text style={styles.emptyText}>No Active Canteens Found</Text>}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    container: { flex: 1, backgroundColor: '#F5F5F5', padding: 16 },
    title: { fontSize: 24, fontWeight: 'bold', color: '#6A1B9A', marginBottom: 16 },
    card: {
        backgroundColor: '#FFFFFF',
        padding: 20,
        borderRadius: 12,
        marginBottom: 12,
        elevation: 2,
        shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }
    },
    canteenName: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    subtext: { color: '#666', marginTop: 4 },
    status: { color: '#2E7D32', marginTop: 8, fontWeight: 'bold' },
    emptyText: { textAlign: 'center', marginTop: 40, color: '#888' }
});
