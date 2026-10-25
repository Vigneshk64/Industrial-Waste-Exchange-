import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import MaterialCard from '../components/MaterialCard';
import { approveListing, createRequest, getListings } from '../services/workflow';

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
  const reviewListings = materials.filter((item) => item.status === 'Pending review');

  useEffect(() => {
    try {
      const listings = getListings();
      setMaterials(listings);
      if (reviewId && listings.some((listing) => listing.id === reviewId)) {
        setMessage('Your listing is awaiting review. Approve it to publish it for seekers.');
      }
    } catch (error) {
      setLoadError(error.message || 'Unable to load material listings.');
    }
  }, [reviewId]);

  useEffect(() => {
    setSearch(searchParams.get('search') || '');
  }, [searchParams]);

  const filteredMaterials = useMemo(() => {
    const result = materials.filter((item) => {
      const matchesQuery = item.name.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = category === 'All' || item.category === category;
      const matchesStatus = status === 'All' || item.status === status;
      return item.status !== 'Pending review' && matchesQuery && matchesCategory && matchesStatus;
    });

    if (sort === 'Price: High to Low') {
      return [...result].sort((a, b) => Number(b.price) - Number(a.price));
    }

    if (sort === 'Price: Low to High') {
      return [...result].sort((a, b) => Number(a.price) - Number(b.price));
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
          <h2>Material listings</h2>
          <p>Browse reusable industrial materials and surplus inventory.</p>
        </div>
        <button type="button" className="btn btn-primary-custom">Export Results</button>
      </div>

      {loadError ? <div className="inline-message error">{loadError}</div> : null}
      {message ? <div className={`inline-message ${messageType}`}>{message}</div> : null}

      <div className="panel-card mb-4">
        <div className="row g-3 align-items-end">
          <div className="col-md-4">
            <label className="form-label">Search material</label>
            <div className="topbar-search mb-0">
              <Search size={18} color="#45645c" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} type="text" placeholder="Search by name" />
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
            <h3>Provider review queue</h3>
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

      {filteredMaterials.length ? (
        <div className="material-grid">
          {filteredMaterials.map((item) => (
            <MaterialCard key={item.id} material={item} onRequest={handleRequest} onApprove={handleApprove} />
          ))}
        </div>
      ) : (
        <div className="panel-card text-center py-5">
          <h4>No materials match your filters</h4>
          <p className="text-muted">Try adjusting the search or selecting another category.</p>
        </div>
      )}
    </div>
  );
}
