import { Session, Patient, TranscriptSegment } from '@/types';
import { formatDuration, formatTimestamp } from './patientDetector';

export function buildTxtContent(session: Session): string {
  const lines: string[] = [];

  lines.push('====================================');
  lines.push('진료 녹음 세션 기록');
  lines.push('====================================');
  lines.push(`세션 ID: ${session.id}`);
  lines.push(`시작 시간: ${new Date(session.startTime).toLocaleString('ko-KR')}`);
  if (session.endTime) {
    lines.push(`종료 시간: ${new Date(session.endTime).toLocaleString('ko-KR')}`);
  }
  lines.push(`총 시간: ${formatDuration(session.duration)}`);
  lines.push(`환자 수: ${session.patients.length}명`);
  lines.push('');

  if (session.patients.some((p) => p.summary)) {
    lines.push('====================================');
    lines.push('환자별 요약');
    lines.push('====================================');

    session.patients.forEach((patient) => {
      lines.push('');
      lines.push(`--- ${patient.number}번 환자${patient.name ? ` (${patient.name})` : ''} ---`);
      lines.push(`진료 시작: ${formatTimestamp(session.startTime + patient.startTime)}`);
      if (patient.endTime) {
        lines.push(`진료 종료: ${formatTimestamp(session.startTime + patient.endTime)}`);
      }

      if (patient.summary) {
        lines.push('');
        lines.push(`주訴: ${patient.summary.chiefComplaint}`);
        lines.push(`증상: ${patient.summary.symptoms.join(', ')}`);
        lines.push(`평가/진단: ${patient.summary.assessment}`);
        lines.push(`치료 계획: ${patient.summary.plan}`);
        if (patient.summary.medications && patient.summary.medications.length > 0) {
          lines.push(`처방 약물: ${patient.summary.medications.join(', ')}`);
        }
      }
    });

    lines.push('');
  }

  lines.push('====================================');
  lines.push('전체 녹취록');
  lines.push('====================================');
  lines.push('');

  let currentPatientId: string | undefined;

  session.transcript
    .filter((s) => !s.isInterim)
    .forEach((segment) => {
      if (segment.patientId && segment.patientId !== currentPatientId) {
        currentPatientId = segment.patientId;
        const patient = session.patients.find((p) => p.id === currentPatientId);
        if (patient) {
          lines.push('');
          lines.push(`=== ${patient.number}번 환자${patient.name ? ` (${patient.name})` : ''} 시작 ===`);
          lines.push('');
        }
      }
      lines.push(`[${formatTimestamp(segment.timestamp)}] ${segment.text}`);
    });

  lines.push('');
  lines.push('====================================');
  lines.push(`내보내기 시간: ${new Date().toLocaleString('ko-KR')}`);
  lines.push('====================================');

  return lines.join('\n');
}

export function exportTXT(session: Session): void {
  const content = buildTxtContent(session);
  const blob = new Blob(['\uFEFF' + content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `진료기록_${new Date(session.startTime).toISOString().slice(0, 10)}_${session.id.slice(0, 8)}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function exportPDF(session: Session): Promise<void> {
  const [{ jsPDF }, html2canvas] = await Promise.all([
    import('jspdf'),
    import('html2canvas'),
  ]);

  // Build an off-screen HTML element with full Korean content
  const container = document.createElement('div');
  container.style.cssText = [
    'position:fixed',
    'left:-9999px',
    'top:0',
    'width:794px',          // A4 @ 96dpi
    'background:#ffffff',
    'color:#1e293b',
    'font-family:"Malgun Gothic","Apple SD Gothic Neo",sans-serif',
    'font-size:13px',
    'line-height:1.6',
    'padding:40px',
    'box-sizing:border-box',
  ].join(';');

  const dateStr = new Date(session.startTime).toLocaleString('ko-KR');
  const durationStr = formatDuration(session.duration);

  const patientRows = session.patients.map((patient) => {
    const segments = session.transcript
      .filter((s) => s.patientId === patient.id && !s.isInterim)
      .map((s) => `<span style="color:#64748b;font-size:11px">[${formatTimestamp(s.timestamp)}]</span> ${s.text}`)
      .join('<br>');

    const summaryHTML = patient.summary
      ? `
        <div style="margin-top:8px">
          <p><strong>주訴:</strong> ${patient.summary.chiefComplaint}</p>
          <p><strong>증상:</strong> ${patient.summary.symptoms.join(', ')}</p>
          <p><strong>평가/진단:</strong> ${patient.summary.assessment}</p>
          <p><strong>치료 계획:</strong> ${patient.summary.plan}</p>
          ${patient.summary.medications?.length ? `<p><strong>처방 약물:</strong> ${patient.summary.medications.join(', ')}</p>` : ''}
        </div>`
      : '<p style="color:#94a3b8">AI 요약 없음</p>';

    return `
      <div style="margin-bottom:24px;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">
        <div style="background:#3b82f6;color:#fff;padding:10px 14px;font-size:14px;font-weight:bold">
          ${patient.number}번 환자${patient.name ? ` — ${patient.name}` : ''}
          <span style="font-weight:normal;font-size:12px;margin-left:8px">${formatTimestamp(session.startTime + patient.startTime)}</span>
        </div>
        <div style="padding:12px 14px">
          ${summaryHTML}
          ${segments ? `
            <div style="margin-top:10px;border-top:1px solid #f1f5f9;padding-top:10px">
              <strong>녹취록</strong><br>
              <div style="margin-top:6px;color:#334155;font-size:12px;line-height:1.7">${segments}</div>
            </div>` : ''}
        </div>
      </div>`;
  }).join('');

  container.innerHTML = `
    <div style="background:#0f172a;color:#fff;padding:18px 24px;margin:-40px -40px 28px;border-radius:0">
      <div style="font-size:18px;font-weight:bold">진료 녹음 보고서</div>
      <div style="font-size:12px;color:#94a3b8;margin-top:4px">Clinic Audio Recorder</div>
    </div>

    <table style="width:100%;border-collapse:collapse;margin-bottom:24px;font-size:12px">
      <tr>
        <td style="padding:4px 0;color:#64748b;width:100px">세션 ID</td>
        <td>${session.id}</td>
        <td style="padding:4px 0;color:#64748b;width:80px">시작 시간</td>
        <td>${dateStr}</td>
      </tr>
      <tr>
        <td style="padding:4px 0;color:#64748b">총 시간</td>
        <td>${durationStr}</td>
        <td style="padding:4px 0;color:#64748b">환자 수</td>
        <td>${session.patients.length}명</td>
      </tr>
    </table>

    ${patientRows}

    <div style="margin-top:16px;border-top:1px solid #e2e8f0;padding-top:10px;font-size:11px;color:#94a3b8;text-align:right">
      내보내기: ${new Date().toLocaleString('ko-KR')}
    </div>
  `;

  document.body.appendChild(container);

  try {
    // A4 dimensions in mm
    const A4_W = 210;
    const A4_H = 297;
    const SCALE = 2; // retina

    const canvas = await html2canvas.default(container, {
      scale: SCALE,
      useCORS: true,
      backgroundColor: '#ffffff',
      width: container.offsetWidth,
      windowWidth: container.offsetWidth,
    });

    const imgW = A4_W;
    const imgH = (canvas.height / canvas.width) * imgW;

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    // If content is taller than one page, slice into pages
    if (imgH <= A4_H) {
      doc.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, imgW, imgH);
    } else {
      const pageHeightPx = Math.floor((A4_H / imgW) * canvas.width);
      let offsetY = 0;
      let isFirst = true;

      while (offsetY < canvas.height) {
        const sliceH = Math.min(pageHeightPx, canvas.height - offsetY);
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvas.width;
        pageCanvas.height = sliceH;
        const ctx = pageCanvas.getContext('2d')!;
        ctx.drawImage(canvas, 0, offsetY, canvas.width, sliceH, 0, 0, canvas.width, sliceH);

        const sliceImgH = (sliceH / canvas.width) * imgW;
        if (!isFirst) doc.addPage();
        doc.addImage(pageCanvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, imgW, sliceImgH);

        offsetY += sliceH;
        isFirst = false;
      }
    }

    doc.save(
      `진료기록_${new Date(session.startTime).toISOString().slice(0, 10)}_${session.id.slice(0, 8)}.pdf`
    );
  } finally {
    document.body.removeChild(container);
  }
}
