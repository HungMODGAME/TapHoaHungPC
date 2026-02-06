// ====================== KHÓA LOCAL (BACKUP) ======================
const STORAGE_KEYS = {
    products: ["gs_admin_products", "adminProducts"],
    categories: ["gs_admin_categories", "adminCategories"],
    settings: ["gs_admin_settings", "adminSettings"]
};

// ====================== FIREBASE CONFIG (WEB) ======================
const firebaseConfigShop = {
    apiKey: "AIzaSyDHUzqvlu3us07R9j-8ug8wdc2E5aiHQ5c",
    authDomain: "gameshop-a80e7.firebaseapp.com",
    projectId: "gameshop-a80e7",
    storageBucket: "gameshop-a80e7.firebasestorage.app",
    messagingSenderId: "66491071755",
    appId: "1:66491071755:web:120abe0efff427224da4b2e",
    measurementId: "G-03BQK57ZQ"
};

let DATA_DOC_REF = null;

(function initFirebaseForShop() {
    try {
        if (typeof firebase === "undefined") {
            console.warn("Firebase SDK chưa tải. Kiểm tra script trong index.html");
            return;
        }
        if (!firebase.apps || firebase.apps.length === 0) {
            firebase.initializeApp(firebaseConfigShop);
        }
        const db = firebase.firestore();
        DATA_DOC_REF = db.collection("gameshop").doc("globalData");
        console.log("Firebase (Shop) đã khởi tạo");
    } catch (e) {
        console.error("Lỗi khởi tạo Firebase (Shop):", e);
    }
})();

// ====================== DỮ LIỆU MẶC ĐỊNH ======================
const defaultCategoryNames = {
    "lien-quan": "Liên Quân Mobile",
    "pubg": "PUBG Mobile",
    "free-fire": "Free Fire",
    "genshin": "Genshin Impact",
    "valorant": "Valorant",
    "fifa": "FIFA Mobile"
};

const defaultProductsDemo = [
    {
        id: 1001,
        name: "Acc Liên Quân Kim Cương",
        category: "lien-quan",
        price: 350000,
        prices: [{ amount: 350000, label: "/tháng" }],
        description: "Rank Kim Cương, nhiều tướng & trang phục.",
        fullDescription: "Tài khoản Liên Quân rank Kim Cương, trên 80 tướng, 100+ trang phục.",
        image: "https://via.placeholder.com/800x400/4CAF50/ffffff?text=Lien+Quan",
        extraImages: [],
        badge: "HOT"
    },
    {
        id: 1002,
        name: "Acc PUBG Mobile VIP",
        category: "pubg",
        price: 450000,
        prices: [{ amount: 450000, label: "/tháng" }],
        description: "Skin súng hiếm, full set.",
        fullDescription: "Acc PUBG Mobile nhiều skin hiếm, full set trang phục.",
        image: "https://via.placeholder.com/800x400/FF9800/ffffff?text=PUBG",
        extraImages: [],
        badge: "NEW"
    },
    {
        id: 1003,
        name: "Acc Free Fire Đẹp",
        category: "free-fire",
        price: 300000,
        prices: [{ amount: 300000, label: "/tháng" }],
        description: "Acc Free Fire xịn, nhiều đồ.",
        fullDescription: "Acc Free Fire full đồ, nhiều skin hiếm.",
        image: "https://via.placeholder.com/800x400/E91E63/ffffff?text=Free+Fire",
        extraImages: [],
        badge: "NEW"
    }
];

let categoryNames = { ...defaultCategoryNames };
let categoriesFromAdmin = [];
let settingsFromAdmin = {};
let productData = {};          // { categoryId: [product,...] }
let cart = [];
let currentCategory = "";
let currentProduct = null;

// ====================== TIỆN ÍCH ======================
function formatCurrency(amount) {
    return new Intl.NumberFormat("vi-VN").format(amount);
}

// hiển thị giá: mỗi mức giá = 1 khối dễ nhìn
function formatProductPrices(product) {
    const prices = Array.isArray(product.prices) ? product.prices : [];

    if (prices.length) {
        return prices
            .map(p => {
                const money = formatCurrency(p.amount || 0);
                const label = p.label ? p.label.trim() : "VNĐ";
                return `
                    <div class="price-box">
                        <div class="price-money">${money}</div>
                        <div class="price-label">${label}</div>
                    </div>
                `;
            })
            .join("");
    }

    const money = formatCurrency(product.price || 0);
    return `
        <div class="price-box">
            <div class="price-money">${money}</div>
            <div class="price-label">VNĐ</div>
        </div>
    `;
}

function readFromLocalStorage(keyList) {
    for (const key of keyList) {
        try {
            const raw = localStorage.getItem(key);
            if (!raw) continue;
            return JSON.parse(raw);
        } catch (e) {
            console.error("Lỗi đọc localStorage key", key, e);
        }
    }
    return null;
}

function buildProductData(products) {
    productData = {};
    products.forEach(p => {
        const cat = p.category || "other";
        if (!productData[cat]) productData[cat] = [];

        const prices = Array.isArray(p.prices) ? p.prices : [];

        productData[cat].push({
            id: p.id,
            name: p.name || "Sản phẩm không tên",
            description: p.description || "",
            fullDescription: p.fullDescription || "",
            price: p.price || (prices[0]?.amount || 0),
            prices: prices,
            image: p.image || "https://via.placeholder.com/800x400/666/ffffff?text=No+Image",
            extraImages: Array.isArray(p.extraImages) ? p.extraImages : [],
            badge: p.badge || "NEW"
        });
    });
}

function getZaloLink() {
    const phone =
        (settingsFromAdmin && settingsFromAdmin.zaloPhone) || "0346593904";
    const cleaned = String(phone).replace(/\D/g, "");
    return "https://zalo.me/" + cleaned;
}

// style mặc định danh mục
const defaultCategoryStyles = [
    { id: "lien-quan",  icon: "fas fa-crown",      gradient: "linear-gradient(45deg, #4CAF50, #45a049)" },
    { id: "pubg",       icon: "fas fa-crosshairs", gradient: "linear-gradient(45deg, #FF9800, #f57c00)" },
    { id: "free-fire",  icon: "fas fa-fire",       gradient: "linear-gradient(45deg, #E91E63, #c2185b)" },
    { id: "genshin",    icon: "fas fa-magic",      gradient: "linear-gradient(45deg, #2196F3, #1976d2)" },
    { id: "valorant",   icon: "fas fa-bullseye",   gradient: "linear-gradient(45deg, #9C27B0, #7b1fa2)" },
    { id: "fifa",       icon: "fas fa-futbol",     gradient: "linear-gradient(45deg, #FF5722, #e64a19)" }
];

// ====================== LOAD DỮ LIỆU TỪ ADMIN (FIREBASE + LOCAL) ======================
async function loadDataFromAdmin() {
    // 1. Firestore trước
    if (DATA_DOC_REF) {
        try {
            const snap = await DATA_DOC_REF.get();
            if (snap.exists) {
                const data = snap.data() || {};

                if (data.settings && typeof data.settings === "object") {
                    settingsFromAdmin = data.settings;
                }

                if (Array.isArray(data.categories) && data.categories.length) {
                    categoriesFromAdmin = data.categories;
                    data.categories.forEach(cat => {
                        if (cat.id && cat.name) categoryNames[cat.id] = cat.name;
                    });
                }

                if (Array.isArray(data.products) && data.products.length) {
                    buildProductData(data.products);
                    console.log("Shop: Đã load dữ liệu từ Firestore");
                    return;
                }
            }
        } catch (e) {
            console.error("Lỗi load dữ liệu shop (Firestore):", e);
        }
    }

    // 2. Nếu Firebase không có / lỗi → dùng localStorage cũ
    const s = readFromLocalStorage(STORAGE_KEYS.settings);
    if (s && typeof s === "object") {
        settingsFromAdmin = s;
    }

    const c = readFromLocalStorage(STORAGE_KEYS.categories);
    if (Array.isArray(c) && c.length) {
        categoriesFromAdmin = c;
        c.forEach(cat => {
            if (cat.id && cat.name) categoryNames[cat.id] = cat.name;
        });
    }

    const p = readFromLocalStorage(STORAGE_KEYS.products);
    if (Array.isArray(p) && p.length) {
        buildProductData(p);
    } else {
        buildProductData(defaultProductsDemo);
    }
}

// ====================== ÁP DỤNG SETTINGS VÀO WEB ======================
function applySettingsToShop() {
    if (!settingsFromAdmin) return;
    const {
        siteName,
        siteSlogan,
        zaloPhone,
        facebookLink,
        telegramLink,
        siteLogoUrl
    } = settingsFromAdmin;

    const logoTitle = document.querySelector(".logo h1");
    if (logoTitle && siteName) {
        logoTitle.innerHTML = `<i class="fas fa-gamepad"></i> ${siteName}`;
        document.title = `${siteName} - Cung Cấp Các Dịch Vụ Hack Uy Tín`;
    }

    if (siteLogoUrl) {
        const logoImg = document.querySelector(".logo img");
        if (logoImg) {
            logoImg.src = siteLogoUrl;
        }
    }

    if (siteSlogan) {
        const heroTitle = document.querySelector(".hero-content h2");
        if (heroTitle) heroTitle.textContent = siteSlogan;
    }

    // Contact section có thể thêm sau nếu cần
}

// ====================== DANH MỤC (TRANG CHỦ + NAV) ======================
function renderHomeCategories() {
    const grid = document.querySelector(".categories-grid");
    if (!grid) return;

    const cats = categoriesFromAdmin.length
        ? categoriesFromAdmin
        : defaultCategoryStyles.map(style => ({
            id: style.id,
            name: categoryNames[style.id],
            logo: "",
            productCount: (productData[style.id] || []).length
        }));

    grid.innerHTML = cats.map((cat, index) => {
        const name  = cat.name || categoryNames[cat.id] || cat.id;
        const count = typeof cat.productCount === "number"
            ? cat.productCount
            : (productData[cat.id] || []).length;
        const style = defaultCategoryStyles[index % defaultCategoryStyles.length];
        const hasLogo = cat.logo && String(cat.logo).trim() !== "";

        if (hasLogo) {
            return `
                <div class="category-card" onclick="showCategory('${cat.id}')">
                    <div class="category-image"
                         style="
                            background-image:url('${cat.logo}');
                            background-size:cover;
                            background-position:center;
                            background-repeat:no-repeat;
                         ">
                    </div>
                    <h3>${name}</h3>
                    <p>${count} Online sẵn</p>
                </div>
            `;
        }

        return `
            <div class="category-card" onclick="showCategory('${cat.id}')">
                <div class="category-image"
                     style="
                        background:${style.gradient};
                        display:flex;
                        align-items:center;
                        justify-content:center;
                     ">
                    <i class="${style.icon}"></i>
                </div>
                <h3>${name}</h3>
                <p>${count} Online sẵn</p>
            </div>
        `;
    }).join("");
}

function renderNavCategories() {
    const dropdown = document.querySelector(".dropdown .dropdown-content");
    if (!dropdown) return;

    const defaultCats = defaultCategoryStyles.map(style => ({
        id: style.id,
        name: categoryNames[style.id]
    }));

    const cats = categoriesFromAdmin.length ? categoriesFromAdmin : defaultCats;

    dropdown.innerHTML = cats.map(cat => `
        <a href="#" onclick="showCategory('${cat.id}')">
            ${cat.name || categoryNames[cat.id] || cat.id}
        </a>
    `).join("");
}

// ====================== HIỂN THỊ SECTION & SẢN PHẨM ======================
function showHome() {
    document.querySelectorAll(".section").forEach(sec => sec.classList.remove("active"));
    const home = document.getElementById("home-section");
    if (home) home.classList.add("active");
    currentCategory = "";
    currentProduct = null;
}

function showCategory(category) {
    currentCategory = category;
    document.querySelectorAll(".section").forEach(sec => sec.classList.remove("active"));
    const secCat = document.getElementById("category-section");
    if (secCat) secCat.classList.add("active");

    const name = categoryNames[category] || category;
    const currentCat = document.getElementById("current-category");
    const catTitle = document.getElementById("category-title");
    if (currentCat) currentCat.textContent = name;
    if (catTitle) catTitle.textContent = name;

    renderCategoryProducts(category);
}

function renderCategoryProducts(category) {
    const productsGrid = document.getElementById("category-products");
    if (!productsGrid) return;

    const products = productData[category] || [];
    if (!products.length) {
        productsGrid.innerHTML = `
            <p style="padding:2rem;text-align:center;">
                Chưa có sản phẩm nào trong danh mục này. Hãy thêm sản phẩm ở trang admin.
            </p>
        `;
        return;
    }

    const zaloLink = getZaloLink();

    productsGrid.innerHTML = products.map(product => `
        <div class="product-card">
            <div class="product-image"
                 style="background-image:url('${product.image}')"
                 onclick="showProductDetail(${product.id})">
                <div class="product-badge">${product.badge}</div>
            </div>
            <div class="product-info">
                <div class="product-title" onclick="showProductDetail(${product.id})">${product.name}</div>
                <div class="product-description multiline">${product.description || ""}</div>
                <div class="product-price">
                    ${formatProductPrices(product)}
                </div>
                <div class="product-actions">
                    <button class="btn btn-primary" onclick="showProductDetail(${product.id})">
                        <i class="fas fa-eye"></i> Chi tiết
                    </button>
                    <a class="btn btn-secondary" href="${zaloLink}" target="_blank" rel="noopener">
                        <i class="fas fa-comments"></i> Mua
                    </a>
                </div>
            </div>
        </div>
    `).join("");
}

function findProductById(id) {
    for (const cat in productData) {
        const found = productData[cat].find(p => p.id === id);
        if (found) return found;
    }
    return null;
}

function showProductDetail(productId) {
    const product = findProductById(productId);
    if (!product) return;

    currentProduct = product;
    document.querySelectorAll(".section").forEach(sec => sec.classList.remove("active"));
    const secDetail = document.getElementById("product-detail-section");
    if (secDetail) secDetail.classList.add("active");

    const currentProd = document.getElementById("current-product");
    if (currentProd) currentProd.textContent = product.name;

    const detailContent = document.getElementById("product-detail-content");
    if (!detailContent) return;

    const extra = Array.isArray(product.extraImages) ? product.extraImages : [];
    const zaloLink = getZaloLink();

    detailContent.innerHTML = `
        <div class="product-detail">
            <div>
                <div class="product-detail-image" id="main-product-image"
                     style="background-image:url('${product.image}')"></div>
                ${extra.length ? `
                    <div class="product-gallery">
                        ${extra.map(url => `
                            <div class="product-gallery-item"
                                 style="background-image:url('${url}')"
                                 onclick="changeMainImage('${url}')"></div>
                        `).join("")}
                    </div>
                ` : ""}
            </div>
            <div class="product-detail-info">
                <h1>${product.name}</h1>
                <div class="product-detail-price">
                    ${formatProductPrices(product)}
                </div>

                <div class="product-detail-description multiline">
                    <p>${product.description || ""}</p>
                </div>

                <div class="product-specs multiline">
                    <h3>Thông số chi tiết:</h3>
                    <p>${product.fullDescription || ""}</p>
                </div>

                <div class="product-actions-detail">
                    <a class="btn btn-secondary" href="${zaloLink}" target="_blank" rel="noopener">
                        <i class="fas fa-comments"></i> Mua
                    </a>
                    <a class="btn btn-primary" href="${zaloLink}" target="_blank" rel="noopener">
                        <i class="fas fa-bolt"></i> Mua nhanh
                    </a>
                </div>
            </div>
        </div>
    `;
}

function changeMainImage(url) {
    const el = document.getElementById("main-product-image");
    if (el) el.style.backgroundImage = `url('${url}')`;
}

function goBackToCategory() {
    if (currentCategory) showCategory(currentCategory);
    else showHome();
}

// ====================== GIỎ HÀNG (VẪN GIỮ, NẾU CẦN) ======================
function addToCart(productId) {
    const product = findProductById(productId);
    if (!product) return;

    const existingItem = cart.find(item => item.id === productId);

    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({ ...product, quantity: 1 });
    }

    updateCartCount();
    showNotification("Đã thêm vào giỏ hàng!");
}

function buyNow(productId) {
    addToCart(productId);
    const cartLink = document.getElementById("cart-link");
    if (cartLink) cartLink.click();
}

function updateCartCount() {
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    const cartCount = document.getElementById("cart-count");
    if (cartCount) cartCount.textContent = count;
}

function renderCart() {
    const cartItems = document.getElementById("cart-items");
    const totalPrice = document.getElementById("total-price");
    if (!cartItems || !totalPrice) return;

    if (!cart.length) {
        cartItems.innerHTML = '<p style="text-align:center;padding:2rem;">Giỏ hàng trống</p>';
        totalPrice.textContent = "0";
        return;
    }

    cartItems.innerHTML = cart.map(item => `
        <div class="cart-item">
            <div>
                <strong>${item.name}</strong><br>
                <small style="color:#666;">${formatCurrency(item.price)} VNĐ x ${item.quantity}</small>
            </div>
            <button onclick="removeFromCart(${item.id})"
                    style="background:#ff4757;color:#fff;border:none;padding:8px 12px;border-radius:4px;cursor:pointer;">
                Xóa
            </button>
        </div>
    `).join("");

    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    totalPrice.textContent = formatCurrency(total) + " VNĐ";
}

function removeFromCart(id) {
    cart = cart.filter(item => item.id !== id);
    updateCartCount();
    renderCart();
}

// ====================== THÔNG BÁO NHỎ ======================
function showNotification(message) {
    let box = document.getElementById("shop-notification");
    if (!box) {
        box = document.createElement("div");
        box.id = "shop-notification";
        box.style.position = "fixed";
        box.style.right = "20px";
        box.style.bottom = "20px";
        box.style.zIndex = "5000";
        document.body.appendChild(box);
    }

    const item = document.createElement("div");
    item.textContent = message;
    item.style.marginTop = "8px";
    item.style.padding = "10px 16px";
    item.style.borderRadius = "6px";
    item.style.color = "#fff";
    item.style.boxShadow = "0 2px 8px rgba(0,0,0,0.2)";
    item.style.fontSize = "14px";
    item.style.background = "#3498db";

    box.appendChild(item);

    setTimeout(() => {
        item.style.opacity = "0";
        item.style.transition = "opacity 0.4s";
        setTimeout(() => item.remove(), 400);
    }, 2500);
}

// ====================== KHỞI TẠO ======================
document.addEventListener("DOMContentLoaded", async function () {
    await loadDataFromAdmin();
    applySettingsToShop();
    renderHomeCategories();
    renderNavCategories();

    const modal    = document.getElementById("cart-modal");
    const cartLink = document.getElementById("cart-link");
    const closeBtn = modal ? modal.querySelector(".close") : null;

    if (cartLink && modal) {
        cartLink.addEventListener("click", function (e) {
            e.preventDefault();
            renderCart();
            modal.style.display = "block";
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener("click", function () {
            modal.style.display = "none";
        });
    }

    window.addEventListener("click", function (e) {
        if (e.target === modal) modal.style.display = "none";
    });

    const zaloButton = document.getElementById("zalo-button");
    const zaloLink = getZaloLink();

    if (zaloButton) {
        zaloButton.addEventListener("click", function () {
            window.open(zaloLink, "_blank");
            zaloButton.style.transform = "scale(0.95)";
            setTimeout(() => {
                zaloButton.style.transform = "scale(1)";
            }, 150);
        });
    }

    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener("click", function (e) {
            const href = this.getAttribute("href");
            if (href === "#cart") return;
            if (href === "#home") {
                e.preventDefault();
                showHome();
            }
            if (href === "#contact") {
                e.preventDefault();
                const contact = document.getElementById("contact");
                if (contact) contact.scrollIntoView({ behavior: "smooth" });
            }
        });
    });

    const style = document.createElement("style");
    style.textContent = `
        .multiline { white-space: pre-line; }

        .product-gallery {
            display:flex;
            gap:10px;
            margin-top:12px;
            flex-wrap:wrap;
        }
        .product-gallery-item {
            width:72px;
            height:72px;
            border-radius:8px;
            background-size:cover;
            background-position:center;
            background-repeat:no-repeat;
            cursor:pointer;
            transition:transform 0.15s ease, box-shadow 0.15s ease;
        }
        .product-gallery-item:hover {
            transform:scale(1.05);
            box-shadow:0 2px 8px rgba(0,0,0,0.2);
        }

        /* Khối giá dễ nhìn */
        .price-box {
            background: #f7f7f7;
            padding: 8px 12px;
            border-radius: 8px;
            margin-bottom: 8px;
            border-left: 4px solid #ff6b6b;
        }
        .price-money {
            font-size: 1.3rem;
            font-weight: 700;
            color: #ff6b6b;
            margin-bottom: 2px;
        }
        .price-label {
            font-size: 0.9rem;
            color: #444;
            line-height: 1.3;
        }
    `;
    document.head.appendChild(style);

    showHome();
});