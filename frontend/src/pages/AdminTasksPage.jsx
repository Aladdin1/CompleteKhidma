import { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

const UNFILLED_OPTS = [
  { value: '', label: 'All tasks' },
  { value: '15', label: 'Unfilled 15+ min' },
  { value: '30', label: 'Unfilled 30+ min' },
  { value: '60', label: 'Unfilled 60+ min' },
];

const cancelableStates = ['draft', 'posted', 'matching', 'offered', 'accepted', 'confirmed'];

function AdminTasksPage() {
  const [data, setData] = useState({ items: [], next_cursor: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [unfilledMinutes, setUnfilledMinutes] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [assignTaskId, setAssignTaskId] = useState(null);
  const [taskers, setTaskers] = useState([]);
  const [assignTaskerId, setAssignTaskerId] = useState('');
  const [assignReason, setAssignReason] = useState('');
  const [historyTaskId, setHistoryTaskId] = useState(null);
  const [historyTask, setHistoryTask] = useState(null);
  const [historyTimeline, setHistoryTimeline] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const params = { limit: 50 };
      if (unfilledMinutes) params.unfilled_minutes = unfilledMinutes;
      const res = await adminAPI.getTasks(params);
      setData({ items: res.items || [], next_cursor: res.next_cursor ?? null });
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.response?.data?.message || err.message || 'Failed to load tasks';
      const status = err.response?.status;
      setError(status === 403 ? 'Access denied. You must be logged in as admin or ops.' : status === 401 ? 'Session expired or not logged in.' : msg);
    } finally {
      setLoading(false);
    }
  }, [unfilledMinutes]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCancelOnBehalf = async (taskId) => {
    try {
      setActionLoading(taskId);
      await adminAPI.cancelTaskOnBehalf(taskId);
      await load();
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || 'Failed to cancel task');
    } finally {
      setActionLoading(null);
    }
  };

  const openAssign = async (taskId) => {
    setAssignTaskId(taskId);
    setAssignTaskerId('');
    setAssignReason('');
    try {
      const res = await adminAPI.getUsers({ role: 'tasker', limit: 100 });
      setTaskers(res.items || []);
    } catch {
      setTaskers([]);
    }
  };

  const submitAssign = async () => {
    if (!assignTaskId || !assignTaskerId) return;
    try {
      setActionLoading(assignTaskId);
      await adminAPI.assignTask(assignTaskId, assignTaskerId, assignReason || undefined);
      setAssignTaskId(null);
      await load();
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || 'Failed to assign task');
    } finally {
      setActionLoading(null);
    }
  };

  const openHistory = async (taskId) => {
    setHistoryTaskId(taskId);
    setHistoryTask(null);
    setHistoryTimeline([]);
    setHistoryLoading(true);
    try {
      const res = await adminAPI.getTaskHistory(taskId);
      setHistoryTask(res.task || null);
      setHistoryTimeline(res.timeline || []);
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || 'Failed to load task details');
      setHistoryTask(null);
      setHistoryTimeline([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  if (loading && !data.items.length) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-slate-900">Tasks</h1>
        <p className="text-slate-600">Loading tasks…</p>
        <div className="flex items-center justify-center min-h-[20vh]">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600" />
        </div>
      </div>
    );
  }

  if (error && !data.items.length) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-slate-900">Tasks</h1>
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive">
          <p className="font-medium">Could not load tasks</p>
          <p className="text-sm mt-1">{error}</p>
          <p className="text-sm mt-2 opacity-90">Check you are logged in as admin or ops, and that the backend is running (e.g. port 3000).</p>
          <button
            type="button"
            onClick={() => { setError(''); load(); }}
            className="mt-3 text-sm underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const items = data.items || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tasks</h1>
          <p className="text-slate-600 mt-1">All platform tasks. US-A-002: filter by unfilled minutes.</p>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="unfilled" className="text-sm text-slate-600">Unfilled</Label>
          <select
            id="unfilled"
            value={unfilledMinutes}
            onChange={(e) => setUnfilledMinutes(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          >
            {UNFILLED_OPTS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive text-sm">
          {error}
        </div>
      )}

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle>Tasks ({items.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-center">
              <p className="text-slate-700 font-medium">No tasks to show</p>
              <p className="text-slate-500 text-sm mt-1">
                {unfilledMinutes
                  ? 'No tasks are unfilled for this many minutes. Try "All tasks" or create tasks as a client.'
                  : 'Create a task from a client account to see it listed here. Make sure you are logged in as admin or ops.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-slate-600">
                    <th className="pb-2 pr-4">ID</th>
                    <th className="pb-2 pr-4">State</th>
                    <th className="pb-2 pr-4">Category</th>
                    <th className="pb-2 pr-4">Created</th>
                    <th className="pb-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((t) => {
                    const canCancel = cancelableStates.includes(t.state);
                    const canAssign = ['posted', 'matching'].includes(t.state);
                    return (
                      <tr key={t.id} className="border-b last:border-0">
                        <td className="py-2 pr-4 font-mono text-xs">{t.id?.slice(0, 8)}…</td>
                        <td className="py-2 pr-4">{t.state}</td>
                        <td className="py-2 pr-4">{t.category || t.category_id || '—'}</td>
                        <td className="py-2 pr-4">{t.created_at ? new Date(t.created_at).toLocaleDateString() : '—'}</td>
                        <td className="py-2">
                          <div className="flex flex-wrap gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openHistory(t.id)}
                              title="View task history"
                            >
                              History
                            </Button>
                            {canAssign && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openAssign(t.id)}
                                  disabled={!!actionLoading}
                                >
                                  Assign
                                </Button>
                                <Dialog open={assignTaskId === t.id} onOpenChange={(open) => !open && setAssignTaskId(null)}>
                                  <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Assign tasker to task</DialogTitle>
                                    <DialogDescription>Choose a tasker and optional reason.</DialogDescription>
                                  </DialogHeader>
                                  <div className="grid gap-4 py-4">
                                    <div className="grid gap-2">
                                      <Label>Tasker</Label>
                                      <select
                                        value={assignTaskerId}
                                        onChange={(e) => setAssignTaskerId(e.target.value)}
                                        className="rounded-md border border-slate-300 px-3 py-2 w-full"
                                      >
                                        <option value="">Select tasker</option>
                                        {taskers.map((u) => (
                                          <option key={u.id} value={u.id}>
                                            {u.full_name || u.phone || u.id?.slice(0, 8)}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                    <div className="grid gap-2">
                                      <Label>Reason (optional)</Label>
                                      <Input
                                        value={assignReason}
                                        onChange={(e) => setAssignReason(e.target.value)}
                                        placeholder="e.g. Manual assignment"
                                      />
                                    </div>
                                  </div>
                                  <DialogFooter>
                                    <Button onClick={() => setAssignTaskId(null)} variant="outline">Cancel</Button>
                                    <Button onClick={submitAssign} disabled={!assignTaskerId || actionLoading === t.id}>
                                      {actionLoading === t.id ? '…' : 'Assign'}
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                                </Dialog>
                              </>
                            )}
                            {canCancel && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-destructive border-destructive/50 hover:bg-destructive/10"
                                onClick={() => window.confirm('Cancel this task on behalf of client?') && handleCancelOnBehalf(t.id)}
                                disabled={actionLoading === t.id}
                              >
                                {actionLoading === t.id ? '…' : 'Cancel'}
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!historyTaskId} onOpenChange={(open) => !open && setHistoryTaskId(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Task details & history</DialogTitle>
            <DialogDescription>
              Full task info and timeline for {historyTaskId?.slice(0, 8)}…
            </DialogDescription>
          </DialogHeader>
          {historyLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
            </div>
          ) : (
            <div className="overflow-y-auto flex-1 min-h-0 space-y-6 py-2">
              {historyTask && (
                <section>
                  <h3 className="text-sm font-semibold text-slate-700 mb-2">Task details</h3>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                    <div className="sm:col-span-2">
                      <dt className="text-slate-500">Description</dt>
                      <dd className="text-slate-900 mt-0.5">{historyTask.description || '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">State</dt>
                      <dd className="font-medium text-slate-900">{historyTask.state}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Category</dt>
                      <dd className="text-slate-900">{historyTask.category}{historyTask.subcategory ? ` / ${historyTask.subcategory}` : ''}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Client</dt>
                      <dd className="text-slate-900">{historyTask.client_name || historyTask.client_phone || historyTask.client_id?.slice(0, 8) || '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">City</dt>
                      <dd className="text-slate-900">{historyTask.city || '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Address</dt>
                      <dd className="text-slate-900">{historyTask.address || '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Starts at</dt>
                      <dd className="text-slate-900">{historyTask.starts_at ? new Date(historyTask.starts_at).toLocaleString() : '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Pricing</dt>
                      <dd className="text-slate-900">
                        {historyTask.est_min_amount != null || historyTask.est_max_amount != null
                          ? `${historyTask.est_min_amount ?? '?'}–${historyTask.est_max_amount ?? '?'} ${historyTask.currency || 'EGP'}`
                          : historyTask.pricing_model || '—'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Created</dt>
                      <dd className="text-slate-900">{historyTask.created_at ? new Date(historyTask.created_at).toLocaleString() : '—'}</dd>
                    </div>
                  </dl>
                </section>
              )}

              <section>
                <h3 className="text-sm font-semibold text-slate-700 mb-2">Timeline</h3>
                {(historyTimeline || []).length === 0 ? (
                  <p className="text-slate-500 text-sm">No events recorded.</p>
                ) : (
                  <ul className="space-y-3 text-sm">
                    {(historyTimeline || []).map((ev, idx) => (
                      <li
                        key={ev.id || idx}
                        className="flex flex-wrap gap-x-2 gap-y-0.5 items-baseline border-b border-slate-100 pb-2 last:border-0 last:pb-0"
                      >
                        <span className="text-slate-500 shrink-0">
                          {ev.created_at ? new Date(ev.created_at).toLocaleString() : '—'}
                        </span>
                        {ev.type === 'state_change' ? (
                          <>
                            <span>
                              <span className="font-medium text-slate-700">{ev.from_state ?? '—'}</span>
                              <span className="text-slate-400 mx-1">→</span>
                              <span className="font-medium text-slate-700">{ev.to_state}</span>
                            </span>
                            {ev.actor_name && (
                              <span className="text-slate-500">by {ev.actor_name}</span>
                            )}
                            {ev.reason && (
                              <span className="w-full text-slate-600 mt-0.5">“{ev.reason}”</span>
                            )}
                          </>
                        ) : (
                          <>
                            <span className="font-medium text-slate-700">Admin: {ev.action?.replace(/_/g, ' ') || ev.action}</span>
                            {ev.actor_name && (
                              <span className="text-slate-500">by {ev.actor_name}</span>
                            )}
                            {ev.meta && typeof ev.meta === 'object' && Object.keys(ev.meta).length > 0 && (
                              <span className="w-full text-slate-600 mt-0.5 text-xs">
                                {JSON.stringify(ev.meta)}
                              </span>
                            )}
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AdminTasksPage;
