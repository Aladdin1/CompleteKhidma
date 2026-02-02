import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { adminAPI } from '../services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MessageSquare, FileText, AlertCircle } from 'lucide-react';

function AdminDisputeDetailPage() {
  const { disputeId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        setError('');
        const res = await adminAPI.getDisputeDetail(disputeId);
        if (!cancelled) setData(res);
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.error?.message || err.message || 'Failed to load dispute');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [disputeId]);

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
        <Link to="/admin/disputes" className="inline-flex items-center gap-2 text-teal-600 hover:text-teal-700">
          <ArrowLeft className="h-4 w-4" /> Back to Disputes
        </Link>
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive">
          {error}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { dispute, booking, task, messages, evidence } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/admin/disputes" className="inline-flex items-center gap-2 text-teal-600 hover:text-teal-700">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dispute Details</h1>
          <p className="text-slate-600 mt-1">
            <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${
              dispute.status === 'resolved' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
            }`}>
              {dispute.status}
            </span>
            {' '}Opened {dispute.created_at ? new Date(dispute.created_at).toLocaleDateString() : '—'}
          </p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" /> Dispute
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><strong>Reason:</strong> {dispute.reason || '—'}</p>
            {dispute.amount_in_question != null && (
              <p><strong>Amount in question:</strong> {dispute.amount_in_question / 100} {dispute.currency}</p>
            )}
            {dispute.resolution_text && (
              <p><strong>Resolution:</strong> {dispute.resolution_text}</p>
            )}
            {dispute.refund_amount != null && dispute.refund_amount > 0 && (
              <p><strong>Refund issued:</strong> {Number(dispute.refund_amount).toFixed(2)} {dispute.currency}</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle>Booking & Parties</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><strong>Client:</strong> {booking?.client_name || booking?.client_id || '—'}</p>
            <p><strong>Tasker:</strong> {booking?.tasker_name || booking?.tasker_id || '—'}</p>
            <p><strong>Booking status:</strong> {booking?.status || '—'}</p>
            {booking?.agreed_rate_amount != null && (
              <p><strong>Agreed rate:</strong> {(booking.agreed_rate_amount / 100).toFixed(2)} {booking.agreed_rate_currency}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Task details */}
      {task && (
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle>Task</CardTitle>
            <CardDescription>{task.category}{task.subcategory ? ` / ${task.subcategory}` : ''}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><strong>Description:</strong> {task.description || '—'}</p>
            <p><strong>Address:</strong> {task.address || task.city || '—'}</p>
            <p><strong>State:</strong> {task.state}</p>
            {task.est_min_amount != null && (
              <p><strong>Estimated:</strong> {task.est_min_amount}–{task.est_max_amount} {task.currency}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Messages */}
      {messages?.length > 0 && (
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" /> Messages ({messages.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 max-h-64 overflow-y-auto">
              {messages.map((m) => (
                <li key={m.id} className="border-b border-slate-100 pb-2 last:border-0">
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>{m.sender_name}</span>
                    <span>{m.created_at ? new Date(m.created_at).toLocaleString() : ''}</span>
                  </div>
                  <p className="text-sm text-slate-900 mt-1">{m.text || '(no text)'}</p>
                  {m.media_url && (
                    <a href={m.media_url} target="_blank" rel="noreferrer" className="text-xs text-teal-600 hover:underline">
                      View attachment
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Evidence */}
      {evidence?.length > 0 && (
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" /> Evidence ({evidence.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {evidence.map((e, idx) => (
                <li key={idx} className="border-b border-slate-100 pb-2 last:border-0 text-sm">
                  <div className="text-slate-500 text-xs">
                    {e.added_at ? new Date(e.added_at).toLocaleString() : ''}
                  </div>
                  <p className="text-slate-900 mt-1">{typeof e.evidence === 'string' ? e.evidence : JSON.stringify(e.evidence)}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {dispute.status !== 'resolved' && (
        <Button asChild>
          <Link to="/admin/disputes">Go to disputes to resolve</Link>
        </Button>
      )}
    </div>
  );
}

export default AdminDisputeDetailPage;
