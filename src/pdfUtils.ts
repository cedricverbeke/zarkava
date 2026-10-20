// PDF generation utility — opens a print-optimized window with forced colors.
// iPhone-safe: uses explicit hex colors (not CSS variables), -webkit-print-color-adjust: exact,
// and simple table-based layouts that render reliably in Safari's print engine.

interface PdfColumn {
  header: string;
  getValue: () => string;
  width?: string;
}

interface PdfSection {
  title: string;
  columns: PdfColumn[];
  rows: number; // number of data rows
  getRow: (index: number) => void; // called for each row to populate column getValue
}

export function generatePdf(
  title: string,
  subtitle: string,
  sections: { heading: string; table: { headers: string[]; rows: string[][] } }[],
  opts?: { logoUrl?: string; accentColor?: string },
): void {
  const accent = opts?.accentColor ?? '#d6a23c';
  const w = window.open('', '_blank');
  if (!w) return;

  const sectionHtml = sections.map((s) => `
    <h2>${escapeHtml(s.heading)}</h2>
    <table>
      <thead><tr>${s.table.headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead>
      <tbody>
        ${s.table.rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('')}
      </tbody>
    </table>
  `).join('');

  const logoHtml = opts?.logoUrl ? `<img src="${opts.logoUrl}" class="logo" />` : '';

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; color: #1c302f; margin: 32px; }
  .header { display: flex; align-items: center; gap: 16px; border-bottom: 3px solid ${accent}; padding-bottom: 16px; margin-bottom: 24px; }
  .logo { width: 48px; height: 48px; object-fit: contain; border-radius: 8px; }
  h1 { font-size: 22px; color: #2c4a47; margin: 0; }
  .subtitle { font-size: 13px; color: #6b7b78; margin-top: 4px; }
  h2 { font-size: 16px; color: #375e59; margin-top: 28px; margin-bottom: 8px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  th { background: #f3f7f5; color: #2c4a47; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; padding: 10px 8px; text-align: left; border-bottom: 2px solid #d6dde0; }
  td { padding: 8px; border-bottom: 1px solid #e3ece7; font-size: 13px; }
  tr:nth-child(even) td { background: #fafcfb; }
  .footer { margin-top: 40px; font-size: 11px; color: #9aa8a5; text-align: center; border-top: 1px solid #e3ece7; padding-top: 12px; }
  @media print { body { margin: 12px; } .no-print { display: none; } }
</style></head>
<body>
  <div class="header">
    ${logoHtml}
    <div>
      <h1>${escapeHtml(title)}</h1>
      <div class="subtitle">${escapeHtml(subtitle)}</div>
    </div>
  </div>
  ${sectionHtml}
  <div class="footer">Document généré par Zarkava · ${new Date().toLocaleDateString('fr-FR')}</div>
  <script>
    window.onload = function() { setTimeout(function() { window.print(); }, 300); };
  </script>
</body></html>`;

  w.document.write(html);
  w.document.close();
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
