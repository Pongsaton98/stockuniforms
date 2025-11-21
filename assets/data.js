const SHEET_EMPLOYEE_URL = 'https://docs.google.com/spreadsheets/d/1i3XMdNVGD9-MSCi9UKHcDuUXC7oGmLXNI5bvEhsoCaU/gviz/tq?tqx=out:json&gid=0';
const SHEET_ORDER_URL = 'https://docs.google.com/spreadsheets/d/1i3XMdNVGD9-MSCi9UKHcDuUXC7oGmLXNI5bvEhsoCaU/gviz/tq?tqx=out:json&gid=1366868069';
const ORDER_WEBHOOK_URL = 'YOUR_APPS_SCRIPT_WEBHOOK_URL';

const statusStyles = {
  'ลาออก': 'bg-rose-50 text-rose-600',
  'กำลังทำงาน': 'bg-emerald-50 text-emerald-600',
};

const orderStatusStyles = {
  'รอชำระเงิน': 'bg-rose-50 text-rose-600',
  'กำลังผลิต': 'bg-amber-50 text-amber-600',
  'รอจัดส่ง': 'bg-slate-100 text-slate-600',
  'จัดส่งแล้ว': 'bg-emerald-50 text-emerald-600',
};

const tbody = document.getElementById('sheet-data-body');
const refreshBtn = document.getElementById('refresh-data');
const orderTableBody = document.getElementById('order-table-body');
const orderModal = document.getElementById('order-modal');
const openOrderButtons = [
  document.getElementById('open-order-modal'),
  document.getElementById('open-order-modal-secondary'),
].filter(Boolean);
const closeOrderButton = document.getElementById('close-order-modal');
const cancelOrderButton = document.getElementById('cancel-order');
const orderForm = document.getElementById('order-form');

fetchEmployeeSheet();
fetchOrderSheet();

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
  refreshBtn.addEventListener('click', () => {
    fetchEmployeeSheet();
    fetchOrderSheet();
  });
}

openOrderButtons.forEach((btn) => btn.addEventListener('click', () => toggleOrderModal(true)));

if (closeOrderButton) {
  closeOrderButton.addEventListener('click', () => toggleOrderModal(false));
}

if (cancelOrderButton) {
  cancelOrderButton.addEventListener('click', (event) => {
    event.preventDefault();
    orderForm?.reset();
    toggleOrderModal(false);
  });
}

if (orderModal) {
  orderModal.addEventListener('click', (event) => {
    if (event.target === orderModal) {
      toggleOrderModal(false);
    }
  });
}

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    toggleOrderModal(false);
  }
});

if (orderForm) {
  orderForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(orderForm);
    const payload = Object.fromEntries(formData.entries());
    setOrderTableLoading('กำลังบันทึกข้อมูลคำสั่งซื้อ...');

    try {
      const response = await fetch(ORDER_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('ส่งข้อมูลไป Google Sheets ไม่สำเร็จ');

      orderForm.reset();
      toggleOrderModal(false);
      await fetchOrderSheet();
    } catch (error) {
      console.error(error);
      alert('ไม่สามารถบันทึกคำสั่งซื้อได้ กรุณาลองใหม่ หรือเช็ก ORDER_WEBHOOK_URL');
      fetchOrderSheet();
    }
  });
}

function toggleOrderModal(show) {
  if (!orderModal) return;
  if (show) {
    orderModal.classList.remove('hidden');
    orderModal.classList.add('flex');
  } else {
    orderModal.classList.add('hidden');
    orderModal.classList.remove('flex');
  }
}

async function fetchOrderSheet() {
  if (!orderTableBody) return;
  setOrderTableLoading('กำลังโหลดข้อมูลคำสั่งซื้อ...');

  try {
    const response = await fetch(SHEET_ORDER_URL);
    if (!response.ok) throw new Error('โหลดคำสั่งซื้อไม่ได้');

    const text = await response.text();
    const json = JSON.parse(text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1));
    const rows = json.table?.rows || [];

    if (!rows.length) {
      setOrderTableLoading('ยังไม่มีคำสั่งซื้อ');
      return;
    }

    const fragment = document.createDocumentFragment();
    rows.forEach((row) => {
      const cells = row.c || [];
      const order = {
        id: formatCell(cells[0]),
        name: formatCell(cells[1]),
        type: formatCell(cells[2]),
        category: formatCell(cells[3]),
        date: formatCell(cells[4]),
        payment: formatCell(cells[5]),
        status: formatCell(cells[6]),
        quantity: formatCell(cells[7]),
        total: formatCell(cells[8]),
      };

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="py-3 font-semibold text-slate-800">${order.id || '-'}</td>
        <td class="py-3 text-slate-600">${order.name || '-'}</td>
        <td class="py-3 text-slate-500">${order.type || '-'}</td>
        <td class="py-3 text-slate-500">${order.category || '-'}</td>
        <td class="py-3 text-slate-500">${order.date || '-'}</td>
        <td class="py-3 font-medium">${order.payment || '-'}</td>
        <td class="py-3">
          <span class="rounded-full px-3 py-1 text-xs font-semibold ${orderStatusStyles[order.status] || 'bg-slate-100 text-slate-600'}">${order.status || '-'}</span>
        </td>
        <td class="py-3 font-semibold">${order.quantity || '-'}</td>
        <td class="py-3 font-semibold">${order.total || '-'}</td>
      `;
      fragment.appendChild(tr);
    });

    orderTableBody.innerHTML = '';
    orderTableBody.appendChild(fragment);
  } catch (error) {
    console.error(error);
    setOrderTableLoading('โหลดคำสั่งซื้อไม่สำเร็จ');
  }
}

function setOrderTableLoading(message) {
  if (!orderTableBody) return;
  orderTableBody.innerHTML = `
    <tr>
      <td colspan="9" class="py-6 text-center text-slate-500">${message}</td>
    </tr>
  `;
}
