// ─────────────────────────────────────────────────────────
// IMPORTANT: Replace these with YOUR Firebase project config
// from: Firebase Console → Project Settings → General → Web apps
// ─────────────────────────────────────────────────────────
import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, updateDoc, deleteField, serverTimestamp, onSnapshot } from "firebase/firestore";
import { getDatabase, ref, onValue, push, set } from "firebase/database";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";

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
export const auth = getAuth(app);

// ── Anonymous Auth ──
// Signs in silently so Firestore security rules (request.auth != null) are satisfied.
// No login screen needed — the user is automatically authenticated as an anonymous guest.
signInAnonymously(auth).catch((err) => {
  console.error("Anonymous sign-in failed:", err.code, err.message);
});

export const onAuthReady = (callback) => onAuthStateChanged(auth, callback);

export const HOME_ID = "home_001";

// ── Firestore helpers ──
export const devicesRef = (homeId = HOME_ID) =>
  collection(db, `homes/${homeId}/devices`);

export const floorsRef = (homeId = HOME_ID) =>
  collection(db, `homes/${homeId}/floors`);

export async function toggleDeviceState(deviceId, currentState, homeId = HOME_ID) {
  const newState = currentState === "ON" ? "OFF" : "ON";
  const update = {
    state: newState,
    lastUpdated: serverTimestamp(),
  };
  // Stamp onSince when turning ON so the client-side safety cutoff can track time
  if (newState === "ON") {
    update.onSince = serverTimestamp();
  } else {
    update.onSince = deleteField();
  }
  await updateDoc(doc(db, `homes/${homeId}/devices/${deviceId}`), update);
  return newState;
}

/**
 * Forces an iron device OFF after its maxOnDurationMinutes has elapsed.
 * Mimics what the Cloud Function checkSafetyCutoffs would do.
 * Also pushes a safety alert to RTDB so the notification feed shows it.
 */
export async function ironAutoCutoff(deviceId, deviceName, durationMinutes, homeId = HOME_ID) {
  // Turn the iron OFF and clear onSince
  await updateDoc(doc(db, `homes/${homeId}/devices/${deviceId}`), {
    state: "OFF",
    onSince: deleteField(),
    lastUpdated: serverTimestamp(),
  });

  // Push a safety alert to RTDB (same structure as the Cloud Function)
  const alertsRef = ref(rtdb, `homes/${homeId}/alerts`);
  const newAlertRef = push(alertsRef);
  await set(newAlertRef, {
    deviceId,
    deviceName,
    message: `⚠️ ${deviceName} was auto-OFF after ${durationMinutes} minutes (safety cutoff)`,
    timestamp: Date.now(),
    type: "SAFETY_CUTOFF",
  });
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
