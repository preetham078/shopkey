import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Barcode,
  Camera,
  Check,
  IndianRupee,
  Minus,
  PackagePlus,
  Plus,
  ReceiptText,
  Search,
  ShoppingCart,
  Trash2,
  X,
} from "lucide-react";
import "./styles.css";

const STORAGE_KEY = "shopkey-store-v1";

const starterProducts = [
  { barcode: "8901030875623", name: "Aashirvaad Atta 1kg", price: 68, stock: 24 },
  { barcode: "8901058846810", name: "Parle-G Biscuit", price: 10, stock: 80 },
  { barcode: "8901764012459", name: "Amul Taaza Milk 500ml", price: 28, stock: 36 },
  { barcode: "8901491101142", name: "Tata Salt 1kg", price: 25, stock: 42 },
];

function loadProducts() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return starterProducts;

  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : starterProducts;
  } catch {
    return starterProducts;
  }
}

function formatMoney(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

function App() {
  const [products, setProducts] = useState(loadProducts);
  const [cart, setCart] = useState([]);
  const [query, setQuery] = useState("");
  const [manualCode, setManualCode] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [newProduct, setNewProduct] = useState({
    barcode: "",
    name: "",
    price: "",
    stock: "",
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(id);
  }, [toast]);

  const productMap = useMemo(() => {
    return new Map(products.map((product) => [product.barcode, product]));
  }, [products]);

  const visibleProducts = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return products;
    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(value) ||
        product.barcode.includes(value)
    );
  }, [products, query]);

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const itemCount = cart.reduce((sum, item) => sum + item.qty, 0);

  function show(message) {
    setToast(message);
  }

  function addToCart(barcode) {
    const product = productMap.get(String(barcode).trim());
    if (!product) {
      setManualCode(String(barcode).trim());
      show("Product not found. Add it to inventory first.");
      return;
    }

    const currentQty = cart.find((item) => item.barcode === product.barcode)?.qty ?? 0;
    if (currentQty >= product.stock) {
      show("No more stock available for this product.");
      return;
    }

    setCart((items) => {
      const existing = items.find((item) => item.barcode === product.barcode);
      if (existing) {
        return items.map((item) =>
          item.barcode === product.barcode ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...items, { ...product, qty: 1 }];
    });
    show(`${product.name} added to bill`);
  }

  function updateQty(barcode, change) {
    const product = productMap.get(barcode);
    setCart((items) =>
      items
        .map((item) => {
          if (item.barcode !== barcode) return item;
          const nextQty = item.qty + change;
          if (product && nextQty > product.stock) {
            show("Stock limit reached.");
            return item;
          }
          return { ...item, qty: nextQty };
        })
        .filter((item) => item.qty > 0)
    );
  }

  function removeFromCart(barcode) {
    setCart((items) => items.filter((item) => item.barcode !== barcode));
  }

  function completeBill() {
    if (!cart.length) {
      show("Add items before completing the bill.");
      return;
    }

    setProducts((items) =>
      items.map((product) => {
        const billed = cart.find((item) => item.barcode === product.barcode);
        if (!billed) return product;
        return { ...product, stock: Math.max(0, product.stock - billed.qty) };
      })
    );
    setCart([]);
    show(`Bill completed: ${formatMoney(subtotal)}`);
  }

  function saveProduct(event) {
    event.preventDefault();
    const barcode = newProduct.barcode.trim();
    const name = newProduct.name.trim();
    const price = Number(newProduct.price);
    const stock = Number.parseInt(newProduct.stock, 10);

    if (!barcode || !name || !Number.isFinite(price) || price <= 0 || stock < 0) {
      show("Enter valid product details.");
      return;
    }

    setProducts((items) => {
      const exists = items.some((item) => item.barcode === barcode);
      if (exists) {
        return items.map((item) =>
          item.barcode === barcode ? { barcode, name, price, stock } : item
        );
      }
      return [{ barcode, name, price, stock }, ...items];
    });
    setNewProduct({ barcode: "", name: "", price: "", stock: "" });
    show("Product saved.");
  }

  function scanManualCode(event) {
    event.preventDefault();
    if (!manualCode.trim()) return;
    addToCart(manualCode);
    setManualCode("");
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Provision Store POS</p>
          <h1>ShopKey Billing</h1>
        </div>
        <div className="totals-chip">
          <ShoppingCart size={18} />
          <span>{itemCount} items</span>
        </div>
      </header>

      <section className="workspace">
        <div className="billing-panel">
          <div className="section-title">
            <ReceiptText size={20} />
            <h2>Current Bill</h2>
          </div>

          <div className="scan-row">
            <button className="primary-btn" onClick={() => setScannerOpen(true)}>
              <Camera size={19} />
              Scan
            </button>
            <form className="barcode-form" onSubmit={scanManualCode}>
              <Barcode size={19} />
              <input
                value={manualCode}
                onChange={(event) => setManualCode(event.target.value)}
                inputMode="numeric"
                placeholder="Enter barcode"
              />
              <button aria-label="Add barcode" type="submit">
                <Plus size={18} />
              </button>
            </form>
          </div>

          <div className="cart-list">
            {cart.length === 0 ? (
              <div className="empty-state">
                <Barcode size={34} />
                <p>Scan a product barcode or tap an item from inventory.</p>
              </div>
            ) : (
              cart.map((item) => (
                <article className="cart-item" key={item.barcode}>
                  <div>
                    <h3>{item.name}</h3>
                    <p>{item.barcode}</p>
                  </div>
                  <strong>{formatMoney(item.price * item.qty)}</strong>
                  <div className="qty-controls">
                    <button aria-label="Decrease" onClick={() => updateQty(item.barcode, -1)}>
                      <Minus size={16} />
                    </button>
                    <span>{item.qty}</span>
                    <button aria-label="Increase" onClick={() => updateQty(item.barcode, 1)}>
                      <Plus size={16} />
                    </button>
                    <button aria-label="Remove" onClick={() => removeFromCart(item.barcode)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>

          <div className="bill-footer">
            <div>
              <span>Total Amount</span>
              <strong>{formatMoney(subtotal)}</strong>
            </div>
            <button className="success-btn" onClick={completeBill}>
              <Check size={19} />
              Complete Bill
            </button>
          </div>
        </div>

        <aside className="inventory-panel">
          <div className="section-title">
            <PackagePlus size={20} />
            <h2>Inventory</h2>
          </div>

          <form className="product-form" onSubmit={saveProduct}>
            <input
              value={newProduct.barcode}
              onChange={(event) =>
                setNewProduct((product) => ({ ...product, barcode: event.target.value }))
              }
              placeholder="Barcode"
            />
            <input
              value={newProduct.name}
              onChange={(event) =>
                setNewProduct((product) => ({ ...product, name: event.target.value }))
              }
              placeholder="Product name"
            />
            <div className="form-grid">
              <input
                value={newProduct.price}
                onChange={(event) =>
                  setNewProduct((product) => ({ ...product, price: event.target.value }))
                }
                inputMode="decimal"
                placeholder="Price"
              />
              <input
                value={newProduct.stock}
                onChange={(event) =>
                  setNewProduct((product) => ({ ...product, stock: event.target.value }))
                }
                inputMode="numeric"
                placeholder="Stock"
              />
            </div>
            <button type="submit">
              <PackagePlus size={18} />
              Save Product
            </button>
          </form>

          <label className="search-box">
            <Search size={18} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search products"
            />
          </label>

          <div className="product-list">
            {visibleProducts.map((product) => (
              <article className="product-card" key={product.barcode}>
                <button onClick={() => addToCart(product.barcode)}>
                  <div>
                    <h3>{product.name}</h3>
                    <p>{product.barcode}</p>
                  </div>
                  <div>
                    <strong>{formatMoney(product.price)}</strong>
                    <span>{product.stock} left</span>
                  </div>
                </button>
              </article>
            ))}
          </div>
        </aside>
      </section>

      {scannerOpen && (
        <Scanner
          onClose={() => setScannerOpen(false)}
          onScan={(barcode) => {
            addToCart(barcode);
            setScannerOpen(false);
          }}
          onToast={show}
        />
      )}

      {toast && <div className="toast">{toast}</div>}
    </main>
  );
}

function Scanner({ onClose, onScan, onToast }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [status, setStatus] = useState("Starting camera...");

  useEffect(() => {
    let cancelled = false;
    let frameId;

    async function start() {
      if (!("BarcodeDetector" in window)) {
        setStatus("Barcode scanning is not supported in this browser. Use manual barcode entry.");
        return;
      }

      try {
        const detector = new window.BarcodeDetector({
          formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39"],
        });
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        streamRef.current = stream;

        if (!videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setStatus("Point camera at the barcode");

        const detect = async () => {
          if (cancelled || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes.length > 0) {
              const value = codes[0].rawValue;
              onToast(`Scanned ${value}`);
              onScan(value);
              return;
            }
          } catch {
            setStatus("Keep the barcode steady inside the frame");
          }
          frameId = window.requestAnimationFrame(detect);
        };

        detect();
      } catch {
        setStatus("Camera permission is needed. Allow camera access and try again.");
      }
    }

    start();

    return () => {
      cancelled = true;
      if (frameId) window.cancelAnimationFrame(frameId);
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [onScan, onToast]);

  return (
    <div className="modal-backdrop">
      <section className="scanner-modal">
        <div className="scanner-head">
          <h2>Scan Barcode</h2>
          <button aria-label="Close scanner" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="camera-frame">
          <video ref={videoRef} playsInline muted />
          <div className="scan-line" />
        </div>
        <p>{status}</p>
      </section>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
