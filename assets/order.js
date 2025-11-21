const SHEET_ORDER_URL = 'https://docs.google.com/spreadsheets/d/1i3XMdNVGD9-MSCi9UKHcDuUXC7oGmLXNI5bvEhsoCaU/gviz/tq?tqx=out:json&gid=1366868069';
const ORDER_WEBHOOK_URL = 'YOUR_APPS_SCRIPT_WEBHOOK_URL';

const orderTableBody = document.getElementById('order-table-body');
const refreshOrdersBtn = document.getElementById('refresh-orders');
const scrollToFormBtn = document.getElementById('scroll-to-form');
const orderForm = document.getElementById('order-form');
const orderFormSection = document.getElementById('order-form-section');

const metricTotalOrders = document.getElementById('metric-total-orders');
const metricTotalSales = document.getElementById('metric-total-sales');
const metricTotalQty = document.getElementById('metric-total-qty');
const metricPending = document.getElementById('metric-pending');

const statusStyles = {
  'รอชำระเงิน': 'bg-rose-50 text-rose-600',
  'กำลังผลิต': 'bg-amber-50 text-amber-600',
  'รอจัดส่ง': 'bg-slate-100 text-slate-600',
  'จัดส่งแล้ว': 'bg-emerald-50 text-emerald-600',
};

const paymentStyles = {
  'ยังไม่ชำระ': 'text-rose-600',
  'มัดจำแล้ว': 'text-amber-600',
  'ชำระเต็มจำนวน': 'text-emerald-600',
};

let cachedOrders = [];

init();

function init() {
  fetchOrders();

  if (refreshOrdersBtn) {
    refreshOrdersBtn.addEventListener('click', fetchOrders);
  }

  if (scrollToFormBtn && orderFormSection) {
    scrollToFormBtn.addEventListener('click', () => {
      orderFormSection.scrollIntoView({ behavior: 'smooth' });
    });
  }

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

        if (!response.ok) throw new Error('ส่งข้อมูลไม่สำเร็จ');

        orderForm.reset();
        await fetchOrders();
        alert('บันทึกคำสั่งซื้อสำเร็จ!');
      } catch (error) {
        console.error(error);
        alert('เกิดข้อผิดพลาดในการบันทึกคำสั่งซื้อ กรุณาตรวจสอบ ORDER_WEBHOOK_URL');
        fetchOrders();
      }
    });
  }
}

async function fetchOrders() {
  if (!orderTableBody) return;
  setOrderTableLoading('กำลังโหลดข้อมูล...');

  try {
    const response = await fetch(SHEET_ORDER_URL);
    if (!response.ok) throw new Error('โหลดข้อมูลไม่สำเร็จ');

    const text = await response.text();
    const json = JSON.parse(text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1));
    const rows = json.table?.rows || [];

    if (!rows.length) {
      cachedOrders = [];
      setOrderTableLoading('ยังไม่มีข้อมูลในชีต');
      updateMetrics();
      return;
    }

    cachedOrders = rows
      .map((row) => row.c || [])
      .map((cells) => ({
        id: formatCell(cells[0]),
        name: formatCell(cells[1]),
        type: formatCell(cells[2]),
        category: formatCell(cells[3]),
        date: formatCell(cells[4]),
        payment: formatCell(cells[5]),
        status: formatCell(cells[6]),
        quantity: Number(formatCell(cells[7]) || 0),
        total: Number(formatCell(cells[8]) || 0),
      }))
      .filter((order) => order.id && order.name);

    renderOrders();
    updateMetrics();
  } catch (error) {
    console.error(error);
    setOrderTableLoading('โหลดข้อมูลคำสั่งซื้อไม่สำเร็จ');
  }
}

function renderOrders() {
  if (!orderTableBody) return;
  if (!cachedOrders.length) {
    setOrderTableLoading('ยังไม่มีคำสั่งซื้อ');
    return;
  }

  const fragment = document.createDocumentFragment();

  cachedOrders.forEach((order) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="py-3 font-semibold text-slate-900">${order.id}</td>
      <td class="py-3 text-slate-700">${order.name}</td>
      <td class="py-3 text-slate-500">${order.type || '-'}</td>
      <td class="py-3 text-slate-500">${order.category || '-'}</td>
      <td class="py-3 text-slate-500">${order.date || '-'}</td>
      <td class="py-3 font-semibold ${paymentStyles[order.payment] || 'text-slate-600'}">${order.payment || '-'}</td>
      <td class="py-3">
        <span class="rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[order.status] || 'bg-slate-100 text-slate-600'}">${order.status || '-'}</span>
      </td>
      <td class="py-3 font-semibold text-slate-900">${order.quantity.toLocaleString('th-TH')}</td>
      <td class="py-3 font-semibold text-slate-900">${formatCurrency(order.total)}</td>
      <td class="py-3 text-right text-sm">
        <a href="https://docs.google.com/spreadsheets/d/1i3XMdNVGD9-MSCi9UKHcDuUXC7oGmLXNI5bvEhsoCaU/edit?gid=1366868069#gid=1366868069" target="_blank" class="text-primary hover:text-primary-dark">ดูในชีต</a>
      </td>
    `;
    fragment.appendChild(tr);
  });

  orderTableBody.innerHTML = '';
  orderTableBody.appendChild(fragment);
}

function updateMetrics() {
  const totalOrders = cachedOrders.length;
  const totalSales = cachedOrders.reduce((sum, order) => sum + (order.total || 0), 0);
  const totalQty = cachedOrders.reduce((sum, order) => sum + (order.quantity || 0), 0);
  const pendingOrders = cachedOrders.filter((order) => order.status === 'รอชำระเงิน').length;

  if (metricTotalOrders) metricTotalOrders.textContent = totalOrders.toLocaleString('th-TH');
  if (metricTotalSales) metricTotalSales.textContent = formatCurrency(totalSales);
  if (metricTotalQty) metricTotalQty.textContent = totalQty.toLocaleString('th-TH');
  if (metricPending) metricPending.textContent = pendingOrders.toLocaleString('th-TH');
}

function setOrderTableLoading(message) {
  if (!orderTableBody) return;
  orderTableBody.innerHTML = `
    <tr>
      <td colspan="10" class="py-6 text-center text-slate-500">${message}</td>
    </tr>
  `;
}

function formatCurrency(value) {
  if (!value) return '฿0';
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCell(cell) {
  if (!cell || cell.v === null || cell.v === undefined) return '';
  return typeof cell.v === 'number' ? cell.v.toString() : cell.v;
}
