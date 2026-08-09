# Video Speed Shortcuts

This context describes the user-facing language for controlling HTML5 video playback with keyboard shortcuts.

## Playback

**Shortcut action**:
A user-configurable keyboard action for temporarily speeding up, increasing, decreasing, or resetting video playback speed.
_Avoid_: command, hotkey behavior

**Hold-to-speed**:
The Space shortcut's two-stage behavior: a short press toggles playback, while a held press temporarily changes speed and restores the prior playback state when released.
_Avoid_: boost mode, turbo mode

**Active video**:
The video element selected for a shortcut action when a page contains multiple videos, based on playback state, available media, visibility, and picture-in-picture state.
_Avoid_: focused video, primary video

**Playback settings**:
The user's saved choices for speed range, hold-to-speed behavior, shortcut actions, indicator visibility, language, theme, and site scope.
_Avoid_: preferences, options blob

## Site scope

**Site scope**:
The set of normalized hostnames where playback shortcuts are enabled or blocked.
_Avoid_: domain filter, URL list

**Blocked site**:
A site-scope entry that prevents shortcut actions for that hostname and its subdomains.
_Avoid_: disabled domain, excluded URL
