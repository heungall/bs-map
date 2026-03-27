import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface MinutesData {
  title: string;
  date: string;
  department: string;
  topic: string;
  attendees: string;
  agendas: { no: number; title: string; detail: string; status?: string }[];
  actionItems: { item: string; content: string; note: string }[];
  summary: string;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function generateMinutesPDF(data: MinutesData) {
  const html = `
    <div style="
      width: 900px;
      padding: 48px 56px;
      font-family: 'Noto Sans KR', 'Malgun Gothic', sans-serif;
      color: #222;
      background: #fff;
      line-height: 1.6;
    ">
      <!-- Header -->
      <div style="
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-bottom: 16px;
        border-bottom: 3px solid #2c3e6b;
        margin-bottom: 24px;
      ">
        <div style="font-size: 22px; font-weight: 700; color: #2c3e6b;">
          ${escapeHtml(data.title)}
        </div>
        <div style="font-size: 12px; color: #888;">
          회의록 · ${escapeHtml(data.date)}
        </div>
      </div>

      <!-- Meta table -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 28px; font-size: 13px;">
        <tr>
          <td style="padding: 8px 14px; background: #f4f6fa; font-weight: 600; color: #2c3e6b; width: 80px; border: 1px solid #dde1e8;">일시</td>
          <td style="padding: 8px 14px; border: 1px solid #dde1e8;">${escapeHtml(data.date)}</td>
          <td style="padding: 8px 14px; background: #f4f6fa; font-weight: 600; color: #2c3e6b; width: 80px; border: 1px solid #dde1e8;">부서</td>
          <td style="padding: 8px 14px; border: 1px solid #dde1e8;">${escapeHtml(data.department)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 14px; background: #f4f6fa; font-weight: 600; color: #2c3e6b; border: 1px solid #dde1e8;">주제</td>
          <td style="padding: 8px 14px; border: 1px solid #dde1e8;">${escapeHtml(data.topic)}</td>
          <td style="padding: 8px 14px; background: #f4f6fa; font-weight: 600; color: #2c3e6b; border: 1px solid #dde1e8;">작성일</td>
          <td style="padding: 8px 14px; border: 1px solid #dde1e8;">${new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
        </tr>
        ${data.attendees ? `
        <tr>
          <td style="padding: 8px 14px; background: #f4f6fa; font-weight: 600; color: #2c3e6b; border: 1px solid #dde1e8;">참석자</td>
          <td colspan="3" style="padding: 8px 14px; border: 1px solid #dde1e8;">${escapeHtml(data.attendees)}</td>
        </tr>
        ` : ''}
      </table>

      <!-- Agendas -->
      <div style="font-size: 15px; font-weight: 700; color: #222; margin-bottom: 12px;">
        ■ 논의 안건 (총 ${data.agendas.length}건)
      </div>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 28px; font-size: 12.5px;">
        <thead>
          <tr style="background: #f4f6fa;">
            <th style="padding: 10px 12px; border: 1px solid #dde1e8; color: #2c3e6b; font-weight: 600; width: 45px; text-align: center;">No.</th>
            <th style="padding: 10px 12px; border: 1px solid #dde1e8; color: #2c3e6b; font-weight: 600; width: 200px; text-align: left;">안건</th>
            <th style="padding: 10px 12px; border: 1px solid #dde1e8; color: #2c3e6b; font-weight: 600; text-align: left;">세부 내용 / 논의 사항</th>
          </tr>
        </thead>
        <tbody>
          ${data.agendas.map((a) => `
            <tr>
              <td style="padding: 9px 12px; border: 1px solid #dde1e8; text-align: center; color: #666;">${String(a.no).padStart(2, '0')}</td>
              <td style="padding: 9px 12px; border: 1px solid #dde1e8; font-weight: 600;">
                ${escapeHtml(a.title)}
                ${a.status ? `<span style="font-size: 10px; color: #e67e22; font-weight: 400; margin-left: 6px;">${escapeHtml(a.status)}</span>` : ''}
              </td>
              <td style="padding: 9px 12px; border: 1px solid #dde1e8; color: #444;">${escapeHtml(a.detail)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <!-- Action Items -->
      ${data.actionItems.length > 0 ? `
        <div style="font-size: 15px; font-weight: 700; color: #222; margin-bottom: 12px;">
          ■ 후속 조치 (Action Items)
        </div>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 28px; font-size: 12.5px;">
          <thead>
            <tr style="background: #f4f6fa;">
              <th style="padding: 10px 12px; border: 1px solid #dde1e8; color: #2c3e6b; font-weight: 600; width: 160px; text-align: left;">항목</th>
              <th style="padding: 10px 12px; border: 1px solid #dde1e8; color: #2c3e6b; font-weight: 600; text-align: left;">내용</th>
              <th style="padding: 10px 12px; border: 1px solid #dde1e8; color: #2c3e6b; font-weight: 600; width: 140px; text-align: left;">비고</th>
            </tr>
          </thead>
          <tbody>
            ${data.actionItems.map((a) => `
              <tr>
                <td style="padding: 9px 12px; border: 1px solid #dde1e8; font-weight: 600;">${escapeHtml(a.item)}</td>
                <td style="padding: 9px 12px; border: 1px solid #dde1e8; color: #444;">${escapeHtml(a.content)}</td>
                <td style="padding: 9px 12px; border: 1px solid #dde1e8; color: #888;">${escapeHtml(a.note)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : ''}

      <!-- Summary -->
      ${data.summary ? `
        <div style="
          background: #f8f9fb;
          border-left: 3px solid #2c3e6b;
          padding: 14px 18px;
          font-size: 13px;
          color: #444;
          border-radius: 0 8px 8px 0;
          margin-bottom: 28px;
        ">
          ${escapeHtml(data.summary)}
        </div>
      ` : ''}

      <!-- Footer -->
      <div style="
        text-align: right;
        font-size: 11px;
        color: #aaa;
        padding-top: 16px;
        border-top: 1px solid #e8e8e8;
      ">
        작성자: ${escapeHtml(data.department)} · 작성일: ${new Date().toLocaleDateString('ko-KR')}
      </div>
    </div>
  `;

  // Render to canvas
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.innerHTML = html;
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container.firstElementChild as HTMLElement, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
    });

    const imgData = canvas.toDataURL('image/png');
    const imgWidth = 210;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const pageHeight = 297;

    const doc = new jsPDF('p', 'mm', 'a4');
    let position = 0;

    while (position < imgHeight) {
      if (position > 0) doc.addPage();
      doc.addImage(imgData, 'PNG', 0, -position, imgWidth, imgHeight);
      position += pageHeight;
    }

    const fileName = `${data.department || '회의록'}_${data.topic || '회의'}_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(fileName);
  } finally {
    document.body.removeChild(container);
  }
}
