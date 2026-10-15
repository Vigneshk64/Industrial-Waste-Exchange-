import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import MaterialCard from '../components/MaterialCard';

const materials = [
  { name: 'HDPE Scrap', category: 'Plastic', quantity: '320 kg', grade: 'Grade A', company: 'EcoFlow Industries', location: 'Pune, MH', status: 'Available', price: '48' },
  { name: 'Aluminium Offcuts', category: 'Metal', quantity: '1.2 t', grade: 'Recycled', company: 'SteelCore Ltd.', location: 'Vapi, GJ', status: 'Reserved', price: '145' },
  { name: 'Fly Ash', category: 'Ash', quantity: '800 kg', grade: 'Industrial', company: 'GreenCem Materials', location: 'Nagpur, MH', status: 'Available', price: '22' },
  { name: 'Copper Wire Scrap', category: 'Metal', quantity: '620 kg', grade: 'Grade B', company: 'Ramco Metals', location: 'Ahmedabad, GJ', status: 'Available', price: '176' },
  { name: 'Organic Compost Feed', category: 'Organic', quantity: '1.4 t', grade: 'Processed', company: 'AgriCycle', location: 'Nashik, MH', status: 'Low stock', price: '31' },
  { name: 'PP Granules', category: 'Plastic', quantity: '950 kg', grade: 'Virgin grade', company: 'PolyCycle', location: 'Hyderabad, TS', status: 'Available', price: '59' },
];

export default function MaterialListings() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [status, setStatus] = useState('All');
  const [sort, setSort] = useState('Newest');

  const filteredMaterials = useMemo(() => {
    const result = materials.filter((item) => {
      const matchesQuery = item.name.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = category === 'All' || item.category === category;
      const matchesStatus = status === 'All' || item.status === status;
      return matchesQuery && matchesCategory && matchesStatus;
    });

    if (sort === 'Price: High to Low') {
      return [...result].sort((a, b) => Number(b.price) - Number(a.price));
    }

    if (sort === 'Price: Low to High') {
      return [...result].sort((a, b) => Number(a.price) - Number(b.price));
    }

    return result;
  }, [search, category, status, sort]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Material listings</h2>
          <p>Browse reusable industrial materials and surplus inventory.</p>
        </div>
        <button type="button" className="btn btn-primary-custom">Export Results</button>
      </div>

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
            <button type="button" className="btn btn-secondary-custom w-100">Reset filters</button>
          </div>
        </div>
      </div>

      {filteredMaterials.length ? (
        <div className="material-grid">
          {filteredMaterials.map((item) => (
            <MaterialCard key={item.name} material={item} />
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
