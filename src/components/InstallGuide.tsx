import { useState } from 'react'

type Platform = 'ios' | 'android' | 'desktop'
const detectPlatform = (): Platform => {
  const agent = navigator.userAgent.toLocaleLowerCase()
  const isIPad = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
  if (/iphone|ipad|ipod/.test(agent) || isIPad) return 'ios'
  if (/android/.test(agent)) return 'android'
  return 'desktop'
}

const guides: Record<Platform, { title: string; note: string; steps: string[] }> = {
  ios: { title: 'iPhone・iPad', note: 'Safariでこのアプリを開いて操作します。Chromeからは追加できない場合があります。', steps: ['Safari下部の共有ボタン（□に↑）を押す', 'メニューを下へスクロールする', '「ホーム画面に追加」を押す', '右上の「追加」を押す'] },
  android: { title: 'Android', note: 'Chromeでこのアプリを開いて操作します。機種によって表示名が少し異なります。', steps: ['Chrome右上の︙メニューを押す', '「アプリをインストール」または「ホーム画面に追加」を押す', '確認画面で「インストール」を押す'] },
  desktop: { title: 'パソコン', note: 'Chromeで公開済みのアプリを開くと、アプリとしてインストールできます。', steps: ['Chromeのアドレス欄右側にあるインストールアイコンを押す', '確認画面で「インストール」を押す', '作成されたアプリのショートカットから起動する'] },
}

export function InstallGuide({ onBack }: { onBack: () => void }) {
  const [platform, setPlatform] = useState<Platform>(detectPlatform)
  const standalone = window.matchMedia('(display-mode: standalone)').matches || ('standalone' in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  const guide = guides[platform]

  return <div className="app-shell"><header className="page-header"><button className="back-button" type="button" onClick={onBack}>‹</button><div><p className="app-eyebrow">INSTALL GUIDE</p><h1>ホーム画面に追加</h1></div></header><main className="store-main">
    {standalone ? <section className="install-status installed"><span aria-hidden="true">✓</span><div><strong>アプリとして起動しています</strong><p>ホーム画面やアプリ一覧から利用できる状態です。</p></div></section> : <section className="install-status"><span aria-hidden="true">＋</span><div><strong>ブラウザで起動しています</strong><p>ホーム画面へ追加すると、通常のアプリに近い形で素早く起動できます。</p></div></section>}
    <section className="install-guide-card"><label htmlFor="install-platform">確認する端末</label><select id="install-platform" value={platform} onChange={event => setPlatform(event.target.value as Platform)}><option value="ios">iPhone・iPad</option><option value="android">Android</option><option value="desktop">パソコン</option></select><h2>{guide.title}での追加手順</h2><p>{guide.note}</p><ol>{guide.steps.map((step, index) => <li key={step}><span>{index + 1}</span><strong>{step}</strong></li>)}</ol></section>
    <p className="install-guide-note">ホーム画面への追加は公開後のURLで行います。開発用の localhost で追加したものは、別の端末では使用できません。端末内の記録は、追加前と追加後で起動元が異なると共有されない場合があるため、運用開始後は同じアイコンから起動してください。</p>
  </main></div>
}
