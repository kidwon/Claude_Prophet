import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
  TrendingUp, Activity, RefreshCw, Layers, Cpu, Shield, BrainCircuit, Terminal, Clock, Percent,
  History, BarChart3, PieChart, X, List, Search, Command, Zap, Target, Brain
} from 'lucide-react';

const POLLING_FAST = 5000;
const POLLING_SLOW = 30000;

// Search Command Bar Component
const CommandBar = ({ onSearch, isSearching }) => {
  const [query, setQuery] = useState('');

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && query.trim()) {
      onSearch(query.trim());
      setQuery('');
    }
  };

  return (
    <div className="command-bar-wrapper">
      <input
        type="text"
        className="command-input"
        placeholder="Ticker (e.g. NVDA) or Topic (e.g. Federal Reserve)..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={isSearching}
      />
      <Search className="command-icon" size={16} />
      <div className="command-shortcut">⌘K</div>
    </div>
  );
};

const Typewriter = ({ text, speed = 30 }) => {
  const [displayedText, setDisplayedText] = useState('');
  useEffect(() => {
    let i = 0;
    setDisplayedText('');
    const timer = setInterval(() => {
      setDisplayedText((prev) => prev + text.charAt(i));
      i++;
      if (i >= text.length) clearInterval(timer);
    }, speed);
    return () => clearInterval(timer);
  }, [text, speed]);
  return <span>{displayedText}<span className="typewriter"></span></span>;
};

const parseOptionSymbol = (symbol) => {
  // Typical OCC format: TSLA260320C00440000
  // Symbol: TSLA, YYMMDD: 260320, Type: C/P, Strike: 00440000
  const match = symbol.match(/^([A-Z]+)(\d{6})([CP])(\d+)$/);
  if (!match) return { ticker: symbol, expiry: 'LONG TERM', type: '现货 (STOCK)', strike: '持股' };

  const [_, ticker, dateStr, type, strikeStr] = match;
  const year = '20' + dateStr.substring(0, 2);
  const month = dateStr.substring(2, 4);
  const day = dateStr.substring(4, 6);
  const strike = (parseInt(strikeStr) / 1000).toFixed(1);
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const expiry = `${months[parseInt(month) - 1]} ${day}, ${year}`;

  return {
    ticker,
    expiry,
    type: type === 'C' ? '看涨 (CALL)' : '看跌 (PUT)',
    strike: `$${strike}`
  };
};

const NewsTicker = ({ text }) => {
  if (!text) return null;
  return (
    <div className="news-ticker-bar glass-card">
      <div className="ticker-label">
        <BrainCircuit size={14} /> 市场动态
      </div>
      <div className="ticker-viewport">
        <div className="ticker-track">
          <span className="ticker-msg">{text}</span>
          <span className="ticker-msg">{text}</span>
          <span className="ticker-msg">{text}</span>
        </div>
      </div>
    </div>
  );
};


const AnimatedNumber = ({ value }) => {
  const [displayValue, setDisplayValue] = useState(value);
  const [bump, setBump] = useState(false);

  useEffect(() => {
    if (value !== displayValue) {
      setBump(true);
      setTimeout(() => setBump(false), 500);
      setDisplayValue(value);
    }
  }, [value]);

  return (
    <span className={`main-balance ${bump ? 'bump' : ''}`}>
      ${value?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '---'}
    </span>
  );
};

function App() {
  const [account, setAccount] = useState(null);
  const [positions, setPositions] = useState([]);
  const [intelligence, setIntelligence] = useState(null);
  const [activities, setActivities] = useState([]);
  const [trades, setTrades] = useState([]);
  const [equityHistory, setEquityHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [currentTime, setCurrentTime] = useState(new Date());
  const [theme, setTheme] = useState('modern');
  const [consoleTab, setConsoleTab] = useState('SYSTEM');
  const [showHistoryOverlay, setShowHistoryOverlay] = useState(false);

  // Search State
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [assetTab, setAssetTab] = useState('ALL'); // 'ALL', 'STOCK', 'OPTION'
  const [isIntelligenceLoading, setIsIntelligenceLoading] = useState(false);
  const [intelligenceLastUpdate, setIntelligenceLastUpdate] = useState(null);

  // Command Bar Handler
  const handleSearch = async (query) => {
    const trimmed = query.trim();
    if (!trimmed) return;

    setIsSearching(true);
    try {
      // Stock ticker: 1-5 uppercase letters only
      if (/^[A-Z]{1,5}$/.test(trimmed)) {
        const response = await fetch(`/api/v1/intelligence/analyze/${trimmed}`);
        if (!response.ok) throw new Error('Analysis failed');
        const data = await response.json();
        setSearchResult({ type: 'analysis', data });
        setShowModal(true);
      } else {
        // General keyword / topic trend analysis
        const response = await fetch(`/api/v1/intelligence/topic-analysis?q=${encodeURIComponent(trimmed)}`);
        if (!response.ok) throw new Error('Topic analysis failed');
        const data = await response.json();
        setSearchResult({ type: 'topic', data, query: trimmed });
        setShowModal(true);
      }
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setIsSearching(false);
    }
  };
  const terminalRef = useRef(null);

  const fetchData = useCallback(async () => {
    try {
      const [accRes, posRes, actRes, tradeRes] = await Promise.all([
        fetch('/api/v1/account'),
        fetch('/api/v1/positions'),
        fetch('/api/v1/activity/current'),
        fetch('/api/v1/orders?status=filled')
      ]);

      const accData = await accRes.json();
      const posData = await posRes.json();
      const actData = await actRes.json();
      const tradeData = await tradeRes.json();

      setAccount(accData);
      setPositions(posData || []);
      setActivities(actData.activities || []);
      setTrades(tradeData || []);

      const now = new Date();
      setEquityHistory(prev => {
        const lastVal = prev.length > 0 ? prev[prev.length - 1].value : 0;
        if (lastVal === accData.PortfolioValue && prev.length > 0) return prev;
        const newHistory = [...prev, { time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), value: accData.PortfolioValue }];
        return newHistory.slice(-50);
      });

      setLastUpdate(now);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch account data:', error);
    }
  }, []);

  const fetchIntelligence = useCallback(async () => {
    setIsIntelligenceLoading(true);
    try {
      const res = await fetch('/api/v1/intelligence/quick-market');
      const data = await res.json();
      setIntelligence(data);
      setIntelligenceLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to fetch intelligence:', error);
    } finally {
      setIsIntelligenceLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchIntelligence();
    const fastInterval = setInterval(fetchData, POLLING_FAST);
    const slowInterval = setInterval(fetchIntelligence, POLLING_SLOW);
    const clockInterval = setInterval(() => setCurrentTime(new Date()), 1000);

    return () => {
      clearInterval(fastInterval);
      clearInterval(slowInterval);
      clearInterval(clockInterval);
    };
  }, [fetchData, fetchIntelligence]);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [activities]);

  const toggleTheme = () => {
    const newTheme = theme === 'modern' ? 'hacker' : 'modern';
    setTheme(newTheme);
    document.body.setAttribute('data-theme', newTheme);
  };

  const calculateDayReturn = () => {
    if (!account || equityHistory.length < 2) return 0;
    const startVal = equityHistory[0].value;
    const currentVal = account.PortfolioValue;
    return ((currentVal - startVal) / startVal) * 100;
  };

  if (loading && !account) {
    return (
      <div className="loading-screen">
        <Activity className="animate-spin" size={48} />
        <p>Initializing YGG Dash...</p>
      </div>
    );
  }

  const dayReturn = calculateDayReturn();

  // Calculate Aggregate P&L
  const totalCost = positions.reduce((acc, pos) => acc + pos.CostBasis, 0);
  const totalUnrealizedPL = positions.reduce((acc, pos) => acc + pos.UnrealizedPL, 0);
  const totalUnrealizedPLPC = totalCost > 0 ? (totalUnrealizedPL / totalCost) * 100 : 0;
  const isTotalProfit = totalUnrealizedPL >= 0;

  return (
    <div className={`dashboard-container ${theme}`}>
      {/* A. Top Bar */}
      <header className="main-header glass-card">
        <div className="brand">
          <div className="logo-icon"><Cpu size={20} /></div>
          <div>
            <h1>YGG Terminal</h1>
            <div className="status-wrapper">
              <span className="online-indicator"></span>
              <span>YGG Engine Active</span>
            </div>
          </div>
        </div>

        <div className="header-center">
          <CommandBar onSearch={handleSearch} isSearching={isSearching} />
        </div>

        <div className="header-right">
          <div className="stat-item">
            <span className="day-return-label">DAY P&L</span>
            <div className={`day-return ${dayReturn >= 0 ? 'up' : 'down'}`}>
              <Percent size={12} /> {dayReturn.toFixed(2)}%
            </div>
          </div>

          <div className="stat-item main-pnl">
            <span className="stat-label">总浮盈 (UNPL)</span>
            <div className={`stat-value ${isTotalProfit ? 'up' : 'down'}`}>
              {isTotalProfit ? '+' : '-'}${Math.abs(totalUnrealizedPL).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div className="stat-item main-roi">
            <span className="stat-label">总收益率 (ROI)</span>
            <div className={`stat-value ${isTotalProfit ? 'up' : 'down'}`}>
              {isTotalProfit ? '+' : ''}{totalUnrealizedPLPC.toFixed(2)}%
            </div>
          </div>

          <div className="time-box">
            <span className="live-time">{currentTime.toLocaleTimeString()}</span>
            <span className="last-update">UTC/EST SYNC</span>
          </div>
          <button className="icon-btn" onClick={fetchData} title="Manual Refresh">
            <RefreshCw size={18} />
          </button>
          <button className="icon-btn" onClick={toggleTheme}>
            <Layers size={18} />
          </button>
        </div>
      </header>

      <NewsTicker text={intelligence?.executive_summary} />


      {/* B. Main Area */}
      <main className="dashboard-grid">
        <div className="left-panel">
          {/* Equity Chart */}
          <section className="section-card chart-section glass-card">
            <div className="section-title">
              <h3><TrendingUp size={16} /> 资产曲线</h3>
              <span className="last-update">自动缩放 OHLC</span>
            </div>
            <div className="chart-container" style={{ flex: 1 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={equityHistory}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-glass)" vertical={false} />
                  <XAxis dataKey="time" hide />
                  <YAxis domain={['auto', 'auto']} hide />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-glass)' }}
                    itemStyle={{ color: 'var(--text-main)' }}
                  />
                  <Area type="monotone" dataKey="value" stroke="var(--accent)" strokeWidth={2} fill="url(#colorValue)" animationDuration={500} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Positions */}
          <section className="section-card positions-container glass-card">
            <div className="section-title">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <h3><Shield size={16} /> 活跃资产持仓</h3>
                <div className="console-tabs" style={{ marginLeft: '12px' }}>
                  <button className={`tab-btn ${assetTab === 'ALL' ? 'active' : ''}`} onClick={() => setAssetTab('ALL')}>全部</button>
                  <button className={`tab-btn ${assetTab === 'STOCK' ? 'active' : ''}`} onClick={() => setAssetTab('STOCK')}>现货</button>
                  <button className={`tab-btn ${assetTab === 'OPTION' ? 'active' : ''}`} onClick={() => setAssetTab('OPTION')}>期权</button>
                </div>
              </div>
              <span className="badge">{positions.length} 仓位</span>
            </div>
            <div className="positions-grid">
              {positions
                .filter(pos => {
                  if (assetTab === 'ALL') return true;
                  const isOption = /^[A-Z]+\d{6}[CP]\d+$/.test(pos.Symbol);
                  if (assetTab === 'OPTION') return isOption;
                  if (assetTab === 'STOCK') return !isOption;
                  return true;
                })
                .map((pos) => {
                  const info = parseOptionSymbol(pos.Symbol);
                  const isProfit = pos.UnrealizedPL >= 0;
                  return (
                    <div key={pos.Symbol} className={`pos-card glass-card ${isProfit ? 'up' : 'down'}`}>
                      <div className="pos-header">
                        <div className="pos-main-info">
                          <span className="pos-ticker">{info.ticker}</span>
                          <span className="pos-details">{info.type} · {info.strike}</span>
                        </div>
                        <div className="pos-badge">qty: {pos.Qty}</div>
                      </div>

                      <div className={`pos-expiry ${isProfit ? 'up' : 'down'}`}>{info.expiry}</div>

                      <div className="pos-stats">
                        <div className={`pos-pnl-pct ${isProfit ? 'up' : 'down'}`}>
                          {isProfit ? '+' : ''}{(pos.UnrealizedPLPC * 100).toFixed(1)}%
                        </div>
                        <div className="pos-pnl-val">
                          ${Math.abs(pos.UnrealizedPL).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          <span className="profit-indicator">{isProfit ? '↑' : '↓'}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </section>
        </div>

        <div className="right-panel">
          {/* AI Intelligence */}
          <section className="section-card ai-feed glass-card">
            <div className="section-title" style={{ justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3><BrainCircuit size={16} /> YGG 市场情报</h3>
                {isIntelligenceLoading && <RefreshCw size={14} className="animate-spin text-muted" />}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="text-muted" style={{ fontSize: '10px' }}>
                  {intelligenceLastUpdate ? intelligenceLastUpdate.toLocaleTimeString() : '--:--'}
                </span>
                <button
                  onClick={fetchIntelligence}
                  className="icon-btn"
                  disabled={isIntelligenceLoading}
                  style={{ opacity: isIntelligenceLoading ? 0.5 : 1 }}
                >
                  <RefreshCw size={14} />
                </button>
              </div>
            </div>
            <div className="feed-content" style={{ position: 'relative', minHeight: '200px' }}>
              {isIntelligenceLoading && !intelligence && (
                <div className="loading-intelligence">
                  <RefreshCw className="animate-spin" size={24} />
                  <p>正在合成全球市场数据...</p>
                </div>
              )}

              {intelligence && (
                <div style={{ opacity: isIntelligenceLoading ? 0.5 : 1, transition: 'opacity 0.3s' }}>
                  <div className="intelligence-top">
                    <div className={`sentiment-badge ${intelligence.market_sentiment?.toLowerCase()}`}>
                      {intelligence.market_sentiment === 'BULLISH' ? '看多情绪' :
                        intelligence.market_sentiment === 'BEARISH' ? '看空情绪' : '中性情绪'}
                    </div>
                  </div>

                  {intelligence.actionable_items?.length > 0 && (
                    <div className="ai-section">
                      <h4><Activity size={12} /> 操作建议</h4>
                      <div className="action-list">
                        {intelligence.actionable_items.map((item, i) => (
                          <div key={i} className="action-item">{item}</div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="ai-section">
                    <h4><Layers size={12} /> 核心主题</h4>
                    <div className="themes-list">
                      {intelligence.key_themes?.map((theme, i) => (
                        <div key={i} className="theme-tag">{theme}</div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Console / Multi-tab Activity Log */}
          <section className="section-card activity-drawer glass-card">
            <div className="terminal-header" style={{ paddingBottom: '0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Terminal size={14} />
                <div className="console-tabs">
                  <button className={`tab-btn ${consoleTab === 'SYSTEM' ? 'active' : ''}`} onClick={() => setConsoleTab('SYSTEM')}>
                    状态日志
                  </button>
                  <button className={`tab-btn ${consoleTab === 'HIST' ? 'active' : ''}`} onClick={() => setConsoleTab('HIST')}>
                    最近成交
                  </button>
                </div>
              </div>
              <button className="console-header-btn" onClick={() => setShowHistoryOverlay(true)}>
                <BarChart3 size={12} style={{ marginRight: '4px' }} /> 统计报表
              </button>
            </div>
            <div className="terminal-body" ref={terminalRef} style={{ paddingTop: '12px' }}>
              {consoleTab === 'SYSTEM' ? (
                activities.slice(-20).map((act, i) => (
                  <div key={i} className="log-entry">
                    <span className="log-time">[{new Date(act.timestamp).toLocaleTimeString([], { hour12: false })}]</span>
                    <span className="log-msg">{act.description}</span>
                  </div>
                ))
              ) : (
                <div className="compact-trades">
                  {trades.slice(0, 10).map((t, i) => (
                    <div key={i} className="log-entry">
                      <span className="log-time">[{new Date(t.FilledAt).toLocaleTimeString([], { hour12: false })}]</span>
                      <span className={`log-msg ${t.Side === 'buy' ? 'up' : 'down'}`}>
                        {t.Symbol} · {t.Side.toUpperCase()} · {t.FilledQty} @ ${t.FilledAvgPrice.toFixed(2)}
                      </span>
                    </div>
                  ))}
                  {trades.length === 0 && <p className="text-muted">暂无成交记录</p>}
                </div>
              )}
            </div>
          </section>
        </div>
      </main>

      {/* Analysis / Topic Modal */}
      {showModal && searchResult && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="analysis-card glass-card">

              {searchResult.type === 'analysis' ? (
                /* ── Stock Analysis Modal ── */
                <>
                  <div className="analysis-header">
                    <div className="analysis-title">
                      <h2>{searchResult.data.symbol} <span className="analysis-price">${searchResult.data.current_price?.toFixed(2) || '---'}</span></h2>
                      <div className="status-wrapper">
                        <span className={`online-indicator ${searchResult.data.technical?.trend === 'BULLISH' ? 'success' : 'danger'}`}></span>
                        <span>AI ANALYSIS REPORT</span>
                      </div>
                    </div>
                    <div className="analysis-score-badge">
                      <div className="score-val">{searchResult.data.trade_setup?.composite_score ?? '-'} / 10</div>
                      <div className="score-label">Confidence Score</div>
                    </div>
                  </div>

                  <div className="analysis-body">
                    <div className="analysis-section">
                      <h4><Zap size={14} /> AI Summary</h4>
                      <p style={{ lineHeight: '1.6', fontSize: '0.9rem', color: 'var(--text-main)' }}>
                        {searchResult.data.trade_setup?.notes || "暂无 AI 分析摘要"}
                        {searchResult.data.news_summary && (
                          <>
                            <br />
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{searchResult.data.news_summary}</span>
                          </>
                        )}
                      </p>
                    </div>

                    <div className="analysis-section">
                      <h4><Target size={14} /> Key Levels</h4>
                      <div className="key-levels-grid">
                        <div className="level-card">
                          <span className="level-label">Support</span>
                          <div className="level-val" style={{ color: 'var(--success)' }}>
                            ${searchResult.data.technical?.support_level ? searchResult.data.technical.support_level.toFixed(2) : '---'}
                          </div>
                        </div>
                        <div className="level-card">
                          <span className="level-label">Resistance</span>
                          <div className="level-val" style={{ color: 'var(--danger)' }}>
                            ${searchResult.data.technical?.resistance_level ? searchResult.data.technical.resistance_level.toFixed(2) : '---'}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="analysis-section">
                      <h4><Brain size={14} /> Signals & News</h4>
                      <div className="themes-list">
                        {searchResult.data.trade_setup?.recent_news?.slice(0, 3).map((signal, i) => (
                          <span key={i} className="theme-tag">{signal}</span>
                        ))}
                        {(!searchResult.data.trade_setup?.recent_news || searchResult.data.trade_setup?.recent_news.length === 0) && (
                          <span className="text-muted" style={{ fontSize: '0.8rem' }}>暂无重大利好/利空消息</span>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                /* ── Topic / Macro Trend Modal ── */
                <>
                  <div className="analysis-header">
                    <div className="analysis-title">
                      <h2 style={{ textTransform: 'none' }}>{searchResult.query}</h2>
                      <div className="status-wrapper">
                        <span className="online-indicator"></span>
                        <span>MACRO TREND ANALYSIS</span>
                      </div>
                    </div>
                    <div className={`sentiment-badge ${searchResult.data.analysis?.market_sentiment?.toLowerCase()}`} style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700 }}>
                      {searchResult.data.analysis?.market_sentiment === 'BULLISH' ? '看多 BULLISH' :
                        searchResult.data.analysis?.market_sentiment === 'BEARISH' ? '看空 BEARISH' : '中性 NEUTRAL'}
                    </div>
                  </div>

                  <div className="analysis-body">
                    {!searchResult.data.analysis && searchResult.data.message && (
                      <div className="analysis-section">
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                          ⚠️ {searchResult.data.message}
                        </p>
                      </div>
                    )}
                    <div className="analysis-section">
                      <h4><Zap size={14} /> AI Summary</h4>
                      <p style={{ lineHeight: '1.6', fontSize: '0.9rem', color: 'var(--text-main)' }}>
                        {searchResult.data.analysis?.executive_summary || "暂无 AI 摘要"}
                      </p>
                    </div>

                    {searchResult.data.analysis?.key_themes?.length > 0 && (
                      <div className="analysis-section">
                        <h4><Layers size={14} /> Key Themes</h4>
                        <div className="themes-list">
                          {searchResult.data.analysis.key_themes.map((theme, i) => (
                            <span key={i} className="theme-tag">{theme}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {searchResult.data.analysis?.actionable_items?.length > 0 && (
                      <div className="analysis-section">
                        <h4><Target size={14} /> Actionable Ideas</h4>
                        <div className="action-list">
                          {searchResult.data.analysis.actionable_items.map((item, i) => (
                            <div key={i} className="action-item">{item}</div>
                          ))}
                        </div>
                      </div>
                    )}

                    {searchResult.data.articles?.length > 0 && (
                      <div className="analysis-section">
                        <h4><Brain size={14} /> Source Articles</h4>
                        <div className="themes-list" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '6px' }}>
                          {searchResult.data.articles.slice(0, 3).map((article, i) => (
                            <div key={i} style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                              <span style={{ color: 'var(--accent)', marginRight: '6px' }}>▸</span>
                              {article.title}
                              {article.source && <span style={{ opacity: 0.5, marginLeft: '6px' }}>— {article.source}</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

            </div>
          </div>
        </div>
      )}

      {/* C. History Overlay */}
      {
        showHistoryOverlay && (
          <div className="history-overlay">
            <div className="overlay-content">
              <div className="overlay-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div className="logo-icon"><History size={20} /></div>
                  <h2>交易账户复盘中心</h2>
                </div>
                <button className="close-btn" onClick={() => setShowHistoryOverlay(false)}>
                  <X size={20} />
                </button>
              </div>
              <div className="overlay-body">
                <div className="stats-summary">
                  <div className="stat-card">
                    <span className="label">胜率 (Win Rate)</span>
                    <div className="val">
                      <div className="val">
                        {trades.length > 0 ? ((trades.filter(t => t.Status === 'filled').length / trades.length) * 100).toFixed(1) : 0}%
                      </div>
                    </div>
                  </div>
                  <div className="stat-card">
                    <span className="label">总成交订单 (Total Orders)</span>
                    <div className="val">{trades.length}</div>
                  </div>
                  <div className="stat-card">
                    <span className="label">最近成交时间</span>
                    <div className="val">{trades.length > 0 ? new Date(trades[0].FilledAt).toLocaleTimeString() : '--:--'}</div>
                  </div>

                  <div className="history-list">
                    <h3><List size={16} /> 历史订单 (Order History)</h3>
                    <table className="history-table">
                      <thead>
                        <tr>
                          <th>时间</th>
                          <th>代码</th>
                          <th>方向</th>
                          <th>数量</th>
                          <th>成交价</th>
                          <th>金额</th>
                        </tr>
                      </thead>
                      <tbody>
                        {trades.map((t, i) => (
                          <tr key={i}>
                            <td>{new Date(t.FilledAt).toLocaleString()}</td>
                            <td style={{ fontWeight: 800 }}>{t.Symbol}</td>
                            <td className={t.Side === 'buy' ? 'up' : 'down'}>{t.Side.toUpperCase()}</td>
                            <td>{t.FilledQty}</td>
                            <td>${t.FilledAvgPrice.toFixed(2)}</td>
                            <td>${(t.FilledQty * t.FilledAvgPrice).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      }
    </div>
  );
};

export default App;
