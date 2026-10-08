// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    act,
    cleanup,
    fireEvent,
    render,
    screen
} from '@testing-library/react';
import { StrictMode } from 'react';
import CopyButton from './CopyButton';

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.useRealTimers();
});

function stubClipboard(writeText: (v: string) => Promise<void>) {
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
}

describe('CopyButton', () => {
    it('shows Copied after a successful write, then resets', async () => {
        vi.useFakeTimers();
        const writeText = vi.fn(async () => undefined);
        stubClipboard(writeText);
        render(<CopyButton value='{"a":1}' label="Copy JSON" />);
        await act(async () => {
            fireEvent.click(screen.getByRole('button'));
        });
        expect(writeText).toHaveBeenCalledWith('{"a":1}');
        expect(screen.getByRole('button').textContent).toBe('Copied');
        await act(async () => {
            vi.advanceTimersByTime(2000);
        });
        expect(screen.getByRole('button').textContent).toBe('Copy JSON');
    });

    it('shows Copy failed when the clipboard refuses', async () => {
        stubClipboard(async () => {
            throw new Error('denied');
        });
        render(<CopyButton value="x" label="Copy JSON" />);
        await act(async () => {
            fireEvent.click(screen.getByRole('button'));
        });
        expect(screen.getByRole('button').textContent).toBe('Copy failed');
    });

    it('shows feedback under StrictMode, which runs effects twice', async () => {
        stubClipboard(async () => undefined);
        render(
            <StrictMode>
                <CopyButton value="x" label="Copy JSON" />
            </StrictMode>
        );
        await act(async () => {
            fireEvent.click(screen.getByRole('button'));
        });
        expect(screen.getByRole('button').textContent).toBe('Copied');
    });
});
