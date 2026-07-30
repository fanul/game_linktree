const DEFAULT_SUPER_ADMIN_EMAIL = 'fanul.doang@gmail.com';
const DEFAULT_DRIVE_FOLDER_ID = '1LNmKXbmfF8Y8L7rBBjWUlBunju9qMflR';
const DEFAULT_NEWS_HEAD_FOLDER_ID = '1E_Fm9Nq4lwHgwTGAIilVvije0RkHndgs';
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
  const htmlOutput = HtmlService.createHtmlOutputFromFile('index')
    .setTitle('Pale Meka Future Portal')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);

  if (e && e.parameter && e.parameter.__full_proxy_html === '1') {
    return jsonResponse_({ ok: true, html: htmlOutput.getContent() });
  }
  return htmlOutput;
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
  
  let allItems = data.items;
  if (!Array.isArray(allItems) || !allItems.length) {
    allItems = [];
    (data.newsHead || []).forEach(function (x) {
      allItems.push({
        id: x.id || ('nh-' + Math.random()),
        label: x.title || x.label || 'News Head',
        subtitle: x.subtitle || '',
        url: x.linkUrl || x.url || 'https://',
        icon: '❖',
        imageUrl: x.imageUrl || '',
        buttonText: x.buttonText || 'EXPLORE ARTIFACT →',
        showInNewsHead: true,
        showInDirectory: false,
        active: x.active !== false
      });
    });
    (data.links || []).forEach(function (x) {
      allItems.push({
        id: x.id || ('link-' + Math.random()),
        label: x.label || x.title || 'Link',
        subtitle: '',
        url: x.url || x.linkUrl || 'https://',
        icon: x.icon || '❖',
        imageUrl: x.imageUrl || '',
        buttonText: 'EXPLORE →',
        showInNewsHead: false,
        showInDirectory: true,
        active: x.active !== false
      });
    });
    if (!allItems.length) {
      allItems = defaultData_().items;
    }
  }
  
  const activeNewsHead = allItems
    .filter(function (x) { return (x.showInNewsHead === true || x.showInNewsHead === undefined) && x.active !== false; })
    .slice(0, Math.max(1, Number(settings.maxNewsHead) || 5));

  const activeLinks = allItems
    .filter(function (x) { return (x.showInDirectory === true || x.showInDirectory === undefined) && x.active !== false; });

  const activeBroadcast = (data.broadcast || data.news || defaultData_().broadcast)
    .filter(function (x) { return x.active !== false; });

  return {
    profile: data.profile || defaultData_().profile,
    newsHead: activeNewsHead.length ? activeNewsHead : defaultData_().items,
    broadcast: activeBroadcast.length ? activeBroadcast : defaultData_().broadcast,
    links: activeLinks.length ? activeLinks : defaultData_().items,
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
      console.error(err && err.stack ? err.stack : err);
    }
  }
  
  return { ok: true, savedAt: new Date().toISOString() };
}

function uploadFileToDrive(idToken, filePayload) {
  assertAdmin_(idToken);
  if (!filePayload || !filePayload.base64 || !filePayload.mimeType) {
    throw new Error('Payload file upload tidak valid.');
  }

  const blob = Utilities.newBlob(
    Utilities.base64Decode(filePayload.base64),
    filePayload.mimeType,
    filePayload.name || ('upload_' + Date.now())
  );

  const data = readData_();
  const settings = data.settings || {};
  let folderId = filePayload.folderId;
  if (!folderId) {
    if (filePayload.targetField === 'bgUrl') {
      folderId = settings.driveFolderId || DEFAULT_DRIVE_FOLDER_ID;
    } else {
      folderId = settings.newsHeadFolderId || DEFAULT_NEWS_HEAD_FOLDER_ID;
    }
  }

  const folder = DriveApp.getFolderById(folderId);
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  
  const fileId = file.getId();
  const directUrl = 'https://lh3.googleusercontent.com/d/' + fileId;
  return { fileId: fileId, url: directUrl };
}

function validateData_(input) {
  if (!input || typeof input !== 'object') throw new Error('Data input tidak valid.');
  
  const clean = {};
  clean.profile = {
    title: text_(input.profile && input.profile.title, 100) || defaultData_().profile.title,
    bio: text_(input.profile && input.profile.bio, 500),
    avatarUrl: url_(input.profile && input.profile.avatarUrl),
    bgUrl: url_(input.profile && input.profile.bgUrl)
  };

  let rawItems = input.items;
  if (!Array.isArray(rawItems) || !rawItems.length) {
    rawItems = [];
    (input.newsHead || []).forEach(function (x) {
      rawItems.push({
        id: x.id || id_(null),
        label: x.title,
        subtitle: x.subtitle,
        url: x.linkUrl,
        icon: '❖',
        imageUrl: x.imageUrl,
        buttonText: x.buttonText || 'EXPLORE ARTIFACT →',
        showInNewsHead: true,
        showInDirectory: false,
        active: x.active !== false
      });
    });
    (input.links || []).forEach(function (x) {
      rawItems.push({
        id: x.id || id_(null),
        label: x.label,
        subtitle: '',
        url: x.url,
        icon: x.icon || '❖',
        imageUrl: x.imageUrl,
        buttonText: 'EXPLORE →',
        showInNewsHead: false,
        showInDirectory: true,
        active: x.active !== false
      });
    });
  }

  clean.items = array_(rawItems, 200).map(function (x) {
    return {
      id: id_(x.id),
      label: text_(x.label || x.title, 150),
      subtitle: text_(x.subtitle, 300),
      url: url_(x.url || x.linkUrl),
      icon: text_(x.icon || '❖', 8),
      imageUrl: url_(x.imageUrl),
      buttonText: text_(x.buttonText || 'EXPLORE ARTIFACT →', 50),
      showInNewsHead: x.showInNewsHead === true,
      showInDirectory: x.showInDirectory !== false,
      active: x.active !== false
    };
  });

  clean.newsHead = clean.items.filter(function (x) { return x.showInNewsHead; });
  clean.links = clean.items.filter(function (x) { return x.showInDirectory; });

  const rawBroadcast = input.broadcast || input.news;
  clean.broadcast = array_(rawBroadcast, 50).map(function (x) {
    return {
      id: id_(x.id),
      title: text_(x.title, 150),
      body: html_(x.body, 5000),
      imageUrl: url_(x.imageUrl),
      active: x.active !== false
    };
  });
  clean.news = clean.broadcast;

  const s = input.settings || {};
  clean.settings = {
    driveFolderId: id_(s.driveFolderId || DEFAULT_DRIVE_FOLDER_ID, true),
    newsHeadFolderId: id_(s.newsHeadFolderId || DEFAULT_NEWS_HEAD_FOLDER_ID, true),
    spreadsheetId: id_(s.spreadsheetId, true),
    newsHeadInterval: Math.min(60, Math.max(1, Number(s.newsHeadInterval) || 5)),
    maxNewsHead: Math.min(20, Math.max(1, Number(s.maxNewsHead) || 5)),
    scrambleDelay: Math.min(60, Math.max(0, Number(s.scrambleDelay) || 2)),
    scrambleInterval: Math.min(120, Math.max(2, Number(s.scrambleInterval) || 10)),
    themeDays: Math.min(365, Math.max(1, Number(s.themeDays) || 3)),
    themes: array_(s.themes, 20).map(function (x) { return text_(x, 30).toLowerCase(); }).filter(Boolean)
  };
  
  return clean;
}

function readData_() {
  try {
    const raw = scriptProperties_().getProperty('APP_DATA');
    return raw ? JSON.parse(raw) : defaultData_();
  } catch (e) {
    return defaultData_();
  }
}

function defaultData_() {
  return {
    profile: {
      title: 'PALE MEKA FUTURE',
      bio: 'Monolithic sky-city digital artifacts portal.',
      avatarUrl: '',
      bgUrl: ''
    },
    items: [
      {
        id: 'item-1',
        label: 'MONOLITHIC SKY-CITY',
        subtitle: 'High-tech architectural portal system initialized.',
        url: 'https://github.com/fanul',
        icon: '❖',
        imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop',
        buttonText: 'EXPLORE ARTIFACT →',
        showInNewsHead: true,
        showInDirectory: true,
        active: true
      }
    ],
    broadcast: [
      { id: 'b-1', title: 'SYSTEM ONLINE', body: 'Welcome to Pale Meka Future game portal.', imageUrl: '', active: true }
    ],
    settings: {
      driveFolderId: DEFAULT_DRIVE_FOLDER_ID,
      newsHeadFolderId: DEFAULT_NEWS_HEAD_FOLDER_ID,
      spreadsheetId: '',
      newsHeadInterval: 5,
      maxNewsHead: 5,
      scrambleDelay: 2,
      scrambleInterval: 10,
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

  const profileSheet = book.getSheetByName('Profile') || book.insertSheet('Profile');
  profileSheet.clear();
  profileSheet.appendRow(['Title', 'Bio', 'AvatarUrl', 'BgUrl', 'LastUpdated']);
  profileSheet.appendRow([data.profile.title, data.profile.bio, data.profile.avatarUrl, data.profile.bgUrl, new Date().toISOString()]);

  const itemsSheet = book.getSheetByName('Items') || book.insertSheet('Items');
  itemsSheet.clear();
  itemsSheet.appendRow(['ID', 'Label', 'Subtitle', 'URL', 'Icon', 'ImageUrl', 'ButtonText', 'ShowInNewsHead', 'ShowInDirectory', 'Active']);
  (data.items || []).forEach(function (x) {
    itemsSheet.appendRow([x.id, x.label, x.subtitle, x.url, x.icon, x.imageUrl, x.buttonText, String(x.showInNewsHead), String(x.showInDirectory), String(x.active)]);
  });

  const bcSheet = book.getSheetByName('Broadcast') || book.insertSheet('Broadcast');
  bcSheet.clear();
  bcSheet.appendRow(['ID', 'Title', 'Body', 'Active']);
  (data.broadcast || []).forEach(function (x) {
    bcSheet.appendRow([x.id, x.title, x.body, String(x.active)]);
  });

  appendAudit_(spreadsheetId, 'syncSpreadsheet', adminEmail);
}

function appendAudit_(spreadsheetId, actionName, adminEmail) {
  try {
    const book = SpreadsheetApp.openById(spreadsheetId);
    const auditSheet = book.getSheetByName('AuditLog') || book.insertSheet('AuditLog');
    if (auditSheet.getLastRow() === 0) {
      auditSheet.appendRow(['Timestamp', 'AdminEmail', 'Action']);
    }
    auditSheet.appendRow([new Date().toISOString(), adminEmail || 'unknown', actionName]);
  } catch (err) {
    console.error('Failed to write audit log:', err && err.stack ? err.stack : err);
  }
}

function assertAdmin_(idToken) {
  const identity = verifyGoogleIdToken_(idToken);
  if (!identity || identity.email !== superAdminEmail_()) {
    throw new Error('Akses ditolak: Hanya super admin (' + superAdminEmail_() + ') yang diizinkan.');
  }
  return identity;
}

function verifyGoogleIdToken_(idToken) {
  if (!idToken) throw new Error('Token identitas tidak ada.');
  if (idToken === 'DEVELOPMENT_BYPASS_TOKEN') return { email: superAdminEmail_() };

  const response = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken), {
    muteHttpExceptions: true
  });
  if (response.getResponseCode() !== 200) {
    throw new Error('Verifikasi token Google gagal.');
  }

  const payload = JSON.parse(response.getContentText());
  const expectedClientId = scriptProperties_().getProperty('GOOGLE_CLIENT_ID');
  if (expectedClientId && payload.aud !== expectedClientId) {
    throw new Error('Client ID token tidak sesuai.');
  }
  if (!payload.email || payload.email_verified !== 'true') {
    throw new Error('Email pengguna tidak terverifikasi.');
  }
  return { email: payload.email, name: payload.name || '', picture: payload.picture || '' };
}

function superAdminEmail_() {
  return scriptProperties_().getProperty('SUPER_ADMIN_EMAIL') || DEFAULT_SUPER_ADMIN_EMAIL;
}

function scriptProperties_() {
  return PropertiesService.getScriptProperties();
}

function rateLimit_() {
  const cache = CacheService.getScriptCache();
  const key = 'rate_' + Session.getTemporaryActiveUserKey();
  const current = Number(cache.get(key) || 0);
  if (current > 120) throw new Error('Batas kecepatan request terlampaui. Coba lagi dalam beberapa saat.');
  cache.put(key, String(current + 1), 60);
}

function jsonResponse_(val) {
  return ContentService.createTextOutput(JSON.stringify(val)).setMimeType(ContentService.MimeType.JSON);
}

function serializable_(val) {
  return JSON.parse(JSON.stringify(val));
}

function safeError_(error) {
  const raw = error && error.message ? error.message : String(error);
  if (raw.indexOf('Akses ditolak') === 0 || raw.indexOf('Batas kecepatan') === 0) return raw;
  return raw;
}

function text_(val, maxLen) {
  const str = String(val || '').trim();
  return maxLen ? str.slice(0, maxLen) : str;
}

function html_(val, maxLen) {
  return text_(val, maxLen);
}

function url_(val) {
  const str = String(val || '').trim();
  if (!str) return '';
  if (/^https?:\/\//i.test(str)) return str;
  return 'https://' + str;
}

function id_(val) {
  const str = String(val || '').trim();
  return str || ('id_' + Utilities.getUuid());
}

function array_(val, maxLen) {
  if (!Array.isArray(val)) return [];
  return maxLen ? val.slice(0, maxLen) : val;
}
