import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Account, EventType } from '../../domain/types';
import {
  parseVoiceTranscript,
  SAMPLE_VOICE_TRANSCRIPTS,
  SpeechRecognitionService,
  ParsedVoiceEntry
} from '../../domain/voice';
import { toPaise } from '../../domain/money';

interface VoiceCaptureTabProps {
  accounts: Account[];
  onSaveEntry: (entry: {
    type: EventType;
    amount_paise: number;
    date: string;
    account_id: string;
    recipient: string;
    category: string;
    notes?: string;
  }) => Promise<void>;
  onClose: () => void;
}

export const VoiceCaptureTab: React.FC<VoiceCaptureTabProps> = ({
  accounts,
  onSaveEntry,
  onClose
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [parsedEntry, setParsedEntry] = useState<ParsedVoiceEntry | null>(null);
  const [recognitionError, setRecognitionError] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);

  // Editable fields
  const [amountRupees, setAmountRupees] = useState('');
  const [recipient, setRecipient] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [category, setCategory] = useState('General');
  const [type, setType] = useState<EventType>('purchase');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const speechServiceRef = useRef<SpeechRecognitionService | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const stopAudioMeter = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setAudioLevel(0);
  }, []);

  const startAudioMeter = useCallback(async () => {
    try {
      if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) return;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      const ctx = new AudioCtx();
      audioContextRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateLevel = () => {
        if (!mediaStreamRef.current) return;
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
        animFrameRef.current = requestAnimationFrame(updateLevel);
      };
      updateLevel();
    } catch (err: any) {
      console.warn('Microphone hardware check warning:', err);
    }
  }, []);

  useEffect(() => {
    speechServiceRef.current = new SpeechRecognitionService();
    return () => {
      speechServiceRef.current?.stop();
      stopAudioMeter();
    };
  }, [stopAudioMeter]);

  const handleApplyParsed = useCallback((parsed: ParsedVoiceEntry) => {
    setParsedEntry(parsed);
    setTranscript(parsed.rawTranscript);
    setType(parsed.type);

    if (parsed.amount_paise !== null) {
      setAmountRupees((parsed.amount_paise / 100).toString());
    }
    if (parsed.recipient) {
      setRecipient(parsed.recipient);
    }
    if (parsed.date) {
      setDate(parsed.date);
    }
    if (parsed.category) {
      setCategory(parsed.category);
    }

    if (parsed.account_hint) {
      const match = accounts.find(
        a =>
          a.label.toLowerCase().includes(parsed.account_hint!) ||
          a.type.toLowerCase() === parsed.account_hint
      );
      if (match) {
        setAccountId(match.id);
      }
    }
  }, [accounts]);

  const handleSelectSample = (sample: string) => {
    const parsed = parseVoiceTranscript(sample);
    handleApplyParsed(parsed);
  };

  const handleStartRecording = async () => {
    setRecognitionError(null);

    if (!speechServiceRef.current?.isSupported) {
      setRecognitionError(
        'Speech recognition is not supported in this browser. Try Chrome/Edge or click a sample phrase below.'
      );
      return;
    }

    setIsRecording(true);
    await startAudioMeter();

    speechServiceRef.current.start(
      (text) => {
        // Update live transcript and continuous live parse without terminating recording
        setTranscript(text);
        if (text.trim().length > 3) {
          const parsed = parseVoiceTranscript(text);
          handleApplyParsed(parsed);
        }
      },
      (err) => {
        setRecognitionError(err);
        setIsRecording(false);
        stopAudioMeter();
      },
      () => {
        // Will only be called if recognition actually ends
        setIsRecording(false);
        stopAudioMeter();
      }
    );
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    speechServiceRef.current?.stop();
    stopAudioMeter();

    // Finalize parsing
    if (transcript.trim()) {
      const finalParsed = parseVoiceTranscript(transcript.trim());
      handleApplyParsed(finalParsed);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(amountRupees);
    if (isNaN(num) || num <= 0 || !recipient.trim()) return;

    const amountPaise = toPaise(num);

    await onSaveEntry({
      type,
      amount_paise: amountPaise,
      date,
      account_id: accountId,
      recipient: recipient.trim(),
      category: category.trim() || 'General',
      notes: transcript ? `[Voice Entry] "${transcript}"` : '[Voice Entry]'
    });

    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 600);
  };

  return (
    <div className="space-y-4">
      {/* Quick Spoken Samples */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Quick Test With Sample Voice Transcripts
          </span>
          <span className="text-[11px] text-slate-500">1-click test</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {SAMPLE_VOICE_TRANSCRIPTS.map((s, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelectSample(s)}
              className="px-2.5 py-1 text-xs rounded-lg bg-slate-900 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-800 text-slate-300 hover:text-white transition-all text-left"
            >
              🎙️ "{s}"
            </button>
          ))}
        </div>
      </div>

      {/* Voice Recording Control with Audio Level Feedback */}
      <div className="p-6 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col items-center justify-center space-y-3">
        <div className="relative">
          <button
            type="button"
            onClick={isRecording ? handleStopRecording : handleStartRecording}
            className={`h-20 w-20 rounded-full flex items-center justify-center text-3xl transition-all shadow-xl z-10 relative ${
              isRecording
                ? 'bg-rose-600 text-white ring-4 ring-rose-500/50 scale-105'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white hover:scale-105'
            }`}
            title={isRecording ? 'Click to stop listening' : 'Click to start speaking'}
          >
            {isRecording ? '⏹' : '🎙️'}
          </button>

          {/* Sound waves ring */}
          {isRecording && (
            <span
              className="absolute inset-0 rounded-full bg-rose-500 opacity-40 animate-ping pointer-events-none"
              style={{ animationDuration: `${Math.max(0.6, 2 - (audioLevel / 50))}s` }}
            />
          )}
        </div>

        <div className="text-center space-y-1">
          <div className="flex items-center justify-center gap-2">
            <span className="text-sm font-semibold text-white">
              {isRecording ? 'Microphone Active & Listening' : 'Click microphone to start dictation'}
            </span>
            {isRecording && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-rose-500/20 text-rose-400 border border-rose-500/30">
                Recording
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400">
            {isRecording
              ? 'Speak naturally at your own pace. Click the red button when finished.'
              : 'Try saying: "Paid 180 rupees for coffee at Blue Tokai via HDFC"'}
          </p>
        </div>

        {/* Live Audio Visualizer Bars */}
        {isRecording && (
          <div className="flex items-center gap-1.5 h-6 px-4 py-1 rounded-full bg-slate-900 border border-slate-800">
            <span className="text-[10px] text-slate-500 font-mono mr-1">MIC:</span>
            {[0.4, 0.7, 1.0, 0.8, 0.5].map((multiplier, i) => (
              <div
                key={i}
                className="w-1.5 rounded-full bg-emerald-400 transition-all duration-75"
                style={{
                  height: `${Math.max(4, Math.min(20, (audioLevel * multiplier) / 4))}px`
                }}
              />
            ))}
            <span className="text-[10px] text-emerald-400 font-mono ml-1">{audioLevel}%</span>
          </div>
        )}

        {/* Stop button when recording */}
        {isRecording && (
          <button
            type="button"
            onClick={handleStopRecording}
            className="px-5 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-300 border border-rose-500/30 transition-all flex items-center gap-2 shadow-sm"
          >
            <span>⏹</span> Stop Listening & Process
          </button>
        )}

        {recognitionError && (
          <div className="text-xs text-amber-300 bg-amber-950/30 p-2.5 rounded-lg border border-amber-500/20 max-w-md text-center">
            {recognitionError}
          </div>
        )}

        {/* Real-time transcript box */}
        {transcript && (
          <div className="w-full max-w-lg p-3 rounded-xl bg-slate-900/90 border border-indigo-500/30 text-xs text-slate-200 text-center italic">
            "{transcript}"
          </div>
        )}
      </div>

      {/* Editable Parsed Result Form */}
      {parsedEntry && (
        <form onSubmit={handleSave} className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <span>✓</span> Parsed Spoken Transaction (Review & Confirm)
            </h4>
            <span className="text-[11px] text-slate-400">
              Confidence: {Math.round(parsedEntry.confidence_score * 100)}%
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Amount (₹)</label>
              <input
                type="number"
                step="0.01"
                required
                value={amountRupees}
                onChange={e => setAmountRupees(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-sm font-bold text-emerald-400 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Recipient / Merchant</label>
              <input
                type="text"
                required
                value={recipient}
                onChange={e => setRecipient(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Date</label>
              <input
                type="date"
                required
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Account</label>
              <select
                value={accountId}
                onChange={e => setAccountId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.label} ({acc.type})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Category</label>
              <input
                type="text"
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Type</label>
              <select
                value={type}
                onChange={e => setType(e.target.value as EventType)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="purchase">Expense (Purchase)</option>
                <option value="income">Income</option>
                <option value="card_payment">Card Payment</option>
                <option value="refund">Refund</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-800">
            <span className="text-xs text-emerald-400 font-medium">
              {saveSuccess ? '✓ Saved to Ledger!' : ''}
            </span>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-900/40 transition-all"
              >
                ✓ Confirm & Add to Ledger
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};
