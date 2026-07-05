import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  FiBell,
  FiCheck,
  FiCreditCard,
  FiDownload,
  FiHeart,
  FiMapPin,
  FiPackage,
  FiRefreshCcw,
  FiShoppingBag,
  FiTag,
  FiUser,
  FiX,
  FiMail,
  FiLock,
  FiPhone,
  FiLogIn,
  FiLogOut,
  FiArrowLeft,
} from "react-icons/fi";
import { API_BASE_URL } from "./apiConfig";
import { supabase, isSupabaseConfigured } from "./supabaseClient";
import { lookupPincode } from "./pincodeHelper";
import "./App.css";

const setCookie = (name, value, days = 365) => {
  const date = new Date();
  date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
  const expires = "; expires=" + date.toUTCString();
  document.cookie = name + "=" + encodeURIComponent(value || "") + expires + "; path=/; SameSite=Lax";
};

const getCookie = (name) => {
  const nameEQ = name + "=";
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return decodeURIComponent(c.substring(nameEQ.length, c.length));
  }
  return null;
};

const tabs = [
  ["profile", "Profile", FiUser],
  ["address", "Address", FiMapPin],
  ["wishlist", "Wishlist", FiHeart],
  ["orders", "Orders", FiPackage],
  ["notifications", "Notifications", FiBell],
  ["cards", "Saved Cards", FiCreditCard],
  ["coupons", "Coupons", FiTag],
  ["recent", "Recently Viewed", FiRefreshCcw],
  ["timeline", "Timeline", FiShoppingBag],
];

const formatPrice = (value) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Number(value) || 0);

const formatDate = (value) =>
  value
    ? new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value))
    : "Updating soon";

function CustomerDashboard({ onMoveToCart, onRemoveWishlist, wishlist }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [orders, setOrders] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [notificationUnreadCount, setNotificationUnreadCount] = useState(0);
  const [profile, setProfile] = useState(() => {
    try {
      const cookieProfile = getCookie("fashionstore_customer_profile");
      if (cookieProfile) return JSON.parse(cookieProfile);
      return JSON.parse(localStorage.getItem("fashionstore_customer_profile") || "{}");
    } catch {
      return {};
    }
  });
  const [recentlyViewed, setRecentlyViewed] = useState([]);
  const [status, setStatus] = useState("");

  const [session, setSession] = useState(null);
  const [isDemoMode, setIsDemoMode] = useState(() => {
    return !isSupabaseConfigured;
  });

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        const metadata = session.user.user_metadata || {};
        const userProfile = {
          name: metadata.name || "",
          email: session.user.email || "",
          phone: metadata.phone || "",
          address: metadata.address || {},
        };
        setProfile(userProfile);
        localStorage.setItem("fashionstore_customer_profile", JSON.stringify(userProfile));
        setCookie("fashionstore_customer_profile", JSON.stringify(userProfile), 365);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        const metadata = session.user.user_metadata || {};
        const userProfile = {
          name: metadata.name || "",
          email: session.user.email || "",
          phone: metadata.phone || "",
          address: metadata.address || {},
        };
        setProfile(userProfile);
        localStorage.setItem("fashionstore_customer_profile", JSON.stringify(userProfile));
        setCookie("fashionstore_customer_profile", JSON.stringify(userProfile), 365);
      }
    });

    return () => subscription.unsubscribe();
  }, [isDemoMode]);

  useEffect(() => {
    try {
      setRecentlyViewed(JSON.parse(localStorage.getItem("fashionstore_recent_products") || "[]"));
    } catch {
      setRecentlyViewed([]);
    }
  }, []);

  useEffect(() => {
    let storedOrders = [];

    try {
      storedOrders = JSON.parse(localStorage.getItem("fashionstore_order_numbers") || "[]");
    } catch {
      storedOrders = [];
    }

    if (storedOrders.length === 0 && !profile.email) {
      setOrders([]);
      setNotifications([]);
      setNotificationUnreadCount(0);
      return;
    }

    const controller = new AbortController();
    const loadDashboardData = async () => {
      try {
        let nextOrders = [];

        if (profile.email) {
          const response = await axios.get(`${API_BASE_URL}/orders/my`, {
            params: { email: profile.email },
            signal: controller.signal,
          });
          nextOrders = response.data?.data || [];
        } else {
          const responses = await Promise.all(
            storedOrders.map((orderNumber) =>
              axios.get(`${API_BASE_URL}/orders/track/${orderNumber}`, { signal: controller.signal })
            )
          );
          nextOrders = responses.map((response) => response.data?.data).filter(Boolean);
        }

        setOrders(nextOrders);

        const orderNumbers = [...new Set([...storedOrders, ...nextOrders.map((order) => order.orderNumber)])]
          .filter(Boolean)
          .join(",");
        const notificationResponse = await axios.get(`${API_BASE_URL}/notifications/customer`, {
          params: {
            email: profile.email || undefined,
            orderNumbers: orderNumbers || undefined,
          },
          signal: controller.signal,
        });

        setNotifications(notificationResponse.data?.data || []);
        setNotificationUnreadCount(notificationResponse.data?.unreadCount || 0);
      } catch (error) {
        if (error.name !== "CanceledError") setStatus("Orders could not be refreshed.");
      }
    };

    loadDashboardData();
    const interval = setInterval(loadDashboardData, 15000);

    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, [profile.email]);

  const latestTimeline = useMemo(
    () =>
      orders
        .flatMap((order) =>
          order.timeline.map((event) => ({
            ...event,
            orderNumber: order.orderNumber,
          }))
        )
        .sort((a, b) => new Date(b.at) - new Date(a.at))
        .slice(0, 8),
    [orders]
  );

  const saveProfile = async (nextProfile) => {
    setProfile(nextProfile);
    localStorage.setItem("fashionstore_customer_profile", JSON.stringify(nextProfile));
    setCookie("fashionstore_customer_profile", JSON.stringify(nextProfile), 365);

    if (isSupabaseConfigured && supabase && session?.user) {
      try {
        setStatus("Saving changes to Supabase...");
        const { error } = await supabase.auth.updateUser({
          data: {
            name: nextProfile.name,
            phone: nextProfile.phone,
            address: nextProfile.address,
          }
        });
        if (error) throw error;
        setStatus("Profile saved securely to your Supabase account.");
        setTimeout(() => setStatus(""), 4000);
      } catch (err) {
        setStatus(`Failed to sync changes: ${err.message}`);
      }
    } else {
      setStatus("Changes saved locally.");
      setTimeout(() => setStatus(""), 4000);
    }
  };

  const handleSignOut = async () => {
    if (isSupabaseConfigured && supabase && session) {
      await supabase.auth.signOut();
    }
    localStorage.removeItem("fashionstore_demo_mode");
    window.location.reload();
  };

  const downloadInvoice = async (orderNumber) => {
    const response = await axios.get(`${API_BASE_URL}/orders/${orderNumber}/invoice`);
    const invoice = response.data?.data;
    const blob = new Blob(
      [
        [
          `Invoice: ${invoice.invoiceNumber}`,
          `Order: ${invoice.orderNumber}`,
          `Total: Rs. ${formatPrice(invoice.total)}`,
          ...invoice.items.map((item) => `${item.name} x ${item.quantity} - Rs. ${formatPrice(item.lineTotal)}`),
        ].join("\n"),
      ],
      { type: "text/plain;charset=utf-8" }
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${invoice.invoiceNumber}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const cancelOrder = async (order) => {
    if (!window.confirm(`Cancel ${order.orderNumber}?`)) return;
    try {
      const response = await axios.patch(`${API_BASE_URL}/orders/${order._id}/cancel`, {
        email: order.customer.email,
        reason: "Cancelled from customer dashboard",
      });
      setOrders((current) => current.map((item) => (item._id === order._id ? response.data?.data : item)));
      setStatus("Order cancelled.");
    } catch (error) {
      setStatus(error.response?.data?.message || "Unable to cancel order.");
    }
  };

  const returnOrder = async (order) => {
    const reason = window.prompt(`Please enter a reason for returning order ${order.orderNumber}:`);
    if (reason === null) return;
    if (!reason.trim()) {
      alert("Return reason is required.");
      return;
    }
    try {
      const response = await axios.patch(`${API_BASE_URL}/orders/${order._id}/return`, {
        email: order.customer.email,
        reason: reason.trim(),
      });
      setOrders((current) => current.map((item) => (item._id === order._id ? response.data?.data : item)));
      setStatus("Return requested successfully.");
    } catch (error) {
      setStatus(error.response?.data?.message || "Unable to request return.");
    }
  };

  const getNotificationParams = () => {
    let storedOrders = [];

    try {
      storedOrders = JSON.parse(localStorage.getItem("fashionstore_order_numbers") || "[]");
    } catch {
      storedOrders = [];
    }

    const orderNumbers = [...new Set([...storedOrders, ...orders.map((order) => order.orderNumber)])]
      .filter(Boolean)
      .join(",");

    return {
      email: profile.email || undefined,
      orderNumbers: orderNumbers || undefined,
    };
  };

  const markNotificationRead = async (notification) => {
    if (notification.isRead) return;

    try {
      const response = await axios.patch(
        `${API_BASE_URL}/notifications/customer/${notification._id}/read`,
        {},
        { params: getNotificationParams() }
      );
      setNotifications((current) =>
        current.map((item) =>
          item._id === notification._id ? { ...item, isRead: true, readAt: response.data?.data?.readAt } : item
        )
      );
      setNotificationUnreadCount(response.data?.unreadCount || 0);
    } catch (error) {
      setStatus(error.response?.data?.message || "Unable to update notification.");
    }
  };


  return (
    <main className="product-detail-page customer-dashboard">
      <section className="dashboard-hero">
        <p className="eyebrow">Customer dashboard</p>
        <h1>{profile.name ? `Welcome back, ${profile.name}` : "Your fashion account"}</h1>
      </section>

      {status && <div className="status-box">{status}</div>}

      {activeTab === "overview" ? (
        <div className="account-overview-grid">
          <button className="account-card" onClick={() => setActiveTab("orders")} type="button">
            <div className="account-card-icon"><FiPackage /></div>
            <div className="account-card-info">
              <h3>Your Orders</h3>
              <p>Track, return, or buy things again</p>
            </div>
          </button>

          <button className="account-card" onClick={() => setActiveTab("profile")} type="button">
            <div className="account-card-icon"><FiUser /></div>
            <div className="account-card-info">
              <h3>Login & security</h3>
              <p>Edit login, name, and email details</p>
            </div>
          </button>

          <button className="account-card" onClick={() => setActiveTab("address")} type="button">
            <div className="account-card-icon"><FiMapPin /></div>
            <div className="account-card-info">
              <h3>Your Addresses</h3>
              <p>Edit delivery addresses for orders</p>
            </div>
          </button>

          <button className="account-card" onClick={() => setActiveTab("cards")} type="button">
            <div className="account-card-icon"><FiCreditCard /></div>
            <div className="account-card-info">
              <h3>Payment options</h3>
              <p>Edit or add saved credit/debit cards</p>
            </div>
          </button>

          <button className="account-card" onClick={() => setActiveTab("coupons")} type="button">
            <div className="account-card-icon"><FiTag /></div>
            <div className="account-card-info">
              <h3>Offers & Coupons</h3>
              <p>View available discount vouchers</p>
            </div>
          </button>

          <button className="account-card" onClick={() => setActiveTab("notifications")} type="button">
            <div className="account-card-icon"><FiBell /></div>
            <div className="account-card-info">
              <h3>Order Updates</h3>
              <p>View unread notifications and alerts</p>
            </div>
          </button>

          <button className="account-card" onClick={() => setActiveTab("recent")} type="button">
            <div className="account-card-icon"><FiRefreshCcw /></div>
            <div className="account-card-info">
              <h3>Recently Viewed</h3>
              <p>View items you browsed recently</p>
            </div>
          </button>

          <button
            className="account-card"
            onClick={() => {
              window.location.href = "tel:044-26521699";
            }}
            type="button"
            style={{ border: "1px dashed #38bdf8" }}
          >
            <div className="account-card-icon" style={{ background: "#e0f2fe", color: "#0284c7" }}><FiPhone /></div>
            <div className="account-card-info">
              <h3>Contact Us / Support</h3>
              <p>Call customer service at 044-26521699</p>
            </div>
          </button>
        </div>
      ) : (
        <div className="dashboard-layout">
          <nav className="dashboard-tabs">
            <button
              className="dashboard-tab dashboard-back-tab"
              onClick={() => setActiveTab("overview")}
              type="button"
              style={{ marginBottom: "16px", background: "#f8fafc", border: "1px solid #e2e8f0", fontWeight: "750" }}
            >
              <FiArrowLeft aria-hidden="true" />
              Back to Account
            </button>
            {tabs.map(([id, label, Icon]) => (
              <button
                className={activeTab === id ? "dashboard-tab active" : "dashboard-tab"}
                key={id}
                onClick={() => setActiveTab(id)}
                type="button"
              >
                <Icon aria-hidden="true" />
                {label}
                {id === "notifications" && notificationUnreadCount > 0 && (
                  <span className="dashboard-tab-count">{notificationUnreadCount > 9 ? "9+" : notificationUnreadCount}</span>
                )}
              </button>
            ))}
            <div className="dashboard-logout-tab">
              <button
                className="dashboard-logout-btn"
                onClick={handleSignOut}
                type="button"
              >
                <FiLogOut aria-hidden="true" />
                Sign Out
              </button>
            </div>
          </nav>

          <section className="dashboard-panel">
            {activeTab === "profile" && <ProfilePanel profile={profile} saveProfile={saveProfile} isSupabaseUser={Boolean(session?.user)} />}
            {activeTab === "address" && <AddressPanel profile={profile} saveProfile={saveProfile} />}
            {activeTab === "wishlist" && (
              <WishlistPanel items={wishlist} onMoveToCart={onMoveToCart} onRemoveWishlist={onRemoveWishlist} />
            )}
            {activeTab === "orders" && (
              <OrdersPanel cancelOrder={cancelOrder} returnOrder={returnOrder} downloadInvoice={downloadInvoice} orders={orders} />
            )}
            {activeTab === "notifications" && (
              <CustomerNotificationsPanel
                notifications={notifications}
                onMarkRead={markNotificationRead}
                unreadCount={notificationUnreadCount}
              />
            )}
            {activeTab === "cards" && <SavedCardsPanel />}
            {activeTab === "coupons" && <CouponsPanel />}
            {activeTab === "recent" && <RecentPanel products={recentlyViewed} />}
            {activeTab === "timeline" && <TimelinePanel events={latestTimeline} />}
          </section>
        </div>
      )}
    </main>
  );
}

function ProfilePanel({ profile, saveProfile, isSupabaseUser }) {
  const [form, setForm] = useState({
    name: profile.name || "",
    email: profile.email || "",
    phone: profile.phone || "",
  });

  useEffect(() => {
    setForm({
      name: profile.name || "",
      email: profile.email || "",
      phone: profile.phone || "",
    });
  }, [profile]);

  return (
    <form className="dashboard-form" onSubmit={(event) => { event.preventDefault(); saveProfile({ ...profile, ...form }); }}>
      <PanelTitle eyebrow="Profile" title="Personal details" />
      <DashboardField label="Name" value={form.name} onChange={(value) => setForm((current) => ({ ...current, name: value }))} />
      <DashboardField label="Email" type="email" value={form.email} disabled={isSupabaseUser} onChange={(value) => setForm((current) => ({ ...current, email: value }))} />
      <DashboardField label="Phone" value={form.phone} onChange={(value) => setForm((current) => ({ ...current, phone: value }))} />
      <button className="cart-button" type="submit">Save Profile</button>
    </form>
  );
}

function AddressPanel({ profile, saveProfile }) {
  const [address, setAddress] = useState(profile.address || {});
  const fields = ["fullName", "line1", "line2", "city", "state", "pincode", "country"];
  const [pincodeStatus, setPincodeStatus] = useState("");

  useEffect(() => {
    setAddress(profile.address || {});
  }, [profile]);

  useEffect(() => {
    const checkPincode = async () => {
      const pin = address.pincode || "";
      if (pin.length === 6 && /^\d{6}$/.test(pin)) {
        setPincodeStatus("Validating pincode...");
        const result = await lookupPincode(pin);
        if (result.success) {
          setAddress((current) => ({
            ...current,
            city: result.city,
            state: result.state,
            country: result.country,
          }));
          setPincodeStatus(`✓ ${result.message}`);
        } else {
          setPincodeStatus(`❌ ${result.message}`);
        }
      } else if (pin.length > 0 && pin.length !== 6) {
        setPincodeStatus("Pincode must be exactly 6 digits");
      } else {
        setPincodeStatus("");
      }
    };

    checkPincode();
  }, [address.pincode]);

  return (
    <form className="dashboard-form" onSubmit={(event) => { event.preventDefault(); saveProfile({ ...profile, address }); }}>
      <PanelTitle eyebrow="Address" title="Saved delivery address" />
      {pincodeStatus && (
        <div style={{ 
          fontSize: "13px", 
          fontWeight: "600", 
          padding: "10px 14px",
          marginBottom: "16px", 
          borderRadius: "8px",
          background: pincodeStatus.startsWith("✓") ? "#f0fdf4" : pincodeStatus.startsWith("❌") ? "#fef2f2" : "#fffbeb",
          border: pincodeStatus.startsWith("✓") ? "1px solid #bbf7d0" : pincodeStatus.startsWith("❌") ? "1px solid #fecdd3" : "1px solid #fef3c7",
          color: pincodeStatus.startsWith("✓") ? "#166534" : pincodeStatus.startsWith("❌") ? "#991b1b" : "#b45309"
        }}>
          {pincodeStatus}
        </div>
      )}
      {fields.map((field) => (
        <DashboardField
          key={field}
          label={field.replace(/([A-Z])/g, " $1")}
          value={address[field] || ""}
          onChange={(value) => setAddress((current) => ({ ...current, [field]: value }))}
        />
      ))}
      <button className="cart-button" type="submit">Save Address</button>
    </form>
  );
}

function WishlistPanel({ items, onMoveToCart, onRemoveWishlist }) {
  return (
    <div className="dashboard-list">
      <PanelTitle eyebrow="Wishlist" title={`${items.length} saved style(s)`} />
      {items.length === 0 ? (
        <div className="status-box">No wishlist items yet.</div>
      ) : (
        items.map((product) => (
          <article className="dashboard-product-row" key={product._id}>
            <img src={product.thumbnail || product.images?.[0]} alt={product.name} />
            <div>
              <strong>{product.name}</strong>
              <span>{product.brand} / Rs. {formatPrice(product.discountPrice || product.price)}</span>
            </div>
            <button onClick={() => onMoveToCart(product)} type="button"><FiShoppingBag /></button>
            <button onClick={() => onRemoveWishlist(product._id)} type="button"><FiX /></button>
          </article>
        ))
      )}
    </div>
  );
}

function OrdersPanel({ cancelOrder, returnOrder, downloadInvoice, orders }) {
  const isEligibleForReturn = (order) => {
    if (order.status !== "Delivered") return false;
    const deliveredDate = new Date(order.deliveredAt || order.updatedAt);
    const diffTime = Date.now() - deliveredDate.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    return diffDays <= 7;
  };

  return (
    <div className="dashboard-list">
      <PanelTitle eyebrow="Orders" title="My orders" />
      {orders.length === 0 ? (
        <div className="status-box">No orders found yet.</div>
      ) : (
        orders.map((order) => (
          <article className="dashboard-order-card" key={order._id}>
            <div>
              <strong>{order.orderNumber}</strong>
              <span>{formatDate(order.createdAt)} / {order.status} / {order.payment.method}</span>
            </div>
            <div>
              <strong>Rs. {formatPrice(order.total)}</strong>
              <span>ETA {formatDate(order.estimatedDelivery)}</span>
            </div>
            <button onClick={() => downloadInvoice(order.orderNumber)} type="button"><FiDownload /> Invoice</button>
            {!["Shipped", "Delivered", "Cancelled", "Returned", "Return Requested"].includes(order.status) && (
              <button onClick={() => cancelOrder(order)} type="button"><FiX /> Cancel</button>
            )}
            {isEligibleForReturn(order) && (
              <button onClick={() => returnOrder(order)} type="button" style={{ background: "#f97316", color: "white" }}><FiRefreshCcw /> Return</button>
            )}
          </article>
        ))
      )}
    </div>
  );
}

function CustomerNotificationsPanel({ notifications, onMarkRead, unreadCount }) {
  return (
    <div className="dashboard-list">
      <PanelTitle eyebrow="Notifications" title={`${unreadCount} unread update(s)`} />
      {notifications.length === 0 ? (
        <div className="status-box">Order updates will appear here.</div>
      ) : (
        notifications.map((notification) => (
          <article
            className={notification.isRead ? "customer-notification-card" : "customer-notification-card unread"}
            key={notification._id}
          >
            <div>
              <strong>{notification.title}</strong>
              <span>{notification.orderNumber} / {formatDate(notification.createdAt)}</span>
              <p>{notification.message}</p>
            </div>
            {!notification.isRead && (
              <button onClick={() => onMarkRead(notification)} type="button">
                <FiCheck aria-hidden="true" />
                Mark read
              </button>
            )}
          </article>
        ))
      )}
    </div>
  );
}

function SavedCardsPanel() {
  return (
    <div className="dashboard-list">
      <PanelTitle eyebrow="Cards" title="Saved cards" />
      <article className="saved-card-ui">
        <FiCreditCard aria-hidden="true" />
        <strong>No cards saved</strong>
        <span>Saved card storage UI is ready for a PCI-compliant payment token provider.</span>
      </article>
    </div>
  );
}

function CouponsPanel() {
  return (
    <div className="coupon-grid">
      <PanelTitle eyebrow="Coupons" title="Available offers" />
      {[
        ["WELCOME10", "10% off", "Above Rs. 499"],
        ["FASHION20", "20% off", "Above Rs. 1,499"],
        ["SUMMER25", "25% off", "Above Rs. 2,499"],
      ].map(([code, value, minimum]) => (
        <article className="coupon-ticket" key={code}>
          <strong>{code}</strong>
          <span>{value}</span>
          <small>{minimum}</small>
        </article>
      ))}
    </div>
  );
}

function RecentPanel({ products }) {
  return (
    <div className="dashboard-list">
      <PanelTitle eyebrow="Recent" title="Recently viewed" />
      {products.length === 0 ? (
        <div className="status-box">No recently viewed products yet.</div>
      ) : (
        products.map((product) => (
          <article className="dashboard-product-row" key={product._id}>
            <img src={product.thumbnail || product.images?.[0]} alt={product.name} />
            <div>
              <strong>{product.name}</strong>
              <span>{product.brand} / Rs. {formatPrice(product.discountPrice || product.price)}</span>
            </div>
          </article>
        ))
      )}
    </div>
  );
}

function TimelinePanel({ events }) {
  return (
    <div className="dashboard-list">
      <PanelTitle eyebrow="Timeline" title="Order timeline" />
      <div className="timeline-list">
        {events.length === 0 ? (
          <div className="status-box">Order updates will appear here.</div>
        ) : (
          events.map((event) => (
            <div className="timeline-item" key={`${event.orderNumber}-${event.at}`}>
              <span />
              <div>
                <strong>{event.label}</strong>
                <small>{event.orderNumber} / {formatDate(event.at)}</small>
                {event.note && <p>{event.note}</p>}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function DashboardField({ label, onChange, type = "text", value, disabled }) {
  return (
    <label>
      {label}
      <input type={type} value={value || ""} disabled={disabled} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function PanelTitle({ eyebrow, title }) {
  return (
    <div className="section-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
      </div>
    </div>
  );
}

export default CustomerDashboard;
