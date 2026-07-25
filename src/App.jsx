import { useState, useEffect, useCallback } from "react";
import {
  db,
  HOME_ID,
  devicesRef,
  floorsRef,
  toggleDeviceState,
  updateSwitchState,
  subscribeToAlerts,
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
  const [isConnected, setIsConnected] = useState(true);

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
