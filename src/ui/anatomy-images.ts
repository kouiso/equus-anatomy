import type { ImageSourcePropType } from 'react-native'
import muscleFront from '../../assets/anatomy/muscle_front.jpg'
import muscleLeft from '../../assets/anatomy/muscle_left.jpg'
import muscleRear from '../../assets/anatomy/muscle_rear.jpg'
import organsFront from '../../assets/anatomy/organs_front.jpg'
import organsLeft from '../../assets/anatomy/organs_left.jpg'
import organsRear from '../../assets/anatomy/organs_rear.jpg'
import skeletonFront from '../../assets/anatomy/skeleton_front.jpg'
import skeletonLeft from '../../assets/anatomy/skeleton_left.jpg'
import skeletonRear from '../../assets/anatomy/skeleton_rear.jpg'
import skinFront from '../../assets/anatomy/skin_front.jpg'
import skinLeft from '../../assets/anatomy/skin_left.jpg'
import skinRear from '../../assets/anatomy/skin_rear.jpg'

/**
 * core は画像を文字列（"/anatomy/xxx.jpg"）でしか持たん。
 * バンドラの解決はここでだけやる。core に置くと Node のテストと座標検証が壊れる。
 * 12枚を列挙しとるのは、動的 import が Metro で通らんから。
 */
const ANATOMY_IMAGES: Readonly<Record<string, ImageSourcePropType>> = {
  '/anatomy/skin_left.jpg': skinLeft,
  '/anatomy/muscle_left.jpg': muscleLeft,
  '/anatomy/skeleton_left.jpg': skeletonLeft,
  '/anatomy/organs_left.jpg': organsLeft,
  '/anatomy/skin_front.jpg': skinFront,
  '/anatomy/muscle_front.jpg': muscleFront,
  '/anatomy/skeleton_front.jpg': skeletonFront,
  '/anatomy/organs_front.jpg': organsFront,
  '/anatomy/skin_rear.jpg': skinRear,
  '/anatomy/muscle_rear.jpg': muscleRear,
  '/anatomy/skeleton_rear.jpg': skeletonRear,
  '/anatomy/organs_rear.jpg': organsRear,
}

/** 対応する絵が無い src は undefined。黙って別の絵を出さん（core の方針と同じ）。 */
export function resolveAnatomyImage(src: string): ImageSourcePropType | undefined {
  return ANATOMY_IMAGES[src]
}
