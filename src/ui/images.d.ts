/** Metro の require は画像を AssetRegistry の番号にする。expo が *.jpg の型を配っとらんのでここで宣言する。 */
declare module '*.jpg' {
  const asset: number
  export default asset
}
