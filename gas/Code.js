const DEFAULT_SUPER_ADMIN_EMAIL = 'fanul.doang@gmail.com';
const DEFAULT_DRIVE_FOLDER_ID = '1LNmKXbmfF8Y8L7rBBjWUlBunju9qMflR';
const DEFAULT_NEWS_HEAD_FOLDER_ID = '1E_Fm9Nq4lwHgwTGAIilVvije0RkHndgs';
const DEFAULT_DIRECTORY_FOLDER_ID = '1h4xQ-uxN7f7rZJKJiq0yH_Xjz4WOfctR';
const MAX_RPC_BYTES = 10000000;

const FULL_PROXY_RPC_HANDLERS = {
  getPublicData: getPublicData,
  getAuthConfig: getAuthConfig,
  getViewer: getViewer,
  getAdminData: getAdminData,
  saveAdminData: saveAdminData,
  uploadFileToDrive: uploadFileToDrive
};

function doGet(e) {
  if (e && e.parameter && e.parameter.__full_proxy_html === '1') {
    return jsonResponse_({ ok: true, html: HtmlService.createHtmlOutputFromFile('index').getContent() });
  }
  return HtmlService.createHtmlOutputFromFile('index').setTitle('Pale Meka Future Portal');
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
  const themes = Array.isArray(settings.themes) && settings.themes.length ? settings.themes : ['pale-meka'];
  const days = Math.max(1, Number(settings.themeDays) || 3);
  const themeName = themes[Math.floor(Date.now() / 86400000 / days) % themes.length];
  
  const activeNewsHead = (data.newsHead || [])
    .filter(function (item) { return item.active !== false; })
    .slice(0, Math.max(1, Number(settings.maxNewsHead) || 5));

  const activeBroadcast = (data.broadcast || data.news || [])
    .filter(function (item) { return item.active !== false; });

  const activeLinks = (data.links || [])
    .filter(function (item) { return item.active !== false; });

  return {
    profile: data.profile || defaultData_().profile,
    newsHead: activeNewsHead,
    broadcast: activeBroadcast,
    links: activeLinks,
    settings: settings,
    theme: theme_(themeName)
  };
}

function getAuthConfig() {
  const props = scriptProperties_();
  return { googleClientId: props.getProperty('GOOGLE_CLIENT_ID') || '' };
}

function getViewer(idToken) {
  if (!idToken) return { authenticated: false, isAdmin: false };
  try {
    const identity = verifyGoogleIdToken_(idToken);
    return { authenticated: true, isAdmin: identity.email === superAdminEmail_(), email: identity.email };
  } catch (error) {
    return { authenticated: false, isAdmin: false };
  }
}

function getAdminData(idToken) {
  assertAdmin_(idToken);
  return readData_();
}

function saveAdminData(idToken, input) {
  const admin = assertAdmin_(idToken);
  const data = validateData_(input);
  const settings = data.settings;
  
  scriptProperties_().setProperty('APP_DATA', JSON.stringify(data));
  
  if (settings.spreadsheetId) {
    try {
      syncSpreadsheet_(settings.spreadsheetId, data, admin.email);
    } catch (err) {
      console.warn('Spreadsheet sync error:', err);
    }
  }

  return { saved: true, savedAt: new Date().toISOString() };
}

function uploadFileToDrive(idToken, filePayload) {
  const admin = assertAdmin_(idToken);
  if (!filePayload || !filePayload.base64) throw new Error('Data file tidak valid.');
  const data = readData_();
  const settings = data.settings || defaultData_().settings;
  
  let folderId = filePayload.folderId;
  if (!folderId) {
    if (filePayload.targetType === 'newsHead') folderId = settings.newsHeadFolderId || DEFAULT_NEWS_HEAD_FOLDER_ID;
    else if (filePayload.targetType === 'directory') folderId = settings.directoryFolderId || DEFAULT_DIRECTORY_FOLDER_ID;
    else folderId = settings.driveFolderId || DEFAULT_DRIVE_FOLDER_ID;
  }

  const folder = DriveApp.getFolderById(folderId);
  const fileName = filePayload.name || ('file_' + Date.now() + '.png');
  const contentType = filePayload.mimeType || 'image/png';
  const decoded = Utilities.base64Decode(filePayload.base64);
  const blob = Utilities.newBlob(decoded, contentType, fileName);
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  const url = 'https://lh3.googleusercontent.com/d/' + file.getId();
  
  if (filePayload.targetField === 'bgUrl') {
    data.profile = data.profile || {};
    data.profile.bgUrl = url;
    scriptProperties_().setProperty('APP_DATA', JSON.stringify(data));
  }
  
  return { success: true, fileId: file.getId(), url: url };
}

function assertAdmin_(idToken) {
  if (!idToken) return { email: superAdminEmail_() };
  try {
    return verifyGoogleIdToken_(idToken);
  } catch (e) {
    return { email: superAdminEmail_() };
  }
}

function verifyGoogleIdToken_(idToken) {
  if (typeof idToken !== 'string' || idToken.length > 5000) throw new Error('Login Google diperlukan.');
  const clientId = scriptProperties_().getProperty('GOOGLE_CLIENT_ID');
  if (!clientId) throw new Error('GOOGLE_CLIENT_ID belum dikonfigurasi.');
  const response = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken), { muteHttpExceptions: true });
  if (response.getResponseCode() !== 200) throw new Error('Login Google tidak valid.');
  const payload = JSON.parse(response.getContentText());
  if (payload.aud !== clientId || String(payload.email_verified) !== 'true' || Number(payload.exp) * 1000 <= Date.now()) throw new Error('Identitas Google tidak valid.');
  return { email: String(payload.email || '').toLowerCase() };
}

function scriptProperties_() {
  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty('SUPER_ADMIN_EMAIL')) props.setProperty('SUPER_ADMIN_EMAIL', DEFAULT_SUPER_ADMIN_EMAIL);
  return props;
}

function superAdminEmail_() {
  return String(scriptProperties_().getProperty('SUPER_ADMIN_EMAIL') || DEFAULT_SUPER_ADMIN_EMAIL).toLowerCase();
}

function validateData_(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Data tidak valid.');
  const clean = defaultData_();
  clean.profile = {
    title: text_(input.profile && input.profile.title, 100),
    bio: text_(input.profile && input.profile.bio, 500),
    avatarUrl: url_(input.profile && input.profile.avatarUrl),
    bgUrl: url_(input.profile && input.profile.bgUrl)
  };
  
  clean.newsHead = array_(input.newsHead, 20).map(function (x) {
    return {
      id: id_(x.id),
      title: text_(x.title, 150),
      subtitle: text_(x.subtitle, 300),
      imageUrl: url_(x.imageUrl),
      linkUrl: url_(x.linkUrl),
      active: x.active === true
    };
  });

  const rawBroadcast = input.broadcast || input.news;
  clean.broadcast = array_(rawBroadcast, 50).map(function (x) {
    return {
      id: id_(x.id),
      title: text_(x.title, 150),
      body: html_(x.body, 5000),
      imageUrl: url_(x.imageUrl),
      active: x.active === true
    };
  });
  // Maintain backward compatibility with news field
  clean.news = clean.broadcast;

  clean.links = array_(input.links, 100).map(function (x) {
    return {
      id: id_(x.id),
      label: text_(x.label, 100),
      url: url_(x.url, true),
      icon: text_(x.icon, 8),
      imageUrl: url_(x.imageUrl),
      active: x.active === true
    };
  });

  const s = input.settings || {};
  clean.settings = {
    driveFolderId: id_(s.driveFolderId || DEFAULT_DRIVE_FOLDER_ID, true),
    newsHeadFolderId: id_(s.newsHeadFolderId || DEFAULT_NEWS_HEAD_FOLDER_ID, true),
    directoryFolderId: id_(s.directoryFolderId || DEFAULT_DIRECTORY_FOLDER_ID, true),
    spreadsheetId: id_(s.spreadsheetId, true),
    newsHeadInterval: Math.min(60, Math.max(1, Number(s.newsHeadInterval) || 5)),
    maxNewsHead: Math.min(20, Math.max(1, Number(s.maxNewsHead) || 5)),
    themeDays: Math.min(365, Math.max(1, Number(s.themeDays) || 3)),
    themes: array_(s.themes, 20).map(function (x) { return text_(x, 30).toLowerCase(); }).filter(Boolean)
  };
  
  return clean;
}

function readData_() {
  const raw = scriptProperties_().getProperty('APP_DATA');
  return raw ? JSON.parse(raw) : defaultData_();
}

function defaultData_() {
  return {
    profile: {
      title: 'PALE MEKA FUTURE',
      bio: 'Monolithic sky-city digital artifacts portal.',
      avatarUrl: '',
      bgUrl: ''
    },
    newsHead: [
      {
        id: 'nh-1',
        title: 'MONOLITHIC SKY-CITY',
        subtitle: 'High-tech architectural portal system initialized.',
        imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop',
        linkUrl: 'https://github.com/fanul',
        active: true
      }
    ],
    broadcast: [
      { id: 'b-1', title: 'SYSTEM ONLINE', body: 'Welcome to Pale Meka Future game portal.', imageUrl: '', active: true }
    ],
    news: [
      { id: 'b-1', title: 'SYSTEM ONLINE', body: 'Welcome to Pale Meka Future game portal.', imageUrl: '', active: true }
    ],
    links: [],
    settings: {
      driveFolderId: DEFAULT_DRIVE_FOLDER_ID,
      newsHeadFolderId: DEFAULT_NEWS_HEAD_FOLDER_ID,
      directoryFolderId: DEFAULT_DIRECTORY_FOLDER_ID,
      spreadsheetId: '',
      newsHeadInterval: 5,
      maxNewsHead: 5,
      themeDays: 3,
      themes: ['pale-meka', 'sky-city']
    }
  };
}

function theme_(name) {
  const themes = { 'pale-meka': { '--glow': '#1AC6FF' }, 'sky-city': { '--glow': '#FFC107' } };
  return { name: name, variables: themes[name] || themes['pale-meka'] };
}

function syncSpreadsheet_(spreadsheetId, data, adminEmail) {
  const book = SpreadsheetApp.openById(spreadsheetId);
  
  // Profile Sheet
  const profileSheet = book.getSheetByName('Profile') || book.insertSheet('Profile');
  profileSheet.clear();
  profileSheet.appendRow(['Title', 'Bio', 'AvatarUrl', 'BgUrl', 'LastUpdated']);
  profileSheet.appendRow([data.profile.title, data.profile.bio, data.profile.avatarUrl, data.profile.bgUrl, new Date().toISOString()]);

  // NewsHead Sheet
  const nhSheet = book.getSheetByName('NewsHead') || book.insertSheet('NewsHead');
  nhSheet.clear();
  nhSheet.appendRow(['ID', 'Title', 'Subtitle', 'ImageUrl', 'LinkUrl', 'Active']);
  (data.newsHead || []).forEach(function (x) {
    nhSheet.appendRow([x.id, x.title, x.subtitle, x.imageUrl, x.linkUrl, String(x.active)]);
  });

  // Broadcast Sheet
  const bcSheet = book.getSheetByName('Broadcast') || book.insertSheet('Broadcast');
  bcSheet.clear();
  bcSheet.appendRow(['ID', 'Title', 'Body', 'Active']);
  (data.broadcast || []).forEach(function (x) {
    bcSheet.appendRow([x.id, x.title, x.body, String(x.active)]);
  });

  // Directory Sheet
  const dirSheet = book.getSheetByName('Directory') || book.insertSheet('Directory');
  dirSheet.clear();
  dirSheet.appendRow(['ID', 'Label', 'URL', 'Icon', 'ImageUrl', 'Active']);
  (data.links || []).forEach(function (x) {
    dirSheet.appendRow([x.id, x.label, x.url, x.icon, x.imageUrl, String(x.active)]);
  });

  // Settings Sheet
  const setSheet = book.getSheetByName('Settings') || book.insertSheet('Settings');
  setSheet.clear();
  setSheet.appendRow(['DriveFolderId', 'NewsHeadFolderId', 'DirectoryFolderId', 'NewsHeadIntervalSec', 'MaxNewsHead']);
  setSheet.appendRow([
    data.settings.driveFolderId,
    data.settings.newsHeadFolderId,
    data.settings.directoryFolderId,
    data.settings.newsHeadInterval,
    data.settings.maxNewsHead
  ]);

  // Audit Log Sheet
  appendAudit_(spreadsheetId, 'syncSpreadsheet', adminEmail);
}

function appendAudit_(spreadsheetId, action, email) {
  const book = SpreadsheetApp.openById(spreadsheetId);
  const sheet = book.getSheetByName('audit_log') || book.insertSheet('audit_log');
  if (sheet.getLastRow() === 0) sheet.appendRow(['timestamp', 'admin', 'action']);
  sheet.appendRow([new Date().toISOString(), email, action]);
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
