/**
 * React Native の型に無いが react-native-web は DOM へ渡す aria 属性。
 * native は知らん props を捨てるので、そのまま両方に渡してええ。
 * 旧 Web 版が出しとった属性（aria-pressed / aria-current / h2）を Web で落とさんために持つ。
 */
export const ariaPressed = (pressed: boolean) => ({ 'aria-pressed': pressed })
export const ariaCurrent = (current: boolean) => ({ 'aria-current': current ? 'page' : undefined })
export const ariaLevel = (level: 1 | 2 | 3) => ({ 'aria-level': level })
