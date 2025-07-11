import './Loading.css';

interface LoadingProps {
  /**
   * Optional text to display with the loading indicator
   */
  text?: string;
}

export const Loading = ({ text }: LoadingProps = {}) => {
  return (
    <div className="loading">
      <div className="loading-bar" />
      {text && <div className="loading-text">{text}</div>}
    </div>
  );
};

export default Loading;
