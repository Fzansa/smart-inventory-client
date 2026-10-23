"use client";

import { useEffect, useState } from "react";
import { getApiError, productService } from "./api";
import { formatProductPrice } from "./productData";
import { referenceId } from "./cartData";

export default function CartVariantPicker({ item, productId, disabled, onApply }) {
  const [variants, setVariants] = useState([]);
  const [selected, setSelected] = useState(referenceId(item.variant));
  const [quantity, setQuantity] = useState(item.quantity);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    productService.variants(productId).then((data) => {
      if (active) setVariants(data.filter((variant) => variant.status === "active"));
    }).catch((failure) => { if (active) setError(getApiError(failure, "Unable to load options")); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [productId, attempt]);
  useEffect(() => { setSelected(referenceId(item.variant)); setQuantity(item.quantity); }, [referenceId(item.variant), item.quantity]);

  if (loading) return <p role="status">Loading product options...</p>;
  if (error) return <div role="alert"><p>{error}</p><button className="secondary-btn" onClick={() => setAttempt((value) => value + 1)}>Retry options</button></div>;
  if (!variants.length) return <p>No active options are available for this product.</p>;
  const variant = variants.find((entry) => entry._id === selected);
  const valid = variant && Number.isSafeInteger(Number(quantity)) && Number(quantity) > 0 && Number(quantity) <= variant.stock;
  const changed = selected !== referenceId(item.variant) || Number(quantity) !== item.quantity;
  return <form className="cart-variant-picker" onSubmit={(event) => { event.preventDefault(); if (valid && changed) onApply(item, selected, Number(quantity)); }}>
    <label><span>Product options</span><select aria-label="Select product options" value={selected} disabled={disabled} onChange={(event) => setSelected(event.target.value)}>
      <option value="">Choose size / color</option>
      {variants.map((entry) => <option key={entry._id} value={entry._id} disabled={entry.stock <= 0}>{Object.entries(entry.options || {}).map(([name, value]) => `${name}: ${value}`).join(" · ")} — {formatProductPrice(entry.price)} ({entry.stock > 0 ? `${entry.stock} in stock` : "Out of stock"})</option>)}
    </select></label>
    <div><label><span>Quantity</span><input aria-label="Quantity for selected options" type="number" min="1" step="1" max={variant?.stock} value={quantity} disabled={disabled} onChange={(event) => setQuantity(event.target.value)} /></label>
      <button className="primary-btn" type="submit" disabled={disabled || !valid || !changed}>{disabled ? "Please wait..." : "Apply options"}</button></div>
    {variant && !valid && <small role="status">Enter a whole quantity between 1 and {variant.stock}.</small>}
  </form>;
}
