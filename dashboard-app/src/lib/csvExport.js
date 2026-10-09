/**
 * Utility to download data as a CSV file in the browser.
 * Escapes fields containing commas, quotes, or newlines appropriately.
 * Includes UTF-8 BOM so Excel opens Ethiopian Birr / Amharic / special characters correctly.
 *
 * @param {string} filename - e.g. "orders-report.csv"
 * @param {Array<string>} headers - e.g. ["Order ID", "Table", "Total"]
 * @param {Array<Array<any>>} rows - 2D array of row cells
 */
export function exportToCSV(filename, headers, rows) {
  if (!rows || !rows.length) {
    return false;
  }

  const formatCell = (val) => {
    if (val === null || val === undefined) return '';
    let str = String(val);
    // If string contains comma, double-quote, or newline, wrap in quotes and escape internal quotes
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      str = `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headerLine = headers.map(formatCell).join(',');
  const rowLines = rows.map((row) => row.map(formatCell).join(','));
  const csvContent = '\uFEFF' + [headerLine, ...rowLines].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return true;
}
