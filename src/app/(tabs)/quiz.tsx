import { usePersistenceRetryOnFocus } from '../../ui/persistence-banner'
import { Link } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { GEOMETRY, STRUCTURE_BY_ID } from '../../core/data'
import { makeChoices, pickQuestion, questionPool, type QuizDirection } from '../../core/quiz'
import { answerQuizQuestion, getQuizSession, makeQuestionToken, makeQuizSessionId, updateQuizSession, type QuizSession } from '../../core/quiz-session'
import { plateIdOf, type Depth, type Layer, type Part, type Structure, type View as AnatomyView } from '../../core/types'
import { fit, zoomToPolygons } from '../../core/zoom'
import { AnatomyCanvas } from '../../ui/anatomy-canvas'
import { useMastery } from '../../ui/mastery-store'
import { breakpointLg, color, fontSans, fontSansBold, fontSansMedium, radius } from '../../ui/theme'
import { useWindowDimensions } from '../../ui/use-window-dimensions'

const VIEWS = [{ id: 'left', label: '左側望' }, { id: 'right', label: '右側望' }, { id: 'front', label: '正面' }, { id: 'rear', label: '後面' }] as const satisfies readonly { id: AnatomyView; label: string }[]
const LAYERS = [{ id: 'skin', label: '皮膚' }, { id: 'muscle', label: '筋肉' }, { id: 'skeleton', label: '骨格' }, { id: 'organs', label: '内臓' }] as const satisfies readonly { id: Layer; label: string }[]
const DEPTHS = [{ id: 'superficial', label: '表層筋' }, { id: 'deep', label: '深層筋' }] as const satisfies readonly { id: Depth; label: string }[]
const DIRECTIONS = [{ id: 'figToName', label: '図→名前' }, { id: 'nameToFig', label: '名前→図' }] as const satisfies readonly { id: QuizDirection; label: string }[]

type Option<T extends string> = { readonly id: T; readonly label: string; readonly disabled?: boolean }

function OptionGroup<T extends string>(props: { readonly label: string; readonly items: readonly Option<T>[]; readonly value: T; readonly onChange: (value: T) => void; readonly hint?: string }) {
  return <View style={styles.field}>
    <Text style={styles.fieldLabel}>{props.label}</Text>
    <View accessibilityRole="radiogroup" accessibilityLabel={props.label} style={styles.options}>
      {props.items.map((item) => {
        const selected = item.id === props.value
        return <Pressable key={item.id} testID={`chip-${item.id}`} accessibilityRole="radio" accessibilityLabel={item.label} aria-checked={selected} disabled={item.disabled} onPress={() => props.onChange(item.id)} style={[styles.option, selected ? styles.optionSelected : styles.optionIdle, item.disabled ? styles.optionDisabled : null]}>
          <Text style={[styles.optionText, selected ? styles.optionTextSelected : null]}>{item.label}</Text>
        </Pressable>
      })}
    </View>
    {props.hint ? <Text style={styles.hint}>{props.hint}</Text> : null}
  </View>
}

export default function QuizScreen() {
  usePersistenceRetryOnFocus()
  const [session, setSession] = useState<QuizSession>(getQuizSession)
  const answerScrollRef = useRef<ScrollView>(null)
  useEffect(() => {
    answerScrollRef.current?.scrollTo({ y: 0, animated: false })
  }, [session.phase, session.questionToken])
  const { recordAnswer } = useMastery()
  const { width, height, fontScale } = useWindowDimensions()
  const geometry = GEOMETRY[session.view]
  const image = geometry.images[plateIdOf(session.layer, session.depth)]
  const pool = questionPool(geometry, { layer: session.layer, depth: session.depth, area: session.area })
  const viewBox = session.vb ?? fit(geometry.size)
  const asked = session.askedId === null ? null : (pool.find((part) => part.id === session.askedId) ?? null)
  const askedStructure = session.askedId === null ? null : (STRUCTURE_BY_ID.get(session.askedId) ?? null)
  const selectedStructure = session.result === null ? null : (STRUCTURE_BY_ID.get(session.result.selectedId) ?? null)
  const choices = session.choiceIds.flatMap((id) => { const structure = STRUCTURE_BY_ID.get(id); return structure ? [structure] : [] })
  const compressed = fontScale >= 1.6 || height < 520
  const diagramHeight = compressed ? Math.max(96, Math.min(140, height * 0.22)) : Math.max(160, Math.min(width >= breakpointLg ? 360 : 240, height * 0.32))
  const commit = (update: (current: QuizSession) => QuizSession) => setSession(updateQuizSession(update))

  const updateSetup = <K extends 'view' | 'layer' | 'depth' | 'area' | 'direction'>(key: K, value: QuizSession[K]) => commit((current) => {
    if (current.phase !== 'setup') return current
    return { ...current, [key]: value, area: key === 'view' ? 'all' : current.area, vb: key === 'view' || key === 'layer' || key === 'depth' ? null : current.vb }
  })

  const start = () => {
    const sessionId = makeQuizSessionId()
    const first = session.direction === 'nameToFig' ? pickQuestion(pool, Math.random) : null
    commit((current) => {
      if (current.phase !== 'setup' || pool.length === 0 || image === undefined) return current
      const ordinal = first === null ? 0 : 1
      return { ...current, phase: first === null ? 'pick' : 'answer', askedId: first?.id ?? null, choiceIds: [], result: null, tally: { asked: 0, correct: 0 }, vb: zoomToPolygons(pool.map((part) => part.points), geometry.size), sessionId, ordinal, questionToken: first === null ? null : makeQuestionToken(sessionId, ordinal), answeredToken: null }
    })
  }

  const finish = (part: Part, selectedId: string, ok: boolean, note: string) => {
    const token = getQuizSession().questionToken
    if (token === null) return
    const answered = answerQuizQuestion(token, { ok, note, selectedId })
    setSession(answered.session)
    if (answered.accepted) recordAnswer(part.id, ok)
  }

  const onPickPart = (part: Part) => {
    const current = getQuizSession()
    if (current.phase === 'pick') {
      const structure = STRUCTURE_BY_ID.get(part.id)
      if (structure === undefined || current.sessionId === null) return
      const choiceIds = makeChoices(structure, [...STRUCTURE_BY_ID.values()], Math.random).map((choice) => choice.id)
      commit((latest) => {
        if (latest.phase !== 'pick' || latest.sessionId === null) return latest
        const ordinal = latest.ordinal + 1
        return { ...latest, phase: 'choice', askedId: part.id, choiceIds, result: null, ordinal, questionToken: makeQuestionToken(latest.sessionId, ordinal), answeredToken: null }
      })
      return
    }
    if (current.phase === 'answer' && asked !== null && askedStructure !== null) {
      const ok = part.id === asked.id
      const picked = STRUCTURE_BY_ID.get(part.id)
      finish(asked, part.id, ok, ok ? '' : `そこは${picked?.nameJa ?? 'その部位'}です。正解は「${askedStructure.nameJa}」`)
    }
  }

  const choose = (structure: Structure) => {
    const current = getQuizSession()
    if (current.phase !== 'choice' || asked === null) return
    const ok = structure.id === asked.id
    finish(asked, structure.id, ok, ok ? '' : `正解は「${askedStructure?.nameJa ?? ''}」`)
  }

  const next = () => {
    const first = session.direction === 'nameToFig' ? pickQuestion(pool, Math.random) : null
    commit((current) => {
      if (current.phase !== 'result' || current.sessionId === null) return current
      if (current.direction === 'figToName') return { ...current, phase: 'pick', askedId: null, choiceIds: [], result: null, questionToken: null, answeredToken: null }
      if (first === null) return { ...current, phase: 'summary' }
      const ordinal = current.ordinal + 1
      return { ...current, phase: 'answer', askedId: first.id, choiceIds: [], result: null, ordinal, questionToken: makeQuestionToken(current.sessionId, ordinal), answeredToken: null }
    })
  }

  const showSummary = () => commit((current) => current.phase === 'setup' || current.phase === 'summary' ? current : { ...current, phase: 'summary' })
  const returnToSetup = () => commit((current) => ({ ...current, phase: 'setup', askedId: null, choiceIds: [], result: null, vb: null, sessionId: null, ordinal: 0, questionToken: null, answeredToken: null }))

  if (session.phase === 'setup') {
    const unavailable = image === undefined
    return <View style={styles.root}>
      <ScrollView style={styles.setupScroll} contentContainerStyle={styles.setupContent}>
        <View style={styles.headingBlock}><Text style={styles.eyebrow}>QUIZ</Text><Text style={styles.title}>テスト設定</Text><Text style={styles.intro}>図と名前を結びつけながら、馬体の部位を覚えます。</Text></View>
        <OptionGroup label="図の向き" items={VIEWS} value={session.view} onChange={(value) => updateSetup('view', value)} />
        <OptionGroup label="層" items={LAYERS} value={session.layer} onChange={(value) => updateSetup('layer', value)} />
        <OptionGroup label="筋肉の深さ" items={DEPTHS.map((item) => ({ ...item, disabled: session.layer !== 'muscle' }))} value={session.depth} onChange={(value) => updateSetup('depth', value)} {...(session.layer === 'muscle' ? {} : { hint: '筋肉を選んだときだけ変更できます' })} />
        <OptionGroup label="出題する場所" items={[{ id: 'all', label: 'すべて' }, ...geometry.areas.map((area) => ({ id: area.id, label: area.nameJa }))]} value={session.area} onChange={(value) => updateSetup('area', value)} />
        <OptionGroup label="出題モード" items={DIRECTIONS} value={session.direction} onChange={(value) => updateSetup('direction', value)} />
        <View style={styles.modeHelp}><Text style={styles.modeHelpTitle}>{session.direction === 'figToName' ? '図→名前' : '名前→図'}</Text><Text style={styles.modeHelpText}>{session.direction === 'figToName' ? '手順1：図の点を選ぶ　手順2：名前を答える' : '表示された名前を、図の中から選びます'}</Text></View>
        {pool.length === 0 || unavailable ? <Text testID="quiz-empty" style={styles.warning}>{unavailable ? 'この条件の図はまだ用意されていません' : 'この条件では出題できる部位がありません'}</Text> : null}
      </ScrollView>
      <View style={styles.setupFooter}><Pressable testID="quiz-start" accessibilityRole="button" accessibilityLabel="テストをはじめる" disabled={pool.length === 0 || unavailable} onPress={start} style={[styles.primaryButton, pool.length === 0 || unavailable ? styles.disabled : null]}><Text style={styles.primaryText}>はじめる（出題 {pool.length} 件）</Text></Pressable></View>
    </View>
  }

  if (session.phase === 'summary') return <ScrollView style={styles.summaryScroll} contentContainerStyle={styles.summaryContent}>
    <Text style={styles.eyebrow}>RESULT</Text><Text style={styles.title}>テスト結果</Text>
    <Text testID="quiz-summary" style={styles.summaryScore}>{session.tally.asked} 問中 {session.tally.correct} 正解</Text>
    <Text style={styles.summaryRate}>{session.tally.asked === 0 ? '今回はまだ解答していません' : `正答率 ${Math.round((session.tally.correct / session.tally.asked) * 100)}%`}</Text>
    <Pressable testID="quiz-return-setup" accessibilityRole="button" onPress={returnToSetup} style={styles.primaryButton}><Text style={styles.primaryText}>設定に戻る</Text></Pressable>
  </ScrollView>

  const prompt = session.phase === 'result'
    ? '回答結果'
    : session.direction === 'figToName'
      ? (session.phase === 'pick' ? '手順1：図の点を選んでください' : '手順2：この部位の名前を答えてください')
      : askedStructure === null
        ? '出題を準備しています'
        : `「${askedStructure.nameJa}」を図から選んでください`
  return <View style={styles.root}>
    <View testID="quiz-diagram" style={[styles.canvasWrap, { height: diagramHeight }]}>
      <AnatomyCanvas geometry={geometry} image={image} layer={session.layer} depth={session.depth} viewBox={viewBox} onViewBox={(update) => commit((current) => ({ ...current, vb: update(current.vb ?? fit(geometry.size)) }))} mode="part" visiblePartIds={new Set(pool.map((part) => part.id))} selectedPartId={session.phase === 'choice' || session.phase === 'result' ? session.askedId : null} suppressLabels labelOf={(part: Part) => STRUCTURE_BY_ID.get(part.id)?.nameJa ?? part.id} onPickArea={() => {}} onPickPart={onPickPart} onPickNothing={() => {}} mirrored={session.view === 'right'} />
    </View>
    <ScrollView ref={answerScrollRef} testID="quiz-answer-scroll" style={styles.answerScroll}>
      {session.phase === 'result' && session.result !== null ? <View style={styles.resultBlock}>
        <Text testID="quiz-result" accessibilityLiveRegion="polite" style={[styles.resultText, session.result.ok ? styles.ok : styles.ng]}>{session.result.ok ? '正解' : `不正解 · 正解：${askedStructure?.nameJa ?? '不明'}`} · あなたの回答：{selectedStructure?.nameJa ?? '不明'}</Text>
        {session.direction === 'nameToFig' && session.result.note ? <Text style={styles.resultNote} numberOfLines={1}>{session.result.note}</Text> : null}
        {askedStructure !== null ? <Link href={`/catalog/${askedStructure.id}?from=quiz`} asChild><Pressable testID="quiz-explain" accessibilityRole="link" style={styles.explainButton}><Text style={styles.explainText}>「{askedStructure.nameJa}」の解説を見る</Text></Pressable></Link> : null}
      </View> : null}
    <View style={styles.promptBar}>
      <View style={styles.promptMeta}><Text style={styles.modeBadge}>{session.direction === 'figToName' ? '図→名前' : '名前→図'}</Text><Text testID="quiz-score" style={styles.score}>{session.tally.asked} 問中 {session.tally.correct} 正解</Text></View>
      <Text testID={session.direction === 'nameToFig' && session.askedId ? `quiz-prompt-${session.askedId}` : 'quiz-prompt'} style={styles.prompt}>{prompt}</Text>
    </View>
      <View style={styles.answerContent}>

      {session.phase === 'choice' ? (
        <View style={styles.choices}>
          {choices.map((choice) => (
            <Pressable
              key={choice.id}
              testID={`choice-${choice.id}`}
              accessibilityRole="button"
              accessibilityLabel={choice.nameJa}
              onPress={() => choose(choice)}
              style={styles.choice}
            >
              <Text style={styles.choiceText}>{choice.nameJa}</Text>
            </Pressable>
          ))}
        </View>
      ) : session.phase === 'result' && session.direction === 'figToName' ? (
        <View testID="answered-choices">
          <Text style={styles.answeredHeading}>回答済みの選択肢</Text>
          {choices.map((choice) => {
            const correct = choice.id === session.askedId
            const selected = choice.id === session.result?.selectedId
            const status = selected
              ? (correct ? 'あなたの回答・正解' : 'あなたの回答')
              : (correct ? '正解' : '未選択')
            return (
              <View
                key={choice.id}
                testID={`choice-${choice.id}`}
                accessible
                accessibilityLabel={`${choice.nameJa}、${status}`}
                style={styles.answeredRow}
              >
                <Text style={[styles.choiceText, selected ? styles.answeredSelected : null]}>{choice.nameJa}</Text>
                <Text style={[styles.answeredStatus, correct ? styles.ok : null]}>{status}</Text>
              </View>
            )
          })}
        </View>
      ) : (
        <Text style={styles.answerHint}>
          {session.direction === 'figToName'
            ? '図は拡大・移動できます。光る点から部位を選んでください。'
            : '図は拡大・移動できます。名前に合う点を選んでください。'}
        </Text>
      )}
      </View>
    </ScrollView>
    <View style={styles.actionFooter}>
      {session.phase === 'result' && session.result !== null ? <>
        <View style={styles.actionRow}><Pressable testID="quiz-stop" accessibilityRole="button" accessibilityLabel="テストを終了する" onPress={showSummary} style={styles.secondaryButton}><Text style={styles.secondaryText}>終了</Text></Pressable><Pressable testID="quiz-next" accessibilityRole="button" accessibilityLabel="次の問題" onPress={next} style={[styles.primaryButton, styles.nextButton]}><Text style={styles.primaryText}>次へ</Text></Pressable></View>
      </> : <Pressable testID="quiz-stop" accessibilityRole="button" accessibilityLabel="テストを終了する" onPress={showSummary} style={styles.secondaryButton}><Text style={styles.secondaryText}>終了して結果を見る</Text></Pressable>}
    </View>
  </View>
}

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 0, backgroundColor: color.bg }, setupScroll: { flex: 1, minHeight: 0 }, setupContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 24, gap: 18 }, headingBlock: { gap: 4, marginBottom: 2 }, eyebrow: { fontFamily: fontSansBold, fontSize: 11, letterSpacing: 2, color: color.bone }, title: { fontFamily: fontSansBold, fontSize: 24, lineHeight: 32, color: color.fg }, intro: { fontFamily: fontSans, fontSize: 14, lineHeight: 22, color: color.muted },
  field: { gap: 7 }, fieldLabel: { fontFamily: fontSansMedium, fontSize: 14, lineHeight: 20, color: color.fg }, options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, option: { minHeight: 44, borderRadius: radius.pill, paddingHorizontal: 16, justifyContent: 'center', borderWidth: 1 }, optionSelected: { backgroundColor: color.bone, borderColor: color.bone }, optionIdle: { backgroundColor: color.raised, borderColor: color.lineStrong }, optionDisabled: { opacity: 0.35 }, optionText: { fontFamily: fontSans, fontSize: 14, lineHeight: 20, color: color.muted }, optionTextSelected: { color: color.accentFg }, hint: { fontFamily: fontSans, fontSize: 12, lineHeight: 18, color: color.muted },
  modeHelp: { borderRadius: radius.card, borderWidth: 1, borderColor: color.lineStrong, backgroundColor: color.surface, padding: 14, gap: 3 }, modeHelpTitle: { fontFamily: fontSansMedium, fontSize: 14, color: color.bone }, modeHelpText: { fontFamily: fontSans, fontSize: 14, lineHeight: 22, color: color.fg }, warning: { fontFamily: fontSansMedium, fontSize: 13, lineHeight: 20, color: '#e0a0a0' }, setupFooter: { flexShrink: 0, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 12, borderTopWidth: 1, borderTopColor: color.line, backgroundColor: color.surface },
  primaryButton: { minHeight: 44, borderRadius: radius.pill, backgroundColor: color.bone, paddingHorizontal: 18, paddingVertical: 10, alignItems: 'center', justifyContent: 'center' }, primaryText: { fontFamily: fontSansMedium, fontSize: 14, lineHeight: 20, color: color.accentFg, textAlign: 'center' }, disabled: { opacity: 0.4 }, summaryScroll: { flex: 1, backgroundColor: color.bg }, summaryContent: { flexGrow: 1, justifyContent: 'center', padding: 24, gap: 12 }, summaryScore: { fontFamily: fontSansBold, fontSize: 30, lineHeight: 40, color: color.fg }, summaryRate: { fontFamily: fontSans, fontSize: 16, lineHeight: 24, color: color.muted, marginBottom: 16 },
  canvasWrap: { flexShrink: 0, minHeight: 0, position: 'relative', backgroundColor: color.bg }, promptBar: { flexShrink: 0, paddingHorizontal: 16, paddingVertical: 10, gap: 5, borderTopWidth: 1, borderTopColor: color.line, borderBottomWidth: 1, borderBottomColor: color.line, backgroundColor: color.surface }, promptMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }, modeBadge: { fontFamily: fontSansMedium, fontSize: 12, lineHeight: 18, color: color.bone }, score: { fontFamily: fontSans, fontSize: 12, lineHeight: 18, color: color.muted }, prompt: { fontFamily: fontSansMedium, fontSize: 16, lineHeight: 24, color: color.fg },
  resultBlock: { padding: 12, gap: 7, backgroundColor: color.surface }, answerScroll: { flex: 1, minHeight: 0 }, answerContent: { flexGrow: 1, padding: 12 }, choices: { gap: 8 }, choice: { minHeight: 44, borderRadius: radius.card, backgroundColor: color.raised, borderWidth: 1, borderColor: color.lineStrong, paddingHorizontal: 16, paddingVertical: 11, justifyContent: 'center' }, answeredHeading: { fontFamily: fontSansMedium, fontSize: 14, lineHeight: 20, color: color.muted, paddingBottom: 4 }, answeredRow: { minHeight: 44, paddingVertical: 10, gap: 2, borderBottomWidth: 1, borderBottomColor: color.line }, answeredSelected: { fontFamily: fontSansMedium }, answeredStatus: { fontFamily: fontSans, fontSize: 12, lineHeight: 18, color: color.muted }, choiceText: { fontFamily: fontSans, fontSize: 15, lineHeight: 23, color: color.fg }, answerHint: { fontFamily: fontSans, fontSize: 13, lineHeight: 20, color: color.muted }, actionFooter: { flexShrink: 0, gap: 7, paddingHorizontal: 12, paddingTop: 8, paddingBottom: 10, borderTopWidth: 1, borderTopColor: color.line, backgroundColor: color.surface }, resultText: { fontFamily: fontSansMedium, fontSize: 13, lineHeight: 18 }, resultNote: { fontFamily: fontSans, fontSize: 12, lineHeight: 17, color: color.muted }, ok: { color: '#9ec9a0' }, ng: { color: '#e0a0a0' }, explainButton: { minHeight: 44, justifyContent: 'center', alignSelf: 'stretch' }, explainText: { fontFamily: fontSans, fontSize: 14, lineHeight: 20, color: color.bone, textDecorationLine: 'underline' }, actionRow: { flexDirection: 'row', gap: 8 }, secondaryButton: { minHeight: 44, borderRadius: radius.pill, borderWidth: 1, borderColor: color.lineStrong, paddingHorizontal: 16, paddingVertical: 9, alignItems: 'center', justifyContent: 'center' }, secondaryText: { fontFamily: fontSansMedium, fontSize: 14, lineHeight: 20, color: color.fg, textAlign: 'center' }, nextButton: { flex: 1 },
})
