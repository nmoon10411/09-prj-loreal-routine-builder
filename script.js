/* =========================
   DOM ELEMENTS
========================= */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const selectedProductsList = document.getElementById("selectedProductsList");
const generateBtn = document.getElementById("generateRoutine");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const userInput = document.getElementById("userInput");

/* Worker endpoint (no API key in browser) */
const WORKER_URL = (window.WORKER_URL || "").trim();

/* =========================
   STATE
========================= */
let allProducts = [];
// Map of id -> product
let selected = new Map();
// Chat history that we send to the Worker
let chatHistory = [
  {
    role: "system",
    content:
      "You are L'Oréal's helpful routine advisor. Stay on skincare, haircare, makeup, fragrance. " +
      "Prioritize the user's selected products first. If selections are unsuitable, offer close L'Oréal alternatives. " +
      "Explain routines step-by-step (AM/PM when relevant), short but specific. Avoid medical claims.",
  },
];

/* =========================
   UTILITIES
========================= */

function saveSelection() {
  localStorage.setItem(
    "selectedProducts@loreal",
    JSON.stringify(Array.from(selected.keys()))
  );
}

function loadSavedSelection() {
  try {
    const raw = localStorage.getItem("selectedProducts@loreal");
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function addMessage(sender, text) {
  const p = document.createElement("p");
  p.innerHTML = `<strong>${sender}:</strong> ${text}`;
  chatWindow.appendChild(p);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

/* Visually mark selection without needing extra CSS file changes */
function markCardSelected(card, isSelected) {
  if (isSelected) {
    card.style.border = "2px solid #e3a535";
    card.style.boxShadow = "0 0 0 3px rgba(227,165,53,0.15)";
  } else {
    card.style.border = "1px solid #ccc";
    card.style.boxShadow = "none";
  }
}

/* Render the chips of selected products */
function renderSelectedList() {
  selectedProductsList.innerHTML = "";
  if (selected.size === 0) return;

  selected.forEach((product, id) => {
    const chip = document.createElement("div");
    chip.style.display = "inline-flex";
    chip.style.alignItems = "center";
    chip.style.gap = "8px";
    chip.style.padding = "8px 10px";
    chip.style.border = "1px solid #ddd";
    chip.style.borderRadius = "999px";
    chip.style.fontSize = "14px";
    chip.style.background = "#fafafa";

    chip.innerHTML = `
      <span>${product.name}</span>
      <button aria-label="Remove ${product.name}" data-id="${id}" style="
        border:none;background:#000;color:#fff;width:22px;height:22px;
        border-radius:50%;cursor:pointer;line-height:0;display:flex;align-items:center;justify-content:center;
      ">&times;</button>
    `;

    chip.querySelector("button").addEventListener("click", () => {
      selected.delete(id);
      saveSelection();
      // De-highlight card if it exists in current grid
      const card = productsContainer.querySelector(`[data-id="${id}"]`);
      if (card) markCardSelected(card, false);
      renderSelectedList();
    });

    selectedProductsList.appendChild(chip);
  });
}

/* =========================
   PRODUCTS: LOAD + RENDER
========================= */

async function loadProducts() {
  const res = await fetch("products.json");
  const json = await res.json();
  return json.products;
}

/* Build a single card HTML string */
function productCardHTML(product) {
  return `
    <div class="product-card" data-id="${product.id}" style="position:relative;cursor:pointer;">
      <img src="${product.image}" alt="${product.name}">
      <div class="product-info">
        <h3>${product.name}</h3>
        <p>${product.brand}</p>
        <button class="desc-toggle" type="button" style="
          margin-top:8px;align-self:flex-start;border:1px solid #ccc;
          padding:6px 10px;font-size:12px;border-radius:6px;background:#fff;cursor:pointer;
        ">Description</button>
        <div class="desc" hidden style="
          margin-top:8px;font-size:13px;color:#444;line-height:1.4;background:#f8f8f8;
          border:1px solid #eee;border-radius:6px;padding:10px;
        ">${product.description}</div>
      </div>
    </div>
  `;
}

function displayProducts(products) {
  productsContainer.innerHTML = products.map(productCardHTML).join("");

  // Wire up selection & description toggles
  products.forEach((p) => {
    const card = productsContainer.querySelector(`[data-id="${p.id}"]`);
    const toggleBtn = card.querySelector(".desc-toggle");
    const desc = card.querySelector(".desc");

    // Restore visual selection state
    markCardSelected(card, selected.has(p.id));

    // Toggle description (don’t trigger select)
    toggleBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const isHidden = desc.hasAttribute("hidden");
      if (isHidden) desc.removeAttribute("hidden");
      else desc.setAttribute("hidden", "");
    });

    // Toggle selection by clicking the card area
    card.addEventListener("click", () => {
      if (selected.has(p.id)) {
        selected.delete(p.id);
        markCardSelected(card, false);
      } else {
        selected.set(p.id, p);
        markCardSelected(card, true);
      }
      saveSelection();
      renderSelectedList();
    });
  });
}

/* Initial placeholder */
productsContainer.innerHTML = `
  <div class="placeholder-message">Select a category to view products</div>
`;

/* Category filter */
categoryFilter.addEventListener("change", async (e) => {
  const selectedCategory = e.target.value;
  if (allProducts.length === 0) {
    allProducts = await loadProducts();
    // Restore saved selections once we have the full list
    const savedIds = loadSavedSelection();
    savedIds.forEach((id) => {
      const prod = allProducts.find((p) => p.id === id);
      if (prod) selected.set(id, prod);
    });
    renderSelectedList();
  }
  const filtered = allProducts.filter((p) => p.category === selectedCategory);
  displayProducts(filtered);
});

/* =========================
   ROUTINE GENERATION + CHAT
========================= */

async function sendToWorker(messages) {
  if (!WORKER_URL) {
    throw new Error(
      "Worker URL not set. Define window.WORKER_URL in secrets.js (or inline) to your Cloudflare Worker endpoint."
    );
  }
  const res = await fetch(WORKER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Worker error (${res.status}): ${text || "Unknown error"}`);
  }
  const data = await res.json();
  return data.reply || "Sorry, I couldn’t process that.";
}

/* Generate routine using selected products */
generateBtn.addEventListener("click", async () => {
  if (selected.size === 0) {
    addMessage("Advisor", "Please select one or more products first.");
    return;
  }

  // Build a concise product summary for the model
  const payload = Array.from(selected.values()).map((p) => ({
    id: p.id,
    brand: p.brand,
    name: p.name,
    category: p.category,
    description: p.description,
  }));

  addMessage("You", "Generate a routine for my selected products.");
  addMessage("Advisor", "Working on your routine…");

  chatHistory.push({
    role: "user",
    content:
      "Use ONLY these selected products if possible. If a crucial step is missing, suggest a close L'Oréal alternative:\n\n" +
      JSON.stringify(payload, null, 2),
  });

  try {
    const reply = await sendToWorker(chatHistory);
    addMessage("Advisor", reply);
    chatHistory.push({ role: "assistant", content: reply });
  } catch (err) {
    addMessage("Advisor", "Network error — please try again.");
    console.error(err);
  }
});

/* Follow-up questions */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const msg = userInput.value.trim();
  if (!msg) return;

  addMessage("You", msg);
  userInput.value = "";

  chatHistory.push({ role: "user", content: msg });

  try {
    const reply = await sendToWorker(chatHistory);
    addMessage("Advisor", reply);
    chatHistory.push({ role: "assistant", content: reply });
  } catch (err) {
    addMessage("Advisor", "Network error — please try again.");
    console.error(err);
  }
});

/* =========================
   FIRST LOAD: pre-warm data (optional)
========================= */
(async function bootstrap() {
  // Preload products so saved selections can render as soon as user picks a category
  try {
    allProducts = await loadProducts();
    const savedIds = loadSavedSelection();
    savedIds.forEach((id) => {
      const prod = allProducts.find((p) => p.id === id);
      if (prod) selected.set(id, prod);
    });
    renderSelectedList();
  } catch (e) {
    console.warn("Could not preload products.json:", e);
  }
})();
