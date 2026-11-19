import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { saveListing, saveRequirement } from '../services/workflow';

const defaultForm = {
  name: '',
  category: 'Plastic',
  description: '',
  quantity: '',
  unit: 'kg',
  grade: '',
  price: '',
  location: '',
  pickup: 'Pickup',
  date: '',
  image: null,
  notes: '',
};

export default function AddMaterial() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('provider'); // 'provider' = Available Waste, 'seeker' = Required Raw Material
  const [form, setForm] = useState(defaultForm);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');

  // Auto-load a saved draft (if present) when the component mounts
  useEffect(() => {
    try {
      const draftKey = mode === 'provider' ? 'addMaterialDraft_provider' : 'addMaterialDraft_seeker';
      const raw = localStorage.getItem(draftKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const loaded = {
        ...defaultForm,
        ...parsed,
        image: null,
      };
      setForm(loaded);
      setMessage(parsed ? `Loaded saved draft for ${mode === 'provider' ? 'waste listing' : 'material requirement'}.` : '');
    } catch (err) {
      console.warn('Failed to load draft', err);
    }
  }, [mode]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleFileChange = (event) => {
    const file = event.target.files && event.target.files[0];
    setForm((current) => ({ ...current, image: file }));
  };

  const handleSaveDraft = () => {
    try {
      const draftKey = mode === 'provider' ? 'addMaterialDraft_provider' : 'addMaterialDraft_seeker';
      const serializable = { ...form, image: form.image ? form.image.name : null };
      localStorage.setItem(draftKey, JSON.stringify(serializable));
      setMessageType('success');
      setMessage('Draft saved locally.');
    } catch (err) {
      console.error('Save draft error', err);
      setMessageType('error');
      setMessage('Unable to save draft.');
    }
  };

  const handleLoadDraft = () => {
    try {
      const draftKey = mode === 'provider' ? 'addMaterialDraft_provider' : 'addMaterialDraft_seeker';
      const raw = localStorage.getItem(draftKey);
      if (!raw) {
        setMessageType('error');
        setMessage('No saved draft found.');
        return;
      }
      const parsed = JSON.parse(raw);
      setForm({ ...defaultForm, ...parsed, image: null });
      setMessageType('success');
      setMessage('Loaded saved draft.');
    } catch (err) {
      console.error('Load draft error', err);
      setMessageType('error');
      setMessage('Failed to load draft.');
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const requiredFields = [form.name, form.category, form.quantity, form.location];
    const hasEmptyRequired = requiredFields.some((value) => !String(value || '').trim());

    if (hasEmptyRequired) {
      setMessageType('error');
      setMessage('Please complete the required fields (Material Name, Category, Quantity, Location).');
      return;
    }

    try {
      if (mode === 'provider') {
        const listing = saveListing(form);
        localStorage.removeItem('addMaterialDraft_provider');
        setMessageType('success');
        setMessage('Waste listing published successfully.');
        setTimeout(() => navigate(`/materials?review=${encodeURIComponent(listing.id)}`), 800);
      } else {
        saveRequirement(form);
        localStorage.removeItem('addMaterialDraft_seeker');
        setMessageType('success');
        setMessage('Raw material requirement registered. Checking dynamic matches...');
        setTimeout(() => navigate('/matches'), 800);
      }
    } catch (error) {
      console.error('Submission error', error);
      setMessageType('error');
      setMessage(error.message || 'Unable to publish.');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>{mode === 'provider' ? 'List Available Waste Material' : 'Post Required Raw Material'}</h2>
          <p>
            {mode === 'provider'
              ? 'Publish industrial surplus, by-products, or recyclable waste for circular exchange partners.'
              : 'Specify raw materials needed by your plant to automatically match with industrial waste suppliers.'}
          </p>
        </div>
        <div className="btn-group">
          <button
            type="button"
            className={`btn ${mode === 'provider' ? 'btn-primary-custom' : 'btn-outline-custom'}`}
            onClick={() => setMode('provider')}
          >
            Waste Supplier (Provider)
          </button>
          <button
            type="button"
            className={`btn ${mode === 'seeker' ? 'btn-primary-custom' : 'btn-outline-custom'}`}
            onClick={() => setMode('seeker')}
          >
            Raw Material Buyer (Seeker)
          </button>
        </div>
      </div>

      <div className="panel-card">
        {message ? <div className={`inline-message ${messageType}`}>{message}</div> : null}

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">{mode === 'provider' ? 'Waste Material Name' : 'Required Raw Material'}</label>
              <input
                className="form-control"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder={mode === 'provider' ? 'e.g. Polypropylene pellets / Copper wire scrap' : 'e.g. Recycled HDPE granules / Fly ash for cement'}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Material Category</label>
              <select className="form-select" name="category" value={form.category} onChange={handleChange}>
                <option>Plastic</option>
                <option>Metal</option>
                <option>Organic</option>
                <option>Ash</option>
                <option>Textile</option>
                <option>Chemical</option>
                <option>Construction</option>
                <option>Rubber</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Technical Description & Specifications</label>
            <textarea
              className="form-control"
              rows="3"
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Describe material condition, purity level, physical state, moisture content, or specific tolerances."
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">{mode === 'provider' ? 'Available Batch Quantity' : 'Monthly Required Quantity'}</label>
              <input
                className="form-control"
                name="quantity"
                value={form.quantity}
                onChange={handleChange}
                placeholder="e.g. 500"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Unit of Measurement</label>
              <select className="form-select" name="unit" value={form.unit} onChange={handleChange}>
                <option>kg</option>
                <option>tonnes</option>
                <option>litres</option>
                <option>units</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">{mode === 'provider' ? 'Quality / Grade' : 'Minimum Acceptable Grade'}</label>
              <input
                className="form-control"
                name="grade"
                value={form.grade}
                onChange={handleChange}
                placeholder="e.g. Grade A / Clean / Industrial / Food Grade"
              />
            </div>
            <div className="form-group">
              <label className="form-label">{mode === 'provider' ? 'Expected Price per Unit (₹)' : 'Target Purchase Price (₹)'}</label>
              <input
                className="form-control"
                name="price"
                value={form.price}
                onChange={handleChange}
                placeholder="e.g. 45"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">{mode === 'provider' ? 'Plant / Pickup Location' : 'Delivery Destination Plant'}</label>
              <input
                className="form-control"
                name="location"
                value={form.location}
                onChange={handleChange}
                placeholder="e.g. Pune, Maharashtra"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">{mode === 'provider' ? 'Dispatch Logistics' : 'Inbound Logistics'}</label>
              <select className="form-select" name="pickup" value={form.pickup} onChange={handleChange}>
                <option>Pickup by buyer</option>
                <option>Supplier delivers</option>
                <option>Mutual freight arrangement</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">{mode === 'provider' ? 'Available From Date' : 'Needed By Date'}</label>
              <input className="form-control" type="date" name="date" value={form.date} onChange={handleChange} />
            </div>
            {mode === 'provider' ? (
              <div className="form-group">
                <label className="form-label">Material Photo / Batch Spec Sheet</label>
                <input className="form-control" type="file" name="image" onChange={handleFileChange} />
              </div>
            ) : null}
          </div>

          <div className="form-group">
            <label className="form-label">Safety & Handling Notes</label>
            <textarea
              className="form-control"
              rows="2"
              name="notes"
              value={form.notes}
              onChange={handleChange}
              placeholder="Mention packaging type (drums, jumbo bags, bulk tanker), handling precautions, or SDS info."
            />
          </div>

          <div className="d-flex justify-content-between align-items-center mt-4">
            <div className="btn-group">
              <button type="button" className="btn btn-outline-custom me-2" onClick={handleLoadDraft}>Load draft</button>
              <button type="button" className="btn btn-secondary-custom me-2" onClick={handleSaveDraft}>Save draft</button>
            </div>
            <button type="submit" className="btn btn-primary-custom">
              {mode === 'provider' ? 'Publish Waste Listing' : 'Register Material Requirement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
