import test from "node:test";
import assert from "node:assert/strict";
import { canBuySimpleProduct, categoryName, formatProductPrice, productAvailability, productNumber, productOptions, sortProducts } from "./productData.js";

const simple = { _id: "simple", productType: "simple", price: 45000, stock: 50, status: "active" };
const variable = { _id: "variable", productType: "variable", status: "active", options: [{ name: "Size", values: ["M", "L"] }, { name: "Color", values: ["Black", "Red"] }] };

test("variable parents without price or stock are not displayed as free or sold out", () => {
  assert.equal(productAvailability(variable), "Choose options");
  assert.equal(productNumber(variable.price), null);
  assert.equal(formatProductPrice(undefined), "Price unavailable");
  assert.equal(canBuySimpleProduct(variable), false);
  assert.equal(productOptions(variable).length, 2);
});

test("simple product stock and price remain accurate, including decimals and missing data", () => {
  assert.equal(canBuySimpleProduct(simple), true);
  assert.equal(productAvailability(simple), "50 in stock");
  assert.match(formatProductPrice(12.75), /12\.75/);
  assert.equal(productAvailability({ ...simple, stock: 0 }), "Out of stock");
  assert.equal(productAvailability({ ...simple, stock: undefined }), "Stock unavailable");
  assert.equal(canBuySimpleProduct({ ...simple, price: undefined }), false);
  assert.equal(canBuySimpleProduct({ ...simple, status: "inactive" }), false);
  assert.equal(productNumber("invalid"), null);
});

test("sort keeps products without parent prices or stock last in both directions", () => {
  const cheaper = { ...simple, _id: "cheap", price: 100, stock: 1 };
  const items = [variable, simple, cheaper];
  assert.deepEqual(sortProducts(items, "price-low").map((item) => item._id), ["cheap", "simple", "variable"]);
  assert.deepEqual(sortProducts(items, "price-high").map((item) => item._id), ["simple", "cheap", "variable"]);
  assert.deepEqual(sortProducts(items, "stock").map((item) => item._id), ["simple", "cheap", "variable"]);
  assert.equal(items[0], variable);
});

test("slug-only category responses have readable labels", () => {
  assert.equal(categoryName({ _id: "category", slug: "sporting-goods-outdoors" }), "Sporting Goods Outdoors");
  assert.equal(categoryName({ name: "Health & Beauty", slug: "health-beauty" }), "Health & Beauty");
  assert.equal(categoryName(null), "Uncategorized");
});
