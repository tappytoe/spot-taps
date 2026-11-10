// Theme: 57 distinct emoji (one per deck symbol), each on its own colored disc.
export const SYMBOLS = [
  '🍎','🍌','🍇','🍉','🍓','🍒','🍍','🥕','🌽','🍄','🌵','🌻','🍀','🌙','⭐','🌞','⛄','🔥','💧',
  '⚡','🌈','🎈','🍔','🎸','🎲','🧩','🔑','🔔','💡','⏰','🍩','🍕','⚓','🚀','🚗','🚲','⛵','🛸',
  '🏠','🐶','🐱','🐭','🐰','🦊','🐻','🐼','🐸','🐵','🐔','🐧','🐢','🐙','🦋','🐞','🐳','🦄','🍦',
];
export const SYMBOL_HUES = SYMBOLS.map((_, i) => Math.round((i * 137.508) % 360));

export const AVATARS = ['😎','🤓','🥳','🤠','👸','🤴','🧙','🦸','🥷','👽','👻','🧛'];
export const SEAT_COLORS = ['#ff5a5f', '#2f9bff', '#22c55e', '#f59e0b'];

export const BOTS = {
  easy:   { name: 'Easy Bot',   label: 'Easy',   avatar: '🐣' },
  medium: { name: 'Medium Bot', label: 'Medium', avatar: '🦉' },
  hard:   { name: 'Hard Bot',   label: 'Hard',   avatar: '🐲' },
};

export const MODES = {
  tower: {
    icon: '🗼', name: 'The Tower', color: '#6c4cff', goal: 'Collect the most cards',
    how: 'Find the emoji shared by the middle card and YOUR card. Tap it to win the middle card. Most cards at the end wins.',
  },
  well: {
    icon: '🪣', name: 'The Well', color: '#2f9bff', goal: 'Empty your pile first',
    how: 'Find the emoji shared by YOUR card and the middle card. Tap it to dump your card into the well. First to empty their pile wins.',
  },
  potato: {
    icon: '🥔', name: 'Hot Potato', color: '#f59e0b', goal: 'Don’t get stuck holding cards',
    how: 'Find an emoji shared by your card and a rival’s card. Tap it on THEIR card to pass your whole pile. The last one holding cards takes them as penalty. 5 rounds, fewest penalty cards wins.',
  },
  poison: {
    icon: '🎁', name: 'Poisoned Gift', color: '#16a34a', goal: 'End with the fewest cards',
    how: 'Find an emoji shared by the middle card and a rival’s card. Tap it on THEIR card to “gift” them the middle card. Fewest cards at the end wins.',
  },
};