import { font, fontWeight } from '../utils/FontUtils';

const LINKS = [
    { href: 'https://zeusln.com/wallet', label: 'Get a Lightning wallet' },
    { href: 'https://channels.zeuslsp.com/', label: 'Get a Lightning channel' }
];

const REPO_URL = 'https://github.com/ZeusLN/decoder-web';

/** GitHub mark (simple-icons). */
function GitHubIcon() {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            width={18}
            height={18}
            fill="currentColor"
            aria-hidden="true"
        >
            <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
        </svg>
    );
}

const linkStyle = {
    fontFamily: font('montrealMedium'),
    fontWeight: fontWeight.montrealMedium,
    fontSize: 13,
    color: 'var(--theme-highlight)',
    textDecoration: 'none'
};

export default function Footer() {
    return (
        <footer className="app-footer">
            <span
                style={{
                    fontFamily: font('montreal'),
                    fontWeight: fontWeight.montreal,
                    fontSize: 13,
                    color: 'var(--theme-secondaryText)'
                }}
            >
                &copy; {new Date().getFullYear()} Atlas 21 Inc.
            </span>
            <nav
                aria-label="ZEUS products"
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    justifyContent: 'center',
                    gap: 10
                }}
            >
                {LINKS.map((link, i) => (
                    <span
                        key={link.href}
                        style={{ display: 'inline-flex', gap: 10 }}
                    >
                        {i > 0 && (
                            <span
                                aria-hidden="true"
                                style={{
                                    color: 'var(--theme-secondaryText)',
                                    fontSize: 13
                                }}
                            >
                                |
                            </span>
                        )}
                        {/* No noreferrer, so the sites can see visits came
                            from the decoder; noopener covers the security
                            risk in current browsers. */}
                        {/* eslint-disable-next-line react/jsx-no-target-blank */}
                        <a
                            href={link.href}
                            target="_blank"
                            rel="noopener"
                            className="footer-link"
                            style={linkStyle}
                        >
                            {link.label}
                        </a>
                    </span>
                ))}
            </nav>
            <span
                className="app-footer-version"
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 14
                }}
            >
                <span
                    style={{
                        fontFamily: 'monospace',
                        fontSize: 12,
                        color: 'var(--theme-secondaryText)',
                        opacity: 0.7
                    }}
                >
                    v{__APP_VERSION__} · {__GIT_SHA__}
                </span>
                <a
                    href={REPO_URL}
                    target="_blank"
                    rel="noreferrer noopener"
                    aria-label="Source code on GitHub"
                    title="Source code on GitHub"
                    className="footer-icon-link"
                >
                    <GitHubIcon />
                </a>
            </span>
        </footer>
    );
}
