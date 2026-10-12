import { fireEvent, render, screen } from '@testing-library/react-native';
import { I18nManager, StyleSheet } from 'react-native';

import '@/i18n';

import { LanguageBadge } from '../LanguageBadge';
import { Icon } from './Icon';
import { EmptyState, ErrorState, LoadingState } from './States';
import { Text } from './Text';

describe('state components', () => {
  it('LoadingState exposes a progressbar with an accessible label', () => {
    render(<LoadingState />);
    expect(screen.getByRole('progressbar')).toBeTruthy();
    expect(screen.getByLabelText(/.+/)).toBeTruthy();
  });

  it('EmptyState shows title and message, and an action only when given', () => {
    const onAction = jest.fn();
    const { rerender } = render(<EmptyState title="Nothing yet" message="Come back later" />);
    expect(screen.getByText('Nothing yet')).toBeTruthy();
    expect(screen.getByText('Come back later')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();

    rerender(<EmptyState title="Nothing yet" message="Come back later" actionLabel="Browse" onAction={onAction} />);
    fireEvent.press(screen.getByRole('button', { name: 'Browse' }));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('ErrorState offers a retry button only when a handler is passed', () => {
    const onRetry = jest.fn();
    const { rerender } = render(<ErrorState />);
    expect(screen.queryByRole('button')).toBeNull();

    rerender(<ErrorState onRetry={onRetry} />);
    fireEvent.press(screen.getByRole('button'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

describe('Icon direction', () => {
  const flatten = (node: { props: { style?: unknown } }) => StyleSheet.flatten(node.props.style as never) ?? {};

  afterEach(() => {
    Object.defineProperty(I18nManager, 'isRTL', { value: false, configurable: true, writable: true });
  });

  it('mirrors directional icons in RTL only', () => {
    Object.defineProperty(I18nManager, 'isRTL', { value: true, configurable: true, writable: true });
    render(
      <>
        <Icon name="chevron-forward" directional />
        <Icon name="home" />
      </>,
    );
    expect(JSON.stringify(flatten(screen.getByTestId('icon-chevron-forward', { includeHiddenElements: true })))).toContain('scaleX');
    expect(JSON.stringify(flatten(screen.getByTestId('icon-home', { includeHiddenElements: true })))).not.toContain('scaleX');
  });

  it('does not mirror in LTR', () => {
    render(<Icon name="chevron-forward" directional />);
    expect(JSON.stringify(flatten(screen.getByTestId('icon-chevron-forward', { includeHiddenElements: true })))).not.toContain('scaleX');
  });
});

describe('LanguageBadge', () => {
  it('shows the uppercase language code as text, never a flag, and is hidden from screen readers', () => {
    render(<LanguageBadge code="de" />);
    expect(screen.getByText(/DE/, { includeHiddenElements: true })).toBeTruthy();
    expect(screen.queryByText(/DE/)).toBeNull();
  });
});

describe('Text', () => {
  it('applies the typography variant', () => {
    render(<Text variant="title">Hello</Text>);
    const style = StyleSheet.flatten(screen.getByText('Hello').props.style) as { fontSize?: number };
    expect(style.fontSize).toBeGreaterThan(20);
  });
});
