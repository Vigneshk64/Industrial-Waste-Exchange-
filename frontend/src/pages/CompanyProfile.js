const company = {
  name: 'EcoFlow Industries',
  contact: 'Priya Nair',
  email: 'priya.nair@ecoflow.in',
  phone: '+91 98765 43210',
  industry: 'Waste Management & Recycling',
  location: 'Pune, Maharashtra',
  role: 'Waste Supplier',
  description: 'EcoFlow Industries specializes in sorting and redistributing industrial plastic, metal, and non-hazardous organic surplus waste to circular manufacturing partners.',
  totalListings: 24,
  completedExchanges: 42,
};

export default function CompanyProfile() {
  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Company profile</h2>
          <p>Maintain your operational profile and exchange business information.</p>
        </div>
        <button type="button" className="btn btn-primary-custom">Edit company profile</button>
      </div>

      <div className="panel-card p-4">
        <div className="d-flex align-items-center gap-4 mb-4">
          <div className="brand-mark" style={{ width: 64, height: 64, fontSize: '1.5rem' }}>EF</div>
          <div>
            <h3 className="mb-1">{company.name}</h3>
            <span className="badge success">{company.role}</span>
          </div>
        </div>

        <div className="row g-4">
          <div className="col-md-6">
            <div className="list-row"><strong>Contact person</strong><span>{company.contact}</span></div>
            <div className="list-row"><strong>Business email</strong><span>{company.email}</span></div>
            <div className="list-row"><strong>Phone</strong><span>{company.phone}</span></div>
            <div className="list-row"><strong>Industry</strong><span>{company.industry}</span></div>
          </div>
          <div className="col-md-6">
            <div className="list-row"><strong>Location</strong><span>{company.location}</span></div>
            <div className="list-row"><strong>Total listings</strong><span>{company.totalListings}</span></div>
            <div className="list-row"><strong>Completed exchanges</strong><span>{company.completedExchanges}</span></div>
            <div className="list-row"><strong>Status</strong><span>Verified partner</span></div>
          </div>
        </div>

        <div className="mt-4">
          <h4>Company description</h4>
          <p className="text-muted">{company.description}</p>
        </div>
      </div>
    </div>
  );
}
