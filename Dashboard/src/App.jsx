import React, { useState, useEffect } from 'react';
import { auth } from './firebase';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  MapContainer, 
  TileLayer, 
  Marker, 
  Popup 
} from 'react-leaflet';
import L from 'leaflet';
import { useMap } from 'react-leaflet';

// Custom Marker Creator to bypass image asset resolution issues
const createCustomIcon = (urgencia) => {
  const u = (urgencia || '').trim().toLowerCase();
  let color = '#6366f1';
  if (u === 'alto') color = '#ef4444';
  else if (u === 'medio') color = '#f97316';
  else if (u === 'bajo') color = '#22c55e';

  return L.divIcon({
    className: 'custom-marker-wrapper',
    html: `<div style="
      background-color: ${color};
      width: 16px;
      height: 16px;
      border-radius: 50%;
      border: 2.5px solid #fff;
      box-shadow: 0 0 10px ${color}, 0 0 20px rgba(0,0,0,0.5);
      cursor: pointer;
      transition: transform 0.2s ease;
    " onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -8]
  });
};

// Map controller to smoothly pan/zoom when a report is selected
function MapController({ centerCoords }) {
  const map = useMap();
  useEffect(() => {
    if (centerCoords) {
      map.setView(centerCoords, 16, { animate: true, duration: 1 });
    }
  }, [centerCoords, map]);
  return null;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  // Auth Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // App Data State
  const [reportes, setReportes] = useState([]);
  const [filteredReportes, setFilteredReportes] = useState([]);
  const [loadingReportes, setLoadingReportes] = useState(false);
  const [activeReportId, setActiveReportId] = useState(null);
  const [mapCenter, setMapCenter] = useState([-16.4290, -71.5330]); // Bustamante y Rivero

  // Filter & Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUrgencyFilter, setSelectedUrgencyFilter] = useState('todos');

  // Stats Counters
  const [stats, setStats] = useState({ total: 0, alto: 0, medio: 0, bajo: 0 });

  // Monitor Firebase Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  // Fetch Reportes from REST API when user is logged in
  const fetchReportes = async () => {
    setLoadingReportes(true);
    try {
      // Fetching from localhost (API baseUrl is http://localhost:3000)
      const res = await fetch('http://localhost:3000/reportes');
      if (res.ok) {
        const data = await res.json();
        setReportes(data);
      }
    } catch (err) {
      console.error('Error fetching reportes:', err);
    } finally {
      setLoadingReportes(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchReportes();
      const interval = setInterval(fetchReportes, 10000); // Polling every 10 seconds for real-time feel
      return () => clearInterval(interval);
    }
  }, [user]);

  // Handle Filtering & Stats Calculation
  useEffect(() => {
    let list = [...reportes];

    // Calculate original stats first
    const counts = { total: list.length, alto: 0, medio: 0, bajo: 0 };
    list.forEach(r => {
      const u = (r.urgencia || '').trim().toLowerCase();
      if (u === 'alto') counts.alto++;
      else if (u === 'medio') counts.medio++;
      else if (u === 'bajo') counts.bajo++;
    });
    setStats(counts);

    // Apply Search Filter
    if (searchTerm.trim() !== '') {
      const search = searchTerm.toLowerCase();
      list = list.filter(r => 
        (r.descripcion || '').toLowerCase().includes(search) ||
        (r.categoria || '').toLowerCase().includes(search)
      );
    }

    // Apply Urgency Filter
    if (selectedUrgencyFilter !== 'todos') {
      list = list.filter(r => (r.urgencia || '').trim().toLowerCase() === selectedUrgencyFilter);
    }

    setFilteredReportes(list);
  }, [reportes, searchTerm, selectedUrgencyFilter]);

  // Handle Login Submission
  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    setIsSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      console.error('Login error:', err);
      setAuthError('Credenciales incorrectas o error de conexión.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Logout
  const handleLogout = async () => {
    try {
      await signOut(auth);
      setReportes([]);
      setFilteredReportes([]);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  // Pan Map to Report Coordinates
  const selectReport = (report) => {
    setActiveReportId(report.id);
    const geojson = report.geojson;
    if (geojson && geojson.type === 'Point') {
      const [lng, lat] = geojson.coordinates;
      setMapCenter([lat, lng]);
    }
  };

  // Calculate Relative Time
  const formatRelativeTime = (dateStr) => {
    if (!dateStr) return '';
    try {
      const reportDate = new Date(dateStr);
      const diffMs = new Date() - reportDate;
      const diffMins = Math.floor(diffMs / 60000);
      
      if (diffMins < 1) return 'Hace unos momentos';
      if (diffMins < 60) return `Hace ${diffMins} min`;
      
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `Hace ${diffHours} hr`;
      
      return reportDate.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
    } catch (e) {
      return '';
    }
  };

  if (authLoading) {
    return (
      <div style={{
        display: 'flex',
        height: '100vh',
        backgroundColor: '#0b0f19',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontFamily: 'sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{
            border: '4px solid rgba(255,255,255,0.1)',
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            borderLeftColor: '#6366f1',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }}></div>
          <p>Cargando panel de control...</p>
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  // Render Login overlay if user is not authenticated
  if (!user) {
    return (
      <div className="auth-overlay">
        <form className="auth-card" onSubmit={handleLogin}>
          <div className="auth-logo">🛡️</div>
          <h2>Panel de Seguridad</h2>
          <p>GIS-based Citizen Reporting System Dashboard</p>

          {authError && <div className="error-message">{authError}</div>}

          <div className="form-group">
            <label htmlFor="email">Correo Electrónico</label>
            <input 
              id="email"
              type="email" 
              placeholder="ejemplo@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <input 
              id="password"
              type="password" 
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button className="btn-primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Iniciando sesión...' : 'INICIAR SESIÓN'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Sidebar Info & List */}
      <aside className="sidebar">
        <header className="sidebar-header">
          <h1>🛡️ <span>Arequipa Alerta</span></h1>
          <div className="user-badge">
            <span className="user-email">{user.email}</span>
            <button className="btn-logout" onClick={handleLogout} title="Cerrar Sesión">
              🚪
            </button>
          </div>
        </header>

        {/* Stats Section */}
        <section className="stats-grid">
          <div className="stat-card total">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total</div>
          </div>
          <div className="stat-card alto">
            <div className="stat-value" style={{ color: 'var(--urgency-alto)' }}>{stats.alto}</div>
            <div className="stat-label">Alto</div>
          </div>
          <div className="stat-card medio">
            <div className="stat-value" style={{ color: 'var(--urgency-medio)' }}>{stats.medio}</div>
            <div className="stat-label">Medio</div>
          </div>
          <div className="stat-card bajo">
            <div className="stat-value" style={{ color: 'var(--urgency-bajo)' }}>{stats.bajo}</div>
            <div className="stat-label">Bajo</div>
          </div>
        </section>

        {/* Filters Section */}
        <section className="filter-bar">
          <input 
            type="text" 
            className="search-input" 
            placeholder="Buscar por descripción..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="filter-chips">
            <button 
              className={`filter-chip ${selectedUrgencyFilter === 'todos' ? 'active' : ''}`}
              onClick={() => setSelectedUrgencyFilter('todos')}
            >
              Todos
            </button>
            <button 
              className={`filter-chip ${selectedUrgencyFilter === 'alto' ? 'active' : ''}`}
              onClick={() => setSelectedUrgencyFilter('alto')}
            >
              🔴 Alto
            </button>
            <button 
              className={`filter-chip ${selectedUrgencyFilter === 'medio' ? 'active' : ''}`}
              onClick={() => setSelectedUrgencyFilter('medio')}
            >
              🟠 Medio
            </button>
            <button 
              className={`filter-chip ${selectedUrgencyFilter === 'bajo' ? 'active' : ''}`}
              onClick={() => setSelectedUrgencyFilter('bajo')}
            >
              🟢 Bajo
            </button>
          </div>
        </section>

        {/* List Section */}
        <section className="report-list">
          {loadingReportes && reportes.length === 0 ? (
            <div className="no-reports">Cargando incidentes...</div>
          ) : filteredReportes.length === 0 ? (
            <div className="no-reports">No se encontraron incidentes.</div>
          ) : (
            filteredReportes.map(r => (
              <article 
                key={r.id} 
                className={`report-card ${activeReportId === r.id ? 'active' : ''}`}
                onClick={() => selectReport(r)}
              >
                <div className="card-header">
                  <h2 className="card-category">{r.categoria}</h2>
                  <span className={`badge-urgencia ${r.urgencia?.toLowerCase().trim()}`}>
                    {r.urgencia}
                  </span>
                </div>
                <p className="card-description">{r.descripcion}</p>
                <div className="card-footer">
                  <span className="card-time">⏱️ {formatRelativeTime(r.created_at)}</span>
                  <span>📍 Bustamante y Rivero</span>
                </div>
              </article>
            ))
          )}
        </section>
      </aside>

      {/* Leaflet Map Main View */}
      <main className="map-container">
        <MapContainer 
          center={mapCenter} 
          zoom={14} 
          scrollWheelZoom={true}
          zoomControl={false} // Disable to put zoom control in custom premium position if we wanted
        >
          {/* Light elegant OpenStreetMap tiles */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          <MapController centerCoords={mapCenter} />

          {/* Active markers mapping */}
          {filteredReportes.map(r => {
            const geojson = r.geojson;
            if (geojson && geojson.type === 'Point') {
              const [lng, lat] = geojson.coordinates;
              return (
                <Marker 
                  key={r.id} 
                  position={[lat, lng]} 
                  icon={createCustomIcon(r.urgencia)}
                >
                  <Popup className="custom-leaflet-popup">
                    <div className="popup-container">
                      <div className="popup-title">
                        <span>{r.categoria}</span>
                        <span className={`badge-urgencia ${r.urgencia?.toLowerCase().trim()}`} style={{ fontSize: '8px' }}>
                          {r.urgencia}
                        </span>
                      </div>
                      <p className="popup-desc">{r.descripcion}</p>
                      <div className="popup-footer">
                        <span><strong>Estado:</strong> {r.estado}</span>
                        <span><strong>Reportado:</strong> {new Date(r.created_at).toLocaleString('es-ES')}</span>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            }
            return null;
          })}
        </MapContainer>
      </main>
    </div>
  );
}
