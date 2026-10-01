import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { Button, Form } from '@heroui/react';
import { AuthLayout } from '../../components/AuthLayout';
import { ButtonLink } from '../../components/SiteHeader';
import { authErrorMessage, FormError, PasswordField, focusFirstInvalid } from '../../components/AuthFields';
import type { Config } from '../../lib/data';
import { t } from '../../lib/i18n';
import { supabase, useSession } from '../../lib/supabase';

export function NewPassword({ config }: { config: Config }) {
  const navigate = useNavigate();
  const session = useSession();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [formError, setFormError] = useState<string>();
  const [pending, setPending] = useState(false);
  const min = config.auth.passwordMinLength;

  async function submit(e: FormEvent) {
    e.preventDefault();
    const invalid = password.length < min ? t('auth.errors.passwordShort', { min }) : undefined;
    setError(invalid);
    if (invalid) {
      focusFirstInvalid();
      return;
    }
    setPending(true);
    const { error } = await supabase.auth.updateUser({ password });
    setPending(false);
    if (error) setFormError(authErrorMessage(error));
    else navigate('/projektjeim', { replace: true });
  }

  if (session === undefined) return null;

  return (
    <AuthLayout
      documentTitle={t('auth.newPassword.documentTitle')}
      title={t('auth.newPassword.title')}
      subtitle={session?.user.email ?? t('auth.errors.linkExpired')}
    >
      {session ? (
        <Form className="auth-form" onSubmit={submit} validationBehavior="aria">
          <PasswordField
            label={t('auth.newPassword.password')}
            value={password}
            onChange={setPassword}
            error={error}
            description={t('auth.passwordHelp', { min })}
            autoComplete="new-password"
            autoFocus
          />
          {formError && <FormError message={formError} />}
          <Button type="submit" size="lg" fullWidth isPending={pending}>
            {t('auth.newPassword.submit')}
          </Button>
        </Form>
      ) : (
        <ButtonLink href="/elfelejtett-jelszo" variant="primary" className="button--lg button--full-width">
          {t('auth.errors.requestNewLink')}
        </ButtonLink>
      )}
    </AuthLayout>
  );
}
