import { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '../services/api';
import useAuthStore from '../store/authStore';
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

function AdminPendingTaskersPage() {
  const { user: currentUser } = useAuthStore();
  const isAdminOnly = currentUser?.role === 'admin';

  const [data, setData] = useState({ items: [], next_cursor: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [detailUserId, setDetailUserId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [rejectUserId, setRejectUserId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectSubmitting, setRejectSubmitting] = useState(false);

  const loadPending = useCallback(async (cursor = null) => {
    try {
      setLoading(true);
      setError('');
      const res = await adminAPI.getPendingTaskers({ limit: 50, cursor: cursor || undefined });
      setData({ items: res.items || [], next_cursor: res.next_cursor });
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || 'Failed to load pending taskers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPending();
  }, [loadPending]);

  const loadDetail = useCallback(async (userId) => {
    if (!userId) return;
    try {
      setDetailLoading(true);
      const res = await adminAPI.getTaskerDetail(userId);
      setDetail(res);
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || 'Failed to load tasker detail');
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    if (detailUserId) loadDetail(detailUserId);
    else setDetail(null);
  }, [detailUserId, loadDetail]);

  const handleVerify = async (userId) => {
    if (!isAdminOnly) return;
    try {
      setActionLoading(userId);
      await adminAPI.verifyTasker(userId);
      setDetailUserId(null);
      setDetail(null);
      await loadPending();
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || 'Failed to verify tasker');
    } finally {
      setActionLoading(null);
    }
  };

  const openReject = (userId) => {
    setRejectUserId(userId);
    setRejectReason('');
  };

  const handleRejectSubmit = async () => {
    if (!rejectUserId || !rejectReason.trim() || !isAdminOnly) return;
    try {
      setRejectSubmitting(true);
      await adminAPI.rejectTasker(rejectUserId, rejectReason.trim());
      setRejectUserId(null);
      setRejectReason('');
      setDetailUserId(null);
      setDetail(null);
      await loadPending();
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || 'Failed to reject tasker');
    } finally {
      setRejectSubmitting(false);
    }
  };

  const items = data.items || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Pending tasker verification</h1>
        <p className="text-slate-600 mt-1">
          Taskers with status &quot;applied&quot; awaiting admin review. {isAdminOnly ? 'You can verify or reject applications.' : 'Verify/reject requires platform admin role.'}
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-destructive text-sm">
          {error}
        </div>
      )}

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle>Pending ({items.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-slate-500">No taskers pending verification.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-slate-600">
                    <th className="pb-2 pr-4">Name</th>
                    <th className="pb-2 pr-4">Phone / Email</th>
                    <th className="pb-2 pr-4">Applied</th>
                    <th className="pb-2 pr-4">ID last 4</th>
                    {isAdminOnly && <th className="pb-2">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {items.map((row) => (
                    <tr key={row.user_id} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-medium">{row.full_name || '—'}</td>
                      <td className="py-2 pr-4">{row.phone || row.email || '—'}</td>
                      <td className="py-2 pr-4">{row.created_at ? new Date(row.created_at).toLocaleDateString() : '—'}</td>
                      <td className="py-2 pr-4">{row.national_id_last4 ? `••••${row.national_id_last4}` : '—'}</td>
                      {isAdminOnly && (
                        <td className="py-2">
                          <div className="flex gap-1 flex-wrap">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setDetailUserId(row.user_id)}
                            >
                              View
                            </Button>
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => handleVerify(row.user_id)}
                              disabled={actionLoading === row.user_id}
                            >
                              {actionLoading === row.user_id ? '…' : 'Verify'}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-destructive border-destructive/50 hover:bg-destructive/10"
                              onClick={() => openReject(row.user_id)}
                            >
                              Reject
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail dialog */}
      <Dialog open={!!detailUserId} onOpenChange={(open) => !open && setDetailUserId(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tasker detail</DialogTitle>
            <DialogDescription>Review profile before verify/reject.</DialogDescription>
          </DialogHeader>
          {detailLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
            </div>
          ) : detail ? (
            <div className="space-y-3 text-sm">
              <p><strong>Name:</strong> {detail.full_name || '—'}</p>
              <p><strong>Phone:</strong> {detail.phone || '—'}</p>
              <p><strong>Email:</strong> {detail.email || '—'}</p>
              <p><strong>Bio:</strong> {detail.bio || '—'}</p>
              <p><strong>National ID last 4:</strong> {detail.national_id_last4 ? `••••${detail.national_id_last4}` : '—'}</p>
              <p><strong>Phone verified:</strong> {detail.phone_verified ? 'Yes' : 'No'}</p>
              <p><strong>Categories:</strong> {detail.categories?.length ? detail.categories.join(', ') : '—'}</p>
              <p><strong>Skills:</strong> {detail.skills?.length ? detail.skills.join(', ') : '—'}</p>
              {detail.service_area && (
                <p><strong>Service area:</strong> {detail.service_area.radius_km} km around ({detail.service_area.center?.lat}, {detail.service_area.center?.lng})</p>
              )}
              <p><strong>Applied at:</strong> {detail.created_at ? new Date(detail.created_at).toLocaleString() : '—'}</p>
              {isAdminOnly && (
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => handleVerify(detail.user_id)}
                    disabled={actionLoading === detail.user_id}
                  >
                    {actionLoading === detail.user_id ? '…' : 'Verify'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive"
                    onClick={() => {
                      setDetailUserId(null);
                      openReject(detail.user_id);
                    }}
                  >
                    Reject
                  </Button>
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={!!rejectUserId} onOpenChange={(open) => !open && setRejectUserId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject tasker application</DialogTitle>
            <DialogDescription>Provide a reason (required). The tasker will see this and can resubmit after addressing it.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="reject-reason">Reason</Label>
              <Input
                id="reject-reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Incomplete identity verification"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectUserId(null)}>Cancel</Button>
            <Button
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleRejectSubmit}
              disabled={!rejectReason.trim() || rejectSubmitting}
            >
              {rejectSubmitting ? '…' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AdminPendingTaskersPage;
