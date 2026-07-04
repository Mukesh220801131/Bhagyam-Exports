import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import axios from "axios";
import { FiArrowLeft, FiCheckCircle, FiDownload, FiPackage, FiShoppingBag, FiTruck } from "react-icons/fi";
import { API_BASE_URL } from "./apiConfig";
import "./App.css";

const formatPrice = (value) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Number(value) || 0);

const formatDate = (value) =>
  value
    ? new Intl.DateTimeFormat("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(new Date(value))
    : "Updating soon";

function OrderSuccessPage() {
  const { orderNumber } = useParams();
  const location = useLocation();
  const [order, setOrder] = useState(location.state?.order || null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!orderNumber) return;
    const controller = new AbortController();

    axios
      .get(`${API_BASE_URL}/orders/track/${orderNumber}`, { signal: controller.signal })
      .then((response) => setOrder(response.data?.data || null))
      .catch((err) => {
        if (err.name !== "CanceledError") setError("Unable to load this order right now.");
      });

    return () => controller.abort();
  }, [orderNumber]);

  const downloadInvoice = async () => {
    if (!order?.orderNumber) return;
    const response = await axios.get(`${API_BASE_URL}/orders/${order.orderNumber}/invoice`);
    const invoice = response.data?.data;
    const lines = [
      `Invoice: ${invoice.invoiceNumber}`,
      `Order: ${invoice.orderNumber}`,
      `Date: ${formatDate(invoice.date)}`,
      `Customer: ${invoice.customer.fullName}`,
      "",
      ...invoice.items.map(
        (item) => `${item.name} x ${item.quantity} - Rs. ${formatPrice(item.lineTotal)}`
      ),
      "",
      `Subtotal: Rs. ${formatPrice(invoice.subtotal)}`,
      `Discount: Rs. ${formatPrice(invoice.discount)}`,
      `Shipping: Rs. ${formatPrice(invoice.shippingFee)}`,
      `Tax: Rs. ${formatPrice(invoice.tax)}`,
      `Total: Rs. ${formatPrice(invoice.total)}`,
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${invoice.invoiceNumber}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (error) {
    return <main className="product-detail-page"><div className="status-box error">{error}</div></main>;
  }

  if (!order) {
    return <main className="product-detail-page"><div className="status-box">Loading order...</div></main>;
  }

  return (
    <main className="product-detail-page order-success-page">
      <div className="detail-header">
        <Link className="detail-back" to="/">
          <FiArrowLeft aria-hidden="true" /> Continue shopping
        </Link>
      </div>

      <section className="success-hero">
        <div className="success-icon"><FiCheckCircle aria-hidden="true" /></div>
        <p className="eyebrow">Order successful</p>
        <h1>Thanks, {order.customer.fullName}. Your style is on its way.</h1>
        <div className="success-meta">
          <span><FiPackage aria-hidden="true" /> {order.orderNumber}</span>
          <span><FiTruck aria-hidden="true" /> Estimated delivery {formatDate(order.estimatedDelivery)}</span>
          <span>{order.payment.method} / {order.payment.status}</span>
        </div>
        <div className="hero-actions">
          <Link className="primary-action" to="/">
            <FiShoppingBag aria-hidden="true" /> Continue Shopping
          </Link>
          <Link className="secondary-action" to={`/track/${order.orderNumber}`}>
            Track Order
          </Link>
          <button className="secondary-action" onClick={downloadInvoice} type="button">
            <FiDownload aria-hidden="true" /> Download Invoice
          </button>
        </div>
      </section>

      <section className="order-detail-grid">
        <div className="checkout-card">
          <p className="eyebrow">Items</p>
          <h2>{order.items.length} product(s)</h2>
          <div className="summary-items expanded">
            {order.items.map((item) => (
              <div key={`${item.product}-${item.size}`}>
                <span>{item.name} x {item.quantity}</span>
                <strong>Rs. {formatPrice(item.lineTotal)}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="checkout-card">
          <p className="eyebrow">Timeline</p>
          <h2>Track order</h2>
          <div className="timeline-list">
            {order.timeline.map((event) => (
              <div className="timeline-item" key={`${event.status}-${event.at}`}>
                <span />
                <div>
                  <strong>{event.label}</strong>
                  <small>{formatDate(event.at)}</small>
                  {event.note && <p>{event.note}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

export default OrderSuccessPage;
