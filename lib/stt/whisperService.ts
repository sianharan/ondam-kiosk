"use client";

/**
 * WhisperService — 마이크 녹음 + Whisper 전사 클라이언트
 *
 * 흐름
 *   1) requestMicAccess()  — 권한 사전 확인 (스트림 즉시 종료, 빨간 점 깜빡임 없음)
 *   2) startRecording()    — MediaRecorder 시작, 청크 누적
 *   3) stopRecording()     — Promise<Blob> 반환, 스트림 정리
 *   4) transcribe(blob)    — /api/whisper POST, 텍스트 반환
 *
 * 폴백
 *   - Whisper API 실패 시 webkitSpeechRecognition(Web Speech) 1회 재시도.
 *     단, 이 폴백은 별도 녹음 세션을 다시 시작해야 하므로 본 서비스에서는
 *     "전사 실패" 신호만 반환하고, 호출 측(MicButton)이 사용자에게 재시도 안내.
 *
 * 메모리·자원
 *   - this.audioChunks 는 stop() 직후 비워 메모리 누수 방지
 *   - getUserMedia 트랙은 stop() 안에서 명시적으로 track.stop() 호출
 *   - 모듈 싱글톤 — 한 번에 한 녹음만 활성화 (UI 도 동시에 한 마이크 버튼만 운영)
 */

const MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
  "audio/mp4",
] as const;

function pickSupportedMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  for (const t of MIME_CANDIDATES) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return undefined;
}

class WhisperService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private activeStream: MediaStream | null = null;
  private activeMimeType: string | undefined;

  /** 마이크 권한이 이미 부여되었는지 사전 확인. 권한만 확인하고 즉시 트랙을 정리. */
  async requestMicAccess(): Promise<boolean> {
    if (typeof navigator === "undefined" || !navigator.mediaDevices) {
      return false;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      return true;
    } catch (error) {
      console.warn("[Whisper] 마이크 권한 거부 또는 사용 불가:", error);
      return false;
    }
  }

  isRecording(): boolean {
    return this.mediaRecorder?.state === "recording";
  }

  async startRecording(): Promise<void> {
    if (this.isRecording()) {
      // 이미 녹음 중이면 무시 — UI 가 중복 호출하지 못하도록 상태 관리하지만 방어적으로.
      return;
    }
    if (typeof navigator === "undefined" || !navigator.mediaDevices) {
      throw new Error("이 환경에서는 마이크를 사용할 수 없어요.");
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mimeType = pickSupportedMimeType();
    // mimeType 미지원이어도 기본값으로 생성 시도 (브라우저 기본 코덱).
    const recorder = mimeType
      ? new MediaRecorder(stream, { mimeType })
      : new MediaRecorder(stream);

    this.audioChunks = [];
    this.activeStream = stream;
    this.activeMimeType = recorder.mimeType || mimeType;
    this.mediaRecorder = recorder;

    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };

    recorder.start();
  }

  async stopRecording(): Promise<Blob> {
    return new Promise<Blob>((resolve, reject) => {
      const recorder = this.mediaRecorder;
      if (!recorder) {
        reject(new Error("녹음이 시작되지 않았어요."));
        return;
      }

      const finalize = () => {
        const type = this.activeMimeType || "audio/webm";
        const blob = new Blob(this.audioChunks, { type });

        // 스트림 + 레코더 정리. 마이크 LED 가 즉시 꺼지도록.
        this.activeStream?.getTracks().forEach((t) => t.stop());
        this.activeStream = null;
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.activeMimeType = undefined;

        resolve(blob);
      };

      // stop 직후 ondataavailable 가 한 번 더 발화하므로 onstop 시점에 안전하게 종합.
      recorder.onstop = () => finalize();
      recorder.onerror = (event) => {
        // 에러여도 스트림은 정리해야 마이크가 잠기지 않는다.
        this.activeStream?.getTracks().forEach((t) => t.stop());
        this.activeStream = null;
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.activeMimeType = undefined;
        reject(
          event instanceof ErrorEvent
            ? event.error ?? new Error("녹음 오류")
            : new Error("녹음 오류"),
        );
      };

      // 이미 inactive 면 즉시 finalize.
      if (recorder.state === "inactive") {
        finalize();
        return;
      }
      try {
        recorder.stop();
      } catch (err) {
        reject(err);
      }
    });
  }

  /** 외부에서 강제로 정리해야 할 때 (페이지 unmount 등). */
  cancelRecording(): void {
    try {
      this.mediaRecorder?.stop();
    } catch {
      /* ignore */
    }
    this.activeStream?.getTracks().forEach((t) => t.stop());
    this.activeStream = null;
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.activeMimeType = undefined;
  }

  async transcribe(audioBlob: Blob): Promise<string> {
    if (!audioBlob || audioBlob.size === 0) {
      return "";
    }
    const formData = new FormData();
    // 서버는 확장자를 보지 않지만 OpenAI 가 파일명을 참고하므로 webm 부여.
    const filename = audioBlob.type.includes("mp4")
      ? "recording.mp4"
      : audioBlob.type.includes("ogg")
        ? "recording.ogg"
        : "recording.webm";
    formData.append("audio", audioBlob, filename);

    const res = await fetch("/api/whisper", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      let detail = "";
      try {
        const data = (await res.json()) as { error?: string };
        detail = data.error ?? "";
      } catch {
        /* ignore */
      }
      throw new Error(
        `Whisper API 오류 (${res.status}): ${detail || "전사에 실패했어요."}`,
      );
    }

    const data = (await res.json()) as { text?: string };
    return (data.text ?? "").trim();
  }
}

/** 앱 전역 싱글톤 — 동시에 한 마이크 세션만 활성화. */
export const whisperService = new WhisperService();
