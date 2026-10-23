import test from "node:test";
import assert from "node:assert/strict";
import { cartLineKey, cartMerchandise } from "./cartData.js";
import { api, cartService } from "./api.js";

const product = { _id: "parent", productType: "variable", name: "T-Shirt", status: "active" };
const variant = { _id: "black-m", price: 200.75, stock: 5, sku: "TEE-M-BLACK", options: { Size: "M", Color: "Black" }, status: "active" };

test("cart uses variant price, stock, SKU and option values instead of missing parent data", () => {
  const item = { product, variant, quantity: 2 };
  const data = cartMerchandise(item);
  assert.equal(data.price * item.quantity, 401.5);
  assert.equal(data.stock, 5);
  assert.equal(data.sku, "TEE-M-BLACK");
  assert.equal(data.options, "Size: M · Color: Black");
  assert.equal(data.valid, true);
  assert.notEqual(cartLineKey(item), cartLineKey({ ...item, variant: { ...variant, _id: "red-l" } }));
});

test("missing/inactive/short-stock variants block checkout; simple products remain valid", () => {
  assert.equal(cartMerchandise({ product, variant: null, quantity: 1 }).valid, false);
  assert.equal(cartMerchandise({ product, variant: { ...variant, status: "inactive" }, quantity: 1 }).valid, false);
  assert.equal(cartMerchandise({ product, variant, quantity: 6 }).valid, false);
  assert.equal(cartMerchandise({ product: null, variant, quantity: 1 }).valid, false);
  assert.equal(cartMerchandise({ product: { ...product, productType: "simple", stock: 3, price: 12.75 }, quantity: 1 }).valid, true);
});

test("legacy variable line requests a selection instead of reporting the product as sold out", () => {
  const data = cartMerchandise({ _id: "old-line", product, quantity: 2 });
  assert.equal(data.needsSelection, true);
  assert.equal(data.price, null);
  assert.match(data.issue, /Choose size\/color/);
  assert.equal(data.valid, false);
  const resolved = cartMerchandise({ product, variant, quantity: 2 });
  assert.equal(resolved.needsSelection, false);
  assert.equal(resolved.issue, "");
  assert.equal(resolved.valid, true);
});

test("frontend sends variantId for add/update and targets a single line on delete", async () => {
  const requests = [];
  const previous = api.defaults.adapter;
  api.defaults.adapter = async (config) => {
    requests.push({ url: config.url, method: config.method, data: config.data ? JSON.parse(config.data) : undefined, params: config.params });
    return { status: 200, statusText: "OK", config, headers: {}, data: { cart: { items: [] } } };
  };
  try {
    await cartService.add({ productId: "parent", variantId: "black-m", quantity: 2 });
    await cartService.setQuantity("parent", 3, "black-m");
    await cartService.remove("parent", "black-m");
    await cartService.remove("parent", "black-m", "line-id");
    await cartService.selectVariant("old-line", "black-m", 2);
    assert.deepEqual(requests[0].data, { productId: "parent", variantId: "black-m", quantity: 2 });
    assert.equal(requests[1].method, "patch");
    assert.deepEqual(requests[1].data, { quantity: 3, variantId: "black-m" });
    assert.deepEqual(requests[2].params, { variantId: "black-m" });
    assert.equal(requests[3].url, "/cart/items/line-id");
    assert.equal(requests[4].url, "/cart/items/old-line/variant");
    assert.deepEqual(requests[4].data, { variantId: "black-m", quantity: 2 });
    assert.equal(requests.length, 5);
  } finally { api.defaults.adapter = previous; }
});
