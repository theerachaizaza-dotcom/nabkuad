import * as XLSX from 'xlsx';

export type CountDetailRow = {
  location: string;
  category: string;
  product: string;
  sku: string;
  capacityMl: number;
  fullBottles: number;
  leftoverMl: number;
  netQty: number;
  price: number | null;
  value: number | null;
  status: string;
  submittedAt: string;
};

export type LocationSummaryRow = {
  location: string;
  itemCount: number;
  totalNet: number;
  totalValue: number;
};

const DETAIL_HEADERS = [
  'Location',
  'Category',
  'Product',
  'SKU',
  'Capacity (ml)',
  'Full Btl',
  'Leftover ML',
  'Net Qty',
  'Price (฿)',
  'Value (฿)',
  'Status',
  'Submitted At',
];

const SUMMARY_HEADERS = ['Location', 'Item Count', 'Total Net', 'Total Value (฿)'];

function round(value: number, digits: number) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function buildCountDetailSheet(rows: CountDetailRow[]) {
  const totalNet = rows.reduce((sum, r) => sum + r.netQty, 0);
  const totalValue = rows.reduce((sum, r) => sum + (r.value ?? 0), 0);

  const aoa: (string | number)[][] = [DETAIL_HEADERS];

  for (const r of rows) {
    aoa.push([
      r.location,
      r.category,
      r.product,
      r.sku,
      r.capacityMl,
      r.fullBottles,
      r.leftoverMl,
      round(r.netQty, 3),
      r.price ?? '',
      r.value !== null ? round(r.value, 2) : '',
      r.status,
      r.submittedAt,
    ]);
  }

  aoa.push(['TOTAL', '', '', '', '', '', '', round(totalNet, 3), '', round(totalValue, 2), '', '']);

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = [
    { wch: 16 },
    { wch: 18 },
    { wch: 30 },
    { wch: 12 },
    { wch: 13 },
    { wch: 10 },
    { wch: 12 },
    { wch: 10 },
    { wch: 11 },
    { wch: 12 },
    { wch: 11 },
    { wch: 18 },
  ];
  return ws;
}

function buildLocationSummarySheet(rows: LocationSummaryRow[]) {
  const grandItems = rows.reduce((sum, r) => sum + r.itemCount, 0);
  const grandNet = rows.reduce((sum, r) => sum + r.totalNet, 0);
  const grandValue = rows.reduce((sum, r) => sum + r.totalValue, 0);

  const aoa: (string | number)[][] = [SUMMARY_HEADERS];

  for (const r of rows) {
    aoa.push([r.location, r.itemCount, round(r.totalNet, 3), round(r.totalValue, 2)]);
  }

  aoa.push(['GRAND TOTAL', grandItems, round(grandNet, 3), round(grandValue, 2)]);

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = [{ wch: 18 }, { wch: 12 }, { wch: 12 }, { wch: 16 }];
  return ws;
}

export function buildExportWorkbook(detailRows: CountDetailRow[], summaryRows: LocationSummaryRow[]) {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, buildCountDetailSheet(detailRows), 'Count Detail');
  XLSX.utils.book_append_sheet(wb, buildLocationSummarySheet(summaryRows), 'Summary by Location');
  return wb;
}
