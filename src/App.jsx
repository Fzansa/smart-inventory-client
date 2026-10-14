"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import Swal from "sweetalert2";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Grid3X3,
  Heart,
  LogOut,
  Menu,
  Minus,
  Package,
  Search,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  SlidersHorizontal,
  Sparkles,
  Star,
  Trash2,
  Truck,
  User,
  X,
  Zap,
} from "lucide-react";
import * as yup from "yup";
import {
  authService,
  cartService,
  categoryService,
  clearStoredAuth,
  getApiError,
  getStoredAuth,
  mediaUrl,
  orderService,
  productService,
  setStoredAuth,
} from "./api";

const money = (value) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(value || 0));

const loginSchema = yup.object({
  email: yup.string().trim().email("Enter a valid email").required("Email is required"),
  password: yup.string().min(8, "Password must be at least 8 characters").required("Password is required"),
});

const registerSchema = loginSchema.shape({
  name: yup.string().trim().min(2, "Name is too short").required("Name is required"),
});

const showError = (message) => Swal.fire({ icon: "error", title: "Error", text: message, confirmButtonColor: "#14666b" });
const showSuccess = (message) => Swal.fire({ icon: "success", title: message, timer: 1300, showConfirmButton: false });

const productImage = (product) => mediaUrl(product?.images?.[0]) || "";
const getCategoryId = (category) => (typeof category === "object" ? category?._id : category || "");
const getCategoryName = (category) => (typeof category === "object" ? category?.name || category?.slug : category || "Uncategorized");
const getProductId = (product) => (typeof product === "object" ? product?._id : product || "");

function App() {
  const [auth, setAuth] = useState(getStoredAuth());
  const [cartCount, setCartCount] = useState(0);
  const pathname = usePathname();

  const syncAuth = (nextAuth) => {
    if (nextAuth) setStoredAuth(nextAuth);
    else clearStoredAuth();
    setAuth(nextAuth);
  };

  const refreshCart = async () => {
    if (!getStoredAuth()?.accessToken) {
      setCartCount(0);
      return;
    }
    try {
      const cart = await cartService.get();
      setCartCount((cart?.items || []).length);
    } catch {
      setCartCount(0);
    }
  };

  useEffect(() => {
    refreshCart();
  }, [auth?.accessToken]);

  const content = pathname === "/cart" ? (
    <RequireAuth auth={auth}><CartPage onCartChange={refreshCart} /></RequireAuth>
  ) : pathname === "/login" ? (
    <AuthPage mode="login" auth={auth} onAuthChange={syncAuth} />
  ) : pathname === "/register" ? (
    <AuthPage mode="register" auth={auth} onAuthChange={syncAuth} />
  ) : pathname === "/products" ? (
    <ProductListingPage onCartChange={refreshCart} />
  ) : pathname?.startsWith("/products/") ? (
    <ProductDetail onCartChange={refreshCart} />
  ) : pathname?.startsWith("/category/") ? (
    <ProductListingPage onCartChange={refreshCart} />
  ) : (
    <HomePage onCartChange={refreshCart} />
  );

  return (
    <div className="app-shell">
      <Header auth={auth} onAuthChange={syncAuth} cartCount={cartCount} />
      {content}
      <Footer />
    </div>
  );
}

function Header({ auth, onAuthChange, cartCount }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const logout = () => {
    onAuthChange(null);
    setOpen(false);
  };
  const submitSearch = (event) => {
    event.preventDefault();
    const nextSearch = search.trim();
    router.push(nextSearch ? `/products?search=${encodeURIComponent(nextSearch)}` : "/products");
    setOpen(false);
  };
  return (
    <header className="site-header">
      <Link className="brand" href="/">
        <span className="brand-mark"><ShoppingBag size={22} /></span>
        <span>
          <strong>SIOMs Store</strong>
          <small>Explore Plus</small>
        </span>
      </Link>
      <form className="header-search" onSubmit={submitSearch}>
        <Search size={18} />
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search for products, brands and more" />
      </form>
      <button className="menu-btn" aria-label="Toggle menu" onClick={() => setOpen((value) => !value)}>
        {open ? <X size={21} /> : <Menu size={21} />}
      </button>
      <nav className={`site-nav ${open ? "open" : ""}`}>
        <Link href="/products" onClick={() => setOpen(false)}>Shop</Link>
        <Link href="/#collections" onClick={() => setOpen(false)}>Collections</Link>
        <Link href="/#benefits" onClick={() => setOpen(false)}>Benefits</Link>
        <Link className="cart-link" href="/cart" onClick={() => setOpen(false)}>
          <ShoppingCart size={18} />
          Cart
          {cartCount > 0 && <span>{cartCount}</span>}
        </Link>
        {auth?.accessToken ? (
          <button className="ghost-link" onClick={logout}><LogOut size={17} /> Logout</button>
        ) : (
          <Link className="primary-link" href="/login" onClick={() => setOpen(false)}><User size={17} /> Login</Link>
        )}
      </nav>
    </header>
  );
}

function HomePage({ onCartChange }) {
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([productService.list({ limit: 8 }), categoryService.list()])
      .then(([productData, categoryData]) => {
        setProducts((productData.items || []).filter((product) => product.status !== "inactive"));
        setCategories(categoryData || []);
      })
      .catch((error) => showError(getApiError(error, "Unable to load storefront")))
      .finally(() => setLoading(false));
  }, []);

  const openCategory = (categoryId) => router.push(`/category/${categoryId}`);

  return (
    <main>
      <section className="category-rail">
        {categories.slice(0, 9).map((item) => (
          <button key={item._id} onClick={() => openCategory(item._id)}>
            <span><Package size={22} /></span>
            {item.name}
          </button>
        ))}
      </section>

      <section className="home-hero">
        <div className="home-hero-copy">
          <span className="eyebrow"><Sparkles size={16} /> New season deals are live</span>
          <h1>Shop smart products at prices worth coming back for.</h1>
          <p>Discover fresh picks, quick delivery choices, and everyday essentials curated for a simple, reliable shopping experience.</p>
          <div className="hero-actions">
            <Link className="primary-btn" href="/products">Shop Products <ChevronRight size={18} /></Link>
            <Link className="secondary-btn" href="#collections">Explore Categories</Link>
          </div>
        </div>
        <div className="home-hero-panel">
          <strong>Why shoppers choose SIOMs</strong>
          <div><Zap size={20} /> Fresh arrivals updated daily</div>
          <div><Truck size={20} /> Easy cart and quick ordering</div>
          <div><ShieldCheck size={20} /> Secure shopping experience</div>
        </div>
      </section>

      <section className="benefits" id="benefits">
        <Benefit icon={<Truck />} title="Fast delivery" text="Get a smooth shopping experience from browsing to cart." />
        <Benefit icon={<ShieldCheck />} title="Secure payments" text="Shop confidently with protected customer access." />
        <Benefit icon={<CheckCircle2 />} title="Trusted stock" text="Only available products are shown clearly before checkout." />
      </section>

      <section className="home-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow"><Grid3X3 size={15} /> Featured</span>
            <h2>Popular products</h2>
          </div>
          <Link className="secondary-btn" href="/products">View all products</Link>
        </div>
        {loading ? (
          <EmptyState title="Loading products..." />
        ) : products.length === 0 ? (
          <EmptyState title="No products found" />
        ) : (
          <div className="product-grid preview-grid">
            {products.slice(0, 4).map((product) => <ProductCard product={product} key={product._id} onCartChange={onCartChange} />)}
          </div>
        )}
      </section>

      <section className="collections" id="collections">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Collections</span>
            <h2>Shop by category</h2>
          </div>
          <Link className="secondary-btn" href="/products">All categories</Link>
        </div>
        <div className="collection-grid">
          {categories.slice(0, 8).map((item) => (
            <button className="collection-card" key={item._id} onClick={() => openCategory(item._id)}>
              <BoxesIcon />
              <strong>{item.name}</strong>
              <span>{item.description || item.slug}</span>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}

function ProductListingPage({ onCartChange }) {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCategory = params?.id || "all";
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState(searchParams.get("search") || "");
  const [category, setCategory] = useState(initialCategory);
  const [sort, setSort] = useState("featured");

  useEffect(() => {
    setLoading(true);
    Promise.all([productService.list({ limit: 100 }), categoryService.list()])
      .then(([productData, categoryData]) => {
        setProducts(productData.items || []);
        setCategories(categoryData || []);
      })
      .catch((error) => showError(getApiError(error, "Unable to load products")))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setCategory(initialCategory);
  }, [initialCategory]);

  useEffect(() => {
    setQuery(searchParams.get("search") || "");
  }, [searchParams]);

  const openCategory = (categoryId) => {
    if (categoryId === "all") {
      router.push("/products");
      return;
    }
    router.push(`/category/${categoryId}`);
  };

  const activeCategoryName = category === "all" ? "All Products" : categories.find((item) => item._id === category)?.name || "Category";

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    const next = products
      .filter((product) => product.status !== "inactive")
      .filter((product) => (category === "all" ? true : getCategoryId(product.category) === category))
      .filter((product) => {
        if (!search) return true;
        return [product.name, product.sku, product.description, getCategoryName(product.category)]
          .some((value) => String(value || "").toLowerCase().includes(search));
      });
    if (sort === "price-low") return next.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
    if (sort === "price-high") return next.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
    if (sort === "stock") return next.sort((a, b) => Number(b.stock || 0) - Number(a.stock || 0));
    return next;
  }, [category, products, query, sort]);

  return (
    <main>
      <section className="listing-hero">
        <div>
          <span className="eyebrow"><Grid3X3 size={15} /> Catalog</span>
          <h1>{activeCategoryName}</h1>
          <p>Search, filter, sort, and add products from the live inventory catalog.</p>
        </div>
        <Link className="secondary-btn" href="/">Back to Home</Link>
      </section>

      <section className="category-rail">
        <button className={category === "all" ? "active" : ""} onClick={() => openCategory("all")}>
          <span><Package size={22} /></span>
          All Products
        </button>
        {categories.slice(0, 8).map((item) => (
          <button className={category === item._id ? "active" : ""} key={item._id} onClick={() => openCategory(item._id)}>
            <span><Package size={22} /></span>
            {item.name}
          </button>
        ))}
      </section>

      <section className="shop-section" id="products">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Products</span>
            <h2>{activeCategoryName}</h2>
          </div>
          <p>{filtered.length} items available</p>
        </div>

        <div className="filters">
          <label className="search-box">
            <Search size={18} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search products, SKU, category" />
          </label>
          <label>
            <SlidersHorizontal size={17} />
            <select value={category} onChange={(event) => openCategory(event.target.value)}>
              <option value="all">All categories</option>
              {categories.map((item) => <option value={item._id} key={item._id}>{item.name}</option>)}
            </select>
          </label>
          <label>
            <Star size={17} />
            <select value={sort} onChange={(event) => setSort(event.target.value)}>
              <option value="featured">Featured</option>
              <option value="price-low">Price: low to high</option>
              <option value="price-high">Price: high to low</option>
              <option value="stock">Stock: high to low</option>
            </select>
          </label>
        </div>

        {loading ? (
          <EmptyState title="Loading products..." />
        ) : filtered.length === 0 ? (
          <EmptyState title="No products found" />
        ) : (
          <div className="product-grid">
            {filtered.map((product) => <ProductCard product={product} key={product._id} onCartChange={onCartChange} />)}
          </div>
        )}
      </section>
    </main>
  );
}

function ProductCard({ product, onCartChange }) {
  const [saving, setSaving] = useState(false);
  const out = Number(product.stock || 0) <= 0;
  const add = async () => {
    if (!getStoredAuth()?.accessToken) {
      Swal.fire({ icon: "info", title: "Login required", text: "Please login before adding products to cart.", confirmButtonColor: "#14666b" });
      return;
    }
    setSaving(true);
    try {
      await cartService.add({ productId: product._id, quantity: 1 });
      showSuccess("Added to cart");
      onCartChange?.();
    } catch (error) {
      showError(getApiError(error, "Unable to add to cart"));
    } finally {
      setSaving(false);
    }
  };
  return (
    <article className="product-card">
      <Link className="product-media" href={`/products/${product._id}`}>
        <ImageWithFallback src={productImage(product)} alt={product.name} iconSize={44} />
        <span className={`stock-chip ${out ? "out" : ""}`}>{out ? "Out of stock" : `${product.stock || 0} in stock`}</span>
      </Link>
      <div className="product-body">
        <span className="category-name">{getCategoryName(product.category)}</span>
        <Link href={`/products/${product._id}`}><h3>{product.name}</h3></Link>
        <p>{product.description || product.sku}</p>
        <div className="rating-row">
          <span><Star size={13} /> 4.2</span>
          <small>{Number(product.stock || 0) > 0 ? "In stock" : "Sold out"}</small>
        </div>
        <div className="product-footer">
          <div>
            <strong>{money(product.price)}</strong>
            <small>Free delivery</small>
          </div>
          <button className="icon-action" aria-label="Wishlist"><Heart size={18} /></button>
        </div>
        <button className="primary-btn full" disabled={out || saving} onClick={add}>
          <ShoppingCart size={17} />
          {saving ? "Adding..." : out ? "Unavailable" : "Add to Cart"}
        </button>
      </div>
    </article>
  );
}

function ProductDetail({ onCartChange }) {
  const { id } = useParams();
  const router = useRouter();
  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    productService.get(id)
      .then(setProduct)
      .catch((error) => showError(getApiError(error, "Unable to load product")))
      .finally(() => setLoading(false));
  }, [id]);

  const add = async () => {
    if (!getStoredAuth()?.accessToken) {
      router.push("/login");
      return;
    }
    setSaving(true);
    try {
      await cartService.add({ productId: product._id, quantity: Number(quantity) });
      showSuccess("Added to cart");
      onCartChange?.();
    } catch (error) {
      showError(getApiError(error, "Unable to add to cart"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <EmptyState title="Loading product..." />;
  if (!product) return <EmptyState title="Product not found" />;
  const out = Number(product.stock || 0) <= 0;

  return (
    <main className="detail-page">
      <button className="back-btn" onClick={() => router.back()}><ArrowLeft size={17} /> Back</button>
      <section className="product-detail">
        <div className="detail-media">
          <ImageWithFallback src={productImage(product)} alt={product.name} iconSize={74} />
        </div>
        <div className="detail-copy">
          <span className="eyebrow">{getCategoryName(product.category)}</span>
          <h1>{product.name}</h1>
          <p>{product.description}</p>
          <strong className="detail-price">{money(product.price)}</strong>
          <div className="detail-stats">
            <span>SKU <b>{product.sku}</b></span>
            <span>Stock <b>{product.stock ?? 0}</b></span>
            <span>Reorder <b>{product.reorderLevel ?? 0}</b></span>
          </div>
          <div className="buy-row">
            <div className="qty-control">
              <button onClick={() => setQuantity((value) => Math.max(1, Number(value) - 1))}><Minus size={16} /></button>
              <input value={quantity} type="number" min="1" max={product.stock || 1} onChange={(event) => setQuantity(event.target.value)} />
              <button onClick={() => setQuantity((value) => Math.min(Number(product.stock || 1), Number(value) + 1))}>+</button>
            </div>
            <button className="primary-btn" disabled={out || saving} onClick={add}>
              <ShoppingCart size={18} />
              {saving ? "Adding..." : out ? "Out of Stock" : "Add to Cart"}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

function CartPage({ onCartChange }) {
  const [cart, setCart] = useState({ items: [] });
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState("");
  const [updatingId, setUpdatingId] = useState("");
  const [placingOrder, setPlacingOrder] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [cartData, productData] = await Promise.all([cartService.get(), productService.list({ limit: 1000 })]);
      setCart(cartData || { items: [] });
      setProducts(productData.items || []);
      onCartChange?.();
    } catch (error) {
      showError(getApiError(error, "Unable to load cart"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const removeItem = async (item) => {
    const product = typeof item.product === "object" ? item.product : products.find((entry) => entry._id === item.product) || {};
    const productId = getProductId(item.product) || product._id;
    if (!productId) {
      showError("Product id missing for this cart item");
      return;
    }

    const result = await Swal.fire({
      icon: "warning",
      title: "Remove item?",
      text: `${product.name || "This product"} will be removed from your cart.`,
      showCancelButton: true,
      confirmButtonText: "Remove",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#d92d20",
      cancelButtonColor: "#667085",
    });

    if (!result.isConfirmed) return;

    setRemovingId(productId);
    try {
      const updatedCart = await cartService.remove(productId);
      if (updatedCart?.items) setCart(updatedCart);
      else setCart((current) => ({
        ...current,
        items: (current.items || []).filter((entry) => (getProductId(entry.product) || entry.product) !== productId),
      }));
      onCartChange?.();
      showSuccess("Item removed from cart");
    } catch (error) {
      showError(getApiError(error, "Unable to remove item"));
    } finally {
      setRemovingId("");
    }
  };

  const updateQuantity = async (item, value) => {
    const product = typeof item.product === "object" ? item.product : products.find((entry) => entry._id === item.product) || {};
    const productId = getProductId(item.product) || product._id;
    const currentQuantity = Number(item.quantity || 1);
    const maxQuantity = Math.max(1, Number(product.stock || 99));
    if (!productId) {
      showError("Product id missing for this cart item");
      return;
    }

    let nextQuantity = Number(value);
    if (value === "more") {
      const result = await Swal.fire({
        title: "Enter Quantity",
        input: "number",
        inputValue: String(currentQuantity),
        inputAttributes: {
          min: "1",
          max: String(maxQuantity),
          step: "1",
        },
        showCancelButton: true,
        confirmButtonText: "Apply",
        cancelButtonText: "Cancel",
        confirmButtonColor: "#14666b",
        inputValidator: (inputValue) => {
          const parsed = Number(inputValue);
          if (!Number.isInteger(parsed) || parsed < 1) return "Enter a valid quantity";
          if (parsed > maxQuantity) return `Only ${maxQuantity} item${maxQuantity > 1 ? "s are" : " is"} available`;
          return null;
        },
      });
      if (!result.isConfirmed) return;
      nextQuantity = Number(result.value);
    }

    if (!Number.isInteger(nextQuantity) || nextQuantity < 1) {
      showError("Enter a valid quantity");
      return;
    }
    if (nextQuantity > maxQuantity) {
      showError(`Only ${maxQuantity} item${maxQuantity > 1 ? "s are" : " is"} available`);
      return;
    }
    if (nextQuantity === currentQuantity) return;

    setUpdatingId(productId);
    try {
      const updatedCart = await cartService.setQuantity(productId, nextQuantity);
      if (updatedCart?.items) setCart(updatedCart);
      else await load();
      onCartChange?.();
      showSuccess("Quantity updated");
    } catch (error) {
      showError(getApiError(error, "Unable to update quantity"));
    } finally {
      setUpdatingId("");
    }
  };

  const placeOrder = async () => {
    if (!rows.length || placingOrder) return;

    const result = await Swal.fire({
      icon: "question",
      title: "Place order?",
      text: `Your order total is ${money(total)}.`,
      showCancelButton: true,
      confirmButtonText: "Place Order",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#14666b",
    });

    if (!result.isConfirmed) return;

    setPlacingOrder(true);
    try {
      const order = await orderService.create();
      setCart({ items: [] });
      onCartChange?.();
      await Swal.fire({
        icon: "success",
        title: "Order placed successfully",
        text: order?._id ? `Order #${String(order._id).slice(-8)} has been created.` : "Your order has been created.",
        confirmButtonColor: "#14666b",
      });
    } catch (error) {
      showError(getApiError(error, "Unable to place order"));
    } finally {
      setPlacingOrder(false);
    }
  };

  const rows = cart?.items || [];
  const total = rows.reduce((sum, item) => {
    const product = typeof item.product === "object" ? item.product : products.find((entry) => entry._id === item.product) || {};
    return sum + Number(product.price || 0) * Number(item.quantity || 0);
  }, 0);

  return (
    <main className="cart-page">
      <div className="section-heading">
        <div>
          <span className="eyebrow"><ShoppingCart size={15} /> Cart</span>
          <h2>Your shopping cart</h2>
        </div>
        <Link className="secondary-btn" href="/">Continue Shopping</Link>
      </div>
      {loading ? <EmptyState title="Loading cart..." /> : rows.length === 0 ? <EmptyState title="Your cart is empty" /> : (
        <section className="cart-layout">
          <div className="cart-list">
            {rows.map((item) => {
              const product = typeof item.product === "object" ? item.product : products.find((entry) => entry._id === item.product) || {};
              const line = Number(product.price || 0) * Number(item.quantity || 0);
              const productId = getProductId(item.product) || product._id;
              const quantity = Number(item.quantity || 1);
              const selectValue = quantity <= 3 ? String(quantity) : String(quantity);
              return (
                <article className="cart-item" key={item._id || getProductId(item.product)}>
                  <div className="cart-thumb"><ImageWithFallback src={mediaUrl(product.images?.[0])} alt={product.name} iconSize={26} /></div>
                  <div className="cart-product-copy">
                    <h3>{product.name || "Product"}</h3>
                    <p>{product.sku || "SKU"}</p>
                  </div>
                  <span className="cart-price">{money(product.price)}</span>
                  <label className="qty-select-wrap">
                    <span>Qty</span>
                    <select
                      value={selectValue}
                      disabled={updatingId === productId || removingId === productId}
                      onChange={(event) => updateQuantity(item, event.target.value)}
                    >
                      {quantity > 3 && <option value={String(quantity)}>{quantity}</option>}
                      <option value="1">1</option>
                      <option value="2">2</option>
                      <option value="3">3</option>
                      <option value="more">More</option>
                    </select>
                  </label>
                  <strong className="cart-line-total">{money(line)}</strong>
                  <button
                    type="button"
                    className="remove-cart-btn"
                    aria-label={`Remove ${product.name || "product"} from cart`}
                    disabled={removingId === productId || updatingId === productId}
                    onClick={() => removeItem(item)}
                  >
                    <Trash2 size={17} />
                    {removingId === productId ? "Removing" : "Remove"}
                  </button>
                </article>
              );
            })}
          </div>
          <aside className="summary-card">
            <h3>Order Summary</h3>
            <div><span>Subtotal</span><strong>{money(total)}</strong></div>
            <div><span>Delivery</span><strong>Calculated later</strong></div>
            <button className="primary-btn full" disabled={placingOrder || rows.length === 0} onClick={placeOrder}>
              {placingOrder ? "Placing order..." : "Proceed to Checkout"}
            </button>
          </aside>
        </section>
      )}
    </main>
  );
}

function AuthPage({ mode, auth, onAuthChange }) {
  const router = useRouter();
  const isLogin = mode === "login";
  const [values, setValues] = useState({ name: "", email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (auth?.accessToken) router.replace("/");
  }, [auth?.accessToken, router]);

  if (auth?.accessToken) return null;

  const submit = async (event) => {
    event.preventDefault();
    let payload;
    try {
      payload = await (isLogin ? loginSchema : registerSchema).validate(
        isLogin ? { email: values.email, password: values.password } : values,
        { abortEarly: false, stripUnknown: true },
      );
      setErrors({});
    } catch (error) {
      const nextErrors = {};
      error.inner?.forEach((item) => { nextErrors[item.path] = item.message; });
      setErrors(nextErrors);
      return;
    }
    setSaving(true);
    try {
      const authData = isLogin ? await authService.login(payload) : await authService.register(payload);
      onAuthChange(authData);
      router.push("/");
    } catch (error) {
      showError(getApiError(error, "Authentication failed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <span className="brand-mark"><ShoppingBag size={23} /></span>
        <h1>{isLogin ? "Welcome back" : "Create customer account"}</h1>
        <p>{isLogin ? "Login to manage your cart and continue shopping." : "Register as a customer and start adding products to your cart."}</p>
        {!isLogin && <Field label="Name" value={values.name} error={errors.name} onChange={(value) => setValues((current) => ({ ...current, name: value }))} />}
        <Field label="Email" type="email" value={values.email} error={errors.email} onChange={(value) => setValues((current) => ({ ...current, email: value }))} />
        <Field label="Password" type="password" value={values.password} error={errors.password} onChange={(value) => setValues((current) => ({ ...current, password: value }))} />
        <button type="submit" className="primary-btn full" disabled={saving}>{saving ? "Please wait..." : isLogin ? "Login" : "Create Account"}</button>
        <span className="auth-switch">
          {isLogin ? "New here?" : "Already registered?"} <Link href={isLogin ? "/register" : "/login"}>{isLogin ? "Create account" : "Login"}</Link>
        </span>
      </form>
    </main>
  );
}

function RequireAuth({ auth, children }) {
  const router = useRouter();
  useEffect(() => {
    if (!auth?.accessToken) router.replace("/login");
  }, [auth?.accessToken, router]);
  if (!auth?.accessToken) return null;
  return children;
}

function Field({ label, value, onChange, error, type = "text" }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} />
      {error && <small>{error}</small>}
    </label>
  );
}

function Benefit({ icon, title, text }) {
  return <article className="benefit-card">{React.cloneElement(icon, { size: 24 })}<div><strong>{title}</strong><p>{text}</p></div></article>;
}

function ImageWithFallback({ src, alt, iconSize = 36 }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <Package size={iconSize} />;
  return <img src={src} alt={alt || "Product"} onError={() => setFailed(true)} />;
}

function EmptyState({ title }) {
  return <div className="empty-state">{title}</div>;
}

function BoxesIcon() {
  return <span className="collection-icon"><Package size={22} /></span>;
}

function Footer() {
  return (
    <footer className="footer">
      <strong>SIOMs Store</strong>
      <span>Fresh finds, trusted stock, and easy shopping for every customer.</span>
    </footer>
  );
}

export default App;
