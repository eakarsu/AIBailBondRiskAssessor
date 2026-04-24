import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import api from '../services/api';

const ACTION_COLORS = {
  CREATE: '#34d399',
  UPDATE: '#fbbf24',
  DELETE: '#f87171',
};

export default function AuditLogPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit] = useState(25);

  // Filters
  const [filterAction, setFilterAction] = useState('');
  const [filterEntity, setFilterEntity] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit };
      if (filterAction) params.filter_action = filterAction;
      if (filterEntity) params.filter_entity_type = filterEntity;
      if (filterUser) params.filter_user_id = filterUser;
      if (filterDateFrom) params.filter_date_from = filterDateFrom;
      if (filterDateTo) params.filter_date_to = filterDateTo;
      const res = await api.get('/audit-log', { params });
      const data = res.data.data || res.data;
      setLogs(Array.isArray(data) ? data : []);
      setTotalPages(res.data.totalPages || 1);
      setTotal(res.data.total || (Array.isArray(data) ? data.length : 0));
    } catch {
      toast.error('Failed to load audit logs');
    }
    setLoading(false);
  }, [page, limit, filterAction, filterEntity, filterUser, filterDateFrom, filterDateTo]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const handleFilter = () => {
    setPage(1);
    fetchLogs();
  };

  const clearFilters = () => {
    setFilterAction('');
    setFilterEntity('');
    setFilterUser('');
    setFilterDateFrom('');
    setFilterDateTo('');
    setPage(1);
  };

  const formatChanges = (changes) => {
    if (!changes) return '--';
    if (typeof changes === 'string') {
      try { changes = JSON.parse(changes); } catch { return changes; }
    }
    if (typeof changes === 'object') {
      return Object.entries(changes).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join(', ');
    }
    return String(changes);
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title-section">
          <span className="page-icon">&#128220;</span>
          <h1 className="page-title">Audit Log</h1>
        </div>
        <div className="page-actions">
          <span style={{ fontSize: 13, color: '#64748b' }}>{total} entries</span>
        </div>
      </div>

      <div className="audit-filters">
        <div className="audit-filter-row">
          <div className="audit-filter-group">
            <label className="form-label">Action</label>
            <select className="form-select" value={filterAction} onChange={(e) => setFilterAction(e.target.value)}>
              <option value="">All Actions</option>
              <option value="CREATE">Create</option>
              <option value="UPDATE">Update</option>
              <option value="DELETE">Delete</option>
            </select>
          </div>
          <div className="audit-filter-group">
            <label className="form-label">Entity Type</label>
            <input className="form-input" type="text" value={filterEntity} onChange={(e) => setFilterEntity(e.target.value)} placeholder="e.g. defendants" />
          </div>
          <div className="audit-filter-group">
            <label className="form-label">User ID</label>
            <input className="form-input" type="text" value={filterUser} onChange={(e) => setFilterUser(e.target.value)} placeholder="User ID" />
          </div>
          <div className="audit-filter-group">
            <label className="form-label">Date From</label>
            <input className="form-input" type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} />
          </div>
          <div className="audit-filter-group">
            <label className="form-label">Date To</label>
            <input className="form-input" type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} />
          </div>
          <div className="audit-filter-actions">
            <button className="btn-secondary" onClick={handleFilter}>Apply</button>
            <button className="btn-secondary" onClick={clearFilters}>Clear</button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading"><div className="spinner" />Loading...</div>
      ) : logs.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">&#128220;</div>
          <div className="empty-state-text">No audit log entries found</div>
        </div>
      ) : (
        <>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>User</th>
                  <th>Action</th>
                  <th>Entity Type</th>
                  <th>Entity ID</th>
                  <th>Changes</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, i) => (
                  <tr key={log.id || i}>
                    <td>{log.created_at ? new Date(log.created_at).toLocaleString() : log.timestamp ? new Date(log.timestamp).toLocaleString() : '--'}</td>
                    <td>{log.user_name || log.user_id || '--'}</td>
                    <td>
                      <span
                        className="badge"
                        style={{
                          background: `${ACTION_COLORS[log.action] || '#64748b'}22`,
                          color: ACTION_COLORS[log.action] || '#64748b',
                        }}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td>{(log.entity_type || '').replace(/_/g, ' ')}</td>
                    <td>{log.entity_id || '--'}</td>
                    <td className="audit-changes-cell" title={formatChanges(log.changes)}>{formatChanges(log.changes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pagination">
            <div className="pagination-info">
              Showing {((page - 1) * limit) + 1}-{Math.min(page * limit, total)} of {total}
            </div>
            <div className="pagination-controls">
              <button className="btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                let pageNum;
                if (totalPages <= 7) {
                  pageNum = i + 1;
                } else if (page <= 4) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 3) {
                  pageNum = totalPages - 6 + i;
                } else {
                  pageNum = page - 3 + i;
                }
                return (
                  <button
                    key={pageNum}
                    className={`btn-secondary btn-sm ${page === pageNum ? 'pagination-active' : ''}`}
                    onClick={() => setPage(pageNum)}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button className="btn-secondary btn-sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
