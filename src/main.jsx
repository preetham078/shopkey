import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Barcode,
  Camera,
  Check,
  Download,
  Minus,
  PackagePlus,
  Plus,
  ReceiptText,
  Search,
  Share2,
  ShoppingCart,
  Trash2,
  X,
} from "lucide-react";
import "./styles.css";

const STORAGE_KEY = "shopkey-store-v1";

const starterProducts = [
  { barcode: "100001", name: "Loose Rice 1kg", price: 60, stock: 50, unit: "kg" },
  { barcode: "8901030875623", name: "Aashirvaad Atta 1kg", price: 68, stock: 24, unit: "kg" },
  { barcode: "8901058846810", name: "Parle-G Biscuit", price: 10, stock: 80, unit: "piece" },
  { barcode: "8901764012459", name: "Amul Taaza Milk 500ml", price: 28, stock: 36, unit: "piece" },
  { barcode: "8901491101142", name: "Tata Salt 1kg", price: 25, stock: 42, unit: "kg" },
];

function normalizeProduct(product) {
  const name = product.name?.toLowerCase() ?? "";
  const looksLikeKgProduct =
    product.unit === undefined &&
    /\b(kg|rice|atta|dal|sugar|flour|wheat|salt)\b/.test(name);

  return {
    ...product,
    unit: product.unit === "kg" || looksLikeKgProduct ? "kg" : "piece",
  };
}

function loadProducts() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return starterProducts;

  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed.map(normalizeProduct) : starterProducts;
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

function formatQty(value, unit) {
  if (unit === "kg") {
    if (value < 1) return `${Math.round(value * 1000)} g`;
    return `${Number(value.toFixed(3))} kg`;
  }

  return `${value}`;
}

function getLineTotal(item) {
  return item.price * item.qty;
}

function getQtyStep(unit) {
  return unit === "kg" ? 0.1 : 1;
}

function buildBillText(cart, total) {
  const date = new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date());

  const lines = cart.map((item, index) => {
    const qty = formatQty(item.qty, item.unit);
    const priceUnit = item.unit === "kg" ? "kg" : "item";
    return `${index + 1}. ${item.name}
   ${qty} x ${formatMoney(item.price)} / ${priceUnit} = ${formatMoney(getLineTotal(item))}`;
  });

  return [
    "ShopKey Billing",
    `Bill Date: ${date}`,
    "",
    ...lines,
    "",
    `Total: ${formatMoney(total)}`,
  ].join("\n");
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
    unit: "piece",
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

  const subtotal = cart.reduce((sum, item) => sum + getLineTotal(item), 0);
  const itemCount = cart.length;

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

    const step = getQtyStep(product.unit);
    const currentQty = cart.find((item) => item.barcode === product.barcode)?.qty ?? 0;
    if (currentQty >= product.stock) {
      show("No more stock available for this product.");
      return;
    }

    setCart((items) => {
      const existing = items.find((item) => item.barcode === product.barcode);
      if (existing) {
        return items.map((item) =>
          item.barcode === product.barcode
            ? { ...item, qty: Number(Math.min(item.qty + step, product.stock).toFixed(3)) }
            : item
        );
      }
      return [...items, { ...product, qty: Math.min(step, product.stock) }];
    });
    show(`${product.name} added to bill`);
  }

  function updateQty(barcode, change) {
    const product = productMap.get(barcode);
    setCart((items) =>
      items
        .map((item) => {
          if (item.barcode !== barcode) return item;
          const nextQty = Number((item.qty + change).toFixed(3));
          if (product && nextQty > product.stock) {
            show("Stock limit reached.");
            return item;
          }
          return { ...item, qty: nextQty };
        })
        .filter((item) => item.qty > 0)
    );
  }

  function setCartQty(barcode, value, inputUnit = "item") {
    const product = productMap.get(barcode);
    const numberValue = Number(value);

    if (!Number.isFinite(numberValue) || numberValue <= 0) {
      removeFromCart(barcode);
      return;
    }

    const nextQty =
      product?.unit === "kg" && inputUnit === "gram" ? numberValue / 1000 : numberValue;

    if (product && nextQty > product.stock) {
      show("Stock limit reached.");
    }

    setCart((items) =>
      items.map((item) =>
        item.barcode === barcode
          ? { ...item, qty: Number(Math.min(nextQty, product?.stock ?? nextQty).toFixed(3)) }
          : item
      )
    );
  }

  function removeFromCart(barcode) {
    setCart((items) => items.filter((item) => item.barcode !== barcode));
  }

  function setCartPrice(barcode, value) {
    const price = Number(value);
    if (!Number.isFinite(price) || price <= 0) {
      show("Enter a valid price.");
      return;
    }

    setCart((items) =>
      items.map((item) => (item.barcode === barcode ? { ...item, price } : item))
    );
  }

  function editCartItem(barcode) {
    const item = cart.find((product) => product.barcode === barcode);
    if (!item) return;

    setNewProduct({
      barcode: item.barcode,
      name: item.name,
      price: String(item.price),
      stock: String(productMap.get(item.barcode)?.stock ?? item.qty),
      unit: item.unit,
    });
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
        return { ...product, stock: Number(Math.max(0, product.stock - billed.qty).toFixed(3)) };
      })
    );
    setCart([]);
    show(`Bill completed: ${formatMoney(subtotal)}`);
  }

  function takeBill() {
    if (!cart.length) {
      show("Add items before taking the bill.");
      return;
    }

    const receipt = buildBillText(cart, subtotal);
    const blob = new Blob([receipt], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `shopkey-bill-${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    show("Bill saved.");
  }

  async function shareBill() {
    if (!cart.length) {
      show("Add items before sharing the bill.");
      return;
    }

    const receipt = buildBillText(cart, subtotal);

    if (navigator.share) {
      try {
        await navigator.share({
          title: "ShopKey Bill",
          text: receipt,
        });
        show("Bill shared.");
        return;
      } catch (error) {
        if (error?.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(receipt);
      show("Bill copied. Paste it to share.");
    } catch {
      show("Sharing is not available in this browser.");
    }
  }

  function saveProduct(event) {
    event.preventDefault();
    const barcode = newProduct.barcode.trim();
    const name = newProduct.name.trim();
    const price = Number(newProduct.price);
    const stock = Number(newProduct.stock);
    const unit = newProduct.unit === "kg" ? "kg" : "piece";

    if (
      !barcode ||
      !name ||
      !Number.isFinite(price) ||
      price <= 0 ||
      !Number.isFinite(stock) ||
      stock < 0
    ) {
      show("Enter valid product details.");
      return;
    }

    setProducts((items) => {
      const exists = items.some((item) => item.barcode === barcode);
      if (exists) {
        return items.map((item) =>
          item.barcode === barcode ? { barcode, name, price, stock, unit } : item
        );
      }
      return [{ barcode, name, price, stock, unit }, ...items];
    });
    setCart((items) =>
      items.map((item) =>
        item.barcode === barcode
          ? {
              ...item,
              name,
              price,
              unit,
              qty: Number(Math.min(item.qty, stock).toFixed(3)),
            }
          : item
      )
    );
    setNewProduct({ barcode: "", name: "", price: "", stock: "", unit: "piece" });
    show(products.some((item) => item.barcode === barcode) ? "Product updated." : "Product saved.");
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
          <span>
            {itemCount} {itemCount === 1 ? "item" : "items"}
          </span>
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
                    <p>
                      {item.barcode} · per{" "}
                      {item.unit === "kg" ? "kg" : "item"}
                    </p>
                    <label className="price-input">
                      <span>Price</span>
                      <input
                        aria-label={`${item.name} price`}
                        defaultValue={item.price}
                        inputMode="decimal"
                        min="0.01"
                        step="0.01"
                        type="number"
                        onBlur={(event) => setCartPrice(item.barcode, event.target.value)}
                      />
                    </label>
                  </div>
                  <strong>{formatMoney(getLineTotal(item))}</strong>
                  <div className="qty-controls">
                    <button
                      aria-label="Edit item"
                      className="cart-edit-btn"
                      type="button"
                      onClick={() => editCartItem(item.barcode)}
                    >
                      Edit
                    </button>
                    <button
                      aria-label="Decrease"
                      type="button"
                      onClick={() => updateQty(item.barcode, -getQtyStep(item.unit))}
                    >
                      <Minus size={16} />
                    </button>
                    {item.unit === "kg" ? (
                      <label className="weight-input">
                        <input
                          aria-label={`${item.name} grams`}
                          inputMode="decimal"
                          min="1"
                          step="50"
                          type="number"
                          value={Math.round(item.qty * 1000)}
                          onChange={(event) =>
                            setCartQty(item.barcode, event.target.value, "gram")
                          }
                        />
                        <span>g</span>
                      </label>
                    ) : (
                      <span>{item.qty}</span>
                    )}
                    <button
                      aria-label="Increase"
                      type="button"
                      onClick={() => updateQty(item.barcode, getQtyStep(item.unit))}
                    >
                      <Plus size={16} />
                    </button>
                    <button
                      aria-label="Remove"
                      type="button"
                      onClick={() => removeFromCart(item.barcode)}
                    >
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
            <div className="bill-actions">
              <button className="secondary-btn" onClick={takeBill}>
                <Download size={18} />
                Take Bill
              </button>
              <button className="secondary-btn" onClick={shareBill}>
                <Share2 size={18} />
                Share
              </button>
              <button className="success-btn" onClick={completeBill}>
                <Check size={19} />
                Complete Bill
              </button>
            </div>
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
                placeholder="Price / item or kg"
              />
              <input
                value={newProduct.stock}
                onChange={(event) =>
                  setNewProduct((product) => ({ ...product, stock: event.target.value }))
                }
                inputMode="decimal"
                placeholder="Stock"
              />
            </div>
            <select
              value={newProduct.unit}
              onChange={(event) =>
                setNewProduct((product) => ({ ...product, unit: event.target.value }))
              }
            >
              <option value="piece">Sell by piece</option>
              <option value="kg">Sell by kg / grams</option>
            </select>
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
                <button className="product-card-main" onClick={() => addToCart(product.barcode)}>
                  <div>
                    <h3>{product.name}</h3>
                    <p>{product.barcode}</p>
                  </div>
                  <div>
                    <strong>{formatMoney(product.price)}</strong>
                    <span>
                      {formatQty(product.stock, product.unit)} left · per{" "}
                      {product.unit === "kg" ? "kg" : "item"}
                    </span>
                  </div>
                </button>
                <button
                  className="product-card-edit"
                  type="button"
                  onClick={() => startEditingProduct(product)}
                >
                  Edit
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
