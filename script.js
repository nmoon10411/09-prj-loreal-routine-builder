/* ==============================
   GLOBAL STATE
============================== */
let allProducts = [];
let selectedProducts = JSON.parse(localStorage.getItem("selectedProducts")) || [];
let chatHistory = [];

/* DOM Elements */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const selectedProductsList = document.getElementById("selectedProductsList");
const generateRoutineBtn = document.getElementById("generateRoutine");
const chatWindow = document.getElementById("chatWindow");
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");

/* ==============================
   LOAD PRODUCT DATA
============================== */
async function loadProducts() {
  const response = await fetch("products.json");
  const data = await response.json();
  allProducts = data.products;
}

/* ==============================
   DISPLAY PRODUCTS
============================== */
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
      </div>
  `
    )
    .join("");

  /* Add selection behavior */
  document.querySelectorAll(".product-card").forEach((card) => {
    card.addEventListener("click", () => {
      const id = parseInt(card.dataset.id);
      toggleProductSelection(id);
    });
  });
}

/* ==============================
   TOGGLE SELECTED PRODUCTS
============================== */
function toggleProductSelection(productId) {
  const existing = selectedProducts.find((p) => p.id === productId);

  if (existing) {
    selectedProducts = selectedProducts.filter((p) => p.id !== productId);
  } else {
    const product = allProducts.find((p) => p.id === productId);
    selectedProducts.push(product);
  }

  localStorage.setItem("selectedProducts", JSON.stringify(selectedProducts));
  updateSelectedProductsUI();
}

/* ==============================
   UPDATE SELECTED PRODUCTS AREA
============================== */
function updateSelectedProductsUI() {
  selectedProductsList.innerHTML = selectedProducts
    .map(
      (p) => `
      <div class="selected-tag">
        ${p.name}
        <button class="remove-tag" data-id="${p.id}">&times;</button>
      </div>
    `
    )
    .join("");

  /* Remove Button Listener */
  document.querySelectorAll(".remove-tag").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = parseInt(btn.dataset.id);
      selectedProducts = selectedProducts.filter((p) => p.id !== id);
      localStorage.setItem("selectedProducts", JSON.stringify(selectedProducts));
      updateSelectedProductsUI();
    });
  });
}

/* ==============================
   APPEND MESSAGE TO CHAT
============================== */
function addChatMessage(sender, text) {
  const msg = document.createElement("p");
  msg.innerHTML = `<strong>${sender}:</strong> ${text}`;
  chatWindow.appendChild(msg);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

/* ==============================
   GENERATE ROUTINE (AI CALL)
============================== */
async function generateRoutine() {
  if (selectedProducts.length === 0) {
    addChatMessage("System", "Please select at least one product.");
    return;
  }

  addChatMessage("You", "Generate a routine for my selected products.");
  const productData = selectedProducts.map((p) => ({
    name: p.name,
    brand: p.brand,
    category: p.category,
    description: p.description,
  }));

  chatHistory.push({ role: "user", content: `Create a skincare or haircare routine using these products: ${JSON.stringify(productData)}` });

  const response = await fetch(window.WORKER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: chatHistory })
  });

  const data = await response.json();
  const reply = data.reply || "Sorry, I couldn't generate a routine.";
  chatHistory.push({ role: "assistant", content: reply });
  addChatMessage("Advisor", reply);
}

/* ==============================
   CHAT FOLLOW-UP
============================== */
async function handleChat(event) {
  event.preventDefault();
  const message = userInput.value.trim();
  if (!message) return;

  addChatMessage("You", message);
  userInput.value = "";
  chatHistory.push({ role: "user", content: message });

  const response = await fetch(window.WORKER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: chatHistory })
  });

  const data = await response.json();
  const reply = data.reply || "Sorry, I didn’t understand that.";
  chatHistory.push({ role: "assistant", content: reply });
  addChatMessage("Advisor", reply);
}

/* ==============================
   EVENT LISTENERS
============================== */
categoryFilter.addEventListener("change", () => {
  const category = categoryFilter.value;
  const filtered = allProducts.filter((p) => p.category === category);
  displayProducts(filtered);
});

generateRoutineBtn.addEventListener("click", generateRoutine);
chatForm.addEventListener("submit", handleChat);

/* ==============================
   INIT
============================== */
loadProducts().then(updateSelectedProductsUI);
