const months = [
  { key: '2026-01', promiseDay: 12 },
  { key: '2026-02', promiseDay: 13 },
  { key: '2026-03', promiseDay: 11 },
  { key: '2026-04', promiseDay: 15 },
  { key: '2026-05', promiseDay: 14 },
  { key: '2026-06', promiseDay: 12 },
];

const supplierPatterns = [
  {
    supplier_name: 'Atlas Precision',
    quantities: [420, 430, 450, 460, 470, 480],
    delays: [0, 1, 0, 2, 3, 4],
    defects: [4, 5, 3, 6, 7, 8],
  },
  {
    supplier_name: 'Nova Circuits',
    quantities: [380, 390, 395, 405, 415, 420],
    delays: [0, 0, 1, 0, 1, 0],
    defects: [2, 2, 3, 2, 3, 2],
  },
  {
    supplier_name: 'Vertex Polymer',
    quantities: [520, 510, 530, 540, 550, 560],
    delays: [2, 3, 4, 2, 3, 5],
    defects: [8, 9, 10, 8, 11, 12],
  },
  {
    supplier_name: 'Omni Fasteners',
    quantities: [300, 305, 310, 320, 330, 335],
    delays: [-1, 0, 0, 1, 0, 1],
    defects: [1, 1, 2, 1, 2, 1],
  },
  {
    supplier_name: 'Helix Systems',
    quantities: [610, 620, 625, 630, 640, 650],
    delays: [3, 4, 3, 5, 4, 6],
    defects: [10, 11, 10, 12, 13, 14],
  },
  {
    supplier_name: 'Summit Fabrication',
    quantities: [260, 265, 270, 275, 280, 285],
    delays: [0, 0, 0, 1, 0, 0],
    defects: [1, 1, 1, 2, 1, 1],
  },
  {
    supplier_name: 'Quantum Materials',
    quantities: [450, 460, 455, 470, 480, 490],
    delays: [1, 2, 1, 2, 1, 3],
    defects: [5, 5, 4, 6, 5, 7],
  },
];

function addDays(isoDate, days) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export const demoSupplierLogs = supplierPatterns.flatMap((supplier, supplierIndex) =>
  months.map((month, monthIndex) => {
    const promisedDate = `${month.key}-${String(month.promiseDay).padStart(2, '0')}`;
    const delayDays = supplier.delays[monthIndex];

    return {
      supplier_name: supplier.supplier_name,
      order_id: `PO-${supplierIndex + 1}-${monthIndex + 1}`,
      promised_date: promisedDate,
      actual_date: addDays(promisedDate, delayDays),
      quantity: supplier.quantities[monthIndex],
      defects_count: supplier.defects[monthIndex],
    };
  }),
);
