/**
 * React Native の型に無いが react-native-web は DOM へ渡す aria 属性。
 * native は知らん props を捨てるので、そのまま両方に渡してええ。
 * 旧 Web 版が出しとった属性（aria-pressed / aria-current / h2）を Web で落とさんために持つ。
 */
export const ariaPressed = (pressed: boolean) => ({ 'aria-pressed': pressed })
export const ariaCurrent = (current: boolean) => ({ 'aria-current': current ? 'page' : undefined })
export const ariaLevel = (level: 1 | 2 | 3) => ({ 'aria-level': level })
/** 押すと選択肢のシート（Modal）が開くボタン。react-native-web は aria-haspopup / aria-expanded を DOM へ出す。 */
export const ariaPopup = (expanded: boolean) => ({ 'aria-haspopup': 'dialog' as const, 'aria-expanded': expanded })
