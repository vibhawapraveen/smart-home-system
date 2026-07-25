import { useState } from "react";

const DEVICE_CONFIG = {
  OUTLET: { icon: "outlet", glow: "56, 189, 248" }, // Sky Blue
  MULTI_SWITCH: { icon: "switch", glow: "192, 132, 252" }, // Neon Purple
  IRON: { icon: "iron", glow: "251, 146, 60" }, // Orange
  LIGHT: { icon: "lightbulb", glow: "253, 224, 71" }, // Yellow
  CAMERA: { icon: "nest_cam_indoor", glow: "52, 211, 153" }, // Emerald
};

function GlassToggle({ isOn, isLoading, disabled, onChange }) {
  return (
    <button 
      className={`glass-toggle ${isOn ? 'is-on' : ''} ${isLoading ? 'is-loading' : ''}`}
      onClick={onChange}
      disabled={disabled || isLoading}
    >
      <div className="glass-toggle-track">
        <div className="glass-toggle-thumb">
          {isLoading && <div className="spinner"></div>}
        </div>
      </div>
    </button>
  );
}

export default function DeviceCard({ device, floorName, onToggle, onSwitchToggle }) {
  const [isToggling, setIsToggling] = useState(false);
  const [expandedCamera, setExpandedCamera] = useState(false);

  const config = DEVICE_CONFIG[device.type] || DEVICE_CONFIG.OUTLET;
  const isOn = device.state === "ON";
  const isError = device.state === "ERROR" || device.state === "DISCONNECTED";
  const isInteractable = !isError;

  const activeCount = device.type === "MULTI_SWITCH"
    ? Object.values(device.switchStates || {}).filter(s => s === "ON").length
    : null;

  async function handleToggle(e) {
    if (e) e.stopPropagation();
    if (!isInteractable || isToggling) return;
    setIsToggling(true);
    await onToggle();
    setTimeout(() => setIsToggling(false), 600);
  }

  const isSimpleToggle = device.type !== "CAMERA" && device.type !== "MULTI_SWITCH";

  return (
    <article 
      className={`glass-card ${isOn ? 'is-on' : ''} ${isError ? 'is-error' : ''} ${device.type === 'CAMERA' ? 'is-camera' : ''}`}
      style={{ '--glow-color': config.glow }}
      onClick={isSimpleToggle ? handleToggle : undefined}
    >
      {/* ── CAMERA LAYOUT ── */}
      {device.type === "CAMERA" ? (
        <div className="camera-container">
           <div className="camera-header">
             <div className="camera-badge"><div className="recording-dot"></div> LIVE</div>
           </div>
           <div 
             className="camera-feed" 
             onClick={(e) => { e.stopPropagation(); setExpandedCamera(!expandedCamera); }}
           >
             <img src={device.cameraSnapshotUrl || `https://picsum.photos/400/225?random=${device.id}`} alt="Camera feed" />
             <div className="camera-overlay">
                <span className="material-symbols-rounded play-icon">play_circle</span>
             </div>
           </div>
           <div className="card-content" style={{ padding: '20px' }}>
             <div className="card-title">{device.name}</div>
             <div className="card-subtitle">{device.roomName || floorName}</div>
           </div>
           {expandedCamera && (
             <div className="camera-url-panel">
               <code>{device.cameraStreamUrl || "rtsp://camera.stream/live"}</code>
             </div>
           )}
        </div>
      ) : (
        <>
          {/* ── STANDARD LAYOUT ── */}
          <div className="card-top">
            <div className="icon-box">
              <span className="material-symbols-rounded">{config.icon}</span>
            </div>
            
            {isSimpleToggle && (
              <GlassToggle 
                isOn={isOn} 
                isLoading={isToggling} 
                disabled={!isInteractable} 
                onChange={handleToggle} 
              />
            )}
          </div>

          <div className="card-bottom">
            <div className="card-title">{device.name}</div>
            <div className="card-subtitle">
              {device.roomName || floorName}
              {device.type === 'MULTI_SWITCH' && ` • ${activeCount}/${device.switchCount} on`}
              {isError && ` • ${device.state}`}
            </div>
          </div>

          {/* MULTI_SWITCH EXPANDED */}
          {device.type === "MULTI_SWITCH" && (
            <div className="multi-switch-grid">
              {Array.from({ length: device.switchCount || 1 }, (_, i) => {
                const key = `switch_${i + 1}`;
                const switchState = device.switchStates?.[key] || "OFF";
                const switchOn = switchState === "ON";
                return (
                  <div key={key} className="switch-row" onClick={(e) => e.stopPropagation()}>
                    <span className="switch-label">Switch {i + 1}</span>
                    <GlassToggle 
                      isOn={switchOn} 
                      onChange={() => onSwitchToggle(key, switchState)} 
                    />
                  </div>
                );
              })}
            </div>
          )}

          {/* EXTRA BANNERS */}
          {device.type === "IRON" && isOn && (
            <div className="glass-banner warning">
               <span className="material-symbols-rounded">local_fire_department</span>
               <span>Auto-off in <b>{device.maxOnDurationMinutes}m</b></span>
            </div>
          )}
          {device.type === "LIGHT" && device.scheduleEnabled && (
            <div className="glass-banner">
               <span className="material-symbols-rounded">schedule</span>
               <span>{device.scheduleOnTime} - {device.scheduleOffTime}</span>
            </div>
          )}
        </>
      )}
    </article>
  );
}
