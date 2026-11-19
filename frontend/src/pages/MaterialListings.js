import { useEffect, useMemo, useState } from 'react';
import { PlusCircle, Search } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import MaterialCard from '../components/MaterialCard';
import { approveListing, createRequest, fetchListings } from '../services/workflow';

export default function MaterialListings() {
  const [searchParams] = useSearchParams();
  const reviewId = searchParams.get('review');
  const [materials, setMaterials] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [status, setStatus] = useState('All');
  const [sort, setSort] = useState('Newest');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);

  const reviewListings = materials.filter(
    (item) => (item.status === 'Pending review' || item.availability_status === 'pending_review')
  );

  const loadData = async () => {
    try {
      setLoading(true);
      const listings = await fetchListings();
      setMaterials(listings || []);
      if (reviewId && listings.some((listing) => listing.id === reviewId)) {
        setMessage('Your listing is awaiting review. Approve it to publish it for seekers.');
      }
    } catch (error) {
      setLoadError(error.message || 'Unable to load material listings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [reviewId]);

  useEffect(() => {
    setSearch(searchParams.get('search') || '');
  }, [searchParams]);

  const filteredMaterials = useMemo(() => {
    const result = materials.filter((item) => {
      const itemName = item.name || item.title || '';
      const itemCategory = item.category || item.category_name || '';
      const itemStatus = item.status || (item.availability_status === 'available' ? 'Available' : item.availability_status) || '';

      const matchesQuery = itemName.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = category === 'All' || itemCategory.toLowerCase() === category.toLowerCase();
      const matchesStatus = status === 'All' || itemStatus.toLowerCase() === status.toLowerCase();

      return itemStatus !== 'Pending review' && itemStatus !== 'pending_review' && matchesQuery && matchesCategory && matchesStatus;
    });

    if (sort === 'Price: High to Low') {
      return [...result].sort((a, b) => Number(b.price || b.price_per_unit || 0) - Number(a.price || a.price_per_unit || 0));
    }

    if (sort === 'Price: Low to High') {
      return [...result].sort((a, b) => Number(a.price || a.price_per_unit || 0) - Number(b.price || b.price_per_unit || 0));
    }

    return result;
  }, [materials, search, category, status, sort]);

  const handleReset = () => {
    setSearch('');
    setCategory('All');
    setStatus('All');
    setSort('Newest');
  };

  const handleRequest = (material, details) => {
    createRequest(material, details);
    setMessageType('success');
    setMessage('Interest sent. You can follow the request through each exchange step on the Requests page.');
  };

  const handleApprove = (material) => {
    try {
      const approved = approveListing(material.id);
      setMaterials((current) => current.map((item) => (item.id === approved.id ? approved : item)));
      setMessageType('success');
      setMessage('Listing reviewed and published. It is now available to material seekers.');
    } catch (error) {
      setMessageType('error');
      setMessage(error.message || 'Unable to publish this listing.');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Material Listings</h2>
          <p>Browse reusable industrial materials and surplus inventory available for exchange.</p>
        </div>
        <Link to="/add-material" className="btn btn-primary-custom">
          <PlusCircle size={16} className="me-2" />
          Add Listing
        </Link>
      </div>

      {loadError ? <div className="inline-message error">{loadError}</div> : null}
      {message ? <div className={`inline-message ${messageType}`}>{message}</div> : null}

      <div className="panel-card mb-4">
        <div className="row g-3 align-items-end">
          <div className="col-md-4">
            <label className="form-label">Search material</label>
            <div className="topbar-search mb-0">
              <Search size={18} color="#45645c" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} type="text" placeholder="Search by name or keyword" />
            </div>
          </div>
          <div className="col-md-2">
            <label className="form-label">Category</label>
            <select className="form-select" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option>All</option>
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
          <div className="col-md-2">
            <label className="form-label">Status</label>
            <select className="form-select" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option>All</option>
              <option>Available</option>
              <option>Reserved</option>
              <option>Low stock</option>
            </select>
          </div>
          <div className="col-md-2">
            <label className="form-label">Sort</label>
            <select className="form-select" value={sort} onChange={(e) => setSort(e.target.value)}>
              <option>Newest</option>
              <option>Price: High to Low</option>
              <option>Price: Low to High</option>
            </select>
          </div>
          <div className="col-md-2">
            <button type="button" className="btn btn-secondary-custom w-100" onClick={handleReset}>Reset filters</button>
          </div>
        </div>
      </div>

      {reviewListings.length ? (
        <section className="panel-card mb-4">
          <div className="panel-header">
            <h3>Provider Review Queue</h3>
            <span className="chip">{reviewListings.length} awaiting review</span>
          </div>
          <p className="text-muted small">Validate each new listing and publish it before it appears in seeker search.</p>
          <div className="material-grid">
            {reviewListings.map((item) => (
              <MaterialCard key={item.id} material={item} onRequest={handleRequest} onApprove={handleApprove} />
            ))}
          </div>
        </section>
      ) : null}

      {loading ? (
        <div className="panel-card text-center py-5">
          <p className="text-muted">Loading material listings...</p>
        </div>
      ) : filteredMaterials.length ? (
        <div className="material-grid">
          {filteredMaterials.map((item) => (
            <MaterialCard key={item.id} material={item} onRequest={handleRequest} onApprove={handleApprove} />
          ))}
        </div>
      ) : (
        <div className="panel-card text-center py-5">
          <h4>No material listings available</h4>
          <p className="text-muted">
            {materials.length === 0
              ? 'The exchange platform is ready with a clean database. Click "Add Listing" to publish the first industrial waste material.'
              : 'No materials match your current filter parameters. Try resetting your search filters.'}
          </p>
          {materials.length === 0 && (
            <Link to="/add-material" className="btn btn-primary-custom mt-2">
              <PlusCircle size={16} className="me-2" />
              Publish First Listing
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
