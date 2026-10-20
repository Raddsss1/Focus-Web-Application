// Service worker: the only place that talks to Supabase on behalf of the Meet tab.
import { api, getSession } from './lib/supabase.js';

const handlers = {
  async start({ classId, meetCode }) {
    const s = await getSession();
    if (!s) return { error: 'not_logged_in' };
    if (s.user.user_metadata?.role === 'teacher') {          // teacher: publish the live Meet link
      await api(`classes?id=eq.${classId}`, { method: 'PATCH',
        body: { live_meet_url: `https://meet.google.com/${meetCode}` } });
      return { teacher: true };
    }
    const [row] = await api('sessions', { method: 'POST', prefer: 'return=representation',
      body: { class_id: classId, student_id: s.user.id, meet_code: meetCode } });
    await handlers.event({ sessionId: row.id, classId, kind: 'joined' });
    return { sessionId: row.id };
  },
  async update({ sessionId, fields }) {
    await api(`sessions?id=eq.${sessionId}`, { method: 'PATCH', body: fields }); return { ok: true };
  },
  async event({ sessionId, classId, kind, detail }) {
    const s = await getSession();
    await api('events', { method: 'POST',
      body: { session_id: sessionId, class_id: classId, student_id: s.user.id, type: kind, detail: detail || null } });
    return { ok: true };
  },
  async end({ teacher, classId, sessionId, fields }) {
    if (teacher) {
      await api(`classes?id=eq.${classId}`, { method: 'PATCH', body: { live_meet_url: null } });
      return { ok: true };
    }
    await handlers.update({ sessionId, fields });
    await handlers.event({ sessionId, classId, kind: 'left' });
    return { ok: true };
  }
};

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  const h = handlers[msg.type];
  if (!h) return false;
  h(msg).then(sendResponse).catch(e => sendResponse({ error: String(e.message || e) }));
  return true; // keep channel open for async reply
});
