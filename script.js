const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const selectedProductsList = document.getElementById("selectedProductsList");
const generateBtn = document.getElementById("generateRoutine");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const userInput = document.getElementById("userInput");

// ✅ Your Worker URL
const WORKER_URL = "https://loreal-bot.nmoon10411.workers.dev/";

let allProducts = [];
let selectedProducts = JSON.parse(localStorage.getItem("selectedProducts") || "[]");
let chatHistory = [];

// Load products
async function loadProducts() {
  const response = await fetch("products.json");
  const data = await response.json();
  allProducts = data.products;
}

function displayProducts(products) {
  productsContainer.innerHTML = products
    .map(
      (product) => `
      <div class="product-card" data-id="${product.id}">
        <img src="${product.image}" alt="${product.name}">
        <div class="product-info">
          <h3>${product.name}</h3>
          <p>${product.brand}</p>
        </div>
      </div>`
    )
    .join("");

  document.querySelectorAll(".product-card").forEach((card) =>
    card.addEventListener("click", () => toggleProduct(card.dataset.id))
  );
}

function updateSelectedProductsUI() {
  selectedProductsList.innerHTML = selectedProducts
    .map((p) => `<span class="tag">${p.name}</span>`)
    .join("");

  localStorage.setItem("selectedProducts", JSON.stringify(selectedProducts));
}

function toggleProduct(id) {
  const product = allProducts.find((p) => p.id == id);
  const exists = selectedProducts.find((p) => p.id == id);

  if (exists) {
    selectedProducts = selectedProducts.filter((p) => p.id != id);
  } else {
    selectedProducts.push(product);
  }

  updateSelectedProductsUI();
}

categoryFilter.addEventListener("change", (e) => {
  const filtered = allProducts.filter((p) => p.category === e.target.value);
  displayProducts(filtered);
});

// ✅ Add message to chat
function addMessage(role, text) {
  chatHistory.push({ role, content: text });
  chatWindow.innerHTML = chatHistory
    .map((m) => `<p><strong>${m.role === "user" ? "You" : "Advisor"}:</strong> ${m.content}</p>`)
    .join("");
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

// ✅ Generate Routine
generateBtn.addEventListener("click", async () => {
  if (selectedProducts.length === 0) {
    addMessage("system", "Please select at least one product.");
    return;
  }

  addMessage("user", "Create a skincare or beauty routine using these products:\n" +
    selectedProducts.map((p) => `• ${p.name} (${p.brand})`).join("\n"));

  const response = await fetch(WORKER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: chatHistory })
  });
  const data = await response.json();
  addMessage("assistant", data.reply);
});

// ✅ Follow-up Chat
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const message = userInput.value.trim();
  if (!message) return;

  addMessage("user", message);
  userInput.value = "";

  const response = await fetch(WORKER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: chatHistory })
  });
  const data = await response.json();
  addMessage("assistant", data.reply);
});

// Initialize
loadProducts().then(updateSelectedProductsUI);
