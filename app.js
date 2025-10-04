
/* app.js - versión standalone (no fetch) */
const STATE = {
  events: [],
  filtered: [],
  view: 'grid',
  page: 1,
  perPage: 6,
  query: '',
  category: '',
  city: '',
  sort: 'date_asc'
};

const SELECTORS = {
  eventsContainer: document.getElementById('eventsContainer'),
  resultsInfo: document.getElementById('resultsInfo'),
  searchInput: document.getElementById('searchInput'),
  categoryFilter: document.getElementById('categoryFilter'),
  cityFilter: document.getElementById('cityFilter'),
  sortSelect: document.getElementById('sortSelect'),
  viewToggle: document.getElementById('viewToggle'),
  pagination: document.getElementById('pagination'),
  detailView: document.getElementById('detailView'),
  catalogView: document.getElementById('catalogView'),
  cartCount: document.getElementById('cartCount'),
  openCartBtn: document.getElementById('openCartBtn'),
  cartDialog: document.getElementById('cartDialog'),
  cartItems: document.getElementById('cartItems'),
  cartSummary: document.getElementById('cartSummary'),
  checkoutForm: document.getElementById('checkoutForm'),
  closeCart: document.getElementById('closeCart'),
  openFavBtn: document.getElementById('openFavBtn')
};

/* localStorage helpers */
const LS = {
  keyCart: 'mvp_cart_v1',
  keyFav: 'mvp_fav_v1',
  loadCart(){ try{return JSON.parse(localStorage.getItem(this.keyCart)||'[]')}catch{return []} },
  saveCart(d){ localStorage.setItem(this.keyCart, JSON.stringify(d)) },
  loadFav(){ try{return JSON.parse(localStorage.getItem(this.keyFav)||'[]')}catch{return []} },
  saveFav(d){ localStorage.setItem(this.keyFav, JSON.stringify(d)) }
};

let CART = LS.loadCart();
let FAV = new Set(LS.loadFav());

/* embedded data - same structure as data/events.json */
async function loadEvents(){
  const res = await fetch('data/events.json').then(r=>r.json()).catch(()=>null);
  let json = res;
  if(!json){
    // fallback to embedded copy (should not happen since file exists in this package)
    json = []; 
  }
  STATE.events = json.map(e=>({
    ...e,
    datetime: new Date(e.datetime || e.date || e.datetime),
  }));
  populateFilters();
  applyStateFromURL();
  applyFilters();
}

/* populate filters */
function populateFilters(){
  const cats = Array.from(new Set(STATE.events.map(e=>e.category))).sort();
  const cities = Array.from(new Set(STATE.events.map(e=>e.city))).sort();
  SELECTORS.categoryFilter.innerHTML = '<option value=\"\">Todas las categorías</option>'+cats.map(c=>`<option value=\"${c}\">${c}</option>`).join('');
  SELECTORS.cityFilter.innerHTML = '<option value=\"\">Todas las ciudades</option>'+cities.map(c=>`<option value=\"${c}\">${c}</option>`).join('');
}

/* URL state */
function applyStateFromURL(){
  const hash = location.hash.replace('#/catalog?','');
  if(!hash) return;
  const params = new URLSearchParams(hash);
  STATE.query = params.get('query')||'';
  STATE.category = params.get('cat')||'';
  STATE.city = params.get('city')||'';
  STATE.sort = params.get('sort')||STATE.sort;
  STATE.page = parseInt(params.get('page')||STATE.page,10);
  STATE.view = params.get('view')||STATE.view;
  SELECTORS.searchInput.value = STATE.query;
  SELECTORS.categoryFilter.value = STATE.category;
  SELECTORS.cityFilter.value = STATE.city;
  SELECTORS.sortSelect.value = STATE.sort;
  SELECTORS.viewToggle.textContent = STATE.view==='grid'?'Grid':'Lista';
}

function pushStateToURL(){
  const params = new URLSearchParams();
  if(STATE.query) params.set('query', STATE.query);
  if(STATE.category) params.set('cat', STATE.category);
  if(STATE.city) params.set('city', STATE.city);
  if(STATE.sort) params.set('sort', STATE.sort);
  if(STATE.page) params.set('page', STATE.page);
  if(STATE.view) params.set('view', STATE.view);
  location.hash = '/catalog?'+params.toString();
}

/* filtering & sorting */
function applyFilters(){
  let list = STATE.events.slice();
  const q = STATE.query.trim().toLowerCase();
  if(q){
    list = list.filter(e=>(e.title+' '+(e.artists?e.artists.join(' '):'')+' '+e.city).toLowerCase().includes(q));
  }
  if(STATE.category) list = list.filter(e=>e.category===STATE.category);
  if(STATE.city) list = list.filter(e=>e.city===STATE.city);
  if(STATE.sort==='date_asc') list.sort((a,b)=> new Date(a.datetime)-new Date(b.datetime));
  if(STATE.sort==='date_desc') list.sort((a,b)=> new Date(b.datetime)-new Date(a.datetime));
  if(STATE.sort==='price_asc') list.sort((a,b)=> (a.priceFrom||0)-(b.priceFrom||0));
  if(STATE.sort==='price_desc') list.sort((a,b)=> (b.priceFrom||0)-(a.priceFrom||0));
  if(STATE.sort==='pop_desc') list.sort((a,b)=> (b.popularity||0)-(a.popularity||0));
  STATE.filtered = list;
  renderList();
  pushStateToURL();
}

/* render list with pagination */
function renderList(){
  SELECTORS.eventsContainer.innerHTML = '';
  const start = (STATE.page-1)*STATE.perPage;
  const pageItems = STATE.filtered.slice(start, start+STATE.perPage);
  if(pageItems.length===0){
    SELECTORS.resultsInfo.textContent = 'No hay resultados. Limpia los filtros.';
    SELECTORS.pagination.innerHTML = '';
    return;
  }
  SELECTORS.resultsInfo.textContent = `Mostrando ${start+1}-${start+pageItems.length} de ${STATE.filtered.length} resultados`;
  pageItems.forEach(ev=>{
    const card = document.createElement('article');
    card.className = 'card';
    card.setAttribute('role','listitem');
    card.innerHTML = `
      <img alt="Portada ${ev.title}" loading="lazy" src="${ev.image || (ev.images && ev.images[0]) || ''}" onerror="this.style.opacity=0.5">
      <div class="title">${ev.title}</div>
      <div class="meta">${ev.city} • ${ev.venue||''}</div>
      <div class="meta">${new Date(ev.datetime).toLocaleString()}</div>
      <div class="meta">Desde ${ev.currency||''} ${ev.priceFrom||0}</div>
      <div style="display:flex;gap:8px;margin-top:6px">
        <button class="btn" data-id="${ev.id}" data-action="view">Ver detalle</button>
        <button class="btn" data-id="${ev.id}" data-action="fav">${FAV.has(ev.id)?'Quitar':'Favorito'}</button>
        <button class="btn" data-id="${ev.id}" data-action="add">Agregar</button>
      </div>`;
    SELECTORS.eventsContainer.appendChild(card);
  });
  renderPagination();
}

function renderPagination(){
  const total = STATE.filtered.length;
  const pages = Math.max(1, Math.ceil(total/STATE.perPage));
  SELECTORS.pagination.innerHTML = '';
  for(let i=1;i<=pages;i++){
    const b = document.createElement('button');
    b.textContent = i;
    if(i===STATE.page) b.disabled = true;
    b.addEventListener('click', ()=>{ STATE.page=i; applyFilters(); });
    SELECTORS.pagination.appendChild(b);
  }
}

/* card actions */
SELECTORS.eventsContainer.addEventListener('click', e=>{
  const btn = e.target.closest('button');
  if(!btn) return;
  const id = btn.dataset.id;
  const action = btn.dataset.action;
  if(action==='view') location.hash = '#/event/'+id;
  if(action==='fav') toggleFav(id);
  if(action==='add') addToCart(id,1);
});

/* detail view */
function showDetail(id){
  const ev = STATE.events.find(x=>x.id===id);
  if(!ev) return;
  SELECTORS.catalogView.hidden = true;
  SELECTORS.detailView.hidden = false;
  SELECTORS.detailView.innerHTML = `
    <button id="backBtn">← Volver</button>
    <h2>${ev.title}</h2>
    <img alt="${ev.title}" src="${ev.image||''}" style="max-width:100%;height:auto;border-radius:8px">
    <div>${ev.city} — ${ev.venue||''} — ${new Date(ev.datetime).toLocaleString()}</div>
    <div><strong>Artistas:</strong> ${(ev.artists||[]).join(', ')}</div>
    <div><strong>Precio:</strong> ${ev.currency||''} ${ev.priceFrom||0}</div>
    <p>${ev.description||''}</p>
    <div style="margin-top:12px">
      <button id="favDetail">${FAV.has(ev.id)?'Quitar favorito':'Favorito'}</button>
      <input id="qtyDetail" type="number" min="1" value="1" style="width:80px;margin-left:8px">
      <button id="addDetail">Agregar al carrito</button>
    </div>
  `;
  document.getElementById('backBtn').addEventListener('click', ()=>{ SELECTORS.catalogView.hidden=false; SELECTORS.detailView.hidden=true; location.hash = '#/catalog'; });
  document.getElementById('favDetail').addEventListener('click', ()=>{ toggleFav(ev.id); document.getElementById('favDetail').textContent = FAV.has(ev.id)?'Quitar favorito':'Favorito'; });
  document.getElementById('addDetail').addEventListener('click', ()=>{ const q = parseInt(document.getElementById('qtyDetail').value,10)||1; addToCart(ev.id,q); });
}

/* favorites */
function toggleFav(id){ if(FAV.has(id)) FAV.delete(id); else FAV.add(id); LS.saveFav(Array.from(FAV)); applyFilters(); }

/* cart */
function addToCart(id, qty=1){
  const ev = STATE.events.find(x=>x.id===id);
  if(!ev) return alert('Evento no encontrado');
  if(ev.soldOut) return alert('Evento agotado');
  const entry = CART.find(c=>c.id===id);
  const newQty = (entry?entry.qty:0)+qty;
  if(newQty> (ev.stock||100)) return alert('No hay suficiente disponibilidad');
  if(entry) entry.qty = newQty; else CART.push({id,qty});
  LS.saveCart(CART); updateCartUI(); alert('Añadido al carrito');
}

function updateCartUI(){ SELECTORS.cartCount.textContent = CART.reduce((s,i)=>s+i.qty,0); }
updateCartUI();

SELECTORS.openCartBtn.addEventListener('click', ()=>{ renderCart(); SELECTORS.cartDialog.showModal(); });
SELECTORS.closeCart.addEventListener('click', ()=>{ SELECTORS.cartDialog.close(); });

function renderCart(){
  SELECTORS.cartItems.innerHTML = '';
  if(CART.length===0){ SELECTORS.cartItems.textContent='Carrito vacío'; SELECTORS.cartSummary.textContent=''; return; }
  let total=0;
  CART.forEach(item=>{
    const ev = STATE.events.find(e=>e.id===item.id);
    const div = document.createElement('div');
    div.innerHTML = `<strong>${ev.title}</strong> — ${ev.currency||''} ${ev.priceFrom||0} x <input type="number" min="1" value="${item.qty}" data-id="${item.id}" style="width:60px"> <button data-id="${item.id}" class="remove">Eliminar</button>`;
    SELECTORS.cartItems.appendChild(div);
    total += (ev.priceFrom||0)*item.qty;
  });
  SELECTORS.cartSummary.textContent = `Total: ${CART.length?STATE.events.find(e=>e.id===CART[0].id).currency:''} ${total.toFixed(2)}`;
}

SELECTORS.cartItems.addEventListener('click', e=>{ if(e.target.classList.contains('remove')){ const id=e.target.dataset.id; CART=CART.filter(c=>c.id!==id); LS.saveCart(CART); renderCart(); updateCartUI(); } });
SELECTORS.cartItems.addEventListener('change', e=>{ const input=e.target; if(input.tagName!=='INPUT') return; const id=input.dataset.id; const qty=parseInt(input.value,10)||1; const ev=STATE.events.find(x=>x.id===id); if(qty>(ev.stock||100)){ alert('No hay stock suficiente'); input.value=ev.stock; return; } const entry=CART.find(c=>c.id===id); if(entry) entry.qty=qty; LS.saveCart(CART); renderCart(); updateCartUI(); });

SELECTORS.checkoutForm.addEventListener('submit', e=>{ e.preventDefault(); const form=new FormData(e.target); const order={ id:`EVT-${Date.now()}`, buyer:Object.fromEntries(form.entries()), items:CART.slice(), total:SELECTORS.cartSummary.textContent }; localStorage.setItem('last_order', JSON.stringify(order)); CART=[]; LS.saveCart(CART); renderCart(); updateCartUI(); SELECTORS.cartDialog.close(); alert('Compra simulada. Código: '+order.id); });

/* bindings */
SELECTORS.searchInput.addEventListener('input', e=>{ STATE.query=e.target.value; STATE.page=1; applyFilters(); });
SELECTORS.categoryFilter.addEventListener('change', e=>{ STATE.category=e.target.value; STATE.page=1; applyFilters(); });
SELECTORS.cityFilter.addEventListener('change', e=>{ STATE.city=e.target.value; STATE.page=1; applyFilters(); });
SELECTORS.sortSelect.addEventListener('change', e=>{ STATE.sort=e.target.value; applyFilters(); });
SELECTORS.viewToggle.addEventListener('click', ()=>{ STATE.view=STATE.view==='grid'?'list':'grid'; SELECTORS.eventsContainer.className = `events ${STATE.view}`; SELECTORS.viewToggle.textContent = STATE.view==='grid'?'Grid':'Lista'; pushStateToURL(); });

SELECTORS.openFavBtn.addEventListener('click', ()=>{ const favIds=Array.from(FAV); if(favIds.length===0) return alert('No hay favoritos'); const items=STATE.events.filter(e=>FAV.has(e.id)); STATE.filtered=items; STATE.page=1; renderList(); });

/* routing */
window.addEventListener('hashchange', ()=>{ const h=location.hash; if(h.startsWith('#/event/')){ const id=h.replace('#/event/',''); showDetail(id); } else if(h.startsWith('#/catalog')){ SELECTORS.catalogView.hidden=false; SELECTORS.detailView.hidden=true; applyStateFromURL(); applyFilters(); } });

/* initialize - load events json from file (this package includes it) */
fetch('data/events.json').then(r=>r.json()).then(data=>{ STATE.events = data.map(e=>({...e, datetime: e.datetime || e.date || e.datetime})); populateFilters(); applyStateFromURL(); applyFilters(); }).catch(err=>{ console.warn('No se pudo cargar data/events.json, revisa ruta.'); });

/* accessibility */
window.addEventListener('keydown', e=>{ if(e.key==='Escape'){ if(SELECTORS.cartDialog.open) SELECTORS.cartDialog.close(); } });
