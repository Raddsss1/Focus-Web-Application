// Runs inside meet.google.com. Detects presence, tab focus, mic, camera, hand, reactions.
(() => {
  // Meet is a single-page app: the URL can change to a meeting WITHOUT a page reload,
  // so the meeting code must be read every time, never once at load.
  const getCode = () =>
    (location.pathname.match(/^\/([a-z]{3}-[a-z]{4}-[a-z]{3})/) || [])[1];

  // ⚠ Google can change Meet's HTML at any time. If something stops being detected, fix it HERE only.
  const SEL = {
    leave: 'button[aria-label*="Leave call" i]',
    mic: 'button[aria-label*="microphone" i][data-is-muted]',
    cam: 'button[aria-label*="camera" i][data-is-muted]',
    hand: 'button[aria-label*="hand" i][aria-pressed]',
    emoji: "[data-emoji]",
  };
  const $ = (s) => document.querySelector(s);
  const send = (msg) => {
    try {
      return chrome.runtime.sendMessage(msg).catch(() => null);
    } catch {
      return Promise.resolve(null);
    }
  };

  let cls = null,
    sessionId = null,
    isTeacher = false,
    starting = false,
    nextTry = 0,
    last = Date.now();
  const t = { total: 0, away: 0, mic: 0, cam: 0, hands: 0, reactions: 0 };
  const st = { mic: false, cam: false, hand: false, tab: true };

  // Visible badge so students always know tracking is on (transparency)
  const badge = document.createElement("div");
  badge.style.cssText =
    "position:fixed;left:12px;bottom:90px;z-index:99999;background:#1a73e8;color:#fff;font:12px system-ui;padding:6px 10px;border-radius:14px;opacity:.9;pointer-events:none;display:none";
  document.body.appendChild(badge);
  const say = (txt) => {
    badge.textContent = txt;
    badge.style.display = txt ? "block" : "none";
  };

  const tabActive = () =>
    document.visibilityState === "visible" && document.hasFocus();
  const fields = () => ({
    last_seen: new Date().toISOString(),
    total_seconds: Math.round(t.total),
    away_seconds: Math.round(t.away),
    mic_seconds: Math.round(t.mic),
    cam_seconds: Math.round(t.cam),
    hand_raises: t.hands,
    reactions: t.reactions,
    mic_on: st.mic,
    cam_on: st.cam,
    hand_up: st.hand,
    tab_active: st.tab,
  });
  const flush = () =>
    sessionId && send({ type: "update", sessionId, fields: fields() });
  const log = (kind, detail) =>
    sessionId &&
    send({ type: "event", sessionId, classId: cls.id, kind, detail });

  async function begin() {
    starting = true;
    const { activeClass } = await chrome.storage.local.get("activeClass");
    if (!activeClass) {
      say("ClassMeet: pick a class in the extension");
      starting = false;
      nextTry = Date.now() + 10000;
      return;
    }
    cls = activeClass;
    const r = await send({
      type: "start",
      classId: cls.id,
      meetCode: getCode(),
    });
    console.log("[ClassMeet] start ->", r);
    if (r?.teacher) {
      isTeacher = true;
      say(`ClassMeet • ${cls.name} • live link shared with students`);
    } else if (r?.sessionId) {
      sessionId = r.sessionId;
      last = Date.now();
      Object.assign(t, {
        total: 0,
        away: 0,
        mic: 0,
        cam: 0,
        hands: 0,
        reactions: 0,
      });
      say(`ClassMeet • ${cls.name} • attendance is being recorded`);
    } else {
      say("ClassMeet error: " + (r?.error || "no response"));
      nextTry = Date.now() + 10000;
    }
    starting = false;
  }
  function end() {
    if (isTeacher) {
      send({ type: "end", teacher: true, classId: cls.id });
      isTeacher = false;
      say("");
      return;
    }
    if (!sessionId) return;
    const id = sessionId;
    sessionId = null;
    send({
      type: "end",
      sessionId: id,
      classId: cls.id,
      fields: { ...fields(), ended_at: new Date().toISOString() },
    });
    say("");
  }

  let beat = 0;
  function step() {
    const inCall = !!getCode() && !!$(SEL.leave);
    if (inCall !== window.__cmIn) {
      window.__cmIn = inCall;
      console.log("[ClassMeet] inCall =", inCall);
    }
    if (
      inCall &&
      !sessionId &&
      !isTeacher &&
      !starting &&
      Date.now() >= nextTry
    )
      begin();
    if (!inCall && (sessionId || isTeacher)) return end();
    if (!sessionId) return;

    const now = Date.now(),
      dt = Math.min((now - last) / 1000, 15);
    last = now;
    const tab = tabActive();
    if (tab !== st.tab) {
      st.tab = tab;
      log(tab ? "tab_returned" : "tab_left");
    }
    t.total += dt;
    if (!tab) t.away += dt;

    const mic = $(SEL.mic)?.getAttribute("data-is-muted") === "false";
    if (mic !== st.mic) {
      st.mic = mic;
      log(mic ? "mic_on" : "mic_off");
    }
    const cam = $(SEL.cam)?.getAttribute("data-is-muted") === "false";
    if (cam !== st.cam) {
      st.cam = cam;
      log(cam ? "cam_on" : "cam_off");
    }
    const hand = $(SEL.hand)?.getAttribute("aria-pressed") === "true";
    if (hand !== st.hand) {
      st.hand = hand;
      if (hand) t.hands++;
      log(hand ? "hand_raised" : "hand_lowered");
    }

    if (st.mic) t.mic += dt;
    if (st.cam) t.cam += dt;
    if (++beat % 10 === 0) flush(); // heartbeat ≈ every 10 s; teacher sees "live" if last_seen < 45 s
  }

  setInterval(step, 1000);
  ["visibilitychange", "blur", "focus"].forEach((e) =>
    (e === "visibilitychange" ? document : window).addEventListener(e, step),
  );
  window.addEventListener("pagehide", end);
  document.addEventListener(
    "click",
    (e) => {
      // reactions: click on an emoji in Meet's reaction tray
      const el = e.target.closest?.(SEL.emoji);
      if (el && sessionId) {
        t.reactions++;
        log("reaction", el.getAttribute("data-emoji"));
        flush();
      }
    },
    true,
  );
})();
