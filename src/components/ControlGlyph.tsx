import React from 'react';
import { GamepadType } from '../data/catalog';

interface ControlGlyphProps {
  path: string;
  gamepadType?: GamepadType;
  size?: 'sm' | 'md' | 'lg';
  dimmed?: boolean;
}

export function stripDevicePrefix(path: string): string {
  if (!path) return '';
  const slash = path.indexOf('/');
  return path.startsWith('<') && slash >= 0 ? path.substring(slash + 1) : path;
}

export function formatReadableBinding(path: string, gamepadType: GamepadType = 'PlayStation'): string {
  if (!path) return '—';
  const ctrl = stripDevicePrefix(path);
  const isPs = gamepadType === 'PlayStation';

  switch (ctrl) {
    case 'buttonSouth':
      return isPs ? 'Cross (✕)' : 'A';
    case 'buttonEast':
      return isPs ? 'Circle (○)' : 'B';
    case 'buttonWest':
      return isPs ? 'Square (□)' : 'X';
    case 'buttonNorth':
      return isPs ? 'Triangle (△)' : 'Y';
    case 'leftShoulder':
      return isPs ? 'L1' : 'LB';
    case 'rightShoulder':
      return isPs ? 'R1' : 'RB';
    case 'leftTrigger':
      return isPs ? 'L2' : 'LT';
    case 'rightTrigger':
      return isPs ? 'R2' : 'RT';
    case 'leftStickPress':
      return isPs ? 'L3' : 'LS';
    case 'rightStickPress':
      return isPs ? 'R3' : 'RS';
    case 'leftStick':
      return isPs ? 'L-Stick' : 'L-Stick';
    case 'rightStick':
      return isPs ? 'R-Stick' : 'R-Stick';
    case 'leftStick/left':
      return 'L-Stick ←';
    case 'leftStick/right':
      return 'L-Stick →';
    case 'rightStick/left':
      return 'R-Stick ←/→';
    case 'dpad/up':
      return 'D-Pad ↑';
    case 'dpad/down':
      return 'D-Pad ↓';
    case 'dpad/left':
      return 'D-Pad ←';
    case 'dpad/right':
      return 'D-Pad →';
    case 'select':
      return isPs ? 'Create' : 'View';
    case 'start':
      return isPs ? 'Options' : 'Menu';
    case 'touchpadButton':
      return 'Touchpad';
    case 'systemButton':
      return isPs ? 'PS' : 'Xbox';
    case 'micButton':
      return 'Mic';
    // Mouse
    case 'leftButton':
      return 'LMB';
    case 'rightButton':
      return 'RMB';
    case 'middleButton':
      return 'MMB';
    case 'scroll':
      return 'Scroll';
    // Keyboard
    case 'space':
      return 'Space';
    case 'shift':
    case 'leftShift':
      return 'Shift';
    case 'ctrl':
    case 'leftCtrl':
      return 'Ctrl';
    case 'alt':
    case 'leftAlt':
      return 'Alt';
    case 'tab':
      return 'Tab';
    case 'backslash':
      return '\\';
    case 'escape':
      return 'Esc';
    default:
      return ctrl.length === 1 ? ctrl.toUpperCase() : ctrl;
  }
}

export const ControlGlyph: React.FC<ControlGlyphProps> = ({
  path,
  gamepadType = 'PlayStation',
  size = 'md',
  dimmed = false,
}) => {
  if (!path) {
    return (
      <span className={`glyph-unbound glyph-${size} ${dimmed ? 'glyph-dimmed' : ''}`}>
        —
      </span>
    );
  }

  const ctrl = stripDevicePrefix(path);
  const isPs = gamepadType === 'PlayStation';
  const px = size === 'sm' ? 22 : size === 'lg' ? 32 : 26;

  // PlayStation / Xbox Face Buttons
  if (
    ctrl === 'buttonSouth' ||
    ctrl === 'buttonEast' ||
    ctrl === 'buttonWest' ||
    ctrl === 'buttonNorth'
  ) {
    if (isPs) {
      const colors: Record<string, { stroke: string; bg: string }> = {
        buttonSouth: { stroke: '#7CA7FF', bg: 'rgba(65, 115, 235, 0.18)' }, // Cross (Blue)
        buttonEast: { stroke: '#FF7D7D', bg: 'rgba(235, 75, 75, 0.18)' },  // Circle (Red)
        buttonWest: { stroke: '#E58CFF', bg: 'rgba(205, 85, 240, 0.18)' },  // Square (Pink)
        buttonNorth: { stroke: '#5CE6B5', bg: 'rgba(50, 205, 150, 0.18)' }, // Triangle (Green)
      };
      const c = colors[ctrl];
      return (
        <span
          className={`glyph-badge glyph-circle glyph-${size} ${dimmed ? 'glyph-dimmed' : ''}`}
          style={{ width: px, height: px, background: c.bg, borderColor: c.stroke }}
          title={formatReadableBinding(path, gamepadType)}
        >
          <svg viewBox="0 0 24 24" width={px * 0.62} height={px * 0.62} fill="none">
            {ctrl === 'buttonSouth' && (
              <path
                d="M6.5 6.5L17.5 17.5M17.5 6.5L6.5 17.5"
                stroke={c.stroke}
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            )}
            {ctrl === 'buttonEast' && (
              <circle cx="12" cy="12" r="6.2" stroke={c.stroke} strokeWidth="2.4" />
            )}
            {ctrl === 'buttonWest' && (
              <rect
                x="6.2"
                y="6.2"
                width="11.6"
                height="11.6"
                rx="1.5"
                stroke={c.stroke}
                strokeWidth="2.4"
              />
            )}
            {ctrl === 'buttonNorth' && (
              <path
                d="M12 5.5L18.5 17.2H5.5L12 5.5Z"
                stroke={c.stroke}
                strokeWidth="2.3"
                strokeLinejoin="round"
              />
            )}
          </svg>
        </span>
      );
    } else {
      const xboxMap: Record<string, { letter: string; color: string; bg: string }> = {
        buttonSouth: { letter: 'A', color: '#5CE67E', bg: 'rgba(55, 195, 90, 0.18)' },
        buttonEast: { letter: 'B', color: '#FF7373', bg: 'rgba(235, 65, 65, 0.18)' },
        buttonWest: { letter: 'X', color: '#6BB5FF', bg: 'rgba(65, 145, 240, 0.18)' },
        buttonNorth: { letter: 'Y', color: '#FFD452', bg: 'rgba(240, 185, 45, 0.18)' },
      };
      const xb = xboxMap[ctrl];
      return (
        <span
          className={`glyph-badge glyph-circle glyph-xbox glyph-${size} ${dimmed ? 'glyph-dimmed' : ''}`}
          style={{ width: px, height: px, background: xb.bg, borderColor: xb.color, color: xb.color }}
          title={`Xbox ${xb.letter}`}
        >
          {xb.letter}
        </span>
      );
    }
  }

  // Shoulders & Triggers (L1/R1/L2/R2 or LB/RB/LT/RT)
  if (
    ctrl === 'leftShoulder' ||
    ctrl === 'rightShoulder' ||
    ctrl === 'leftTrigger' ||
    ctrl === 'rightTrigger'
  ) {
    const label = formatReadableBinding(path, gamepadType);
    const isTrigger = ctrl.endsWith('Trigger');
    return (
      <span
        className={`glyph-badge glyph-shoulder ${isTrigger ? 'glyph-trigger' : ''} glyph-${size} ${
          dimmed ? 'glyph-dimmed' : ''
        }`}
        title={label}
      >
        {label}
      </span>
    );
  }

  // D-Pad
  if (ctrl.startsWith('dpad/')) {
    const dir = ctrl.split('/')[1];
    return (
      <span
        className={`glyph-badge glyph-dpad glyph-${size} ${dimmed ? 'glyph-dimmed' : ''}`}
        style={{ width: px, height: px }}
        title={`D-Pad ${dir}`}
      >
        <svg viewBox="0 0 24 24" width={px * 0.78} height={px * 0.78} fill="none">
          {/* Base cross */}
          <path
            d="M9 3H15V9H21V15H15V21H9V15H3V9H9V3Z"
            stroke="rgba(255,255,255,0.28)"
            strokeWidth="1.5"
            fill="rgba(255,255,255,0.06)"
          />
          {dir === 'up' && <path d="M9 3H15V9H9V3Z" fill="#C792FF" />}
          {dir === 'down' && <path d="M9 15H15V21H9V15Z" fill="#C792FF" />}
          {dir === 'left' && <path d="M3 9H9V15H3V9Z" fill="#C792FF" />}
          {dir === 'right' && <path d="M15 9H21V15H15V9Z" fill="#C792FF" />}
        </svg>
      </span>
    );
  }

  // Sticks (L3, R3, leftStick, rightStick, stick directions)
  if (ctrl.startsWith('leftStick') || ctrl.startsWith('rightStick')) {
    const isLeft = ctrl.startsWith('leftStick');
    const isPress = ctrl.endsWith('Press');
    const isDir = ctrl.includes('/');
    const dir = isDir ? ctrl.split('/')[1] : '';
    const stickLabel = isPress
      ? isPs
        ? isLeft
          ? 'L3'
          : 'R3'
        : isLeft
        ? 'LS'
        : 'RS'
      : isLeft
      ? 'L'
      : 'R';

    return (
      <span
        className={`glyph-badge glyph-stick ${isPress ? 'glyph-stick-press' : ''} glyph-${size} ${
          dimmed ? 'glyph-dimmed' : ''
        }`}
        title={formatReadableBinding(path, gamepadType)}
      >
        <svg viewBox="0 0 24 24" width={px * 0.65} height={px * 0.65} fill="none">
          <circle
            cx="12"
            cy="12"
            r="8.5"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray={isPress ? '3 1.5' : undefined}
          />
          <circle cx="12" cy="12" r="4.5" fill="currentColor" fillOpacity="0.25" />
        </svg>
        <span className="glyph-stick-text">
          {stickLabel}
          {dir === 'left' ? '←' : dir === 'right' ? '→' : ''}
        </span>
      </span>
    );
  }

  // Select / Start / Touchpad
  if (ctrl === 'select' || ctrl === 'start' || ctrl === 'touchpadButton') {
    const label = formatReadableBinding(path, gamepadType);
    return (
      <span
        className={`glyph-badge glyph-system glyph-${size} ${dimmed ? 'glyph-dimmed' : ''}`}
        title={label}
      >
        {ctrl === 'select' && (
          <svg viewBox="0 0 20 14" width={14} height={10} fill="none">
            {isPs ? (
              <path
                d="M10 2V12M5 4L3 10M15 4L17 10"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            ) : (
              <>
                <rect x="2" y="2" width="9" height="7" rx="1" stroke="currentColor" strokeWidth="1.6" />
                <path d="M8 5H16V12H8V5Z" stroke="currentColor" strokeWidth="1.6" />
              </>
            )}
          </svg>
        )}
        {ctrl === 'start' && (
          <svg viewBox="0 0 18 14" width={13} height={10} fill="none">
            <path
              d="M3 3H15M3 7H15M3 11H15"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        )}
        {ctrl === 'touchpadButton' && (
          <svg viewBox="0 0 20 14" width={14} height={10} fill="none">
            <rect x="1.5" y="2" width="17" height="10" rx="2" stroke="currentColor" strokeWidth="1.6" />
            <circle cx="5" cy="5" r="0.8" fill="currentColor" />
            <circle cx="8" cy="5" r="0.8" fill="currentColor" />
          </svg>
        )}
        <span>{label}</span>
      </span>
    );
  }

  // Mouse buttons
  if (path.startsWith('<Mouse>/')) {
    const label = formatReadableBinding(path, gamepadType);
    return (
      <span
        className={`glyph-badge glyph-mouse glyph-${size} ${dimmed ? 'glyph-dimmed' : ''}`}
        title={`Mouse: ${label}`}
      >
        <svg viewBox="0 0 18 24" width={13} height={17} fill="none">
          <rect
            x="2"
            y="2"
            width="14"
            height="20"
            rx="7"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <line x1="9" y1="2" x2="9" y2="10" stroke="currentColor" strokeWidth="1.4" />
          {ctrl === 'leftButton' && (
            <path d="M2.5 9V7A6.5 6.5 0 0 1 8.5 2.5V9H2.5Z" fill="#C792FF" />
          )}
          {ctrl === 'rightButton' && (
            <path d="M15.5 9V7A6.5 6.5 0 0 0 9.5 2.5V9H15.5Z" fill="#C792FF" />
          )}
          {(ctrl === 'middleButton' || ctrl === 'scroll') && (
            <rect x="7.5" y="4.5" width="3" height="5" rx="1.5" fill="#C792FF" />
          )}
        </svg>
        <span>{label}</span>
      </span>
    );
  }

  // Keyboard keycap
  const keyText = formatReadableBinding(path, gamepadType);
  return (
    <span
      className={`glyph-badge glyph-keycap glyph-${size} ${
        keyText.length > 2 ? 'glyph-keycap-wide' : ''
      } ${dimmed ? 'glyph-dimmed' : ''}`}
      title={keyText}
    >
      {keyText}
    </span>
  );
};
