import { useEffect, useMemo, useState } from 'react';
import { api, type GetResidentsParams } from '@/api/client';
import { useAsync } from '@/hooks/useAsync';
import { useAuth } from '@/hooks/useAuth';
import { formatDate } from '@/utils/format';
import type { MembershipStatus, MembershipType, ResidentListItem, ResidentPageResponse } from '@/types';

type SortField = 'fullName' | 'unitNumber' | 'membershipType' | 'status' | 'moveInDate';
type Sort = `${SortField},asc` | `${SortField},desc`;
const PAGE_SIZES = [10, 20, 50, 100];
const MEMBERSHIP_LABELS: Record<MembershipType, string> = { OWNER: 'Owner', TENANT: 'Tenant', FAMILY_MEMBER: 'Family member', OTHER_OCCUPANT: 'Other occupant' };
const STATUS_LABELS: Record<MembershipStatus, string> = { ACTIVE: 'Active', INVITED: 'Invited', PENDING_VERIFICATION: 'Pending verification', PENDING_APPROVAL: 'Pending approval', REJECTED: 'Rejected', INACTIVE: 'Inactive', MOVED_OUT: 'Moved out' };

const initials = (name: string): string => { const parts = name.trim().split(/\s+/).filter(Boolean); return (parts.length ? `${parts[0][0]}${parts.length > 1 ? parts[parts.length - 1][0] : ''}` : '?').toUpperCase(); };
const provided = (value: string | null): string => value?.trim() || 'Not provided';
const statusClass = (status: MembershipStatus): string => status === 'ACTIVE' ? 'resident-status--active' : status === 'REJECTED' ? 'resident-status--rejected' : ['INACTIVE', 'MOVED_OUT'].includes(status) ? 'resident-status--inactive' : 'resident-status--pending';

function ResidentStatus({ status }: { status: MembershipStatus }) { return <span className={`resident-status ${statusClass(status)}`}><i aria-hidden="true" />{STATUS_LABELS[status]}</span>; }
function Identity({ resident }: { resident: ResidentListItem }) { return <div className="resident-identity">{resident.avatarUrl ? <img className="resident-avatar" src={resident.avatarUrl} alt={`${resident.fullName} profile`} /> : <span className="resident-avatar" aria-hidden="true">{initials(resident.fullName)}</span>}<span><strong>{resident.fullName.trim() || 'Unknown resident'}</strong>{resident.primaryMember ? <small>Primary</small> : null}</span></div>; }

export default function ResidentsPage() {
  const { user } = useAuth();
  const societyId = user?.societyId;
  const canManageResidents = user?.role === 'ADMIN' || user?.role === 'COMMITTEE';
  const [draftSearch, setDraftSearch] = useState('');
  const [search, setSearch] = useState('');
  const [blockId, setBlockId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [membershipType, setMembershipType] = useState<MembershipType | ''>('');
  const [status, setStatus] = useState<MembershipStatus | ''>('VERIFIED' as MembershipStatus | '');
  const [sort, setSort] = useState<Sort>('fullName,asc');
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: '', unit: '', email: '', phone: '' });
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => { const timer = window.setTimeout(() => { setSearch(draftSearch.trim()); setPage(0); }, 400); return () => window.clearTimeout(timer); }, [draftSearch]);
  useEffect(() => { setPage(0); }, [blockId, unitId, membershipType, status, sort, societyId]);
  useEffect(() => { setBlockId(''); setUnitId(''); }, [societyId]);
  const params: GetResidentsParams | null = societyId ? { societyId, page, size, search, blockId: blockId || undefined, unitId: unitId || undefined, membershipType: membershipType || undefined, status: status || undefined, sort } : null;
  const { data, error, loading, reload } = useAsync<ResidentPageResponse>(() => api.getResidents(params as GetResidentsParams), [params?.societyId, params?.page, params?.size, params?.search, params?.blockId, params?.unitId, params?.membershipType, params?.status, params?.sort]);
  const scopedData = data && data.items.every((resident) => resident.societyId === societyId) ? data : null;
  const residents = useMemo(() => scopedData?.items ?? [], [scopedData]);
  const blocks = useMemo(() => Array.from(new Map(residents.filter((resident) => resident.block).map((resident) => [resident.block?.id, resident.block])).values()), [residents]);
  const units = residents.filter((resident) => resident.block?.id === blockId);
  const filtersActive = Boolean(search || blockId || unitId || membershipType || status !== 'ACTIVE');
  const errorMessage = error?.includes('403') ? 'You do not have permission to view residents.' : error?.includes('404') ? 'The selected society could not be found.' : error?.includes('400') ? 'Some filters are invalid. Clear the filters and try again.' : 'Resident information is temporarily unavailable. Please try again.';
  const clearFilters = () => { setDraftSearch(''); setSearch(''); setBlockId(''); setUnitId(''); setMembershipType(''); setStatus('ACTIVE'); setPage(0); };
  const sortColumn = (field: SortField) => { const direction = sort.startsWith(`${field},`) && sort.endsWith(',asc') ? 'desc' : 'asc'; setSort(`${field},${direction}`); };
  const resetUnitIfNeeded = (nextBlock: string) => { setBlockId(nextBlock); setUnitId(''); };
  const submitAdd = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim() || !form.unit.trim() || !form.email.trim() || !/^\+?[0-9 ()-]{7,}$/.test(form.phone)) { setFormError('Enter a name, unit, valid email and valid mobile number.'); return; }
    setFormError(null);
    try { await api.createResident({ ...form, ownership: 'OWNER', moveInDate: new Date().toISOString().slice(0, 10), active: true }); setForm({ name: '', unit: '', email: '', phone: '' }); setDialogOpen(false); reload(); } catch { setFormError('Resident information is temporarily unavailable. Please try again.'); }
  };

  return <div className="residents-page">
    <header className="residents-header"><div><h1>Residents</h1><p>Manage owners, tenants and household members in your society.</p></div>{canManageResidents ? <button className="primary" type="button" onClick={() => setDialogOpen(true)}>+ Add resident</button> : null}</header>
    <p aria-live="polite">{scopedData ? `${scopedData.page.totalElements} residents` : ''}</p>
    <section className="resident-toolbar" aria-label="Resident filters">
      <label className="resident-search"><span aria-hidden="true">⌕</span><input aria-label="Search residents" placeholder="Search by name, unit, email or phone" value={draftSearch} onChange={(event) => setDraftSearch(event.target.value)} />{draftSearch ? <button type="button" aria-label="Clear search" onClick={() => { setDraftSearch(''); setSearch(''); }}>×</button> : null}</label>
      <select aria-label="Block" value={blockId} onChange={(event) => resetUnitIfNeeded(event.target.value)}><option value="">All blocks</option>{blocks.map((block) => <option key={block?.id} value={block?.id}>{block?.name}</option>)}</select>
      <select aria-label="Unit" disabled={!blockId} value={unitId} onChange={(event) => setUnitId(event.target.value)}><option value="">All units</option>{units.map((resident) => <option key={resident.unit.id} value={resident.unit.id}>{resident.unit.number}</option>)}</select>
      <select aria-label="Membership type" value={membershipType} onChange={(event) => setMembershipType(event.target.value as MembershipType | '')}><option value="">All memberships</option>{Object.entries(MEMBERSHIP_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
      <select aria-label="Status" value={status} onChange={(event) => setStatus(event.target.value as MembershipStatus)}><option value="ACTIVE">Active</option><option value="">All statuses</option><option value="PENDING_APPROVAL">Pending approval</option><option value="INVITED">Invited</option><option value="INACTIVE">Inactive</option><option value="MOVED_OUT">Moved out</option><option value="REJECTED">Rejected</option></select>
      {filtersActive ? <button type="button" onClick={clearFilters}>Clear filters</button> : null}<button className="resident-refresh" type="button" aria-label="Refresh residents" title="Refresh residents" disabled={loading} onClick={reload}>↻</button>
    </section>
    {error ? <div className="resident-error" role="alert" aria-live="assertive"><span aria-hidden="true">!</span><div><strong>We couldn’t load residents</strong><p>{errorMessage}</p><button type="button" onClick={reload}>Retry</button>{filtersActive ? <button type="button" onClick={clearFilters}>Clear filters</button> : null}</div></div> : loading && !scopedData ? <div className="resident-table-shell" role="status"><span className="sr-only">Loading residents...</span>{[1, 2, 3, 4].map((item) => <div className="resident-skeleton" key={item} />)}</div> : residents.length === 0 ? <div className="resident-empty" role="status"><strong>{filtersActive ? 'No residents match your search' : 'No residents found'}</strong><p>{filtersActive ? 'Try changing or clearing the selected filters.' : 'Residents will appear here after they are registered in this society.'}</p>{filtersActive ? <button type="button" onClick={clearFilters}>Clear filters</button> : null}</div> : <>
      <div className="resident-table-shell">{loading ? <span className="resident-progress" role="status">Updating residents...</span> : null}<table className="residents-table"><caption className="sr-only">Residents</caption><thead><tr><th scope="col" aria-sort={sort.startsWith('fullName,') ? sort.endsWith(',asc') ? 'ascending' : 'descending' : 'none'}><button type="button" onClick={() => sortColumn('fullName')}>Resident</button></th><th scope="col" aria-sort={sort.startsWith('unitNumber,') ? sort.endsWith(',asc') ? 'ascending' : 'descending' : 'none'}><button type="button" onClick={() => sortColumn('unitNumber')}>Unit</button></th><th scope="col" aria-sort={sort.startsWith('membershipType,') ? sort.endsWith(',asc') ? 'ascending' : 'descending' : 'none'}><button type="button" onClick={() => sortColumn('membershipType')}>Membership</button></th><th scope="col">Contact</th><th scope="col" aria-sort={sort.startsWith('status,') ? sort.endsWith(',asc') ? 'ascending' : 'descending' : 'none'}><button type="button" onClick={() => sortColumn('status')}>Status</button></th><th scope="col" aria-sort={sort.startsWith('moveInDate,') ? sort.endsWith(',asc') ? 'ascending' : 'descending' : 'none'}><button type="button" onClick={() => sortColumn('moveInDate')}>Move-in date</button></th><th scope="col">Actions</th></tr></thead><tbody>{residents.map((resident) => <tr key={resident.membershipId}><td><Identity resident={resident} /></td><td><strong>{resident.block?.name || 'Block unavailable'}</strong><small>{resident.unit.number}</small></td><td><span className="membership-chip">{MEMBERSHIP_LABELS[resident.membershipType]}</span></td><td><span className="contact-cell">{provided(resident.email)}<small>{provided(resident.mobile)}</small></span></td><td><ResidentStatus status={resident.status} /></td><td>{resident.moveInDate ? formatDate(resident.moveInDate) : 'Not available'}</td><td /></tr>)}</tbody></table>{residents.map((resident) => <article className="resident-mobile-card" key={`mobile-${resident.membershipId}`}><Identity resident={resident}/><div><span>Unit</span><strong>{resident.block?.name || 'Block unavailable'}<small>{resident.unit.number}</small></strong></div><div><span>Membership</span><strong>{MEMBERSHIP_LABELS[resident.membershipType]}</strong></div><div><span>Contact</span><strong>{provided(resident.email)}<small>{provided(resident.mobile)}</small></strong></div><div><span>Move-in date</span><strong>{resident.moveInDate ? formatDate(resident.moveInDate) : 'Not available'}</strong></div><ResidentStatus status={resident.status}/></article>)}</div>
      <footer className="resident-pagination"><span>Showing {data?.page.totalElements ? page * size + 1 : 0}-{Math.min((page + 1) * size, data?.page.totalElements ?? 0)} of {data?.page.totalElements ?? 0}</span><label>Rows <select aria-label="Page size" value={size} onChange={(event) => { setSize(Math.min(100, Number(event.target.value))); setPage(0); }}>{PAGE_SIZES.map((value) => <option key={value}>{value}</option>)}</select></label><div><button type="button" aria-label="Previous page" disabled={data?.page.first ?? true} onClick={() => setPage((value) => Math.max(0, value - 1))}>←</button><span>Page {page + 1} of {Math.max(1, data?.page.totalPages ?? 1)}</span><button type="button" aria-label="Next page" disabled={data?.page.last ?? true} onClick={() => setPage((value) => value + 1)}>→</button></div></footer>
    </>}
    {dialogOpen && canManageResidents ? <div className="resident-dialog-backdrop" role="presentation"><section className="resident-dialog" role="dialog" aria-modal="true" aria-labelledby="add-resident-title"><h2 id="add-resident-title">Add resident</h2><form onSubmit={submitAdd}><label htmlFor="resident-name">Full name *</label><input id="resident-name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /><label htmlFor="resident-unit">Unit *</label><input id="resident-unit" value={form.unit} onChange={(event) => setForm({ ...form, unit: event.target.value })} /><label htmlFor="resident-email">Email *</label><input id="resident-email" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /><label htmlFor="resident-phone">Mobile number *</label><input id="resident-phone" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />{formError ? <p role="alert">{formError}</p> : null}<button type="button" onClick={() => setDialogOpen(false)}>Cancel</button><button className="primary" type="submit">Add resident</button></form></section></div> : null}
  </div>;
}