import { Link } from 'react-router-dom';
import { ShieldOff } from 'lucide-react';

export default function UnauthorizedPage() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: '#f9fafb',
      gap: 16,
      textAlign: 'center',
      padding: 24,
    }}>
      <ShieldOff size={56} color="#ef4444" />
      <h1 style={{ fontSize: 28, fontWeight: 700, color: '#111827', margin: 0 }}>Access Denied</h1>
      <p style={{ fontSize: 16, color: '#6b7280', maxWidth: 400, margin: 0 }}>
        This area is restricted to administrators only. You do not have permission to view this page.
      </p>
      <Link
        to="/dashboard"
        style={{
          marginTop: 8,
          background: '#16a34a',
          color: '#fff',
          padding: '10px 24px',
          borderRadius: 8,
          textDecoration: 'none',
          fontWeight: 600,
          fontSize: 15,
        }}
      >
        Return to Dashboard
      </Link>
    </div>
  );
}
