import { fireEvent, render, screen } from '@testing-library/react-native';
import { I18nManager, StyleSheet, View } from 'react-native';

import { setUiLocale } from '@/i18n';
import { LanguageBadge } from '@/components/LanguageBadge';
import { palettes } from '@/theme/colors';
import { typography } from '@/theme/typography';

import { Button } from './Button';
import { Icon } from './Icon';
import { Input } from './Input';
import { EmptyState, ErrorState, LoadingState } from './States';
import { Text } from './Text';

// Jest reports an English device; pin the locale so assertions do not depend on it.
beforeAll(() => setUiLocale('en'));

describe('Button', () => {
  it('calls onPress when enabled', () => {
    const onPress = jest.fn();
    render(<Button title="Go" onPress={onPress} />);
    fireEvent.press(screen.getByRole('button', { name: 'Go' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('ignores presses and reports disabled state while disabled', () => {
    const onPress = jest.fn();
    render(<Button title="Go" onPress={onPress} disabled />);
    const button = screen.getByRole('button', { name: 'Go' });
    fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
    expect(button).toBeDisabled();
  });

  it('ignores presses and reports busy state while loading', () => {
    const onPress = jest.fn();
    render(<Button title="Go" onPress={onPress} loading />);
    const button = screen.getByRole('button', { name: 'Go' });
    fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
    expect(button).toBeBusy();
  });
});

describe('Input', () => {
  it('shows the error text', () => {
    render(<Input label="Email" value="" onChangeText={() => {}} error="Required" />);
    expect(screen.getByText('Required')).toBeTruthy();
  });

  it('toggles password visibility', () => {
    render(<Input label="Password" value="secret" onChangeText={() => {}} password />);
    expect(screen.getByLabelText('Password').props.secureTextEntry).toBe(true);
    fireEvent.press(screen.getByRole('button'));
    expect(screen.getByLabelText('Password').props.secureTextEntry).toBe(false);
  });
});

describe('Input design rules', () => {
  it('uses the strong border for the field outline and the error colour when invalid', () => {
    const outline = () =>
      StyleSheet.flatten(screen.UNSAFE_getAllByType(View).find((v) => StyleSheet.flatten(v.props.style)?.borderWidth === 1)!.props.style)
        .borderColor;
    const { rerender } = render(<Input label="Email" value="" onChangeText={() => {}} />);
    expect(outline()).toBe(palettes.light.borderStrong);

    rerender(<Input label="Email" value="" onChangeText={() => {}} error="Required" />);
    expect(outline()).toBe(palettes.light.error);
  });

  it('labels the password toggle for screen readers in both states', () => {
    render(<Input label="Password" value="x" onChangeText={() => {}} password />);
    expect(screen.getByRole('button', { name: 'Show password' })).toBeTruthy();
    fireEvent.press(screen.getByRole('button'));
    expect(screen.getByRole('button', { name: 'Hide password' })).toBeTruthy();
  });
});

describe('Button design rules', () => {
  it('keeps a 48dp minimum touch target and no fixed height', () => {
    render(<Button title="Go" onPress={() => {}} />);
    const style = StyleSheet.flatten(screen.getByRole('button').props.style);
    expect(style.minHeight).toBeGreaterThanOrEqual(48);
    expect(style.height).toBeUndefined();
  });

  it('uses the accessibilityLabel override when given', () => {
    render(<Button title="Go" accessibilityLabel="Go to home" onPress={() => {}} />);
    expect(screen.getByRole('button', { name: 'Go to home' })).toBeTruthy();
  });
});

describe('Text', () => {
  it('applies the typography variant and theme colour', () => {
    render(<Text variant="title" color="primary">Hi</Text>);
    const style = StyleSheet.flatten(screen.getByText('Hi').props.style);
    expect(style).toMatchObject({ ...typography.title, color: palettes.light.primary });
  });
});

// The Icon element itself also carries `name`; the last match is the rendered glyph.
const glyph = (name: string) => screen.UNSAFE_getAllByProps({ name }).at(-1)!;

describe('Icon', () => {
  afterEach(() => jest.restoreAllMocks());

  it('mirrors a directional icon in RTL only', () => {
    jest.replaceProperty(I18nManager, 'isRTL', true);
    const { rerender } = render(<Icon name="chevron-forward" directional />);
    expect(glyph('chevron-forward').props.style).toEqual({ transform: [{ scaleX: -1 }] });

    rerender(<Icon name="chevron-forward" />);
    expect(glyph('chevron-forward').props.style).toBeUndefined();
  });

  it('does not mirror in LTR', () => {
    jest.replaceProperty(I18nManager, 'isRTL', false);
    render(<Icon name="chevron-forward" directional />);
    expect(glyph('chevron-forward').props.style).toBeUndefined();
  });

  it('is hidden from accessibility (the label lives on the control)', () => {
    render(<Icon name="home" />);
    expect(glyph('home').props.accessibilityElementsHidden).toBe(true);
  });
});

describe('state components', () => {
  it('ErrorState announces the error and retries on press', () => {
    const onRetry = jest.fn();
    render(<ErrorState onRetry={onRetry} />);
    expect(screen.getByText('Something went wrong')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('ErrorState without a retry handler shows no button', () => {
    render(<ErrorState title="Oops" message="Broken" />);
    expect(screen.getByText('Oops')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('EmptyState renders its title, message and optional action', () => {
    const onAction = jest.fn();
    render(<EmptyState title="Nothing" message="Come back later" actionLabel="Refresh" onAction={onAction} />);
    expect(screen.getByText('Nothing')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Refresh' }));
    expect(onAction).toHaveBeenCalled();
  });

  it('LoadingState exposes a labelled progressbar', () => {
    render(<LoadingState />);
    expect(screen.getByRole('progressbar', { name: 'Loading…' })).toBeTruthy();
  });
});

describe('LanguageBadge', () => {
  it('shows the flag and is decorative for screen readers', () => {
    render(<LanguageBadge language={{ flag: '🇩🇪' }} />);
    expect(screen.getByText('🇩🇪', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.queryByText('🇩🇪')).toBeNull(); // hidden from the accessibility tree
  });
});

describe('Button icon direction', () => {
  afterEach(() => jest.restoreAllMocks());

  it('mirrors a directional icon in RTL', () => {
    jest.replaceProperty(I18nManager, 'isRTL', true);
    render(<Button title="Go" icon="play-outline" iconDirectional onPress={() => {}} />);
    expect(glyph('play-outline').props.style).toEqual({ transform: [{ scaleX: -1 }] });
  });
});
