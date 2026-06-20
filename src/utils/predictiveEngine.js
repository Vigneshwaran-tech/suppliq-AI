const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toDate = (value) => {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (value === null || value === undefined) return null;

  const num = Number(value);
  if (!Number.isNaN(num) && num > 20000 && num < 60000) {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    return new Date(excelEpoch.getTime() + num * 24 * 60 * 60 * 1000);
  }

  const str = String(value).trim();
  if (!str) return null;

  const matchDmy = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (matchDmy) {
    const d = parseInt(matchDmy[1], 10);
    const m = parseInt(matchDmy[2], 10);
    const y = parseInt(matchDmy[3], 10);
    if (d > 12) {
      return new Date(Date.UTC(y, m - 1, d));
    } else if (m > 12) {
      return new Date(Date.UTC(y, d - 1, m));
    } else {
      return new Date(Date.UTC(y, m - 1, d));
    }
  }

  const matchYmd = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (matchYmd) {
    const y = parseInt(matchYmd[1], 10);
    const m = parseInt(matchYmd[2], 10);
    const d = parseInt(matchYmd[3], 10);
    return new Date(Date.UTC(y, m - 1, d));
  }

  const date = new Date(str);
  if (!Number.isNaN(date.getTime())) {
    return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes()));
  }

  return null;
};

const levelFromScore = (score) => {
  if (score < 35) return 'Low';
  if (score < 65) return 'Medium';
  return 'High';
};

function addMonths(isoMonth, monthsToAdd) {
  const [year, month] = isoMonth.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1 + monthsToAdd, 1));
  return date.toISOString().slice(0, 7);
}

export function cleanLogs(logs = []) {
  return logs
    .map((row) => {
      const promisedDate = toDate(
        row.promised_date ||
        row.promisedDate ||
        row.expected_delivery_date ||
        row.Expected_Delivery_Date
      );
      const actualDate = toDate(
        row.actual_date ||
        row.actualDate ||
        row.actual_delivery_date ||
        row.Actual_Delivery_Date
      );
      let supplierName = row.supplier_name || row.supplierName || row.Supplier_Name;
      if (supplierName) {
        supplierName = supplierName.replace(/^["']|["']$/g, '').trim();
      }

      if (!supplierName || !promisedDate || !actualDate) {
        return null;
      }

      const delayDays = Math.round((actualDate.getTime() - promisedDate.getTime()) / 86400000);

      return {
        supplierName,
        orderId: row.order_id || row.orderId || row.po_id || row.PO_ID || `PO-${Math.random().toString(36).slice(2, 8)}`,
        promisedDate: promisedDate.toISOString().slice(0, 10),
        actualDate: actualDate.toISOString().slice(0, 10),
        monthKey: promisedDate.toISOString().slice(0, 7),
        quantity: toNumber(row.quantity ?? row.ordered_qty ?? row.Ordered_Qty),
        defectsCount: toNumber(row.defects_count ?? row.defect_qty ?? row.Defect_Qty),
        delayDays,
      };
    })
    .filter(Boolean);
}

function groupBySupplier(logs) {
  return logs.reduce((map, row) => {
    const bucket = map.get(row.supplierName) || [];
    bucket.push(row);
    map.set(row.supplierName, bucket);
    return map;
  }, new Map());
}

function getConsecutiveDelayedMonths(months) {
  const sortedMonths = [...new Set(months)].sort();
  if (sortedMonths.length < 3) {
    return [];
  }

  for (let index = 0; index <= sortedMonths.length - 3; index += 1) {
    const first = sortedMonths[index];
    const second = addMonths(first, 1);
    const third = addMonths(first, 2);

    if (sortedMonths[index + 1] === second && sortedMonths[index + 2] === third) {
      return [first, second, third];
    }
  }

  return [];
}

function buildSupplierForecast(rows) {
  const totalDeliveries = rows.length;
  const onTimeDeliveries = rows.filter((row) => row.delayDays <= 0).length;
  const totalQuantity = rows.reduce((sum, row) => sum + row.quantity, 0);
  const totalDefects = rows.reduce((sum, row) => sum + row.defectsCount, 0);
  const positiveDelays = rows.map((row) => Math.max(row.delayDays, 0));
  const delayedRows = rows.filter((row) => row.delayDays > 0);
  const delayedMonths = delayedRows.map((row) => row.monthKey);
  const avgDelay = positiveDelays.reduce((sum, value) => sum + value, 0) / Math.max(totalDeliveries, 1);
  const defectRate = totalQuantity ? (totalDefects / totalQuantity) * 100 : 0;
  const otdScore = (onTimeDeliveries / Math.max(totalDeliveries, 1)) * 100;
  const delayScore = Math.min(100, avgDelay * 18);
  const defectScore = Math.min(100, defectRate * 10);
  const compositeRisk = Math.round(0.6 * delayScore + 0.4 * defectScore);
  const riskLevel = levelFromScore(compositeRisk);
  const delayProbability = Math.min(95, Math.max(5, Math.round(30 + delayedRows.length * 12 + avgDelay * 6 + defectRate * 1.4)));
  const volatility = positiveDelays.length > 1
    ? Math.round(
        Math.sqrt(
          positiveDelays.reduce((sum, value) => sum + (value - avgDelay) ** 2, 0) /
            Math.max(positiveDelays.length - 1, 1),
        ) * 10,
      ) / 10
    : 0;

  const productionObsolescenceScore = Math.min(100, Math.round(0.55 * compositeRisk + 0.25 * defectScore + 0.2 * volatility * 8));
  const rndObsolescenceScore = Math.min(100, Math.round(0.45 * compositeRisk + 0.35 * delayProbability + 0.2 * volatility * 8));

  const delayedStreak = getConsecutiveDelayedMonths(delayedMonths);
  const nextCycleMonths = delayedStreak.length === 3 ? delayedStreak : delayedMonths.slice(-3);
  const nextCycleWarnings = nextCycleMonths.map((monthKey) => addMonths(monthKey, 12));

  return {
    supplierName: rows[0].supplierName,
    totalDeliveries,
    otdScore: Number(otdScore.toFixed(1)),
    defectRate: Number(defectRate.toFixed(2)),
    avgDelay: Number(avgDelay.toFixed(1)),
    compositeRisk,
    riskLevel,
    delayProbability,
    delayedMonths,
    delayedStreak,
    nextCycleWarnings,
    productionObsolescenceScore,
    rndObsolescenceScore,
    productionObsolescenceLevel: levelFromScore(productionObsolescenceScore),
    rndObsolescenceLevel: levelFromScore(rndObsolescenceScore),
    volatility,
    estimatedDelayCost: Math.round(rows.reduce((sum, row) => sum + Math.max(row.delayDays, 0) * row.quantity * 8, 0)),
  };
}

export function analyzeSupplierRisk(logs = []) {
  const clean = cleanLogs(logs);
  const bySupplier = groupBySupplier(clean);

  const suppliers = Array.from(bySupplier.values()).map(buildSupplierForecast).sort(
    (left, right) => right.compositeRisk - left.compositeRisk,
  );

  const topRiskSupplier = suppliers[0] || null;
  const topProductionRisk = [...suppliers].sort(
    (left, right) => right.productionObsolescenceScore - left.productionObsolescenceScore,
  )[0] || null;
  const topRnDRisk = [...suppliers].sort((left, right) => right.rndObsolescenceScore - left.rndObsolescenceScore)[0] || null;

  const averageOtd = suppliers.length
    ? suppliers.reduce((sum, supplier) => sum + supplier.otdScore, 0) / suppliers.length
    : 0;

  const totalLoss = suppliers.reduce((sum, supplier) => sum + supplier.estimatedDelayCost, 0);

  return {
    records: clean,
    suppliers,
    topRiskSupplier,
    topProductionRisk,
    topRnDRisk,
    totalRecords: clean.length,
    totalSuppliers: suppliers.length,
    summary: {
      highRiskSuppliers: suppliers.filter((supplier) => supplier.riskLevel === 'High').length,
      averageOtd: Number(averageOtd.toFixed(1)),
      totalLoss,
    },
  };
}

export function buildNegotiationBrief(forecast) {
  if (!forecast) {
    return null;
  }

  const reduction = Math.min(8, Math.max(1, Math.round(forecast.compositeRisk / 15)));

  return {
    supplierName: forecast.supplierName,
    otdScore: forecast.otdScore,
    estimatedDelayCost: forecast.estimatedDelayCost,
    recommendedPriceReductionPct: reduction,
    summary:
      forecast.riskLevel === 'High'
        ? 'Escalate SLA review and use delay evidence to renegotiate pricing and service credits.'
        : forecast.riskLevel === 'Medium'
          ? 'Request modest commercial relief and tighter delivery commitments.'
          : 'Keep current terms and monitor the next delivery cycle.',
  };
}
