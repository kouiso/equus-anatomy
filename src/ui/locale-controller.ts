import { parseLocale, type Locale } from '../core/i18n'
import type { LocaleStorage } from './locale-key'

export type LocaleSnapshot = {
  readonly locale: Locale
  /** 利用者が自分で選んだか。false の間は端末の言語に従う */
  readonly explicit: boolean
  /** 保存値の読み込みが済んだか。native はこれを待ってスプラッシュを外す */
  readonly ready: boolean
}

/**
 * 表示言語の状態。保存するのは利用者が選んだ言語だけで、未選択なら毎回端末の言語を見る。
 * 書き込みに失敗しても画面の言語は切り替える（言語は作業データではないので警告までは出さん）。
 */
export class LocaleController {
  private snapshot: LocaleSnapshot
  private readonly listeners = new Set<() => void>()
  private loading: Promise<void> | null = null

  constructor(
    private readonly storage: LocaleStorage,
    detect: () => Locale,
  ) {
    const stored = storage.sync ? readSync(storage) : null
    this.snapshot = {
      locale: stored ?? detect(),
      explicit: stored !== null,
      ready: storage.sync,
    }
  }

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  readonly getSnapshot = (): LocaleSnapshot => this.snapshot

  /** native で保存値を読みに行く。何度呼んでも読みは1回。 */
  load(): Promise<void> {
    if (this.snapshot.ready) return Promise.resolve()
    this.loading ??= this.storage
      .getItem()
      .then(
        (raw) => parseLocale(raw),
        () => null,
      )
      .then((stored) => {
        // 読み込み中に利用者が選んだら、そちらを優先する
        if (this.snapshot.explicit || stored === null) this.emit({ ...this.snapshot, ready: true })
        else this.emit({ locale: stored, explicit: true, ready: true })
      })
    return this.loading
  }

  setLocale(locale: Locale): void {
    this.emit({ locale, explicit: true, ready: true })
    this.storage.setItem(locale).catch(() => {})
  }

  private emit(next: LocaleSnapshot): void {
    this.snapshot = next
    this.listeners.forEach((listener) => listener())
  }
}

function readSync(storage: LocaleStorage): Locale | null {
  try {
    return parseLocale(storage.getItemSync())
  } catch {
    return null
  }
}
