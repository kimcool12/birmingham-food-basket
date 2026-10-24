// Turns rows of values into CSV text that Excel opens correctly.
// - A byte-order mark at the start makes Excel read the file as UTF-8 (so £ shows properly).
// - Cells that start with = + - @ could run as a formula in a spreadsheet, so they get a leading
//   apostrophe. Phone numbers and plain numbers such as +447000000000 or -12 are left alone.

const FORMULA_START = /^[=+\-@\t\r]/;
const PHONE_OR_NUMBER = /^[+-][0-9\s().-]+$/;

export function csvCell(value) {
  if (value === null || value === undefined) return '';
  let text = typeof value === 'string' ? value : String(value);

  if (typeof value === 'string' && FORMULA_START.test(text) && !PHONE_OR_NUMBER.test(text)) {
    text = `'${text}`;
  }
  if (/[",\r\n]/.test(text)) {
    text = `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function toCsv(rows) {
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(',')).join('\r\n')}\r\n`;
}
