/* Constantes */
const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
const qs = sel => document.querySelector(sel);
const qsa = sel => document.querySelectorAll(sel);

/* Multiplicateurs par mois (12 valeurs) */
const seasonMaps = {
  flat: Array(12).fill(1),
  light: [0.9, 0.95, 1, 1.05, 1.1, 1.05, 1, 0.95, 0.9, 1, 1.05, 1.1],
  strong: [0.6, 0.8, 1, 1.1, 1.3, 1.4, 1.2, 1, 0.8, 0.7, 0.6, 0.9]
};

/* Lecture / écriture localStorage */
const LS_KEY = 'forecast_builder_v1';
function saveState(state) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Erreur lors de la sauvegarde de l’état :', e);
  }
}
function loadState() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY)) || null;
  } catch (e) {
    console.error('Erreur lors du chargement de l’état :', e);
    return null;
  }
}

/* Formatage euro simple */
function fmt(n) {
  return (typeof n !== 'number' || !isFinite(n)) ? '-' : n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
}

/* Validation des entrées utilisateur */
function validateInputs() {
  const inputs = qsa('input[type="number"]');
  inputs.forEach(input => {
    if (input.value < 0) {
      input.value = 0; // Empêche les valeurs négatives
    }
  });
}

/* Lecture des Inputs */
function readInputs() {
  validateInputs();
  return {
    targetAnnual: +qs('#targetAnnual').value || 0,
    pricingMode: qs('#pricingMode .active').dataset.mode,
    avgPrice: +qs('#avgPrice').value || 0,
    leadsBase: +qs('#leadsBase').value || 0,
    leadsGrowth: (+qs('#leadsGrowth').value || 0) / 100,
    rateMeeting: (+qs('#rateMeeting').value || 0) / 100,
    rateShow: (+qs('#rateShow').value || 0) / 100,
    rateClose: (+qs('#rateClose').value || 0) / 100,
    saleCycleDays: +qs('#saleCycle').value || 0,
    seasonality: qs('#seasonality').value,
    adSpend: +qs('#adSpend').value || 0,
    cpl: +qs('#cpl').value || 0,
    fixedCost: +qs('#fixedCost').value || 0,
    varCostClient: +qs('#varCostClient').value || 0
  };
}

/* Moteur de calcul principal */
function computeForecast(params) {
  const sMap = seasonMaps[params.seasonality] || seasonMaps.flat;
  const delayMonths = Math.round(params.saleCycleDays / 30);

  let leads = params.leadsBase;
  const months = [];
  let cumulative = 0;

  for (let m = 0; m < 12; m++) {
    if (m > 0) leads = Math.max(0, leads * (1 + params.leadsGrowth));
    let leadsFromAds = params.cpl > 0 ? Math.floor(params.adSpend / params.cpl) : null;
    let leadsAdjusted = leadsFromAds !== null && leadsFromAds > 0 ? leadsFromAds : Math.round(leads);
    leadsAdjusted = Math.round(leadsAdjusted * sMap[m]);

    const meetings = Math.round(leadsAdjusted * params.rateMeeting);
    const shows = Math.round(meetings * params.rateShow);
    const clients = Math.round(shows * params.rateClose);

    const revenuePerClient = params.pricingMode === 'rec' ? params.avgPrice * 12 : params.avgPrice;
    const monthlyRevenue = clients * revenuePerClient;

    cumulative += monthlyRevenue;

    months.push({ monthIndex: m, leads: leadsAdjusted, meetings, shows, clients, monthlyRevenue, cumulative });
  }

  const totalRevenue = months.reduce((s, it) => s + it.monthlyRevenue, 0);
  return { months, totalRevenue };
}

/* Les recommandations */
function recommendations(params, summary) {
  const recs = [];
  const gap = params.targetAnnual - summary.totalRevenue;
  if (gap <= 0) {
    recs.push({ type: 'success', text: `Bravo — vous dépassez l'objectif de ${fmt(Math.abs(gap))}` });
  } else {
    const revPerClient = params.pricingMode === 'rec' ? params.avgPrice * 12 : params.avgPrice;
    const clientsNeeded = Math.ceil(gap / revPerClient);
    const monthlyLeadsNeeded = Math.ceil(clientsNeeded / (params.rateMeeting * params.rateShow * params.rateClose + 1e-9));
    recs.push({ type: 'warning', text: `Écart à l'objectif: ${fmt(gap)}. Il faudrait ~${clientsNeeded} clients supplémentaires sur l'année.` });
    recs.push({ type: 'tip', text: `Augmentez les leads mensuels d'environ ${monthlyLeadsNeeded} (ou améliorez taux de conversion/prix).` });
    if (params.adSpend > 0 && params.cpl > 0) {
      const extraAdPerMonth = monthlyLeadsNeeded * params.cpl;
      recs.push({ type: 'tip', text: `Budget pub estimé pour générer ces leads: ~${fmt(extraAdPerMonth)}/mois (CPL à ${fmt(params.cpl)})` });
    }
  }

  const totalFixed = params.fixedCost * 12;
  const totalVariable = summary.months.reduce((s, it) => s + it.clients * params.varCostClient, 0);
  const estProfit = summary.totalRevenue - totalFixed - totalVariable - (params.adSpend * 12);
  recs.push({ type: 'info', text: `Coûts fixes annuels: ${fmt(totalFixed)} · Coûts variables annuels: ${fmt(totalVariable)} · Profit estimé: ${fmt(estProfit)}` });
  return recs;
}

/* Render table */
function render(summary, params) {
  qs('#kpiAnnual').textContent = fmt(summary.totalRevenue);
  const gap = summary.totalRevenue - params.targetAnnual;
  qs('#kpiGap').textContent = (gap >= 0 ? '+' : '') + fmt(gap);
  const avgLeads = Math.round(summary.months.reduce((s, m) => s + m.leads, 0) / 12);
  qs('#kpiLeads').textContent = avgLeads + ' /mois';

  const tbody = qs('#tableBody');
  tbody.innerHTML = '';
  summary.months.forEach((m, i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${monthNames[(new Date()).getMonth() + i % 12]}</td>
      <td class="right">${m.leads}</td>
      <td class="right">${m.meetings}</td>
      <td class="right">${m.shows}</td>
      <td class="right">${m.clients}</td>
      <td class="right">${fmt(m.monthlyRevenue)}</td>
      <td class="right">${fmt(m.cumulative)}</td>`;
    tbody.appendChild(tr);
  });

  const recs = recommendations(params, summary);
  const s = qs('#summary');
  s.innerHTML = '';
  recs.forEach(r => {
    const p = document.createElement('p');
    p.className = 'muted';
    p.style.marginTop = '8px';
    p.textContent = r.text;
    s.appendChild(p);
  });

  drawChart(summary, params);
}

/* Utilisation de drawChart */
function drawChart(summary, params) {
  const canvas = qs('#chart');
  const dpi = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  canvas.width = w * dpi;
  canvas.height = h * dpi;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpi, dpi);

  ctx.clearRect(0, 0, w, h);

  const pad = 36;
  const chartW = w - pad * 2;
  const chartH = h - pad * 2;
  const months = summary.months;
  const maxVal = Math.max(params.targetAnnual / 12, ...months.map(m => m.monthlyRevenue));

  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = pad + (chartH / 4) * i;
    ctx.beginPath();
    ctx.moveTo(pad, y);
    ctx.lineTo(pad + chartW, y);
    ctx.stroke();
  }

  const barW = chartW / (months.length * 1.6);
  months.forEach((m, i) => {
    const x = pad + (i * (chartW / months.length) + barW * 0.2);
    const hBar = maxVal ? (m.monthlyRevenue / maxVal) * chartH : 0;
    const y = pad + chartH - hBar;

    const grad = ctx.createLinearGradient(x, y, x, y + hBar);
    grad.addColorStop(0, 'rgba(96,165,250,0.9)');
    grad.addColorStop(1, 'rgba(110,231,183,0.6)');
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, barW, hBar);
  });

  const cumMax = Math.max(params.targetAnnual, months[months.length - 1].cumulative);
  ctx.beginPath();
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(99,102,241,0.95)';
  months.forEach((m, i) => {
    const cx = pad + (i * (chartW / months.length)) + barW / 2 + 6;
    const cy = pad + chartH - (m.cumulative / cumMax) * chartH;
    if (i === 0) ctx.moveTo(cx, cy);
    else ctx.lineTo(cx, cy);
  });
  ctx.stroke();

  ctx.beginPath();
  ctx.setLineDash([4, 6]);
  ctx.strokeStyle = 'rgba(251,113,133,0.9)';
  ctx.lineWidth = 1.5;
  const objY = pad + chartH - (params.targetAnnual / cumMax) * chartH;
  ctx.moveTo(pad, objY);
  ctx.lineTo(pad + chartW, objY);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.font = '12px system-ui';
  ctx.fillText('CA mensuel', pad, 12);
  ctx.fillText('Cumul CA', pad + 110, 12);
  ctx.fillStyle = 'rgba(251,113,133,0.9)';
  ctx.fillText('Objectif annuel', pad + 210, 12);
}

/* initialisation */
function attach() {
  qsa('#pricingMode button').forEach(btn => btn.addEventListener('click', e => {
    qsa('#pricingMode button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    qs('#avgPrice').previousElementSibling && (qs('#avgPrice').previousElementSibling.textContent = btn.dataset.mode === 'rec' ? 'MRR moyen (€) (x12 retenu)' : 'Prix moyen par client (€)');
    computeAndRender();
  }));

  qsa('input, select').forEach(el => el.addEventListener('input', () => { throttleCompute(); }));

  qs('#calcBtn').addEventListener('click', computeAndRender);
  qs('#saveBtn').addEventListener('click', () => { saveState(readInputs()); alert('Paramètres sauvegardés localement.'); });
  qs('#resetBtn').addEventListener('click', () => { if (confirm('Réinitialiser les paramètres par défaut ?')) { localStorage.removeItem(LS_KEY); location.reload(); } });

  qs('#scenario1').addEventListener('click', () => { qs('#leadsGrowth').value = +qs('#leadsGrowth').value + 20; computeAndRender(); });
  qs('#scenario2').addEventListener('click', () => { qs('#rateClose').value = Math.min(100, +qs('#rateClose').value + 5); computeAndRender(); });

  document.addEventListener('keydown', (e) => { if (e.key === 'Enter') { computeAndRender(); } });

  const st = loadState();
  if (st) {
    Object.keys(st).forEach(k => { const el = qs('#' + k); if (el) el.value = st[k]; });
    if (st.pricingMode) {
      qsa('#pricingMode button').forEach(b => b.classList.remove('active'));
      const active = qs(`#pricingMode button[data-mode="${st.pricingMode}"]`);
      if (active) active.classList.add('active');
    }
  }

  computeAndRender();
}

let tthrottle = null;
function throttleCompute() { if (tthrottle) clearTimeout(tthrottle); tthrottle = setTimeout(() => { computeAndRender(); tthrottle = null; }, 420); }

function computeAndRender() {
  const params = readInputs();
  const summary = computeForecast(params);
  render(summary, params);
}

attach();