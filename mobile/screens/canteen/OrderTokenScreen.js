import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import QRCode from 'qrcode';

export default function OrderTokenScreen({ route }) {
    const { order } = route.params;
    const [qrDataUri, setQrDataUri] = useState(null);
    const [timeLeft, setTimeLeft] = useState(30 * 60);

    useEffect(() => {
        if (!order || !order.qr_token) return;

        // Generate QR code as base64 data URI (pure JS, no native deps)
        QRCode.toDataURL(order.qr_token, {
            width: 280,
            margin: 2,
            color: { dark: '#000000', light: '#FFFFFF' }
        })
        .then(uri => setQrDataUri(uri))
        .catch(err => console.error('QR generation error:', err));
    }, [order]);

    useEffect(() => {
        if (!order || !order.qr_token) return;
        
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [order]);

    if (!order || !order.qr_token) {
        return <View style={styles.center}><Text>No Token Available</Text></View>;
    }

    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;

    return (
        <View style={styles.container}>
            <View style={styles.card}>
                <Text style={styles.title}>Order Placed!</Text>
                <Text style={styles.subtext}>Show this QR at {order.canteen_name}</Text>
                
                <View style={styles.qrContainer}>
                    {qrDataUri ? (
                        <Image
                            source={{ uri: qrDataUri }}
                            style={styles.qrImage}
                            resizeMode="contain"
                        />
                    ) : (
                        <Text style={{ color: '#999' }}>Generating QR...</Text>
                    )}
                </View>

                {timeLeft > 0 ? (
                    <Text style={styles.timer}>
                        Expires in {minutes}:{seconds < 10 ? '0' : ''}{seconds}
                    </Text>
                ) : (
                    <Text style={[styles.timer, { color: 'red' }]}>Token Expired</Text>
                )}

                <View style={styles.details}>
                    <Text style={styles.bold}>Order ID:</Text>
                    <Text style={styles.idText}>{order.order_id}</Text>
                    
                    <Text style={styles.bold}>Total:</Text>
                    <Text style={styles.amount}>₹{order.total_amount}</Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    container: { flex: 1, backgroundColor: '#6A1B9A', justifyContent: 'center', alignItems: 'center', padding: 20 },
    card: {
        backgroundColor: '#FFFFFF', borderRadius: 20, padding: 30, width: '100%',
        alignItems: 'center', elevation: 10, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10
    },
    title: { fontSize: 26, fontWeight: 'bold', color: '#333', marginBottom: 8 },
    subtext: { fontSize: 16, color: '#666', marginBottom: 30, textAlign: 'center' },
    qrContainer: { padding: 10, backgroundColor: '#FFF', elevation: 5, borderRadius: 10 },
    qrImage: { width: 240, height: 240 },
    timer: { fontSize: 18, fontWeight: 'bold', color: '#E65100', marginTop: 30 },
    details: { marginTop: 20, width: '100%', alignItems: 'center' },
    bold: { fontWeight: 'bold', fontSize: 14, color: '#666', marginTop: 10 },
    idText: { fontSize: 12, color: '#999', marginTop: 2 },
    amount: { fontSize: 22, fontWeight: 'bold', color: '#2E7D32', marginTop: 4 }
});
