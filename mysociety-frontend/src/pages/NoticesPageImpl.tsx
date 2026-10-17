import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormHelperText,
  IconButton,
  InputLabel,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Delete, Edit, Publish, People, CalendarToday, Campaign } from '@mui/icons-material';
import { Chip, Card, CardContent, Grid, Link, InputAdornment } from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddIcon from '@mui/icons-material/Add';
import { api } from '@/api/client';
import type { NoticeResponse, NoticeRequest, AudienceRequest, AudienceResponse } from '@/types';

const CATEGORY_OPTIONS = ['GENERAL', 'EMERGENCY', 'MAINTENANCE', 'EVENT', 'PAYMENT', 'SECURITY', 'MEETING'] as const;

function generateNoticeNumber(): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `N-${date}-${time}-${rand}`;
}

export default function NoticesPageImpl() {
  const theme = useTheme();
  const priorityColor = (p?: string) => {
    switch (p) {
      case 'URGENT': return { color: theme.palette.error.main, bg: alpha(theme.palette.error.main, 0.08) };
      case 'HIGH': return { color: theme.palette.warning.main, bg: alpha(theme.palette.warning.main, 0.06) };
      case 'LOW': return { color: theme.palette.success.main, bg: alpha(theme.palette.success.main, 0.06) };
      default: return { color: theme.palette.text.primary, bg: 'transparent' };
    }
  };

  const [loading, setLoading] = useState(true);
  const [notices, setNotices] = useState<NoticeResponse[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  // Pagination state (client-side pagination over filtered results)
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(6);

  const [editing, setEditing] = useState<null | NoticeResponse>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [audienceOpenFor, setAudienceOpenFor] = useState<null | NoticeResponse>(null);
  const [audiences, setAudiences] = useState<AudienceResponse[]>([]);
  const [addingAudience, setAddingAudience] = useState(false);
  const [newAudienceType, setNewAudienceType] = useState<AudienceRequest['type']>('ALL');
  const [newAudienceValue, setNewAudienceValue] = useState<string>('');

  const [form, setForm] = useState<NoticeRequest>({ noticeNumber: '', title: '', priority: 'NORMAL', category: 'GENERAL', content: '', publishAt: null, expiresAt: null });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.listNotices(0, 100);
      setNotices(res.items ?? []);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load notices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setForm({ noticeNumber: generateNoticeNumber(), title: '', priority: 'NORMAL', category: 'GENERAL', content: '', publishAt: null, expiresAt: null });
    setFormErrors({});
    setEditing(null);
    setCreateOpen(true);
  };

  const openEdit = (notice: NoticeResponse) => {
    setEditing(notice);
    setForm({ noticeNumber: notice.noticeNumber, title: notice.title ?? '', priority: notice.priority, category: notice.category, content: notice.content, publishAt: notice.publishAt ?? null, expiresAt: notice.expiresAt ?? null });
    setFormErrors({});
    setCreateOpen(true);
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.noticeNumber || form.noticeNumber.trim() === '') errors.noticeNumber = 'Notice number is required';
    else if (form.noticeNumber.length > 80) errors.noticeNumber = 'Must be at most 80 characters';

    if (!form.title || form.title.trim() === '') errors.title = 'Title is required';
    else if (form.title.length > 250) errors.title = 'Must be at most 250 characters';

    if (!form.content || form.content.trim() === '') errors.content = 'Content is required';

    if (!form.category) errors.category = 'Category is required';

    if (!form.priority) errors.priority = 'Priority is required';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const toIso = (localDateTime: string | null | undefined): string | null => {
    if (!localDateTime) return null;
    const d = new Date(localDateTime);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString();
  };

  const saveNotice = async () => {
    if (!validate()) return;
    setSaving(true);
    setError(null);
    try {
      // Map UI values to backend enum names
      const mappedCategory = form.category ? String(form.category).toUpperCase() : form.category;

      // UI now uses backend priority names directly (URGENT, HIGH, NORMAL, LOW)
      const mappedPriority = form.priority;

      // Construct payload for backend. Use a loose type here to avoid mismatch between UI types and backend enums.
      const backendPayload = {
        noticeNumber: form.noticeNumber.trim(),
        title: form.title.trim(),
        content: form.content.trim(),
        category: mappedCategory,
        priority: mappedPriority,
        publishAt: toIso(form.publishAt as unknown as string) ?? null,
        expiresAt: toIso(form.expiresAt as unknown as string) ?? null,
      } as any;

      if (editing) {
        await api.replaceNotice(editing.id, backendPayload);
      } else {
        await api.createNotice(backendPayload);
      }
      setCreateOpen(false);
      await load();
    } catch (err: any) {
      setError(err?.message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async (id: string) => {
    setError(null);
    try {
      await api.publishNotice(id);
      load();
    } catch (err: any) {
      setError(err?.message ?? 'Publish failed');
    }
  };

  const handleDelete = async (id: string) => {
    setError(null);
    try {
      await api.deleteNotice(id);
      load();
    } catch (err: any) {
      setError(err?.message ?? 'Delete failed');
    }
  };

  const openAudiences = async (notice: NoticeResponse) => {
    setAudienceOpenFor(notice);
    setAudiences([]);
    try {
      const items = await api.listNoticeAudiences(notice.id);
      setAudiences(items ?? []);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load audiences');
    }
  };

  const addAudience = async () => {
    if (!audienceOpenFor) return;
    setAddingAudience(true);
    setError(null);
    try {
      await api.addNoticeAudience(audienceOpenFor.id, { type: newAudienceType, value: newAudienceValue || undefined });
      const items = await api.listNoticeAudiences(audienceOpenFor.id);
      setAudiences(items ?? []);
      setNewAudienceValue('');
      setNewAudienceType('ALL');
    } catch (err: any) {
      setError(err?.message ?? 'Failed to add audience');
    } finally {
      setAddingAudience(false);
    }
  };

  const removeAudience = async (id: string) => {
    if (!audienceOpenFor) return;
    setError(null);
    try {
      await api.deleteNoticeAudience(audienceOpenFor.id, id);
      const items = await api.listNoticeAudiences(audienceOpenFor.id);
      setAudiences(items ?? []);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to remove audience');
    }
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h4">Notices</Typography>
        <Button variant="contained" color="primary" onClick={openCreate}>
          Create notice
        </Button>
      </Stack>

      {loading ? (
        <CircularProgress />
      ) : error ? (
        <Typography color="error">{error}</Typography>
      ) : (
        <Box>
          <Card variant="outlined" sx={{ mb: 2, borderRadius: 2 }}>
            <CardContent>
              <Grid container alignItems="center">
                <Grid item xs={8}>
                  <Typography variant="h5">Society Notices</Typography>
                  <Typography variant="body2" color="text.secondary">Announcements and important community updates</Typography>
                </Grid>
                <Grid item xs={4} sx={{ textAlign: 'right' }}>
                  <Button startIcon={<AddIcon />} variant="contained" onClick={openCreate}>New Notice</Button>
                </Grid>

                <Grid item xs={12} sx={{ mt: 2 }}>
                  <Grid container spacing={2}>
                    <Grid item>
                      <Box>
                        <Typography variant="h6">{notices.length}</Typography>
                        <Typography variant="caption" color="text.secondary">Total notices</Typography>
                      </Box>
                    </Grid>
                    <Grid item>
                      <Box>
                        <Typography variant="h6">{notices.filter(n => ['URGENT','HIGH'].includes(n.priority ?? '')).length}</Typography>
                        <Typography variant="caption" color="text.secondary">Important</Typography>
                      </Box>
                    </Grid>
                    <Grid item>
                      <Box>
                        <Typography variant="h6">{notices.filter(n => n.publishAt && new Date(n.publishAt).getMonth() === new Date().getMonth()).length}</Typography>
                        <Typography variant="caption" color="text.secondary">This month</Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </Grid>

                <Grid item xs={12} sx={{ mt: 2 }}>
                  <TextField
                    fullWidth
                    placeholder="Search notices by title or content..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
                  />
                </Grid>

                <Grid item xs={8} sx={{ mt: 2 }}>
                  <Select fullWidth value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value as string)}>
                    <MenuItem value="ALL">All categories</MenuItem>
                    {CATEGORY_OPTIONS.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                  </Select>
                </Grid>
                <Grid item xs={4} sx={{ mt: 2 }}>
                  <Button startIcon={<RefreshIcon />} onClick={() => { setSearchQuery(''); setCategoryFilter('ALL'); setPage(1); }}>Reset</Button>
                </Grid>

              </Grid>
            </CardContent>
          </Card>

          <Stack spacing={2}>
            {(() => {
              const filtered = notices.filter(n => {
                if (categoryFilter !== 'ALL' && n.category !== categoryFilter) return false;
                if (!searchQuery) return true;
                const q = searchQuery.toLowerCase();
                return (n.title ?? '').toLowerCase().includes(q) || (n.content ?? '').toLowerCase().includes(q);
              });

              const total = filtered.length;
              const totalPages = Math.max(1, Math.ceil(total / pageSize));
              // ensure current page is in range
              const currentPage = Math.min(page, totalPages);
              const startIdx = (currentPage - 1) * pageSize;
              const endIdx = startIdx + pageSize;
              const pageItems = filtered.slice(startIdx, endIdx);

              return (
                <>
                  {pageItems.map((notice) => (
                    <Card key={notice.id} variant="outlined" sx={{ borderRadius: 2 }}>
                      <CardContent>
                        <Grid container spacing={1} alignItems="center">
                          <Grid item>
                            <Campaign />
                          </Grid>
                          <Grid item xs>
                            <Box display="flex" alignItems="center" justifyContent="space-between">
                              <Box>
                                <Typography variant="h6" sx={{ fontWeight: 700 }}>{notice.title}</Typography>
                                {(['URGENT','HIGH'].includes(notice.priority ?? '')) && <Chip label="Important" size="small" color="warning" sx={{ ml: 1 }} />}
                              </Box>
                            </Box>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{notice.content}</Typography>
                            <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 2 }}>
                              <Stack direction="row" spacing={1} alignItems="center">
                                <CalendarToday fontSize="small" />
                                <Typography variant="caption">{notice.publishAt ? new Date(notice.publishAt).toLocaleDateString() : ''}</Typography>
                              </Stack>
                              <Typography variant="caption" color="text.secondary">Published by Society Management</Typography>
                            </Stack>
                          </Grid>
                          <Grid item xs={12} sx={{ textAlign: 'left', mt: 1 }}>
                            <Link href="#" underline="hover">Read notice →</Link>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  ))}

                  {/* Pagination controls */}
                  <Box display="flex" alignItems="center" justifyContent="space-between" sx={{ mt: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      {total === 0 ? 'No items' : `${startIdx + 1}–${Math.min(endIdx, total)} of ${total}`}
                    </Typography>
                    <Box display="flex" alignItems="center" gap={2}>
                      <Button variant="outlined" size="small" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={currentPage <= 1}>Prev</Button>
                      <Typography variant="body2">{currentPage} / {totalPages}</Typography>
                      <Button variant="outlined" size="small" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}>Next</Button>

                      <FormControl size="small">
                        <Select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}>
                          <MenuItem value={6}>6</MenuItem>
                          <MenuItem value={10}>10</MenuItem>
                          <MenuItem value={20}>20</MenuItem>
                        </Select>
                      </FormControl>
                    </Box>
                  </Box>
                </>
              );
            })()}
          </Stack>
        </Box>
      )}
      {/* Create / Edit dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editing ? 'Edit notice' : 'Create notice'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField
              label="Notice number"
              value={form.noticeNumber}
              onChange={(e) => setForm((s) => ({ ...s, noticeNumber: e.target.value }))}
              fullWidth
              disabled={!!editing}
              error={!!formErrors.noticeNumber}
              helperText={formErrors.noticeNumber}
            />
            <TextField
              label="Title"
              value={form.title}
              onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))}
              fullWidth
              error={!!formErrors.title}
              helperText={formErrors.title}
            />
            <FormControl error={!!formErrors.priority}>
              <InputLabel id="priority-label">Priority</InputLabel>
              <Select
                labelId="priority-label"
                value={form.priority}
                label="Priority"
                onChange={(e) => setForm((s) => ({ ...s, priority: e.target.value as any }))}
                sx={{ minWidth: 160 }}
              >
                  <MenuItem value="URGENT">Urgent</MenuItem>
                  <MenuItem value="HIGH">High</MenuItem>
                  <MenuItem value="NORMAL">Normal</MenuItem>
                  <MenuItem value="LOW">Low</MenuItem>
                </Select>
              {formErrors.priority && <FormHelperText>{formErrors.priority}</FormHelperText>}
            </FormControl>

            <FormControl error={!!formErrors.category} fullWidth>
              <InputLabel id="category-label">Category</InputLabel>
              <Select
                labelId="category-label"
                value={form.category}
                label="Category"
                onChange={(e) => setForm((s) => ({ ...s, category: e.target.value as string }))}
              >
                {CATEGORY_OPTIONS.map((c) => (
                  <MenuItem key={c} value={c}>
                    {c}
                  </MenuItem>
                ))}
              </Select>
              {formErrors.category && <FormHelperText>{formErrors.category}</FormHelperText>}
            </FormControl>

            <TextField
              label="Content"
              value={form.content}
              onChange={(e) => setForm((s) => ({ ...s, content: e.target.value }))}
              fullWidth
              multiline
              minRows={4}
              error={!!formErrors.content}
              helperText={formErrors.content}
            />

            <TextField
              label="Publish At"
              type="datetime-local"
              value={form.publishAt ?? ''}
              onChange={(e) => setForm((s) => ({ ...s, publishAt: e.target.value || null }))}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Expires At"
              type="datetime-local"
              value={form.expiresAt ?? ''}
              onChange={(e) => setForm((s) => ({ ...s, expiresAt: e.target.value || null }))}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={saveNotice} variant="contained" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Audiences dialog */}
      <Dialog open={!!audienceOpenFor} onClose={() => setAudienceOpenFor(null)} fullWidth maxWidth="sm">
        <DialogTitle>Manage audiences for notice</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <Typography variant="subtitle1">Existing audiences</Typography>
            <Stack spacing={1}>
              {audiences.map((a) => (
                <Box key={a.id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1, borderRadius: 1, bgcolor: 'background.paper' }}>
                  <Typography>{`${a.type}${a.value ? `: ${a.value}` : ''}`}</Typography>
                  <IconButton edge="end" onClick={() => removeAudience(a.id)} size="small"><Delete /></IconButton>
                </Box>
              ))}
            </Stack>

            <Typography variant="subtitle1">Add audience</Typography>
            <Stack direction="row" spacing={2} alignItems="center">
              <FormControl sx={{ minWidth: 160 }}>
                <InputLabel id="aud-type-label">Type</InputLabel>
                <Select
                  labelId="aud-type-label"
                  value={newAudienceType}
                  label="Type"
                  onChange={(e) => setNewAudienceType(e.target.value as any)}
                >
                  <MenuItem value="ALL">All</MenuItem>
                  <MenuItem value="BLOCK">Block</MenuItem>
                  <MenuItem value="UNIT">Unit</MenuItem>
                  <MenuItem value="ROLE">Role</MenuItem>
                  <MenuItem value="CUSTOM">Custom</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label="Value (optional)"
                value={newAudienceValue}
                onChange={(e) => setNewAudienceValue(e.target.value)}
                placeholder="block id, unit id, role name, or custom group id"
                fullWidth
              />
              <Button variant="contained" onClick={addAudience} disabled={addingAudience}>
                Add
              </Button>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAudienceOpenFor(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
