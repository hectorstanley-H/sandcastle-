export const EMOJI: Record<string, string> = {
  '+1': '👍', thumbsup: '👍', '-1': '👎', pray: '🙏', tada: '🎉', heart: '❤️', fire: '🔥', '100': '💯', eyes: '👀', rocket: '🚀',
  raised_hands: '🙌', white_check_mark: '✅', heavy_check_mark: '✔️', sunny: '☀️', point_up: '☝️', smile: '😄', sweat: '😓', sweat_smile: '😅',
  heavy_plus_sign: '➕', rotating_light: '🚨', moneybag: '💰', doughnut: '🍩', taco: '🌮', ship: '🚢', mega: '📣', lock: '🔒', wave: '👋',
  bug: '🐛', ticket: '🎫', memo: '📝', link: '🔗', clap: '👏', joy: '😂', thinking_face: '🤔', robot_face: '🤖', zap: '⚡', warning: '⚠️',
  spiral_note_pad: '🗒️', jira: '🟦', calendar: '📅', chart_with_upwards_trend: '📈', package: '📦', sparkles: '✨', muscle: '💪', coffee: '☕',
  white_circle: '⚪', red_circle: '🔴', large_blue_circle: '🔵', star: '⭐', speech_balloon: '💬', bookmark: '🔖', headphones: '🎧',
}
export const emoji = (code: string) => EMOJI[code] ?? `:${code}:`
