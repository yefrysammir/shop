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
    card.innerHTML = `
      ${prod.discount ? `<div class="badge">-${prod.discount}%</div>` : ""}
      <img src="${prod.image}" alt="${prod.title}" />
      <div class="card-content">
        <h3>${prod.title}</h3>
        <p class="price">
          ${prod.oldPrice ? `<span class="old-price">S/${prod.oldPrice}</span>` : ""}
          S/${prod.price}
        </p>
      </div>
    `;
    card.addEventListener("click", () => openModal(prod));
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
  if (prod.oldPrice) {
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

  document.getElementById("btnInstagram").href = settings.instagram;
  document.getElementById("btnWhatsapp").href = `https://wa.me/${settings.whatsapp}?text=Hola Bastardo, estoy interesado en ${encodeURIComponent(prod.title)}`;
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

loadData();