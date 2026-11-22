import { useEffect, useMemo, useState } from 'react';
import { PlusCircle, Search } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import MaterialCard from '../components/MaterialCard';
import { createRequest, fetchListings } from '../services/workflow';
import { deleteListing, updateListing } from '../services/api';

const PAGE_SIZE = 12;

export default function MaterialListings() {
  const [searchParams] = useSearchParams();
  const [materials, setMaterials] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [status, setStatus] = useState('All');
  const [location, setLocation] = useState('');
  const [sort, setSort] = useState('Newest');
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    async function loadData() {
      try {
        setLoading(true);
        const listings = await fetchListings();
        if (!isActive) return;
        setMaterials(listings || []);
      } catch (error) {
        if (!isActive) return;
        setLoadError(error.message || 'Unable to load material listings.');
      } finally {
        if (isActive) setLoading(false);
      }
    }

    loadData();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    setSearch(searchParams.get('search') || '');
  }, [searchParams]);

  const filteredMaterials = useMemo(() => {
    const result = materials.filter((item) => {
      const itemName = item.name || item.title || '';
      const itemCategory = item.category || item.category_name || '';
      const itemStatus = item.status || (item.availability_status === 'available' ? 'Available' : item.availability_status) || '';
      const itemLocation = item.location || '';
      const searchFields = [itemName, item.description, itemCategory, item.grade || item.quality_grade];

      const matchesQuery = searchFields.some((field) => String(field || '').toLowerCase().includes(search.toLowerCase()));
      const matchesCategory = category === 'All' || itemCategory.toLowerCase() === category.toLowerCase();
      const matchesStatus = status === 'All' || itemStatus.toLowerCase() === status.toLowerCase();
      const matchesLocation = !location || itemLocation.toLowerCase().includes(location.toLowerCase());

      return matchesQuery && matchesCategory && matchesStatus && matchesLocation;
    });

    if (sort === 'Price: High to Low') {
      return [...result].sort((a, b) => {
        const aPrice = a.price ?? a.price_per_unit;
        const bPrice = b.price ?? b.price_per_unit;
        if (aPrice == null) return bPrice == null ? 0 : 1;
        if (bPrice == null) return -1;
        return Number(bPrice) - Number(aPrice);
      });
    }

    if (sort === 'Price: Low to High') {
      return [...result].sort((a, b) => {
        const aPrice = a.price ?? a.price_per_unit;
        const bPrice = b.price ?? b.price_per_unit;
        if (aPrice == null) return bPrice == null ? 0 : 1;
        if (bPrice == null) return -1;
        return Number(aPrice) - Number(bPrice);
      });
    }

    return result;
  }, [materials, search, category, status, location, sort]);

  const myListings = filteredMaterials.filter((item) => item.is_mine);
  const otherListings = filteredMaterials.filter((item) => !item.is_mine);
  const pageCount = Math.max(1, Math.ceil(otherListings.length / PAGE_SIZE));
  const visibleOtherListings = otherListings.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleReset = () => {
    setSearch('');
    setCategory('All');
    setStatus('All');
    setLocation('');
    setSort('Newest');
    setPage(1);
  };

  const handleRequest = async (material, details) => {
    await createRequest(material, details);
    setMessageType('success');
    setMessage('Interest sent. You can follow the request on the Requests page.');
  };

  const handleDelete = async (material) => {
    if (!window.confirm(`Delete your "${material.name || material.title}" listing?`)) return;
    try {
      await deleteListing(material.id);
      setMaterials((items) => items.filter((item) => item.id !== material.id));
      setMessageType('success');
      setMessage('Listing deleted.');
    } catch (error) {
      setMessageType('error');
      setMessage(error.message || 'Unable to delete this listing.');
    }
  };

  const handleAvailabilityChange = async (material, availability_status) => {
    try {
      const updated = await updateListing(material.id, { availability_status });
      setMaterials((items) => items.map((item) => (
        item.id === material.id ? { ...item, ...updated, status: updated.availability_status } : item
      )));
      setMessageType('success');
      setMessage('Listing availability updated.');
    } catch (error) {
      setMessageType('error');
      setMessage(error.message || 'Unable to update listing availability.');
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
              <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} type="text" placeholder="Search by name or keyword" />
            </div>
          </div>
          <div className="col-md-2">
            <label className="form-label">Category</label>
            <select className="form-select" value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}>
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
            <select className="form-select" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
              <option>All</option>
              <option>Available</option>
              <option>Reserved</option>
              <option>Completed</option>
            </select>
          </div>
          <div className="col-md-2">
            <label className="form-label">Sort</label>
            <select className="form-select" value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }}>
              <option>Newest</option>
              <option>Price: High to Low</option>
              <option>Price: Low to High</option>
            </select>
          </div>
          <div className="col-md-3">
            <label className="form-label" htmlFor="listing-location">Location</label>
            <input id="listing-location" className="form-control" value={location} onChange={(e) => { setLocation(e.target.value); setPage(1); }} placeholder="Plant or pickup location" />
          </div>
          <div className="col-md-2">
            <button type="button" className="btn btn-secondary-custom w-100" onClick={handleReset}>Reset filters</button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="panel-card text-center py-5">
          <p className="text-muted">Loading material listings...</p>
        </div>
      ) : filteredMaterials.length ? (
        <>
          {myListings.length ? (
            <section className="mb-4">
              <div className="panel-header"><h3>My listings</h3></div>
              <div className="material-grid">
                {myListings.map((item) => <MaterialCard key={item.id} material={item} onDelete={handleDelete} onAvailabilityChange={handleAvailabilityChange} />)}
              </div>
            </section>
          ) : null}
          <section>
            <div className="panel-header"><h3>Other companies' listings</h3></div>
            {visibleOtherListings.length ? (
              <div className="material-grid">
                {visibleOtherListings.map((item) => <MaterialCard key={item.id} material={item} onRequest={async (listing, details) => {
                  try {
                    await handleRequest(listing, details);
                  } catch (error) {
                    throw error;
                  }
                }} />)}
              </div>
            ) : <p className="text-muted">No other-company listings match these filters.</p>}
            {pageCount > 1 ? (
              <div className="d-flex justify-content-center align-items-center gap-3 mt-4">
                <button type="button" className="btn btn-outline-custom btn-sm" disabled={page === 1} onClick={() => setPage((current) => current - 1)}>Previous</button>
                <span className="small text-muted">Page {page} of {pageCount}</span>
                <button type="button" className="btn btn-outline-custom btn-sm" disabled={page === pageCount} onClick={() => setPage((current) => current + 1)}>Next</button>
              </div>
            ) : null}
          </section>
        </>
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
