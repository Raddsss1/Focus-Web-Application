import { useEffect, useState, useCallback } from 'react';
import { supabase } from './supabaseClient';

const fmt = s => `${Math.floor((s || 0) / 60)}m ${Math.round((s || 0) % 60)}s`;

export default function TeacherDashboard() {
  const [cls, setCls] = useState(null);
  const [rows, setRows] = useState([]);
  const [events, setEvents] = useState([]);
  const [picked, setPicked] = useState(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    supabase.from('classes').select('*').order('created_at').limit(1).then(({ data }) => setCls(data?.[0] ?? null));
    const i = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(i);
  }, []);

  const load = useCallback(async () => {
    if (!cls) return;
    const { data } = await supabase.from('sessions').select('*, profiles(full_name)')
      .eq('class_id', cls.id).order('started_at', { ascending: false }).limit(200);
    setRows(data ?? []);
  }, [cls]);

  useEffect(() => {            // realtime: re-fetch whenever a student's session changes
    if (!cls) return;
    load();
    const ch = supabase.channel('sessions-' + cls.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions', filter: `class_id=eq.${cls.id}` }, load)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [cls, load]);

  const showEvents = async r => {
    setPicked(r);
    const { data } = await supabase.from('events').select('*').eq('session_id', r.id).order('created_at');
    setEvents(data ?? []);
  };

  const exportCsv = () => {
    const head = ['Student', 'Date', 'Total(s)', 'Away(s)', 'Mic(s)', 'Cam(s)', 'Hand raises', 'Reactions'];
    const body = rows.map(r => [r.profiles?.full_name, r.started_at, r.total_seconds, r.away_seconds, r.mic_seconds, r.cam_seconds, r.hand_raises, r.reactions]);
    const csv = [head, ...body].map(l => l.map(v => `"${v ?? ''}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `${cls.name}-attendance.csv`; a.click();
  };

  if (!cls) return <p>Loading class…</p>;
  const isLive = r => !r.ended_at && now - new Date(r.last_seen) < 45000;

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui' }}>
      <h1>{cls.name} — code: <code>{cls.code}</code></h1>
      <button onClick={exportCsv}>Export CSV</button>
      <table cellPadding={8} style={{ width: '100%', marginTop: 12, borderCollapse: 'collapse' }}>
        <thead><tr style={{ textAlign: 'left', borderBottom: '2px solid #ddd' }}>
          <th>Student</th><th>Status</th><th>Date</th><th>Time in class</th><th>Away</th>
          <th>Mic</th><th>Cam</th><th>✋</th><th>Reactions</th></tr></thead>
        <tbody>{rows.map(r => (
          <tr key={r.id} onClick={() => showEvents(r)} style={{ cursor: 'pointer', borderBottom: '1px solid #eee' }}>
            <td>{r.profiles?.full_name}</td>
            <td>{isLive(r) ? (r.tab_active ? '🟢 Active' : '🟠 Tab away') : '⚪ Left'}</td>
            <td>{new Date(r.started_at).toLocaleString()}</td>
            <td>{fmt(r.total_seconds)}</td><td>{fmt(r.away_seconds)}</td>
            <td>{fmt(r.mic_seconds)}</td><td>{fmt(r.cam_seconds)}</td>
            <td>{r.hand_raises}</td><td>{r.reactions}</td></tr>))}
        </tbody>
      </table>
      {picked && <>
        <h3>Timeline — {picked.profiles?.full_name}</h3>
        <ul>{events.map(e => <li key={e.id}>{new Date(e.created_at).toLocaleTimeString()} — {e.type} {e.detail || ''}</li>)}</ul>
      </>}
    </div>
  );
}
