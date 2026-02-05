// ===== CẤU HÌNH ĐĂNG NHẬP =====
const ADMIN_CREDENTIALS = {
    username: "1",
    password: "1"
};

// ===== KHÓA LOCALSTORAGE (DÙNG CHUNG VỚI WEB BÁN HÀNG) =====
const STORAGE_KEYS = {
    products: "gs_admin_products",
    categories: "gs_admin_categories",
    settings: "gs_admin_settings"
};

// ===== DỮ LIỆU MẶC ĐỊNH (NẾU CHƯA CÓ LOCALSTORAGE) =====
let adminData = {
    products: [
        {
            id: 1,
            name: "Liên Quân VIP Kim Cương",
            category: "lien-quan",
            price: 500000,
            image: "https://via.placeholder.com/300x200/4CAF50/white?text=Lien+Quan+VIP",
            status: "active",
            description: "Tài khoản Liên Quân rank Kim Cương",
            fullDescription: "Tài khoản Liên Quân VIP, nhiều tướng & trang phục.",
            badge: "HOT"
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

// ===== TIỆN ÍCH =====
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

// ===== LƯU / LOAD LOCALSTORAGE =====
function saveAllData() {
    try {
        localStorage.setItem(STORAGE_KEYS.products, JSON.stringify(adminData.products));
        localStorage.setItem(STORAGE_KEYS.categories, JSON.stringify(adminData.categories));
    } catch (e) {
        console.error("Lỗi lưu dữ liệu admin:", e);
    }
}

function loadAllData() {
    try {
        const p = JSON.parse(localStorage.getItem(STORAGE_KEYS.products) || "[]");
        const c = JSON.parse(localStorage.getItem(STORAGE_KEYS.categories) || "[]");

        if (Array.isArray(p) && p.length) adminData.products = p;
        if (Array.isArray(c) && c.length) adminData.categories = c;
    } catch (e) {
        console.error("Lỗi load dữ liệu admin:", e);
    }
}

// ===== LOGIN / LOGOUT =====
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

// ===== CHUYỂN SECTION =====
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

// ===== QUẢN LÝ SẢN PHẨM =====
function getCategoryName(categoryId) {
    if (!categoryId) return "Không có";
    const cat = adminData.categories.find(c => c.id === categoryId);
    return cat ? cat.name : categoryId;
}

// ===== NHIỀU MỨC GIÁ CHO SẢN PHẨM =====
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
        // Mặc định luôn có 1 dòng trống để nhập
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

    document.getElementById("product-modal-title").textContent = "Thêm sản phẩm mới";
    document.getElementById("product-modal-submit").textContent = "Thêm sản phẩm";

    populateProductCategoryOptions();

    // Reset các mức giá: tạo 1 dòng trống
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
    document.getElementById('product-description').value = product.description || '';
    document.getElementById('product-full-description').value = product.fullDescription || '';
    document.getElementById('product-image').value = product.image || '';
    document.getElementById('product-extra-images').value = (product.extraImages || []).join('\n');
    document.getElementById('product-badge').value = product.badge || 'NEW';

    // Nếu sản phẩm có mảng prices thì dùng, không thì convert từ price cũ
    const prices = Array.isArray(product.prices) && product.prices.length
        ? product.prices
        : (product.price
            ? [{ amount: product.price, label: "" }]
            : []);

    resetPriceRows(prices);

    document.getElementById("product-modal-title").textContent = "Sửa sản phẩm";
    document.getElementById("product-modal-submit").textContent = "Lưu thay đổi";

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

// submit form sản phẩm (THÊM + SỬA)
function initProductForm() {
    const form = document.getElementById("add-product-form");
    if (!form) return;

    form.addEventListener("submit", function (e) {
        e.preventDefault();
        const mode = this.dataset.mode || "add";

        // Lấy danh sách ảnh phụ: mỗi dòng 1 link
        const extraImages = document
            .getElementById("product-extra-images")
            .value
            .split("\n")
            .map(s => s.trim())
            .filter(Boolean); // bỏ dòng trống

          // Lấy danh sách mức giá từ các dòng
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
    price: mainPrice,                 // giữ lại price chính = mức giá đầu
    prices: prices,                   // <=== mảng nhiều giá
    description: document.getElementById("product-description").value.trim(),
    fullDescription: document.getElementById("product-full-description").value.trim(),
    image:
        document.getElementById("product-image").value.trim() ||
        "https://via.placeholder.com/300x200/666/ffffff?text=No+Image",
    extraImages: extraImages,
    badge: document.getElementById("product-badge").value || "NEW",
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
// ===== QUẢN LÝ DANH MỤC (CÓ LOGO) =====
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
        const id = document.getElementById("category-id").value.trim();
        const logo = document.getElementById("category-logo").value.trim();

        if (!name || !id) {
            showNotification("Nhập đầy đủ Tên và Mã danh mục!", "error");
            return;
        }

        if (mode === "add") {
            const exist = adminData.categories.some(c => c.id === id);
            if (exist) {
                showNotification("Mã danh mục đã tồn tại!", "error");
                return;
            }
            const newCat = {
                id,
                name,
                logo,
                productCount: adminData.products.filter(p => p.category === id).length
            };
            adminData.categories.push(newCat);
            showNotification("Đã thêm danh mục mới!", "success");
        } else if (mode === "edit" && currentEditingCategoryId !== null) {
            const idx = adminData.categories.findIndex(c => c.id === currentEditingCategoryId);
            if (idx === -1) return;

            const oldId = adminData.categories[idx].id;
            adminData.categories[idx].id = id;
            adminData.categories[idx].name = name;
            adminData.categories[idx].logo = logo;

            if (oldId !== id) {
                adminData.products = adminData.products.map(p =>
                    p.category === oldId ? { ...p, category: id } : p
                );
            }
            showNotification("Đã lưu danh mục!", "success");
        }

        updateCategoryProductCounts();
        saveAllData();
        populateProductCategoryOptions();
        loadCategories();
        loadProducts();
        closeModal("category-modal");

        this.reset();
        this.dataset.mode = "add";
        currentEditingCategoryId = null;
    });
}

// ===== CÀI ĐẶT WEBSITE (CÓ LOGO WEBSITE URL) =====
function saveSettings() {
    const siteName     = document.getElementById("site-name").value;
    const siteSlogan   = document.getElementById("site-slogan").value;
    const zaloPhone    = document.getElementById("zalo-phone").value;
    const facebookLink = document.getElementById("facebook-link").value;
    const telegramLink = document.getElementById("telegram-link").value;
    const siteLogoUrl  = document.getElementById("site-logo-url").value; // link logo

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
        showNotification("Đã lưu cài đặt!", "success");
    } catch (e) {
        console.error("Lỗi lưu cài đặt:", e);
        showNotification("Không thể lưu cài đặt!", "error");
    }
}

function loadSettings() {
    const settingsStr = localStorage.getItem(STORAGE_KEYS.settings);
    if (!settingsStr) return;

    try {
        const settings = JSON.parse(settingsStr);
        if (settings.siteName)
            document.getElementById("site-name").value = settings.siteName;
        if (settings.siteSlogan)
            document.getElementById("site-slogan").value = settings.siteSlogan;
        if (settings.zaloPhone)
            document.getElementById("zalo-phone").value = settings.zaloPhone;
        if (settings.facebookLink)
            document.getElementById("facebook-link").value = settings.facebookLink;
        if (settings.telegramLink)
            document.getElementById("telegram-link").value = settings.telegramLink;
        if (settings.siteLogoUrl)
            document.getElementById("site-logo-url").value = settings.siteLogoUrl;
    } catch (e) {
        console.error("Lỗi parse cài đặt:", e);
    }
}

// ===== MODAL & THÔNG BÁO =====
function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = "none";
}

window.addEventListener("click", function (e) {
    if (e.target.classList.contains("modal")) {
        e.target.style.display = "none";
    }
});

function showNotification(message, type = "info") {
    const notify = document.createElement("div");
    notify.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 10px 16px;
        border-radius: 6px;
        color: #fff;
        z-index: 9999;
        font-size: 14px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    `;
    const colors = {
        success: "#27ae60",
        error: "#e74c3c",
        info: "#3498db",
        warning: "#f39c12"
    };
    notify.style.background = colors[type] || colors.info;
    notify.textContent = message;
    document.body.appendChild(notify);
    setTimeout(() => notify.remove(), 3000);
}

// ===== KHỞI TẠO =====
document.addEventListener("DOMContentLoaded", function () {
    loadAllData();
    updateCategoryProductCounts();
    populateProductCategoryOptions();

    initLogin();
    initProductForm();
    initCategoryForm();
    loadSettings();
});

document.addEventListener("DOMContentLoaded", () => {
    const addPriceBtn = document.getElementById("add-price-btn");
    if (addPriceBtn) {
        addPriceBtn.addEventListener("click", () => addPriceRow());
    }
});