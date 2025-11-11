/* DOM Elements */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const selectedProductsList = document.getElementById("selectedProductsList");
const generateBtn = document.getElementById("generateRoutine");
const chatWindow = document.getElementById("chatWindow");
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");

let allProducts = [];
let selectedProducts = [];

/* Load products.json */
async function loadProducts() {
  const response = await fetch("products.json");
  const data = await response.json();
  allProducts = data.products;
}

/* Display product cards */
function displayProducts(category) {
  const filtered = allProducts.filter(p => p.category === category);
  productsContainer.innerHTML = filtered.map(product => `
    <div class="product-card" onclick="toggleSelect(${product.id})">
      <img src="${product.image}" alt="${product.name}">
      <div class="product-info">
        <h3>${product.name}</h3>
        <p>${product.brand}</p>
      </div>
    </div>
  `).join("");
}

/* Add/Remove selected products */
window.toggleSelect = function(id) {
  const product = allProducts.find(p => p.id === id);
  if (!product) return;

  const exists = selectedProducts.find(p => p.id === id);
  if (exists) {
    selectedProducts = selectedProducts.filter(p => p.id !== id);
  } else {
    selectedProducts.push(product);
  }

  updateSelectedList();
};

/* Update Selected Products Display */
function updateSelectedList() {
  selectedProductsList.textContent = selectedProducts
    .map(p => p.name)
    .join("   ");
}

/* Generate Routine (AI request) */
generateBtn.addEventListener("click", async () => {
  if (selectedProducts.length === 0) {
    chatWindow.innerHTML = `<p><strong>System:</strong> Please select at least one product.</p>`;
    return;
  }

  const productNames = selectedProducts.map(p => `${p.name} (${p.brand})`);

  // Clear old messages and show current request
  chatWindow.innerHTML = `
    <p><strong>You:</strong> Create a routine using these products: ${productNames.join(" · ")}</p>
  `;

  try {
    const response = await fetch(window.WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          { role: "system", content: "You are a skincare and beauty routine expert." },
          { role: "user", content: `Create a skincare routine using: ${productNames.join(", ")}. Explain when to use each product and why.` }
        ]
      })
    });

    const data = await response.json();

    chatWindow.innerHTML += `<p><strong>Advisor:</strong><br>${data.reply.replace(/\n/g, "<br>")}</p>`;
    chatWindow.scrollTop = chatWindow.scrollHeight;

  } catch (error) {
    chatWindow.innerHTML += `<p><strong>System:</strong> Network error — please try again.</p>`;
  }
});

/* Chat box manual messaging */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const message = userInput.value.trim();
  if (!message) return;

  chatWindow.innerHTML += `<p><strong>You:</strong> ${message}</p>`;
  userInput.value = "";

  try {
    const response = await fetch(window.WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: message }]
      })
    });
    const data = await response.json();
    chatWindow.innerHTML += `<p><strong>Advisor:</strong><br>${data.reply.replace(/\n/g, "<br>")}</p>`;
    chatWindow.scrollTop = chatWindow.scrollHeight;
  } catch {
    chatWindow.innerHTML += `<p><strong>System:</strong> Network error.</p>`;
  }
});

/* Load + Initialize */
loadProducts();
categoryFilter.addEventListener("change", (e) => displayProducts(e.target.value));
