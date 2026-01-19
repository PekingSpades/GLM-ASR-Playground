/**
 * Mock ASR service.
 *
 * Used when no API key is provided.
 * Simulates realistic streaming responses.
 */

import { Locale, defaultLocale } from '@/i18n/config';

// Model introduction snippets per locale.
const MODEL_INTRO_SEGMENTS: Record<Locale, string[]> = {
  en: [
    "GLM-ASR-Nano-2512 is a robust, open-source speech recognition model with 1.5B parameters.",
    "Designed for real-world complexity, it outperforms OpenAI Whisper V3 on multiple benchmarks while maintaining a compact size.",
    "Key capabilities include:",
    "Exceptional dialect support: beyond standard Mandarin and English, it is highly optimized for Cantonese and other dialects, bridging gaps in dialectal recognition.",
    "Low-volume speech robustness: trained for whisper or quiet speech, it captures and accurately transcribes extremely low-volume audio that traditional models often miss.",
    "SOTA performance: it achieves the lowest average error rate (4.10) among comparable open-source models, with clear advantages on Chinese benchmarks like Wenet Meeting and Aishell-1.",
  ],
  zh: [
    "GLM-ASR-Nano-2512 是一个稳健的开源语音识别模型，拥有 15 亿参数。",
    "面向真实场景设计，在保持紧凑体量的同时，在多项基准上超越 OpenAI Whisper V3。",
    "核心能力包括：",
    "方言支持出色：除普通话和英语外，对粤语等方言做了深度优化，弥补方言识别差距。",
    "低音量语音鲁棒：针对耳语/轻声训练，能捕捉并准确转写极低音量语音。",
    "SOTA 表现：在同类开源模型中取得最低平均错误率（4.10），在 Wenet Meeting、Aishell-1 等中文基准上优势明显。",
  ],
  ja: [
    "GLM-ASR-Nano-2512 は 15 億パラメータの堅牢なオープンソース音声認識モデルです。",
    "実運用の複雑さを想定して設計され、コンパクトさを保ちながら複数ベンチマークで OpenAI Whisper V3 を上回ります。",
    "主な特長：",
    "方言対応：標準中国語と英語に加え、広東語などの方言に最適化し、方言認識のギャップを埋めます。",
    "低音量音声の強さ：ささやき/小声向けに訓練され、極小音量も正確に書き起こします。",
    "SOTA 性能：同等のオープンソースモデルで最低平均誤り率（4.10）を達成し、Wenet Meeting、Aishell-1 などの中国語ベンチマークで優位です。",
  ],
  ko: [
    "GLM-ASR-Nano-2512는 15억 파라미터 규모의 견고한 오픈 소스 음성 인식 모델입니다.",
    "현실 환경의 복잡성을 고려해 설계되어, 컴팩트한 크기를 유지하면서 여러 벤치마크에서 OpenAI Whisper V3를 능가합니다.",
    "핵심 기능:",
    "탁월한 방언 지원: 표준 중국어와 영어뿐 아니라 광둥어 등 방언에 최적화되어 방언 인식 격차를 줄입니다.",
    "저음량 음성 강인성: 속삭임/작은 목소리 상황에 맞춰 학습되어 매우 낮은 음량도 정확히 전사합니다.",
    "SOTA 성능: 동급 오픈 소스 모델 중 최저 평균 오류율(4.10)을 기록하며 Wenet Meeting, Aishell-1 등 중국어 벤치마크에서 우수합니다.",
  ],
  es: [
    "GLM-ASR-Nano-2512 es un modelo robusto de reconocimiento de voz de código abierto con 1,5 mil millones de parámetros.",
    "Diseñado para la complejidad del mundo real, supera a OpenAI Whisper V3 en múltiples benchmarks manteniendo un tamaño compacto.",
    "Capacidades clave:",
    "Soporte excepcional de dialectos: además del mandarín y el inglés estándar, está muy optimizado para el cantonés y otros dialectos, cerrando la brecha en el reconocimiento dialectal.",
    "Robustez en voz de bajo volumen: entrenado para escenarios de susurro o voz baja, captura y transcribe con precisión audio extremadamente bajo que otros modelos suelen pasar por alto.",
    "Rendimiento SOTA: logra la menor tasa media de error (4,10) entre modelos de código abierto comparables, con ventaja clara en benchmarks chinos como Wenet Meeting y Aishell-1.",
  ],
  fr: [
    "GLM-ASR-Nano-2512 est un modèle robuste de reconnaissance vocale open source de 1,5 milliard de paramètres.",
    "Conçu pour la complexité du monde réel, il surpasse OpenAI Whisper V3 sur plusieurs benchmarks tout en restant compact.",
    "Capacités clés :",
    "Excellent support des dialectes : au-delà du mandarin et de l'anglais standards, il est fortement optimisé pour le cantonais et d'autres dialectes, comblant le manque en reconnaissance dialectale.",
    "Robustesse en faible volume : entraîné pour le chuchotement ou la voix faible, il capte et transcrit avec précision des niveaux très bas souvent manqués.",
    "Performance SOTA : il atteint le plus faible taux d'erreur moyen (4,10) parmi les modèles open source comparables, avec un avantage net sur les benchmarks chinois comme Wenet Meeting et Aishell-1.",
  ],
  de: [
    "GLM-ASR-Nano-2512 ist ein robustes Open-Source-Spracherkennungsmodell mit 1,5 Milliarden Parametern.",
    "Für die Komplexität realer Anwendungen entwickelt, übertrifft es OpenAI Whisper V3 in mehreren Benchmarks bei kompakter Größe.",
    "Wichtige Fähigkeiten:",
    "Hervorragende Dialektunterstützung: neben Standard-Mandarin und Englisch ist es für Kantonesisch und andere Dialekte stark optimiert und schließt die Lücke in der Dialekterkennung.",
    "Robustheit bei leiser Sprache: für Flüstern oder leise Sprache trainiert, erfasst es extrem leise Audioanteile, die traditionelle Modelle oft übersehen.",
    "SOTA-Leistung: erzielt die niedrigste durchschnittliche Fehlerrate (4,10) unter vergleichbaren Open-Source-Modellen und überzeugt auf chinesischen Benchmarks wie Wenet Meeting und Aishell-1.",
  ],
  pt: [
    "GLM-ASR-Nano-2512 é um modelo robusto de reconhecimento de fala de código aberto com 1,5 bilhão de parâmetros.",
    "Projetado para a complexidade do mundo real, supera o OpenAI Whisper V3 em vários benchmarks mantendo um tamanho compacto.",
    "Principais capacidades:",
    "Suporte excepcional a dialetos: além do mandarim e do inglês padrão, é altamente otimizado para cantonês e outros dialetos, reduzindo a lacuna na transcrição dialetal.",
    "Robustez em baixo volume: treinado para cenários de sussurro ou voz baixa, captura e transcreve com precisão áudio extremamente baixo que modelos tradicionais costumam perder.",
    "Desempenho SOTA: alcança a menor taxa média de erro (4,10) entre modelos de código aberto comparáveis, com vantagem clara em benchmarks chineses como Wenet Meeting e Aishell-1.",
  ],
  ru: [
    "GLM-ASR-Nano-2512 — надёжная модель распознавания речи с открытым исходным кодом и 1,5 млрд параметров.",
    "Она создана для реальных сценариев и превосходит OpenAI Whisper V3 на нескольких бенчмарках, сохраняя компактность.",
    "Ключевые возможности:",
    "Отличная поддержка диалектов: помимо стандартного китайского и английского, модель оптимизирована для кантонского и других диалектов, закрывая разрыв в диалектном распознавании.",
    "Устойчивость к низкой громкости: обучена на сценариях шёпота или тихой речи и точно распознаёт очень тихий звук.",
    "SOTA-результаты: самая низкая средняя ошибка (4,10) среди сопоставимых моделей с открытым исходным кодом, с явным преимуществом на китайских бенчмарках вроде Wenet Meeting и Aishell-1.",
  ],
  ar: [
    "GLM-ASR-Nano-2512 نموذج قوي للتعرّف على الكلام مفتوح المصدر يضم 1.5 مليار معلمة.",
    "صُمم لتعقيدات الواقع، ويتفوّق على OpenAI Whisper V3 في عدة معايير مع الحفاظ على حجم مدمج.",
    "تشمل القدرات الرئيسية:",
    "دعم مميز للهجات: إلى جانب الماندرين والإنجليزية القياسيين، تم تحسينه بشكل كبير للهجة الكانتونية وغيرها من اللهجات، ما يسد فجوة التعرف على اللهجات.",
    "الصلابة مع الصوت منخفض الشدة: مُدرّب على سيناريوهات الهمس أو الصوت الخافت، فيلتقط ويحوّل بدقة الصوت منخفض المستوى الذي تفوته النماذج التقليدية.",
    "أداء SOTA: يحقق أقل معدل خطأ متوسط (4.10) بين النماذج المفتوحة المصدر المماثلة، مع تفوق واضح في المعايير الصينية مثل Wenet Meeting وAishell-1.",
  ],
  hi: [
    "GLM-ASR-Nano-2512 1.5 अरब पैरामीटर वाला मजबूत ओपन-सोर्स स्पीच रिकग्निशन मॉडल है।",
    "वास्तविक दुनिया की जटिलताओं के लिए बनाया गया, यह कॉम्पैक्ट आकार बनाए रखते हुए कई बेंचमार्क पर OpenAI Whisper V3 से बेहतर है।",
    "मुख्य क्षमताएँ:",
    "उत्कृष्ट बोली समर्थन: मानक मंदारिन और अंग्रेजी के अलावा, यह कैंटोनीज़ और अन्य बोलियों के लिए अत्यधिक अनुकूलित है, जिससे बोली पहचान की कमी भरती है।",
    "कम आवाज में मजबूती: फुसफुसाहट या धीमी आवाज के लिए प्रशिक्षित, यह बेहद कम आवाज को भी सटीक रूप से ट्रांसक्राइब करता है।",
    "SOTA प्रदर्शन: तुलनीय ओपन-सोर्स मॉडलों में सबसे कम औसत त्रुटि दर (4.10) हासिल करता है, और Wenet Meeting व Aishell-1 जैसे चीनी बेंचमार्क पर स्पष्ट बढ़त दिखाता है।",
  ],
  it: [
    "GLM-ASR-Nano-2512 è un modello robusto di riconoscimento vocale open source con 1,5 miliardi di parametri.",
    "Progettato per la complessità del mondo reale, supera OpenAI Whisper V3 in diversi benchmark mantenendo dimensioni compatte.",
    "Capacità chiave:",
    "Supporto dialettale eccellente: oltre al mandarino e all'inglese standard, è fortemente ottimizzato per il cantonese e altri dialetti, colmando il divario nella trascrizione dialettale.",
    "Robustezza con volume basso: addestrato per scenari di sussurro o voce bassa, cattura e trascrive con precisione audio estremamente basso che i modelli tradizionali spesso perdono.",
    "Prestazioni SOTA: raggiunge il più basso tasso medio di errore (4,10) tra modelli open source comparabili, con vantaggi nei benchmark cinesi come Wenet Meeting e Aishell-1.",
  ],
};

const BREAK_CHARS = new Set([
  '.', ',', '!', '?', ';', ':',
  '。', '，', '、', '！', '？', '；', '：',
  '،', '؛', '؟',
]);

const WINDOW_SIZE = 2;

function getSegments(locale?: Locale): string[] {
  const resolvedLocale = locale ?? defaultLocale;
  return MODEL_INTRO_SEGMENTS[resolvedLocale] || MODEL_INTRO_SEGMENTS[defaultLocale];
}

function buildSegmentText(segments: string[], segmentIndex: number): string {
  if (segments.length === 0) return '';

  const windowSize = Math.min(WINDOW_SIZE, segments.length);
  const startIndex = (segmentIndex * windowSize) % segments.length;
  const chunk: string[] = [];

  for (let i = 0; i < windowSize; i++) {
    chunk.push(segments[(startIndex + i) % segments.length]);
  }

  return chunk.join(' ');
}

function truncateText(text: string, targetLength: number): string {
  if (text.length <= targetLength) return text;

  let cutPoint = targetLength;
  const lowerBound = Math.max(0, targetLength - 20);

  for (let i = targetLength - 1; i >= lowerBound; i--) {
    const ch = text[i];
    if (ch === ' ' || ch === '\n' || BREAK_CHARS.has(ch)) {
      cutPoint = i + 1;
      break;
    }
  }

  return text.slice(0, cutPoint).trimEnd();
}

/**
 * Generate a mock transcript based on time range.
 */
export function generateMockTranscript(
  startTime: number,
  endTime: number,
  context?: string,
  locale?: Locale,
  segmentIndex?: number
): string {
  const duration = endTime - startTime;
  const segments = getSegments(locale);

  // Choose a segment window by segment index when available.
  const resolvedIndex =
    typeof segmentIndex === 'number' ? segmentIndex : Math.floor(startTime / 3);
  const baseText = buildSegmentText(segments, resolvedIndex);

  // Adjust text length by duration
  const charsPerSecond = 6; // Roughly 6 characters per second
  const targetLength = Math.max(1, Math.floor(duration * charsPerSecond));

  return truncateText(baseText, targetLength);
}

/**
 * Create a mock streaming generator.
 */
export async function* mockStreamGenerator(
  text: string,
  chunkSize: number = 2,
  delayMs: number = 100
): AsyncGenerator<{ text: string; is_final: boolean }> {
  let currentIndex = 0;

  while (currentIndex < text.length) {
    await new Promise((resolve) => setTimeout(resolve, delayMs));

    const endIndex = Math.min(currentIndex + chunkSize, text.length);
    const chunk = text.slice(0, endIndex);
    const isFinal = endIndex >= text.length;

    yield {
      text: chunk,
      is_final: isFinal,
    };

    currentIndex = endIndex;
  }
}

/**
 * Mock API call (non-streaming).
 */
export async function mockTranscribe(
  audioBlob: Blob,
  audioDuration: number,
  context?: string,
  locale?: Locale,
  segmentIndex?: number
): Promise<{ text: string }> {
  // Simulate network latency
  const delay = 300 + Math.random() * 500;
  await new Promise((resolve) => setTimeout(resolve, delay));

  const text = generateMockTranscript(0, audioDuration, context, locale, segmentIndex);

  return { text };
}

/**
 * Mock API call (streaming).
 */
export function mockTranscribeStream(
  audioBlob: Blob,
  audioDuration: number,
  context?: string,
  locale?: Locale,
  segmentIndex?: number
): ReadableStream<Uint8Array> {
  const text = generateMockTranscript(0, audioDuration, context, locale, segmentIndex);
  const encoder = new TextEncoder();

  let currentIndex = 0;
  const chunkSize = 2;

  return new ReadableStream({
    async pull(controller) {
      if (currentIndex >= text.length) {
        // Send final message
        const finalData = `data: ${JSON.stringify({ text, is_final: true })}\n\n`;
        controller.enqueue(encoder.encode(finalData));
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
        return;
      }

      // Simulate delay
      await new Promise((resolve) => setTimeout(resolve, 50 + Math.random() * 50));

      const endIndex = Math.min(currentIndex + chunkSize, text.length);
      const partialText = text.slice(0, endIndex);

      const data = `data: ${JSON.stringify({ text: partialText, is_final: false })}\n\n`;
      controller.enqueue(encoder.encode(data));

      currentIndex = endIndex;
    },
  });
}
