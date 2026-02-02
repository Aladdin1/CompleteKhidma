import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { adminAPI } from '../services/api';
import useAuthStore from '../store/authStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, User, MapPin, ListTodo, BookOpen, Star, CreditCard, Clock, AlertTriangle, Flag, Headphones } from 'lucide-react';

function AdminUserDetailPage() {
  const { userId } = useParams();
  const { user: currentUser } = useAuthStore();
  const isPlatformAdmin = currentUser?.role === 'admin';
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [fraudScoreInput, setFraudScoreInput] = useState('');

  const loadUser = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await adminAPI.getUserDetail(userId);
      setData(res);
      setFraudScoreInput(res?.user?.fraud_risk_score != null ? String(res.user.fraud_risk_score) : '');
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.error?.message || err.message || 'Failed to load user';
      setError(status === 404 ? 'User not found. This user ID may not exist in the database.' : msg);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Link to="/admin/users" className="inline-flex items-center gap-2 text-teal-600 hover:text-teal-700">
          <ArrowLeft className="h-4 w-4" /> Back to Users
        </Link>
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive">
          {error}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <Link to="/admin/users" className="inline-flex items-center gap-2 text-teal-600 hover:text-teal-700">
          <ArrowLeft className="h-4 w-4" /> Back to Users
        </Link>
        <p className="text-slate-600">No data received. The user may not exist or the server returned an empty response.</p>
      </div>
    );
  }

  const { user, addresses, task_counts, booking_counts, reviews, payment_summary, tasker_profile, recent_activity, report_count, recent_reports } = data;
  if (!user) {
    return (
      <div className="space-y-4">
        <Link to="/admin/users" className="inline-flex items-center gap-2 text-teal-600 hover:text-teal-700">
          <ArrowLeft className="h-4 w-4" /> Back to Users
        </Link>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800">
          User not found or invalid response from server. The user ID may not exist.
        </div>
      </div>
    );
  }

  const accountStatus = user.account_status || 'active';
  const canManage = isPlatformAdmin && user.role !== 'admin' && user.role !== 'ops' && user.id !== currentUser?.id;

  const handleSuspend = async () => {
    try {
      setActionLoading(true);
      await adminAPI.suspendUser(userId);
      await loadUser();
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || 'Failed to suspend');
    } finally {
      setActionLoading(false);
    }
  };
  const handleUnsuspend = async () => {
    try {
      setActionLoading(true);
      await adminAPI.unsuspendUser(userId);
      await loadUser();
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || 'Failed to unsuspend');
    } finally {
      setActionLoading(false);
    }
  };
  const handleBan = async () => {
    const reason = window.prompt('Ban reason (optional):');
    if (reason === null) return;
    try {
      setActionLoading(true);
      await adminAPI.banUser(userId, reason);
      await loadUser();
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || 'Failed to ban');
    } finally {
      setActionLoading(false);
    }
  };
  const handleSetFraudScore = async (e) => {
    e.preventDefault();
    const v = fraudScoreInput.trim();
    const num = v === '' ? null : parseInt(v, 10);
    if (num !== null && (num < 0 || num > 100)) {
      setError('Fraud score must be 0–100 or empty');
      return;
    }
    try {
      setActionLoading(true);
      setError('');
      await adminAPI.setUserFraudScore(userId, num);
      await loadUser();
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || 'Failed to set fraud score');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateSupportTicket = async (e) => {
    e.preventDefault();
    const subject = window.prompt('Support ticket subject:');
    if (!subject?.trim()) return;
    try {
      setActionLoading(true);
      setError('');
      const created = await adminAPI.createSupportTicket(userId, subject.trim(), 'medium');
      if (created?.id) {
        window.location.href = `/admin/support-tickets/${created.id}`;
      } else {
        await loadUser();
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || 'Failed to create ticket');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-4">
        <Link to="/admin/users" className="inline-flex items-center gap-2 text-teal-600 hover:text-teal-700">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900">
            {user.full_name || user.phone || 'User Details'}
          </h1>
          <p className="text-slate-600 mt-1 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
              {user.role}
            </span>
            <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${
              accountStatus === 'banned' ? 'bg-red-100 text-red-800' :
              accountStatus === 'suspended' ? 'bg-amber-100 text-amber-800' :
              'bg-emerald-100 text-emerald-800'
            }`}>
              {accountStatus}
            </span>
            Member since {user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
            {canManage && (
              <span className="flex gap-1 ml-2">
                {accountStatus !== 'suspended' && accountStatus !== 'banned' && (
                  <Button variant="outline" size="sm" className="text-destructive border-destructive/50" onClick={handleSuspend} disabled={actionLoading}>
                    Suspend
                  </Button>
                )}
                {accountStatus === 'suspended' && (
                  <Button variant="outline" size="sm" onClick={handleUnsuspend} disabled={actionLoading}>
                    Unsuspend
                  </Button>
                )}
                {accountStatus !== 'banned' && (
                  <Button variant="outline" size="sm" className="text-red-700 border-red-300" onClick={handleBan} disabled={actionLoading}>
                    Ban
                  </Button>
                )}
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Tasks Created</CardTitle>
            <ListTodo className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{task_counts?.total || 0}</div>
            <p className="text-xs text-slate-500 mt-1">As client</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Bookings</CardTitle>
            <BookOpen className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {(booking_counts?.total_as_client || 0) + (booking_counts?.total_as_tasker || 0)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {booking_counts?.total_as_client || 0} as client, {booking_counts?.total_as_tasker || 0} as tasker
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Rating</CardTitle>
            <Star className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {reviews?.avg_rating != null ? reviews.avg_rating.toFixed(1) : '—'}
            </div>
            <p className="text-xs text-slate-500 mt-1">{reviews?.count || 0} reviews</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Spent</CardTitle>
            <CreditCard className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {((payment_summary?.total_spent || 0) / 100).toFixed(0)} {payment_summary?.currency || 'EGP'}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Earned: {((payment_summary?.total_earned || 0) / 100).toFixed(0)} {payment_summary?.currency || 'EGP'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* US-A-007: Behavior flags */}
      <Card className="border-slate-200 border-l-4 border-l-amber-400">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-800">
            <Flag className="h-5 w-5" /> Behavior flags
          </CardTitle>
          <CardDescription>Report count and fraud risk score for moderation</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-slate-500">Reports against this user</p>
              <p className="text-2xl font-bold text-slate-900">{report_count ?? 0}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Fraud risk score (0–100)</p>
              <p className="text-2xl font-bold text-slate-900">{user.fraud_risk_score != null ? user.fraud_risk_score : '—'}</p>
            </div>
          </div>
          {isPlatformAdmin && (
            <form onSubmit={handleSetFraudScore} className="flex flex-wrap items-end gap-2">
              <div>
                <Label htmlFor="fraud-score" className="text-xs">Set fraud score (0–100 or clear)</Label>
                <Input
                  id="fraud-score"
                  type="number"
                  min={0}
                  max={100}
                  placeholder="—"
                  value={fraudScoreInput}
                  onChange={(e) => setFraudScoreInput(e.target.value)}
                  className="w-24 mt-1"
                />
              </div>
              <Button type="submit" size="sm" disabled={actionLoading}>
                {actionLoading ? '…' : 'Update'}
              </Button>
            </form>
          )}
          <div className="pt-2 border-t border-slate-100">
            <Button variant="outline" size="sm" className="gap-1" onClick={handleCreateSupportTicket} disabled={actionLoading}>
              <Headphones className="h-4 w-4" /> Create support ticket for this user
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Profile Info */}
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" /> Profile Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div>
                <dt className="text-slate-500">Full Name</dt>
                <dd className="font-medium text-slate-900">{user.full_name || '—'}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Phone</dt>
                <dd className="font-medium text-slate-900">{user.phone || '—'}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Email</dt>
                <dd className="font-medium text-slate-900">{user.email || '—'}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Role</dt>
                <dd className="font-medium text-slate-900">{user.role}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Locale</dt>
                <dd className="font-medium text-slate-900">{user.locale || '—'}</dd>
              </div>
              <div>
                <dt className="text-slate-500">User ID</dt>
                <dd className="font-mono text-xs text-slate-600">{user.id}</dd>
              </div>
              {user.account_status_reason && (
                <div className="col-span-2">
                  <dt className="text-slate-500">Account status reason</dt>
                  <dd className="text-slate-900">{user.account_status_reason}</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        {/* Recent reports (US-A-007) */}
        {(recent_reports?.length > 0) && (
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600" /> Recent reports
              </CardTitle>
              <CardDescription>{report_count ?? 0} total reports against this user</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {recent_reports.map((r) => (
                  <li key={r.id} className="border-b border-slate-100 pb-2 last:border-0">
                    <span className="font-medium text-slate-700">{r.kind}</span>
                    <span className="text-slate-500 ml-2">— {r.status}</span>
                    <span className="text-slate-400 ml-2">{r.created_at ? new Date(r.created_at).toLocaleString() : ''}</span>
                    <p className="text-slate-600 mt-1">{r.description || '—'}</p>
                    <p className="text-xs text-slate-400">By: {r.reporter_name || r.reporter_phone || 'Unknown'}</p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Tasker Profile (if applicable) */}
        {tasker_profile && (
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle>Tasker Profile</CardTitle>
              <CardDescription>
                Status: <span className="font-medium">{tasker_profile.status}</span>
                {tasker_profile.verification_status && (
                  <> • Verification: <span className="font-medium">{tasker_profile.verification_status}</span></>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {tasker_profile.bio && (
                <div>
                  <dt className="text-slate-500">Bio</dt>
                  <dd className="text-slate-900 mt-1">{tasker_profile.bio}</dd>
                </div>
              )}
              {tasker_profile.categories?.length > 0 && (
                <div>
                  <dt className="text-slate-500">Categories</dt>
                  <dd className="flex flex-wrap gap-1 mt-1">
                    {tasker_profile.categories.map((cat) => (
                      <span key={cat} className="inline-flex items-center rounded-md bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-700">
                        {cat}
                      </span>
                    ))}
                  </dd>
                </div>
              )}
              {tasker_profile.skills?.length > 0 && (
                <div>
                  <dt className="text-slate-500">Skills</dt>
                  <dd className="flex flex-wrap gap-1 mt-1">
                    {tasker_profile.skills.map((skill) => (
                      <span key={skill} className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                        {skill}
                      </span>
                    ))}
                  </dd>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <dt className="text-slate-500">Tasker Since</dt>
                  <dd className="font-medium text-slate-900">
                    {tasker_profile.tasker_since ? new Date(tasker_profile.tasker_since).toLocaleDateString() : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Verified At</dt>
                  <dd className="font-medium text-slate-900">
                    {tasker_profile.verified_at ? new Date(tasker_profile.verified_at).toLocaleDateString() : '—'}
                  </dd>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Addresses */}
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" /> Addresses
            </CardTitle>
            <CardDescription>{addresses?.length || 0} saved addresses</CardDescription>
          </CardHeader>
          <CardContent>
            {(addresses && addresses.length > 0) ? (
              <ul className="space-y-3">
                {(addresses || []).map((addr) => (
                  <li key={addr.id} className="text-sm border-b border-slate-100 pb-2 last:border-0 last:pb-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900">{addr.label || 'Address'}</span>
                      {addr.is_default && (
                        <span className="inline-flex items-center rounded-md bg-teal-50 px-1.5 py-0.5 text-xs font-medium text-teal-700">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-slate-600 mt-0.5">
                      {[addr.address_line1, addr.address_line2, addr.district, addr.city].filter(Boolean).join(', ') || '—'}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-500 text-sm">No addresses saved</p>
            )}
          </CardContent>
        </Card>

        {/* Task & Booking Breakdown */}
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle>Task & Booking Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Tasks by state */}
            {task_counts?.by_state && Object.keys(task_counts.by_state).length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-slate-700 mb-2">Tasks by State (as client)</h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(task_counts.by_state).map(([state, count]) => (
                    <span key={state} className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                      {state}: {count}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Bookings as client */}
            {booking_counts?.as_client && Object.keys(booking_counts.as_client).length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-slate-700 mb-2">Bookings as Client</h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(booking_counts.as_client).map(([status, count]) => (
                    <span key={status} className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                      {status}: {count}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Bookings as tasker */}
            {booking_counts?.as_tasker && Object.keys(booking_counts.as_tasker).length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-slate-700 mb-2">Bookings as Tasker</h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(booking_counts.as_tasker).map(([status, count]) => (
                    <span key={status} className="inline-flex items-center rounded-md bg-green-50 px-2 py-0.5 text-xs text-green-700">
                      {status}: {count}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Reviews */}
        {reviews?.recent?.length > 0 && (
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" /> Recent Reviews
              </CardTitle>
              <CardDescription>
                Average: {reviews.avg_rating?.toFixed(1) || '—'} ({reviews.count} total)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {(reviews?.recent || []).map((review) => (
                  <li key={review.id} className="border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`h-4 w-4 ${star <= review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-slate-200'}`}
                            />
                          ))}
                        </div>
                        <span className="text-sm text-slate-600">{review.reviewer_name}</span>
                      </div>
                      <span className="text-xs text-slate-500">
                        {review.created_at ? new Date(review.created_at).toLocaleDateString() : ''}
                      </span>
                    </div>
                    {review.comment && (
                      <p className="text-sm text-slate-700 mt-1">{review.comment}</p>
                    )}
                    {review.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {review.tags.map((tag, idx) => (
                          <span key={idx} className="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Recent Activity */}
        {Array.isArray(recent_activity) && recent_activity.length > 0 && (
          <Card className="border-slate-200 lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" /> Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-slate-600">
                      <th className="pb-2 pr-4">Type</th>
                      <th className="pb-2 pr-4">Category</th>
                      <th className="pb-2 pr-4">Status</th>
                      <th className="pb-2">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent_activity.map((item, idx) => (
                      <tr key={`${item.type}-${item.id}-${idx}`} className="border-b last:border-0">
                        <td className="py-2 pr-4">
                          <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${
                            item.type === 'task' ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'
                          }`}>
                            {item.type}
                          </span>
                        </td>
                        <td className="py-2 pr-4">{item.category || '—'}</td>
                        <td className="py-2 pr-4">{item.status}</td>
                        <td className="py-2 text-slate-600">
                          {item.created_at ? new Date(item.created_at).toLocaleDateString() : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default AdminUserDetailPage;
