import LoadingIndicator from './LoadingIndicator';

export default function Spinner({ size = 'md', color = 'primary', className = '', ...props }) {
  return <LoadingIndicator variant="spinner" size={size} color={color} className={className} {...props} />;
}
