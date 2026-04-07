import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Route, Routes, Link, Navigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE = 'http://localhost:8080/api';

// ─── Auth Context ─────────────────────────────────────────────────────────────
const AuthContext = React.createContext(null);

// ─── Category visual config ───────────────────────────────────────────────────
const CATEGORY_CONFIG = {
  fitness:      { gradient: 'linear-gradient(135deg,#f093fb,#f5576c)', emoji: '💪', bg: '#fdf2f8' },
  exercise:     { gradient: 'linear-gradient(135deg,#f093fb,#f5576c)', emoji: '🏋️', bg: '#fdf2f8' },
  yoga:         { gradient: 'linear-gradient(135deg,#a18cd1,#fbc2eb)', emoji: '🧘', bg: '#f5f3ff' },
  wellness:     { gradient: 'linear-gradient(135deg,#43e97b,#38f9d7)', emoji: '🌿', bg: '#f0fdf4' },
  health:       { gradient: 'linear-gradient(135deg,#43e97b,#38f9d7)', emoji: '❤️', bg: '#f0fdf4' },
  professional: { gradient: 'linear-gradient(135deg,#4facfe,#00f2fe)', emoji: '💼', bg: '#eff6ff' },
  work:         { gradient: 'linear-gradient(135deg,#4facfe,#00f2fe)', emoji: '🖥️', bg: '#eff6ff' },
  social:       { gradient: 'linear-gradient(135deg,#fa709a,#fee140)', emoji: '🎉', bg: '#fefce8' },
  community:    { gradient: 'linear-gradient(135deg,#fa709a,#fee140)', emoji: '🤝', bg: '#fefce8' },
  outdoor:      { gradient: 'linear-gradient(135deg,#56ab2f,#a8e063)', emoji: '🌄', bg: '#f0fdf4' },
  nature:       { gradient: 'linear-gradient(135deg,#56ab2f,#a8e063)', emoji: '🌳', bg: '#f0fdf4' },
  sports:       { gradient: 'linear-gradient(135deg,#f7971e,#ffd200)', emoji: '⚽', bg: '#fffbeb' },
  education:    { gradient: 'linear-gradient(135deg,#667eea,#764ba2)', emoji: '📚', bg: '#f5f3ff' },
  learning:     { gradient: 'linear-gradient(135deg,#667eea,#764ba2)', emoji: '🎓', bg: '#f5f3ff' },
  creative:     { gradient: 'linear-gradient(135deg,#ff9a9e,#fecfef)', emoji: '🎨', bg: '#fdf4ff' },
  art:          { gradient: 'linear-gradient(135deg,#ff9a9e,#fecfef)', emoji: '🖼️', bg: '#fdf4ff' },
  music:        { gradient: 'linear-gradient(135deg,#a1c4fd,#c2e9fb)', emoji: '🎵', bg: '#eff6ff' },
  cooking:      { gradient: 'linear-gradient(135deg,#ffecd2,#fcb69f)', emoji: '🍳', bg: '#fff7ed' },
  travel:       { gradient: 'linear-gradient(135deg,#89f7fe,#66a6ff)', emoji: '✈️', bg: '#eff6ff' },
  meditation:   { gradient: 'linear-gradient(135deg,#e0c3fc,#8ec5fc)', emoji: '🕯️', bg: '#f5f3ff' },
  running:      { gradient: 'linear-gradient(135deg,#fccb90,#d57eeb)', emoji: '🏃', bg: '#fdf2f8' },
  swimming:     { gradient: 'linear-gradient(135deg,#89f7fe,#66a6ff)', emoji: '🏊', bg: '#eff6ff' },
  cycling:      { gradient: 'linear-gradient(135deg,#fddb92,#d1fdff)', emoji: '🚴', bg: '#eff9ff' },
};

function getCat(category) {
  if (!category) return { gradient: 'linear-gradient(135deg,#6366f1,#8b5cf6)', emoji: '⚡', bg: '#f5f3ff' };
  const key = category.toLowerCase();
  for (const [k, v] of Object.entries(CATEGORY_CONFIG)) {
    if (key.includes(k)) return v;
  }
  // fallback gradient based on first char code for variety
  const code = category.charCodeAt(0) % 5;
  const fallbacks = [
    { gradient: 'linear-gradient(135deg,#6366f1,#8b5cf6)', emoji: '🌟', bg: '#f5f3ff' },
    { gradient: 'linear-gradient(135deg,#ec4899,#f43f5e)', emoji: '✨', bg: '#fdf2f8' },
    { gradient: 'linear-gradient(135deg,#0ea5e9,#38bdf8)', emoji: '💫', bg: '#f0f9ff' },
    { gradient: 'linear-gradient(135deg,#f59e0b,#fbbf24)', emoji: '🔥', bg: '#fffbeb' },
    { gradient: 'linear-gradient(135deg,#10b981,#34d399)', emoji: '🍃', bg: '#f0fdf4' },
  ];
  return fallbacks[code];
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3800);
    return () => clearTimeout(t);
  }, [onClose]);

  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  return (
    <div className={`toast-wrap toast-${type || 'info'}`}>
      <span style={{ fontSize: '1.1rem' }}>{icons[type] || icons.info}</span>
      <span style={{ flex: 1 }}>{message}</span>
      <button className="toast-close" onClick={onClose}>×</button>
    </div>
  );
}

function useToast() {
  const [toast, setToast] = useState(null);
  const show = useCallback((message, type = 'success') => setToast({ message, type }), []);
  const hide = useCallback(() => setToast(null), []);
  return { toast, show, hide };
}

// ─── App ──────────────────────────────────────────────────────────────────────
function App() {
  const [user, setUser]   = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const { toast, show: showToast, hide: hideToast } = useToast();

  useEffect(() => { if (token) validateToken(); }, [token]);

  const validateToken = async () => {
    try {
      const res = await axios.get(`${API_BASE}/auth/validate`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(res.data.user);
    } catch { logout(); }
  };

  const login = async (email, password) => {
    try {
      const res = await axios.post(`${API_BASE}/auth/login`, { email, password });
      const { token: t, user: u } = res.data;
      localStorage.setItem('token', t);
      setToken(t); setUser(u);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.response?.data?.error || 'Login failed' };
    }
  };

  const register = async (email, password, name) => {
    try {
      const res = await axios.post(`${API_BASE}/auth/register`, { email, password, name });
      return { success: true, message: res.data.message };
    } catch (e) {
      return { success: false, error: e.response?.data?.error || 'Registration failed' };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null); setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, showToast }}>
      <Router>
        <div className="app">
          {user && (
            <nav className="navbar">
              <div className="navbar h1" style={{ display:'flex', alignItems:'center', gap:10, position:'relative', zIndex:1 }}>
                <div className="navbar-logo-box">🎯</div>
                <span style={{ fontFamily:'Poppins,sans-serif', fontSize:'1.45rem', fontWeight:800, letterSpacing:'-.5px' }}>
                  ActivityPlanner
                </span>
              </div>
              <div className="nav-links">
                <Link to="/dashboard">🏠 Dashboard</Link>
                <Link to="/activities">🏃 Activities</Link>
                <Link to="/plans">📅 My Plans</Link>
                <Link to="/notifications">🔔 Alerts</Link>
                <button onClick={logout} className="btn btn-danger btn-sm" style={{ marginLeft:8 }}>
                  Sign Out
                </button>
              </div>
            </nav>
          )}
          <div className={user ? 'container' : ''}>
            <Routes>
              <Route path="/"              element={user ? <Navigate to="/dashboard" /> : <Login />} />
              <Route path="/login"         element={user ? <Navigate to="/dashboard" /> : <Login />} />
              <Route path="/register"      element={user ? <Navigate to="/dashboard" /> : <Register />} />
              <Route path="/dashboard"     element={user ? <Dashboard />    : <Navigate to="/login" />} />
              <Route path="/activities"    element={user ? <Activities />   : <Navigate to="/login" />} />
              <Route path="/plans"         element={user ? <Plans />        : <Navigate to="/login" />} />
              <Route path="/notifications" element={user ? <Notifications /> : <Navigate to="/login" />} />
            </Routes>
          </div>
        </div>
        {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
      </Router>
    </AuthContext.Provider>
  );
}

// ─── Login ────────────────────────────────────────────────────────────────────
function Login() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const { login } = React.useContext(AuthContext);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    const result = await login(email, password);
    if (!result.success) setError(result.error);
    setLoading(false);
  };

  return (
    <div className="auth-page">
      {/* Left illustration panel */}
      <div className="auth-illustration">
        <div className="auth-shape auth-shape-1" />
        <div className="auth-shape auth-shape-2" />
        <div className="auth-shape auth-shape-3" />
        <div className="auth-ill-inner">
          <span className="auth-big-icon">🎯</span>
          <h2>Plan Your Perfect Day</h2>
          <p>Organize activities, set goals, and achieve more with a beautiful planner built for you.</p>
          <div className="auth-features">
            <div className="auth-feature"><span>💪</span> Track fitness & wellness goals</div>
            <div className="auth-feature"><span>📅</span> Smart activity scheduling</div>
            <div className="auth-feature"><span>🔔</span> Real-time notifications</div>
            <div className="auth-feature"><span>📊</span> Progress at a glance</div>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="auth-form-panel">
        <div className="auth-form-inner">
          <div className="auth-brand">
            <div className="auth-brand-icon">🎯</div>
            <span className="auth-brand-name">ActivityPlanner</span>
          </div>

          <h2>Welcome back!</h2>
          <p className="auth-sub">Sign in to continue your journey</p>

          {error && <div className="alert alert-error">⚠️ {error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Email Address</label>
              <input type="email" value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com" required />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input type="password" value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter your password" required />
            </div>
            <button type="submit" className="btn btn-primary btn-lg"
              disabled={loading} style={{ width: '100%', marginTop: 8 }}>
              {loading ? '⏳ Signing in…' : '🚀 Sign In'}
            </button>
          </form>

          <div className="demo-hint">
            💡 <span>Demo: <strong>admin@activity.com</strong> / <strong>admin123</strong></span>
          </div>

          <div className="auth-switch">
            Don't have an account? <Link to="/register">Create one free →</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Register ─────────────────────────────────────────────────────────────────
function Register() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [name, setName]         = useState('');
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const { register } = React.useContext(AuthContext);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    const result = await register(email, password, name);
    if (result.success) { setSuccess(true); setError(''); }
    else setError(result.error);
    setLoading(false);
  };

  return (
    <div className="auth-page">
      <div className="auth-illustration" style={{
        background: 'linear-gradient(145deg,#064e3b 0%,#059669 40%,#10b981 70%,#34d399 100%)'
      }}>
        <div className="auth-shape auth-shape-1" style={{ background: '#10b981' }} />
        <div className="auth-shape auth-shape-2" style={{ background: '#064e3b' }} />
        <div className="auth-shape auth-shape-3" style={{ background: '#34d399' }} />
        <div className="auth-ill-inner">
          <span className="auth-big-icon">🌟</span>
          <h2>Start Your Journey Today</h2>
          <p>Join thousands of people who use ActivityPlanner to achieve their goals every day.</p>
          <div className="auth-features">
            <div className="auth-feature"><span>🎯</span> Set meaningful daily goals</div>
            <div className="auth-feature"><span>🤝</span> Join a thriving community</div>
            <div className="auth-feature"><span>📈</span> Watch your progress grow</div>
            <div className="auth-feature"><span>🆓</span> Completely free to use</div>
          </div>
        </div>
      </div>

      <div className="auth-form-panel">
        <div className="auth-form-inner">
          <div className="auth-brand">
            <div className="auth-brand-icon" style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>🌟</div>
            <span className="auth-brand-name">ActivityPlanner</span>
          </div>

          <h2>Create Account</h2>
          <p className="auth-sub">It's free and takes just a minute</p>

          {error   && <div className="alert alert-error">⚠️ {error}</div>}
          {success && <div className="alert alert-success">✅ Registration successful! <Link to="/login">Sign in now →</Link></div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Full Name</label>
              <input type="text" value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Jane Smith" required />
            </div>
            <div className="form-group">
              <label>Email Address</label>
              <input type="email" value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com" required />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input type="password" value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Choose a strong password" required />
            </div>
            <button type="submit" className="btn btn-success btn-lg"
              disabled={loading} style={{ width: '100%', marginTop: 8 }}>
              {loading ? '⏳ Creating account…' : '✨ Create Free Account'}
            </button>
          </form>

          <div className="auth-switch">
            Already have an account? <Link to="/login">Sign in →</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function Dashboard() {
  const { user } = React.useContext(AuthContext);
  const [activities, setActivities] = useState([]);
  const [plans, setPlans]           = useState([]);

  useEffect(() => {
    Promise.all([
      axios.get(`${API_BASE}/activities`),
      axios.get(`${API_BASE}/plans/user/${user?.sub || 'user-1'}`)
    ])
    .then(([a, p]) => { setActivities(a.data); setPlans(p.data); })
    .catch(err => console.error('Dashboard fetch error:', err));
  }, []);

  const scheduledCount  = plans.filter(p => p.status === 'SCHEDULED').length;
  const completedCount  = plans.filter(p => p.status === 'COMPLETED').length;

  const recentPlans = [...plans].sort((a, b) =>
    (b.scheduledDate || '').localeCompare(a.scheduledDate || '')
  ).slice(0, 3);

  return (
    <div>
      {/* Hero Banner */}
      <div className="dashboard-hero">
        <div className="hero-greeting">Good day 👋</div>
        <div className="hero-name">Welcome back, {user?.name || 'User'}!</div>
        <div className="hero-subtitle">
          You have <strong>{scheduledCount}</strong> upcoming {scheduledCount === 1 ? 'activity' : 'activities'} scheduled.
          Keep up the great work!
        </div>
        <div className="hero-deco">🎯</div>
      </div>

      {/* Stats */}
      <div className="grid-3" style={{ marginBottom: 36 }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background:'linear-gradient(135deg,#eff6ff,#dbeafe)' }}>🏃</div>
          <div className="stat-value" style={{ color:'#2563eb' }}>{activities.length}</div>
          <div className="stat-label">Activities Available</div>
          <div className="stat-deco" style={{ background:'#3b82f6' }} />
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background:'linear-gradient(135deg,#f0fdf4,#dcfce7)' }}>📅</div>
          <div className="stat-value" style={{ color:'#16a34a' }}>{plans.length}</div>
          <div className="stat-label">Total Plans Created</div>
          <div className="stat-deco" style={{ background:'#22c55e' }} />
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background:'linear-gradient(135deg,#fdf4ff,#fae8ff)' }}>⚡</div>
          <div className="stat-value" style={{ color:'#9333ea' }}>{scheduledCount}</div>
          <div className="stat-label">Upcoming Activities</div>
          <div className="stat-deco" style={{ background:'#a855f7' }} />
        </div>
      </div>

      {/* Recent Plans */}
      {recentPlans.length > 0 && (
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
            <div style={{
              width:36, height:36, borderRadius:10,
              background:'linear-gradient(135deg,#6366f1,#8b5cf6)',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:'1rem', boxShadow:'0 4px 12px rgba(99,102,241,.35)'
            }}>📋</div>
            <div>
              <div style={{ fontFamily:'Poppins,sans-serif', fontSize:'1.2rem', fontWeight:700 }}>Recent Plans</div>
              <div style={{ color:'#64748b', fontSize:'.85rem' }}>Your latest scheduled activities</div>
            </div>
          </div>
          <div className="grid">
            {recentPlans.map(plan => {
              const cat = getCat(plan.activityName);
              return (
                <div key={plan.id} style={{
                  background:'white', borderRadius:14, overflow:'hidden',
                  boxShadow:'0 4px 16px rgba(0,0,0,.07)',
                  border:'1px solid rgba(226,232,240,.6)',
                }}>
                  <div style={{ height:6, background: cat.gradient }} />
                  <div style={{ padding:'20px 22px' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'start', marginBottom:10 }}>
                      <span style={{ fontSize:'1.8rem' }}>{cat.emoji}</span>
                      <span className={`status-badge status-${(plan.status||'scheduled').toLowerCase()}`}>
                        {plan.status || 'SCHEDULED'}
                      </span>
                    </div>
                    <div style={{ fontWeight:700, fontSize:'1rem', marginBottom:6 }}>{plan.activityName}</div>
                    <div style={{ color:'#64748b', fontSize:'.82rem', display:'flex', gap:12 }}>
                      <span>📅 {plan.scheduledDate}</span>
                      <span>🕐 {plan.scheduledTime}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick Links */}
      <div style={{ marginTop: 36, display:'flex', gap:16, flexWrap:'wrap' }}>
        <Link to="/activities" className="btn btn-primary">🏃 Browse Activities</Link>
        <Link to="/plans"      className="btn btn-ghost">📋 View All Plans</Link>
      </div>
    </div>
  );
}

// ─── Plan Modal ───────────────────────────────────────────────────────────────
function PlanModal({ activity, onClose, onCreated }) {
  const { user, token, showToast } = React.useContext(AuthContext);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [notes, setNotes]                 = useState('');
  const [submitting, setSubmitting]       = useState(false);
  const cat = getCat(activity.category);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await axios.post(`${API_BASE}/plans`, {
        userId: user?.sub, activityId: activity.id,
        activityName: activity.name, scheduledDate, scheduledTime, notes
      }, { headers: { Authorization: `Bearer ${token}` } });
      showToast(`Plan created for "${activity.name}"! 🎉`, 'success');
      onCreated(); onClose();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to create plan', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div style={{ height:8, background:cat.gradient, borderRadius:'14px 14px 0 0', margin:'-36px -36px 28px' }} />
        <div className="modal-header">
          <div className="modal-title-wrap">
            <div style={{ fontSize:'2rem', marginBottom:6 }}>{cat.emoji}</div>
            <div className="modal-title">Plan This Activity</div>
            <div className="modal-subtitle">{activity.name}</div>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>📅 Date</label>
              <input type="date" value={scheduledDate}
                onChange={e => setScheduledDate(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>🕐 Time</label>
              <input type="time" value={scheduledTime}
                onChange={e => setScheduledTime(e.target.value)} required />
            </div>
          </div>
          <div className="form-group">
            <label>📝 Notes</label>
            <input type="text" value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Optional notes or reminders…" />
          </div>
          <div style={{ display:'flex', gap:12, marginTop:8 }}>
            <button type="submit" className="btn btn-primary" disabled={submitting} style={{ flex:1 }}>
              {submitting ? '⏳ Creating…' : '🚀 Create Plan'}
            </button>
            <button type="button" className="btn btn-gray" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Create Activity Modal ────────────────────────────────────────────────────
function CreateActivityModal({ onClose, onCreated }) {
  const { token, showToast } = React.useContext(AuthContext);
  const [form, setForm] = useState({
    name:'', category:'', description:'', duration:60, location:'', maxParticipants:10
  });
  const [submitting, setSubmitting] = useState(false);
  const set = field => e => setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault(); setSubmitting(true);
    try {
      await axios.post(`${API_BASE}/activities`, {
        ...form,
        duration: parseInt(form.duration, 10),
        maxParticipants: parseInt(form.maxParticipants, 10)
      }, { headers: { Authorization: `Bearer ${token}` } });
      showToast(`Activity "${form.name}" created! 🎉`, 'success');
      onCreated(); onClose();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to create activity', 'error');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div style={{
          height:8,
          background:'linear-gradient(135deg,#6366f1,#8b5cf6,#ec4899)',
          borderRadius:'14px 14px 0 0', margin:'-36px -36px 28px'
        }} />
        <div className="modal-header">
          <div className="modal-title-wrap">
            <div style={{ fontSize:'2rem', marginBottom:6 }}>✨</div>
            <div className="modal-title">Create New Activity</div>
            <div className="modal-subtitle">Add a new activity to the catalog</div>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>✏️ Name *</label>
              <input type="text" value={form.name} onChange={set('name')}
                placeholder="Activity name" required />
            </div>
            <div className="form-group">
              <label>🏷️ Category *</label>
              <input type="text" value={form.category} onChange={set('category')}
                placeholder="e.g. Fitness, Sports" required />
            </div>
          </div>
          <div className="form-group">
            <label>📖 Description</label>
            <input type="text" value={form.description} onChange={set('description')}
              placeholder="Brief description of the activity" />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>⏱️ Duration (min)</label>
              <input type="number" value={form.duration} onChange={set('duration')} min="1" />
            </div>
            <div className="form-group">
              <label>👥 Max Participants</label>
              <input type="number" value={form.maxParticipants} onChange={set('maxParticipants')} min="1" />
            </div>
          </div>
          <div className="form-group">
            <label>📍 Location</label>
            <input type="text" value={form.location} onChange={set('location')}
              placeholder="Where will this take place?" />
          </div>
          <div style={{ display:'flex', gap:12, marginTop:8 }}>
            <button type="submit" className="btn btn-primary" disabled={submitting} style={{ flex:1 }}>
              {submitting ? '⏳ Creating…' : '✨ Create Activity'}
            </button>
            <button type="button" className="btn btn-gray" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Activities ───────────────────────────────────────────────────────────────
function Activities() {
  const [activities, setActivities] = useState([]);
  const [planTarget, setPlanTarget] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch]         = useState('');

  const loadActivities = useCallback(() => {
    axios.get(`${API_BASE}/activities`)
      .then(r => setActivities(r.data))
      .catch(err => console.error('Activities fetch error:', err));
  }, []);

  useEffect(() => { loadActivities(); }, [loadActivities]);

  const filtered = activities.filter(a =>
    a.name?.toLowerCase().includes(search.toLowerCase()) ||
    a.category?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="section-hd">
        <div className="section-hd-left">
          <div className="section-hd-icon">🏃</div>
          <div>
            <h2 style={{ fontFamily:'Poppins,sans-serif', fontSize:'1.7rem', fontWeight:700, color:'#1e293b' }}>
              Activities
            </h2>
            <p style={{ color:'#64748b', fontSize:'.875rem' }}>
              {activities.length} activities available · choose and plan yours
            </p>
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          ✨ New Activity
        </button>
      </div>

      {/* Search bar */}
      <div style={{ marginBottom:28, position:'relative' }}>
        <span style={{
          position:'absolute', left:16, top:'50%', transform:'translateY(-50%)',
          fontSize:'1.1rem', pointerEvents:'none'
        }}>🔍</span>
        <input
          type="text"
          placeholder="Search activities or categories…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width:'100%', padding:'12px 16px 12px 44px',
            border:'2px solid #e8ecf0', borderRadius:12,
            fontSize:'.95rem', fontFamily:'Inter,sans-serif',
            background:'white', color:'#1e293b',
            boxShadow:'0 2px 8px rgba(0,0,0,.05)',
            transition:'all .2s',
          }}
          onFocus={e => { e.target.style.borderColor='#6366f1'; e.target.style.boxShadow='0 0 0 4px rgba(99,102,241,.1)'; }}
          onBlur={e =>  { e.target.style.borderColor='#e8ecf0'; e.target.style.boxShadow='0 2px 8px rgba(0,0,0,.05)'; }}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <span className="empty-state-icon">🏃</span>
          <h3>No activities found</h3>
          <p>{search ? `No results for "${search}"` : 'Be the first to create an activity!'}</p>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>✨ Create Activity</button>
        </div>
      ) : (
        <div className="grid">
          {filtered.map(activity => {
            const cat = getCat(activity.category);
            return (
              <div key={activity.id} className="activity-card">
                <div className="ac-header">
                  <div className="ac-header-bg" style={{ background: cat.gradient }} />
                  <span className="ac-emoji">{cat.emoji}</span>
                </div>
                <div className="ac-body">
                  <h3>{activity.name}</h3>
                  <p className="ac-desc">{activity.description || 'A great activity to enjoy and stay active!'}</p>
                  <div className="ac-meta">
                    {activity.category && (
                      <span className="chip chip-primary">🏷️ {activity.category}</span>
                    )}
                    {activity.duration && (
                      <span className="chip">⏱️ {activity.duration} min</span>
                    )}
                    {activity.location && (
                      <span className="chip">📍 {activity.location}</span>
                    )}
                    {activity.maxParticipants && (
                      <span className="chip">👥 {activity.maxParticipants}</span>
                    )}
                  </div>
                  <button
                    className="btn btn-primary"
                    style={{ width:'100%' }}
                    onClick={() => setPlanTarget(activity)}>
                    📅 Plan This Activity
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showCreate && (
        <CreateActivityModal onClose={() => setShowCreate(false)} onCreated={loadActivities} />
      )}
      {planTarget && (
        <PlanModal activity={planTarget} onClose={() => setPlanTarget(null)} onCreated={() => {}} />
      )}
    </div>
  );
}

// ─── Plans ────────────────────────────────────────────────────────────────────
function Plans() {
  const [plans, setPlans] = useState([]);
  const { user, token }   = React.useContext(AuthContext);

  const loadPlans = useCallback(() => {
    axios.get(`${API_BASE}/plans/user/${user?.sub || 'user-1'}`)
      .then(r => setPlans(r.data))
      .catch(err => console.error('Plans fetch error:', err));
  }, [user]);

  useEffect(() => { loadPlans(); }, [loadPlans]);

  const handleDelete = async (planId) => {
    try {
      await axios.delete(`${API_BASE}/plans/${planId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      loadPlans();
    } catch (err) {
      console.error('Delete plan error:', err);
    }
  };

  return (
    <div>
      <div className="section-hd" style={{ marginBottom:28 }}>
        <div className="section-hd-left">
          <div className="section-hd-icon">📅</div>
          <div>
            <h2 style={{ fontFamily:'Poppins,sans-serif', fontSize:'1.7rem', fontWeight:700, color:'#1e293b' }}>
              My Plans
            </h2>
            <p style={{ color:'#64748b', fontSize:'.875rem' }}>
              {plans.length} {plans.length === 1 ? 'plan' : 'plans'} scheduled
            </p>
          </div>
        </div>
        <Link to="/activities" className="btn btn-primary">+ Add Plan</Link>
      </div>

      {plans.length === 0 ? (
        <div className="empty-state">
          <span className="empty-state-icon">📅</span>
          <h3>No plans yet</h3>
          <p>Head over to Activities to plan your first session!</p>
          <Link to="/activities" className="btn btn-primary">🏃 Browse Activities</Link>
        </div>
      ) : (
        <div className="plans-table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Activity</th>
                <th>Date</th>
                <th>Time</th>
                <th>Status</th>
                <th>Notes</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {plans.map(plan => {
                const cat = getCat(plan.activityName);
                return (
                  <tr key={plan.id}>
                    <td>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <span style={{
                          width:36, height:36, borderRadius:10, flexShrink:0,
                          background: cat.gradient,
                          display:'flex', alignItems:'center', justifyContent:'center',
                          fontSize:'1.1rem',
                        }}>{cat.emoji}</span>
                        <span style={{ fontWeight:600 }}>{plan.activityName}</span>
                      </div>
                    </td>
                    <td>
                      <span style={{ display:'flex', alignItems:'center', gap:6 }}>
                        📅 <strong>{plan.scheduledDate}</strong>
                      </span>
                    </td>
                    <td>
                      <span style={{ display:'flex', alignItems:'center', gap:6 }}>
                        🕐 {plan.scheduledTime}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge status-${(plan.status||'scheduled').toLowerCase()}`}>
                        {plan.status === 'SCHEDULED'  && '🔵'}
                        {plan.status === 'CONFIRMED'  && '✅'}
                        {plan.status === 'CANCELLED'  && '❌'}
                        {plan.status === 'COMPLETED'  && '🌟'}
                        {' '}{plan.status}
                      </span>
                    </td>
                    <td style={{ color:'#64748b', fontSize:'.85rem' }}>{plan.notes || '—'}</td>
                    <td>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDelete(plan.id)}>
                        🗑️ Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Notifications ────────────────────────────────────────────────────────────
const NOTIF_POLL_INTERVAL = 10_000;

function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const { user, showToast }               = React.useContext(AuthContext);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/notifications/user/${user?.sub || 'user-1'}`);
      setNotifications(prev => {
        const newUnread = res.data.filter(n => !n.isRead && !prev.find(p => p.id === n.id));
        if (newUnread.length > 0)
          showToast(`${newUnread.length} new notification${newUnread.length > 1 ? 's' : ''}`, 'info');
        return res.data;
      });
    } catch (err) { console.error('Notifications fetch error:', err); }
  }, [user, showToast]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);
  useEffect(() => {
    const id = setInterval(fetchNotifications, NOTIF_POLL_INTERVAL);
    return () => clearInterval(id);
  }, [fetchNotifications]);

  const markAsRead = async (id) => {
    try {
      await axios.put(`${API_BASE}/notifications/${id}/read`);
      fetchNotifications();
    } catch (err) { console.error('Mark as read error:', err); }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div>
      <div className="section-hd" style={{ marginBottom: 28 }}>
        <div className="section-hd-left">
          <div className="section-hd-icon">🔔</div>
          <div>
            <h2 style={{ fontFamily:'Poppins,sans-serif', fontSize:'1.7rem', fontWeight:700, color:'#1e293b' }}>
              Notifications
              {unreadCount > 0 && (
                <span style={{
                  marginLeft:10, background:'#ef4444',
                  color:'white', borderRadius:20, padding:'2px 10px',
                  fontSize:'.75rem', fontWeight:700, verticalAlign:'middle'
                }}>{unreadCount}</span>
              )}
            </h2>
            <p style={{ color:'#64748b', fontSize:'.875rem' }}>
              Auto-refreshes every 10 s · {notifications.length} total
            </p>
          </div>
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="empty-state">
          <span className="empty-state-icon">🔔</span>
          <h3>All caught up!</h3>
          <p>No notifications yet. We'll let you know when something happens.</p>
        </div>
      ) : (
        <div>
          {notifications.map(notif => (
            <div key={notif.id} className={`notif-card ${notif.isRead ? '' : 'unread'}`}>
              <div className="notif-icon" style={{
                background: notif.isRead
                  ? 'linear-gradient(135deg,#f1f5f9,#e2e8f0)'
                  : 'linear-gradient(135deg,#eff6ff,#dbeafe)'
              }}>
                {notif.isRead ? '📭' : '📬'}
              </div>
              <div className="notif-content">
                <div className="notif-title">{notif.title}</div>
                <div className="notif-msg">{notif.message}</div>
                <div className="notif-time">
                  🕐 {notif.createdAt ? new Date(notif.createdAt).toLocaleString() : 'Just now'}
                </div>
                {!notif.isRead && (
                  <button onClick={() => markAsRead(notif.id)}
                    className="btn btn-ghost btn-sm" style={{ marginTop:10 }}>
                    ✅ Mark as Read
                  </button>
                )}
              </div>
              {!notif.isRead && <div className="unread-dot" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;
