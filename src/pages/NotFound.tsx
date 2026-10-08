import { Link, Navigate, useLocation } from 'react-router';
import { classify } from '../lib/classify';
import { pageTitleStyle, subtitleStyle } from '../styles/styles';

/** Path-style links (/lnbc1...) redirect to /?q=; anything else is a 404. */
export default function NotFound() {
    const { pathname } = useLocation();
    const candidate = decodeURIComponent(pathname.slice(1));
    if (candidate && classify(candidate).kind !== 'unknown') {
        return <Navigate to={`/?q=${encodeURIComponent(candidate)}`} replace />;
    }
    return (
        <div className="page">
            <h1 style={pageTitleStyle}>Not found</h1>
            <p style={subtitleStyle}>
                There is nothing at this address.{' '}
                <Link to="/">Go to the decoder</Link>.
            </p>
        </div>
    );
}
