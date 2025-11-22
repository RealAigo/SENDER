import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { campaignsAPI } from '../services/api';
import './CampaignDetail.css';

const CampaignDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState(null);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    loadCampaign();
    
    // Initialize Socket.IO connection
    const newSocket = io(process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:3001');
    newSocket.emit('subscribe-campaign', id);
    
    newSocket.on(`campaign:${id}:progress`, (data) => {
      setProgress(data);
    });

    newSocket.on(`campaign:${id}:complete`, (data) => {
      setProgress(data);
      loadCampaign();
    });

    newSocket.on(`campaign:${id}:error`, (data) => {
      alert(`Campaign error: ${data.error}`);
      loadCampaign();
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [id]);

  const loadCampaign = async () => {
    try {
      const response = await campaignsAPI.getById(id);
      setCampaign(response.data);
      
      // Calculate progress if campaign is running
      if (response.data.status === 'running') {
        const total = response.data.recipients?.length || 0;
        const sent = response.data.recipients?.filter(r => r.status === 'sent').length || 0;
        const failed = response.data.recipients?.filter(r => r.status === 'failed').length || 0;
        setProgress({
          total,
          sent,
          failed,
          remaining: total - sent - failed
        });
      }
    } catch (error) {
      console.error('Error loading campaign:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async () => {
    try {
      await campaignsAPI.start(id);
      loadCampaign();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to start campaign');
    }
  };

  const handlePause = async () => {
    try {
      await campaignsAPI.pause(id);
      loadCampaign();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to pause campaign');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this campaign?')) {
      return;
    }
    try {
      await campaignsAPI.delete(id);
      navigate('/campaigns');
    } catch (error) {
      alert('Failed to delete campaign');
    }
  };

  if (loading) {
    return <div className="loading">Loading campaign...</div>;
  }

  if (!campaign) {
    return <div className="error">Campaign not found</div>;
  }

  const recipients = campaign.recipients || [];
  const sentCount = recipients.filter(r => r.status === 'sent').length;
  const failedCount = recipients.filter(r => r.status === 'failed').length;
  const pendingCount = recipients.filter(r => r.status === 'pending').length;

  return (
    <div className="campaign-detail">
      <div className="campaign-header">
        <div>
          <h1>{campaign.name}</h1>
          <span className={`status-badge status-${campaign.status}`}>
            {campaign.status}
          </span>
        </div>
        <div className="header-actions">
          {campaign.status === 'pending' && (
            <button className="btn btn-primary" onClick={handleStart}>
              Start Campaign
            </button>
          )}
          {campaign.status === 'running' && (
            <button className="btn btn-secondary" onClick={handlePause}>
              Pause Campaign
            </button>
          )}
          <button className="btn btn-danger" onClick={handleDelete}>
            Delete
          </button>
        </div>
      </div>

      <div className="campaign-info">
        <div className="info-card">
          <h3>Campaign Details</h3>
          <p><strong>Subject:</strong> {campaign.subject}</p>
          <p><strong>Total Recipients:</strong> {recipients.length}</p>
          <p><strong>Created:</strong> {new Date(campaign.created_at).toLocaleString()}</p>
          {campaign.started_at && (
            <p><strong>Started:</strong> {new Date(campaign.started_at).toLocaleString()}</p>
          )}
          {campaign.completed_at && (
            <p><strong>Completed:</strong> {new Date(campaign.completed_at).toLocaleString()}</p>
          )}
        </div>

        <div className="info-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3>Email Preview</h3>
            <button
              className="btn btn-secondary"
              onClick={() => setShowPreview(true)}
            >
              👁️ Full Preview
            </button>
          </div>
          <div className="email-preview">
            <div className="email-header">
              <strong>Subject:</strong> {campaign.subject}
            </div>
            <div
              className="email-content"
              dangerouslySetInnerHTML={{ __html: campaign.html_content }}
            />
          </div>
        </div>

        {showPreview && (
          <div className="preview-modal-overlay" onClick={() => setShowPreview(false)}>
            <div className="preview-modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="preview-header">
                <h2>Email Preview - {campaign.name}</h2>
                <button className="preview-close" onClick={() => setShowPreview(false)}>×</button>
              </div>
              <div className="preview-email">
                <div className="preview-email-header">
                  <strong>To:</strong> recipient@example.com<br />
                  <strong>From:</strong> Email Sender<br />
                  <strong>Subject:</strong> {campaign.subject}
                </div>
                <div 
                  className="preview-email-body"
                  dangerouslySetInnerHTML={{ __html: campaign.html_content }}
                />
              </div>
              <div className="preview-actions">
                <button className="btn btn-primary" onClick={() => setShowPreview(false)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {(campaign.status === 'running' || progress) && (
        <div className="progress-card">
          <h2>Real-time Progress</h2>
          {progress && (
            <>
              <div className="progress-stats">
                <div className="stat">
                  <span className="stat-label">Total</span>
                  <span className="stat-value">{progress.total}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Sent</span>
                  <span className="stat-value success">{progress.sent}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Failed</span>
                  <span className="stat-value error">{progress.failed}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Remaining</span>
                  <span className="stat-value">{progress.remaining}</span>
                </div>
              </div>
              {progress.currentSmtp && (
                <div className="current-status">
                  <p><strong>Current SMTP:</strong> {progress.currentSmtp}</p>
                  {progress.currentEmail && (
                    <p><strong>Current Email:</strong> {progress.currentEmail}</p>
                  )}
                </div>
              )}
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{
                    width: `${((progress.sent + progress.failed) / progress.total) * 100}%`
                  }}
                />
              </div>
            </>
          )}
        </div>
      )}

      <div className="recipients-section">
        <h2>Recipients ({recipients.length})</h2>
        <div className="recipients-summary">
          <span className="badge success">Sent: {sentCount}</span>
          <span className="badge error">Failed: {failedCount}</span>
          <span className="badge pending">Pending: {pendingCount}</span>
        </div>
        <div className="recipients-table">
          <table>
            <thead>
              <tr>
                <th>Email</th>
                <th>Status</th>
                <th>Opened</th>
                <th>Country</th>
                <th>SMTP Server</th>
                <th>Sent At</th>
                <th>Error</th>
              </tr>
            </thead>
            <tbody>
              {recipients.map((recipient) => (
                <tr key={recipient.id}>
                  <td>{recipient.email}</td>
                  <td>
                    <span className={`status-badge status-${recipient.status}`}>
                      {recipient.status}
                    </span>
                  </td>
                  <td>
                    {recipient.opened_at ? (
                      <span className="status-badge status-opened" title={`Opened ${recipient.opened_count || 1} time(s)`}>
                        ✓ Yes
                        {recipient.opened_count > 1 && ` (${recipient.opened_count}x)`}
                      </span>
                    ) : (
                      <span className="status-badge" style={{ background: '#ccc', color: '#666' }}>
                        ✗ No
                      </span>
                    )}
                  </td>
                  <td>
                    {recipient.country && recipient.country !== 'Unknown' ? (
                      <span title={recipient.country_code ? `Country Code: ${recipient.country_code}` : recipient.country}>
                        {recipient.country}
                        {recipient.country_code && (
                          <span style={{ marginLeft: '5px', fontSize: '12px', color: '#666' }}>
                            ({recipient.country_code})
                          </span>
                        )}
                      </span>
                    ) : (
                      <span style={{ color: '#999' }}>-</span>
                    )}
                  </td>
                  <td>{recipient.smtp_server_id || '-'}</td>
                  <td>{recipient.sent_at ? new Date(recipient.sent_at).toLocaleString() : '-'}</td>
                  <td className="error-message">{recipient.error_message || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CampaignDetail;

