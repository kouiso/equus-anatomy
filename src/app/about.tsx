import { useRouter } from 'expo-router'
import { useState, type ReactNode } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import {
  appInfo,
  CONTACT_URL,
  COPYRIGHT,
  NOTICE_URL,
  openExternal,
  PRIVACY_POLICY_URL,
} from '../ui/about-info'
import { ariaLevel } from '../ui/aria'
import { reflowLicenseText } from '../ui/license-text'
import { DEPENDENCY_NOTICES, FONT_LICENSES, MIT_LICENSE_TEXT } from '../ui/licenses'
import { useStableTopInset } from '../ui/safe-area'
import { useT } from '../ui/locale-store'
import { SUPERVISION_SUMMARY } from '../ui/supervision-status'
import { color, fontDisplayItalic, fontSans, fontSansMedium, radius, trackingBrand } from '../ui/theme'

const BRAND_SIZE = 14

export default function About() {
  const router = useRouter()
  const topInset = useStableTopInset()
  const info = appInfo()
  const close = () => (router.canGoBack() ? router.back() : router.replace('/'))
  const supervision = SUPERVISION_SUMMARY
  const t = useT()

  return (
    <View style={styles.root} testID="about-screen">
      <View style={[styles.header, { paddingTop: Math.max(12, topInset) }]}>
        <Text accessibilityRole="header" style={styles.title}>
          {t('about.screenTitle')}
        </Text>
        <Pressable accessibilityRole="button" accessibilityLabel={t('common.close')} onPress={close} style={styles.button}>
          <Text style={styles.text}>{t('common.close')}</Text>
        </Pressable>
      </View>

      <ScrollView testID="about-scroll" style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.brand}>EQUUS</Text>
          <Text testID="about-app-name" style={styles.appName}>
            {info.name}
          </Text>
          <Text testID="about-version" style={styles.text}>
            {t('about.version', { version: info.version })}
          </Text>
          <Text testID="about-build" style={styles.muted}>
            {t('about.build', { build: info.buildNumber ?? t('about.buildUnknown') })}
          </Text>
          <Text testID="about-copyright" style={styles.muted}>
            {COPYRIGHT}
          </Text>
        </View>

        <Section title={t('about.supervision')} testID="about-supervision">
          {supervision.level === 'none' ? (
            <>
              <Text testID="about-supervision-status" style={styles.badge}>
                {t('about.supervised.none')}
              </Text>
              <Text style={styles.text}>{t('supervision.notice.none')}</Text>
              <Text style={styles.muted}>{t('about.noneBody1', { total: supervision.total })}</Text>
              <Text style={styles.muted}>{t('about.noneBody2')}</Text>
            </>
          ) : (
            <>
              <Text testID="about-supervision-status" style={[styles.badge, styles.badgeOn]}>
                {supervision.level === 'full' ? t('about.supervised.full') : t('about.supervised.partial')}
              </Text>
              <Text style={styles.text}>{t('about.supervisedCount', { count: supervision.supervisedCount, total: supervision.total })}</Text>
              {supervision.credits.map((credit) => (
                <Text key={`${credit.displayName}-${credit.reviewedOn}`} style={styles.text}>
                  {t('about.credit', { name: credit.displayName, date: credit.reviewedOn })}
                </Text>
              ))}
              {supervision.level === 'partial' ? (
                <>
                  <Text style={styles.muted}>{t('about.supervisedNames', { names: supervision.supervisedNames.join('、') })}</Text>
                  <Text style={styles.muted}>{t('about.partialNote')}</Text>
                </>
              ) : null}
            </>
          )}
        </Section>

        <Section title={t('about.usage')}>
          <Text style={styles.muted}>{t('about.usageBody1')}</Text>
          <Text style={styles.muted}>{t('about.usageBody2')}</Text>
        </Section>

        <Section title={t('about.privacy')}>
          <Text style={styles.muted}>{t('about.privacyBody')}</Text>
          <LinkButton testID="about-privacy" label={t('about.privacyLink')} url={PRIVACY_POLICY_URL} />
        </Section>

        <Section title={t('about.contact')}>
          <LinkButton testID="about-contact" label={t('about.contactLink')} url={CONTACT_URL} />
        </Section>

        <Section title={t('about.licenses')} testID="about-licenses">
          <Text style={styles.text}>{t('about.thisApp')}</Text>
          <Text style={styles.muted}>{t('about.rightsReserved')}</Text>

          <Text style={styles.text}>{t('about.fonts')}</Text>
          {FONT_LICENSES.map((font) => (
            <View key={font.file} style={styles.item}>
              <Text style={styles.text}>{font.family}</Text>
              <Text style={styles.muted}>
                {font.copyright} · SIL Open Font License 1.1
              </Text>
              <Disclosure testID={`license-${font.file}`} label={t('about.licenseText')}>
                {font.text}
              </Disclosure>
            </View>
          ))}

          <Text style={styles.text}>{t('about.oss')}</Text>
          <Text style={styles.muted}>{t('about.ossNote')}</Text>
          <View testID="about-oss-list" style={styles.item}>
            {DEPENDENCY_NOTICES.map((dep) => (
              <Text key={dep.name} style={styles.small}>
                <Text style={styles.text}>{dep.name}</Text> — {dep.license}
                {'\n'}
                {dep.copyright}
              </Text>
            ))}
            <Disclosure testID="license-mit" label={t('about.mitText')}>
              {MIT_LICENSE_TEXT}
            </Disclosure>
          </View>
          <LinkButton testID="about-notice" label={t('about.noticeLink')} url={NOTICE_URL} />
        </Section>
      </ScrollView>
    </View>
  )
}

function Section(props: { title: string; testID?: string; children: ReactNode }) {
  return (
    <View style={styles.section} {...(props.testID ? { testID: props.testID } : {})}>
      <Text accessibilityRole="header" {...ariaLevel(2)} style={styles.sectionTitle}>
        {props.title}
      </Text>
      {props.children}
    </View>
  )
}

function LinkButton(props: { testID: string; label: string; url: string }) {
  return (
    <Pressable
      testID={props.testID}
      accessibilityRole="link"
      onPress={() => openExternal(props.url)}
      style={styles.link}
    >
      <Text style={styles.linkText}>{props.label}</Text>
    </Pressable>
  )
}

function Disclosure(props: { testID: string; label: string; children: string }) {
  const [open, setOpen] = useState(false)
  const t = useT()
  return (
    <>
      <Pressable
        testID={`${props.testID}-toggle`}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(!open)}
        style={styles.link}
      >
        <Text style={styles.linkText}>
          {open ? t('about.disclosureHide', { label: props.label }) : t('about.disclosureShow', { label: props.label })}
        </Text>
      </Pressable>
      {open ? (
        <Text selectable testID={props.testID} style={styles.licenseText}>
          {reflowLicenseText(props.children)}
        </Text>
      ) : null}
    </>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 0, backgroundColor: color.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    gap: 12,
  },
  title: { fontFamily: fontSans, fontSize: 20, color: color.fg, flexShrink: 1 },
  button: {
    minHeight: 44,
    padding: 12,
    justifyContent: 'center',
    backgroundColor: color.raised,
    borderRadius: 12,
  },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 40, gap: 16, width: '100%', maxWidth: 720, alignSelf: 'center' },
  hero: { gap: 4 },
  brand: {
    fontFamily: fontDisplayItalic,
    fontStyle: 'italic',
    fontSize: BRAND_SIZE,
    lineHeight: BRAND_SIZE + 4,
    letterSpacing: trackingBrand(BRAND_SIZE),
    color: color.muted,
  },
  appName: { fontFamily: fontSansMedium, fontSize: 22, lineHeight: 30, color: color.fg },
  section: {
    gap: 8,
    padding: 16,
    borderRadius: radius.card,
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.line,
  },
  sectionTitle: { fontFamily: fontSansMedium, fontSize: 16, lineHeight: 22, color: color.fg },
  text: { fontFamily: fontSans, fontSize: 14, lineHeight: 22, color: color.fg },
  muted: { fontFamily: fontSans, fontSize: 13, lineHeight: 21, color: color.muted },
  small: { fontFamily: fontSans, fontSize: 12, lineHeight: 18, color: color.muted },
  item: { gap: 6, paddingLeft: 8, borderLeftWidth: 1, borderLeftColor: color.line },
  badge: {
    alignSelf: 'flex-start',
    fontFamily: fontSansMedium,
    fontSize: 12,
    lineHeight: 18,
    color: color.fg,
    backgroundColor: color.raised,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 4,
    overflow: 'hidden',
  },
  badgeOn: { color: color.accentFg, backgroundColor: color.bone },
  link: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
  linkText: { fontFamily: fontSans, fontSize: 13, color: color.bone, textDecorationLine: 'underline' },
  licenseText: {
    fontFamily: fontSans,
    fontSize: 12,
    lineHeight: 19,
    color: color.muted,
    padding: 12,
    borderRadius: radius.card,
    backgroundColor: color.raised,
  },
})
