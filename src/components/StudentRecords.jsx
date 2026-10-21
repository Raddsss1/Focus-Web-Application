import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

export default function StudentRecords() {
  const [rows, setRows] = useState([]);
  useEffect(() => {
    supabase.from('sessions').select('*, classes(name)').order('started_at', { ascending: false })
      .then(({ data }) => setRows(data ?? []));   // RLS returns only this student's rows
  }, []);
  const m = s => `${Math.round((s || 0) / 60)} min`;
  return (
    <div style={{ padding: 24, fontFamily: 'system-ui' }}>
      <h1>My attendance</h1>
      <table cellPadding={8}>
        <thead><tr><th>Class</th><th>Date</th><th>Time in class</th><th>Away</th><th>Hand raises</th><th>Reactions</th></tr></thead>
        <tbody>{rows.map(r => (
          <tr key={r.id}><td>{r.classes?.name}</td><td>{new Date(r.started_at).toLocaleString()}</td>
            <td>{m(r.total_seconds)}</td><td>{m(r.away_seconds)}</td><td>{r.hand_raises}</td><td>{r.reactions}</td></tr>))}
        </tbody>
      </table>
    </div>
  );
}
