import { Link } from 'expo-router'
import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { GEOMETRY, STRUCTURE_BY_ID } from '../../core/data'
import { makeChoices, pickQuestion, questionPool, type QuizDirection } from '../../core/quiz'
import {
  plateIdOf,
  type Depth,
  type Layer,
  type Part,
  type Structure,
  type View as AnatomyView,
  type ViewBox,
} from '../../core/types'
import { fit, zoomToPolygons } from '../../core/zoom'
import { AnatomyCanvas } from '../../ui/anatomy-canvas'
import { ChipRow } from '../../ui/chip-row'
import { useMastery } from '../../ui/mastery-store'
import { breakpointLg, color, fontSans, fontSansMedium, radius } from '../../ui/theme'
import { useWindowDimensions } from '../../ui/use-window-dimensions'

const VIEWS = [
  { id: 'left', label: '左側望' },
  { id: 'right', label: '右側望' },
  { id: 'front', label: '正面' },
  { id: 'rear', label: '後面' },
] as const satisfies readonly { id: AnatomyView; label: string }[]

const LAYERS = [
  { id: 'skin', label: '皮膚' },
  { id: 'muscle', label: '筋肉' },
  { id: 'skeleton', label: '骨格' },
  { id: 'organs', label: '内臓' },
] as const satisfies readonly { id: Layer; label: string }[]

const DEPTHS = [
  { id: 'superficial', label: '表層筋' },
  { id: 'deep', label: '深層筋' },
] as const satisfies readonly { id: Depth; label: string }[]

const DIRECTIONS = [
  { id: 'figToName', label: '図→名前' },
  { id: 'nameToFig', label: '名前→図' },
] as const satisfies readonly { id: QuizDirection; label: string }[]

/** 出題中の段階。'pick' は部位を押す待ち、'choice' は4択を選ぶ待ち、'answer' は場所を押す待ち */
type Phase = 'setup' | 'pick' | 'choice' | 'answer' | 'result'

export default function QuizScreen() {
  const [view, setView] = useState<AnatomyView>('left')
  const [layer, setLayer] = useState<Layer>('muscle')
  const [depth, setDepth] = useState<Depth>('superficial')
  const [area, setArea] = useState<string>('all')
  const [direction, setDirection] = useState<QuizDirection>('figToName')
  const [phase, setPhase] = useState<Phase>('setup')
  const [asked, setAsked] = useState<Part | null>(null)
  const [choices, setChoices] = useState<readonly Structure[]>([])
  const [result, setResult] = useState<{ ok: boolean; note: string } | null>(null)
  const [tally, setTally] = useState({ asked: 0, correct: 0 })
  const [vb, setVb] = useState<ViewBox | null>(null)
  const { recordAnswer } = useMastery()
  const { width, height } = useWindowDimensions()
  const wide = width >= breakpointLg

  const geometry = GEOMETRY[view]
  const image = geometry.images[plateIdOf(layer, depth)]
  const pool = questionPool(geometry, { layer, depth, area })
  const viewBox = vb ?? fit(geometry.size)
  const askedStructure = asked ? (STRUCTURE_BY_ID.get(asked.id) ?? null) : null

  const start = () => {
    setVb(zoomToPolygons(pool.map((p) => p.points), geometry.size))
    setTally({ asked: 0, correct: 0 })
    setResult(null)
    setChoices([])
    if (direction === 'figToName') {
      setAsked(null)
      setPhase('pick')
    } else {
      setAsked(pickQuestion(pool, Math.random))
      setPhase('answer')
    }
  }

  const finish = (part: Part, ok: boolean, note: string) => {
    recordAnswer(part.id, ok)
    setTally((t) => ({ asked: t.asked + 1, correct: t.correct + (ok ? 1 : 0) }))
    setResult({ ok, note })
    setPhase('result')
  }

  const onPickPart = (p: Part) => {
    if (phase === 'pick') {
      const s = STRUCTURE_BY_ID.get(p.id)
      if (s === undefined) return
      setAsked(p)
      setChoices(makeChoices(s, [...STRUCTURE_BY_ID.values()], Math.random))
      setPhase('choice')
    } else if (phase === 'answer' && askedStructure !== null) {
      const ok = p.id === asked!.id
      const picked = STRUCTURE_BY_ID.get(p.id)
      finish(
        asked!,
        ok,
        ok ? '' : `そこは${picked?.nameJa ?? 'その部位'}です。正解は「${askedStructure.nameJa}」`,
      )
    }
  }

  const onPickNothing = () => {
    // 名前→図で馬体の外を押しても不正解にはせん（指の滑りで不正解は理不尽）
    // 図→名前では何も起きない
  }

  const choose = (s: Structure) => {
    if (phase !== 'choice' || asked === null) return
    finish(asked, s.id === asked.id, s.id === asked.id ? '' : `正解は「${STRUCTURE_BY_ID.get(asked.id)?.nameJa ?? ''}」`)
  }

  const next = () => {
    setResult(null)
    setChoices([])
    if (direction === 'figToName') {
      setAsked(null)
      setPhase('pick')
    } else {
      setAsked(pickQuestion(pool, Math.random))
      setPhase('answer')
    }
  }

  const prompt =
    phase === 'pick'
      ? '部位をタップしてください'
      : phase === 'choice'
        ? 'この部位の名前は？'
        : phase === 'answer' && askedStructure !== null
          ? `「${askedStructure.nameJa}」を押してください`
          : null

  return (
    <View style={[styles.root, wide ? styles.rootWide : null]}>
      <View style={styles.canvasWrap}>
        <AnatomyCanvas
          geometry={geometry}
          image={image}
          layer={layer}
          depth={depth}
          viewBox={viewBox}
          onViewBox={(update) => setVb((prev) => update(prev ?? fit(geometry.size)))}
          mode="part"
          visiblePartIds={phase === 'setup' ? null : new Set(pool.map((p) => p.id))}
          selectedPartId={phase === 'choice' || phase === 'result' ? (asked?.id ?? null) : null}
          suppressLabels
          labelOf={(p: Part) => STRUCTURE_BY_ID.get(p.id)?.nameJa ?? p.id}
          onPickArea={() => {}}
          onPickPart={onPickPart}
          onPickNothing={onPickNothing}
          mirrored={view === 'right'}
        />
      </View>

      <View style={wide ? styles.panelWide : [styles.panel, { height: Math.max(220, height * 0.34) }]}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          {phase === 'setup' ? (
            <View style={styles.stack}>
              <ChipRow ariaLabel="向き" items={VIEWS} value={view} onChange={(v) => { setView(v); setArea('all'); setVb(null) }} />
              <ChipRow ariaLabel="層" items={LAYERS} value={layer} onChange={(l) => { setLayer(l); setVb(null) }} />
              {layer === 'muscle' ? <ChipRow ariaLabel="深さ" items={DEPTHS} value={depth} onChange={setDepth} /> : null}
              <ChipRow
                ariaLabel="場所"
                items={[{ id: 'all', label: 'すべて' }, ...geometry.areas.map((a) => ({ id: a.id, label: a.nameJa }))]}
                value={area}
                onChange={setArea}
              />
              <ChipRow ariaLabel="出題の向き" items={DIRECTIONS} value={direction} onChange={setDirection} />
              {pool.length === 0 ? (
                <Text testID="quiz-empty" style={styles.note}>この条件では出題できる部位がありません</Text>
              ) : null}
              <Pressable
                testID="quiz-start"
                accessibilityRole="button"
                accessibilityLabel="テストをはじめる"
                disabled={pool.length === 0}
                onPress={start}
                style={[styles.startButton, pool.length === 0 ? styles.startDisabled : null]}
              >
                <Text style={styles.startText}>はじめる（出題 {pool.length} 件）</Text>
              </Pressable>
              {tally.asked > 0 ? (
                <Text testID="quiz-score" style={styles.note}>
                  前回: {tally.asked} 問中 {tally.correct} 正解
                </Text>
              ) : null}
            </View>
          ) : (
            <View style={styles.stack}>
              <Text testID={phase === 'answer' && asked !== null ? `quiz-prompt-${asked.id}` : 'quiz-prompt'} style={styles.prompt}>
                {prompt ?? ''}
              </Text>
              {phase === 'choice' ? (
                <View style={styles.choices}>
                  {choices.map((c) => (
                    <Pressable
                      key={c.id}
                      testID={`choice-${c.id}`}
                      accessibilityRole="button"
                      accessibilityLabel={c.nameJa}
                      onPress={() => choose(c)}
                      style={styles.choice}
                    >
                      <Text style={styles.choiceText}>{c.nameJa}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
              {result !== null ? (
                <View style={styles.result}>
                  <Text testID="quiz-result" style={[styles.resultText, result.ok ? styles.ok : styles.ng]}>
                    {result.ok ? '正解' : '不正解'}
                    {result.note !== '' ? ` — ${result.note}` : ''}
                  </Text>
                  {askedStructure !== null ? (
                    <Link href={`/catalog/${askedStructure.id}`} testID="quiz-explain" accessibilityRole="link" style={styles.explainLink}>
                      「{askedStructure.nameJa}」の解説を見る
                    </Link>
                  ) : null}
                  <Pressable testID="quiz-next" accessibilityRole="button" accessibilityLabel="次の問題" onPress={next} style={styles.startButton}>
                    <Text style={styles.startText}>次へ</Text>
                  </Pressable>
                </View>
              ) : null}
              <Pressable
                testID="quiz-stop"
                accessibilityRole="button"
                accessibilityLabel="テストをやめる"
                onPress={() => { setPhase('setup'); setAsked(null); setResult(null); setChoices([]); setVb(null) }}
                style={styles.stopButton}
              >
                <Text style={styles.stopText}>やめる</Text>
              </Pressable>
              <Text testID="quiz-score" style={styles.note}>
                {tally.asked} 問中 {tally.correct} 正解
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 0, flexDirection: 'column', backgroundColor: color.bg },
  rootWide: { flexDirection: 'row' },
  canvasWrap: { flex: 1, minHeight: 0, position: 'relative' },
  panel: {
    flexShrink: 0,
    overflow: 'hidden',
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    backgroundColor: color.surface,
  },
  panelWide: { width: 384, alignSelf: 'stretch', backgroundColor: color.surface, borderLeftWidth: 1, borderLeftColor: color.line },
  scroll: { flexGrow: 0, flexShrink: 1 },
  content: { paddingHorizontal: 8, paddingTop: 8, paddingBottom: 24 },
  stack: { flexDirection: 'column', gap: 8, paddingHorizontal: 12 },
  prompt: { fontFamily: fontSansMedium, fontSize: 16, lineHeight: 24, color: color.fg, paddingTop: 4 },
  choices: { flexDirection: 'column', gap: 8 },
  choice: { borderRadius: radius.card, backgroundColor: color.raised, paddingHorizontal: 16, paddingVertical: 12 },
  choiceText: { fontFamily: fontSans, fontSize: 15, color: color.fg },
  result: { flexDirection: 'column', gap: 10 },
  resultText: { fontFamily: fontSansMedium, fontSize: 15, lineHeight: 22 },
  ok: { color: '#9ec9a0' },
  ng: { color: '#e0a0a0' },
  explainLink: { fontFamily: fontSans, fontSize: 13, color: color.bone, textDecorationLine: 'underline', alignSelf: 'flex-start' },
  startButton: { borderRadius: radius.pill, backgroundColor: color.bone, paddingHorizontal: 18, paddingVertical: 12, alignItems: 'center' },
  startDisabled: { opacity: 0.4 },
  startText: { fontFamily: fontSans, fontSize: 14, color: color.accentFg },
  stopButton: { alignSelf: 'flex-start', paddingVertical: 6 },
  stopText: { fontFamily: fontSans, fontSize: 12, color: color.faint },
  note: { fontFamily: fontSans, fontSize: 12, lineHeight: 16, color: color.faint },
})
