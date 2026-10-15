import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the industrial waste exchange app login page', () => {
  render(<App />);
  expect(screen.getByText(/industrial waste exchange/i)).toBeInTheDocument();
});
