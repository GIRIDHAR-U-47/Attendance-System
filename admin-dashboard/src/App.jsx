import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';
import './index.css';
import logo from './assets/logo.png';

// Fix leaflet marker icon issues in React
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const API_URL = `http://${window.location.hostname}:8000/api`;

function App() {
  const [zones, setZones] = useState([]);
  const [students, setStudents] = useState([]);
  const mapRef = useRef();
  const [stats, setStats] = useState({ 
      total_students: 0, 
      active_students: 0, 
      attendance_rate: 0, 
      total_notes: 0 
  });

  useEffect(() => {
    // Fetch Campus Zones
    axios.get(`${API_URL}/zones/`)
      .then(res => setZones(res.data))
      .catch(console.error);

    // Fetch Global Stats
    const fetchStats = () => {
        axios.get(`${API_URL}/admin-stats/`)
            .then(res => setStats(res.data))
            .catch(console.error);
    };

    // Fetch Student Locations
    const fetchLocations = () => {
      axios.get(`${API_URL}/locations/`)
        .then(res => {
          const latest = {};
          res.data.forEach(loc => {
            if (!latest[loc.student]) {
              latest[loc.student] = loc;
            }
          });
          setStudents(Object.values(latest).slice(0, 50)); 
        })
        .catch(console.error);
    };

    fetchStats();
    fetchLocations();
    const interval = setInterval(() => {
        fetchStats();
        fetchLocations();
    }, 5000); 
    return () => clearInterval(interval);
  }, []);

  const focusOnStudent = (lat, lng) => {
    if (mapRef.current) {
        mapRef.current.setView([lat, lng], 18, { animate: true });
    }
  };

  return (
    <div className="admin-container">
      <header className="admin-header">
        <div className="header-brand">
          <img src={logo} alt="REC Logo" className="header-logo" />
          <div className="header-text">
            <h1>REC Smart Campus Dashboard</h1>
            <p>Institutional Monitoring & Real-time Analytics</p>
          </div>
        </div>
      </header>

      <div className="stats-row">
          <div className="stat-box">
              <span className="stat-icon purple"><i className="fas fa-users"></i></span>
              <div className="stat-info">
                  <span className="stat-label">Total Students</span>
                  <span className="stat-number">{stats.total_students}</span>
              </div>
          </div>
          <div className="stat-box">
              <span className="stat-icon green"><i className="fas fa-satellite"></i></span>
              <div className="stat-info">
                  <span className="stat-label">On Campus</span>
                  <span className="stat-number">{stats.active_students}</span>
              </div>
          </div>
          <div className="stat-box">
              <span className="stat-icon yellow"><i className="fas fa-chart-line"></i></span>
              <div className="stat-info">
                  <span className="stat-label">Today's Attendance</span>
                  <span className="stat-number">{stats.attendance_rate}%</span>
              </div>
          </div>
          <div className="stat-box">
              <span className="stat-icon blue"><i className="fas fa-book-open"></i></span>
              <div className="stat-info">
                  <span className="stat-label">Study Materials</span>
                  <span className="stat-number">{stats.total_notes}</span>
              </div>
          </div>
      </div>

      <div className="dashboard-content">
        <div className="map-section">
          <h2>Live Campus Geofencing</h2>
          <MapContainer 
            center={[13.0077, 80.0032]} 
            zoom={17} 
            scrollWheelZoom={true} 
            className="map-container"
            ref={mapRef}
          >
            <TileLayer
              attribution='&copy; OpenStreetMap'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {zones.map(zone => {
              if (zone.polygon_coordinates && zone.polygon_coordinates.length > 0) {
                const positions = zone.polygon_coordinates.map(c => [c.lat, c.lng]);
                return (
                  <Polygon 
                    key={zone.id} 
                    positions={positions} 
                    pathOptions={{ color: '#6A1B9A', fillColor: '#6A1B9A', fillOpacity: 0.1 }} 
                  >
                    <Popup><b>{zone.name}</b></Popup>
                  </Polygon>
                );
              }
              return null;
            })}

            {students.map(loc => (
              <Marker key={loc.id} position={[loc.latitude, loc.longitude]}>
                <Popup>
                  <div className="popup-card">
                      <h3>{loc.student_details?.username}</h3>
                      <p><b>Status:</b> <span className={loc.in_campus ? 'text-success' : 'text-danger'}>{loc.in_campus ? 'Inside' : 'Outside'}</span></p>
                      <p><b>Zone:</b> {loc.current_zone_name || 'Exploring'}</p>
                      <p><b>Last Seen:</b> {new Date(loc.timestamp).toLocaleTimeString()}</p>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        <div className="side-panel">
          <div className="panel-card">
            <h3>Recent Active Students</h3>
            <div className="scroll-list">
              {students.map(loc => (
                <button key={loc.id} className="student-row-btn" onClick={() => focusOnStudent(loc.latitude, loc.longitude)}>
                  <div className="row-info">
                      <span className="student-name">{loc.student_details?.username}</span>
                      <span className="student-zone">{loc.current_zone_name || 'REC Boundary'}</span>
                  </div>
                  <span className={`status-dot ${loc.in_campus ? 'online' : 'offline'}`} title={loc.in_campus ? 'Active' : 'Off-Campus'}></span>
                </button>
              ))}
              {students.length === 0 && <p className="empty-msg">Waiting for student check-ins...</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
