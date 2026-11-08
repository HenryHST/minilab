/** Bahnhofsuhr + 24h schedule window ring. */

const RING_R = 91.5;

export function parseHm(value) {
  const [h, m] = String(value || "00:00").split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function minutesToAngle24(mins) {
  return ((((mins % (24 * 60)) + 24 * 60) % (24 * 60)) / (24 * 60)) * 360;
}

function windowDurationMin(startMin, endMin) {
  if (startMin === endMin) return 24 * 60;
  if (startMin < endMin) return endMin - startMin;
  return 24 * 60 - startMin + endMin;
}

function clockPoint(cx, cy, r, angleDeg) {
  const rad = (angleDeg * Math.PI) / 180;
  return [cx + r * Math.sin(rad), cy - r * Math.cos(rad)];
}

export function describeRingArc(startMin, endMin) {
  const a0 = minutesToAngle24(startMin);
  let delta = (windowDurationMin(startMin, endMin) / (24 * 60)) * 360;
  if (delta >= 360 - 0.05) delta = 359.99;
  const large = delta > 180 ? 1 : 0;
  const [x0, y0] = clockPoint(100, 100, RING_R, a0);
  const [x1, y1] = clockPoint(100, 100, RING_R, a0 + delta);
  return `M ${x0} ${y0} A ${RING_R} ${RING_R} 0 ${large} 1 ${x1} ${y1}`;
}

export function scheduleClockShellHtml() {
  return `
    <div class="analog-clock" aria-hidden="true">
      <svg viewBox="0 0 200 200" id="scheduleClockSvg">
        <circle class="clock-bezel" cx="100" cy="100" r="99" />
        <circle class="clock-ring-track" cx="100" cy="100" r="91.5" />
        <path id="scheduleWindowArc" class="clock-window-arc" d="" />
        <g id="scheduleRingMarks"></g>
        <circle id="scheduleNowDot" class="clock-now-dot" cx="100" cy="100" r="3.2" />
        <circle class="clock-face" cx="100" cy="100" r="78" />
        <g id="scheduleClockTicks"></g>
        <g id="scheduleHourHand" class="clock-hand-group">
          <rect class="clock-hand hour" x="94.8" y="52" width="10.4" height="56" rx="1.2" />
        </g>
        <g id="scheduleMinuteHand" class="clock-hand-group">
          <rect class="clock-hand minute" x="96.9" y="32" width="6.2" height="76" rx="1" />
        </g>
        <circle class="clock-hub" cx="100" cy="100" r="4.5" />
      </svg>
    </div>`;
}

export function ensureScheduleClockMarks(root) {
  const marks = root.querySelector("#scheduleRingMarks");
  const ticks = root.querySelector("#scheduleClockTicks");
  if (!marks || !ticks) return;
  if (!marks.childElementCount) {
    const ns = "http://www.w3.org/2000/svg";
    for (let h = 0; h < 24; h++) {
      const ang = minutesToAngle24(h * 60);
      const major = h % 6 === 0;
      const [x1, y1] = clockPoint(100, 100, major ? 86.2 : 88.2, ang);
      const [x2, y2] = clockPoint(100, 100, 95.2, ang);
      const line = document.createElementNS(ns, "line");
      line.setAttribute("x1", x1);
      line.setAttribute("y1", y1);
      line.setAttribute("x2", x2);
      line.setAttribute("y2", y2);
      line.setAttribute("class", "clock-ring-tick");
      line.setAttribute("stroke-width", major ? "2.2" : "1");
      marks.appendChild(line);
      if (major) {
        const [lx, ly] = clockPoint(100, 100, 82.2, ang);
        const text = document.createElementNS(ns, "text");
        text.setAttribute("x", lx);
        text.setAttribute("y", ly);
        text.setAttribute("text-anchor", "middle");
        text.setAttribute("dominant-baseline", "middle");
        text.setAttribute("class", "clock-ring-label");
        text.textContent = String(h);
        marks.appendChild(text);
      }
    }
  }
  if (!ticks.childElementCount) {
    const ns = "http://www.w3.org/2000/svg";
    for (let i = 0; i < 60; i++) {
      const ang = (i / 60) * 360;
      const major = i % 5 === 0;
      const [x1, y1] = clockPoint(100, 100, major ? 68 : 72, ang);
      const [x2, y2] = clockPoint(100, 100, 76, ang);
      const line = document.createElementNS(ns, "line");
      line.setAttribute("x1", x1);
      line.setAttribute("y1", y1);
      line.setAttribute("x2", x2);
      line.setAttribute("y2", y2);
      line.setAttribute("class", "clock-face-tick");
      line.setAttribute("stroke-width", major ? "2" : "1");
      ticks.appendChild(line);
    }
  }
}

export function paintScheduleClock(root, { start, end, enabled, timezone }) {
  ensureScheduleClockMarks(root);
  const startMin = parseHm(start);
  const endMin = parseHm(end);
  const arc = root.querySelector("#scheduleWindowArc");
  if (arc) {
    arc.setAttribute("d", describeRingArc(startMin, endMin));
    arc.classList.toggle("is-off", !enabled);
  }
  let nowMin = 0;
  let hour = 0;
  let minute = 0;
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone || "Europe/Berlin",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).formatToParts(new Date());
    const get = (t) => Number(parts.find((p) => p.type === t)?.value || 0);
    hour = get("hour");
    minute = get("minute");
    const second = get("second");
    nowMin = hour * 60 + minute + second / 60;
  } catch {
    const n = new Date();
    hour = n.getHours();
    minute = n.getMinutes();
    nowMin = hour * 60 + minute;
  }
  const [nx, ny] = clockPoint(100, 100, RING_R, minutesToAngle24(nowMin));
  const dot = root.querySelector("#scheduleNowDot");
  if (dot) {
    dot.setAttribute("cx", nx);
    dot.setAttribute("cy", ny);
  }
  const hourAng = ((hour % 12) + minute / 60) * 30;
  const minAng = minute * 6;
  const hh = root.querySelector("#scheduleHourHand");
  const mh = root.querySelector("#scheduleMinuteHand");
  if (hh) hh.setAttribute("transform", `rotate(${hourAng} 100 100)`);
  if (mh) mh.setAttribute("transform", `rotate(${minAng} 100 100)`);
  const dig = root.querySelector("#scheduleClockDigital");
  if (dig) {
    dig.textContent = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  }
}
