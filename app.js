const ITEMS_PER_PAGE = 8;
let products = [];
let discounts = {};
let filteredProducts = [];
let currentPage = 1;
let currentCategory = null;

// Load data
async function loadData() {
  try {
    const [itemsRes, discountsRes] = await Promise.all([
      fetch("items.json"),
      fetch("discounts.json")
    ]);
    products = await itemsRes.json();
    discounts = await discountsRes.json();
    applyDiscounts();
    renderCategorySubmenu();
    renderProducts();
  } catch (err) {
    console.error("Error cargando datos", err);
  }
}

function applyDiscounts() {
  const now = new Date();
  products.forEach(p => {
    const d = discounts[p.sku];
    if (d) {
      const end = new Date(d.endDate);
      if (end >= now) {
        p.discountPercent = d.percent;
        p.discountedPrice = (p.price * (1 - d.percent / 100)).toFixed(2);
      }
    }
  });
}

// Render products
function renderProducts() {
  const list = document.getElementById("product-list");
  const noResults = document.getElementById("no-results");
  list.innerHTML = "";

  let data = [...products];

  // Search filter
  const q = document.getElementById("search").value.toLowerCase();
  if (q) {
    data = data.filter(p =>
      p.title.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      (p.discountPercent && ["oferta","descuento","promo","promocion","promociones"].some(word => q.includes(word)))
    );
  }

  // Category filter
  if (currentCategory) {
    data = data.filter(p => p.sku.startsWith(currentCategory));
  }

  // Sorting
  const sortVal = document.getElementById("sort").value;
  if (sortVal === "asc") data.sort((a,b) => (a.discountedPrice||a.price) - (b.discountedPrice||b.price));
  if (sortVal === "desc") data.sort((a,b) => (b.discountedPrice||b.price) - (a.discountedPrice||a.price));

  filteredProducts = data;

  if (data.length === 0) {
    noResults.style.display = "block";
    document.getElementById("pagination").innerHTML = "";
    return;
  }
  noResults.style.display = "none";

  const start = (currentPage - 1) * ITEMS_PER_PAGE;
  const pageItems = data.slice(start, start + ITEMS_PER_PAGE);

  pageItems.forEach(p => {
    const card = document.createElement("div");
    card.className = "product-card";
    card.innerHTML = `
      <img src="${p.image}" alt="${p.title}" />
      ${p.discountPercent ? `<span class="discount-tag">-${p.discountPercent}%</span>` : ""}
      <div class="product-info">
        <h3 class="product-title">${p.title}</h3>
        <div class="product-prices">
          ${p.discountPercent
            ? `<span class="price" style="color:#e53935">S/ ${p.discountedPrice}</span><span class="old-price">S/ ${p.price}</span>`
            : `<span class="price">S/ ${p.price}</span>`}
        </div>
      </div>
    `;
    card.addEventListener("click", () => openModal(p));
    list.appendChild(card);
  });

  renderPagination();
}

function renderPagination() {
  const pages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const pagination = document.getElementById("pagination");
  pagination.innerHTML = "";
  if (pages <= 1) return;

  for (let i = 1; i <= pages; i++) {
    const btn = document.createElement("button");
    btn.className = "page-btn" + (i === currentPage ? " active" : "");
    btn.textContent = i;
    btn.addEventListener("click", () => { currentPage = i; renderProducts(); });
    pagination.appendChild(btn);
  }
}

function renderCategorySubmenu() {
  const submenu = document.getElementById("category-submenu");
  submenu.innerHTML = "";
  const categories = [...new Set(products.map(p => p.sku.charAt(0)))];
  categories.forEach(c => {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.className = "menu-link";
    btn.textContent = c === "Z" ? "Zapatillas" : c === "C" ? "Camisetas" : c;
    btn.addEventListener("click", () => {
      currentCategory = c;
      currentPage = 1;
      closeMenu();
      renderProducts();
    });
    li.appendChild(btn);
    submenu.appendChild(li);
  });
}

// Modal
function openModal(p) {
  const modal = document.getElementById("product-modal");
  modal.classList.add("show");
  document.body.style.overflow = "hidden";

  document.getElementById("modal-image").src = p.image;
  document.getElementById("modal-title").textContent = p.title;
  document.getElementById("modal-description").textContent = p.description;
  const prices = document.getElementById("modal-prices");
  prices.innerHTML = p.discountPercent
    ? `<span class="price" style="color:#e53935">S/ ${p.discountedPrice}</span> <span class="old-price">S/ ${p.price}</span> <span class="discount-tag">-${p.discountPercent}%</span>`
    : `<span class="price">S/ ${p.price}</span>`;

  const sizes = document.getElementById("modal-sizes");
  sizes.innerHTML = "";
  if (p.sizes && p.sizes.length > 0) {
    p.sizes.forEach(s => {
      const box = document.createElement("div");
      box.className = "size-box";
      box.textContent = s;
      sizes.appendChild(box);
    });
  }

  document.getElementById("modal-instagram").href = p.instagram;
  document.getElementById("modal-whatsapp").href = p.whatsapp;
}

document.getElementById("modal-close").addEventListener("click", () => {
  document.getElementById("product-modal").classList.remove("show");
  document.body.style.overflow = "";
});

// Menu
document.getElementById("menu-toggle").addEventListener("click", () => {
  document.getElementById("side-menu").classList.add("open");
  document.getElementById("menu-overlay").classList.add("active");
  document.body.style.overflow = "hidden";
});
function closeMenu() {
  document.getElementById("side-menu").classList.remove("open");
  document.getElementById("menu-overlay").classList.remove("active");
  document.body.style.overflow = "";
}
document.getElementById("menu-close").addEventListener("click", closeMenu);
document.getElementById("menu-overlay").addEventListener("click", closeMenu);

document.querySelector(".submenu-toggle").addEventListener("click", e => {
  document.getElementById("category-submenu").classList.toggle("show");
});

// Search & Sort
document.getElementById("search").addEventListener("input", () => {
  currentPage = 1;
  renderProducts();
});
document.getElementById("sort").addEventListener("change", () => {
  renderProducts();
});

// Initial load
loadData();