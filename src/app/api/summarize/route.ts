import Anthropic from '@anthropic-ai/sdk';
import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { transcript, patientNumber, apiKey: clientApiKey } = await request.json();

    if (!transcript || typeof transcript !== 'string') {
      return Response.json({ error: '유효한 녹취록이 필요합니다.' }, { status: 400 });
    }

    if (!patientNumber || typeof patientNumber !== 'number') {
      return Response.json({ error: '환자 번호가 필요합니다.' }, { status: 400 });
    }

    const effectiveApiKey = clientApiKey || process.env.ANTHROPIC_API_KEY;

    if (!effectiveApiKey) {
      return Response.json(
        { error: 'API_KEY_MISSING' },
        { status: 401 }
      );
    }

    const client = new Anthropic({ apiKey: effectiveApiKey });

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: `당신은 숙련된 의료 기록 요약 전문가입니다.
의사와 환자 사이의 진료 대화를 분석하여 구조화된 의료 요약을 제공합니다.
반드시 유효한 JSON 형식으로만 응답하세요. 다른 텍스트는 포함하지 마세요.
의학 용어는 정확하게 사용하되, 이해하기 쉽게 설명하세요.`,
      messages: [
        {
          role: 'user',
          content: `다음은 진료실에서 ${patientNumber}번 환자의 진료 내용입니다. 아래 형식의 JSON으로 요약해주세요:

{
  "chiefComplaint": "주요 호소 증상 (한 문장)",
  "symptoms": ["증상1", "증상2", "증상3"],
  "assessment": "의사의 평가 또는 진단 (한두 문장)",
  "plan": "치료 계획 또는 처방 지시 (한두 문장)",
  "medications": ["약물1", "약물2"],
  "rawText": "${transcript.replace(/"/g, '\\"').slice(0, 200)}..."
}

주의사항:
- chiefComplaint: 환자가 주로 호소하는 증상을 간결하게
- symptoms: 언급된 모든 증상을 배열로
- assessment: 의사의 판단이나 진단명
- plan: 치료 방향, 처방, 재진 일정 등
- medications: 처방된 약물 목록 (없으면 빈 배열)
- rawText는 입력 텍스트의 처음 200자

진료 내용:
${transcript}`,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      return Response.json({ error: '예상치 못한 응답 형식' }, { status: 500 });
    }

    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return Response.json(
        { error: 'AI 응답에서 JSON을 찾을 수 없습니다.' },
        { status: 500 }
      );
    }

    let summary;
    try {
      summary = JSON.parse(jsonMatch[0]);
    } catch {
      return Response.json(
        { error: 'AI 응답을 파싱할 수 없습니다.' },
        { status: 500 }
      );
    }

    const required = ['chiefComplaint', 'symptoms', 'assessment', 'plan'];
    for (const field of required) {
      if (!summary[field]) {
        summary[field] = field === 'symptoms' ? [] : '정보 없음';
      }
    }

    if (!Array.isArray(summary.symptoms)) summary.symptoms = [];
    if (!Array.isArray(summary.medications)) summary.medications = [];
    if (!summary.rawText) summary.rawText = transcript.slice(0, 200);

    return Response.json(summary);
  } catch (error) {
    console.error('Summarize API error:', error);

    if (error instanceof Anthropic.APIError) {
      return Response.json(
        { error: `Anthropic API 오류: ${error.message}` },
        { status: error.status ?? 500 }
      );
    }

    return Response.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
