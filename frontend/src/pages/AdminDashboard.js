import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, Building2, FileWarning, LayoutDashboard, LogOut, Package, ShieldCheck, Users } from 'lucide-react';
import { supabase } from '../services/supabase';
import { apiFetch } from '../services/api';
import './AdminDashboard.css';

const sections = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'reports', label: 'Reports', icon: FileWarning },
  { id: 'listings', label: 'Listings Management', icon: Package },
  { id: 'companies', label: 'Company Management', icon: Building2 },
  { id: 'users', label: 'User Management', icon: Users },
  { id: 'activity', label: 'Admin Activity Logs', icon: Activity },
];

const sectionTitles = Object.fromEntries(sections.map(({ id, label }) => [id, label]));
const categories = [
  'misleading_listing',
  'unsafe_material',
  'fraudulent_company',
  'duplicate_listing',
  'prohibited_material',
  'other',
];

function formatDate(value) {
  return value ? new Date(value).toLocaleString() : '—';
}

function statusBadge(status) {
  return <span className={`admin-status status-${status || 'unknown'}`}>{status || 'unknown'}</span>;
}

function DataTable({ headers, children, emptyText }) {
  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead>
        <tbody>
          {children || (
            <tr><td className="admin-empty" colSpan={headers.length}>{emptyText}</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function AdminDashboard() {
  const [section, setSection] = useState('overview');
  const [stats, setStats] = useState(null);
  const [reports, setReports] = useState([]);
  const [listings, setListings] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [users, setUsers] = useState([]);
  const [activity, setActivity] = useState([]);
  const [reportStatus, setReportStatus] = useState('');
  const [reportCategory, setReportCategory] = useState('');
  const [listingSearch, setListingSearch] = useState('');
  const [listingStatus, setListingStatus] = useState('');
  const [listingCategory, setListingCategory] = useState('');
  const [companySearch, setCompanySearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [detailError, setDetailError] = useState('');
  const [companyDetail, setCompanyDetail] = useState(null);
  const [listingDetail, setListingDetail] = useState(null);
  const [reportDetail, setReportDetail] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  const loadSection = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      if (section === 'overview') {
        setStats(await apiFetch('/admin/stats'));
      } else if (section === 'reports') {
        const query = new URLSearchParams();
        if (reportStatus) query.set('status', reportStatus);
        if (reportCategory) query.set('category', reportCategory);
        const suffix = query.toString();
        setReports((await apiFetch(`/admin/reports${suffix ? `?${suffix}` : ''}`)).reports || []);
      } else if (section === 'listings') {
        const query = new URLSearchParams();
        if (listingSearch) query.set('search', listingSearch);
        if (listingStatus) query.set('status', listingStatus);
        if (listingCategory) query.set('category', listingCategory);
        const suffix = query.toString();
        setListings((await apiFetch(`/admin/listings${suffix ? `?${suffix}` : ''}`)).listings || []);
      } else if (section === 'companies') {
        const query = new URLSearchParams();
        if (companySearch) query.set('search', companySearch);
        const suffix = query.toString();
        setCompanies((await apiFetch(`/admin/companies${suffix ? `?${suffix}` : ''}`)).companies || []);
      } else if (section === 'users') {
        const query = new URLSearchParams();
        if (userSearch) query.set('search', userSearch);
        const suffix = query.toString();
        setUsers((await apiFetch(`/admin/users${suffix ? `?${suffix}` : ''}`)).users || []);
      } else if (section === 'activity') {
        setActivity((await apiFetch('/admin/activity?limit=250')).activity || []);
      }
    } catch (loadError) {
      setError(loadError.message || `Unable to load ${sectionTitles[section].toLowerCase()}.`);
    } finally {
      setIsLoading(false);
    }
  }, [section, reportStatus, reportCategory, listingSearch, listingStatus, listingCategory, companySearch, userSearch]);

  useEffect(() => {
    loadSection();
  }, [loadSection, reloadKey]);

  const performAction = async (endpoint, method, body, promptText, confirmText) => {
    const reason = window.prompt(promptText);
    if (!reason || !reason.trim()) return;
    if (confirmText && !window.confirm(confirmText)) return;

    setActionLoading(true);
    setError('');
    try {
      await apiFetch(endpoint, {
        method,
        body: JSON.stringify({ ...body, reason: reason.trim() }),
      });
      setReloadKey((key) => key + 1);
      if (companyDetail) setCompanyDetail(null);
      if (listingDetail) setListingDetail(null);
      if (reportDetail) setReportDetail(null);
    } catch (actionError) {
      setError(actionError.message || 'The moderation action failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const openCompanyDetail = async (companyId) => {
    setDetailError('');
    setCompanyDetail({ loading: true });
    try {
      setCompanyDetail(await apiFetch(`/admin/companies/${companyId}`));
    } catch (detailLoadError) {
      setCompanyDetail(null);
      setDetailError(detailLoadError.message || 'Unable to load company details.');
    }
  };

  const openListingDetail = async (listingId) => {
    setDetailError('');
    setListingDetail({ loading: true });
    try {
      setListingDetail(await apiFetch(`/admin/listings/${listingId}`));
    } catch (detailLoadError) {
      setListingDetail(null);
      setDetailError(detailLoadError.message || 'Unable to load listing details.');
    }
  };

  const openReportDetail = async (reportId) => {
    setDetailError('');
    setReportDetail({ loading: true });
    try {
      setReportDetail(await apiFetch(`/admin/reports/${reportId}`));
    } catch (detailLoadError) {
      setReportDetail(null);
      setDetailError(detailLoadError.message || 'Unable to load report details.');
    }
  };

  const handleSignOut = async () => {
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      setError(signOutError.message || 'Unable to sign out.');
      return;
    }
    window.location.href = '/login';
  };

  const statsCards = [
    { label: 'Users', value: stats?.totalUsers, icon: <Users size={20} /> },
    { label: 'Companies', value: stats?.totalCompanies, icon: <Building2 size={20} /> },
    { label: 'Listings', value: stats?.totalListings, icon: <Package size={20} /> },
    { label: 'Exchange Requests', value: stats?.totalRequests, icon: <LayoutDashboard size={20} /> },
    { label: 'Transactions', value: stats?.totalTransactions, icon: <Activity size={20} /> },
    { label: 'Reports', value: stats?.totalReports, icon: <FileWarning size={20} /> },
  ];

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div className="admin-brand">
          <ShieldCheck size={30} />
          <div>
            <h1>Platform Administration</h1>
            <p>Industrial Waste Exchange moderation and management</p>
          </div>
        </div>
        <button type="button" className="admin-button secondary" onClick={handleSignOut}>
          <LogOut size={16} /> Sign out
        </button>
      </header>

      <nav className="admin-nav" aria-label="Administration sections">
        {sections.map(({ id, label, icon: Icon }) => (
          <button
            type="button"
            key={id}
            className={section === id ? 'selected' : ''}
            onClick={() => setSection(id)}
          >
            <Icon size={16} /> {label}
          </button>
        ))}
      </nav>

      <section className="admin-content">
        <div className="admin-section-heading">
          <div>
            <h2>{sectionTitles[section]}</h2>
            <p>Changes to listings, companies, and reports require a recorded reason.</p>
          </div>
          <button type="button" className="admin-button secondary" onClick={() => setReloadKey((key) => key + 1)} disabled={isLoading || actionLoading}>
            Refresh
          </button>
        </div>

        {error ? <div className="admin-alert" role="alert">{error}</div> : null}
        {detailError ? <div className="admin-alert" role="alert">{detailError}</div> : null}
        {actionLoading ? <div className="admin-loading" role="status">Saving moderation action...</div> : null}

        {section === 'overview' ? (
          <div className="admin-stat-grid">
            {statsCards.map((card) => (
              <article className="admin-stat-card" key={card.label}>
                <span>{card.icon}</span>
                <div><strong>{isLoading ? '…' : card.value ?? '—'}</strong><small>{card.label}</small></div>
              </article>
            ))}
            <article className="admin-overview-note">
              <h3>Moderation workflow</h3>
              <p>New company listings are published directly. Reports enter the review queue; reports never remove content automatically.</p>
              <button type="button" className="admin-button" onClick={() => setSection('reports')}>Review reports</button>
            </article>
          </div>
        ) : null}

        {section === 'reports' ? (
          <>
            <div className="admin-filters">
              <label>Status
                <select value={reportStatus} onChange={(event) => setReportStatus(event.target.value)}>
                  <option value="">All statuses</option>
                  {['pending', 'under_review', 'resolved', 'dismissed'].map((status) => <option key={status} value={status}>{status.replace('_', ' ')}</option>)}
                </select>
              </label>
              <label>Category
                <select value={reportCategory} onChange={(event) => setReportCategory(event.target.value)}>
                  <option value="">All categories</option>
                  {categories.map((category) => <option key={category} value={category}>{category.replaceAll('_', ' ')}</option>)}
                </select>
              </label>
            </div>
            {isLoading ? <div className="admin-loading">Loading reports...</div> : (
              <DataTable headers={['Created', 'Target', 'Category', 'Reason', 'Status', 'Actions']} emptyText="No reports match these filters.">
                {reports.map((report) => (
                  <tr key={report.id}>
                    <td>{formatDate(report.created_at)}</td>
                    <td>{report.target_type}<small>{report.reported_listing_id || report.reported_company_id}</small></td>
                    <td>{report.category.replaceAll('_', ' ')}</td>
                    <td>{report.reason}<small>{report.description}</small></td>
                    <td>{statusBadge(report.status)}</td>
                    <td className="admin-actions">
                      <button type="button" className="admin-button secondary" onClick={() => openReportDetail(report.id)}>Review</button>
                      {report.status !== 'under_review' ? (
                        <button type="button" className="admin-button secondary" disabled={actionLoading} onClick={() => performAction(`/admin/reports/${report.id}`, 'PATCH', { status: 'under_review' }, 'Reason for placing this report under review:')}>Take review</button>
                      ) : null}
                      {report.status !== 'resolved' ? (
                        <button type="button" className="admin-button" disabled={actionLoading} onClick={() => performAction(`/admin/reports/${report.id}`, 'PATCH', { status: 'resolved' }, 'Reason for resolving this report:')}>Resolve</button>
                      ) : null}
                      {report.status !== 'dismissed' ? (
                        <button type="button" className="admin-button danger" disabled={actionLoading} onClick={() => performAction(`/admin/reports/${report.id}`, 'PATCH', { status: 'dismissed' }, 'Reason for dismissing this report:')}>Dismiss</button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </DataTable>
            )}
          </>
        ) : null}

        {section === 'listings' ? (
          <>
            <div className="admin-filters">
              <label>Search listings
                <input value={listingSearch} onChange={(event) => setListingSearch(event.target.value)} placeholder="Title, company, or email" />
              </label>
              <label>Moderation status
                <select value={listingStatus} onChange={(event) => setListingStatus(event.target.value)}>
                  <option value="">All statuses</option>
                  {['active', 'hidden', 'suspended', 'removed'].map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
              </label>
              <label>Category
                <select value={listingCategory} onChange={(event) => setListingCategory(event.target.value)}>
                  <option value="">All categories</option>
                  {['Plastic', 'Metal', 'Organic', 'Ash', 'Textile', 'Chemical', 'Construction', 'Rubber'].map((category) => <option key={category} value={category}>{category}</option>)}
                </select>
              </label>
            </div>
            {isLoading ? <div className="admin-loading">Loading listings...</div> : (
              <DataTable headers={['Listing', 'Owner', 'Category', 'Published', 'Reports', 'Status', 'Actions']} emptyText="No listings match this search.">
                {listings.map((listing) => (
                  <tr key={listing.id}>
                    <td><button type="button" className="admin-link" onClick={() => openListingDetail(listing.id)}>{listing.title}</button><small>{listing.description || 'No description'}</small></td>
                    <td>{listing.companies?.name || listing.company_name || 'Unknown company'}<small>{listing.owner_email}</small></td>
                    <td>{listing.category_name || '—'}</td>
                    <td>{formatDate(listing.created_at)}</td>
                    <td><button type="button" className="admin-link" onClick={() => openListingDetail(listing.id)}>{listing.report_count || 0} reports</button></td>
                    <td>{statusBadge(listing.moderation_status)}</td>
                    <td className="admin-actions">
                      {listing.moderation_status === 'active' ? (
                        <>
                          <button type="button" className="admin-button secondary" disabled={actionLoading} onClick={() => performAction(`/admin/listings/${listing.id}/status`, 'PATCH', { status: 'hidden' }, 'Reason for hiding this listing:')}>Hide</button>
                          <button type="button" className="admin-button danger" disabled={actionLoading} onClick={() => performAction(`/admin/listings/${listing.id}/status`, 'PATCH', { status: 'suspended' }, 'Reason for suspending this listing:')}>Suspend</button>
                        </>
                      ) : (
                        <button type="button" className="admin-button" disabled={actionLoading} onClick={() => performAction(`/admin/listings/${listing.id}/status`, 'PATCH', { status: 'active' }, 'Reason for restoring this listing:')}>Restore</button>
                      )}
                      <button type="button" className="admin-button danger" disabled={actionLoading} onClick={() => performAction(`/admin/listings/${listing.id}`, 'DELETE', {}, 'Reason for permanently deleting this listing:', 'Permanently delete this listing? Related exchange history is retained.')}>Delete permanently</button>
                    </td>
                  </tr>
                ))}
              </DataTable>
            )}
          </>
        ) : null}

        {section === 'companies' ? (
          <>
            <div className="admin-filters">
              <label>Search companies
                <input value={companySearch} onChange={(event) => setCompanySearch(event.target.value)} placeholder="Company name or email" />
              </label>
            </div>
            {isLoading ? <div className="admin-loading">Loading companies...</div> : (
              <DataTable headers={['Company', 'Email', 'Industry', 'Listings', 'Reports', 'Status', 'Actions']} emptyText="No companies match this search.">
                {companies.map((company) => (
                  <tr key={company.id}>
                    <td><button type="button" className="admin-link" onClick={() => openCompanyDetail(company.id)}>{company.name}</button><small>{company.id}</small></td>
                    <td>{company.email || '—'}</td>
                    <td>{company.industry_type || '—'}</td>
                    <td>{company.listing_count}</td>
                    <td>{company.report_count}</td>
                    <td>{statusBadge(company.moderation_status)}</td>
                    <td className="admin-actions">
                      {company.moderation_status === 'active' ? (
                        <>
                          <button type="button" className="admin-button secondary" disabled={actionLoading} onClick={() => performAction(`/admin/companies/${company.id}/status`, 'PATCH', { status: 'suspended' }, 'Reason for suspending this company:')}>Suspend</button>
                          <button type="button" className="admin-button danger" disabled={actionLoading} onClick={() => performAction(`/admin/companies/${company.id}/status`, 'PATCH', { status: 'blacklisted' }, 'Reason for blacklisting this company:')}>Blacklist</button>
                        </>
                      ) : (
                        <button type="button" className="admin-button" disabled={actionLoading} onClick={() => performAction(`/admin/companies/${company.id}/status`, 'PATCH', { status: 'active' }, 'Reason for restoring this company:')}>Restore</button>
                      )}
                    </td>
                  </tr>
                ))}
              </DataTable>
            )}
          </>
        ) : null}

        {section === 'users' ? (
          <>
            <div className="admin-filters">
              <label>Search users
                <input value={userSearch} onChange={(event) => setUserSearch(event.target.value)} placeholder="Email or company" />
              </label>
            </div>
            {isLoading ? <div className="admin-loading">Loading users...</div> : (
              <DataTable headers={['Email', 'Role', 'Company', 'Company status', 'Joined', 'Last sign in']} emptyText="No users match this search.">
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.email || '—'}<small>{user.id}</small></td>
                    <td>{user.role}</td>
                    <td>{user.company_name || '—'}</td>
                    <td>{user.company_status ? statusBadge(user.company_status) : '—'}</td>
                    <td>{formatDate(user.created_at)}</td>
                    <td>{formatDate(user.last_sign_in_at)}</td>
                  </tr>
                ))}
              </DataTable>
            )}
          </>
        ) : null}

        {section === 'activity' ? (
          isLoading ? <div className="admin-loading">Loading admin activity...</div> : (
            <DataTable headers={['Timestamp', 'Administrator', 'Action', 'Target', 'Reason']} emptyText="No administrative actions have been recorded.">
              {activity.map((entry) => (
                <tr key={entry.id}>
                  <td>{formatDate(entry.created_at)}</td>
                  <td>{entry.admin_email || entry.admin_user_id || 'Deleted admin'}</td>
                  <td>{entry.action.replaceAll('_', ' ')}{entry.details?.status ? ` (${entry.details.status})` : ''}</td>
                  <td>{entry.target_type}: {entry.target_id}</td>
                  <td>{entry.reason}</td>
                </tr>
              ))}
            </DataTable>
          )
        ) : null}

        {companyDetail ? (
          <div className="admin-overlay" role="presentation" onClick={() => setCompanyDetail(null)}>
            <section className="admin-detail-panel" role="dialog" aria-modal="true" aria-label="Company details" onClick={(event) => event.stopPropagation()}>
              <button type="button" className="admin-close" onClick={() => setCompanyDetail(null)}>Close</button>
              {companyDetail.loading ? <div className="admin-loading">Loading company details...</div> : (
                <>
                  <h3>{companyDetail.company.name}</h3>
                  <p>{companyDetail.company.email} · {companyDetail.company.industry_type || 'Industry not provided'}</p>
                  <p>{companyDetail.company.description || 'No company description.'}</p>
                  <p>Current status: {statusBadge(companyDetail.company.moderation_status)}</p>
                  {companyDetail.company.moderation_reason ? <p>Moderation reason: {companyDetail.company.moderation_reason}</p> : null}
                  <div className="admin-detail-actions">
                    {companyDetail.company.moderation_status === 'active' ? (
                      <>
                        <button type="button" className="admin-button secondary" onClick={() => performAction(`/admin/companies/${companyDetail.company.id}/status`, 'PATCH', { status: 'suspended' }, 'Reason for suspending this company:')}>Suspend company</button>
                        <button type="button" className="admin-button danger" onClick={() => performAction(`/admin/companies/${companyDetail.company.id}/status`, 'PATCH', { status: 'blacklisted' }, 'Reason for blacklisting this company:')}>Blacklist company</button>
                      </>
                    ) : (
                      <button type="button" className="admin-button" onClick={() => performAction(`/admin/companies/${companyDetail.company.id}/status`, 'PATCH', { status: 'active' }, 'Reason for restoring this company:')}>Restore company</button>
                    )}
                  </div>
                  <h4>Listings ({companyDetail.listings.length})</h4>
                  {companyDetail.listings.map((listing) => <p key={listing.id}>{listing.title} · {statusBadge(listing.moderation_status)}</p>)}
                  <h4>Reports against this company ({companyDetail.reports.length})</h4>
                  {companyDetail.reports.map((report) => <p key={report.id}>{report.category}: {report.reason} · {statusBadge(report.status)}</p>)}
                </>
              )}
            </section>
          </div>
        ) : null}

        {listingDetail ? (
          <div className="admin-overlay" role="presentation" onClick={() => setListingDetail(null)}>
            <section className="admin-detail-panel" role="dialog" aria-modal="true" aria-label="Listing details" onClick={(event) => event.stopPropagation()}>
              <button type="button" className="admin-close" onClick={() => setListingDetail(null)}>Close</button>
              {listingDetail.loading ? <div className="admin-loading">Loading listing details...</div> : (
                <>
                  <h3>{listingDetail.listing.title}</h3>
                  <p>{listingDetail.listing.description || 'No description provided.'}</p>
                  <p><strong>Owner:</strong> {listingDetail.listing.companies?.name || listingDetail.listing.company_name || 'Unknown company'} ({listingDetail.listing.owner_email || 'email unavailable'})</p>
                  <p><strong>Category:</strong> {listingDetail.listing.category_name || '—'} · <strong>Location:</strong> {listingDetail.listing.location || '—'}</p>
                  <p><strong>Moderation status:</strong> {statusBadge(listingDetail.listing.moderation_status)}</p>
                  {listingDetail.listing.moderation_reason ? <p>Moderation reason: {listingDetail.listing.moderation_reason}</p> : null}
                  <div className="admin-detail-actions">
                    {listingDetail.listing.moderation_status === 'active' ? (
                      <>
                        <button type="button" className="admin-button secondary" onClick={() => performAction(`/admin/listings/${listingDetail.listing.id}/status`, 'PATCH', { status: 'hidden' }, 'Reason for hiding this listing:')}>Hide listing</button>
                        <button type="button" className="admin-button danger" onClick={() => performAction(`/admin/listings/${listingDetail.listing.id}/status`, 'PATCH', { status: 'suspended' }, 'Reason for suspending this listing:')}>Suspend listing</button>
                      </>
                    ) : (
                      <button type="button" className="admin-button" onClick={() => performAction(`/admin/listings/${listingDetail.listing.id}/status`, 'PATCH', { status: 'active' }, 'Reason for restoring this listing:')}>Restore listing</button>
                    )}
                    <button type="button" className="admin-button danger" onClick={() => performAction(`/admin/listings/${listingDetail.listing.id}`, 'DELETE', {}, 'Reason for permanently deleting this listing:', 'Permanently delete this listing? Related exchange history is retained.')}>Delete permanently</button>
                  </div>
                  <h4>Reports associated with this listing ({listingDetail.reports.length})</h4>
                  {listingDetail.reports.length ? listingDetail.reports.map((report) => (
                    <div className="admin-target-detail" key={report.id}>
                      <p>{report.category.replaceAll('_', ' ')} · {statusBadge(report.status)}</p>
                      <p><strong>{report.reason}:</strong> {report.description}</p>
                      <button type="button" className="admin-link" onClick={() => openReportDetail(report.id)}>Open report</button>
                    </div>
                  )) : <p>No reports are associated with this listing.</p>}
                </>
              )}
            </section>
          </div>
        ) : null}

        {reportDetail ? (
          <div className="admin-overlay" role="presentation" onClick={() => setReportDetail(null)}>
            <section className="admin-detail-panel" role="dialog" aria-modal="true" aria-label="Report details" onClick={(event) => event.stopPropagation()}>
              <button type="button" className="admin-close" onClick={() => setReportDetail(null)}>Close</button>
              {reportDetail.loading ? <div className="admin-loading">Loading report details...</div> : (
                <>
                  <h3>Report review</h3>
                  <p>{reportDetail.report.category.replaceAll('_', ' ')} · {statusBadge(reportDetail.report.status)}</p>
                  <p><strong>Reporter:</strong> {reportDetail.reporter.company?.name || 'Unknown company'} ({reportDetail.reporter.email || 'email unavailable'})</p>
                  <p><strong>Reason:</strong> {reportDetail.report.reason}</p>
                  <p><strong>Description:</strong> {reportDetail.report.description}</p>
                  {reportDetail.report.handled_by ? <p><strong>Handled by:</strong> {reportDetail.report.handled_by} · {formatDate(reportDetail.report.handled_at)}</p> : null}
                  {reportDetail.report.handling_reason ? <p><strong>Handling reason:</strong> {reportDetail.report.handling_reason}</p> : null}
                  <p><strong>Target:</strong> {reportDetail.report.target_type}</p>
                  {reportDetail.target ? (
                    <div className="admin-target-detail">
                      <h4>{reportDetail.target.title || reportDetail.target.name}</h4>
                      <p>{reportDetail.target.description || reportDetail.target.industry_type || 'No additional details.'}</p>
                      <p>Owner: {reportDetail.target.company_name || reportDetail.target.email || '—'}</p>
                    </div>
                  ) : <p>The reported record is no longer available.</p>}
                  <div className="admin-detail-actions">
                    {reportDetail.report.target_type === 'listing' && reportDetail.report.reported_listing_id ? (
                      <button type="button" className="admin-button danger" onClick={() => performAction(`/admin/listings/${reportDetail.report.reported_listing_id}/status`, 'PATCH', { status: 'hidden' }, 'Reason for hiding the reported listing:')}>Hide reported listing</button>
                    ) : null}
                    {reportDetail.report.target_type === 'company' && reportDetail.report.reported_company_id ? (
                      <>
                        <button type="button" className="admin-button secondary" onClick={() => performAction(`/admin/companies/${reportDetail.report.reported_company_id}/status`, 'PATCH', { status: 'suspended' }, 'Reason for suspending the reported company:')}>Suspend company</button>
                        <button type="button" className="admin-button danger" onClick={() => performAction(`/admin/companies/${reportDetail.report.reported_company_id}/status`, 'PATCH', { status: 'blacklisted' }, 'Reason for blacklisting the reported company:')}>Blacklist company</button>
                      </>
                    ) : null}
                    <button type="button" className="admin-button" onClick={() => performAction(`/admin/reports/${reportDetail.report.id}`, 'PATCH', { status: 'resolved' }, 'Reason for resolving this report:')}>Resolve report</button>
                    <button type="button" className="admin-button secondary" onClick={() => performAction(`/admin/reports/${reportDetail.report.id}`, 'PATCH', { status: 'dismissed' }, 'Reason for dismissing this report:')}>Dismiss report</button>
                  </div>
                </>
              )}
            </section>
          </div>
        ) : null}
      </section>
      <footer className="admin-footer"><Link to="/login">Return to sign in</Link></footer>
    </main>
  );
}
