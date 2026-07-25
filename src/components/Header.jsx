export default function Header({ isConnected, alertCount, stats, searchQuery, onSearchChange }) {
  return (
    <header className="glass-header">
      <div className="header-brand">
        <div className="brand-logo-glow">
          <span className="material-symbols-rounded">token</span>
        </div>
        <h1 className="header-title">Nexus Home</h1>
      </div>
      
      <div className="glass-search">
        <span className="material-symbols-rounded search-icon">search</span>
        <input 
          type="text" 
          placeholder="Search devices, rooms..." 
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
        />
      </div>

      <div className="header-actions">
        <div className={`status-pill ${isConnected ? 'online' : 'offline'}`}>
          <div className="status-dot"></div>
          <span>{isConnected ? 'System Live' : 'Disconnected'}</span>
        </div>
        
        {alertCount > 0 && (
          <div className="alert-btn" title={`${alertCount} Alerts`}>
            <span className="material-symbols-rounded">notifications_active</span>
            <span className="badge">{alertCount}</span>
          </div>
        )}
      </div>
    </header>
  );
}
