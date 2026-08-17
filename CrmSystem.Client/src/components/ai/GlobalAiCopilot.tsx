import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { Button } from '../ui/Button';
import {
  Sparkles, X, Send, RefreshCw, Plus, Trash2,
  Maximize2, Minimize2, MessageSquare, Clock, Copy, Check,
  PanelLeftClose, PanelLeftOpen, Bot, User, ChevronRight, Palette,
  Paperclip, FileText, Image as ImageIcon, File, Undo2, Redo2, Square, Pencil,
  Settings, ShieldCheck, Sliders, Search, ChevronDown, ChevronUp
} from 'lucide-react';
import './copilot.css';
import { confirmAction } from '../../lib/confirm';

export interface GlobalFileAttachment {
  fileName: string;
  fileType: string;
  base64Data: string;
  previewUrl?: string;
}

export interface GlobalChatMessage {
  id: string;
  role: 'user' | 'assistant';
  message: string;
  timestamp: string;
  suggestedActions?: { label: string; actionType: string; targetUrl?: string }[];
  contextSummary?: string;
  isGeminiPowered?: boolean;
  attachment?: GlobalFileAttachment;
}

export interface GlobalChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: GlobalChatMessage[];
}

export interface AiPermissions {
  allowFileUploads: boolean;
  allowCrmDatabaseContext: boolean;
  allowSuggestedActions: boolean;
  autoScroll: boolean;
}

export type AiThemeOption = 'dark' | 'light' | 'emerald' | 'violet';

const STORAGE_KEY = 'crm_global_ai_sessions_v1';
const THEME_STORAGE_KEY = 'crm_ai_theme_preference';
const PERMISSIONS_STORAGE_KEY = 'crm_ai_permissions_preference';

const createDefaultSession = (contextLabel: string): GlobalChatSession => {
  const now = new Date().toISOString();
  return {
    id: 'session_g_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    title: 'Executive Assistant Overview',
    createdAt: now,
    updatedAt: now,
    messages: [
      {
        id: 'msg_g_welcome_' + Date.now(),
        role: 'assistant',
        message: `Hello! 👋 I am your **CRM Executive AI Copilot**.\n\nAsk me anything about:\n- 📊 **Pipeline Forecast & Sales Revenue**\n- 🔥 **Hot Leads Needing SLA Contact**\n- 📦 **Products & Custom Field Records**\n- 💳 **Unpaid Invoices & E-Sign Contracts**\n- 📎 **Upload PDFs, Documents or Photos** for fast AI analysis\n\n*Current Location:* \`${contextLabel}\``,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        contextSummary: contextLabel
      }
    ]
  };
};

export const GlobalAiCopilot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isFullWindow, setIsFullWindow] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [stagedAttachment, setStagedAttachment] = useState<GlobalFileAttachment | null>(null);

  // Text Input Undo/Redo History State
  const [inputHistory, setInputHistory] = useState<string[]>(['']);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  // AI Permissions & Preferences State
  const [permissions, setPermissions] = useState<AiPermissions>(() => {
    try {
      const saved = localStorage.getItem(PERMISSIONS_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      allowFileUploads: true,
      allowCrmDatabaseContext: true,
      allowSuggestedActions: true,
      autoScroll: true
    };
  });

  const togglePermission = (key: keyof AiPermissions) => {
    setPermissions(prev => {
      const updated = { ...prev, [key]: !prev[key] };
      localStorage.setItem(PERMISSIONS_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const [historySearch, setHistorySearch] = useState('');
  const [showAllHistory, setShowAllHistory] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const streamingRef = useRef<any>(null);

  // Theme selection state
  const [aiTheme, setAiTheme] = useState<AiThemeOption>(() => {
    return (localStorage.getItem(THEME_STORAGE_KEY) as AiThemeOption) || 'dark';
  });
  const [showThemePicker, setShowThemePicker] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  const getActiveContext = () => {
    const path = location.pathname;
    const leadMatch = path.match(/\/leads\/(\d+)/);
    const custMatch = path.match(/\/customers\/(\d+)/);

    if (leadMatch) return { route: path, entityType: 'Lead', entityId: Number(leadMatch[1]), label: `Lead #${leadMatch[1]}` };
    if (custMatch) return { route: path, entityType: 'Customer', entityId: Number(custMatch[1]), label: `Customer #${custMatch[1]}` };
    if (path.includes('/leads')) return { route: path, label: 'Leads Directory' };
    if (path.includes('/opportunities')) return { route: path, label: 'Sales Opportunities' };
    if (path.includes('/tasks')) return { route: path, label: 'Tasks & Calendar' };
    if (path.includes('/invoices')) return { route: path, label: 'Invoices & Billing' };
    if (path.includes('/contracts')) return { route: path, label: 'Digital Contracts' };
    return { route: path, label: 'Global Dashboard' };
  };

  const activeContext = getActiveContext();

  const [sessions, setSessions] = useState<GlobalChatSession[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to load global AI history:', e);
    }
    return [createDefaultSession(activeContext.label)];
  });

  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    return sessions[0]?.id || '';
  });

  const chatBodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    } catch (e) {
      console.error('Failed to save global AI history:', e);
    }
  }, [sessions]);

  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];

  useEffect(() => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }
  }, [activeSession?.messages, loading, isOpen]);

  const handleInputChange = (val: string) => {
    setInput(val);
    if (val !== inputHistory[historyIndex]) {
      const newHist = inputHistory.slice(0, historyIndex + 1);
      newHist.push(val);
      if (newHist.length > 50) newHist.shift();
      setInputHistory(newHist);
      setHistoryIndex(newHist.length - 1);
    }
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIdx = historyIndex - 1;
      setHistoryIndex(newIdx);
      setInput(inputHistory[newIdx]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < inputHistory.length - 1) {
      const newIdx = historyIndex + 1;
      setHistoryIndex(newIdx);
      setInput(inputHistory[newIdx]);
    }
  };

  const handleStopGeneration = () => {
    if (streamingRef.current) {
      clearInterval(streamingRef.current);
      streamingRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setLoading(false);
  };

  const handleStartChat = () => {
    setIsOpen(true);
    setIsFullWindow(true);
  };

  const handleSelectTheme = (theme: AiThemeOption) => {
    setAiTheme(theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    setShowThemePicker(false);
  };

  const handleNewChat = () => {
    const newSession = createDefaultSession(activeContext.label);
    newSession.title = 'New Executive Chat';
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
  };

  const handleSelectSession = (id: string) => {
    setActiveSessionId(id);
    if (window.innerWidth <= 768) {
      setIsSidebarOpen(false);
    }
  };

  const handleDeleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (sessions.length === 1) {
      const fresh = createDefaultSession(activeContext.label);
      setSessions([fresh]);
      setActiveSessionId(fresh.id);
      return;
    }

    const updated = sessions.filter(s => s.id !== id);
    setSessions(updated);
    if (activeSessionId === id) {
      setActiveSessionId(updated[0]?.id || '');
    }
  };

  const handleClearAllHistory = async () => {
    if (await confirmAction('Clear all AI Copilot history?')) {
      const fresh = createDefaultSession(activeContext.label);
      setSessions([fresh]);
      setActiveSessionId(fresh.id);
    }
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgId(id);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setStagedAttachment({
        fileName: file.name,
        fileType: file.type || 'application/octet-stream',
        base64Data: result,
        previewUrl: file.type.startsWith('image/') ? result : undefined
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if ((!query && !stagedAttachment) || loading) return;

    if (!isOpen) {
      setIsOpen(true);
      setIsFullWindow(true);
    }

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const currentAttachment = stagedAttachment;
    setStagedAttachment(null);

    const displayMsgText = query || (currentAttachment ? `[Attached file: ${currentAttachment.fileName}]` : '');

    const userMsg: GlobalChatMessage = {
      id: 'msg_g_user_' + Date.now(),
      role: 'user',
      message: displayMsgText,
      timestamp: timeStr,
      attachment: currentAttachment || undefined
    };

    let targetSessionId = activeSessionId;

    if (!activeSession) {
      const fresh = createDefaultSession(activeContext.label);
      setSessions([fresh]);
      targetSessionId = fresh.id;
      setActiveSessionId(fresh.id);
    }

    const apiHistory = (activeSession?.messages || []).map(m => ({
      role: m.role,
      message: m.message,
      attachment: m.attachment ? {
        fileName: m.attachment.fileName,
        fileType: m.attachment.fileType,
        base64Data: m.attachment.base64Data
      } : undefined
    }));

    setSessions(prev =>
      prev.map(s => {
        if (s.id === targetSessionId) {
          const isDefaultTitle = s.title === 'New Executive Chat' || s.title === 'Executive Assistant Overview';
          const newTitle = isDefaultTitle
            ? displayMsgText.length > 32 ? displayMsgText.substring(0, 32) + '…' : displayMsgText
            : s.title;

          return {
            ...s,
            title: newTitle,
            updatedAt: now.toISOString(),
            messages: [...s.messages, userMsg]
          };
        }
        return s;
      })
    );

    if (!textToSend) {
      setInput('');
      setInputHistory(['']);
      setHistoryIndex(0);
    }

    setLoading(true);
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const payload = {
        message: displayMsgText,
        route: activeContext.route,
        entityType: activeContext.entityType,
        entityId: activeContext.entityId,
        attachment: currentAttachment ? {
          fileName: currentAttachment.fileName,
          fileType: currentAttachment.fileType,
          base64Data: currentAttachment.base64Data
        } : undefined,
        history: apiHistory
      };

      const response = await api.post<{
        reply: string;
        suggestedActions?: { label: string; actionType: string; targetUrl?: string }[];
        isGeminiPowered?: boolean;
        currentContextSummary?: string;
      }>('/api/ai/copilot/chat', payload, { signal: controller.signal });

      if (controller.signal.aborted) return;

      const fullReply = response.reply || '';
      const assistantMsgId = 'msg_g_ai_' + Date.now();
      const assistantMsg: GlobalChatMessage = {
        id: assistantMsgId,
        role: 'assistant',
        message: '',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedActions: response.suggestedActions,
        contextSummary: response.currentContextSummary || activeContext.label,
        isGeminiPowered: response.isGeminiPowered
      };

      setSessions(prev =>
        prev.map(s => {
          if (s.id === targetSessionId) {
            return {
              ...s,
              updatedAt: new Date().toISOString(),
              messages: [...s.messages, assistantMsg]
            };
          }
          return s;
        })
      );

      // Typewriter Streaming Loop
      const words = fullReply.split(' ');
      let currentIdx = 0;
      // Fast chunking for immediate response feel
      const interval = setInterval(() => {
        currentIdx += 4;
        if (currentIdx > words.length) currentIdx = words.length;
        const partialText = words.slice(0, currentIdx).join(' ');

        setSessions(prev =>
          prev.map(s => {
            if (s.id === targetSessionId) {
              return {
                ...s,
                updatedAt: new Date().toISOString(),
                messages: s.messages.map(m => m.id === assistantMsgId ? { ...m, message: partialText } : m)
              };
            }
            return s;
          })
        );

        if (currentIdx >= words.length) {
          clearInterval(interval);
          setLoading(false);
        }
      }, 10);

      streamingRef.current = interval;
      return;
    } catch (err: any) {
      if (err.name === 'AbortError' || controller.signal.aborted) {
        const stopMsg: GlobalChatMessage = {
          id: 'msg_g_stop_' + Date.now(),
          role: 'assistant',
          message: '🛑 *AI response stopped by user.*',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          contextSummary: activeContext.label
        };
        setSessions(prev =>
          prev.map(s => {
            if (s.id === targetSessionId) {
              return { ...s, messages: [...s.messages, stopMsg] };
            }
            return s;
          })
        );
        return;
      }

      console.error('Copilot API Error:', err);
      const fallbackMsg: GlobalChatMessage = {
        id: 'msg_g_err_' + Date.now(),
        role: 'assistant',
        message: `**Copilot Service Connection**\n\nUnable to reach backend copilot server (${err?.message || 'Network Timeout'}). Please check your connection or restart the API.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        contextSummary: activeContext.label
      };

      setSessions(prev =>
        prev.map(s => {
          if (s.id === targetSessionId) {
            return {
              ...s,
              updatedAt: new Date().toISOString(),
              messages: [...s.messages, fallbackMsg]
            };
          }
          return s;
        })
      );
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleActionClick = (action: { label: string; actionType: string; targetUrl?: string }) => {
    if (action.targetUrl) {
      setIsOpen(false);
      navigate(action.targetUrl);
    } else {
      handleSendMessage(action.label);
    }
  };

  const renderFormattedText = (text: string) => {
    if (!text) return null;

    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let currentList: string[] = [];

    const flushList = (keyPrefix: string) => {
      if (currentList.length > 0) {
        elements.push(
          <ul key={`${keyPrefix}-ul`} className="copilot-formatted-list">
            {currentList.map((item, i) => (
              <li
                key={i}
                dangerouslySetInnerHTML={{
                  __html: item
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/`([^`]+)`/g, '<code class="copilot-inline-code">$1</code>')
                }}
              />
            ))}
          </ul>
        );
        currentList = [];
      }
    };

    lines.forEach((line, idx) => {
      const trimmed = line.trim();

      if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || /^\d+\.\s/.test(trimmed)) {
        const content = trimmed.replace(/^[-*]\s+/, '').replace(/^\d+\.\s+/, '');
        currentList.push(content);
      } else {
        flushList(`line-${idx}`);
        if (trimmed) {
          const formattedLine = trimmed
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/`([^`]+)`/g, '<code class="copilot-inline-code">$1</code>');

          elements.push(
            <p
              key={`p-${idx}`}
              className="copilot-formatted-p"
              dangerouslySetInnerHTML={{ __html: formattedLine }}
            />
          );
        }
      }
    });

    flushList('end');
    return <div className="copilot-formatted-content">{elements}</div>;
  };

  return (
    <>
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        accept="image/*,application/pdf,text/*,.doc,.docx"
        onChange={handleFileChange}
      />

      {/* Floating AI Copilot Trigger */}
      {!isOpen && (
        <button
          className="copilot-trigger-btn animate-fade-in"
          onClick={handleStartChat}
          title="Open Full Window Executive AI Copilot"
        >
          <span className="copilot-pulse" />
          <span>AI Copilot</span>
        </button>
      )}

      {/* Full Window / Panel Workspace Overlay */}
      {isOpen && (
        <div className={isFullWindow ? "copilot-fullwindow-overlay" : "copilot-panel-overlay"} onClick={() => setIsOpen(false)}>
          <div
            className={isFullWindow ? "copilot-fullwindow-container glass-panel" : "copilot-panel-card glass-panel"}
            data-ai-theme={aiTheme}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="copilot-header">
              <div className="copilot-header-title">
                  <button
                    className="copilot-icon-btn"
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    title={isSidebarOpen ? "Hide Chat History" : "Show Chat History"}
                  >
                    {isSidebarOpen ? <PanelLeftClose size={19} /> : <PanelLeftOpen size={19} />}
                  </button>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1.02rem', fontWeight: 800 }}>
                    CRM Executive AI
                  </h4>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  className="copilot-action-pill"
                  onClick={handleNewChat}
                  title="Start a new chat session"
                  style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', borderColor: 'rgba(99, 102, 241, 0.3)' }}
                >
                  <Plus size={15} />
                  <span>New Chat</span>
                </button>

                <button
                  className="copilot-icon-btn"
                  onClick={() => setIsFullWindow(!isFullWindow)}
                  title={isFullWindow ? "Switch to Floating Panel" : "Expand to Full Window Size"}
                >
                  {isFullWindow ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                </button>

                <button
                  className="copilot-icon-btn"
                  onClick={() => setIsOpen(false)}
                  title="Close AI Copilot"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Main Content Viewport (Sidebar + Chat Canvas) */}
            <div className={`copilot-workspace-body ${isFullWindow ? 'fullwindow' : ''}`}>
              {/* History Sidebar */}
              {isSidebarOpen && (
                <div className="copilot-history-sidebar">
                  <div className="copilot-sidebar-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Clock size={16} style={{ color: '#818cf8' }} />
                      <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>Copilot History</span>
                      <span className="copilot-session-count" style={{ background: 'rgba(99, 102, 241, 0.2)', color: '#818cf8' }}>{sessions.length}</span>
                    </div>
                    <button
                      className="copilot-sidebar-add-btn"
                      onClick={handleNewChat}
                      title="New Executive Session"
                      style={{ background: 'rgba(99, 102, 241, 0.15)', borderColor: 'rgba(99, 102, 241, 0.3)', color: '#818cf8' }}
                    >
                      <Plus size={16} />
                    </button>
                  </div>

                  {/* History Search Bar */}
                  {sessions.length > 3 && (
                    <div className="copilot-history-search-wrapper">
                      <Search size={14} style={{ color: 'var(--cp-text-muted)', flexShrink: 0 }} />
                      <input
                        type="text"
                        className="copilot-history-search-input"
                        placeholder="Filter history..."
                        value={historySearch}
                        onChange={e => setHistorySearch(e.target.value)}
                      />
                      {historySearch && (
                        <button
                          type="button"
                          className="copilot-attachment-remove"
                          onClick={() => setHistorySearch('')}
                          title="Clear search"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  )}

                  <div className="copilot-session-list">
                    {(() => {
                      const filtered = sessions.filter(s => {
                        if (!historySearch.trim()) return true;
                        const q = historySearch.toLowerCase();
                        const lastMsg = s.messages[s.messages.length - 1]?.message || '';
                        return s.title.toLowerCase().includes(q) || lastMsg.toLowerCase().includes(q);
                      });

                      const displayed = (showAllHistory || historySearch.trim()) ? filtered : filtered.slice(0, 5);

                      return (
                        <>
                          {displayed.map(s => {
                            const isActive = s.id === activeSessionId;
                            const lastMsg = s.messages[s.messages.length - 1]?.message || '';

                            return (
                              <div
                                key={s.id}
                                className={`copilot-session-item ${isActive ? 'active' : ''}`}
                                onClick={() => handleSelectSession(s.id)}
                              >
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', width: '100%', overflow: 'hidden' }}>
                                  <MessageSquare size={16} className="session-icon" style={{ marginTop: '0.15rem', flexShrink: 0, color: isActive ? '#818cf8' : '#6366f1' }} />
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div className="session-title">{s.title}</div>
                                    <div className="session-preview">
                                      {lastMsg.replace(/\*\*/g, '').substring(0, 45)}
                                    </div>
                                  </div>
                                  <button
                                    className="session-delete-btn"
                                    onClick={e => handleDeleteSession(s.id, e)}
                                    title="Delete thread"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </div>
                            );
                          })}

                          {/* Show More / Show Less Toggle Button */}
                          {!historySearch.trim() && filtered.length > 5 && (
                            <button
                              type="button"
                              className="copilot-history-toggle-btn"
                              onClick={() => setShowAllHistory(!showAllHistory)}
                            >
                              {showAllHistory ? (
                                <>
                                  <span>Show Less</span>
                                  <ChevronUp size={14} />
                                </>
                              ) : (
                                <>
                                  <span>Show More ({filtered.length - 5} older)</span>
                                  <ChevronDown size={14} />
                                </>
                              )}
                            </button>
                          )}
                        </>
                      );
                    })()}
                  </div>

                  <div className="copilot-sidebar-footer" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button
                      className="copilot-clear-history-btn"
                      onClick={handleClearAllHistory}
                      style={{ flex: 1 }}
                    >
                      <Trash2 size={13} />
                      <span>Clear History</span>
                    </button>
                    <button
                      className="copilot-sidebar-add-btn"
                      onClick={() => setIsSettingsOpen(true)}
                      title="AI Workspace Settings & Permissions"
                      style={{ padding: '0.55rem', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(99, 102, 241, 0.15)', borderColor: 'rgba(99, 102, 241, 0.3)', color: '#818cf8' }}
                    >
                      <Settings size={15} />
                    </button>
                  </div>
                </div>
              )}

              {/* Chat Canvas Area */}
              <div className="copilot-chat-canvas">
                <div className="copilot-body" ref={chatBodyRef}>
                  {activeSession?.messages.map((m) => (
                    <div key={m.id} className={`copilot-msg ${m.role}`}>
                      <div className="copilot-avatar">
                        {m.role === 'user' ? <User size={15} /> : <Bot size={15} />}
                      </div>
                      <div className="copilot-bubble-wrapper">
                        <div className="copilot-bubble">
                          {renderFormattedText(m.message)}

                          {/* Message Attachment Rendering */}
                          {m.attachment && (
                            <div>
                              {m.attachment.previewUrl ? (
                                <img
                                  src={m.attachment.previewUrl}
                                  alt={m.attachment.fileName}
                                  className="copilot-msg-attachment-img"
                                />
                              ) : (
                                <div className="copilot-msg-attachment">
                                  {m.attachment.fileType.includes('pdf') ? <FileText size={15} /> : <File size={15} />}
                                  <span>{m.attachment.fileName}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Suggested Navigation Actions */}
                        {m.suggestedActions && m.suggestedActions.length > 0 && (
                          <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                            {m.suggestedActions.map((act, actIdx) => (
                              <button
                                key={actIdx}
                                className="copilot-chip"
                                onClick={() => handleActionClick(act)}
                                style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', borderColor: 'rgba(99, 102, 241, 0.3)' }}
                              >
                                <span>{act.label}</span>
                                <ChevronRight size={13} style={{ marginLeft: 2 }} />
                              </button>
                            ))}
                          </div>
                        )}

                        <div className="copilot-msg-meta">
                          <span>{m.timestamp}</span>
                          {m.contextSummary && <span style={{ opacity: 0.7 }}>• {m.contextSummary}</span>}
                          <button
                            className="copilot-copy-btn"
                            onClick={() => handleCopyMessage(m.id, m.message)}
                            title="Copy text"
                          >
                            {copiedMsgId === m.id ? <Check size={13} style={{ color: '#818cf8' }} /> : <Copy size={13} />}
                          </button>
                          {m.role === 'user' && (
                            <button
                              className="copilot-copy-btn"
                              onClick={() => handleInputChange(m.message)}
                              title="Edit and reuse prompt"
                            >
                              <Pencil size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {loading && (
                    <div className="copilot-msg assistant">
                      <div className="copilot-avatar">
                        <Bot size={15} />
                      </div>
                      <div className="copilot-bubble-wrapper">
                        <div className="copilot-bubble" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <RefreshCw size={16} className="animate-spin" style={{ color: '#818cf8' }} />
                          <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Analyzing document & CRM database…</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Quick Prompts Bar */}
                <div className="copilot-quick-prompts">
                  <span
                    className="copilot-chip"
                    onClick={() => handleSendMessage(`Summarize active page: ${activeContext.label}`)}
                  >
                    ⚡ Summarize Page
                  </span>
                  <span
                    className="copilot-chip"
                    onClick={() => handleSendMessage('Show pipeline stage breakdown and total deal value')}
                  >
                    📊 Pipeline Forecast
                  </span>
                  <span
                    className="copilot-chip"
                    onClick={() => handleSendMessage('Show top hot leads needing follow-up')}
                  >
                    🔥 Hot Prospects
                  </span>
                  <span
                    className="copilot-chip"
                    onClick={() => handleSendMessage('Summarize contracts and unpaid invoices')}
                  >
                    💳 Billing & Contracts
                  </span>
                  <span
                    className="copilot-chip"
                    onClick={() => handleSendMessage('What products are currently in our catalog?')}
                  >
                    📦 Product Catalog
                  </span>
                </div>

                {/* Staged File Attachment Bar */}
                {stagedAttachment && (
                  <div className="copilot-attachment-bar">
                    <div className="copilot-attachment-badge">
                      {stagedAttachment.previewUrl ? <ImageIcon size={15} /> : <FileText size={15} />}
                      <span>{stagedAttachment.fileName}</span>
                      <button
                        type="button"
                        className="copilot-attachment-remove"
                        onClick={() => setStagedAttachment(null)}
                        title="Remove file attachment"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Input Deck */}
                <form
                  className="copilot-footer"
                  onSubmit={e => { e.preventDefault(); handleSendMessage(); }}
                >
                  <button
                    type="button"
                    className="copilot-attach-btn"
                    onClick={() => fileInputRef.current?.click()}
                    title="Attach PDF, Photo, or Document"
                  >
                    <Paperclip size={18} />
                  </button>

                  {/* Undo Button */}
                  <button
                    type="button"
                    className="copilot-attach-btn"
                    onClick={handleUndo}
                    disabled={historyIndex <= 0 || loading}
                    title="Undo text change (Ctrl+Z)"
                    style={{ opacity: historyIndex <= 0 ? 0.4 : 1 }}
                  >
                    <Undo2 size={16} />
                  </button>

                  {/* Redo Button */}
                  <button
                    type="button"
                    className="copilot-attach-btn"
                    onClick={handleRedo}
                    disabled={historyIndex >= inputHistory.length - 1 || loading}
                    title="Redo text change (Ctrl+Y)"
                    style={{ opacity: historyIndex >= inputHistory.length - 1 ? 0.4 : 1 }}
                  >
                    <Redo2 size={16} />
                  </button>

                  <input
                    type="text"
                    className="copilot-input"
                    placeholder={stagedAttachment ? `Ask AI Copilot about ${stagedAttachment.fileName}…` : `Ask AI Copilot about ${activeContext.label} or upload a file…`}
                    value={input}
                    onChange={e => handleInputChange(e.target.value)}
                    disabled={loading}
                    autoFocus
                  />

                  {loading ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={handleStopGeneration}
                      style={{ borderRadius: '0.75rem', padding: '0.7rem 1.25rem', background: '#ef4444', color: '#ffffff', borderColor: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.9rem', fontWeight: 700 }}
                      title="Stop AI Response"
                    >
                      <Square size={14} fill="currentColor" />
                      <span>Stop</span>
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      size="sm"
                      variant="primary"
                      disabled={loading || (!input.trim() && !stagedAttachment)}
                      style={{ borderRadius: '0.75rem', padding: '0.7rem 1.25rem', background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', borderColor: '#6366f1', display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.9rem', fontWeight: 700 }}
                    >
                      <span>Send</span>
                      <Send size={15} />
                    </Button>
                  )}
                </form>
              </div>
            </div>

            {/* AI Settings & Permissions Modal */}
            {isSettingsOpen && (
              <div className="copilot-settings-backdrop" onClick={() => setIsSettingsOpen(false)}>
                <div className="copilot-settings-modal" onClick={e => e.stopPropagation()}>
                  <div className="copilot-settings-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <Settings size={18} style={{ color: '#818cf8' }} />
                      <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>AI Copilot Settings</h3>
                    </div>
                    <button className="copilot-icon-btn" onClick={() => setIsSettingsOpen(false)}>
                      <X size={18} />
                    </button>
                  </div>

                  <div className="copilot-settings-body">
                    {/* Workspace Theme Section */}
                    <div>
                      <div className="copilot-settings-section-title">Workspace Theme</div>
                      <div className="copilot-theme-grid">
                        <div
                          className={`copilot-theme-card ${aiTheme === 'dark' ? 'active' : ''}`}
                          onClick={() => handleSelectTheme('dark')}
                        >
                          <span className="theme-color-dot dark" />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>Obsidian Dark</div>
                            <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>Classic Dark Mode</div>
                          </div>
                          {aiTheme === 'dark' && <Check size={16} style={{ color: '#818cf8' }} />}
                        </div>

                        <div
                          className={`copilot-theme-card ${aiTheme === 'light' ? 'active' : ''}`}
                          onClick={() => handleSelectTheme('light')}
                        >
                          <span className="theme-color-dot light" />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>Clean Light</div>
                            <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>Bright Minimalist</div>
                          </div>
                          {aiTheme === 'light' && <Check size={16} style={{ color: '#818cf8' }} />}
                        </div>

                        <div
                          className={`copilot-theme-card ${aiTheme === 'emerald' ? 'active' : ''}`}
                          onClick={() => handleSelectTheme('emerald')}
                        >
                          <span className="theme-color-dot emerald" />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>Cyber Emerald</div>
                            <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>Vibrant Emerald</div>
                          </div>
                          {aiTheme === 'emerald' && <Check size={16} style={{ color: '#818cf8' }} />}
                        </div>

                        <div
                          className={`copilot-theme-card ${aiTheme === 'violet' ? 'active' : ''}`}
                          onClick={() => handleSelectTheme('violet')}
                        >
                          <span className="theme-color-dot violet" />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>Midnight Violet</div>
                            <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>Neon Indigo</div>
                          </div>
                          {aiTheme === 'violet' && <Check size={16} style={{ color: '#818cf8' }} />}
                        </div>
                      </div>
                    </div>

                    {/* AI Permissions Section */}
                    <div>
                      <div className="copilot-settings-section-title">Permissions & Privacy Controls</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div className="copilot-permission-item">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <Paperclip size={18} style={{ color: '#818cf8' }} />
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>File & Document Processing</div>
                              <div style={{ fontSize: '0.78rem', color: 'var(--cp-text-muted)' }}>Allow AI to analyze attached PDFs, photos, and docs</div>
                            </div>
                          </div>
                          <div
                            className={`copilot-toggle-switch ${permissions.allowFileUploads ? 'active' : ''}`}
                            onClick={() => togglePermission('allowFileUploads')}
                            style={{ background: permissions.allowFileUploads ? '#6366f1' : undefined }}
                          >
                            <div className="copilot-toggle-thumb" />
                          </div>
                        </div>

                        <div className="copilot-permission-item">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <ShieldCheck size={18} style={{ color: '#10b981' }} />
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>CRM Database Context Access</div>
                              <div style={{ fontSize: '0.78rem', color: 'var(--cp-text-muted)' }}>Allow AI to reference pipeline revenue & lead records</div>
                            </div>
                          </div>
                          <div
                            className={`copilot-toggle-switch ${permissions.allowCrmDatabaseContext ? 'active' : ''}`}
                            onClick={() => togglePermission('allowCrmDatabaseContext')}
                            style={{ background: permissions.allowCrmDatabaseContext ? '#6366f1' : undefined }}
                          >
                            <div className="copilot-toggle-thumb" />
                          </div>
                        </div>

                        <div className="copilot-permission-item">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <Sliders size={18} style={{ color: '#f59e0b' }} />
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Smart Navigation Suggestions</div>
                              <div style={{ fontSize: '0.78rem', color: 'var(--cp-text-muted)' }}>Show 1-click quick navigation chips in responses</div>
                            </div>
                          </div>
                          <div
                            className={`copilot-toggle-switch ${permissions.allowSuggestedActions ? 'active' : ''}`}
                            onClick={() => togglePermission('allowSuggestedActions')}
                            style={{ background: permissions.allowSuggestedActions ? '#6366f1' : undefined }}
                          >
                            <div className="copilot-toggle-thumb" />
                          </div>
                        </div>

                        <div className="copilot-permission-item">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <Clock size={18} style={{ color: '#ec4899' }} />
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Auto-Scroll Chat History</div>
                              <div style={{ fontSize: '0.78rem', color: 'var(--cp-text-muted)' }}>Automatically scroll to bottom on new messages</div>
                            </div>
                          </div>
                          <div
                            className={`copilot-toggle-switch ${permissions.autoScroll ? 'active' : ''}`}
                            onClick={() => togglePermission('autoScroll')}
                            style={{ background: permissions.autoScroll ? '#6366f1' : undefined }}
                          >
                            <div className="copilot-toggle-thumb" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
