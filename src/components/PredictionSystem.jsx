import { useMemo, useRef, useState } from 'react';
import { demoSupplierLogs } from '../data/demoSupplierLogs';
import { analyzeSupplierRisk, buildNegotiationBrief } from '../utils/predictiveEngine';
import { parseSupplierCsv } from '../services/csvUpload';

const stageCards = [
  {
    title: 'Data layer',
    body: 'Fake 6-month delivery logs for 5–8 suppliers. Upload CSV or load the demo set.',
  },
  {
    title: 'Ingestion',
    body: 'Parse the CSV in the browser and compute delay days per order automatically.',
  },
  {
    title: 'Prediction',
    body: 'Flag suppliers with repeated late patterns and map the next risky months.',
  },
  {
    title: 'Action',
    body: 'Generate a negotiation brief and highlight the suppliers to watch or replace.',
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

export default function PredictionSystem() {
  const [records, setRecords] = useState(demoSupplierLogs);
  const [selectedSupplierName, setSelectedSupplierName] = useState(demoSupplierLogs[0]?.supplier_name || '');
  const [negotiationBrief, setNegotiationBrief] = useState(null);
  const [uploadMessage, setUploadMessage] = useState('Loaded demo supplier logs.');
  const riskTableRef = useRef(null);

  const analysis = useMemo(() => analyzeSupplierRisk(records), [records]);
  const selectedForecast =
    analysis.suppliers.find((supplier) => supplier.supplierName === selectedSupplierName) || analysis.topRiskSupplier;

  const handleLoadDemo = () => {
    setRecords(demoSupplierLogs);
    setSelectedSupplierName(demoSupplierLogs[0]?.supplier_name || '');
    setNegotiationBrief(null);
    setUploadMessage('Loaded demo supplier logs.');
  };

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const parsedRows = await parseSupplierCsv(file);
      setRecords(parsedRows);
      setSelectedSupplierName(parsedRows[0]?.supplier_name || parsedRows[0]?.supplierName || '');
      setNegotiationBrief(null);
      setUploadMessage(`Loaded ${parsedRows.length} delivery rows from ${file.name}.`);
    } catch (error) {
      setUploadMessage('Could not read that CSV. Use supplier_name, order_id, promised_date, actual_date, quantity, defects_count.');
    } finally {
      event.target.value = '';
    }
  };

  const handleGenerateBrief = () => {
    setNegotiationBrief(buildNegotiationBrief(selectedForecast));
  };

  const focusHighRiskSupplier = () => {
    if (!analysis.topRiskSupplier) {
      return;
    }

    setSelectedSupplierName(analysis.topRiskSupplier.supplierName);
    riskTableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <main className="min-h-screen bg-[#070b14] text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
        <section className="rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(20,32,54,0.96),rgba(9,14,28,0.98))] p-6 shadow-2xl shadow-black/30">
          <div className="max-w-4xl">
            <p className="text-xs uppercase tracking-[0.35em] text-cyan-300">Predictive Supplier Failure System</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight text-white sm:text-5xl">
              Predict late-delivery risk, supplier obsolescence, and the months that will go bad again.
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300">
              This is a rule-based forecast engine, not a generic dashboard. It uses six months of supplier logs to flag
              repeated delay patterns, production obsolescence risk, R&D obsolescence risk, and the next risky months.
            </p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <button
              type="button"
              onClick={focusHighRiskSupplier}
              className="rounded-3xl border border-red-400/25 bg-red-500/10 p-5 text-left transition hover:bg-red-500/20"
            >
              <p className="text-xs uppercase tracking-[0.25em] text-red-200/80">High Risk Suppliers</p>
              <p className="mt-2 text-3xl font-black text-white">{analysis.summary.highRiskSuppliers}</p>
              <p className="mt-2 text-sm text-slate-300">Click to jump to the riskiest supplier.</p>
            </button>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Average OTD</p>
              <p className="mt-2 text-3xl font-black text-white">{analysis.summary.averageOtd}%</p>
              <p className="mt-2 text-sm text-slate-300">On-time delivery benchmark</p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Total Business Loss</p>
              <p className="mt-2 text-3xl font-black text-white">₹{analysis.summary.totalLoss.toLocaleString('en-IN')}</p>
              <p className="mt-2 text-sm text-slate-300">Estimated delay and defect cost</p>
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
            <div ref={riskTableRef} className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Data layer</p>
              <h2 className="mt-2 text-2xl font-bold text-white">Upload supplier logs</h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                CSV columns: supplier_name, order_id, promised_date, actual_date, quantity, defects_count.
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
              <h2 className="mt-2 text-2xl font-bold text-white">Top supplier at risk</h2>
              {analysis.topRiskSupplier ? (
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-white">{analysis.topRiskSupplier.supplierName}</p>
                      <p className="text-sm text-slate-400">Highest composite risk score</p>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${levelClass(analysis.topRiskSupplier.riskLevel)}`}>
                      {analysis.topRiskSupplier.riskLevel}
                    </span>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Metric label="Late delivery probability" value={`${analysis.topRiskSupplier.delayProbability}%`} />
                    <Metric label="OTD score" value={`${analysis.topRiskSupplier.otdScore}%`} />
                    <Metric label="Production obsolescence" value={analysis.topRiskSupplier.productionObsolescenceLevel} />
                    <Metric label="R&D obsolescence" value={analysis.topRiskSupplier.rndObsolescenceLevel} />
                  </div>

                  <p className="text-sm leading-6 text-slate-300">
                    Delayed months: {analysis.topRiskSupplier.delayedMonths.length ? analysis.topRiskSupplier.delayedMonths.join(', ') : 'None'}
                  </p>
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-400">No supplier data loaded.</p>
              )}
            </div>
          </aside>

          <section className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Intelligence engine</p>
                  <h2 className="mt-2 text-2xl font-bold text-white">Ranked supplier risk list</h2>
                </div>
                <div className="text-sm text-slate-400">
                  {analysis.totalSuppliers} suppliers · {analysis.totalRecords} rows
                </div>
              </div>

              <div className="mt-5 overflow-hidden rounded-2xl border border-white/10">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-white/5 text-slate-300">
                    <tr>
                      <th className="px-4 py-3 font-medium">Supplier</th>
                      <th className="px-4 py-3 font-medium">OTD</th>
                      <th className="px-4 py-3 font-medium">Defect rate</th>
                      <th className="px-4 py-3 font-medium">Late delivery risk</th>
                      <th className="px-4 py-3 font-medium">Production risk</th>
                      <th className="px-4 py-3 font-medium">R&D risk</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {analysis.suppliers.map((supplier) => {
                      const isSelected = supplier.supplierName === selectedForecast?.supplierName;

                      return (
                        <tr
                          key={supplier.supplierName}
                          onClick={() => setSelectedSupplierName(supplier.supplierName)}
                          className={`cursor-pointer transition hover:bg-white/5 ${isSelected ? 'bg-cyan-400/10' : ''}`}
                        >
                          <td className="px-4 py-4 font-medium text-white">{supplier.supplierName}</td>
                          <td className="px-4 py-4 text-slate-300">{supplier.otdScore}%</td>
                          <td className="px-4 py-4 text-slate-300">{supplier.defectRate}%</td>
                          <td className="px-4 py-4">
                            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${levelClass(supplier.riskLevel)}`}>
                              {supplier.riskLevel} ({supplier.delayProbability}%)
                            </span>
                          </td>
                          <td className="px-4 py-4 text-slate-300">{riskLabel(supplier.productionObsolescenceScore)}</td>
                          <td className="px-4 py-4 text-slate-300">{riskLabel(supplier.rndObsolescenceScore)}</td>
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
                    <h2 className="mt-2 text-2xl font-bold text-white">Next risky months</h2>
                  </div>
                  <button
                    type="button"
                    onClick={handleGenerateBrief}
                    className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950"
                  >
                    Generate negotiation brief
                  </button>
                </div>

                {selectedForecast ? (
                  <div className="mt-5 space-y-4">
                    <p className="text-sm leading-6 text-slate-300">
                      {selectedForecast.delayedStreak.length
                        ? `This supplier delayed in ${selectedForecast.delayedStreak.join(', ')}. The engine flags the same cycle next year: ${selectedForecast.nextCycleWarnings.join(', ')}.`
                        : 'No repeat pattern detected yet.'}
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Metric label="Composite risk" value={selectedForecast.compositeRisk} />
                      <Metric label="Delay cost" value={`₹${selectedForecast.estimatedDelayCost.toLocaleString('en-IN')}`} />
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Negotiation report</p>
                <h2 className="mt-2 text-2xl font-bold text-white">What to say in the meeting</h2>

                {negotiationBrief ? (
                  <div className="mt-5 space-y-3">
                    <Metric label="Supplier" value={negotiationBrief.supplierName} />
                    <Metric label="OTD score" value={`${negotiationBrief.otdScore}%`} />
                    <Metric label="Estimated delay cost" value={`₹${negotiationBrief.estimatedDelayCost.toLocaleString('en-IN')}`} />
                    <Metric label="Suggested price reduction" value={`${negotiationBrief.recommendedPriceReductionPct}%`} />
                    <p className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-6 text-slate-200">
                      {negotiationBrief.summary}
                    </p>
                  </div>
                ) : (
                  <p className="mt-5 text-sm text-slate-400">Click the button to generate a negotiation brief for the selected supplier.</p>
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
