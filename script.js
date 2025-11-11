/* DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const selectedProductsList = document.getElementById("selectedProductsList");
const generateRoutineBtn = document.getElementById("generateRoutine");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const userInput = document.getElementById("userInput");

/* selected products saved in memory + localStorage */
let selectedProducts = JSON.parse(localStorage.getItem("selectedProducts")) || [];

/* Load product data from JSON */
async function loadProducts() {
  const response = await fetch("products.json");
  const data = await response.json();
  return data.products;
}

/* Render product cards */
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

  /* Add click to select/unselect */
  document.querySelectorAll(".product-card").forEach((card) => {
    card.addEventListener("click", () => toggleProduct(card.dataset.id));
  });
}

/* Add or remove selected products */
async function toggleProduct(id) {
  const products = await loadProducts();
  const product = products.find((p) => p.id == id);

  const exists = selectedProducts.find((p) => p.id == id);

  if (exists) {
    selectedProducts = selectedProducts.filter((p) => p.id != id);
  } else {
    selectedProducts.push(product);
  }

  localStorage.setItem("selectedProducts", JSON.stringify(selectedProducts));
  renderSelectedProducts();
}

/* Show selected products list */
function renderSelectedProducts() {
  selectedProductsList.innerHTML = selectedProducts
    .map((p) => `<span class="tag">${p.name}</span>`)
    .join("");
}

/* Add message to chat */
function addMessage(sender, text) {
  const msg = document.createElement("p");
  msg.innerHTML = `<strong>${sender}:</strong> ${text}`;
  chatWindow.appendChild(msg);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

/* Generate routine */
generateRoutineBtn.addEventListener("click", async () => {
  if (selectedProducts.length === 0) {
    addMessage("System", "Please select at least one product.");
    return;
  }

  const prompt = `
Create a skincare/beauty routine using the following products.
Explain when to use each one and why it works together.
Make the explanation clear, friendly, and helpful.

Products:
${selectedProducts.map((p) => `• ${p.name} (${p.brand})`).join("\n")}
`;

  addMessage("You", prompt);

  const response = await fetch("https://loreal-bot.nmoon10411.workers.dev/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: [{ role: "user", content: prompt }] }),
  });

  const data = await response.json();

  addMessage("Advisor", data.reply || "Sorry — I couldn’t generate a routine.");
});

/* Follow-up questions */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const message = userInput.value.trim();
  if (!message) return;

  addMessage("You", message);
  userInput.value = "";

  const response = await fetch("https://loreal-bot.nmoon10411.workers.dev/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [
        { role: "system", content: "You are a L'Oréal beauty advisor." },
        { role: "user", content: message },
      ],
    }),
  });

  const data = await response.json();
  addMessage("Advisor", data.reply || "Sorry — I couldn’t process that.");
});

/* Initial state */
renderSelectedProducts();
