import { Link } from "react-router-dom";
import { FiArrowLeft, FiHeart, FiShoppingBag, FiTrash2 } from "react-icons/fi";
import "./App.css";

const formatPrice = (value) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Number(value) || 0);

function WishlistPage({ items, onMoveToCart, onRemoveWishlist }) {
  return (
    <main className="product-detail-page wishlist-page">
      <div className="detail-header">
        <Link className="detail-back" to="/">
          <FiArrowLeft aria-hidden="true" /> Continue shopping
        </Link>
      </div>

      <section className="section-heading">
        <div>
          <p className="eyebrow">Saved styles</p>
          <h2>Wishlist</h2>
        </div>
        <span>{items.length} item(s)</span>
      </section>

      {items.length === 0 ? (
        <div className="status-box checkout-empty">
          <FiHeart aria-hidden="true" />
          <h2>No wishlist items yet</h2>
          <p>Tap the heart on styles you want to revisit.</p>
        </div>
      ) : (
        <div className="product-grid">
          {items.map((product) => (
            <article className="product-card" key={product._id}>
              <Link className="product-image-link" to={`/product/${product._id}`}>
                <div className="product-image">
                  <img src={product.thumbnail || product.images?.[0]} alt={product.name} loading="lazy" />
                </div>
              </Link>
              <div className="product-info">
                <div>
                  <span className="product-brand">{product.brand}</span>
                  <h3>{product.name}</h3>
                </div>
                <div className="price-row">
                  <strong>Rs. {formatPrice(product.discountPrice || product.price)}</strong>
                  {product.discountPrice < product.price && <span>Rs. {formatPrice(product.price)}</span>}
                </div>
                <div className="wishlist-actions">
                  <button className="cart-button" onClick={() => onMoveToCart(product)} type="button">
                    <FiShoppingBag aria-hidden="true" /> Move to cart
                  </button>
                  <button className="icon-button" onClick={() => onRemoveWishlist(product._id)} type="button" aria-label="Remove from wishlist">
                    <FiTrash2 aria-hidden="true" />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}

export default WishlistPage;
