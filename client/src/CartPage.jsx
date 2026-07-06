import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  FiArrowLeft,
  FiCheckCircle,
  FiCreditCard,
  FiMinus,
  FiPlus,
  FiShoppingCart,
  FiTrash2,
  FiTruck,
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

const coupons = {
  WELCOME10: "10% off above ₹ 499",
  FASHION20: "20% off above ₹ 1,499",
  SUMMER25: "25% off above ₹ 2,499",
};

const emptyAddress = {
  fullName: "",
  email: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  pincode: "",
  country: "India",
};

const formatPrice = (value) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Number(value) || 0);

const loadRazorpayScript = () =>
  new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

function CartPage({
  cartItems,
  onClearCart,
  onPlaceOrder,
  onRemoveFromCart,
  onUpdateQuantity,
}) {
  const navigate = useNavigate();
  const [step, setStep] = useState("bag");
  const [address, setAddress] = useState(() => {
    try {
      return { ...emptyAddress, ...JSON.parse(localStorage.getItem("fashionstore_checkout_address") || "{}") };
    } catch {
      return emptyAddress;
    }
  });
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("COD");
  const [quote, setQuote] = useState(null);
  const [checkoutError, setCheckoutError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [retryOrder, setRetryOrder] = useState(null);
  const [pincodeStatus, setPincodeStatus] = useState("");

  useEffect(() => {
    const checkPincode = async () => {
      const pin = address.pincode || "";
      if (pin.length === 6 && /^\d{6}$/.test(pin)) {
        setPincodeStatus("Validating pincode...");
        const result = await lookupPincode(pin);
        if (result.success) {
          setAddress((current) => {
            const next = {
              ...current,
              city: result.city,
              state: result.state,
              country: result.country,
            };
            localStorage.setItem("fashionstore_checkout_address", JSON.stringify(next));
            return next;
          });
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

  useEffect(() => {
    try {
      let localProfile = {};
      const cookieProfile = getCookie("fashionstore_customer_profile");
      if (cookieProfile) {
        localProfile = JSON.parse(cookieProfile);
      } else {
        localProfile = JSON.parse(localStorage.getItem("fashionstore_customer_profile") || "{}");
      }
      if (localProfile.email) {
        const savedAddress = localProfile.address || {};
        setAddress((currentAddress) => ({
          fullName: currentAddress.fullName || localProfile.name || "",
          email: currentAddress.email || localProfile.email || "",
          phone: currentAddress.phone || localProfile.phone || "",
          line1: currentAddress.line1 || savedAddress.line1 || "",
          line2: currentAddress.line2 || savedAddress.line2 || "",
          city: currentAddress.city || savedAddress.city || "",
          state: currentAddress.state || savedAddress.state || "",
          pincode: currentAddress.pincode || savedAddress.pincode || "",
          country: currentAddress.country || savedAddress.country || "India",
        }));
      }
    } catch {
      // Ignore local storage parse error
    }

    if (!isSupabaseConfigured || !supabase) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const metadata = session.user.user_metadata || {};
        const savedAddress = metadata.address || {};
        
        setAddress((currentAddress) => ({
          fullName: currentAddress.fullName || metadata.name || "",
          email: currentAddress.email || session.user.email || "",
          phone: currentAddress.phone || metadata.phone || "",
          line1: currentAddress.line1 || savedAddress.line1 || "",
          line2: currentAddress.line2 || savedAddress.line2 || "",
          city: currentAddress.city || savedAddress.city || "",
          state: currentAddress.state || savedAddress.state || "",
          pincode: currentAddress.pincode || savedAddress.pincode || "",
          country: currentAddress.country || savedAddress.country || "India",
        }));
      }
    });
  }, []);

  const fallbackSubtotal = useMemo(
    () =>
      cartItems.reduce(
        (sum, item) => sum + (item.discountPrice || item.price) * item.quantity,
        0
      ),
    [cartItems]
  );

  useEffect(() => {
    if (cartItems.length === 0) {
      setQuote(null);
      return;
    }

    const controller = new AbortController();
    const loadQuote = async () => {
      try {
        const response = await axios.post(
          `${API_BASE_URL}/orders/quote`,
          {
            items: cartItems.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              size: item.size,
              color: item.color,
            })),
            couponCode: appliedCoupon,
            email: address.email || "",
          },
          { signal: controller.signal }
        );
        setQuote(response.data?.data || null);
      } catch (error) {
        if (error.name !== "CanceledError") {
          setQuote(null);
        }
      }
    };

    loadQuote();
    return () => controller.abort();
  }, [appliedCoupon, cartItems]);

  const totals = quote || {
    subtotal: fallbackSubtotal,
    discount: 0,
    shippingFee: fallbackSubtotal >= 1499 || fallbackSubtotal === 0 ? 0 : 79,
    tax: Math.round(fallbackSubtotal * 0.05),
    total: fallbackSubtotal + (fallbackSubtotal >= 1499 || fallbackSubtotal === 0 ? 0 : 79) + Math.round(fallbackSubtotal * 0.05),
  };

  const apiItems = cartItems.map((item) => ({
    productId: item.productId,
    quantity: item.quantity,
    size: item.size,
    color: item.color,
  }));

  const updateAddress = (key, value) => {
    setAddress((current) => {
      const next = { ...current, [key]: value };
      localStorage.setItem("fashionstore_checkout_address", JSON.stringify(next));
      return next;
    });
  };

  const validateAddress = () => {
    const required = ["fullName", "email", "phone", "line1", "city", "state", "pincode"];
    const missing = required.filter((key) => !address[key]?.trim());

    if (missing.length > 0) {
      setCheckoutError("Please complete your delivery address.");
      return false;
    }

    if (!/^\S+@\S+\.\S+$/.test(address.email)) {
      setCheckoutError("Please enter a valid email address.");
      return false;
    }

    if (!/^\d{10}$/.test(address.phone.replace(/[\s-+]/g, ""))) {
      setCheckoutError("Please enter a valid 10-digit phone number.");
      return false;
    }

    if (!/^\d{6}$/.test(address.pincode.trim())) {
      setCheckoutError("Please enter a valid 6-digit PIN code.");
      return false;
    }

    return true;
  };

  const applyCoupon = () => {
    const normalized = couponCode.trim().toUpperCase();

    if (!coupons[normalized]) {
      setCheckoutError("Coupon not found. Try WELCOME10, FASHION20, or SUMMER25.");
      return;
    }

    setAppliedCoupon(normalized);
    setCheckoutError("");
  };

  const removeCoupon = () => {
    setAppliedCoupon("");
    setCouponCode("");
  };

  const finishOrder = (order) => {
    onPlaceOrder(order);
    const storedOrders = JSON.parse(localStorage.getItem("fashionstore_order_numbers") || "[]");
    const nextOrders = [order.orderNumber, ...storedOrders.filter((id) => id !== order.orderNumber)].slice(0, 12);
    localStorage.setItem("fashionstore_order_numbers", JSON.stringify(nextOrders));
    const userProfile = {
      name: order.customer.fullName,
      email: order.customer.email,
      phone: order.customer.phone,
      address: order.shippingAddress,
    };
    localStorage.setItem("fashionstore_customer_profile", JSON.stringify(userProfile));
    setCookie("fashionstore_customer_profile", JSON.stringify(userProfile), 365);
    navigate(`/order-success/${order.orderNumber}`, { state: { order } });
  };

  const markPaymentFailure = async (order, reason) => {
    if (!order?._id) return;
    try {
      await axios.post(`${API_BASE_URL}/orders/razorpay/failure`, {
        orderId: order._id,
        reason,
      });
    } catch {
      // Failure sync should not block the customer from retrying locally.
    }
  };

  const openRazorpay = async (payload) => {
    const loaded = await loadRazorpayScript();

    if (!loaded) {
      setCheckoutError("Razorpay checkout could not be loaded. Please check your connection and retry.");
      setRetryOrder(payload.order);
      return;
    }

    const options = {
      key: payload.key,
      amount: payload.razorpayOrder.amount,
      currency: payload.razorpayOrder.currency,
      name: "Bhagyam Exports",
      description: payload.order.orderNumber,
      order_id: payload.razorpayOrder.id,
      prefill: {
        name: address.fullName,
        email: address.email,
        contact: address.phone,
      },
      theme: { color: "#111827" },
      handler: async (response) => {
        try {
          setIsSubmitting(true);
          const verifyResponse = await axios.post(`${API_BASE_URL}/orders/razorpay/verify`, response);
          finishOrder(verifyResponse.data?.data);
        } catch (error) {
          setRetryOrder(payload.order);
          setCheckoutError(error.response?.data?.message || "Payment verification failed. Please retry.");
        } finally {
          setIsSubmitting(false);
        }
      },
      modal: {
        ondismiss: () => {
          markPaymentFailure(payload.order, "Payment cancelled by customer");
          setRetryOrder(payload.order);
          setCheckoutError("Payment was cancelled. You can retry with Razorpay or switch to COD.");
        },
      },
    };

    const razorpay = new window.Razorpay(options);
    razorpay.on("payment.failed", (response) => {
      markPaymentFailure(payload.order, response.error?.description || "Payment failed");
      setRetryOrder(payload.order);
      setCheckoutError(response.error?.description || "Payment failed. Please retry.");
    });
    razorpay.open();
  };

  const placeCodOrder = async () => {
    const response = await axios.post(`${API_BASE_URL}/orders/cod`, {
      items: apiItems,
      address,
      couponCode: appliedCoupon,
    });
    finishOrder(response.data?.data);
  };

  const startRazorpayOrder = async () => {
    const response = await axios.post(`${API_BASE_URL}/orders/razorpay/create`, {
      items: apiItems,
      address,
      couponCode: appliedCoupon,
    });
    await openRazorpay(response.data?.data);
  };

  const retryRazorpay = async () => {
    if (!retryOrder?._id) {
      await startRazorpayOrder();
      return;
    }

    const response = await axios.post(`${API_BASE_URL}/orders/${retryOrder._id}/retry-payment`);
    await openRazorpay(response.data?.data);
  };

  const submitPayment = async () => {
    if (!validateAddress()) return;
    setIsSubmitting(true);
    setCheckoutError("");

    try {
      if (paymentMethod === "COD") {
        await placeCodOrder();
      } else {
        await startRazorpayOrder();
      }
    } catch (error) {
      setCheckoutError(error.response?.data?.message || "Checkout failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const goToAddress = () => {
    if (cartItems.length === 0) return;
    setStep("address");
  };

  const goToPayment = () => {
    if (validateAddress()) setStep("payment");
  };

  return (
    <main className="product-detail-page checkout-page">
      <div className="detail-header">
        <Link className="detail-back" to="/">
          <FiArrowLeft aria-hidden="true" /> Continue shopping
        </Link>
      </div>

      <div className="checkout-steps" aria-label="Checkout progress">
        {["bag", "address", "payment"].map((item, index) => (
          <button
            className={step === item ? "checkout-step active" : "checkout-step"}
            disabled={item !== "bag" && cartItems.length === 0}
            key={item}
            onClick={() => setStep(item)}
            type="button"
          >
            <span>{index + 1}</span>
            {item === "bag" ? "Cart" : item === "address" ? "Checkout" : "Payment"}
          </button>
        ))}
      </div>

      {checkoutError && <div className="status-box error">{checkoutError}</div>}

      <section className="checkout-grid">
        <div className="checkout-main">
          {step === "bag" && (
            <CartStep
              cartItems={cartItems}
              onClearCart={onClearCart}
              onContinue={goToAddress}
              onRemoveFromCart={onRemoveFromCart}
              onUpdateQuantity={onUpdateQuantity}
            />
          )}

          {step === "address" && (
            <AddressStep address={address} onBack={() => setStep("bag")} onContinue={goToPayment} updateAddress={updateAddress} pincodeStatus={pincodeStatus} />
          )}

          {step === "payment" && (
            <PaymentStep
              appliedCoupon={appliedCoupon}
              couponCode={couponCode}
              isSubmitting={isSubmitting}
              onApplyCoupon={applyCoupon}
              onBack={() => setStep("address")}
              onRemoveCoupon={removeCoupon}
              onRetryRazorpay={retryRazorpay}
              onSubmit={submitPayment}
              paymentMethod={paymentMethod}
              retryOrder={retryOrder}
              setCouponCode={setCouponCode}
              setPaymentMethod={setPaymentMethod}
            />
          )}
        </div>

        <OrderSummary appliedCoupon={appliedCoupon} cartItems={cartItems} totals={totals} />
      </section>
    </main>
  );
}

function CartStep({ cartItems, onClearCart, onContinue, onRemoveFromCart, onUpdateQuantity }) {
  if (cartItems.length === 0) {
    return (
      <div className="status-box checkout-empty">
        <FiShoppingCart aria-hidden="true" />
        <h2>Your cart is empty</h2>
        <p>Add products to start checkout.</p>
      </div>
    );
  }

  return (
    <div className="cart-summary">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Your cart</p>
          <h2>Shopping bag</h2>
        </div>
        <button className="secondary-action" type="button" onClick={onClearCart}>
          Clear cart
        </button>
      </div>

      <div className="cart-list">
        {cartItems.map((item) => (
          <div className="cart-item" key={`${item.productId}-${item.size || "one"}-${item.color || "default"}`}>
            <img src={item.images?.[0] || item.thumbnail} alt={item.name} />
            <div className="cart-item-info">
              <span className="product-brand">{item.brand}</span>
              <h3>{item.name}</h3>
              <div className="cart-item-meta">
                <span>Size: {item.size || "One Size"}</span>
                {item.color && <span>Color: {item.color}</span>}
                <span>Qty: {item.quantity}</span>
              </div>
              <div className="price-row">
                <strong>₹ {formatPrice(item.discountPrice || item.price)}</strong>
                {item.discountPrice < item.price && <span>₹ {formatPrice(item.price)}</span>}
              </div>
            </div>
            <div className="cart-item-controls">
              <button type="button" onClick={() => onUpdateQuantity(item.productId, item.size, item.color, item.quantity - 1)} aria-label="Decrease quantity">
                <FiMinus aria-hidden="true" />
              </button>
              <strong>{item.quantity}</strong>
              <button type="button" onClick={() => onUpdateQuantity(item.productId, item.size, item.color, item.quantity + 1)} aria-label="Increase quantity">
                <FiPlus aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => onRemoveFromCart(item.productId, item.size, item.color)}
                aria-label="Remove item"
              >
                <FiTrash2 aria-hidden="true" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <button className="cart-button detail-cart-button" type="button" onClick={onContinue}>
        Checkout
      </button>
    </div>
  );
}

function AddressStep({ address, onBack, onContinue, updateAddress, pincodeStatus }) {
  return (
    <div className="checkout-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Delivery</p>
          <h2>Shipping address</h2>
        </div>
      </div>
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
      <div className="checkout-form-grid">
        <CheckoutField label="Full name" value={address.fullName} onChange={(value) => updateAddress("fullName", value)} />
        <CheckoutField label="Email" type="email" value={address.email} onChange={(value) => updateAddress("email", value)} />
        <CheckoutField label="Phone" value={address.phone} onChange={(value) => updateAddress("phone", value)} />
        <CheckoutField label="Address line 1" value={address.line1} onChange={(value) => updateAddress("line1", value)} wide />
        <CheckoutField label="Address line 2" value={address.line2} onChange={(value) => updateAddress("line2", value)} wide />
        <CheckoutField label="City" value={address.city} onChange={(value) => updateAddress("city", value)} />
        <CheckoutField label="State" value={address.state} onChange={(value) => updateAddress("state", value)} />
        <CheckoutField label="Pincode" value={address.pincode} onChange={(value) => updateAddress("pincode", value)} />
      </div>
      <div className="checkout-actions">
        <button className="secondary-action" onClick={onBack} type="button">Back</button>
        <button className="cart-button" onClick={onContinue} type="button">Continue to payment</button>
      </div>
    </div>
  );
}

function PaymentStep({
  appliedCoupon,
  couponCode,
  isSubmitting,
  onApplyCoupon,
  onBack,
  onRemoveCoupon,
  onRetryRazorpay,
  onSubmit,
  paymentMethod,
  retryOrder,
  setCouponCode,
  setPaymentMethod,
}) {
  return (
    <div className="checkout-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Payment</p>
          <h2>Choose payment method</h2>
        </div>
      </div>

      <div className="payment-options">
        <button
          className={paymentMethod === "COD" ? "payment-option active" : "payment-option"}
          onClick={() => setPaymentMethod("COD")}
          type="button"
        >
          <FiTruck aria-hidden="true" />
          <span>Cash On Delivery</span>
          <small>Pay when the parcel arrives.</small>
        </button>
        <button
          className={paymentMethod === "Razorpay" ? "payment-option active" : "payment-option"}
          onClick={() => setPaymentMethod("Razorpay")}
          type="button"
        >
          <FiCreditCard aria-hidden="true" />
          <span>Razorpay</span>
          <small>UPI, cards, wallets, and net banking.</small>
        </button>
      </div>

      <div className="coupon-box">
        <div>
          <strong>Coupons</strong>
          <span>WELCOME10, FASHION20, SUMMER25</span>
        </div>
        {appliedCoupon ? (
          <button className="secondary-action" onClick={onRemoveCoupon} type="button">
            Remove {appliedCoupon}
          </button>
        ) : (
          <div className="coupon-input">
            <input
              onChange={(event) => setCouponCode(event.target.value)}
              placeholder="Apply coupon"
              value={couponCode}
            />
            <button onClick={onApplyCoupon} type="button">Apply</button>
          </div>
        )}
      </div>

      {retryOrder && (
        <div className="payment-retry">
          <FiCheckCircle aria-hidden="true" />
          <div>
            <strong>Payment not completed</strong>
            <span>Order {retryOrder.orderNumber} is ready for a Razorpay retry.</span>
          </div>
          <button className="secondary-action" disabled={isSubmitting} onClick={onRetryRazorpay} type="button">
            Retry payment
          </button>
        </div>
      )}

      <div className="checkout-actions">
        <button className="secondary-action" onClick={onBack} type="button">Back</button>
        <button className="cart-button" disabled={isSubmitting} onClick={onSubmit} type="button">
          {isSubmitting ? "Processing..." : paymentMethod === "COD" ? "Place COD order" : "Pay with Razorpay"}
        </button>
      </div>
    </div>
  );
}

function OrderSummary({ appliedCoupon, cartItems, totals }) {
  return (
    <aside className="order-summary">
      <p className="eyebrow">Summary</p>
      <h2>Order total</h2>
      <div className="summary-items">
        {cartItems.map((item) => (
          <div key={`${item.productId}-${item.size || "one"}`}>
            <span>{item.name} x {item.quantity}</span>
            <strong>₹ {formatPrice((item.discountPrice || item.price) * item.quantity)}</strong>
          </div>
        ))}
      </div>
      <div className="summary-row">
        <span>Subtotal</span>
        <strong>₹ {formatPrice(totals.subtotal)}</strong>
      </div>
      <div className="summary-row">
        <span>Discount {appliedCoupon && `(${appliedCoupon})`}</span>
        <strong>- ₹ {formatPrice(totals.discount)}</strong>
      </div>
      <div className="summary-row">
        <span>Shipping</span>
        <strong>{totals.shippingFee ? `₹ ${formatPrice(totals.shippingFee)}` : "Free"}</strong>
      </div>
      <div className="summary-row">
        <span>Tax</span>
        <strong>₹ {formatPrice(totals.tax)}</strong>
      </div>
      <div className="summary-row total">
        <span>Total</span>
        <strong>₹ {formatPrice(totals.total)}</strong>
      </div>
    </aside>
  );
}

function CheckoutField({ label, onChange, type = "text", value, wide }) {
  return (
    <label className={wide ? "checkout-field wide" : "checkout-field"}>
      {label}
      <input required type={type} value={value || ""} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

export default CartPage;
