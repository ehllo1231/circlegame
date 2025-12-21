// Slot key format: "<group>:<kind>:<value>", e.g. "player:image:Assets/custom/player/mercury.png".
export const SLOT_CONFIG = {
  defaultRequirement: {
    unlocked: true,
  },
  overrides: {
    'player:default': { unlocked: true },
    'obstacle:default': { unlocked: true },
    'ring:default': { unlocked: true },
  },
};
