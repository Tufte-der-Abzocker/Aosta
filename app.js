
const SECTIONS = [
  {id:'overview', label:'Überblick & Anreise', icon:'🗺️'},
  {id:'hikes', label:'Wanderungen', icon:'🥾'},
  {id:'mtb', label:'MTB-Touren', icon:'🚵'},
  {id:'food', label:'Essen & Trinken', icon:'🍝'},
  {id:'culture', label:'Kultur & Schlechtwetter', icon:'🏰'},
  {id:'stays', label:'Unterkünfte', icon:'🏡'},
  {id:'plan', label:'10-Tage-Plan', icon:'📅'},
  {id:'tips', label:'Praktische Tipps', icon:'🧭'},
  {id:'about', label:'Quellen & Lizenzen', icon:'ℹ️'}
];
let GUIDE = null;
let deferredPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
});

document.addEventListener('DOMContentLoaded', async () => {
  // nav
  const nav = document.getElementById('nav');
  SECTIONS.forEach(s => {
    const a = document.createElement('a');
    a.href = `#${s.id}`;
    a.className = 'navlink';
    a.innerHTML = `<span>${s.icon}</span><span>${s.label}</span>`;
    nav.appendChild(a);
  });
  // data
  const res = await fetch('assets/data/guide.json');
  GUIDE = await res.json();
  render();
  window.addEventListener('hashchange', render);
  document.getElementById('search').addEventListener('input', onSearch);
  // install
  const installBtn = document.getElementById('installBtn');
  installBtn.addEventListener('click', async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
    } else {
      alert('Öffne diese Seite im Browser (Chrome/Safari/Edge) und wähle „Zum Startbildschirm hinzufügen“.');
    }
  });
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js');
});

function render(){
  const hash = location.hash.replace('#','') || 'overview';
  document.querySelectorAll('.navlink').forEach(a => {
    a.classList.toggle('active', a.getAttribute('href') === `#${hash}`);
  });
  const root = document.getElementById('content');
  switch(hash){
    case 'overview': return renderOverview(root);
    case 'hikes': return renderList(root, GUIDE.hikes, 'Wanderungen');
    case 'mtb': return renderList(root, GUIDE.mtb, 'MTB-Touren');
    case 'food': return renderFood(root);
    case 'culture': return renderList(root, GUIDE.culture, 'Kultur & Schlechtwetter');
    case 'stays': return renderStays(root);
    case 'plan': return renderPlan(root);
    case 'tips': return renderTips(root);
    case 'about': return renderAbout(root);
  }
}

function renderOverview(root){
  root.innerHTML = `
    <h1>Familienurlaub im Aostatal</h1>
    <div class="badges">
      <span class="badge">Zeitraum: ${GUIDE.meta.dates}</span>
      <span class="badge">Basis: ${GUIDE.meta.base_suggestion}</span>
      <span class="badge">Fokus: Panoramen, kinderfreundlich</span>
    </div>
    <p>${GUIDE.meta.intro}</p>
    <div id="map" class="mapwrap" role="application" aria-label="Übersichtskarte"></div>
    <div class="kpi">
      <div>🥾 ${GUIDE.hikes.length} Wanderungen</div>
      <div>🚵 ${GUIDE.mtb.length} MTB-Touren</div>
      <div>🍝 ${GUIDE.food.length} Restauranttipps</div>
      <div>🏰 ${GUIDE.culture.length} Kultur-Highlights</div>
    </div>
    <hr/>
    <p><strong>Hinweis zu Karten:</strong> Diese Web-App lädt Kartenkacheln aus dem Internet (OpenStreetMap). Texte/Fotos sind offline verfügbar, Karten nur online. Für jede Tour findet ihr Buttons wie „Auf Karte öffnen“ (öffnet euer Navi/Maps) und „Mehr Infos“.</p>
  `;
  const map = L.map('map').setView([45.74, 7.33], 9);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {maxZoom: 18, attribution:'&copy; OpenStreetMap'}).addTo(map);
  // Show key POIs
  const allPoints = [...GUIDE.hikes, ...GUIDE.mtb, ...GUIDE.culture].slice(0, 80);
  allPoints.forEach(p => {
    if(!p.start || !p.start.lat) return;
    const m = L.marker([p.start.lat, p.start.lon]).addTo(map);
    m.bindPopup(`<strong>${p.name}</strong><br>${p.area || ''}<br><a href="#${p.type==='hike'?'hikes':'mtb'}" class="button link">Anzeigen</a>`);
  });
}

function renderList(root, items, title){
  root.innerHTML = `<h1>${title}</h1><div class="cards"></div>`;
  const wrap = root.querySelector('.cards');
  items.forEach((it, idx) => {
    const div = document.createElement('div');
    div.className = 'card';
    const img = it.images?.[0] || GUIDE.meta.placeholder;
    div.innerHTML = `
      <img src="${img}" alt="${it.name}">
      <div>
        <h4>${it.name}</h4>
        <div class="meta">${it.area || ''} • ${it.stats || ''}</div>
        <p>${it.summary}</p>
        <div class="badges">${(it.tags||[]).map(t=>`<span class="badge">${t}</span>`).join('')}</div>
        <div>
          <button class="button" data-idx="${idx}" data-kind="${it.type}" onclick="openDetail('${it.type}','${idx}')">Details & Karte</button>
          ${it.links?.map(l=>`<a class="button link" href="${l.url}" target="_blank" rel="noopener">${l.label}</a>`).join('') || ''}
        </div>
      </div>
    `;
    wrap.appendChild(div);
  });
}

function openDetail(kind, idx){
  const list = kind==='hike' ? GUIDE.hikes : (kind==='mtb' ? GUIDE.mtb : GUIDE.culture);
  const it = list[+idx];
  const root = document.getElementById('content');
  root.innerHTML = `
    <button class="button" onclick="history.back()">← Zurück</button>
    <h1>${it.name}</h1>
    <div class="badges">
      ${(it.tags||[]).map(t=>`<span class="badge">${t}</span>`).join('')}
    </div>
    <div class="kpi">
      ${it.stats?`<div>📏 ${it.stats}</div>`:''}
      ${it.start?.name?`<div>🎯 Start: ${it.start.name}</div>`:''}
      ${it.food?.length?`<div>🍽️ Einkehr: ${it.food.map(f=>f.name).join(', ')}</div>`:''}
    </div>
    <div class="mapwrap" id="map"></div>
    <p>${it.description || it.summary}</p>
    ${it.images?.length?`<div class="cards">`+it.images.map(u=>`<div class="card"><img src="${u}" alt=""><div><div class="meta">Bildquelle siehe „Quellen & Lizenzen“</div></div></div>`).join('')+`</div>`:''}
    <div style="margin-top:10px; display:flex; gap:8px; flex-wrap:wrap">
      ${it.start?.lat?`<a class="button primary" target="_blank" rel="noopener" href="https://www.google.com/maps?q=${it.start.lat},${it.start.lon}">Auf Karte öffnen</a>`:''}
      ${(it.links||[]).map(l=>`<a class="button" target="_blank" rel="noopener" href="${l.url}">${l.label}</a>`).join('')}
    </div>
    <hr/>
    <div class="notice">${GUIDE.meta.licensing_note}</div>
  `;
  const map = L.map('map').setView([it.start?.lat||45.74, it.start?.lon||7.33], it.zoom||12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {maxZoom: 18, attribution:'&copy; OpenStreetMap'}).addTo(map);
  if (it.start?.lat){
    const mm = L.marker([it.start.lat, it.start.lon]).addTo(map);
    mm.bindPopup(`<strong>${it.start.name||it.name}</strong>`).openPopup();
  }
  (it.pois||[]).forEach(p=>{
    const m = L.marker([p.lat, p.lon]).addTo(map);
    m.bindPopup(`<strong>${p.name}</strong>`);
  });
  if (it.line){
    const poly = L.polyline(it.line, {weight:4, opacity:.8}).addTo(map);
    try{ map.fitBounds(poly.getBounds(), {padding:[20,20]}); }catch(e){}
  }
}

function renderFood(root){
  root.innerHTML = `<h1>Essen & Trinken</h1><div class="cards"></div>`;
  const wrap = root.querySelector('.cards');
  GUIDE.food.forEach(f => {
    const div = document.createElement('div');
    div.className = 'card';
    div.innerHTML = `
      <img src="${f.image||GUIDE.meta.placeholder}" alt="${f.name}">
      <div>
        <h4>${f.name}</h4>
        <div class="meta">${f.address||''}</div>
        <p>${f.notes||''}</p>
        <div class="badges">${(f.tags||[]).map(t=>`<span class="badge">${t}</span>`).join('')}</div>
        <div>
          ${f.map?`<a class="button primary" target="_blank" rel="noopener" href="${f.map}">Auf Karte öffnen</a>`:''}
          ${f.website?`<a class="button" target="_blank" rel="noopener" href="${f.website}">Website</a>`:''}
        </div>
      </div>`;
    wrap.appendChild(div);
  });
}

function renderStays(root){
  root.innerHTML = `<h1>Unterkünfte (Agriturismo & Ferienwohnungen)</h1><div class="cards"></div>`;
  const wrap = root.querySelector('.cards');
  GUIDE.stays.forEach(s => {
    const div = document.createElement('div');
    div.className = 'card';
    div.innerHTML = `
      <img src="${s.image||GUIDE.meta.placeholder}" alt="${s.name}">
      <div>
        <h4>${s.name}</h4>
        <div class="meta">${s.area||''} • ${s.type}</div>
        <p>${s.notes||''}</p>
        <div>
          ${s.map?`<a class="button primary" target="_blank" rel="noopener" href="${s.map}">Auf Karte öffnen</a>`:''}
          ${s.website?`<a class="button" target="_blank" rel="noopener" href="${s.website}">Website</a>`:''}
        </div>
      </div>`;
    wrap.appendChild(div);
  });
}

function renderPlan(root){
  root.innerHTML = `<h1>Vorschlag: 10-Tage-Plan</h1>`;
  GUIDE.plan.forEach(day => {
    const box = document.createElement('div');
    box.className = 'section';
    box.style.marginTop = '10px';
    box.innerHTML = `
      <h3>Tag ${day.day}: ${day.title}</h3>
      <div class="badges">
        <span class="badge">${day.base}</span>
        <span class="badge">${day.theme}</span>
      </div>
      <p>${day.summary}</p>
      <div>${day.links?.map(l=>`<a class="button link" target="_blank" rel="noopener" href="${l.url}">${l.label}</a>`).join('')||''}</div>
    `;
    root.appendChild(box);
  });
}

function renderTips(root){
  root.innerHTML = `
    <h1>Praktische Tipps</h1>
    ${GUIDE.tips.map(t=>`<div class="card"><div><h4>${t.title}</h4><p>${t.text}</p></div></div>`).join('')}
  `;
}

function renderAbout(root){
  root.innerHTML = `
    <h1>Quellen & Lizenzen</h1>
    <p>${GUIDE.meta.licensing_note}</p>
    <ul>
      ${GUIDE.attribution.map(a=>`<li>${a}</li>`).join('')}
    </ul>
  `;
}

function onSearch(e){
  const q = e.target.value.toLowerCase().trim();
  if(!q){ render(); return; }
  const results = [...GUIDE.hikes, ...GUIDE.mtb, ...GUIDE.culture, ...GUIDE.food];
  const filtered = results.filter(x => (x.name||'').toLowerCase().includes(q) || (x.summary||'').toLowerCase().includes(q) || (x.area||'').toLowerCase().includes(q));
  const root = document.getElementById('content');
  root.innerHTML = `<h1>Suche: "${q}"</h1><div class="cards"></div>`;
  const wrap = root.querySelector('.cards');
  filtered.forEach(it => {
    const div = document.createElement('div');
    div.className = 'card';
    const img = it.images?.[0] || it.image || GUIDE.meta.placeholder;
    div.innerHTML = `
      <img src="${img}" alt="${it.name}">
      <div>
        <h4>${it.name}</h4>
        <div class="meta">${it.area||''}</div>
        <p>${it.summary||''}</p>
        <button class="button" onclick="location.hash='#${it.type==='hike'?'hikes':(it.type==='mtb'?'mtb':'culture')}'">Kategorie öffnen</button>
      </div>`;
    wrap.appendChild(div);
  });
}
