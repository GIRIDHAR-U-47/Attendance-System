import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import axios from 'axios';
import { API_URL } from '../../config';

export default function CanteenMenuScreen({ route, navigation }) {
    const { canteen_id, canteen_name } = route.params;
    const [menu, setMenu] = useState([]);
    const [cart, setCart] = useState({}); // { item_id: { details, quantity } }
    const [loading, setLoading] = useState(true);
    const [checkingOut, setCheckingOut] = useState(false);

    // Hardcoded user info for demo (ideally pass from App.js route params or context)
    // As in App.js MainTabs receives route.params.user
    const student = route.params?.user || { roll_number: 'S001', role: 'student' };

    useEffect(() => {
        axios.get(`${API_URL}/student/canteen/${canteen_id}/menu/`)
            .then(res => {
                setMenu(res.data.items || []);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, [canteen_id]);

    const addToCart = (item) => {
        setCart(prev => {
            const qty = prev[item.item_id] ? prev[item.item_id].quantity + 1 : 1;
            return { ...prev, [item.item_id]: { ...item, quantity: qty } };
        });
    };

    const removeFromCart = (itemId) => {
        setCart(prev => {
            if (!prev[itemId]) return prev;
            const res = { ...prev };
            res[itemId].quantity -= 1;
            if (res[itemId].quantity <= 0) delete res[itemId];
            return res;
        });
    };

    const cartTotal = Object.values(cart).reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const cartCount = Object.values(cart).reduce((sum, item) => sum + item.quantity, 0);

    const handleCheckout = async () => {
        if (cartCount === 0) return;
        setCheckingOut(true);
        const orderPayload = {
            student_id: student.roll_number,
            canteen_id: canteen_id,
            items: Object.values(cart).map(i => ({ item_id: i.item_id, quantity: i.quantity }))
        };

        try {
            const res = await axios.post(`${API_URL}/student/place-food-order/`, orderPayload);
            setCheckingOut(false);
            setCart({});
            // Navigate to token screen
            navigation.navigate('OrderToken', { order: res.data });
        } catch (err) {
            setCheckingOut(false);
            Alert.alert("Checkout Failed", err.response?.data?.error || "Error placing order");
        }
    };

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#6A1B9A" /></View>;

    return (
        <View style={styles.container}>
            <Text style={styles.title}>{canteen_name} Menu</Text>
            <FlatList
                data={menu}
                keyExtractor={item => item.item_id}
                contentContainerStyle={{ paddingBottom: 100 }}
                renderItem={({ item }) => (
                    <View style={styles.card}>
                        <View style={styles.itemInfo}>
                            <Text style={styles.itemName}>{item.item_name}</Text>
                            <Text style={styles.category}>{item.category_name}</Text>
                            <Text style={styles.price}>₹{item.price}</Text>
                        </View>
                        <View style={styles.actionRow}>
                            {cart[item.item_id] ? (
                                <View style={styles.qtyBox}>
                                    <TouchableOpacity style={styles.qtyBtn} onPress={() => removeFromCart(item.item_id)}>
                                        <Text style={styles.qtyText}>-</Text>
                                    </TouchableOpacity>
                                    <Text style={styles.qtyLabel}>{cart[item.item_id].quantity}</Text>
                                    <TouchableOpacity style={styles.qtyBtn} onPress={() => addToCart(item)}>
                                        <Text style={styles.qtyText}>+</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <TouchableOpacity style={styles.addBtn} onPress={() => addToCart(item)}>
                                    <Text style={styles.addBtnText}>ADD</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                )}
                ListEmptyComponent={<Text style={styles.emptyText}>No food items available</Text>}
            />

            {cartCount > 0 && (
                <View style={styles.cartFooter}>
                    <View>
                        <Text style={styles.cartItems}>{cartCount} item(s)</Text>
                        <Text style={styles.cartTotal}>₹{cartTotal}</Text>
                    </View>
                    <TouchableOpacity style={styles.checkoutBtn} onPress={handleCheckout} disabled={checkingOut}>
                        {checkingOut ? <ActivityIndicator color="#FFF" /> : <Text style={styles.checkoutText}>Place Order</Text>}
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    container: { flex: 1, backgroundColor: '#F5F5F5' },
    title: { fontSize: 22, fontWeight: 'bold', color: '#6A1B9A', margin: 16 },
    card: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        backgroundColor: '#FFFFFF', padding: 16, marginHorizontal: 16, marginBottom: 12,
        borderRadius: 12, elevation: 1
    },
    itemInfo: { flex: 1 },
    itemName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
    category: { fontSize: 13, color: '#888', marginTop: 2 },
    price: { fontSize: 16, fontWeight: 'bold', color: '#2E7D32', marginTop: 6 },
    actionRow: { marginLeft: 16 },
    addBtn: { borderColor: '#6A1B9A', borderWidth: 1, borderRadius: 6, paddingVertical: 6, paddingHorizontal: 16 },
    addBtnText: { color: '#6A1B9A', fontWeight: 'bold' },
    qtyBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F0F0', borderRadius: 6 },
    qtyBtn: { paddingHorizontal: 12, paddingVertical: 6 },
    qtyText: { fontSize: 18, color: '#6A1B9A', fontWeight: 'bold' },
    qtyLabel: { fontWeight: 'bold', marginHorizontal: 8 },
    cartFooter: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: '#FFFFFF', padding: 16, flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'center', borderTopWidth: 1, borderColor: '#DDD', elevation: 10
    },
    cartItems: { color: '#666', fontSize: 12 },
    cartTotal: { fontSize: 20, fontWeight: 'bold', color: '#333' },
    checkoutBtn: { backgroundColor: '#6A1B9A', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8 },
    checkoutText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 }
});
