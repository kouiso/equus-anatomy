import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { hasLatinVoice, SPEECH_LANG } from '../core/speech'
import type { Structure } from '../core/types'
import { SpeakerIcon } from './icons'
import { useT } from './locale-store'
import { speakOnce, voiceLanguages } from './speech'
import { color, fontSans, radius } from './theme'

type SpeechTarget = {
  readonly testID: string
  readonly text: string
  readonly langTag: string
  readonly label: string
  readonly a11y: string
}

/**
 * 名称の発音ボタン（#230 案C）。和名・英名は常時、ラテン語名は
 * OS が 'la' の音声を持つ時だけ出す（精度が確かめられん読みを未監修で出さん決まり）。
 * 本文・解説文の読み上げはやらん。
 */
export function NameSpeech(props: { structure: Structure }) {
  const s = props.structure
  const t = useT()
  // OS の音声一覧は非同期でしか取れん。取れるまでは la ボタンを出さん（出してから消すとチラつく）
  const [latinReady, setLatinReady] = useState(false)
  useEffect(() => {
    let active = true
    void voiceLanguages().then((langs) => {
      if (active) setLatinReady(hasLatinVoice(langs))
    })
    return () => {
      active = false
    }
  }, [])

  const targets: SpeechTarget[] = [
    { testID: 'speak-ja', text: s.nameJa, langTag: SPEECH_LANG.ja, label: t('speak.ja'), a11y: t('speak.jaLabel') },
    { testID: 'speak-en', text: s.nameEn, langTag: SPEECH_LANG.en, label: t('speak.en'), a11y: t('speak.enLabel') },
  ]
  if (latinReady) {
    targets.push({ testID: 'speak-la', text: s.nameLa, langTag: SPEECH_LANG.la, label: t('speak.la'), a11y: t('speak.laLabel') })
  }

  return (
    <View style={styles.row} testID="name-speech">
      {targets.map((target) => (
        <Pressable
          key={target.testID}
          testID={target.testID}
          accessibilityRole="button"
          accessibilityLabel={target.a11y}
          onPress={() => speakOnce(target.text, target.langTag)}
          style={styles.pill}
        >
          <SpeakerIcon color={color.muted} size={14} />
          <Text style={styles.pillText}>{target.label}</Text>
        </Pressable>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  // 発音ボタンは主要操作ではないので保存/覚えたピルより一段小さく
  pill: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    backgroundColor: color.raised,
  },
  pillText: { fontFamily: fontSans, fontSize: 12, letterSpacing: 0.3, color: color.muted },
})
