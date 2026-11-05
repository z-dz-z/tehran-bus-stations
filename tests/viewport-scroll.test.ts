import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Viewport and Scroll Configuration Verification', () => {
  it('ensures index.html pins body to fixed inset-0 and avoids h-screen / w-screen', () => {
    const htmlPath = path.resolve(__dirname, '../index.html');
    const htmlContent = fs.readFileSync(htmlPath, 'utf-8');

    expect(htmlContent).toContain('fixed inset-0');
    expect(htmlContent).toContain('overflow-hidden');
    // Ensure legacy h-screen and w-screen are eliminated from body
    expect(htmlContent).not.toMatch(/<body[^>]*h-screen/);
    expect(htmlContent).not.toMatch(/<body[^>]*w-screen/);
  });

  it('ensures index.css configures height: 100dvh, position: fixed, and overscroll-behavior: none', () => {
    const cssPath = path.resolve(__dirname, '../src/index.css');
    const cssContent = fs.readFileSync(cssPath, 'utf-8');

    expect(cssContent).toContain('100dvh');
    expect(cssContent).toContain('position: fixed');
    expect(cssContent).toContain('overscroll-behavior: none');
  });

  it('ensures App.tsx uses fixed inset-0, h-dvh, and listens for scroll/resize to lock window.scrollY', () => {
    const appPath = path.resolve(__dirname, '../src/App.tsx');
    const appContent = fs.readFileSync(appPath, 'utf-8');

    expect(appContent).toContain('fixed inset-0 w-full h-full h-dvh overflow-hidden');
    expect(appContent).toContain('window.scrollTo(0, 0)');
    expect(appContent).toContain('safe-area-inset-top');
    expect(appContent).toContain('safe-area-inset-bottom');
  });

  it('ensures StationSheet.tsx does not use activeEl.scrollIntoView and uses container.scrollBy instead', () => {
    const sheetPath = path.resolve(__dirname, '../src/components/StationSheet.tsx');
    const sheetContent = fs.readFileSync(sheetPath, 'utf-8');

    // Make sure scrollIntoView was completely removed to prevent vertical window jumping
    expect(sheetContent).not.toContain('scrollIntoView');
    expect(sheetContent).toContain('container.scrollBy');
    expect(sheetContent).toContain('55dvh');
  });

  it('ensures SearchOverlay.tsx uses preventScroll on focus and dvh units', () => {
    const searchPath = path.resolve(__dirname, '../src/components/SearchOverlay.tsx');
    const searchContent = fs.readFileSync(searchPath, 'utf-8');

    expect(searchContent).toContain('preventScroll: true');
    expect(searchContent).toContain('85dvh');
    expect(searchContent).toContain('70dvh');
  });
});

