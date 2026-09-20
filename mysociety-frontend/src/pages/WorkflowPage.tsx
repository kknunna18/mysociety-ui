import { useState } from 'react';
import { Add, Download, FilterList, Search } from '@mui/icons-material';
import { Alert, Box, Button, Card, CardContent, Dialog, DialogActions, DialogContent, DialogTitle, Grid, InputAdornment, Stack, TextField, Typography } from '@mui/material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';

interface WorkflowPageProps { title: string; description: string; columns?: GridColDef[]; rows?: Array<Record<string, string | number>>; allowCreate?: boolean; }
const emptyColumns: GridColDef[] = [{ field: 'name', headerName: 'Name', flex: 1 }, { field: 'status', headerName: 'Status', width: 140 }];
export function WorkflowPage({ title, description, columns = emptyColumns, rows = [], allowCreate = true }: WorkflowPageProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const filtered = rows.filter((row) => Object.values(row).some((value) => String(value).toLowerCase().includes(query.toLowerCase())));
  return <Stack spacing={3}>
    <Box><Typography variant="h4">{title}</Typography><Typography color="text.secondary">{description}</Typography></Box>
    <Card><CardContent><Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="space-between">
      <TextField size="small" placeholder={`Search ${title.toLowerCase()}`} value={query} onChange={(event) => setQuery(event.target.value)} InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }} />
      <Stack direction="row" spacing={1}><Button startIcon={<FilterList />} variant="outlined">Filters</Button><Button startIcon={<Download />} variant="outlined">Export</Button>{allowCreate && <Button startIcon={<Add />} variant="contained" onClick={() => setOpen(true)}>Add {title.replace(/s$/, '')}</Button>}</Stack>
    </Stack></CardContent></Card>
    {rows.length ? <Card><Box sx={{ width: '100%', overflowX: 'auto' }}><DataGrid autoHeight rows={filtered} columns={columns} disableRowSelectionOnClick pageSizeOptions={[5, 10, 25]} initialState={{ pagination: { paginationModel: { pageSize: 5, page: 0 } } }} /></Box></Card> :
      <Card><CardContent sx={{ textAlign: 'center', py: 7 }}><Typography variant="h6">No {title.toLowerCase()} yet</Typography><Typography color="text.secondary" sx={{ mb: 2 }}>Create a record or adjust your filters to get started.</Typography>{allowCreate && <Button variant="contained" onClick={() => setOpen(true)}>Create {title.replace(/s$/, '')}</Button>}</CardContent></Card>}
    <Alert severity="info">Actions are validated by the API using your active society and permissions.</Alert>
    <Dialog open={open} onClose={() => setOpen(false)} fullScreen={false} fullWidth maxWidth="sm"><DialogTitle>Add {title.replace(/s$/, '')}</DialogTitle><DialogContent><Grid container spacing={2} sx={{ pt: 1 }}><Grid item xs={12}><TextField autoFocus fullWidth label="Name" /></Grid><Grid item xs={12}><TextField fullWidth label="Description" multiline minRows={3} /></Grid></Grid></DialogContent><DialogActions><Button onClick={() => setOpen(false)}>Cancel</Button><Button variant="contained" onClick={() => setOpen(false)}>Save</Button></DialogActions></Dialog>
  </Stack>;
}
