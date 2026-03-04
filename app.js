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
}

function addBPRecord(sys, dia, pulse) {
    const { temps, bps, notes } = loadRecords();
    bps.push({ timestamp: new Date().toISOString(), sys, dia, pulse });
    saveRecords({ temps, bps, notes });
}

function addNoteRecord(text) {
    const { temps, bps, notes } = loadRecords();
    notes.push({ timestamp: new Date().toISOString(), text });
    saveRecords({ temps, bps, notes });
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
function get6HourDateKey(isoTimestamp) {
    const d = new Date(isoTimestamp);
    if (d.getHours() < 6) d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
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

    // restructure data by content then date
    const contentMap = new Map();
    notes.forEach(r => {
        const dateKey = get6HourDateKey(r.timestamp);
        const text = r.text;
        if (!contentMap.has(text)) contentMap.set(text, new Map());
        const dateMap = contentMap.get(text);
        if (!dateMap.has(dateKey)) {
            dateMap.set(dateKey, { count: 0, latest: r.timestamp });
        }
        const rec = dateMap.get(dateKey);
        rec.count += 1;
        if (r.timestamp > rec.latest) rec.latest = r.timestamp;
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

    // iterate each content group
    contentMap.forEach((dateMap, text) => {
        // header row for content
        const hr = document.createElement('tr');
        hr.innerHTML = `<td colspan="4">${text}</td>`;
        tbSummaryNotes.appendChild(hr);
        // sorted date keys
        const dates = Array.from(dateMap.keys()).sort().reverse();
        let latestTime = 0;
        dates.forEach(dateKey => {
            const rec = dateMap.get(dateKey);
            const bar = countToBar(rec.count);
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${dateKey}</td><td></td><td>${bar}</td><td></td>`;
            tbSummaryNotes.appendChild(tr);
            if (new Date(rec.latest) > latestTime) latestTime = new Date(rec.latest);
        });
        // footer elapsed row
        const fr = document.createElement('tr');
        fr.innerHTML = `<td colspan="3">最新経過</td><td>${elapsed(latestTime)}</td>`;
        tbSummaryNotes.appendChild(fr);
    });
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
    const choice = prompt('読み込み方法を選択:\n1: 破棄して上書き\n2: 既存データとマージ\n3: キャンセル','1');
    if (choice === '3' || choice === null) {
        return;
    }
    const existing = loadRecords();
    let result;
    if (choice === '1') {
        result = {
            temps: obj.temps || [],
            bps: obj.bps || [],
            notes: obj.notes || []
        };
    } else if (choice === '2') {
        result = {
            temps: existing.temps.concat(obj.temps || []),
            bps: existing.bps.concat(obj.bps || []),
            notes: existing.notes.concat(obj.notes || [])
        };
    } else {
        alert('無効な選択です');
        return;
    }
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

let gapiInitialized = false;

function showDriveButtons(show) {
    const bExp = document.getElementById('btnDriveExport');
    const bImp = document.getElementById('btnDriveImport');
    if (bExp) bExp.style.display = show ? '' : 'none';
    if (bImp) bImp.style.display = show ? '' : 'none';
}

function initGoogleDriveAuth() {
    if (gapiInitialized) {
        gapi.auth2.getAuthInstance().signIn().then(() => {
            alert('Google Drive認証済み');
            showDriveButtons(true);
        });
        return;
    }
    Promise.all([
        fetch('./cgi-bin/apikey.cgi').then(r => r.text()),
        fetch('./cgi-bin/clientid.cgi').then(r => r.text())
    ]).then(([apiKey, clientId]) => {
        console.log('Got GDrive keys', apiKey, clientId);
        const script = document.createElement('script');
        script.src = 'https://apis.google.com/js/api.js';
        script.onload = () => {
            window.gapi.load('client:auth2', () => {
                gapi.client.init({
                    apiKey: apiKey.trim(),
                    clientId: clientId.trim(),
                    scope: 'https://www.googleapis.com/auth/drive.file'
                }).then(() => {
                    console.log('gapi initialized');
                    gapiInitialized = true;
                    gapi.auth2.getAuthInstance().signIn().then(() => {
                        alert('Google Drive認証完了');
                        showDriveButtons(true);
                    });
                });
            });
        };
        document.body.appendChild(script);
    }).catch(err => {
        alert('Google Driveのキー取得に失敗: ' + err);
    });
}

function ensureGapi(cb) {
    if (!gapiInitialized) {
        alert('まずGoogle Drive認証を実行してください');
        return;
    }
    if (!gapi.auth2.getAuthInstance().isSignedIn.get()) {
        gapi.auth2.getAuthInstance().signIn().then(() => { showDriveButtons(true); cb(); });
    } else {
        cb();
    }
}

function exportToDrive() {
    ensureGapi(() => {
        const recs = loadRecords();
        const content = JSON.stringify(recs);
        // search for existing file
        gapi.client.drive.files.list({
            q: "name='karadalogu_export.json' and mimeType='application/json' and trashed=false",
            fields: 'files(id,name)'
        }).then(resp => {
            const files = resp.result.files;
            if (files && files.length > 0) {
                const id = files[0].id;
                gapi.client.request({
                    path: `/upload/drive/v3/files/${id}`,
                    method: 'PATCH',
                    params: { uploadType: 'media' },
                    body: content
                }).then(() => alert('Driveへエクスポート完了'));
            } else {
                gapi.client.drive.files.create({
                    resource: { name: 'karadalogu_export.json', mimeType: 'application/json' },
                    media: { mimeType: 'application/json', body: content }
                }).then(() => alert('Driveへエクスポート完了'));
            }
        });
    });
}

function importFromDrive() {
    ensureGapi(() => {
        gapi.client.drive.files.list({
            q: "name='karadalogu_export.json' and mimeType='application/json' and trashed=false",
            fields: 'files(id,name)'
        }).then(resp => {
            const files = resp.result.files;
            if (files && files.length > 0) {
                const id = files[0].id;
                gapi.client.drive.files.get({ fileId: id, alt: 'media' }).then(res => {
                    try {
                        const obj = JSON.parse(res.body);
                        processImportedObject(obj);
                    } catch (e) {
                        alert('Drive上のデータの解析に失敗: ' + e);
                    }
                });
            } else {
                alert('Drive上にエクスポートファイルが見つかりません');
            }
        });
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
if (btnGDriveEl) btnGDriveEl.addEventListener('click', initGoogleDriveAuth);
const btnDriveExportEl = document.getElementById('btnDriveExport');
if (btnDriveExportEl) btnDriveExportEl.addEventListener('click', exportToDrive);
const btnDriveImportEl = document.getElementById('btnDriveImport');
if (btnDriveImportEl) btnDriveImportEl.addEventListener('click', importFromDrive);

// start on input
showSection('input');

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