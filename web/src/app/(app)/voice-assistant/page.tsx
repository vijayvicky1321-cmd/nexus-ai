"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Mic, PhoneOff, Loader2, AudioLines } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";

type ConnectionState = "idle" | "connecting" | "listening" | "speaking";

type TranscriptEntry = {
  id: string;
  role: "user" | "assistant";
  text: string;
};

type TranscriptSegment = { number: string | null; text: string };

const ORDINAL_WORDS: Record<string, string> = {
  first: "1",
  second: "2",
  third: "3",
  fourth: "4",
  fifth: "5",
  sixth: "6",
  seventh: "7",
  eighth: "8",
  ninth: "9",
  tenth: "10",
  next: "•",
  finally: "•",
  lastly: "•",
};

const ORDINAL_PATTERN = Object.keys(ORDINAL_WORDS).join("|");

// Realtime speech transcripts arrive as one continuous run with no newlines,
// so a spoken list — whether "1. ... 2. ..." or "First, ... Second, ..." —
// reads as a single wall of text. Split wherever a new point starts and pull
// the marker out so it renders as an actual list marker, not inline text.
function splitIntoSegments(text: string): TranscriptSegment[] {
  const withDigitBreaks = text.replace(/(\s)(\d{1,2}\.\s)/g, "$1\n$2");
  const withWordBreaks = withDigitBreaks.replace(
    new RegExp(`(\\.\\s)(${ORDINAL_PATTERN})(,|:)\\s`, "gi"),
    "$1\n$2$3 "
  );
  return withWordBreaks
    .split("\n")
    .map((p) => p.trim())
    .filter(Boolean)
    .map((segment) => {
      const digitMatch = segment.match(/^(\d{1,2})\.\s+(.*)$/s);
      if (digitMatch) return { number: digitMatch[1], text: digitMatch[2] };

      const wordMatch = segment.match(new RegExp(`^(${ORDINAL_PATTERN})(,|:)\\s+(.*)$`, "is"));
      if (wordMatch) {
        const marker = ORDINAL_WORDS[wordMatch[1].toLowerCase()];
        return { number: marker, text: wordMatch[3] };
      }

      return { number: null, text: segment };
    });
}

const OPENAI_REALTIME_CALLS_URL = "https://api.openai.com/v1/realtime/calls";

export default function VoiceAssistantPage() {
  const { getToken } = useAuth();
  const [state, setState] = useState<ConnectionState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const transcriptListRef = useRef<HTMLDivElement | null>(null);
  const assistantEntryIdRef = useRef<string | null>(null);

  useEffect(() => {
    transcriptListRef.current?.scrollTo({ top: transcriptListRef.current.scrollHeight });
  }, [transcript]);

  const cleanup = useCallback(() => {
    dcRef.current?.close();
    dcRef.current = null;

    pcRef.current?.getSenders().forEach((sender) => sender.track?.stop());
    pcRef.current?.close();
    pcRef.current = null;

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    if (audioElRef.current) {
      audioElRef.current.srcObject = null;
    }

    assistantEntryIdRef.current = null;
    setState("idle");
  }, []);

  const handleDataChannelMessage = useCallback((event: MessageEvent) => {
    let payload: { type?: string; delta?: string; transcript?: string };
    try {
      payload = JSON.parse(event.data);
    } catch {
      return;
    }

    switch (payload.type) {
      case "input_audio_buffer.speech_started":
        setState("listening");
        break;

      case "input_audio_buffer.speech_stopped":
        setState("speaking");
        break;

      // Final transcript of what the user said.
      case "conversation.item.input_audio_transcription.completed":
        if (payload.transcript) {
          setTranscript((prev) => [
            ...prev,
            { id: crypto.randomUUID(), role: "user", text: payload.transcript! },
          ]);
        }
        break;

      // Streaming deltas of the assistant's spoken response.
      case "response.output_audio_transcript.delta":
      case "response.audio_transcript.delta":
        if (payload.delta) {
          if (!assistantEntryIdRef.current) {
            assistantEntryIdRef.current = crypto.randomUUID();
            setTranscript((prev) => [
              ...prev,
              { id: assistantEntryIdRef.current!, role: "assistant", text: payload.delta! },
            ]);
          } else {
            setTranscript((prev) =>
              prev.map((entry) =>
                entry.id === assistantEntryIdRef.current
                  ? { ...entry, text: entry.text + payload.delta }
                  : entry
              )
            );
          }
        }
        break;

      case "response.output_audio_transcript.done":
      case "response.audio_transcript.done":
      case "response.done":
        assistantEntryIdRef.current = null;
        setState("listening");
        break;

      case "error":
        setError("The voice session reported an error. Please try again.");
        break;

      default:
        break;
    }
  }, []);

  const startConversation = useCallback(async () => {
    setError(null);
    setTranscript([]);
    setState("connecting");

    try {
      const token = await getToken();
      const res = await apiFetch("/voice/session", token, { method: "POST" });
      if (!res.ok) {
        throw new Error("Could not start a voice session. Please try again.");
      }
      const { client_secret: ephemeralKey, model } = await res.json();
      if (!ephemeralKey) {
        throw new Error("No session token returned by the server.");
      }

      const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = mic;

      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      pc.ontrack = (event) => {
        if (audioElRef.current) {
          audioElRef.current.srcObject = event.streams[0];
        }
      };

      mic.getTracks().forEach((track) => pc.addTrack(track, mic));

      const dc = pc.createDataChannel("oai-events");
      dcRef.current = dc;
      dc.addEventListener("message", handleDataChannelMessage);
      dc.addEventListener("open", () => setState("listening"));
      dc.addEventListener("close", () => setState("idle"));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // OpenAI takes the raw SDP offer over HTTP and hands back a raw SDP answer —
      // no WebSocket signaling server needed, which keeps audio latency to a single hop.
      const sdpResponse = await fetch(
        `${OPENAI_REALTIME_CALLS_URL}?model=${encodeURIComponent(model)}`,
        {
          method: "POST",
          body: offer.sdp,
          headers: {
            Authorization: `Bearer ${ephemeralKey}`,
            "Content-Type": "application/sdp",
          },
        }
      );

      if (!sdpResponse.ok) {
        throw new Error("Failed to negotiate the voice connection with OpenAI.");
      }

      const answerSdp = await sdpResponse.text();
      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
    } catch (err) {
      cleanup();
      setError(err instanceof Error ? err.message : "Could not start the voice session.");
    }
  }, [getToken, handleDataChannelMessage, cleanup]);

  const endConversation = useCallback(() => {
    cleanup();
  }, [cleanup]);

  useEffect(() => {
    return () => cleanup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isActive = state !== "idle";
  const statusLabel: Record<ConnectionState, string> = {
    idle: "Ready to start",
    connecting: "Connecting…",
    listening: "Listening",
    speaking: "Assistant speaking",
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl min-h-0 flex-1 flex-col gap-6 overflow-hidden p-6">
      <audio ref={audioElRef} autoPlay />

      <div className="flex shrink-0 flex-col items-center gap-5 rounded-2xl border border-border/70 bg-card py-10">
        <button
          type="button"
          onClick={isActive ? endConversation : startConversation}
          disabled={state === "connecting"}
          className={cn(
            "flex size-20 items-center justify-center rounded-full ring-8 transition-colors",
            state === "idle" && "bg-rose-500 ring-rose-500/10 hover:bg-rose-500/90",
            state === "connecting" && "bg-muted ring-muted",
            state === "listening" && "bg-rose-500 ring-rose-500/15 animate-pulse",
            state === "speaking" && "bg-rose-600 ring-rose-500/20 animate-pulse"
          )}
        >
          {state === "connecting" ? (
            <Loader2 className="size-7 animate-spin text-white" />
          ) : isActive ? (
            <PhoneOff className="size-7 text-white" />
          ) : (
            <Mic className="size-7 text-white" />
          )}
        </button>

        <div className="flex flex-col items-center gap-1 text-center">
          <p className="text-sm font-medium text-foreground">{statusLabel[state]}</p>
          <p className="max-w-xs text-xs text-muted-foreground">
            Speak naturally — nothing from this session is saved.
          </p>
        </div>

        {error && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        {!isActive ? (
          <Button onClick={startConversation} className="rounded-full px-6">
            Start conversation
          </Button>
        ) : (
          <Button variant="destructive" onClick={endConversation} className="rounded-full px-6">
            End conversation
          </Button>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border/70 bg-card">
        <div className="flex items-center gap-2 border-b border-border/70 px-4 py-3">
          <AudioLines className="size-4 text-rose-500" />
          <span className="text-sm font-medium text-foreground">Live transcript</span>
        </div>
        <div ref={transcriptListRef} className="flex flex-1 flex-col gap-6 overflow-y-auto px-4 py-4">
          {transcript.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nothing said yet — start a conversation to see the transcript here.
            </p>
          )}
          {transcript.map((entry) => (
            <div
              key={entry.id}
              className={cn("flex flex-col gap-1.5", entry.role === "user" && "items-end")}
            >
              <span className="px-1 text-[11px] font-medium tracking-wide text-muted-foreground/70 uppercase">
                {entry.role === "user" ? "You" : "Assistant"}
              </span>
              <div
                className={cn(
                  "text-sm leading-relaxed text-foreground",
                  entry.role === "user" && "max-w-[80%] text-right text-muted-foreground"
                )}
              >
                {splitIntoSegments(entry.text).map((segment, i) =>
                  segment.number ? (
                    <div key={i} className={cn("flex gap-2", i > 0 && "mt-2.5")}>
                      <span className="shrink-0 font-medium text-foreground">
                        {segment.number}.
                      </span>
                      <span>{segment.text}</span>
                    </div>
                  ) : (
                    <p key={i} className={i > 0 ? "mt-2.5" : undefined}>
                      {segment.text}
                    </p>
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
