import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import QuillEditor from '../components/QuillEditor';
import { campaignsAPI } from '../services/api';
import './CreateCampaign.css';

const CreateCampaign = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    html_content: '',
  });
  const [recipients, setRecipients] = useState('');
  const [uploading, setUploading] = useState(false);
  const [campaignId, setCampaignId] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [editorMode, setEditorMode] = useState('rich'); // 'rich' or 'html'

  const handleEditorModeChange = (mode) => {
    setEditorMode(mode);
    // Ensure content is preserved when switching modes
    if (mode === 'html' && formData.html_content) {
      // Content is already in html_content, just switch the view
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await campaignsAPI.create(formData);
      setCampaignId(response.data.id);
      setStep(2);
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to create campaign');
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      await campaignsAPI.uploadRecipients(campaignId, file);
      alert('Recipients uploaded successfully!');
      navigate(`/campaigns/${campaignId}`);
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to upload recipients');
    } finally {
      setUploading(false);
    }
  };

  const handleManualRecipients = async () => {
    const emailList = recipients
      .split('\n')
      .map(email => email.trim())
      .filter(email => email);

    if (emailList.length === 0) {
      alert('Please enter at least one email address');
      return;
    }

    setUploading(true);
    try {
      await campaignsAPI.addRecipients(campaignId, emailList);
      alert('Recipients added successfully!');
      navigate(`/campaigns/${campaignId}`);
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to add recipients');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="create-campaign">
      <h1>Create Campaign</h1>

      {step === 1 && (
        <form onSubmit={handleSubmit} className="campaign-form">
          <div className="form-group">
            <label>Campaign Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label>Email Subject *</label>
            <input
              type="text"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label>HTML Content *</label>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '5px', background: '#f3f4f6', padding: '4px', borderRadius: '6px' }}>
                  <button
                    type="button"
                    className={`editor-mode-btn ${editorMode === 'rich' ? 'active' : ''}`}
                    onClick={() => handleEditorModeChange('rich')}
                    style={{
                      padding: '6px 12px',
                      border: 'none',
                      borderRadius: '4px',
                      background: editorMode === 'rich' ? '#3b82f6' : 'transparent',
                      color: editorMode === 'rich' ? 'white' : '#666',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: '500'
                    }}
                  >
                    Rich Text
                  </button>
                  <button
                    type="button"
                    className={`editor-mode-btn ${editorMode === 'html' ? 'active' : ''}`}
                    onClick={() => handleEditorModeChange('html')}
                    style={{
                      padding: '6px 12px',
                      border: 'none',
                      borderRadius: '4px',
                      background: editorMode === 'html' ? '#3b82f6' : 'transparent',
                      color: editorMode === 'html' ? 'white' : '#666',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: '500'
                    }}
                  >
                    HTML Code
                  </button>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowPreview(true)}
                  disabled={!formData.html_content}
                >
                  👁️ Preview
                </button>
              </div>
            </div>
            
            {editorMode === 'rich' ? (
              <QuillEditor
                value={formData.html_content}
                onChange={(content) => setFormData({ ...formData, html_content: content })}
                placeholder="Write your email content here..."
              />
            ) : (
              <div className="html-editor-wrapper">
                <textarea
                  value={formData.html_content || ''}
                  onChange={(e) => setFormData({ ...formData, html_content: e.target.value })}
                  placeholder="Enter your HTML code here...&#10;&#10;Example:&#10;&lt;h1&gt;Hello&lt;/h1&gt;&#10;&lt;p&gt;This is a paragraph.&lt;/p&gt;"
                  className="html-textarea"
                  spellCheck="false"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                />
                <div className="html-editor-help">
                  <small>
                    💡 Tip: You can write raw HTML here. Use &lt;h1&gt;, &lt;p&gt;, &lt;div&gt;, &lt;img&gt;, &lt;a&gt;, etc.
                    {formData.html_content && ` (${formData.html_content.length} characters)`}
                  </small>
                </div>
              </div>
            )}
          </div>

          {showPreview && (
            <div className="preview-modal-overlay" onClick={() => setShowPreview(false)}>
              <div className="preview-modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="preview-header">
                  <h2>Email Preview</h2>
                  <button className="preview-close" onClick={() => setShowPreview(false)}>×</button>
                </div>
                <div className="preview-email">
                  <div className="preview-email-header">
                    <strong>To:</strong> recipient@example.com<br />
                    <strong>From:</strong> {formData.subject ? 'Your Email' : 'Email Sender'}<br />
                    <strong>Subject:</strong> {formData.subject || '(No subject)'}
                  </div>
                  <div 
                    className="preview-email-body"
                    dangerouslySetInnerHTML={{ __html: formData.html_content || '<p>No content</p>' }}
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

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/campaigns')}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Next: Add Recipients
            </button>
          </div>
        </form>
      )}

      {step === 2 && (
        <div className="recipients-step">
          <h2>Add Recipients</h2>
          <p>Choose how you want to add recipients to your campaign</p>

          <div className="recipients-options">
            <div className="option-card">
              <h3>Upload CSV File</h3>
              <p>Upload a CSV file with email addresses. The file should have an "email" column or the first column should contain emails.</p>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                disabled={uploading}
                id="csv-upload"
                style={{ display: 'none' }}
              />
              <label htmlFor="csv-upload" className="btn btn-primary">
                {uploading ? 'Uploading...' : 'Choose CSV File'}
              </label>
            </div>

            <div className="option-card">
              <h3>Manual Entry</h3>
              <p>Enter email addresses manually, one per line.</p>
              <textarea
                value={recipients}
                onChange={(e) => setRecipients(e.target.value)}
                placeholder="email1@example.com&#10;email2@example.com&#10;email3@example.com"
                rows={10}
                className="recipients-textarea"
              />
              <button
                className="btn btn-primary"
                onClick={handleManualRecipients}
                disabled={uploading}
              >
                {uploading ? 'Adding...' : 'Add Recipients'}
              </button>
            </div>
          </div>

          <div className="form-actions">
            <button className="btn btn-secondary" onClick={() => setStep(1)}>
              Back
            </button>
            <button className="btn btn-secondary" onClick={() => navigate(`/campaigns/${campaignId}`)}>
              Skip for Now
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateCampaign;

