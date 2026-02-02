import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { adminAPI } from '../services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, User, MessageSquare, FileText } from 'lucide-react';

function AdminSupportTicketDetailPage() {
  const { ticketId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusUpd, setStatusUpd] = useState('');
  const [noteBody, setNoteBody] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await adminAPI.getSupportTicketDetail(ticketId);
      setData(res);
      setStatusUpd(res?.ticket?.status || '');
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || 'Failed to load ticket');
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleUpdateStatus = async () => {
    if (!statusUpd || statusUpd === data?.ticket?.status) return;
    try {
      setActionLoading(true);
      await adminAPI.updateSupportTicket(ticketId, { status: statusUpd });
      await load();
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || 'Failed to update');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!noteBody.trim()) return;
    try {
      setActionLoading(true);
      setError('');
      await adminAPI.addSupportTicketNote(ticketId, noteBody.trim());
      setNoteBody('');
      await load();
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || 'Failed to add note');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[40vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="space-y-4">
        <Link to="/admin/support-tickets" className="inline-flex items-center gap-2 text-teal-600 hover:text-teal-700">
          <ArrowLeft className="h-4 w-4" /> Back to tickets
        </Link>
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive">
          {error}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { ticket, notes, user_context } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <Link to="/admin/support-tickets" className="inline-flex items-center gap-2 text-teal-600 hover:text-teal-700">
          <ArrowLeft className="h-4 w-4" /> Back to tickets
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900">{ticket.subject}</h1>
          <p className="text-slate-600 mt-1">
            Ticket #{ticket.id?.slice(0, 8)} • {ticket.status} • {ticket.priority} • Created {ticket.created_at ? new Date(ticket.created_at).toLocaleString() : '—'}
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive text-sm">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main: ticket + notes */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" /> Ticket
              </CardTitle>
              <div className="flex items-center gap-2">
                <select
                  value={statusUpd}
                  onChange={(e) => setStatusUpd(e.target.value)}
                  className="rounded border border-slate-300 px-2 py-1 text-sm"
                >
                  <option value="open">Open</option>
                  <option value="in_progress">In progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
                <Button size="sm" onClick={handleUpdateStatus} disabled={actionLoading || statusUpd === ticket.status}>
                  Update status
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-slate-700">{ticket.subject}</p>
              <p className="text-xs text-slate-500 mt-2">User: {ticket.user_name || ticket.user_phone || ticket.user_id}</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" /> Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {notes?.length > 0 ? (
                <ul className="space-y-3">
                  {notes.map((n) => (
                    <li key={n.id} className="border-l-2 border-slate-200 pl-3 py-1 text-sm">
                      <p className="text-slate-700">{n.body}</p>
                      <p className="text-xs text-slate-400 mt-1">
                        {n.author_name || n.author_phone || 'Agent'} • {n.created_at ? new Date(n.created_at).toLocaleString() : ''}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-slate-500 text-sm">No notes yet.</p>
              )}
              <form onSubmit={handleAddNote} className="flex gap-2">
                <Textarea
                  placeholder="Add a note…"
                  value={noteBody}
                  onChange={(e) => setNoteBody(e.target.value)}
                  className="min-h-[80px]"
                  rows={3}
                />
                <Button type="submit" size="sm" disabled={actionLoading || !noteBody.trim()}>
                  Add note
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* US-A-028: User context panel – full task/payment history summary + link to user detail */}
        <div className="lg:col-span-1">
          <Card className="border-slate-200 border-l-4 border-l-teal-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-800">
                <User className="h-5 w-5" /> User context
              </CardTitle>
              <CardDescription>
                Task and payment summary for this user. Open full profile for complete history.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {user_context && (
                <>
                  <div>
                    <p className="text-slate-500">Name / Phone</p>
                    <p className="font-medium text-slate-900">{user_context.user_name || user_context.user_phone || '—'}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Role</p>
                    <p className="font-medium text-slate-900">{user_context.user_role || '—'}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Tasks (total)</p>
                    <p className="font-medium text-slate-900">{user_context.task_count_total ?? 0}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Spent / Earned (EGP)</p>
                    <p className="font-medium text-slate-900">
                      {user_context.total_spent_egp != null ? user_context.total_spent_egp.toFixed(0) : '—'} / {user_context.total_earned_egp != null ? user_context.total_earned_egp.toFixed(0) : '—'}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" className="w-full mt-2" asChild>
                    <Link to={user_context.link_to_user_detail || `/admin/users/${user_context.user_id}`}>
                      Open full user profile & history
                    </Link>
                  </Button>
                </>
              )}
              {!user_context && <p className="text-slate-500">No user context.</p>}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default AdminSupportTicketDetailPage;
