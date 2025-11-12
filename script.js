/* DOM references */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const selectedProductsList = document.getElementById("selectedProductsList");
const generateBtn = document.getElementById("generateRoutine");
const chatWindow = document.getElementById("chatWindow");
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");

/* Store selected products */
let selectedProducts = [];

/* Load products */
async function loadProducts() {
  try {
    const response = await fetch("products.json");
    const data = await response.json();
    return data.products;
  } catch (err) {
    console.error("Error loading products:", err);
  }
}

/* Display product cards and enable click-to-select */
function displayProducts(products) {
  productsContainer.innerHTML = products
    .map(
      (product, index) => `
      <div class="product-card" data-index="${index}">
        <img src="${product.image}" alt="${product.name}">
        <div class="product-info">
          <h3>${product.name}</h3>
          <p>${product.brand}</p>
        </div>
      </div>`
    )
    .join("");

  document.querySelectorAll(".product-card").forEach((card, index) => {
    card.addEventListener("click", () => {
      if (!selectedProducts.includes(products[index])) {
        selectedProducts.push(products[index]);
        updateSelectedProductsUI();
      }
    });
  });
}

/* Update selected product list UI */
function updateSelectedProductsUI() {
  selectedProductsList.innerHTML = selectedProducts
    .map((p) => `<span>${p.name}</span>`)
    .join(" ");
}

/* Filter on category change */
categoryFilter.addEventListener("change", async (e) => {
  const products = await loadProducts();
  const filtered = products.filter(
    (product) => product.category === e.target.value
  );
  displayProducts(filtered);
});

/* Send selected products to AI routine generator */
generateBtn.addEventListener("click", async () => {
  if (selectedProducts.length === 0) {
    chatWindow.innerHTML += `
      <div class="chat-bubble system">Please select at least one product.</div>`;
    return;
  }

  const productNames = selectedProducts
    .map((p) => `${p.name} (${p.brand})`)
    .join(" • ");

  // Display user’s request
  chatWindow.innerHTML += `
    <div class="chat-bubble user">
      <strong>You:</strong> Generate a routine using these products: ${productNames}
    </div>`;

  // Temporary “thinking” bubble
  chatWindow.innerHTML += `
    <div id="loadingMessage" class="chat-bubble advisor"><em>Advisor is thinking...</em></div>`;

  try {
    const response = await fetch("https://loreal-bot.nmoon10411.workers.dev/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          {
            role: "user",
            content: `Create a friendly skincare or beauty routine using these products:\n${productNames}\nExplain step-by-step how to use them and why.`,
          },
        ],
      }),
    });

    const data = await response.json();
    document.getElementById("loadingMessage")?.remove();

    chatWindow.innerHTML += `
      <div class="chat-bubble advisor">
        <strong>Advisor:</strong> ${data.reply || "Sorry, I couldn’t process that request."}
      </div>`;
  } catch (error) {
    document.getElementById("loadingMessage")?.remove();
    chatWindow.innerHTML += `
      <div class="chat-bubble advisor error">
        <strong>Advisor:</strong> Network error — please try again.
      </div>`;
  }

  chatWindow.scrollTop = chatWindow.scrollHeight;
});

/* Chat box text message send */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const message = userInput.value.trim();
  if (!message) return;

  // Display user message
  chatWindow.innerHTML += `
    <div class="chat-bubble user">
      <strong>You:</strong> ${message}
    </div>`;
  userInput.value = "";

  // Temporary “thinking” bubble
  chatWindow.innerHTML += `
    <div id="loadingMessage" class="chat-bubble advisor"><em>Advisor is thinking...</em></div>`;

  try {
    const response = await fetch("https://loreal-bot.nmoon10411.workers.dev/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: message }],
      }),
    });

    const data = await response.json();
    document.getElementById("loadingMessage")?.remove();

    chatWindow.innerHTML += `
      <div class="chat-bubble advisor">
        <strong>Advisor:</strong> ${data.reply || "Sorry, I couldn’t process that request."}
      </div>`;
  } catch (error) {
    document.getElementById("loadingMessage")?.remove();
    chatWindow.innerHTML += `
      <div class="chat-bubble advisor error">
        <strong>Advisor:</strong> Network error — please try again.
      </div>`;
  }

  chatWindow.scrollTop = chatWindow.scrollHeight;
});
