import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="notfound">
      <div>
        <h1>404</h1>
        <p className="muted">We could not find that page.</p>
        <p>
          <Link to="/">Back to dashboard</Link>
        </p>
      </div>
    </div>
  );
}
