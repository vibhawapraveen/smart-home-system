export default function NotificationFeed({ alerts }) {
  return (
    <div className="glass-alerts-panel">
      <div className="alerts-header">
        <div className="alerts-icon-glow">
          <span className="material-symbols-rounded">gpp_maybe</span>
        </div>
        <span>Safety Alerts</span>
        <span className="alerts-count">{alerts.length}</span>
      </div>
      <div className="alerts-list">
        {alerts.slice(0, 5).map((alert, i) => (
          <div key={i} className="alert-item">
            <div className="alert-marker"></div>
            <div className="alert-content">
              <span className="alert-msg">{alert.message}</span>
              <span className="alert-time">
                {new Date(alert.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
