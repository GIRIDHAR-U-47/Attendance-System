import Constants from 'expo-constants';

// Hardcoded IP to ensure connectivity during development
const ip = '10.196.91.182'; 

export const API_URL = `http://${ip}:8000/api`;
export const MODEL_URL = `http://${ip}:5000/api`;
console.log(`[Config] Automatically detected Backend URL: ${API_URL}`);
console.log(`[Config] Automatically detected Model URL: ${MODEL_URL}`);
