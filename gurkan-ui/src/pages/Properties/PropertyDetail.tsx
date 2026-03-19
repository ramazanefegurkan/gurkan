import { useEffect, useState, type FormEvent } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  getProperty,
  deleteProperty,
  getPropertyNotes,
  createPropertyNote,
  updatePropertyNote,
  deletePropertyNote,
} from '../../api/client';
import {
  PropertyTypeLabels,
  CurrencyLabels,
  Currency,
  type PropertyResponse,
  type PropertyNoteResponse,
} from '../../types';
import '../../styles/shared.css';
import './Properties.css';

// ── Helpers ──

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function currencyBadgeClass(currency: Currency): string {
  if (currency === Currency.USD) return 'badge badge-currency badge-currency--usd';
  if (currency === Currency.EUR) return 'badge badge-currency badge-currency--eur';
  return 'badge badge-currency';
}

// ── Component ──

export default function PropertyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Property state
  const [property, setProperty] = useState<PropertyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Notes state
  const [notes, setNotes] = useState<PropertyNoteResponse[]>([]);
  const [notesLoading, setNotesLoading] = useState(true);
  const [notesError, setNotesError] = useState('');

  // Note add
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  // Note edit
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editNoteContent, setEditNoteContent] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ── Load property ──
  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    async function load() {
      try {
        const data = await getProperty(id!);
        if (!cancelled) {
          setProperty(data);
          setError('');
        }
      } catch {
        if (!cancelled) setError('Mülk bilgileri yüklenemedi.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [id]);

  // ── Load notes ──
  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    async function load() {
      try {
        const data = await getPropertyNotes(id!);
        if (!cancelled) {
          // newest first
          setNotes(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
          setNotesError('');
        }
      } catch {
        if (!cancelled) setNotesError('Notlar yüklenemedi.');
      } finally {
        if (!cancelled) setNotesLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [id]);

  // ── Delete property ──
  async function handleDelete() {
    if (!id) return;
    setDeleting(true);
    try {
      await deleteProperty(id);
      navigate('/properties');
    } catch {
      setError('Mülk silinemedi.');
      setShowDeleteConfirm(false);
      setDeleting(false);
    }
  }

  // ── Add note ──
  async function handleAddNote(e: FormEvent) {
    e.preventDefault();
    if (!id || !newNote.trim()) return;

    setAddingNote(true);
    try {
      const created = await createPropertyNote(id, newNote.trim());
      setNotes((prev) => [created, ...prev]);
      setNewNote('');
    } catch {
      setNotesError('Not eklenemedi.');
    } finally {
      setAddingNote(false);
    }
  }

  // ── Edit note ──
  function startEditNote(note: PropertyNoteResponse) {
    setEditingNoteId(note.id);
    setEditNoteContent(note.content);
  }

  function cancelEditNote() {
    setEditingNoteId(null);
    setEditNoteContent('');
  }

  async function saveEditNote() {
    if (!id || !editingNoteId || !editNoteContent.trim()) return;

    setSavingNote(true);
    try {
      const updated = await updatePropertyNote(id, editingNoteId, editNoteContent.trim());
      setNotes((prev) => prev.map((n) => (n.id === editingNoteId ? updated : n)));
      cancelEditNote();
    } catch {
      setNotesError('Not güncellenemedi.');
    } finally {
      setSavingNote(false);
    }
  }

  // ── Delete note ──
  async function handleDeleteNote(noteId: string) {
    if (!id) return;
    try {
      await deletePropertyNote(id, noteId);
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
    } catch {
      setNotesError('Not silinemedi.');
    }
  }

  // ── Loading ──
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
      </div>
    );
  }

  // ── Error (no property) ──
  if (error && !property) {
    return (
      <div>
        <div className="error-banner">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
        </div>
      </div>
    );
  }

  if (!property) return null;

  // ── Field helper ──
  function renderField(label: string, value: string | number | null | undefined, full = false) {
    const isEmpty = value == null || value === '';
    return (
      <div className={`detail-field ${full ? 'detail-field--full' : ''}`}>
        <span className="detail-field-label">{label}</span>
        <span className={`detail-field-value ${isEmpty ? 'detail-field-value--empty' : ''}`}>
          {isEmpty ? '—' : value}
        </span>
      </div>
    );
  }

  return (
    <div>
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

      {/* ── Property card ── */}
      <div className="detail-card">
        <div className="detail-top-bar" />
        <div className="detail-header">
          <div>
            <h1 className="detail-title">{property.name}</h1>
            <div className="detail-badges">
              <span className="badge badge-type">
                {PropertyTypeLabels[property.type] ?? 'Diğer'}
              </span>
              <span className={currencyBadgeClass(property.currency)}>
                {CurrencyLabels[property.currency] ?? 'TRY'}
              </span>
              {property.groupName && (
                <span className="property-card-group">{property.groupName}</span>
              )}
            </div>
          </div>
          <div className="detail-actions">
            <Link to={`/properties/${property.id}/edit`} className="btn btn-secondary btn-sm">
              <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
              </svg>
              Düzenle
            </Link>
            <button
              className="btn btn-danger btn-sm"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
              </svg>
              Sil
            </button>
          </div>
        </div>

        <div className="detail-body">
          <div className="detail-grid">
            {renderField('Adres', property.address)}
            {renderField('Şehir', property.city)}
            {renderField('İlçe', property.district)}
            {renderField('Alan', property.area != null ? `${property.area} m²` : null)}
            {renderField('Oda Sayısı', property.roomCount)}
            {renderField('Kat', property.floor)}
            {renderField('Yapım Yılı', property.buildYear)}
            {renderField('Oluşturulma', formatDate(property.createdAt))}
            {renderField('Son Güncelleme', property.updatedAt ? formatDate(property.updatedAt) : null)}
            {property.description && renderField('Açıklama', property.description, true)}
          </div>
        </div>

        {/* ── Ownership & Subscription section ── */}
        {(property.titleDeedOwner || property.subscriptionHolder || property.defaultBankAccountName ||
          property.electricSubscriptionNo || property.gasSubscriptionNo || property.waterSubscriptionNo ||
          property.internetSubscriptionNo || property.duesSubscriptionNo) && (
          <div className="detail-body" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }}>
              Sahiplik & Abonelik Bilgileri
            </h3>
            <div className="detail-grid">
              {renderField('Tapu Sahibi', property.titleDeedOwner)}
              {renderField('Abonelik Sahibi', property.subscriptionHolder)}
              {renderField('Kira Hesabı', property.defaultBankAccountName)}
              {renderField('Elektrik Abone No', property.electricSubscriptionNo)}
              {renderField('Doğalgaz Abone No', property.gasSubscriptionNo)}
              {renderField('Su Abone No', property.waterSubscriptionNo)}
              {renderField('İnternet Abone No', property.internetSubscriptionNo)}
              {renderField('Aidat Abone No', property.duesSubscriptionNo)}
            </div>
          </div>
        )}
      </div>

      {/* ── Notes section ── */}
      <div className="notes-section">
        <div className="notes-card">
          <div className="notes-header">
            <span className="notes-title">
              <svg style={{ width: 16, height: 16 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
              Notlar
              {notes.length > 0 && <span className="notes-count">{notes.length}</span>}
            </span>
          </div>

          {/* Add note form */}
          <form className="notes-add-form" onSubmit={handleAddNote}>
            <input
              className="notes-add-input"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Yeni bir not ekleyin..."
              disabled={addingNote}
            />
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={addingNote || !newNote.trim()}
            >
              {addingNote ? '...' : 'Ekle'}
            </button>
          </form>

          {/* Notes error */}
          {notesError && (
            <div className="error-banner" style={{ margin: '12px 24px', borderRadius: 8 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {notesError}
            </div>
          )}

          {/* Notes loading */}
          {notesLoading && (
            <div className="loading-container" style={{ padding: 40 }}>
              <div className="loading-spinner" />
            </div>
          )}

          {/* Notes list */}
          {!notesLoading && notes.length === 0 && (
            <div className="notes-empty">Henüz not eklenmemiş.</div>
          )}

          {!notesLoading && notes.length > 0 && (
            <ul className="notes-list">
              {notes.map((note) => (
                <li key={note.id} className="note-item">
                  {editingNoteId === note.id ? (
                    /* Edit mode */
                    <div className="note-edit-form">
                      <textarea
                        className="note-edit-input"
                        value={editNoteContent}
                        onChange={(e) => setEditNoteContent(e.target.value)}
                        disabled={savingNote}
                        autoFocus
                      />
                      <div className="note-edit-actions">
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={saveEditNote}
                          disabled={savingNote || !editNoteContent.trim()}
                        >
                          {savingNote ? '...' : 'Kaydet'}
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={cancelEditNote}
                          disabled={savingNote}
                        >
                          İptal
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* View mode */
                    <>
                      <div className="note-content">{note.content}</div>
                      <div className="note-meta">
                        <span className="note-author">
                          <strong>{note.createdByName}</strong> · {formatDate(note.createdAt)}
                        </span>
                        <div className="note-actions">
                          <button
                            className="note-action-btn"
                            onClick={() => startEditNote(note)}
                            title="Düzenle"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                            </svg>
                          </button>
                          <button
                            className="note-action-btn note-action-btn--danger"
                            onClick={() => handleDeleteNote(note.id)}
                            title="Sil"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* ── Delete confirmation dialog ── */}
      {showDeleteConfirm && (
        <div className="confirm-overlay" onClick={() => !deleting && setShowDeleteConfirm(false)}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <h2 className="confirm-title">Mülkü Sil</h2>
            <p className="confirm-text">
              <strong>{property.name}</strong> mülkünü silmek istediğinize emin misiniz?
              Bu işlem geri alınamaz.
            </p>
            <div className="confirm-actions">
              <button
                className="btn btn-secondary"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
              >
                İptal
              </button>
              <button
                className="btn btn-danger"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? 'Siliniyor...' : 'Evet, Sil'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
