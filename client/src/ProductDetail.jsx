import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import {
  FiArrowLeft,
  FiCheckCircle,
  FiHeart,
  FiRefreshCcw,
  FiShield,
  FiShoppingBag,
  FiStar,
  FiTruck,
  FiUpload,
  FiPlus,
  FiMinus,
} from "react-icons/fi";
import { API_BASE_URL } from "./apiConfig";
import "./App.css";

const formatPrice = (price) =>
  new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(Number(price) || 0);

const fallbackHighlights = [
  "Premium Quality Fabric",
  "Comfort Fit",
  "Machine Wash",
  "Color Fade Resistant",
  "Breathable Material",
  "Perfect for Summer",
];

const fallbackSizeChart = (sizes = []) =>
  sizes.map((size) => ({
    size,
    chest: "-",
    shoulder: "-",
    length: "-",
    sleeveLength: "-",
    fit: "Regular",
    recommendedWeight: "-",
    recommendedHeight: "-",
  }));


const getColorCode = (colorName = "") => {
  const name = colorName.toLowerCase().replace(/\s+/g, "");
  const colorMap = {
    mintgreen: "#a7f3d0",
    royalblue: "#1d4ed8",
    goldgreen: "#859154",
    silverblue: "#8fa9c4",
    blackgrey: "#4b5563",
    blueprint: "#60a5fa",
    pinkprint: "#f472b6",
    greenprint: "#34d399",
    multiprint: "#f87171",
    tan: "#d2b48c",
  };
  return colorMap[name] || name;
};

function ProductDetail({ isWishlisted, onAddToCart, onToggleWishlist, cartItems = [], onUpdateQuantity }) {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [recentlyViewed, setRecentlyViewed] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [openSection, setOpenSection] = useState("Description");
  const [reviewSort, setReviewSort] = useState("Newest");
  const [reviews, setReviews] = useState([
    {
      id: "demo-review-1",
      name: "Verified Customer",
      rating: 5,
      text: "Fabric feels premium and the fit is comfortable.",
      images: [],
      verified: true,
      createdAt: Date.now() - 860000,
    },
  ]);
  const [reviewForm, setReviewForm] = useState({ name: "", rating: 5, text: "", images: [] });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadProduct = async () => {
      try {
        setIsLoading(true);
        setError("");
        const response = await axios.get(`${API_BASE_URL}/products/${id}`);
        const nextProduct = response.data?.data || null;
        setProduct(nextProduct);
        setSelectedImage(nextProduct?.thumbnail || nextProduct?.images?.[0] || null);
        setSelectedColor(nextProduct?.colors?.[0] || "");
        setSelectedSize(nextProduct?.sizes?.[0] || "");

        if (nextProduct?.category) {
          const relatedResponse = await axios.get(`${API_BASE_URL}/products`, {
            params: { category: nextProduct.category, limit: 8 },
          });
          setRelatedProducts((relatedResponse.data?.data || []).filter((item) => item._id !== nextProduct._id));
        }
      } catch {
        setError("Unable to load product details. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    loadProduct();
  }, [id]);

  useEffect(() => {
    if (!product) return;
    const stored = JSON.parse(localStorage.getItem("fashionstore_recent_products") || "[]");
    const nextItem = {
      _id: product._id,
      name: product.name,
      brand: product.brand,
      price: product.price,
      discountPrice: product.discountPrice,
      images: product.images,
      thumbnail: product.thumbnail,
    };
    const nextRecentlyViewed = [nextItem, ...stored.filter((item) => item._id !== product._id)].slice(0, 6);
    localStorage.setItem("fashionstore_recent_products", JSON.stringify(nextRecentlyViewed));
    setRecentlyViewed(nextRecentlyViewed.filter((item) => item._id !== product._id));
  }, [product]);

  useEffect(() => {
    if (!product) return;
    const previousTitle = document.title;
    const description = document.querySelector('meta[name="description"]');
    const previousDescription = description?.getAttribute("content") || "";

    document.title = `${product.name} | Bhagyam Exports`;
    description?.setAttribute(
      "content",
      product.shortDescription || product.description?.slice(0, 155) || "Premium fashion product from Bhagyam Exports."
    );

    return () => {
      document.title = previousTitle;
      description?.setAttribute("content", previousDescription);
    };
  }, [product]);

  const sortedReviews = useMemo(() => {
    const nextReviews = [...reviews];
    if (reviewSort === "Highest Rating") return nextReviews.sort((a, b) => b.rating - a.rating);
    if (reviewSort === "Lowest Rating") return nextReviews.sort((a, b) => a.rating - b.rating);
    return nextReviews.sort((a, b) => b.createdAt - a.createdAt);
  }, [reviewSort, reviews]);

  if (isLoading) {
    return <div className="status-box">Loading product details...</div>;
  }

  if (error || !product) {
    return <div className="status-box error">{error || "Product not found."}</div>;
  }

  const images = product.images?.length ? product.images : [product.thumbnail].filter(Boolean);
  const discount =
    product.price && product.discountPrice && product.discountPrice < product.price
      ? Math.round(((product.price - product.discountPrice) / product.price) * 100)
      : null;
  const sizeChart = product.sizeChart?.length ? product.sizeChart : fallbackSizeChart(product.sizes || []);
  const highlights = product.highlights?.length ? product.highlights : fallbackHighlights;
  const availability = product.stock > 0 ? `${product.stock} in stock` : "Out of stock";

  const sections = [
    ["Description", product.description],
    ["Material", product.material || "Premium fabric selected for everyday comfort."],
    ["Fabric Quality", product.fabricQuality || product.fabric || "Soft, breathable and durable fabric finish."],
    ["Wash Care", product.washCare || "Machine wash cold. Dry in shade. Do not bleach."],
    ["Size Guide", "size-guide"],
    ["Shipping Information", product.shippingInfo || "Estimated delivery in 2-5 business days."],
    ["Return Policy", product.returnPolicy || "Easy 7-day returns on eligible products."],
    ["Warranty", product.warranty || "Manufacturing defects covered as per brand policy."],
    [
      "Additional Information",
      `SKU: ${product.sku || product._id.slice(-8).toUpperCase()} / Country: ${product.countryOfOrigin || "India"} / Weight: ${product.weight || "Standard"}`,
    ],
  ];

  const submitReview = (event) => {
    event.preventDefault();
    if (!reviewForm.name || !reviewForm.text) return;
    setReviews((current) => [
      {
        ...reviewForm,
        id: `review-${Date.now()}`,
        verified: true,
        createdAt: Date.now(),
      },
      ...current,
    ]);
    setReviewForm({ name: "", rating: 5, text: "", images: [] });
  };

  const cartItem = cartItems?.find(
    (item) => item.productId === product._id && item.size === selectedSize && item.color === selectedColor
  );
  const quantityInCart = cartItem ? cartItem.quantity : 0;

  return (
    <main className="product-detail-page premium-product-page">
      <div className="detail-header">
        <Link className="detail-back" to="/">
          <FiArrowLeft aria-hidden="true" /> Back to shop
        </Link>
      </div>

      <section className="premium-detail-grid">
        <div className="premium-gallery">
          <div className="premium-preview">
            {discount && <span className="discount-badge">{discount}% off</span>}
            <img src={selectedImage || images[0]} alt={product.name} />
          </div>
          <div className="premium-thumbnails">
            {images.map((image) => (
              <button
                className={selectedImage === image ? "premium-thumb active" : "premium-thumb"}
                key={image}
                onClick={() => setSelectedImage(image)}
                type="button"
              >
                <img src={image} alt={product.name} />
              </button>
            ))}
          </div>
        </div>

        <aside className="premium-buy-panel">
          <p className="eyebrow">{product.brand} / {product.category}</p>
          <h1>{product.name}</h1>
          <div className="premium-rating-row">
            <span><FiStar aria-hidden="true" /> {product.rating?.toFixed?.(1) || product.rating || "0.0"}</span>
            <span>{product.reviews || reviews.length} reviews</span>
            <span>{availability}</span>
          </div>
          <p className="premium-short">{product.shortDescription || product.description}</p>
          <div className="price-row detail-price-row">
            <strong>Rs. {formatPrice(product.discountPrice || product.price)}</strong>
            {discount && <span>Rs. {formatPrice(product.price)}</span>}
          </div>

          {product.sizes?.length > 0 && (
            <div className="size-selector">
              <strong>Select size</strong>
              <div className="size-buttons">
                {product.sizes.map((size) => (
                  <button
                    className={selectedSize === size ? "size-button active" : "size-button"}
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    type="button"
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          )}

          {product.colors?.length > 0 && (
            <div className="color-selector">
              <strong>Select color: <span className="selected-color-name">{selectedColor}</span></strong>
              <div className="color-swatches">
                {product.colors.map((color) => {
                  const bg = getColorCode(color);
                  return (
                    <button
                      className={selectedColor === color ? "color-swatch active" : "color-swatch"}
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      style={{ background: bg }}
                      title={color}
                      type="button"
                      aria-label={`Select color ${color}`}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {quantityInCart > 0 ? (
            <div className="quantity-controls detail-quantity-controls premium-sticky-cart">
              <button
                className="qty-btn"
                onClick={() => onUpdateQuantity(product._id, selectedSize, selectedColor, quantityInCart - 1)}
                type="button"
                aria-label="Decrease quantity"
              >
                <FiMinus />
              </button>
              <span className="qty-value">{quantityInCart}</span>
              <button
                className="qty-btn"
                onClick={() => onUpdateQuantity(product._id, selectedSize, selectedColor, quantityInCart + 1)}
                type="button"
                aria-label="Increase quantity"
              >
                <FiPlus />
              </button>
            </div>
          ) : (
            <button
              className="cart-button detail-cart-button premium-sticky-cart"
              disabled={product.stock <= 0}
              onClick={() => onAddToCart(product, selectedSize, selectedColor)}
              type="button"
            >
              <FiShoppingBag aria-hidden="true" /> Add to cart
            </button>
          )}
          <button
            className={isWishlisted?.(product._id) ? "wishlist-detail-button active" : "wishlist-detail-button"}
            onClick={() => onToggleWishlist?.(product)}
            type="button"
          >
            <FiHeart aria-hidden="true" /> {isWishlisted?.(product._id) ? "Wishlisted" : "Add to wishlist"}
          </button>

          <div className="premium-info-grid">
            <InfoTile label="SKU" value={product.sku || product._id.slice(-8).toUpperCase()} />
            <InfoTile label="Material" value={product.material || "Premium blend"} />
            <InfoTile label="Fabric" value={product.fabric || "Soft finish"} />
            <InfoTile label="Country" value={product.countryOfOrigin || "India"} />
            <InfoTile label="Weight" value={product.weight || "Standard"} />
            <InfoTile label="Shipping" value={product.shippingInfo || "2-5 business days"} />
          </div>

          <div className="delivery-promises">
            <span><FiTruck /> Estimated Delivery</span>
            <span><FiCheckCircle /> Free Shipping</span>
            <span><FiShoppingBag /> Cash on Delivery</span>
            <span><FiRefreshCcw /> Easy Returns</span>
          </div>
        </aside>
      </section>

      <section className="premium-highlights">
        {highlights.map((highlight) => (
          <span key={highlight}><FiShield aria-hidden="true" /> {highlight}</span>
        ))}
      </section>

      <section className="premium-accordion-section">
        {sections.map(([title, content]) => (
          <article className={openSection === title ? "premium-accordion open" : "premium-accordion"} key={title}>
            <button onClick={() => setOpenSection(openSection === title ? "" : title)} type="button">
              <span>{title}</span>
              <strong>{openSection === title ? "-" : "+"}</strong>
            </button>
            {openSection === title && (
              <div className="premium-accordion-body">
                {content === "size-guide" ? <SizeGuideTable sizeChart={sizeChart} /> : <p>{content}</p>}
              </div>
            )}
          </article>
        ))}
      </section>

      <ReviewsBlock
        reviewForm={reviewForm}
        reviewSort={reviewSort}
        reviews={sortedReviews}
        setReviewForm={setReviewForm}
        setReviewSort={setReviewSort}
        submitReview={submitReview}
      />

      <ProductRail title="Related Products" products={relatedProducts} />
      <ProductRail title="Recently Viewed" products={recentlyViewed} />
      <ProductRail title="Customers Also Bought" products={relatedProducts.slice(2, 6)} />
    </main>
  );
}

function InfoTile({ label, value }) {
  return (
    <div>
      <strong>{label}</strong>
      <span>{value}</span>
    </div>
  );
}

function SizeGuideTable({ sizeChart }) {
  return (
    <div className="size-guide-wrap">
      <table className="size-guide-table">
        <thead>
          <tr>
            <th>Size</th>
            <th>Chest</th>
            <th>Shoulder</th>
            <th>Length</th>
            <th>Sleeve Length</th>
            <th>Fit</th>
            <th>Recommended Weight</th>
            <th>Recommended Height</th>
          </tr>
        </thead>
        <tbody>
          {sizeChart.map((row) => (
            <tr key={row.size}>
              <td>{row.size}</td>
              <td>{row.chest}</td>
              <td>{row.shoulder}</td>
              <td>{row.length}</td>
              <td>{row.sleeveLength}</td>
              <td>{row.fit}</td>
              <td>{row.recommendedWeight}</td>
              <td>{row.recommendedHeight}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReviewsBlock({ reviewForm, reviewSort, reviews, setReviewForm, setReviewSort, submitReview }) {
  const addReviewImages = (files) => {
    const urls = [...files].slice(0, 4).map((file) => URL.createObjectURL(file));
    setReviewForm((current) => ({ ...current, images: [...current.images, ...urls] }));
  };

  return (
    <section className="reviews-block">
      <div className="section-heading products-heading">
        <div>
          <p className="eyebrow">Customer voice</p>
          <h2>Reviews</h2>
        </div>
        <select value={reviewSort} onChange={(event) => setReviewSort(event.target.value)}>
          <option>Newest</option>
          <option>Highest Rating</option>
          <option>Lowest Rating</option>
        </select>
      </div>
      <div className="reviews-grid">
        <form className="review-form" onSubmit={submitReview}>
          <input
            placeholder="Name"
            value={reviewForm.name}
            onChange={(event) => setReviewForm((current) => ({ ...current, name: event.target.value }))}
          />
          <select
            value={reviewForm.rating}
            onChange={(event) => setReviewForm((current) => ({ ...current, rating: Number(event.target.value) }))}
          >
            {[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating} Stars</option>)}
          </select>
          <textarea
            placeholder="Write a review"
            rows="4"
            value={reviewForm.text}
            onChange={(event) => setReviewForm((current) => ({ ...current, text: event.target.value }))}
          />
          <label className="review-upload">
            <FiUpload aria-hidden="true" /> Upload Images
            <input accept="image/*" multiple onChange={(event) => addReviewImages(event.target.files)} type="file" />
          </label>
          <button className="cart-button" type="submit">Submit Review</button>
        </form>
        <div className="review-list">
          {reviews.map((review) => (
            <article className="review-card" key={review.id}>
              <div>
                <strong>{review.name}</strong>
                {review.verified && <span>Verified Purchase</span>}
              </div>
              <p><FiStar aria-hidden="true" /> {review.rating}.0</p>
              <blockquote>{review.text}</blockquote>
              {review.images.length > 0 && (
                <div className="review-images">
                  {review.images.map((image) => <img alt="Review upload" key={image} src={image} />)}
                </div>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProductRail({ products, title }) {
  if (!products?.length) return null;

  return (
    <section className="content-section premium-rail">
      <div className="section-heading products-heading">
        <div>
          <p className="eyebrow">More styles</p>
          <h2>{title}</h2>
        </div>
      </div>
      <div className="product-grid">
        {products.slice(0, 4).map((product) => (
          <article className="product-card" key={product._id}>
            <Link className="product-image-link" to={`/product/${product._id}`}>
              <div className="product-image">
                <img src={product.thumbnail || product.images?.[0]} alt={product.name} loading="lazy" />
              </div>
            </Link>
            <div className="product-info">
              <span className="product-brand">{product.brand}</span>
              <h3>{product.name}</h3>
              <div className="price-row">
                <strong>Rs. {formatPrice(product.discountPrice || product.price)}</strong>
                {product.discountPrice < product.price && <span>Rs. {formatPrice(product.price)}</span>}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default ProductDetail;
