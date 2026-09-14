export type DetailSource = 'catalog' | 'saved' | 'quiz' | 'anatomy'

export function parseDetailSource(value: string | string[] | undefined): DetailSource {
  const source = Array.isArray(value) ? value[0] : value
  return source === 'saved' || source === 'quiz' || source === 'anatomy' ? source : 'catalog'
}
