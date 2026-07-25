const DEVICE_TYPES = [
  { key: "all",          label: "All Devices",  icon: "grid_view" },
  { key: "OUTLET",       label: "Outlets",       icon: "outlet" },
  { key: "MULTI_SWITCH", label: "Switches", icon: "switch" },
  { key: "IRON",         label: "Smart Iron",    icon: "iron" },
  { key: "LIGHT",        label: "Lighting",      icon: "lightbulb" },
  { key: "CAMERA",       label: "Security",      icon: "nest_cam_indoor" },
];

export default function FloorFilter({ floors, selectedFloor, onSelectFloor, selectedType, onSelectType, deviceCounts }) {
  const totalDevices = Object.values(deviceCounts).reduce((a, b) => a + b, 0);

  return (
    <nav className="glass-sidebar">
      <div className="nav-group">
        <div className="nav-label">Spaces</div>
        <button className={`nav-btn ${selectedFloor === "all" ? "active" : ""}`} onClick={() => onSelectFloor("all")}>
          <div className="nav-btn-content">
            <span className="material-symbols-rounded">space_dashboard</span>
            <span>Whole Home</span>
          </div>
          <span className="count-badge">{totalDevices}</span>
        </button>
        {floors.map(floor => (
          <button key={floor.id} className={`nav-btn ${selectedFloor === floor.id ? "active" : ""}`} onClick={() => onSelectFloor(floor.id)}>
            <div className="nav-btn-content">
              <span className="material-symbols-rounded">layers</span>
              <span>{floor.name}</span>
            </div>
            <span className="count-badge">{deviceCounts[floor.id] || 0}</span>
          </button>
        ))}
      </div>

      <div className="nav-divider" />

      <div className="nav-group">
        <div className="nav-label">Categories</div>
        {DEVICE_TYPES.map(type => (
          <button key={type.key} className={`nav-btn ${selectedType === type.key ? "active" : ""}`} onClick={() => onSelectType(type.key)}>
            <div className="nav-btn-content">
              <span className="material-symbols-rounded">{type.icon}</span>
              <span>{type.label}</span>
            </div>
          </button>
        ))}
      </div>
    </nav>
  );
}
