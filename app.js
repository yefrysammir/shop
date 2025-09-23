const GRID = document.getElementById("grid");
const SEARCH = document.getElementById("search");
const MODAL = document.getElementById("product-modal");
const CLOSE_BTN = document.getElementById("close-modal");
const IMG = document.getElementById("modal-img");
const TITLE = document.getElementById("modal-title");
const DESC = document.getElementById("modal-desc");
const PRICE = document.getElementById("modal-price");
const OLD_PRICE = document.getElementById("modal-old-price");
const INSTA = document.getElementById("modal-insta");
const WPP = document.getElementById("modal-wpp");
const PREV = document.getElementById("prev-product");
const NEXT = document.getElementById("next-product");

const MENU_BTN = document.getElementById("menu-btn");
const FILTER_MENU = document.getElementById("filter-menu");
const FILTER_LIST = document.getElementById("filter-list");

let products = [];
let filteredProducts = [];
let currentIndex = 0;
let discounts = {};

async function loadData() {
  try {
    const [itemsRes, discRes] = await Promise.all([
      fetch("items.json"),
      fetch("discounts.json")
    ]);
    products = await itemsRes.json();
    discounts = await discRes.json();
    applyDiscounts();
    render(products);
    buildFilters(products);
  } catch (err) {
    console.error("Error cargando datos", err);
    GRID.innerHTML = "<p>Error cargando productos.</p>";
  }
}

function applyDiscounts() {
  const now = new Date();
  products.forEach(p => {
    const d = discounts[p.sku];
    if (d) {
      const end = new Date(d.endDate);
      if (now <= end) {
        p.oldPrice = p.price;
        p.price = (p.price * (1 - d.percent / 100)).toFixed(2);
        p.offer = true;
      }
    }
  });
}

function render(list) {
  GRID.innerHTML = "";
  filteredProducts = list;
  list.forEach((p, i) => {
    const card = document.createElement("div");
    card.className = "card";
    card.dataset.index = i;

    let offerTag = p.offer ? `<span class="offer-tag">Oferta</span>` : "";

    card.innerHTML = `
      ${offerTag}
      <img src="${p.image}" alt="${p.title}">
      <div class="info">
        <p class="title">${p.title}</p>
        <p class="price">S/${p.price}</p>
      </div>
    `;
    card.onclick = () => openModal(i);
    GRID.appendChild(card);
  });
}

function openModal(i) {
  currentIndex = i;
  const p = filteredProducts[i];
  IMG.src = p.image;
  TITLE.textContent = p.title;
  DESC.textContent = p.description;
  PRICE.textContent = `S/${p.price}`;
  if (p.oldPrice) {
    OLD_PRICE.textContent = `S/${p.oldPrice}`;
  } else {
    OLD_PRICE.textContent = "";
  }
  INSTA.href = p.instagram;
  WPP.href = p.whatsapp;
  MODAL.classList.add("active");
  document.body.style.overflow = "hidden";
}

function closeModal() {
  MODAL.classList.remove("active");
  document.body.style.overflow = "auto";
}

SEARCH.addEventListener("input", e => {
  const q = e.target.value.toLowerCase();
  let list = products.filter(p =>
    p.title.toLowerCase().includes(q) ||
    (p.offer && (q.includes("oferta") || q.includes("descuento")))
  );
  render(list);
});

CLOSE_BTN.onclick = closeModal;
PREV.onclick = () => {
  if (currentIndex > 0) openModal(currentIndex - 1);
};
NEXT.onclick = () => {
  if (currentIndex < filteredProducts.length - 1) openModal(currentIndex + 1);
};

// filtros
function buildFilters(list) {
  const categories = {};
  list.forEach(p => {
    const cat = p.sku.charAt(0);
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push(p);
  });

  FILTER_LIST.innerHTML = "";
  Object.keys(categories).forEach(cat => {
    const li = document.createElement("li");
    li.textContent = `Categoría ${cat}`;
    li.onclick = () => render(categories[cat]);
    FILTER_LIST.appendChild(li);
  });
}

MENU_BTN.onclick = () => {
  FILTER_MENU.classList.toggle("active");
};

loadData();

// registrar service worker
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js");
}