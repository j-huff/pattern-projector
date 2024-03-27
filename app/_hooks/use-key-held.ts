import { useEffect, useState } from 'react';
import { KeyCode } from '@/_lib/key-code';
import { useKeyDown } from './use-key-down';
import { useKeyUp } from './use-key-up';

export const useKeyHeld = (
  onHeld: () => void,
  onRelease: () => void,
  keyCodes: KeyCode[]
) => {
  const [heldKeys, setHeldKeys] = useState<Set<KeyCode>>(new Set());

  useKeyDown((keyCode) => {
    setHeldKeys((prevHeldKeys) => {
      const newHeldKeys = new Set(prevHeldKeys);
      newHeldKeys.add(keyCode);
      return newHeldKeys;
    });
  }, keyCodes);

  useKeyUp((keyCode) => {
    setHeldKeys((prevHeldKeys) => {
      const newHeldKeys = new Set(prevHeldKeys);
      newHeldKeys.delete(keyCode);
      return newHeldKeys;
    });
  }, keyCodes);

  useEffect(() => {
    if (heldKeys.size === keyCodes.length) {
      onHeld();
    }
  }, [heldKeys, keyCodes, onHeld]);

  useEffect(() => {
    if (heldKeys.size === keyCodes.length - 1 && keyCodes.length > 0) {
      onRelease();
    }
  }, [heldKeys, keyCodes, onRelease]);
};
