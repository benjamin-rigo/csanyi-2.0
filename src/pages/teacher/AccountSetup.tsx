import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { Button, Checkbox, FieldError, Form, TextField, Description, Input, Label } from '@heroui/react';
import { AuthLayout } from '../../components/AuthLayout';
import { authErrorMessage, EmailField, FormError, PasswordField, focusFirstInvalid } from '../../components/AuthFields';
import { ConfigLink } from '../../components/SiteHeader';
import type { Config } from '../../lib/data';
import { t } from '../../lib/i18n';
import { supabase, useSession } from '../../lib/supabase';

/** Fiók beállítása a meghívó után (7): név, jelszó, ÁSZF. Az e-mail a meghívóból jön. */
export function AccountSetup({ config }: { config: Config }) {
  const navigate = useNavigate();
  const session = useSession();
  // Amíg a pedagógus nem ír bele, a meghívóban megadott név látszik (ha van).
  const [typedName, setName] = useState<string | null>(null);
  const name = typedName ?? (session?.user.user_metadata as { name?: string } | undefined)?.name ?? '';
  const [password, setPassword] = useState('');
  const [terms, setTerms] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; password?: string; terms?: string; form?: string }>({});
  const [pending, setPending] = useState(false);
  const min = config.auth.passwordMinLength;

  async function submit(e: FormEvent) {
    e.preventDefault();
    const next = {
      name: !name.trim() ? t('auth.errors.nameRequired') : undefined,
      password: password.length < min ? t('auth.errors.passwordShort', { min }) : undefined,
      terms: !terms ? t('auth.errors.termsRequired') : undefined,
    };
    setErrors(next);
    if (next.name || next.password || next.terms || !session) {
      focusFirstInvalid();
      return;
    }
    setPending(true);
    const { error } = await supabase.auth.updateUser({ password, data: { name: name.trim() } });
    if (error) {
      setPending(false);
      setErrors({ form: authErrorMessage(error) });
      return;
    }
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ name: name.trim(), terms_accepted_at: new Date().toISOString() })
      .eq('id', session.user.id);
    setPending(false);
    if (profileError) setErrors({ form: t('auth.errors.generic') });
    else navigate('/projektjeim', { replace: true });
  }

  if (session === undefined) return null;

  return (
    <AuthLayout
      documentTitle={t('auth.setup.documentTitle')}
      title={t('auth.setup.title')}
      subtitle={session ? t('auth.setup.subtitle') : t('auth.setup.needsInvite')}
    >
      {session && (
        <Form className="auth-form" onSubmit={submit} validationBehavior="aria">
          <EmailField value={session.user.email ?? ''} onChange={() => undefined} description={t('auth.setup.emailHelp')} isReadOnly />
          <TextField name="name" value={name} onChange={setName} isInvalid={Boolean(errors.name)} autoFocus className="auth-field">
            <Label>{t('auth.setup.name')}</Label>
            <Input autoComplete="name" />
            <Description>{t('auth.setup.nameHelp')}</Description>
            <FieldError>{errors.name}</FieldError>
          </TextField>
          <PasswordField
            value={password}
            onChange={setPassword}
            error={errors.password}
            description={t('auth.passwordHelp', { min })}
            autoComplete="new-password"
          />
          <Checkbox isSelected={terms} onChange={setTerms} isInvalid={Boolean(errors.terms)} className="auth-checkbox">
            <Checkbox.Content>
              <Checkbox.Control>
                <Checkbox.Indicator />
              </Checkbox.Control>
              <span>
                {t('auth.setup.termsBefore')}
                <ConfigLink href={config.links.terms} className="text-link">
                  {t('auth.setup.terms')}
                </ConfigLink>
                {t('auth.setup.termsMiddle')}
                <ConfigLink href={config.links.privacy} className="text-link">
                  {t('auth.setup.privacy')}
                </ConfigLink>
                {t('auth.setup.termsAfter')}
              </span>
            </Checkbox.Content>
            <FieldError>{errors.terms}</FieldError>
          </Checkbox>
          {errors.form && <FormError message={errors.form} />}
          <Button type="submit" size="lg" fullWidth isPending={pending}>
            {t('auth.setup.submit')}
          </Button>
        </Form>
      )}
    </AuthLayout>
  );
}
