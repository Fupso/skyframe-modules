// Shim — React dodáva core cez window.React (moduly nebundlujú vlastný React)
var React = window.React;
export default React;
export var useState = React.useState;
export var useEffect = React.useEffect;
export var useMemo = React.useMemo;
export var useRef = React.useRef;
export var useCallback = React.useCallback;
export var useSyncExternalStore = React.useSyncExternalStore;
export var createElement = React.createElement;
export var Fragment = React.Fragment;
