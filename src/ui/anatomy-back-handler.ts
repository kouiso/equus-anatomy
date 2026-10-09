import { useFocusEffect } from 'expo-router'
import { useCallback } from 'react'
import { BackHandler, Platform } from 'react-native'
import { stepBackAnatomy } from './anatomy-state'

/**
 * Android の端末 BACK(ボタン/ジェスチャ)で、画面遷移より先に選択を1段解除する。
 * app.json の predictiveBackGestureEnabled:false が前提。予測型 BACK を有効にする時は
 * hardwareBackPress の消費と OS の戻るアニメーションの整合を実機で確かめ直すこと。
 *
 * 解剖タブにフォーカスがある間だけ登録する。overlay(部位一覧・詳細)が上に載ると
 * フォーカスが外れて登録も外れるので、その BACK は overlay を閉じる既定の動きになる。
 * BackHandler は後から登録したものから呼ばれるので、react-navigation の既定より先に効く。
 *
 * Web では何もしない。ブラウザの戻るは履歴(タブ間遷移・#68)の意味で使っており、
 * 選択ごとに履歴を積むと「保存 → 図で見る → 戻る = 保存」が崩れる。
 */
export function useAnatomyBackHandler() {
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== 'android') return undefined
      const subscription = BackHandler.addEventListener('hardwareBackPress', stepBackAnatomy)
      return () => subscription.remove()
    }, []),
  )
}
