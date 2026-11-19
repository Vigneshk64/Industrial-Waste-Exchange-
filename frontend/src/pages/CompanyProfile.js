import { useEffect, useState } from 'react';
import { Building2, Check, Edit3, Mail, MapPin, Phone, ShieldCheck, User, X } from 'lucide-react';
import { getCurrentUserProfile, updateUserProfile } from '../services/authProfile';

function getInitials(name = '') {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || 'CP';
}

export default function CompanyProfile() {
  const [company, setCompany] = useState({
    name: '',
    contact: '',
    email: '',
    phone: '',
    industry: '',
    location: '',
    role: '',
    description: '',
    totalListings: 0,
    completedExchanges: 0,
    status: 'Verified Partner',
  });
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    let isActive = true;

    async function loadProfile() {
      try {
        setLoading(true);
        const data = await getCurrentUserProfile();
        if (!isActive) return;
        setCompany(data);
        setEditForm(data);
      } catch (err) {
        console.error('Error loading profile', err);
      } finally {
        if (isActive) setLoading(false);
      }
    }

    loadProfile();

    return () => {
      isActive = false;
    };
  }, []);

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const updated = await updateUserProfile(editForm);
      setCompany(updated);
      setIsEditing(false);
      setSaveMessage('Company profile updated successfully.');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Company profile</h2>
          <p>Maintain your operational profile and exchange business information.</p>
        </div>
        <button
          type="button"
          className="btn btn-primary-custom d-flex align-items-center gap-2"
          onClick={() => {
            setEditForm(company);
            setIsEditing(true);
          }}
        >
          <Edit3 size={16} />
          Edit company profile
        </button>
      </div>

      {saveMessage && <div className="inline-message success mb-3">{saveMessage}</div>}

      <div className="panel-card p-4">
        {loading ? (
          <div className="py-4 text-center text-muted">Loading company profile...</div>
        ) : (
          <>
            <div className="d-flex align-items-center gap-4 mb-4">
              <div className="brand-mark" style={{ width: 64, height: 64, fontSize: '1.5rem', backgroundColor: '#1a5a46', color: '#ffffff' }}>
                {getInitials(company.name)}
              </div>
              <div>
                <h3 className="mb-1">{company.name}</h3>
                <span className="badge success">{company.role}</span>
              </div>
            </div>

            <div className="row g-4">
              <div className="col-md-6">
                <div className="list-row">
                  <strong><User size={15} className="me-2 text-muted" /> Contact person</strong>
                  <span>{company.contact}</span>
                </div>
                <div className="list-row">
                  <strong><Mail size={15} className="me-2 text-muted" /> Business email</strong>
                  <span>{company.email}</span>
                </div>
                <div className="list-row">
                  <strong><Phone size={15} className="me-2 text-muted" /> Phone</strong>
                  <span>{company.phone}</span>
                </div>
                <div className="list-row">
                  <strong><Building2 size={15} className="me-2 text-muted" /> Industry</strong>
                  <span>{company.industry}</span>
                </div>
              </div>
              <div className="col-md-6">
                <div className="list-row">
                  <strong><MapPin size={15} className="me-2 text-muted" /> Location</strong>
                  <span>{company.location}</span>
                </div>
                <div className="list-row">
                  <strong>Total listings</strong>
                  <span>{company.totalListings}</span>
                </div>
                <div className="list-row">
                  <strong>Completed exchanges</strong>
                  <span>{company.completedExchanges}</span>
                </div>
                <div className="list-row">
                  <strong><ShieldCheck size={15} className="me-2 text-success" /> Status</strong>
                  <span>{company.status}</span>
                </div>
              </div>
            </div>

            <div className="mt-4">
              <h4>Company description</h4>
              <p className="text-muted">{company.description}</p>
            </div>
          </>
        )}
      </div>

      {/* Edit Profile Modal */}
      {isEditing && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0,0,0,0.5)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            width: '600px',
            maxWidth: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '24px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
          }}>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#1a5a46' }}>Edit Company Profile</h3>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div className="form-group mb-3">
                <label className="form-label">Company Name</label>
                <input
                  className="form-control"
                  name="name"
                  value={editForm.name || ''}
                  onChange={handleEditChange}
                  required
                />
              </div>

              <div className="form-row mb-3">
                <div className="form-group">
                  <label className="form-label">Contact Person</label>
                  <input
                    className="form-control"
                    name="contact"
                    value={editForm.contact || ''}
                    onChange={handleEditChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input
                    className="form-control"
                    name="phone"
                    value={editForm.phone || ''}
                    onChange={handleEditChange}
                  />
                </div>
              </div>

              <div className="form-row mb-3">
                <div className="form-group">
                  <label className="form-label">Industry Type</label>
                  <input
                    className="form-control"
                    name="industry"
                    value={editForm.industry || ''}
                    onChange={handleEditChange}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Role</label>
                  <select
                    className="form-select"
                    name="role"
                    value={editForm.role || ''}
                    onChange={handleEditChange}
                  >
                    <option>Waste Supplier</option>
                    <option>Material Seeker</option>
                    <option>Waste Supplier & Seeker</option>
                  </select>
                </div>
              </div>

              <div className="form-group mb-3">
                <label className="form-label">Location</label>
                <input
                  className="form-control"
                  name="location"
                  value={editForm.location || ''}
                  onChange={handleEditChange}
                />
              </div>

              <div className="form-group mb-4">
                <label className="form-label">Company Description</label>
                <textarea
                  className="form-control"
                  rows="3"
                  name="description"
                  value={editForm.description || ''}
                  onChange={handleEditChange}
                />
              </div>

              <div className="d-flex justify-content-end gap-2">
                <button type="button" className="btn btn-secondary-custom" onClick={() => setIsEditing(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary-custom d-flex align-items-center gap-1">
                  <Check size={16} /> Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
