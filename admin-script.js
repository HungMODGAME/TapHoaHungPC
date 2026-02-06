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

// ================== TRẠNG THÁI ==================
let adminData = {
    products: [],
    categories: []
};

let isLoggedIn = false;
let currentEditingProductId = null;
let currentEditingCategoryId = null;

// ⭐ Danh mục đang lọc sản phẩm
let currentProductFilterCategoryId = "";

// ================== KHỞI TẠO FIREBASE ==================
(function initFirebaseForAdmin() {
    try {
        if (typeof firebase === "undefined") return;
        if (!firebase.apps || firebase.apps.length === 0) {
            firebase.initializeApp(firebaseConfig);
        }
        const db = firebase.firestore();
        DATA_DOC_REF = db.collection("gameshop").doc("globalData");
    } catch (e) {
        console.error("Firebase error:", e);
    }
})();

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

// ================== HÀM PHỤ CHO SẢN PHẨM (DANH MỤC + NHIỀU GIÁ) ==================

// Lấy tên danh mục từ id (dùng để hiển thị trong bảng sản phẩm)
function getCategoryName(categoryId) {
    if (!categoryId) return "Không có";
    const cat = adminData.categories.find(c => c.id === categoryId);
    return cat ? cat.name : categoryId;
}

// Thêm 1 dòng giá (số tiền + ghi chú)
function addPriceRow(amount = "", label = "") {
    const container = document.getElementById("price-list");
    if (!container) return;

    const row = document.createElement("div");
    row.className = "price-row";
    row.innerHTML = `
        <input
            type="number"
            class="price-amount"
            placeholder="Giá (VNĐ)"
            value="${amount !== "" ? amount : ""}"
        >
        <input
            type="text"
            class="price-label"
            placeholder="Ghi chú (vd: /tháng, /năm, /vĩnh viễn)"
            value="${label || ""}"
        >
        <button
            type="button"
            class="btn btn-danger btn-sm remove-price-btn"
        >
            <i class="fas fa-times"></i>
        </button>
    `;

    // nút xoá dòng giá
    const removeBtn = row.querySelector(".remove-price-btn");
    removeBtn.addEventListener("click", () => {
        row.remove();
    });

    container.appendChild(row);
}

// Xoá hết dòng giá cũ + thêm lại theo mảng prices (hoặc 1 dòng trống)
function resetPriceRows(prices) {
    const container = document.getElementById("price-list");
    if (!container) return;

    container.innerHTML = "";

    if (Array.isArray(prices) && prices.length) {
        prices.forEach(p => addPriceRow(p.amount, p.label));
    } else {
        // mặc định có 1 dòng giá trống
        addPriceRow();
    }
}

// ================== FIREBASE SAVE ==================
function saveAllData() {
    localStorage.setItem(STORAGE_KEYS.products, JSON.stringify(adminData.products));
    localStorage.setItem(STORAGE_KEYS.categories, JSON.stringify(adminData.categories));

    if (!DATA_DOC_REF) return;
    DATA_DOC_REF.set(
        {
            products: adminData.products,
            categories: adminData.categories
        },
        { merge: true }
    );
}

// ================== FIREBASE LOAD ==================
async function loadAllData() {
    if (DATA_DOC_REF) {
        try {
            const snap = await DATA_DOC_REF.get();
            if (snap.exists) {
                const data = snap.data() || {};
                if (data.products) adminData.products = data.products;
                if (data.categories) adminData.categories = data.categories;
                return;
            }
        } catch (e) {}
    }
}

// ================== LOGIN ==================
function initLogin() {
    const form = document.getElementById("login-form");
    if (!form) return;

    form.addEventListener("submit", async function (e) {
        e.preventDefault();
        const user = document.getElementById("username").value.trim();
        const pass = document.getElementById("password").value.trim();

        if (user === ADMIN_CREDENTIALS.username && pass === ADMIN_CREDENTIALS.password) {
            isLoggedIn = true;
            await loadAllData();

            document.getElementById("login-screen").style.display = "none";
            document.getElementById("admin-dashboard").style.display = "flex";

            showSection("products");
        } else {
            alert("Sai tài khoản hoặc mật khẩu!");
        }
    });
}

function logout() {
    isLoggedIn = false;
    document.getElementById("login-screen").style.display = "flex";
    document.getElementById("admin-dashboard").style.display = "none";
    document.getElementById("login-form").reset();
}

// ================== CHUYỂN SECTION ==================
function showSection(section) {

    // đánh dấu menu
    document.querySelectorAll(".sidebar-menu li").forEach(li => li.classList.remove("active"));
    const link = document.querySelector(`.sidebar-menu a[href="#${section}"]`);
    if (link && link.parentElement) link.parentElement.classList.add("active");

    // ẩn tất cả
    document.querySelectorAll(".admin-section").forEach(sec => sec.classList.remove("active"));

    // hiện section cần
    document.getElementById(section + "-section").classList.add("active");

    if (section === "products") {
        // ⭐ Khi mở từ menu trái → bỏ lọc
        currentProductFilterCategoryId = "";

        updateCategoryProductCounts();
        populateProductCategoryOptions();
        loadProducts();
    }

    if (section === "categories") {
        updateCategoryProductCounts();
        loadCategories();
    }
}
// ================== LOAD SẢN PHẨM (CÓ LỌC) ==================
function loadProducts() {
    const tbody = document.getElementById("products-table");
    if (!tbody) return;

    let list = adminData.products.slice();

    // ⭐ Lọc theo danh mục nếu có
    if (currentProductFilterCategoryId) {
        list = list.filter(p => p.category === currentProductFilterCategoryId);
    }

    if (!list.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align:center;padding:1rem;">
                    Chưa có sản phẩm nào trong danh mục này.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = list
        .map(
            p => `
        <tr>
            <td>${p.id}</td>
            <td><img src="${p.image}" class="product-image"></td>
            <td>${p.name}</td>
            <td>${getCategoryName(p.category)}</td>
            <td>${formatCurrency(p.price)}đ</td>
            <td>
                <span class="status-badge ${
                    p.status === "active" ? "status-completed" : "status-cancelled"
                }">${p.status === "active" ? "Hoạt động" : "Ẩn"}</span>
            </td>
            <td>
                <button class="btn btn-warning btn-sm" onclick="editProduct(${p.id})">Sửa</button>
                <button class="btn btn-danger btn-sm" onclick="deleteProduct(${p.id})">Xóa</button>
            </td>
        </tr>
    `
        )
        .join("");
}

// ================== THÊM / SỬA SẢN PHẨM ==================
function showAddProductModal() {
    const modal = document.getElementById("add-product-modal");
    const form = document.getElementById("add-product-form");

    currentEditingProductId = null;
    form.reset();
    form.dataset.mode = "add";

    populateProductCategoryOptions();

    // ⭐ Nếu đang chọn danh mục → tự set danh mục đó
    if (currentProductFilterCategoryId) {
        document.getElementById("product-category").value = currentProductFilterCategoryId;
    }

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

    document.getElementById("product-name").value = product.name;
    document.getElementById("product-category").value = product.category;
    document.getElementById("product-description").value = product.description;
    document.getElementById("product-full-description").value = product.fullDescription;
    document.getElementById("product-image").value = product.image;
    document.getElementById("product-badge").value = product.badge;

    document.getElementById("product-extra-images").value =
        product.extraImages.join("\n");

    resetPriceRows(product.prices);

    modal.style.display = "block";
}

// ================== XOÁ SẢN PHẨM ==================
function deleteProduct(id) {
    if (!confirm("Xóa sản phẩm này?")) return;

    adminData.products = adminData.products.filter(p => p.id !== id);
    updateCategoryProductCounts();
    saveAllData();
    loadProducts();
    loadCategories();
}

// ================== SUBMIT FORM SẢN PHẨM ==================
function initProductForm() {
    const form = document.getElementById("add-product-form");
    if (!form) return;

    form.addEventListener("submit", function (e) {
        e.preventDefault();
        const mode = this.dataset.mode;

        const name = document.getElementById("product-name").value.trim();
        const category = document.getElementById("product-category").value;
        const image = document.getElementById("product-image").value.trim();
        const badge = document.getElementById("product-badge").value;
        const desc = document.getElementById("product-description").value.trim();
        const fullDesc = document.getElementById("product-full-description").value.trim();

        const extraImages = document
            .getElementById("product-extra-images")
            .value.split("\n")
            .map(s => s.trim())
            .filter(Boolean);

        // nhiều mức giá
        const priceRows = document.querySelectorAll("#price-list .price-row");
        const prices = [];
        priceRows.forEach(row => {
            const amount = parseInt(row.querySelector(".price-amount").value) || 0;
            const label = row.querySelector(".price-label").value.trim();
            if (amount > 0) prices.push({ amount, label });
        });

        const mainPrice = prices.length ? prices[0].amount : 0;

        const data = {
            name,
            category,
            price: mainPrice,
            prices,
            description: desc,
            fullDescription: fullDesc,
            image,
            extraImages,
            badge,
            status: "active"
        };

        if (mode === "edit") {
            const idx = adminData.products.findIndex(p => p.id === currentEditingProductId);
            adminData.products[idx] = {
                ...adminData.products[idx],
                ...data
            };
        } else {
            adminData.products.push({
                id: Date.now(),
                ...data
            });
        }

        updateCategoryProductCounts();
        saveAllData();

        document.getElementById("add-product-modal").style.display = "none";

        loadProducts();
        loadCategories();
    });
}
// ================== QUẢN LÝ DANH MỤC ==================
function loadCategories() {
    const grid = document.getElementById("categories-grid");
    if (!grid) return;

    updateCategoryProductCounts();

    grid.innerHTML = adminData.categories
        .map(
            cat => `
        <div class="category-item" onclick="openCategoryProducts('${cat.id}')">
            <div class="category-header">
                <div class="category-name">
                    ${
                        cat.logo
                            ? `<img src="${cat.logo}" style="width:32px;height:32px;border-radius:6px;object-fit:cover;margin-right:8px;">`
                            : ""
                    }
                    <span>${cat.name}</span>
                </div>
                <div class="category-stats">${cat.productCount} sản phẩm</div>
            </div>

            <div style="margin-top: 1rem;">
                <button class="btn btn-warning btn-sm"
                        onclick="event.stopPropagation(); editCategory('${cat.id}')">Sửa</button>

                <button class="btn btn-danger btn-sm"
                        onclick="event.stopPropagation(); deleteCategory('${cat.id}')">Xóa</button>
            </div>
        </div>
    `
        )
        .join("");
}

function openCategoryProducts(categoryId) {
    currentProductFilterCategoryId = categoryId;

    // đánh dấu menu trái
    document.querySelectorAll(".sidebar-menu li").forEach(li => li.classList.remove("active"));
    const link = document.querySelector('.sidebar-menu a[href="#products"]');
    if (link && link.parentElement) link.parentElement.classList.add("active");

    // chuyển sang trang sản phẩm
    document.querySelectorAll(".admin-section").forEach(sec => sec.classList.remove("active"));
    document.getElementById("products-section").classList.add("active");

    updateCategoryProductCounts();
    populateProductCategoryOptions();
    loadProducts();
}

// ================== KHỞI TẠO ==================
// ================== KHỞI TẠO ==================
window.onload = function () {
    initLogin();
    initProductForm();

    // nút thêm dòng giá
    const addPriceBtn = document.getElementById("add-price-btn");
    if (addPriceBtn) {
        addPriceBtn.addEventListener("click", () => addPriceRow());
    }
};