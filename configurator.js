/**
 * Конструктор «Одна идея — тысячи сочетаний»: кухня, шкаф, гардеробная, спальня, гостиная.
 * Параметры → ориентировочная цена → 3D-модель (Three.js, грузится лениво): двери открываются,
 * видно наполнение, размеры в сантиметрах, подсветка внутри, выбор пола и стен.
 * PRICING — цена считается по площади мебели по фасаду (м²) × ставка за м²; коэффициенты и доплаты задаются
 * в админ-панели (confirmed: false показывает плашку «Демо-цены»).
 * Варианты нарисованы по реальным работам (output/photos/v4_retouch): изголовья-каналы и «подушка»,
 * шкафы с раскладкой и кольцами, витрины, рифлёные фасады, гостиная с латунными вставками.
 */
const PRICING = {
  confirmed: false,
  perSquareMeter: 37000, // ₽ за м² по фасаду (ширина × высота мебели спереди), базовая комплектация
  type: { kitchen: 1, wardrobe: 1, walkin: 1, shelving: 1, chest: 1, hallway: 1, bedroom: 1, living: 1 },
  hardware: { premium: 1, econom: 1 }, // коэффициент вида мебели
  body: { ldsp: 1, mdf: 1 }, // корпус
  material: { enamel: 1, veneer: 1, solid: 1 }, // фасады (ЛДСП для фасадов не предлагаем)
  style: { smooth: 1, fluted: 1, classic: 1, vitrine: 1, glass: 1 },
  handles: { black: 0, brass: 0, ring: 0, hidden: 0 }, // надбавка: 0,04 = +4%
  upper: { standard: 1, ceiling: 1, shelves: 0.5 }, // какая доля площади верхнего ряда кухни идёт в расчёт
  doors: { hinged: 1, sliding: 1 },
  // Доплаты в рублях; 0 — входит в цену за м².
  extras: { top: { ldsp: 0, wood: 0, 'stone-light': 0, 'stone-dark': 0 }, lights: 0, innerLights: 0, mirror: 0, glassDoors: 0, fireplace: 0, ledPerMeter: 0, ledKit: 0, ledDimmer: 0, drawer: 0, trousers: 0, basket: 0 },
};
// Высоты кухни — общие для расчёта площади и 3D-модели.
const KITCHEN_DIMS = { plinth: 0.1, base: 0.72, top: 0.04, depth: 0.56, topDepth: 0.6, upBottom: 1.45, upH: 0.72, ceiling: 2.7, upDepth: 0.33 };

const FINISHES = {
  ldsp: [
    { id: 'white', name: 'Белый', color: '#eeebe5' },
    { id: 'cashmere', name: 'Кашемир', color: '#cfc6b8' },
    { id: 'graphite', name: 'Графит', color: '#3a3e3d' },
    { id: 'oak-light', name: 'Дуб светлый', color: '#caa77b', wood: true },
    { id: 'walnut', name: 'Орех', color: '#7b5838', wood: true },
  ],
  enamel: [
    { id: 'white', name: 'Белый мат', color: '#f2efe9' },
    { id: 'cashmere', name: 'Кашемир', color: '#d9ccb8' },
    { id: 'sage', name: 'Шалфей', color: '#9dac96' },
    { id: 'blue', name: 'Глубокий синий', color: '#2d3d5c' },
    { id: 'graphite', name: 'Графит', color: '#33383a' },
    { id: 'terracotta', name: 'Терракота', color: '#b5725a' },
  ],
  veneer: [
    { id: 'oak', name: 'Дуб', color: '#bb915f', wood: true },
    { id: 'oak-smoked', name: 'Дуб дымчатый', color: '#7e6b58', wood: true },
    { id: 'walnut', name: 'Орех', color: '#6c4b34', wood: true },
  ],
  solid: [
    { id: 'oak', name: 'Дуб натуральный', color: '#c08a4e', wood: true },
    { id: 'oak-honey', name: 'Дуб медовый', color: '#b37a3e', wood: true },
    { id: 'oak-smoked', name: 'Дуб дымчатый', color: '#7e6b58', wood: true },
  ],
};
const FABRICS = [
  { id: 'beige', name: 'Бежевый велюр', color: '#c9b8a2' },
  { id: 'greige', name: 'Грейдж', color: '#a2978b' },
  { id: 'graphite', name: 'Графит', color: '#4b4b4e' },
  { id: 'milk', name: 'Молочный', color: '#e8e1d5' },
  { id: 'olive', name: 'Олива', color: '#7f8462' },
  { id: 'rose', name: 'Пыльная роза', color: '#c39f97' },
];
const FLOORS = [
  { id: 'oak-light', name: 'Светлый дуб', color: '#cdb594', wood: true },
  { id: 'oak', name: 'Натуральный дуб', color: '#a9895f', wood: true },
  { id: 'walnut', name: 'Орех', color: '#6d4f37', wood: true },
  { id: 'dark', name: 'Тёмный', color: '#3d3532', wood: true },
  { id: 'stone', name: 'Керамогранит', color: '#b9b6b0', stone: true },
];
const WALLS = [
  { id: 'white', name: 'Белые', color: '#eeebe5' },
  { id: 'beige', name: 'Тёплый беж', color: '#e1d4c0' },
  { id: 'grey', name: 'Светло-серые', color: '#d2d2ce' },
  { id: 'sage', name: 'Шалфей', color: '#b5bfab' },
  { id: 'graphite', name: 'Графит', color: '#4c504f' },
];
const TOPS = { ldsp: { name: 'ЛДСП', color: '#d8d3ca' }, wood: { name: 'дерево', color: '#a97c50', wood: true }, 'stone-light': { name: 'светлый камень', color: '#eceae5', stone: true }, 'stone-dark': { name: 'тёмный камень', color: '#2d3133', stone: true } };
const TYPE_NAMES = { kitchen: 'Кухня', wardrobe: 'Шкаф', walkin: 'Гардеробная', shelving: 'Стеллаж', chest: 'Комод', hallway: 'Прихожая', bedroom: 'Спальня', living: 'Гостиная' };
const LABELS = {
  layout: { straight: 'прямая', corner: 'угловая', u: 'П-образная', island: 'с островом' },
  upper: { standard: 'стандартные верхние шкафы', ceiling: 'верхние шкафы до потолка', shelves: 'открытые полки' },
  body: { ldsp: 'ЛДСП', mdf: 'МДФ' },
  material: { enamel: 'МДФ эмаль', veneer: 'шпон дуба', solid: 'массив дуба' },
  shBaseNiche: 'ниша под технику',
  style: { smooth: 'гладкие', fluted: 'рифлёные', classic: 'классика', vitrine: 'витрина с раскладкой', glass: 'стекло в профиле' },
  handles: { black: 'чёрные ручки', brass: 'латунные ручки', ring: 'ручки-кольца', hidden: 'без ручек' },
  doors: { hinged: 'распашные двери', sliding: 'двери-купе' },
  walkLayout: { line: 'вдоль стены', l: 'Г-образная', u: 'П-образная', parallel: 'две стены напротив' },
  headboard: { cushion: 'изголовье-подушка', channels: 'изголовье с вертикальными каналами', panels: 'мягкие панели до потолка' },
  bedside: { floating: 'подвесные тумбы', legs: 'тумбы на ножках', none: 'без тумб' },
  living: { low: 'ТВ-тумба', shelves: 'тумба и стеллажи', system: 'стена-система' },
  fill: { hang: 'штанга', shelves: 'полки', drawers: 'ящики и штанга', double: 'две штанги', trousers: 'брючница и штанга', baskets: 'корзины и штанга' },
  hardware: { premium: 'фурнитура премиум (Hettich / Blum, доводчики)', econom: 'фурнитура эконом' },
  chBase: { legs: 'на ножках', plinth: 'на цоколе', floating: 'подвесной' },
  kitchenBase: { mixed: 'ящики и двери', drawers: 'только ящики', doors: 'двери с полками' },
  shBase: { open: 'открытый низ', niche: 'ниша под технику', doors: 'закрытая тумба', drawers: 'ящики внизу' },
};

/* ---------- Данные из админ-панели (#configurator-data): цены, палитры, вкладки. Геометрия остаётся в этом файле. ---------- */
function applyAdminData() {
  let data = null;
  try { data = JSON.parse(document.querySelector('#configurator-data')?.textContent || 'null'); } catch { data = null; }
  if (!data || typeof data !== 'object') return;
  const isObject = value => value && typeof value === 'object' && !Array.isArray(value);
  const mergeNumbers = (target, source) => {
    for (const [key, value] of Object.entries(source || {})) {
      if (isObject(value) && isObject(target[key])) mergeNumbers(target[key], value);
      else if (typeof value === 'number' && Number.isFinite(value) && value >= 0) target[key] = value;
    }
  };
  mergeNumbers(PRICING, data.pricing);
  PRICING.confirmed = data.confirmed === true;
  const palette = list => (Array.isArray(list) ? list : [])
    .filter(item => item && item.id && /^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(String(item.color)))
    .map(item => ({ id: String(item.id), name: String(item.name || item.id), color: String(item.color), wood: item.wood === true || item.kind === 'wood', stone: item.kind === 'stone' }));
  const replace = (target, list) => { if (list.length) target.splice(0, target.length, ...list); };
  for (const material of Object.keys(FINISHES)) {
    const list = palette(data.finishes?.[material]);
    if (list.length) FINISHES[material] = list;
  }
  replace(FABRICS, palette(data.fabrics));
  replace(FLOORS, palette(data.floors));
  replace(WALLS, palette(data.walls));
  for (const type of Array.isArray(data.types) ? data.types : []) if (type && TYPE_NAMES[type.id] && type.label) TYPE_NAMES[type.id] = String(type.label);
}
applyAdminData();

const form = document.querySelector('#config-form');
const stageCanvas = document.querySelector('#config-canvas');
const labelsLayer = document.querySelector('#config-labels');
const placeholder = document.querySelector('#config-placeholder');
const priceOut = document.querySelector('#config-price');
const areaOut = document.querySelector('#config-area');
const specOut = document.querySelector('#config-spec');
const tabs = [...document.querySelectorAll('.config-tabs [role="tab"]')];
const openButton = document.querySelector('#config-open');
const dimsButton = document.querySelector('#config-dims');
const centerButton = document.querySelector('#config-center');
document.querySelector('#config-demo').hidden = PRICING.confirmed;

const initialTab = tabs.find(tab => tab.getAttribute('aria-selected') === 'true') || tabs[0];
const state = { fill: [], shelves: { kitchen: 2, wardrobe: 5, walkin: 5, shelving: 5, living: 5 }, type: initialTab?.dataset.type || 'kitchen', color: 'graphite', fabric: 'beige', floor: 'oak', wall: 'white', open: false, dims: false };
const meters = value => `${Number(value).toLocaleString('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} м`;
const cm = value => `${Math.round(value * 100)} см`;
const rub = value => `${Math.round(value).toLocaleString('ru-RU')} ₽`;
const byId = (list, id) => list.find(item => item.id === id) || list[0];

/* ---------- Наполнение секций: штанга, полки, ящики — по секции на каждый пролёт шкафа ---------- */
const FILL_KINDS = ['hang', 'shelves', 'drawers', 'double', 'trousers', 'baskets'];
const FILL_DEFAULT = ['hang', 'shelves', 'drawers'];
const fillBox = form?.querySelector('[data-fill]');
function wardrobeSections(params) {
  const doorCount = params.doors === 'sliding' ? (params.width > 2.6 ? 3 : 2) : Math.max(2, Math.round(params.width / 0.5));
  return params.doors === 'sliding' ? doorCount : Math.ceil(doorCount / 2);
}
function fillSections(params) {
  if (params.type === 'wardrobe') return wardrobeSections(params);
  if (params.type === 'walkin') return Math.max(1, Math.round((params.walkLayout === 'parallel' ? params.walkB : params.walkA) / 0.8));
  return 0;
}
function renderFill(params) {
  if (!fillBox) return;
  const count = fillSections(params);
  if (Number(fillBox.dataset.count) === count && fillBox.dataset.type === params.type) return;
  fillBox.dataset.count = String(count);
  fillBox.dataset.type = params.type;
  fillBox.replaceChildren(...Array.from({ length: count }, (_, i) => {
    const label = document.createElement('label');
    label.className = 'fill-section';
    const caption = document.createElement('span');
    caption.textContent = `Секция ${i + 1}`;
    const select = document.createElement('select');
    select.name = `fill${i}`;
    FILL_KINDS.forEach(kind => select.add(new Option(LABELS.fill[kind][0].toUpperCase() + LABELS.fill[kind].slice(1), kind)));
    select.value = state.fill[i] || FILL_DEFAULT[i % FILL_DEFAULT.length];
    label.append(caption, select);
    return label;
  }));
}

function readForm() {
  const data = new FormData(form);
  const num = name => Number(data.get(name));
  return {
    type: state.type,
    layout: data.get('layout'), lengthA: num('lengthA'), lengthB: num('lengthB'), upper: data.get('upper'), upperGlass: data.get('upperGlass') === 'on',
    width: num('width'), height: num('height'), depth: num('depth'), doors: data.get('doors'), mirror: data.get('mirror') === 'on',
    walkLayout: data.get('walkLayout'), walkA: num('walkA'), walkB: num('walkB'), walkH: num('walkH'), walkDoors: data.get('walkDoors'), island: data.get('island') === 'on',
    bedWidth: num('bedWidth'), headboard: data.get('headboard'), bedside: data.get('bedside'), fabric: data.get('fabric') || state.fabric,
    living: data.get('living'), livingWidth: num('livingWidth'), fireplace: data.get('fireplace') === 'on',
    style: data.get('style'), material: FINISHES[data.get('material')] && data.get('material') !== 'ldsp' ? data.get('material') : 'enamel', body: data.get('body') === 'mdf' ? 'mdf' : 'ldsp', color: data.get('color') || state.color,
    top: data.get('top'), handles: data.get('handles'), lights: data.get('lights') === 'on', innerLights: data.get('innerLights') === 'on',
    floor: data.get('floor') || state.floor, wall: data.get('wall') || state.wall,
    shWidth: num('shWidth') || 0.9, shHeight: num('shHeight') || 2.4, shDepth: num('shDepth') || 0.4, shBase: data.get('shBase') || 'open',
    shelfCount: Math.max(1, num('shelfCount') || 5), kitchenBase: data.get('kitchenBase') || 'mixed',
    nicheH: num('nicheH') || 0.43, nicheBack: data.get('nicheBack') === 'on', appW: num('appW') / 1000, appD: num('appD') / 1000, appH: num('appH') / 1000,
    ledTemp: data.get('ledTemp') || '2700', ledDimmer: data.get('ledDimmer') === 'on',
    wardShape: data.get('wardShape') || 'straight', wardB: num('wardB') || 1.5, walkD: num('walkD') || 0.55,
    noBacks: data.get('noBacks') === 'on', spacer: data.get('spacer') === 'on', hardware: data.get('hardware') === 'econom' ? 'econom' : 'premium',
    chW: num('chW') || 0.9, chH: num('chH') || 0.85, chD: num('chD') || 0.45, chRows: num('chRows') || 4, chBase: data.get('chBase') || 'legs', chMirror: data.get('chMirror') || 'none', chMirrorH: num('chMirrorH') || 0.8,
    hwW: num('hwW') || 2.2, hwH: num('hwH') || 2.5, hwD: num('hwD') || 0.45,
    hwClosed: data.get('hwClosed') === 'on', hwHooks: data.get('hwHooks') === 'on', hwBench: data.get('hwBench') === 'on', hwKeys: data.get('hwKeys') === 'on', hwMirror: data.get('hwMirror') === 'on', hwMezz: data.get('hwMezz') === 'on',
    fill: [...(fillBox?.querySelectorAll('select') || [])].map(select => select.value),
  };
}

const finishOf = params => byId(FINISHES[params.material], params.color);
const fabricOf = params => byId(FABRICS, params.fabric);

function kitchenRun(params) {
  if (params.layout === 'corner') return params.lengthA + params.lengthB - 0.6;
  if (params.layout === 'u') return params.lengthA + 2 * (params.lengthB - 0.6);
  return params.lengthA;
}
/** Ряды гардеробной (длины в метрах) — как на 3D-модели. */
function walkinRuns(params) {
  const D = params.walkD || 0.55;
  const side = Math.max(0.6, params.walkB - D);
  if (params.walkLayout === 'parallel') return [params.walkB, params.walkB];
  if (params.walkLayout === 'l') return [params.walkA, side];
  if (params.walkLayout === 'u') return [params.walkA, side, side];
  return [params.walkA];
}
function walkinRun(params) { return walkinRuns(params).reduce((sum, len) => sum + len, 0); }
const chestColumns = params => Math.max(1, Math.ceil(params.chW / 0.9));
const chestMirrorW = params => Math.min(params.chW * 0.9, 1.6);
/** Сколько ящиков, брючниц и корзин в проекте — для цены «поштучно» и для заявки. */
function pieceCounts(params) {
  const count = { drawers: 0, trousers: 0, baskets: 0 };
  const add = kind => { if (kind === 'drawers') count.drawers += 3; if (kind === 'trousers') count.trousers += 1; if (kind === 'baskets') count.baskets += 4; };
  const pattern = params.fill.length ? params.fill : FILL_DEFAULT;
  if (params.type === 'wardrobe') {
    for (let s = 0; s < wardrobeSections(params); s += 1) add(pattern[s] || FILL_DEFAULT[s % 3]);
    if (params.wardShape === 'corner') for (let s = 0; s < wardrobeSections({ ...params, width: Math.max(0.4, params.wardB - params.depth) }); s += 1) add(FILL_DEFAULT[s % 3]);
  }
  if (params.type === 'walkin') walkinRuns(params).forEach((len, run) => { for (let s = 0; s < Math.max(1, Math.round(len / 0.8)); s += 1) add(pattern[(s + run) % pattern.length]); });
  if (params.type === 'chest') count.drawers += chestColumns(params) * Math.max(1, Math.min(6, params.chRows));
  if (params.type === 'shelving' && params.shBase === 'drawers') count.drawers += Math.max(1, Math.round(params.shWidth / 0.8)) * 2;
  if (params.type === 'hallway' && params.hwKeys) count.drawers += 1;
  return count;
}
function walkPassage(params) {
  if (params.type !== 'walkin' || params.walkLayout === 'line') return null;
  const D = params.walkD || 0.55;
  return params.walkLayout === 'l' ? params.walkA - D : params.walkA - 2 * D;
}
const hingesPerDoor = h => (h <= 0.9 ? 2 : h <= 1.6 ? 3 : h <= 2 ? 4 : 5);

/** Площадь мебели по фасаду, м² (вид спереди: ширина × высота), — как на 3D-модели. По ней считается цена. */
/** Стеллаж: толщина боковин, секции, чистая ширина, полки, метраж ленты — одни и те же числа для 3D, проверки ниши и цены. */
function shelvingGeometry(params) {
  const t = params.material === 'solid' ? 0.02 : 0.018;
  const columns = Math.max(1, Math.round(params.shWidth / 0.8));
  const inner = (params.shWidth - (columns + 1) * t) / columns;
  const plinth = 0.06;
  const baseH = params.shBase === 'niche' ? params.nicheH + t : params.shBase === 'open' ? 0 : Math.min(0.62, params.shHeight * 0.3);
  const shelves = Math.max(1, Math.min(9, params.shelfCount));
  const ledMeters = params.lights ? columns * (shelves + 1) * Math.max(0, inner - 0.02) : 0;
  return { t, columns, inner, plinth, baseH, shelves, ledMeters };
}
function nicheCheck(params) {
  if (params.type !== 'shelving' || params.shBase !== 'niche') return null;
  const g = shelvingGeometry(params);
  const mm = v => Math.round(v * 1000);
  const notes = [`Чистая ширина ниши ${mm(g.inner)} мм (боковины ${mm(g.t)} мм), высота ${mm(params.nicheH)}, глубина ${mm(params.shDepth)} мм`];
  let fits = true;
  if (params.appW > 0) {
    const gap = (g.inner - params.appW) / 2;
    if (gap < 0.01) { fits = false; notes.push(`прибор ${mm(params.appW)} мм не помещается по ширине — нужна ниша от ${mm(params.appW + 0.02)} мм, то есть стеллаж от ${mm(params.appW + 0.02 + 2 * g.t)} мм`); }
    else notes.push(`прибор ${mm(params.appW)} мм помещается, запас по ${mm(gap)} мм с каждой стороны`);
  }
  if (params.appH > 0 && params.appH + 0.03 > params.nicheH) { fits = false; notes.push(`по высоте нужно от ${mm(params.appH + 0.03)} мм`); }
  if (params.appD > 0 && params.appD > params.shDepth - (params.nicheBack ? 0 : 0.01)) { fits = false; notes.push(`по глубине прибор ${mm(params.appD)} мм больше стеллажа`); }
  return { fits, text: notes.join('; ') };
}

function frontArea(params) {
  const K = KITCHEN_DIMS;
  if (params.type === 'kitchen') {
    const run = kitchenRun(params);
    const upperH = params.upper === 'ceiling' ? K.ceiling - K.upBottom : K.upH;
    let area = run * K.base + run * upperH * (PRICING.upper[params.upper] ?? 1);
    if (params.layout === 'island') area += Math.min(2.6, Math.max(1.2, params.lengthA * 0.6)) * K.base;
    return area;
  }
  if (params.type === 'wardrobe') return (params.width + (params.wardShape === 'corner' ? Math.max(0, params.wardB - params.depth) : 0)) * params.height;
  if (params.type === 'chest') return params.chW * params.chH + (params.chMirror === 'wall' ? chestMirrorW(params) * params.chMirrorH : 0);
  if (params.type === 'hallway') return params.hwW * params.hwH;
  if (params.type === 'shelving') return params.shWidth * params.shHeight;
  if (params.type === 'walkin') {
    let area = walkinRun(params) * params.walkH;
    if (params.island && params.walkLayout === 'u' && params.walkA >= 2 && params.walkB >= 1.6) area += Math.min(1.4, params.walkA - 1.4) * 0.84;
    return area;
  }
  if (params.type === 'bedroom') {
    // Изголовье, кровать и тумбы — по ширине композиции у стены и высоте изголовья.
    const span = params.bedWidth + 0.3 + (params.bedside !== 'none' ? 1.3 : 0.4);
    const height = { cushion: 0.95, channels: 1.47, panels: 2.67 }[params.headboard] || 1;
    return (params.headboard === 'panels' ? span + 0.2 : span) * height;
  }
  const W = params.livingWidth;
  const towers = params.living === 'low' ? 0 : Math.min(0.9, W * 0.22);
  const cabW = params.living === 'low' ? Math.min(W, 2.6) : W - towers * 2;
  let area = cabW * 0.42 + 2 * towers * 2.4;
  if (params.living === 'system') area += Math.min(cabW * 0.7, 2.4) * 2.02;
  return area;
}

function estimate(params) {
  const factor = (PRICING.type[params.type] ?? 1) * (PRICING.hardware[params.hardware] ?? 1) * (PRICING.body[params.body] ?? 1) * (PRICING.material[params.material] ?? 1) * (PRICING.style[params.style] ?? 1) * (1 + (PRICING.handles[params.handles] || 0));
  let total = frontArea(params) * PRICING.perSquareMeter * factor;
  const x = PRICING.extras;
  const pieces = pieceCounts(params);
  total += pieces.drawers * (x.drawer || 0) + pieces.trousers * (x.trousers || 0) + pieces.baskets * (x.basket || 0);
  if (params.type === 'kitchen') {
    total += kitchenRun(params) * (x.top[params.top] || 0);
    if (params.innerLights && params.upperGlass && params.upper !== 'shelves') total += x.innerLights;
  }
  if (params.type === 'wardrobe') {
    total *= PRICING.doors[params.doors] ?? 1;
    if (params.mirror) total += x.mirror;
  }
  if (params.type === 'walkin' && params.walkDoors === 'glass') total += walkinRun(params) * x.glassDoors;
  if (params.type === 'living' && params.living === 'system' && params.fireplace) total += x.fireplace;
  if (params.type === 'shelving' && params.lights) {
    total += shelvingGeometry(params).ledMeters * (x.ledPerMeter || 0) + (x.ledKit || 0) + (params.ledDimmer ? x.ledDimmer || 0 : 0);
  } else if (params.lights) total += x.lights;
  if (params.innerLights && ['wardrobe', 'walkin'].includes(params.type)) total += x.innerLights;
  if (params.innerLights && params.type === 'living' && params.living !== 'low') total += x.innerLights;
  return total;
}

function specText(params) {
  const finish = `корпус: ${LABELS.body[params.body]} · фасады: ${LABELS.style[params.style]}, ${LABELS.material[params.material]}, ${finishOf(params).name.toLowerCase()}`;
  const innerShown = params.type === 'wardrobe' || params.type === 'walkin' || (params.type === 'kitchen' && params.upperGlass && params.upper !== 'shelves') || (params.type === 'living' && params.living !== 'low');
  const light = [params.lights ? 'подсветка' : '', params.innerLights && innerShown ? 'подсветка внутри' : ''].filter(Boolean).join(', ') || 'без подсветки';
  if (params.type === 'kitchen') {
    const size = ['corner', 'u'].includes(params.layout) ? `${meters(params.lengthA)} + ${meters(params.lengthB)}` : meters(params.lengthA);
    return [`Кухня ${LABELS.layout[params.layout]}, ${size}`, LABELS.upper[params.upper] + (params.upperGlass && params.upper !== 'shelves' ? ' со стеклом' : ''), `низ: ${LABELS.kitchenBase[params.kitchenBase]}` + (params.upper !== 'shelves' ? `, полок в верхних шкафах: ${Math.min(params.shelfCount, 3)}` : ''), finish, `столешница: ${TOPS[params.top].name}`, LABELS.handles[params.handles], light].join(' · ');
  }
  const fillText = () => {
    const kinds = params.fill.length ? params.fill : FILL_DEFAULT;
    const shelves = kinds.includes('shelves') ? `, полок в секции: ${params.shelfCount}` : '';
    return `наполнение: ${kinds.map((kind, i) => `${i + 1} — ${LABELS.fill[kind]}`).join(', ')}${shelves}`;
  };
  const pieces = pieceCounts(params);
  const piecesText = [pieces.drawers ? `ящиков: ${pieces.drawers}` : '', pieces.trousers ? `брючниц: ${pieces.trousers}` : '', pieces.baskets ? `корзин: ${pieces.baskets}` : ''].filter(Boolean).join(', ');
  const mount = [params.noBacks ? 'без задних стенок' : '', params.spacer ? 'в распор, без сверления стен' : ''].filter(Boolean).join(', ');
  const extra = [piecesText, mount, LABELS.hardware[params.hardware]].filter(Boolean);
  if (params.type === 'wardrobe') {
    const corner = params.wardShape === 'corner';
    const size = corner ? `угловой: ${cm(params.width)} + ${cm(params.wardB)} от угла × ${cm(params.height)} × ${cm(params.depth)}` : `${cm(params.width)} × ${cm(params.height)} × ${cm(params.depth)}`;
    const doorH = params.doors === 'hinged' ? (params.height > 2.4 ? 2.2 : params.height - 0.1) : params.height - 0.1;
    const doors = params.doors === 'hinged' ? `${LABELS.doors.hinged}${params.height > 2.4 ? ' + антресоль' : ''}, петель на дверь: ${hingesPerDoor(doorH)}` : LABELS.doors.sliding + (params.height - 0.1 > 2.4 ? ' (выше 2,4 м — усиленный профиль)' : '');
    return [`Шкаф ${size}`, doors + (params.mirror ? ', с зеркалом' : ''), fillText(), finish, LABELS.handles[params.handles], light, ...extra].join(' · ');
  }
  if (params.type === 'chest') {
    const mirror = params.chMirror === 'wall' ? `зеркало над комодом ${cm(chestMirrorW(params))} × ${cm(params.chMirrorH)}` : 'без зеркала';
    return [`Комод ${Math.round(params.chW * 1000)} × ${Math.round(params.chH * 1000)} × ${Math.round(params.chD * 1000)} мм`, `${chestColumns(params)} × ${params.chRows} ящиков, ${LABELS.chBase[params.chBase]}`, mirror, finish, LABELS.handles[params.handles], params.lights && params.chBase === 'floating' ? 'подсветка снизу' : '', ...extra].filter(Boolean).join(' · ');
  }
  if (params.type === 'hallway') {
    const parts = [params.hwClosed ? 'закрытый шкаф для одежды' : '', params.hwHooks ? 'вешалка с крючками и полкой для шапок' : '', params.hwBench ? 'банкетка с обувницей' : '', params.hwKeys ? 'полка с ящиком для ключей' : '', params.hwMirror ? 'зеркало' : '', params.hwMezz ? 'антресоль' : ''].filter(Boolean).join(', ');
    return [`Прихожая ${Math.round(params.hwW * 1000)} × ${Math.round(params.hwH * 1000)} × ${Math.round(params.hwD * 1000)} мм`, parts || 'только корпус', finish, LABELS.handles[params.handles], params.lights ? 'подсветка вешалки' : '', ...extra].filter(Boolean).join(' · ');
  }
  if (params.type === 'shelving') {
    const columns = Math.max(1, Math.round(params.shWidth / 0.8));
    const g = shelvingGeometry(params);
    const niche = nicheCheck(params);
    const mmSize = v => `${Math.round(v * 1000)}`;
    return [`Стеллаж ${mmSize(params.shWidth)} × ${mmSize(params.shHeight)} × ${mmSize(params.shDepth)} мм`, niche ? `ниша под технику${params.nicheBack ? ' без задней стенки' : ''}: ${niche.text.charAt(0).toLowerCase()}${niche.text.slice(1)}` : '',
      params.lights ? `подсветка полок ${params.ledTemp} К${params.ledDimmer ? ', диммер' : ''}, ≈ ${g.ledMeters.toLocaleString('ru-RU', { maximumFractionDigits: 1 })} м ленты 24 В CRI 90+ в профиле` : '', `${columns} ${columns === 1 ? 'секция' : columns < 5 ? 'секции' : 'секций'}, полок в секции: ${params.shelfCount}`, params.shBase === 'niche' ? '' : LABELS.shBase[params.shBase], `корпус: ${LABELS.body[params.body]}, ${LABELS.material[params.material]}, ${finishOf(params).name.toLowerCase()}`, ['doors', 'drawers'].includes(params.shBase) ? LABELS.handles[params.handles] : '', params.lights ? '' : 'без подсветки'].filter(Boolean).join(' · ');
  }
  if (params.type === 'walkin') {
    const size = params.walkLayout === 'line' ? meters(params.walkA) : params.walkLayout === 'parallel' ? `две стены по ${meters(params.walkB)}, между стенами ${meters(params.walkA)}` : `${meters(params.walkA)} + ${meters(params.walkB)}`;
    const passage = walkPassage(params);
    return [`Гардеробная ${LABELS.walkLayout[params.walkLayout]}, ${size}, высота ${cm(params.walkH)}, глубина модулей ${cm(params.walkD)}`, passage !== null ? `проход ${cm(passage)}${passage < 0.6 ? ' — тесно' : ''}` : '', params.walkDoors === 'glass' ? 'стеклянные двери' : 'открытые секции', fillText(), ...extra, params.island && params.walkLayout === 'u' ? 'остров с ящиками' : '', `корпус: ${LABELS.body[params.body]}, ${finishOf(params).name.toLowerCase()}`, light].filter(Boolean).join(' · ');
  }
  if (params.type === 'bedroom') {
    return [`Кровать ${cm(params.bedWidth)} × 200 см`, LABELS.headboard[params.headboard], `обивка: ${fabricOf(params).name.toLowerCase()}`, LABELS.bedside[params.bedside], params.bedside !== 'none' ? finish : '', params.lights ? 'подсветка изголовья' : ''].filter(Boolean).join(' · ');
  }
  return [`Гостиная: ${LABELS.living[params.living]}, ${meters(params.livingWidth)}`, params.living !== 'low' ? `полок в стеллажах: ${params.shelfCount}` : '', params.living === 'system' && params.fireplace ? 'биокамин' : '', finish, LABELS.handles[params.handles], light].filter(Boolean).join(' · ');
}

/* ---------- Controls ---------- */
function renderSwatches(box, name, list, selected, title) {
  box.replaceChildren(...list.map(item => {
    const label = document.createElement('label');
    label.className = 'swatch';
    const input = document.createElement('input');
    Object.assign(input, { type: 'radio', name, value: item.id, checked: item.id === selected });
    input.setAttribute('aria-label', `${title}: ${item.name}`);
    const chip = document.createElement('i');
    chip.style.setProperty('--swatch', item.wood ? `repeating-linear-gradient(100deg, ${item.color} 0 5px, color-mix(in srgb, ${item.color} 82%, #000) 5px 7px)` : item.stone ? `radial-gradient(circle at 30% 30%, color-mix(in srgb, ${item.color} 80%, #fff), ${item.color})` : item.color);
    label.append(input, chip, document.createTextNode(item.name));
    return label;
  }));
}
function renderFinishSwatches() {
  const material = new FormData(form).get('material');
  if (!FINISHES[material].some(item => item.id === state.color)) state.color = FINISHES[material][0].id;
  renderSwatches(form.querySelector('[data-swatches]'), 'color', FINISHES[material], state.color, 'Цвет фасадов');
}
renderSwatches(form.querySelector('[data-fabrics]'), 'fabric', FABRICS, state.fabric, 'Обивка');
renderSwatches(form.querySelector('[data-floors]'), 'floor', FLOORS, state.floor, 'Пол');
renderSwatches(form.querySelector('[data-walls]'), 'wall', WALLS, state.wall, 'Стены');
renderFinishSwatches();

function syncControls(params) {
  const type = params.type;
  form.querySelectorAll('fieldset[data-for]').forEach(fieldset => { fieldset.hidden = !fieldset.dataset.for.split(' ').includes(type); });
  form.querySelectorAll('[data-show]').forEach(element => { element.hidden = !element.dataset.show.split(' ').includes(params.layout); });
  form.querySelectorAll('[data-show-walk]').forEach(element => { element.hidden = !element.dataset.showWalk.split(' ').includes(params.walkLayout); });
  form.querySelectorAll('[data-show-living]').forEach(element => { element.hidden = !element.dataset.showLiving.split(' ').includes(params.living); });
  form.querySelectorAll('[data-hide-upper]').forEach(element => { element.hidden = params.upper === element.dataset.hideUpper; });
  for (const group of ['[data-styles]', '[data-handles]']) {
    const labels = [...form.querySelectorAll(`${group} [data-types]`)];
    labels.forEach(label => { label.hidden = !label.dataset.types.split(' ').includes(type); });
    const checked = labels.find(label => label.querySelector('input').checked);
    if (!checked || checked.hidden) labels.find(label => !label.hidden).querySelector('input').checked = true;
  }
  renderFill(params);
  if (fillBox) fillBox.hidden = !['wardrobe', 'walkin'].includes(type);
  form.querySelectorAll('[data-fill-kitchen]').forEach(element => { element.hidden = type !== 'kitchen'; });
  const shelvesRange = form.querySelector('[data-fill-shelves]');
  if (shelvesRange) {
    const input = shelvesRange.querySelector('input');
    input.max = type === 'kitchen' ? '3' : '9';
    if (Number(input.value) > Number(input.max)) input.value = input.max;
    shelvesRange.hidden = (type === 'living' && params.living === 'low') || (type === 'kitchen' && params.upper === 'shelves');
    form.querySelector('[data-shelves-label]').firstChild.textContent = { kitchen: 'Полок в верхних шкафах ', living: 'Полок в стеллажах ' }[type] || 'Полок в секции ';
  }
  form.querySelector('[data-ward-corner]').hidden = params.wardShape !== 'corner';
  form.querySelector('[data-ward-a]').textContent = params.wardShape === 'corner' ? 'Первая стена (от угла)' : 'Ширина';
  form.querySelector('[data-walk-a]').textContent = params.walkLayout === 'parallel' ? 'Между стенами' : 'Длина стены';
  form.querySelector('[data-walk-b]').textContent = params.walkLayout === 'parallel' ? 'Длина рядов' : 'Боковые стены';
  form.querySelector('[data-mount-spacer]').hidden = type === 'hallway';
  form.querySelector('[data-ch-mirror]').hidden = params.chMirror !== 'wall';
  const passage = walkPassage(params);
  const walkCheck = form.querySelector('[data-walk-check]');
  if (walkCheck) {
    walkCheck.textContent = passage === null ? '' : passage < 0.5 ? `Проход ${Math.round(passage * 100)} см — меньше 50 см: уменьшите глубину модулей или уберите один ряд.` : `Проход между рядами ${Math.round(passage * 100)} см${passage < 0.6 ? ' — можно, но тесновато (удобно от 60 см)' : ' — удобно'}.`;
    walkCheck.classList.toggle('is-bad', passage !== null && passage < 0.5);
  }
  const nicheBox = form.querySelector('[data-niche]');
  if (nicheBox) nicheBox.hidden = !(type === 'shelving' && params.shBase === 'niche');
  const check = nicheCheck(params);
  const checkOut = form.querySelector('[data-niche-check]');
  if (checkOut) { checkOut.textContent = check ? check.text : ''; checkOut.classList.toggle('is-bad', Boolean(check && !check.fits)); }
  const led = form.querySelector('[data-led]');
  if (led) led.hidden = !(type === 'shelving' && params.lights);
  form.querySelectorAll('[data-mm]').forEach(input => {
    if (document.activeElement !== input) input.value = String(Math.round(Number(form.elements[input.dataset.mm].value) * 1000));
  });
  form.querySelector('[data-fill-note]').hidden = type === 'shelving' || (type === 'walkin' && params.walkDoors === 'open');
  form.querySelector('[data-finish-legend]').textContent = type === 'shelving' ? 'Отделка' : 'Фасады';
  form.querySelector('[data-for-inner]').hidden = ['shelving', 'chest', 'hallway', 'bedroom'].includes(type) || (type === 'kitchen' && !(params.upperGlass && params.upper !== 'shelves')) || (type === 'living' && params.living === 'low');
  form.querySelector('[data-light-label]').textContent = { kitchen: 'Подсветка столешницы', wardrobe: 'Подсветка над шкафом', walkin: 'Подсветка секций', shelving: 'Подсветка полок', chest: 'Подсветка снизу (для подвесного)', hallway: 'Подсветка вешалки', bedroom: 'Подсветка изголовья', living: 'Подсветка тумбы' }[type];
  form.querySelectorAll('input[type="range"]').forEach(input => {
    input.style.setProperty('--fill', `${((input.value - input.min) / (input.max - input.min)) * 100}%`);
    const output = form.querySelector(`[data-out="${input.name}"]`);
    if (output) output.textContent = output.dataset.unit === 'count' ? input.value : meters(input.value);
  });
  const canOpen = !(type === 'walkin' && params.walkDoors === 'open') && !(type === 'bedroom' && params.bedside === 'none') && !(type === 'shelving' && ['open', 'niche'].includes(params.shBase));
  if (!canOpen) state.open = false;
  openButton.hidden = !canOpen;
  const drawers = type === 'bedroom' || type === 'chest';
  openButton.textContent = state.open ? (drawers ? 'Закрыть ящики' : 'Закрыть двери') : (drawers ? 'Открыть ящики' : 'Открыть двери');
  openButton.setAttribute('aria-pressed', String(state.open));
  dimsButton.setAttribute('aria-pressed', String(state.dims));
}

let scene3d = null;
let lastParams = null;
let rebuildQueued = false;
let pendingReset = false;
function update({ resetView = false } = {}) {
  let params = readForm();
  syncControls(params);
  params = readForm();
  Object.assign(state, { color: params.color, fabric: params.fabric, floor: params.floor, wall: params.wall });
  priceOut.textContent = `от ${rub(Math.floor(estimate(params) / 1000) * 1000)}`;
  if (areaOut) areaOut.textContent = `≈ ${frontArea(params).toLocaleString('ru-RU', { maximumFractionDigits: 1 })} м² по фасаду × ${rub(PRICING.perSquareMeter)}`;
  const spec = specText(params);
  specOut.textContent = spec;
  stageCanvas.setAttribute('aria-label', `3D-модель: ${spec}`);
  lastParams = params;
  pendingReset = pendingReset || resetView;
  if (!scene3d || rebuildQueued) return;
  rebuildQueued = true;
  requestAnimationFrame(() => {
    rebuildQueued = false;
    scene3d.update(lastParams, { resetView: pendingReset });
    pendingReset = false;
  });
}

form.addEventListener('input', event => {
  // Sizes typed in millimetres move the sliders (and the model) at once.
  if (event.target.dataset.mm) {
    const range = form.elements[event.target.dataset.mm];
    const value = Number(event.target.value) / 1000;
    if (range && value >= Number(range.min) && value <= Number(range.max)) range.value = String(value);
  }
  if (event.target.name === 'material') renderFinishSwatches();
  if (/^fill\d+$/.test(event.target.name)) state.fill[Number(event.target.name.slice(4))] = event.target.value;
  if (event.target.name === 'shelfCount') state.shelves[state.type] = Number(event.target.value);
  update();
});
tabs.forEach(tab => tab.addEventListener('click', () => {
  state.type = tab.dataset.type;
  state.open = false;
  // Each kind of furniture keeps its own shelf count (kitchen upper cabinets hold up to 3).
  const shelfInput = form.querySelector('input[name="shelfCount"]');
  if (shelfInput && state.shelves[state.type]) { shelfInput.max = state.type === 'kitchen' ? '3' : '9'; shelfInput.value = String(state.shelves[state.type]); }
  // The first time «Стеллаж» is opened it starts in light oak veneer, like a typical interior bookcase.
  if (state.type === 'shelving' && !state.shelvingSeen) {
    state.shelvingSeen = true;
    const veneer = form.querySelector('input[name="material"][value="veneer"]');
    if (veneer && FINISHES.veneer?.length) { veneer.checked = true; state.color = FINISHES.veneer[0].id; renderFinishSwatches(); }
  }
  tabs.forEach(other => other.setAttribute('aria-selected', String(other === tab)));
  tab.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  update({ resetView: true });
}));
openButton.addEventListener('click', () => { state.open = !state.open; syncControls(readForm()); scene3d?.refresh(); });
dimsButton.addEventListener('click', () => { state.dims = !state.dims; syncControls(readForm()); scene3d?.refresh(); });
centerButton.addEventListener('click', () => scene3d?.recenter());
update();

/* ---------- Отправка проекта менеджеру ---------- */
const sendButton = document.querySelector('#config-send');
const dialog = document.querySelector('#config-dialog');
const leadForm = document.querySelector('#config-lead');
const leadMessage = document.querySelector('#config-message');
let projectImage = '';
let reference = null; // set while the dialog sends a photo reference instead of a 3D project
function projectSummary() {
  return `${specText(lastParams)}\nОриентировочно: ${priceOut.textContent}${PRICING.confirmed ? '' : ' (демо-расчёт)'}`;
}
sendButton.addEventListener('click', () => {
  const tools = window.ariella;
  if (tools?.telegramMode) {
    const text = `Здравствуйте! Собрал(а) проект в конструкторе на сайте ${tools.site?.brand || ''}:\n${projectSummary()}\nПодскажите точную стоимость.`;
    const url = tools.telegramUrl(text);
    if (url.startsWith('#')) return document.querySelector(url).scrollIntoView({ behavior: 'smooth' });
    tools.goal?.('lead_telegram');
    window.open(url, '_blank', 'noopener');
    return;
  }
  reference = null;
  document.querySelector('#config-dialog-spec').textContent = projectSummary();
  tools?.setMessage(leadMessage, '');
  projectImage = scene3d?.snapshot?.() || '';
  const preview = document.querySelector('#config-dialog-image');
  if (preview) {
    preview.hidden = !projectImage;
    if (projectImage) preview.src = projectImage;
  }
  tools?.goal?.('configurator_send');
  dialog.showModal();
  document.body.classList.add('modal-open');
});
leadForm.addEventListener('submit', async event => {
  event.preventDefault();
  const tools = window.ariella;
  const data = new FormData(leadForm);
  const phone = String(data.get('phone') || '').trim();
  if (!tools.phoneLooksValid(phone)) return tools.setMessage(leadMessage, 'Укажите телефон, по которому можно с вами связаться.');
  if (!data.get('consent')) return tools.setMessage(leadMessage, 'Подтвердите согласие на связь по заявке.');
  const button = leadForm.querySelector('button[type="submit"]');
  button.disabled = true;
  try {
    await tools.sendLead({
      source: 'configurator',
      furniture: reference ? reference.label : TYPE_NAMES[lastParams.type],
      stage: reference ? 'Фото-референс' : 'Конструктор',
      details: reference ? reference.text : projectSummary(),
      name: String(data.get('name') || '').trim(),
      phone,
      telegram: String(data.get('telegram') || '').trim(),
      consent: true,
      website: String(data.get('website') || ''),
      image: projectImage,
    });
    tools.goal?.('lead');
    tools.goal?.('lead_configurator');
    leadForm.reset();
    tools.setMessage(leadMessage, 'Проект отправлен. Менеджер свяжется с вами и уточнит детали.', true);
  } catch (error) {
    tools.setMessage(leadMessage, error.message);
  } finally {
    button.disabled = false;
  }
});

/* ---------- Своя идея по фото: расчёт по площади и фото менеджеру ---------- */
const refForm = document.querySelector('#reference-form');
if (refForm) {
  const REF_HEIGHT = { kitchen: 1.45, wardrobe: 2.6, walkin: 2.6, shelving: 2.4, chest: 0.85, hallway: 2.5, living: 2.4, bedroom: 1.2, other: 2.4 };
  const REF_DEPTH = { kitchen: 0.6, wardrobe: 0.6, walkin: 0.55, shelving: 0.4, chest: 0.45, hallway: 0.45, living: 0.45, bedroom: 2.1, other: 0.5 };
  const refPrice = document.querySelector('#reference-price');
  const refArea = document.querySelector('#reference-area');
  const refNote = document.querySelector('#reference-note');
  const refPreview = document.querySelector('#reference-preview');
  let refImage = '';
  const value = name => Number(String(new FormData(refForm).get(name) || '').replace(',', '.')) || 0;
  const estimateReference = () => {
    const kind = String(new FormData(refForm).get('kind') || 'other');
    const w = Math.min(12, Math.max(0.3, value('w')));
    const h = Math.min(3.5, Math.max(0.3, value('h')));
    const area = w * h;
    const price = area * PRICING.perSquareMeter * (PRICING.type[kind] ?? 1) * (PRICING.body.ldsp ?? 1);
    return { kind, label: TYPE_NAMES[kind] || 'Другое', w, h, area, price };
  };
  const showReference = () => {
    const r = estimateReference();
    refPrice.textContent = `от ${rub(Math.floor(r.price / 1000) * 1000)}`;
    refArea.textContent = `≈ ${r.area.toLocaleString('ru-RU', { maximumFractionDigits: 1 })} м² × ${rub(PRICING.perSquareMeter)}`;
    document.querySelector('#reference-h-label').textContent = r.kind === 'kitchen' ? 'Высота фасадов (низ + верх), м' : 'Высота, м';
  };
  refForm.kind.value = 'shelving' in TYPE_NAMES && [...refForm.kind.options].some(o => o.value === state.type) ? state.type : refForm.kind.value;
  refForm.h.value = String(REF_HEIGHT[refForm.kind.value] || 2.4);
  refForm.d.value = String(REF_DEPTH[refForm.kind.value] || 0.5);
  refForm.kind.addEventListener('change', () => { refForm.h.value = String(REF_HEIGHT[refForm.kind.value] || 2.4); refForm.d.value = String(REF_DEPTH[refForm.kind.value] || 0.5); showReference(); });
  refForm.addEventListener('input', showReference);
  // The photo is shrunk in the browser (≤ 1280 px JPEG), so it goes with the request even on a slow connection.
  refForm.photo.addEventListener('change', () => {
    const file = refForm.photo.files[0];
    refNote.textContent = '';
    if (!file) return;
    if (!/^image\//.test(file.type)) { refNote.textContent = 'Нужна картинка: JPG, PNG или HEIC.'; return; }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, 1280 / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        refImage = canvas.toDataURL('image/jpeg', 0.85);
        refPreview.src = refImage;
        refPreview.hidden = false;
        document.querySelector('#reference-file-label').textContent = 'Заменить фото';
      };
      img.onerror = () => { refNote.textContent = 'Не удалось открыть фото. Попробуйте другой файл (JPG или PNG).'; };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
  refForm.addEventListener('submit', event => {
    event.preventDefault();
    const r = estimateReference();
    const d = Math.min(3, Math.max(0.1, value('d')));
    const drawers = Math.max(0, Math.round(value('drawers')));
    const details = [`глубина ${meters(d)}`, drawers ? `ящиков: ${drawers}` : '', refForm.mirror.checked ? 'с зеркалом' : '', refForm.doors.value ? `дверей: ${refForm.doors.value}` : ''].filter(Boolean).join(', ');
    const text = `Своя идея по фото: ${r.label.toLowerCase()}, примерно ${meters(r.w)} × ${meters(r.h)}, ${details} (≈ ${r.area.toLocaleString('ru-RU', { maximumFractionDigits: 1 })} м²)\nОриентировочно: ${refPrice.textContent} — по площади, без учёта материалов и наполнения; точную цену менеджер назовёт по фото.`;
    const tools = window.ariella;
    if (tools?.telegramMode) {
      const url = tools.telegramUrl(`Здравствуйте! Хочу мебель по фото (пришлю его в чат).\n${text}`);
      if (!url.startsWith('#')) { tools.goal?.('lead_telegram'); window.open(url, '_blank', 'noopener'); }
      return;
    }
    if (!refImage) { refNote.textContent = 'Добавьте фото — без него менеджер не сможет оценить проект.'; return; }
    reference = { label: r.label, text };
    projectImage = refImage;
    document.querySelector('#config-dialog-spec').textContent = text;
    const preview = document.querySelector('#config-dialog-image');
    if (preview) { preview.hidden = false; preview.src = refImage; }
    tools?.setMessage(leadMessage, '');
    tools?.goal?.('reference_send');
    dialog.showModal();
    document.body.classList.add('modal-open');
  });
  showReference();
}

/* ---------- 3D (Three.js грузится, только когда конструктор рядом с экраном) ---------- */
function webglAvailable() {
  try { const canvas = document.createElement('canvas'); return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl')); }
  catch { return false; }
}

async function start3d() {
  if (!webglAvailable()) { placeholder.textContent = '3D-просмотр недоступен в этом браузере — расчёт стоимости работает.'; return; }
  try {
    const [THREE, { OrbitControls }, { RoundedBoxGeometry }, { RoomEnvironment }] = await Promise.all([
      import('/ariella-mebel/vendor/three/three.module.min.js'),
      import('/ariella-mebel/vendor/three/OrbitControls.js'),
      import('/ariella-mebel/vendor/three/RoundedBoxGeometry.js'),
      import('/ariella-mebel/vendor/three/RoomEnvironment.js'),
    ]);
    scene3d = createScene(THREE, OrbitControls, RoundedBoxGeometry, RoomEnvironment);
    placeholder.remove();
    scene3d.update(lastParams, { resetView: true, instant: true });
  } catch (error) {
    console.error(error);
    placeholder.textContent = 'Не удалось загрузить 3D-модель — расчёт стоимости работает.';
  }
}

if ('IntersectionObserver' in window) {
  const loader = new IntersectionObserver(entries => {
    if (!entries.some(entry => entry.isIntersecting)) return;
    loader.disconnect();
    start3d();
  }, { rootMargin: '500px 0px' });
  loader.observe(document.querySelector('#configurator'));
} else start3d();

function createScene(THREE, OrbitControls, RoundedBoxGeometry, RoomEnvironment) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  stageCanvas.append(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.38;
  scene.fog = new THREE.Fog(0xddd7cb, 8, 20);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xd9d0c0, 0.35));
  const sun = new THREE.DirectionalLight(0xfff1da, 3.2);
  sun.position.set(-3.2, 6, 5.5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 0.5, far: 20 });
  sun.shadow.bias = -0.0004;
  scene.add(sun);

  const camera = new THREE.PerspectiveCamera(34, 1, 0.05, 80);
  const controls = new OrbitControls(camera, renderer.domElement);
  Object.assign(controls, { enableDamping: true, dampingFactor: 0.08, enablePan: false, minPolarAngle: 0.45, maxPolarAngle: 1.5, minAzimuthAngle: -1.15, maxAzimuthAngle: 1.15, rotateSpeed: 0.7 });

  /* ----- textures and materials ----- */
  const textures = new Map();
  function canvasTexture(key, size, draw, { srgb = true } = {}) {
    if (textures.has(key)) return textures.get(key);
    const canvas = document.createElement('canvas');
    canvas.width = size[0]; canvas.height = size[1];
    draw(canvas.getContext('2d'), canvas.width, canvas.height);
    const texture = new THREE.CanvasTexture(canvas);
    if (srgb) texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = 4;
    textures.set(key, texture);
    return texture;
  }
  const seeded = seed => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  function grain(ctx, w, h, hex, random) {
    ctx.fillStyle = hex; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < w / 3.6; i += 1) {
      const x = random() * w;
      ctx.strokeStyle = random() > 0.5 ? `rgba(0,0,0,${0.03 + random() * 0.08})` : `rgba(255,255,255,${0.02 + random() * 0.06})`;
      ctx.lineWidth = 0.6 + random() * 2.4;
      ctx.beginPath(); ctx.moveTo(x, 0);
      for (let y = 0; y <= h; y += 32) ctx.lineTo(x + Math.sin(y / 70 + i) * 5 * random(), y);
      ctx.stroke();
    }
  }
  const woodTexture = hex => canvasTexture(`wood${hex}`, [512, 512], (ctx, w, h) => grain(ctx, w, h, hex, seeded(7)));
  const stoneTexture = hex => canvasTexture(`stone${hex}`, [512, 512], (ctx, w, h) => {
    const random = seeded(11);
    const dark = parseInt(hex.slice(1, 3), 16) < 120;
    ctx.fillStyle = hex; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 2200; i += 1) { ctx.fillStyle = `rgba(${dark ? '255,255,255' : '0,0,0'},${random() * 0.05})`; ctx.fillRect(random() * w, random() * h, 2, 2); }
    for (let i = 0; i < 6; i += 1) {
      ctx.strokeStyle = dark ? `rgba(230,225,215,${0.25 + random() * 0.3})` : `rgba(120,110,95,${0.18 + random() * 0.25})`;
      ctx.lineWidth = 0.8 + random() * 1.8;
      ctx.beginPath(); ctx.moveTo(random() * w, 0);
      ctx.bezierCurveTo(random() * w, h / 3, random() * w, (2 * h) / 3, random() * w, h);
      ctx.stroke();
    }
  });
  // Floor: boards with seams for wood, large tiles for stone.
  const floorTexture = spec => canvasTexture(`floor${spec.id}`, [1024, 1024], (ctx, w, h) => {
    const random = seeded(23);
    if (spec.stone) {
      ctx.fillStyle = spec.color; ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 5000; i += 1) { ctx.fillStyle = `rgba(0,0,0,${random() * 0.04})`; ctx.fillRect(random() * w, random() * h, 2, 2); }
      ctx.strokeStyle = 'rgba(80,75,70,.35)'; ctx.lineWidth = 3;
      for (let i = 0; i <= 2; i += 1) { ctx.beginPath(); ctx.moveTo(0, (i * h) / 2); ctx.lineTo(w, (i * h) / 2); ctx.moveTo((i * w) / 2, 0); ctx.lineTo((i * w) / 2, h); ctx.stroke(); }
      return;
    }
    grain(ctx, w, h, spec.color, random);
    const rows = 6;
    for (let r = 0; r < rows; r += 1) {
      const y = (r * h) / rows;
      ctx.fillStyle = `rgba(${random() > 0.5 ? '0,0,0' : '255,255,255'},${random() * 0.07})`;
      ctx.fillRect(0, y, w, h / rows);
      ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fillRect(0, y, w, 2);
      ctx.fillRect(random() * w, y, 2, h / rows);
    }
  });
  const stripes = canvasTexture('flutes', [64, 8], (ctx, w, h) => {
    const gradient = ctx.createLinearGradient(0, 0, w, 0);
    gradient.addColorStop(0, '#000'); gradient.addColorStop(0.5, '#fff'); gradient.addColorStop(1, '#000');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, w, h);
  }, { srgb: false });

  const materials = new Map();
  function material(key, make) {
    if (!materials.has(key)) materials.set(key, make());
    return materials.get(key);
  }
  const standard = options => new THREE.MeshStandardMaterial(options);
  function surface(spec, roughness = 0.55) {
    if (spec.wood) return material(`w${spec.color}`, () => standard({ map: woodTexture(spec.color), roughness: 0.62 }));
    if (spec.stone) return material(`s${spec.color}`, () => standard({ map: stoneTexture(spec.color), roughness: 0.28 }));
    return material(`c${spec.color}${roughness}`, () => standard({ color: spec.color, roughness }));
  }
  // Fluted fronts: bump-mapped vertical flutes every ~22 mm, density kept constant per front width.
  function flutedSurface(spec, width) {
    return material(`f${spec.color}${Math.round(width * 100)}`, () => {
      const bump = stripes.clone();
      bump.repeat.set(Math.max(1, Math.round(width / 0.022)), 1);
      bump.needsUpdate = true;
      const base = spec.wood ? { map: woodTexture(spec.color) } : { color: spec.color };
      return standard({ ...base, roughness: 0.5, bumpMap: bump, bumpScale: 3 });
    });
  }
  const fabricMaterial = spec => material(`fab${spec.color}`, () => standard({ color: spec.color, roughness: 0.96 }));
  const ribbedBump = stripes.clone();
  ribbedBump.repeat.set(30, 1);
  ribbedBump.needsUpdate = true;
  const mats = {
    plinth: standard({ color: '#2b2d2c', roughness: 0.7 }),
    carcass: standard({ color: '#e6e1d8', roughness: 0.8 }),
    steel: standard({ color: '#b9bcbe', metalness: 1, roughness: 0.25 }),
    brass: standard({ color: '#c8a35a', metalness: 1, roughness: 0.28 }),
    black: standard({ color: '#1b1c1c', metalness: 0.6, roughness: 0.42 }),
    glassBlack: standard({ color: '#111314', metalness: 0.2, roughness: 0.08 }),
    mirror: standard({ color: '#e3e8ea', metalness: 1, roughness: 0.03 }),
    glass: standard({ color: '#cfd8d6', metalness: 0.1, roughness: 0.04, transparent: true, opacity: 0.22, depthWrite: false }),
    ribbedGlass: standard({ color: '#8f8270', metalness: 0.1, roughness: 0.2, transparent: true, opacity: 0.55, depthWrite: false, bumpMap: ribbedBump, bumpScale: 2 }),
    light: new THREE.MeshBasicMaterial({ color: '#ffe0ae' }),
    flame: new THREE.MeshBasicMaterial({ color: '#ffb35c' }),
    linen: standard({ color: '#efe9df', roughness: 0.95 }),
    mattress: standard({ color: '#f4f1ea', roughness: 0.9 }),
    screen: standard({ color: '#0d0f10', metalness: 0.3, roughness: 0.15 }),
    dimLine: new THREE.LineBasicMaterial({ color: '#6f5629' }),
  };
  const clothes = ['#d9d2c5', '#8a8f8c', '#2f3437', '#b7a58a', '#e8e4dc', '#5b6b78', '#a3604e'].map(color => standard({ color, roughness: 0.95 }));

  /* ----- geometry helpers ----- */
  const geometries = [];
  const track = geometry => { geometries.push(geometry); return geometry; };
  function box(parent, w, h, d, mat, x, y, z, { rounded = false, cast = true, room = false, radius = 0.006 } = {}) {
    const r = Math.min(radius, w / 2 - 0.0005, h / 2 - 0.0005, d / 2 - 0.0005);
    const geometry = track(rounded && r > 0.0008 ? new RoundedBoxGeometry(w, h, d, 2, r) : new THREE.BoxGeometry(w, h, d));
    const mesh = new THREE.Mesh(geometry, mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = cast && !mat.transparent;
    mesh.receiveShadow = true;
    mesh.userData.room = room;
    parent.add(mesh);
    return mesh;
  }
  function cylinder(parent, radius, height, mat, x, y, z, { axis = 'y', segments = 18 } = {}) {
    const mesh = new THREE.Mesh(track(new THREE.CylinderGeometry(radius, radius, height, segments)), mat);
    if (axis === 'x') mesh.rotation.z = Math.PI / 2;
    mesh.position.set(x, y, z);
    mesh.castShadow = !mat.transparent;
    parent.add(mesh);
    return mesh;
  }

  let animated = [];
  let dimItems = [];
  const GAP = 0.004;
  const DT = 0.018;

  /** Handle on a front centred at the origin; the opening edge is at sign * w / 2 (sign 0 = centred). */
  function handle(parent, kind, w, h, sign, { vertical = true, long = false, y = 0 } = {}) {
    if (kind === 'hidden') return;
    const x = sign * (w / 2 - 0.045);
    if (kind === 'ring') {
      const ring = new THREE.Mesh(track(new THREE.TorusGeometry(0.03, 0.005, 10, 28)), mats.brass);
      ring.position.set(x - sign * 0.01, y, DT / 2 + 0.008);
      parent.add(ring);
      return;
    }
    const mat = kind === 'brass' ? mats.brass : mats.black;
    if (vertical && sign !== 0) box(parent, 0.012, long ? Math.min(0.9, h * 0.45) : Math.min(0.2, h * 0.5), 0.018, mat, x, y, DT / 2 + 0.01);
    else box(parent, Math.min(0.22, w * 0.45), 0.012, 0.018, mat, 0, y, DT / 2 + 0.01);
  }

  /** Front panel content (centred at the origin, front face towards +z). */
  function frontPanel(parent, w, h, spec, style) {
    const face = surface(spec, 0.5);
    if (style === 'fluted') { box(parent, w, h, DT, flutedSurface(spec, w), 0, 0, 0, { rounded: true }); return; }
    if (style === 'classic' || style === 'vitrine') {
      const rail = Math.min(0.075, w * 0.18);
      box(parent, w, rail, DT, face, 0, h / 2 - rail / 2, 0);
      box(parent, w, rail, DT, face, 0, -h / 2 + rail / 2, 0);
      box(parent, rail, h - rail * 2, DT, face, -w / 2 + rail / 2, 0, 0);
      box(parent, rail, h - rail * 2, DT, face, w / 2 - rail / 2, 0, 0);
      const innerW = w - rail * 2;
      const tall = h > 1.2;
      const splitY = tall ? -h / 2 + rail + (h - rail * 2) * 0.32 : 0;
      const panels = tall ? [[-h / 2 + rail, splitY - rail / 2], [splitY + rail / 2, h / 2 - rail]] : [[-h / 2 + rail, h / 2 - rail]];
      if (tall) box(parent, innerW, rail, DT, face, 0, splitY, 0);
      panels.forEach(([from, to], index) => {
        const ph = to - from;
        const cy = from + ph / 2;
        if (style === 'vitrine' && (!tall || index === 1)) {
          box(parent, innerW, ph, 0.004, mats.glass, 0, cy, -0.004, { cast: false });
          const cols = innerW > 0.35 ? 2 : 1;
          const rows = Math.max(2, Math.round(ph / 0.32));
          for (let c = 1; c < cols; c += 1) box(parent, 0.016, ph, 0.012, face, -innerW / 2 + (innerW * c) / cols, cy, 0);
          for (let r = 1; r < rows; r += 1) box(parent, innerW, 0.016, 0.012, face, 0, from + (ph * r) / rows, 0);
        } else {
          box(parent, innerW, ph, DT * 0.6, face, 0, cy, -DT * 0.2);
          box(parent, innerW - 0.05, ph - 0.05, DT * 0.6, face, 0, cy, -DT * 0.05, { rounded: true, radius: 0.004 });
        }
      });
      return;
    }
    if (style === 'glass' || style === 'glassClear') {
      const ribbed = style === 'glass';
      const frame = ribbed ? 0.022 : 0.03;
      const frameMat = ribbed ? mats.black : face;
      box(parent, w, frame, DT, frameMat, 0, h / 2 - frame / 2, 0);
      box(parent, w, frame, DT, frameMat, 0, -h / 2 + frame / 2, 0);
      box(parent, frame, h, DT, frameMat, -w / 2 + frame / 2, 0, 0);
      box(parent, frame, h, DT, frameMat, w / 2 - frame / 2, 0, 0);
      box(parent, w - frame * 2, h - frame * 2, 0.006, ribbed ? mats.ribbedGlass : mats.glass, 0, 0, 0, { cast: false });
      return;
    }
    if (style === 'mirror') {
      box(parent, w, h, DT, face, 0, 0, -0.002, { rounded: true });
      box(parent, w - 0.08, h - 0.12, 0.004, mats.mirror, 0, 0, DT / 2 + 0.001, { cast: false });
      return;
    }
    box(parent, w, h, DT, face, 0, 0, 0, { rounded: true });
  }

  /** Hinged door: (x, y) = door centre, z = front plane centre. Opens outwards around its hinge. */
  function hingedDoor(parent, { w, h, x, y, z, hinge, spec, style, handles, long = false, handleY = 0 }) {
    const side = hinge === 'left' ? -1 : 1;
    const pivot = new THREE.Group();
    pivot.position.set(x + side * (w / 2), y, z);
    const content = new THREE.Group();
    content.position.x = -side * (w / 2);
    pivot.add(content);
    frontPanel(content, w - GAP * 2, h - GAP * 2, spec, style);
    handle(content, handles, w - GAP * 2, h - GAP * 2, -side, { long, y: handleY });
    parent.add(pivot);
    animated.push({ object: pivot, key: 'rotation', axis: 'y', closed: 0, open: side * 1.4 });
    return pivot;
  }

  /** Drawer: front plus a box that slides out. */
  function drawer(parent, { w, h, x, y, z, depth, spec, style, handles }) {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    frontPanel(group, w - GAP * 2, h - GAP * 2, spec, style === 'vitrine' || style === 'glass' ? 'smooth' : style);
    handle(group, handles === 'ring' ? 'brass' : handles, w - GAP * 2, h - GAP * 2, 0, { vertical: false, y: h / 2 - 0.05 });
    const inner = depth * 0.85;
    box(group, w - 0.06, h * 0.6, 0.012, mats.carcass, 0, -h * 0.1, -inner, { cast: false });
    box(group, 0.012, h * 0.6, inner, mats.carcass, -w / 2 + 0.04, -h * 0.1, -inner / 2, { cast: false });
    box(group, 0.012, h * 0.6, inner, mats.carcass, w / 2 - 0.04, -h * 0.1, -inner / 2, { cast: false });
    box(group, w - 0.08, 0.01, inner, mats.carcass, 0, -h * 0.38, -inner / 2, { cast: false });
    parent.add(group);
    animated.push({ object: group, key: 'position', axis: 'z', closed: z, open: z + depth * 0.55 });
    return group;
  }

  /** Open cabinet box: back, bottom, top and sides. Origin = left-bottom-back corner. */
  function shell(parent, w, h, d, mat, x0, y0, z0) {
    const t = 0.018;
    box(parent, w, h, 0.008, mat, x0 + w / 2, y0 + h / 2, z0 + 0.004, { cast: false });
    box(parent, w, t, d, mat, x0 + w / 2, y0 + t / 2, z0 + d / 2, { cast: false });
    box(parent, w, t, d, mat, x0 + w / 2, y0 + h - t / 2, z0 + d / 2, { cast: false });
    box(parent, t, h, d, mat, x0 + t / 2, y0 + h / 2, z0 + d / 2);
    box(parent, t, h, d, mat, x0 + w - t / 2, y0 + h / 2, z0 + d / 2);
  }

  function addLight(parent, x, y, z, intensity = 4, distance = 2.2) {
    const light = new THREE.PointLight(0xffd9a0, intensity, distance, 1.6);
    light.position.set(x, y, z);
    parent.add(light);
  }
  const ledStrip = (parent, w, x, y, z) => box(parent, w, 0.008, 0.018, mats.light, x, y, z, { cast: false });

  /** Dimension line (world coordinates) with extension lines and a label in centimetres. */
  function dimension(group, from, to, offset, text) {
    const start = new THREE.Vector3(...from);
    const end = new THREE.Vector3(...to);
    const a = start.clone().add(new THREE.Vector3(...offset));
    const b = end.clone().add(new THREE.Vector3(...offset));
    const dir = b.clone().sub(a).normalize();
    const tick = Math.abs(dir.z) > 0.9 ? new THREE.Vector3(0.035, 0, 0) : new THREE.Vector3(-dir.y, dir.x, 0).multiplyScalar(0.035);
    const points = [a, b, a.clone().add(tick), a.clone().sub(tick), b.clone().add(tick), b.clone().sub(tick), start, a, end, b];
    const lines = new THREE.LineSegments(track(new THREE.BufferGeometry().setFromPoints(points)), mats.dimLine);
    lines.userData.noFrame = true;
    group.add(lines);
    dimItems.push({ position: a.clone().add(b).multiplyScalar(0.5), text: text || cm(start.distanceTo(end)), small: false });
  }
  const dimLabel = (position, text) => dimItems.push({ position: new THREE.Vector3(...position), text, small: true });

  /* ----- room: back wall and optional side walls ----- */
  function buildRoom(group, params, { width, left = null, right = null }) {
    const spec = byId(WALLS, params.wall);
    const wall = material(`wall${spec.color}`, () => standard({ color: spec.color, roughness: 0.95 }));
    box(group, width, 2.9, 0.06, wall, 0, 1.45, -0.03, { cast: false, room: true });
    if (left) box(group, 0.06, 2.9, left.depth, wall, left.x - 0.03, 1.45, left.depth / 2, { cast: false, room: true });
    if (right) box(group, 0.06, 2.9, right.depth, wall, right.x + 0.03, 1.45, right.depth / 2, { cast: false, room: true });
    return wall;
  }

  /* ----- kitchen ----- */
  const K = KITCHEN_DIMS;
  function kitchenRunGroup(length, p, wallMat, { tall = false, sink = false, cooktop = false } = {}) {
    const group = new THREE.Group();
    const finish = finishOf(p);
    const solidStyle = p.style === 'vitrine' ? 'classic' : p.style;
    const tallW = tall && length >= 2.4 ? 0.6 : 0;
    const baseLen = length - tallW;
    const topY = K.plinth + K.base;
    box(group, baseLen, K.plinth, K.depth - 0.06, mats.plinth, baseLen / 2, K.plinth / 2, (K.depth - 0.06) / 2);
    const modules = Math.max(1, Math.round(baseLen / 0.6));
    const w = baseLen / modules;
    for (let i = 0; i < modules; i += 1) {
      const cx = i * w + w / 2;
      shell(group, w, K.base, K.depth - DT, mats.carcass, i * w, K.plinth, 0);
      const drawers = p.kitchenBase === 'drawers' || (p.kitchenBase !== 'doors' && i % 2 === 0);
      if (drawers) {
        let y = K.plinth;
        [0.22, 0.25, 0.25].forEach(rowH => { drawer(group, { w, h: rowH, x: cx, y: y + rowH / 2, z: K.depth - DT / 2, depth: K.depth, spec: finish, style: solidStyle, handles: p.handles }); y += rowH; });
      } else {
        const levels = p.kitchenBase === 'doors' ? 2 : 1;
        for (let k = 1; k <= levels; k += 1) box(group, w - 0.04, 0.016, K.depth - 0.06, mats.carcass, cx, K.plinth + (k * K.base) / (levels + 1), (K.depth - DT) / 2, { cast: false });
        hingedDoor(group, { w, h: K.base, x: cx, y: K.plinth + K.base / 2, z: K.depth - DT / 2, hinge: 'left', spec: finish, style: solidStyle, handles: p.handles, handleY: K.base / 2 - 0.08 });
      }
    }
    if (p.handles === 'hidden') box(group, baseLen, 0.025, 0.01, mats.black, baseLen / 2, topY - 0.03, K.depth - DT - 0.004, { cast: false });
    const topMat = surface(TOPS[p.top], 0.4);
    box(group, baseLen, K.top, K.topDepth, topMat, baseLen / 2, topY + K.top / 2, K.topDepth / 2);
    const splashH = K.upBottom - topY - K.top;
    box(group, baseLen, splashH, 0.012, TOPS[p.top].stone ? topMat : wallMat, baseLen / 2, topY + K.top + splashH / 2, 0.006, { cast: false });
    if (sink) {
      const x = baseLen * 0.3;
      box(group, 0.52, 0.012, 0.42, mats.steel, x, topY + K.top + 0.002, 0.3, { cast: false });
      box(group, 0.03, 0.32, 0.03, mats.steel, x, topY + K.top + 0.16, 0.08);
      box(group, 0.03, 0.03, 0.2, mats.steel, x, topY + K.top + 0.31, 0.17);
    }
    if (cooktop) box(group, 0.58, 0.008, 0.5, mats.glassBlack, baseLen * 0.66, topY + K.top + 0.004, 0.3, { cast: false });
    if (p.upper === 'shelves') {
      [1.6, 1.95].forEach(y => box(group, baseLen * 0.92, 0.025, 0.26, surface(finish), baseLen / 2, y, 0.13));
    } else {
      const rows = p.upper === 'ceiling' ? [K.upH, K.ceiling - K.upBottom - K.upH] : [K.upH];
      let y = K.upBottom;
      rows.forEach((rowH, row) => {
        for (let i = 0; i < modules; i += 1) {
          const cx = i * w + w / 2;
          const glass = p.upperGlass && row === 0;
          shell(group, w, rowH, K.upDepth - DT, mats.carcass, i * w, y, 0);
          const shelves = Math.max(1, Math.min(3, p.shelfCount));
          for (let k = 1; k <= shelves; k += 1) box(group, w - 0.04, 0.016, K.upDepth - 0.05, glass ? mats.glass : mats.carcass, cx, y + (k * rowH) / (shelves + 1), (K.upDepth - DT) / 2, { cast: false });
          if (glass) {
            box(group, w - 0.04, 0.012, K.upDepth - 0.05, mats.glass, cx, y + rowH / 2, (K.upDepth - DT) / 2, { cast: false });
            for (let k = 0; k < 3; k += 1) cylinder(group, 0.1, 0.018, mats.linen, cx - 0.08, y + 0.03 + k * 0.022, 0.16, { segments: 28 });
            cylinder(group, 0.035, 0.11, mats.glass, cx + 0.12, y + rowH / 2 + 0.065, 0.15);
            if (p.innerLights) ledStrip(group, w - 0.06, cx, y + rowH - 0.03, K.upDepth - DT - 0.03);
          }
          const style = glass ? (p.style === 'classic' || p.style === 'vitrine' ? 'vitrine' : 'glassClear') : solidStyle;
          hingedDoor(group, { w, h: rowH, x: cx, y: y + rowH / 2, z: K.upDepth - DT / 2, hinge: i % 2 ? 'right' : 'left', spec: finish, style, handles: row === 0 ? p.handles : 'hidden', handleY: -rowH / 2 + 0.1 });
        }
        y += rowH;
      });
      if (p.upperGlass && p.innerLights) addLight(group, baseLen / 2, K.upBottom + 0.4, K.upDepth + 0.2, 3, 1.8);
    }
    if (p.lights && p.upper !== 'shelves') {
      ledStrip(group, baseLen - 0.08, baseLen / 2, K.upBottom - 0.006, K.upDepth - 0.06);
      addLight(group, baseLen / 2, K.upBottom - 0.1, 0.35, 6, 2.6);
    }
    if (tallW) {
      const x = baseLen + tallW / 2;
      const h = 2.2;
      box(group, tallW, K.plinth, K.depth - 0.06, mats.plinth, x, K.plinth / 2, (K.depth - 0.06) / 2);
      shell(group, tallW, h - K.plinth, K.depth - DT, mats.carcass, baseLen, K.plinth, 0);
      [0.6, 1.2, 1.6].forEach(level => box(group, tallW - 0.04, 0.016, K.depth - 0.06, mats.carcass, x, K.plinth + level, (K.depth - DT) / 2, { cast: false }));
      [[K.plinth, 1.1], [K.plinth + 1.1, h - K.plinth - 1.1]].forEach(([y, segment]) => {
        hingedDoor(group, { w: tallW, h: segment, x, y: y + segment / 2, z: K.depth - DT / 2, hinge: 'right', spec: finish, style: solidStyle, handles: p.handles, long: true });
      });
    }
    return group;
  }

  function buildKitchen(p) {
    const group = new THREE.Group();
    const dims = new THREE.Group();
    const A = p.lengthA;
    const B = p.lengthB;
    const sides = ['corner', 'u'].includes(p.layout);
    const roomDepth = Math.max(B, 2.2) + 0.6;
    const wallMat = buildRoom(group, p, { width: A + 5, left: sides ? { x: -A / 2, depth: roomDepth } : null, right: p.layout === 'u' ? { x: A / 2, depth: roomDepth } : null });
    const main = kitchenRunGroup(A, p, wallMat, { tall: ['straight', 'island'].includes(p.layout), sink: true, cooktop: p.layout !== 'u' });
    main.position.set(-A / 2, 0, 0);
    group.add(main);
    const sideLen = Math.max(0.6, B - 0.6);
    if (sides) {
      const left = kitchenRunGroup(sideLen, p, wallMat, { cooktop: p.layout === 'u' });
      left.rotation.y = Math.PI / 2;
      left.position.set(-A / 2, 0, B);
      group.add(left);
    }
    if (p.layout === 'u') {
      const right = kitchenRunGroup(sideLen, p, wallMat);
      right.rotation.y = -Math.PI / 2;
      right.position.set(A / 2, 0, 0.6);
      group.add(right);
    }
    if (p.layout === 'island') {
      const len = Math.min(2.6, Math.max(1.2, A * 0.6));
      const z = 0.6 + 1.1 + 0.45;
      const finish = finishOf(p);
      box(group, len, K.plinth, 0.8, mats.plinth, 0, K.plinth / 2, z);
      box(group, len, K.base, 0.86, p.style === 'fluted' ? flutedSurface(finish, len) : surface(finish), 0, K.plinth + K.base / 2, z, { rounded: true });
      box(group, len + 0.1, K.top, 1.2, surface(TOPS[p.top], 0.4), 0, K.plinth + K.base + K.top / 2, z + 0.15);
      dimension(dims, [-len / 2 - 0.05, 0.02, z + 0.75], [len / 2 + 0.05, 0.02, z + 0.75], [0, 0, 0.12]);
    }
    const topH = p.upper === 'ceiling' ? K.ceiling : p.upper === 'shelves' ? K.plinth + K.base + K.top : K.upBottom + K.upH;
    dimension(dims, [-A / 2, 0.02, 0.62], [A / 2, 0.02, 0.62], [0, 0, 0.2]);
    if (p.layout === 'u') dimension(dims, [0, 0, 0.62], [0, topH, 0.62], [0, 0, 0.12]);
    else dimension(dims, [A / 2 + 0.02, 0, 0.3], [A / 2 + 0.02, topH, 0.3], [0.14, 0, 0]);
    if (sides) dimension(dims, [-A / 2 + 0.62, 0.02, 0], [-A / 2 + 0.62, 0.02, B], [0.2, 0, 0]);
    dimLabel([-A / 2 + 0.3, K.plinth + K.base + 0.12, 0.66], 'глубина 60 см');
    group.add(dims);
    return { group, dims };
  }

  /* ----- wardrobe interior ----- */
  function wardrobeSection(parent, kind, x0, w, H, D, y0, clothIndex, innerLights, shelfCount = 5) {
    const t = 0.018;
    const top = H - 0.02;
    const cx = x0 + w / 2;
    const hangers = (from, length, offset) => {
      const count = Math.max(3, Math.floor(w / 0.09));
      for (let k = 0; k < count; k += 1) {
        const l = length + ((k * 37) % 5) * 0.06;
        box(parent, 0.04, l, D * 0.72, clothes[(clothIndex + k + offset) % clothes.length], x0 + 0.06 + (k * (w - 0.12)) / Math.max(count - 1, 1), from - l / 2, D / 2, { rounded: true, radius: 0.015 });
      }
    };
    if (kind === 'hang') {
      box(parent, w - t, t, D - 0.04, mats.carcass, cx, y0 + top - 0.32, D / 2 - 0.02, { cast: false });
      cylinder(parent, 0.012, w - 0.05, mats.steel, cx, y0 + top - 0.4, D / 2, { axis: 'x' });
      hangers(y0 + top - 0.42, 0.8, 0);
      box(parent, w - t, t, D - 0.04, mats.carcass, cx, y0 + 0.5, D / 2 - 0.02, { cast: false });
    } else if (kind === 'trousers' || kind === 'baskets') {
      box(parent, w - t, t, D - 0.04, mats.carcass, cx, y0 + top - 0.32, D / 2 - 0.02, { cast: false });
      cylinder(parent, 0.012, w - 0.05, mats.steel, cx, y0 + top - 0.4, D / 2, { axis: 'x' });
      hangers(y0 + top - 0.42, 0.55, 1);
      if (kind === 'trousers') {
        // Pull-out trouser rack: a frame of thin bars with folded trousers.
        box(parent, w - 0.06, 0.012, D * 0.8, mats.steel, cx, y0 + 0.86, D / 2);
        for (let k = 0; k < 6; k += 1) {
          const x = x0 + 0.06 + (k * (w - 0.12)) / 5;
          box(parent, 0.01, 0.01, D * 0.8, mats.steel, x, y0 + 0.9, D / 2);
          if (k < 5) box(parent, (w - 0.12) / 6, 0.32, 0.012, clothes[(clothIndex + k) % clothes.length], x + (w - 0.12) / 10, y0 + 0.74, D / 2);
        }
      } else {
        // Wire baskets on runners.
        for (let k = 0; k < 4; k += 1) {
          const y = y0 + 0.1 + k * 0.22;
          box(parent, w - 0.06, 0.01, D * 0.82, mats.steel, cx, y, D / 2, { cast: false });
          box(parent, w - 0.06, 0.13, 0.008, mats.steel, cx, y + 0.065, D * 0.9, { cast: false });
          box(parent, (w - 0.1) * 0.7, 0.09, D * 0.55, clothes[(clothIndex + k + 1) % clothes.length], cx, y + 0.05, D / 2, { rounded: true, radius: 0.02 });
        }
      }
    } else if (kind === 'double') {
      const half = (top - 0.1) / 2;
      [top - 0.32, half].forEach((y, row) => {
        box(parent, w - t, t, D - 0.04, mats.carcass, cx, y0 + y, D / 2 - 0.02, { cast: false });
        cylinder(parent, 0.012, w - 0.05, mats.steel, cx, y0 + y - 0.08, D / 2, { axis: 'x' });
        hangers(y0 + y - 0.1, Math.min(0.75, half - 0.2), row * 2);
      });
    } else if (kind === 'shelves') {
      const count = Math.max(1, Math.min(9, shelfCount));
      for (let k = 1; k <= count; k += 1) {
        const y = y0 + (k * (top - 0.05)) / (count + 1);
        box(parent, w - t, t, D - 0.04, mats.carcass, cx, y, D / 2 - 0.02, { cast: false });
        if (k <= 3) box(parent, w * 0.6, 0.12, D * 0.6, clothes[(clothIndex + k + 2) % clothes.length], cx, y + 0.07, D / 2, { rounded: true, radius: 0.02 });
      }
    } else {
      [0.22, 0.44, 0.66].forEach(y => {
        box(parent, w - 0.06, 0.18, 0.016, mats.carcass, cx, y0 + y - 0.08, D - 0.06, { cast: false });
        box(parent, 0.12, 0.012, 0.016, mats.brass, cx, y0 + y - 0.02, D - 0.05);
      });
      box(parent, w - t, t, D - 0.04, mats.carcass, cx, y0 + 0.78, D / 2 - 0.02, { cast: false });
      cylinder(parent, 0.012, w - 0.05, mats.steel, cx, y0 + top - 0.4, D / 2, { axis: 'x' });
      hangers(y0 + top - 0.42, 0.5, 3);
      box(parent, w - t, t, D - 0.04, mats.carcass, cx, y0 + top - 0.32, D / 2 - 0.02, { cast: false });
    }
    if (innerLights) ledStrip(parent, w - 0.05, cx, y0 + top - 0.012, D - 0.06);
  }

  /* ----- wardrobe ----- */
  function buildWardrobe(p) {
    const group = new THREE.Group();
    const dims = new THREE.Group();
    const W = p.width;
    const H = p.height;
    const D = p.depth;
    const finish = finishOf(p);
    const corner = p.wardShape === 'corner' && !p._side;
    if (!p._side) buildRoom(group, p, { width: W + 5, left: corner ? { x: -W / 2, depth: p.wardB + 0.4 } : null });
    const x0 = -W / 2;
    box(group, W, 0.08, D - 0.06, mats.plinth, 0, 0.04, (D - 0.06) / 2);
    const inner = H - 0.08;
    const mezz = p.doors === 'hinged' && H > 2.4 ? H - 2.2 : 0;
    const bodyH = inner - mezz;
    shell(group, W, inner, D - DT, surface(finish, 0.6), x0, 0.08, 0);
    const doorCount = p.doors === 'sliding' ? (W > 2.6 ? 3 : 2) : Math.max(2, Math.round(W / 0.5));
    const sectionCount = p.doors === 'sliding' ? doorCount : Math.ceil(doorCount / 2);
    const sw = W / sectionCount;
    const kinds = ['hang', 'shelves', 'drawers'];
    for (let s = 0; s < sectionCount; s += 1) {
      if (s > 0) box(group, 0.018, inner, D - DT - 0.01, mats.carcass, x0 + s * sw, 0.08 + inner / 2, (D - DT) / 2, { cast: false });
      wardrobeSection(group, p.fill[s] || kinds[s % 3], x0 + s * sw, sw, bodyH, D - DT, 0.08, s * 2, p.innerLights, p.shelfCount);
    }
    if (mezz) {
      box(group, W - 0.036, 0.018, D - DT - 0.02, mats.carcass, 0, 0.08 + bodyH, (D - DT) / 2, { cast: false });
      for (let s = 0; s < sectionCount; s += 1) box(group, sw * 0.6, 0.18, D * 0.5, clothes[(s + 4) % clothes.length], x0 + s * sw + sw / 2, 0.08 + bodyH + 0.12, D / 2, { rounded: true, radius: 0.03 });
    }
    if (p.innerLights) addLight(group, 0, 0.08 + bodyH - 0.2, D * 0.55, 4, Math.max(1.6, W));
    if (p.doors === 'sliding') {
      const pw = W / doorCount + 0.03;
      for (let i = 0; i < doorCount; i += 1) {
        const front = i % 2 === 0;
        const x = x0 + pw / 2 + (i * (W - pw)) / (doorCount - 1);
        const panel = new THREE.Group();
        panel.position.set(x, 0.08 + (H - 0.1) / 2, D - (front ? 0.012 : 0.042));
        const isMirror = p.mirror && i === Math.floor(doorCount / 2);
        const style = isMirror ? 'mirror' : p.style === 'vitrine' ? 'classic' : p.style;
        frontPanel(panel, pw, H - 0.1, finish, style);
        if (style !== 'glass') {
          const frame = p.handles === 'hidden' ? mats.steel : p.handles === 'black' ? mats.black : mats.brass;
          box(panel, 0.02, H - 0.1, 0.024, frame, -pw / 2 + 0.01, 0, 0.004);
          box(panel, 0.02, H - 0.1, 0.024, frame, pw / 2 - 0.01, 0, 0.004);
        }
        group.add(panel);
        // Opening slides the front panels sideways and reveals the sections behind them.
        const shift = front ? (i === 0 ? pw * 0.82 : -pw * 0.82) : 0;
        if (shift) animated.push({ object: panel, key: 'position', axis: 'x', closed: x, open: x + shift });
        dimLabel([x, 0.2, D + 0.06], cm(W / doorCount));
      }
      box(group, W, 0.04, 0.07, mats.black, 0, H - 0.02, D - 0.035);
    } else {
      const dw = W / doorCount;
      const mirrorIndex = Math.max(0, Math.floor(doorCount / 2) - 1);
      for (let i = 0; i < doorCount; i += 1) {
        const x = x0 + dw * i + dw / 2;
        const hinge = i % 2 === 0 ? 'left' : 'right';
        hingedDoor(group, { w: dw, h: bodyH, x, y: 0.08 + bodyH / 2, z: D - DT / 2, hinge, spec: finish, style: p.mirror && i === mirrorIndex ? 'mirror' : p.style, handles: p.handles, long: true, handleY: p.handles === 'ring' ? 0.05 : 0.08 });
        if (mezz) hingedDoor(group, { w: dw, h: mezz, x, y: 0.08 + bodyH + mezz / 2, z: D - DT / 2, hinge, spec: finish, style: p.style === 'vitrine' ? 'classic' : p.style, handles: 'hidden' });
        dimLabel([x, 0.2, D + 0.06], cm(dw));
      }
    }
    if (p.lights) {
      ledStrip(group, W - 0.06, 0, H + 0.006, D - 0.05);
      addLight(group, 0, H + 0.25, D + 0.45, 5, 3);
    }
    if (corner) {
      // The second wing along the left wall, from the front of the first one to the length given from the corner.
      const sideW = Math.max(0.4, p.wardB - D);
      const side = buildWardrobe({ ...p, wardShape: 'straight', _side: true, width: sideW, fill: [] });
      side.group.rotation.y = Math.PI / 2;
      side.group.position.set(-W / 2, 0, D + sideW / 2);
      group.add(side.group);
      dimension(dims, [-W / 2 + D, 0, 0], [-W / 2 + D, 0, p.wardB], [0.2, 0, 0]);
    }
    if (!p._side) {
      dimension(dims, [x0, 0, D], [W / 2, 0, D], [0, 0, 0.22]);
      dimension(dims, [W / 2, 0, D], [W / 2, H, D], [0.14, 0, 0]);
      dimension(dims, [W / 2, H, 0], [W / 2, H, D], [0.14, 0.06, 0]);
    }
    group.add(dims);
    return { group, dims };
  }

  /* ----- walk-in wardrobe ----- */
  function walkRun(length, p, finish, startIndex) {
    const group = new THREE.Group();
    const D = p.walkD || 0.55;
    const H = p.walkH;
    const count = Math.max(1, Math.round(length / 0.8));
    const sw = length / count;
    const body = surface(finish, 0.6);
    shell(group, length, H, D, body, 0, 0, 0);
    const kinds = ['hang', 'shelves', 'drawers', 'hang'];
    for (let s = 0; s < count; s += 1) {
      if (s > 0) box(group, 0.018, H, D - 0.01, body, s * sw, H / 2, D / 2);
      const pattern = p.fill.length ? p.fill : kinds;
      wardrobeSection(group, pattern[(s + startIndex) % pattern.length], s * sw, sw, H, D, 0, s + startIndex, p.innerLights, p.shelfCount);
      if (p.walkDoors === 'glass') {
        const half = sw / 2;
        hingedDoor(group, { w: half, h: H - 0.04, x: s * sw + half / 2, y: H / 2, z: D + 0.01, hinge: 'left', spec: finish, style: 'glass', handles: p.handles, long: true });
        hingedDoor(group, { w: half, h: H - 0.04, x: s * sw + sw - half / 2, y: H / 2, z: D + 0.01, hinge: 'right', spec: finish, style: 'glass', handles: p.handles, long: true });
      }
    }
    if (p.lights) ledStrip(group, length - 0.05, length / 2, H + 0.006, D - 0.05);
    return group;
  }

  function buildWalkin(p) {
    const group = new THREE.Group();
    const dims = new THREE.Group();
    const A = p.walkA;
    const B = p.walkB;
    const finish = finishOf(p);
    const D = p.walkD || 0.55;
    const parallel = p.walkLayout === 'parallel';
    const left = p.walkLayout !== 'line';
    const right = p.walkLayout === 'u' || parallel;
    const roomDepth = Math.max(B, 2) + 0.4;
    // Only the back wall (and the left one for an L-layout): a side wall in front of the camera would hide the U.
    buildRoom(group, p, { width: A + 5, left: left && !right ? { x: -A / 2, depth: roomDepth } : null });
    if (!parallel) {
      const main = walkRun(A, p, finish, 0);
      main.position.set(-A / 2, 0, 0);
      group.add(main);
    }
    const sideLen = parallel ? B : Math.max(0.6, B - D);
    if (left) {
      const run = walkRun(sideLen, p, finish, parallel ? 0 : 1);
      run.rotation.y = Math.PI / 2;
      run.position.set(-A / 2, 0, B);
      group.add(run);
    }
    if (right) {
      const run = walkRun(sideLen, p, finish, parallel ? 1 : 2);
      run.rotation.y = -Math.PI / 2;
      run.position.set(A / 2, 0, parallel ? 0 : D);
      group.add(run);
    }
    if (p.walkLayout === 'u' && p.island && A >= 2 && B >= 1.6) {
      const len = Math.min(1.4, A - 1.4);
      const z = D + (B - D) / 2 + 0.1;
      box(group, len, 0.08, 0.5, mats.plinth, 0, 0.04, z);
      box(group, len, 0.76, 0.56, surface(finish, 0.6), 0, 0.46, z, { rounded: true });
      const n = Math.max(2, Math.round(len / 0.5));
      for (let i = 0; i < n; i += 1) {
        [0.27, 0.53].forEach(y => drawer(group, { w: len / n, h: 0.24, x: -len / 2 + (len / n) * (i + 0.5), y: 0.08 + y, z: z + 0.28 + DT / 2, depth: 0.5, spec: finish, style: 'smooth', handles: p.handles }));
      }
      box(group, len + 0.04, 0.012, 0.6, mats.glass, 0, 0.87, z, { cast: false });
    }
    if (p.innerLights) addLight(group, 0, p.walkH - 0.4, D + 0.5, 5, Math.max(2.4, A));
    dimension(dims, [-A / 2, 0.02, D], [A / 2, 0.02, D], [0, 0, 0.25]);
    dimension(dims, [right ? A / 2 - D - 0.05 : A / 2, 0, D], [right ? A / 2 - D - 0.05 : A / 2, p.walkH, D], right ? [0, 0, 0.12] : [0.14, 0, 0]);
    if (left) dimension(dims, [-A / 2 + D, 0.02, 0], [-A / 2 + D, 0.02, B], [0.2, 0, 0]);
    group.add(dims);
    return { group, dims };
  }

  /* ----- interior shelving (open, no doors; optional closed base) ----- */
  const books = ['#2f3a36', '#c9bba3', '#e8e2d6', '#4d5a55', '#7b6a58', '#ddd5c6', '#3c4447'].map(color => standard({ color, roughness: 0.85 }));
  function buildShelving(p) {
    const group = new THREE.Group();
    const dims = new THREE.Group();
    const W = p.shWidth;
    const H = p.shHeight;
    const D = p.shDepth;
    const finish = finishOf(p);
    const body = surface(finish, 0.55);
    buildRoom(group, p, { width: W + 4 });
    const x0 = -W / 2;
    const { t, columns, plinth, baseH } = shelvingGeometry(p);
    const cw = W / columns;
    box(group, W - 0.02, plinth, D - 0.04, mats.plinth, 0, plinth / 2, (D - 0.04) / 2);
    box(group, t, H - plinth, D, body, x0 + t / 2, plinth + (H - plinth) / 2, D / 2);
    box(group, t, H - plinth, D, body, W / 2 - t / 2, plinth + (H - plinth) / 2, D / 2);
    box(group, W, t, D, body, 0, H - t / 2, D / 2);
    box(group, W, t, D, body, 0, plinth + t / 2, D / 2);
    // Back panel: in a niche for appliances it can stay open (wires, air).
    const backFrom = p.shBase === 'niche' && p.nicheBack ? plinth + baseH : plinth;
    box(group, W - 2 * t, H - backFrom - t, 0.008, body, 0, backFrom + (H - backFrom - t) / 2, 0.004, { cast: false });
    for (let c = 1; c < columns; c += 1) box(group, t, H - plinth - 2 * t, D - 0.01, body, x0 + c * cw, plinth + (H - plinth) / 2, (D - 0.01) / 2);
    if (p.shBase === 'niche') {
      box(group, W - 2 * t, t, D - 0.01, body, 0, plinth + baseH - t / 2, (D - 0.01) / 2);
      if (p.appW > 0 && p.appH > 0) {
        const aw = Math.min(p.appW, cw - t), ad = Math.min(p.appD || 0.27, D - 0.02), ah = Math.min(p.appH, baseH - t);
        box(group, aw, ah, ad, mats.black, x0 + t + (cw - t) / 2, plinth + t + ah / 2, D - ad / 2 - 0.02, { rounded: true, radius: 0.01 });
      }
    }
    if (baseH && p.shBase !== 'niche') {
      box(group, W - 2 * t, t, D - 0.01, body, 0, plinth + baseH, (D - 0.01) / 2);
      const style = p.style === 'vitrine' || p.style === 'glass' ? 'smooth' : p.style;
      for (let c = 0; c < columns; c += 1) {
        const cx = x0 + c * cw + cw / 2;
        if (p.shBase === 'drawers') {
          [0, 1].forEach(row => drawer(group, { w: cw - 0.01, h: baseH / 2, x: cx, y: plinth + (baseH / 2) * (row + 0.5), z: D - DT / 2, depth: D - 0.04, spec: finish, style, handles: p.handles }));
        } else {
          hingedDoor(group, { w: cw - 0.01, h: baseH, x: cx, y: plinth + baseH / 2, z: D - DT / 2, hinge: c % 2 ? 'right' : 'left', spec: finish, style, handles: p.handles });
        }
      }
    }
    const from = plinth + t + baseH - (p.shBase === 'niche' ? t : 0);
    const to = H - t;
    const count = Math.max(1, Math.min(9, p.shelfCount));
    const step = (to - from) / (count + 1);
    for (let c = 0; c < columns; c += 1) {
      const cx = x0 + c * cw + cw / 2;
      const inner = cw - t;
      for (let k = 0; k <= count; k += 1) {
        const y = from + k * step;
        if (k > 0) box(group, inner, 0.02, D - 0.02, body, cx, y, (D - 0.02) / 2, { cast: false });
        if (p.lights) ledStrip(group, inner - 0.04, cx, y + step - 0.016, D - 0.05);
        // A few books and a vase on the shelves, so the scale reads at once.
        const seed = (c * 7 + k * 3) % 5;
        if (step > 0.18 && seed !== 4) {
          const n = Math.max(3, Math.floor((inner * (seed === 2 ? 0.45 : 0.7)) / 0.035));
          const bh = Math.min(step - 0.05, 0.24 + ((k + c) % 3) * 0.02);
          for (let b = 0; b < n; b += 1) box(group, 0.03, bh - (b % 3) * 0.015, Math.min(0.2, D - 0.06), books[(b + seed) % books.length], cx - inner / 2 + 0.04 + b * 0.034, y + 0.02 + (bh - (b % 3) * 0.015) / 2, (D - 0.02) / 2, { cast: false });
          if (seed === 2) cylinder(group, 0.06, Math.min(step - 0.06, 0.18), mats.linen, cx + inner * 0.25, y + 0.02 + Math.min(step - 0.06, 0.18) / 2, D / 2, { segments: 24 });
        }
      }
    }
    if (p.lights) addLight(group, 0, H * 0.6, D + 0.5, 4, Math.max(2, W + 1));
    dimension(dims, [x0, 0, D], [W / 2, 0, D], [0, 0, 0.22]);
    dimension(dims, [W / 2, 0, D], [W / 2, H, D], [0.14, 0, 0]);
    dimension(dims, [W / 2, H, 0], [W / 2, H, D], [0.14, 0.06, 0]);
    group.add(dims);
    return { group, dims };
  }

  /* ----- chest of drawers (optional mirror above) ----- */
  function buildChest(p) {
    const group = new THREE.Group();
    const dims = new THREE.Group();
    const W = p.chW;
    const H = p.chH;
    const D = p.chD;
    const finish = finishOf(p);
    const body = surface(finish, 0.6);
    buildRoom(group, p, { width: W + 3 });
    const lift = p.chBase === 'legs' ? 0.14 : p.chBase === 'floating' ? 0.28 : 0.07;
    if (p.chBase === 'plinth') box(group, W - 0.04, lift, D - 0.06, mats.plinth, 0, lift / 2, (D - 0.06) / 2);
    if (p.chBase === 'legs') [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([sx, sz]) => box(group, 0.03, lift, 0.03, mats.brass, sx * (W / 2 - 0.05), lift / 2, D / 2 + sz * (D / 2 - 0.06)));
    const bodyH = H - lift;
    shell(group, W, bodyH, D - DT, body, -W / 2, lift, 0);
    const cols = chestColumns(p);
    const rows = Math.max(1, Math.min(6, p.chRows));
    const cw = W / cols;
    const rh = (bodyH - 0.02) / rows;
    for (let c = 0; c < cols; c += 1) {
      if (c > 0) box(group, 0.018, bodyH - 0.036, D - DT - 0.02, mats.carcass, -W / 2 + c * cw, lift + bodyH / 2, (D - DT) / 2, { cast: false });
      for (let r = 0; r < rows; r += 1) drawer(group, { w: cw, h: rh, x: -W / 2 + cw * (c + 0.5), y: lift + 0.01 + rh * (r + 0.5), z: D - DT / 2, depth: D - 0.05, spec: finish, style: p.style, handles: p.handles });
    }
    if (p.lights && p.chBase === 'floating') { ledStrip(group, W - 0.06, 0, lift - 0.006, D / 2); addLight(group, 0, 0.1, D + 0.3, 3, 1.6); }
    if (p.chMirror === 'wall') {
      const mw = chestMirrorW(p);
      const mirror = new THREE.Group();
      mirror.position.set(0, H + 0.15 + p.chMirrorH / 2, 0.012);
      frontPanel(mirror, mw, p.chMirrorH, finish, 'mirror');
      group.add(mirror);
      dimension(dims, [mw / 2, H + 0.15, 0.03], [mw / 2, H + 0.15 + p.chMirrorH, 0.03], [0.12, 0, 0]);
    }
    dimension(dims, [-W / 2, 0, D], [W / 2, 0, D], [0, 0, 0.18]);
    dimension(dims, [W / 2, 0, D], [W / 2, H, D], [0.12, 0, 0]);
    dimension(dims, [W / 2, H, 0], [W / 2, H, D], [0.12, 0.05, 0]);
    group.add(dims);
    return { group, dims };
  }

  /* ----- hallway: closed wardrobe, open hooks, bench with shoe shelves, key shelf, mirror, mezzanine ----- */
  function buildHallway(p) {
    const group = new THREE.Group();
    const dims = new THREE.Group();
    const W = p.hwW;
    const H = p.hwH;
    const D = p.hwD;
    const finish = finishOf(p);
    const body = surface(finish, 0.6);
    buildRoom(group, p, { width: W + 3 });
    const plinth = 0.06;
    const mezzH = p.hwMezz && H > 2.2 ? Math.min(0.45, H - 2.05) : 0;
    const topY = H - mezzH;
    let x = -W / 2;
    if (p.hwClosed) {
      const cwd = Math.max(0.5, Math.min(W * 0.42, W - 0.6));
      box(group, cwd, plinth, D - 0.06, mats.plinth, x + cwd / 2, plinth / 2, (D - 0.06) / 2);
      shell(group, cwd, topY - plinth, D - DT, body, x, plinth, 0);
      box(group, cwd - 0.036, 0.018, D - DT - 0.02, mats.carcass, x + cwd / 2, topY - 0.3, (D - DT) / 2, { cast: false });
      cylinder(group, 0.012, cwd - 0.05, mats.steel, x + cwd / 2, topY - 0.38, D / 2, { axis: 'x' });
      for (let k = 0; k < Math.max(2, Math.floor(cwd / 0.12)); k += 1) box(group, 0.05, 0.95, D * 0.7, clothes[k % clothes.length], x + 0.07 + (k * (cwd - 0.14)) / Math.max(1, Math.floor(cwd / 0.12) - 1), topY - 0.88, D / 2, { rounded: true, radius: 0.02 });
      const doors = cwd > 0.75 ? 2 : 1;
      const dw = cwd / doors;
      for (let i = 0; i < doors; i += 1) hingedDoor(group, { w: dw, h: topY - plinth, x: x + dw * (i + 0.5), y: plinth + (topY - plinth) / 2, z: D - DT / 2, hinge: i ? 'right' : 'left', spec: finish, style: p.hwMirror && i === doors - 1 ? 'mirror' : p.style, handles: p.handles, long: true });
      x += cwd;
    }
    const ow = W / 2 - x;
    if (ow > 0.2) {
      const cx = x + ow / 2;
      box(group, ow - 0.018, topY - plinth, 0.012, body, cx - 0.009, plinth + (topY - plinth) / 2, 0.006, { cast: false });
      box(group, 0.018, topY, D, body, W / 2 - 0.009, topY / 2, D / 2);
      if (!p.hwClosed) box(group, 0.018, topY, D, body, -W / 2 + 0.009, topY / 2, D / 2);
      if (p.hwHooks) {
        const shelfY = Math.min(1.95, topY - 0.08);
        box(group, ow - 0.02, 0.022, D * 0.85, body, cx, shelfY, D * 0.43);
        const n = Math.max(2, Math.floor(ow / 0.2));
        for (let k = 0; k < n; k += 1) {
          const hx = x + 0.1 + (k * (ow - 0.2)) / Math.max(1, n - 1);
          box(group, 0.02, 0.02, 0.07, mats.brass, hx, 1.72, 0.045);
          if (k % 2 === 0) box(group, 0.32, 0.72, 0.1, clothes[(k + 2) % clothes.length], hx, 1.34, 0.12, { rounded: true, radius: 0.04 });
        }
        if (p.lights) { ledStrip(group, ow - 0.06, cx, shelfY - 0.016, D * 0.8); addLight(group, cx, shelfY - 0.3, D + 0.3, 3, 1.8); }
      }
      if (p.hwBench) {
        const bw = Math.min(ow - 0.04, 1.4);
        const bx = x + 0.02 + bw / 2;
        [0.06, 0.24].forEach(y => box(group, bw, 0.02, D - 0.04, body, bx, y, (D - 0.04) / 2));
        box(group, bw, 0.03, D - 0.02, body, bx, 0.43, (D - 0.02) / 2);
        box(group, bw - 0.02, 0.06, D - 0.06, fabricMaterial(fabricOf(p)), bx, 0.475, (D - 0.02) / 2, { rounded: true, radius: 0.025 });
        box(group, 0.018, 0.43, D - 0.04, body, bx - bw / 2 + 0.009, 0.215, (D - 0.04) / 2);
        box(group, 0.018, 0.43, D - 0.04, body, bx + bw / 2 - 0.009, 0.215, (D - 0.04) / 2);
        for (let k = 0; k < Math.floor(bw / 0.16); k += 1) [0.08, 0.26].forEach((y, row) => box(group, 0.1, 0.07, 0.24, clothes[(k + row * 3) % clothes.length], bx - bw / 2 + 0.1 + k * 0.16, y + 0.045, D / 2, { rounded: true, radius: 0.03 }));
      }
      if (p.hwKeys) {
        const kw = Math.min(0.45, ow - 0.08);
        const kx = W / 2 - 0.04 - kw / 2;
        box(group, kw, 0.02, 0.24, body, kx, 1.06, 0.13);
        drawer(group, { w: kw, h: 0.11, x: kx, y: 0.995, z: 0.24, depth: 0.22, spec: finish, style: 'smooth', handles: p.handles });
      }
      if (p.hwMirror && !p.hwClosed) {
        const mirror = new THREE.Group();
        mirror.position.set(W / 2 - 0.28, 1.45, 0.02);
        frontPanel(mirror, 0.42, 0.9, finish, 'mirror');
        group.add(mirror);
      }
    }
    if (mezzH) {
      shell(group, W, mezzH, D - DT, body, -W / 2, topY, 0);
      const n = Math.max(1, Math.round(W / 0.6));
      for (let i = 0; i < n; i += 1) hingedDoor(group, { w: W / n, h: mezzH, x: -W / 2 + (W / n) * (i + 0.5), y: topY + mezzH / 2, z: D - DT / 2, hinge: i % 2 ? 'right' : 'left', spec: finish, style: p.style === 'classic' ? 'classic' : 'smooth', handles: 'hidden' });
    }
    dimension(dims, [-W / 2, 0, D], [W / 2, 0, D], [0, 0, 0.2]);
    dimension(dims, [W / 2, 0, D], [W / 2, H, D], [0.12, 0, 0]);
    dimension(dims, [W / 2, H, 0], [W / 2, H, D], [0.12, 0.05, 0]);
    group.add(dims);
    return { group, dims };
  }

  /* ----- bedroom ----- */
  function bedsideTable(group, p, x, finish) {
    if (p.bedside === 'none') return;
    const w = 0.5;
    const d = 0.4;
    const floating = p.bedside === 'floating';
    const h = floating ? 0.3 : 0.48;
    const y0 = floating ? 0.32 : 0.14;
    box(group, w, h, d - DT, surface(finish, 0.55), x, y0 + h / 2, 0.06 + (d - DT) / 2, { rounded: true });
    if (!floating) [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([sx, sz]) => box(group, 0.025, y0, 0.025, mats.brass, x + sx * (w / 2 - 0.04), y0 / 2, 0.06 + d / 2 + sz * (d / 2 - 0.05)));
    const rows = floating ? 1 : 2;
    for (let r = 0; r < rows; r += 1) drawer(group, { w, h: h / rows, x, y: y0 + (h / rows) * (r + 0.5), z: 0.06 + d - DT / 2, depth: d, spec: finish, style: p.style === 'vitrine' || p.style === 'glass' ? 'smooth' : p.style, handles: p.handles });
    if (floating && p.lights) ledStrip(group, w - 0.06, x, y0 - 0.006, 0.06 + d / 2);
  }

  function buildBedroom(p) {
    const group = new THREE.Group();
    const dims = new THREE.Group();
    const W = p.bedWidth;
    const L = 2.1;
    const fabric = fabricMaterial(fabricOf(p));
    const finish = finishOf(p);
    const span = W + 0.3 + (p.bedside !== 'none' ? 1.3 : 0.4);
    buildRoom(group, p, { width: span + 5 });
    const back = 0.06;
    let headTop;
    if (p.headboard === 'cushion') {
      headTop = 0.95;
      const cushion = box(group, W + 0.16, 0.42, 0.2, fabric, 0, 0.72, back + 0.12, { rounded: true, radius: 0.09 });
      cushion.rotation.x = -0.1;
    } else if (p.headboard === 'channels') {
      headTop = 1.47;
      const width = W + 0.24;
      const n = Math.max(7, Math.round(width / 0.15));
      const cw = width / n;
      for (let i = 0; i < n; i += 1) {
        const h = 1.15 + (Math.abs(i - (n - 1) / 2) < n / 4 ? 0.12 : 0);
        box(group, cw - 0.006, h, 0.1, fabric, -width / 2 + cw * (i + 0.5), 0.2 + h / 2, back + 0.05, { rounded: true, radius: 0.045 });
      }
    } else {
      headTop = 2.67;
      const width = span + 0.2;
      const n = Math.max(10, Math.round(width / 0.2));
      const cw = width / n;
      for (let i = 0; i < n; i += 1) box(group, cw - 0.006, 2.62, 0.07, fabric, -width / 2 + cw * (i + 0.5), 1.36, back + 0.035, { rounded: true, radius: 0.03 });
    }
    if (p.lights) {
      ledStrip(group, W, 0, Math.min(headTop, 2.6) + 0.01, back + 0.02);
      addLight(group, 0, Math.min(headTop, 2.4) + 0.05, 0.45, 5, 2.4);
    }
    const zb = back + 0.16;
    box(group, W + 0.12, 0.08, L - 0.1, mats.plinth, 0, 0.04, zb + L / 2);
    box(group, W + 0.16, 0.26, L, fabric, 0, 0.21, zb + L / 2, { rounded: true, radius: 0.05 });
    box(group, W, 0.22, L - 0.12, mats.mattress, 0, 0.45, zb + L / 2 - 0.02, { rounded: true, radius: 0.06 });
    box(group, W + 0.04, 0.08, L * 0.62, mats.linen, 0, 0.58, zb + L * 0.66, { rounded: true, radius: 0.04 });
    box(group, W + 0.06, 0.04, 0.5, fabric, 0, 0.62, zb + L * 0.8, { rounded: true, radius: 0.02 });
    const pillows = W >= 1.6 ? 2 : 1;
    for (let i = 0; i < pillows; i += 1) box(group, Math.min(0.7, W / pillows - 0.08), 0.14, 0.4, mats.linen, pillows === 1 ? 0 : (i === 0 ? -1 : 1) * (W / 4), 0.62, zb + 0.32, { rounded: true, radius: 0.06 });
    bedsideTable(group, p, -(W / 2 + 0.42), finish);
    bedsideTable(group, p, W / 2 + 0.42, finish);
    dimension(dims, [-W / 2 - 0.08, 0.02, zb + L], [W / 2 + 0.08, 0.02, zb + L], [0, 0, 0.2], `${cm(W)} — спальное место`);
    dimension(dims, [W / 2 + 0.08, 0.02, zb], [W / 2 + 0.08, 0.02, zb + L], [0.18, 0, 0], '200 см');
    dimension(dims, [-(W / 2 + 0.2), 0, 0.12], [-(W / 2 + 0.2), headTop, 0.12], [0, 0, 0.12]);
    group.add(dims);
    return { group, dims };
  }

  /* ----- living room / TV wall ----- */
  function buildLiving(p) {
    const group = new THREE.Group();
    const dims = new THREE.Group();
    const W = p.livingWidth;
    const finish = finishOf(p);
    const body = surface(finish, 0.55);
    buildRoom(group, p, { width: W + 5 });
    const towers = p.living === 'low' ? 0 : Math.min(0.9, W * 0.22);
    const cabW = p.living === 'low' ? Math.min(W, 2.6) : W - towers * 2;
    const cabH = 0.42;
    const cabY = 0.22;
    const cabD = 0.42;
    shell(group, cabW, cabH, cabD - DT, body, -cabW / 2, cabY, 0);
    const n = Math.max(2, Math.round(cabW / 0.6));
    const fw = cabW / n;
    const fireplace = p.living === 'system' && p.fireplace;
    for (let i = 0; i < n; i += 1) {
      const x = -cabW / 2 + fw * (i + 0.5);
      if (fireplace && i === Math.floor(n / 2)) {
        box(group, fw - 0.02, cabH - 0.04, 0.02, mats.glassBlack, x, cabY + cabH / 2, cabD - 0.02);
        box(group, fw * 0.6, 0.05, 0.03, mats.flame, x, cabY + 0.1, cabD - 0.06, { cast: false });
        addLight(group, x, cabY + 0.2, cabD + 0.1, 3, 1.4);
      } else if (i % 2) {
        hingedDoor(group, { w: fw, h: cabH, x, y: cabY + cabH / 2, z: cabD - DT / 2, hinge: 'right', spec: finish, style: p.style, handles: p.handles });
      } else {
        drawer(group, { w: fw, h: cabH, x, y: cabY + cabH / 2, z: cabD - DT / 2, depth: cabD, spec: finish, style: p.style, handles: p.handles });
      }
    }
    if (p.lights) {
      ledStrip(group, cabW - 0.06, 0, cabY - 0.006, cabD / 2);
      addLight(group, 0, cabY - 0.05, cabD + 0.15, 3, 1.4);
    }
    let topH = cabY + cabH;
    if (p.living === 'system') {
      // Wood panel with brass inserts behind the TV, as in the «Гостиная как система» project.
      const panelW = Math.min(cabW * 0.7, 2.4);
      box(group, panelW, 2.66, 0.04, surface(FINISHES.veneer[1], 0.6), 0, 1.33, 0.02);
      [-0.36, -0.12, 0.12, 0.36].forEach(f => box(group, 0.018, 2.66, 0.046, mats.brass, f * panelW, 1.33, 0.024));
      topH = 2.66;
    }
    const tvW = Math.min(1.6, cabW * 0.6);
    box(group, tvW, tvW * 0.5625, 0.04, mats.screen, 0, 1.25, p.living === 'system' ? 0.07 : 0.03);
    if (towers) {
      [-1, 1].forEach(side => {
        const x0 = side < 0 ? -W / 2 : W / 2 - towers;
        const h = 2.4;
        shell(group, towers, h, 0.34, body, x0, 0, 0);
        const levels = Math.max(1, Math.min(9, p.shelfCount)) + 1;
        for (let k = 1; k < levels; k += 1) {
          const y = (k * h) / levels + (k % 2 ? 0.03 : -0.03);
          box(group, towers - 0.036, 0.02, 0.32, body, x0 + towers / 2, y, 0.17, { cast: false });
          if (k % 2) box(group, 0.12, 0.18, 0.16, clothes[(k + (side > 0 ? 3 : 0)) % clothes.length], x0 + towers * (0.3 + 0.1 * side), y + 0.1, 0.18, { rounded: true, radius: 0.02 });
          if (p.innerLights) ledStrip(group, towers - 0.06, x0 + towers / 2, y - 0.012, 0.3);
        }
        box(group, 0.016, h - 0.04, 0.02, mats.brass, x0 + (side < 0 ? towers * 0.62 : towers * 0.38), h / 2, 0.33);
      });
      topH = Math.max(topH, 2.4);
    }
    dimension(dims, [-W / 2, 0.02, 0.45], [W / 2, 0.02, 0.45], [0, 0, 0.2]);
    dimension(dims, [W / 2, 0, 0.45], [W / 2, topH, 0.45], [0.12, 0, 0]);
    group.add(dims);
    return { group, dims };
  }

  /* ----- floor ----- */
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), mats.carcass);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  floor.userData.room = true;
  scene.add(floor);
  function setFloor(spec) {
    floor.material = material(`floor${spec.id}`, () => {
      const map = floorTexture(spec).clone();
      map.repeat.set(30 / 1.1, 30 / 1.1);
      map.needsUpdate = true;
      return standard({ map, roughness: spec.stone ? 0.35 : 0.75 });
    });
  }

  /* ----- labels, camera, animation ----- */
  let current = null;
  let currentDims = null;
  let labelEls = [];
  function buildLabels() {
    labelsLayer.replaceChildren();
    labelEls = dimItems.map(item => {
      const el = document.createElement('span');
      el.className = `dim-label${item.small ? ' dim-label-small' : ''}`;
      el.textContent = item.text;
      labelsLayer.append(el);
      return el;
    });
  }
  const projected = new THREE.Vector3();
  function placeLabels() {
    labelsLayer.hidden = !state.dims;
    if (currentDims) currentDims.visible = state.dims;
    if (!state.dims) return;
    const { clientWidth: w, clientHeight: h } = stageCanvas;
    dimItems.forEach((item, index) => {
      projected.copy(item.position).project(camera);
      const el = labelEls[index];
      const inView = projected.z < 1 && Math.abs(projected.x) < 1.05 && Math.abs(projected.y) < 1.05;
      el.hidden = !inView;
      if (inView) el.style.transform = `translate(${((projected.x + 1) / 2) * w}px, ${((1 - projected.y) / 2) * h}px) translate(-50%, -50%)`;
    });
  }

  let tween = null;
  let framedType = '';
  function defaultDirection(params) {
    if (params.type === 'walkin' && params.walkLayout !== 'line') return new THREE.Vector3(0.14, 0.55, 1).normalize();
    if (params.type === 'kitchen' && params.layout === 'u') return new THREE.Vector3(0.12, 0.48, 1).normalize();
    if (params.type === 'bedroom') return new THREE.Vector3(0.5, 0.42, 1).normalize();
    return new THREE.Vector3(0.4, 0.32, 1).normalize();
  }
  /** Fits the furniture (not the room) into the view and keeps it centred on any screen. */
  function frame({ resetAngle = false, instant = false } = {}) {
    current.updateMatrixWorld(true);
    const bounds = new THREE.Box3();
    current.traverse(object => { if (object.isMesh && !object.userData.room) bounds.expandByObject(object); });
    const sphere = bounds.getBoundingSphere(new THREE.Sphere());
    const vertical = THREE.MathUtils.degToRad(camera.fov);
    const horizontal = 2 * Math.atan(Math.tan(vertical / 2) * camera.aspect);
    const distance = (sphere.radius / Math.sin(Math.min(vertical, horizontal) / 2)) * 1.04;
    const direction = resetAngle || !framedType ? defaultDirection(lastParams) : camera.position.clone().sub(controls.target).normalize();
    // Tabs sit over the top of the stage: aim slightly higher so the model sits a little lower on screen.
    const target = sphere.center.clone().add(new THREE.Vector3(0, sphere.radius * 0.06, 0));
    const position = target.clone().addScaledVector(direction, distance);
    controls.minDistance = distance * 0.4;
    controls.maxDistance = distance * 1.8;
    scene.fog.near = distance * 1.2;
    scene.fog.far = distance * 3.4;
    if (instant) {
      controls.target.copy(target);
      camera.position.copy(position);
      tween = null;
      controls.update();
    } else {
      tween = { fromTarget: controls.target.clone(), toTarget: target, fromPosition: camera.position.clone(), toPosition: position, t: 0 };
    }
    requestRender();
  }

  function settleAnimated(instant) {
    let moving = false;
    for (const item of animated) {
      const target = state.open ? item.open : item.closed;
      const value = item.object[item.key][item.axis];
      const next = instant ? target : value + (target - value) * 0.14;
      const done = Math.abs(next - target) <= 0.0005;
      item.object[item.key][item.axis] = done ? target : next;
      if (!done) moving = true;
    }
    return moving;
  }

  function update(params, { resetView = false, instant = false } = {}) {
    if (!params) return;
    if (current) { scene.remove(current); geometries.splice(0).forEach(geometry => geometry.dispose()); }
    animated = [];
    dimItems = [];
    const built = { kitchen: buildKitchen, wardrobe: buildWardrobe, walkin: buildWalkin, shelving: buildShelving, chest: buildChest, hallway: buildHallway, bedroom: buildBedroom, living: buildLiving }[params.type](params);
    current = built.group;
    currentDims = built.dims;
    scene.add(current);
    setFloor(byId(FLOORS, params.floor));
    settleAnimated(true);
    buildLabels();
    const layoutKey = `${params.type}:${params.layout}:${params.walkLayout}:${params.wardShape}`;
    frame({ resetAngle: resetView || framedType !== layoutKey, instant: instant || !framedType });
    framedType = layoutKey;
  }

  function resize() {
    const { clientWidth: width, clientHeight: height } = stageCanvas;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    if (current) frame({ instant: true });
    requestRender();
  }
  new ResizeObserver(resize).observe(stageCanvas);

  let visible = true;
  let idleFrames = 0;
  function loop() {
    let moving = settleAnimated(false);
    if (tween) {
      tween.t = Math.min(1, tween.t + 0.07);
      const k = 1 - (1 - tween.t) ** 3;
      controls.target.lerpVectors(tween.fromTarget, tween.toTarget, k);
      camera.position.lerpVectors(tween.fromPosition, tween.toPosition, k);
      if (tween.t >= 1) tween = null;
      moving = true;
    }
    if (controls.update()) moving = true;
    renderer.render(scene, camera);
    placeLabels();
    idleFrames = moving ? 0 : idleFrames + 1;
    if (!visible || idleFrames > 60) renderer.setAnimationLoop(null);
  }
  function requestRender() { idleFrames = 0; if (visible) renderer.setAnimationLoop(loop); }
  controls.addEventListener('start', () => { tween = null; requestRender(); });
  controls.addEventListener('change', requestRender);
  new IntersectionObserver(entries => {
    visible = entries.some(entry => entry.isIntersecting);
    if (visible) requestRender();
  }).observe(stageCanvas);
  resize();

  /** Picture for the manager: the model as the visitor set it up, with every dimension signed. */
  function snapshot({ width = 1280, height = 860 } = {}) {
    if (!current) return '';
    const previousSize = renderer.getSize(new THREE.Vector2());
    const previousRatio = renderer.getPixelRatio();
    const previousAspect = camera.aspect;
    const previousPosition = camera.position.clone();
    const previousTarget = controls.target.clone();
    try {
      renderer.setPixelRatio(1);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      tween = null;
      frame({ instant: true });
      settleAnimated(true);
      if (currentDims) currentDims.visible = true;
      renderer.render(scene, camera);
      const band = 170;
      const out = document.createElement('canvas');
      out.width = width;
      out.height = height + band;
      const ctx = out.getContext('2d');
      ctx.fillStyle = '#ebe7de';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(renderer.domElement, 0, 0, width, height);
      const font = getComputedStyle(document.body).fontFamily || 'Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      dimItems.forEach(item => {
        projected.copy(item.position).project(camera);
        if (projected.z >= 1 || Math.abs(projected.x) > 1.05 || Math.abs(projected.y) > 1.05) return;
        const x = ((projected.x + 1) / 2) * width;
        const y = ((1 - projected.y) / 2) * height;
        ctx.font = `700 ${item.small ? 19 : 23}px ${font}`;
        const w = ctx.measureText(item.text).width + 22;
        const h = item.small ? 32 : 38;
        ctx.fillStyle = 'rgba(255, 255, 255, .94)';
        ctx.strokeStyle = 'rgba(20, 25, 23, .25)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(x - w / 2, y - h / 2, w, h, h / 2); else ctx.rect(x - w / 2, y - h / 2, w, h);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#141917';
        ctx.fillText(item.text, x, y + 1);
      });
      ctx.fillStyle = '#0c0e0e';
      ctx.fillRect(0, height, width, band);
      ctx.textAlign = 'left';
      ctx.fillStyle = '#c5a875';
      ctx.font = `700 22px ${font}`;
      ctx.fillText('Проект из 3D-конструктора · ' + (window.ariella?.site?.brand || ''), 36, height + 36);
      ctx.fillStyle = '#eeeae2';
      ctx.font = `500 21px ${font}`;
      const words = specText(lastParams).split(' ');
      let line = '';
      let lineY = height + 76;
      for (const word of words) {
        const test = line ? `${line} ${word}` : word;
        if (ctx.measureText(test).width > width - 72 && line) {
          ctx.fillText(line, 36, lineY);
          line = word;
          lineY += 30;
          if (lineY > height + band - 50) break;
        } else line = test;
      }
      if (line && lineY <= height + band - 50) ctx.fillText(line, 36, lineY);
      ctx.fillStyle = '#e7d2a9';
      ctx.font = `700 22px ${font}`;
      ctx.fillText(`Ориентировочно: ${priceOut.textContent}${PRICING.confirmed ? '' : ' (демо-расчёт)'}`, 36, height + band - 26);
      // Stay well under hosting request limits (~1 MB).
      const picture = out.toDataURL('image/jpeg', 0.84);
      return picture.length > 900000 ? out.toDataURL('image/jpeg', 0.66) : picture;
    } catch (error) {
      console.error(error);
      return '';
    } finally {
      renderer.setPixelRatio(previousRatio);
      renderer.setSize(previousSize.x, previousSize.y, false);
      camera.aspect = previousAspect;
      camera.updateProjectionMatrix();
      camera.position.copy(previousPosition);
      controls.target.copy(previousTarget);
      controls.update();
      if (currentDims) currentDims.visible = state.dims;
      requestRender();
    }
  }

  return {
    update,
    snapshot,
    refresh: requestRender,
    recenter() { if (current) frame({ resetAngle: true }); },
  };
}
