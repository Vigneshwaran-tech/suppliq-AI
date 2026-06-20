const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toDate = (value) => {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (value === null || value === undefined) return null;

  // Check for Excel serial date numbers
  const num = Number(value);
  if (!Number.isNaN(num) && num > 20000 && num < 60000) {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    return new Date(excelEpoch.getTime() + num * 24 * 60 * 60 * 1000);
  }

  const str = String(value).trim();
  if (!str) return null;

  // Try standard JS parser first
  let date = new Date(str);
  if (!Number.isNaN(date.getTime())) {
    return date;
  }

  // Parse DD/MM/YYYY or DD-MM-YYYY
  const match = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (match) {
    const d = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    const y = parseInt(match[3], 10);
    if (d > 12) {
      return new Date(Date.UTC(y, m - 1, d));
    } else if (m > 12) {
      return new Date(Date.UTC(y, d - 1, m));
    } else {
      // Default to DD-MM-YYYY for standard international usage
      return new Date(Date.UTC(y, m - 1, d));
    }
  }

  // Parse YYYY/MM/DD or YYYY-MM-DD
  const matchIso = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (matchIso) {
    const y = parseInt(matchIso[1], 10);
    const m = parseInt(matchIso[2], 10);
    const d = parseInt(matchIso[3], 10);
    return new Date(Date.UTC(y, m - 1, d));
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

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function cleanProjectLogs(logs = []) {
  return logs
    .map((row) => {
      const plannedDate = toDate(row.planned_date || row.plannedDate || row.target_date || row.due_date || row.Expected_End_Date);
      const actualDate = toDate(row.actual_date || row.actualDate || row.completed_date || row.completedDate || row.Actual_End_Date);
      let projectName = row.project_name || row.projectName || row.Project_Name || row.name;
      if (projectName) {
        projectName = projectName.replace(/^["']|["']$/g, '').trim();
      }

      if (!projectName || !plannedDate || !actualDate) {
        return null;
      }

      const plannedBudget = toNumber(row.planned_budget ?? row.plannedBudget ?? row.plannedbudget ?? row.budget_planned ?? row.estimated_budget ?? row.Planned_Budget);
      const actualBudget = toNumber(row.actual_budget ?? row.actualBudget ?? row.actualbudget ?? row.budget_spent ?? row.actual_spent ?? row.Actual_Budget ?? plannedBudget);
      const blockersCount = toNumber(row.blockers_count ?? row.blockersCount ?? row.blockerscount ?? row.blocker_count ?? row.risk_items ?? row.Blockers_Count);
      const scopeChangeCount = toNumber(row.scope_change_count ?? row.scopeChangeCount ?? row.scopechangecount ?? row.change_requests ?? row.scope_changes ?? row.Change_Requests);
      const delayDays = Math.round((actualDate.getTime() - plannedDate.getTime()) / 86400000);

      return {
        projectName,
        milestoneId: row.milestone_id || row.milestoneId || row.task_id || row.taskId || `MS-${Math.random().toString(36).slice(2, 8)}`,
        milestoneName: row.milestone_name || row.milestoneName || row.task_name || row.taskName || 'Milestone',
        plannedDate: plannedDate.toISOString().slice(0, 10),
        actualDate: actualDate.toISOString().slice(0, 10),
        monthKey: plannedDate.toISOString().slice(0, 7),
        plannedBudget,
        actualBudget,
        blockersCount,
        scopeChangeCount,
        budgetVariance: actualBudget - plannedBudget,
        budgetVariancePct: plannedBudget ? ((actualBudget - plannedBudget) / plannedBudget) * 100 : 0,
        delayDays,
      };
    })
    .filter(Boolean);
}

function groupByProject(logs) {
  return logs.reduce((map, row) => {
    const bucket = map.get(row.projectName) || [];
    bucket.push(row);
    map.set(row.projectName, bucket);
    return map;
  }, new Map());
}

function getConsecutiveDelayedWindows(months) {
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

function buildProjectForecast(rows) {
  const totalMilestones = rows.length;
  const onTimeMilestones = rows.filter((row) => row.delayDays <= 0).length;
  const totalPlannedBudget = rows.reduce((sum, row) => sum + row.plannedBudget, 0);
  const totalActualBudget = rows.reduce((sum, row) => sum + row.actualBudget, 0);
  const totalBlockers = rows.reduce((sum, row) => sum + row.blockersCount, 0);
  const totalScopeChanges = rows.reduce((sum, row) => sum + row.scopeChangeCount, 0);
  const positiveDelays = rows.map((row) => Math.max(row.delayDays, 0));
  const delayedRows = rows.filter((row) => row.delayDays > 0);
  const delayedMonths = delayedRows.map((row) => row.monthKey);
  const avgDelay = positiveDelays.reduce((sum, value) => sum + value, 0) / Math.max(totalMilestones, 1);
  const onTimeRate = (onTimeMilestones / Math.max(totalMilestones, 1)) * 100;
  const budgetVariance = totalActualBudget - totalPlannedBudget;
  const budgetVarianceRate = totalPlannedBudget ? (budgetVariance / totalPlannedBudget) * 100 : 0;
  const scheduleRiskScore = Math.min(100, avgDelay * 18 + delayedRows.length * 8 + totalScopeChanges * 1.5);
  const budgetRiskScore = Math.min(100, Math.max(0, budgetVarianceRate * 3.5) + totalBlockers * 2.5 + totalScopeChanges * 2);
  const compositeRiskScore = Math.round(0.55 * scheduleRiskScore + 0.45 * budgetRiskScore);
  const riskLevel = levelFromScore(compositeRiskScore);
  const delayProbability = clamp(Math.round(25 + delayedRows.length * 10 + avgDelay * 5 + budgetVarianceRate * 0.8 + totalBlockers * 1.5), 5, 95);
  const volatility = positiveDelays.length > 1
    ? Math.round(
        Math.sqrt(
          positiveDelays.reduce((sum, value) => sum + (value - avgDelay) ** 2, 0) /
            Math.max(positiveDelays.length - 1, 1),
        ) * 10,
      ) / 10
    : 0;

  const executionRiskScore = Math.min(100, Math.round(0.5 * compositeRiskScore + 0.3 * delayProbability + 0.2 * volatility * 8));
  const forecastedBudgetOverrun = Math.max(0, Math.round(budgetVariance));
  const delayedStreak = getConsecutiveDelayedWindows(delayedMonths);
  const nextRiskWindows = (delayedStreak.length === 3 ? delayedStreak : delayedMonths.slice(-3)).map((monthKey) => addMonths(monthKey, 3));

  return {
    projectName: rows[0].projectName,
    totalMilestones,
    onTimeRate: Number(onTimeRate.toFixed(1)),
    avgDelay: Number(avgDelay.toFixed(1)),
    compositeRiskScore,
    riskLevel,
    delayProbability,
    delayedMonths,
    delayedStreak,
    nextRiskWindows,
    scheduleRiskScore: Math.round(scheduleRiskScore),
    budgetRiskScore: Math.round(budgetRiskScore),
    executionRiskScore,
    executionRiskLevel: levelFromScore(executionRiskScore),
    forecastedBudgetOverrun,
    totalPlannedBudget: Math.round(totalPlannedBudget),
    totalActualBudget: Math.round(totalActualBudget),
    budgetVarianceRate: Number(budgetVarianceRate.toFixed(1)),
    totalBlockers,
    totalScopeChanges,
    volatility,
    predictionConfidence: clamp(Math.round(78 - volatility * 3 + rows.length * 2), 45, 96),
  };
}

export function analyzeProjectRisk(logs = []) {
  const clean = cleanProjectLogs(logs);
  const byProject = groupByProject(clean);

  const projects = Array.from(byProject.values()).map(buildProjectForecast).sort(
    (left, right) => right.compositeRiskScore - left.compositeRiskScore,
  );

  const topRiskProject = projects[0] || null;
  const topScheduleRisk = [...projects].sort(
    (left, right) => right.scheduleRiskScore - left.scheduleRiskScore,
  )[0] || null;
  const topBudgetRisk = [...projects].sort((left, right) => right.budgetRiskScore - left.budgetRiskScore)[0] || null;

  const averageOnTimeRate = projects.length
    ? projects.reduce((sum, project) => sum + project.onTimeRate, 0) / projects.length
    : 0;

  const totalForecastOverrun = projects.reduce((sum, project) => sum + project.forecastedBudgetOverrun, 0);

  return {
    records: clean,
    projects,
    topRiskProject,
    topScheduleRisk,
    topBudgetRisk,
    totalMilestones: clean.length,
    totalProjects: projects.length,
    summary: {
      highRiskProjects: projects.filter((project) => project.riskLevel === 'High').length,
      averageOnTimeRate: Number(averageOnTimeRate.toFixed(1)),
      totalForecastOverrun,
      averageCompositeRisk: projects.length
        ? Math.round(projects.reduce((sum, project) => sum + project.compositeRiskScore, 0) / projects.length)
        : 0,
    },
  };
}

export function buildProjectBrief(forecast) {
  if (!forecast) {
    return null;
  }

  const buffer = clamp(Math.round(forecast.compositeRiskScore / 12), 2, 12);

  return {
    projectName: forecast.projectName,
    onTimeRate: forecast.onTimeRate,
    forecastedBudgetOverrun: forecast.forecastedBudgetOverrun,
    recommendedContingencyPct: buffer,
    summary:
      forecast.riskLevel === 'High'
        ? 'Escalate the recovery plan, freeze non-essential scope, and add a delivery contingency buffer.'
        : forecast.riskLevel === 'Medium'
          ? 'Tighten milestone tracking, protect budget reserves, and watch the next risk window.'
          : 'Keep the current plan, monitor the next milestone set, and revisit only if the trend changes.',
  };
}

export const cleanLogs = cleanProjectLogs;
export const analyzeSupplierRisk = analyzeProjectRisk;
export const buildNegotiationBrief = buildProjectBrief;