import { useEffect, useState } from 'react';
import { useParams, Link, useLocation, Outlet } from 'react-router-dom';
import { getProperty } from '../../api/client';
import { type PropertyResponse } from '../../types';
import '../../styles/shared.css';
import './Properties.css';

export default function PropertyLayout() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const [property, setProperty] = useState<PropertyResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    async function load() {
      try {
        const data = await getProperty(id!);
        if (!cancelled) setProperty(data);
      } catch {
        // Property load error handled by child pages
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [id]);

  const basePath = `/properties/${id}`;
  const isDetail = location.pathname === basePath;
  const isTenants = location.pathname.includes('/tenants');
  const isShortTerm = location.pathname.includes('/short-term-rentals');
  const isExpenses = location.pathname.includes('/expenses');
  const isBills = location.pathname.includes('/bills');
  const isDocuments = location.pathname.includes('/documents');

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <div className="detail-container" style={{ maxWidth: 960 }}>
      <Link to="/properties" className="back-link">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Mülklere Dön
      </Link>

      {property && (
        <div style={{ marginBottom: 4 }}>
          <h1 className="page-title">{property.name}</h1>
        </div>
      )}

      <nav className="property-tabs">
        <Link
          to={basePath}
          className={`property-tab ${isDetail ? 'property-tab--active' : ''}`}
        >
          Detaylar
        </Link>
        <Link
          to={`${basePath}/tenants`}
          className={`property-tab ${isTenants ? 'property-tab--active' : ''}`}
        >
          Kiracılar
        </Link>
        <Link
          to={`${basePath}/short-term-rentals`}
          className={`property-tab ${isShortTerm ? 'property-tab--active' : ''}`}
        >
          Kısa Dönem
        </Link>
        <Link
          to={`${basePath}/expenses`}
          className={`property-tab ${isExpenses ? 'property-tab--active' : ''}`}
        >
          Giderler
        </Link>
        <Link
          to={`${basePath}/bills`}
          className={`property-tab ${isBills ? 'property-tab--active' : ''}`}
        >
          Faturalar
        </Link>
        <Link
          to={`${basePath}/documents`}
          className={`property-tab ${isDocuments ? 'property-tab--active' : ''}`}
        >
          Dökümanlar
        </Link>
      </nav>

      <Outlet />
    </div>
  );
}
