// Shared by the content script and the settings popup: zoom key shortcuts.
// A shortcut is { ctrl, alt, shift, meta, code } where code is KeyboardEvent.code.

var MTZ_DEFAULT_SHORTCUTS = {
  in: { ctrl: true, alt: true, shift: false, meta: false, code: 'ArrowUp' },
  out: { ctrl: true, alt: true, shift: false, meta: false, code: 'ArrowDown' }
};

// KeyboardEvent.code -> X11 keysym name, as Touchégg's SEND_KEYS expects
var MTZ_KEYSYMS = (function () {
  const m = {
    ArrowUp: 'Up', ArrowDown: 'Down', ArrowLeft: 'Left', ArrowRight: 'Right',
    PageUp: 'Page_Up', PageDown: 'Page_Down', Home: 'Home', End: 'End', Insert: 'Insert',
    Space: 'space', Equal: 'equal', Minus: 'minus', BracketLeft: 'bracketleft',
    BracketRight: 'bracketright', Comma: 'comma', Period: 'period', Slash: 'slash',
    Semicolon: 'semicolon', Quote: 'apostrophe', Backquote: 'grave', Backslash: 'backslash',
    NumpadAdd: 'KP_Add', NumpadSubtract: 'KP_Subtract'
  };
  for (let c = 65; c <= 90; c++) m['Key' + String.fromCharCode(c)] = String.fromCharCode(c + 32);
  for (let d = 0; d <= 9; d++) m['Digit' + d] = String(d);
  for (let f = 1; f <= 12; f++) m['F' + f] = 'F' + f;
  return m;
})();

var MTZ_KEY_LABELS = { ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Equal: '=', Minus: '-', Space: 'Space' };

function mtzMatches(sc, e) {
  return !!sc && e.code === sc.code &&
    e.ctrlKey === !!sc.ctrl && e.altKey === !!sc.alt &&
    e.shiftKey === !!sc.shift && e.metaKey === !!sc.meta;
}

function mtzKeyParts(sc) {
  const parts = [];
  if (sc.ctrl) parts.push('Ctrl');
  if (sc.alt) parts.push('Alt');
  if (sc.shift) parts.push('Shift');
  if (sc.meta) parts.push('Super');
  let k = sc.code;
  if (MTZ_KEY_LABELS[k]) k = MTZ_KEY_LABELS[k];
  else if (/^Key[A-Z]$/.test(k)) k = k.slice(3);
  else if (/^Digit\d$/.test(k)) k = k.slice(5);
  parts.push(k);
  return parts;
}

// Returns an error message, or null if the shortcut can be used
function mtzValidate(sc) {
  if (!MTZ_KEYSYMS[sc.code]) return 'That key isn\'t supported. Try arrows, letters, digits, F-keys or = / -.';
  if (!sc.ctrl && !sc.alt && !sc.meta) return 'Include Ctrl, Alt or Super so it doesn\'t clash with typing.';
  return null;
}

// { mods: "Control_L+Alt_L", key: "Up" } for Touchégg
function mtzToTouchegg(sc) {
  const mods = [];
  if (sc.ctrl) mods.push('Control_L');
  if (sc.alt) mods.push('Alt_L');
  if (sc.shift) mods.push('Shift_L');
  if (sc.meta) mods.push('Super_L');
  return { mods: mods.join('+'), key: MTZ_KEYSYMS[sc.code] };
}
