"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Minus, Package, ShoppingCart } from "lucide-react";
import Swal from "sweetalert2";
import { cartService, getApiError, getStoredAuth, mediaUrl, productService } from "./api";
import { canBuySimpleProduct, categoryName, formatProductPrice, isVariableProduct, productAvailability, productNumber, productOptions } from "./productData";
import "./products.css";

export default function ProductDetailPage({ onCartChange }) {
  const { id } = useParams();
  const router = useRouter();
  const [product, setProduct] = useState(null);
  const [variants, setVariants] = useState([]);
  const [selection, setSelection] = useState({});
  const [imageIndex, setImageIndex] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [variantLoading, setVariantLoading] = useState(false);
  const [variantError, setVariantError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setProduct(null);
    setVariants([]);
    setSelection({});
    setImageIndex(null);
    setQuantity(1);
    setError("");
    setVariantError("");
    setVariantLoading(false);
    (async () => {
      try {
        const data = await productService.get(id);
        if (!active) return;
        setProduct(data);
        setLoading(false);
        if (isVariableProduct(data)) {
          setVariantLoading(true);
          try {
            const result = await productService.variants(id);
            if (active) {
              const activeVariants = result.filter((variant) => variant.status !== "inactive");
              const defaultVariant = activeVariants.find((variant) => productNumber(variant.stock) > 0 && productNumber(variant.price) > 0) || activeVariants[0];
              setVariants(activeVariants);
              setSelection({ ...(defaultVariant?.options || {}) });
            }
          } catch (failure) {
            if (active) setVariantError(getApiError(failure, "Unable to load product options"));
          } finally {
            if (active) setVariantLoading(false);
          }
        }
      } catch (failure) {
        if (active) { setError(getApiError(failure, "Unable to load product")); setLoading(false); }
      }
    })();
    return () => { active = false; };
  }, [id, attempt]);

  if (loading) return <main className="detail-page"><div className="empty-state" role="status">Loading product...</div></main>;
  if (error || !product) return <main className="detail-page"><div className="empty-state" role="alert"><p>{error || "Product not found"}</p><button className="secondary-btn" onClick={() => setAttempt((value) => value + 1)}>Try again</button></div></main>;

  const variable = isVariableProduct(product);
  const options = productOptions(product);
  const complete = options.length > 0 && options.every((option) => selection[option.name]);
  const selectedVariant = complete ? variants.find((variant) => options.every((option) => variant.options?.[option.name] === selection[option.name])) : null;
  const displayed = variable ? selectedVariant : product;
  const stock = productNumber(displayed?.stock);
  const purchasable = product.status !== "inactive" && (variable
    ? Boolean(selectedVariant && selectedVariant.status !== "inactive" && stock > 0 && productNumber(selectedVariant.price) > 0 && !variantLoading && !variantError)
    : canBuySimpleProduct(product));
  const images = Array.isArray(product.images) ? product.images.filter(Boolean) : [];
  const src = imageIndex === null && selectedVariant?.image ? mediaUrl(selectedVariant.image) : mediaUrl(images[imageIndex ?? 0]);
  const validQuantity = Number.isInteger(Number(quantity)) && Number(quantity) >= 1 && Number(quantity) <= stock;

  const add = async () => {
    if (!purchasable || !validQuantity || saving) return;
    if (!getStoredAuth()?.accessToken) { router.push("/login"); return; }
    setSaving(true);
    try {
      await cartService.add({ productId: product._id, quantity: Number(quantity), ...(variable ? { variantId: selectedVariant._id } : {}) });
      Swal.fire({ icon: "success", title: "Added to cart", timer: 1300, showConfirmButton: false });
      onCartChange?.();
    } catch (failure) {
      Swal.fire({ icon: "error", title: "Unable to add to cart", text: getApiError(failure), confirmButtonColor: "#14666b" });
    } finally { setSaving(false); }
  };

  return (
    <main className="detail-page">
      <button className="back-btn" onClick={() => router.back()}><ArrowLeft size={17} /> Back</button>
      <section className="product-detail">
        <div className="product-gallery">
          <div className="detail-media"><ProductImage key={src} src={src} alt={product.name} /></div>
          {images.length > 1 && <div className="product-thumbnails" aria-label="Product images">{images.map((image, index) => <button key={`${image}-${index}`} aria-label={`View image ${index + 1}`} aria-pressed={(imageIndex ?? 0) === index && !(imageIndex === null && selectedVariant?.image)} onClick={() => setImageIndex(index)}><ProductImage src={mediaUrl(image)} alt={`${product.name}, image ${index + 1}`} /></button>)}</div>}
        </div>
        <div className="detail-copy">
          <span className="eyebrow">{categoryName(product.category)}</span>
          <h1>{product.name}</h1>
          <span className="product-type-label">{variable ? "Multiple options" : "Simple product"}</span>
          {product.description && <p className="product-description">{product.description}</p>}
          <strong className="detail-price">{variable && !selectedVariant ? "Select options to see price" : formatProductPrice(displayed?.price)}</strong>
          {variable && <div className="product-option-picker">
            {options.map((option) => <fieldset key={option.name}><legend>{option.name}</legend><div>{option.values.map((value) => <button type="button" key={value} disabled={saving || variantLoading} aria-pressed={selection[option.name] === value} onClick={() => { setSelection((current) => ({ ...current, [option.name]: value })); setImageIndex(null); setQuantity(1); }}>{value}</button>)}</div></fieldset>)}
            {variantLoading ? <p role="status">Loading option prices and stock...</p> : variantError ? <div role="alert"><p>{variantError}</p><button className="secondary-btn" onClick={() => setAttempt((value) => value + 1)}>Retry options</button></div> : complete && !selectedVariant ? <p role="status">This combination is not available. Please choose another option.</p> : !variants.length ? <p role="status">No active variants are available.</p> : null}
          </div>}
          <div className="detail-stats">
            <span>SKU <b>{displayed?.sku || (variable ? "Select options" : "Not available")}</b></span>
            <span>Availability <b>{variable ? selectedVariant ? productAvailability(selectedVariant) : "Select options" : productAvailability(product)}</b></span>
          </div>
          <div className="buy-row">
            <div className="qty-control">
              <button aria-label="Decrease quantity" disabled={!purchasable || saving || Number(quantity) <= 1} onClick={() => setQuantity((value) => Math.max(1, Number(value) - 1))}><Minus size={16} /></button>
              <input aria-label="Quantity" value={quantity} type="number" min="1" step="1" max={stock ?? undefined} disabled={!purchasable || saving} onChange={(event) => setQuantity(event.target.value)} />
              <button aria-label="Increase quantity" disabled={!purchasable || saving || Number(quantity) >= stock} onClick={() => setQuantity((value) => Math.min(stock, Number(value) + 1))}>+</button>
            </div>
            <button className="primary-btn" disabled={!purchasable || !validQuantity || saving} onClick={add}><ShoppingCart size={18} />{saving ? "Adding..." : variable && !selectedVariant ? "Select options" : purchasable ? "Add to Cart" : "Unavailable"}</button>
          </div>
          {purchasable && !validQuantity && <small role="alert">Enter a whole quantity between 1 and {stock}.</small>}
        </div>
      </section>
    </main>
  );
}

function ProductImage({ src, alt }) {
  const [failed, setFailed] = useState(false);
  return !src || failed ? <Package size={44} /> : <img src={src} alt={alt || "Product"} onError={() => setFailed(true)} />;
}
