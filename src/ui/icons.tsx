import type { ColorValue } from 'react-native'
import Svg, { Path } from 'react-native-svg'

/** 旧 Web 版 icons.tsx と同じ線画。タブバーは色と大きさだけ外から受ける。 */
type IconProps = { color: ColorValue; size?: number }

function Icon(props: IconProps & { children: React.ReactNode }) {
  const size = props.size ?? 24
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={props.color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {props.children}
    </Svg>
  )
}

export const BookIcon = (p: IconProps) => (
  <Icon {...p}>
    <Path d="M12 7v14" />
    <Path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" />
  </Icon>
)
export const LayersIcon = (p: IconProps) => (
  <Icon {...p}>
    <Path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z" />
    <Path d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12" />
    <Path d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17" />
  </Icon>
)
export const BookmarkIcon = (p: IconProps) => (
  <Icon {...p}>
    <Path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
  </Icon>
)
export const PlusIcon = (p: IconProps) => (
  <Icon {...p}>
    <Path d="M5 12h14" />
    <Path d="M12 5v14" />
  </Icon>
)
export const MinusIcon = (p: IconProps) => (
  <Icon {...p}>
    <Path d="M5 12h14" />
  </Icon>
)
export const ResetIcon = (p: IconProps) => (
  <Icon {...p}>
    <Path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <Path d="M3 3v5h5" />
  </Icon>
)
