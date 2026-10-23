export const isVariableProduct = (product) => product?.productType === "variable";

export const productNumber = (value) => {
  if (value === null || value === undefined || value === "" || typeof value === "boolean") return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
};

export const categoryName = (category) => {
  if (category && typeof category === "object" && category.name) return category.name;
  const slug = typeof category === "object" ? category?.slug : category;
  return slug ? String(slug).replace(/[-_]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) : "Uncategorized";
};

export const formatProductPrice = (value) => {
  const number = productNumber(value);
  return number === null ? "Price unavailable" : new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 2,
  }).format(number);
};

export const productOptions = (product) => (Array.isArray(product?.options) ? product.options : [])
  .filter((option) => option?.name && Array.isArray(option.values) && option.values.length);

// A variable parent's missing stock/price does not describe its variants.
export const productAvailability = (product) => {
  if (product?.status === "inactive") return "Unavailable";
  if (isVariableProduct(product)) return "Choose options";
  const stock = productNumber(product?.stock);
  return stock === null ? "Stock unavailable" : stock === 0 ? "Out of stock" : `${stock} in stock`;
};

export const canBuySimpleProduct = (product) => !isVariableProduct(product)
  && product?.status !== "inactive" && productNumber(product?.price) > 0
  && productNumber(product?.stock) > 0;

export const sortProducts = (products, sort) => {
  if (!["price-low", "price-high", "stock"].includes(sort)) return products;
  const key = sort === "stock" ? "stock" : "price";
  return [...products].sort((a, b) => {
    const first = isVariableProduct(a) ? null : productNumber(a[key]);
    const second = isVariableProduct(b) ? null : productNumber(b[key]);
    if (first === null) return second === null ? 0 : 1;
    if (second === null) return -1;
    return sort === "price-low" ? first - second : second - first;
  });
};
