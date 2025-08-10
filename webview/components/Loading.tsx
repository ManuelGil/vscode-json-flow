import './Loading.css';

interface LoadingProps {
  /**
   * Optional text to display with the loading indicator
   */
  text?: string;
  /**
   * Optional progress value (0-100). When provided, the bar becomes determinate.
   */
  progress?: number;
}

export const Loading = ({ text, progress }: LoadingProps = {}) => {
  const isDeterminate = typeof progress === 'number' && !Number.isNaN(progress);
  const pct = isDeterminate
    ? Math.max(0, Math.min(100, Math.round(progress)))
    : undefined;
  return (
    <div className="loading">
      <div
        className={`loading-bar${isDeterminate ? ' determinate' : ''}`}
        style={isDeterminate ? { width: `${pct}%` } : undefined}
      />
      {(text || isDeterminate) && (
        <div className="loading-text">{text ?? `${pct}%`}</div>
      )}
    </div>
  );
};

export default Loading;
