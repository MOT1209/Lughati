import { fireEvent, render, screen } from '@testing-library/react-native';

import '@/i18n';

import { Button } from './Button';
import { Input } from './Input';

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
