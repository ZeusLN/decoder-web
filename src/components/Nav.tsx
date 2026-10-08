import { NavLink } from 'react-router';
import { font, fontWeight } from '../utils/FontUtils';

const linkStyle = {
    fontFamily: font('montrealMedium'),
    fontWeight: fontWeight.montrealMedium,
    fontSize: 14,
    textDecoration: 'none',
    padding: '6px 12px',
    borderRadius: 6,
    transition: 'background-color 0.15s ease'
};

const navLinkStyle = ({ isActive }: { isActive: boolean }) => ({
    ...linkStyle,
    color: isActive ? 'var(--theme-highlight)' : 'var(--theme-secondaryText)',
    background: isActive ? 'var(--theme-secondary)' : 'transparent'
});

export default function Nav() {
    return (
        <nav
            className="app-nav"
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 24px',
                borderBottom: '1px solid var(--theme-separator)',
                background: 'transparent'
            }}
        >
            <NavLink
                to="/"
                aria-label="ZEUS Decoder home"
                style={{
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    color: 'var(--theme-highlight)',
                    flexShrink: 0
                }}
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 258.12 100"
                    style={{ height: 20, fill: 'currentColor' }}
                    aria-hidden="true"
                >
                    <path d="m13.83,27.6L0,0h46.47C29.48,4.39,19.86,16.16,13.83,27.6Zm12.86,72.4h46.47l-13.83-27.6c-6.03,11.43-15.65,23.21-32.64,27.6ZM50.12,0L0,100h23.05L73.17,0h-23.05Zm59.33,27.59L123.28,0h-46.47c16.99,4.39,26.62,16.16,32.64,27.6Zm-32.64,72.4h46.47l-13.83-27.6c-6.03,11.43-15.65,23.21-32.64,27.6Zm-3.14-89.97l-11.52,22.98,8.51,16.99-8.51,16.98,11.52,22.98,20.03-39.96-20.03-39.97ZM179.43.01h-23.05s25.06,49.99,25.06,49.99l-25.06,50h23.04l25.06-50L179.43.01Zm-75.68,49.99l25.06,50h23.04s-25.06-50-25.06-50L151.85,0h-23.04s-25.06,50-25.06,50Zm140.53-22.4L258.12,0h-46.47c16.99,4.39,26.62,16.16,32.64,27.6Zm-45.5,44.81l-13.83,27.6h46.47c-16.99-4.39-26.62-16.16-32.64-27.6ZM184.95,0l50.12,100h23.05S208.01.01,208.01.01h-23.06Z" />
                </svg>
                <span
                    style={{
                        fontFamily: font('marlideBold'),
                        fontSize: 16,
                        color: 'var(--theme-secondaryText)',
                        opacity: 0.7
                    }}
                >
                    Decoder
                </span>
            </NavLink>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <NavLink to="/" end style={navLinkStyle}>
                    Decode
                </NavLink>
                <NavLink to="/verify" style={navLinkStyle}>
                    Verify preimage
                </NavLink>
            </div>
        </nav>
    );
}
