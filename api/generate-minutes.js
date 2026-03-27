// Gemini models fallback order
const MODELS = [
  'gemini-2.5-flash',
  'gemini-3-flash',
  'gemini-2.5-flash-lite',
  'gemini-3-flash',
  'gemini-3.1-flash-lite',
];

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
  }

  try {
    const { nodes, edges, metadata } = req.body;

    const nodesText = nodes
      .map((n, i) => {
        let line = `${i + 1}. ${n.text}`;
        if (n.memo) line += ` (메모: ${n.memo})`;
        if (n.createdFrom && n.createdFrom.length > 0) line += ' [조합 생성됨]';
        return line;
      })
      .join('\n');

    const edgesText = edges
      .map((e) => {
        const src = nodes.find((n) => n.id === e.source);
        const tgt = nodes.find((n) => n.id === e.target);
        return `- ${src?.text || '?'} → ${tgt?.text || '?'} (${e.relationType || '관련'})`;
      })
      .join('\n');

    const prompt = `당신은 전문적인 회의록 작성 도우미입니다.
아래 브레인스토밍 데이터를 분석하여 두 가지를 생성해주세요.

## 회의 정보
- 일시: ${metadata.date}
- 부서: ${metadata.department}
- 주제: ${metadata.topic}
- 참석자: ${metadata.attendees || '미기재'}

## 브레인스토밍 노드 (아이디어/안건)
${nodesText}

## 노드 간 연결 관계
${edgesText || '없음'}

---

아래 형식으로 JSON을 생성해주세요. 반드시 유효한 JSON만 출력하세요.

{
  "emailSummary": "메일 본문에 바로 붙여넣을 수 있는 텍스트. 아래 구조를 따를 것:\\n\\n■ 회의 개요\\n- 일시: ...\\n- 주제: ...\\n- 총 N건의 안건이 논의되었으며, 주요 후속 조치 N건이 도출되었습니다.\\n\\n■ 주요 논의 사항\\n- 핵심 안건 요약 (5개 이내)\\n\\n■ 주요 후속 조치\\n- 액션 아이템 목록",
  "minutes": {
    "title": "회의 제목",
    "date": "일시",
    "department": "부서",
    "topic": "주제",
    "attendees": "참석자",
    "agendas": [
      {
        "no": 1,
        "title": "안건 제목",
        "detail": "세부 내용 / 논의 사항",
        "status": "진행/보류/완료 등 (선택)"
      }
    ],
    "actionItems": [
      {
        "item": "항목",
        "content": "내용",
        "note": "비고"
      }
    ],
    "summary": "전체 회의 요약 (2-3문장)"
  }
}

중요:
- 브레인스토밍 노드를 논리적으로 그룹화하고 정리해서 안건으로 변환
- 연결 관계를 참고하여 관련 안건끼리 묶기
- 후속 조치가 필요한 항목은 actionItems로 도출
- JSON만 출력하고 다른 텍스트는 포함하지 마세요`;

    const requestBody = JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 4096,
      },
    });

    // Try each model in fallback order
    let lastError = null;
    for (const model of MODELS) {
      try {
        console.log(`Trying model: ${model}`);
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: requestBody,
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.log(`Model ${model} failed: ${response.status} - ${errorText}`);
          lastError = `${model}: ${response.status}`;
          continue; // Try next model
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) {
          console.log(`Model ${model}: no text in response`);
          lastError = `${model}: 응답 없음`;
          continue;
        }

        // Extract JSON from response (handle markdown code blocks)
        const jsonMatch = text.match(/```json\s*([\s\S]*?)```/) || text.match(/\{[\s\S]*\}/);
        const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : text;

        const result = JSON.parse(jsonStr.trim());
        console.log(`Success with model: ${model}`);
        return res.status(200).json(result);
      } catch (err) {
        console.log(`Model ${model} error: ${err.message}`);
        lastError = `${model}: ${err.message}`;
        continue;
      }
    }

    // All models failed
    return res.status(503).json({
      error: '토큰 부족으로 회의록을 작성할 수 없습니다. 잠시 후 다시 시도해주세요.',
      detail: lastError,
    });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
