import { Link } from 'expo-router'
import { useState } from 'react'
import { Pressable, StyleSheet, Text as RNText, View, type LayoutChangeEvent } from 'react-native'
import Svg, { Image, Path, Rect } from 'react-native-svg'
import { GEOMETRY } from '../core/data'
import { toPath, viewBoxToString } from '../core/geometry'
import { locationMapCaption, locationMapLabel, locationMapOf, locationMapViewBox } from '../core/location-map'
import type { Size, Structure } from '../core/types'
import { resolveAnatomyImage } from './anatomy-images'
import { useT } from './locale-store'
import { color, fontSans, radius } from './theme'

/** 小図が測る前の仮の縦横比。測れたら実寸で置き換える（390px 幅の高さ 150px）。 */
const FALLBACK_ASPECT = 350 / 150

/**
 * 図鑑の詳細に置く、動かない位置の小図 (#272)。
 * 解剖図（anatomy-canvas）と同じ座標・同じ描き方やが、拡大・移動・当たり判定は持たん。
 * 押すと「解剖図で位置を見る」と同じ `/?part=<id>` へ移る。
 * 小図を出せない部位（位置未登録）では何も描かん。呼ぶ側が「準備中」を出す。
 */
export function LocationMap(props: { structure: Structure; height: number }) {
  const { structure, height } = props
  const t = useT()
  const [box, setBox] = useState<Size>({ w: 0, h: 0 })
  const map = locationMapOf(structure)
  if (map === null) return null

  const geometry = GEOMETRY[map.view]
  const aspect = box.w > 0 && box.h > 0 ? box.w / box.h : FALLBACK_ASPECT
  const viewBox = locationMapViewBox(map, geometry, aspect)
  const href = resolveAnatomyImage(map.image.src)
  // 線の太さは画面上の px で揃える。全体を縮めて描くので viewBox の幅から逆算する
  const k = box.w > 0 ? viewBox.w / box.w : 1
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height: h } = e.nativeEvent.layout
    setBox((prev) => (prev.w === width && prev.h === h ? prev : { w: width, h }))
  }

  return (
    <Link href={`/?part=${structure.id}`} asChild>
      <Pressable
        testID="location-map"
        accessibilityRole="link"
        accessibilityLabel={locationMapLabel(map, t)}
        style={styles.card}
      >
        <View style={{ height }} onLayout={onLayout}>
          {box.w > 0 && box.h > 0 ? (
            // 図は飾り。リンクの名前（向き・層まで入れた）が内容を言うので、読み上げからは外す。
            // 画像の役割を付けると「画像、…」と同じ内容を二度読ませることになる
            <Svg
              testID="location-map-svg"
              aria-hidden
              focusable={false}
              width={box.w}
              height={box.h}
              viewBox={viewBoxToString(viewBox)}
              preserveAspectRatio="xMidYMid meet"
            >
              <Rect x={0} y={0} width={geometry.size.w} height={geometry.size.h} fill={color.bg} />
              {href !== undefined ? (
                <Image
                  href={href}
                  x={0}
                  y={0}
                  width={geometry.size.w}
                  height={geometry.size.h}
                  preserveAspectRatio="none"
                  {...(map.mirrored ? { transform: `translate(${geometry.size.w},0) scale(-1,1)` } : {})}
                />
              ) : null}
              <Path
                testID="location-map-part"
                d={toPath(map.part.points)}
                fill={color.bone}
                fillOpacity={0.3}
                stroke={color.bone}
                strokeOpacity={0.9}
                strokeWidth={2 * k}
                {...(map.draft ? { strokeDasharray: [6 * k, 5 * k] } : {})}
              />
            </Svg>
          ) : null}
        </View>
        <RNText testID="location-map-caption" style={styles.caption}>
          {locationMapCaption(map, t)}
        </RNText>
      </Pressable>
    </Link>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    backgroundColor: color.mapBg,
    borderWidth: 1,
    borderColor: color.line,
    overflow: 'hidden',
  },
  // 図の上に重ねず下の帯に置く。文字を2倍にしても図を隠さず折り返せる
  caption: { fontFamily: fontSans, fontSize: 11, lineHeight: 16, color: color.muted, paddingHorizontal: 10, paddingVertical: 8 },
})

