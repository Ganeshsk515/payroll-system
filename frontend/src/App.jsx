import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, NavLink, Navigate, useLocation } from 'react-router-dom';
import './App.css';
import Dashboard from './components/Dashboard';
import EmployeeList from './components/EmployeeList';
import EmployeeDetail from './components/EmployeeDetail';
import EditEmployee from './components/EditEmployee';
import AddEmployee from './components/AddEmployee';
import PayslipDetail from './components/PayslipDetail';
import PayslipList from './components/PayslipList';
import PayslipGenerator from './components/PayslipGenerator';
import Login from './components/Login';
import { authAPI, authStorage, payslipAPI } from './services/api';
import { canManageEmployees, canRunPayroll, isEmployeeUser } from './utils/permissions';

const ProtectedRoute = ({ user, children }) => {
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

const AdminRoute = ({ user, children }) => {
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!canManageEmployees(user) && !canRunPayroll(user)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

function AppShell() {
  const [user, setUser] = useState(authStorage.getUser());
  const [authLoading, setAuthLoading] = useState(Boolean(authStorage.getAccessToken()));
  const [notifications, setNotifications] = useState([]);
  const [notificationOpen, setNotificationOpen] = useState(false);

  useEffect(() => {
    const syncUser = async () => {
      if (!authStorage.getAccessToken()) {
        setAuthLoading(false);
        return;
      }

      try {
        const response = await authAPI.profile();
        setUser(response.data);
      } catch (error) {
        authStorage.clearSession();
        setUser(null);
      } finally {
        setAuthLoading(false);
      }
    };

    syncUser();
  }, []);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }

    const loadNotifications = async () => {
      try {
        const response = await payslipAPI.recentActivity({ limit: 6 });
        setNotifications(response.data.slice(0, 6));
      } catch (error) {
        setNotifications([]);
      }
    };

    loadNotifications();
  }, [user]);

  const handleLogout = async () => {
    const refresh = authStorage.getRefreshToken();
    try {
      if (refresh) {
        await authAPI.logout(refresh);
      }
    } catch (error) {
      // Clear local session even if the server-side logout fails.
    } finally {
      authStorage.clearSession();
      setUser(null);
    }
  };

  return (
    <div className="App">
      <div className="background-orb background-orb-left" />
      <div className="background-orb background-orb-right" />
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand-block">
            <span className="brand-kicker">Enterprise payroll operations</span>
            <h1>Payslip Management System</h1>
            <p className="brand-summary">
              A unified workspace for employee records, payroll preparation, and payslip issuance.
            </p>
          </div>
          <div className="auth-actions">
            {user && (
              <div className="notification-shell">
                <button
                  type="button"
                  className="notification-button"
                  onClick={() => setNotificationOpen((open) => !open)}
                >
                  Notifications
                  {notifications.length > 0 && <span className="notification-count">{notifications.length}</span>}
                </button>
                {notificationOpen && (
                  <div className="notification-panel">
                    <div className="notification-panel-head">
                      <strong>Recent Payroll Events</strong>
                    </div>
                    <div className="notification-list">
                      {notifications.length === 0 ? (
                        <p className="notification-empty">No recent notifications.</p>
                      ) : notifications.map((activity) => (
                        <div key={activity.id} className="notification-item">
                          <strong>{activity.action_label}</strong>
                          <span>{activity.message}</span>
                          <small>{activity.actor_name}</small>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            <a href="/admin/" className="btn btn-secondary admin-link">Admin</a>
            {user ? (
              <>
                <span className="user-badge">{user.username}</span>
                <button type="button" className="btn btn-secondary" onClick={handleLogout}>Logout</button>
              </>
            ) : (
              <Link to="/login" className="btn btn-secondary">Login</Link>
            )}
          </div>
        </div>
      </header>

      <nav className="navbar">
        <ul className="nav-links">
          <li><NavLink to="/">Dashboard</NavLink></li>
          {user && (
            <li>
              <NavLink to="/employees">
                {isEmployeeUser(user) ? 'My Profile' : 'Workforce Directory'}
              </NavLink>
            </li>
          )}
          {user && <li><NavLink to="/payslips">Payroll Register</NavLink></li>}
          {canManageEmployees(user) && <li><NavLink to="/add-employee">Onboard Employee</NavLink></li>}
          {canRunPayroll(user) && <li><NavLink to="/generate-payslip">Run Payslip</NavLink></li>}
        </ul>
      </nav>

      <main className="container">
        {authLoading ? (
          <div className="loading">Checking session...</div>
        ) : (
          <Routes>
            <Route path="/" element={<Dashboard user={user} />} />
            <Route
              path="/employees"
              element={(
                <ProtectedRoute user={user}>
                  <EmployeeList user={user} />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/employees/:employeeId"
              element={(
                <ProtectedRoute user={user}>
                  <EmployeeDetail user={user} />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/employees/:employeeId/edit"
              element={(
                <AdminRoute user={user}>
                  <EditEmployee />
                </AdminRoute>
              )}
            />
            <Route
              path="/payslips"
              element={(
                <ProtectedRoute user={user}>
                  <PayslipList user={user} />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/payslips/:payslipId"
              element={(
                <ProtectedRoute user={user}>
                  <PayslipDetail user={user} />
                </ProtectedRoute>
              )}
            />
            <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login onLogin={setUser} />} />
            <Route
              path="/add-employee"
              element={(
                <AdminRoute user={user}>
                  <AddEmployee />
                </AdminRoute>
              )}
            />
            <Route
              path="/generate-payslip"
              element={(
                <AdminRoute user={user}>
                  <PayslipGenerator />
                </AdminRoute>
              )}
            />
          </Routes>
        )}
      </main>
      <footer className="site-footer">
        <p>Designed for payroll, HR, and finance teams that need operational clarity and a dependable internal workflow.</p>
        <div className="footer-links">
          <Link to="/">Home</Link>
          <Link to="/login">Login</Link>
          <a href="/admin/">Admin</a>
        </div>
      </footer>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppShell />
    </Router>
  );
}

export default App;
