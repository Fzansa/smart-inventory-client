"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, LogOut, Package, RefreshCw, ShoppingBag, Truck, User } from "lucide-react";
import { authService, getApiError, mediaUrl, orderService } from "./api";
import "./profile.css";

const money = (value) => new Intl.NumberFormat("en-IN", {
  style: "currency", currency: "INR", maximumFractionDigits: 2,
}).format(Number(value || 0));
const date = (value) => {
  const parsed = value ? new Date(value) : null;
  return parsed && !Number.isNaN(parsed.getTime())
    ? parsed.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : "Not available";
};
const statuses = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"];
const stages = ["pending", "confirmed", "processing", "shipped", "delivered"];

export default function ProfilePage({ onSessionExpired, onLogout }) {
  const [profile, setProfile] = useState(null);
  const [orders, setOrders] = useState([]);
  const [profileError, setProfileError] = useState("");
  const [ordersError, setOrdersError] = useState("");
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setProfileError("");
    setOrdersError("");
    Promise.allSettled([authService.me(), orderService.mine()]).then(([userResult, orderResult]) => {
      if (!active) return;
      if ([userResult, orderResult].some((result) => result.status === "rejected" && result.reason.response?.status === 401)) {
        onSessionExpired();
        return;
      }
      if (userResult.status === "fulfilled" && userResult.value) setProfile(userResult.value);
      else setProfileError(userResult.status === "rejected" ? getApiError(userResult.reason, "Unable to load your profile") : "Your profile could not be found.");
      if (orderResult.status === "fulfilled") setOrders(orderResult.value);
      else setOrdersError(getApiError(orderResult.reason, "Unable to load your orders"));
      setLoading(false);
    });
    return () => { active = false; };
  }, [attempt]);

  const visibleOrders = orders.filter((order) => filter === "all" || order.status === filter);
  const activeOrders = orders.filter((order) => !["delivered", "cancelled"].includes(order.status)).length;
  const deliveredOrders = orders.filter((order) => order.status === "delivered").length;

  return (
    <main className="account-page">
      <div className="account-heading">
        <div><span className="eyebrow"><User size={15} /> My account</span><h1>Your profile & orders</h1><p>Your account information and shopping history, all in one place.</p></div>
        <button className="secondary-btn" disabled={loading} onClick={() => setAttempt((value) => value + 1)}><RefreshCw size={16} /> {loading ? "Loading..." : "Refresh"}</button>
      </div>
      <div className="account-layout">
        <aside className="account-profile">
          {loading ? <p role="status">Loading your profile...</p> : profileError ? <div role="alert"><p>{profileError}</p><button className="secondary-btn" onClick={() => setAttempt((value) => value + 1)}>Try again</button></div> : (
            <>
              <div className="account-avatar">{profile?.name?.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || <User size={30} />}</div>
              <h2>{profile?.name || "My account"}</h2>
              <span className="account-role">{profile?.role || "customer"}</span>
              <dl className="account-fields">
                <div><dt>Email address</dt><dd>{profile?.email || "Not available"}</dd></div>
                <div><dt>Member since</dt><dd>{date(profile?.createdAt)}</dd></div>
                <div><dt>Account ID</dt><dd>{profile?._id || profile?.id || "Not available"}</dd></div>
              </dl>
              <Link className="primary-btn full" href="/products"><ShoppingBag size={17} /> Continue shopping</Link>
            </>
          )}
          <button type="button" className="secondary-btn full account-logout" onClick={onLogout}><LogOut size={17} /> Logout</button>
        </aside>
        <section className="account-orders" aria-label="My orders">
          <div className="account-stats">
            {[[Package, "Total orders", orders.length], [Truck, "Active orders", activeOrders], [CheckCircle2, "Delivered", deliveredOrders]].map(([Icon, label, value]) => (
              <div key={label}><Icon size={21} /><span>{label}<strong>{loading || ordersError ? "—" : value}</strong></span></div>
            ))}
          </div>
          <div className="account-orders-heading"><div><h2>Order history</h2><p>View the items and latest status of your orders.</p></div><label><span>Order status</span><select value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">All orders</option>{statuses.map((status) => <option key={status} value={status}>{status[0].toUpperCase() + status.slice(1)}</option>)}</select></label></div>
          {loading ? <div className="account-empty" role="status">Loading your orders...</div> : ordersError ? (
            <div className="account-empty" role="alert"><Package size={32} /><h3>Orders could not be loaded</h3><p>{ordersError}</p><button className="secondary-btn" onClick={() => setAttempt((value) => value + 1)}>Try again</button></div>
          ) : visibleOrders.length === 0 ? (
            <div className="account-empty"><ShoppingBag size={36} /><h3>{orders.length ? "No orders with this status" : "Your first order starts here"}</h3><p>{orders.length ? "Choose another status to see more orders." : "Once you place an order, its details will appear here."}</p><Link className="primary-btn" href="/products">Explore products <ShoppingBag size={16} /></Link></div>
          ) : <div className="account-order-list">{visibleOrders.map((order) => <OrderCard key={order._id} order={order} />)}</div>}
        </section>
      </div>
    </main>
  );
}

function OrderCard({ order }) {
  const items = order.items || [];
  const stage = stages.indexOf(order.status);
  return (
    <article className="account-order-card">
      <header><div><span className="account-label">Order ID</span><h3>#{order._id}</h3><p>Placed on {date(order.createdAt)}</p></div><span className={`order-status status-${order.status}`}>{order.status || "Unknown"}</span></header>
      <div className="account-order-items">{items.map((item, index) => {
        const product = typeof item.product === "object" ? item.product : null;
        const name = item.name || product?.name || "Product no longer available";
        const sku = item.sku || item.variant?.sku || product?.sku;
        const options = Object.entries(item.options || item.variant?.options || {}).map(([key, value]) => `${key}: ${value}`).join(" · ");
        return <div className="account-order-item" key={`${product?._id || "deleted"}-${item.variant?._id || "simple"}-${index}`}>
          <OrderImage product={product} variant={item.variant} />
          <div className="account-item-copy">{product?._id ? <Link href={`/products/${product._id}`}>{name}</Link> : <strong>{name}</strong>}<p>{sku && <span>SKU: {sku} · </span>}Qty: {item.quantity} × {money(item.price)}</p>{options && <p>{options}</p>}</div>
          <strong>{money(Number(item.price) * Number(item.quantity))}</strong>
        </div>;
      })}</div>
      {stage >= 0 && <ol className="account-order-progress" aria-label="Order progress">{stages.map((status, index) => <li className={index <= stage ? "complete" : ""} key={status} aria-current={index === stage ? "step" : undefined}><span>{index < stage ? <CheckCircle2 size={14} /> : index + 1}</span>{status}</li>)}</ol>}
      <footer><span>{items.reduce((total, item) => total + Number(item.quantity || 0), 0)} items{order.updatedAt && ` · Updated ${date(order.updatedAt)}`}</span><div>Order total <strong>{money(order.totalAmount)}</strong></div></footer>
    </article>
  );
}

function OrderImage({ product, variant }) {
  const [failed, setFailed] = useState(false);
  const src = mediaUrl(variant?.image || product?.images?.[0]);
  return <div className="account-order-image">{src && !failed ? <img src={src} alt={product?.name || "Product"} onError={() => setFailed(true)} /> : <Package size={25} />}</div>;
}
