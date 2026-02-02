import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { adminAPI } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

function AdminSupportTicketsPage() {
  const [data, setData] = useState({ items: [], next_cursor: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const params = { limit: 50 };
      if (statusFilter) params.status = statusFilter;
      if (userFilter) params.user_id = userFilter;
      const res = await adminAPI.getSupportTickets(params);
      setData({ items: res.items || [], next_cursor: res.next_cursor });
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || 'Failed to load support tickets');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, userFilter]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !data.items?.length) {
    return (
      <div className="flex justify-center items-center min-h-[40vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600" />
      </div>
    );
  }

  const items = data.items || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Support tickets</h1>
        <p className="text-slate-600 mt-1">
          US-A-026, US-A-028: View and filter support tickets. Open a ticket to see user context and full task/payment history.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive text-sm">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-sm text-slate-600">Filter:</span>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded border border-slate-300 px-2 py-1 text-sm"
        >
          <option value="">All statuses</option>
          <option value="open">Open</option>
          <option value="in_progress">In progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
        <input
          type="text"
          placeholder="User ID (optional)"
          value={userFilter}
          onChange={(e) => setUserFilter(e.target.value)}
          className="rounded border border-slate-300 px-2 py-1 text-sm w-64"
        />
        <Button variant="outline" size="sm" onClick={load}>Refresh</Button>
      </div>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle>Tickets ({items.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-slate-500">No support tickets yet. Create one from a user detail page or via API.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-slate-600">
                    <th className="pb-2 pr-4">Subject</th>
                    <th className="pb-2 pr-4">User</th>
                    <th className="pb-2 pr-4">Status</th>
                    <th className="pb-2 pr-4">Priority</th>
                    <th className="pb-2 pr-4">Created</th>
                    <th className="pb-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((t) => (
                    <tr key={t.id} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-medium">{t.subject}</td>
                      <td className="py-2 pr-4">
                        {t.user_name || t.user_phone || t.user_id?.slice(0, 8)}
                        <span className="text-slate-400 ml-1">({t.user_role})</span>
                      </td>
                      <td className="py-2 pr-4">
                        <span className={`rounded px-1.5 py-0.5 text-xs ${
                          t.status === 'open' ? 'bg-amber-100 text-amber-800' :
                          t.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                          t.status === 'resolved' ? 'bg-emerald-100 text-emerald-800' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="py-2 pr-4">{t.priority}</td>
                      <td className="py-2 pr-4">{t.created_at ? new Date(t.created_at).toLocaleString() : '—'}</td>
                      <td className="py-2">
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={`/admin/support-tickets/${t.id}`}>View</Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default AdminSupportTicketsPage;
