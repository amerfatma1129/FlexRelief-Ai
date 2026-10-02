// FLEXRELIEF AI — DIGITAL TWIN / CODEPEN
// SOFTWARE SIMULATION ONLY — no electrical stimulation is generated.

const $ = id => document.getElementById(id);

const emgControl = $("emgControl");
const hrControl = $("hrControl");
const tempControl = $("tempControl");
const motionControl = $("motionControl");

const emgValue = $("emgValue");
const hrValue = $("hrValue");
const tempValue = $("tempValue");
const motionValue = $("motionValue");

const emgControlValue = $("emgControlValue");
const hrControlValue = $("hrControlValue");
const tempControlValue = $("tempControlValue");
const motionControlValue = $("motionControlValue");

const emgBar = $("emgBar");
const hrBar = $("hrBar");
const tempBar = $("tempBar");
const motionBar = $("motionBar");

const stateElement = $("state");
const confidenceText = $("confidenceText");
const confidenceBar = $("confidenceBar");
const rms = $("rms");
const activity = $("activity");
const artifact = $("artifact");

const safetyBox = $("safetyBox");
const safetyStatus = $("safetyStatus");
const safetyReason = $("safetyReason");
const safetyIcon = $("safetyIcon");

const checkConfidence = $("checkConfidence");
const checkMotion = $("checkMotion");
const checkTemp = $("checkTemp");

const treatmentValue = $("treatmentValue");
const treatmentStatus = $("treatmentStatus");
const treatmentText = $("treatmentText");
const responseBar = $("responseBar");

const treatmentCircle =
  document.querySelector(".treatment-circle");


/* =========================
   SAFETY LIMITS
========================= */

const SAFETY = {
  maxMotion: 18,
  minTemperature: 30,
  maxTemperature: 39.5,
  minConfidence: 0.50
};


/* =========================
   SESSION STATE
========================= */

let cycles = 0;
let blocked = 0;
let packetCount = 0;
let activeSeconds = 0;
let confidenceSum = 0;
let lastState = "NORMAL";

let sessionStart = Date.now();
let lastTick = Date.now();
let timelineKey = "";

const history = [];


/* =========================
   EDGE AI
========================= */

function runAI(emg, hr, temp, motion) {

  let state = "NORMAL";
  let confidence = 0.91;
  let request = 0;

  if (motion > SAFETY.maxMotion) {

    return {
      state: "ARTIFACT",
      confidence: 0.94,
      request: 0
    };

  }

  if (emg < 1) {

    state = "NORMAL";
    confidence = 0.91;
    request = 0;

  } else if (emg < 2.2) {

    state = "ACTIVE";
    confidence = 0.84;
    request = 20;

  } else if (emg < 3.5) {

    state = "SUSTAINED";
    confidence = 0.89;
    request = 40;

  } else {

    state = "SUSTAINED";
    confidence = 0.94;
    request = 55;

  }

  if (hr > 110) {
    confidence -= 0.04;
  } else if (hr < 55) {
    confidence -= 0.02;
  }

  if (temp > 39) {
    confidence -= 0.15;
  } else if (temp < 30) {
    confidence -= 0.10;
  }

  confidence = Math.max(
    0,
    Math.min(confidence, 0.99)
  );

  return {
    state,
    confidence,
    request
  };
}


/* =========================
   SAFETY CONTROLLER
========================= */

function runSafety(data, ai) {

  let allowed = true;

  let reason =
    "All software safety conditions passed.";

  if (data.motion > SAFETY.maxMotion) {

    allowed = false;

    reason =
      "Motion artifact detected. Treatment response blocked.";

  } else if (ai.confidence < SAFETY.minConfidence) {

    allowed = false;

    reason =
      "AI confidence too low. Treatment response blocked.";

  } else if (data.temp > SAFETY.maxTemperature) {

    allowed = false;

    reason =
      "Temperature safety interlock activated.";

  } else if (data.temp < SAFETY.minTemperature) {

    allowed = false;

    reason =
      "Temperature is outside the safe simulation range.";

  }

  return {
    allowed,
    reason,
    request: allowed ? ai.request : 0
  };
}


/* =========================
   UI HELPERS
========================= */

function setBar(el, p) {

  if (!el) return;

  el.style.width =
    Math.max(
      0,
      Math.min(p, 100)
    ) + "%";
}


function updateTreatmentCircle(v) {

  if (!treatmentCircle) return;

  const a = v * 3.6;

  treatmentCircle.style.background =
    `radial-gradient(
      circle,
      #0c1d2e 57%,
      transparent 58%
    ),
    conic-gradient(
      #55c8ff 0deg,
      #55c8ff ${a}deg,
      #122638 ${a}deg
    )`;
}


/* =========================
   EXPLAINABLE AI
========================= */

function updateExplainable(data, ai, safety) {

  $("decisionText").textContent =

    ai.state === "NORMAL"

      ? "EMG activity is below the active-state threshold, so the model keeps the system in monitoring mode."

      : ai.state === "ARTIFACT"

      ? "Motion is above the artifact threshold, so the model refuses to request treatment."

      : `The model classified the pattern as ${ai.state.toLowerCase()} based primarily on EMG activity and signal context.`;


  $("reasonEmg").textContent =
    data.emg < 1
      ? "Low"
      : data.emg < 2.2
      ? "Moderate"
      : data.emg < 3.5
      ? "Elevated"
      : "High";


  $("reasonDuration").textContent =
    data.emg < 1
      ? "Short"
      : data.emg < 2.2
      ? "Developing"
      : "Sustained";


  $("reasonMotion").textContent =
    data.motion > SAFETY.maxMotion
      ? "Artifact"
      : "Clear";


  $("reasonTemp").textContent =
    data.temp < SAFETY.minTemperature ||
    data.temp > SAFETY.maxTemperature
      ? "Interlock"
      : "Normal";


  $("aiConclusion").textContent =

    !safety.allowed

      ? "Safety controller overrides the AI request and blocks the simulated response."

      : ai.request === 0

      ? "No treatment request — continue sensing and monitoring."

      : `Simulated adaptive response requested at ${ai.request}% based on the detected state.`;
}


/* =========================
   CLOSED-LOOP TIMELINE
========================= */

function addTimeline(ai, safety, data) {

  const key =
    `${ai.state}-${safety.allowed}-${Math.round(data.emg * 10)}-${Math.round(data.motion)}`;

  if (key === timelineKey) return;

  timelineKey = key;

  const box = $("eventTimeline");

  if (box.querySelector(".empty-timeline")) {
    box.innerHTML = "";
  }

  const t =
    new Date().toLocaleTimeString(
      [],
      {
        minute: "2-digit",
        second: "2-digit"
      }
    );

  const item =
    document.createElement("div");

  item.className = "timeline-item";

  item.innerHTML = `
    <time>${t}</time>

    <div>
      <b>${ai.state}</b>
      →
      ${safety.allowed
        ? "Safety pass"
        : "Safety block"}
      →
      ${
        safety.request
          ? `response ${safety.request}%`
          : "no response"
      }
    </div>
  `;

  box.prepend(item);

  while (box.children.length > 7) {
    box.lastChild.remove();
  }
}


/* =========================
   SESSION ANALYTICS
========================= */

function updateSession(ai, safety) {

  const now = Date.now();

  const dt =
    Math.min(
      2,
      (now - lastTick) / 1000
    );

  lastTick = now;

  cycles++;

  confidenceSum += ai.confidence;

  lastState = ai.state;

  if (
    ai.state !== "NORMAL" &&
    ai.state !== "ARTIFACT"
  ) {
    activeSeconds += dt;
  }

  if (!safety.allowed) {
    blocked++;
  }

  packetCount += 2;


  $("aiCycles").textContent =
    cycles;

  $("blockedEvents").textContent =
    blocked;

  $("avgConfidence").textContent =
    Math.round(
      confidenceSum / cycles * 100
    ) + "%";

  $("lastState").textContent =
    lastState;

  $("packetCount").textContent =
    packetCount;

  $("cycleCount").textContent =
    "CYCLE " + cycles;
}


/* =========================
   SESSION CLOCK
========================= */

function updateClock() {

  const sec =
    Math.floor(
      (Date.now() - sessionStart) / 1000
    );

  const fmt = s =>
    String(
      Math.floor(s / 60)
    ).padStart(2, "0")
    +
    ":"
    +
    String(
      Math.floor(s % 60)
    ).padStart(2, "0");


  $("sessionTime").textContent =
    fmt(sec);

  $("activeTime").textContent =
    fmt(activeSeconds);
}


/* =========================
   MAIN UI UPDATE
========================= */

function updateUI() {

  if (
    !emgControl ||
    !hrControl ||
    !tempControl ||
    !motionControl
  ) {
    return;
  }


  const data = {

    emg: +emgControl.value,

    hr: +hrControl.value,

    temp: +tempControl.value,

    motion: +motionControl.value

  };


  /* SENSOR VALUES */

  emgValue.textContent =
    data.emg.toFixed(2);

  hrValue.textContent =
    Math.round(data.hr);

  tempValue.textContent =
    data.temp.toFixed(1);

  motionValue.textContent =
    data.motion.toFixed(1);


  /* CONTROL VALUES */

  emgControlValue.textContent =
    data.emg.toFixed(2);

  hrControlValue.textContent =
    Math.round(data.hr);

  tempControlValue.textContent =
    data.temp.toFixed(1) + " °C";

  motionControlValue.textContent =
    data.motion.toFixed(1);


  /* SENSOR BARS */

  setBar(
    emgBar,
    data.emg / 5 * 100
  );

  setBar(
    hrBar,
    (data.hr - 50) / 80 * 100
  );

  setBar(
    tempBar,
    (data.temp - 28) / 14 * 100
  );

  setBar(
    motionBar,
    data.motion / 25 * 100
  );


  /* AI + SAFETY */

  const ai =
    runAI(
      data.emg,
      data.hr,
      data.temp,
      data.motion
    );

  const safety =
    runSafety(
      data,
      ai
    );


  /* AI UI */

  stateElement.textContent =
    ai.state;

  confidenceText.textContent =
    Math.round(
      ai.confidence * 100
    ) + "%";

  setBar(
    confidenceBar,
    ai.confidence * 100
  );

  rms.textContent =
    data.emg.toFixed(2);

  activity.textContent =
    data.emg < 1
      ? "LOW"
      : data.emg < 2.2
      ? "MEDIUM"
      : "HIGH";

  artifact.textContent =
    data.motion > SAFETY.maxMotion
      ? "YES"
      : "NO";


  /* SAFETY UI */

  safetyBox.className =
    "safety-box " +
    (
      safety.allowed
        ? "safe"
        : "danger"
    );

  safetyStatus.textContent =
    safety.allowed
      ? "SAFETY PASS"
      : "SAFETY BLOCKED";

  safetyIcon.textContent =
    safety.allowed
      ? "✓"
      : "!";

  safetyReason.textContent =
    safety.reason;


  checkConfidence.textContent =
    ai.confidence >= SAFETY.minConfidence
      ? "✓ PASS"
      : "✕ BLOCK";

  checkMotion.textContent =
    data.motion <= SAFETY.maxMotion
      ? "✓ CLEAR"
      : "✕ ARTIFACT";

  checkTemp.textContent =
    data.temp >= SAFETY.minTemperature &&
    data.temp <= SAFETY.maxTemperature
      ? "✓ NORMAL"
      : "✕ INTERLOCK";


  /* TREATMENT */

  const treatment =
    safety.request;

  treatmentValue.textContent =
    treatment;

  setBar(
    responseBar,
    treatment
  );

  updateTreatmentCircle(
    treatment
  );


  treatmentStatus.textContent =

    !safety.allowed

      ? "BLOCKED"

      : treatment === 0

      ? "STANDBY"

      : "ADAPTIVE RESPONSE";


  treatmentText.textContent =

    !safety.allowed

      ? "The independent safety controller prevented a treatment response."

      : treatment === 0

      ? "No treatment request. The system is continuously monitoring."

      : `Edge AI detected ${ai.state.toLowerCase()} muscle activity and generated a simulated adaptive response of ${treatment}%.`;


  /* ADVANCED FEATURES */

  updateExplainable(
    data,
    ai,
    safety
  );

  updateSession(
    ai,
    safety
  );

  addTimeline(
    ai,
    safety,
    data
  );

  drawWaveform(
    data.emg,
    data.motion
  );
}


/* =========================
   CONTROL LISTENERS
========================= */

const controls = [
  emgControl,
  hrControl,
  tempControl,
  motionControl
];

controls.forEach(
  c =>
    c &&
    c.addEventListener(
      "input",
      updateUI
    )
);


/* =========================
   DEMO SCENARIOS
========================= */

document
  .querySelectorAll(".scenario-btn")
  .forEach(btn => {

    btn.addEventListener(
      "click",
      () => {

        const s =
          btn.dataset.scenario;

        const presets = {

          normal:
            [.6, 74, 32.4, 3.5],

          active:
            [1.7, 78, 32.5, 5],

          sustained:
            [3.0, 82, 32.7, 5],

          artifact:
            [2.8, 84, 32.6, 22],

          safety:
            [3.2, 118, 40.2, 6]

        };


        const v =
          presets[s];

        if (!v) return;


        [
          emgControl,
          hrControl,
          tempControl,
          motionControl
        ]
          .forEach(
            (c, i) => {
              c.value = v[i];
            }
          );


        updateUI();
      }
    );

  });


/* =========================
   EMG WAVEFORM
========================= */

const canvas =
  $("emgCanvas");

const ctx =
  canvas
    ? canvas.getContext("2d")
    : null;


function drawWaveform(
  emg,
  motion
) {

  if (!canvas || !ctx) return;


  const dpr =
    devicePixelRatio || 1;

  const w =
    canvas.clientWidth;

  const h =
    canvas.clientHeight;


  if (
    canvas.width !== w * dpr ||
    canvas.height !== h * dpr
  ) {

    canvas.width =
      w * dpr;

    canvas.height =
      h * dpr;

    ctx.scale(
      dpr,
      dpr
    );
  }


  ctx.clearRect(
    0,
    0,
    w,
    h
  );


  /* GRID */

  ctx.strokeStyle =
    "rgba(85,200,255,.08)";

  ctx.lineWidth = 1;


  for (
    let x = 0;
    x < w;
    x += 40
  ) {

    ctx.beginPath();

    ctx.moveTo(
      x,
      0
    );

    ctx.lineTo(
      x,
      h
    );

    ctx.stroke();
  }


  for (
    let y = 20;
    y < h;
    y += 35
  ) {

    ctx.beginPath();

    ctx.moveTo(
      0,
      y
    );

    ctx.lineTo(
      w,
      y
    );

    ctx.stroke();
  }


  /* WAVEFORM */

  ctx.strokeStyle =
    "#55c8ff";

  ctx.lineWidth = 2;

  ctx.beginPath();


  for (
    let x = 0;
    x < w;
    x++
  ) {

    const time =
      Date.now() / 170;


    const amp =
      7 +
      emg * 9 +
      (
        motion > 18
          ? 12
          : 0
      );


    const noise =
      (
        Math.sin(
          x * 1.7 + time
        ) * .35

        +

        Math.sin(
          x * .31 -
          time * 1.7
        ) * .25

      ) * amp;


    const spike =
      (
        Math.sin(
          x * .09 + time
        )

        *

        Math.sin(
          x * .31 +
          time * .4
        )

      ) * amp;


    const y =
      h / 2 +
      noise +
      spike;


    if (x === 0) {

      ctx.moveTo(
        x,
        y
      );

    } else {

      ctx.lineTo(
        x,
        y
      );

    }

  }


  ctx.stroke();


  /* SIGNAL INFO */

  $("signalPeak").textContent =
    (
      emg *
      (
        motion > 18
          ? 1.8
          : 1.25
      )
    ).toFixed(2);


  $("signalQuality").textContent =
    motion > 18
      ? "POOR"
      : emg > 3.5
      ? "HIGH"
      : "GOOD";
}


/* =========================
   LIVE UPDATE
========================= */

setInterval(
  () => {

    updateClock();

    drawWaveform(
      +(emgControl?.value || 1.2),
      +(motionControl?.value || 5.2)
    );

  },
  250
);


setInterval(
  () => {

    if (
      emgControl &&
      !emgControl.matches(":active")
    ) {

      emgValue.textContent =
        Math.max(
          0,
          +emgControl.value +
          Math.sin(
            Date.now() / 700
          ) * .025
        ).toFixed(2);

    }

  },
  300
);


/* =========================
   INITIALIZATION
========================= */

updateUI();

updateClock();
