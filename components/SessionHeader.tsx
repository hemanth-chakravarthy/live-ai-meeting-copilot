"use client";

import { useSessionStore } from '@/lib/store';
import { removeApiKey } from '@/app/actions/apiKey';

export default function SessionHeader() {
  const { transcript, suggestions, chat, clearSession, isRecording } = useSessionStore();

  const handleEndSession = () => {
    if (window.confirm("Are you sure you want to end the session? This will clear all current transcript data and stop the microphone.")) {
      clearSession();
    }
  };

  const handleExport = () => {
    if (transcript.length === 0 && chat.length === 0) {
      alert("No content to export yet.");
      return;
    }

    let content = "TwinMind AI Meeting Copilot - Session Export\n";
    content += `Date: ${new Date().toLocaleString()}\n`;
    content += "-------------------------------------------\n\n";
    
    if (transcript.length > 0) {
      content += "TRANSCRIPT:\n";
      transcript.forEach(t => {
        content += `[${t.timestamp}] ${t.text}\n`;
      });
      content += "\n";
    }

    if (suggestions.length > 0) {
      content += "AI SUGGESTIONS:\n";
      suggestions.forEach((batch, i) => {
        content += `-- Batch ${suggestions.length - i} (${new Date(batch.createdAt).toLocaleTimeString()}):\n`;
        batch.items.forEach(item => {
          content += `   [${item.type.toUpperCase()}] ${item.text}\n`;
        });
      });
      content += "\n";
    }

    if (chat.length > 0) {
      content += "DETAILED CHAT Q&A:\n";
      chat.forEach(msg => {
        const role = msg.role === 'user' ? 'YOU' : 'AI ASSISTANT';
        content += `${role}: ${msg.content}\n`;
      });
      content += "\n";
    }

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meeting-summary-${new Date().toISOString().slice(0,10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleLogout = async () => {
    if (window.confirm("Log out? This will remove your API key from the browser cookies.")) {
      await removeApiKey();
      window.location.href = '/settings';
    }
  };

  return (
    <header className="flex justify-between items-center px-4 py-2.5 border-b border-main bg-panel shrink-0">
      <div className="flex items-center gap-3">
        <h1 className="font-semibold text-text text-[14px]">
          TwinMind — <span className="font-normal text-text">Live AI Copilot</span>
        </h1>
        {isRecording && (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-danger/10 border border-danger/20 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-danger"></span>
            <span className="text-[10px] font-bold text-danger uppercase tracking-wider">Live</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button 
          onClick={handleExport}
          className="text-[12px] px-3 py-1.5 rounded bg-panel-2 border border-main text-text hover:border-accent transition-colors hidden sm:block"
        >
          Export Transcript
        </button>
        <button 
          onClick={handleEndSession}
          className="text-[12px] px-3 py-1.5 rounded bg-danger/10 border border-danger/30 text-danger hover:bg-danger/20 transition-colors"
        >
          End Session
        </button>
        <div className="w-px h-4 bg-border mx-1"></div>
        <button 
          onClick={handleLogout}
          className="text-[12px] p-1.5 text-muted hover:text-text transition-colors"
          title="Settings / Logout"
        >
          ⚙ Settings
        </button>
      </div>
    </header>
  );
}
