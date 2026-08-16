import { useState, useEffect, useCallback, useRef } from "react";
import {
  db,
  HOME_ID,
  devicesRef,
  floorsRef,
  toggleDeviceState,
  updateSwitchState,
  subscribeToAlerts,
  ironAutoCutoff,
} from "./firebase";
import { onSnapshot } from "firebase/firestore";
import DeviceCard from "./components/DeviceCard";
import NotificationFeed from "./components/NotificationFeed";
import Header from "./components/Header";
import FloorFilter from "./components/FloorFilter";
import "./App.css";

function App() {
  const [devices, setDevices] = useState([]);
  const [floors, setFloors] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [selectedFloor, setSelectedFloor] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  // Tracks active safety cutoff timers: deviceId -> timeoutId
  const ironTimers = useRef({});

  // Subscribe to Firestore devices
  useEffect(() => {

    const unsubDevices = onSnapshot(
      devicesRef(HOME_ID),
      (snap) => {
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setDevices(data);
        setIsConnected(true);
      },
      (err) => {
        console.error("Firestore error:", err);
        setIsConnected(false);
      },
    );

    const unsubFloors = onSnapshot(floorsRef(HOME_ID), (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setFloors(data.sort((a, b) => a.order - b.order));
    });

    return () => {
      unsubDevices();
      unsubFloors();
    };
  }, []);

  // Subscribe to RTDB alerts
  useEffect(() => {
    const unsub = subscribeToAlerts(HOME_ID, setAlerts);
    return () => unsub();
  }, []);

  // ── Client-side Iron Safety Cutoff ──────────────────────────────
  // Replaces the Cloud Function checkSafetyCutoffs for local operation.
  // For each IRON that is ON with a known onSince, schedules a timeout
  // to fire ironAutoCutoff() at the correct remaining time.


  useEffect(() => {
    const ironDevices = devices.filter(
      (d) => d.type === "IRON" && d.state === "ON" && d.onSince
    );

    const currentIds = new Set(ironDevices.map((d) => d.id));

    // Cancel & remove timers for irons that are now OFF or missing onSince
    Object.keys(ironTimers.current).forEach((id) => {
      if (!currentIds.has(id)) {
        clearTimeout(ironTimers.current[id]);
        delete ironTimers.current[id]; // must delete so the guard below can re-schedule if needed
      }
    });

    ironDevices.forEach((device) => {
      // Timer already running for this device — skip
      if (ironTimers.current[device.id]) return;

      const onSince = device.onSince?.toDate
        ? device.onSince.toDate()
        : device.onSince?.seconds
        ? new Date(device.onSince.seconds * 1000)
        : null;

      if (!onSince) return;

      const effectiveMinutes = device.maxOnDurationMinutes || 30;
      const maxMs = effectiveMinutes * 60 * 1000;
      const elapsedMs = Date.now() - onSince.getTime();
      const remainingMs = maxMs - elapsedMs;

      if (remainingMs <= 0) {
        ironAutoCutoff(device.id, device.name, effectiveMinutes);
        return;
      }

      console.log(
        `[Safety] Scheduling auto-off for "${device.name}" in ${Math.round(remainingMs / 1000)}s (${effectiveMinutes}min limit)`
      );

      ironTimers.current[device.id] = setTimeout(() => {
        console.log(`[Safety] Auto-cutting off "${device.name}"`);
        ironAutoCutoff(device.id, device.name, effectiveMinutes);
        delete ironTimers.current[device.id];
      }, remainingMs);
    });
    // NOTE: No return/cleanup here — cleanup is handled in the unmount effect below.
    // Putting clearAllTimers in this return would cancel timers on every devices update.
  }, [devices]);

  // Unmount-only cleanup: clear any remaining timers when the component is destroyed
  useEffect(() => {
    return () => {
      Object.values(ironTimers.current).forEach(clearTimeout);
    };
  }, []);
  // ────────────────────────────────────────────────────────────────

  const handleToggle = useCallback(async (deviceId, currentState) => {
    try {
      await toggleDeviceState(deviceId, currentState);
    } catch (err) {
      console.error("Toggle error:", err);
    }
  }, []);

  const handleSwitchToggle = useCallback(
    async (deviceId, switchKey, currentState) => {
      const newState = currentState === "ON" ? "OFF" : "ON";
      try {
        await updateSwitchState(deviceId, switchKey, newState);
      } catch (err) {
        console.error("Switch toggle error:", err);
      }
    },
    [],
  );

  // Filtering
  const filteredDevices = devices.filter((d) => {
    const matchFloor = selectedFloor === "all" || d.floorId === selectedFloor;
    const matchType = selectedType === "all" || d.type === selectedType;
    const matchSearch =
      searchQuery === "" ||
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.roomName || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchFloor && matchType && matchSearch;
  });

  // Stats
  const stats = {
    total: devices.length,
    active: devices.filter((d) => d.state === "ON").length,
    errors: devices.filter(
      (d) => d.state === "ERROR" || d.state === "DISCONNECTED",
    ).length,
    cameras: devices.filter((d) => d.type === "CAMERA").length,
  };

  const floorNameMap = Object.fromEntries(floors.map((f) => [f.id, f.name]));

  return (
    <div className="app">
      <Header
        isConnected={isConnected}
        alertCount={alerts.length}
        stats={stats}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      <div className="main-layout">
        <aside className="sidebar">
          <FloorFilter
            floors={floors}
            selectedFloor={selectedFloor}
            onSelectFloor={setSelectedFloor}
            selectedType={selectedType}
            onSelectType={setSelectedType}
            deviceCounts={devices.reduce((acc, d) => {
              acc[d.floorId] = (acc[d.floorId] || 0) + 1;
              return acc;
            }, {})}
          />

          {alerts.length > 0 && <NotificationFeed alerts={alerts} />}
        </aside>

        <main className="device-grid-area">
          {filteredDevices.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🏠</div>
              <h3>No devices found</h3>
              <p>
                Try adjusting your filters or check your Firebase connection.
              </p>
            </div>
          ) : (
            <div className="device-grid">
              {filteredDevices.map((device) => (
                <DeviceCard
                  key={device.id}
                  device={device}
                  floorName={floorNameMap[device.floorId] || "Unknown Floor"}
                  onToggle={() => handleToggle(device.id, device.state)}
                  onSwitchToggle={(switchKey, state) =>
                    handleSwitchToggle(device.id, switchKey, state)
                  }
                />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
