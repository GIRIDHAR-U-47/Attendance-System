import { useState, useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, Popup } from 'react-leaflet';
import { 
  Users, 
  Map as MapIcon, 
  LayoutDashboard, 
  History, 
  Settings, 
  Bell, 
  Search,
  Moon,
  Sun,
  ChevronRight,
  TrendingUp,
  UserCheck,
  MapPin,
  Clock,
  BookOpen,
  Camera,
  RefreshCcw,
  LogOut,
  Navigation
} from 'lucide-react';
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
  const [currentView, setCurrentView] = useState('overview');
  const [darkMode, setDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [zones, setZones] = useState([]);
  const [students, setStudents] = useState([]);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [studentDetails, setStudentDetails] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const overviewMapRef = useRef();
  
  const [stats, setStats] = useState({ 
      total_students: 0, 
      active_students: 0, 
      attendance_rate: 0, 
      total_notes: 0 
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    document.documentElement.style.setProperty('--primary', '#6A1B9A');
    document.documentElement.style.setProperty('--secondary', '#FFD700');
  }, [darkMode]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [zonesRes, attRes, statsRes, locRes, studRes] = await Promise.all([
        axios.get(`${API_URL}/zones/`),
        axios.get(`${API_URL}/attendance/`),
        axios.get(`${API_URL}/admin-stats/`),
        axios.get(`${API_URL}/locations/`),
        axios.get(`${API_URL}/students/filter/`)
      ]);

      setZones(zonesRes.data);
      setAttendanceLogs(attRes.data);
      setStats(statsRes.data);
      setStudentDetails(studRes.data);

      const latest = {};
      locRes.data.forEach(loc => {
        if (!latest[loc.student]) {
          latest[loc.student] = loc;
        }
      });
      setStudents(Object.values(latest));
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
        axios.get(`${API_URL}/admin-stats/`).then(res => setStats(res.data));
        axios.get(`${API_URL}/locations/`).then(res => {
          const latest = {};
          res.data.forEach(loc => {
            if (!latest[loc.student]) latest[loc.student] = loc;
          });
          setStudents(Object.values(latest));
        });
    }, 10000); 
    return () => clearInterval(interval);
  }, []);

  const focusOnStudent = (lat, lng) => {
    if (currentView !== 'overview') {
        setCurrentView('overview');
    }
    
    setTimeout(() => {
        if (overviewMapRef.current) {
            overviewMapRef.current.setView([lat, lng], 18, { animate: true });
        }
    }, 100);
  };

  const studentsWithDetails = studentDetails.map(s => {
      const loc = students.find(l => l.student === s.id);
      return { ...s, location: loc };
  }).filter(s => s.username.toLowerCase().includes(searchQuery.toLowerCase()));

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', alignItems: 'center', justifyContent: 'center', background: 'var(--background)' }}>
        <RefreshCcw className="animate-spin" size={48} color="#6A1B9A" />
        <p style={{ marginTop: '1rem', fontWeight: 600, color: 'var(--text-muted)' }}>Synchronizing REC Campus Data...</p>
      </div>
    );
  }

  return (
    <div className="app-wrapper">
      <aside className="sidebar">
        <div className="brand" onClick={() => setCurrentView('overview')} style={{ cursor: 'pointer' }}>
          <img src={logo} alt="REC Logo" className="brand-logo" />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span className="brand-name" style={{ color: '#6A1B9A' }}>REC Dashboard</span>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>ADMIN PORTAL v2.0</span>
          </div>
        </div>

        <nav>
          <button className={`nav-item ${currentView === 'overview' ? 'active' : ''}`} onClick={() => setCurrentView('overview')}>
            <LayoutDashboard size={18} /> Dashboard
          </button>
          <button className={`nav-item ${currentView === 'students' ? 'active' : ''}`} onClick={() => setCurrentView('students')}>
            <Users size={18} /> Student List
          </button>
          <button className={`nav-item ${currentView === 'attendance' ? 'active' : ''}`} onClick={() => setCurrentView('attendance')}>
            <History size={18} /> Attendance Reports
          </button>
        </nav>

        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <button className="nav-item" onClick={() => setDarkMode(!darkMode)}>
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            {darkMode ? 'Light Theme' : 'Dark Theme'}
          </button>
          <button className="nav-item" style={{ color: '#ef4444' }}>
            <LogOut size={18} /> Sign Out
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#6A1B9A' }}>
              {currentView === 'overview' && 'Campus Dashboard'}
              {currentView === 'students' && 'Students Directory'}
              {currentView === 'attendance' && 'Attendance Logs'}
            </h1>
            <p style={{ color: 'var(--text-muted)' }}>Rajalakshmi Engineering College | Real-time Analytics</p>
          </div>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <Search style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={16} />
              <input 
                type="text" 
                placeholder="Search..." 
                className="card" 
                style={{ padding: '0.75rem 1rem 0.75rem 3rem', width: '300px', fontSize: '0.875rem', borderRadius: '100px' }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </header>

        {currentView === 'overview' && (
          <div className="fade-in">
            <div className="stats-grid">
              <div className="card stat-card" style={{ borderBottom: '4px solid #6A1B9A' }}>
                <div className="icon-box" style={{ background: '#F3E5F5', color: '#6A1B9A' }}><Users /></div>
                <div>
                  <p className="stat-label">Total Students</p>
                  <p className="stat-number">{stats.total_students}</p>
                </div>
              </div>
              <div className="card stat-card" style={{ borderBottom: '4px solid #22c55e' }}>
                <div className="icon-box" style={{ background: '#f0fdf4', color: '#22c55e' }}><MapPin /></div>
                <div>
                  <p className="stat-label">On Campus Now</p>
                  <p className="stat-number">{stats.active_students}</p>
                </div>
              </div>
              <div className="card stat-card" style={{ borderBottom: '4px solid #FFD700' }}>
                <div className="icon-box" style={{ background: '#FFF9C4', color: '#B7950B' }}><TrendingUp /></div>
                <div>
                  <p className="stat-label">Daily Attendance</p>
                  <p className="stat-number">{stats.attendance_rate}%</p>
                </div>
              </div>
              <div className="card stat-card" style={{ borderBottom: '4px solid #1976D2' }}>
                <div className="icon-box" style={{ background: '#E3F2FD', color: '#1976D2' }}><BookOpen /></div>
                <div>
                  <p className="stat-label">Study Files</p>
                  <p className="stat-number">{stats.total_notes}</p>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
              {/* Old Geofencing Style Layout */}
              <div className="card" style={{ padding: '0', overflow: 'hidden', height: '500px' }}>
                <div style={{ padding: '1rem 1.5rem', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: '1rem', color: '#6A1B9A', fontWeight: 800 }}>LIVE CAMPUS GEOFENCING</h3>
                    <div className="badge badge-success">Live Tracking</div>
                </div>
                <MapContainer 
                    center={[13.0077, 80.0032]} 
                    zoom={17} 
                    scrollWheelZoom={true} 
                    style={{ height: '440px', width: '100%' }}
                    ref={overviewMapRef}
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
                            pathOptions={{ color: '#6A1B9A', fillColor: '#6A1B9A', fillOpacity: 0.1, weight: 2 }} 
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
                            <div style={{ minWidth: '150px' }}>
                                <h3 style={{ margin: '0 0 5px', color: '#6A1B9A' }}>{loc.student_details?.username}</h3>
                                <p style={{ margin: 0, fontSize: '0.8rem' }}><b>Status:</b> <span style={{ color: loc.in_campus ? '#22c55e' : '#ef4444' }}>{loc.in_campus ? 'Inside' : 'Outside'}</span></p>
                                <p style={{ margin: 0, fontSize: '0.8rem' }}><b>Zone:</b> {loc.current_zone_name || 'Exploring'}</p>
                                <p style={{ margin: 0, fontSize: '0.8rem' }}><b>Update:</b> {new Date(loc.timestamp).toLocaleTimeString()}</p>
                            </div>
                        </Popup>
                        </Marker>
                    ))}
                </MapContainer>
              </div>

              <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '500px' }}>
                <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Navigation size={20} /> Active Students
                </h3>
                <div style={{ flex: 1, overflowY: 'auto', paddingRight: '5px' }}>
                  {students.length > 0 ? students.map(loc => (
                    <button 
                        key={loc.id} 
                        className="btn" 
                        onClick={() => focusOnStudent(loc.latitude, loc.longitude)}
                        style={{ background: 'var(--background)', width: '100%', justifyContent: 'space-between', padding: '1rem', border: '1px solid var(--border)', marginBottom: '0.75rem', borderRadius: '12px' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#F3E5F5', color: '#6A1B9A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                          {loc.student_details?.username[0]}
                        </div>
                        <div style={{ textAlign: 'left' }}>
                          <p style={{ fontWeight: 700, fontSize: '0.9rem' }}>{loc.student_details?.username}</p>
                          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{loc.current_zone_name || 'REC Boundary'}</p>
                        </div>
                      </div>
                      <ChevronRight size={16} color="var(--primary)" />
                    </button>
                  )) : (
                    <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '2rem' }}>No active students detected.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {currentView === 'attendance' && (
          <div className="fade-in card">
             <h3 style={{ marginBottom: '1.5rem', color: '#6A1B9A' }}>Consolidated Attendance Logs</h3>
             <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Student Name</th>
                    <th>Course Subject</th>
                    <th>Status</th>
                    <th>Date Recorded</th>
                    <th>Zone Identified</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceLogs.filter(log => log.student_details?.username.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 50).map(log => (
                    <tr key={log.id}>
                      <td style={{ fontWeight: 600 }}>{log.student_details?.username}</td>
                      <td>{log.subject_details?.name || log.subject}</td>
                      <td><span className={`badge ${log.status === 'Present' ? 'badge-success' : 'badge-danger'}`}>{log.status}</span></td>
                      <td>{new Date(log.date).toLocaleDateString()}</td>
                      <td>{log.zone_name || 'REC General'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {currentView === 'students' && (
          <div className="fade-in">
             <div className="card">
                <h3 style={{ marginBottom: '1.5rem', color: '#6A1B9A' }}>Student Directory & Biometric Status</h3>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Student Name</th>
                        <th>Current Location</th>
                        <th>Face Enrollment</th>
                        <th>Campus Connectivity</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentsWithDetails.map(student => (
                        <tr key={student.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#6A1B9A', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>{student.username?.[0]}</div>
                                <span style={{ fontWeight: 700 }}>{student.username}</span>
                            </div>
                          </td>
                          <td>{student.location?.current_zone_name || 'Boundary Exterior'}</td>
                          <td><span className={`badge ${student.image_path === 'enrolled' ? 'badge-success' : 'badge-warning'}`}>{student.image_path === 'enrolled' ? 'Enrolled' : 'Pending Sync'}</span></td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: student.location?.in_campus ? '#22c55e' : '#94a3b8' }}></span>
                                <span style={{ fontSize: '0.75rem' }}>{student.location?.in_campus ? 'Online' : 'Off-Campus'}</span>
                            </div>
                          </td>
                          <td>
                            <button className="btn" onClick={() => student.location && focusOnStudent(student.location.latitude, student.location.longitude)} disabled={!student.location} style={{ padding: '6px', border: '1px solid #eee' }}>
                              <MapPin size={14} color="#6A1B9A" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
             </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
