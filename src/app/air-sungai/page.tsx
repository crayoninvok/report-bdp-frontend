import { Metadata } from "next";
import { RiverWaterInfoView } from "../../components/RiverWaterInfoView";

export const metadata: Metadata = {
  title: "Pantauan Kedalaman Air Sungai • PT Batara Dharma Persada",
  description:
    "Monitoring real-time ketinggian permukaan air sungai DAS Mahakam di Dermaga Senyiur KM 0 (Hulu) dan Jetty Muara Pahu (Hilir) untuk jalur tongkang batu bara.",
};

export default function AirSungaiPage() {
  return <RiverWaterInfoView isStandalone={true} />;
}
