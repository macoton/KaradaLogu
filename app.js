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
    let bar = '';
    let remaining = count;
    while (remaining >= 5) { bar += '正'; remaining -= 5; }
    while (remaining >= 2) { bar += 'ー'; remaining -= 2; }
    while (remaining >= 1) { bar += '、'; remaining -= 1; }
    return bar || '0';
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

    const notesByDateAndText = new Map();
    notes.forEach(r => {
        const dateKey = get6HourDateKey(r.timestamp);
        const groupKey = `${dateKey}|${r.text}`;
        notesByDateAndText.set(groupKey, (notesByDateAndText.get(groupKey) || 0) + 1);
    });
    console.log('grouped notes', notesByDateAndText.size);

    const notesByDate = new Map();
    notesByDateAndText.forEach((count, groupKey) => {
        const [dateKey, text] = groupKey.split('|');
        if (!notesByDate.has(dateKey)) notesByDate.set(dateKey, []);
        notesByDate.get(dateKey).push({ text, count });
    });

    const tbSummaryNotes = document.querySelector('#tblSummaryNotes tbody');
    tbSummaryNotes.innerHTML = '';
    const sortedDates = Array.from(notesByDate.keys()).sort().reverse();
    sortedDates.forEach(dateKey => {
        const entriesForDate = notesByDate.get(dateKey);
        entriesForDate.forEach((entry, idx) => {
            const tr = document.createElement('tr');
            const dateCell = idx === 0 ? dateKey : '';
            const bar = countToBar(entry.count);
            tr.innerHTML = `<td>${dateCell}</td><td>${entry.text} (${entry.count}回)</td><td>${bar}</td>`;
            tbSummaryNotes.appendChild(tr);
        });
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

// settings
document.getElementById('btnClear').addEventListener('click', () => {
    localStorage.removeItem('temps');
    localStorage.removeItem('bps');
    localStorage.removeItem('notes');
    msg.textContent = '記録を全て削除しました。';
});

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