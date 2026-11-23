import { fireEvent, render, screen } from '@testing-library/react-native';
import { I18nManager, StyleSheet } from 'react-native';

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
  it('calls onPress when enabled', async () => {
    const onPress = jest.fn();
    await render(<Button title="Go" onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Go' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('ignores presses and reports disabled state while disabled', async () => {
    const onPress = jest.fn();
    await render(<Button title="Go" onPress={onPress} disabled />);
    const button = screen.getByRole('button', { name: 'Go' });
    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
    expect(button).toBeDisabled();
  });

  it('ignores presses and reports busy state while loading', async () => {
    const onPress = jest.fn();
    await render(<Button title="Go" onPress={onPress} loading />);
    const button = screen.getByRole('button', { name: 'Go' });
    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
    expect(button).toBeBusy();
  });
});

describe('Input', () => {
  it('shows the error text', async () => {
    await render(<Input label="Email" value="" onChangeText={() => {}} error="Required" />);
    expect(screen.getByText('Required')).toBeTruthy();
  });

  it('toggles password visibility', async () => {
    await render(<Input label="Password" value="secret" onChangeText={() => {}} password />);
    expect(screen.getByLabelText('Password').props.secureTextEntry).toBe(true);
    await fireEvent.press(screen.getByRole('button'));
    expect(screen.getByLabelText('Password').props.secureTextEntry).toBe(false);
  });
});

describe('Input design rules', () => {
  it('uses the strong border for the field outline and the error colour when invalid', async () => {
    const outline = () =>
      StyleSheet.flatten(screen.container.queryAll((v) => v.type === 'View' && StyleSheet.flatten(v.props.style)?.borderWidth === 1)[0]!.props.style)
        .borderColor;
    const { rerender } = await render(<Input label="Email" value="" onChangeText={() => {}} />);
    expect(outline()).toBe(palettes.light.borderStrong);

    await rerender(<Input label="Email" value="" onChangeText={() => {}} error="Required" />);
    expect(outline()).toBe(palettes.light.error);
  });

  it('labels the password toggle for screen readers in both states', async () => {
    await render(<Input label="Password" value="x" onChangeText={() => {}} password />);
    expect(screen.getByRole('button', { name: 'Show password' })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button'));
    expect(screen.getByRole('button', { name: 'Hide password' })).toBeTruthy();
  });
});

describe('Button design rules', () => {
  it('keeps a 48dp minimum touch target and no fixed height', async () => {
    await render(<Button title="Go" onPress={() => {}} />);
    const style = StyleSheet.flatten(screen.getByRole('button').props.style);
    expect(style.minHeight).toBeGreaterThanOrEqual(48);
    expect(style.height).toBeUndefined();
  });

  it('uses the accessibilityLabel override when given', async () => {
    await render(<Button title="Go" accessibilityLabel="Go to home" onPress={() => {}} />);
    expect(screen.getByRole('button', { name: 'Go to home' })).toBeTruthy();
  });
});

describe('Text', () => {
  it('applies the typography variant and theme colour', async () => {
    await render(<Text variant="title" color="primary">Hi</Text>);
    const style = StyleSheet.flatten(screen.getByText('Hi').props.style);
    expect(style).toMatchObject({ ...typography.title, color: palettes.light.primary });
  });
});

// The mocked Ionicons glyph is a host Text that carries `name`; take the last (innermost) match.
const glyph = (name: string) => screen.container.queryAll((node) => node.props.name === name).at(-1)!;

describe('Icon', () => {
  afterEach(() => jest.restoreAllMocks());

  it('mirrors a directional icon in RTL only', async () => {
    jest.replaceProperty(I18nManager, 'isRTL', true);
    const { rerender } = await render(<Icon name="chevron-forward" directional />);
    expect(glyph('chevron-forward').props.style).toEqual({ transform: [{ scaleX: -1 }] });

    await rerender(<Icon name="chevron-forward" />);
    expect(glyph('chevron-forward').props.style).toBeUndefined();
  });

  it('does not mirror in LTR', async () => {
    jest.replaceProperty(I18nManager, 'isRTL', false);
    await render(<Icon name="chevron-forward" directional />);
    expect(glyph('chevron-forward').props.style).toBeUndefined();
  });

  it('is hidden from accessibility (the label lives on the control)', async () => {
    await render(<Icon name="home" />);
    expect(glyph('home').props.accessibilityElementsHidden).toBe(true);
  });
});

describe('state components', () => {
  it('ErrorState announces the error and retries on press', async () => {
    const onRetry = jest.fn();
    await render(<ErrorState onRetry={onRetry} />);
    expect(screen.getByText('Something went wrong')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('ErrorState without a retry handler shows no button', async () => {
    await render(<ErrorState title="Oops" message="Broken" />);
    expect(screen.getByText('Oops')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('ErrorState shows offline copy for a connection failure', async () => {
    await render(<ErrorState error={{ message: 'no link', code: 'network' }} />);
    expect(screen.getByText('You seem to be offline. Check your connection and try again.')).toBeTruthy();
  });

  it('ErrorState shows the generic copy for other failures', async () => {
    await render(<ErrorState error={new Error('storage broke')} />);
    expect(screen.getByText('We could not complete that. Please try again.')).toBeTruthy();
  });

  it('EmptyState renders its title, message and optional action', async () => {
    const onAction = jest.fn();
    await render(<EmptyState title="Nothing" message="Come back later" actionLabel="Refresh" onAction={onAction} />);
    expect(screen.getByText('Nothing')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Refresh' }));
    expect(onAction).toHaveBeenCalled();
  });

  it('LoadingState exposes a labelled progressbar', async () => {
    await render(<LoadingState />);
    expect(screen.getByRole('progressbar', { name: 'Loading…' })).toBeTruthy();
  });
});

describe('LanguageBadge', () => {
  it('shows the flag and is decorative for screen readers', async () => {
    await render(<LanguageBadge language={{ flag: '🇩🇪' }} />);
    expect(screen.getByText('🇩🇪', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.queryByText('🇩🇪')).toBeNull(); // hidden from the accessibility tree
  });
});

describe('Button icon direction', () => {
  afterEach(() => jest.restoreAllMocks());

  it('mirrors a directional icon in RTL', async () => {
    jest.replaceProperty(I18nManager, 'isRTL', true);
    await render(<Button title="Go" icon="play-outline" iconDirectional onPress={() => {}} />);
    expect(glyph('play-outline').props.style).toEqual({ transform: [{ scaleX: -1 }] });
  });
});
