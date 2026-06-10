// ============ POS Builder · data ============
// Palettes the customer picks for THEIR pos (separate from builder chrome)
const PALETTES = {
  // Light themes
  coffee:   { name: "Coffee",   dark: false, accent: "#b9743b", bg: "#f4ede2", surface: "#fffaf3", text: "#2a2018", sub: "#8a7a66", line: "#e6dccb" },
  forest:   { name: "Forest",   dark: false, accent: "#3f7155", bg: "#eef2ec", surface: "#ffffff", text: "#1f2a23", sub: "#6f8076", line: "#dbe3d8" },
  wine:     { name: "Wine",     dark: false, accent: "#8a3b4b", bg: "#f4eded", surface: "#fffafa", text: "#2c1c20", sub: "#937076", line: "#e7d6d8" },
  charcoal: { name: "Charcoal", dark: false, accent: "#3a3531", bg: "#eeecea", surface: "#ffffff", text: "#1f1c19", sub: "#807a73", line: "#ded9d4" },
  olive:    { name: "Olive",    dark: false, accent: "#8b8646", bg: "#ece6d1", surface: "#f6f1e1", text: "#2d2c22", sub: "#8c8768", line: "#ddd6bd" },
  // Gradient themes
  sunset:   { name: "Sunset",   group: "gradient", dark: false, accent: "#f97316", grad: "linear-gradient(135deg,#fb923c,#f43f5e)", bg: "#fdf4ed", surface: "#fffdfb", text: "#1c1410", sub: "#9a7860", line: "#f3e3d4" },
  ocean:    { name: "Ocean",    group: "gradient", dark: false, accent: "#0ea5e9", grad: "linear-gradient(135deg,#22d3ee,#3b82f6)", bg: "#eef6fb", surface: "#fbfdff", text: "#0f1d28", sub: "#6b8597", line: "#d6e6f0" },
  lavender: { name: "Lavender", group: "gradient", dark: false, accent: "#8b5cf6", grad: "linear-gradient(135deg,#a855f7,#6366f1)", bg: "#f3f0fc", surface: "#fdfcff", text: "#1b1530", sub: "#82789e", line: "#e6def4" },
  peach:    { name: "Peach",    group: "gradient", dark: false, accent: "#fb7185", grad: "linear-gradient(135deg,#fda4af,#f97316)", bg: "#fdeff1", surface: "#fffbfc", text: "#2a161b", sub: "#a37782", line: "#f6dde2" },
  mint:     { name: "Mint",     group: "gradient", dark: false, accent: "#10b981", grad: "linear-gradient(135deg,#34d399,#06b6d4)", bg: "#eaf7f1", surface: "#fafdfb", text: "#0d2219", sub: "#6b9488", line: "#d3ece0" },
  // Dark themes
  noir:     { name: "Noir",     dark: true,  accent: "#c8a97e", bg: "#141414", surface: "#1f1f1f", text: "#ededed", sub: "#8f8f8f", line: "#2e2e2e" },
  midnight: { name: "Midnight", dark: true,  accent: "#5b8fd6", bg: "#0e1422", surface: "#182030", text: "#e6ecf6", sub: "#8a98b2", line: "#27324a" },
  espresso: { name: "Espresso", dark: true,  accent: "#d08a4f", bg: "#1a1410", surface: "#241c16", text: "#f1e7d9", sub: "#ab9580", line: "#372b21" },
  emerald:  { name: "Emerald",  dark: true,  accent: "#46b083", bg: "#0f1814", surface: "#16221c", text: "#e2efe8", sub: "#80998d", line: "#22322a" },
  olivedark:{ name: "Olive Dark",dark: true, accent: "#c9c06a", bg: "#16150d", surface: "#201f14", text: "#eee9d4", sub: "#9b9670", line: "#33301f" },
};

// ---- Custom theme support ----
// Users pick 4 colours (accent/bg/surface/text); sub, line and the on-accent
// text colour are derived so every custom theme stays readable.
function _hx(h) { h = (h || "").replace("#", ""); if (h.length === 3) h = h.split("").map((c) => c + c).join(""); const n = parseInt(h || "0", 16) || 0; return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function _toHx(r, g, b) { const c = (x) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, "0"); return "#" + c(r) + c(g) + c(b); }
function _mix(a, b, t) { const A = _hx(a), B = _hx(b); return _toHx(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t); }
function _lum(hex) { const p = _hx(hex).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]; }
function contrastRatio(a, b) { const l1 = _lum(a), l2 = _lum(b), hi = Math.max(l1, l2), lo = Math.min(l1, l2); return (hi + 0.05) / (lo + 0.05); }
function onAccentFor(accent) { return _lum(accent) > 0.5 ? "#171717" : "#ffffff"; }

const DEFAULT_CUSTOM = { accent: "#b9743b", bg: "#f4ede2", surface: "#fffaf3", text: "#2a2018" };

// Expand the 4 user colours into the full palette shape (+ derived fields).
function buildCustom(c) {
  const cp = c || DEFAULT_CUSTOM;
  const dark = _lum(cp.bg) < 0.4;
  return {
    name: "Custom", dark, custom: true,
    accent: cp.accent, bg: cp.bg, surface: cp.surface, text: cp.text,
    sub: _mix(cp.text, cp.bg, 0.42),
    line: _mix(cp.surface, cp.text, dark ? 0.16 : 0.12),
    onAccent: onAccentFor(cp.accent),
  };
}

// Single source of truth for "the active palette" — presets or custom.
function resolvePalette(cfg) {
  if (cfg && cfg.palette === "custom") return buildCustom(cfg.customPalette);
  return PALETTES[(cfg || {}).palette] || PALETTES.coffee;
}

// 5 layout presets. Each defines how the POS panes arrange.
// cart: 'right' | 'left' | 'bottom' | 'none'
// rail: show a category rail (triple layout)
const PRESETS = {
  counter:  { name: "Counter",   tagline: "menu left · cart right", cart: "right",  rail: false, menuCols: 3 },
  cartleft: { name: "Cart-left", tagline: "cart left · menu right",  cart: "left",   rail: false, menuCols: 3 },
  stacked:  { name: "Stacked",   tagline: "menu top · pay bar below",cart: "bottom", rail: false, menuCols: 4 },
  triple:   { name: "Triple",    tagline: "rail · menu · cart",      cart: "right",  rail: true,  menuCols: 2 },
  minimal:  { name: "Minimal",   tagline: "grid + quick pay only",   cart: "none",   rail: false, menuCols: 4 },
};
const PRESET_ORDER = ["counter", "cartleft", "stacked", "triple", "minimal"];

// Ready-made designs — one click applies a full look (layout + theme + font +
// sections + tabs). Separate from layout PRESETS, which only rearrange panes.
const TEMPLATES = {
  boutique: {
    name: "Boutique",
    tagline: "greeting · pill tabs · café vibe",
    cfg: {
      skin: "boutique", // renders the dedicated café design (window.BoutiqueLive)
      preset: "counter", cart: "right", menuCols: 3, menuLayout: "grid",
      palette: "custom",
      customPalette: { accent: "#8b6fc7", bg: "#f5f2fb", surface: "#ffffff", text: "#241f33" },
      font: "poppins",
      radiusPanel: 16, radiusCard: 16, radiusButton: 14,
      tabs: ["Tea", "Pastries", "Coffee"],
      sections: { header: true, search: true, tabs: true, menu: true, cart: true, notes: false, pay: true },
    },
  },
  terminal: {
    name: "Terminal",
    tagline: "product grid · order ticket · mono",
    cfg: {
      skin: "terminal",
      preset: "counter", cart: "right", menuCols: 3, menuLayout: "grid",
      palette: "custom",
      customPalette: { accent: "#6d5efc", bg: "#f5f6fa", surface: "#ffffff", text: "#1b1f2a" },
      font: "grotesk",
      radiusPanel: 10, radiusCard: 10, radiusButton: 8,
      tabs: ["Tea", "Pastries", "Coffee", "Juices", "Snacks"],
      sections: { header: true, search: false, tabs: true, menu: true, cart: true, notes: false, pay: true },
    },
  },
  gallery: {
    name: "Gallery",
    tagline: "photo cards · badges · order notes",
    cfg: {
      skin: "gallery",
      preset: "counter", cart: "right", menuCols: 3, menuLayout: "grid",
      palette: "custom",
      customPalette: { accent: "#9166d6", bg: "#faf8fd", surface: "#ffffff", text: "#2a2333" },
      font: "jakarta",
      radiusPanel: 16, radiusCard: 16, radiusButton: 12,
      tabs: ["Warm Teas", "Iced Lattes", "Signature Boba"],
      sections: { header: true, search: false, tabs: true, menu: true, cart: true, notes: true, pay: true },
    },
  },
  console: {
    name: "Console",
    tagline: "dark · mono · developer console",
    cfg: {
      skin: "console",
      preset: "counter", cart: "right", menuCols: 3, menuLayout: "grid",
      palette: "custom",
      customPalette: { accent: "#7c5cff", bg: "#0c0a14", surface: "#16131f", text: "#e9e7f2" },
      font: "grotesk",
      radiusPanel: 10, radiusCard: 10, radiusButton: 8,
      tabs: ["Hot Brews", "Cold Brew", "Pastries"],
      sections: { header: true, search: false, tabs: true, menu: true, cart: true, notes: false, pay: true },
    },
  },
};
const TEMPLATE_ORDER = ["boutique", "terminal", "gallery", "console"];

const DEVICES = {
  tablet:  { name: "Tablet",  w: 1024, h: 768, glyph: "▭", portrait: false },
  desktop: { name: "Desktop", w: 1280, h: 800, glyph: "⬛", portrait: false },
  phone:   { name: "Phone",   w: 414,  h: 820, glyph: "▯", portrait: true },
};
const DEVICE_ORDER = ["tablet", "desktop", "phone"];

// Typefaces the customer can apply to THEIR pos (loaded via Google Fonts in pos-builder.css).
// `stack` is dropped straight into the --pos-font CSS var; mono labels stay fixed.
const FONTS = {
  inter:    { name: "Inter",          stack: "'Inter', sans-serif",             note: "clean · neutral" },
  poppins:  { name: "Poppins",        stack: "'Poppins', sans-serif",           note: "rounded · friendly" },
  manrope:  { name: "Manrope",        stack: "'Manrope', sans-serif",           note: "modern · soft" },
  jakarta:  { name: "Plus Jakarta",   stack: "'Plus Jakarta Sans', sans-serif", note: "crisp · premium" },
  grotesk:  { name: "Space Grotesk",  stack: "'Space Grotesk', sans-serif",     note: "techy · bold" },
  dmsans:   { name: "DM Sans",        stack: "'DM Sans', sans-serif",           note: "geometric · tidy" },
  fraunces: { name: "Fraunces",       stack: "'Fraunces', serif",               note: "warm serif · artisan" },
  playfair: { name: "Playfair",       stack: "'Playfair Display', serif",       note: "elegant serif · classic" },
};
const FONT_ORDER = ["inter", "poppins", "manrope", "jakarta", "grotesk", "dmsans", "fraunces", "playfair"];

// Printed-receipt designer. Reuses brand (name, initials, accent, font) from the top-level config.
const RECEIPT_PAPERS = {
  "58mm": { name: "58mm", tagline: "compact roll", w: 230 },
  "80mm": { name: "80mm", tagline: "standard roll", w: 300 },
};
const RECEIPT_PAPER_ORDER = ["58mm", "80mm"];

// Toggleable receipt blocks (top→bottom print order). Locked ones always print.
const RECEIPT_DEFS = [
  { id: "logo",    label: "Logo + name",     locked: true  },
  { id: "contact", label: "Address & phone", locked: false },
  { id: "meta",    label: "Order details",   locked: false },
  { id: "items",   label: "Itemized list",   locked: true  },
  { id: "totals",  label: "Totals & tax",    locked: true  },
  { id: "payment", label: "Payment line",    locked: false },
  { id: "footer",  label: "Footer message",  locked: false },
  { id: "qr",      label: "QR code",         locked: false },
];

const RECEIPT_DEFAULTS = {
  paper: "80mm",
  elements: { logo: true, contact: true, meta: true, items: true, totals: true, payment: true, footer: true, qr: false },
  address: "123 Brew St., Quezon City",
  phone: "+63 917 000 0000",
  taxLabel: "VAT (12%)",
  footer: "Thank you! Come back soon ☕",
  social: "@juanscafe",
  accentTotal: true,
};

// Sample cafe content
const SAMPLE = {
  Coffee:   [["Espresso","₱90"],["Cappuccino","₱130"],["Latte","₱140"],["Americano","₱110"],["Mocha","₱150"],["Cold Brew","₱160"]],
  Tea:      [["Hot Green","₱90"],["Milk Tea","₱120"],["Matcha","₱150"],["Chai Latte","₱140"],["Lemon Tea","₱100"],["Oolong","₱110"]],
  Pastries: [["Croissant","₱85"],["Cinnamon Roll","₱95"],["Banana Bread","₱80"],["Muffin","₱75"],["Cookie","₱60"],["Brownie","₱90"]],
  Specials: [["Caramel Macchiato","₱170"],["Spanish Latte","₱160"],["Affogato","₱180"],["Ube Latte","₱165"],["Biscoff Frappe","₱190"],["Combo Set","₱220"]],
};
const ALL_TABS = ["Coffee", "Tea", "Pastries", "Specials", "Drinks", "Sandwiches", "Desserts"];

// Sections that can be shown/hidden (in stacking order, top→bottom in layers list)
const SECTION_DEFS = [
  { id: "header", label: "Header + logo", locked: true },
  { id: "search", label: "Search bar",    locked: false },
  { id: "tabs",   label: "Category tabs", locked: false },
  { id: "menu",   label: "Menu grid",     locked: true },
  { id: "cart",   label: "Order cart",    locked: false },
  { id: "notes",  label: "Customer notes",locked: false },
  { id: "pay",    label: "Quick-pay bar", locked: false },
];

const DEFAULT_CONFIG = {
  skin: "classic", // classic = generic builder preview · "boutique" = café skin
  preset: "counter",
  device: "tablet",
  palette: "coffee",
  customPalette: null, // { accent, bg, surface, text } — seeded when "Custom" is chosen
  font: "inter",
  canvasMode: "screen", // screen | receipt
  receipt: RECEIPT_DEFAULTS,
  business: "Juan's Café",
  initials: "JC",
  logo: null,       // uploaded logo as a downscaled data-URL (overrides initials when set)
  logoSize: 46,     // displayed logo height on the receipt (px); header scales from this
  tabs: ["Coffee", "Tea", "Pastries", "Specials"],
  sections: { header: true, search: false, tabs: true, menu: true, cart: true, notes: false, pay: true },
  cart: "right",   // overrides preset cart when user repositions
  menuCols: 3,
  menuLayout: "grid", // grid | list | compact
  cartW: 240,      // resizable order-cart width (device px)
  cartH: 150,      // resizable bottom-cart height (device px)
  skinCart: "right",  // ready-made skins: order panel dock side (left | right)
  skinCartW: null,    // ready-made skins: order panel width (device px; null = design default)
  railW: 118,      // resizable category-rail width (device px)
  stackOrder: ["header", "search", "tabs", "main", "pay"], // drag-to-reorder rows
  radiusPanel: 14, // corner radius — cart & rail panels
  radiusCard: 12,  // corner radius — menu item cards
  radiusButton: 11,// corner radius — pay / tab / logo buttons
  selected: "menu",
};

Object.assign(window, { PALETTES, PRESETS, PRESET_ORDER, TEMPLATES, TEMPLATE_ORDER, DEVICES, DEVICE_ORDER, FONTS, FONT_ORDER, RECEIPT_PAPERS, RECEIPT_PAPER_ORDER, RECEIPT_DEFS, RECEIPT_DEFAULTS, SAMPLE, ALL_TABS, SECTION_DEFS, DEFAULT_CONFIG, resolvePalette, buildCustom, contrastRatio, onAccentFor, DEFAULT_CUSTOM });
