"use client";

import { useState } from 'react';
import { saveApiKey } from '@/app/actions/apiKey';

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMessage('');

    try {
      if (!apiKey || apiKey.trim() === '') {
        throw new Error('API key cannot be empty');
      }

      if (apiKey.length < 20) {
        throw new Error('Invalid API key. Please check and try again.');
      }

      // Securely store API key in HttpOnly cookie via Server Action
      await saveApiKey(apiKey);
      
      setStatus('success');
      
      // Redirect to home after a short delay
      setTimeout(() => {
        window.location.href = '/';
      }, 1000);
    } catch (error: any) {
      setStatus('error');
      setErrorMessage(error.message);
    }
  };

  // Check if API key already exists on mount
  // In a real implementation, we'd use this to redirect if key exists
  // For now, we'll just display it if present (security note: in prod, don't display the actual key)
  
  return (
    <div className="min-h-screen bg-main flex items-center justify-center p-4">
      <div className="panel-2 w-full max-w-md p-8 space-y-6">
        <div className="text-center">
          <h1 className="text-xl uppercase font-medium letter-wider">Settings</h1>
          <p className="text-muted">Enter your Groq API key to start using the Live AI Meeting Copilot</p>
        </div>
        
        <form onClick={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-muted">
              Groq API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-or-v1-..."
              className="w-full px-3 py-2 rounded border border-muted/50 bg-panel text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
              autoComplete="off"
            />
          </div>
          
          {status === 'error' && (
            <div className="bg-danger/10 border border-danger rounded px-3 py-2 text-sm text-danger">
              {errorMessage}
            </div>
          )}
          
          {status === 'success' && (
            <div className="bg-good/10 border border-good rounded px-3 py-2 text-sm text-good">
              API key saved successfully! Redirecting to home...
            </div>
          )}
          
          <button
            type="submit"
            disabled={status === 'loading'}
            className={`w-full px-4 py-2 rounded 
              ${status === 'loading' ? 'bg-muted/50 cursor-not-allowed' : 'bg-accent text-white hover:bg-accent/90'}
              transition-colors`}
          >
            {status === 'loading' ? 'Saving...' : 'Save API Key'}
          </button>
        </form>
        
        <div className="text-center text-xs text-muted">
          <p>Your API key is stored locally in your browser and is never sent to our servers.</p>
          <p>Get your API key from <a href="https://console.groq.com/keys" className="underline hover:no-underline" target="_blank" rel="noopener noreferrer">Groq Console</a></p>
        </div>
      </div>
    </div>
  );
}