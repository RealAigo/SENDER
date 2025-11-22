import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { campaignsAPI } from '../services/api';
import './Campaigns.css';

const Campaigns = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    try {
      const response = await campaignsAPI.getAll();
      setCampaigns(response.data);
    } catch (error) {
      console.error('Error loading campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this campaign?')) {
      return;
    }
    try {
      await campaignsAPI.delete(id);
      loadCampaigns();
    } catch (error) {
      alert('Failed to delete campaign');
    }
  };

  if (loading) {
    return <div className="loading">Loading campaigns...</div>;
  }

  return (
    <div className="campaigns-page">
      <div className="page-header">
        <h1>Campaigns</h1>
        <Link to="/campaigns/create" className="btn btn-primary">
          + Create Campaign
        </Link>
      </div>

      <div className="campaigns-table">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Status</th>
              <th>Recipients</th>
              <th>Sent</th>
              <th>Failed</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.length === 0 ? (
              <tr>
                <td colSpan="7" className="empty-state">
                  No campaigns found. <Link to="/campaigns/create">Create one now</Link>
                </td>
              </tr>
            ) : (
              campaigns.map((campaign) => (
                <tr key={campaign.id}>
                  <td>
                    <Link to={`/campaigns/${campaign.id}`} className="campaign-link">
                      {campaign.name}
                    </Link>
                  </td>
                  <td>
                    <span className={`status-badge status-${campaign.status}`}>
                      {campaign.status}
                    </span>
                  </td>
                  <td>{campaign.total_recipients || 0}</td>
                  <td>{campaign.emails_sent || 0}</td>
                  <td>{campaign.emails_failed || 0}</td>
                  <td>{new Date(campaign.created_at).toLocaleDateString()}</td>
                  <td>
                    <div className="table-actions">
                      <Link to={`/campaigns/${campaign.id}`} className="btn btn-sm btn-primary">
                        View
                      </Link>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDelete(campaign.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Campaigns;

