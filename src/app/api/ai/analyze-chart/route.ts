import { NextResponse } from "next/server";
import { generateLocalAiChartAnalysis, ChartAnalysisParams } from "@/lib/chartAiAnalysis";

export async function POST(req: Request) {
  try {
    const params: ChartAnalysisParams = await req.json();

    const apiKey =
      process.env.GEMINI_API_KEY ||
      process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    if (apiKey) {
      try {
        const prompt = `Anda adalah Senior Financial & Mining Operational Controller PT Batara Dharma Persada.
Analisis data grafik evaluasi biaya operasional tambang berikut secara mendalam, objektif, faktual, dan berbobot eksekutif:

- Job Site: ${params.site}
- Kategori Beban: ${params.categoryLabel}
- Rentang Periode: ${params.timeframe} (${params.periodRange})
- Total Target Budget: Rp ${(params.totalBudget / 1000).toFixed(1)} M
- Total Aktual Realisasi: Rp ${(params.totalRealisasi / 1000).toFixed(1)} M
- Net Varians: Rp ${(Math.abs(params.netVariance) / 1000).toFixed(1)} M (${params.netVariance >= 0 ? "Surplus / Hemat" : "Defisit / Over Budget"})
- Rasio Serapan Anggaran: ${params.efficiency.toFixed(1)}%
- Titik Realisasi Tertinggi (Peak): ${params.peakPeriod} (Rp ${(params.peakValue / 1000).toFixed(1)} M)
- Titik Realisasi Terendah (Min): ${params.minPeriod} (Rp ${(params.minValue / 1000).toFixed(1)} M)

Data Rinci Seri Grafik:
${params.dataPoints
  .map(
    (d) =>
      `- ${d.label}: Budget Rp ${(d.budget / 1000).toFixed(1)}M, Realisasi Rp ${(d.realisasi / 1000).toFixed(1)}M, Deviasi Rp ${(d.deviasi / 1000).toFixed(1)}M`
  )
  .join("\n")}

Tolong hasilkan analisis grafik dalam format JSON murni (tanpa tag codeblock markdown) dengan 3 field persis:
{
  "polaTren": "Uraikan arah kemiringan kurva tren (eskalasi/penurunan/stabil), lonjakan anomali antar periode, serta sebutkan angka dan periode titik puncak & minimumnya (maksimal 2 kalimat padat).",
  "evaluasiAnggaran": "Evaluasi tingkat kepatuhan fiskal terhadap pagu budget yang disetujui, rasio serapan, serta apakah kondisi keseluruhan surplus efisiensi atau defisit over-budget (maksimal 2 kalimat padat).",
  "tindakanKorektif": "Rekomendasi taktis dan operasional tambang yang sangat spesifik untuk unit dan tim manajemen site (maksimal 2 kalimat aplikatif)."
}`;

        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.2,
                responseMimeType: "application/json",
              },
            }),
          }
        );

        if (geminiRes.ok) {
          const geminiData = await geminiRes.json();
          const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) {
            const parsed = JSON.parse(rawText.replace(/```json/g, "").replace(/```/g, "").trim());
            if (parsed.polaTren && parsed.evaluasiAnggaran && parsed.tindakanKorektif) {
              return NextResponse.json({
                ...parsed,
                isAiGenerated: true,
                source: "gemini",
              });
            }
          }
        }
      } catch (geminiErr) {
        console.warn("Gemini API call failed, falling back to local algorithmic engine:", geminiErr);
      }
    }

    // Fallback ke Engine Analitik Keuangan Cerdas
    const fallbackResult = generateLocalAiChartAnalysis(params);
    return NextResponse.json(fallbackResult);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Gagal memproses analisis AI" },
      { status: 500 }
    );
  }
}
