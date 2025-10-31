import type { MutableRefObject } from "react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type Quill from "quill";
import "quill/dist/quill.snow.css";

import { readTokens } from "../utils/authStorage";

export type EditorMedia = {
  id?: string;
  filename?: string;
  url: string;
  mimeType?: string;
};

type Tone = "info" | "success" | "error";

type UseQuillEditorOptions = {
  apiBase: string;
  placeholder?: string;
  initialHtml?: string;
  initialMedia?: EditorMedia[];
  notify?: (message: string, tone: Tone) => void;
};

type UseQuillEditorResult = {
  editorHostRef: (node: HTMLDivElement | null) => void;
  quillRef: MutableRefObject<Quill | null>;
  quillReady: boolean;
  html: string;
  media: EditorMedia[];
};

const normalizeBase = (base: string) => {
  if (!base) return "";
  return base.replace(/\/$/, "");
};

const resolveUrl = (base: string, path: string) => {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  if (!base) {
    return path.startsWith("/") ? path : `/${path}`;
  }
  return `${base}/${path.replace(/^\//, "")}`;
};

const styleQuillDom = (host: HTMLElement) => {
  const toolbar = host.querySelector(".ql-toolbar") as HTMLElement | null;
  if (toolbar) {
    toolbar.classList.add(
      "flex",
      "flex-wrap",
      "items-center",
      "gap-2",
      "border-b",
      "border-slate-200",
      "bg-slate-50",
      "px-3",
      "py-2",
    );
  }

  const container = host.querySelector(".ql-container") as HTMLElement | null;
  if (container) {
    container.style.borderWidth = "0";
    container.classList.add("bg-white");
  }

  const editor = host.querySelector(".ql-editor") as HTMLElement | null;
  if (editor) {
    editor.classList.add(
      "min-h-[16rem]",
      "p-4",
      "text-sm",
      "leading-relaxed",
      "text-slate-800",
      "focus:outline-none",
    );
  }
};

const useQuillEditor = ({
  apiBase,
  placeholder = "Write your content…",
  initialHtml = "",
  initialMedia = [],
  notify,
}: UseQuillEditorOptions): UseQuillEditorResult => {
  const [quillReady, setQuillReady] = useState(false);
  const [html, setHtml] = useState(initialHtml);
  const [media, setMedia] = useState<EditorMedia[]>(initialMedia);

  const [hostElement, setHostElement] = useState<HTMLDivElement | null>(null);
  const editorHostRef = useCallback((node: HTMLDivElement | null) => {
    if (node !== null) {
      setHostElement(node);
    }
  }, []);

  const quillRef = useRef<Quill | null>(null);

  const normalizedBase = useMemo(() => normalizeBase(apiBase), [apiBase]);

  const emit = useCallback(
    (message: string, tone: Tone) => {
      if (notify) {
        notify(message, tone);
      }
    },
    [notify],
  );

  const uploadImage = useCallback(
    async (file: File): Promise<string | null> => {
      emit(`Uploading ${file.name}…`, "info");

      const formData = new FormData();
      formData.append("file", file);

      const tokens = readTokens();
      const headers: Record<string, string> = {};
      if (tokens?.accessToken) {
        headers.Authorization = `Bearer ${tokens.accessToken}`;
      }

      try {
        const response = await fetch(`${normalizedBase}/api/media/upload`, {
          method: "POST",
          credentials: "include",
          headers,
          body: formData,
        });

        const payload = await response.json().catch(() => null);

        if (!response.ok || !payload?.url) {
          const message =
            typeof payload?.error === "string"
              ? payload.error
              : `Unable to upload ${file.name}.`;
          emit(message, "error");
          return null;
        }

        const mediaItem: EditorMedia = {
          id: payload.id ?? undefined,
          filename: payload.filename ?? file.name,
          url: resolveUrl(normalizedBase, payload.url),
          mimeType: payload.mimeType ?? file.type,
        };

        setMedia((prev) => [...prev, mediaItem]);
        emit(`${file.name} uploaded.`, "success");
        return mediaItem.url;
      } catch (error) {
        console.error("Image upload failed", error);
        emit(`Unable to upload ${file.name}.`, "error");
        return null;
      }
    },
    [emit, normalizedBase],
  );

  const openImagePicker = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      const url = await uploadImage(file);
      if (!url) return;

      const quill = quillRef.current;
      if (!quill) return;

      const range = quill.getSelection(true);
      const index = range ? range.index : quill.getLength();
      quill.insertEmbed(index, "image", url, "user");
      quill.setSelection(index + 1, 0, "user");
      setHtml(quill.root.innerHTML);
    };
    input.click();
  }, [uploadImage]);

  useEffect(() => {
    setMedia(initialMedia);
  }, [initialMedia]);

  useEffect(() => {
    let active = true;

    const loadQuill = async () => {
      try {
        const QuillModule = await import("quill");
        if (!active || !hostElement) return;

        const QuillConstructor = QuillModule.default ?? QuillModule;

        const toolbarOptions = [
          [{ header: [1, 2, 3, false] }],
          ["bold", "italic", "underline", "strike"],
          [{ list: "ordered" }, { list: "bullet" }],
          ["blockquote", "code-block"],
          ["link", "image"],
          ["clean"],
        ];

        const host = hostElement;
        host.innerHTML = "";

        const containerEl = document.createElement("div");
        host.appendChild(containerEl);

        const quill = new QuillConstructor(containerEl, {
          theme: "snow",
          placeholder,
          modules: {
            toolbar: {
              container: toolbarOptions,
              handlers: {
                image: openImagePicker,
              },
            },
          },
        });

        if (initialHtml) {
          quill.clipboard.dangerouslyPasteHTML(initialHtml);
        } else {
          quill.setText("");
        }

        quill.on("text-change", () => {
          setHtml(quill.root.innerHTML);
        });

        styleQuillDom(host);

        quillRef.current = quill;
        setHtml(quill.root.innerHTML);
        setQuillReady(true);
      } catch (error) {
        console.error("Failed to load Quill editor", error);
        emit("Unable to load rich text editor.", "error");
      }
    };

    loadQuill().catch((error) => {
      console.error("Unexpected error loading Quill", error);
      emit("Unable to load rich text editor.", "error");
    });

    return () => {
      active = false;
      quillRef.current = null;
      if (hostElement) {
        hostElement.innerHTML = "";
      }
    };
  }, [emit, hostElement, initialHtml, openImagePicker, placeholder]);

  useEffect(() => {
    const quill = quillRef.current;
    if (!quill) return;

    if (initialHtml && initialHtml !== quill.root.innerHTML) {
      quill.clipboard.dangerouslyPasteHTML(initialHtml);
      setHtml(quill.root.innerHTML);
    } else if (!initialHtml && quill.root.innerHTML) {
      quill.setText("");
      setHtml("");
    }
  }, [initialHtml]);

  return {
    editorHostRef,
    quillRef,
    quillReady,
    html,
    media,
  };
};

export default useQuillEditor;
