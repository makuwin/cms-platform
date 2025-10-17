import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

const AUTOSAVE_DELAY = 2000;

export interface RichTextEditorProps {
  initialContent?: string;
  onSave?: (content: string) => Promise<void>;
  autoSave?: boolean;
  sessionId?: string;
}

type SignalMessage =
  | { type: 'offer'; offer: RTCSessionDescriptionInit; from: string }
  | { type: 'answer'; answer: RTCSessionDescriptionInit; from: string }
  | { type: 'candidate'; candidate: RTCIceCandidateInit; from: string }
  | { type: 'content'; content: string; from: string };

function useCollaborativeChannel(
  sessionId: string,
  onMessage: (content: string) => void,
  getLocalContent: () => string,
) {
  const editorId = useMemo(() => crypto.randomUUID(), []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const supportsBroadcast = typeof BroadcastChannel !== 'undefined';

    if (!window.RTCPeerConnection || !supportsBroadcast) {
      if (!supportsBroadcast) return undefined;
      const channel = new BroadcastChannel(`collab-${sessionId}`);
      channel.onmessage = (event) => {
        const { content, from } = event.data ?? {};
        if (!content || from === editorId) return;
        onMessage(content);
      };
      return () => channel.close();
    }

    const peer = new RTCPeerConnection();
    const signalChannel = new BroadcastChannel(`rtc-collab-${sessionId}`);
    let dataChannel: RTCDataChannel | null = peer.createDataChannel('content');

    const sendSignal = (message: SignalMessage) => {
      signalChannel.postMessage(message);
    };

    const sendContent = (content: string) => {
      if (dataChannel?.readyState === 'open') {
        dataChannel.send(JSON.stringify({ type: 'content', content, from: editorId }));
      }
    };

    const handleRemoteContent = (content: string, from: string) => {
      if (from === editorId) return;
      onMessage(content);
    };

    dataChannel.onopen = () => {
      sendContent(getLocalContent());
    };

    dataChannel.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as { type: string; content: string; from: string };
        if (payload.type === 'content') {
          handleRemoteContent(payload.content, payload.from);
        }
      } catch (error) {
        console.error('Failed to parse data channel message', error);
      }
    };

    peer.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal({ type: 'candidate', candidate: event.candidate.toJSON(), from: editorId });
      }
    };

    peer.ondatachannel = (event) => {
      dataChannel = event.channel;
      dataChannel.onmessage = (ev) => {
        try {
          const payload = JSON.parse(ev.data) as { type: string; content: string; from: string };
          if (payload.type === 'content') {
            handleRemoteContent(payload.content, payload.from);
          }
        } catch (error) {
          console.error('Failed to parse remote content', error);
        }
      };
    };

    let isInitiator = false;

    const createOffer = async () => {
      try {
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        sendSignal({ type: 'offer', offer, from: editorId });
      } catch (error) {
        console.error('Failed to create offer', error);
      }
    };

    const attemptOffer = () => {
      if (isInitiator) return;
      isInitiator = true;
      createOffer().catch((error) => console.error(error));
    };

    const signalListener = async (event: MessageEvent<SignalMessage>) => {
      const message = event.data;
      if (!message || ('from' in message && message.from === editorId)) return;

      try {
        if (message.type === 'offer') {
          await peer.setRemoteDescription(new RTCSessionDescription(message.offer));
          const answer = await peer.createAnswer();
          await peer.setLocalDescription(answer);
          sendSignal({ type: 'answer', answer, from: editorId });
        } else if (message.type === 'answer') {
          await peer.setRemoteDescription(new RTCSessionDescription(message.answer));
        } else if (message.type === 'candidate') {
          if (message.candidate) {
            await peer.addIceCandidate(new RTCIceCandidate(message.candidate));
          }
        } else if (message.type === 'content') {
          handleRemoteContent(message.content, message.from);
        }
      } catch (error) {
        console.error('WebRTC signalling error', error);
      }
    };

    signalChannel.addEventListener('message', signalListener);

    const offerTimeout = window.setTimeout(() => {
      attemptOffer();
    }, 300);

    return () => {
      window.clearTimeout(offerTimeout);
      signalChannel.removeEventListener('message', signalListener);
      signalChannel.close();
      dataChannel?.close();
      peer.close();
    };
  }, [sessionId, onMessage, getLocalContent, editorId]);
}

export default function RichTextEditor({
  initialContent,
  onSave,
  autoSave = true,
  sessionId = 'default',
}: RichTextEditorProps) {
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const contentRef = useRef(initialContent ?? '');
  const debounceTimer = useRef<number | null>(null);

  const editor = useEditor({
    extensions: [StarterKit],
    content: initialContent ?? '<p>Start writing…</p>',
    editorProps: {
      attributes: {
        class:
          'prose prose-invert max-w-none min-h-[260px] rounded-lg border border-white/10 bg-neutral-950/80 p-4 focus:outline-none',
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      contentRef.current = html;
    },
  });

  useCollaborativeChannel(
    sessionId,
    (nextContent) => {
      if (!editor) return;
      const current = editor.getHTML();
      if (current === nextContent) return;
      editor.commands.setContent(nextContent, false);
    },
    () => contentRef.current,
  );

  useEffect(() => {
    if (!editor || initialContent == null) return;
    editor.commands.setContent(initialContent, false);
    contentRef.current = initialContent;
  }, [editor, initialContent]);

  const performSave = useCallback(async () => {
    if (onSave) {
      await onSave(contentRef.current);
    } else if (typeof window !== 'undefined') {
      window.localStorage.setItem(`editor-draft-${sessionId}`, contentRef.current);
    }
  }, [onSave, sessionId]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await performSave();
      setLastSaved(new Date());
    } finally {
      setSaving(false);
    }
  }, [performSave]);

  useEffect(() => {
    if (!autoSave || !editor) return;

    const scheduleSave = () => {
      if (debounceTimer.current) window.clearTimeout(debounceTimer.current);
      debounceTimer.current = window.setTimeout(() => {
        handleSave().catch((error) => console.error('Auto-save failed', error));
      }, AUTOSAVE_DELAY);
    };

    editor.on('update', scheduleSave);

    return () => {
      if (debounceTimer.current) window.clearTimeout(debounceTimer.current);
      editor.off('update', scheduleSave);
    };
  }, [editor, autoSave, handleSave]);

  if (!editor) {
    return (
      <div className="flex min-h-[260px] items-center justify-center rounded-xl border border-white/10 bg-neutral-900/60 text-sm text-neutral-400">
        Loading editor…
      </div>
    );
  }

  return (
    <section className="space-y-4 rounded-xl border border-white/10 bg-neutral-900/60 p-4">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium text-neutral-200">Rich Text Editor</h2>
          {lastSaved ? (
            <p className="text-xs text-neutral-500">
              Saved {lastSaved.toLocaleTimeString()}
            </p>
          ) : (
            <p className="text-xs text-neutral-600">Auto-save enabled</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => handleSave().catch((error) => console.error(error))}
          className="inline-flex items-center gap-2 rounded-lg border border-primary-500/40 bg-primary-500/20 px-4 py-2 text-sm font-semibold text-primary-100 hover:bg-primary-500/30 disabled:opacity-60"
          disabled={saving}
        >
          {saving ? 'Saving…' : 'Save now'}
        </button>
      </header>

      <EditorContent editor={editor} />
    </section>
  );
}
