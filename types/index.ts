/**
 * ASR Demo - Type Definitions
 */

// API request/response types (based on Zhipu docs)
export interface ASRRequestParams {
  file: Blob;                    // Audio file, supports .wav/.mp3, <=25MB, <=30s
  file_base64?: string;          // Base64 audio payload (use with file)
  model: string;                 // Model id, default GLM-ASR-2512
  prompt?: string;               // Long-form context, suggested <8000 chars
  hotwords?: string[];           // Hotword list, suggested <=100 items
  stream?: boolean;              // Stream response, default false
  request_id?: string;           // Request id
  user_id?: string;              // End user id
}

// Non-streaming response
export interface ASRResponse {
  id: string;                    // Task id
  created: number;               // Unix timestamp (seconds)
  request_id?: string;           // Request id
  model: string;                 // Model name
  text: string;                  // Full transcription text
}

// Streaming response
export interface ASRStreamResponse {
  id: string;                    // Task id
  created: number;               // Unix timestamp (seconds)
  model: string;                 // Model name
  type: 'transcript.text.delta' | 'transcript.text.done';  // Event type
  delta: string;                 // Incremental transcript
}

// API error response
export interface ASRError {
  error: {
    code: string;
    message: string;
  };
}

// Inference record
export interface InferenceRecord {
  id: string;
  timestamp: number;
  audioStartTime: number;  // Slice start time (seconds)
  audioEndTime: number;    // Slice end time (seconds)
  audioDuration: number;   // Slice duration (seconds)
  prompt: string;          // Prompt context
  rawResponse: string;     // Raw API response
  previewText: string;     // Latest preview text
  status: 'pending' | 'streaming' | 'completed' | 'error';
  error?: string;
  requestSequence: number; // Sequence number for out-of-order handling
  segmentIndex: number;    // Owning segment index
}

// Segment record
export interface SegmentRecord {
  id: string;
  index: number;               // Segment index (0, 1, 2...)
  startTime: number;           // Segment start time (seconds)
  endTime: number;             // Segment end time (seconds)
  text: string;                // Finalized text for this segment
  status: 'active' | 'committed';  // active=current, committed=finalized
}

// Engine state
export interface ASREngineState {
  isRunning: boolean;
  isPaused: boolean;
  currentTime: number;         // Current capture time (seconds)
  totalDuration: number;       // Total audio duration (seconds)
  segmentStartTime: number;    // Current segment start time
  confirmedText: string;       // Finalized text
  previewText: string;         // Current preview text
  segmentCount: number;        // Segment count
}

// Config
export interface ASRConfig {
  segmentDuration: number;     // Segment duration (seconds), default 10
  chunkInterval: number;       // Chunk interval (ms), default 200
  apiKey: string;
  model: string;
}

export const DEFAULT_CONFIG: ASRConfig = {
  segmentDuration: 10,
  chunkInterval: 200,
  apiKey: '',
  model: 'GLM-ASR-2512',
};

// Timeline segment type (segment timeline view)
export interface TimelineSegment {
  id: string;
  trackIndex: number;          // Segment index for display
  startTime: number;           // Segment start time (seconds)
  endTime: number;             // Segment end time (seconds)
  text: string;                // Segment transcript text
  status: 'active' | 'committed';  // active=current, committed=finalized
}
