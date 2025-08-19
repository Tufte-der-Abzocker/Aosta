
// Load data
async function loadData(){
  const res = await fetch('data.json');
  return await res.json();
}

function categoryColor(cat){
  switch(cat){
    case 'Wandern': return '#5cc8ff';
    case 'MTB': return '#a0e86f';
    case 'Essen': return '#ffd166';
    case 'Kultur': return '#c6a8ff';
    default: return '#d4d4d4';
  }
}

function createMarker(poi, map){
  const icon = L.divIcon({
    className: 'custom-marker',
    html: `<div style="background:${categoryColor(poi.category)};width:12px;height:12px;border-radius:50%;border:2px solid #111"></div>`,
    iconSize: [16,16]
  });
  const m = L.marker([poi.coords[0], poi.coords[1]], {icon}).addTo(map);
  m.bindPopup(`<b>${poi.name}</b><br><span class="small">${poi.category}</span><br>
  <a target="_blank" rel="noopener" href="https://maps.google.com/?q=${poi.coords[0]},${poi.coords[1]}">In Google Maps öffnen</a>`);
  return m;
}

function cardHTML(poi){
  const links = (poi.links||[]).map(l=>`<a class="btn" target="_blank" rel="noopener" href="${l.url}">${l.label}</a>`).join('');
  const kv = `
    <div class="kv">
      ${poi.distance_km?`<div>🗺️ ${poi.distance_km}</div>`:''}
      ${poi.up_m?`<div>⛰️ ${poi.up_m}</div>`:''}
      ${poi.tech?`<div>⚙️ ${poi.tech}</div>`:''}
    </div>`;
  return `
  <div class="card" id="${poi.id}">
    ${poi.img?`<img class="img" src="${poi.img}" alt="${poi.name}">`:''}
    <div class="body">
      <div class="badge">${poi.category}</div>
      <h3 style="margin:.4rem 0 .2rem">${poi.name}</h3>
      <p>${poi.summary}</p>
      <p class="small">${poi.details||''}</p>
      ${kv}
      <div style="margin-top:.5rem">
        <a class="btn" href="#" data-goto="${poi.id}">🔎 Auf Karte anzeigen</a>
        ${links}
      </div>
    </div>
  </div>`;
}

(async function init(){
  const data = await loadData();

  // Map
  const map = L.map('map', {scrollWheelZoom: true, tap: true}).setView([45.73,7.32], 9);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '&copy; OpenStreetMap'
  }).addTo(map);

  // Markers and list
  const listEl = document.getElementById('list');
  const markers = [];
  data.poi.forEach(p=>{
    const m = createMarker(p, map);
    markers.push({id:p.id, marker:m, cat:p.category});
  });

  // Render list
  function renderList(filterCat){
    listEl.innerHTML = '';
    data.poi
      .filter(p => !filterCat || p.category===filterCat)
      .forEach(p => listEl.insertAdjacentHTML('beforeend', cardHTML(p)));
  }
  renderList();

  // Fit map to markers
  const group = L.featureGroup(markers.map(mm=>mm.marker));
  map.fitBounds(group.getBounds().pad(0.2));

  // Filter buttons
  const cats = Array.from(new Set(data.poi.map(p=>p.category)));
  const filterEl = document.getElementById('filter');
  const allBtn = document.createElement('a');
  allBtn.href='#'; allBtn.className='btn'; allBtn.textContent='Alle';
  allBtn.onclick = (e)=>{e.preventDefault(); renderList();};
  filterEl.appendChild(allBtn);
  cats.forEach(c=>{
    const b = document.createElement('a');
    b.href='#'; b.className='btn'; b.textContent=c;
    b.onclick=(e)=>{e.preventDefault(); renderList(c);};
    filterEl.appendChild(b);
  });

  // Scroll-to-map and fly to marker
  listEl.addEventListener('click', (e)=>{
    const a = e.target.closest('a[data-goto]');
    if(!a) return;
    e.preventDefault();
    const id = a.getAttribute('data-goto');
    const mm = markers.find(m=>m.id===id);
    if(mm){
      map.flyTo(mm.marker.getLatLng(), 12, {duration: 0.7});
      mm.marker.openPopup();
      window.scrollTo({top: document.getElementById('map').getBoundingClientRect().top + window.scrollY - 80, behavior: 'smooth'});
    }
  });
})();
