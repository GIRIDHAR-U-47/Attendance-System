import localforage from 'localforage';
import axios from 'axios';

// Initialize IndexedDB instances
export const ordersDB = localforage.createInstance({ name: 'CanteenOrders' });
export const syncQueueDB = localforage.createInstance({ name: 'SyncQueue' });

export const getApiUrl = () => {
    return 'http://127.0.0.1:8000';
};

// Start Background Syc
export const startBackgroundSync = (canteenId) => {
    window.addEventListener('online', () => {
        console.log("Internet restored. Triggering sync...");
        syncOfflineRedemptions(canteenId);
    });
};

export const syncOfflineRedemptions = async (canteenId) => {
    if (!navigator.onLine) return;

    try {
        const queue = await syncQueueDB.getItem('pendingRedemptions') || [];
        if (queue.length === 0) return;

        console.log(`Syncing ${queue.length} offline scans...`);
        const response = await axios.post(`${getApiUrl()}/api/canteen/sync-offline-orders/`, {
            canteen_id: canteenId,
            redeemed_tokens: queue
        });

        if (response.data.synced > 0 || response.data.failed.length > 0) {
            // Clear successfully synced ones from local queue
            // In a production app you'd map successes securely, here we just flush for simplicity
            await syncQueueDB.setItem('pendingRedemptions', []);
            console.log("Sync complete", response.data);
        }
    } catch (err) {
        console.error("Sync failed, will retry later.", err);
    }
};

export const markOrderRedeemedOffline = async (token) => {
    // Save to sync queue
    const queue = await syncQueueDB.getItem('pendingRedemptions') || [];
    if (!queue.includes(token)) {
        queue.push(token);
        await syncQueueDB.setItem('pendingRedemptions', queue);
    }
    
    // Attempt live sync immediately
    if (navigator.onLine) {
        // Will be triggered by the Scanner Component directly 
        // This is just a backup store
    }
};
