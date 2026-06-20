const months = [
  { key: '2026-01', promiseDay: 12 },
  { key: '2026-02', promiseDay: 14 },
  { key: '2026-03', promiseDay: 11 },
  { key: '2026-04', promiseDay: 15 },
  { key: '2026-05', promiseDay: 13 },
  { key: '2026-06', promiseDay: 12 },
];

const projectPatterns = [
  {
    project_name: 'Phoenix ERP Rollout',
    plannedBudget: [1200000, 1220000, 1240000, 1250000, 1260000, 1280000],
    actualBudget: [1215000, 1250000, 1275000, 1300000, 1335000, 1360000],
    delays: [0, 1, 2, 3, 4, 5],
    blockers: [3, 4, 4, 5, 6, 7],
    changes: [1, 1, 2, 2, 3, 3],
  },
  {
    project_name: 'Northwind Mobile App',
    plannedBudget: [640000, 645000, 648000, 650000, 654000, 658000],
    actualBudget: [638000, 646000, 649000, 655000, 656000, 661000],
    delays: [0, 0, 1, 0, 1, 0],
    blockers: [1, 1, 2, 1, 2, 1],
    changes: [0, 0, 0, 1, 0, 1],
  },
  {
    project_name: 'Atlas Data Lake',
    plannedBudget: [1750000, 1760000, 1780000, 1790000, 1800000, 1820000],
    actualBudget: [1785000, 1810000, 1845000, 1860000, 1895000, 1930000],
    delays: [2, 3, 4, 2, 4, 5],
    blockers: [6, 7, 8, 8, 9, 10],
    changes: [2, 3, 3, 4, 4, 5],
  },
  {
    project_name: 'Vertex Automation',
    plannedBudget: [880000, 885000, 890000, 900000, 905000, 910000],
    actualBudget: [882000, 884000, 892000, 899000, 907000, 912000],
    delays: [-1, 0, 0, 1, 0, 1],
    blockers: [1, 1, 1, 2, 1, 1],
    changes: [0, 0, 0, 0, 1, 0],
  },
  {
    project_name: 'Helix Factory Upgrade',
    plannedBudget: [2100000, 2120000, 2140000, 2160000, 2180000, 2200000],
    actualBudget: [2145000, 2175000, 2200000, 2240000, 2275000, 2310000],
    delays: [3, 4, 3, 5, 4, 6],
    blockers: [7, 8, 8, 9, 10, 11],
    changes: [2, 2, 3, 3, 4, 4],
  },
  {
    project_name: 'Summit Cloud Migration',
    plannedBudget: [500000, 505000, 510000, 515000, 520000, 525000],
    actualBudget: [501000, 506000, 512000, 516000, 521000, 526000],
    delays: [0, 0, 0, 1, 0, 0],
    blockers: [1, 1, 1, 2, 1, 1],
    changes: [0, 0, 0, 0, 0, 0],
  },
];

function addDays(isoDate, days) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export const demoProjectLogs = projectPatterns.flatMap((project, projectIndex) =>
  months.map((month, monthIndex) => {
    const plannedDate = `${month.key}-${String(month.promiseDay).padStart(2, '0')}`;
    const delayDays = project.delays[monthIndex];

    return {
      project_name: project.project_name,
      milestone_id: `MS-${projectIndex + 1}-${monthIndex + 1}`,
      milestone_name: `Milestone ${monthIndex + 1}`,
      planned_date: plannedDate,
      actual_date: addDays(plannedDate, delayDays),
      planned_budget: project.plannedBudget[monthIndex],
      actual_budget: project.actualBudget[monthIndex],
      blockers_count: project.blockers[monthIndex],
      scope_change_count: project.changes[monthIndex],
    };
  }),
);