let products = [];
let discounts = [];
let settings = {};
let currentList = []; // lista filtrada actual
let scrollPosition = 0; // 🔥 para congelar el scroll en modal

const productGrid = document.getElementById("productGrid");
const searchInput = document.getElementById("searchInput");
const noResults = document.getElementById("noResults");
const sideMenu = document.getElementById("sideMenu");
const menuToggle = document.getElementById("menuToggle");
const closeMenu = document.getElementById("closeMenu");
const overlay = document.getElementById("overlay");
const sortSelect = document.getElementById("sortSelect");
const categoryList = document.getElementById("categoryList");
const toggleCategoriesBtn = document.getElementById("toggleCategories");

// Pull-to-refresh variables
let isPWA = false;
let pullEl = null;
let startY = 0;
let isPulling = false;
let maxPull = 110;
let triggerPull = 60;

async function loadData() {
  const [itemsRes, discountsRes, settingsRes] = await Promise.all([
    fetch("items.json"),
    fetch("discounts.json"),
    fetch("settings.json")
  ]);

  products = await itemsRes.json();
  discounts = await discountsRes.json();
  settings = await settingsRes.json();

  applyDiscounts();
  renderCategories();
  setupCategoryToggle();
  renderProducts(products);
  currentList = [...products];
}

function applyDiscounts() {
  const today = new Date();
  products = products.map(prod => {
    const discount = discounts.find(d => d.sku === prod.sku);
    if (discount) {
      const expDate = new Date(discount.expires);
      if (today <= expDate) {
        prod.oldPrice = prod.price;
        prod.price = Math.round(prod.price * (1 - discount.percentage / 100));
        prod.discount = discount.percentage;
      }
    }
    return prod;
  });
}

function renderCategories() {
  const categories = {};
  products.forEach(p => {
    const prefix = (p.sku || "").charAt(0);
    if (!categories[prefix]) categories[prefix] = true;
  });

  categoryList.innerHTML = "";
  Object.keys(categories).forEach(prefix => {
    let name = prefix;
    if (prefix === "C") name = "Camisetas";
    if (prefix === "Z") name = "Zapatillas";
    if (prefix === "P") name = "Pantalones";
    if (prefix === "S") name = "Sudaderas";
    if (prefix === "A") name = "Accesorios";

    const li = document.createElement("li");
    li.dataset.filter = prefix;
    li.textContent = name;
    categoryList.appendChild(li);
  });

  categoryList.setAttribute("aria-hidden", "true");
}

function setupCategoryToggle() {
  categoryList.style.display = "none";
  if (toggleCategoriesBtn) {
    toggleCategoriesBtn.addEventListener("click", e => {
      e.stopPropagation();
      const parent = toggleCategoriesBtn.closest(".submenu");
      const isOpen = parent.classList.toggle("open");
      categoryList.style.display = isOpen ? "block" : "none";
      categoryList.setAttribute("aria-hidden", isOpen ? "false" : "true");
    });
  }
}

function renderProducts(list) {
  productGrid.innerHTML = "";
  if (list.length === 0) {
    noResults.style.display = "block";
    return;
  }
  noResults.style.display = "none";

  list.forEach(prod => {
    const card = document.createElement("div");
    card.className = "card";

    // decide badges using ONLY stock now:
    // stock: 0 = agotado, 1 = últimas unidades, 2+ = normal
    const badges = [];
    const isLow = (typeof prod.stock === "number" && prod.stock === 1);
    const isSoldOut = (typeof prod.stock === "number" && prod.stock === 0);

    // discount badge (if exists)
    if (prod.discount) badges.push(`<div class="badge">-${prod.discount}%</div>`);

    // low-stock badge (only when stock === 1)
    if (isLow && !isSoldOut) badges.push(`<div class="badge lowstock">Últimas unidades</div>`);

    // sold out badge (if stock === 0)
    if (isSoldOut) badges.push(`<div class="badge agotado">AGOTADO</div>`);

    // Price / sold out
    const priceHtml = isSoldOut
      ? `<p class="price sold-out">AGOTADO</p>`
      : `<p class="price">${prod.oldPrice ? `<span class="old-price">S/${prod.oldPrice}</span>` : ""} S/${prod.price}</p>`;

    card.innerHTML = `
      <div class="badges">${badges.join("")}</div>
      <img src="${prod.image}" alt="${prod.title}" />
      <div class="card-content">
        <h3>${prod.title}</h3>
        ${priceHtml}
      </div>
    `;

    // If sold out, add a visual muted class
    if (isSoldOut) {
      card.classList.add("soldout");
      // keep click behavior: open modal to explain agotado (same as before)
      card.addEventListener("click", () => openModal(prod));
    } else {
      card.addEventListener("click", () => openModal(prod));
    }

    productGrid.appendChild(card);
  });
}

function openModal(prod) {
  const modal = document.getElementById("productModal");
  modal.style.display = "block";
  modal.setAttribute("aria-hidden", "false");

  // 🔥 congelar scroll en la posición actual
  scrollPosition = window.scrollY;
  document.body.style.position = "fixed";
  document.body.style.top = `-${scrollPosition}px`;
  document.body.style.left = "0";
  document.body.style.right = "0";

  document.getElementById("modalImage").src = prod.image;
  document.getElementById("modalTitle").textContent = prod.title;
  document.getElementById("modalDescription").textContent = prod.description;

  const priceEl = document.getElementById("modalPrice");
  const isSoldOut = (typeof prod.stock === "number" && prod.stock === 0);

  if (isSoldOut) {
    priceEl.innerHTML = `<span class="sold-out">AGOTADO</span>`;
  } else if (prod.oldPrice) {
    priceEl.innerHTML = `<span class="old-price">S/${prod.oldPrice}</span><span class="new-price">S/${prod.price}</span>${prod.discount ? `<span class="modal-discount">-${prod.discount}%</span>` : ""}`;
  } else {
    priceEl.innerHTML = `<span class="new-price">S/${prod.price}</span>`;
  }

  const sizes = document.getElementById("modalSizes");
  sizes.innerHTML = "";
  if (prod.sizes && prod.sizes.length > 0) {
    prod.sizes.forEach(size => {
      const chip = document.createElement("span");
      chip.className = "size-chip";
      chip.textContent = size;
      sizes.appendChild(chip);
    });
  }

  // Buttons (use settings.json for links)
  const instaBtn = document.getElementById("btnInstagram");
  const waBtn = document.getElementById("btnWhatsapp");

  if (isSoldOut) {
    // disable links & show message
    instaBtn.removeAttribute("href");
    instaBtn.classList.add("disabled");
    instaBtn.setAttribute("aria-disabled", "true");

    waBtn.removeAttribute("href");
    waBtn.classList.add("disabled");
    waBtn.setAttribute("aria-disabled", "true");

    // show a user-friendly message in modal
    let already = document.getElementById("soldOutMessage");
    if (!already) {
      const m = document.createElement("p");
      m.id = "soldOutMessage";
      m.style.marginTop = "1rem";
      m.style.color = "#666";
      m.textContent = "Producto agotado, puedes ver otras opciones, ya pronto habrá re-stock.";
      const modalInfo = modal.querySelector(".modal-info");
      modalInfo.appendChild(m);
    } else {
      already.style.display = "block";
    }
  } else {
    instaBtn.classList.remove("disabled");
    instaBtn.setAttribute("href", settings.instagram || "#");

    waBtn.classList.remove("disabled");
    waBtn.setAttribute("href", `https://wa.me/${settings.whatsapp}?text=Estoy interesado en ${encodeURIComponent(prod.title)}`);

    const already = document.getElementById("soldOutMessage");
    if (already) already.style.display = "none";
  }
}

document.getElementById("closeModal").addEventListener("click", () => {
  const modal = document.getElementById("productModal");
  modal.style.display = "none";
  modal.setAttribute("aria-hidden", "true");

  // 🔥 restaurar scroll exactamente donde estaba
  document.body.style.position = "";
  document.body.style.top = "";
  document.body.style.left = "";
  document.body.style.right = "";
  window.scrollTo(0, scrollPosition);
});

searchInput.addEventListener("input", e => {
  const q = e.target.value.trim().toLowerCase();
  let filtered = products.filter(
    p =>
      p.title.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      (p.sku || "").toLowerCase().includes(q)
  );
  if (["oferta", "promo", "promociones", "descuento"].includes(q)) {
    filtered = products.filter(p => p.discount);
  }
  renderProducts(filtered);
  currentList = [...filtered];
});

menuToggle.addEventListener("click", () => {
  sideMenu.classList.add("active");
  overlay.classList.add("active");
  document.body.classList.add("no-scroll");
});

closeMenu.addEventListener("click", closeSideMenu);
overlay.addEventListener("click", closeSideMenu);

function closeSideMenu() {
  sideMenu.classList.remove("active");
  overlay.classList.remove("active");
  document.body.classList.remove("no-scroll");

  const parent = document.querySelector("#sideMenu .submenu");
  if (parent && parent.classList.contains("open")) {
    parent.classList.remove("open");
    categoryList.style.display = "none";
    categoryList.setAttribute("aria-hidden", "true");
  }
}

sideMenu.addEventListener("click", e => {
  if (e.target.dataset.filter) {
    const filter = e.target.dataset.filter;
    let filtered = [...products];
    if (filter === "promo") {
      filtered = products.filter(p => p.discount);
    } else if (filter !== "all") {
      filtered = products.filter(p => (p.sku || "").startsWith(filter));
    }
    renderProducts(filtered);
    currentList = [...filtered];

    // limpiar búsqueda y resetear orden
    searchInput.value = "";
    noResults.style.display = "none";
    sortSelect.value = "default"; // vuelve siempre a "Por defecto"

    closeSideMenu();
  }
});

sortSelect.addEventListener("change", e => {
  if (e.target.value === "default" || !e.target.value) {
    renderProducts(currentList);
    return;
  }
  let sorted = [...currentList];
  if (e.target.value === "asc") {
    sorted.sort((a, b) => a.price - b.price);
  } else if (e.target.value === "desc") {
    sorted.sort((a, b) => b.price - a.price);
  }
  renderProducts(sorted);
});

// ---- PULL TO REFRESH (only for PWA) ----
function detectPWA() {
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  // also check if installed (some browsers expose window.matchMedia)
  return isStandalone;
}

function createPullElement() {
  pullEl = document.createElement("div");
  pullEl.id = "pullRefresh";
  pullEl.innerHTML = `<span class="material-symbols-outlined">refresh</span>`;
  pullEl.style.position = "fixed";

  // place it respecting safe-area for iOS notch
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  if (isIOS) {
    pullEl.style.top = `calc(env(safe-area-inset-top, 0px) + -60px)`;
  } else {
    pullEl.style.top = "-60px";
  }

  pullEl.style.left = "50%";
  pullEl.style.transform = "translateX(-50%)";
  pullEl.style.zIndex = "3000";
  pullEl.style.height = "56px";
  pullEl.style.width = "56px";
  pullEl.style.display = "flex";
  pullEl.style.alignItems = "center";
  pullEl.style.justifyContent = "center";
  pullEl.style.background = "#fff";
  pullEl.style.borderRadius = "999px";
  pullEl.style.boxShadow = "0 6px 18px rgba(16,24,40,0.08)";
  pullEl.style.transition = "top 200ms cubic-bezier(.2,.9,.2,1), transform 200ms ease";
  pullEl.style.fontSize = "28px";
  pullEl.style.color = "#111";
  document.body.appendChild(pullEl);
}

function bindPullHandlers() {
  if (!('ontouchstart' in window)) return; // only touch devices

  window.addEventListener('touchstart', (e) => {
    if (window.scrollY !== 0) return;
    startY = e.touches[0].clientY;
    isPulling = true;
  }, {passive: true});

  window.addEventListener('touchmove', (e) => {
    if (!isPulling) return;
    const currentY = e.touches[0].clientY;
    let delta = currentY - startY;
    if (delta <= 0) return; // only downward pulls
    if (!pullEl) createPullElement();

    // Map delta to a max value for UX
    const capped = Math.min(delta, maxPull);
    // adjust top based on safe-area if present
    const safeTop = `calc(env(safe-area-inset-top, 0px) + ${-60 + capped}px)`;
    if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
      pullEl.style.top = safeTop;
    } else {
      pullEl.style.top = `${-60 + capped}px`;
    }
    pullEl.style.transform = `translateX(-50%) rotate(${capped * 2}deg)`;
  }, {passive: true});

  window.addEventListener('touchend', async (e) => {
    if (!isPulling) return;
    isPulling = false;
    if (!pullEl) return;
    // compute final delta height from top of element
    const topValRaw = pullEl.style.top || "-60px";
    // parse top value to compute pulled amount:
    let pulled = 0;
    try {
      const topNum = parseInt(topValRaw.replace(/[^\d-]/g, ''), 10);
      pulled = topNum + 60; // 0..maxPull (similar logic)
    } catch (err) {
      pulled = 0;
    }

    if (pulled >= triggerPull) {
      // show visible micro-loading state
      pullEl.classList.add('loading');
      pullEl.style.transform = `translateX(-50%) rotate(360deg)`;
      // trigger refresh
      try {
        await loadData();               // recarga real de datos
        window.scrollTo({ top: 0, behavior: "smooth" }); // vuelve al inicio
      } catch (err) {
        console.error("Error al recargar datos:", err);
      } finally {
        setTimeout(() => {
          // hide it smoothly respecting safe-area
          if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
            pullEl.style.top = `calc(env(safe-area-inset-top, 0px) + -60px)`;
          } else {
            pullEl.style.top = "-60px";
          }
          pullEl.style.transform = `translateX(-50%)`;
          pullEl.classList.remove('loading');
        }, 600);
      }
    } else {
      // revert
      if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
        pullEl.style.top = `calc(env(safe-area-inset-top, 0px) + -60px)`;
      } else {
        pullEl.style.top = "-60px";
      }
      pullEl.style.transform = `translateX(-50%)`;
    }
  }, {passive: true});
}

function initPullToRefreshIfPWA() {
  isPWA = detectPWA();
  if (!isPWA) return; // do nothing on normal browser
  createPullElement();
  bindPullHandlers();
}

// run once at start
initPullToRefreshIfPWA();

// ---- end pull to refresh ----

loadData();