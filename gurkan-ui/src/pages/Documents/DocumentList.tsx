import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { getDocuments, uploadDocument, downloadDocument, deleteDocument } from '../../api/client';
import {
  DocumentCategory,
  DocumentCategoryLabels,
  type DocumentResponse,
  type DocumentCategoryType,
} from '../../types';
import '../Properties/Properties.css';
import '../Tenants/Tenants.css';
import './Documents.css';

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('tr-TR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function categoryBadgeClass(cat: DocumentCategoryType): string {
  switch (cat) {
    case 'TitleDeed': return 'doc-cat-badge doc-cat-badge--titledeed';
    case 'Contract': return 'doc-cat-badge doc-cat-badge--contract';
    case 'Insurance': return 'doc-cat-badge doc-cat-badge--insurance';
    case 'Invoice':  return 'doc-cat-badge doc-cat-badge--invoice';
    case 'Photo':    return 'doc-cat-badge doc-cat-badge--photo';
    default:         return 'doc-cat-badge doc-cat-badge--other';
  }
}

export default function DocumentList() {
  const { id: propertyId } = useParams<{ id: string }>();
  const [documents, setDocuments] = useState<DocumentResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [category, setCategory] = useState<DocumentCategoryType>(DocumentCategory.Other);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!propertyId) return;
    let cancelled = false;

    async function load() {
      try {
        const data = await getDocuments(propertyId!);
        if (!cancelled) setDocuments(data);
      } catch {
        if (!cancelled) setError('Dökümanlar yüklenemedi.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [propertyId]);

  async function handleUpload() {
    if (!propertyId) return;
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setUploadError('Lütfen bir dosya seçin.');
      return;
    }

    setUploading(true);
    setUploadError('');
    try {
      const doc = await uploadDocument(propertyId, file, category);
      setDocuments((prev) => [doc, ...prev]);
      // Reset the file input
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setUploadError(msg || 'Dosya yüklenemedi.');
    } finally {
      setUploading(false);
    }
  }

  async function handleDownload(documentId: string) {
    if (!propertyId) return;
    try {
      await downloadDocument(propertyId, documentId);
    } catch {
      setError('Dosya indirilemedi.');
    }
  }

  async function handleDelete(documentId: string) {
    if (!propertyId) return;
    if (!window.confirm('Bu dökümanı silmek istediğinize emin misiniz?')) return;

    setDeletingId(documentId);
    try {
      await deleteDocument(propertyId, documentId);
      setDocuments((prev) => prev.filter((d) => d.id !== documentId));
    } catch {
      setError('Döküman silinemedi.');
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <div>
      <div className="section-header">
        <div>
          <h2 className="section-title">Dökümanlar</h2>
          <p className="section-subtitle">{documents.length} döküman</p>
        </div>
      </div>

      {/* Upload form */}
      <div className="doc-upload-form">
        <div className="doc-upload-row">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
            className="doc-file-input"
            disabled={uploading}
          />
          <select
            className="doc-category-select"
            value={category}
            onChange={(e) => setCategory(e.target.value as DocumentCategoryType)}
            disabled={uploading}
          >
            {Object.entries(DocumentCategoryLabels).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
          <button
            className="btn btn-primary btn-sm"
            onClick={handleUpload}
            disabled={uploading}
          >
            {uploading ? (
              <>
                <div className="loading-spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                Yükleniyor...
              </>
            ) : (
              <>
                <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                Yükle
              </>
            )}
          </button>
        </div>
        {uploadError && (
          <div className="doc-upload-error">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14, flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {uploadError}
          </div>
        )}
      </div>

      {error && (
        <div className="error-banner">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
        </div>
      )}

      {documents.length === 0 ? (
        <div className="empty-state">
          <svg className="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          <p className="empty-state-title">Henüz döküman yüklenmemiş.</p>
          <p className="empty-state-text">Mülk dökümanlarını yukarıdaki formdan yükleyebilirsiniz.</p>
        </div>
      ) : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Dosya Adı</th>
                <th>Kategori</th>
                <th>Boyut</th>
                <th>Yükleme Tarihi</th>
                <th>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((d) => (
                <tr key={d.id}>
                  <td className="doc-filename" title={d.originalFileName}>
                    {d.originalFileName}
                  </td>
                  <td>
                    <span className={categoryBadgeClass(d.category)}>
                      {DocumentCategoryLabels[d.category]}
                    </span>
                  </td>
                  <td className="doc-filesize">{formatFileSize(d.fileSize)}</td>
                  <td className="date">{formatDate(d.uploadedAt)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        className="btn-download"
                        onClick={() => handleDownload(d.id)}
                        title="İndir"
                      >
                        <svg style={{ width: 14, height: 14 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        İndir
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ color: 'var(--danger)' }}
                        onClick={() => handleDelete(d.id)}
                        disabled={deletingId === d.id}
                        title="Sil"
                      >
                        <svg style={{ width: 14, height: 14 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
