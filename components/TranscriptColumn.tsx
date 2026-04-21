"use client";

import { useState, useEffect, useRef } from 'react';
import { useSessionStore } from '@/lib/store';

export default function TranscriptColumn() {
  const transcript = useSessionStore(state => state.transcript);
  const isRecording = useSessionStore(state => state.isRecording);
  const setIsRecording = useSessionStore(state => state.setIsRecording);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll transcript when updated
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  // Handle audio recording and transcription
  useEffect(() => {
    if (!isRecording) return;

    let mediaRecorder: MediaRecorder | null = null;
    let chunkInterval: NodeJS.Timeout | null = null;
    let streamRef: MediaStream | null = null;

    const processAudioChunks = async () => {
      if (audioChunksRef.current.length === 0) return;

      // Grab current chunks and clear array for next batch
      const chunksToSend = [...audioChunksRef.current];
      audioChunksRef.current = [];

      const audioBlob = new Blob(chunksToSend, { type: 'audio/webm' });
      const reader = new FileReader();

      reader.onloadend = async () => {
        const base64Audio = reader.result?.toString().split(',')[1];
        if (base64Audio) {
          try {
            const response = await fetch('/api/transcribe', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ audio: base64Audio })
            });

            if (!response.ok) throw new Error(`Transcription failed: ${response.status}`);

            const { text } = await response.json();
            
            if (text && text.trim().length > 0) {
              // Add to transcript store
              useSessionStore.getState().addTranscript({
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                text: text.trim()
              });
            }
          } catch (error) {
            console.error('Transcription error:', error);
          }
        }
      };

      reader.readAsDataURL(audioBlob);
    };

    // Request microphone access
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        streamRef = stream;
        // Create MediaRecorder
        mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'audio/webm',
        });
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        // Handle data available
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        let isManualStop = false;

        // Handle stop
        mediaRecorder.onstop = () => {
          // Process the chunks
          processAudioChunks();
          
          // Restart immediately to continue listening, unless it was a manual unmount stop
          if (!isManualStop && mediaRecorder && mediaRecorder.state === 'inactive') {
            try {
              mediaRecorder.start();
            } catch (e) {
              console.error('Failed to restart recording block', e);
            }
          }
        };

        // Start recording
        mediaRecorder.start();

        // Setup interval to stop and flush data every 15 seconds. 
        // We MUST stop() the recorder instead of requestData() because Whisper 
        // requires the internal WebM EBML headers that are only generated at start()
        chunkInterval = setInterval(() => {
          if (mediaRecorder && mediaRecorder.state === 'recording') {
            mediaRecorder.stop(); // Triggers onstop -> processes -> restarts
          }
        }, 15000);
      })
      .catch(err => {
        console.error('Microphone access error:', err);
        useSessionStore.getState().addTranscript({
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: 'Microphone access denied. Please check permissions.'
        });
        setIsRecording(false);
      });

    return () => {
      // Cleanup on unmount or when recording stops
      if (chunkInterval) clearInterval(chunkInterval);
      if (mediaRecorder) {
        // Tag this so onstop knows we aren't looping it anymore
        // eslint-disable-next-line react-hooks/exhaustive-deps
        mediaRecorder.onstop = () => { processAudioChunks(); }; // only process, no restart
        if (mediaRecorder.state !== 'inactive') {
          mediaRecorder.stop();
        }
      }
      if (streamRef) {
        streamRef.getTracks().forEach(track => track.stop());
      }
    };
  }, [isRecording]);

  const toggleRecording = async () => {
    setIsRecording(!isRecording);
  };

  return (
    <div className="bg-panel border border-main rounded-[10px] flex flex-col overflow-hidden min-h-0">
      {/* Header */}
      <header className="px-3.5 py-2.5 border-b border-main text-[12px] uppercase tracking-[1px] text-muted flex justify-between items-center shrink-0">
        <span>1. Mic & Transcript</span>
        <span className="flex items-center">
          {isRecording ? <span className="w-1.5 h-1.5 rounded-full bg-danger mr-2"></span> : null}
          {isRecording ? 'RECORDING' : 'IDLE'}
        </span>
      </header>
      
      <div className="flex-1 overflow-y-auto p-3.5 custom-scrollbar flex flex-col">
        {/* Button Row */}
        <div className="flex items-center gap-[10px] pb-3.5 mb-3.5 border-b border-main shrink-0">
        <button 
          onClick={toggleRecording}
          className={`w-[44px] h-[44px] rounded-full border-none cursor-[pointer] flex items-center justify-center transition-colors shrink-0
            ${isRecording ? 'bg-danger text-white mic-recording' : 'bg-accent text-black hover:bg-accent/90'}`}
        >
          ●
        </button>
        <div className="text-[13px] text-muted">
          {isRecording 
            ? 'Listening... transcript updates every 30s.' 
            : 'Click mic to start. Transcript appends every ~30s.'}
        </div>
      </div>

      {/* Conditional Info Box */}
      {transcript.length === 0 && (
        <div className="bg-accent/10 border border-accent/30 text-[#cfd3dc] p-2.5 text-[12px] rounded-md mx-3 mt-3 mb-2 leading-relaxed shrink-0">
          The transcript scrolls and appends new chunks every ~30 seconds while recording. Use the mic button to start/stop. Include an export button (not shown) so we can pull the full session.
        </div>
      )}

      {/* Transcript Area */}
      <div className="flex-1 flex flex-col p-3.5">
        {transcript.length === 0 ? (
          <div className="text-muted text-[13px] text-center px-2.5 py-7 leading-relaxed">
            No transcript yet — start the mic.
          </div>
        ) : (
          <div className="flex flex-col">
            {transcript.map((entry, index) => (
              <div key={index} className="transcript-line-new text-[14px] leading-relaxed mb-2.5 text-[#cfd3dc]">
                <span className="text-muted text-[11px] mr-1.5">{entry.timestamp}</span>
                {entry.text}
              </div>
            ))}
            <div ref={transcriptEndRef} />
          </div>
        )}
      </div>
      </div>
    </div>
  );
}