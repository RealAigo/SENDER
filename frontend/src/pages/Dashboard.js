import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { dashboardAPI } from '../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import './Dashboard.css';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadStats = async () => {
    try {
      const response = await dashboardAPI.getStats();
      setStats(response.data);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  if (!stats) {
    return <div className="error">Failed to load dashboard data</div>;
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <Link to="/campaigns/create" className="btn btn-primary">
          + Create Campaign
        </Link>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📧</div>
          <div className="stat-content">
            <h3>SMTP Servers</h3>
            <p className="stat-value">{stats.smtp.active} / {stats.smtp.total} Active</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📬</div>
          <div className="stat-content">
            <h3>Campaigns</h3>
            <p className="stat-value">{stats.campaigns.total} Total</p>
            <p className="stat-subvalue">{stats.campaigns.running} Running</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">✉️</div>
          <div className="stat-content">
            <h3>Emails Today</h3>
            <p className="stat-value">{stats.emails.today.toLocaleString()}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <h3>Total Sent</h3>
            <p className="stat-value">{stats.emails.allTime.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-card">
          <h2>SMTP Performance</h2>
          <div className="smtp-performance">
            {stats.smtpPerformance.map((smtp, index) => (
              <div key={smtp.id} className="smtp-item">
                <div className="smtp-info">
                  <strong>{smtp.name}</strong>
                  <span>{smtp.host}</span>
                </div>
                <div className="smtp-stats">
                  <div>
                    <span className="label">Today:</span>
                    <span className="value">{smtp.emails_sent_today}</span>
                  </div>
                  <div>
                    <span className="label">Total:</span>
                    <span className="value">{smtp.total_sent}</span>
                  </div>
                  <div>
                    <span className="label">Daily Limit:</span>
                    <span className="value">{smtp.daily_limit || 'Unlimited'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="dashboard-card">
          <h2>Recent Campaigns</h2>
          <div className="campaigns-list">
            {stats.recentCampaigns.map((campaign) => (
              <Link
                key={campaign.id}
                to={`/campaigns/${campaign.id}`}
                className="campaign-item"
              >
                <div className="campaign-header">
                  <h3>{campaign.name}</h3>
                  <span className={`status-badge status-${campaign.status}`}>
                    {campaign.status}
                  </span>
                </div>
                <div className="campaign-stats">
                  <span>Sent: {campaign.emails_sent || 0}</span>
                  <span>Failed: {campaign.emails_failed || 0}</span>
                  <span>Total: {campaign.total_recipients || 0}</span>
                </div>
                <div className="campaign-date">
                  {new Date(campaign.created_at).toLocaleString()}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

