import { Locale } from '@/i18n/config';
import { generateMockTranscript } from './mock-asr';

const DEFAULT_ENDPOINT =
  'https://open.bigmodel.cn/api/paas/v4/audio/transcriptions';

export interface ASRClientConfig {
  apiKey: string;
  model: string;
  endpoint?: string;
}

export interface ASRClientResult {
  text: string;
  rawResponse: string;
  isMock: boolean;
}

export interface ASRTimeRange {
  startTime: number;
  endTime: number;
}

interface TranscribeAudioParams {
  audioBlob: Blob;
  prompt?: string;
  config: ASRClientConfig;
  timeRange?: ASRTimeRange;
  signal?: AbortSignal;
  locale?: Locale;
  segmentIndex?: number;
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);

    if (!signal) return;

    const abort = () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    };

    if (signal.aborted) {
      abort();
      return;
    }

    signal.addEventListener('abort', abort, { once: true });
  });
}

export async function transcribeAudio({
  audioBlob,
  prompt,
  config,
  timeRange,
  signal,
  locale,
  segmentIndex,
}: TranscribeAudioParams): Promise<ASRClientResult> {
  if (!config.apiKey) {
    const startTime = timeRange?.startTime ?? 0;
    const endTime = timeRange?.endTime ?? startTime;
    const text = generateMockTranscript(
      startTime,
      endTime,
      prompt,
      locale,
      segmentIndex
    );

    await delay(200 + Math.random() * 300, signal);

    return {
      text,
      rawResponse: JSON.stringify({ text, mock: true }),
      isMock: true,
    };
  }

  const formData = new FormData();
  formData.append('model', config.model);
  formData.append('file', audioBlob, 'audio.wav');
  formData.append('stream', 'false');

  if (prompt) {
    formData.append('prompt', prompt);
  }

  const response = await fetch(config.endpoint || DEFAULT_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: formData,
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const text = data.text || '';

  return {
    text,
    rawResponse: JSON.stringify(data),
    isMock: false,
  };
}
