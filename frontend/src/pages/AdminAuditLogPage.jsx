import { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function AdminAuditLogPage() {
  const [data, setData] = useState({ items: [], next_cursor: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [targetTypeFilter, setTargetTypeFilter] = useState('');

  const load = useCallback(async (cursor, append = false) => {
    try {
      setLoading(true);
      setError('');
      const params = { limit: 30 };
      if (cursor) params.cursor = cursor;
      if (actionFilter) params.action = actionFilter;
      if (targetTypeFilter) params.target_type = targetTypeFilter;
      const res = await adminAPI.getAuditLog(params);
      const items = res.items || [];
      setData((prev) => ({
        items: append ? [...prev.items, ...items] : items,
        next_cursor: res.next_cursor,
      }));
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || 'Failed to load audit log');
    } finally {
      setLoading(false);
    }
  }, [actionFilter, targetTypeFilter]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !data.items.length) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Audit log</h1>
        <p className="text-slate-600 mt-1">Admin actions (who did what, when)</p>
      </div>

      <div className="flex flex-wrap gap-4 items-end">
        <div className="space-y-2">
          <Label htmlFor="action" className="text-xs text-slate-500">Action</Label>
          <Input
            id="action"
            placeholder="e.g. suspend_user"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="max-w-[180px]"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="target" className="text-xs text-slate-500">Target type</Label>
          <Input
            id="target"
            placeholder="e.g. user, task"
            value={targetTypeFilter}
            onChange={(e) => setTargetTypeFilter(e.target.value)}
            className="max-w-[120px]"
          />
        </div>
        <Button variant="outline" size="sm" onClick={() => load()}>
          Apply
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive">{error}</div>
      )}

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle>Log entries ({data.items.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {data.items.length === 0 ? (
            <p className="text-slate-500">No audit entries match the filters.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-slate-600">
                    <th className="pb-2 pr-4">Time</th>
                    <th className="pb-2 pr-4">Action</th>
                    <th className="pb-2 pr-4">Target</th>
                    <th className="pb-2 pr-4">Actor</th>
                    <th className="pb-2">Meta</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((row) => (
                    <tr key={row.id} className="border-b last:border-0">
                      <td className="py-2 pr-4 text-slate-600">
                        {row.created_at ? new Date(row.created_at).toLocaleString() : '—'}
                      </td>
                      <td className="py-2 pr-4 font-medium">{row.action || '—'}</td>
                      <td className="py-2 pr-4">
                        {row.target_type && row.target_id
                          ? `${row.target_type} ${String(row.target_id).slice(0, 8)}…`
                          : '—'}
                      </td>
                      <td className="py-2 pr-4">{row.actor_name || row.actor_phone || row.actor_user_id?.slice(0, 8) || '—'}</td>
                      <td className="py-2 text-slate-500">
                        {row.meta && typeof row.meta === 'object' && Object.keys(row.meta).length > 0
                          ? JSON.stringify(row.meta)
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {data.next_cursor && (
            <div className="mt-4">
              <Button variant="outline" size="sm" onClick={() => load(data.next_cursor, true)} disabled={loading}>
                {loading ? '…' : 'Load more'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default AdminAuditLogPage;
