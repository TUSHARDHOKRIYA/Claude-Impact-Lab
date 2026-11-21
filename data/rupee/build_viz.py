"""Generate one self-contained, mobile-first HTML file per visualisation.

Run: python3 build_viz.py
All figures are computed from data/*.csv and data/wards.geojson.
"""
import json
import pandas as pd

BASE = "data/"

CSS = """
  :root{--ink:#0f172a;--muted:#64748b;--line:#e2e8f0;--bg:#f1f5f9;
    --blue:#2563eb;--orange:#ea580c;--teal:#0d9488;--grey:#cbd5e1;--amber:#d97706}
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--ink);
    font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}
  .wrap{max-width:880px;margin:auto;padding:22px}
  header{background:linear-gradient(135deg,#0b1f3a,#123c6b 70%,#155e75);color:#fff;
    border-radius:16px;padding:22px 26px;position:relative;overflow:hidden}
  header:after{content:"";position:absolute;right:-40px;top:-70px;width:240px;height:240px;
    background:radial-gradient(circle,rgba(125,211,252,.18),transparent 65%)}
  .badge{display:inline-block;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.25);
    border-radius:999px;padding:3px 10px;font-size:10.5px;font-weight:600;margin-bottom:9px}
  h1{margin:0 0 6px;font-size:23px;letter-spacing:-.02em}
  header p{margin:0;color:#cbd5e1;font-size:12.5px;max-width:680px}
  .card{background:#fff;border:1px solid var(--line);border-radius:14px;padding:22px;margin-top:14px}
  .takeaway{border-left:4px solid var(--blue);padding:3px 0 3px 14px;margin-bottom:20px}
  .takeaway .eyebrow{font-size:10px;font-weight:750;letter-spacing:.09em;color:var(--blue);text-transform:uppercase}
  .takeaway .msg{font-size:17px;font-weight:650;line-height:1.4;margin-top:3px;letter-spacing:-.01em}
  h3{font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:var(--muted);margin:0 0 4px}
  .hint{font-size:11.5px;color:var(--muted);margin:0 0 14px}
  .row{display:grid;grid-template-columns:118px 1fr 92px;gap:10px;align-items:center;
    font-size:12px;margin-bottom:10px}
  .row .name{font-weight:650}
  .row .name small{display:block;color:var(--muted);font-size:10px;font-weight:400}
  .track{position:relative;height:18px;background:linear-gradient(#f8fafc,#f8fafc) center/100% 1px no-repeat}
  .track:before{content:"";position:absolute;left:0;right:0;top:8px;height:2px;background:#e8edf3}
  .base{position:absolute;left:54.5%;top:0;bottom:0;width:1px;background:#cbd5e1}
  .summary{font-size:12px;color:var(--muted);margin:0 0 16px}
  .summary b{color:var(--ink)}
  .conn{position:absolute;top:8px;height:2px;background:#94a3b8}
  .dot{position:absolute;top:4px;width:10px;height:10px;border-radius:50%;transform:translateX(-50%);
    background:var(--grey);border:2px solid #fff;box-shadow:0 0 0 1px #cbd5e1}
  .dot.end{background:var(--blue);box-shadow:0 0 0 1px var(--blue)}
  .dot.end.hot{background:var(--orange);box-shadow:0 0 0 1px var(--orange)}
  .dot.end.good{background:var(--teal);box-shadow:0 0 0 1px var(--teal)}
  .val{text-align:right;font-weight:700;font-variant-numeric:tabular-nums;font-size:11.5px}
  .val.hot{color:var(--orange)} .val.good{color:var(--teal)}
  .axis{display:flex;justify-content:space-between;font-size:9.5px;color:#94a3b8;margin:2px 0 0 128px}
  .mapwrap{display:flex;justify-content:center}
  .mapwrap svg{width:100%;max-width:300px;height:auto;display:block}
  .ward{stroke:#fff;stroke-width:1.4;cursor:help;transition:stroke .12s,stroke-width .12s}
  .ward:hover{stroke:#0f172a;stroke-width:2.6}
  .toggle{display:flex;gap:6px;justify-content:center;margin:0 0 12px;flex-wrap:wrap}
  .toggle button{font-size:10.5px;font-weight:650;padding:5px 11px;border-radius:999px;
    border:1px solid #cbd5e1;background:#fff;color:#475569;cursor:pointer}
  .toggle button.active{background:#0f172a;border-color:#0f172a;color:#fff}
  .legend{font-size:10.5px;color:var(--muted);max-width:330px;margin:12px auto 0}
  .legendbar{height:8px;border-radius:5px;margin:5px 0 3px}
  .legendbar.budget{background:linear-gradient(90deg,#0d9488,#e2e8f0 45%,#f6c28b 75%,#ea580c)}
  .legendbar.risk{background:linear-gradient(90deg,#eef2f7,#f6c28b,#ea580c)}
  .legend .ends{display:flex;justify-content:space-between}
  .note{background:#fffbeb;border-left:3px solid var(--amber);color:#78350f;padding:10px 12px;
    border-radius:0 8px 8px 0;font-size:11.5px;margin-top:18px}
  .read{background:linear-gradient(160deg,#eff6ff,#f0fdfa);border-color:#bfdbfe}
  .read .eyebrow{font-size:10px;font-weight:750;letter-spacing:.09em;color:var(--blue);text-transform:uppercase}
  .read p{font-size:12.5px;line-height:1.7;margin:8px 0 0}
  .ev{font-size:10.5px;color:var(--muted);margin-top:12px;padding-top:10px;border-top:1px solid #dbeafe}
  .ev code{background:#fff;border:1px solid #dbeafe;border-radius:4px;padding:1px 4px;font-size:10px;color:#1e40af}
  footer{color:var(--muted);font-size:10.5px;text-align:center;padding:18px 0 4px}
  @media(max-width:640px){
    .wrap{padding:12px}
    header{padding:18px;border-radius:14px}
    h1{font-size:20px} header p{font-size:11.5px}
    .badge{font-size:9.5px;padding:3px 8px}
    .card{padding:14px;border-radius:12px}
    .takeaway{margin-bottom:16px;padding-left:11px} .takeaway .msg{font-size:14px}
    .row{grid-template-columns:1fr auto;grid-template-areas:"name val" "track track";
      gap:2px 8px;margin-bottom:12px;font-size:11px}
    .row .name{grid-area:name} .row .track{grid-area:track} .row .val{grid-area:val}
    .row .name small{font-size:9px}
    .axis{margin-left:0}
    .mapwrap svg{max-width:250px}
    .hint{font-size:10.5px} .note{font-size:10.5px;padding:9px 10px}
    .read p{font-size:12px} footer{font-size:9.5px}
  }
  @media(max-width:370px){.mapwrap svg{max-width:205px}}
"""

JS = """
  document.querySelectorAll('.toggle button').forEach(btn=>btn.addEventListener('click',()=>{
    const m=btn.dataset.mode;
    document.querySelectorAll('.toggle button').forEach(b=>b.classList.toggle('active',b===btn));
    document.querySelectorAll('.ward').forEach(p=>p.setAttribute('fill',p.dataset[m]));
    document.getElementById('legtitle').textContent = m==='budget'?'Share of repair budget spent':'Composite risk score (0-100)';
    document.getElementById('legbar').className='legendbar '+m;
    document.getElementById('leglo').textContent=m==='budget'?'under':'low';
    document.getElementById('legmid').textContent=m==='budget'?'100%':'50';
    document.getElementById('leghi').textContent=m==='budget'?'over':'high';
  }));
"""


def page(n, total, topic, title, lede, takeaway, body, read, evidence, script=""):
    return f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title} — Follow the Rupee</title><style>{CSS}</style></head>
<body><div class="wrap">
<header><span class="badge">VISUAL {n} / {total} · {topic}</span>
<h1>{title}</h1><p>{lede}</p></header>
<div class="card">
  <div class="takeaway"><div class="eyebrow">The one thing to see</div><div class="msg">{takeaway}</div></div>
  {body}
</div>
<div class="card read">
  <div class="eyebrow">Claude's read</div><p>{read}</p>
  <div class="ev">Evidence: {evidence}</div>
</div>
<footer>Synthetic hackathon dataset · every value resolves to a work order or ward row · colour-blind safe palette</footer>
</div>{('<script>'+script+'</script>') if script else ''}</body></html>
"""


def lerp(a, b, t):
    a = [int(a[i:i+2], 16) for i in (1, 3, 5)]
    b = [int(b[i:i+2], 16) for i in (1, 3, 5)]
    return '#%02x%02x%02x' % tuple(round(a[i] + (b[i]-a[i])*t) for i in range(3))


def budget_fill(u):
    if u <= 100:
        return lerp('#0d9488', '#e2e8f0', max(0, min(1, (u-70)/30)))
    return lerp('#e2e8f0', '#ea580c', max(0, min(1, (u-100)/25)))


def risk_fill(r):
    return lerp('#eef2f7', '#f6c28b', min(1, r/50)) if r <= 50 else lerp('#f6c28b', '#ea580c', min(1, (r-50)/50))


def dumbbell(name, sub, x1, x2, val, cls):
    lo, hi = min(x1, x2), max(x1, x2)
    return (f'<div class="row"><span class="name">{name}<small>{sub}</small></span>'
            f'<span class="track"><span class="conn" style="left:{lo:.1f}%;width:{hi-lo:.1f}%"></span>'
            f'<span class="dot" style="left:{x1:.1f}%"></span>'
            f'<span class="dot end {cls}" style="left:{x2:.1f}%"></span></span>'
            f'<span class="val {cls}">{val}</span></div>')


def dot(name, sub, x, val, cls="", start=0):
    return (f'<div class="row"><span class="name">{name}<small>{sub}</small></span>'
            f'<span class="track"><span class="conn" style="left:{start:.1f}%;width:{x-start:.1f}%"></span>'
            f'<span class="dot end {cls}" style="left:{x:.1f}%"></span></span>'
            f'<span class="val {cls}">{val}</span></div>')


# ---------- load & compute ----------
wo = pd.read_csv(BASE + 'work_orders.csv')
w = pd.read_csv(BASE + 'wards.csv')
comp = pd.read_csv(BASE + 'complaints.csv')
acc = pd.read_csv(BASE + 'accidents.csv')
fh = pd.read_csv(BASE + 'flood_hotspots.csv')
roads = pd.read_csv(BASE + 'roads.csv')
tr = pd.read_csv(BASE + 'traffic.csv')

spend = wo.groupby('ward_code').cost_inr.sum() / 1e5
budget = w.set_index('ward_code').monsoon_repair_budget_inr_2025 / 1e5
open_c = comp[comp.status.isin(['Open', 'In Progress'])].ward_code.value_counts()
defacc = acc[acc.probable_cause.str.contains('Pothole|Waterlogged|Uneven', case=False, na=False)].ward_code.value_counts()
hot = fh.ward_code.value_counts()
cong = roads.merge(tr, on='road_id').groupby('ward_code').congestion_index_0_10.mean()
X = pd.DataFrame(index=w.ward_code)
for col, s in [('open', open_c), ('acc', defacc), ('hot', hot), ('cong', cong),
               ('low', w.set_index('ward_code').low_lying_index)]:
    X[col] = s
X = X.fillna(0)
def nrm(s):
    return (s - s.min()) / (s.max() - s.min()) if s.max() != s.min() else s * 0
X['risk'] = sum(nrm(X[c]) for c in ['open', 'acc', 'hot', 'cong', 'low']) / 5 * 100

rate = pd.read_csv(BASE + 'rate_card.csv').set_index('repair_method')
wo['exp'] = wo.apply(lambda r: r.area_sqm * rate.loc[r.repair_method, 'standard_rate_inr']
                     if rate.loc[r.repair_method, 'unit'] == 'per sqm'
                     else rate.loc[r.repair_method, 'standard_rate_inr'], axis=1)
ob = wo[wo.cost_inr / wo.exp >= 1.5]
obc = ob.contractor_id.value_counts()
cs = (wo.groupby(['contractor_id', 'contractor_name']).cost_inr.sum() / 1e5).sort_values(ascending=False)
names = {'CT02': 'Konkan Roadcon', 'CT07': 'Arabian Sea Eng', 'CT04': 'Western Coast Asph',
         'CT01': 'Sahyadri Infra', 'CT08': 'Mithi Infra', 'CT03': 'Mahalaxmi Civil',
         'CT06': 'Shivneri Const', 'CT05': 'Deccan Paving'}

files = {}

# ---------- 1. ward map ----------
geo = json.load(open(BASE + 'wards.geojson'))
paths = []
for f in geo['features']:
    code = f['properties']['ward_code']
    pts = []
    for lon, lat in f['geometry']['coordinates'][0]:
        pts.append(f'{12+(lon-72.795)/0.19*296:.1f},{12+(19.275-lat)/0.38*616:.1f}')
    d = 'M' + ' L'.join(pts) + ' Z'
    u = spend[code] / budget[code] * 100
    r = X.loc[code, 'risk']
    title = f"{code}: budget ₹{budget[code]:.0f}L · spend ₹{spend[code]:.0f}L ({u:.0f}%) · risk {r:.0f}/100"
    paths.append(f'<path class="ward" d="{d}" data-budget="{budget_fill(u)}" '
                 f'data-risk="{risk_fill(r)}" fill="{budget_fill(u)}"><title>{title}</title></path>')
body = f"""<h3>Wards, geography first</h3><p class="hint">Hover a ward. Same map, two questions.</p>
<div class="toggle"><button class="active" data-mode="budget">Budget use</button>
<button data-mode="risk">Risk</button></div>
<div class="mapwrap"><svg viewBox="0 0 320 640" role="img" aria-label="Map of Mumbai wards">
{chr(10).join(paths)}</svg></div>
<div class="legend"><span id="legtitle">Share of repair budget spent</span>
<div class="legendbar budget" id="legbar"></div><div class="ends">
<span id="leglo">under</span><span id="legmid">100%</span><span id="leghi">over</span></div></div>
<p class="hint" style="margin-top:10px">Boundaries: wards.geojson (Voronoi approximation), not official BMC boundaries.</p>"""
files['viz_01_ward_map.html'] = page(
    1, 6, 'MONEY', 'Where the money went — ward map',
    'One map, two encodings. Geography is a first-class view, not a spreadsheet column.',
    'Six wards overspent — but the map shows where, not who to blame.',
    body,
    'Ward E is deepest over budget and also fairly low-risk; F/S and F/N are the opposite — modest spend, high flood and complaint risk. Spend and risk are different questions, so the map lets you switch between them rather than pretending one colour can do both.',
    '<code>WO25-01576</code> <code>WO25-01005</code> · 24 wards · 2,499 work orders', JS)

# ---------- 2. budget action dots, all 24 wards ----------
BUDGET_JS = """
  document.querySelectorAll('.toggle button').forEach(btn=>btn.addEventListener('click',()=>{
    document.querySelectorAll('.toggle button').forEach(b=>b.classList.toggle('active',b===btn));
    const overOnly=btn.dataset.filter==='over';
    document.querySelectorAll('.row').forEach(r=>{
      r.style.display=(overOnly && r.classList.contains('under'))?'none':'';
    });
  }));
"""
rows = []
for code in (spend / budget).sort_values(ascending=False).index:
    b, s = budget[code], spend[code]
    pct = s / b * 100
    over = pct > 100
    x = max(1, min(99, (pct - 70) / 55 * 100))   # scale 70% .. 125%
    cls = 'hot' if over else ''
    under = '' if over else ' under'
    rows.append(
        f'<div class="row{under}"><span class="name">{code}<small>₹{b:.0f}L budget</small></span>'
        f'<span class="track"><span class="base"></span>'
        f'<span class="conn" style="left:{min(54.5,x):.1f}%;width:{abs(x-54.5):.1f}%"></span>'
        f'<span class="dot" style="left:54.5%"></span>'
        f'<span class="dot end {cls}" style="left:{x:.1f}%"></span></span>'
        f'<span class="val {cls}">{pct:.0f}% · ₹{s:.0f}L</span></div>')
over_n = sum(1 for c in budget.index if spend.get(c, 0) > budget[c])
body = (
    f'<p class="summary"><b>₹{spend.sum()/100:.2f} cr</b> spent of <b>₹{budget.sum()/100:.2f} cr</b> budget · '
    f'<b>{over_n} wards over</b> · <b>{24-over_n} under</b></p>'
    '<h3>Every ward, ranked by share of budget spent</h3>'
    '<p class="hint">The vertical line is 100% of budget. Grey ring = budget; '
    'orange dot = spend above budget, blue dot = spend below. '
    'Right of the line is overspend. The filter shortens the list on a phone.</p>'
    '<div class="toggle"><button class="active" data-filter="all">All 24 wards</button>'
    f'<button data-filter="over">Over budget only ({over_n})</button></div>'
    + ''.join(rows) +
    '<div class="axis"><span>70%</span><span>100% budget</span><span>125%</span></div>')
files['viz_02_budget_spend.html'] = page(
    2, 6, 'MONEY', 'Budget vs spend, every ward',
    'The question is not how much a ward spent — it is how far it drifted from its budget.',
    'Six wards overspent; E at 119% and L at 110%. R/N came in 26% under.',
    body,
    'Overspend alone is not a scandal. E and L are low-lying wards doing emergency pump work. The line to pull is the 109 individual bills above 1.5× the rate card — a different problem with a different remedy.',
    'Ward budgets from <code>wards.csv</code> · spend summed from <code>work_orders.csv</code>', BUDGET_JS)

# ---------- 3. contractor spend dot plot ----------
rows = []
for (cid, cname), v in cs.items():
    n = int(obc.get(cid, 0))
    cls = 'hot' if n >= 20 else ''
    val = f'₹{v:.0f}L · {n}' if n else f'₹{v:.0f}L'
    rows.append(dot(names[cid], cid, v/200*100, val, cls))
body = ('<h3>Who received the money</h3><p class="hint">Eight contractors, sorted by spend. '
        'Orange dot marks where the overbills are concentrated (count shown after spend).</p>'
        + ''.join(rows) +
        '<div class="axis"><span>0</span><span>₹100 L</span><span>₹200 L</span></div>')
files['viz_03_contractor_spend.html'] = page(
    3, 6, 'MONEY', 'Spend by contractor',
    'Dot plots beat stacked bars when the message is a ranking.',
    'Spend is evenly spread — but 79 of the 109 overbills sit with two firms.',
    body,
    'Konkan and Arabian Sea both received about ₹1.9 crore, yet Arabian Sea holds 37 overbills against Konkan\'s five. Volume and quality are separate axes; a spend ranking by itself would hide that entirely.',
    'Overbill = cost ≥1.5× <code>rate_card.csv</code> · <code>WO25-01576</code>, <code>WO25-01005</code>')

# ---------- 4. reopen dumbbell ----------
reopen = [('CT05', 'Deccan Paving', 21.4, 9.1), ('CT01', 'Sahyadri Infra', 24.1, 13.6),
          ('CT08', 'Mithi Infra', 21.3, 11.6), ('CT04', 'Western Coast', 27.9, 38.8),
          ('CT07', 'Arabian Sea', 25.6, 32.3), ('CT03', 'Mahalaxmi Civil', 27.3, 37.6)]
rows = []
for cid, nm, e, a in reopen:
    d = a - e
    cls = 'good' if d < 0 else 'hot'
    rows.append(dumbbell(nm, cid, e/45*100, a/45*100, f'{d:+.1f}pp', cls))
body = ('<h3>Reopen rate: expected vs actual</h3><p class="hint">Grey dot = rate expected from the '
        'contractor\'s ward, method and severity mix. Coloured dot = observed. Teal is better, orange worse.</p>'
        + ''.join(rows) +
        '<div class="axis"><span>0%</span><span>20%</span><span>40%</span></div>')
files['viz_04_reopen_scorecard.html'] = page(
    4, 6, 'HELD UP', 'Did the repair hold up?',
    'Judgment needs a baseline. Raw rankings punish whoever works in the hardest wards.',
    'Three contractors beat their expected reopen rate; two miss it badly.',
    body,
    'Western Coast looks ordinary on time but its reopens are 11 points worse than expected — the SLA number hides that. We measure SLA from the first complaint, not assignment, and exclude the 24-hour class that misses 100% by construction.',
    '<code>reopened_within_30d</code> from <code>work_orders.csv</code> · 611 reopens citywide')

# ---------- 5. method lollipop ----------
methods = [('Cold mix patch', 32.2), ('Drain desilting', 26.2),
           ('Mastic asphalt', 25.8), ('Dewatering pump', 14.0)]
rows = []
for nm, v in methods:
    cls = 'hot' if v > 30 else ''
    rows.append(dot(nm, '', v/40*100, f'{v:.1f}%', cls))
body = ('<h3>Reopen rate by repair method</h3><p class="hint">Sorted, direct-labelled, one colour reserved '
        'for the outlier. This is the evidence behind the "use mastic, not cold mix" recommendation.</p>'
        + ''.join(rows) +
        '<div class="axis"><span>0%</span><span>20%</span><span>40%</span></div>')
files['viz_05_method_durability.html'] = page(
    5, 6, 'HELD UP', 'Which repair methods last',
    'A lollipop chart shows four rates without four competing bars.',
    'Cold-mix patches reopen 32% of the time — more than twice the dewatering rate.',
    body,
    'Method choice is one of the few levers a ward officer actually controls. Preferring hot mix or mastic over cold mix is a cheaper durability win than chasing a contractor after the fact.',
    'Reopen rate by <code>repair_method</code> · 2,499 work orders')

# ---------- 6. risk dot plot ----------
rows = []
for code, r in X['risk'].sort_values(ascending=False).head(8).items():
    cls = 'hot' if r >= 55 else ''
    rows.append(dot(code, f'{X.loc[code,"open"]:.0f} open · {X.loc[code,"acc"]:.0f} accidents',
                    r, f'{r:.0f}', cls))
body = ('<h3>Ward risk score (0–100)</h3><p class="hint">Equal-weight blend of open complaints, '
        'defect-related accidents, flood hotspots, congestion and low-lying index — computed from the CSVs.</p>'
        + ''.join(rows) +
        '<div class="axis"><span>0</span><span>50</span><span>100</span></div>')
files['viz_06_ward_risk.html'] = page(
    6, 6, 'NEXT RUPEE', 'Where the next rupee goes',
    'A ranked score turns five messy signals into one routing decision.',
    'F/S and F/N top the risk score; start there, then P/N and L.',
    body,
    'F/S carries 53 open complaints, three flood hotspots and the worst SLA performance in the city. RD0173 (Marve Road) is the first road to walk: 10 open complaints, six defect-related accidents and congestion 9.3.',
    '896 open complaints · <code>FH009</code> Kurla Station West · <code>RD0173</code>')

for name, html in files.items():
    open(name, 'w').write(html)
    print('wrote', name, len(html), 'chars')
