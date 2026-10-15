const requests = [
  { material: 'HDPE Scrap', buyer: 'Apex Packaging', supplier: 'EcoFlow Industries', quantity: '250 kg', date: '14 Jun 2026', status: 'Pending', price: '₹12,500', action: 'Review' },
  { material: 'Copper Wire Scrap', buyer: 'Metro Components', supplier: 'Ramco Metals', quantity: '600 kg', date: '10 Jun 2026', status: 'Accepted', price: '₹34,600', action: 'Confirm dispatch' },
  { material: 'Organic Compost Feed', buyer: 'AgriCycle', supplier: 'EarthNest Bio', quantity: '1.1 t', date: '07 Jun 2026', status: 'In Transit', price: '₹18,000', action: 'Track shipment' },
  { material: 'Steel Turnings', buyer: 'MetalMax Works', supplier: 'Hitech Alloy', quantity: '1.4 t', date: '05 Jun 2026', status: 'Rejected', price: '₹27,800', action: 'See feedback' },
];

const statusClass = {
  Pending: 'warning',
  Accepted: 'success',
  'In Transit': 'info',
  Rejected: 'muted',
};

export default function ExchangeRequests() {
  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Exchange requests</h2>
          <p>Track and manage material requests across your buyer and supplier network.</p>
        </div>
      </div>

      <div className="panel-card mb-4">
        <div className="chip-list">
          <span className="chip">All</span>
          <span className="chip">Pending</span>
          <span className="chip">Accepted</span>
          <span className="chip">In Transit</span>
          <span className="chip">Completed</span>
        </div>
      </div>

      <div className="panel-card">
        <div className="table-responsive">
          <table className="table align-middle">
            <thead>
              <tr>
                <th>Material</th>
                <th>Supplier / Buyer</th>
                <th>Quantity</th>
                <th>Date</th>
                <th>Price</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => (
                <tr key={`${request.material}-${request.date}`}>
                  <td>{request.material}</td>
                  <td>{request.supplier} / {request.buyer}</td>
                  <td>{request.quantity}</td>
                  <td>{request.date}</td>
                  <td>{request.price}</td>
                  <td>
                    <span className={`badge ${statusClass[request.status] || 'muted'}`}>{request.status}</span>
                  </td>
                  <td>
                    <button type="button" className="btn btn-outline-custom btn-sm">{request.action}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
