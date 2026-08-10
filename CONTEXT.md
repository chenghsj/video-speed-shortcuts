# Video Speed Shortcuts

This context describes the user-facing language for controlling HTML5 video playback with keyboard shortcuts.

## Playback

**Shortcut action**:
A user-configurable keyboard action that can be independently enabled, disabled, or rebound for temporarily speeding up, increasing, decreasing, resetting, or applying a target playback speed.
_Avoid_: command, hotkey behavior

**Hold-to-speed**:
The Space shortcut's two-stage behavior: a short press toggles playback, while a held press temporarily changes speed and restores the prior playback state when released.
_Avoid_: boost mode, turbo mode

**Target speed**:
A configurable playback speed that a shortcut applies directly, without stepping through intermediate speeds.
_Avoid_: preset slot, saved rate

**Active video**:
The video element selected for a shortcut action when a page contains multiple videos, based on playback state, available media, visibility, and picture-in-picture state.
_Avoid_: focused video, primary video

**Playback settings**:
The user's saved choices for speed range, target speed, hold-to-speed behavior, shortcut actions, indicator visibility, language, theme, and site rules.
_Avoid_: preferences, options blob

## Site rules

**Site rule**:
A hostname-scoped override that applies to the hostname and its subdomains. A rule can disable shortcuts or override the target speed and indicator visibility; the most specific matching hostname wins.
_Avoid_: domain filter, URL list, blocked site

**Blocked site**:
A site rule with shortcuts disabled.
_Avoid_: blacklist entry, excluded URL
