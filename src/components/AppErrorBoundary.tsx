import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { failed: boolean }

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unexpected application error', error, info)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return <main className="fatal-error-screen">
      <div className="fatal-error-mark" aria-hidden="true">!</div>
      <p className="app-eyebrow">RECOVERY</p>
      <h1>画面を表示できませんでした</h1>
      <p>一時的なエラーの可能性があります。端末に保存されている店舗・景品・プレイ記録は、この操作では削除されません。</p>
      <button type="button" onClick={() => window.location.reload()}>アプリを再読み込み</button>
      <small>繰り返し表示される場合は、ブラウザのデータを削除せず、エラー画面を記録して確認してください。</small>
    </main>
  }
}
