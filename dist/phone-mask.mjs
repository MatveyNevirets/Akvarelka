// Ten national digits are the source of truth; the country code is never editable.
export function nationalDigits(value) {
  const digits = String(value).replace(/\D/g, '');
  const hasCode = /^\s*\+7/.test(value) || (digits.length > 10 && /^[78]/.test(digits));
  return (hasCode ? digits.slice(1) : digits).slice(0, 10);
}

export function formatPhone(digits) {
  if (!digits) return '';
  let value = '+7 (' + digits.slice(0, 3);
  if (digits.length >= 3) value += ')';
  if (digits.length > 3) value += ' ' + digits.slice(3, 6);
  if (digits.length > 6) value += '-' + digits.slice(6, 8);
  if (digits.length > 8) value += '-' + digits.slice(8, 10);
  return value;
}

function nationalIndex(value, position) {
  return Math.max(0, value.slice(0, position).replace(/\D/g, '').length - 1);
}

function caretPosition(value, index) {
  if (!index) return Math.min(4, value.length);
  let count = -1; // Skip the country code.
  for (let i = 0; i < value.length; i++) {
    if (/\d/.test(value[i]) && ++count === index) return i + 1;
  }
  return value.length;
}

export function attachPhoneMask(input, normalized) {
  let digits = nationalDigits(input.value);
  let internalInput = false;
  function render(index, notify = false) {
    input.value = formatPhone(digits) || (document.activeElement === input ? '+7 (' : '');
    normalized.value = digits ? '+7' + digits : '';
    if (index !== undefined) {
      const caret = caretPosition(input.value, index);
      input.setSelectionRange(caret, caret);
    }
    if (notify) {
      internalInput = true;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      internalInput = false;
    }
  }
  function insert(text) {
    const incoming = String(text).replace(/\D/g, '');
    if (!incoming) return;
    const fullNumber = /^\s*\+7/.test(text) || (incoming.length >= 11 && /^[78]/.test(incoming));
    const start = nationalIndex(input.value, input.selectionStart ?? input.value.length);
    const end = nationalIndex(input.value, input.selectionEnd ?? input.value.length);
    if (fullNumber) {
      digits = nationalDigits(text);
      render(digits.length, true);
    } else {
      const available = 10 - digits.length + end - start;
      const inserted = incoming.slice(0, Math.max(0, available));
      digits = digits.slice(0, start) + inserted + digits.slice(end);
      render(start + inserted.length, true);
    }
  }
  input.addEventListener('beforeinput', event => {
    if (!event.cancelable || event.isComposing) return;
    if (event.inputType.startsWith('delete')) {
      event.preventDefault();
      let start = nationalIndex(input.value, input.selectionStart ?? input.value.length);
      let end = nationalIndex(input.value, input.selectionEnd ?? input.value.length);
      if (start === end) {
        if (event.inputType.includes('Backward')) start = Math.max(0, start - 1);
        else end = Math.min(digits.length, end + 1);
      }
      digits = digits.slice(0, start) + digits.slice(end);
      render(start, true);
    } else if (event.inputType === 'insertText' && event.data !== null) {
      event.preventDefault();
      insert(event.data);
    }
  });
  input.addEventListener('paste', event => {
    if (!event.clipboardData) return;
    event.preventDefault();
    insert(event.clipboardData.getData('text'));
  });
  // Autofill, drag/drop and browsers without cancellable beforeinput.
  input.addEventListener('input', () => {
    if (internalInput) return;
    const value = input.value;
    const position = input.selectionStart ?? value.length;
    const prefixRemoved = /^\s*\+7/.test(value) || (value.replace(/\D/g, '').length > 10 && /^[78]/.test(value.replace(/\D/g, '')));
    const index = Math.max(0, value.slice(0, position).replace(/\D/g, '').length - Number(prefixRemoved));
    digits = nationalDigits(value);
    render(Math.min(index, digits.length));
  });
  input.addEventListener('focus', () => { if (!digits) render(0); });
  input.addEventListener('blur', () => { if (!digits) input.value = ''; });
  render();
  return { get value() { return normalized.value; }, get complete() { return digits.length === 10; } };
}
