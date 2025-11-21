const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1i3XMdNVGD9-MSCi9UKHcDuUXC7oGmLXNI5bvEhsoCaU/gviz/tq?tqx=out:json&gid=0';
const LOCAL_STORAGE_KEY = 'uniform-orders';

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

const orders = loadOrders();
renderOrders();

async function fetchSheetData() {
  if (!tbody) return;
  setLoadingState('กำลังโหลดข้อมูลจาก Google Sheets...');
  try {
    const response = await fetch(SHEET_URL);
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
  refreshBtn.addEventListener('click', fetchSheetData);
}

fetchSheetData();

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
  orderForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const formData = new FormData(orderForm);
    const newOrder = {
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
      customer: formData.get('customer')?.toString().trim() || '-',
      product: formData.get('product')?.toString() || '-',
      quantity: Number(formData.get('quantity')) || 0,
      status: formData.get('status')?.toString() || '-',
      note: formData.get('note')?.toString().trim() || '',
      createdAt: new Date().toISOString(),
    };

    orders.unshift(newOrder);
    saveOrders();
    renderOrders();
    orderForm.reset();
    toggleOrderModal(false);
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

function renderOrders() {
  if (!orderTableBody) return;
  if (!orders.length) {
    orderTableBody.innerHTML = `
      <tr>
        <td colspan="4" class="py-6 text-center text-slate-500">ยังไม่มีคำสั่งซื้อ กดปุ่ม "เพิ่มคำสั่งซื้อ" เพื่อเริ่มบันทึก</td>
      </tr>
    `;
    return;
  }

  const fragment = document.createDocumentFragment();
  orders.forEach((order) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="py-3">
        <div class="font-medium text-slate-800">${order.customer}</div>
        <div class="text-xs text-slate-500">${formatDate(order.createdAt)}</div>
        ${order.note ? `<p class="mt-1 text-xs text-slate-500">${order.note}</p>` : ''}
      </td>
      <td class="py-3 text-slate-500">${order.product}</td>
      <td class="py-3 font-semibold">${order.quantity}</td>
      <td class="py-3">
        <span class="rounded-full px-3 py-1 text-xs font-semibold ${orderStatusStyles[order.status] || 'bg-slate-100 text-slate-600'}">${order.status}</span>
      </td>
    `;
    fragment.appendChild(tr);
  });

  orderTableBody.innerHTML = '';
  orderTableBody.appendChild(fragment);
}

function formatDate(isoString) {
  if (!isoString) return '-';
  const date = new Date(isoString);
  return date.toLocaleString('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function loadOrders() {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.warn('ไม่สามารถอ่านข้อมูลคำสั่งซื้อที่บันทึกไว้ได้', error);
  }
  return getDefaultOrders();
}

function saveOrders() {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(orders));
  } catch (error) {
    console.warn('ไม่สามารถบันทึกคำสั่งซื้อได้', error);
  }
}

function getDefaultOrders() {
  return [
    {
      id: 'default-1',
      customer: 'โรงเรียนสวนกุหลาบ',
      product: 'เสื้อพละ',
      quantity: 120,
      status: 'กำลังผลิต',
      note: 'ล็อตส่งเสาร์หน้า',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'default-2',
      customer: 'บริษัท ABC Group',
      product: 'เสื้อพนักงาน',
      quantity: 80,
      status: 'จัดส่งแล้ว',
      note: '',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
  ];
}
