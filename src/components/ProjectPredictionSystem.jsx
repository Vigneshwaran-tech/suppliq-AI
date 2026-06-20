import { useMemo, useRef, useState } from 'react';
import { demoProjectLogs } from '../data/demoProjectLogs';
import { analyzeProjectRisk, buildProjectBrief } from '../utils/projectPredictiveEngine';
import { parseProjectCsv } from '../services/csvUpload';

const stageCards = [
  {
    title: 'Data layer',
    body: 'Sample project milestone logs for 5-8 projects. Upload a CSV or load the demo set.',
  },
  {
    title: 'Ingestion',
    body: 'Parse milestone, date, budget, blocker, and scope-change columns in the browser.',
  },
  {
    title: 'Prediction',
    body: 'Flag projects with repeated schedule drift, budget pressure, and likely next risk windows.',
  },
  {
    title: 'Action',
    body: 'Generate a project recovery brief and prioritize the programs that need attention first.',
  },
];

function levelClass(level) {
  if (level === 'High') return 'bg-red-500/15 text-red-200 border-red-400/25';
  if (level === 'Medium') return 'bg-amber-500/15 text-amber-200 border-amber-400/25';
  return 'bg-emerald-500/15 text-emerald-200 border-emerald-400/25';
}

function riskLabel(score) {
  if (score < 35) return 'Low';
  if (score < 65) return 'Medium';
  return 'High';
}

function formatCurrency(value) {
  return `₹${value.toLocaleString('en-IN')}`;
}

export default function ProjectPredictionSystem() {
  const [records, setRecords] = useState(demoProjectLogs);
  const [selectedProjectName, setSelectedProjectName] = useState(demoProjectLogs[0]?.project_name || '');
  const [projectBrief, setProjectBrief] = useState(null);
  const [uploadMessage, setUploadMessage] = useState('Loaded demo project milestones.');
  const tableRef = useRef(null);

  const analysis = useMemo(() => analyzeProjectRisk(records), [records]);
  const selectedForecast =
    analysis.projects.find((project) => project.projectName === selectedProjectName) || analysis.topRiskProject;

  const handleLoadDemo = () => {
    setRecords(demoProjectLogs);
    setSelectedProjectName(demoProjectLogs[0]?.project_name || '');
    setProjectBrief(null);
    setUploadMessage('Loaded demo project milestones.');
  };

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const parsedRows = await parseProjectCsv(file);
      setRecords(parsedRows);
      setSelectedProjectName(parsedRows[0]?.project_name || parsedRows[0]?.projectName || '');
      setProjectBrief(null);
      setUploadMessage(`Loaded ${parsedRows.length} project rows from ${file.name}.`);
    } catch (error) {
      setUploadMessage('Could not read that CSV. Use project_name, milestone_id, planned_date, actual_date, planned_budget, actual_budget, blockers_count.');
    } finally {
      event.target.value = '';
    }
  };

  const handleGenerateBrief = () => {
    setProjectBrief(buildProjectBrief(selectedForecast));
  };

  const focusHighRiskProject = () => {
    if (!analysis.topRiskProject) {
      return;
    }

    setSelectedProjectName(analysis.topRiskProject.projectName);
    tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <main className="min-h-screen bg-[#070b14] text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
        <section className="rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(20,32,54,0.96),rgba(9,14,28,0.98))] p-6 shadow-2xl shadow-black/30">
          <div className="max-w-4xl">
            <p className="text-xs uppercase tracking-[0.35em] text-cyan-300">AI Predictive Project Intelligence</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight text-white sm:text-5xl">
              Predict project delay risk, budget overrun, and which milestones will slip next.
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300">
              This is a rule-based forecast engine for project logs. It uses milestone history to flag repeated schedule drift,
              rising budget pressure, and the next risk windows that deserve attention.
            </p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <button
              type="button"
              onClick={focusHighRiskProject}
              className="rounded-3xl border border-red-400/25 bg-red-500/10 p-5 text-left transition hover:bg-red-500/20"
            >
              <p className="text-xs uppercase tracking-[0.25em] text-red-200/80">High Risk Projects</p>
              <p className="mt-2 text-3xl font-black text-white">{analysis.summary.highRiskProjects}</p>
              <p className="mt-2 text-sm text-slate-300">Click to jump to the riskiest project.</p>
            </button>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Average on-time rate</p>
              <p className="mt-2 text-3xl font-black text-white">{analysis.summary.averageOnTimeRate}%</p>
              <p className="mt-2 text-sm text-slate-300">Schedule health across all projects</p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Forecasted overrun</p>
              <p className="mt-2 text-3xl font-black text-white">{formatCurrency(analysis.summary.totalForecastOverrun)}</p>
              <p className="mt-2 text-sm text-slate-300">Estimated budget pressure</p>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {stageCards.map((card) => (
              <article key={card.title} className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <p className="text-sm font-semibold text-white">{card.title}</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">{card.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="space-y-6">
            <div ref={tableRef} className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Data layer</p>
              <h2 className="mt-2 text-2xl font-bold text-white">Upload project logs</h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                CSV columns: project_name, milestone_id, milestone_name, planned_date, actual_date, planned_budget, actual_budget, blockers_count, scope_change_count.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleLoadDemo}
                  className="rounded-full bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950"
                >
                  Load demo data
                </button>
                <label className="cursor-pointer rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white">
                  Upload CSV
                  <input className="hidden" type="file" accept=".csv" onChange={handleUpload} />
                </label>
              </div>
              <p className="mt-4 text-sm text-slate-400">{uploadMessage}</p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Prediction output</p>
              <h2 className="mt-2 text-2xl font-bold text-white">Top project at risk</h2>
              {analysis.topRiskProject ? (
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-white">{analysis.topRiskProject.projectName}</p>
                      <p className="text-sm text-slate-400">Highest composite risk score</p>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${levelClass(analysis.topRiskProject.riskLevel)}`}>
                      {analysis.topRiskProject.riskLevel}
                    </span>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Metric label="Delay probability" value={`${analysis.topRiskProject.delayProbability}%`} />
                    <Metric label="On-time rate" value={`${analysis.topRiskProject.onTimeRate}%`} />
                    <Metric label="Budget risk" value={`${riskLabel(analysis.topRiskProject.budgetRiskScore)} (${analysis.topRiskProject.budgetRiskScore})`} />
                    <Metric label="Prediction confidence" value={`${analysis.topRiskProject.predictionConfidence}%`} />
                  </div>

                  <p className="text-sm leading-6 text-slate-300">
                    Delayed milestones: {analysis.topRiskProject.delayedMonths.length ? analysis.topRiskProject.delayedMonths.join(', ') : 'None'}
                  </p>
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-400">No project data loaded.</p>
              )}
            </div>
          </aside>

          <section className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Intelligence engine</p>
                  <h2 className="mt-2 text-2xl font-bold text-white">Ranked project risk list</h2>
                </div>
                <div className="text-sm text-slate-400">
                  {analysis.totalProjects} projects · {analysis.totalMilestones} milestones
                </div>
              </div>

              <div className="mt-5 overflow-hidden rounded-2xl border border-white/10">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-white/5 text-slate-300">
                    <tr>
                      <th className="px-4 py-3 font-medium">Project</th>
                      <th className="px-4 py-3 font-medium">On-time</th>
                      <th className="px-4 py-3 font-medium">Delay risk</th>
                      <th className="px-4 py-3 font-medium">Budget risk</th>
                      <th className="px-4 py-3 font-medium">Composite risk</th>
                      <th className="px-4 py-3 font-medium">Confidence</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {analysis.projects.map((project) => {
                      const isSelected = project.projectName === selectedForecast?.projectName;

                      return (
                        <tr
                          key={project.projectName}
                          onClick={() => setSelectedProjectName(project.projectName)}
                          className={`cursor-pointer transition hover:bg-white/5 ${isSelected ? 'bg-cyan-400/10' : ''}`}
                        >
                          <td className="px-4 py-4 font-medium text-white">{project.projectName}</td>
                          <td className="px-4 py-4 text-slate-300">{project.onTimeRate}%</td>
                          <td className="px-4 py-4">
                            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${levelClass(project.riskLevel)}`}>
                              {project.riskLevel} ({project.delayProbability}%)
                            </span>
                          </td>
                          <td className="px-4 py-4 text-slate-300">{riskLabel(project.budgetRiskScore)}</td>
                          <td className="px-4 py-4 text-slate-300">{project.compositeRiskScore}</td>
                          <td className="px-4 py-4 text-slate-300">{project.predictionConfidence}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Pattern finder</p>
                    <h2 className="mt-2 text-2xl font-bold text-white">Next risky windows</h2>
                  </div>
                  <button
                    type="button"
                    onClick={handleGenerateBrief}
                    className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950"
                  >
                    Generate recovery brief
                  </button>
                </div>

                {selectedForecast ? (
                  <div className="mt-5 space-y-4">
                    <p className="text-sm leading-6 text-slate-300">
                      {selectedForecast.delayedStreak.length
                        ? `This project delayed in ${selectedForecast.delayedStreak.join(', ')}. The engine flags the next risky windows: ${selectedForecast.nextRiskWindows.join(', ')}.`
                        : 'No repeat pattern detected yet.'}
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Metric label="Composite risk" value={selectedForecast.compositeRiskScore} />
                      <Metric label="Forecasted overrun" value={formatCurrency(selectedForecast.forecastedBudgetOverrun)} />
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Recovery report</p>
                <h2 className="mt-2 text-2xl font-bold text-white">What to say in the planning meeting</h2>

                {projectBrief ? (
                  <div className="mt-5 space-y-3">
                    <Metric label="Project" value={projectBrief.projectName} />
                    <Metric label="On-time rate" value={`${projectBrief.onTimeRate}%`} />
                    <Metric label="Forecasted overrun" value={formatCurrency(projectBrief.forecastedBudgetOverrun)} />
                    <Metric label="Suggested contingency" value={`${projectBrief.recommendedContingencyPct}%`} />
                    <p className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-6 text-slate-200">
                      {projectBrief.summary}
                    </p>
                  </div>
                ) : (
                  <p className="mt-5 text-sm text-slate-400">Click the button to generate a recovery brief for the selected project.</p>
                )}
              </div>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className="mt-2 text-base font-semibold text-white">{value}</p>
    </div>
  );
}