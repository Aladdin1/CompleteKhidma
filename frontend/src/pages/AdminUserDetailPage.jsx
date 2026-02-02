import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { adminAPI } from '../services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, User, MapPin, ListTodo, BookOpen, Star, CreditCard, Clock } from 'lucide-react';

function AdminUserDetailPage() {
  const { userId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        setError('');
        const res = await adminAPI.getUserDetail(userId);
        if (!cancelled) setData(res);
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.error?.message || err.message || 'Failed to load user');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [userId]);

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

  if (!data) return null;

  const { user, addresses, task_counts, booking_counts, reviews, payment_summary, tasker_profile, recent_activity } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/admin/users" className="inline-flex items-center gap-2 text-teal-600 hover:text-teal-700">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {user.full_name || user.phone || 'User Details'}
          </h1>
          <p className="text-slate-600 mt-1">
            <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 mr-2">
              {user.role}
            </span>
            Member since {user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
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
            </dl>
          </CardContent>
        </Card>

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
            {addresses?.length > 0 ? (
              <ul className="space-y-3">
                {addresses.map((addr) => (
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
                {reviews.recent.map((review) => (
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
        {recent_activity?.length > 0 && (
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
