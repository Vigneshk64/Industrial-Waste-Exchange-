import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { saveListing } from '../services/workflow';

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
  const [form, setForm] = useState(defaultForm);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');

  // Auto-load a saved draft (if present) when the component mounts
  useEffect(() => {
    try {
      const raw = localStorage.getItem('addMaterialDraft');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      // parsed.image contains only the filename; files cannot be restored from localStorage.
      const loaded = {
        ...defaultForm,
        ...parsed,
        image: null,
      };
      setForm(loaded);
      setMessage(parsed ? `Loaded saved draft${parsed.image ? ` (image: ${parsed.image})` : ''}` : 'Loaded saved draft.');
    } catch (err) {
      // ignore parse errors
      console.warn('Failed to load draft', err);
    }
  }, []);

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
      // Store a lightweight, serializable draft (files are not serializable: store filename only)
      const serializable = { ...form, image: form.image ? form.image.name : null };
      localStorage.setItem('addMaterialDraft', JSON.stringify(serializable));
      setMessage('Draft saved locally.');
    } catch (err) {
      console.error('Save draft error', err);
      setMessage('Unable to save draft.');
    }
  };

  const handleLoadDraft = () => {
    try {
      const raw = localStorage.getItem('addMaterialDraft');
      if (!raw) {
        setMessage('No saved draft found.');
        return;
      }
      const parsed = JSON.parse(raw);
      const loaded = {
        ...defaultForm,
        ...parsed,
        image: null,
      };
      setForm(loaded);
      setMessage(parsed ? `Loaded draft${parsed.image ? ` (image: ${parsed.image})` : ''}` : 'Loaded saved draft.');
    } catch (err) {
      console.error('Load draft error', err);
      setMessage('Failed to load draft.');
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const requiredFields = [form.name, form.category, form.quantity, form.location, form.date];
    const hasEmptyRequired = requiredFields.some((value) => !String(value).trim());

    if (hasEmptyRequired) {
      setMessageType('error');
      setMessage('Please complete the required fields before publishing the listing.');
      return;
    }

    try {
      const listing = saveListing(form);
      localStorage.removeItem('addMaterialDraft');
      navigate(`/materials?review=${encodeURIComponent(listing.id)}`);
    } catch (error) {
      console.error('Publish listing error', error);
      setMessageType('error');
      setMessage(error.message || 'Unable to publish this listing.');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Add material</h2>
          <p>Publish a new waste or surplus listing for potential exchange partners.</p>
        </div>
      </div>

      <div className="panel-card">
        {message ? <div className={`inline-message ${messageType}`}>{message}</div> : null}

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Material name</label>
              <input className="form-control" name="name" value={form.name} onChange={handleChange} placeholder="e.g. Polypropylene pellets" />
            </div>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-select" name="category" value={form.category} onChange={handleChange}>
                <option>Plastic</option>
                <option>Metal</option>
                <option>Organic</option>
                <option>Ash</option>
                <option>Textile</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-control" rows="4" name="description" value={form.description} onChange={handleChange} placeholder="Describe the material condition, source, and specifications" />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Available quantity</label>
              <input className="form-control" name="quantity" value={form.quantity} onChange={handleChange} placeholder="500" />
            </div>
            <div className="form-group">
              <label className="form-label">Unit</label>
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
              <label className="form-label">Quality / grade</label>
              <input className="form-control" name="grade" value={form.grade} onChange={handleChange} placeholder="Grade A / Clean / Industrial" />
            </div>
            <div className="form-group">
              <label className="form-label">Expected price per unit</label>
              <input className="form-control" name="price" value={form.price} onChange={handleChange} placeholder="₹45" />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Company location</label>
              <input className="form-control" name="location" value={form.location} onChange={handleChange} placeholder="Pune, Maharashtra" />
            </div>
            <div className="form-group">
              <label className="form-label">Pickup or delivery</label>
              <select className="form-select" name="pickup" value={form.pickup} onChange={handleChange}>
                <option>Pickup</option>
                <option>Delivery</option>
                <option>Either</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Availability date</label>
              <input className="form-control" type="date" name="date" value={form.date} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label className="form-label">Material image</label>
              <input className="form-control" type="file" name="image" onChange={handleFileChange} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Safety / handling notes</label>
            <textarea className="form-control" rows="3" name="notes" value={form.notes} onChange={handleChange} placeholder="Mention any contamination, storage limitations, or PPE requirements" />
          </div>

          <div className="d-flex justify-content-between align-items-center mt-4">
            <div className="btn-group">
              <button type="button" className="btn btn-outline-custom me-2" onClick={handleLoadDraft}>Load draft</button>
              <button type="button" className="btn btn-secondary-custom me-2" onClick={handleSaveDraft}>Save draft</button>
            </div>
            <button type="submit" className="btn btn-primary-custom">Publish listing</button>
          </div>
        </form>
      </div>
    </div>
  );
}
