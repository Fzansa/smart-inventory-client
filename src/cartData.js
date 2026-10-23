import { productNumber } from "./productData.js";

export const referenceId = (value) => typeof value === "object" ? value?._id || "" : value || "";
export const cartLineKey = (item) => item._id || `${referenceId(item.product)}:${referenceId(item.variant)}`;
export const cartMerchandise = (item, products = []) => {
  const product = (typeof item.product === "object" ? item.product : products.find((entry) => entry._id === item.product)) || {};
  const variant = item.variant && typeof item.variant === "object" ? item.variant : null;
  const isVariant = Boolean(item.variant) || product.productType === "variable";
  const inventory = isVariant ? variant : product;
  const price = productNumber(inventory?.price);
  const stock = productNumber(inventory?.stock);
  const needsSelection = isVariant && !variant;
  const unavailable = !product._id || product.status === "inactive" || (!needsSelection && (!inventory || inventory.status === "inactive" || price === null || stock === null || stock === 0));
  const issue = needsSelection ? "Choose size/color options to see the price and continue." : unavailable ? "This item is currently unavailable. Remove it or choose another option." : stock < item.quantity ? `Only ${stock} available. Please reduce the quantity.` : "";
  return {
    product, variant, price, stock, isVariant, needsSelection, issue,
    sku: inventory?.sku,
    image: variant?.image || product.images?.[0],
    options: Object.entries(variant?.options || {}).map(([name, value]) => `${name}: ${value}`).join(" · "),
    valid: Boolean(product._id && product.status !== "inactive" && inventory && inventory.status !== "inactive"
      && price > 0 && stock >= item.quantity && Number.isSafeInteger(item.quantity) && item.quantity > 0),
  };
};
