const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const selectedProductsList = document.getElementById("selectedProductsList");
const generateBtn = document.getElementById("generateRoutine");
const chatWindow = document.getElementById("chatWindow");
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");

const WORKER_URL = "https://loreal-bot.nmoon10411.workers.dev/";

let allProducts = [];
let selectedProducts = JSON.parse(localStorage.getItem("selectedProducts")) || [];
let chatHistory = [];

// Load products
async function loadProducts() {
  const res = await fetch("products.json");
  const data = await res.json();
  allProducts = data.products;
}

// Display products
function displayProducts(products) {
  productsContainer.innerHTML = products.map(product => `
    <div class="product-card" data-id="${product.id}">
      <img src="${product.image}" alt="${product.name}">
      <div class="product-info">
        <h3>${product.name}</h3>
        <p>${product.brand}</p>
      </div>
    </div>
  `).join("");

  document.querySelectorAll(".product-card").forEach(card => {
    card.addEventListener("click", () => toggleProduct(card.dataset.id));
  });
}

// Toggle selection
function toggleProduct(id) {
  id = Number(id);
  if (selectedProducts.includes(id)) {
    selectedProducts = selectedProducts.filter(pid => pid !== id);
  } else {
    selectedProducts.push(id);
  }
  localStorage.setItem("selectedProducts", JSON.stringify(selectedProducts));
  showSelectedProducts();
}

// Show selected products
function showSelectedProducts() {
  selectedProductsList.innerHTML = selectedProducts.map(id => {
    const item = allProducts.find(p => p.id === id);
    return `<span class="selected-item">${item.name}</span>`;
  }).join("");
}

// Filter by category
categoryFilter.addEventListener("change", () => {
  const filtered = allProducts.filter(p => p.category === categoryFilter.value);
  displayProducts(filtered);
});

// Add chat message UI
function addMessage(sender, text) {
  const msg = document.createElement("p");
  msg.innerHTML = `<strong>${sender}:</strong> ${text}`;
  chatWindow.appendChild(msg);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

// Generate Routine
generateBtn.addEventListener("click", async () => {
  if (selectedProducts.length === 0) {
    addMessage("System", "Please select at least one product.");
    return;
  }

  const chosen = allProducts.filter(p => selectedProducts.includes(p.id));

  chatHistory.push({ role: "user", content: `Create a skincare or beauty routine using these products: ${JSON.stringify(chosen)}` });

  await sendToAI();
});

// Follow-up chat
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const message = userInput.value.trim();
  if (!message) return;
  
  addMessage("You", message);
  userInput.value = "";

  chatHistory.push({ role: "user", content: message });
  await sendToAI();
});

// Send request to Worker → OpenAI
async function sendToAI() {
  try {
    const response = await fetch(WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: chatHistory })
    });

    const data = await response.json();
    const reply = data.reply || "Sorry — I couldn’t process that.";

    chatHistory.push({ role: "assistant", content: reply });
    addMessage("Advisor", reply);
  } catch (err) {
    addMessage("System", "Network error — please try again.");
  }
}

// Start
(async () => {
  await loadProducts();
  showSelectedProducts();
})();
