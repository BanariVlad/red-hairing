export const IPC = {
  PRANK_START: 'prank:start',
  PRANK_STOP: 'prank:stop',
  PRANK_STOP_ALL: 'prank:stop-all',
  CURSOR_POSITION: 'cursor:position',
  CURSOR_CLICK: 'cursor:click',
  CONFIG_UPDATE: 'config:update',
  SET_CLICK_THROUGH: 'overlay:set-click-through',
  CAPTURE_SCREEN: 'overlay:capture-screen',
  SCREEN_CAPTURED: 'overlay:screen-captured',
  KEYSTROKE_REACTION: 'keystroke:reaction',
  MERCY_MESSAGE: 'mercy:message',
  WORD_TRIGGER_PRANKS: 'word:trigger-pranks',
} as const;
