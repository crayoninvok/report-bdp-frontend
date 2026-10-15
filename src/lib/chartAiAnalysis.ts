// Utility & Engine untuk Analisis Grafik Berbasis AI (PT Batara Dharma Persada)

export interface ChartDataPoint {
  label: string;
  budget: number;
  realisasi: number;
  deviasi: number;
}

export interface ChartAnalysisParams {
  site: string;
  categoryKey: string;
  categoryLabel: string;
  timeframe: string;
  periodRange: string;
  totalBudget: number;
  totalRealisasi: number;
  netVariance: number;
  efficiency: number;
  peakPeriod: string;
  peakValue: number;
  minPeriod: string;
  minValue: number;
  dataPoints: ChartDataPoint[];
}

export interface ChartAiAnalysisResult {
  polaTren: string;
  evaluasiAnggaran: string;
  tindakanKorektif: string;
  isAiGenerated: boolean;
  source: "gemini" | "heuristic";
}

// 1. ENGINE ANALISIS HEURISTIK CERDAS (Algorithmic Financial AI Engine)
// Menghitung kemiringan regresi, deteksi anomali lonjakan, konsistensi pagu, dan rekomendasi operasional site
export function generateLocalAiChartAnalysis(params: ChartAnalysisParams): ChartAiAnalysisResult {
  const {
    site,
    categoryKey,
    categoryLabel,
    timeframe,
    totalBudget,
    totalRealisasi,
    netVariance,
    efficiency,
    peakPeriod,
    peakValue,
    minPeriod,
    minValue,
    dataPoints,
  } = params;

  const n = dataPoints.length;
  const isHemat = netVariance >= 0;
  const absNetDevM = (Math.abs(netVariance) / 1000).toLocaleString("id-ID", { maximumFractionDigits: 1 });
  const totalBM = (totalBudget / 1000).toLocaleString("id-ID", { maximumFractionDigits: 1 });
  const totalRM = (totalRealisasi / 1000).toLocaleString("id-ID", { maximumFractionDigits: 1 });
  const peakValM = (peakValue / 1000).toLocaleString("id-ID", { maximumFractionDigits: 1 });
  const minValM = (minValue / 1000).toLocaleString("id-ID", { maximumFractionDigits: 1 });

  // A. Analisis Kemiringan Regresi Linier (Trend Slope)
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;
  let overBudgetCount = 0;
  let worstSpikePeriod = "";
  let worstSpikeOver = -Infinity;

  dataPoints.forEach((pt, idx) => {
    const x = idx + 1;
    const y = pt.realisasi;
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;

    const overAmount = pt.realisasi - pt.budget;
    if (overAmount > 0) {
      overBudgetCount++;
      if (overAmount > worstSpikeOver) {
        worstSpikeOver = overAmount;
        worstSpikePeriod = pt.label;
      }
    }
  });

  const avgReal = n > 0 ? sumY / n : 1;
  const slope = n > 1 ? (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX) : 0;
  const slopePercent = avgReal > 0 ? (slope / avgReal) * 100 : 0;

  // B. Narasi Pola Tren Operasional
  let polaTren = "";
  if (slopePercent > 1.8) {
    polaTren = `Kurva realisasi menunjukkan eskalasi kenaikan biaya berkelanjutan (+${Math.abs(slopePercent).toFixed(1)}% per periode). Pergerakan biaya terungkit tajam dari level terendah di ${minPeriod} (Rp ${minValM}M) menuju titik puncak di ${peakPeriod} (Rp ${peakValM}M).`;
  } else if (slopePercent < -1.8) {
    polaTren = `Kurva realisasi menunjukkan tren penurunan biaya yang positif (-${Math.abs(slopePercent).toFixed(1)}% per periode). Pengeluaran melandai signifikan setelah sempat memuncak di ${peakPeriod} (Rp ${peakValM}M) dan mencapai titik terendah di ${minPeriod} (Rp ${minValM}M).`;
  } else {
    polaTren = `Garis tren realisasi terpantau stabil dan mendatar dengan fluktuasi moderat di kisaran rata-rata Rp ${(avgReal / 1000).toLocaleString("id-ID", { maximumFractionDigits: 1 })}M per periode, berfluktuasi antara ${minPeriod} (Rp ${minValM}M) dan ${peakPeriod} (Rp ${peakValM}M).`;
  }

  if (worstSpikeOver > 0 && worstSpikePeriod && worstSpikePeriod !== peakPeriod) {
    polaTren += ` Lonjakan varians over budget paling tajam tercatat pada periode ${worstSpikePeriod}.`;
  }

  // C. Narasi Evaluasi Anggaran
  let evaluasiAnggaran = "";
  if (isHemat) {
    evaluasiAnggaran = `Serapan biaya terkendali di rasio ${efficiency.toFixed(1)}% dari pagu anggaran Rp ${totalBM}M (efisiensi surplus Rp ${absNetDevM}M). Sebanyak ${n - overBudgetCount} dari ${n} periode berhasil beroperasi di bawah batas plafon budget yang ditetapkan.`;
  } else {
    evaluasiAnggaran = `Realisasi serapan melebihi alokasi anggaran dengan rasio ${efficiency.toFixed(1)}% (defisit over-budget Rp ${absNetDevM}M terhadap pagu Rp ${totalBM}M). Sebanyak ${overBudgetCount} dari ${n} periode mengalami over budget operasional.`;
  }

  // D. Tindakan Korektif Terarah Spesifik Kategori & Site
  let tindakanKorektif = "";
  switch (categoryKey) {
    case "fuel":
      tindakanKorektif = `Audit rasio fuel burn rate (liter/jam) pada unit fleet hauling utama di ${site}, optimalkan rute angkut (cycle time), serta pastikan kalibrasi dispenser dan flowmeter solar harian.`;
      break;
    case "tyre":
      tindakanKorektif = `Perketat pemantauan TKPH dan regulasi tekanan angin ban per shift di ${site}, serta tingkatkan pemeliharaan kerataan jalan tambang (road grading) guna mencegah insiden tyre premature cut.`;
      break;
    case "rep":
      tindakanKorektif = `Perketat eksekusi Preventive Maintenance (PM) terjadwal guna meminimalisir breakdown mendadak, serta audit pemakaian critical spare part dan service eksternal di workshop ${site}.`;
      break;
    case "comp":
      tindakanKorektif = `Evaluasi proporsi lembur (overtime ratio) pada roster operasional site ${site} serta selaraskan penempatan operator dengan ritme tonase produksi aktual.`;
      break;
    case "ovh":
      tindakanKorektif = `Kaji ulang utilitas rental alat penunjang non-produksi dan lakukan pengetatan belanja operasional pendukung kantor site ${site} guna memastikan kepatuhan terhadap pagu anggaran.`;
      break;
    default:
      if (isHemat) {
        tindakanKorektif = `Pertahankan disiplin kontrol pengeluaran di ${site} dan jadikan praktik efisiensi periode ini sebagai standar acuan operasional untuk periode berikutnya.`;
      } else {
        tindakanKorektif = `Terapkan mekanisme daily cost monitoring di ${site} dan prioritaskan audit investigasi pada akun dengan varian defisit terbesar guna memulihkan kepatuhan fiskal.`;
      }
      break;
  }

  return {
    polaTren,
    evaluasiAnggaran,
    tindakanKorektif,
    isAiGenerated: true,
    source: "heuristic",
  };
}

// 2. FETCH KE API ENDPOINT GEMINI AI
export async function fetchAiChartAnalysis(params: ChartAnalysisParams): Promise<ChartAiAnalysisResult> {
  try {
    const res = await fetch("/api/ai/analyze-chart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.polaTren && data.evaluasiAnggaran && data.tindakanKorektif) {
        return {
          polaTren: data.polaTren,
          evaluasiAnggaran: data.evaluasiAnggaran,
          tindakanKorektif: data.tindakanKorektif,
          isAiGenerated: true,
          source: data.source || "gemini",
        };
      }
    }
  } catch (err) {
    console.warn("Gagal menghubungi API AI, beralih ke engine analisis analitik lokal:", err);
  }

  // Fallback instan jika API offline / tidak ada kunci API
  return generateLocalAiChartAnalysis(params);
}
