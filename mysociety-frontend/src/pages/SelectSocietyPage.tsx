import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export default function SelectSocietyPage() {
  const { status, user, availableSocieties, selectSociety, logout } = useAuth();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const societies = availableSocieties ?? [];

  if (status === 'authenticated') return <Navigate to="/" replace />;
  if (status !== 'selectingSociety') return <Navigate to="/login" replace />;

  const choose = async (societyId: string) => {
    if (selected) return;
    setSelected(societyId); setError(null);
    try { await selectSociety(societyId); navigate('/', { replace: true }); }
    catch (cause) { setSelected(null); setError(cause instanceof Error && cause.message.includes('expired') ? 'Your login session expired. Please sign in again.' : 'You are not authorized to access this society.'); }
  };

  return <main className="society-selection" aria-labelledby="select-society-title">
    <h1 id="select-society-title">Select your society</h1>
    <p>Choose the society you want to manage for this session.</p>
    <p>Signed in as {user?.name}</p>
    {error ? <p role="alert" aria-live="assertive">{error}</p> : null}
    <section aria-label="Available societies" className="society-selection__grid">
      {societies.length ? societies.map((society) => <article className="society-selection__card" key={society.id} tabIndex={0}>
        <h2>{society.name}</h2><p>{society.unit ? `Unit ${society.unit}` : 'Society member'}</p><p>{society.membershipType || 'Member'}{society.roles?.length ? ` · ${society.roles.join(', ')}` : ''}</p>
        <button type="button" disabled={selected !== null} onClick={() => choose(society.id)}>{selected === society.id ? 'Opening society...' : 'Continue'}</button>
      </article>) : <p className="society-selection__empty" role="status">No societies are available for this login session.</p>}
    </section>
    <button type="button" onClick={() => { logout(); navigate('/login', { replace: true }); }}>Back to sign in</button>
  </main>;
}