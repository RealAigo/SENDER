import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Layout.css';

const Layout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/smtp', label: 'SMTP Servers', icon: '📧' },
    { path: '/campaigns', label: 'Campaigns', icon: '📬' },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="layout">
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <h2>Email Sender</h2>
          <button 
            className="toggle-sidebar"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? '←' : '→'}
          </button>
        </div>
        <nav className="sidebar-nav">
          {menuItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              {sidebarOpen && <span className="nav-label">{item.label}</span>}
            </Link>
          ))}
        </nav>
        {sidebarOpen ? (
          <div className="sidebar-footer">
            <div className="user-info">
              <div className="user-avatar">
                {user?.username?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="user-details">
                <div className="user-name">{user?.username || 'User'}</div>
                <div className="user-email">{user?.email || ''}</div>
              </div>
            </div>
            <button className="logout-button" onClick={handleLogout} type="button">
              <span className="logout-icon">🚪</span>
              <span className="logout-text">Logout</span>
            </button>
          </div>
        ) : (
          <div className="sidebar-footer-collapsed">
            <button className="logout-button-icon" onClick={handleLogout} title="Logout" type="button">
              🚪
            </button>
          </div>
        )}
      </aside>
      <main className="main-content">
        {children}
      </main>
    </div>
  );
};

export default Layout;

