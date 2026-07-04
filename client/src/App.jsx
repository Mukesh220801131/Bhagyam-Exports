import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { AnimatePresence, motion } from "framer-motion";
import { Link, Route, Routes, useNavigate, useLocation } from "react-router-dom";
import {
  FiHeart,
  FiHome,
  FiSearch,
  FiShoppingBag,
  FiStar,
  FiTruck,
  FiUser,
  FiZap,
  FiSliders,
  FiPlus,
  FiMinus,
} from "react-icons/fi";
import logo from "./assets/logo.png";
import heroImage from "./assets/hero.png";
import ownerPhoto from "./assets/owner.jpg";
import { API_BASE_URL } from "./apiConfig";
import ProductDetail from "./ProductDetail";
import CartPage from "./CartPage";
import CustomerDashboard from "./CustomerDashboard";
import OrderSuccessPage from "./OrderSuccessPage";
import TrackOrderPage from "./TrackOrderPage";
import WishlistPage from "./WishlistPage";
import { supabase, isSupabaseConfigured } from "./supabaseClient";
import { CustomerAuth } from "./CustomerAuth";
import "./App.css";

const AdminDashboard = lazy(() => import("./AdminDashboard"));

const formatPrice = (price) =>
  new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(price || 0);

const calculateDiscount = (price, discountPrice) => {
  if (!price || !discountPrice || discountPrice >= price) return null;
  return Math.round(((price - discountPrice) / price) * 100);
};

const useStoredState = (key, initialValue) => {
  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue];
};

function App() {
  const navigate = useNavigate();

  const [session, setSession] = useState(null);
  const [isDemoMode, setIsDemoMode] = useState(() => {
    const storedDemo = localStorage.getItem("fashionstore_demo_mode");
    return storedDemo === "true" || !isSupabaseConfigured;
  });

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchSuggestions, setSearchSuggestions] = useState(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [cartItems, setCartItems] = useStoredState("fashionstore_cart", []);
  const [wishlistItems, setWishlistItems] = useStoredState("fashionstore_wishlist", []);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedBrand, setSelectedBrand] = useState("All");
  const [selectedPriceRange, setSelectedPriceRange] = useState("All");
  const [sortBy, setSortBy] = useState("default");
  const [minRating, setMinRating] = useState(0);

  const [recentSearches, setRecentSearches] = useState([]);
  const [focusedSuggestionIndex, setFocusedSuggestionIndex] = useState(-1);
  const location = useLocation();

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("fashionstore_recent_searches") || "[]");
      setRecentSearches(saved);
    } catch (e) {
      setRecentSearches([]);
    }
  }, []);

  const saveRecentSearch = (term) => {
    if (!term || typeof term !== "string") return;
    const trimmed = term.trim();
    if (!trimmed) return;
    setRecentSearches(prev => {
      const filtered = prev.filter(t => t.toLowerCase() !== trimmed.toLowerCase());
      const updated = [trimmed, ...filtered].slice(0, 5);
      localStorage.setItem("fashionstore_recent_searches", JSON.stringify(updated));
      return updated;
    });
  };

  useEffect(() => {
    setFocusedSuggestionIndex(-1);
  }, [searchSuggestions, isSearchOpen]);

  const getSelectableSuggestions = () => {
    const termSuggestions = (searchSuggestions?.suggestions || []).slice(0, 5).map(s => ({ type: 'suggestion', value: s }));
    const recent = recentSearches.slice(0, 5).map(term => ({ type: 'recent', value: term }));
    const popular = (searchSuggestions?.popularSearches || ["Men", "Women", "Footwear"]).slice(0, 5).map(term => ({ type: 'popular', value: term }));
    return [...termSuggestions, ...recent, ...popular];
  };

  useEffect(() => {
    document.title = "Bhagyam Exports | Premium Fashion Online";
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const loadStorefront = async () => {
      try {
        setIsLoading(true);
        setError("");

        const [productsResponse, categoriesResponse, brandsResponse, suggestionResponse] = await Promise.all([
          axios.get(`${API_BASE_URL}/products?limit=36&sort=featured`, {
            signal: controller.signal,
          }),
          axios.get(`${API_BASE_URL}/categories`, { signal: controller.signal }),
          axios.get(`${API_BASE_URL}/brands`, { signal: controller.signal }),
          axios.get(`${API_BASE_URL}/products/search/suggestions`, { signal: controller.signal }),
        ]);

        setProducts(productsResponse.data?.data || []);
        setCategories(categoriesResponse.data?.data || []);
        setBrands(brandsResponse.data?.data || []);
        setSearchSuggestions(suggestionResponse.data?.data || null);
      } catch (err) {
        if (err.name !== "CanceledError") {
          setError("Backend API is not reachable. Start the server and refresh this page.");
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadStorefront();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    const term = searchTerm.trim();
    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/products/search/suggestions`, {
          params: { q: term },
          signal: controller.signal,
        });
        setSearchSuggestions(response.data?.data || null);
      } catch (err) {
        if (err.name !== "CanceledError") setSearchSuggestions(null);
      }
    }, 220);

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [searchTerm]);

  const visibleProducts = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    let filtered = products.filter((product) => {
      const matchesCategory =
        activeCategory === "All" || product.category?.toLowerCase() === activeCategory.toLowerCase();

      const matchesSearch =
        !normalizedSearch ||
        [product.name, product.brand, product.category, ...(product.tags || [])].some((value) =>
          value?.toLowerCase().includes(normalizedSearch)
        );

      const matchesBrand =
        selectedBrand === "All" || product.brand === selectedBrand;

      const price = product.discountPrice || product.price;
      let matchesPrice = true;
      if (selectedPriceRange === "under-500") {
        matchesPrice = price < 500;
      } else if (selectedPriceRange === "500-1000") {
        matchesPrice = price >= 500 && price <= 1000;
      } else if (selectedPriceRange === "1000-2000") {
        matchesPrice = price >= 1000 && price <= 2000;
      } else if (selectedPriceRange === "above-2000") {
        matchesPrice = price > 2000;
      }

      const matchesRating = !minRating || (product.rating || 0) >= minRating;

      return matchesCategory && matchesSearch && matchesBrand && matchesPrice && matchesRating;
    });

    if (sortBy === "price-asc") {
      filtered.sort((a, b) => (a.discountPrice || a.price) - (b.discountPrice || b.price));
    } else if (sortBy === "price-desc") {
      filtered.sort((a, b) => (b.discountPrice || b.price) - (a.discountPrice || a.price));
    } else if (sortBy === "rating") {
      filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sortBy === "name-asc") {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    }

    return filtered;
  }, [activeCategory, products, searchTerm, selectedBrand, selectedPriceRange, minRating, sortBy]);

  const featuredProduct = products[0];
  const totalStock = products.reduce((sum, product) => sum + (product.stock || 0), 0);
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const addToCart = (product, selectedSize = "", selectedColor = "") => {
    setCartItems((currentItems) => {
      const existingIndex = currentItems.findIndex(
        (item) => item.productId === product._id && item.size === selectedSize && item.color === selectedColor
      );

      if (existingIndex >= 0) {
        const nextItems = [...currentItems];
        nextItems[existingIndex].quantity = Math.min(nextItems[existingIndex].quantity + 1, 10);
        return nextItems;
      }

      return [
        ...currentItems,
        {
          productId: product._id,
          name: product.name,
          brand: product.brand,
          price: product.price,
          discountPrice: product.discountPrice,
          size: selectedSize,
          color: selectedColor,
          quantity: 1,
          images: product.images,
          thumbnail: product.thumbnail,
        },
      ];
    });
  };

  const removeFromCart = (productId, size) => {
    setCartItems((currentItems) =>
      currentItems.filter((item) => !(item.productId === productId && item.size === size))
    );
  };

  const updateQuantity = (productId, size, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId, size);
      return;
    }

    setCartItems((currentItems) =>
      currentItems.map((item) =>
        item.productId === productId && item.size === size
          ? { ...item, quantity: Math.min(quantity, 10) }
          : item
      )
    );
  };

  const clearCart = () => setCartItems([]);

  const placeOrder = () => setCartItems([]);

  const isWishlisted = (productId) => wishlistItems.some((product) => product._id === productId);

  const toggleWishlist = (product) => {
    setWishlistItems((currentItems) => {
      if (currentItems.some((item) => item._id === product._id)) {
        return currentItems.filter((item) => item._id !== product._id);
      }

      return [
        {
          _id: product._id,
          name: product.name,
          brand: product.brand,
          price: product.price,
          discountPrice: product.discountPrice,
          images: product.images,
          thumbnail: product.thumbnail,
        },
        ...currentItems,
      ];
    });
  };

  const moveWishlistToCart = (product) => {
    addToCart(product);
    setWishlistItems((items) => items.filter((item) => item._id !== product._id));
  };

  const removeWishlist = (productId) => {
    setWishlistItems((items) => items.filter((item) => item._id !== productId));
  };

  const selectSuggestion = (suggestion) => {
    const term = suggestion.label || suggestion;
    setSearchTerm(term);
    saveRecentSearch(term);
    setIsSearchOpen(false);
    navigate("/");
    window.requestAnimationFrame(() => document.getElementById("products")?.scrollIntoView({ behavior: "smooth" }));
  };

  const handleSearchKeyDown = (event) => {
    if (event.key === "Enter") {
      const selectable = getSelectableSuggestions();
      if (focusedSuggestionIndex >= 0 && focusedSuggestionIndex < selectable.length) {
        selectSuggestion(selectable[focusedSuggestionIndex].value);
      } else {
        if (searchTerm.trim()) {
          saveRecentSearch(searchTerm.trim());
        }
        setIsSearchOpen(false);
        navigate("/");
        window.requestAnimationFrame(() => document.getElementById("products")?.scrollIntoView({ behavior: "smooth" }));
      }
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      const selectable = getSelectableSuggestions();
      if (selectable.length > 0) {
        setFocusedSuggestionIndex(prev => (prev + 1) % selectable.length);
      }
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      const selectable = getSelectableSuggestions();
      if (selectable.length > 0) {
        setFocusedSuggestionIndex(prev => (prev - 1 + selectable.length) % selectable.length);
      }
    } else if (event.key === "Escape") {
      setIsSearchOpen(false);
    }
  };

  const HomePage = () => {
    const [activeHero, setActiveHero] = useState(0);
    const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
    const heroSlides = products.slice(0, 4).length
      ? products.slice(0, 4)
      : [{ _id: "hero", name: "Premium collection", brand: "Bhagyam Exports", images: [heroImage] }];
    const trendingProducts = products.filter((product) => product.trending).slice(0, 8);
    const newArrivals = products.filter((product) => product.newArrival).slice(0, 8);
    const bestSellers = products.filter((product) => product.bestSeller || product.reviews > 250).slice(0, 8);
    const flashDeals = products
      .filter((product) => calculateDiscount(product.price, product.discountPrice) >= 25)
      .slice(0, 8);

    useEffect(() => {
      const interval = setInterval(() => {
        setActiveHero((index) => (index + 1) % heroSlides.length);
      }, 4200);
      return () => clearInterval(interval);
    }, [heroSlides.length]);

    const hero = heroSlides[activeHero] || featuredProduct;

    return (
      <main>
        <section className="hero-section premium-hero">
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="hero-copy"
            initial={{ opacity: 0, y: 18 }}
            transition={{ duration: 0.5 }}
          >
            <p className="eyebrow">New season edit</p>
            <h1>Bhagyam Exports</h1>
            <p className="hero-text">
              Premium Indian fashion across ethnic wear, everyday essentials, footwear, and accessories.
            </p>
            <div className="hero-actions">
              <a className="primary-action" href="#products">
                <FiShoppingBag aria-hidden="true" />
                Shop collection
              </a>
              <Link className="secondary-action" to="/track">
                Track order
              </Link>
            </div>

            <div className="owner-card">
              <img src={ownerPhoto} alt="Owner of Bhagyam Exports" />
              <div>
                <strong>Curated by Bhagyam Exports</strong>
                <span>Fast dispatch, easy returns, premium quality checks</span>
              </div>
            </div>
          </motion.div>

          <div className="hero-visual">
            <AnimatePresence mode="wait">
              <motion.img
                key={hero?._id || activeHero}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.02 }}
                initial={{ opacity: 0, scale: 1.03 }}
                src={hero?.images?.[0] || hero?.thumbnail || heroImage}
                alt={hero?.name || "Fashion collection"}
                transition={{ duration: 0.45 }}
              />
            </AnimatePresence>
            <div className="hero-product">
              <span>{hero?.brand || "FashionStore"}</span>
              <strong>{hero?.name || "Premium collection"}</strong>
            </div>
            <div className="hero-dots">
              {heroSlides.map((slide, index) => (
                <button
                  aria-label={`View ${slide.name}`}
                  className={activeHero === index ? "active" : ""}
                  key={slide._id || index}
                  onClick={() => setActiveHero(index)}
                  type="button"
                />
              ))}
            </div>
          </div>
        </section>


        <section className="content-section" id="categories">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Top categories</p>
              <h2>Shop by category</h2>
            </div>
          </div>

          <div className="category-row">
            <button
              className={activeCategory === "All" ? "category-chip active" : "category-chip"}
              type="button"
              onClick={() => setActiveCategory("All")}
            >
              All
            </button>
            {categories.map((category) => (
              <button
                className={activeCategory === category.name ? "category-chip active" : "category-chip"}
                key={category._id}
                type="button"
                onClick={() => setActiveCategory(category.name)}
              >
                {category.name}
              </button>
            ))}
          </div>

          <div className="category-spotlight-grid">
            {categories.slice(0, 6).map((category) => (
              <button
                className="category-spotlight"
                key={category._id}
                onClick={() => setActiveCategory(category.name)}
                type="button"
              >
                <img src={category.image || heroImage} alt={category.name} loading="lazy" />
                <span>{category.name}</span>
              </button>
            ))}
          </div>
        </section>

        <ProductRail
          emptyFallback={products.slice(0, 8)}
          isWishlisted={isWishlisted}
          onAddToCart={addToCart}
          onToggleWishlist={toggleWishlist}
          products={newArrivals}
          title="New Arrivals"
          cartItems={cartItems}
          onUpdateQuantity={updateQuantity}
        />
        <ProductRail
          emptyFallback={products.slice(4, 12)}
          eyebrow="Trending"
          isWishlisted={isWishlisted}
          onAddToCart={addToCart}
          onToggleWishlist={toggleWishlist}
          products={trendingProducts}
          title="Trending Now"
          cartItems={cartItems}
          onUpdateQuantity={updateQuantity}
        />

        <ProductRail
          emptyFallback={products.slice(8, 16)}
          eyebrow="Best sellers"
          isWishlisted={isWishlisted}
          onAddToCart={addToCart}
          onToggleWishlist={toggleWishlist}
          products={bestSellers}
          title="Customer Favorites"
          cartItems={cartItems}
          onUpdateQuantity={updateQuantity}
        />

        <section className="content-section brand-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Shop by brand</p>
              <h2>Brands customers love</h2>
            </div>
          </div>
          <div className="brand-marquee">
            {[...brands.slice(0, 10), ...brands.slice(0, 10)].map((brand, index) => (
              <span key={`${brand._id}-${index}`}>{brand.name}</span>
            ))}
          </div>
        </section>

        <section className="content-section" id="products">
          <div className="section-heading products-heading">
            <div>
              <p className="eyebrow">Fresh drops</p>
              <h2>{activeCategory === "All" ? "All products" : activeCategory}</h2>
            </div>
            <span>{visibleProducts.length} styles</span>
          </div>

          <div className="products-layout-wrapper">
            {isMobileFiltersOpen && (
              <div
                className="filter-drawer-overlay"
                onClick={() => setIsMobileFiltersOpen(false)}
              />
            )}
            <aside className={`products-sidebar-filters ${isMobileFiltersOpen ? "open" : ""}`}>
              <div className="sidebar-filter-section">
                <div className="sidebar-filter-header">
                  <h3>Filters</h3>
                  <div className="sidebar-header-actions">
                    {(selectedBrand !== "All" || selectedPriceRange !== "All" || minRating !== 0 || sortBy !== "default") && (
                      <button
                        className="sidebar-clear-btn"
                        onClick={() => {
                          setSelectedBrand("All");
                          setSelectedPriceRange("All");
                          setMinRating(0);
                          setSortBy("default");
                          setIsMobileFiltersOpen(false);
                        }}
                      >
                        Clear All
                      </button>
                    )}
                    <button
                      className="sidebar-close-btn"
                      onClick={() => setIsMobileFiltersOpen(false)}
                      type="button"
                      aria-label="Close filters"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>

              <div className="sidebar-filter-section">
                <h4>Brands</h4>
                <div className="sidebar-filter-links">
                  <button
                    className={selectedBrand === "All" ? "filter-link active" : "filter-link"}
                    onClick={() => {
                      setSelectedBrand("All");
                      setIsMobileFiltersOpen(false);
                    }}
                    type="button"
                  >
                    All Brands
                  </button>
                  {Array.from(new Set(products.map((p) => p.brand).filter(Boolean))).map((brand) => (
                    <button
                      key={brand}
                      className={selectedBrand === brand ? "filter-link active" : "filter-link"}
                      onClick={() => {
                        setSelectedBrand(brand);
                        setIsMobileFiltersOpen(false);
                      }}
                      type="button"
                    >
                      {brand}
                    </button>
                  ))}
                </div>
              </div>

              <div className="sidebar-filter-section">
                <h4>Price</h4>
                <div className="sidebar-filter-links">
                  <button
                    className={selectedPriceRange === "All" ? "filter-link active" : "filter-link"}
                    onClick={() => {
                      setSelectedPriceRange("All");
                      setIsMobileFiltersOpen(false);
                    }}
                    type="button"
                  >
                    Any Price
                  </button>
                  <button
                    className={selectedPriceRange === "under-500" ? "filter-link active" : "filter-link"}
                    onClick={() => {
                      setSelectedPriceRange("under-500");
                      setIsMobileFiltersOpen(false);
                    }}
                    type="button"
                  >
                    Under Rs. 500
                  </button>
                  <button
                    className={selectedPriceRange === "500-1000" ? "filter-link active" : "filter-link"}
                    onClick={() => {
                      setSelectedPriceRange("500-1000");
                      setIsMobileFiltersOpen(false);
                    }}
                    type="button"
                  >
                    Rs. 500 - Rs. 1,000
                  </button>
                  <button
                    className={selectedPriceRange === "1000-2000" ? "filter-link active" : "filter-link"}
                    onClick={() => {
                      setSelectedPriceRange("1000-2000");
                      setIsMobileFiltersOpen(false);
                    }}
                    type="button"
                  >
                    Rs. 1,000 - Rs. 2,000
                  </button>
                  <button
                    className={selectedPriceRange === "above-2000" ? "filter-link active" : "filter-link"}
                    onClick={() => {
                      setSelectedPriceRange("above-2000");
                      setIsMobileFiltersOpen(false);
                    }}
                    type="button"
                  >
                    Rs. 2,000 & Above
                  </button>
                </div>
              </div>

              <div className="sidebar-filter-section">
                <h4>Customer Review</h4>
                <div className="sidebar-filter-links">
                  <button
                    className={minRating === 0 ? "filter-link active" : "filter-link"}
                    onClick={() => {
                      setMinRating(0);
                      setIsMobileFiltersOpen(false);
                    }}
                    type="button"
                  >
                    All Reviews
                  </button>
                  {[4, 3, 2].map((stars) => (
                    <button
                      key={stars}
                      className={minRating === stars ? "filter-link rating-link active" : "filter-link rating-link"}
                      onClick={() => {
                        setMinRating(stars);
                        setIsMobileFiltersOpen(false);
                      }}
                      type="button"
                    >
                      <span className="stars-wrapper">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <span key={i} className={i < stars ? "star filled" : "star"}>★</span>
                        ))}
                      </span>
                      & Up
                    </button>
                  ))}
                </div>
              </div>
            </aside>

            <div className="products-main-content">
              <div className="products-toolbar">
                <button
                  className="mobile-filter-trigger-btn"
                  onClick={() => setIsMobileFiltersOpen(true)}
                  type="button"
                >
                  <FiSliders /> Filters
                </button>
                <span className="styles-count">{visibleProducts.length} style(s) found</span>
                <div className="toolbar-sort">
                  <label htmlFor="sort-select">Sort by:</label>
                  <select
                    id="sort-select"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                  >
                    <option value="default">Newest</option>
                    <option value="price-asc">Price: Low to High</option>
                    <option value="price-desc">Price: High to Low</option>
                    <option value="rating">Top Rated</option>
                    <option value="name-asc">Name: A-Z</option>
                  </select>
                </div>
              </div>

              {error && <div className="status-box error">{error}</div>}

              {isLoading ? (
                <div className="product-grid">
                  {Array.from({ length: 8 }).map((_, index) => (
                    <div className="product-card skeleton-card" key={index}>
                      <div className="skeleton-image" />
                      <div className="skeleton-line wide" />
                      <div className="skeleton-line" />
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  {visibleProducts.length === 0 ? (
                    <div className="no-products-fallback">
                      <div className="fallback-message-box">
                        <FiSearch className="fallback-search-icon" aria-hidden="true" />
                        <h3>No products matched your search</h3>
                        <p>We couldn&apos;t find any items matching &quot;{searchTerm}&quot;. Try adjusting your keywords, category, or price filters.</p>
                        <button
                          className="fallback-reset-btn"
                          onClick={() => {
                            setSearchTerm("");
                            setSelectedBrand("All");
                            setSelectedPriceRange("All");
                            setMinRating(0);
                            setSortBy("default");
                          }}
                        >
                          Reset all filters
                        </button>
                      </div>

                      {products.length > 0 && (
                        <div className="fallback-suggestions-section">
                          <div className="fallback-tags-col">
                            <h4>Popular Searches</h4>
                            <div className="fallback-tag-buttons">
                              {["Men", "Women", "Footwear", "Accessories", "FabIndia", "Puma", "Biba"].map((term) => (
                                <button
                                  key={term}
                                  className="fallback-tag-btn"
                                  onClick={() => selectSuggestion(term)}
                                  type="button"
                                >
                                  {term}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <motion.div className="product-grid" layout>
                      <AnimatePresence>
                        {visibleProducts.map((product) => (
                          <ProductCard
                            isWishlisted={isWishlisted(product._id)}
                            key={product._id}
                            onAddToCart={addToCart}
                            onToggleWishlist={toggleWishlist}
                            product={product}
                            cartItems={cartItems}
                            onUpdateQuantity={updateQuantity}
                          />
                        ))}
                      </AnimatePresence>
                    </motion.div>
                  )}
                </>
              )}
            </div>
          </div>
        </section>

        <ProductRail
          emptyFallback={flashDeals.length ? flashDeals : products.slice(12, 20)}
          eyebrow="Premium collections"
          isWishlisted={isWishlisted}
          onAddToCart={addToCart}
          onToggleWishlist={toggleWishlist}
          products={flashDeals}
          title="Deals Worth Opening"
          cartItems={cartItems}
          onUpdateQuantity={updateQuantity}
        />

        <section className="social-proof-section">
          <div className="testimonial-card">
            <FiStar aria-hidden="true" />
            <strong>4.7 average rating</strong>
            <span>Customers love the fit checks, fast dispatch, and COD-friendly checkout.</span>
          </div>
          <div className="instagram-grid">
            {products.slice(0, 6).map((product) => (
              <img key={product._id} src={product.thumbnail || product.images?.[0]} alt={product.name} loading="lazy" />
            ))}
          </div>
          <form className="newsletter-box" onSubmit={(event) => event.preventDefault()}>
            <p className="eyebrow">Newsletter</p>
            <h2>Get the next drop first</h2>
            <div>
              <input placeholder="Email address" type="email" />
              <button type="submit">Subscribe</button>
            </div>
          </form>
        </section>

        <section className="delivery-band">
          <FiTruck aria-hidden="true" />
          <span>Fast delivery, Razorpay payments, COD orders, easy returns, and real-time order tracking.</span>
        </section>
      </main>
    );
  };

  const isAdminPath = location.pathname.startsWith("/admin");

  if (!session && !isDemoMode && !isAdminPath) {
    return (
      <div className="storefront">
        <CustomerAuth onDemoMode={() => {
          setIsDemoMode(true);
          localStorage.setItem("fashionstore_demo_mode", "true");
        }} />
      </div>
    );
  }

  const suggestionsCount = (searchSuggestions?.suggestions || []).slice(0, 5).length;
  const recentCount = recentSearches.slice(0, 5).length;

  return (
    <div className="storefront">
      {!isAdminPath && (
        <header className="topbar">
          <Link className="brand" to="/">
            <img className="brand-logo" src={logo} alt="Bhagyam Exports logo" />
          </Link>

          <div className="search-area">
            <div className="search-box">
              <FiSearch aria-hidden="true" />
              <input
                onBlur={() => setTimeout(() => setIsSearchOpen(false), 140)}
                onFocus={() => setIsSearchOpen(true)}
                onChange={(event) => setSearchTerm(event.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search kurtas, sneakers, bags"
                type="search"
                value={searchTerm}
              />
            </div>
            <AnimatePresence>
              {isSearchOpen && searchSuggestions && (
                <motion.div
                  animate={{ opacity: 1, y: 0 }}
                  className="search-suggestions"
                  exit={{ opacity: 0, y: -8 }}
                  initial={{ opacity: 0, y: -8 }}
                >
                  <div>
                    <strong>Suggestions</strong>
                    {(searchSuggestions.suggestions || []).slice(0, 5).map((suggestion, index) => (
                      <button
                        key={suggestion.id || suggestion.label}
                        className={focusedSuggestionIndex === index ? "keyboard-active" : ""}
                        onMouseDown={() => selectSuggestion(suggestion)}
                        type="button"
                      >
                        {suggestion.label}
                        <span>{suggestion.brand} / {suggestion.category}</span>
                      </button>
                    ))}
                  </div>

                  <div className="search-middle-column">
                    {recentSearches.length > 0 && (
                      <div className="recent-searches-block" style={{ display: 'grid', gap: '8px' }}>
                        <strong>Recent searches</strong>
                        {recentSearches.slice(0, 5).map((term, index) => {
                          const globalIndex = suggestionsCount + index;
                          return (
                            <button
                              key={`recent-${term}`}
                              className={focusedSuggestionIndex === globalIndex ? "keyboard-active" : ""}
                              onMouseDown={() => selectSuggestion(term)}
                              type="button"
                            >
                              {term}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    <div style={{ display: 'grid', gap: '8px' }}>
                      <strong>Popular searches</strong>
                      {(searchSuggestions.popularSearches || ["Men", "Women", "Footwear"]).slice(0, 5).map((term, index) => {
                        const globalIndex = suggestionsCount + recentCount + index;
                        return (
                          <button
                            key={`popular-${term}`}
                            className={focusedSuggestionIndex === globalIndex ? "keyboard-active" : ""}
                            onMouseDown={() => selectSuggestion(term)}
                            type="button"
                          >
                            {term}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {searchSuggestions.products && searchSuggestions.products.length > 0 && (
                    <div className="search-products-preview">
                      <strong>Matching Products</strong>
                      {searchSuggestions.products.slice(0, 3).map((product) => (
                        <Link
                          key={product._id}
                          to={`/product/${product._id}`}
                          className="search-product-item"
                          onMouseDown={() => setIsSearchOpen(false)}
                        >
                          <img src={product.thumbnail || product.images?.[0]} alt={product.name} />
                          <div>
                            <span className="search-product-name">{product.name}</span>
                            <span className="search-product-price">Rs. {product.discountPrice || product.price}</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="topbar-actions">
            <Link className="icon-button" to="/" aria-label="Home"><FiHome aria-hidden="true" /></Link>
            <Link className="icon-button" to="/dashboard" aria-label="Dashboard"><FiUser aria-hidden="true" /></Link>
            <Link className="icon-button wishlist-link" to="/wishlist" aria-label="Wishlist">
              <FiHeart aria-hidden="true" />
              {wishlistItems.length > 0 && <span className="cart-count">{wishlistItems.length}</span>}
            </Link>
            <Link to="/cart" className="icon-button cart-link" aria-label="View cart">
              <FiShoppingBag aria-hidden="true" />
              {cartCount > 0 && <span className="cart-count">{cartCount}</span>}
            </Link>
          </div>
        </header>
      )}

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route
          path="/product/:id"
          element={
            <ProductDetail
              isWishlisted={isWishlisted}
              onAddToCart={addToCart}
              onToggleWishlist={toggleWishlist}
              cartItems={cartItems}
              onUpdateQuantity={updateQuantity}
            />
          }
        />
        <Route
          path="/admin/*"
          element={
            <Suspense fallback={<div className="status-box">Loading admin...</div>}>
              <AdminDashboard />
            </Suspense>
          }
        />
        {["/cart", "/checkout"].map((path) => (
          <Route
            key={path}
            path={path}
            element={
              <CartPage
                cartItems={cartItems}
                onClearCart={clearCart}
                onPlaceOrder={placeOrder}
                onRemoveFromCart={removeFromCart}
                onUpdateQuantity={updateQuantity}
              />
            }
          />
        ))}
        <Route
          path="/wishlist"
          element={
            <WishlistPage
              items={wishlistItems}
              onMoveToCart={moveWishlistToCart}
              onRemoveWishlist={removeWishlist}
            />
          }
        />
        <Route
          path="/dashboard"
          element={
            <CustomerDashboard
              wishlist={wishlistItems}
              onMoveToCart={moveWishlistToCart}
              onRemoveWishlist={removeWishlist}
            />
          }
        />
        <Route path="/order-success/:orderNumber" element={<OrderSuccessPage />} />
        <Route path="/track" element={<TrackOrderPage />} />
        <Route path="/track/:orderNumber" element={<TrackOrderPage />} />
      </Routes>
    </div>
  );
}

function ProductRail({
  emptyFallback = [],
  eyebrow = "Featured",
  isWishlisted,
  onAddToCart,
  onToggleWishlist,
  products,
  title,
  cartItems = [],
  onUpdateQuantity,
}) {
  const items = products.length ? products : emptyFallback;
  if (!items.length) return null;

  return (
    <section className="content-section product-rail-section">
      <div className="section-heading products-heading">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
        </div>
      </div>
      <div className="product-rail">
        {items.slice(0, 8).map((product) => (
          <ProductCard
            compact
            isWishlisted={isWishlisted(product._id)}
            key={`${title}-${product._id}`}
            onAddToCart={onAddToCart}
            onToggleWishlist={onToggleWishlist}
            product={product}
            cartItems={cartItems}
            onUpdateQuantity={onUpdateQuantity}
          />
        ))}
      </div>
    </section>
  );
}

function ProductCard({ compact, isWishlisted, onAddToCart, onToggleWishlist, product, cartItems = [], onUpdateQuantity }) {
  const discount = calculateDiscount(product.price, product.discountPrice);
  const cartItem = cartItems?.find((item) => item.productId === product._id);
  const quantityInCart = cartItem ? cartItem.quantity : 0;

  return (
    <motion.article
      animate={{ opacity: 1, y: 0 }}
      className={compact ? "product-card compact-product-card" : "product-card"}
      exit={{ opacity: 0, y: 12 }}
      initial={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.22 }}
    >
      <Link className="product-image-link" to={`/product/${product._id}`}>
        <div className="product-image">
          {discount && <span className="discount-badge">{discount}% off</span>}
          <img src={product.thumbnail || product.images?.[0]} alt={product.name} loading="lazy" />
        </div>
      </Link>
      <button
        className={isWishlisted ? "floating-wishlist active" : "floating-wishlist"}
        onClick={() => onToggleWishlist(product)}
        type="button"
        aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
      >
        <FiHeart aria-hidden="true" />
      </button>
      <div className="product-info">
        <div>
          <span className="product-brand">{product.brand}</span>
          <h3>{product.name}</h3>
        </div>
        <div className="rating-row">
          <span>
            <FiStar aria-hidden="true" />
            {product.rating}
          </span>
          <span>{product.reviews} reviews</span>
        </div>
        <div className="price-row">
          <strong>Rs. {formatPrice(product.discountPrice || product.price)}</strong>
          {product.discountPrice < product.price && <span>Rs. {formatPrice(product.price)}</span>}
        </div>
        {quantityInCart > 0 ? (
          <div className="quantity-controls">
            <button
              className="qty-btn"
              onClick={() => onUpdateQuantity(product._id, cartItem.size, quantityInCart - 1)}
              type="button"
              aria-label="Decrease quantity"
            >
              <FiMinus />
            </button>
            <span className="qty-value">{quantityInCart}</span>
            <button
              className="qty-btn"
              onClick={() => onUpdateQuantity(product._id, cartItem.size, quantityInCart + 1)}
              type="button"
              aria-label="Increase quantity"
            >
              <FiPlus />
            </button>
          </div>
        ) : (
          <button className="cart-button" type="button" onClick={() => onAddToCart(product)}>
            <FiShoppingBag aria-hidden="true" />
            Add to cart
          </button>
        )}
      </div>
    </motion.article>
  );
}

export default App;
