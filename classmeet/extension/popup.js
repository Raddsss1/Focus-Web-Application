import * as sb from './lib/supabase.js';
import { WEB_APP_URL } from './config.js';

const app = document.getElementById('app');
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const open = url => chrome.tabs.create({ url });
const fmt = s => { s = Math.round(s || 0); const m = Math.floor(s / 60); return `${m}m ${s % 60}s`; };
let timer;

async function render() {
  clearInterval(timer);
  const s = await sb.getSession();
  if (!s) return authView('login');
  s.user.user_metadata?.role === 'teacher' ? teacherView(s) : studentView(s);
}

function authView(mode) {
  const su = mode === 'signup';
  app.innerHTML = `<h2>ClassMeet</h2>
    ${su ? `<input id="name" placeholder="Full name">
            <select id="role"><option value="student">I'm a student</option><option value="teacher">I'm a teacher</option></select>` : ''}
    <input id="email" type="email" placeholder="Email"><input id="pw" type="password" placeholder="Password (min 6)">
    <button id="go">${su ? 'Create account' : 'Log in'}</button>
    <a id="sw">${su ? 'Have an account? Log in' : 'New here? Create account'}</a><p class="err" id="msg"></p>`;
  $('sw').onclick = () => authView(su ? 'login' : 'signup');
  $('go').onclick = async () => {
    try {
      if (su) {
        const r = await sb.signUp($('email').value, $('pw').value, $('name').value, $('role').value);
        if (!r) { $('msg').textContent = 'Check your email to confirm, then log in.'; return; }
      } else await sb.signIn($('email').value, $('pw').value);
      render();
    } catch (e) { $('msg').textContent = e.message; }
  };
}

async function teacherView(s) {
  try {
    let [c] = await sb.api(`classes?teacher_id=eq.${s.user.id}&order=created_at.asc&limit=1`);
    if (!c) c = await sb.rpc('create_class', { p_name: `${s.user.user_metadata.full_name || 'My'}'s Class` });
    await chrome.storage.local.set({ activeClass: { id: c.id, name: c.name, code: c.code } });
    app.innerHTML = `<h2>${esc(c.name)}</h2><div class="muted">Your class code — share it with students</div>
      <div class="code">${esc(c.code)}</div>
      <div class="row"><button id="copy" class="sec">Copy code</button><button id="meet">Start Meet</button></div>
      <h3>Live students</h3><div id="live" class="muted">Loading…</div>
      <div class="row"><button id="dash" class="sec">Open dashboard</button><button id="out" class="sec">Log out</button></div>`;
    $('copy').onclick = () => { navigator.clipboard.writeText(c.code); $('copy').textContent = 'Copied ✓'; };
    $('meet').onclick = () => open('https://meet.new');
    $('dash').onclick = () => open(WEB_APP_URL);
    $('out').onclick = async () => { await sb.signOut(); render(); };
    const load = async () => {
      const since = new Date(Date.now() - 45000).toISOString();
      const rows = await sb.api(`sessions?select=*,profiles(full_name)&class_id=eq.${c.id}&ended_at=is.null&last_seen=gte.${since}&order=started_at.asc`);
      $('live').innerHTML = rows.length ? rows.map(r => `<div class="stu"><span>${esc(r.profiles?.full_name || 'Student')}${r.tab_active ? '' : ' ⚠️'}</span>
        <span>${r.mic_on ? '🎤' : '🔇'} ${r.cam_on ? '📷' : '🚫'} ${r.hand_up ? '✋' : ''} ${fmt(r.total_seconds)}</span></div>`).join('') : 'No students in the meeting right now.';
    };
    load(); timer = setInterval(() => load().catch(() => {}), 5000);
  } catch (e) { app.innerHTML = `<p class="err">${esc(e.message)}</p><button id="out" class="sec">Log out</button>`; $('out').onclick = async () => { await sb.signOut(); render(); }; }
}

async function studentView(s) {
  const rows = await sb.api(`enrollments?select=classes(id,name,code,live_meet_url)&student_id=eq.${s.user.id}`);
  const classes = rows.map(r => r.classes);
  let { activeClass } = await chrome.storage.local.get('activeClass');
  if (!classes.find(c => c.id === activeClass?.id)) {
    activeClass = classes[0] ? { id: classes[0].id, name: classes[0].name, code: classes[0].code } : null;
    await chrome.storage.local.set({ activeClass });
  }
  const cur = classes.find(c => c.id === activeClass?.id);
  app.innerHTML = `<h2>ClassMeet</h2>
    ${classes.length ? `<h3>Active class</h3><select id="cls">${classes.map(c => `<option value="${c.id}" ${c.id === cur.id ? 'selected' : ''}>${esc(c.name)} (${esc(c.code)})</option>`).join('')}</select>
      ${cur.live_meet_url ? `<button id="live">▶ Join teacher's live Meet</button>` : `<div class="muted">Teacher hasn't started a Meet yet.</div>`}
      <button id="meet" class="sec">Create my own Meet</button>
      <div class="muted">Attendance is recorded only while you are inside a Meet call for this class.</div>` : ''}
    <h3>Join a class</h3><div class="row"><input id="code" placeholder="Class code" maxlength="6"><button id="join">Join</button></div>
    <p class="err" id="msg"></p>
    <div class="row"><button id="dash" class="sec">My records</button><button id="out" class="sec">Log out</button></div>`;
  $('join').onclick = async () => {
    try { await sb.rpc('join_class', { p_code: $('code').value }); render(); } catch (e) { $('msg').textContent = e.message; }
  };
  $('dash').onclick = () => open(WEB_APP_URL);
  $('out').onclick = async () => { await sb.signOut(); render(); };
  if (classes.length) {
    $('cls').onchange = async e => { const c = classes.find(x => x.id === e.target.value);
      await chrome.storage.local.set({ activeClass: { id: c.id, name: c.name, code: c.code } }); render(); };
    $('meet').onclick = () => open('https://meet.new');
    if ($('live')) $('live').onclick = () => open(cur.live_meet_url);
  }
}
render();
