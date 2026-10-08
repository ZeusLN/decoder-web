import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const pkg = JSON.parse(
    readFileSync(new URL('./package.json', import.meta.url), 'utf8')
);

// Commit the bundle was built from, stamped into the footer. Short sha,
// plus "-dirty" when the tree has uncommitted changes. DECODER_GIT_SHA
// wins so builds outside a git checkout can still stamp a real sha.
function gitSha(): string {
    const override = process.env.DECODER_GIT_SHA?.trim();
    if (override) {
        return override;
    }
    const git = (args: string) =>
        execSync(`git ${args}`, { stdio: ['ignore', 'pipe', 'ignore'] })
            .toString()
            .trim();
    try {
        const sha = git('rev-parse --short HEAD');
        if (!sha) {
            return 'unknown';
        }
        return git('status --porcelain') ? `${sha}-dirty` : sha;
    } catch {
        return 'unknown';
    }
}

export default defineConfig({
    plugins: [react()],
    define: {
        __APP_VERSION__: JSON.stringify(pkg.version),
        __GIT_SHA__: JSON.stringify(gitSha())
    }
});
