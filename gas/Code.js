const ADMIN_EMAIL = 'fanul.doang@gmail.com';
const MAX_RPC_BYTES = 100000;
const FULL_PROXY_RPC_HANDLERS = {
  getPublicData: getPublicData,
  getAdminData: getAdminData,
  saveAdminData: saveAdminData
};

function doGet(e) {
  if (e && e.parameter && e.parameter.__full_proxy_html === '1') {
    return jsonResponse_({ ok: true, html: HtmlService.createHtmlOutputFromFile('index').getContent() });
  }
  return HtmlService.createHtmlOutputFromFile('index').setTitle('Game Linktree');
}

function doPost(e) {
  try {
    const raw = (e && e.postData && e.postData.contents) || '{}';
    if (raw.length > MAX_RPC_BYTES) throw new Error('Payload terlalu besar.');
    rateLimit_();
    const request = JSON.parse(raw);
    if (!request || typeof request.functionName !== 'string') throw new Error('Request RPC tidak valid.');
    const handler = FULL_PROXY_RPC_HANDLERS[request.functionName];
    if (!handler) throw new Error('RPC function is not allowed.');
    const args = Array.isArray(request.args) ? request.args : [];
    return jsonResponse_({ ok: true, result: serializable_(handler.apply(null, args)) });
  } catch (error) {
    console.error(error && error.stack ? error.stack : error);
    return jsonResponse_({ ok: false, error: safeError_(error) });
  }
}

function getPublicData() {
  const data = readData_();
  const settings = data.settings || defaultData_().settings;
  const themes = Array.isArray(settings.themes) && settings.themes.length ? settings.themes : ['neon'];
  const days = Math.max(1, Number(settings.themeDays) || 3);
  const themeName = themes[Math.floor(Date.now() / 86400000 / days) % themes.length];
  return {
    profile: data.profile || {},
    news: (data.news || []).filter(function (item) { return item.active; }),
    links: (data.links || []).filter(function (item) { return item.active; }),
    theme: theme_(themeName)
  };
}

function getAdminData(adminKey) {
  assertAdmin_(adminKey);
  return readData_();
}

function saveAdminData(adminKey, input) {
  assertAdmin_(adminKey);
  const data = validateData_(input);
  const settings = data.settings;
  if (settings.driveFolderId) {
    const folder = DriveApp.getFolderById(settings.driveFolderId);
    const files = folder.getFilesByName('game-linktree-news.xml');
    const xml = newsXml_(data.news);
    if (files.hasNext()) files.next().setContent(xml); else folder.createFile('game-linktree-news.xml', xml, MimeType.XML);
  }
  PropertiesService.getScriptProperties().setProperty('APP_DATA', JSON.stringify(data));
  if (settings.spreadsheetId) appendAudit_(settings.spreadsheetId, 'saveAdminData');
  return { saved: true, savedAt: new Date().toISOString() };
}

function assertAdmin_(key) {
  const expected = PropertiesService.getScriptProperties().getProperty('ADMIN_KEY');
  if (!expected || typeof key !== 'string' || key.length < 16 || key !== expected) throw new Error('Akses admin ditolak.');
}

function validateData_(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Data tidak valid.');
  const clean = defaultData_();
  clean.profile = {
    title: text_(input.profile && input.profile.title, 100),
    bio: text_(input.profile && input.profile.bio, 500),
    avatarUrl: url_(input.profile && input.profile.avatarUrl)
  };
  clean.news = array_(input.news, 50).map(function (x) { return { id: id_(x.id), title: text_(x.title, 150), body: html_(x.body, 5000), imageUrl: url_(x.imageUrl), active: x.active === true }; });
  clean.links = array_(input.links, 100).map(function (x) { return { id: id_(x.id), label: text_(x.label, 100), url: url_(x.url, true), icon: text_(x.icon, 8), active: x.active === true }; });
  const s = input.settings || {};
  clean.settings = { driveFolderId: id_(s.driveFolderId, true), spreadsheetId: id_(s.spreadsheetId, true), themeDays: Math.min(365, Math.max(1, Number(s.themeDays) || 3)), themes: array_(s.themes, 20).map(function (x) { return text_(x, 30).toLowerCase(); }).filter(Boolean) };
  return clean;
}

function readData_() {
  const raw = PropertiesService.getScriptProperties().getProperty('APP_DATA');
  return raw ? JSON.parse(raw) : defaultData_();
}

function defaultData_() {
  return { profile: { title: 'Fanul Game Portal', bio: 'Pilih dunia, mulai petualangan.', avatarUrl: '' }, news: [{ id: 'welcome', title: 'Selamat datang', body: 'Portal game resmi sudah aktif!', imageUrl: '', active: true }], links: [{ id: 'community', label: 'Komunitas Game', url: 'https://github.com/fanul', icon: '🎮', active: true }], settings: { driveFolderId: '', spreadsheetId: '', themeDays: 3, themes: ['neon', 'fantasy', 'space'] } };
}

function theme_(name) {
  const themes = { neon: { '--bg': '#070917', '--glow': '#392b85' }, fantasy: { '--bg': '#120d08', '--glow': '#6a3617' }, space: { '--bg': '#020b19', '--glow': '#0b5780' } };
  return { name: name, variables: themes[name] || themes.neon };
}

function newsXml_(news) {
  const doc = XmlService.createDocument(XmlService.createElement('news'));
  (news || []).forEach(function (item) { const node = XmlService.createElement('item').setAttribute('id', item.id).setAttribute('active', String(item.active)); node.addContent(XmlService.createElement('title').setText(item.title)); node.addContent(XmlService.createElement('body').setText(item.body)); node.addContent(XmlService.createElement('imageUrl').setText(item.imageUrl)); doc.getRootElement().addContent(node); });
  return XmlService.getPrettyFormat().format(doc);
}

function appendAudit_(spreadsheetId, action) {
  const book = SpreadsheetApp.openById(spreadsheetId);
  const sheet = book.getSheetByName('audit_log') || book.insertSheet('audit_log');
  if (sheet.getLastRow() === 0) sheet.appendRow(['timestamp', 'admin', 'action']);
  sheet.appendRow([new Date().toISOString(), ADMIN_EMAIL, action]);
}

function rateLimit_() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) throw new Error('Server sibuk. Coba lagi.');
  try {
    const props = PropertiesService.getScriptProperties();
    const bucket = Math.floor(Date.now() / 60000);
    const key = 'RPC_RATE_' + bucket;
    const count = Number(props.getProperty(key) || 0) + 1;
    if (count > 300) throw new Error('Batas request terlampaui.');
    props.setProperty(key, String(count));
  } finally { lock.releaseLock(); }
}

function array_(value, max) { if (!Array.isArray(value)) return []; if (value.length > max) throw new Error('Terlalu banyak item.'); return value; }
function text_(value, max) { return String(value == null ? '' : value).trim().slice(0, max); }
function id_(value, optional) { const id = text_(value, 200); if (!id && optional) return ''; if (!/^[\w-]+$/.test(id)) throw new Error('ID tidak valid.'); return id; }
function url_(value, required) { const url = text_(value, 2000); if (!url && !required) return ''; if (!/^https:\/\//i.test(url)) throw new Error('URL harus HTTPS.'); return url; }
function html_(value, max) { return text_(value, max).replace(/<\/?(script|iframe|object|embed|style)[^>]*>/gi, '').replace(/\son\w+\s*=\s*(['"]).*?\1/gi, '').replace(/javascript:/gi, ''); }
function serializable_(value) { return JSON.parse(JSON.stringify(value)); }
function safeError_(error) { const message = error && error.message ? error.message : String(error || 'Terjadi kesalahan.'); return message.slice(0, 300); }
function jsonResponse_(value) { return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON); }
