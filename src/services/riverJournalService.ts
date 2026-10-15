import { API_BASE_URL } from "./apiConfig";
import {
  RiverJournalEntry,
  RiverJournalStats,
  CreateRiverJournalPayload,
} from "../types/riverJournal";
import { JobSite } from "../types/auth";

// Baseline initial data from Google Spreadsheet (Sheet 1 Senyiur & Sheet 2 Muara Pahu)
const INITIAL_SENYIUR_RECORDS: RiverJournalEntry[] = [
  { id: "sny-1", externalId: 1, date: "2026-09-02", inputTime: "10:33", location: "Dermaga Senyiur KM 0", site: "Senyiur", waterDepth: 2.11, minThreshold: 4.0, autoDescription: "Surut (Tugboat Tidak Bisa Masuk)", userInput: "Dzaky", conclusion: "Kondisi air sungai masih surut, tugboat belum bisa masuk ke sungai." },
  { id: "sny-2", externalId: 2, date: "2026-09-03", inputTime: "08:01", location: "Dermaga Senyiur KM 0", site: "Senyiur", waterDepth: 2.06, minThreshold: 4.0, autoDescription: "Surut (Tugboat Tidak Bisa Masuk)", userInput: "Dzaky", conclusion: "Kondisi air sungai masih surut, tugboat belum bisa masuk ke sungai." },
  { id: "sny-3", externalId: 3, date: "2026-09-04", inputTime: "00:01", location: "Dermaga Senyiur KM 0", site: "Senyiur", waterDepth: 2.02, minThreshold: 4.0, autoDescription: "Surut (Tugboat Tidak Bisa Masuk)", userInput: "Dzaky", conclusion: "Kondisi air sungai masih surut, tugboat belum bisa masuk ke sungai." },
  { id: "sny-4", externalId: 4, date: "2026-09-05", inputTime: "01:01", location: "Dermaga Senyiur KM 0", site: "Senyiur", waterDepth: 1.98, minThreshold: 4.0, autoDescription: "Surut (Tugboat Tidak Bisa Masuk)", userInput: "Dzaky", conclusion: "Kondisi air sungai masih surut, tugboat belum bisa masuk ke sungai." },
  { id: "sny-5", externalId: 5, date: "2026-09-06", inputTime: "02:01", location: "Dermaga Senyiur KM 0", site: "Senyiur", waterDepth: 1.89, minThreshold: 4.0, autoDescription: "Surut (Tugboat Tidak Bisa Masuk)", userInput: "Dzaky", conclusion: "Kondisi air sungai masih surut, tugboat belum bisa masuk ke sungai." },
  { id: "sny-6", externalId: 6, date: "2026-09-07", inputTime: "03:01", location: "Dermaga Senyiur KM 0", site: "Senyiur", waterDepth: 2.10, minThreshold: 4.0, autoDescription: "Surut (Tugboat Tidak Bisa Masuk)", userInput: "Dzaky", conclusion: "Kondisi air sungai masih surut, tugboat belum bisa masuk ke sungai." },
  { id: "sny-7", externalId: 7, date: "2026-09-08", inputTime: "04:01", location: "Dermaga Senyiur KM 0", site: "Senyiur", waterDepth: 2.05, minThreshold: 4.0, autoDescription: "Surut (Tugboat Tidak Bisa Masuk)", userInput: "Dzaky", conclusion: "Kondisi air sungai masih surut, tugboat belum bisa masuk ke sungai." },
  { id: "sny-8", externalId: 8, date: "2026-09-09", inputTime: "05:01", location: "Dermaga Senyiur KM 0", site: "Senyiur", waterDepth: 2.01, minThreshold: 4.0, autoDescription: "Surut (Tugboat Tidak Bisa Masuk)", userInput: "Dzaky", conclusion: "Kondisi air sungai masih surut, tugboat belum bisa masuk ke sungai." },
  { id: "sny-9", externalId: 9, date: "2026-09-10", inputTime: "06:01", location: "Dermaga Senyiur KM 0", site: "Senyiur", waterDepth: 2.09, minThreshold: 4.0, autoDescription: "Surut (Tugboat Tidak Bisa Masuk)", userInput: "Dzaky", conclusion: "Kondisi air sungai masih surut, tugboat belum bisa masuk ke sungai." },
  { id: "sny-10", externalId: 10, date: "2026-09-11", inputTime: "07:01", location: "Dermaga Senyiur KM 0", site: "Senyiur", waterDepth: 1.98, minThreshold: 4.0, autoDescription: "Surut (Tugboat Tidak Bisa Masuk)", userInput: "Dzaky", conclusion: "Kondisi air sungai masih surut, tugboat belum bisa masuk ke sungai." },
  { id: "sny-11", externalId: 11, date: "2026-09-12", inputTime: "08:01", location: "Dermaga Senyiur KM 0", site: "Senyiur", waterDepth: 2.07, minThreshold: 4.0, autoDescription: "Surut (Tugboat Tidak Bisa Masuk)", userInput: "Dzaky", conclusion: "Kondisi air sungai masih surut, tugboat belum bisa masuk ke sungai." },
  { id: "sny-12", externalId: 12, date: "2026-09-13", inputTime: "09:01", location: "Dermaga Senyiur KM 0", site: "Senyiur", waterDepth: 2.03, minThreshold: 4.0, autoDescription: "Surut (Tugboat Tidak Bisa Masuk)", userInput: "Dzaky", conclusion: "Kondisi air sungai masih surut, tugboat belum bisa masuk ke sungai." },
  { id: "sny-13", externalId: 13, date: "2026-09-14", inputTime: "10:01", location: "Dermaga Senyiur KM 0", site: "Senyiur", waterDepth: 2.06, minThreshold: 4.0, autoDescription: "Surut (Tugboat Tidak Bisa Masuk)", userInput: "Dzaky", conclusion: "Kondisi air sungai masih surut, tugboat belum bisa masuk ke sungai." },
  { id: "sny-14", externalId: 14, date: "2026-09-15", inputTime: "11:01", location: "Dermaga Senyiur KM 0", site: "Senyiur", waterDepth: 1.98, minThreshold: 4.0, autoDescription: "Surut (Tugboat Tidak Bisa Masuk)", userInput: "Dzaky", conclusion: "Kondisi air sungai masih surut, tugboat belum bisa masuk ke sungai." },
  { id: "sny-15", externalId: 15, date: "2026-09-16", inputTime: "12:01", location: "Dermaga Senyiur KM 0", site: "Senyiur", waterDepth: 1.98, minThreshold: 4.0, autoDescription: "Surut (Tugboat Tidak Bisa Masuk)", userInput: "Dzaky", conclusion: "Kondisi air sungai masih surut, tugboat belum bisa masuk ke sungai." },
  { id: "sny-16", externalId: 16, date: "2026-09-17", inputTime: "13:01", location: "Dermaga Senyiur KM 0", site: "Senyiur", waterDepth: 1.95, minThreshold: 4.0, autoDescription: "Surut (Tugboat Tidak Bisa Masuk)", userInput: "Dzaky", conclusion: "Kondisi air sungai masih surut, tugboat belum bisa masuk ke sungai." },
  { id: "sny-17", externalId: 17, date: "2026-09-18", inputTime: "14:01", location: "Dermaga Senyiur KM 0", site: "Senyiur", waterDepth: 2.01, minThreshold: 4.0, autoDescription: "Surut (Tugboat Tidak Bisa Masuk)", userInput: "Dzaky", conclusion: "Kondisi air sungai masih surut, tugboat belum bisa masuk ke sungai." },
  { id: "sny-18", externalId: 18, date: "2026-09-19", inputTime: "15:01", location: "Dermaga Senyiur KM 0", site: "Senyiur", waterDepth: 2.04, minThreshold: 4.0, autoDescription: "Surut (Tugboat Tidak Bisa Masuk)", userInput: "Dzaky", conclusion: "Kondisi air sungai masih surut, tugboat belum bisa masuk ke sungai." },
  { id: "sny-19", externalId: 19, date: "2026-09-20", inputTime: "16:01", location: "Dermaga Senyiur KM 0", site: "Senyiur", waterDepth: 2.09, minThreshold: 4.0, autoDescription: "Surut (Tugboat Tidak Bisa Masuk)", userInput: "Dzaky", conclusion: "Kondisi air sungai masih surut, tugboat belum bisa masuk ke sungai." },
  { id: "sny-20", externalId: 20, date: "2026-09-21", inputTime: "17:01", location: "Dermaga Senyiur KM 0", site: "Senyiur", waterDepth: 2.03, minThreshold: 4.0, autoDescription: "Surut (Tugboat Tidak Bisa Masuk)", userInput: "Dzaky", conclusion: "Kondisi air sungai masih surut, tugboat belum bisa masuk ke sungai." },
  { id: "sny-21", externalId: 21, date: "2026-09-22", inputTime: "18:01", location: "Dermaga Senyiur KM 0", site: "Senyiur", waterDepth: 1.99, minThreshold: 4.0, autoDescription: "Surut (Tugboat Tidak Bisa Masuk)", userInput: "Dzaky", conclusion: "Kondisi air sungai masih surut, tugboat belum bisa masuk ke sungai." },
  { id: "sny-22", externalId: 22, date: "2026-09-23", inputTime: "19:01", location: "Dermaga Senyiur KM 0", site: "Senyiur", waterDepth: 1.98, minThreshold: 4.0, autoDescription: "Surut (Tugboat Tidak Bisa Masuk)", userInput: "Dzaky", conclusion: "Kondisi air sungai masih surut, tugboat belum bisa masuk ke sungai." },
  { id: "sny-23", externalId: 23, date: "2026-09-24", inputTime: "20:01", location: "Dermaga Senyiur KM 0", site: "Senyiur", waterDepth: 1.98, minThreshold: 4.0, autoDescription: "Surut (Tugboat Tidak Bisa Masuk)", userInput: "Dzaky", conclusion: "Kondisi air sungai masih surut, tugboat belum bisa masuk ke sungai." },
  { id: "sny-24", externalId: 24, date: "2026-09-25", inputTime: "21:01", location: "Dermaga Senyiur KM 0", site: "Senyiur", waterDepth: 1.88, minThreshold: 4.0, autoDescription: "Surut (Tugboat Tidak Bisa Masuk)", userInput: "Dzaky", conclusion: "Kondisi air sungai masih surut, tugboat belum bisa masuk ke sungai." },
  { id: "sny-25", externalId: 25, date: "2026-09-26", inputTime: "07:01", location: "Dermaga Senyiur KM 0", site: "Senyiur", waterDepth: 1.92, minThreshold: 4.0, autoDescription: "Surut (Tugboat Tidak Bisa Masuk)", userInput: "Dzaky", conclusion: "Kondisi air sungai masih surut, tugboat belum bisa masuk ke sungai." },
  { id: "sny-26", externalId: 26, date: "2026-09-27", inputTime: "08:01", location: "Dermaga Senyiur KM 0", site: "Senyiur", waterDepth: 1.97, minThreshold: 4.0, autoDescription: "Surut (Tugboat Tidak Bisa Masuk)", userInput: "Dzaky", conclusion: "Kondisi air sungai masih surut, tugboat belum bisa masuk ke sungai." },
  { id: "sny-27", externalId: 27, date: "2026-09-28", inputTime: "09:01", location: "Dermaga Senyiur KM 0", site: "Senyiur", waterDepth: 1.90, minThreshold: 4.0, autoDescription: "Surut (Tugboat Tidak Bisa Masuk)", userInput: "Dzaky", conclusion: "Kondisi air sungai masih surut, tugboat belum bisa masuk ke sungai." },
  { id: "sny-28", externalId: 28, date: "2026-09-29", inputTime: "10:01", location: "Dermaga Senyiur KM 0", site: "Senyiur", waterDepth: 2.04, minThreshold: 4.0, autoDescription: "Surut (Tugboat Tidak Bisa Masuk)", userInput: "Dzaky", conclusion: "Kondisi air sungai masih surut, tugboat belum bisa masuk ke sungai." },
  { id: "sny-29", externalId: 29, date: "2026-09-30", inputTime: "11:01", location: "Dermaga Senyiur KM 0", site: "Senyiur", waterDepth: 2.15, minThreshold: 4.0, autoDescription: "Surut (Tugboat Tidak Bisa Masuk)", userInput: "Dzaky", conclusion: "Kondisi air sungai masih surut, tugboat belum bisa masuk ke sungai." },
  { id: "sny-30", externalId: 30, date: "2026-10-01", inputTime: "12:01", location: "Dermaga Senyiur KM 0", site: "Senyiur", waterDepth: 2.36, minThreshold: 4.0, autoDescription: "Surut (Tugboat Tidak Bisa Masuk)", userInput: "Dzaky", conclusion: "Kondisi air sungai masih surut, tugboat belum bisa masuk ke sungai." },
  { id: "sny-31", externalId: 31, date: "2026-10-02", inputTime: "13:01", location: "Dermaga Senyiur KM 0", site: "Senyiur", waterDepth: 2.35, minThreshold: 4.0, autoDescription: "Surut (Tugboat Tidak Bisa Masuk)", userInput: "Dzaky", conclusion: "Kondisi air sungai masih surut, tugboat belum bisa masuk ke sungai." },
  { id: "sny-32", externalId: 32, date: "2026-10-03", inputTime: "14:01", location: "Dermaga Senyiur KM 0", site: "Senyiur", waterDepth: 2.14, minThreshold: 4.0, autoDescription: "Surut (Tugboat Tidak Bisa Masuk)", userInput: "Dzaky", conclusion: "Kondisi air sungai masih surut, tugboat belum bisa masuk ke sungai." },
  { id: "sny-33", externalId: 33, date: "2026-10-04", inputTime: "15:01", location: "Dermaga Senyiur KM 0", site: "Senyiur", waterDepth: 1.80, minThreshold: 4.0, autoDescription: "Surut (Tugboat Tidak Bisa Masuk)", userInput: "Dzaky", conclusion: "Kondisi air sungai masih surut, tugboat belum bisa masuk ke sungai." },
  { id: "sny-34", externalId: 34, date: "2026-10-05", inputTime: "16:01", location: "Dermaga Senyiur KM 0", site: "Senyiur", waterDepth: 1.76, minThreshold: 4.0, autoDescription: "Surut (Tugboat Tidak Bisa Masuk)", userInput: "Dzaky", conclusion: "Kondisi air sungai masih surut, tugboat belum bisa masuk ke sungai." },
  { id: "sny-35", externalId: 35, date: "2026-10-06", inputTime: "17:01", location: "Dermaga Senyiur KM 0", site: "Senyiur", waterDepth: 1.86, minThreshold: 4.0, autoDescription: "Surut (Tugboat Tidak Bisa Masuk)", userInput: "Dzaky", conclusion: "Kondisi air sungai masih surut, tugboat belum bisa masuk ke sungai." },
  { id: "sny-36", externalId: 36, date: "2026-10-07", inputTime: "18:01", location: "Dermaga Senyiur KM 0", site: "Senyiur", waterDepth: 1.86, minThreshold: 4.0, autoDescription: "Surut (Tugboat Tidak Bisa Masuk)", userInput: "Dzaky", conclusion: "Kondisi air sungai masih surut, tugboat belum bisa masuk ke sungai." },
  { id: "sny-37", externalId: 37, date: "2026-10-08", inputTime: "19:01", location: "Dermaga Senyiur KM 0", site: "Senyiur", waterDepth: 2.06, minThreshold: 4.0, autoDescription: "Surut (Tugboat Tidak Bisa Masuk)", userInput: "Dzaky", conclusion: "Kondisi air sungai masih surut, tugboat belum bisa masuk ke sungai." },
  { id: "sny-38", externalId: 38, date: "2026-10-09", inputTime: "20:01", location: "Dermaga Senyiur KM 0", site: "Senyiur", waterDepth: 1.98, minThreshold: 4.0, autoDescription: "Surut (Tugboat Tidak Bisa Masuk)", userInput: "Dzaky", conclusion: "Kondisi air sungai masih surut, tugboat belum bisa masuk ke sungai." },
  { id: "sny-39", externalId: 39, date: "2026-10-10", inputTime: "21:01", location: "Dermaga Senyiur KM 0", site: "Senyiur", waterDepth: 2.00, minThreshold: 4.0, autoDescription: "Surut (Tugboat Tidak Bisa Masuk)", userInput: "Dzaky", conclusion: "Kondisi air sungai masih surut, tugboat belum bisa masuk ke sungai." },
  { id: "sny-40", externalId: 40, date: "2026-10-11", inputTime: "22:01", location: "Dermaga Senyiur KM 0", site: "Senyiur", waterDepth: 2.01, minThreshold: 4.0, autoDescription: "Surut (Tugboat Tidak Bisa Masuk)", userInput: "Dzaky", conclusion: "Kondisi air sungai masih surut, tugboat belum bisa masuk ke sungai." },
  { id: "sny-41", externalId: 41, date: "2026-10-12", inputTime: "23:01", location: "Dermaga Senyiur KM 0", site: "Senyiur", waterDepth: 2.00, minThreshold: 4.0, autoDescription: "Surut (Tugboat Tidak Bisa Masuk)", userInput: "Dzaky", conclusion: "Kondisi air sungai masih surut, tugboat belum bisa masuk ke sungai." },
  { id: "sny-42", externalId: 42, date: "2026-10-13", inputTime: "00:01", location: "Dermaga Senyiur KM 0", site: "Senyiur", waterDepth: 2.00, minThreshold: 4.0, autoDescription: "Surut (Tugboat Tidak Bisa Masuk)", userInput: "Dzaky", conclusion: "Kondisi air sungai masih surut, tugboat belum bisa masuk ke sungai." },
  { id: "sny-43", externalId: 43, date: "2026-10-14", inputTime: "01:01", location: "Dermaga Senyiur KM 0", site: "Senyiur", waterDepth: 2.74, minThreshold: 4.0, autoDescription: "Surut (Tugboat Tidak Bisa Masuk)", userInput: "Dzaky", conclusion: "Kondisi air sungai masih surut, tugboat belum bisa masuk ke sungai." },
  { id: "sny-44", externalId: 44, date: "2026-10-15", inputTime: "02:01", location: "Dermaga Senyiur KM 0", site: "Senyiur", waterDepth: 2.48, minThreshold: 4.0, autoDescription: "Surut (Tugboat Tidak Bisa Masuk)", userInput: "Dzaky", conclusion: "Kondisi air sungai masih surut, tugboat belum bisa masuk ke sungai." },
];

const INITIAL_MUARA_PAHU_RECORDS: RiverJournalEntry[] = [
  { id: "mp-1", externalId: 1, date: "2026-09-21", inputTime: "08:00", location: "Jetty Muara Pahu", site: "MuaraPahu", waterDepth: 8.06, minThreshold: 4.0, autoDescription: "Air Sudah Aman", userInput: "Dzaky", conclusion: "Operasional Lancar" },
  { id: "mp-2", externalId: 2, date: "2026-09-22", inputTime: "09:00", location: "Jetty Muara Pahu", site: "MuaraPahu", waterDepth: 8.06, minThreshold: 4.0, autoDescription: "Air Sudah Aman", userInput: "Dzaky", conclusion: "Operasional Lancar" },
  { id: "mp-3", externalId: 3, date: "2026-09-23", inputTime: "10:00", location: "Jetty Muara Pahu", site: "MuaraPahu", waterDepth: 7.48, minThreshold: 4.0, autoDescription: "Air Sudah Aman", userInput: "Dzaky", conclusion: "Operasional Lancar" },
  { id: "mp-4", externalId: 4, date: "2026-09-24", inputTime: "11:00", location: "Jetty Muara Pahu", site: "MuaraPahu", waterDepth: 7.52, minThreshold: 4.0, autoDescription: "Air Sudah Aman", userInput: "Dzaky", conclusion: "Operasional Lancar" },
  { id: "mp-5", externalId: 5, date: "2026-09-25", inputTime: "12:00", location: "Jetty Muara Pahu", site: "MuaraPahu", waterDepth: 7.80, minThreshold: 4.0, autoDescription: "Air Sudah Aman", userInput: "Dzaky", conclusion: "Operasional Lancar" },
  { id: "mp-6", externalId: 6, date: "2026-09-26", inputTime: "13:00", location: "Jetty Muara Pahu", site: "MuaraPahu", waterDepth: 7.80, minThreshold: 4.0, autoDescription: "Air Sudah Aman", userInput: "Dzaky", conclusion: "Operasional Lancar" },
  { id: "mp-7", externalId: 7, date: "2026-09-27", inputTime: "14:00", location: "Jetty Muara Pahu", site: "MuaraPahu", waterDepth: 7.80, minThreshold: 4.0, autoDescription: "Air Sudah Aman", userInput: "Dzaky", conclusion: "Operasional Lancar" },
  { id: "mp-8", externalId: 8, date: "2026-09-28", inputTime: "15:00", location: "Jetty Muara Pahu", site: "MuaraPahu", waterDepth: 7.90, minThreshold: 4.0, autoDescription: "Air Sudah Aman", userInput: "Dzaky", conclusion: "Operasional Lancar" },
  { id: "mp-9", externalId: 9, date: "2026-09-29", inputTime: "16:00", location: "Jetty Muara Pahu", site: "MuaraPahu", waterDepth: 7.90, minThreshold: 4.0, autoDescription: "Air Sudah Aman", userInput: "Dzaky", conclusion: "Operasional Lancar" },
  { id: "mp-10", externalId: 10, date: "2026-09-30", inputTime: "17:00", location: "Jetty Muara Pahu", site: "MuaraPahu", waterDepth: 8.55, minThreshold: 4.0, autoDescription: "Air Sudah Aman", userInput: "Dzaky", conclusion: "Operasional Lancar" },
  { id: "mp-11", externalId: 11, date: "2026-10-01", inputTime: "18:00", location: "Jetty Muara Pahu", site: "MuaraPahu", waterDepth: 8.70, minThreshold: 4.0, autoDescription: "Air Sudah Aman", userInput: "Dzaky", conclusion: "Operasional Lancar" },
  { id: "mp-12", externalId: 12, date: "2026-10-02", inputTime: "19:00", location: "Jetty Muara Pahu", site: "MuaraPahu", waterDepth: 8.60, minThreshold: 4.0, autoDescription: "Air Sudah Aman", userInput: "Dzaky", conclusion: "Operasional Lancar" },
  { id: "mp-13", externalId: 13, date: "2026-10-03", inputTime: "20:00", location: "Jetty Muara Pahu", site: "MuaraPahu", waterDepth: 8.25, minThreshold: 4.0, autoDescription: "Air Sudah Aman", userInput: "Dzaky", conclusion: "Operasional Lancar" },
  { id: "mp-14", externalId: 14, date: "2026-10-04", inputTime: "21:00", location: "Jetty Muara Pahu", site: "MuaraPahu", waterDepth: 8.20, minThreshold: 4.0, autoDescription: "Air Sudah Aman", userInput: "Dzaky", conclusion: "Operasional Lancar" },
  { id: "mp-15", externalId: 15, date: "2026-10-05", inputTime: "22:00", location: "Jetty Muara Pahu", site: "MuaraPahu", waterDepth: 7.08, minThreshold: 4.0, autoDescription: "Air Sudah Aman", userInput: "Dzaky", conclusion: "Operasional Lancar" },
  { id: "mp-16", externalId: 16, date: "2026-10-06", inputTime: "23:00", location: "Jetty Muara Pahu", site: "MuaraPahu", waterDepth: 7.40, minThreshold: 4.0, autoDescription: "Air Sudah Aman", userInput: "Dzaky", conclusion: "Operasional Lancar" },
  { id: "mp-17", externalId: 17, date: "2026-10-07", inputTime: "00:00", location: "Jetty Muara Pahu", site: "MuaraPahu", waterDepth: 7.60, minThreshold: 4.0, autoDescription: "Air Sudah Aman", userInput: "Dzaky", conclusion: "Operasional Lancar" },
  { id: "mp-18", externalId: 18, date: "2026-10-08", inputTime: "01:00", location: "Jetty Muara Pahu", site: "MuaraPahu", waterDepth: 7.73, minThreshold: 4.0, autoDescription: "Air Sudah Aman", userInput: "Dzaky", conclusion: "Operasional Lancar" },
  { id: "mp-19", externalId: 19, date: "2026-10-09", inputTime: "02:00", location: "Jetty Muara Pahu", site: "MuaraPahu", waterDepth: 8.40, minThreshold: 4.0, autoDescription: "Air Sudah Aman", userInput: "Dzaky", conclusion: "Operasional Lancar" },
  { id: "mp-20", externalId: 20, date: "2026-10-10", inputTime: "03:00", location: "Jetty Muara Pahu", site: "MuaraPahu", waterDepth: 8.10, minThreshold: 4.0, autoDescription: "Air Sudah Aman", userInput: "Dzaky", conclusion: "Operasional Lancar" },
  { id: "mp-21", externalId: 21, date: "2026-10-11", inputTime: "04:00", location: "Jetty Muara Pahu", site: "MuaraPahu", waterDepth: 8.12, minThreshold: 4.0, autoDescription: "Air Sudah Aman", userInput: "Dzaky", conclusion: "Operasional Lancar" },
  { id: "mp-22", externalId: 22, date: "2026-10-12", inputTime: "05:00", location: "Jetty Muara Pahu", site: "MuaraPahu", waterDepth: 8.08, minThreshold: 4.0, autoDescription: "Air Sudah Aman", userInput: "Dzaky", conclusion: "Operasional Lancar" },
  { id: "mp-23", externalId: 23, date: "2026-10-13", inputTime: "06:00", location: "Jetty Muara Pahu", site: "MuaraPahu", waterDepth: 8.40, minThreshold: 4.0, autoDescription: "Air Sudah Aman", userInput: "Dzaky", conclusion: "Operasional Lancar" },
  { id: "mp-24", externalId: 24, date: "2026-10-14", inputTime: "07:00", location: "Jetty Muara Pahu", site: "MuaraPahu", waterDepth: 9.40, minThreshold: 4.0, autoDescription: "Air Sudah Aman", userInput: "Dzaky", conclusion: "Operasional Lancar" },
  { id: "mp-25", externalId: 25, date: "2026-10-15", inputTime: "08:00", location: "Jetty Muara Pahu", site: "MuaraPahu", waterDepth: 8.70, minThreshold: 4.0, autoDescription: "Air Sudah Aman", userInput: "Dzaky", conclusion: "Operasional Lancar" },
];

const LOCAL_STORAGE_KEY = "bdp_river_journal_local_entries";

function getLocalStoredEntries(): RiverJournalEntry[] {
  if (typeof window === "undefined") return [...INITIAL_SENYIUR_RECORDS, ...INITIAL_MUARA_PAHU_RECORDS];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn("Failed to load local river entries", e);
  }
  return [...INITIAL_SENYIUR_RECORDS, ...INITIAL_MUARA_PAHU_RECORDS];
}

function saveLocalStoredEntries(entries: RiverJournalEntry[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(entries));
  } catch (e) {
    console.warn("Failed to save local river entries", e);
  }
}

export const riverJournalService = {
  /**
   * Fetch list of river entries
   */
  async getJournals(filters?: {
    site?: JobSite | "all";
    startDate?: string;
    endDate?: string;
    status?: "surut" | "aman" | "all";
  }): Promise<RiverJournalEntry[]> {
    try {
      const queryParams = new URLSearchParams();
      if (filters?.site && filters.site !== "all") queryParams.append("site", filters.site);
      if (filters?.startDate) queryParams.append("startDate", filters.startDate);
      if (filters?.endDate) queryParams.append("endDate", filters.endDate);
      if (filters?.status && filters.status !== "all") queryParams.append("status", filters.status);

      const url = `${API_BASE_URL}/river-journal?${queryParams.toString()}`;
      const res = await fetch(url, {
        headers: { "Content-Type": "application/json" },
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          saveLocalStoredEntries(json.data);
          return json.data;
        }
      }
    } catch (err) {
      console.warn("Network error calling /river-journal, using local baseline data:", err);
    }

    // Fallback to local storage / preloaded records
    let entries = getLocalStoredEntries();
    if (filters?.site && filters.site !== "all") {
      entries = entries.filter((e) => e.site === filters.site);
    }
    if (filters?.startDate) {
      entries = entries.filter((e) => e.date >= filters.startDate!);
    }
    if (filters?.endDate) {
      entries = entries.filter((e) => e.date <= filters.endDate!);
    }
    if (filters?.status && filters.status !== "all") {
      if (filters.status === "surut") {
        entries = entries.filter((e) => e.autoDescription.toLowerCase().includes("surut"));
      } else if (filters.status === "aman") {
        entries = entries.filter((e) => e.autoDescription.toLowerCase().includes("aman"));
      }
    }

    return entries.sort((a, b) => {
      const dateCmp = b.date.localeCompare(a.date);
      if (dateCmp !== 0) return dateCmp;
      return b.inputTime.localeCompare(a.inputTime);
    });
  },

  /**
   * Fetch statistical summary
   */
  async getStats(site?: JobSite | "all"): Promise<RiverJournalStats> {
    try {
      const queryParams = new URLSearchParams();
      if (site && site !== "all") queryParams.append("site", site);

      const url = `${API_BASE_URL}/river-journal/stats?${queryParams.toString()}`;
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          return json.data;
        }
      }
    } catch (e) {
      console.warn("Network error fetching stats, calculating locally:", e);
    }

    // Calculate stats locally
    const entries = await this.getJournals({ site });
    if (entries.length === 0) {
      return {
        totalReadings: 0,
        latestReading: null,
        minDepth: 0,
        maxDepth: 0,
        avgDepth: 0,
        safeCount: 0,
        surutCount: 0,
        safePercentage: 0,
        currentStatus: "Unknown",
      };
    }

    const depths = entries.map((r) => r.waterDepth);
    const minDepth = Math.min(...depths);
    const maxDepth = Math.max(...depths);
    const avgDepth = depths.reduce((a, b) => a + b, 0) / depths.length;

    // sorted chronologically
    const chronological = [...entries].sort((a, b) => {
      const d = a.date.localeCompare(b.date);
      return d !== 0 ? d : a.inputTime.localeCompare(b.inputTime);
    });

    const latest = chronological[chronological.length - 1];
    const previous = chronological.length > 1 ? chronological[chronological.length - 2] : null;
    const delta = previous ? Number((latest.waterDepth - previous.waterDepth).toFixed(2)) : 0;

    const safeCount = entries.filter((r) => r.waterDepth >= r.minThreshold).length;
    const surutCount = entries.length - safeCount;
    const safePercentage = Number(((safeCount / entries.length) * 100).toFixed(1));

    return {
      totalReadings: entries.length,
      latestReading: { ...latest, delta },
      minDepth: Number(minDepth.toFixed(2)),
      maxDepth: Number(maxDepth.toFixed(2)),
      avgDepth: Number(avgDepth.toFixed(2)),
      safeCount,
      surutCount,
      safePercentage,
      currentStatus: latest.waterDepth >= latest.minThreshold ? "Aman" : "Surut",
    };
  },

  /**
   * Create new water measurement entry
   */
  async createEntry(payload: CreateRiverJournalPayload): Promise<RiverJournalEntry> {
    const autoDesc =
      payload.autoDescription ||
      (payload.waterDepth < payload.minThreshold
        ? "Surut (Tugboat Tidak Bisa Masuk)"
        : "Air Sudah Aman");

    const autoConclusion =
      payload.conclusion ||
      (payload.waterDepth < payload.minThreshold
        ? "Kondisi air sungai masih surut, tugboat belum bisa masuk ke sungai."
        : "Operasional Lancar");

    const cleanPayload = {
      ...payload,
      autoDescription: autoDesc,
      conclusion: autoConclusion,
    };

    try {
      const res = await fetch(`${API_BASE_URL}/river-journal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cleanPayload),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          // Update local storage
          const current = getLocalStoredEntries();
          saveLocalStoredEntries([json.data, ...current]);
          return json.data;
        }
      }
    } catch (err) {
      console.warn("Backend unavailable, saving locally:", err);
    }

    // Fallback local save
    const current = getLocalStoredEntries();
    const newEntry: RiverJournalEntry = {
      id: `local-${Date.now()}`,
      externalId: (current.length ? Math.max(...current.map((c) => c.externalId || 0)) : 0) + 1,
      date: cleanPayload.date,
      inputTime: cleanPayload.inputTime,
      location: cleanPayload.location,
      site: cleanPayload.site,
      waterDepth: cleanPayload.waterDepth,
      minThreshold: cleanPayload.minThreshold,
      autoDescription: cleanPayload.autoDescription,
      userInput: cleanPayload.userInput,
      conclusion: cleanPayload.conclusion,
      createdAt: new Date().toISOString(),
    };

    saveLocalStoredEntries([newEntry, ...current]);
    return newEntry;
  },

  /**
   * Delete entry
   */
  async deleteEntry(id: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE_URL}/river-journal/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        const current = getLocalStoredEntries();
        saveLocalStoredEntries(current.filter((e) => e.id !== id));
        return true;
      }
    } catch (e) {
      console.warn("Backend delete failed, removing locally:", e);
    }

    const current = getLocalStoredEntries();
    saveLocalStoredEntries(current.filter((e) => e.id !== id));
    return true;
  },
};
