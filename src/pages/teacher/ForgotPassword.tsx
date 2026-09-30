import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { Button, Form } from '@heroui/react';
import { AuthLayout } from '../../components/AuthLayout';
import { EmailField, FormError, isEmail, focusFirstInvalid } from '../../components/AuthFields';
import { Icon } from '../../components/Icon';
import { t } from '../../lib/i18n';
import { supabase } from '../../lib/supabase';

/** A levélben kapott link az Új jelszó oldalra visz. */
function resetRedirectUrl(): string {
  return new URL(`${import.meta.env.BASE_URL}uj-jelszo`, window.location.origin).href;
}

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string>();
  const [formError, setFormError] = useState<string>();
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const invalid = !email.trim() ? t('auth.errors.emailRequired') : !isEmail(email) ? t('auth.errors.emailInvalid') : undefined;
    setError(invalid);
    setFormError(undefined);
    if (invalid) {
      focusFirstInvalid();
      return;
    }
    setPending(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: resetRedirectUrl() });
    setPending(false);
    // A válasz nem árulja el, létezik-e a fiók; csak a túl sok kérést jelezzük.
    if (error?.code === 'over_email_send_rate_limit' || error?.code === 'over_request_rate_limit') {
      setFormError(t('auth.errors.rateLimit'));
      return;
    }
    setSent(true);
  }

  return (
    <AuthLayout documentTitle={t('auth.forgot.documentTitle')} title={t('auth.forgot.title')} subtitle={t('auth.forgot.subtitle')}>
      <Form className="auth-form" onSubmit={submit} validationBehavior="aria">
        <EmailField value={email} onChange={setEmail} error={error} autoFocus />
        <Button type="submit" size="lg" fullWidth isPending={pending}>
          {t('auth.forgot.submit')}
        </Button>
      </Form>
      <div role="status" className="auth-status-slot">
        {sent && (
          <p className="auth-status">
            <span className="auth-status-icon">
              <Icon name="check" />
            </span>
            {t('auth.forgot.sent')}
          </p>
        )}
      </div>
      {formError && <FormError message={formError} />}
      <Link to="/belepes" className="text-link auth-center-link">
        {t('auth.forgot.backToLogin')}
      </Link>
    </AuthLayout>
  );
}
