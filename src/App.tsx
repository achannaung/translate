/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { ArrowLeftRight, Copy, History, X, Moon, Sun } from 'lucide-react';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

interface HistoryItem {
  id: string;
  inputText: string;
  outputText: string;
  sourceLang: string;
  targetLang: string;
}

export default function App() {
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [sourceLang, setSourceLang] = useState('en');
  const [targetLang, setTargetLang] = useState('my');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

  useEffect(() => {
    const savedHistory = localStorage.getItem('translationHistory');
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }
  }, []);

  const saveToHistory = (input: string, output: string, sLang: string, tLang: string) => {
    const newItem: HistoryItem = {
      id: Date.now().toString(),
      inputText: input,
      outputText: output,
      sourceLang: sLang,
      targetLang: tLang,
    };
    setHistory(prevHistory => {
      const updatedHistory = [newItem, ...prevHistory.slice(0, 9)];
      localStorage.setItem('translationHistory', JSON.stringify(updatedHistory));
      return updatedHistory;
    });
  };

  const translate = useCallback(async (text: string) => {
    if (!text.trim()) {
      setOutputText('');
      return;
    }
    setLoading(true);
    try {
      // Check for Zawgyi
      const zawgyiCheck = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Is the following text in Zawgyi encoding? If yes, provide the Unicode version. Text: "${text}"`,
      });
      
      let prompt = `Translate the following text from ${sourceLang === 'en' ? 'English' : 'Burmese'} to ${targetLang === 'en' ? 'English' : 'Burmese'}: "${text}".
      Return the translation, followed by a list of key terms and phrases with their translations.
      Format:
      Translation: [Translation]
      Key Terms and Phrases:
      - [Term/Phrase]: [Translation]
      Do NOT include any markdown formatting (like asterisks), pronunciation guides, or extra notes.`;
      if (zawgyiCheck.text && zawgyiCheck.text.includes('Yes')) {
        prompt += `\nNote: The input seems to be in Zawgyi encoding. Please convert it to Unicode before translating.`;
      }
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });
      const result = (response.text || '').replace(/\*/g, '');
      setOutputText(result);
      saveToHistory(text, result, sourceLang, targetLang);
    } catch (error) {
      console.error('Translation error:', error);
      setOutputText('Error translating text.');
    } finally {
      setLoading(false);
    }
  }, [sourceLang, targetLang]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [inputText]);

  // Debounced translation
  const handleTranslate = () => {
    translate(inputText);
  };

  const clearText = () => {
    setInputText('');
    setOutputText('');
  };

  const swapLanguages = () => {
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
    setInputText(outputText);
    setOutputText(inputText);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('translationHistory');
  };

  const loadHistoryItem = (item: HistoryItem) => {
    setInputText(item.inputText);
    setOutputText(item.outputText);
    setSourceLang(item.sourceLang);
    setTargetLang(item.targetLang);
  };

  return (
    <div className={`min-h-screen p-4 md:p-8 ${isDarkMode ? 'bg-zinc-900 text-zinc-100' : 'bg-yellow-50 text-yellow-950'}`}>
      <header className="mb-8 flex items-center justify-between">
        <h1 className={`text-3xl font-bold ${isDarkMode ? 'text-yellow-400' : 'text-yellow-950'}`}>English-Burmese Translator</h1>
        <button onClick={toggleDarkMode} className={`p-2 rounded-full ${isDarkMode ? 'bg-zinc-800 text-yellow-400' : 'bg-yellow-200 text-yellow-700'}`}>
          {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </header>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className={`text-sm font-medium uppercase tracking-wider ${isDarkMode ? 'text-zinc-400' : 'text-yellow-700'}`}>
              {sourceLang === 'en' ? 'English' : 'Burmese'}
            </span>
            <div className="flex gap-2">
              <button onClick={clearText} className={`p-2 rounded-full ${isDarkMode ? 'hover:bg-zinc-800' : 'hover:bg-yellow-200'}`}>
                <X className={`w-5 h-5 ${isDarkMode ? 'text-zinc-400' : 'text-yellow-700'}`} />
              </button>
              <button onClick={swapLanguages} className={`p-2 rounded-full ${isDarkMode ? 'hover:bg-zinc-800' : 'hover:bg-yellow-200'}`}>
                <ArrowLeftRight className={`w-5 h-5 ${isDarkMode ? 'text-zinc-400' : 'text-yellow-700'}`} />
              </button>
            </div>
          </div>
          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={(e) => {
              setInputText(e.target.value);
            }}
            className={`w-full min-h-64 p-4 border rounded-xl focus:ring-2 focus:border-transparent resize-none overflow-hidden ${isDarkMode ? 'bg-zinc-800 border-zinc-700 focus:ring-yellow-500' : 'bg-white border-yellow-200 focus:ring-yellow-400'}`}
            placeholder={sourceLang === 'en' ? 'Enter English text...' : 'မြန်မာစာရိုက်ထည့်ပါ...'}
          />
          <button
            onClick={handleTranslate}
            disabled={loading}
            className={`w-full py-3 rounded-xl font-semibold ${isDarkMode ? 'bg-yellow-600 text-zinc-900 hover:bg-yellow-500 disabled:bg-yellow-800' : 'bg-yellow-600 text-white hover:bg-yellow-700 disabled:bg-yellow-400'}`}
          >
            {loading ? 'Translating...' : 'Translate'}
          </button>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className={`text-sm font-medium uppercase tracking-wider ${isDarkMode ? 'text-zinc-400' : 'text-yellow-700'}`}>
              {targetLang === 'en' ? 'English' : 'Burmese'}
            </span>
            <div className="flex items-center gap-2">
              {loading && (
                <div className={`flex items-center gap-2 ${isDarkMode ? 'text-yellow-500' : 'text-yellow-500'}`}>
                  <div className={`w-4 h-4 border-2 rounded-full animate-spin ${isDarkMode ? 'border-yellow-700 border-t-yellow-500' : 'border-yellow-300 border-t-yellow-600'}`}></div>
                  <span className="text-xs">Translating...</span>
                </div>
              )}
              <button onClick={() => copyToClipboard(outputText)} className={`p-2 rounded-full ${isDarkMode ? 'hover:bg-zinc-800' : 'hover:bg-yellow-200'}`}>
                <Copy className={`w-5 h-5 ${isDarkMode ? 'text-zinc-400' : 'text-yellow-700'}`} />
              </button>
            </div>
          </div>
          <textarea
            value={outputText}
            readOnly
            className={`w-full min-h-64 p-4 border rounded-xl resize-none text-xl ${isDarkMode ? 'bg-zinc-800 border-zinc-700' : 'bg-yellow-100 border-yellow-200'}`}
            placeholder={targetLang === 'en' ? 'Translation will appear here...' : 'ဘာသာပြန်ချက်ပေါ်လာပါမည်...'}
          />
        </div>
      </div>
      
      {history.length > 0 && (
        <div className="mt-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className={`text-xl font-bold flex items-center gap-2 ${isDarkMode ? 'text-yellow-400' : 'text-yellow-950'}`}>
              <History className="w-5 h-5" /> Recent Translations
            </h2>
            <button onClick={clearHistory} className={`text-sm font-medium ${isDarkMode ? 'text-yellow-600 hover:text-yellow-400' : 'text-yellow-600 hover:text-yellow-800'}`}>Clear All</button>
          </div>
          <div className="grid gap-4">
            {history.map((item) => (
              <div key={item.id} className={`p-4 rounded-xl border shadow-sm flex items-center justify-between ${isDarkMode ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-yellow-200'}`}>
                <div className="truncate flex-1 mr-4">
                  <p className={`text-sm font-medium truncate ${isDarkMode ? 'text-zinc-100' : 'text-yellow-900'}`}>{item.inputText}</p>
                  <p className={`text-sm truncate ${isDarkMode ? 'text-zinc-400' : 'text-yellow-500'}`}>{item.outputText}</p>
                </div>
                <button 
                  onClick={() => loadHistoryItem(item)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${isDarkMode ? 'bg-zinc-700 text-zinc-100 hover:bg-zinc-600' : 'bg-yellow-100 text-yellow-900 hover:bg-yellow-200'}`}
                >
                  Select
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
