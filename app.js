// basic navigation
const sections = {
    input: document.getElementById('section-input'),
    output: document.getElementById('section-output'),
    summary: document.getElementById('section-summary'),
    settings: document.getElementById('section-settings')
};

function showSection(name) {
    console.log('showSection', name);
    Object.values(sections).forEach(sec => sec.classList.remove('active'));
    sections[name].classList.add('active');
    if (name === 'input') {
        renderNotes();
    } else if (name === 'output') {
        renderOutput();
    } else if (name === 'summary') {
        renderSummary();
    }
}

document.getElementById('btnInput').addEventListener('click', () => showSection('input'));
document.getElementById('btnOutput').addEventListener('click', () => {
    showSection('output');
});
document.getElementById('btnSummary').addEventListener('click', () => {
    showSection('summary');
});
document.getElementById('btnSettings').addEventListener('click', () => showSection('settings'));

// storage helpers
function loadRecords() {
    try {
        // helper ensuring we always return an array even if stored data is corrupted
        const safeParse = (key) => {
            const raw = localStorage.getItem(key);
            if (!raw) return [];
            try {
                const v = JSON.parse(raw);
                return Array.isArray(v) ? v : [];
            } catch {
                // if JSON is invalid, reset the key and return empty array
                localStorage.removeItem(key);
                return [];
            }
        };

        const temps = safeParse('temps');
        const bps = safeParse('bps');
        const notes = safeParse('notes');
        return { temps, bps, notes };
    } catch (err) {
        console.error('loadRecords failed', err);
        // in case localStorage access throws, fall back to empty sets
        return { temps: [], bps: [], notes: [] };
    }
}

function saveRecords({ temps, bps, notes }) {
    localStorage.setItem('temps', JSON.stringify(temps));
    localStorage.setItem('bps', JSON.stringify(bps));
    localStorage.setItem('notes', JSON.stringify(notes));
}

function addTempRecord(value) {
    const { temps, bps, notes } = loadRecords();
    temps.push({ timestamp: new Date().toISOString(), temp: value });
    saveRecords({ temps, bps, notes });
    maybeAutoSync();
} 

function addBPRecord(sys, dia, pulse) {
    const { temps, bps, notes } = loadRecords();
    bps.push({ timestamp: new Date().toISOString(), sys, dia, pulse });
    saveRecords({ temps, bps, notes });
    maybeAutoSync();
} 

function addNoteRecord(text) {
    const { temps, bps, notes } = loadRecords();
    notes.push({ timestamp: new Date().toISOString(), text });
    saveRecords({ temps, bps, notes });
    maybeAutoSync();
}

// render notes buttons (used on input screen)
function renderNotes() {
    const { notes } = loadRecords();
    const notesContainer = document.querySelector('#notesContainer');
    if (!notesContainer) return;
    notesContainer.innerHTML = '';
    // show each distinct text only once (latest first), cap to 20 buttons
    const seen = new Set();
    let count = 0;
    notes.slice().reverse().forEach(r => {
        if (count >= 20) return; // stop if we've added enough
        if (seen.has(r.text)) return;
        seen.add(r.text);
        const btn = document.createElement('button');
        btn.textContent = r.text;
        btn.addEventListener('click', () => {
            addNoteRecord(r.text);
            msg.textContent = `メモ "${r.text}" を記録しました。`;
            renderNotes();
        });
        notesContainer.appendChild(btn);
        count++;
    });
}

// convert ISO timestamp to local string without T/Z
function formatTimestamp(ts) {
    try {
        const d = new Date(ts);
        return d.toLocaleString();
    } catch {
        return ts;
    }
}

function renderOutput() {
    const { temps, bps, notes } = loadRecords();
    const tbTemp = document.querySelector('#tblTemp tbody');
    const tbBP = document.querySelector('#tblBP tbody');
    const tbNotes = document.querySelector('#tblNotes tbody');
    tbTemp.innerHTML = '';
    temps.forEach(r => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${formatTimestamp(r.timestamp)}</td><td>${r.temp}</td>`;
        tbTemp.appendChild(tr);
    });
    tbBP.innerHTML = '';
    bps.forEach(r => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${formatTimestamp(r.timestamp)}</td><td>${r.sys}</td><td>${r.dia}</td><td>${r.pulse}</td>`;
        tbBP.appendChild(tr);
    });
    if (tbNotes) {
        tbNotes.innerHTML = '';
        notes.forEach(r => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${formatTimestamp(r.timestamp)}</td><td>${r.text}</td>`;
            tbNotes.appendChild(tr);
        });
    }
}

// summary helpers and renderer
// Get date key for summary (6 a.m. boundary using local time)
// Returns YYYY-MM-DD in LOCAL time, not UTC
function get6HourDateKey(isoTimestamp) {
    const d = new Date(isoTimestamp);
    const localHour = d.getHours();
    let year = d.getFullYear();
    let month = d.getMonth();
    let date = d.getDate();
    
    if (localHour < 6) {
        date--;  // Go back one day in local time
    }
    
    // Check for month/year boundary
    if (date <= 0) {
        month--;
        if (month < 0) {
            year--;
            month = 11;
        }
        // Get last date of previous month
        const lastDayPrev = new Date(year, month + 1, 0).getDate();
        date = lastDayPrev;
    }
    
    // Format as YYYY-MM-DD using local values
    const monthStr = String(month + 1).padStart(2, '0');
    const dateStr = String(date).padStart(2, '0');
    const result = `${year}-${monthStr}-${dateStr}`;
    console.log('get6HourDateKey', isoTimestamp, 'localHour=', localHour, 'result=', result);
    return result;
}

function countToBar(count) {
    // for every 5 counts output 正
    let s = '';
    const fives = Math.floor(count / 5);
    for (let i = 0; i < fives; i++) {
        s += '正';
    }
    let rem = count % 5;
    // remainder: alternate ─│ starting with ─
    for (let i = 0; i < rem; i++) {
        s += (i % 2 === 0) ? '─' : '│';
    }
    return s || '0';
}

function renderSummary() {
    console.log('renderSummary');
    const recs = loadRecords();
    console.log('loaded records', recs.temps.length, recs.bps.length, recs.notes.length);
    const { temps, bps, notes } = loadRecords();

    const tbSummaryTemp = document.querySelector('#tblSummaryTemp tbody');
    tbSummaryTemp.innerHTML = '';
    temps.forEach(r => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${formatTimestamp(r.timestamp)}</td><td>${r.temp}</td>`;
        tbSummaryTemp.appendChild(tr);
    });
    console.log('rendered temps', temps.length);

    const tbSummaryBP = document.querySelector('#tblSummaryBP tbody');
    tbSummaryBP.innerHTML = '';
    bps.forEach(r => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${formatTimestamp(r.timestamp)}</td><td>${r.sys}</td><td>${r.dia}</td><td>${r.pulse}</td>`;
        tbSummaryBP.appendChild(tr);
    });
    console.log('rendered bps', bps.length);

    // restructure data by date then content
    const dateMap = new Map();
    const allContents = new Set();
    const contentLatests = new Map();
    notes.forEach(r => {
        const dateKey = get6HourDateKey(r.timestamp);
        const text = r.text;
        allContents.add(text);
        if (!dateMap.has(dateKey)) dateMap.set(dateKey, { contents: new Map(), latest: r.timestamp });
        const dayRec = dateMap.get(dateKey);
        if (!dayRec.contents.has(text)) dayRec.contents.set(text, { count: 0, latest: r.timestamp });
        const contentRec = dayRec.contents.get(text);
        contentRec.count += 1;
        if (r.timestamp > contentRec.latest) contentRec.latest = r.timestamp;
        if (r.timestamp > dayRec.latest) dayRec.latest = r.timestamp;
        if (!contentLatests.has(text)) contentLatests.set(text, r.timestamp);
        if (r.timestamp > contentLatests.get(text)) contentLatests.set(text, r.timestamp);
    });

    const tbSummaryNotes = document.querySelector('#tblSummaryNotes tbody');
    tbSummaryNotes.innerHTML = '';
    // helper to format elapsed in h:mm:ss前
    function elapsed(ts) {
        const now = new Date();
        const d = now - new Date(ts);
        const sec = Math.floor(d/1000);
        const h = Math.floor(sec/3600);
        const m = Math.floor((sec%3600)/60);
        const s = sec % 60;
        return `${h}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}前`;
    }

    // sort dates ascending
    const sortedDates = Array.from(dateMap.keys()).sort();
    const sortedContents = Array.from(allContents).sort();

    // build header
    const thead = document.querySelector('#tblSummaryNotes thead tr');
    thead.innerHTML = '<th>日付</th>';
    sortedContents.forEach(content => {
        thead.innerHTML += `<th>${content}</th>`;
    });

    // build rows
    sortedDates.forEach(dateKey => {
        const dayRec = dateMap.get(dateKey);
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${dateKey}</td>`;
        sortedContents.forEach(content => {
            const contentRec = dayRec.contents.get(content);
            const bar = contentRec ? countToBar(contentRec.count) : '';
            tr.innerHTML += `<td>${bar}</td>`;
        });
        tbSummaryNotes.appendChild(tr);
    });

    // add footer row with latest elapsed time for each content
    const fr = document.createElement('tr');
    fr.innerHTML = '<td>最新経過</td>';
    sortedContents.forEach(content => {
        const latest = contentLatests.get(content);
        const elapsedStr = latest ? elapsed(latest) : '';
        fr.innerHTML += `<td>${elapsedStr}</td>`;
    });
    tbSummaryNotes.appendChild(fr);
}


// input handling
const txt = document.getElementById('txtValue');
const msg = document.getElementById('msg');

function clearInput() {
    txt.value = '';
}

// convert full-width digits to ASCII (half-width)
function normalizeDigits(str) {
    // full-width ０-９ are U+FF10 to U+FF19
    return str.replace(/[０-９]/g, c =>
        String.fromCharCode(c.charCodeAt(0) - 0xFEE0)
    );
}

function handleInput(e) {
    // only process when enter key pressed
    if (e && e.key && e.key !== 'Enter') {
        return;
    }

    // get value and normalize
    let s = txt.value.trim();
    s = normalizeDigits(s);

    if (s.length === 0) {
        msg.textContent = '入力が空です。';
        return;
    }

    // numbers only and exact lengths for special handling
    if (/^[0-9]+$/.test(s)) {
        if (s.length === 3) {
            const num = parseInt(s, 10);
            const temp = num / 10;
            addTempRecord(temp);
            msg.textContent = `体温 ${temp} を記録しました。`;
            clearInput();
            return;
        }
        if (s.length === 9) {
            const sys = parseInt(s.substr(0,3),10);
            const dia = parseInt(s.substr(3,3),10);
            const pulse = parseInt(s.substr(6,3),10);
            addBPRecord(sys, dia, pulse);
            msg.textContent = `血圧 ${sys}/${dia} 脈拍 ${pulse} を記録しました。`;
            clearInput();
            return;
        }
        // numeric, but length not 3 or 9: fall through to note
    }

    // anything else (mixed or wrong-length numbers) becomes a note
    addNoteRecord(s);
    msg.textContent = `メモ "${s}" を記録しました。`;
    clearInput();
    renderNotes();
}

// use Enter key instead of input event
//txt.addEventListener('input', handleInput);
txt.addEventListener('keydown', handleInput);

// review/delete/export/import/google-drive helpers
function confirmClear() {
    if (confirm('本当にすべての記録を削除しますか？')) {
        localStorage.removeItem('temps');
        localStorage.removeItem('bps');
        localStorage.removeItem('notes');
        msg.textContent = '記録を全て削除しました。';
    }
}

function exportJSON() {
    const recs = loadRecords();
    const dataStr = JSON.stringify(recs);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'karadalogu_export.json';
    a.click();
    URL.revokeObjectURL(url);
}

// merge helper used by Drive import as well

function processImportedObject(obj) {
    if (!obj || typeof obj !== 'object') {
        alert('読み込んだデータが正しくありません');
        return;
    }
    // use confirm dialogs so user can click buttons instead of typing
    let result;
    if (confirm('読み込み: OK=破棄して上書き、キャンセル=マージまたは中止')) {
        // overwrite
        result = {
            temps: obj.temps || [],
            bps: obj.bps || [],
            notes: obj.notes || []
        };
    } else {
        // ask if user really wants to merge or cancel
        if (confirm('マージしますか？OK=マージ、キャンセル=中止')) {
            const existing = loadRecords();
            result = {
                temps: existing.temps.concat(obj.temps || []),
                bps: existing.bps.concat(obj.bps || []),
                notes: existing.notes.concat(obj.notes || [])
            };
        } else {
            return; // cancel
        }
    }
    
    // deduplicate and sort by timestamp
    const deduplicateAndSort = (records) => {
        if (!records || records.length === 0) return [];
        const seen = new Set();
        const unique = [];
        records.forEach(r => {
            if (!r.timestamp) return; // skip invalid
            // create unique key based on timestamp and values
            let key = r.timestamp;
            if (r.temp !== undefined) key += `|${r.temp}`;
            if (r.sys !== undefined) key += `|${r.sys}|${r.dia}|${r.pulse}`;
            if (r.text !== undefined) key += `|${r.text}`;
            
            if (!seen.has(key)) {
                seen.add(key);
                unique.push(r);
            }
        });
        // sort by timestamp ascending
        unique.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        return unique;
    };
    
    result.temps = deduplicateAndSort(result.temps);
    result.bps = deduplicateAndSort(result.bps);
    result.notes = deduplicateAndSort(result.notes);
    
    ['temps', 'bps', 'notes'].forEach(k => {
        localStorage.setItem(k, JSON.stringify(result[k]));
    });
    alert('インポート完了');
} 

function importJSON(file) {
    const reader = new FileReader();
    reader.onload = e => {
        try {
            const obj = JSON.parse(e.target.result);
            processImportedObject(obj);
        } catch (err) {
            alert('読み込みに失敗: ' + err);
        }
    };
    reader.readAsText(file);
}

function handleImportClick() {
    document.getElementById('fileInput').click();
}

// --- Google Drive support (GIS) ---
let isGoogleDriveAuthorized = false;
let accessToken = null;
let tokenClient = null;
const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const EXPORT_FILENAME = 'karadalogu_export.json';

// auto sync state
let autoSync = false;

function setAutoSync(on) {
    autoSync = on;
    localStorage.setItem('autoSync', on ? '1' : '0');
    const btn = document.getElementById('btnAutoSync');
    if (btn) btn.textContent = `自動同期: ${autoSync ? 'オン' : 'オフ'}`;
}

function maybeAutoSync() {
    if (autoSync && isGoogleDriveAuthorized) {
        autoSyncDrive();
    }
}

// load saved autoSync preference
const saved = localStorage.getItem('autoSync');
if (saved === '1') autoSync = true; else autoSync = false;

function autoSyncDrive() {
    // fetch remote data and merge silently
    if (!accessToken) return;
    
    // helper to deduplicate and sort
    const deduplicateAndSort = (records) => {
        if (!records || records.length === 0) return [];
        const seen = new Set();
        const unique = [];
        records.forEach(r => {
            if (!r.timestamp) return; // skip invalid
            // create unique key based on timestamp and values
            let key = r.timestamp;
            if (r.temp !== undefined) key += `|${r.temp}`;
            if (r.sys !== undefined) key += `|${r.sys}|${r.dia}|${r.pulse}`;
            if (r.text !== undefined) key += `|${r.text}`;
            
            if (!seen.has(key)) {
                seen.add(key);
                unique.push(r);
            }
        });
        // sort by timestamp ascending
        unique.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        return unique;
    };
    
    queryDriveFile(EXPORT_FILENAME).then(file => {
        if (!file) {
            // nothing to merge, just export local
            return saveToDrive();
        }
        return fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`, {
            headers: { Authorization: 'Bearer ' + accessToken }
        }).then(res => {
            if (!res.ok) throw new Error('fetch remote failed');
            return res.json();
        }).then(remote => {
            const existing = loadRecords();
            const merged = {
                temps: deduplicateAndSort(existing.temps.concat(remote.temps || [])),
                bps: deduplicateAndSort(existing.bps.concat(remote.bps || [])),
                notes: deduplicateAndSort(existing.notes.concat(remote.notes || []))
            };
            saveRecords(merged);
            return saveToDrive();
        });
    }).catch(err => {
        console.error('autoSync error', err);
    });
}

function showDriveButtons(show) {
    const bExp = document.getElementById('btnDriveExport');
    const bImp = document.getElementById('btnDriveImport');
    const bAuto = document.getElementById('btnAutoSync');
    if (bExp) bExp.style.display = show ? '' : 'none';
    if (bImp) bImp.style.display = show ? '' : 'none';
    if (bAuto) bAuto.style.display = show ? '' : 'none';
} 

// load CLIENT_ID/API_KEY then init GIS token client
async function loadDriveConfig() {
    try {
        const [clientRes, apiRes] = await Promise.all([
            fetch('./cgi-bin/clientid.cgi'),
            fetch('./cgi-bin/apikey.cgi')
        ]);
        const clientId = clientRes.ok ? (await clientRes.text()).trim() : null;
        const apiKey = apiRes.ok ? (await apiRes.text()).trim() : null;
        if (clientId && apiKey) {
            initGoogleAPI(clientId, apiKey);
        }
    } catch (err) {
        console.error('Failed to load drive config:', err);
    }
}

function initGoogleAPI(clientId, apiKey) {
    if (window.google && google.accounts && google.accounts.oauth2) {
        tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: SCOPES,
            callback: tokenResponse => {
                if (tokenResponse && tokenResponse.access_token) {
                    accessToken = tokenResponse.access_token;
                    isGoogleDriveAuthorized = true;
                    showDriveButtons(true);
                    console.log('Obtained access token', accessToken);
                    alert('Google Drive 認証完了');
                    // if auto sync was enabled, perform immediately
                    if (autoSync) {
                        autoSyncDrive();
                    }
                } else {
                    console.error('Token response:', tokenResponse);
                    alert('認証に失敗しました');
                }
            }
        });
    } else {
        console.error('GIS not loaded');
    }
}

function authorizeGoogleDrive() {
    if (!tokenClient) {
        alert('Google API 初期化に失敗しました');
        return;
    }
    tokenClient.requestAccessToken({ prompt: 'consent' });
}

function saveToDrive() {
    if (!isGoogleDriveAuthorized || !accessToken) {
        alert('Google Driveに認証してください');
        return;
    }
    const recs = loadRecords();
    const content = JSON.stringify(recs);
    const blob = new Blob([content], { type: 'application/json' });

    queryDriveFile(EXPORT_FILENAME).then(file => {
        if (file) {
            console.log('ファイル見つかった', file);
            updateDriveFile(file.id, blob);
        } else {
            console.log('ファイルなし -> 作成');
            createDriveFile(blob);
        }
    }).catch(err => {
        console.error('saveToDrive query error', err);
        alert('Drive保存エラー');
        isGoogleDriveAuthorized = false;
        accessToken = null;
        showDriveButtons(false);
    });
}

function createDriveFile(fileBlob) {
    const metadata = { name: EXPORT_FILENAME, mimeType: 'application/json' };
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', fileBlob);
    fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + accessToken },
        body: form
    }).then(res => {
        if (res.ok) {
            alert('Driveに保存しました');
        } else {
            return res.text().then(txt => { throw new Error(txt); });
        }
    }).catch(err => {
        console.error(err);
        alert('Drive保存エラー');
        isGoogleDriveAuthorized = false;
        accessToken = null;
        showDriveButtons(false);
    });
}

function updateDriveFile(fileId, fileBlob) {
    fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
        method: 'PATCH',
        headers: { Authorization: 'Bearer ' + accessToken },
        body: fileBlob
    }).then(res => {
        if (res.ok) {
            alert('Driveに保存しました');
        } else {
            return res.text().then(txt => { throw new Error(txt); });
        }
    }).catch(err => {
        console.error(err);
        alert('Drive保存エラー');
        isGoogleDriveAuthorized = false;
        accessToken = null;
        showDriveButtons(false);
    });
}

// search for file in drive.file and appDataFolder spaces
function queryDriveFile(name) {
    const spacesList = ['drive', 'appDataFolder'];
    // build q string with additional filters
    const qstr = `name='${name}' and mimeType='application/json' and trashed=false`;
    function trySpace(space) {
        const url = `https://www.googleapis.com/drive/v3/files?spaces=${space}&pageSize=10&fields=files(id,name)&q=${encodeURIComponent(qstr)}`;
        return fetch(url, { headers: { Authorization: 'Bearer ' + accessToken } })
            .then(r => {
                if (!r.ok) {
                    console.warn('queryDriveFile http status', r.status, r.statusText);
                    return r.json().then(errData => { throw errData; });
                }
                return r.json();
            })
            .then(data => {
                console.log('queryDriveFile result', space, data);
                if (data && data.error) {
                    console.error('queryDriveFile API error', data.error);
                    throw data.error;
                }
                const files = data.files || [];
                return files.length > 0 ? files[0] : null;
            });
    }
    // sequentially try spaces with error catch to continue
    return trySpace(spacesList[0]).catch(err => {
        console.warn('queryDriveFile space', spacesList[0], 'failed', err);
        return trySpace(spacesList[1]).catch(err2 => {
            console.warn('queryDriveFile space', spacesList[1], 'failed', err2);
            return null;
        });
    });
}

function loadFromDrive() {
    if (!isGoogleDriveAuthorized || !accessToken) {
        alert('Google Driveに認証してください');
        return;
    }
    queryDriveFile(EXPORT_FILENAME).then(file => {
        if (!file) {
            alert('Drive上にファイルが見つかりません');
            return;
        }
        console.log('読み込むファイル', file);
        return fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`, {
            headers: { Authorization: 'Bearer ' + accessToken }
        });
    }).then(res => {
        if (!res) return;
        if (!res.ok) throw new Error('読み込みエラー status='+res.status);
        return res.json();
    }).then(obj => {
        if (obj) processImportedObject(obj);
    }).catch(err => {
        console.error('loadFromDrive error', err);
        alert('Drive読み込みエラー');
        isGoogleDriveAuthorized = false;
        accessToken = null;
        showDriveButtons(false);
    });
}


// settings button listeners
const btnClearEl = document.getElementById('btnClear');
if (btnClearEl) btnClearEl.addEventListener('click', confirmClear);
const btnExportEl = document.getElementById('btnExport');
if (btnExportEl) btnExportEl.addEventListener('click', exportJSON);
const btnImportEl = document.getElementById('btnImport');
if (btnImportEl) btnImportEl.addEventListener('click', handleImportClick);
const fileInputEl = document.getElementById('fileInput');
if (fileInputEl) fileInputEl.addEventListener('change', e => {
    if (e.target.files && e.target.files[0]) {
        importJSON(e.target.files[0]);
    }
});
const btnGDriveEl = document.getElementById('btnGDrive');
if (btnGDriveEl) btnGDriveEl.addEventListener('click', authorizeGoogleDrive);
const btnDriveExportEl = document.getElementById('btnDriveExport');
if (btnDriveExportEl) btnDriveExportEl.addEventListener('click', saveToDrive);
const btnDriveImportEl = document.getElementById('btnDriveImport');
if (btnDriveImportEl) btnDriveImportEl.addEventListener('click', loadFromDrive);
const btnAutoSyncEl = document.getElementById('btnAutoSync');
if (btnAutoSyncEl) {
    // initialize label
    btnAutoSyncEl.textContent = `自動同期: ${autoSync ? 'オン' : 'オフ'}`;
    btnAutoSyncEl.addEventListener('click', () => {
        setAutoSync(!autoSync);
        if (autoSync && isGoogleDriveAuthorized) {
            autoSyncDrive();
        }
    });
}

// start on input
showSection('input');
// load drive configuration for GIS
loadDriveConfig();

// zoom functionality
let zoomLevel = 1;
function applyZoom() {
    document.body.style.setProperty('--zoom', zoomLevel);
}
function autoFitZoom() {
    // scale body so that its scrollWidth (or title width) fits viewport width
    const bodyWidth = document.body.scrollWidth;
    const title = document.querySelector('h1');
    const titleWidth = title ? title.scrollWidth : 0;
    const reference = Math.max(bodyWidth, titleWidth, 1);
    const target = window.innerWidth / reference;
    // limit zoom to no more than 4× for larger heading
    zoomLevel = Math.min(Math.max(target, 0.5), 4);
    applyZoom();
}

// automatically fit to width on load/resize
window.addEventListener('resize', autoFitZoom);
autoFitZoom();

// make internal anchors work reliably under scaling and handle showSection
document.body.addEventListener('click', e => {
    const a = e.target.closest('a');
    if (!a) return;
    const href = a.getAttribute('href');
    if (!href || !href.startsWith('#')) return;
    const id = href.substring(1);
    const el = document.getElementById(id);
    if (el) {
        e.preventDefault();
        // if it's a section id, switch section as well
        if (id.startsWith('section-')) {
            showSection(id.replace('section-', ''));
        }
        el.scrollIntoView({ behavior: 'smooth' });
    }
});