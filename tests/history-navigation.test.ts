import { describe, it, expect, vi } from 'vitest';

interface NavigationHistoryState {
  sheetOpen?: boolean;
  modal?: 'timetable' | 'search' | null;
  stop?: number | null;
  route?: number | null;
  canGoBack?: boolean;
}

// Simulates the exact state machine and history stack logic implemented in App.tsx
class HistoryNavigationSimulator {
  historyStack: { state: NavigationHistoryState; url: string }[] = [];
  currentIndex = -1;

  // React state mirrors
  selectedStationCode: number | null = null;
  activeRouteCode: number | null = null;
  timetableRouteCode: number | null = null;
  isSearchOpen = false;

  constructor(initialUrl: string = 'http://localhost/') {
    const url = new URL(initialUrl);
    const stopParam = url.searchParams.get('stop');
    const routeParam = url.searchParams.get('route');

    const initialState: NavigationHistoryState = {
      sheetOpen: Boolean(stopParam),
      stop: stopParam ? Number(stopParam) : null,
      route: routeParam ? Number(routeParam) : null,
      canGoBack: false,
    };

    this.historyStack = [{ state: initialState, url: initialUrl }];
    this.currentIndex = 0;

    if (stopParam) {
      this.selectedStationCode = Number(stopParam);
      if (routeParam) this.activeRouteCode = Number(routeParam);
    }
  }

  get currentState(): NavigationHistoryState {
    return this.historyStack[this.currentIndex]?.state ?? {};
  }

  get currentUrl(): string {
    return this.historyStack[this.currentIndex]?.url ?? '';
  }

  private buildUrl(stationCode: number | null, routeCode?: number | null): string {
    const url = new URL(this.currentUrl);
    if (stationCode !== null) {
      url.searchParams.set('stop', String(stationCode));
      if (routeCode !== undefined && routeCode !== null) {
        url.searchParams.set('route', String(routeCode));
      } else {
        url.searchParams.delete('route');
      }
    } else {
      url.searchParams.delete('stop');
      url.searchParams.delete('route');
    }
    return url.toString();
  }

  // Select Station (User taps station on map or favorite or search result)
  selectStation(stationCode: number, targetRouteCode?: number, options?: { replace?: boolean }) {
    const isAlreadyOpen = this.selectedStationCode !== null;
    this.selectedStationCode = stationCode;
    this.activeRouteCode = targetRouteCode ?? null;
    this.isSearchOpen = false;

    const nextUrl = this.buildUrl(stationCode, targetRouteCode);
    const nextState: NavigationHistoryState = {
      sheetOpen: true,
      stop: stationCode,
      route: targetRouteCode,
      canGoBack: options?.replace ? Boolean(this.currentState.canGoBack) : true,
    };

    if (isAlreadyOpen || options?.replace) {
      // Option A: replace state in-place so 1 Back button dismisses the sheet
      this.historyStack[this.currentIndex] = { state: nextState, url: nextUrl };
    } else {
      // Fresh open from map: push state
      this.historyStack = this.historyStack.slice(0, this.currentIndex + 1);
      this.historyStack.push({ state: nextState, url: nextUrl });
      this.currentIndex++;
    }
  }

  // Switch active route within open station sheet
  selectRoute(routeCode: number) {
    this.activeRouteCode = routeCode;
    this.isSearchOpen = false;
    if (this.selectedStationCode !== null) {
      const nextUrl = this.buildUrl(this.selectedStationCode, routeCode);
      const nextState: NavigationHistoryState = {
        sheetOpen: true,
        stop: this.selectedStationCode,
        route: routeCode,
        canGoBack: Boolean(this.currentState.canGoBack),
      };
      this.historyStack[this.currentIndex] = { state: nextState, url: nextUrl };
    }
  }

  // Close station sheet from UI ("X" button)
  closeStationFromUI() {
    if (this.currentState.canGoBack) {
      this.back();
    } else {
      this.clearStationState();
      const nextUrl = this.buildUrl(null);
      this.historyStack[this.currentIndex] = {
        state: { sheetOpen: false, stop: null, route: null },
        url: nextUrl,
      };
    }
  }

  // Open Timetable modal
  openTimetable(routeCode: number) {
    this.timetableRouteCode = routeCode;
    const nextState: NavigationHistoryState = {
      sheetOpen: true,
      stop: this.selectedStationCode,
      route: routeCode,
      modal: 'timetable',
      canGoBack: true,
    };
    this.historyStack = this.historyStack.slice(0, this.currentIndex + 1);
    this.historyStack.push({ state: nextState, url: this.currentUrl });
    this.currentIndex++;
  }

  closeTimetableFromUI() {
    if (this.currentState.modal === 'timetable') {
      this.back();
    } else {
      this.timetableRouteCode = null;
    }
  }

  // Open Search overlay
  openSearch() {
    this.isSearchOpen = true;
    const nextState: NavigationHistoryState = {
      sheetOpen: this.selectedStationCode !== null,
      stop: this.selectedStationCode,
      route: this.activeRouteCode,
      modal: 'search',
      canGoBack: true,
    };
    this.historyStack = this.historyStack.slice(0, this.currentIndex + 1);
    this.historyStack.push({ state: nextState, url: this.currentUrl });
    this.currentIndex++;
  }

  closeSearchFromUI() {
    if (this.currentState.modal === 'search') {
      this.back();
    } else {
      this.isSearchOpen = false;
    }
  }

  // Simulate hardware Back button / swipe back gesture / browser back
  back() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.onPopState(this.currentState);
    }
  }

  private clearStationState() {
    this.selectedStationCode = null;
    this.activeRouteCode = null;
  }

  private onPopState(state: NavigationHistoryState) {
    // 1. Timetable modal was open and user pressed Back
    if (this.timetableRouteCode !== null && (!state || state.modal !== 'timetable')) {
      this.timetableRouteCode = null;
      return;
    }

    // 2. Search overlay was open and user pressed Back
    if (this.isSearchOpen && (!state || state.modal !== 'search')) {
      this.isSearchOpen = false;
      return;
    }

    // 3. Station sheet was open and user pressed Back (popped to map)
    if (this.selectedStationCode !== null && (!state || !state.sheetOpen)) {
      this.clearStationState();
      return;
    }

    // 4. Popped to another station
    if (state?.sheetOpen && state.stop && state.stop !== this.selectedStationCode) {
      this.selectStation(state.stop, state.route ?? undefined, { replace: true });
    }
  }
}

describe('Mobile Back Button Navigation System', () => {
  it('opens station bottom sheet with pushState, and pressing Back closes the sheet back to map', () => {
    const sim = new HistoryNavigationSimulator('http://localhost/');

    expect(sim.selectedStationCode).toBeNull();
    expect(sim.historyStack.length).toBe(1);

    // User taps station 1001
    sim.selectStation(1001, 260);

    expect(sim.selectedStationCode).toBe(1001);
    expect(sim.activeRouteCode).toBe(260);
    expect(sim.historyStack.length).toBe(2);
    expect(sim.currentUrl).toContain('stop=1001');
    expect(sim.currentState.sheetOpen).toBe(true);

    // User presses Back button on mobile
    sim.back();

    // Sheet should dismiss, leaving user on the map
    expect(sim.selectedStationCode).toBeNull();
    expect(sim.activeRouteCode).toBeNull();
    expect(sim.currentIndex).toBe(0);
    expect(sim.currentUrl).toBe('http://localhost/');
  });

  it('replaces history when switching stations so 1 Back button dismisses to map (Option A)', () => {
    const sim = new HistoryNavigationSimulator('http://localhost/');

    // Tap station 1001 -> pushes 1 entry
    sim.selectStation(1001, 260);
    expect(sim.historyStack.length).toBe(2);

    // Tap station 1002 while sheet is open -> should replace, NOT push another entry
    sim.selectStation(1002, 301);
    expect(sim.selectedStationCode).toBe(1002);
    expect(sim.activeRouteCode).toBe(301);
    expect(sim.historyStack.length).toBe(2); // Still 2 entries!
    expect(sim.currentUrl).toContain('stop=1002');

    // Tap station 1003 -> still replaces
    sim.selectStation(1003, 105);
    expect(sim.historyStack.length).toBe(2);

    // Single Back press dismisses directly to the map
    sim.back();
    expect(sim.selectedStationCode).toBeNull();
    expect(sim.currentIndex).toBe(0);
    expect(sim.currentUrl).toBe('http://localhost/');
  });

  it('clicking the UI close ("X") button cleans up history stack via history.back()', () => {
    const sim = new HistoryNavigationSimulator('http://localhost/');

    sim.selectStation(1001);
    expect(sim.historyStack.length).toBe(2);
    expect(sim.currentIndex).toBe(1);

    // User clicks the 'X' button
    sim.closeStationFromUI();

    expect(sim.selectedStationCode).toBeNull();
    expect(sim.currentIndex).toBe(0); // Popped cleanly!
  });

  it('supports layered modal dismiss: Timetable modal closes on 1st Back, Station sheet on 2nd Back', () => {
    const sim = new HistoryNavigationSimulator('http://localhost/');

    // Open station sheet
    sim.selectStation(1001, 260);
    expect(sim.historyStack.length).toBe(2);

    // Open timetable modal
    sim.openTimetable(260);
    expect(sim.timetableRouteCode).toBe(260);
    expect(sim.historyStack.length).toBe(3);
    expect(sim.currentState.modal).toBe('timetable');

    // 1st Back press: closes Timetable modal, Station sheet stays open!
    sim.back();
    expect(sim.timetableRouteCode).toBeNull();
    expect(sim.selectedStationCode).toBe(1001); // Station sheet remains active
    expect(sim.currentIndex).toBe(1);

    // 2nd Back press: closes Station sheet, returns to map!
    sim.back();
    expect(sim.selectedStationCode).toBeNull();
    expect(sim.currentIndex).toBe(0);
  });

  it('supports layered modal dismiss for Search overlay', () => {
    const sim = new HistoryNavigationSimulator('http://localhost/');

    // Open search from map
    sim.openSearch();
    expect(sim.isSearchOpen).toBe(true);
    expect(sim.historyStack.length).toBe(2);

    // Back press dismisses search overlay
    sim.back();
    expect(sim.isSearchOpen).toBe(false);
    expect(sim.selectedStationCode).toBeNull();
    expect(sim.currentIndex).toBe(0);
  });

  it('closes search and opens station sheet seamlessly when station is selected from search', () => {
    const sim = new HistoryNavigationSimulator('http://localhost/');

    sim.openSearch();
    expect(sim.isSearchOpen).toBe(true);

    // User clicks station 1005 in search results
    sim.selectStation(1005, 301, { replace: true });
    expect(sim.isSearchOpen).toBe(false);
    expect(sim.selectedStationCode).toBe(1005);
    expect(sim.historyStack.length).toBe(2);

    // Back press goes directly back to map
    sim.back();
    expect(sim.selectedStationCode).toBeNull();
    expect(sim.currentIndex).toBe(0);
  });

  it('handles direct deep links (?stop=1001) gracefully without crashing or creating bad history', () => {
    const sim = new HistoryNavigationSimulator('http://localhost/?stop=1001&route=260');

    expect(sim.selectedStationCode).toBe(1001);
    expect(sim.activeRouteCode).toBe(260);
    expect(sim.historyStack.length).toBe(1);
    expect(sim.currentState.canGoBack).toBe(false);

    // User clicks UI close button on a direct deep link
    sim.closeStationFromUI();
    expect(sim.selectedStationCode).toBeNull();
    expect(sim.currentUrl).toBe('http://localhost/');
  });
});
