import React, { useState, useRef } from 'react';
import { User, Users, Home, Zap, Flame, FileText, X, AlertCircle, ArrowRight, Calculator, UploadCloud, Loader2, CheckCircle2, Trophy, PiggyBank, Shield, Check, TrendingDown, TrendingUp, Minus, Sparkles, Star, Lightbulb, Building2, LineChart } from 'lucide-react';
import { GoogleGenAI, Type } from '@google/genai';
import { motion, AnimatePresence } from 'motion/react';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

type Nucleo = 'single' | 'coppia' | 'famiglia';
type Fornitura = 'luce' | 'gas';
type Periodo = 'annuale' | 'mensile';

interface OcrResult {
  tipo_fornitura: 'luce' | 'gas' | null;
  spesa_totale: number | null;
  periodo: 'mensile' | 'bimestrale' | 'annuale' | null;
  consumo: number | null;
  warnings: string[];
  analisi_fornitore?: {
    nome: string;
    tipo_mercato: string;
    nota: string;
    rischio_rincaro: string;
  };
  proiezione?: {
    trend_mercato: string;
    stima_spesa_12_mesi_attuale: number;
    stima_spesa_12_mesi_ats: number;
    risparmio_cumulativo_24_mesi: number;
    messaggio: string;
  };
  convenienza_score?: {
    punteggio: number;
    calcolo: string;
    etichetta: string;
    stelle: number;
  };
  consigli_efficienza?: {
    titolo: string;
    descrizione: string;
    risparmio_potenziale_euro: number;
    priorita: string;
  }[];
}

export default function App() {
  const [nucleo, setNucleo] = useState<Nucleo>('famiglia');
  const [fornitura, setFornitura] = useState<Fornitura>('luce');
  const [periodo, setPeriodo] = useState<Periodo>('annuale');
  const [spesa, setSpesa] = useState<string>('');
  
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [ocrData, setOcrData] = useState<OcrResult | null>(null);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Calculate offers
  const spesaNum = parseFloat(spesa) || 0;
  const spesaAnnuale = periodo === 'annuale' ? spesaNum : spesaNum * 12;
  
  const getAtsOffer = () => {
    if (fornitura === 'luce') {
      if (nucleo === 'single') return 250;
      if (nucleo === 'coppia') return 380;
      return 510;
    } else {
      if (nucleo === 'single') return 255;
      if (nucleo === 'coppia') return 375;
      return 515;
    }
  };

  const getMarketMedian = () => {
    if (fornitura === 'luce') {
      if (nucleo === 'single') return 294;
      if (nucleo === 'coppia') return 446;
      return 612;
    } else {
      if (nucleo === 'single') return 310;
      if (nucleo === 'coppia') return 460;
      return 630;
    }
  };

  const atsPowerOffer = getAtsOffer();
  const marketMedian = getMarketMedian();
  const risparmio = spesaAnnuale > 0 ? spesaAnnuale - atsPowerOffer : 0;
  const risparmioPercentuale = spesaAnnuale > 0 ? (risparmio / spesaAnnuale) * 100 : 0;
  const risparmioMensile = (risparmio / 12).toFixed(2);
  
  let marketing = null;
  if (spesaAnnuale > 0) {
    if (risparmioPercentuale > 20) {
      marketing = {
        sentiment: 'ottimo_risparmio',
        colorClass: 'text-emerald-800 bg-emerald-50 border-emerald-200',
        iconColor: 'text-emerald-600',
        headline: `Potresti risparmiare fino a ${risparmio.toFixed(0)}€ all'anno!`,
        sottotitolo: `Sono ${risparmioMensile}€ in meno al mese rispetto a oggi`,
        cta: "Con ATS Power risparmi subito. Richiedi un preventivo.",
        icon: Trophy,
        urgency: `Il tuo attuale fornitore ti costa il ${risparmioPercentuale.toFixed(0)}% in più della media di mercato`,
        social_proof: "Oltre 10.000 famiglie in Puglia hanno già scelto ATS Power",
        equivalenza: `Equivale a ${Math.floor(risparmio / 30)} cene fuori o ${Math.floor(risparmio / 13)} mesi di Netflix!`
      };
    } else if (risparmioPercentuale >= 5) {
      marketing = {
        sentiment: 'buon_risparmio',
        colorClass: 'text-emerald-800 bg-emerald-50 border-emerald-200',
        iconColor: 'text-emerald-600',
        headline: `Con ATS Power risparmi ~${risparmio.toFixed(0)}€ all'anno`,
        sottotitolo: "Un risparmio concreto sulla tua bolletta",
        cta: "Scopri l'offerta ATS Power dedicata a te",
        icon: PiggyBank,
        urgency: "Non lasciare soldi sul tavolo: il prezzo ATS è bloccato",
        social_proof: "Prezzo fisso garantito, nessuna sorpresa in bolletta",
        equivalenza: `Equivale a ${Math.floor(risparmio / 13)} mesi di Netflix!`
      };
    } else if (risparmioPercentuale >= 0) {
      marketing = {
        sentiment: 'in_linea',
        colorClass: 'text-blue-800 bg-blue-50 border-blue-200',
        iconColor: 'text-blue-600',
        headline: "La tua spesa è in linea con ATS Power",
        sottotitolo: "Ma con ATS hai il prezzo bloccato e zero sorprese",
        cta: "Valuta il passaggio per la sicurezza del prezzo fisso",
        icon: Shield,
        urgency: null,
        social_proof: "Con ATS Power il prezzo è bloccato: proteggi la tua bolletta dai rincari",
        equivalenza: null
      };
    } else {
      marketing = {
        sentiment: 'gia_conveniente',
        colorClass: 'text-amber-800 bg-amber-50 border-amber-200',
        iconColor: 'text-amber-600',
        headline: "Complimenti, hai già un'ottima tariffa!",
        sottotitolo: "La tua spesa è inferiore all'offerta ATS Power attuale",
        cta: "Tieni d'occhio le nostre promozioni future",
        icon: Check,
        urgency: null,
        social_proof: null,
        equivalenza: null
      };
    }
  }

  let marketPositioning = "";
  let MarketIcon = null;
  let marketColor = "";
  if (spesaAnnuale > marketMedian * 1.05) {
    marketPositioning = `Stai pagando ${(spesaAnnuale - marketMedian).toFixed(0)}€ in più della media italiana`;
    MarketIcon = TrendingUp;
    marketColor = "text-red-500";
  } else if (spesaAnnuale < marketMedian * 0.95 && spesaAnnuale > 0) {
    marketPositioning = "Stai già pagando meno della media italiana";
    MarketIcon = TrendingDown;
    marketColor = "text-emerald-500";
  } else if (spesaAnnuale > 0) {
    marketPositioning = "La tua spesa è nella media di mercato";
    MarketIcon = Minus;
    marketColor = "text-blue-500";
  }

  const processFile = async (file: File) => {
    setUploadedFile(file);
    setIsAnalyzing(true);
    setOcrError(null);
    setOcrData(null);

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = (reader.result as string).split(',')[1];
        
        try {
          const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: [
              {
                parts: [
                  {
                    inlineData: {
                      data: base64String,
                      mimeType: file.type,
                    }
                  },
                  {
                    text: `Sei l'assistente AI di ATS Power, un fornitore energetico operante in Puglia, Basilicata, Molise e Lombardia.
Il tuo compito è analizzare questa bolletta energetica (luce o gas) ed estrarre i dati chiave.

REGOLE FONDAMENTALI:
- Rispondi SEMPRE in italiano.
- Restituisci SOLO JSON strutturato, mai testo libero.
- Se un campo non è leggibile, usa null e segnalalo in "warnings".
- Non inventare dati: se non riesci a leggere un valore, dichiaralo mancante.
- Tutti gli importi sono in EUR, i consumi in kWh (luce) o Smc (gas).
- La privacy è prioritaria: non memorizzare né trasmettere dati personali dell'utente.

Le offerte ATS Power (costi annui stimati in €) sono:
- Luce: Single 250€, Coppia 380€, Famiglia 510€
- Gas: Single 255€, Coppia 375€, Famiglia 515€

La mediana di mercato annua è:
- Luce: Single 294€, Coppia 446€, Famiglia 612€
- Gas: Single 310€, Coppia 460€, Famiglia 630€

Estrai i dati richiesti e calcola:
1. analisi_fornitore: se riconosci il fornitore, indica nome, tipo mercato, una nota sul punto debole e il rischio rincaro.
2. proiezione: stima la spesa a 12 e 24 mesi. Se il trend è in aumento, applica +5% alla spesa attuale. Calcola il risparmio cumulativo a 24 mesi rispetto all'offerta ATS.
3. convenienza_score: da 0 a 100 (40% risparmio, 30% vs mercato, 20% stabilità, 10% rischio fornitore). Etichette: Ottima scelta, Buona scelta, Da valutare, Già conveniente. Stelle: 1-5.
4. consigli_efficienza: suggerisci azioni in base ai consumi (es. >4000 kWh luce -> fotovoltaico, >1200 Smc gas -> caldaia condensazione, family -> fascia bioraria).`
                  }
                ]
              }
            ],
            config: {
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  tipo_fornitura: { type: Type.STRING, description: "luce o gas" },
                  spesa_totale: { type: Type.NUMBER, description: "Importo totale da pagare" },
                  periodo: { type: Type.STRING, description: "mensile, bimestrale, o annuale" },
                  consumo: { type: Type.NUMBER, description: "Consumo fatturato" },
                  warnings: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Avvisi su dati mancanti o illeggibili" },
                  analisi_fornitore: {
                    type: Type.OBJECT,
                    description: "Se riconosci il fornitore (Enel, Eni Plenitude, ecc.)",
                    properties: {
                      nome: { type: Type.STRING },
                      tipo_mercato: { type: Type.STRING, description: "libero | tutelato | salvaguardia" },
                      nota: { type: Type.STRING, description: "punto debole noto" },
                      rischio_rincaro: { type: Type.STRING, description: "alto | medio | basso" }
                    }
                  },
                  proiezione: {
                    type: Type.OBJECT,
                    properties: {
                      trend_mercato: { type: Type.STRING, description: "in_aumento | stabile | in_calo" },
                      stima_spesa_12_mesi_attuale: { type: Type.NUMBER },
                      stima_spesa_12_mesi_ats: { type: Type.NUMBER },
                      risparmio_cumulativo_24_mesi: { type: Type.NUMBER },
                      messaggio: { type: Type.STRING }
                    }
                  },
                  convenienza_score: {
                    type: Type.OBJECT,
                    properties: {
                      punteggio: { type: Type.NUMBER },
                      calcolo: { type: Type.STRING },
                      etichetta: { type: Type.STRING },
                      stelle: { type: Type.NUMBER }
                    }
                  },
                  consigli_efficienza: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        titolo: { type: Type.STRING },
                        descrizione: { type: Type.STRING },
                        risparmio_potenziale_euro: { type: Type.NUMBER },
                        priorita: { type: Type.STRING }
                      }
                    }
                  }
                }
              }
            }
          });

          if (response.text) {
            const data = JSON.parse(response.text) as OcrResult;
            setOcrData(data);
            
            if (data.tipo_fornitura === 'luce' || data.tipo_fornitura === 'gas') {
              setFornitura(data.tipo_fornitura);
            }
            if (data.spesa_totale) {
              if (data.periodo === 'mensile') {
                setSpesa(data.spesa_totale.toString());
                setPeriodo('mensile');
              } else if (data.periodo === 'annuale') {
                setSpesa(data.spesa_totale.toString());
                setPeriodo('annuale');
              } else if (data.periodo === 'bimestrale') {
                setSpesa((data.spesa_totale / 2).toFixed(2));
                setPeriodo('mensile');
              } else {
                setSpesa(data.spesa_totale.toString());
              }
            }
          }
        } catch (err) {
          console.error("OCR Error:", err);
          setOcrError("Errore durante l'analisi della bolletta. Assicurati che l'immagine sia leggibile.");
        } finally {
          setIsAnalyzing(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setIsAnalyzing(false);
      setOcrError("Errore di lettura del file.");
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const removeFile = () => {
    setUploadedFile(null);
    setOcrData(null);
    setOcrError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatBytes = (bytes: number, decimals = 2) => {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-[#e8ecf1] p-4 md:p-8 font-sans text-slate-800 flex flex-col items-center">
      
      {/* HEADER */}
      <header className="w-full max-w-5xl flex items-center justify-between mb-8">
        <img src="https://atspower.it/res/img/logo.png" alt="ATS Power" className="h-10 object-contain" referrerPolicy="no-referrer" />
        <div className="hidden md:flex items-center gap-2 text-sm font-medium text-slate-500 bg-white px-4 py-2 rounded-full shadow-sm border border-slate-100">
          <Zap className="w-4 h-4 text-[#1b365d]" />
          <span>Comparatore Offerte</span>
        </div>
      </header>

      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* LEFT PANEL */}
        <div className="md:col-span-7 bg-white rounded-[2rem] p-6 md:p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-8">
            <Calculator className="w-6 h-6 text-[#1b365d]" />
            <h1 className="text-xl font-bold text-slate-900">I tuoi dati</h1>
          </div>

          {/* NUCLEO FAMILIARE */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">Nucleo Familiare</label>
            <div className="grid grid-cols-3 gap-3">
              {(['single', 'coppia', 'famiglia'] as Nucleo[]).map((n) => (
                <button
                  key={n}
                  onClick={() => setNucleo(n)}
                  className={`flex flex-col items-center justify-center py-4 rounded-2xl border transition-all ${
                    nucleo === n 
                      ? 'bg-[#1b365d] border-[#1b365d] text-white shadow-md scale-[1.02]' 
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {n === 'single' && <User className="w-5 h-5 mb-2" />}
                  {n === 'coppia' && <Users className="w-5 h-5 mb-2" />}
                  {n === 'famiglia' && <Home className="w-5 h-5 mb-2" />}
                  <span className="text-sm font-medium capitalize">{n}</span>
                </button>
              ))}
            </div>
          </motion.div>

          {/* TIPO DI FORNITURA */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-8"
          >
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">Tipo di fornitura</label>
            <div className="grid grid-cols-2 gap-3">
              {(['luce', 'gas'] as Fornitura[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFornitura(f)}
                  className={`flex items-center justify-center py-4 rounded-2xl border transition-all ${
                    fornitura === f 
                      ? 'bg-[#1b365d] border-[#1b365d] text-white shadow-md scale-[1.02]' 
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {f === 'luce' ? <Zap className="w-5 h-5 mr-2" /> : <Flame className="w-5 h-5 mr-2" />}
                  <span className="text-sm font-medium capitalize">{f}</span>
                </button>
              ))}
            </div>
          </motion.div>

          {/* QUANTO SPENDI */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-8"
          >
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">Quanto spendi attualmente?</label>
            <div className="flex gap-2 mb-4">
              <button 
                onClick={() => setPeriodo('annuale')}
                className={`px-4 py-1.5 rounded-full text-xs font-bold tracking-wide uppercase transition-colors ${
                  periodo === 'annuale' ? 'bg-[#1b365d] text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                Annuale
              </button>
              <button 
                onClick={() => setPeriodo('mensile')}
                className={`px-4 py-1.5 rounded-full text-xs font-bold tracking-wide uppercase transition-colors ${
                  periodo === 'mensile' ? 'bg-[#1b365d] text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                Mensile
              </button>
            </div>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 font-medium">€</span>
              <input 
                type="number" 
                value={spesa}
                onChange={(e) => setSpesa(e.target.value)}
                placeholder="0"
                className="w-full pl-10 pr-16 py-4 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-[#1b365d] focus:border-transparent outline-none text-lg font-medium transition-shadow"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">/ {periodo === 'annuale' ? 'anno' : 'mese'}</span>
            </div>
          </motion.div>

          {/* CARICA BOLLETTA */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-8"
          >
            <label className="block text-sm font-medium text-slate-800 mb-3">Oppure carica la tua bolletta</label>
            
            {!uploadedFile ? (
              <div 
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${
                  isDragging 
                    ? 'border-[#1b365d] bg-blue-50' 
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <UploadCloud className={`w-8 h-8 mb-3 ${isDragging ? 'text-[#1b365d]' : 'text-slate-400'}`} />
                <p className={`text-sm font-medium mb-1 ${isDragging ? 'text-[#1b365d]' : 'text-slate-700'}`}>
                  {isDragging ? 'Rilascia il file qui' : 'Clicca o trascina qui un file'}
                </p>
                <p className="text-xs text-slate-500">PDF, JPG o PNG (max 5MB)</p>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  accept="image/*,application/pdf" 
                  className="hidden" 
                />
              </div>
            ) : (
              <div className="bg-[#f8f9fa] rounded-2xl p-4 border border-slate-100 relative">
                <button 
                  onClick={removeFile}
                  className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-100 shrink-0">
                    <FileText className="w-6 h-6 text-slate-500" />
                  </div>
                  <div className="flex-1 min-w-0 pt-1">
                    <p className="text-sm font-medium text-slate-900 truncate pr-8">{uploadedFile.name}</p>
                    <p className="text-xs text-slate-500 mb-3">{formatBytes(uploadedFile.size)}</p>
                    
                    {isAnalyzing && (
                      <div className="mt-4 p-6 border-2 border-[#1b365d] border-dashed rounded-2xl bg-blue-50 relative overflow-hidden">
                        <motion.div 
                          className="absolute top-0 left-0 w-full h-1 bg-[#1b365d] shadow-[0_0_15px_#1b365d]"
                          animate={{ top: ['0%', '100%', '0%'] }}
                          transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                        />
                        <div className="flex flex-col items-center justify-center text-[#1b365d] relative z-10">
                          <Sparkles className="w-8 h-8 animate-pulse mb-3" />
                          <p className="font-bold text-center">Analisi in corso...</p>
                          <p className="text-xs opacity-80 mt-1 text-center">Estrazione dati dalla bolletta</p>
                        </div>
                      </div>
                    )}

                    {!isAnalyzing && ocrError && (
                      <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 p-3 rounded-xl">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{ocrError}</span>
                      </div>
                    )}

                    {!isAnalyzing && ocrData && (
                      <div className="space-y-2">
                        <div className="flex items-start gap-2 text-sm text-emerald-700 bg-emerald-50 p-3 rounded-xl">
                          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                          <span>Dati estratti con successo! I campi sono stati aggiornati.</span>
                        </div>
                        {ocrData.warnings && ocrData.warnings.length > 0 && (
                          <div className="flex items-start gap-2 text-sm text-amber-800 bg-[#fdf6b2] p-3 rounded-xl">
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                            <div className="flex-1">
                              <p className="font-medium mb-1">Attenzione:</p>
                              <ul className="list-disc list-inside">
                                {ocrData.warnings.map((w, i) => <li key={i}>{w}</li>)}
                              </ul>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </motion.div>

          {/* SUBMIT BUTTON */}
          <motion.button 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="w-full bg-[#1b365d] text-white rounded-2xl py-4 font-semibold flex items-center justify-center gap-2 hover:bg-[#152a4a] transition-colors shadow-md"
          >
            Confronta con ATS Power <ArrowRight className="w-5 h-5" />
          </motion.button>
        </div>

        {/* RIGHT PANEL */}
        <div className="md:col-span-5 space-y-4">
          {/* ATS POWER OFFER */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`text-white rounded-[2rem] p-8 shadow-xl relative overflow-hidden transform transition-all duration-500 ${
              risparmioPercentuale > 20 
                ? 'bg-gradient-to-br from-[#1b365d] to-[#0a1424] ring-4 ring-emerald-400 ring-offset-4 ring-offset-[#f4f5f7] scale-[1.03]' 
                : risparmio > 0 
                  ? 'bg-gradient-to-br from-[#1b365d] to-[#0f1e33] scale-[1.02]' 
                  : 'bg-[#1b365d]'
            }`}
          >
            {/* Subtle background decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-y-1/2 translate-x-1/3 blur-2xl"></div>
            
            <h3 className="text-xs font-bold uppercase tracking-wider text-blue-200 mb-4">Offerta ATS Power</h3>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-5xl font-bold tracking-tight">{atsPowerOffer}</span>
              <span className="text-3xl font-medium">€</span>
            </div>
            <p className="text-blue-200 text-sm mb-1">/ anno • {fornitura === 'luce' ? 'Luce prezzo fisso' : 'Gas prezzo fisso'}</p>
            <p className="text-blue-300 text-sm">Profilo: <span className="capitalize">{nucleo}</span></p>

            <AnimatePresence>
              {risparmio > 0 && (
                <motion.div 
                  key="risparmio-banner"
                  initial={{ opacity: 0, height: 0, marginTop: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginTop: 24 }}
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  className="overflow-hidden"
                >
                  <div className={`px-6 py-4 rounded-2xl shadow-lg border ${
                    risparmioPercentuale > 20 
                      ? 'bg-gradient-to-r from-emerald-400 to-emerald-500 text-emerald-950 border-emerald-300' 
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  }`}>
                    <div className="flex items-center gap-3 mb-1">
                      {risparmioPercentuale > 20 ? <Trophy className="w-6 h-6" /> : <CheckCircle2 className="w-5 h-5" />}
                      <span className={`font-black uppercase tracking-wide ${risparmioPercentuale > 20 ? 'text-lg' : 'text-sm'}`}>
                        {risparmioPercentuale > 20 ? 'Pagherai molto meno!' : 'Risparmio garantito'}
                      </span>
                    </div>
                    <div className={`${risparmioPercentuale > 20 ? 'text-3xl' : 'text-xl'} font-black`}>
                      Risparmi {risparmio.toFixed(0)}€ <span className={`${risparmioPercentuale > 20 ? 'text-lg' : 'text-sm'} font-bold`}>all'anno</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* MARKETING CARD */}
          <AnimatePresence mode="wait">
            {marketing && (
              <motion.div 
                key={marketing.sentiment}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={`rounded-[2rem] p-6 border ${marketing.colorClass} shadow-sm`}
              >
              <div className="flex items-start gap-4 mb-4">
                <div className={`p-3 bg-white rounded-2xl shadow-sm ${marketing.iconColor}`}>
                  <marketing.icon className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-lg font-bold leading-tight mb-1">{marketing.headline}</h3>
                  <p className="text-sm opacity-90">{marketing.sottotitolo}</p>
                </div>
              </div>
              
              <div className="space-y-3 mt-6">
                {marketing.equivalenza && (
                  <div className="flex items-center gap-2 text-sm font-medium bg-white/60 p-3 rounded-xl">
                    <span className="text-lg">🍕</span> {marketing.equivalenza}
                  </div>
                )}
                {marketing.urgency && (
                  <div className="flex items-start gap-2 text-sm">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 opacity-70" />
                    <span className="opacity-90">{marketing.urgency}</span>
                  </div>
                )}
                {marketing.social_proof && (
                  <div className="flex items-start gap-2 text-sm">
                    <Users className="w-4 h-4 shrink-0 mt-0.5 opacity-70" />
                    <span className="opacity-90">{marketing.social_proof}</span>
                  </div>
                )}
              </div>

              <button className={`w-full mt-6 bg-white py-3 px-4 rounded-xl font-bold shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 ${marketing.iconColor}`}>
                {marketing.cta} <ArrowRight className="w-4 h-4" />
              </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* MARKET MEDIAN */}
          <div className="bg-[#f8f9fa] rounded-[2rem] p-8 border border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">Mediana di mercato</h3>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-3xl font-bold text-slate-900">{marketMedian}</span>
              <span className="text-xl font-medium text-slate-900">€</span>
              <span className="text-slate-500 text-sm ml-1">/ anno</span>
            </div>
            <p className="text-slate-500 text-sm mb-4">Italia • {fornitura === 'luce' ? 'Luce fissa' : 'Gas fisso'}</p>
            
            {marketPositioning && (
              <div className="flex items-center gap-2 text-sm font-medium bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                {MarketIcon && <MarketIcon className={`w-5 h-5 ${marketColor}`} />}
                <span className="text-slate-700">{marketPositioning}</span>
              </div>
            )}
          </div>

          {/* AI INSIGHTS FROM OCR */}
          <AnimatePresence>
            {ocrData?.analisi_fornitore && (
              <motion.div 
                key="analisi-fornitore"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-white rounded-[2rem] p-6 border border-slate-200 shadow-sm overflow-hidden"
              >
                <div className="flex items-center gap-2 mb-4">
                  <Building2 className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-bold text-slate-900">Analisi Fornitore Attuale</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <span className="text-sm text-slate-500">Nome</span>
                    <span className="font-semibold">{ocrData.analisi_fornitore.nome}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <span className="text-sm text-slate-500">Mercato</span>
                    <span className="font-semibold capitalize">{ocrData.analisi_fornitore.tipo_mercato}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <span className="text-sm text-slate-500">Rischio Rincaro</span>
                    <span className={`font-semibold capitalize ${
                      ocrData.analisi_fornitore.rischio_rincaro === 'alto' ? 'text-red-600' : 
                      ocrData.analisi_fornitore.rischio_rincaro === 'medio' ? 'text-amber-600' : 'text-emerald-600'
                    }`}>{ocrData.analisi_fornitore.rischio_rincaro}</span>
                  </div>
                  <div className="bg-indigo-50 p-3 rounded-xl text-sm text-indigo-900 mt-2">
                    <span className="font-semibold">Nota: </span>
                    {ocrData.analisi_fornitore.nota}
                  </div>
                </div>
              </motion.div>
            )}

            {ocrData?.proiezione && (
              <motion.div 
                key="proiezione"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-white rounded-[2rem] p-6 border border-slate-200 shadow-sm overflow-hidden"
              >
                <div className="flex items-center gap-2 mb-4">
                  <LineChart className="w-5 h-5 text-blue-600" />
                  <h3 className="font-bold text-slate-900">Proiezione a 24 Mesi</h3>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl mb-4">
                  <p className="text-sm text-slate-700 font-medium">{ocrData.proiezione.messaggio}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-red-50 p-3 rounded-xl border border-red-100">
                    <p className="text-xs text-red-800 mb-1">Spesa Attuale (12m)</p>
                    <p className="text-lg font-bold text-red-900">{ocrData.proiezione.stima_spesa_12_mesi_attuale.toFixed(0)}€</p>
                  </div>
                  <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                    <p className="text-xs text-emerald-800 mb-1">Spesa ATS (12m)</p>
                    <p className="text-lg font-bold text-emerald-900">{ocrData.proiezione.stima_spesa_12_mesi_ats.toFixed(0)}€</p>
                  </div>
                </div>
              </motion.div>
            )}

            {ocrData?.convenienza_score && (
              <motion.div 
                key="convenienza-score"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-[2rem] p-6 border border-amber-200 shadow-sm overflow-hidden"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-amber-900">Score Convenienza ATS</h3>
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={`star-${i}`} className={`w-5 h-5 ${i < (ocrData.convenienza_score?.stelle || 0) ? 'fill-amber-400 text-amber-400' : 'text-amber-200'}`} />
                    ))}
                  </div>
                </div>
                <div className="flex items-end gap-3 mb-2">
                  <span className="text-4xl font-black text-amber-600">{ocrData.convenienza_score.punteggio}</span>
                  <span className="text-lg font-bold text-amber-800 mb-1">/ 100</span>
                </div>
                <p className="text-sm font-bold text-amber-900 mb-1">{ocrData.convenienza_score.etichetta}</p>
                <p className="text-xs text-amber-700 opacity-80">{ocrData.convenienza_score.calcolo}</p>
              </motion.div>
            )}

            {ocrData?.consigli_efficienza && ocrData.consigli_efficienza.length > 0 && (
              <motion.div 
                key="consigli-efficienza"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-white rounded-[2rem] p-6 border border-slate-200 shadow-sm overflow-hidden"
              >
                <div className="flex items-center gap-2 mb-4">
                  <Lightbulb className="w-5 h-5 text-yellow-500" />
                  <h3 className="font-bold text-slate-900">Consigli di Efficienza</h3>
                </div>
                <div className="space-y-4">
                  {ocrData.consigli_efficienza.map((consiglio, idx) => (
                    <div key={idx} className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-slate-800 text-sm">{consiglio.titolo}</h4>
                        <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${
                          consiglio.priorita === 'alta' ? 'bg-red-100 text-red-700' :
                          consiglio.priorita === 'media' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          Priorità {consiglio.priorita}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mb-2">{consiglio.descrizione}</p>
                      <div className="text-xs font-semibold text-emerald-600">
                        Risparmio potenziale: ~{consiglio.risparmio_potenziale_euro}€/anno
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>

      {/* FOOTER */}
      <footer className="max-w-6xl mx-auto px-4 sm:px-6 mt-12 text-center text-sm text-slate-400 font-medium">
        MVP sviluppato da Ribrain
      </footer>
    </div>
  );
}
