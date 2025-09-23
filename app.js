/* app.js - versión corregida y consistente
   - carga items, discounts y settings desde JSON
   - dinámico: categorías por SKU, submenú, búsqueda, ordenar en vivo
   - sidebar con X, overlay con blur y bloqueo fondo
   - modal fullscreen: imagen cubre toda la pantalla, info abajo, bloquea scroll
   - precios con descuento destacados y % igual color badge
*/

const ITEMS_URL = 'items.json';
const DISCOUNTS_URL = 'discounts.json';
const SETTINGS_URL = 'settings.json';

/* DOM */
const grid = document.getElementById('grid');
const searchInput = document.getElementById('searchInput');
const sortSelect = document.getElementById('sortSelect');

const sidebar = document.getElementById('sidebar');
const menuToggle = document.getElementById('menuToggle');
const closeMenu = document.getElementById('closeMenu');
const overlay = document.getElementById('overlay');
const submenuCategories = document.getElementById('submenuCategories');

const productModal = document.getElementById('productModal');
const modalImage = document.getElementById('modalImage');
const modalTitle = document.getElementById('modalTitle');
const modalDesc = document.getElementById('modalDesc');
const modalSizes = document.getElementById('modalSizes');
const modalPrice = document.getElementById('modalPrice');
const modalActions = document.getElementById('modalActions');
const modalClose = document.getElementById('modalClose');
const modalPrev = document.getElementById('modalPrev');
const modalNext = document.getElementById('modalNext');

const noResults = document.getElementById('noResults');
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

/* state */
let items = [];
let discounts = [];
let settings = { instagram:'#', whatsapp:'', currency:'S/' };
let products = []; // items enriched with _discount if applies
let filtered = [];
let categories = [];
let activeCategory = null;
let currentIdx = 0;

/* scroll lock refcount */
let scrollLockCount = 0;
let scrollYBefore = 0;

/* helpers */
const currencyFormat = v => {
  try { return new Intl.NumberFormat('es-PE',{style:'currency',currency:'PEN'}).format(Number(v)); }
  catch(e){ return `${settings.currency} ${Number(v).toFixed(2)}`; }
};
const escapeHtml = s => s ? String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') : '';

/* prevent pinch/zoom */
function preventZoom(){
  window.addEventListener('gesturestart', e => e.preventDefault());
  document.addEventListener('touchstart', e => { if (e.touches && e.touches.length > 1) e.preventDefault(); }, { passive:false });
  window.addEventListener('wheel', e => { if (e.ctrlKey) e.preventDefault(); }, { passive:false });
}

/* fetch helper */
async function fetchJson(url){
  const r = await fetch(url, {cache:'no-cache'});
  if (!r.ok) throw new Error(`${url} not found (${r.status})`);
  return r.json();
}

/* init */
async function init(){
  try {
    [items, discounts, settings] = await Promise.all([fetchJson(ITEMS_URL), fetchJson(DISCOUNTS_URL), fetchJson(SETTINGS_URL)]);
  } catch (err) {
    console.error('Error cargando JSONs', err);
    grid.innerHTML = `<div style="padding:20px;color:#777">Error cargando datos. Revisa la consola.</div>`;
    return;
  }

  applyDiscounts();
  buildCategories();
  renderCategories();
  applyFiltersAndRender();
  attachUI();
  preventZoom();
}

/* apply discounts */
function applyDiscounts(){
  const now = new Date();
  const map = new Map((discounts||[]).map(d => [d.sku, d]));
  products = (items||[]).map(it => {
    const d = map.get(it.sku);
    if (d && d.percentage && d.expires && new Date(d.expires) >= now) {
      const before = Number(it.price);
      const after = +(before * (1 - Number(d.percentage)/100)).toFixed(2);
      return { ...it, _discount: { percent: d.percentage, before, after, expires: d.expires } };
    } else {
      return { ...it, _discount: null };
    }
  });
}

/* build category prefixes */
function buildCategories(){
  const s = new Set();
  products.forEach(p => { if (p.sku && p.sku.length) s.add(p.sku.trim().charAt(0).toUpperCase()); });
  categories = Array.from(s).sort();
}

/* label map */
function labelFor(prefix){
  const map = { C:'Camisetas', Z:'Zapatillas', A:'Accesorios', P:'Pantalones', S:'Sudaderas', B:'Bolsos', R:'Relojes' };
  return map[prefix] || prefix;
}

/* render categories submenu */
function renderCategories(){
  submenuCategories.innerHTML = '';
  if (!categories.length) {
    submenuCategories.innerHTML = '<div style="color:rgba(255,255,255,0.6)">No hay categorías</div>';
    return;
  }
  categories.forEach(pref => {
    const btn = document.createElement('button');
    btn.className = 'cat-btn';
    btn.textContent = `${labelFor(pref)} (${pref})`;
    btn.addEventListener('click', ()=>{ activeCategory = pref; document.getElementById('searchInput').value=''; applyFiltersAndRender(); closeSidebar(); });
    submenuCategories.appendChild(btn);
  });
}

/* filtering, searching, sorting */
function applyFiltersAndRender(){
  const q = (searchInput.value || '').trim().toLowerCase();
  const promoWords = ['oferta','ofertas','promo','promocion','promociones','descuento','descuentos'];

  let list = products.slice();

  if (activeCategory) list = list.filter(p => (p.sku||'').startsWith(activeCategory));

  if (promoWords.includes(q)) {
    list = list.filter(p => !!p._discount);
  } else if (q) {
    list = list.filter(p => (p.title||'').toLowerCase().includes(q) || (p.description||'').toLowerCase().includes(q) || (p.sku||'').toLowerCase().includes(q));
  }

  const mode = sortSelect.value;
  list.sort((a,b) => {
    const pa = a._discount ? a._discount.after : Number(a.price);
    const pb = b._discount ? b._discount.after : Number(b.price);
    if (mode === 'price_asc') return pa - pb;
    if (mode === 'price_desc') return pb - pa;
    if (mode === 'name_az') return (a.title||'').localeCompare(b.title||'');
    if (mode === 'name_za') return (b.title||'').localeCompare(a.title||'');
    return 0;
  });

  filtered = list;
  renderGrid(list);
}

/* render product cards */
function renderGrid(list){
  grid.innerHTML = '';
  if (!list.length) {
    noResults.hidden = false;
    return;
  } else {
    noResults.hidden = true;
  }

  list.forEach((p, idx) => {
    const card = document.createElement('article');
    card.className = 'card';
    card.dataset.index = idx;

    const hasDiscount = !!p._discount;
    const img = p.image || 'https://picsum.photos/id/1014/1200/1200';

    card.innerHTML = `
      <div class="card-media">
        <img src="${img}" alt="${escapeHtml(p.title)}" loading="lazy" />
        ${ hasDiscount ? `<div class="badge">-${p._discount.percent}%</div>` : '' }
      </div>
      <div class="card-body">
        <div class="card-title">${escapeHtml(p.title)}</div>
        <div class="card-desc">${escapeHtml(p.description || '')}</div>
        <div class="card-price">
          ${ hasDiscount ? `<span class="old">${currencyFormat(p._discount.before)}</span> <span class="new">${currencyFormat(p._discount.after)}</span>` : `<span class="new">${currencyFormat(p.price)}</span>` }
        </div>
        <div class="card-meta">SKU: ${escapeHtml(p.sku || '')}</div>
      </div>
    `;
    card.addEventListener('click', ()=> openModal(idx));
    grid.appendChild(card);
  });
}

/* modal open / close with scroll lock refcount */
function addScrollLock(){
  if (scrollLockCount === 0) {
    scrollYBefore = window.scrollY || window.pageYOffset;
    document.body.classList.add('body-locked');
    document.body.style.top = `-${scrollYBefore}px`;
  }
  scrollLockCount++;
}
function removeScrollLock(){
  scrollLockCount = Math.max(0, scrollLockCount - 1);
  if (scrollLockCount === 0) {
    document.body.classList.remove('body-locked');
    document.body.style.top = '';
    window.scrollTo(0, scrollYBefore);
  }
}

function openModal(index){
  const item = filtered[index];
  if (!item) return;
  currentIdx = index;

  modalImage.src = item.image || '';
  modalTitle.textContent = item.title || '';
  modalDesc.textContent = item.description || '';
  modalSizes.innerHTML = '';
  if (Array.isArray(item.sizes) && item.sizes.length) {
    item.sizes.forEach(s => {
      const chip = document.createElement('div');
      chip.className = 'size-chip';
      chip.textContent = s;
      chip.addEventListener('click', () => chip.classList.toggle('selected'));
      modalSizes.appendChild(chip);
    });
  }

  if (item._discount) {
    modalPrice.innerHTML = `<span class="old">${currencyFormat(item._discount.before)}</span> <span class="discount">${currencyFormat(item._discount.after)}</span> <span class="discount">-${item._discount.percent}%</span>`;
  } else {
    modalPrice.textContent = currencyFormat(item.price);
  }

  // actions
  modalActions.innerHTML = '';
  const igA = document.createElement('a');
  igA.className = 'btn btn-ig';
  igA.innerHTML = `<span class="material-symbols-outlined">photo_camera</span> Instagram`;
  igA.target = '_blank'; igA.rel = 'noopener';
  igA.href = item.instagram || settings.instagram || '#';
  modalActions.appendChild(igA);

  const waA = document.createElement('a');
  waA.className = 'btn btn-wa';
  waA.innerHTML = `<span class="material-symbols-outlined">chat</span> WhatsApp`;
  waA.target = '_blank'; waA.rel = 'noopener';
  const waNum = item.whatsapp || settings.whatsapp || '';
  if (waNum) {
    const msg = encodeURIComponent(`Hola, me interesa ${item.title} (SKU: ${item.sku}).`);
    waA.href = `https://wa.me/${waNum}?text=${msg}`;
  } else waA.href = '#';
  modalActions.appendChild(waA);

  productModal.classList.add('active');
  productModal.setAttribute('aria-hidden','false');
  addScrollLock();
}

function closeModal(){
  productModal.classList.remove('active');
  productModal.setAttribute('aria-hidden','true');
  modalImage.src = '';
  removeScrollLock();
}
function modalPrev(){ if (!filtered.length) return; currentIdx = (currentIdx - 1 + filtered.length) % filtered.length; openModal(currentIdx); }
function modalNext(){ if (!filtered.length) return; currentIdx = (currentIdx + 1) % filtered.length; openModal(currentIdx); }

/* sidebar open/close */
function openSidebar(){
  sidebar.classList.add('open');
  overlay.classList.add('show');
  overlay.hidden = false;
  sidebar.setAttribute('aria-hidden','false');
  addScrollLock();
  sidebar.style.overflow = 'auto';
}
function closeSidebar(){
  sidebar.classList.remove('open');
  overlay.classList.remove('show');
  overlay.hidden = true;
  sidebar.setAttribute('aria-hidden','true');
  removeScrollLock();
}

/* attach UI */
function attachUI(){
  menuToggle.addEventListener('click', openSidebar);
  closeMenu.addEventListener('click', closeSidebar);
  overlay.addEventListener('click', closeSidebar);

  // main nav actions
  document.querySelectorAll('.nav-item').forEach(n => {
    n.addEventListener('click', (e) => {
      const action = e.currentTarget.dataset.action;
      if (action === 'inicio') { activeCategory = null; searchInput.value=''; applyFiltersAndRender(); closeSidebar(); }
      if (action === 'promociones') { activeCategory = null; searchInput.value='oferta'; applyFiltersAndRender(); closeSidebar(); }
      if (action === 'categorias') {
        // toggle submenu visibility
        const hidden = submenuCategories.getAttribute('aria-hidden') === 'true';
        submenuCategories.setAttribute('aria-hidden', String(!hidden));
      }
    });
  });

  // search -> debounce
  let timer = null;
  searchInput.addEventListener('input', ()=> {
    clearTimeout(timer);
    timer = setTimeout(()=>{ activeCategory = null; applyFiltersAndRender(); }, 160);
  });

  // sort in real time
  sortSelect.addEventListener('change', ()=> applyFiltersAndRender());

  // modal controls
  if (modalClose) modalClose.addEventListener('click', closeModal);
  if (modalPrev) modalPrev.addEventListener('click', (e)=>{ e.stopPropagation(); modalPrev(); });
  if (modalNext) modalNext.addEventListener('click', (e)=>{ e.stopPropagation(); modalNext(); });
  productModal.addEventListener('click', (e)=> { if (e.target === productModal) closeModal(); });

  // keyboard
  document.addEventListener('keydown', (e) => {
    if (productModal.classList.contains('active')) {
      if (e.key === 'Escape') closeModal();
      if (e.key === 'ArrowLeft') modalPrev();
      if (e.key === 'ArrowRight') modalNext();
    } else if (sidebar.classList.contains('open')) {
      if (e.key === 'Escape') closeSidebar();
    }
  });
}

/* start */
init();