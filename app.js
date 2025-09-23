let products = [];
let discounts = [];
let settings = {};
const productGrid = document.getElementById("productGrid");
const searchInput = document.getElementById("searchInput");
const noResults = document.getElementById("noResults");
const sideMenu = document.getElementById("sideMenu");
const menuToggle = document.getElementById("menuToggle");
const sortSelect = document.getElementById("sortSelect");

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
  renderProducts(products);
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
  document.getElementById("productModal").style.display = "block";
  document.getElementById("modalImage").src = prod.image;
  document.getElementById("modalTitle").textContent = prod.title;
  document.getElementById("modalDescription").textContent = prod.description;
  document.getElementById("modalPrice").innerHTML = `
    ${prod.oldPrice ? `<span class="old-price">S/${prod.oldPrice}</span>` : ""}
    S/${prod.price}
  `;

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
  document.getElementById("btnWhatsapp").href = `https://wa.me/${settings.whatsapp}?text=Estoy interesado en ${prod.title}`;
}

document.getElementById("closeModal").addEventListener("click", () => {
  document.getElementById("productModal").style.display = "none";
});

searchInput.addEventListener("input", e => {
  const q = e.target.value.toLowerCase();
  let filtered = products.filter(
    p =>
      p.title.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q)
  );
  if (["oferta", "promo", "promociones", "descuento"].includes(q)) {
    filtered = products.filter(p => p.discount);
  }
  renderProducts(filtered);
});

menuToggle.addEventListener("click", () => {
  sideMenu.classList.toggle("active");
});

sideMenu.addEventListener("click", e => {
  if (e.target.dataset.filter) {
    const filter = e.target.dataset.filter;
    let filtered = [...products];
    if (filter === "promo") {
      filtered = products.filter(p => p.discount);
    } else if (filter !== "all") {
      filtered = products.filter(p => p.sku.startsWith(filter));
    }
    renderProducts(filtered);
    sideMenu.classList.remove("active");
  }
});

sortSelect.addEventListener("change", e => {
  let sorted = [...products];
  if (e.target.value === "asc") {
    sorted.sort((a, b) => a.price - b.price);
  } else if (e.target.value === "desc") {
    sorted.sort((a, b) => b.price - a.price);
  }
  renderProducts(sorted);
});

loadData();