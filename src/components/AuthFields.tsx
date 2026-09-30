import { useState, type ReactNode } from 'react';
import { Button, Description, FieldError, Input, InputGroup, Label, TextField } from '@heroui/react';
import type { AuthError } from '@supabase/supabase-js';
import { t } from '../lib/i18n';
import { Icon } from './Icon';

type FieldProps = {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  description?: string;
  autoFocus?: boolean;
};

export function EmailField({ value, onChange, error, description, autoFocus, isReadOnly }: FieldProps & { isReadOnly?: boolean }) {
  return (
    <TextField
      name="email"
      type="email"
      value={value}
      onChange={onChange}
      isInvalid={Boolean(error)}
      isReadOnly={isReadOnly}
      autoFocus={autoFocus}
      className="auth-field"
    >
      <Label>{t('auth.email')}</Label>
      <Input autoComplete="email" placeholder={t('auth.emailPlaceholder')} />
      {description && <Description>{description}</Description>}
      <FieldError>{error}</FieldError>
    </TextField>
  );
}

export function PasswordField({
  value,
  onChange,
  error,
  description,
  autoFocus,
  label = t('auth.password'),
  labelAction,
  autoComplete,
}: FieldProps & { label?: string; labelAction?: ReactNode; autoComplete: 'current-password' | 'new-password' }) {
  const [visible, setVisible] = useState(false);
  return (
    <TextField
      name="password"
      type={visible ? 'text' : 'password'}
      value={value}
      onChange={onChange}
      isInvalid={Boolean(error)}
      autoFocus={autoFocus}
      className="auth-field"
    >
      <div className="auth-label-row">
        <Label>{label}</Label>
        {labelAction}
      </div>
      <InputGroup>
        <InputGroup.Input autoComplete={autoComplete} />
        <InputGroup.Suffix className="password-toggle">
          <Button
            isIconOnly
            size="sm"
            variant="ghost"
            aria-label={t('auth.showPassword')}
            aria-pressed={visible}
            onPress={() => setVisible((v) => !v)}
          >
            <Icon name={visible ? 'eye-off' : 'eye'} />
          </Button>
        </InputGroup.Suffix>
      </InputGroup>
      {description && <Description>{description}</Description>}
      <FieldError>{error}</FieldError>
    </TextField>
  );
}

export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/** A Supabase hibakódjai felhasználói nyelvre. */
export function authErrorMessage(error: AuthError): string {
  switch (error.code) {
    case 'invalid_credentials':
      return t('auth.errors.invalidCredentials');
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
      return t('auth.errors.rateLimit');
    case 'same_password':
      return t('auth.errors.samePassword');
    default:
      return t('auth.errors.generic');
  }
}

/** Az űrlap egészére vonatkozó hiba (pl. hibás jelszó): a felolvasó azonnal bemondja. */
export function FormError({ message }: { message: string }) {
  return (
    <p className="form-error" role="alert">
      {message}
    </p>
  );
}

/** Sikertelen ellenőrzés után a fókusz az első hibás mezőre kerül, így a felolvasó azt mondja be. */
export function focusFirstInvalid() {
  requestAnimationFrame(() => {
    document.querySelector<HTMLElement>('.auth-form [aria-invalid="true"]')?.focus();
  });
}
