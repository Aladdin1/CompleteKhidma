import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { adminAPI } from '../services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { ArrowLeft, User, MessageSquare, FileText, Link2, AlertCircle, Send } from 'lucide-react';

const TICKET_TYPES = adminAPI.SUPPORT_TICKET_TYPES || ['billing', 'technical', 'account', 'dispute', 'general', 'other'];

function AdminSupportTicketDetailPage() {
  const { ticketId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusUpd, setStatusUpd] = useState('');
  const [typeUpd, setTypeUpd] = useState('');
  const [priorityUpd, setPriorityUpd] = useState('');
  const [resolutionSummary, setResolutionSummary] = useState('');
  const [dueAtUpd, setDueAtUpd] = useState('');
  const [taskIdUpd, setTaskIdUpd] = useState('');
  const [disputeIdUpd, setDisputeIdUpd] = useState('');
  const [fetchedUserTasks, setFetchedUserTasks] = useState([]);
  const [noteBody, setNoteBody] = useState('');
  const [noteSentToUser, setNoteSentToUser] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await adminAPI.getSupportTicketDetail(ticketId);
      setData(res);
      setStatusUpd(res?.ticket?.status || '');
      setTypeUpd(res?.ticket?.type || '');
      setPriorityUpd(res?.ticket?.priority || '');
      setResolutionSummary(res?.ticket?.resolution_summary || '');
      setDueAtUpd(res?.ticket?.due_at ? res.ticket.due_at.slice(0, 16) : '');
      setTaskIdUpd(res?.ticket?.task_id || '');
      setDisputeIdUpd(res?.ticket?.dispute_id || '');
      // DEBUG: ticket detail response – task list source
      console.log('[SupportTicket DEBUG] Ticket detail response keys:', Object.keys(res || {}));
      console.log('[SupportTicket DEBUG] res.user_tasks:', res?.user_tasks, 'length:', res?.user_tasks?.length);
      console.log('[SupportTicket DEBUG] res.ticket.user_id:', res?.ticket?.user_id);
      console.log('[SupportTicket DEBUG] res.user_context?.user_id:', res?.user_context?.user_id);
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || 'Failed to load ticket');
      console.error('[SupportTicket DEBUG] Ticket detail error:', err?.response?.data ?? err.message);
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    load();
  }, [load]);

  // Same user as User context panel: filter task list by this user only
  const contextUserId = data?.user_context?.user_id ?? data?.ticket?.user_id;
  useEffect(() => {
    if (!contextUserId) {
      setFetchedUserTasks([]);
      return;
    }
    let cancelled = false;
    adminAPI
      .getTasksForUser(contextUserId, { limit: 100 })
      .then((res) => {
        if (cancelled) return;
        const list = Array.isArray(res?.items) ? res.items : Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
        setFetchedUserTasks(list);
        console.log('[SupportTicket DEBUG] getTasksForUser response keys:', Object.keys(res || {}), 'items length:', res?.items?.length, 'list length:', list?.length);
      })
      .catch((err) => {
        if (!cancelled) setFetchedUserTasks([]);
        console.error('[SupportTicket DEBUG] getTasksForUser failed:', err?.response?.status, err?.response?.data ?? err.message);
      });
    return () => { cancelled = true; };
  }, [contextUserId]);

  // Use ticket detail user_tasks first (same user as User context, already in response); fallback to fetched list
  const fromTicketDetail = Array.isArray(data?.user_tasks)
    ? data.user_tasks
    : Array.isArray(data?.data?.user_tasks)
      ? data.data.user_tasks
      : [];
  const userTasksList = fromTicketDetail.length > 0 ? fromTicketDetail : (Array.isArray(fetchedUserTasks) ? fetchedUserTasks : []);
  // DEBUG: task list source for dropdown (remove when done debugging)
  if (data) {
    console.log('[SupportTicket DEBUG] contextUserId:', contextUserId, 'fromTicketDetail:', fromTicketDetail?.length ?? 0, 'fetchedUserTasks:', fetchedUserTasks?.length ?? 0, 'userTasksList:', userTasksList?.length ?? 0);
  }

  const handleUpdateStatus = async () => {
    if (!statusUpd || statusUpd === data?.ticket?.status) return;
    try {
      setActionLoading(true);
      const payload = {
        status: statusUpd,
        type: typeUpd || null,
        priority: priorityUpd || 'medium',
        due_at: dueAtUpd ? new Date(dueAtUpd).toISOString() : null,
        task_id: taskIdUpd?.trim() || null,
        dispute_id: disputeIdUpd?.trim() || null
      };
      if ((statusUpd === 'resolved' || statusUpd === 'closed') && resolutionSummary.trim()) {
        payload.resolution_summary = resolutionSummary.trim();
      }
      await adminAPI.updateSupportTicket(ticketId, payload);
      await load();
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || 'Failed to update');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReopen = async () => {
    try {
      setActionLoading(true);
      const payload = {
        status: 'open',
        type: typeUpd || null,
        priority: priorityUpd || 'medium',
        due_at: dueAtUpd ? new Date(dueAtUpd).toISOString() : null,
        task_id: taskIdUpd?.trim() || null,
        dispute_id: disputeIdUpd?.trim() || null
      };
      await adminAPI.updateSupportTicket(ticketId, payload);
      setStatusUpd('open');
      await load();
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || 'Failed to reopen');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveMetadata = async () => {
    try {
      setActionLoading(true);
      // Always send full metadata from form so date and priority are persisted (no comparison bugs)
      const priority = priorityUpd && ['low', 'medium', 'high'].includes(priorityUpd) ? priorityUpd : 'medium';
      const payload = {
        type: typeUpd || null,
        priority,
        due_at: dueAtUpd ? new Date(dueAtUpd).toISOString() : null,
        resolution_summary: resolutionSummary.trim() || null,
        task_id: taskIdUpd?.trim() || null,
        dispute_id: disputeIdUpd?.trim() || null
      };
      await adminAPI.updateSupportTicket(ticketId, payload);
      await load();
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || 'Failed to save');
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
      await adminAPI.addSupportTicketNote(ticketId, noteBody.trim(), noteSentToUser);
      setNoteBody('');
      setNoteSentToUser(false);
      const metaChanged =
        typeUpd !== (data?.ticket?.type || '') ||
        priorityUpd !== data?.ticket?.priority ||
        (dueAtUpd ? new Date(dueAtUpd).toISOString() : null) !== (data?.ticket?.due_at || null) ||
        taskIdUpd?.trim() !== (data?.ticket?.task_id || '') ||
        disputeIdUpd?.trim() !== (data?.ticket?.dispute_id || '') ||
        resolutionSummary.trim() !== (data?.ticket?.resolution_summary || '');
      if (metaChanged) {
        await adminAPI.updateSupportTicket(ticketId, {
          type: typeUpd || null,
          priority: priorityUpd || 'medium',
          due_at: dueAtUpd ? new Date(dueAtUpd).toISOString() : null,
          task_id: taskIdUpd?.trim() || null,
          dispute_id: disputeIdUpd?.trim() || null,
          resolution_summary: resolutionSummary.trim() || null
        });
      }
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

  const { ticket, notes, user_context, linked_task, linked_dispute } = data;
  const isClosed = ticket.status === 'resolved' || ticket.status === 'closed';
  const dueAt = ticket.due_at ? new Date(ticket.due_at) : null;
  const isOverdue = dueAt && dueAt < new Date() && !isClosed;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <Link to="/admin/support-tickets" className="inline-flex items-center gap-2 text-teal-600 hover:text-teal-700">
          <ArrowLeft className="h-4 w-4" /> Back to tickets
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900">{ticket.subject}</h1>
          <p className="text-slate-600 mt-1">
            Ticket #{ticket.id?.slice(0, 8)} • {ticket.status} • {ticket.priority}
            {ticket.type && ` • ${ticket.type}`}
            {' • Created '}{ticket.created_at ? new Date(ticket.created_at).toLocaleString() : '—'}
            {dueAt && (
              <span className={isOverdue ? ' text-red-600 font-medium' : ''}>
                {' • Due '}{dueAt.toLocaleString()}{isOverdue && ' (overdue)'}
              </span>
            )}
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
            <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" /> Ticket
              </CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                {isClosed && (
                  <Button size="sm" variant="outline" onClick={handleReopen} disabled={actionLoading}>
                    Reopen
                  </Button>
                )}
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
            <CardContent className="space-y-4">
              <p className="text-slate-700">{ticket.subject}</p>
              <p className="text-xs text-slate-500">User: {ticket.user_name || ticket.user_phone || ticket.user_id}</p>

              <div className="grid gap-3 text-sm border-t pt-3">
                <div className="flex flex-wrap gap-4 items-center">
                  <label className="flex items-center gap-2">
                    <span className="text-slate-500 w-16">Type</span>
                    <select
                      value={typeUpd}
                      onChange={(e) => setTypeUpd(e.target.value)}
                      className="rounded border border-slate-300 px-2 py-1 text-sm"
                    >
                      <option value="">—</option>
                      {TICKET_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </label>
                  <label className="flex items-center gap-2">
                    <span className="text-slate-500 w-14">Priority</span>
                    <select
                      value={priorityUpd}
                      onChange={(e) => setPriorityUpd(e.target.value)}
                      className="rounded border border-slate-300 px-2 py-1 text-sm"
                    >
                      <option value="low">low</option>
                      <option value="medium">medium</option>
                      <option value="high">high</option>
                    </select>
                  </label>
                  <label className="flex items-center gap-2">
                    <span className="text-slate-500">Due</span>
                    <input
                      type="datetime-local"
                      value={dueAtUpd}
                      onChange={(e) => setDueAtUpd(e.target.value)}
                      className="rounded border border-slate-300 px-2 py-1 text-sm"
                    />
                  </label>
                  <Button size="sm" variant="outline" onClick={handleSaveMetadata} disabled={actionLoading}>
                    Save type / priority / due
                  </Button>
                </div>
                <div className="flex flex-wrap gap-4 items-end">
                  <label className="block">
                    <span className="block text-slate-500 text-xs mb-1">Link to task (same user as User context)</span>
                    <select
                      value={taskIdUpd}
                      onChange={(e) => setTaskIdUpd(e.target.value)}
                      className="rounded border border-slate-300 px-2 py-1 text-sm min-w-[220px] max-w-[320px]"
                    >
                      <option value="">— None</option>
                      {data?.ticket?.task_id && data.ticket.task_id !== '' && !userTasksList.some((t) => t.id === data.ticket.task_id) && (
                        <option value={data.ticket.task_id}>
                          Current: {data?.linked_task?.title || data.ticket.task_id.slice(0, 8)}
                        </option>
                      )}
                      {userTasksList.map((t) => {
                        const taskId = t?.id != null ? String(t.id) : '';
                        return (
                          <option key={taskId || t?.created_at} value={taskId}>
                            {(t?.title || (t?.id && String(t.id).slice(0, 8)) || '—')} ({t?.state ?? '—'})
                          </option>
                        );
                      })}
                    </select>
                    {taskIdUpd && (
                      <Link
                        to={`/admin/tasks?taskId=${taskIdUpd}`}
                        className="ml-2 text-sm text-teal-600 hover:underline whitespace-nowrap"
                      >
                        View task details
                      </Link>
                    )}
                    {userTasksList.length === 0 && contextUserId && (
                      <span className="block text-xs text-slate-400 mt-0.5">No tasks for this user yet.</span>
                    )}
                  </label>
                  <label className="block">
                    <span className="block text-slate-500 text-xs mb-1">Link to dispute ID</span>
                    <Input
                      type="text"
                      placeholder="UUID (optional)"
                      value={disputeIdUpd}
                      onChange={(e) => setDisputeIdUpd(e.target.value)}
                      className="w-64 text-sm font-mono"
                    />
                  </label>
                </div>
                <div>
                  <label className="block text-slate-500 text-xs mb-1">Resolution summary (when closing)</label>
                  <Textarea
                    placeholder="Brief summary of how the case was resolved…"
                    value={resolutionSummary}
                    onChange={(e) => setResolutionSummary(e.target.value)}
                    className="min-h-[60px] text-sm"
                    rows={2}
                  />
                </div>
              </div>

              {(linked_task || linked_dispute) && (
                <div className="flex flex-wrap gap-3 pt-2 border-t text-sm">
                  {linked_task && (
                    <span className="inline-flex items-center gap-1 text-teal-700">
                      <Link2 className="h-4 w-4" />
                      Task: <Link to={`/admin/tasks?taskId=${linked_task.id}`} className="underline">{linked_task.title || linked_task.id}</Link>
                      <span className="text-slate-400">·</span>
                      <Link to={`/admin/tasks?taskId=${linked_task.id}`} className="text-teal-600 hover:underline text-xs">View details</Link>
                    </span>
                  )}
                  {linked_dispute && (
                    <span className="inline-flex items-center gap-1 text-teal-700">
                      <AlertCircle className="h-4 w-4" />
                      Dispute: <Link to={`/admin/disputes/${linked_dispute.id}`} className="underline">View</Link>
                    </span>
                  )}
                </div>
              )}
              {ticket.resolution_summary && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-slate-500">Resolution summary</p>
                  <p className="text-slate-700 text-sm mt-1">{ticket.resolution_summary}</p>
                </div>
              )}
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
                      <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                        {n.author_name || n.author_phone || 'Agent'} • {n.created_at ? new Date(n.created_at).toLocaleString() : ''}
                        {n.sent_to_user && (
                          <span className="inline-flex items-center gap-0.5 text-teal-600">
                            <Send className="h-3 w-3" /> Sent to user
                          </span>
                        )}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-slate-500 text-sm">No notes yet.</p>
              )}
              <form onSubmit={handleAddNote} className="space-y-2">
                <Textarea
                  placeholder="Add a note… (check below to also notify the user)"
                  value={noteBody}
                  onChange={(e) => setNoteBody(e.target.value)}
                  className="min-h-[80px]"
                  rows={3}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={noteSentToUser}
                      onChange={(e) => setNoteSentToUser(e.target.checked)}
                      className="rounded"
                    />
                    Send reply to user (in-app notification)
                  </label>
                  <Button type="submit" size="sm" disabled={actionLoading || !noteBody.trim()}>
                    Add note
                  </Button>
                </div>
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
