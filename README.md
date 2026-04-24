# ShopKey Billing

A small provision-store billing app for shopkeepers.

## Features

- Scan product barcode with the phone camera.
- Add scanned products to the bill.
- Calculate total amount automatically.
- Complete the bill and reduce product stock.
- Add or update products in inventory.
- Manual barcode entry when the browser does not support camera barcode scanning.

## Run

```bash
npm install
npm run dev
```

Open the Vite URL in a browser. Camera scanning works best in Chrome/Edge on Android or a secure localhost page.

## GitHub Pages

This repository is configured to deploy from GitHub Actions to:

```text
https://preetham078.github.io/shopkey/
```

In GitHub, open **Settings > Pages** and set **Build and deployment** to **GitHub Actions**. Each push to `main` will build and deploy the app.
