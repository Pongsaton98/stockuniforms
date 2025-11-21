const SHEET_EMPLOYEE_URL = 'https://docs.google.com/spreadsheets/d/1i3XMdNVGD9-MSCi9UKHcDuUXC7oGmLXNI5bvEhsoCaU/gviz/tq?tqx=out:json&gid=0';

const statusStyles = {
  'ลาออก': 'bg-rose-50 text-rose-600',
  'กำลังทำงาน': 'bg-emerald-50 text-emerald-600',
};

const tbody = document.getElementById('sheet-data-body');
const refreshBtn = document.getElementById('refresh-data');
const refreshBtnSecondary = document.getElementById('refresh-data-secondary');

fetchEmployeeSheet();

async function fetchEmployeeSheet() {
  if (!tbody) return;
  setLoadingState('กำลังโหลดข้อมูลจาก Google Sheets...');
  try {
    const response = await fetch(SHEET_EMPLOYEE_URL);
    if (!response.ok) throw new Error('ไม่สามารถเชื่อมต่อ Google Sheets ได้');

    const text = await response.text();
    const json = JSON.parse(text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1));
    const rows = json.table?.rows || [];

    if (!rows.length) {
      setLoadingState('ไม่พบข้อมูลในชีต');
      return;
    }

    const fragment = document.createDocumentFragment();

    rows.forEach((row) => {
      const cells = row.c || [];
      const id = formatCell(cells[0]);
      const name = formatCell(cells[1]);
      const dept = formatCell(cells[2]);
      const email = formatCell(cells[3]);
      const status = formatCell(cells[5]);
      const phone = formatCell(cells[6]);

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="py-3 font-semibold text-slate-800">${id || '-'}</td>
        <td class="py-3 text-sm text-slate-600">
          <div class="font-medium text-slate-800">${name || '-'}</div>
          <div class="text-xs text-slate-500">${email || '—'}</div>
        </td>
        <td class="py-3 text-slate-500">${dept || '-'}</td>
        <td class="py-3">
          <span class="inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[status] || 'bg-slate-100 text-slate-600'}">${status || '-'}</span>
        </td>
        <td class="py-3 text-sm">
          <a href="tel:${phone}" class="text-primary hover:text-primary-dark">${phone || '-'}</a>
        </td>
      `;
      fragment.appendChild(tr);
    });

    tbody.innerHTML = '';
    tbody.appendChild(fragment);
  } catch (error) {
    console.error(error);
    setLoadingState('โหลดข้อมูลไม่สำเร็จ โปรดลองอีกครั้ง');
  }
}

function setLoadingState(message) {
  tbody.innerHTML = `
    <tr>
      <td colspan="5" class="py-6 text-center text-slate-500">${message}</td>
    </tr>
  `;
}

function formatCell(cell) {
  if (!cell || cell.v === null || cell.v === undefined) return '';
  return typeof cell.v === 'number' ? cell.v.toString() : cell.v;
}

if (refreshBtn) {
  refreshBtn.addEventListener('click', fetchEmployeeSheet);
}

if (refreshBtnSecondary) {
  refreshBtnSecondary.addEventListener('click', fetchEmployeeSheet);
}
