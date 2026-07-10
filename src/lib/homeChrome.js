// Cross-tree signal for the desktop home's chrome fade. MainView (desktop home)
// writes the intro/morph fade here every render — (uiVisible ? 1 : 0) * (1 - textOut),
// the same formula its old absolute top bar used — and resets it to 1 on unmount.
// App's DesktopBanner rAF loop applies it while the home route is displayed, so the
// App-level banner keeps the intro reveal + orb-morph fade choreography without any
// prop threading. Mutable-module contract, same pattern as lib/orbOverlay.
const homeChrome = { fade: 1 }
export default homeChrome
