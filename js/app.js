const STORAGE_KEY = 'agenda-surat-entries-v1';

let entries = loadEntries();
let editingId = null;

const tbody = document.getElementById('tbody');
const emptyState = document.getElementById('empty-state');
const searchInput = document.getElementById('search');
const sheetBackdrop = document.getElementById('sheet-backdrop');
const sheet = document.getElementById('sheet');
const sheetTitle = document.getElementById('sheet-title');
const fTanggal = document.getElementById('f-tanggal');
const fNomor = document.getElementById('f-nomor');
const fPerihal = document.getElementById('f-perihal');
const btnDelete = document.getElementById('btn-delete');
const form = document.getElementById('entry-form');

function loadEntries() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveEntries() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function toDateInputValue(ddmmyyyyOrIso) {
  return ddmmyyyyOrIso;
}

function formatTanggalDisplay(isoDate) {
  if (!isoDate) return '-';
  const [y, m, d] = isoDate.split('-');
  return `${d}/${m}/${y}`;
}

function sortedEntries() {
  return [...entries].sort((a, b) => {
    if (a.tanggal === b.tanggal) return (a.createdAt || 0) - (b.createdAt || 0);
    return a.tanggal < b.tanggal ? -1 : 1;
  });
}

function render() {
  const query = searchInput.value.trim().toLowerCase();
  const sorted = sortedEntries();
  const filtered = query
    ? sorted.filter((e) =>
        (e.nomor || '').toLowerCase().includes(query) ||
        (e.perihal || '').toLowerCase().includes(query)
      )
    : sorted;

  tbody.innerHTML = '';

  if (sorted.length === 0) {
    emptyState.style.display = 'block';
    document.getElementById('ledger-table').style.display = 'none';
    return;
  }

  emptyState.style.display = 'none';
  document.getElementById('ledger-table').style.display = 'table';

  filtered.forEach((entry) => {
    const noUrut = sorted.findIndex((e) => e.id === entry.id) + 1;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="col-no">${noUrut}</td>
      <td class="col-tgl">${formatTanggalDisplay(entry.tanggal)}</td>
      <td class="col-nomor">${escapeHtml(entry.nomor || '-')}</td>
      <td class="col-perihal">${escapeHtml(entry.perihal || '-')}</td>
    `;
    tr.addEventListener('click', () => openSheet(entry.id));
    tbody.appendChild(tr);
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function openSheet(id) {
  editingId = id || null;
  if (id) {
    const entry = entries.find((e) => e.id === id);
    sheetTitle.textContent = 'Ubah Catatan';
    fTanggal.value = entry.tanggal || '';
    fNomor.value = entry.nomor || '';
    fPerihal.value = entry.perihal || '';
    btnDelete.style.display = 'block';
  } else {
    sheetTitle.textContent = 'Catatan Surat Baru';
    fTanggal.value = new Date().toISOString().slice(0, 10);
    fNomor.value = '';
    fPerihal.value = '';
    btnDelete.style.display = 'none';
  }
  sheetBackdrop.classList.add('open');
  sheet.classList.add('open');
  setTimeout(() => fNomor.focus(), 200);
}

function closeSheet() {
  sheetBackdrop.classList.remove('open');
  sheet.classList.remove('open');
  editingId = null;
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const tanggal = fTanggal.value;
  const nomor = fNomor.value.trim();
  const perihal = fPerihal.value.trim();

  if (!tanggal) {
    fTanggal.focus();
    return;
  }

  if (editingId) {
    const entry = entries.find((e) => e.id === editingId);
    entry.tanggal = tanggal;
    entry.nomor = nomor;
    entry.perihal = perihal;
  } else {
    entries.push({
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      tanggal,
      nomor,
      perihal,
      createdAt: Date.now(),
    });
  }

  saveEntries();
  render();
  closeSheet();
});

btnDelete.addEventListener('click', () => {
  if (!editingId) return;
  if (confirm('Hapus catatan surat ini?')) {
    entries = entries.filter((e) => e.id !== editingId);
    saveEntries();
    render();
    closeSheet();
  }
});

document.getElementById('btn-add').addEventListener('click', () => openSheet(null));
document.getElementById('fab').addEventListener('click', () => openSheet(null));
document.getElementById('btn-cancel').addEventListener('click', closeSheet);
sheetBackdrop.addEventListener('click', closeSheet);
searchInput.addEventListener('input', render);

document.getElementById('btn-export').addEventListener('click', () => {
  const sorted = sortedEntries();
  if (sorted.length === 0) {
    alert('Belum ada catatan untuk diekspor.');
    return;
  }
  const rows = [['No', 'Tanggal', 'Nomor Surat', 'Perihal']];
  sorted.forEach((e, i) => {
    rows.push([i + 1, formatTanggalDisplay(e.tanggal), e.nomor || '', e.perihal || '']);
  });
  const csv = rows
    .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `agenda-surat-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').catch(() => {});
  });
}

render();
