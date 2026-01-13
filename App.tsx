import React, { useState } from 'react';
import { TrendingUp, Search, Plus, Trash2, Loader2, ExternalLink } from 'lucide-react';
import { AnalysisStatus, CompetitorInput, CompetitorAnalysisResult } from './types';
import { performCompetitorAnalysis } from './services/geminiService';

const sampleCompetitors: CompetitorInput[] = [
  { id: '1', url: 'https://monday.com/', content: '' },
  { id: '2', url: 'https://trello.com/', content: '' },
];

export default function App(): JSX.Element {
  const [competitorStatus, setCompetitorStatus] = useState<AnalysisStatus>(AnalysisStatus.IDLE);
  const [competitorAnalysis, setCompetitorAnalysis] = useState<CompetitorAnalysisResult | null>(null);
  const [targetKeyword, setTargetKeyword] = useState<string>('project management software');
  const [secondaryKeywords, setSecondaryKeywords] = useState<string>('best project management tools, task management software, team collaboration apps');
  const [clientUrl, setClientUrl] = useState<string>('https://asana.com/');
  const [myContent, setMyContent] = useState<string>('');
  const [competitors, setCompetitors] = useState<CompetitorInput[]>(sampleCompetitors);
  const [showScrapedContent, setShowScrapedContent] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  function addCompetitor() {
    setCompetitors(prev => [...prev, { id: Date.now().toString(), url: '', content: '' }]);
  }

  function removeCompetitor(id: string) {
    setCompetitors(prev => prev.filter(c => c.id !== id));
  }

  async function fetchUrlContent(url: string): Promise<string> {
    setFetchError(null);
    const proxies = [
      (u: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
      (u: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`,
      (u: string) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
    ];

    for (const p of proxies) {
      try {
        const res = await fetch(p(url));
        if (!res.ok) continue;
        const html = await res.text();

        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        // remove noise
        ['script', 'style', 'nav', 'header', 'footer', 'iframe'].forEach(sel => {
          doc.querySelectorAll(sel).forEach(n => n.remove());
        });

        const bodyText = doc.body?.innerText ?? '';
        const cleaned = bodyText.replace(/\s{2,}/g, ' ').trim();
        if (cleaned.length < 50) throw new Error('Insufficient content extracted');
        return cleaned;
      } catch (err) {
        // try next proxy
        // eslint-disable-next-line no-console
        console.warn('Proxy fetch failed, trying next', err);
      }
    }

    throw new Error('All proxy fetch attempts failed. Consider toggling manual input.');
  }

  async function runCompetitorAnalysis() {
    setFetchError(null);
    if (!targetKeyword || !clientUrl) {
      setFetchError('Please provide a primary keyword and your website URL.');
      return;
    }

    setCompetitorStatus(AnalysisStatus.LOADING);
    setCompetitorAnalysis(null);

    try {
      const myContentFetched = myContent || (await fetchUrlContent(clientUrl));

      // fetch competitor contents in parallel
      const competitorContents = await Promise.all(
        competitors.map(async c => {
          if (c.content && c.content.length > 50) return { ...c };
          const fetched = await fetchUrlContent(c.url);
          return { ...c, content: fetched };
        })
      );

      const res = await performCompetitorAnalysis(myContentFetched, competitorContents, targetKeyword, secondaryKeywords.split(',').map(s => s.trim()));
      setCompetitorAnalysis(res);
      setCompetitorStatus(AnalysisStatus.SUCCESS);
    } catch (err: any) {
      setFetchError(err?.message || 'Analysis failed');
      setCompetitorStatus(AnalysisStatus.ERROR);
    }
  }

  // UI helpers
  function renderIdle() {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <TrendingUp className="mx-auto mb-4 text-slate-400" size={48} />
          <h3 className="text-xl font-semibold">Ready to analyze your competitors</h3>
          <p className="text-slate-400 mt-2">Enter your site, competitor URLs, and keywords, then click <strong>Fetch & Compare</strong>.</p>
        </div>
      </div>
    );
  }

  function renderLoading() {
    return (
      <div className="animate-pulse p-6 space-y-6">
        <div className="h-8 bg-slate-700 rounded w-3/4" />
        <div className="h-48 bg-slate-800 rounded" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-32 bg-slate-800 rounded" />
          <div className="h-32 bg-slate-800 rounded" />
        </div>
      </div>
    );
  }

  function renderSuccess() {
    if (!competitorAnalysis) return null;

    return (
      <div className="p-6 space-y-6">
        <section className="bg-slate-800 rounded p-4 border">
          <div className="flex items-start justify-between">
            <h2 className="text-lg font-semibold">Strategic Overview</h2>
            <div className="text-slate-400">Primary: {targetKeyword}</div>
          </div>
          <p className="mt-3 text-slate-300 whitespace-pre-wrap">{competitorAnalysis.strategicOverview}</p>
        </section>

        <section className="bg-slate-800 rounded p-4 border">
          <h3 className="text-md font-semibold">Search Intent</h3>
          <p className="mt-2 text-slate-300">{competitorAnalysis.searchIntent}</p>
        </section>

        <section className="bg-slate-800 rounded p-4 border">
          <h3 className="text-md font-semibold">Content Gaps</h3>
          <ul className="mt-3 space-y-3">
            {competitorAnalysis.contentGaps.map((g, idx) => (
              <li key={idx} className="p-3 bg-slate-900 rounded flex justify-between items-start">
                <div>
                  <div className="font-semibold">{g.topic} <span className="text-xs ml-2 px-2 py-0.5 rounded text-slate-200 bg-slate-700">{g.importance}</span></div>
                  <div className="text-slate-400 text-sm mt-1">{g.description}</div>
                </div>
                <div className="text-sm text-slate-400">Missing from: {g.missingFrom}</div>
              </li>
            ))}
          </ul>
        </section>

        <section className="bg-slate-800 rounded p-4 border">
          <h3 className="text-md font-semibold">Linkable Asset Recommendations</h3>
          <div className="mt-3 grid md:grid-cols-2 gap-4">
            {competitorAnalysis.linkableAssets.recommendations.map((r, i) => (
              <div key={i} className="p-3 bg-slate-900 rounded">
                <div className="font-semibold">{r.type}</div>
                <div className="text-slate-400 text-sm mt-1">{r.reason}</div>
                <div className="text-slate-400 text-sm mt-2 italic">Example: {r.exampleFromCompetitor}</div>
                {r.competitorUrl && (
                  <a className="mt-2 inline-flex items-center text-sky-400" href={r.competitorUrl} target="_blank" rel="noreferrer">
                    View example <ExternalLink className="ml-2" size={14} />
                  </a>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="bg-slate-800 rounded p-4 border">
          <h3 className="text-md font-semibold">Action Plan</h3>
          <ol className="list-decimal list-inside mt-3 space-y-2">
            {competitorAnalysis.actionPlan.map((step, i) => (
              <li key={i} className="text-slate-200">{step}</li>
            ))}
          </ol>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-30 backdrop-blur bg-slate-900/60 border-b border-slate-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <TrendingUp size={24} />
          <h1 className="text-xl font-semibold">SG CT SEO</h1>
          <div className="ml-auto text-sm text-slate-400">AI Content Strategist</div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto flex-1 py-8 px-4 grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column - Inputs */}
        <aside className="md:col-span-1 sticky top-28 self-start">
          <div className="bg-slate-800 border rounded p-4 card-shadow">
            <div className="mb-4">
              <label className="text-sm text-slate-300 block mb-1">Primary Keyword</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 text-slate-400" size={18} />
                <input value={targetKeyword} onChange={e => setTargetKeyword(e.target.value)} className="pl-10 pr-3 py-2 w-full bg-slate-900 border border-slate-700 rounded" />
              </div>
            </div>

            <div className="mb-4">
              <label className="text-sm text-slate-300 block mb-1">Secondary Keywords (comma-separated)</label>
              <input value={secondaryKeywords} onChange={e => setSecondaryKeywords(e.target.value)} className="pr-3 py-2 w-full bg-slate-900 border border-slate-700 rounded" />
            </div>

            <div className="mb-4">
              <label className="text-sm text-slate-300 block mb-1">Your site URL</label>
              <input value={clientUrl} onChange={e => setClientUrl(e.target.value)} className="pr-3 py-2 w-full bg-slate-900 border border-slate-700 rounded" />
            </div>

            <div className="mb-4">
              <label className="text-sm text-slate-300 block mb-1">Competitors</label>
              <div className="space-y-2">
                {competitors.map((c, idx) => (
                  <div key={c.id} className="flex gap-2 items-center">
                    <input value={c.url} onChange={e => setCompetitors(prev => prev.map(p => p.id === c.id ? { ...p, url: e.target.value } : p))} className="flex-1 py-2 px-3 bg-slate-900 border border-slate-700 rounded" placeholder={`Competitor ${idx + 1} URL`} />
                    <button className="p-2 rounded bg-slate-700" onClick={() => removeCompetitor(c.id)} title="Remove">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                <button onClick={addCompetitor} className="mt-2 inline-flex items-center gap-2 px-3 py-2 rounded bg-sky-600 text-white">
                  <Plus size={14} /> Add competitor
                </button>
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={runCompetitorAnalysis} className="flex-1 inline-flex items-center justify-center gap-3 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 rounded font-semibold">
                {competitorStatus === AnalysisStatus.LOADING ? <Loader2 className="animate-spin" size={16} /> : <TrendingUp size={16} />}
                {competitorStatus === AnalysisStatus.LOADING ? 'Fetching & Comparing...' : 'Fetch & Compare'}
              </button>
              <button onClick={() => setShowScrapedContent(s => !s)} className="px-3 py-2 rounded bg-slate-700">
                Manual
              </button>
            </div>

            {fetchError && <div className="mt-3 text-sm text-rose-400">{fetchError}</div>}

            {showScrapedContent && (
              <div className="mt-4">
                <label className="text-sm text-slate-300 block mb-1">Your scraped / manual content</label>
                <textarea value={myContent} onChange={e => setMyContent(e.target.value)} className="w-full min-h-[120px] p-3 bg-slate-900 border border-slate-700 rounded text-sm" placeholder="Paste or edit your content here if fetch failed" />

                <div className="mt-3">
                  <label className="text-sm text-slate-300 block mb-1">Competitors' manual content (edit per competitor)</label>
                  {competitors.map(c => (
                    <textarea key={c.id} value={c.content} onChange={e => setCompetitors(prev => prev.map(p => p.id === c.id ? { ...p, content: e.target.value } : p))} className="w-full min-h-[80px] p-3 bg-slate-900 border border-slate-700 rounded text-sm mb-2" placeholder={`Manual content for ${c.url}`} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Right Column - Results */}
        <section className="md:col-span-2 bg-transparent">
          <div className="bg-slate-800 border rounded card-shadow min-h-[60vh]">
            {competitorStatus === AnalysisStatus.IDLE && renderIdle()}
            {competitorStatus === AnalysisStatus.LOADING && renderLoading()}
            {competitorStatus === AnalysisStatus.SUCCESS && renderSuccess()}
            {competitorStatus === AnalysisStatus.ERROR && (
              <div className="p-6">
                <h3 className="font-semibold">An error occurred</h3>
                <p className="text-rose-400 mt-2">{fetchError}</p>
              </div>
            )}
          </div>
        </section>
      </main>

      <footer className="py-4 text-center text-slate-500 text-sm">
        © {new Date().getFullYear()} SG CT SEO — AI Content Strategist
      </footer>
    </div>
  );
}
