import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { adminAPI } from '../services/api';
import useAuthStore from '../store/authStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

function AdminUsersPage() {
  const { user: currentUser } = useAuthStore();
  const isPlatformAdmin = currentUser?.role === 'admin';

  const [data, setData] = useState({ items: [], next_cursor: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await adminAPI.getUsers({ limit: 50 });
      setData({ items: res.items || [], next_cursor: res.next_cursor });
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive">
        {error}
      </div>
    );
  }

  const items = data.items || [];

  const handleSuspend = async (userId) => {
    if (!isPlatformAdmin) return;
    try {
      setActionLoading(userId);
      await adminAPI.suspendUser(userId);
      await loadUsers();
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || 'Failed to suspend user');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnsuspend = async (userId) => {
    if (!isPlatformAdmin) return;
    try {
      setActionLoading(userId);
      await adminAPI.unsuspendUser(userId);
      await loadUsers();
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || 'Failed to unsuspend user');
    } finally {
      setActionLoading(null);
    }
  };

  const handleBan = async (userId, reason) => {
    if (!isPlatformAdmin) return;
    const r = reason || window.prompt('Ban reason (optional):');
    if (r === null) return; // cancelled
    try {
      setActionLoading(userId);
      await adminAPI.banUser(userId, r);
      await loadUsers();
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || 'Failed to ban user');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Users</h1>
        <p className="text-slate-600 mt-1">
          All platform users. {isPlatformAdmin ? 'You can suspend, unsuspend, or ban users. Account status and behavior flags (reports, fraud score) shown.' : 'Suspend/unsuspend/ban requires platform admin role.'}
        </p>
      </div>
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle>Users ({items.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-slate-500">No users yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-slate-600">
                    <th className="pb-2 pr-4">Role</th>
                    <th className="pb-2 pr-4">Phone / Email</th>
                    <th className="pb-2 pr-4">Name</th>
                    <th className="pb-2 pr-4">Status</th>
                    <th className="pb-2 pr-4">Reports</th>
                    <th className="pb-2 pr-4">Fraud</th>
                    <th className="pb-2 pr-4">Created</th>
                    <th className="pb-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((u) => (
                    <tr key={u.id} className="border-b last:border-0">
                      <td className="py-2 pr-4">
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-700">
                          {u.role}
                        </span>
                      </td>
                      <td className="py-2 pr-4">{u.phone || u.email || '—'}</td>
                      <td className="py-2 pr-4">{u.full_name || '—'}</td>
                      <td className="py-2 pr-4">
                        <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                          u.account_status === 'banned' ? 'bg-red-100 text-red-800' :
                          u.account_status === 'suspended' ? 'bg-amber-100 text-amber-800' :
                          'bg-emerald-100 text-emerald-800'
                        }`}>
                          {u.account_status || 'active'}
                        </span>
                      </td>
                      <td className="py-2 pr-4">{u.report_count != null ? u.report_count : '—'}</td>
                      <td className="py-2 pr-4">{u.fraud_risk_score != null ? u.fraud_risk_score : '—'}</td>
                      <td className="py-2 pr-4">{u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}</td>
                      <td className="py-2">
                        <div className="flex flex-wrap gap-1">
                          <Button variant="ghost" size="sm" asChild>
                            <Link to={`/admin/users/${u.id}`}>View</Link>
                          </Button>
                          {isPlatformAdmin && (u.role !== 'admin' && u.role !== 'ops') && u.id !== currentUser?.id && (
                            <>
                              {u.account_status !== 'suspended' && u.account_status !== 'banned' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-destructive border-destructive/50 hover:bg-destructive/10"
                                  onClick={() => handleSuspend(u.id)}
                                  disabled={actionLoading === u.id}
                                >
                                  {actionLoading === u.id ? '…' : 'Suspend'}
                                </Button>
                              )}
                              {u.account_status === 'suspended' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleUnsuspend(u.id)}
                                  disabled={actionLoading === u.id}
                                >
                                  {actionLoading === u.id ? '…' : 'Unsuspend'}
                                </Button>
                              )}
                              {u.account_status !== 'banned' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-red-700 border-red-300 hover:bg-red-50"
                                  onClick={() => handleBan(u.id)}
                                  disabled={actionLoading === u.id}
                                >
                                  {actionLoading === u.id ? '…' : 'Ban'}
                                </Button>
                              )}
                            </>
                          )}
                        </div>
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

export default AdminUsersPage;
