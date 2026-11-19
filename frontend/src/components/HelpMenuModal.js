import { useState, useEffect } from 'react';
import { BookOpen, FileCheck, HelpCircle, Shield, Truck, X } from 'lucide-react';
import { getGuides } from '../services/api';

const defaultGuides = [
  {
    id: 'g-1',
    title: 'Industrial Waste Segregation & Quality Grading',
    category: 'Material Standards',
    icon: Shield,
    summary: 'Guidelines on sorting plastic polymers by resin code, removing cutting fluids from steel/aluminium turnings, and preparing moisture-controlled fly ash for cement factories.',
  },
  {
    id: 'g-2',
    title: 'Exchange Workflow & Legal Handover Ledger',
    category: 'Transaction Process',
    icon: FileCheck,
    summary: 'Step-by-step documentation on converting an exchange request into an accepted handover, generating weighbridge verification slips, and recording verified completion.',
  },
  {
    id: 'g-3',
    title: 'Freight Routing & Transport Logistics Costing',
    category: 'Logistics',
    icon: Truck,
    summary: 'How the platform computes distance-based freight estimations across Light (LCV), Medium (MCV), and Heavy Commercial Vehicles (HCV) to minimize transit emissions.',
  },
  {
    id: 'g-4',
    title: 'SDG 9 & SDG 12 Verification Framework',
    category: 'Sustainability',
    icon: BookOpen,
    summary: 'The Life Cycle Assessment methodology tracking tonnes of diverted landfill waste, virgin raw material cost savings, and avoided CO2 greenhouse gas emissions.',
  },
];

export default function HelpMenuModal({ isOpen, onClose }) {
  const [guides, setGuides] = useState(defaultGuides);

  useEffect(() => {
    getGuides()
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setGuides(data.map((g, i) => ({ ...g, icon: defaultGuides[i % defaultGuides.length].icon })));
        }
      })
      .catch(() => {});
  }, []);

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(0,0,0,0.5)',
      zIndex: 9998,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        width: '650px',
        maxWidth: '100%',
        maxHeight: '85vh',
        overflowY: 'auto',
        boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
      }}>
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <HelpCircle size={22} color="#1a5a46" />
            <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#1a5a46' }}>
              Platform Help & Operational Guides
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {guides.map((guide) => {
            const Icon = guide.icon || BookOpen;
            return (
              <div
                key={guide.id}
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  backgroundColor: '#f8faf8',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <Icon size={18} color="#34a86b" />
                  <strong style={{ fontSize: '0.98rem', color: '#1e293b' }}>{guide.title}</strong>
                  <span className="badge success" style={{ marginLeft: 'auto', fontSize: '0.75rem' }}>
                    {guide.category}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '0.86rem', color: '#475569', lineHeight: 1.5 }}>
                  {guide.summary}
                </p>
              </div>
            );
          })}
        </div>

        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #e2e8f0',
          backgroundColor: '#f1f5f9',
          display: 'flex',
          justifyContent: 'flex-end',
        }}>
          <button type="button" className="btn btn-primary-custom" onClick={onClose}>
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

