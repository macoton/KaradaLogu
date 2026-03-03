// basic navigation
const sections = {
    input: document.getElementById('section-input'),
    output: document.getElementById('section-output'),
    settings: document.getElementById('section-settings')
};

function showSection(name) {
    Object.values(sections).forEach(sec => sec.classList.remove('active'));
    sections[name].classList.add('active');
    if (name === 'input') {
        renderNotes();
    }
}

document.getElementById('btnInput').addEventListener('click', () => showSection('input'));
document.getElementById('btnOutput').addEventListener('click', () => {
    showSection('output');
    renderOutput();
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

function renderOutput() {
    const { temps, bps, notes } = loadRecords();
    const tbTemp = document.querySelector('#tblTemp tbody');
    const tbBP = document.querySelector('#tblBP tbody');
    const tbNotes = document.querySelector('#tblNotes tbody');
    tbTemp.innerHTML = '';
    temps.forEach(r => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${r.timestamp}</td><td>${r.temp}</td>`;
        tbTemp.appendChild(tr);
    });
    tbBP.innerHTML = '';
    bps.forEach(r => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${r.timestamp}</td><td>${r.sys}</td><td>${r.dia}</td><td>${r.pulse}</td>`;
        tbBP.appendChild(tr);
    });
    if (tbNotes) {
        tbNotes.innerHTML = '';
        notes.forEach(r => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${r.timestamp}</td><td>${r.text}</td>`;
            tbNotes.appendChild(tr);
        });
    }
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