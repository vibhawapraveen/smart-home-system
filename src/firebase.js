// ─────────────────────────────────────────────────────────
// IMPORTANT: Replace these with YOUR Firebase project config
// from: Firebase Console → Project Settings → General → Web apps
// ─────────────────────────────────────────────────────────
import { initializeApp } from "firebase/app";
import { getFirestore, collection, onSnapshot, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { getDatabase, ref, onValue, push, set } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyDo1ZkFPj_aeikNDI5c-xf7PnJcCDKWunI",
  authDomain: "smart-home-monitor-88c3b.firebaseapp.com",
  databaseURL: "https://smart-home-monitor-88c3b-default-rtdb.firebaseio.com",
  projectId: "smart-home-monitor-88c3b",
  storageBucket: "smart-home-monitor-88c3b.firebasestorage.app",
  messagingSenderId: "897518654050",
  appId: "1:897518654050:web:1234567890abcdef" // Placeholder web app ID
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const rtdb = getDatabase(app);

export const HOME_ID = "home_001";

// ── Firestore helpers ──
export const devicesRef = (homeId = HOME_ID) =>
  collection(db, `homes/${homeId}/devices`);

export const floorsRef = (homeId = HOME_ID) =>
  collection(db, `homes/${homeId}/floors`);

export async function toggleDeviceState(deviceId, currentState, homeId = HOME_ID) {
  const newState = currentState === "ON" ? "OFF" : "ON";
  await updateDoc(doc(db, `homes/${homeId}/devices/${deviceId}`), {
    state: newState,
    lastUpdated: serverTimestamp(),
    ...(newState === "ON" ? { onSince: serverTimestamp() } : { onSince: null })
  });
  return newState;
}

export async function updateSwitchState(deviceId, switchKey, newState, homeId = HOME_ID) {
  await updateDoc(doc(db, `homes/${homeId}/devices/${deviceId}`), {
    [`switchStates.${switchKey}`]: newState,
    lastUpdated: serverTimestamp()
  });
}

// ── RTDB helpers ──
export function subscribeToAlerts(homeId = HOME_ID, callback) {
  const alertsRef = ref(rtdb, `homes/${homeId}/alerts`);
  return onValue(alertsRef, (snapshot) => {
    const data = snapshot.val();
    const alerts = data
      ? Object.values(data).sort((a, b) => b.timestamp - a.timestamp)
      : [];
    callback(alerts);
  });
}
