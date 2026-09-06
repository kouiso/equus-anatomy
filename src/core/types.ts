/** 向き。画像1枚ごとに座標セットが1つ対応する単位。 */
export type View = 'left' | 'right' | 'front' | 'rear'

export type Layer = 'skin' | 'muscle' | 'skeleton' | 'organs'

/** 筋肉だけが持つ深さ。表層筋と深層筋で別の画像・別の部位集合になる。 */
export type Depth = 'superficial' | 'deep'

/** 画像実寸ピクセル。% は使わん（アノテーションツールは全部原寸pxを吐くので変換ゼロ）。 */
export type Point = readonly [number, number]
export type Polygon = readonly Point[]

export type Size = { readonly w: number; readonly h: number }

/** SVG の viewBox そのもの。ズームとパンはこれの書き換えだけで表現する。 */
export type ViewBox = { readonly x: number; readonly y: number; readonly w: number; readonly h: number }

/** 解説文。座標は絶対に持たせん（座標は測定物、解説は執筆物で寿命が違う）。 */
export type Structure = {
  readonly id: string
  readonly layer: Layer
  readonly depth?: Depth
  readonly nameJa: string
  readonly nameLa: string
  readonly nameEn: string
  readonly region: string
  readonly summary: string
  readonly body: string
  readonly function: string
  readonly note?: string
  readonly views: readonly View[]
}

/** 大まかな場所（頭部・頸部・体幹・前肢・後肢・尾）。部位が細かいので先にここへ寄る。 */
export type Area = {
  readonly id: string
  readonly nameJa: string
  readonly points: Polygon
}

/** タップできる部位。points が当たり判定そのもの。 */
export type Part = {
  readonly id: string
  readonly layer: Layer
  readonly depth?: Depth
  readonly points: Polygon
  /** ラベルの引き出し先。省略時は重心。 */
  readonly labelAt?: Point
}

/**
 * 表示する絵の単位。層と一致せんのは筋肉だけが表層/深層に分かれるから。
 * 「muscle 層で深層筋を選んだのに絵は表層のまま」を型で見えるようにするために分けとる。
 */
export type PlateId = 'skin' | 'muscle-superficial' | 'muscle-deep' | 'skeleton' | 'organs'

export function plateIdOf(layer: Layer, depth: Depth): PlateId {
  return layer === 'muscle' ? (`muscle-${depth}` as PlateId) : (layer as PlateId)
}

export type ImageRef = {
  readonly src: string
  /** 差し替え検知用。座標は画像に紐づくので、画像が変わったら座標は無効。 */
  readonly hash: string
}

/**
 * 1つの向きの座標セット。
 * 層ごとに画像は差し替わるが座標系は共有する（実測: 左側望4層のランドマーク差は最大8px）。
 * 内部構造（骨・臓器）の部位は layer で分けて持つので、共有するのはシルエットと大まかな場所だけ。
 */
export type ViewGeometry = {
  readonly view: View
  readonly size: Size
  /** 絵が無いプレートは持たん。UI は「この層の図はまだ無い」と出す（黙って別の絵を出さん）。 */
  readonly images: Readonly<Partial<Record<PlateId, ImageRef>>>
  /** 座標をどの層の画像の上で測ったか。監査のために残す。 */
  readonly measuredOn: PlateId
  readonly areas: readonly Area[]
  readonly parts: readonly Part[]
}
