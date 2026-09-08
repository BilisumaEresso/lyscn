import Landing from './Landing';

/**
 * Render Landing page when a user hits a session-guarded route without an active session
 */
export default function NoSession() {
  return <Landing />;
}
