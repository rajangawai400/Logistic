import React, { useState, useMemo, useEffect } from 'react';
import { 
  Ship, 
  Calendar, 
  TrendingUp, 
  Info, 
  ArrowRight, 
  DollarSign, 
  Box,
  LayoutDashboard,
  Clock,
  ShieldCheck,
  Package,
  Stars,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getLogisticsInsight, fetchLiveRates } from './services/geminiService';

// --- Types ---
interface LogisticsData {
  dayNum: number;
  dayName: string;
  formattedDate: string;
  storage20ft: number;
  storage40ft: number;
  grandTotal20ft: number;
  grandTotal40ft: number;
  diff20: number; // Daily change for 20ft
  diff40: number; // Daily change for 40ft
  adjustmentNote: string;
  isFreeWindow: boolean;
}

// --- Utilities ---
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatDelta = (amount: number) => {
  if (amount === 0) return '±₹0';
  const sign = amount > 0 ? '+' : '';
  return `${sign}₹${Math.abs(amount).toLocaleString('en-IN')}`;
};

export default function App() {
  // --- State ---
  const [params, setParams] = useState({
    base20ft: 12945,
    base40ft: 19390,
    dailyChange20ft: 500,
    dailyChange40ft: 1000,
    arrivalDateStr: '2026-05-12',
    oceanFreight20ft: 84150,
    oceanFreight40ft: 138600,
    bunkerSurcharge: 6200,
    originDocFee: 4500,
    totalDays: 21,
  });

  const [aiInsights, setAiInsights] = useState<Record<string, { mood: string, tip: string }> | null>(null);
  const [isInsightLoading, setIsInsightLoading] = useState(false);
  const [isRateLoading, setIsRateLoading] = useState(false);
  const [lastReason, setLastReason] = useState<string | null>(null);
  const [goldState, setGoldState] = useState<{ rate: number, change: number }>({ rate: 72500, change: 0 });

  // --- Calculations ---
  const logisticsData = useMemo(() => {
    const arrivalDate = new Date(params.arrivalDateStr);
    const data: LogisticsData[] = [];

    let currentStorage20ft = params.base20ft;
    let currentStorage40ft = params.base40ft;
    let prevTotal20 = 0;
    let prevTotal40 = 0;

    for (let dayNum = 1; dayNum <= params.totalDays; dayNum++) {
      const currentDate = new Date(arrivalDate);
      currentDate.setDate(arrivalDate.getDate() + (dayNum - 1));
      
      const formattedDate = currentDate.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
      const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'short' });

      let adjustmentNote = "";
      let isFreeWindow = false;
      
      if (dayNum === 1) {
        adjustmentNote = "Baseline Entry";
        isFreeWindow = true;
      } else if (dayNum === 2 || dayNum === 3) {
        adjustmentNote = "Free Window (₹0)";
        isFreeWindow = true;
      } else {
        currentStorage20ft += params.dailyChange20ft;
        currentStorage40ft += params.dailyChange40ft;
        adjustmentNote = `Escalation (+₹${params.dailyChange20ft})`;
      }

      const totalFixed = params.bunkerSurcharge + params.originDocFee;
      const combinedExport20ft = currentStorage20ft + params.oceanFreight20ft + totalFixed;
      const combinedExport40ft = currentStorage40ft + params.oceanFreight40ft + totalFixed;

      const diff20 = dayNum > 1 ? combinedExport20ft - prevTotal20 : 0;
      const diff40 = dayNum > 1 ? combinedExport40ft - prevTotal40 : 0;

      data.push({
        dayNum,
        dayName,
        formattedDate,
        storage20ft: currentStorage20ft,
        storage40ft: currentStorage40ft,
        grandTotal20ft: combinedExport20ft,
        grandTotal40ft: combinedExport40ft,
        diff20,
        diff40,
        adjustmentNote,
        isFreeWindow
      });

      prevTotal20 = combinedExport20ft;
      prevTotal40 = combinedExport40ft;
    }
    return [...data].reverse();
  }, [params]);

  useEffect(() => {
    const fetchInsight = async () => {
      setIsInsightLoading(true);
      const insights = await getLogisticsInsight(logisticsData);
      setAiInsights(insights);
      setIsInsightLoading(false);
    };

    const timer = setTimeout(fetchInsight, 1500); // Debounce
    return () => clearTimeout(timer);
  }, [logisticsData]);

  // --- Handlers ---
  const handleInputChange = (field: keyof typeof params, value: string | number) => {
    setParams(prev => ({ ...prev, [field]: value }));
  };

  const syncLiveRates = async () => {
    setIsRateLoading(true);
    const data = await fetchLiveRates();
    if (data) {
      setParams(prev => ({
        ...prev,
        oceanFreight20ft: data.oceanFreight20ft,
        oceanFreight40ft: data.oceanFreight40ft
      }));
      setGoldState({ rate: data.goldRate, change: data.goldChange });
      setLastReason(data.reason);
    }
    setIsRateLoading(false);
  };

  useEffect(() => {
    syncLiveRates();
  }, []);

  return (
    <div className="min-h-screen bg-bg text-text selection:bg-accent/30 p-6 flex flex-col gap-6 max-h-screen overflow-hidden">
      
      {/* Header Section */}
      <header className="flex justify-between items-center pb-6 border-b border-border">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="title-group"
        >
          <h1 className="text-2xl font-bold tracking-tight text-text">
            Export Freight & Ground Rent Workspace
          </h1>
          <p className="text-sm text-text-dim mt-1">
            JNPT Origin Hub • Real-time Logistics Escalation Tracker
          </p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-3"
        >
          <button 
            onClick={syncLiveRates}
            disabled={isRateLoading}
            className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-light disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-all active:scale-95 shadow-lg shadow-accent/20"
          >
            {isRateLoading ? <Loader2 size={14} className="animate-spin" /> : <TrendingUp size={14} />}
            {isRateLoading ? "Fetching..." : "Fetch Live AI Rates"}
          </button>
          <div className="px-3 py-1 bg-success/10 border border-success/20 rounded-full flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            <span className="text-[10px] uppercase font-bold text-success tracking-wider leading-none">System Active</span>
          </div>
        </motion.div>
      </header>

      {/* Real-time Ticker Bar */}
      <section className="flex flex-wrap gap-4 -mt-2">
      {['Yesterday', 'Today', 'Tomorrow'].map((label, idx) => {
          const targetDate = new Date('2026-05-15T00:00:00'); // Fixed reference to user's "Today"
          targetDate.setDate(targetDate.getDate() + (idx - 1));
          
          const targetDateStr = targetDate.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
          });
          
          const dayData = logisticsData.find(d => d.formattedDate === targetDateStr);
          
          return (
            <motion.div 
              key={label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="flex-1 min-w-[180px] bg-surface-light border border-border rounded-lg p-3 flex justify-between items-center group hover:border-accent/40 hover:bg-surface-light/60 transition-all cursor-default"
            >
              <div className="flex flex-col">
                <span className={`text-[9px] font-bold uppercase tracking-tighter ${label === 'Today' ? 'text-accent-light' : 'text-text-dim'}`}>{label}</span>
                <span className="text-[10px] font-mono text-text-dim/60 leading-none mt-1">{targetDateStr}</span>
              </div>
              <div className="text-right">
                <div className="text-xs font-bold text-text font-mono">
                  {dayData ? formatCurrency(dayData.grandTotal40ft) : '--'}
                </div>
                {dayData && (
                  <div className={`text-[9px] font-bold flex items-center justify-end gap-0.5 mt-1 ${dayData.diff40 > 0 ? 'text-error' : 'text-success/70'}`}>
                    {dayData.diff40 > 0 ? <TrendingUp size={10} /> : <div className="w-1.5 h-0.5 bg-success/40 rounded-full" />}
                    {formatDelta(dayData.diff40)}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
        
        {/* Live Gold Widget */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="flex-1 min-w-[180px] bg-accent/5 border border-accent/20 rounded-lg p-3 flex justify-between items-center group hover:bg-accent/10 transition-all cursor-default"
        >
          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-accent-light uppercase tracking-tighter">Gold (24K/10g)</span>
            <span className="text-[10px] font-mono text-text-dim/60 leading-none mt-1">Market Spot</span>
          </div>
          <div className="text-right">
            <div className="text-xs font-bold text-text font-mono flex items-center justify-end gap-2">
              {isRateLoading ? (
                <Loader2 size={12} className="animate-spin text-accent" />
              ) : goldState.rate ? (
                formatCurrency(goldState.rate)
              ) : (
                '--'
              )}
            </div>
            <div className={`text-[9px] font-bold flex items-center justify-end gap-0.5 mt-1 ${goldState.change >= 0 ? 'text-success/70' : 'text-error'}`}>
              {isRateLoading ? (
                <span className="text-[8px] animate-pulse">Syncing...</span>
              ) : (
                <>
                  <TrendingUp size={10} className={goldState.change >= 0 ? 'text-accent' : 'text-error rotate-180'} />
                  {formatDelta(goldState.change)}
                </>
              )}
            </div>
          </div>
        </motion.div>
      </section>

      <main className="main-layout grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 flex-grow min-height-0 overflow-hidden">
        
        {/* Sidebar */}
        <aside className="sidebar bg-surface border border-border rounded-xl p-5 flex flex-col gap-5 overflow-y-auto">
          <div className="input-group flex flex-col gap-2">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-text-dim">Arrival Date</label>
            <input 
              type="date" 
              value={params.arrivalDateStr}
              onChange={(e) => handleInputChange('arrivalDateStr', e.target.value)}
              className="bg-surface-light border border-border rounded-md p-2.5 text-sm outline-none focus:border-accent transition-all font-mono"
            />
          </div>

          <div className="input-group flex flex-col gap-2">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-text-dim">Ocean Freight 20ft</label>
            <input 
              type="number" 
              value={params.oceanFreight20ft}
              onChange={(e) => handleInputChange('oceanFreight20ft', Number(e.target.value))}
              className="bg-surface-light border border-border rounded-md p-2.5 text-sm outline-none focus:border-accent transition-all font-mono"
            />
          </div>

          <div className="input-group flex flex-col gap-2">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-text-dim">Ocean Freight 40ft</label>
            <input 
              type="number" 
              value={params.oceanFreight40ft}
              onChange={(e) => handleInputChange('oceanFreight40ft', Number(e.target.value))}
              className="bg-surface-light border border-border rounded-md p-2.5 text-sm outline-none focus:border-accent transition-all font-mono"
            />
          </div>

          <div className="input-group flex flex-col gap-2">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-text-dim">Bunker Surcharge</label>
            <input 
              type="number" 
              value={params.bunkerSurcharge}
              onChange={(e) => handleInputChange('bunkerSurcharge', Number(e.target.value))}
              className="bg-surface-light border border-border rounded-md p-2.5 text-sm outline-none focus:border-accent transition-all font-mono"
            />
          </div>

          <div className="input-group flex flex-col gap-2">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-text-dim">Handling & Doc</label>
            <input 
              type="number" 
              value={params.originDocFee}
              onChange={(e) => handleInputChange('originDocFee', Number(e.target.value))}
              className="bg-surface-light border border-border rounded-md p-2.5 text-sm outline-none focus:border-accent transition-all font-mono"
            />
          </div>

          <div className="input-group flex flex-col gap-2 mt-auto">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-text-dim flex justify-between">
              Forecast Horizon <span>{params.totalDays} Days</span>
            </label>
            <input 
              type="range" 
              min="1" 
              max="30" 
              value={params.totalDays}
              onChange={(e) => handleInputChange('totalDays', Number(e.target.value))}
              className="w-full accent-accent h-1.5 bg-border rounded-lg appearance-none cursor-pointer"
            />
          </div>

            <div className="stat-card bg-accent/5 border border-accent/20 rounded-lg p-3">
              <div className="label text-[10px] text-accent-light uppercase font-bold tracking-wider">Daily Escalation (40ft)</div>
              <div className="val text-lg font-bold text-text mt-1 font-mono">+{formatCurrency(params.dailyChange40ft)}</div>
            </div>

            <div className="bg-accent/10 border border-accent/20 rounded-xl p-4 mt-auto">
              <div className="flex items-center gap-2 mb-2">
                {isInsightLoading ? (
                  <Loader2 size={14} className="text-accent animate-spin" />
                ) : (
                  <Stars size={14} className="text-accent" />
                )}
                <span className="text-[10px] font-bold uppercase tracking-widest text-accent-light">AI Logistics Intelligence</span>
              </div>
              <div className="text-[11px] text-text-dim italic leading-relaxed min-h-[40px]">
                {isInsightLoading || isRateLoading
                  ? "Scanning historical manifests..." 
                  : lastReason 
                    ? `[AI Market Feed]: ${lastReason}`
                    : aiInsights 
                      ? `AI has analyzed ${logisticsData.length} days of potential escalation. Check the "AI Risk Analysis" column for specific risk factors.`
                      : "Ready for live analysis."}
              </div>
            </div>
          </aside>

        {/* Content Area */}
        <section className="content-area bg-surface border border-border rounded-xl flex flex-col min-h-0 overflow-hidden">
          <div className="flex-grow overflow-x-auto overflow-y-auto">
            <table className="matrix-table w-full border-collapse text-left table-fixed min-w-[800px]">
              <thead className="sticky top-0 z-10">
                <tr>
                  <th className="bg-surface-light p-4 text-[12px] font-semibold text-text-dim uppercase tracking-wider border-b border-border w-[14%]">Day / Date</th>
                  <th className="bg-surface-light p-4 text-[12px] font-semibold text-text-dim uppercase tracking-wider border-b border-border w-[12%]">Storage</th>
                  <th className="bg-surface-light p-4 text-[12px] font-semibold text-text-dim uppercase tracking-wider border-b border-border w-[18%] text-accent-light">Total (20ft)</th>
                  <th className="bg-surface-light p-4 text-[12px] font-semibold text-text-dim uppercase tracking-wider border-b border-border w-[18%] text-accent-light">Total (40ft)</th>
                  <th className="bg-surface-light p-4 text-[12px] font-semibold text-text-dim uppercase tracking-wider border-b border-border w-[24%]">AI Risk Analysis</th>
                  <th className="bg-surface-light p-4 text-[12px] font-semibold text-text-dim uppercase tracking-wider border-b border-border w-[14%] text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <AnimatePresence mode="popLayout">
                  {logisticsData.map((row) => (
                    <motion.tr 
                      key={row.formattedDate}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="hover:bg-accent/5 transition-colors"
                    >
                      <td className="p-4 overflow-hidden whitespace-nowrap text-ellipsis">
                        <div className="flex items-center gap-2">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-accent-light">{row.dayName}</span>
                              <div className={`text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 ${row.diff40 > 0 ? 'bg-error/10 text-error' : 'bg-success/10 text-success'}`}>
                                {row.diff40 > 0 ? <TrendingUp size={8} /> : null}
                                {formatDelta(row.diff40)}
                              </div>
                            </div>
                            <span className="text-text-dim font-normal text-[11px] font-mono">{row.formattedDate.split(',')[0]}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 font-mono text-[12px]">
                        <div className="flex flex-col gap-1">
                          <span className="text-text-dim">20: {formatCurrency(row.storage20ft)}</span>
                          <span className="text-text-dim">40: {formatCurrency(row.storage40ft)}</span>
                        </div>
                      </td>
                      <td className="p-4 font-mono bg-accent/3 border-r border-border/10">
                        <div className="font-bold text-accent-light leading-none">{formatCurrency(row.grandTotal20ft)}</div>
                        <div className={`text-[9px] font-bold mt-1.5 flex items-center gap-1 ${row.diff20 > 0 ? 'text-error' : 'text-success/70'}`}>
                          {row.diff20 > 0 ? <TrendingUp size={10} /> : <div className="w-1 h-0.5 bg-success/40 rounded-full" />}
                          {formatDelta(row.diff20)}
                        </div>
                      </td>
                      <td className="p-4 font-mono bg-accent/5 border-r border-border/10">
                        <div className="font-bold text-accent-light leading-none">{formatCurrency(row.grandTotal40ft)}</div>
                        <div className={`text-[9px] font-bold mt-1.5 flex items-center gap-1 ${row.diff40 > 0 ? 'text-error' : 'text-success/70'}`}>
                          {row.diff40 > 0 ? <TrendingUp size={10} /> : <div className="w-1 h-0.5 bg-success/40 rounded-full" />}
                          {formatDelta(row.diff40)}
                        </div>
                      </td>
                      <td className="p-4 bg-black/5">
                        <div className="flex flex-col gap-1">
                          <span className={`text-[9px] font-bold uppercase tracking-tight ${
                            aiInsights?.[row.formattedDate]?.mood === 'Critical' ? 'text-error' : 'text-accent-light'
                          }`}>
                            {isInsightLoading ? "..." : (aiInsights?.[row.formattedDate]?.mood || "Analyzing...")}
                          </span>
                          <span className="text-[11px] text-text-dim leading-tight italic">
                            {isInsightLoading ? "Calculating risk..." : (aiInsights?.[row.formattedDate]?.tip || "Loading terminal data")}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <span 
                          className={`badge text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                            row.isFreeWindow 
                              ? 'bg-success/10 text-success border border-success/20' 
                              : 'bg-error/10 text-error border border-error/20'
                          }`}
                        >
                          {row.isFreeWindow ? 'Free Window' : 'Escalating'}
                        </span>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>

          <div className="mt-auto p-5 bg-black/20 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-[11px] text-text-dim leading-relaxed max-w-2xl">
              * All calculations include Ocean Freight, Bunker Surcharge, and Origin Documentation fees based on current spot market volatility. Storage slabs align with Nhava Sheva CFS standards.
            </p>
            <div className="flex items-center gap-4 text-[10px] font-mono text-text-dim whitespace-nowrap">
              <span>Updated: {new Date().toLocaleTimeString()}</span>
              <button 
                onClick={() => window.print()}
                className="px-3 py-1.5 bg-surface-light border border-border hover:border-accent text-text rounded text-[10px] font-bold uppercase transition-all"
              >
                Print Manifest
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

