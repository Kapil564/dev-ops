import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const API = '/api';

function App() {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({
    total_skus: 0,
    total_units: 0,
    low_stock: 0,
    out_of_stock: 0,
    total_valuation: 0,
  });
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = async () => {
    try {
      setError('');
      const [itemsRes, statsRes] = await Promise.all([
        fetch(`${API}/items`),
        fetch(`${API}/items/stats`),
      ]);
      if (!itemsRes.ok || !statsRes.ok) {
        throw new Error('Backend API unavailable. Ensure FastAPI is running on port 8000.');
      }
      const itemsData = await itemsRes.json();
      const statsData = await statsRes.json();
      setItems(itemsData);
      setStats(statsData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const adjustStock = async (item, delta) => {
    const newQty = Math.max(0, item.quantity + delta);
    try {
      await fetch(`${API}/items/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: newQty }),
      });
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const deleteItem = async (id) => {
    if (!window.confirm('Are you sure you want to remove this item from inventory?')) return;
    try {
      await fetch(`${API}/items/${id}`, { method: 'DELETE' });
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const createItem = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: fd.get('name'),
      sku: fd.get('sku'),
      category: fd.get('category'),
      quantity: parseInt(fd.get('quantity') || '0', 10),
      unit_price: parseFloat(fd.get('unit_price') || '0'),
      supplier: fd.get('supplier') || 'Primary Vendor',
    };

    try {
      const res = await fetch(`${API}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(`Failed to add item: ${err.detail || 'SKU must be unique'}`);
        return;
      }
      e.currentTarget.reset();
      setShowModal(false);
      loadData();
    } catch (err) {
      alert(`Error creating item: ${err.message}`);
    }
  };

  const categories = ['ALL', ...new Set(items.map((i) => i.category))];

  const visibleItems = items.filter((item) => {
    const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
    const matchesCategory = categoryFilter === 'ALL' || item.category === categoryFilter;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      item.name.toLowerCase().includes(q) ||
      item.sku.toLowerCase().includes(q) ||
      item.supplier.toLowerCase().includes(q);
    return matchesStatus && matchesCategory && matchesSearch;
  });

  return (
    <div className="app">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">📦</span>
          <div>
            <b>StockPulse</b>
            <small>Inventory & Logistics</small>
          </div>
        </div>

        <nav>
          <a className="active">
            <span>▦</span>
            <span>Inventory Hub</span>
          </a>
          <a>
            <span>🏷</span>
            <span>Products & SKUs</span>
          </a>
          <a>
            <span>📦</span>
            <span>Warehouse Stock</span>
          </a>
          <a>
            <span>⇄</span>
            <span>Shipments & POs</span>
          </a>
          <a>
            <span>⚠</span>
            <span>Low Stock Alerts</span>
          </a>
        </nav>

        <div className="side-bottom">
          <div className="upgrade">
            <strong>DevOps Production</strong>
            <p>FastAPI · PostgreSQL · Docker · EKS · Prometheus</p>
          </div>
          <div className="profile">
            <div className="avatar">KA</div>
            <div>
              <b>Kapil Admin</b>
              <small>Warehouse Manager</small>
            </div>
            <span>⋮</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main">
        <header>
          <div>
            <p className="eyebrow">WAREHOUSE LOGISTICS / INVENTORY OVERVIEW</p>
            <h1>Stock & Warehouse Management</h1>
            <p className="muted">Monitor real-time stock levels, SKU valuations, and warehouse restocks.</p>
          </div>
          <div className="header-actions">
            <button className="primary" onClick={() => setShowModal(true)}>
              ＋ Register New Item
            </button>
          </div>
        </header>

        {error && (
          <div className="alert">
            ⚠ {error}
          </div>
        )}

        {/* Metric Cards */}
        <section className="stats">
          <div className="stat">
            <div className="stat-icon blue">🏷</div>
            <div>
              <small>Total SKUs</small>
              <strong>{stats.total_skus}</strong>
              <span>Active catalog items</span>
            </div>
          </div>
          <div className="stat">
            <div className="stat-icon green">📦</div>
            <div>
              <small>Total Units in Stock</small>
              <strong>{stats.total_units.toLocaleString()}</strong>
              <span>Physical inventory</span>
            </div>
          </div>
          <div className="stat">
            <div className="stat-icon amber">⚠</div>
            <div>
              <small>Low Stock Alerts</small>
              <strong>{stats.low_stock}</strong>
              <span>Needs restock (&le;10 units)</span>
            </div>
          </div>
          <div className="stat">
            <div className="stat-icon purple">💵</div>
            <div>
              <small>Total Valuation</small>
              <strong>${stats.total_valuation.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
              <span>Asset valuation</span>
            </div>
          </div>
        </section>

        {/* Main Grid: Inventory Table + Activity Feed */}
        <section className="content-grid">
          <div className="panel items-panel">
            <div className="panel-head">
              <div className="panel-title-area">
                <h2>Product Inventory</h2>
                <p className="muted">Showing {visibleItems.length} of {items.length} items</p>
              </div>

              <div className="search-bar">
                <input
                  type="text"
                  placeholder="Search name, SKU, or supplier..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="filters">
                {['ALL', 'IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK'].map((st) => (
                  <button
                    key={st}
                    className={statusFilter === st ? 'selected' : ''}
                    onClick={() => setStatusFilter(st)}
                  >
                    {st === 'ALL' ? 'All' : st.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="empty">Loading inventory catalog...</div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Product & SKU</th>
                      <th>Category</th>
                      <th>In-Stock Qty</th>
                      <th>Unit Price</th>
                      <th>Total Value</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleItems.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <div className="product-info">
                            <b>{item.name}</b>
                            <small className="sku-tag">{item.sku} · {item.supplier}</small>
                          </div>
                        </td>
                        <td>
                          <span className="category-pill">{item.category}</span>
                        </td>
                        <td>
                          <div className="qty-control">
                            <button
                              className="qty-btn"
                              onClick={() => adjustStock(item, -1)}
                              title="Decrease stock"
                            >
                              −
                            </button>
                            <span className="qty-number">{item.quantity}</span>
                            <button
                              className="qty-btn"
                              onClick={() => adjustStock(item, 1)}
                              title="Increase stock"
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td>${item.unit_price.toFixed(2)}</td>
                        <td>
                          <b>${(item.quantity * item.unit_price).toFixed(2)}</b>
                        </td>
                        <td>
                          <span className={`status-badge ${item.status.toLowerCase()}`}>
                            {item.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            className="icon-btn danger"
                            onClick={() => deleteItem(item.id)}
                            title="Remove from inventory"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!visibleItems.length && (
                  <div className="empty">No inventory items match the current search/filter.</div>
                )}
              </div>
            )}
          </div>

          {/* Right Activity Panel */}
          <aside className="panel activity">
            <div className="panel-head">
              <div>
                <h2>Warehouse Activity</h2>
                <p className="muted">Live replenishment & dispatches</p>
              </div>
            </div>
            <div className="activity-list">
              <div className="activity-row">
                <span className="activity-icon green">✓</span>
                <div>
                  <b>Restock batch received</b>
                  <small>Logitech MX Master 3S (+20 units)</small>
                </div>
              </div>
              <div className="activity-row">
                <span className="activity-icon amber">⚠</span>
                <div>
                  <b>Low stock threshold reached</b>
                  <small>Dell 4K Monitors under minimum level</small>
                </div>
              </div>
              <div className="activity-row">
                <span className="activity-icon blue">📦</span>
                <div>
                  <b>Outbound order dispatched</b>
                  <small>Order #PO-882 shipped to Warehouse B</small>
                </div>
              </div>
              <div className="activity-row">
                <span className="activity-icon purple">↗</span>
                <div>
                  <b>Inventory valuation updated</b>
                  <small>Automated daily asset calculation</small>
                </div>
              </div>
            </div>

            <div className="devops-card">
              <h4>DevOps Live Status</h4>
              <div className="pipeline">
                <span className="step done">FastAPI</span>
                <i></i>
                <span className="step done">PostgreSQL</span>
                <i></i>
                <span className="step done">Docker</span>
                <i></i>
                <span className="step done">K8s Ready</span>
              </div>
            </div>
          </aside>
        </section>

        {/* Modal: Add Product */}
        {showModal && (
          <div className="modal-backdrop" onClick={() => setShowModal(false)}>
            <form className="modal" onSubmit={createItem} onClick={(e) => e.stopPropagation()}>
              <div className="modal-head">
                <div>
                  <p className="eyebrow">NEW ASSET ENTRY</p>
                  <h2>Register Inventory Item</h2>
                </div>
                <button type="button" className="close" onClick={() => setShowModal(false)}>
                  ×
                </button>
              </div>

              <label>
                Product Name
                <input name="name" required placeholder="e.g. Sony WH-1000XM5 Wireless Headphones" />
              </label>

              <div className="form-row">
                <label>
                  SKU (Unique Code)
                  <input name="sku" required placeholder="e.g. SKU-AUD-105" />
                </label>
                <label>
                  Category
                  <select name="category">
                    <option>Electronics</option>
                    <option>Hardware</option>
                    <option>Accessories</option>
                    <option>Furniture</option>
                    <option>Networking</option>
                    <option>General</option>
                  </select>
                </label>
              </div>

              <div className="form-row">
                <label>
                  Initial Stock Quantity
                  <input type="number" name="quantity" min="0" defaultValue="20" required />
                </label>
                <label>
                  Unit Price ($ USD)
                  <input type="number" step="0.01" name="unit_price" min="0" defaultValue="49.99" required />
                </label>
              </div>

              <label>
                Supplier / Vendor
                <input name="supplier" defaultValue="Primary Supply Vendor" placeholder="Vendor company name" />
              </label>

              <button className="primary full">Register Product</button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
