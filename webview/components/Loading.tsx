import './Loading.css';

interface LoadingProps {
  progress?: number | null;
}

export const Loading = ({ progress }: LoadingProps = {}) => {
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
    </div>
  );
};

export default Loading;
