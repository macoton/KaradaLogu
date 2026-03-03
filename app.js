// basic navigation
const sections = {
    input: document.getElementById('section-input'),
    output: document.getElementById('section-output'),
    settings: document.getElementById('section-settings')
};

function showSection(name) {
    Object.values(sections).forEach(sec => sec.classList.remove('active'));
    sections[name].classList.add('active');
}

document.getElementById('btnInput').addEventListener('click', () => showSection('input'));
document.getElementById('btnOutput').addEventListener('click', () => {
    showSection('output');
    renderOutput();
});
document.getElementById('btnSettings').addEventListener('click', () => showSection('settings'));

// storage helpers
function loadRecords() {
    const temps = JSON.parse(localStorage.getItem('temps') || '[]');
    const bps = JSON.parse(localStorage.getItem('bps') || '[]');
    return { temps, bps };
}

function saveRecords({ temps, bps }) {
    localStorage.setItem('temps', JSON.stringify(temps));
    localStorage.setItem('bps', JSON.stringify(bps));
}

function addTempRecord(value) {
    const { temps, bps } = loadRecords();
    temps.push({ timestamp: new Date().toISOString(), temp: value });
    saveRecords({ temps, bps });
}

function addBPRecord(sys, dia, pulse) {
    const { temps, bps } = loadRecords();
    bps.push({ timestamp: new Date().toISOString(), sys, dia, pulse });
    saveRecords({ temps, bps });
}

function renderOutput() {
    const { temps, bps } = loadRecords();
    const tbTemp = document.querySelector('#tblTemp tbody');
    const tbBP = document.querySelector('#tblBP tbody');
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

    if (!/^[0-9]*$/.test(s)) {
        msg.textContent = '数字のみ入力してください。';
        return;
    }
    msg.textContent = '';
    if (s.length === 3) {
        const num = parseInt(s, 10);
        const temp = num / 10;
        addTempRecord(temp);
        msg.textContent = `体温 ${temp} を記録しました。`;
        clearInput();
    } else if (s.length === 9) {
        const sys = parseInt(s.substr(0,3),10);
        const dia = parseInt(s.substr(3,3),10);
        const pulse = parseInt(s.substr(6,3),10);
        addBPRecord(sys, dia, pulse);
        msg.textContent = `血圧 ${sys}/${dia} 脈拍 ${pulse} を記録しました。`;
        clearInput();
    }
}

// use Enter key instead of input event
//txt.addEventListener('input', handleInput);
txt.addEventListener('keydown', handleInput);

// settings
document.getElementById('btnClear').addEventListener('click', () => {
    localStorage.removeItem('temps');
    localStorage.removeItem('bps');
    msg.textContent = '記録を全て削除しました。';
});

// start on input
showSection('input');