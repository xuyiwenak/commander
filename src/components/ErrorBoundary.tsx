import { Component, type ReactNode } from 'react';
import { biTrackError } from '@/utils/bi';

interface Props { children: ReactNode; }
interface State { hasError: boolean; }

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    biTrackError(error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 48, textAlign: 'center' }}>
          <h2>页面出错了</h2>
          <p>错误已自动上报，请刷新页面重试</p>
        </div>
      );
    }
    return this.props.children;
  }
}
