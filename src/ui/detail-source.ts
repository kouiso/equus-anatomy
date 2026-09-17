export type DetailSource = 'catalog' | 'saved' | 'anatomy'

export function parseDetailSource(value: string | string[] | undefined): DetailSource {
  const source = Array.isArray(value) ? value[0] : value
  return source === 'saved' || source === 'anatomy' ? source : 'catalog'
}
