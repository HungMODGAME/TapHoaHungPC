// ================== CẤU HÌNH ĐĂNG NHẬP ==================
const ADMIN_CREDENTIALS = {
    username: "1",
    password: "1"
};

// ================== KHÓA LOCALSTORAGE (BACKUP OFFLINE) ==================
const STORAGE_KEYS = {
    products: "gs_admin_products",
    categories: "gs_admin_categories",
    settings: "gs_admin_settings"
};

// ================== FIREBASE CONFIG ==================
const firebaseConfig = {
    apiKey: "AIzaSyDHUzqvlu3us07R9j-8ug8wdc2E5aiHQ5c",
    authDomain: "gameshop-a80e7.firebaseapp.com",
    projectId: "gameshop-a80e7",
    storageBucket: "gameshop-a80e7.firebasestorage.app",
    messagingSenderId: "66491071755",
    appId: "1:66491071755:web:120abe0efff427224da4b2e",
    measurementId: "G-03BQK57ZQ"
};

let DATA_DOC_REF = null;

(function initFirebaseForAdmin() {
    try {
        if (typeof firebase === "undefined") {
            console.warn("Firebase SDK chưa tải. Hãy kiểm tra script trong admin.html");
            return;
        }
        if (!firebase.apps || firebase.apps.length === 0) {
            firebase.initializeApp(firebaseConfig);
        }
        const db = firebase.firestore();
        DATA_DOC_REF = db.collection("gameshop").doc("globalData");
        console.log("Firebase (Admin) đã khởi tạo");
    } catch (e) {
        console.error("Lỗi khởi tạo Firebase (Admin):", e);
    }
})();

// ================== DỮ LIỆU MẶC ĐỊNH ==================
let adminData = {
    products: [
        {
            id: 1,
            name: "Liên Quân VIP Kim Cương",
            category: "lien-quan",
            price: 500000,
            prices: [
                { amount: 500000, label: "/tháng" }
            ],
            image: "https://via.placeholder.com/300x200/4CAF50/white?text=Lien+Quan+VIP",
            status: "active",
            description: "Tài khoản Liên Quân rank Kim Cương",
            fullDescription: "Tài khoản Liên Quân VIP, nhiều tướng & trang phục.",
            badge: "HOT",
            extraImages: []
        }
    ],
    categories: [
        { id: "lien-quan",  name: "Liên Quân Mobile",  logo: "", productCount: 0 },
        { id: "pubg",       name: "PUBG Mobile",       logo: "", productCount: 0 },
        { id: "free-fire",  name: "Free Fire",         logo: "", productCount: 0 },
        { id: "genshin",    name: "Genshin Impact",    logo: "", productCount: 0 },
        { id: "valorant",   name: "Valorant",          logo: "", productCount: 0 },
        { id: "fifa",       name: "FIFA Mobile",       logo: "", productCount: 0 }
    ]
};

let isLoggedIn = false;
let currentEditingProductId = null;
let currentEditingCategoryId = null;

// ================== TIỆN ÍCH ==================
function formatCurrency(amount) {
    return new Intl.NumberFormat("vi-VN").format(amount);
}

function updateCategoryProductCounts() {
    adminData.categories.forEach(cat => {
        cat.productCount = adminData.products.filter(p => p.category === cat.id).length;
    });
}

function populateProductCategoryOptions() {
    const select = document.getElementById("product-category");
    if (!select) return;
    select.innerHTML = adminData.categories
        .map(cat => `<option value="${cat.id}">${cat.name}</option>`)
        .join("");
}

// ================== LƯU / LOAD DỮ LIỆU (FIREBASE + LOCAL) ==================
function saveAllData() {
    // backup localStorage (phòng khi offline)
    try {
        localStorage.setItem(STORAGE_KEYS.products, JSON.stringify(adminData.products));
        localStorage.setItem(STORAGE_KEYS.categories, JSON.stringify(adminData.categories));
    } catch (e) {
        console.error("Lỗi lưu dữ liệu admin (localStorage):", e);
    }

    if (!DATA_DOC_REF) return;

    DATA_DOC_REF.set(
        {
            products: adminData.products,
            categories: adminData.categories
        },
        { merge: true }
    ).then(() => {
        console.log("Đã lưu dữ liệu admin lên Firestore");
    }).catch(err => {
        console.error("Lỗi lưu dữ liệu admin (Firestore):", err);
        showNotification("Không thể lưu dữ liệu lên server!", "error");
    });
}

async function loadAllData() {
    // 1. Ưu tiên load từ Firestore
    if (DATA_DOC_REF) {
        try {
            const snap = await DATA_DOC_REF.get();
            if (snap.exists) {
                const data = snap.data() || {};
                if (Array.isArray(data.products) && data.products.length) {
                    adminData.products = data.products;
                }
                if (Array.isArray(data.categories) && data.categories.length) {
                    adminData.categories = data.categories;
                }
                console.log("Đã load dữ liệu admin từ Firestore");
                return;
            }
        } catch (e) {
            console.error("Lỗi load dữ liệu admin (Firestore):", e);
        }
    }

    // 2. Nếu Firestore chưa có / lỗi → dùng localStorage nếu có
    try {
        const p = JSON.parse(localStorage.getItem(STORAGE_KEYS.products) || "[]");
        const c = JSON.parse(localStorage.getItem(STORAGE_KEYS.categories) || "[]");

        if (Array.isArray(p) && p.length) adminData.products = p;
        if (Array.isArray(c) && c.length) adminData.categories = c;
    } catch (e) {
        console.error("Lỗi load dữ liệu admin (localStorage):", e);
    }
}

// ================== LOGIN / LOGOUT ==================
function initLogin() {
    const form = document.getElementById("login-form");
    if (!form) return;

    form.addEventListener("submit", function (e) {
        e.preventDefault();
        const user = document.getElementById("username").value.trim();
        const pass = document.getElementById("password").value.trim();

        if (user === ADMIN_CREDENTIALS.username && pass === ADMIN_CREDENTIALS.password) {
            isLoggedIn = true;
            document.getElementById("login-screen").style.display = "none";
            document.getElementById("admin-dashboard").style.display = "flex";
            showSection("products");
            showNotification("Đăng nhập thành công!", "success");
        } else {
            showNotification("Sai tài khoản hoặc mật khẩu!", "error");
        }
    });
}

function logout() {
    if (!confirm("Bạn có chắc muốn đăng xuất?")) return;
    isLoggedIn = false;
    document.getElementById("login-screen").style.display = "flex";
    document.getElementById("admin-dashboard").style.display = "none";
    const form = document.getElementById("login-form");
    if (form) form.reset();
}

// ================== CHUYỂN SECTION ==================
function showSection(section) {
    // Active menu trái
    document.querySelectorAll(".sidebar-menu li").forEach(li => li.classList.remove("active"));
    const link = document.querySelector(`.sidebar-menu a[href="#${section}"]`);
    if (link && link.parentElement) link.parentElement.classList.add("active");

    // Ẩn / hiện section
    document.querySelectorAll(".admin-section").forEach(sec => sec.classList.remove("active"));
    const target = document.getElementById(section + "-section");
    if (target) target.classList.add("active");

    if (section === "products") {
        updateCategoryProductCounts();
        populateProductCategoryOptions();
        loadProducts();
    } else if (section === "categories") {
        updateCategoryProductCounts();
        loadCategories();
    } else if (section === "settings") {
        loadSettings();
    }
}

// ================== QUẢN LÝ SẢN PHẨM ==================
function getCategoryName(categoryId) {
    if (!categoryId) return "Không có";
    const cat = adminData.categories.find(c => c.id === categoryId);
    return cat ? cat.name : categoryId;
}

// ---- Nhiều mức giá ----
function addPriceRow(amount = "", label = "") {
    const container = document.getElementById("price-list");
    if (!container) return;

    const row = document.createElement("div");
    row.className = "price-row";
    row.innerHTML = `
        <input type="number"
               class="price-amount"
               placeholder="Giá (VNĐ)"
               value="${amount !== "" ? amount : ""}">
        <input type="text"
               class="price-label"
               placeholder="Ghi chú (vd: /tháng, /năm, /vĩnh viễn)"
               value="${label || ""}">
        <button type="button"
                class="btn btn-danger btn-sm remove-price-btn">
            <i class="fas fa-times"></i>
        </button>
    `;

    const removeBtn = row.querySelector(".remove-price-btn");
    removeBtn.addEventListener("click", () => {
        row.remove();
    });

    container.appendChild(row);
}

function resetPriceRows(prices) {
    const container = document.getElementById("price-list");
    if (!container) return;

    container.innerHTML = "";

    if (Array.isArray(prices) && prices.length) {
        prices.forEach(p => addPriceRow(p.amount, p.label));
    } else {
        addPriceRow();
    }
}

function loadProducts() {
    const tbody = document.getElementById("products-table");
    if (!tbody) return;

    tbody.innerHTML = adminData.products
        .map(
            p => `
        <tr>
            <td>${p.id}</td>
            <td><img src="${p.image}" alt="${p.name}" class="product-image"></td>
            <td>${p.name}</td>
            <td>${getCategoryName(p.category)}</td>
            <td>${formatCurrency(p.price)}đ</td>
            <td>
                <span class="status-badge ${
                    p.status === "active" ? "status-completed" : "status-cancelled"
                }">
                    ${p.status === "active" ? "Hoạt động" : "Ẩn"}
                </span>
            </td>
            <td>
                <button class="btn btn-warning btn-sm" onclick="editProduct(${p.id})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-danger btn-sm" onclick="deleteProduct(${p.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>`
        )
        .join("");
}

function showAddProductModal() {
    const modal = document.getElementById("add-product-modal");
    const form = document.getElementById("add-product-form");

    currentEditingProductId = null;
    form.reset();
    form.dataset.mode = "add";

    const titleEl = document.getElementById("product-modal-title");
    const submitBtn = document.getElementById("product-modal-submit");
    if (titleEl) titleEl.textContent = "Thêm sản phẩm mới";
    if (submitBtn) submitBtn.textContent = "Thêm sản phẩm";

    populateProductCategoryOptions();
    resetPriceRows();
    modal.style.display = "block";
}

function editProduct(id) {
    const product = adminData.products.find(p => p.id === id);
    if (!product) return;

    const modal = document.getElementById("add-product-modal");
    const form = document.getElementById("add-product-form");

    currentEditingProductId = id;
    form.dataset.mode = "edit";

    populateProductCategoryOptions();

    document.getElementById("product-name").value = product.name || "";
    document.getElementById("product-category").value = product.category || "";
    document.getElementById("product-description").value = product.description || "";
    document.getElementById("product-full-description").value = product.fullDescription || "";
    document.getElementById("product-image").value = product.image || "";
    document.getElementById("product-extra-images").value = (product.extraImages || []).join("\n");

    const badgeInput = document.getElementById("product-badge");
    if (badgeInput) badgeInput.value = product.badge || "NEW";

    const prices = Array.isArray(product.prices) && product.prices.length
        ? product.prices
        : (product.price ? [{ amount: product.price, label: "" }] : []);
    resetPriceRows(prices);

    const titleEl = document.getElementById("product-modal-title");
    const submitBtn = document.getElementById("product-modal-submit");
    if (titleEl) titleEl.textContent = "Sửa sản phẩm";
    if (submitBtn) submitBtn.textContent = "Lưu thay đổi";

    modal.style.display = "block";
}

function deleteProduct(id) {
    if (!confirm("Xóa sản phẩm này?")) return;
    adminData.products = adminData.products.filter(p => p.id !== id);
    updateCategoryProductCounts();
    saveAllData();
    loadProducts();
    loadCategories();
    showNotification("Đã xóa sản phẩm!", "success");
}

// Submit form (thêm + sửa)
function initProductForm() {
    const form = document.getElementById("add-product-form");
    if (!form) return;

    form.addEventListener("submit", function (e) {
        e.preventDefault();
        const mode = this.dataset.mode || "add";

        // ---- ảnh phụ ----
        const extraImages = document
            .getElementById("product-extra-images")
            .value
            .split("\n")
            .map(s => s.trim())
            .filter(Boolean);

        // ---- danh sách giá ----
        const priceRows = document.querySelectorAll("#price-list .price-row");
        const prices = [];
        priceRows.forEach(row => {
            const amount = parseInt(row.querySelector(".price-amount").value) || 0;
            const label = row.querySelector(".price-label").value.trim();
            if (amount > 0) {
                prices.push({ amount, label });
            }
        });
        const mainPrice = prices.length ? prices[0].amount : 0;

        const data = {
            name: document.getElementById("product-name").value.trim(),
            category: document.getElementById("product-category").value,
            price: mainPrice,
            prices: prices,
            description: document.getElementById("product-description").value.trim(),
            fullDescription: document.getElementById("product-full-description").value.trim(),
            image:
                document.getElementById("product-image").value.trim() ||
                "https://via.placeholder.com/300x200/666/ffffff?text=No+Image",
            extraImages: extraImages,
            badge: (document.getElementById("product-badge")?.value || "NEW"),
            status: "active"
        };

        if (!data.name) {
            showNotification("Vui lòng nhập tên sản phẩm!", "error");
            return;
        }

        if (mode === "edit" && currentEditingProductId !== null) {
            const idx = adminData.products.findIndex(p => p.id === currentEditingProductId);
            if (idx !== -1) {
                adminData.products[idx] = {
                    ...adminData.products[idx],
                    ...data,
                    id: currentEditingProductId
                };
            }
            showNotification("Đã cập nhật sản phẩm!", "success");
        } else {
            const newProduct = {
                id: Date.now(),
                ...data
            };
            adminData.products.push(newProduct);
            showNotification("Đã thêm sản phẩm mới!", "success");
        }

        updateCategoryProductCounts();
        saveAllData();
        closeModal("add-product-modal");
        loadProducts();
        loadCategories();

        this.reset();
        this.dataset.mode = "add";
        currentEditingProductId = null;
    });
}

// ================== QUẢN LÝ DANH MỤC (CÓ LOGO) ==================
function loadCategories() {
    const grid = document.getElementById("categories-grid");
    if (!grid) return;

    updateCategoryProductCounts();

    grid.innerHTML = adminData.categories
        .map(
            cat => `
        <div class="category-item">
            <div class="category-header">
                <div class="category-name">
                    ${
                        cat.logo
                            ? `<img src="${cat.logo}" alt="${cat.name}" style="width:32px;height:32px;border-radius:6px;object-fit:cover;margin-right:8px;vertical-align:middle;">`
                            : ""
                    }
                    <span>${cat.name}</span>
                </div>
                <div class="category-stats">${cat.productCount || 0} sản phẩm</div>
            </div>
            <div style="margin-top: 1rem;">
                <button class="btn btn-warning btn-sm" onclick="editCategory('${cat.id}')">
                    <i class="fas fa-edit"></i> Sửa
                </button>
                <button class="btn btn-danger btn-sm" onclick="deleteCategory('${cat.id}')">
                    <i class="fas fa-trash"></i> Xóa
                </button>
            </div>
        </div>`
        )
        .join("");

    populateProductCategoryOptions();
}

function showAddCategoryModal() {
    const modal = document.getElementById("category-modal");
    const form = document.getElementById("category-form");

    currentEditingCategoryId = null;
    form.reset();
    form.dataset.mode = "add";

    document.getElementById("category-modal-title").textContent = "Thêm danh mục mới";
    document.getElementById("category-submit-btn").textContent = "Thêm danh mục";

    modal.style.display = "block";
}

function editCategory(id) {
    const cat = adminData.categories.find(c => c.id === id);
    if (!cat) return;

    const modal = document.getElementById("category-modal");
    const form = document.getElementById("category-form");

    currentEditingCategoryId = id;
    form.dataset.mode = "edit";

    document.getElementById("category-name").value = cat.name;
    document.getElementById("category-id").value = cat.id;
    document.getElementById("category-logo").value = cat.logo || "";

    document.getElementById("category-modal-title").textContent = "Sửa danh mục";
    document.getElementById("category-submit-btn").textContent = "Lưu danh mục";

    modal.style.display = "block";
}

function deleteCategory(id) {
    const hasProduct = adminData.products.some(p => p.category === id);
    if (hasProduct) {
        if (
            !confirm(
                "Danh mục đang có sản phẩm, xóa sẽ làm sản phẩm không có danh mục. Bạn chắc chắn chứ?"
            )
        ) {
            return;
        }
        adminData.products = adminData.products.map(p =>
            p.category === id ? { ...p, category: "" } : p
        );
    } else {
        if (!confirm("Xóa danh mục này?")) return;
    }

    adminData.categories = adminData.categories.filter(c => c.id !== id);

    updateCategoryProductCounts();
    saveAllData();
    loadCategories();
    loadProducts();
    showNotification("Đã xóa danh mục!", "success");
}

function initCategoryForm() {
    const form = document.getElementById("category-form");
    if (!form) return;

    form.addEventListener("submit", function (e) {
        e.preventDefault();
        const mode = this.dataset.mode || "add";

        const name = document.getElementById("category-name").value.trim();
        const id   = document.getElementById("category-id").value.trim();
        const logo = document.getElementById("category-logo").value.trim();

        if (!name || !id) {
            showNotification("Vui lòng nhập đầy đủ ID và tên danh mục!", "error");
            return;
        }

        if (mode === "edit" && currentEditingCategoryId) {
            const idx = adminData.categories.findIndex(c => c.id === currentEditingCategoryId);
            if (idx !== -1) {
                adminData.categories[idx] = {
                    ...adminData.categories[idx],
                    id,
                    name,
                    logo
                };
            }
            // cập nhật category trong sản phẩm nếu id đổi
            if (id !== currentEditingCategoryId) {
                adminData.products = adminData.products.map(p =>
                    p.category === currentEditingCategoryId ? { ...p, category: id } : p
                );
            }
            showNotification("Đã cập nhật danh mục!", "success");
        } else {
            if (adminData.categories.some(c => c.id === id)) {
                showNotification("ID danh mục đã tồn tại!", "error");
                return;
            }
            adminData.categories.push({
                id,
                name,
                logo,
                productCount: 0
            });
            showNotification("Đã thêm danh mục mới!", "success");
        }

        updateCategoryProductCounts();
        saveAllData();
        loadCategories();
        populateProductCategoryOptions();

        currentEditingCategoryId = null;
        this.reset();
        this.dataset.mode = "add";
        closeModal("category-modal");
    });
}

// ================== CÀI ĐẶT WEBSITE ==================
function saveSettings() {
    const siteName     = document.getElementById("site-name").value;
    const siteSlogan   = document.getElementById("site-slogan").value;
    const zaloPhone    = document.getElementById("zalo-phone").value;
    const facebookLink = document.getElementById("facebook-link").value;
    const telegramLink = document.getElementById("telegram-link").value;
    const siteLogoUrl  = document.getElementById("site-logo-url").value;

    const settings = {
        siteName,
        siteSlogan,
        zaloPhone,
        facebookLink,
        telegramLink,
        siteLogoUrl
    };

    try {
        localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
    } catch (e) {
        console.error("Lỗi lưu cài đặt (localStorage):", e);
    }

    if (DATA_DOC_REF) {
        DATA_DOC_REF.set(
            { settings },
            { merge: true }
        ).then(() => {
            showNotification("Đã lưu cài đặt!", "success");
        }).catch(err => {
            console.error("Lỗi lưu cài đặt (Firestore):", err);
            showNotification("Không thể lưu cài đặt lên server!", "error");
        });
    } else {
        showNotification("Đã lưu cài đặt (local)!", "success");
    }
}

function loadSettings() {
    let settings = null;
    const settingsStr = localStorage.getItem(STORAGE_KEYS.settings);
    if (settingsStr) {
        try {
            settings = JSON.parse(settingsStr);
        } catch (e) {
            console.error("Lỗi parse cài đặt:", e);
        }
    }

    function apply(settingsObj) {
        if (!settingsObj) return;
        if (settingsObj.siteName)
            document.getElementById("site-name").value = settingsObj.siteName;
        if (settingsObj.siteSlogan)
            document.getElementById("site-slogan").value = settingsObj.siteSlogan;
        if (settingsObj.zaloPhone)
            document.getElementById("zalo-phone").value = settingsObj.zaloPhone;
        if (settingsObj.facebookLink)
            document.getElementById("facebook-link").value = settingsObj.facebookLink;
        if (settingsObj.telegramLink)
            document.getElementById("telegram-link").value = settingsObj.telegramLink;
        if (settingsObj.siteLogoUrl)
            document.getElementById("site-logo-url").value = settingsObj.siteLogoUrl;
    }

    if (settings) apply(settings);

    if (DATA_DOC_REF) {
        DATA_DOC_REF.get().then(snap => {
            if (!snap.exists) return;
            const data = snap.data() || {};
            if (data.settings) {
                apply(data.settings);
            }
        }).catch(err => {
            console.error("Lỗi load cài đặt (Firestore):", err);
        });
    }
}

// ================== MODAL & THÔNG BÁO ==================
function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = "none";
}

function showNotification(message, type = "info") {
    let box = document.getElementById("admin-notification");
    if (!box) {
        box = document.createElement("div");
        box.id = "admin-notification";
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

    let bg = "#3498db";
    if (type === "success") bg = "#27ae60";
    if (type === "error") bg = "#e74c3c";
    item.style.background = bg;

    box.appendChild(item);

    setTimeout(() => {
        item.style.opacity = "0";
        item.style.transition = "opacity 0.4s";
        setTimeout(() => item.remove(), 400);
    }, 2500);
}

// ================== KHỞI TẠO ==================
document.addEventListener("DOMContentLoaded", async function () {
    await loadAllData();
    updateCategoryProductCounts();
    populateProductCategoryOptions();

    initLogin();
    initProductForm();
    initCategoryForm();
    loadSettings();

    // nút thêm dòng giá
    const addPriceBtn = document.getElementById("add-price-btn");
    if (addPriceBtn) {
        addPriceBtn.addEventListener("click", () => addPriceRow());
    }

    // đóng modal khi click ra ngoài
    window.addEventListener("click", function (e) {
        const addProductModal = document.getElementById("add-product-modal");
        const categoryModal   = document.getElementById("category-modal");

        if (e.target === addProductModal) closeModal("add-product-modal");
        if (e.target === categoryModal) closeModal("category-modal");
    });
});