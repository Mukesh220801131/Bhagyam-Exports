import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import axios from "axios";
import { FiArrowLeft, FiDownload, FiPackage, FiSearch, FiX } from "react-icons/fi";
import { API_BASE_URL } from "./apiConfig";
import "./App.css";

const formatPrice = (value) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Number(value) || 0);

const formatDate = (value) =>
  value
    ? new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value))
    : "Updating soon";

function TrackOrderPage() {
  const { orderNumber = "" } = useParams();
  const [query, setQuery] = useState(orderNumber);
  const [order, setOrder] = useState(null);
  const [message, setMessage] = useState("");

  const loadOrder = async (identifier = query) => {
    if (!identifier.trim()) return;
    setMessage("");
    try {
      const response = await axios.get(`${API_BASE_URL}/orders/track/${identifier.trim()}`);
      setOrder(response.data?.data || null);
    } catch (error) {
      setOrder(null);
      setMessage(error.response?.data?.message || "Order not found.");
    }
  };

  useEffect(() => {
    if (orderNumber) loadOrder(orderNumber);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderNumber]);

  const downloadInvoice = async () => {
    if (!order?.orderNumber) return;
    const response = await axios.get(`${API_BASE_URL}/orders/${order.orderNumber}/invoice`);
    const invoice = response.data?.data;
    const blob = new Blob(
      [[
        `Invoice: ${invoice.invoiceNumber}`,
        `Order: ${invoice.orderNumber}`,
        `Total: Rs. ${formatPrice(invoice.total)}`,
      ].join("\n")],
      { type: "text/plain;charset=utf-8" }
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${invoice.invoiceNumber}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const cancelOrder = async () => {
    if (!order || !window.confirm(`Cancel ${order.orderNumber}?`)) return;
    try {
      const response = await axios.patch(`${API_BASE_URL}/orders/${order._id}/cancel`, {
        email: order.customer.email,
        reason: "Cancelled from tracking page",
      });
      setOrder(response.data?.data || null);
      setMessage("Order cancelled.");
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to cancel order.");
    }
  };

  return (
    <main className="product-detail-page track-page">
      <div className="detail-header">
        <Link className="detail-back" to="/">
          <FiArrowLeft aria-hidden="true" /> Continue shopping
        </Link>
      </div>

      <section className="checkout-card">
        <p className="eyebrow">Track order</p>
        <h1>Find your shipment</h1>
        <div className="track-search">
          <input
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Enter order ID"
            value={query}
          />
          <button className="cart-button" onClick={() => loadOrder()} type="button">
            <FiSearch aria-hidden="true" /> Track
          </button>
        </div>
      </section>

      {message && <div className="status-box">{message}</div>}

      {order && (
        <section className="order-detail-grid">
          <div className="checkout-card">
            <p className="eyebrow">Order</p>
            <h2>{order.orderNumber}</h2>
            <div className="track-summary">
              <span><FiPackage /> {order.status}</span>
              <span>ETA {formatDate(order.estimatedDelivery)}</span>
              <span>Rs. {formatPrice(order.total)}</span>
            </div>
            <div className="checkout-actions">
              <button className="secondary-action" onClick={downloadInvoice} type="button">
                <FiDownload /> Download Invoice
              </button>
              {!["Shipped", "Delivered", "Cancelled", "Returned"].includes(order.status) && (
                <button className="secondary-action" onClick={cancelOrder} type="button">
                  <FiX /> Cancel Order
                </button>
              )}
            </div>
          </div>

          <div className="checkout-card">
            <p className="eyebrow">Timeline</p>
            <h2>Order updates</h2>
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
      )}
    </main>
  );
}

export default TrackOrderPage;
