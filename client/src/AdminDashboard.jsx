import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  FiBell,
  FiBox,
  FiChevronLeft,
  FiChevronRight,
  FiCheck,
  FiCopy,
  FiDownload,
  FiEdit2,
  FiGrid,
  FiImage,
  FiLayers,
  FiLogOut,
  FiMoon,
  FiPackage,
  FiPercent,
  FiPlus,
  FiRefreshCcw,
  FiSave,
  FiSearch,
  FiSettings,
  FiShoppingBag,
  FiStar,
  FiTag,
  FiTrash2,
  FiUpload,
  FiUsers,
  FiX,
} from "react-icons/fi";
import { API_BASE_URL } from "./apiConfig";
import "./AdminDashboard.css";

const storageKeys = {
  token: "fashionstore_admin_token",
  user: "fashionstore_admin_user",
};

const navItems = [
  ["dashboard", "Dashboard", FiGrid],
  ["products", "Products", FiPackage],
  ["categories", "Categories", FiLayers],
  ["brands", "Brands", FiTag],
  ["orders", "Orders", FiShoppingBag],
  ["customers", "Customers", FiUsers],
  ["reviews", "Reviews", FiStar],
  ["coupons", "Coupons", FiPercent],
  ["settings", "Settings", FiSettings],
];

const chartColors = ["#0f766e", "#be123c", "#2563eb", "#d97706", "#7c3aed", "#16a34a"];

const listFromText = (value) =>
  value
    ?.split(",")
    .map((item) => item.trim())
    .filter(Boolean) || [];

const textFromList = (value) => (Array.isArray(value) ? value.join(", ") : value || "");

const formatPrice = (value) =>
  new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

const formatNotificationTime = (value) =>
  value
    ? new Intl.DateTimeFormat("en-IN", {
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        month: "short",
      }).format(new Date(value))
    : "Now";

const playNotificationSound = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, context.currentTime);
    oscillator.frequency.setValueAtTime(660, context.currentTime + 0.12);
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.22, context.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.28);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.3);
  } catch {
    // Browser autoplay policies can block sound until the admin interacts with the page.
  }
};

const getStoredAdmin = () => {
  const token = localStorage.getItem(storageKeys.token) || sessionStorage.getItem(storageKeys.token);
  const rawUser = localStorage.getItem(storageKeys.user) || sessionStorage.getItem(storageKeys.user);

  if (!token || !rawUser) return { token: "", user: null };

  try {
    return { token, user: JSON.parse(rawUser) };
  } catch {
    return { token: "", user: null };
  }
};

const clearStoredAdmin = () => {
  [localStorage, sessionStorage].forEach((store) => {
    store.removeItem(storageKeys.token);
    store.removeItem(storageKeys.user);
  });
};

const emptyProduct = {
  name: "",
  slug: "",
  description: "",
  shortDescription: "",
  category: "",
  brand: "",
  gender: "Unisex",
  price: "",
  discountPrice: "",
  stock: "",
  sku: "",
  weight: "",
  material: "",
  fabric: "",
  fabricQuality: "",
  washCare: "",
  shippingInfo: "Ships in 2-5 business days.",
  returnPolicy: "Easy 7-day returns on eligible products.",
  warranty: "Manufacturing defects covered as per brand policy.",
  countryOfOrigin: "India",
  sizesText: "",
  colorsText: "",
  tagsText: "",
  highlightsText: "",
  images: [],
  thumbnail: "",
  featured: false,
  trending: false,
  newArrival: false,
  bestSeller: false,
  status: "active",
};

const emptySizeRow = {
  size: "",
  chest: "",
  shoulder: "",
  length: "",
  sleeveLength: "",
  fit: "",
  recommendedWeight: "",
  recommendedHeight: "",
};

const normalizeProductForForm = (product) => ({
  ...emptyProduct,
  ...product,
  sizesText: textFromList(product?.sizes),
  colorsText: textFromList(product?.colors),
  tagsText: textFromList(product?.tags),
  highlightsText: textFromList(product?.highlights),
  featured: Boolean(product?.featured || product?.isFeatured),
  status: product?.status || (product?.isActive === false ? "hidden" : "active"),
  images: product?.images || [],
  thumbnail: product?.thumbnail || product?.images?.[0] || "",
});

const productPayloadFromForm = (form, sizeChart) => ({
  name: form.name,
  slug: form.slug,
  description: form.description,
  shortDescription: form.shortDescription,
  category: form.category,
  brand: form.brand,
  gender: form.gender,
  price: Number(form.price) || 0,
  discountPrice: Number(form.discountPrice) || 0,
  stock: Number(form.stock) || 0,
  sku: form.sku,
  weight: form.weight,
  material: form.material,
  fabric: form.fabric,
  fabricQuality: form.fabricQuality,
  washCare: form.washCare,
  shippingInfo: form.shippingInfo,
  returnPolicy: form.returnPolicy,
  warranty: form.warranty,
  countryOfOrigin: form.countryOfOrigin,
  sizes: listFromText(form.sizesText),
  colors: listFromText(form.colorsText),
  tags: listFromText(form.tagsText),
  highlights: listFromText(form.highlightsText),
  images: form.images,
  thumbnail: form.thumbnail || form.images?.[0] || "",
  sizeChart: sizeChart.filter((row) => row.size),
  featured: form.featured,
  isFeatured: form.featured,
  trending: form.trending,
  newArrival: form.newArrival,
  bestSeller: form.bestSeller,
  status: form.status,
});

function AdminDashboard() {
  const stored = getStoredAdmin();
  const notificationIdsRef = useRef(new Set());
  const notificationsInitializedRef = useRef(false);
  const [token, setToken] = useState(stored.token);
  const [user, setUser] = useState(stored.user);
  const [isCheckingAuth, setIsCheckingAuth] = useState(Boolean(stored.token));
  const [activeView, setActiveView] = useState("dashboard");
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  const [dashboard, setDashboard] = useState(null);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [productMeta, setProductMeta] = useState({ currentPage: 1, pages: 1, total: 0 });
  const [orderMeta, setOrderMeta] = useState({ currentPage: 1, pages: 1, total: 0 });
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [productQuery, setProductQuery] = useState({
    search: "",
    status: "all",
    category: "",
    sort: "newest",
    page: 1,
    limit: 10,
  });
  const [orderQuery, setOrderQuery] = useState({
    search: "",
    status: "all",
    paymentStatus: "all",
    paymentMethod: "all",
    page: 1,
    limit: 12,
  });

  const authHeaders = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  useEffect(() => {
    if (!token) {
      setIsCheckingAuth(false);
      return;
    }

    axios
      .get(`${API_BASE_URL}/auth/verify`, { headers: authHeaders })
      .then((response) => {
        const verifiedUser = response.data?.data;
        if (verifiedUser?.role !== "admin") {
          throw new Error("Admin access required");
        }
        setUser(verifiedUser);
      })
      .catch(() => {
        clearStoredAdmin();
        setToken("");
        setUser(null);
      })
      .finally(() => setIsCheckingAuth(false));
  }, [authHeaders, token]);

  const loadDashboard = async () => {
    if (!token) return;
    const response = await axios.get(`${API_BASE_URL}/dashboard/stats`, { headers: authHeaders });
    setDashboard(response.data?.data || null);
  };

  const loadProducts = async (overrides = {}) => {
    if (!token) return;
    const params = { ...productQuery, ...overrides };
    setIsLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/products/admin/list`, {
        headers: authHeaders,
        params,
      });
      setProducts(response.data?.data || []);
      setProductMeta({
        currentPage: response.data?.currentPage || 1,
        pages: response.data?.pages || 1,
        total: response.data?.total || 0,
      });
      setProductQuery(params);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTaxonomy = async () => {
    const [categoryResponse, brandResponse] = await Promise.all([
      axios.get(`${API_BASE_URL}/categories`),
      axios.get(`${API_BASE_URL}/brands`),
    ]);
    setCategories(categoryResponse.data?.data || []);
    setBrands(brandResponse.data?.data || []);
  };

  const loadOrders = async (overrides = {}) => {
    if (!token) return;
    const params = { ...orderQuery, ...overrides };
    const response = await axios.get(`${API_BASE_URL}/orders/admin/list`, {
      headers: authHeaders,
      params,
    });
    setOrders(response.data?.data || []);
    setOrderMeta({
      currentPage: response.data?.currentPage || 1,
      pages: response.data?.pages || 1,
      total: response.data?.total || 0,
    });
    setOrderQuery(params);
  };

  const loadAdminNotifications = async ({ silent = false } = {}) => {
    if (!token) return;
    const response = await axios.get(`${API_BASE_URL}/notifications/admin`, {
      headers: authHeaders,
      params: { limit: 20 },
    });
    const nextNotifications = response.data?.data || [];
    const previousIds = notificationIdsRef.current;
    const hasNewOrderNotification =
      notificationsInitializedRef.current &&
      nextNotifications.some(
        (notification) =>
          notification.type === "new_order" &&
          !notification.isRead &&
          !previousIds.has(notification._id)
      );

    setNotifications(nextNotifications);
    setUnreadCount(response.data?.unreadCount || 0);
    notificationIdsRef.current = new Set(nextNotifications.map((notification) => notification._id));
    notificationsInitializedRef.current = true;

    if (hasNewOrderNotification && !silent) {
      playNotificationSound();
      toast.success("New order received");
      loadDashboard();
      loadOrders();
    }
  };

  const markNotificationRead = async (notification) => {
    if (!token || notification.isRead) return;
    try {
      const response = await axios.patch(
        `${API_BASE_URL}/notifications/admin/${notification._id}/read`,
        {},
        { headers: authHeaders }
      );
      setNotifications((current) =>
        current.map((item) =>
          item._id === notification._id ? { ...item, isRead: true, readAt: response.data?.data?.readAt } : item
        )
      );
      setUnreadCount(response.data?.unreadCount || 0);
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to update notification");
    }
  };

  const markAllNotificationsRead = async () => {
    if (!token || unreadCount === 0) return;
    try {
      await axios.patch(`${API_BASE_URL}/notifications/admin/read-all`, {}, { headers: authHeaders });
      setNotifications((current) => current.map((item) => ({ ...item, isRead: true, readAt: new Date().toISOString() })));
      setUnreadCount(0);
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to mark notifications read");
    }
  };

  const refreshAll = async () => {
    try {
      await Promise.all([loadDashboard(), loadProducts(), loadTaxonomy(), loadOrders(), loadAdminNotifications({ silent: true })]);
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to load admin data");
    }
  };

  useEffect(() => {
    if (token && user?.role === "admin") {
      refreshAll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user?.role]);

  useEffect(() => {
    if (!token || user?.role !== "admin") return undefined;

    const interval = setInterval(() => {
      loadAdminNotifications();
    }, 15000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user?.role]);

  const handleLogin = ({ token: nextToken, user: nextUser, remember }) => {
    clearStoredAdmin();
    const storage = remember ? localStorage : sessionStorage;
    storage.setItem(storageKeys.token, nextToken);
    storage.setItem(storageKeys.user, JSON.stringify(nextUser));
    setToken(nextToken);
    setUser(nextUser);
    setActiveView("dashboard");
  };

  const handleLogout = () => {
    clearStoredAdmin();
    setToken("");
    setUser(null);
  };

  if (isCheckingAuth) {
    return <div className="admin-auth-loading">Checking admin session...</div>;
  }

  if (!token || user?.role !== "admin") {
    return <AdminLogin onLogin={handleLogin} />;
  }

  return (
    <div className={darkMode ? "admin-shell dark" : "admin-shell"}>
      <Toaster position="top-right" />
      <AdminSidebar
        activeView={activeView}
        darkMode={darkMode}
        onLogout={handleLogout}
        onNavigate={setActiveView}
        onToggleTheme={() => setDarkMode((value) => !value)}
        user={user}
      />
      <main className="admin-main">
        <AdminHeader
          activeView={activeView}
          isNotificationOpen={isNotificationOpen}
          notifications={notifications}
          onMarkAllNotificationsRead={markAllNotificationsRead}
          onMarkNotificationRead={markNotificationRead}
          onRefresh={refreshAll}
          onToggleNotifications={() => setIsNotificationOpen((value) => !value)}
          unreadCount={unreadCount}
        />
        {activeView === "dashboard" && <DashboardView dashboard={dashboard} orders={orders} products={products} />}
        {activeView === "products" && (
          <ProductsView
            authHeaders={authHeaders}
            brands={brands}
            categories={categories}
            isLoading={isLoading}
            loadProducts={loadProducts}
            productMeta={productMeta}
            productQuery={productQuery}
            products={products}
            refreshAll={refreshAll}
          />
        )}
        {activeView === "categories" && (
          <TaxonomyView
            authHeaders={authHeaders}
            endpoint="categories"
            icon={FiLayers}
            items={categories}
            loadTaxonomy={loadTaxonomy}
            title="Categories"
          />
        )}
        {activeView === "brands" && (
          <TaxonomyView
            authHeaders={authHeaders}
            endpoint="brands"
            icon={FiTag}
            items={brands}
            loadTaxonomy={loadTaxonomy}
            title="Brands"
          />
        )}
        {activeView === "orders" && (
          <OrdersView
            authHeaders={authHeaders}
            loadOrders={loadOrders}
            orderMeta={orderMeta}
            orderQuery={orderQuery}
            orders={orders}
            refreshAll={refreshAll}
          />
        )}
        {activeView === "customers" && <CustomersView orders={orders} />}
        {activeView === "reviews" && <ReviewsView />}
        {activeView === "coupons" && <CouponsView />}
        {activeView === "settings" && <SettingsView darkMode={darkMode} setDarkMode={setDarkMode} />}
      </main>
    </div>
  );
}

function AdminLogin({ onLogin }) {
  const [form, setForm] = useState({ email: "", password: "", remember: true });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        email: form.email,
        password: form.password,
      });
      const data = response.data?.data;
      if (data?.user?.role !== "admin") {
        toast.error("Admin access only");
        return;
      }
      toast.success("Welcome back");
      onLogin({ token: data.token, user: data.user, remember: form.remember });
    } catch (error) {
      toast.error(error.response?.data?.message || "Login failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="admin-login-page">
      <Toaster position="top-right" />
      <form className="admin-login-card" onSubmit={submit}>
        <div className="admin-login-mark">
          <FiShoppingBag aria-hidden="true" />
        </div>
        <p className="admin-eyebrow">Bhagyam Exports Admin</p>
        <h1>Admin Login</h1>
        <label>
          Email
          <input
            autoComplete="email"
            onChange={(event) => setForm((value) => ({ ...value, email: event.target.value }))}
            placeholder="admin@bhagyamexports.com"
            required
            type="email"
            value={form.email}
          />
        </label>
        <label>
          Password
          <input
            autoComplete="current-password"
            onChange={(event) => setForm((value) => ({ ...value, password: event.target.value }))}
            placeholder="Enter password"
            required
            type="password"
            value={form.password}
          />
        </label>
        <div className="admin-login-row">
          <label className="admin-check">
            <input
              checked={form.remember}
              onChange={(event) => setForm((value) => ({ ...value, remember: event.target.checked }))}
              type="checkbox"
            />
            Remember Me
          </label>
          <button className="admin-link-button" type="button" onClick={() => toast("Password reset UI only")}>
            Forgot Password
          </button>
        </div>
        <button className="admin-primary" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Signing in..." : "Login"}
        </button>
      </form>
    </div>
  );
}

function AdminSidebar({ activeView, darkMode, onLogout, onNavigate, onToggleTheme, user }) {
  return (
    <aside className="admin-sidebar">
      <div className="admin-sidebar-brand">
        <FiBox aria-hidden="true" />
        <div>
          <strong>Bhagyam Exports</strong>
          <span>{user?.name || "Admin"}</span>
        </div>
      </div>
      <nav>
        {navItems.map(([id, label, Icon]) => (
          <button
            className={activeView === id ? "admin-nav-item active" : "admin-nav-item"}
            key={id}
            onClick={() => onNavigate(id)}
            type="button"
          >
            <Icon aria-hidden="true" />
            <span>{label}</span>
          </button>
        ))}
      </nav>
      <div className="admin-sidebar-actions">
        <button className="admin-nav-item" onClick={onToggleTheme} type="button">
          <FiMoon aria-hidden="true" />
          <span>{darkMode ? "Light Mode" : "Dark Mode"}</span>
        </button>
        <button className="admin-nav-item danger" onClick={onLogout} type="button">
          <FiLogOut aria-hidden="true" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}

function AdminHeader({
  activeView,
  isNotificationOpen,
  notifications,
  onMarkAllNotificationsRead,
  onMarkNotificationRead,
  onRefresh,
  onToggleNotifications,
  unreadCount,
}) {
  const title = navItems.find(([id]) => id === activeView)?.[1] || "Admin";
  return (
    <header className="admin-header">
      <div>
        <p className="admin-eyebrow">Control center</p>
        <h1>{title}</h1>
      </div>
      <div className="admin-header-actions">
        <div className="admin-notification-wrap">
          <button
            aria-label="Notifications"
            className={unreadCount > 0 ? "admin-icon-button has-unread" : "admin-icon-button"}
            onClick={onToggleNotifications}
            type="button"
          >
            <FiBell aria-hidden="true" />
            {unreadCount > 0 && <span>{unreadCount > 9 ? "9+" : unreadCount}</span>}
          </button>
          {isNotificationOpen && (
            <NotificationDropdown
              notifications={notifications}
              onMarkAllNotificationsRead={onMarkAllNotificationsRead}
              onMarkNotificationRead={onMarkNotificationRead}
              unreadCount={unreadCount}
            />
          )}
        </div>
        <button className="admin-secondary" onClick={onRefresh} type="button">
          <FiRefreshCcw aria-hidden="true" />
          Refresh
        </button>
      </div>
    </header>
  );
}

function NotificationDropdown({
  notifications,
  onMarkAllNotificationsRead,
  onMarkNotificationRead,
  unreadCount,
}) {
  return (
    <section className="admin-notification-panel">
      <div className="admin-notification-heading">
        <div>
          <strong>Notifications</strong>
          <span>{unreadCount} unread</span>
        </div>
        <button disabled={unreadCount === 0} onClick={onMarkAllNotificationsRead} type="button">
          <FiCheck aria-hidden="true" />
          Mark all read
        </button>
      </div>
      <div className="admin-notification-list">
        {notifications.length === 0 ? (
          <div className="admin-empty-notification">No order notifications yet.</div>
        ) : (
          notifications.map((notification) => (
            <article
              className={notification.isRead ? "admin-notification-item" : "admin-notification-item unread"}
              key={notification._id}
            >
              <div>
                <strong>{notification.title}</strong>
                <p>{notification.message}</p>
                <span>
                  {notification.orderNumber} / {formatNotificationTime(notification.createdAt)}
                </span>
              </div>
              {!notification.isRead && (
                <button onClick={() => onMarkNotificationRead(notification)} title="Mark read" type="button">
                  <FiCheck aria-hidden="true" />
                </button>
              )}
            </article>
          ))
        )}
      </div>
    </section>
  );
}

function DashboardView({ dashboard, orders, products }) {
  const overview = dashboard?.overview || {};
  const cards = [
    ["Revenue", `Rs. ${formatPrice(overview.revenue || 0)}`, FiShoppingBag],
    ["Orders", overview.totalOrders || 0, FiShoppingBag],
    ["Pending Orders", overview.pendingOrders || 0, FiRefreshCcw],
    ["Customers", overview.totalUsers || 0, FiUsers],
    ["Total Products", overview.totalProducts || 0, FiPackage],
    ["Low Stock Products", overview.lowStockProducts || 0, FiBox],
    ["Out of Stock Products", overview.outOfStock || 0, FiX],
    ["Avg Order Value", `Rs. ${formatPrice(overview.averageOrderValue || 0)}`, FiTag],
  ];
  const monthly = dashboard?.salesAnalytics?.length
    ? dashboard.salesAnalytics
    : [{ month: "Now", revenue: 0, orders: orders.length }];
  const categoryData = dashboard?.categoryDistribution || [];
  const stockData = dashboard?.lowStockGraph || [];
  const recentOrders = dashboard?.recentOrders || orders.slice(0, 6);
  const topSellingProducts = dashboard?.topSellingProducts || [];

  return (
    <section className="admin-view">
      <div className="admin-card-grid">
        {cards.map(([label, value, Icon]) => (
          <article className="admin-stat-card" key={label}>
            <div>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
            <Icon aria-hidden="true" />
          </article>
        ))}
      </div>
      <div className="admin-chart-grid">
        <ChartPanel title="Sales Analytics">
          <ResponsiveContainer height={260} width="100%">
            <LineChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Line dataKey="revenue" stroke="#0f766e" strokeWidth={3} type="monotone" />
              <Line dataKey="orders" stroke="#be123c" strokeWidth={3} type="monotone" />
            </LineChart>
          </ResponsiveContainer>
        </ChartPanel>
        <ChartPanel title="Category Distribution">
          <ResponsiveContainer height={260} width="100%">
            <PieChart>
              <Pie data={categoryData} dataKey="count" innerRadius={58} nameKey="name" outerRadius={92}>
                {categoryData.map((entry, index) => (
                  <Cell fill={chartColors[index % chartColors.length]} key={entry._id || entry.name} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartPanel>
        <ChartPanel title="Low Stock Graph">
          <ResponsiveContainer height={260} width="100%">
            <BarChart data={stockData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" hide />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="stock" fill="#be123c" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>
      </div>
      <section className="admin-panel">
        <div className="admin-panel-heading">
          <h2>Recent Products</h2>
        </div>
        <div className="admin-recent-grid">
          {(dashboard?.recentProducts || products.slice(0, 6)).map((product) => (
            <article className="admin-recent-product" key={product._id}>
              <img src={product.thumbnail || product.images?.[0]} alt={product.name} />
              <div>
                <strong>{product.name}</strong>
                <span>{product.brand} / {product.category}</span>
              </div>
              <em>{product.status || (product.isActive ? "active" : "hidden")}</em>
            </article>
          ))}
        </div>
      </section>
      <div className="admin-chart-grid two-column">
        <section className="admin-panel">
          <div className="admin-panel-heading">
            <h2>Recent Orders</h2>
          </div>
          <div className="admin-list">
            {recentOrders.length ? recentOrders.map((order) => (
              <article className="admin-list-item order-list-item" key={order._id}>
                <div className="admin-order-avatar">{order.customer?.fullName?.slice(0, 1) || "C"}</div>
                <div>
                  <strong>{order.orderNumber}</strong>
                  <span>{order.customer?.fullName || "Customer"} / Rs. {formatPrice(order.total)}</span>
                </div>
                <em className={`status-pill ${String(order.status).toLowerCase().replace(/\s+/g, '-')}`}>{order.status}</em>
              </article>
            )) : <div className="status-box">No orders yet</div>}
          </div>
        </section>
        <section className="admin-panel">
          <div className="admin-panel-heading">
            <h2>Top Selling Products</h2>
          </div>
          <div className="admin-list">
            {topSellingProducts.length ? topSellingProducts.map((product) => (
              <article className="admin-list-item" key={product._id || product.name}>
                <img src={product.image} alt={product.name} />
                <div>
                  <strong>{product.name}</strong>
                  <span>{product.quantity} sold / Rs. {formatPrice(product.revenue)}</span>
                </div>
                <em>{product.brand}</em>
              </article>
            )) : <div className="status-box">Top sellers will appear after orders</div>}
          </div>
        </section>
      </div>
    </section>
  );
}

function ChartPanel({ children, title }) {
  return (
    <article className="admin-panel">
      <div className="admin-panel-heading">
        <h2>{title}</h2>
      </div>
      {children}
    </article>
  );
}

function ProductsView({
  authHeaders,
  brands,
  categories,
  isLoading,
  loadProducts,
  productMeta,
  productQuery,
  products,
  refreshAll,
}) {
  const [selectedIds, setSelectedIds] = useState([]);
  const [editingProduct, setEditingProduct] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [bulkCategory, setBulkCategory] = useState("");
  const [bulkPrice, setBulkPrice] = useState({ price: "", discountPrice: "" });

  const selectedCount = selectedIds.length;
  const allVisibleSelected = products.length > 0 && products.every((product) => selectedIds.includes(product._id));

  const updateQuery = (updates) => {
    loadProducts({ ...updates, page: updates.page || 1 });
  };

  const bulkUpdate = async (operation, updates = {}) => {
    if (selectedIds.length === 0) {
      toast.error("Select products first");
      return;
    }
    if (operation === "soft-delete" && !window.confirm("Hide selected products?")) return;

    try {
      await axios.patch(
        `${API_BASE_URL}/products/bulk`,
        { ids: selectedIds, operation, updates },
        { headers: authHeaders }
      );
      toast.success("Bulk update complete");
      setSelectedIds([]);
      refreshAll();
    } catch (error) {
      toast.error(error.response?.data?.message || "Bulk update failed");
    }
  };

  const deleteProduct = async (product) => {
    if (!window.confirm(`Hide ${product.name}?`)) return;
    try {
      await axios.delete(`${API_BASE_URL}/products/${product._id}`, { headers: authHeaders });
      toast.success("Product hidden");
      refreshAll();
    } catch (error) {
      toast.error(error.response?.data?.message || "Delete failed");
    }
  };

  const restoreProduct = async (product) => {
    try {
      await axios.put(`${API_BASE_URL}/products/${product._id}/restore`, {}, { headers: authHeaders });
      toast.success("Product restored");
      refreshAll();
    } catch (error) {
      toast.error(error.response?.data?.message || "Restore failed");
    }
  };

  const duplicateProduct = async (product) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/products/${product._id}/duplicate`, {}, { headers: authHeaders });
      toast.success("Product duplicated");
      setEditingProduct(response.data?.data);
      setShowForm(true);
      refreshAll();
    } catch (error) {
      toast.error(error.response?.data?.message || "Duplicate failed");
    }
  };

  const exportCsv = () => {
    const headers = ["name", "sku", "brand", "category", "price", "discountPrice", "stock", "status"];
    const rows = products.map((product) =>
      headers.map((key) => `"${String(product[key] ?? "").replaceAll('"', '""')}"`).join(",")
    );
    const blob = new Blob([[headers.join(","), ...rows].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "fashionstore-products.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const importCsv = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const [headerLine, ...lines] = text.split(/\r?\n/).filter(Boolean);
    const headers = headerLine.split(",").map((header) => header.trim());
    const records = lines.map((line) => {
      const values = line.split(",").map((value) => value.replace(/^"|"$/g, "").trim());
      return headers.reduce((record, header, index) => ({ ...record, [header]: values[index] || "" }), {});
    });

    try {
      await Promise.all(
        records.map((record) =>
          axios.post(
            `${API_BASE_URL}/products`,
            {
              name: record.name,
              description: record.description || `${record.name} product details`,
              brand: record.brand,
              category: record.category,
              price: Number(record.price) || 0,
              discountPrice: Number(record.discountPrice) || Number(record.price) || 0,
              stock: Number(record.stock) || 0,
              sku: record.sku,
              status: record.status || "active",
            },
            { headers: authHeaders }
          )
        )
      );
      toast.success("CSV imported");
      refreshAll();
    } catch (error) {
      toast.error(error.response?.data?.message || "CSV import failed");
    } finally {
      event.target.value = "";
    }
  };

  if (showForm) {
    return (
      <ProductForm
        authHeaders={authHeaders}
        brands={brands}
        categories={categories}
        onClose={() => {
          setEditingProduct(null);
          setShowForm(false);
        }}
        onSaved={() => {
          setEditingProduct(null);
          setShowForm(false);
          refreshAll();
        }}
        product={editingProduct}
      />
    );
  }

  return (
    <section className="admin-view">
      <div className="admin-toolbar">
        <div className="admin-search">
          <FiSearch aria-hidden="true" />
          <input
            onChange={(event) => updateQuery({ search: event.target.value })}
            placeholder="Search products, SKU, brand"
            type="search"
            value={productQuery.search}
          />
        </div>
        <select onChange={(event) => updateQuery({ status: event.target.value })} value={productQuery.status}>
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="hidden">Hidden</option>
          <option value="archived">Archived</option>
        </select>
        <select onChange={(event) => updateQuery({ category: event.target.value })} value={productQuery.category}>
          <option value="">All Categories</option>
          {categories.map((category) => (
            <option key={category._id} value={category.name}>{category.name}</option>
          ))}
        </select>
        <select onChange={(event) => updateQuery({ sort: event.target.value })} value={productQuery.sort}>
          <option value="newest">Newest</option>
          <option value="name">Name</option>
          <option value="price-asc">Price Low</option>
          <option value="price-desc">Price High</option>
          <option value="stock-asc">Low Stock</option>
          <option value="stock-desc">High Stock</option>
        </select>
        <button className="admin-primary" onClick={() => setShowForm(true)} type="button">
          <FiPlus aria-hidden="true" />
          Add Product
        </button>
      </div>

      <div className="admin-bulkbar">
        <strong>{selectedCount} selected</strong>
        <button onClick={() => bulkUpdate("soft-delete")} type="button">Bulk Delete</button>
        <button onClick={() => bulkUpdate("restore")} type="button">Restore</button>
        <select onChange={(event) => setBulkCategory(event.target.value)} value={bulkCategory}>
          <option value="">Bulk Category Change</option>
          {categories.map((category) => (
            <option key={category._id} value={category.name}>{category.name}</option>
          ))}
        </select>
        <button onClick={() => bulkUpdate("category-change", { category: bulkCategory })} type="button">Apply Category</button>
        <input
          onChange={(event) => setBulkPrice((value) => ({ ...value, price: event.target.value }))}
          placeholder="Price"
          type="number"
          value={bulkPrice.price}
        />
        <input
          onChange={(event) => setBulkPrice((value) => ({ ...value, discountPrice: event.target.value }))}
          placeholder="Discount"
          type="number"
          value={bulkPrice.discountPrice}
        />
        <button onClick={() => bulkUpdate("price-update", bulkPrice)} type="button">Bulk Price Update</button>
        <button onClick={exportCsv} type="button"><FiDownload aria-hidden="true" /> Export CSV</button>
        <label className="admin-file-button">
          <FiUpload aria-hidden="true" /> Import CSV
          <input accept=".csv" onChange={importCsv} type="file" />
        </label>
      </div>

      <section className="admin-panel">
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>
                  <input
                    checked={allVisibleSelected}
                    onChange={(event) =>
                      setSelectedIds(event.target.checked ? products.map((product) => product._id) : [])
                    }
                    type="checkbox"
                  />
                </th>
                <th>Image</th>
                <th>Product Name</th>
                <th>SKU</th>
                <th>Brand</th>
                <th>Category</th>
                <th>Price</th>
                <th>Discount Price</th>
                <th>Stock</th>
                <th>Status</th>
                <th>Rating</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan="12">Loading products...</td></tr>
              ) : (
                products.map((product) => {
                  const isSelected = selectedIds.includes(product._id);
                  return (
                    <tr key={product._id}>
                      <td>
                        <input
                          checked={isSelected}
                          onChange={(event) =>
                            setSelectedIds((ids) =>
                              event.target.checked
                                ? [...ids, product._id]
                                : ids.filter((id) => id !== product._id)
                            )
                          }
                          type="checkbox"
                        />
                      </td>
                      <td><img className="admin-product-thumb" src={product.thumbnail || product.images?.[0]} alt={product.name} /></td>
                      <td><strong>{product.name}</strong></td>
                      <td>{product.sku || product._id.slice(-8).toUpperCase()}</td>
                      <td>{product.brand}</td>
                      <td>{product.category}</td>
                      <td>Rs. {formatPrice(product.price)}</td>
                      <td>Rs. {formatPrice(product.discountPrice || product.price)}</td>
                      <td><span className={product.stock <= 10 ? "stock-pill low" : "stock-pill"}>{product.stock}</span></td>
                      <td><span className={`status-pill ${product.status || "active"}`}>{product.status || "active"}</span></td>
                      <td>{product.rating || 0}</td>
                      <td>
                        <div className="admin-action-row">
                          <button onClick={() => { setEditingProduct(product); setShowForm(true); }} title="Edit" type="button"><FiEdit2 /></button>
                          <button onClick={() => duplicateProduct(product)} title="Duplicate" type="button"><FiCopy /></button>
                          {product.isActive === false || product.status === "hidden" ? (
                            <button onClick={() => restoreProduct(product)} title="Restore" type="button"><FiRefreshCcw /></button>
                          ) : (
                            <button onClick={() => deleteProduct(product)} title="Delete" type="button"><FiTrash2 /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="admin-pagination">
          <span>{productMeta.total} products</span>
          <div>
            <button
              disabled={productMeta.currentPage <= 1}
              onClick={() => loadProducts({ page: productMeta.currentPage - 1 })}
              type="button"
            >
              <FiChevronLeft />
            </button>
            <strong>{productMeta.currentPage} / {productMeta.pages}</strong>
            <button
              disabled={productMeta.currentPage >= productMeta.pages}
              onClick={() => loadProducts({ page: productMeta.currentPage + 1 })}
              type="button"
            >
              <FiChevronRight />
            </button>
          </div>
        </div>
      </section>
    </section>
  );
}

function ProductForm({ authHeaders, brands, categories, onClose, onSaved, product }) {
  const draftKey = product?._id ? `product-draft-${product._id}` : "product-draft-new";
  const [form, setForm] = useState(() => normalizeProductForForm(product || emptyProduct));
  const [sizeChart, setSizeChart] = useState(product?.sizeChart?.length ? product.sizeChart : [{ ...emptySizeRow }]);
  const [isSaving, setIsSaving] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      localStorage.setItem(draftKey, JSON.stringify({ form, sizeChart }));
      setDraftSaved(true);
    }, 700);
    return () => clearTimeout(timeout);
  }, [draftKey, form, sizeChart]);

  const updateForm = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      const payload = productPayloadFromForm(form, sizeChart);
      if (product?._id) {
        await axios.put(`${API_BASE_URL}/products/${product._id}`, payload, { headers: authHeaders });
        toast.success("Product updated");
      } else {
        await axios.post(`${API_BASE_URL}/products`, payload, { headers: authHeaders });
        toast.success("Product created");
      }
      localStorage.removeItem(draftKey);
      onSaved();
    } catch (error) {
      toast.error(error.response?.data?.message || "Product save failed");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="admin-view">
      <form className="admin-product-form" onSubmit={submit}>
        <div className="admin-form-header">
          <div>
            <p className="admin-eyebrow">{product?._id ? "Edit Product" : "Add Product"}</p>
            <h2>{product?._id ? product.name : "New Product"}</h2>
            {draftSaved && <span>Draft saved</span>}
          </div>
          <div>
            <button className="admin-secondary" onClick={onClose} type="button">Cancel</button>
            <button className="admin-primary" disabled={isSaving} type="submit">
              <FiSave aria-hidden="true" />
              {isSaving ? "Saving..." : "Save Product"}
            </button>
          </div>
        </div>

        <div className="admin-form-grid">
          <TextField label="Product Name" required value={form.name} onChange={(value) => updateForm("name", value)} />
          <TextField label="Slug" value={form.slug} onChange={(value) => updateForm("slug", value)} />
          <TextField label="SKU" value={form.sku} onChange={(value) => updateForm("sku", value)} />
          <label>
            Category
            <select required onChange={(event) => updateForm("category", event.target.value)} value={form.category}>
              <option value="">Select category</option>
              {categories.map((category) => <option key={category._id} value={category.name}>{category.name}</option>)}
            </select>
          </label>
          <label>
            Brand
            <select required onChange={(event) => updateForm("brand", event.target.value)} value={form.brand}>
              <option value="">Select brand</option>
              {brands.map((brand) => <option key={brand._id} value={brand.name}>{brand.name}</option>)}
            </select>
          </label>
          <label>
            Gender
            <select onChange={(event) => updateForm("gender", event.target.value)} value={form.gender}>
              {["Men", "Women", "Kids", "Unisex", "Other"].map((gender) => <option key={gender}>{gender}</option>)}
            </select>
          </label>
          <TextField label="Price" required type="number" value={form.price} onChange={(value) => updateForm("price", value)} />
          <TextField label="Discount Price" type="number" value={form.discountPrice} onChange={(value) => updateForm("discountPrice", value)} />
          <TextField label="Stock" required type="number" value={form.stock} onChange={(value) => updateForm("stock", value)} />
          <TextField label="Weight" value={form.weight} onChange={(value) => updateForm("weight", value)} />
          <TextField label="Material" value={form.material} onChange={(value) => updateForm("material", value)} />
          <TextField label="Fabric" value={form.fabric} onChange={(value) => updateForm("fabric", value)} />
          <TextField label="Fabric Quality" value={form.fabricQuality} onChange={(value) => updateForm("fabricQuality", value)} />
          <TextField label="Country of Origin" value={form.countryOfOrigin} onChange={(value) => updateForm("countryOfOrigin", value)} />
          <TextField label="Available Sizes" value={form.sizesText} onChange={(value) => updateForm("sizesText", value)} />
          <TextField label="Available Colors" value={form.colorsText} onChange={(value) => updateForm("colorsText", value)} />
          <TextField label="Product Tags" value={form.tagsText} onChange={(value) => updateForm("tagsText", value)} />
          <TextField label="Product Highlights" value={form.highlightsText} onChange={(value) => updateForm("highlightsText", value)} />
          <label className="admin-wide">
            Short Description
            <textarea onChange={(event) => updateForm("shortDescription", event.target.value)} rows="2" value={form.shortDescription} />
          </label>
          <label className="admin-wide">
            Description
            <textarea required onChange={(event) => updateForm("description", event.target.value)} rows="4" value={form.description} />
          </label>
          <label>
            Wash Care
            <textarea onChange={(event) => updateForm("washCare", event.target.value)} rows="3" value={form.washCare} />
          </label>
          <label>
            Shipping Information
            <textarea onChange={(event) => updateForm("shippingInfo", event.target.value)} rows="3" value={form.shippingInfo} />
          </label>
          <label>
            Return Policy
            <textarea onChange={(event) => updateForm("returnPolicy", event.target.value)} rows="3" value={form.returnPolicy} />
          </label>
          <label>
            Warranty
            <textarea onChange={(event) => updateForm("warranty", event.target.value)} rows="3" value={form.warranty} />
          </label>
        </div>

        <div className="admin-toggle-grid">
          {[
            ["featured", "Featured Product"],
            ["trending", "Trending Product"],
            ["newArrival", "New Arrival"],
            ["bestSeller", "Best Seller"],
          ].map(([key, label]) => (
            <label className="admin-check-card" key={key}>
              <input checked={Boolean(form[key])} onChange={(event) => updateForm(key, event.target.checked)} type="checkbox" />
              {label}
            </label>
          ))}
          <label className="admin-check-card">
            Status
            <select onChange={(event) => updateForm("status", event.target.value)} value={form.status}>
              <option value="active">Active</option>
              <option value="hidden">Hidden</option>
              <option value="archived">Archived</option>
            </select>
          </label>
        </div>

        <ImageUploader authHeaders={authHeaders} form={form} updateForm={updateForm} />

        <section className="admin-panel">
          <div className="admin-panel-heading">
            <h2>Size Guide</h2>
            <button
              className="admin-secondary"
              onClick={() => setSizeChart((rows) => [...rows, { ...emptySizeRow }])}
              type="button"
            >
              <FiPlus aria-hidden="true" /> Add Size
            </button>
          </div>
          <div className="admin-size-editor">
            {sizeChart.map((row, index) => (
              <div className="admin-size-row" key={index}>
                {Object.keys(emptySizeRow).map((key) => (
                  <input
                    key={key}
                    onChange={(event) =>
                      setSizeChart((rows) =>
                        rows.map((current, rowIndex) =>
                          rowIndex === index ? { ...current, [key]: event.target.value } : current
                        )
                      )
                    }
                    placeholder={key.replace(/([A-Z])/g, " $1")}
                    value={row[key] || ""}
                  />
                ))}
                <button
                  onClick={() => setSizeChart((rows) => rows.filter((_, rowIndex) => rowIndex !== index))}
                  type="button"
                >
                  <FiTrash2 aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        </section>
      </form>
    </section>
  );
}

function ImageUploader({ authHeaders, form, updateForm }) {
  const [isUploading, setIsUploading] = useState(false);

  const uploadFiles = async (files) => {
    if (!files.length) return;
    const body = new FormData();
    files.forEach((file) => body.append("images", file));
    setIsUploading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/upload/multiple`, body, {
        headers: { ...authHeaders, "Content-Type": "multipart/form-data" },
      });
      const urls = response.data?.data?.map((image) => image.url) || [];
      updateForm("images", [...form.images, ...urls]);
      if (!form.thumbnail && urls[0]) updateForm("thumbnail", urls[0]);
      toast.success("Images uploaded");
    } catch (error) {
      toast.error(error.response?.data?.message || "Image upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const moveImage = (index, direction) => {
    const nextImages = [...form.images];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= nextImages.length) return;
    [nextImages[index], nextImages[targetIndex]] = [nextImages[targetIndex], nextImages[index]];
    updateForm("images", nextImages);
  };

  return (
    <section className="admin-panel">
      <div className="admin-panel-heading">
        <h2>Image Upload</h2>
        <span>{isUploading ? "Uploading..." : `${form.images.length} image(s)`}</span>
      </div>
      <div
        className="admin-dropzone"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          uploadFiles([...event.dataTransfer.files]);
        }}
      >
        <FiImage aria-hidden="true" />
        <strong>Drag and drop product images</strong>
        <label className="admin-file-button">
          <FiUpload aria-hidden="true" /> Choose Images
          <input accept="image/*" multiple onChange={(event) => uploadFiles([...event.target.files])} type="file" />
        </label>
      </div>
      <div className="admin-image-grid">
        {form.images.map((image, index) => (
          <article className="admin-image-preview" key={`${image}-${index}`}>
            <img src={image} alt={`Product ${index + 1}`} />
            <div>
              <button onClick={() => moveImage(index, -1)} type="button">Up</button>
              <button onClick={() => moveImage(index, 1)} type="button">Down</button>
              <button onClick={() => updateForm("thumbnail", image)} type="button">Thumbnail</button>
              <button
                onClick={() => updateForm("images", form.images.filter((_, imageIndex) => imageIndex !== index))}
                type="button"
              >
                Delete
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function TextField({ label, onChange, required, type = "text", value }) {
  return (
    <label>
      {label}
      <input required={required} type={type} value={value || ""} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function TaxonomyView({ authHeaders, endpoint, icon: Icon, items, loadTaxonomy, title }) {
  const isBrand = endpoint === "brands";
  const empty = isBrand
    ? { name: "", description: "", logo: "", website: "", countryOfOrigin: "", popularity: 0, isActive: true }
    : { name: "", description: "", image: "", icon: "", isActive: true };
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState("");

  const save = async (event) => {
    event.preventDefault();
    try {
      const payload = { ...form };
      if (editingId) {
        await axios.put(`${API_BASE_URL}/${endpoint}/${editingId}`, payload, { headers: authHeaders });
      } else {
        await axios.post(`${API_BASE_URL}/${endpoint}`, payload, { headers: authHeaders });
      }
      toast.success(`${title.slice(0, -1)} saved`);
      setForm(empty);
      setEditingId("");
      loadTaxonomy();
    } catch (error) {
      toast.error(error.response?.data?.message || "Save failed");
    }
  };

  const remove = async (item) => {
    if (!window.confirm(`Delete ${item.name}?`)) return;
    try {
      await axios.delete(`${API_BASE_URL}/${endpoint}/${item._id}`, { headers: authHeaders });
      toast.success("Deleted");
      loadTaxonomy();
    } catch (error) {
      toast.error(error.response?.data?.message || "Delete failed");
    }
  };

  const uploadImage = async (file) => {
    if (!file) return;
    const body = new FormData();
    body.append("image", file);
    try {
      const response = await axios.post(`${API_BASE_URL}/upload/single`, body, {
        headers: { ...authHeaders, "Content-Type": "multipart/form-data" },
      });
      setForm((current) => ({ ...current, [isBrand ? "logo" : "image"]: response.data?.data?.url || "" }));
    } catch (error) {
      toast.error(error.response?.data?.message || "Upload failed");
    }
  };

  return (
    <section className="admin-view admin-split">
      <form className="admin-panel admin-taxonomy-form" onSubmit={save}>
        <div className="admin-panel-heading">
          <h2>{editingId ? `Edit ${title.slice(0, -1)}` : `Add ${title.slice(0, -1)}`}</h2>
          <Icon aria-hidden="true" />
        </div>
        <TextField label="Name" required value={form.name} onChange={(value) => setForm((current) => ({ ...current, name: value }))} />
        <label>
          Description
          <textarea required rows="4" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
        </label>
        <TextField
          label={isBrand ? "Logo URL" : "Category Image URL"}
          required
          value={isBrand ? form.logo : form.image}
          onChange={(value) => setForm((current) => ({ ...current, [isBrand ? "logo" : "image"]: value }))}
        />
        <label className="admin-file-button">
          <FiUpload aria-hidden="true" /> Upload Image
          <input accept="image/*" onChange={(event) => uploadImage(event.target.files?.[0])} type="file" />
        </label>
        {isBrand ? (
          <>
            <TextField label="Website" value={form.website} onChange={(value) => setForm((current) => ({ ...current, website: value }))} />
            <TextField label="Country" value={form.countryOfOrigin} onChange={(value) => setForm((current) => ({ ...current, countryOfOrigin: value }))} />
          </>
        ) : (
          <TextField label="Icon" value={form.icon} onChange={(value) => setForm((current) => ({ ...current, icon: value }))} />
        )}
        <label className="admin-check">
          <input checked={form.isActive} onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))} type="checkbox" />
          Active
        </label>
        <button className="admin-primary" type="submit"><FiSave /> Save</button>
      </form>
      <section className="admin-panel">
        <div className="admin-panel-heading">
          <h2>{title}</h2>
        </div>
        <div className="admin-list">
          {items.map((item) => (
            <article className="admin-list-item" key={item._id}>
              <img src={item.logo || item.image} alt={item.name} />
              <div>
                <strong>{item.name}</strong>
                <span>{item.description}</span>
              </div>
              <button onClick={() => { setEditingId(item._id); setForm({ ...empty, ...item }); }} type="button"><FiEdit2 /></button>
              <button onClick={() => remove(item)} type="button"><FiTrash2 /></button>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}

function OrdersView({ authHeaders, loadOrders, orderMeta, orderQuery, orders, refreshAll }) {
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [statusNote, setStatusNote] = useState("");

  const updateQuery = (updates) => loadOrders({ ...updates, page: updates.page || 1 });

  const updateStatus = async (order, status) => {
    try {
      await axios.patch(
        `${API_BASE_URL}/orders/admin/${order._id}/status`,
        { status, note: statusNote },
        { headers: authHeaders }
      );
      toast.success("Order updated");
      setStatusNote("");
      refreshAll();
    } catch (error) {
      toast.error(error.response?.data?.message || "Order update failed");
    }
  };

  const exportOrders = () => {
    const headers = ["orderNumber", "customer", "email", "total", "status", "paymentMethod", "paymentStatus"];
    const rows = orders.map((order) =>
      [
        order.orderNumber,
        order.customer?.fullName,
        order.customer?.email,
        order.total,
        order.status,
        order.payment?.method,
        order.payment?.status,
      ].map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`).join(",")
    );
    const blob = new Blob([[headers.join(","), ...rows].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "fashionstore-orders.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="admin-view">
      <div className="admin-toolbar">
        <div className="admin-search">
          <FiSearch aria-hidden="true" />
          <input
            onChange={(event) => updateQuery({ search: event.target.value })}
            placeholder="Search order, customer, phone"
            type="search"
            value={orderQuery.search}
          />
        </div>
        <select onChange={(event) => updateQuery({ status: event.target.value })} value={orderQuery.status}>
          {["all", "Pending", "Confirmed", "Packed", "Shipped", "Delivered", "Cancelled", "Returned", "Return Requested"].map((status) => (
            <option key={status} value={status}>{status === "all" ? "All Status" : status}</option>
          ))}
        </select>
        <select onChange={(event) => updateQuery({ paymentMethod: event.target.value })} value={orderQuery.paymentMethod}>
          <option value="all">All Payments</option>
          <option value="COD">COD</option>
          <option value="Razorpay">Razorpay</option>
        </select>
        <select onChange={(event) => updateQuery({ paymentStatus: event.target.value })} value={orderQuery.paymentStatus}>
          {["all", "Pending", "Created", "Paid", "Failed", "Cancelled", "Refunded"].map((status) => (
            <option key={status} value={status}>{status === "all" ? "Payment Status" : status}</option>
          ))}
        </select>
        <button className="admin-secondary" onClick={exportOrders} type="button">
          <FiDownload aria-hidden="true" /> Export Orders
        </button>
      </div>

      <section className="admin-panel">
        <div className="admin-table-wrap">
          <table className="admin-table order-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Total</th>
                <th>Status</th>
                <th>Payment</th>
                <th>ETA</th>
                <th>Change Status</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {orders.length ? orders.map((order) => (
                <tr key={order._id}>
                  <td><strong>{order.orderNumber}</strong></td>
                  <td>
                    <strong>{order.customer?.fullName}</strong>
                    <span>{order.customer?.email}</span>
                  </td>
                  <td>{order.items?.length || 0} item(s)</td>
                  <td>Rs. {formatPrice(order.total)}</td>
                  <td><span className={`status-pill ${String(order.status).toLowerCase().replace(/\s+/g, '-')}`}>{order.status}</span></td>
                  <td>{order.payment?.method} / {order.payment?.status}</td>
                  <td>{new Date(order.estimatedDelivery).toLocaleDateString("en-IN")}</td>
                  <td>
                    <select onChange={(event) => updateStatus(order, event.target.value)} value={order.status}>
                      {["Pending", "Confirmed", "Packed", "Shipped", "Delivered", "Cancelled", "Returned", "Return Requested"].map((status) => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <button className="admin-secondary" onClick={() => setExpandedOrder(order)} type="button">
                      View
                    </button>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan="9">No orders found</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="admin-pagination">
          <span>{orderMeta.total} orders</span>
          <div>
            <button
              disabled={orderMeta.currentPage <= 1}
              onClick={() => loadOrders({ page: orderMeta.currentPage - 1 })}
              type="button"
            >
              <FiChevronLeft />
            </button>
            <strong>{orderMeta.currentPage} / {orderMeta.pages}</strong>
            <button
              disabled={orderMeta.currentPage >= orderMeta.pages}
              onClick={() => loadOrders({ page: orderMeta.currentPage + 1 })}
              type="button"
            >
              <FiChevronRight />
            </button>
          </div>
        </div>
      </section>

      {expandedOrder && (
        <div className="admin-modal-backdrop" onClick={() => setExpandedOrder(null)}>
          <section className="admin-order-modal" onClick={(event) => event.stopPropagation()}>
            <div className="admin-panel-heading" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <p className="admin-eyebrow">Order Details</p>
                <h2>{expandedOrder.orderNumber}</h2>
              </div>
              <button onClick={() => setExpandedOrder(null)} type="button" style={{ background: "transparent", border: 0, cursor: "pointer" }}><FiX size={20} /></button>
            </div>

            <div className="admin-order-status-management">
              <h3>Update Status</h3>
              <div className="admin-order-status-form">
                <div className="admin-field">
                  <label>Order Status</label>
                  <select
                    value={expandedOrder.status}
                    onChange={async (event) => {
                      const newStatus = event.target.value;
                      await updateStatus(expandedOrder, newStatus);
                      setExpandedOrder((current) => ({ ...current, status: newStatus }));
                    }}
                  >
                    {["Pending", "Confirmed", "Packed", "Shipped", "Delivered", "Cancelled", "Returned", "Return Requested"].map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
                <div className="admin-field">
                  <label>Status Note / Timeline Comment (Optional)</label>
                  <input
                    type="text"
                    value={statusNote}
                    onChange={(event) => setStatusNote(event.target.value)}
                    placeholder="e.g. Dispatched via BlueDart, tracking ID: 123456"
                  />
                </div>
              </div>
            </div>

            {expandedOrder.returnReason && (
              <div style={{ marginBottom: "24px", padding: "16px", background: "#fff7ed", border: "1px solid #ffedd5", borderRadius: "8px", color: "#c2410c", fontSize: "14px" }}>
                <strong>Return Reason:</strong> {expandedOrder.returnReason}
                <br />
                <strong>Requested At:</strong> {new Date(expandedOrder.returnRequestedAt).toLocaleString("en-IN")}
              </div>
            )}

            <div className="admin-order-detail-grid">
              <div>
                <strong>Customer</strong>
                <span>{expandedOrder.customer?.fullName}</span>
                <span>{expandedOrder.customer?.email}</span>
                <span>{expandedOrder.customer?.phone}</span>
              </div>
              <div>
                <strong>Address</strong>
                <span>{expandedOrder.shippingAddress?.line1}</span>
                <span>{expandedOrder.shippingAddress?.city}, {expandedOrder.shippingAddress?.state}</span>
                <span>{expandedOrder.shippingAddress?.pincode}</span>
              </div>
              <div>
                <strong>Payment</strong>
                <span>{expandedOrder.payment?.method} / {expandedOrder.payment?.status}</span>
                <span>Total Rs. {formatPrice(expandedOrder.total)}</span>
              </div>
            </div>
            <div className="admin-list">
              {expandedOrder.items.map((item) => (
                <article className="admin-list-item" key={`${item.product}-${item.size}`}>
                  <img src={item.image} alt={item.name} />
                  <div>
                    <strong>{item.name}</strong>
                    <span>Qty {item.quantity} / Size {item.size || "One Size"}</span>
                  </div>
                  <em>Rs. {formatPrice(item.lineTotal)}</em>
                </article>
              ))}
            </div>
          </section>
        </div>
      )}
    </section>
  );
}

function CustomersView({ orders }) {
  const customers = Object.values(
    orders.reduce((map, order) => {
      const email = order.customer?.email || order.orderNumber;
      const current = map[email] || {
        customer: order.customer?.fullName || "Customer",
        email,
        recentOrder: order.orderNumber,
        totalPurchase: 0,
        orders: 0,
        status: "Active",
      };
      current.totalPurchase += Number(order.total) || 0;
      current.orders += 1;
      current.recentOrder = order.orderNumber;
      map[email] = current;
      return map;
    }, {})
  );

  return (
    <SimpleTable
      title="Customers"
      headers={["Customer", "Email", "Recent Order", "Total Purchase", "Orders", "Status"]}
      rows={customers.map((customer) => [
        customer.customer,
        customer.email,
        customer.recentOrder,
        `Rs. ${formatPrice(customer.totalPurchase)}`,
        customer.orders,
        customer.status,
      ])}
    />
  );
}

function ReviewsView() {
  return <SimpleTable title="Reviews" headers={["Product", "Rating", "Review", "Images", "Verified Purchase", "Sort"]} rows={[["Cotton Kurta", "5", "Premium fit", "1", "Yes", "Newest"]]} />;
}

function CouponsView() {
  const [coupon, setCoupon] = useState({
    code: "",
    type: "Percentage",
    value: "",
    expiry: "",
    minimum: "",
    limit: "",
  });
  const [couponsList, setCouponsList] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchCoupons = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL.replace("/api", "/api/coupons")}`);
      setCouponsList(response.data?.data || []);
    } catch (error) {
      toast.error("Failed to load coupons");
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!coupon.code || !coupon.value) {
      toast.error("Code and value are required");
      return;
    }
    setLoading(true);
    try {
      await axios.post(`${API_BASE_URL.replace("/api", "/api/coupons")}`, coupon);
      toast.success("Coupon saved successfully!");
      setCoupon({ code: "", type: "Percentage", value: "", expiry: "", minimum: "", limit: "" });
      fetchCoupons();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save coupon");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this coupon?")) return;
    try {
      await axios.delete(`${API_BASE_URL.replace("/api", "/api/coupons")}/${id}`);
      toast.success("Coupon deleted successfully");
      fetchCoupons();
    } catch (error) {
      toast.error("Failed to delete coupon");
    }
  };

  const handleEdit = (c) => {
    setCoupon({
      code: c.code,
      type: c.type,
      value: c.value,
      expiry: c.expiry ? c.expiry.split("T")[0] : "",
      minimum: c.minimum || "",
      limit: c.limit || "",
    });
  };

  return (
    <section className="admin-view admin-split">
      <form className="admin-panel admin-taxonomy-form" onSubmit={handleSubmit}>
        <div className="admin-panel-heading"><h2>Create or Edit Coupon</h2></div>
        <TextField
          label="Coupon Code"
          value={coupon.code}
          onChange={(value) => setCoupon((current) => ({ ...current, code: value }))}
        />
        <label>
          Type
          <select
            value={coupon.type}
            onChange={(event) => setCoupon((current) => ({ ...current, type: event.target.value }))}
          >
            <option>Percentage</option>
            <option>Flat Discount</option>
          </select>
        </label>
        <TextField
          label="Value"
          type="number"
          value={coupon.value}
          onChange={(value) => setCoupon((current) => ({ ...current, value: Number(value) }))}
        />
        <TextField
          label="Expiry Date"
          type="date"
          value={coupon.expiry}
          onChange={(value) => setCoupon((current) => ({ ...current, expiry: value }))}
        />
        <TextField
          label="Minimum Purchase"
          type="number"
          value={coupon.minimum}
          onChange={(value) => setCoupon((current) => ({ ...current, minimum: Number(value) }))}
        />
        <TextField
          label="Usage Limit"
          type="number"
          value={coupon.limit}
          onChange={(value) => setCoupon((current) => ({ ...current, limit: Number(value) }))}
        />
        <button className="admin-primary" type="submit" disabled={loading}>
          {loading ? "Saving..." : "Save Coupon"}
        </button>
      </form>

      <section className="admin-panel">
        <div className="admin-panel-heading"><h2>Active Coupons</h2></div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Type</th>
                <th>Value</th>
                <th>Min Purchase</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {couponsList.length > 0 ? (
                couponsList.map((c) => (
                  <tr key={c._id}>
                    <td style={{ fontWeight: "bold", color: "#0ea5e9" }}>{c.code}</td>
                    <td>{c.type}</td>
                    <td>{c.type === "Percentage" || c.type === "percent" ? `${c.value}%` : `Rs. ${c.value}`}</td>
                    <td>Rs. {c.minimum || 0}</td>
                    <td>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          onClick={() => handleEdit(c)}
                          style={{
                            padding: "4px 8px",
                            background: "#0ea5e9",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            fontSize: "11px",
                            fontWeight: "bold",
                            cursor: "pointer",
                          }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(c._id)}
                          style={{
                            padding: "4px 8px",
                            background: "#ef4444",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            fontSize: "11px",
                            fontWeight: "bold",
                            cursor: "pointer",
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5">No active coupons found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}

function SettingsView({ darkMode, setDarkMode }) {
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem("bhagyam_exports_admin_settings");
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      storeName: "Bhagyam Exports",
      logo: "",
      address: "",
      phone: "",
      email: "",
      socialLinks: "",
      currency: "INR",
      gst: "",
      shippingCharges: "",
    };
  });

  const handleSubmit = (event) => {
    event.preventDefault();
    try {
      localStorage.setItem("bhagyam_exports_admin_settings", JSON.stringify(settings));
      toast.success("Settings saved successfully!");
    } catch (error) {
      toast.error("Failed to save settings");
    }
  };

  return (
    <section className="admin-view">
      <form className="admin-panel admin-settings" onSubmit={handleSubmit}>
        <div className="admin-panel-heading"><h2>Store Settings</h2></div>
        {Object.keys(settings).map((key) => (
          <TextField
            key={key}
            label={key.replace(/([A-Z])/g, " $1")}
            value={settings[key]}
            onChange={(value) => setSettings((current) => ({ ...current, [key]: value }))}
          />
        ))}
        <label className="admin-check-card">
          <input checked={darkMode} onChange={(event) => setDarkMode(event.target.checked)} type="checkbox" />
          Dark Mode
        </label>
        <button className="admin-primary" type="submit">Save Settings</button>
      </form>
    </section>
  );
}

function SimpleTable({ headers, rows, title }) {
  return (
    <section className="admin-panel">
      <div className="admin-panel-heading"><h2>{title}</h2></div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead>
          <tbody>
            {rows.length > 0 ? rows.map((row, index) => (
              <tr key={index}>{row.map((cell, cellIndex) => <td key={`${cell}-${cellIndex}`}>{cell}</td>)}</tr>
            )) : <tr><td colSpan={headers.length}>No records yet</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default AdminDashboard;
