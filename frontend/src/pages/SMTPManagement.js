import React, { useState, useEffect } from 'react';
import { smtpAPI } from '../services/api';
import './SMTPManagement.css';

const SMTPManagement = () => {
  const [servers, setServers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingServer, setEditingServer] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    host: '',
    port: 587,
    secure: true,
    username: '',
    password: '',
    from_email: '',
    from_name: '',
    daily_limit: 0,
    hourly_limit: 0,
    is_active: true,
  });

  useEffect(() => {
    loadServers();
  }, []);

  const loadServers = async () => {
    try {
      const response = await smtpAPI.getAll();
      setServers(response.data);
    } catch (error) {
      console.error('Error loading servers:', error);
      alert('Failed to load SMTP servers');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Client-side validation
    if (!formData.name || !formData.name.trim()) {
      alert('Please enter a name for the SMTP server');
      return;
    }
    if (!formData.host || !formData.host.trim()) {
      alert('Please enter the SMTP host');
      return;
    }
    if (!formData.port || formData.port < 1 || formData.port > 65535) {
      alert('Please enter a valid port number (1-65535)');
      return;
    }
    if (!formData.username || !formData.username.trim()) {
      alert('Please enter the SMTP username');
      return;
    }
    if (!editingServer && (!formData.password || !formData.password.trim())) {
      alert('Please enter the SMTP password');
      return;
    }
    if (!formData.from_email || !formData.from_email.trim()) {
      alert('Please enter the "From Email" address');
      return;
    }
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.from_email)) {
      alert('Please enter a valid email address for "From Email"');
      return;
    }

    try {
      if (editingServer) {
        // For updates, only send fields that have changed or are required
        const updateData = { ...formData };
        // Don't send password if it's empty (keep existing)
        if (!updateData.password || !updateData.password.trim()) {
          delete updateData.password;
        }
        await smtpAPI.update(editingServer.id, updateData);
      } else {
        await smtpAPI.create(formData);
      }
      setShowModal(false);
      resetForm();
      loadServers();
    } catch (error) {
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          'Failed to save SMTP server';
      const missingFields = error.response?.data?.missingFields;
      let fullMessage = errorMessage;
      if (missingFields && missingFields.length > 0) {
        fullMessage += `\n\nMissing fields: ${missingFields.join(', ')}`;
      }
      alert(fullMessage);
    }
  };

  const handleEdit = (server) => {
    setEditingServer(server);
    setFormData({
      name: server.name,
      host: server.host,
      port: server.port,
      secure: server.secure,
      username: server.username,
      password: '', // Don't show password
      from_email: server.from_email,
      from_name: server.from_name || '',
      daily_limit: server.daily_limit,
      hourly_limit: server.hourly_limit,
      is_active: server.is_active,
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this SMTP server?')) {
      return;
    }
    try {
      await smtpAPI.delete(id);
      loadServers();
    } catch (error) {
      alert('Failed to delete SMTP server');
    }
  };

  const handleTest = async (id) => {
    try {
      const response = await smtpAPI.test(id);
      if (response.data.success) {
        alert(`SMTP connection successful!\n\nHost: ${response.data.details?.host}\nPort: ${response.data.details?.port}\nSecure: ${response.data.details?.secure}`);
      } else {
        let errorMsg = `SMTP connection failed\n\n${response.data.error || 'Unknown error'}`;
        if (response.data.missingFields && response.data.missingFields.length > 0) {
          errorMsg += `\n\nMissing fields: ${response.data.missingFields.join(', ')}`;
          errorMsg += '\n\nPlease edit the SMTP server and fill in the missing information.';
        }
        if (response.data.suggestions && response.data.suggestions.length > 0) {
          errorMsg += '\n\nSuggestions:\n' + response.data.suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n');
        }
        alert(errorMsg);
      }
    } catch (error) {
      // Log full error for debugging
      console.error('SMTP test error - Full error object:', error);
      console.error('SMTP test error - Response:', error.response);
      console.error('SMTP test error - Response data:', error.response?.data);
      console.error('SMTP test error - Response data type:', typeof error.response?.data);
      console.error('SMTP test error - Response data keys:', error.response?.data ? Object.keys(error.response.data) : 'no data');
      
      // Try to get error data - handle empty object case
      let errorData = {};
      if (error.response?.data) {
        // Check if data is actually empty or just appears empty
        if (Object.keys(error.response.data).length > 0) {
          errorData = error.response.data;
        } else {
          // Data is empty - this is the problem!
          console.warn('Error response data is empty! This might be a CORS or parsing issue.');
        }
      }
      
      // Extract error message - try multiple sources
      let errorMsg = 'SMTP connection failed';
      if (errorData.message && errorData.message !== 'SMTP connection failed') {
        errorMsg = errorData.message;
      } else if (errorData.error) {
        errorMsg = errorData.error;
      } else if (error.message && !error.message.includes('status code')) {
        errorMsg = error.message;
      }
      
      // Get error code and details
      const errorCode = errorData.code || '';
      const errorDetails = errorData.details || {};
      
      const missingFields = errorData.missingFields || [];
      const fieldDetails = errorData.fieldDetails || {};
      const suggestions = errorData.suggestions || [];
      
      // Build comprehensive error message
      let fullMsg = `SMTP Connection Failed\n\n${errorMsg}`;
      
      // Add error code if available
      if (errorCode) {
        fullMsg += `\n\nError Code: ${errorCode}`;
      }
      
      // Add connection details if available
      if (Object.keys(errorDetails).length > 0) {
        fullMsg += '\n\nConnection Details:';
        if (errorDetails.host) fullMsg += `\n  • Host: ${errorDetails.host}`;
        if (errorDetails.port) fullMsg += `\n  • Port: ${errorDetails.port}`;
        if (errorDetails.secure !== undefined) fullMsg += `\n  • Secure: ${errorDetails.secure ? 'Yes' : 'No'}`;
        if (errorDetails.username) fullMsg += `\n  • Username: ${errorDetails.username}`;
        if (errorDetails.responseCode) fullMsg += `\n  • SMTP Response: ${errorDetails.responseCode}`;
      }
      
      // If we have missing fields from the response, use them
      if (missingFields.length > 0) {
        fullMsg += `\n\n❌ Missing Required Fields: ${missingFields.join(', ')}`;
        if (Object.keys(fieldDetails).length > 0) {
          fullMsg += '\n\nField Details:';
          Object.entries(fieldDetails).forEach(([field, value]) => {
            fullMsg += `\n  • ${field}: ${value}`;
          });
        }
        fullMsg += '\n\n💡 Solution: Click "Edit" on the SMTP server and fill in the missing fields.';
      } else if (error.response?.status === 400 && !errorData.error && !errorData.message) {
        // 400 error but no detailed data - provide generic help
        fullMsg += '\n\n⚠️ The SMTP server rejected the connection.';
        fullMsg += '\n\nPlease check:';
        fullMsg += '\n  • Host and port are correct';
        fullMsg += '\n  • Username and password are correct';
        fullMsg += '\n  • SSL/TLS settings match your provider';
        fullMsg += '\n  • Firewall allows outbound SMTP connections';
      }
      
      if (suggestions.length > 0) {
        fullMsg += '\n\nSuggestions:';
        suggestions.forEach((s, i) => {
          fullMsg += `\n${i + 1}. ${s}`;
        });
      }
      
      // Show alert with full message
      alert(fullMsg);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      host: '',
      port: 587,
      secure: true,
      username: '',
      password: '',
      from_email: '',
      from_name: '',
      daily_limit: 0,
      hourly_limit: 0,
      is_active: true,
    });
    setEditingServer(null);
  };

  if (loading) {
    return <div className="loading">Loading SMTP servers...</div>;
  }

  return (
    <div className="smtp-management">
      <div className="page-header">
        <h1>SMTP Servers</h1>
        <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
          + Add SMTP Server
        </button>
      </div>

      <div className="servers-grid">
        {servers.map((server) => (
          <div key={server.id} className="server-card">
            <div className="server-header">
              <h3>{server.name}</h3>
              <span className={`status-badge ${server.is_active ? 'active' : 'inactive'}`}>
                {server.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="server-details">
              <p><strong>Host:</strong> {server.host}:{server.port}</p>
              <p><strong>Username:</strong> {server.username}</p>
              <p><strong>From:</strong> {server.from_email}</p>
              <p><strong>Daily Limit:</strong> {server.daily_limit || 'Unlimited'}</p>
              <p><strong>Hourly Limit:</strong> {server.hourly_limit || 'Unlimited'}</p>
            </div>
            <div className="server-actions">
              <button className="btn btn-sm btn-secondary" onClick={() => handleTest(server.id)}>
                Test
              </button>
              <button className="btn btn-sm btn-primary" onClick={() => handleEdit(server)}>
                Edit
              </button>
              <button className="btn btn-sm btn-danger" onClick={() => handleDelete(server.id)}>
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); resetForm(); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{editingServer ? 'Edit SMTP Server' : 'Add SMTP Server'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Host *</label>
                  <input
                    type="text"
                    value={formData.host}
                    onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Port *</label>
                  <input
                    type="number"
                    min="1"
                    max="65535"
                    value={formData.port}
                    onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) || '' })}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.secure}
                    onChange={(e) => setFormData({ ...formData, secure: e.target.checked })}
                  />
                  Use SSL/TLS
                </label>
              </div>

              <div className="form-group">
                <label>Username *</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Password *</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required={!editingServer}
                />
                {editingServer && <small>Leave blank to keep current password</small>}
              </div>

              <div className="form-group">
                <label>From Email *</label>
                <input
                  type="email"
                  value={formData.from_email}
                  onChange={(e) => setFormData({ ...formData, from_email: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>From Name</label>
                <input
                  type="text"
                  value={formData.from_name}
                  onChange={(e) => setFormData({ ...formData, from_name: e.target.value })}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Daily Limit (0 = unlimited)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.daily_limit}
                    onChange={(e) => {
                      const val = e.target.value === '' ? 0 : parseInt(e.target.value);
                      setFormData({ ...formData, daily_limit: isNaN(val) ? 0 : val });
                    }}
                  />
                </div>
                <div className="form-group">
                  <label>Hourly Limit (0 = unlimited)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.hourly_limit}
                    onChange={(e) => {
                      const val = e.target.value === '' ? 0 : parseInt(e.target.value);
                      setFormData({ ...formData, hourly_limit: isNaN(val) ? 0 : val });
                    }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  />
                  Active
                </label>
              </div>

              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => { setShowModal(false); resetForm(); }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingServer ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SMTPManagement;

