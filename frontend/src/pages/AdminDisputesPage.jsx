import { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

function AdminDisputesPage() {
  const [data, setData] = useState({ items: [], next_cursor: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [resolveId, setResolveId] = useState(null);
  const [resolution, setResolution] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await adminAPI.getDisputes({ limit: 50 });
      setData({ items: res.items || [], next_cursor: res.next_cursor });
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || 'Failed to load disputes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openResolve = (d) => {
    setResolveId(d.id);
    setResolution('');
    setRefundAmount('');
  };

  const submitResolve = async () => {
    if (!resolveId || !resolution.trim()) return;
    try {
      setActionLoading(resolveId);
      const amt = refundAmount.trim() ? parseFloat(refundAmount) : undefined;
      await adminAPI.resolveDispute(resolveId, resolution.trim(), amt);
      setResolveId(null);
      await load();
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || 'Failed to resolve dispute');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading && !data.items.length) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600" />
      </div>
    );
  }

  if (error && !data.items.length) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive">
        {error}
      </div>
    );
  }

  const items = data.items || [];
  const resolvable = ['open', 'investigating'];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Disputes</h1>
        <p className="text-slate-600 mt-1">All platform disputes. Resolve open/investigating disputes (US-A-010–012).</p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive text-sm">
          {error}
        </div>
      )}

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle>Disputes ({items.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-slate-500">No disputes yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-slate-600">
                    <th className="pb-2 pr-4">ID</th>
                    <th className="pb-2 pr-4">Booking</th>
                    <th className="pb-2 pr-4">Status</th>
                    <th className="pb-2 pr-4">Created</th>
                    <th className="pb-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((d) => {
                    const canResolve = resolvable.includes(d.status);
                    return (
                      <tr key={d.id} className="border-b last:border-0">
                        <td className="py-2 pr-4 font-mono text-xs">{d.id?.slice(0, 8)}…</td>
                        <td className="py-2 pr-4 font-mono text-xs">{d.booking_id?.slice(0, 8)}…</td>
                        <td className="py-2 pr-4">{d.status}</td>
                        <td className="py-2 pr-4">{d.created_at ? new Date(d.created_at).toLocaleDateString() : '—'}</td>
                        <td className="py-2">
                          {canResolve && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openResolve(d)}
                                disabled={!!actionLoading}
                              >
                                Resolve
                              </Button>
                              <Dialog open={resolveId === d.id} onOpenChange={(open) => !open && setResolveId(null)}>
                                <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Resolve dispute</DialogTitle>
                                  <DialogDescription>Set resolution and optional refund amount.</DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                  <div className="grid gap-2">
                                    <Label>Resolution</Label>
                                    <Textarea
                                      value={resolution}
                                      onChange={(e) => setResolution(e.target.value)}
                                      placeholder="Describe the resolution and outcome."
                                      rows={4}
                                    />
                                  </div>
                                  <div className="grid gap-2">
                                    <Label>Refund amount (optional)</Label>
                                    <Input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={refundAmount}
                                      onChange={(e) => setRefundAmount(e.target.value)}
                                      placeholder="0"
                                    />
                                  </div>
                                </div>
                                <DialogFooter>
                                  <Button variant="outline" onClick={() => setResolveId(null)}>Cancel</Button>
                                  <Button onClick={submitResolve} disabled={!resolution.trim() || actionLoading === d.id}>
                                    {actionLoading === d.id ? '…' : 'Resolve'}
                                  </Button>
                                </DialogFooter>
                                </DialogContent>
                              </Dialog>
                            </>
                          )}
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
    </div>
  );
}

export default AdminDisputesPage;
