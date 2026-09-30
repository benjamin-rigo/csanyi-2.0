import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import { Button, Checkbox, Form } from '@heroui/react';
import { AuthLayout } from '../../components/AuthLayout';
import { authErrorMessage, EmailField, FormError, isEmail, PasswordField, focusFirstInvalid } from '../../components/AuthFields';
import type { Config } from '../../lib/data';
import { t } from '../../lib/i18n';
import { setRememberMe, supabase, useSession } from '../../lib/supabase';

export function Login({ config }: { config: Config }) {
  const navigate = useNavigate();
  const session = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [pending, setPending] = useState(false);

  if (session) return <Navigate to="/projektjeim" replace />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    const next = {
      email: !email.trim() ? t('auth.errors.emailRequired') : !isEmail(email) ? t('auth.errors.emailInvalid') : undefined,
      password: !password ? t('auth.errors.passwordRequired') : undefined,
    };
    setErrors(next);
    if (next.email || next.password) {
      focusFirstInvalid();
      return;
    }
    setPending(true);
    setRememberMe(remember);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setPending(false);
    if (error) setErrors({ form: authErrorMessage(error) });
    else navigate('/projektjeim', { replace: true });
  }

  return (
    <AuthLayout
      documentTitle={t('auth.login.documentTitle')}
      title={t('auth.login.title')}
      subtitle={t('auth.login.subtitle')}
      footnote={t('auth.login.noAccount', { email: config.contactEmail })}
    >
      <Form className="auth-form" onSubmit={submit} validationBehavior="aria">
        <EmailField value={email} onChange={setEmail} error={errors.email} autoFocus />
        <PasswordField
          value={password}
          onChange={setPassword}
          error={errors.password}
          autoComplete="current-password"
          labelAction={
            <Link to="/elfelejtett-jelszo" className="text-link">
              {t('auth.login.forgot')}
            </Link>
          }
        />
        <Checkbox isSelected={remember} onChange={setRemember} className="auth-checkbox">
          <Checkbox.Content>
            <Checkbox.Control>
              <Checkbox.Indicator />
            </Checkbox.Control>
            {t('auth.login.remember')}
          </Checkbox.Content>
        </Checkbox>
        {errors.form && <FormError message={errors.form} />}
        <Button type="submit" size="lg" fullWidth isPending={pending}>
          {t('auth.login.submit')}
        </Button>
      </Form>
    </AuthLayout>
  );
}
