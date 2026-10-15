import { useState } from 'react';

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
  image: '',
  notes: '',
};

export default function AddMaterial() {
  const [form, setForm] = useState(defaultForm);
  const [message, setMessage] = useState('');

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const requiredFields = [form.name, form.category, form.quantity, form.location, form.date];
    const hasEmptyRequired = requiredFields.some((value) => !String(value).trim());

    if (hasEmptyRequired) {
      setMessage('Please complete the required fields before publishing the listing.');
      return;
    }

    console.log('New material listing created:', form);
    setMessage('Listing saved successfully. It is ready for review in demo mode.');
    setForm(defaultForm);
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
        {message ? <div className="inline-message success">{message}</div> : null}

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
              <input className="form-control" type="file" name="image" value={form.image} onChange={handleChange} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Safety / handling notes</label>
            <textarea className="form-control" rows="3" name="notes" value={form.notes} onChange={handleChange} placeholder="Mention any contamination, storage limitations, or PPE requirements" />
          </div>

          <div className="d-flex justify-content-between align-items-center mt-4">
            <button type="button" className="btn btn-secondary-custom">Save draft</button>
            <button type="submit" className="btn btn-primary-custom">Publish listing</button>
          </div>
        </form>
      </div>
    </div>
  );
}
