import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminAPI } from '../services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ListTodo, Users, BookOpen, AlertCircle } from 'lucide-react';

function AdminDashboardPage() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        setError('');
        const data = await adminAPI.getMetrics({ by: 'city' });
        if (!cancelled) setMetrics(data);
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.error?.message || err.message || 'Failed to load metrics');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

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

  const taskCount = (metrics?.tasks || []).reduce((sum, r) => sum + Number(r.count || 0), 0);
  const userCount = (metrics?.users || []).reduce((sum, r) => sum + Number(r.count || 0), 0);
  const bookingCount = (metrics?.bookings || []).reduce((sum, r) => sum + Number(r.count || 0), 0);
  const revenue = metrics?.revenue?.total ?? 0;
  const fillRate = metrics?.fill_rate != null ? `${(metrics.fill_rate * 100).toFixed(1)}%` : null;
  const timeToAccept = metrics?.time_to_accept;

  const cards = [
    { title: 'Tasks', value: taskCount, desc: 'Total tasks', icon: ListTodo, link: '/admin/tasks' },
    { title: 'Users', value: userCount, desc: 'Total users', icon: Users, link: '/admin/users' },
    { title: 'Bookings', value: bookingCount, desc: 'Total bookings', icon: BookOpen },
    { title: 'Revenue', value: `${(revenue / 100).toFixed(0)} EGP`, desc: 'Completed bookings', icon: AlertCircle },
  ];
  if (fillRate) {
    cards.push({ title: 'Fill rate', value: fillRate, desc: 'Tasks completed / total', icon: AlertCircle });
  }
  if (timeToAccept?.avg_minutes != null) {
    cards.push({ 
      title: 'Avg time to accept', 
      value: `${timeToAccept.avg_minutes} min`, 
      desc: `Median: ${timeToAccept.median_minutes} min (${timeToAccept.sample_count} samples)`, 
      icon: AlertCircle 
    });
  }

  const retention = metrics?.retention_30d;
  if (retention?.client?.retention_rate != null) {
    cards.push({ 
      title: 'Client retention (30d)', 
      value: `${retention.client.retention_rate}%`, 
      desc: `${retention.client.retained_count}/${retention.client.prior_count} returned`, 
      icon: AlertCircle 
    });
  }
  if (retention?.tasker?.retention_rate != null) {
    cards.push({ 
      title: 'Tasker retention (30d)', 
      value: `${retention.tasker.retention_rate}%`, 
      desc: `${retention.tasker.retained_count}/${retention.tasker.prior_count} returned`, 
      icon: AlertCircle 
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
        <p className="text-slate-600 mt-1">Platform metrics and quick access</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ title, value, desc, icon: Icon, link }) => (
          <Card key={title} className="border-slate-200">
            {link ? (
              <Link to={link}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">{title}</CardTitle>
                  <Icon className="h-4 w-4 text-slate-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-slate-900">{value}</div>
                  <p className="text-xs text-slate-500 mt-1">{desc}</p>
                </CardContent>
              </Link>
            ) : (
              <>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">{title}</CardTitle>
                  <Icon className="h-4 w-4 text-slate-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-slate-900">{value}</div>
                  <p className="text-xs text-slate-500 mt-1">{desc}</p>
                </CardContent>
              </>
            )}
          </Card>
        ))}
      </div>

      {metrics?.tasks?.length > 0 && (
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle>Tasks by state</CardTitle>
            <CardDescription>Counts per task state</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {(metrics.tasks || []).map(({ state, count }) => (
                <span
                  key={state}
                  className="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-0.5 text-sm text-slate-700"
                >
                  {state}: {count}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {metrics?.users?.length > 0 && (
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle>Users by role</CardTitle>
            <CardDescription>Counts per user role</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {(metrics.users || []).map(({ role, count }) => (
                <span
                  key={role}
                  className="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-0.5 text-sm text-slate-700"
                >
                  {role}: {count}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {(metrics?.by_city?.length ?? 0) > 0 && (
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle>Tasks by city</CardTitle>
            <CardDescription>Task counts per city (US-A-019)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-slate-600">
                    <th className="pb-2 pr-4">City</th>
                    <th className="pb-2">Task count</th>
                  </tr>
                </thead>
                <tbody>
                  {(metrics.by_city || []).map(({ city, task_count }) => (
                    <tr key={city} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-medium">{city || '—'}</td>
                      <td className="py-2">{task_count ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default AdminDashboardPage;
