// ============ POS Builder · data ============
// Palettes the customer picks for THEIR pos (separate from builder chrome)
const PALETTES = {
  // Light themes
  coffee:   { name: "Coffee",   dark: false, accent: "#b9743b", bg: "#f4ede2", surface: "#fffaf3", text: "#2a2018", sub: "#8a7a66", line: "#e6dccb" },
  forest:   { name: "Forest",   dark: false, accent: "#3f7155", bg: "#eef2ec", surface: "#ffffff", text: "#1f2a23", sub: "#6f8076", line: "#dbe3d8" },
  navy:     { name: "Navy",     dark: false, accent: "#34507a", bg: "#eceef3", surface: "#ffffff", text: "#1c2430", sub: "#73809a", line: "#d8dde7" },
  wine:     { name: "Wine",     dark: false, accent: "#8a3b4b", bg: "#f4eded", surface: "#fffafa", text: "#2c1c20", sub: "#937076", line: "#e7d6d8" },
  charcoal: { name: "Charcoal", dark: false, accent: "#3a3531", bg: "#eeecea", surface: "#ffffff", text: "#1f1c19", sub: "#807a73", line: "#ded9d4" },
  // Dark themes
  noir:     { name: "Noir",     dark: true,  accent: "#c8a97e", bg: "#141414", surface: "#1f1f1f", text: "#ededed", sub: "#8f8f8f", line: "#2e2e2e" },
  midnight: { name: "Midnight", dark: true,  accent: "#5b8fd6", bg: "#0e1422", surface: "#182030", text: "#e6ecf6", sub: "#8a98b2", line: "#27324a" },
  espresso: { name: "Espresso", dark: true,  accent: "#d08a4f", bg: "#1a1410", surface: "#241c16", text: "#f1e7d9", sub: "#ab9580", line: "#372b21" },
  emerald:  { name: "Emerald",  dark: true,  accent: "#46b083", bg: "#0f1814", surface: "#16221c", text: "#e2efe8", sub: "#80998d", line: "#22322a" },
};

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

const DEVICES = {
  tablet:  { name: "Tablet",  w: 1024, h: 768, glyph: "▭", portrait: false },
  desktop: { name: "Desktop", w: 1280, h: 800, glyph: "⬛", portrait: false },
  phone:   { name: "Phone",   w: 414,  h: 820, glyph: "▯", portrait: true },
};
const DEVICE_ORDER = ["tablet", "desktop", "phone"];

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
  { id: "tabs",   label: "Category tabs", locked: false },
  { id: "menu",   label: "Menu grid",     locked: true },
  { id: "cart",   label: "Order cart",    locked: false },
  { id: "notes",  label: "Customer notes",locked: false },
  { id: "pay",    label: "Quick-pay bar", locked: false },
];

const DEFAULT_CONFIG = {
  preset: "counter",
  device: "tablet",
  palette: "coffee",
  business: "Juan's Café",
  initials: "JC",
  tabs: ["Coffee", "Tea", "Pastries", "Specials"],
  sections: { header: true, tabs: true, menu: true, cart: true, notes: false, pay: true },
  cart: "right",   // overrides preset cart when user repositions
  menuCols: 3,
  menuLayout: "grid", // grid | list | compact
  cartW: 240,      // resizable order-cart width (device px)
  railW: 118,      // resizable category-rail width (device px)
  radiusPanel: 14, // corner radius — cart & rail panels
  radiusCard: 12,  // corner radius — menu item cards
  radiusButton: 11,// corner radius — pay / tab / logo buttons
  selected: "menu",
};

Object.assign(window, { PALETTES, PRESETS, PRESET_ORDER, DEVICES, DEVICE_ORDER, SAMPLE, ALL_TABS, SECTION_DEFS, DEFAULT_CONFIG });
