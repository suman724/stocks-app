import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import App from './App';

describe('App', () => {
    it('renders Watchlist and Settings links', () => {
        render(<App />);
        expect(screen.getAllByText('Watchlist').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Settings').length).toBeGreaterThan(0);
    });
});
