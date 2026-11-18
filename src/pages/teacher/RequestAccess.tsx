import { useState, type FormEvent } from 'react';
import { Alert, Button, Description, FieldError, Form, Input, Label, Link, TextArea, TextField } from '@heroui/react';
import { AuthLayout } from '../../components/AuthLayout';
import { EmailField, FormError, focusFirstInvalid, isEmail } from '../../components/AuthFields';
import type { Config } from '../../lib/data';
import { t } from '../../lib/i18n';
import { requestAccess } from '../../lib/teacher';

type Errors = { name?: string; email?: string; school?: string; form?: string };

/** Hozzáférés kérése (döntésnapló, 2026-11-18): a kérést az admin látja a Fiókok fülön, és onnan meghívhatja. */
export function RequestAccess({ config }: { config: Config }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [school, setSchool] = useState('');
  const [message, setMessage] = useState('');
  // Rejtett mező: ember nem tölti ki, a robotok igen.
  const [trap, setTrap] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const next: Errors = {
      name: !name.trim() ? t('auth.request.errors.nameRequired') : undefined,
      email: !email.trim() ? t('auth.errors.emailRequired') : !isEmail(email) ? t('auth.errors.emailInvalid') : undefined,
      school: !school.trim() ? t('auth.request.errors.schoolRequired') : undefined,
    };
    setErrors(next);
    if (next.name || next.email || next.school) {
      focusFirstInvalid();
      return;
    }
    if (trap) return setSent(true);
    setPending(true);
    const error = await requestAccess({ name, email, school, message });
    setPending(false);
    if (error) setErrors({ form: t(error === 'rate_limit' ? 'auth.request.errors.rateLimit' : 'auth.request.errors.other') });
    else setSent(true);
  }

  return (
    <AuthLayout
      documentTitle={t('auth.request.documentTitle')}
      title={t('auth.request.title')}
      subtitle={t('auth.request.subtitle')}
      footnote={t('auth.request.question', { email: config.contactEmail })}
    >
      {!sent && (
        <Form className="auth-form" onSubmit={submit} validationBehavior="aria">
          <TextField name="name" value={name} onChange={setName} isInvalid={Boolean(errors.name)} autoFocus fullWidth>
            <Label>{t('auth.request.name')}</Label>
            <Input autoComplete="name" maxLength={100} />
            <FieldError>{errors.name}</FieldError>
          </TextField>
          <EmailField value={email} onChange={setEmail} error={errors.email} />
          <TextField name="school" value={school} onChange={setSchool} isInvalid={Boolean(errors.school)} fullWidth>
            <Label>{t('auth.request.school')}</Label>
            <Input autoComplete="organization" maxLength={200} />
            <FieldError>{errors.school}</FieldError>
          </TextField>
          <TextField name="message" value={message} onChange={setMessage} fullWidth>
            <Label>{t('auth.request.message')}</Label>
            <TextArea rows={3} maxLength={1000} />
            <Description>{t('auth.request.messageHelp')}</Description>
          </TextField>
          <input
            className="trap-field"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            value={trap}
            onChange={(e) => setTrap(e.target.value)}
          />
          {errors.form && <FormError message={errors.form} />}
          <Button type="submit" size="lg" fullWidth isPending={pending}>
            {t('auth.request.submit')}
          </Button>
          <p className="panel-help">{t('auth.request.privacy')}</p>
        </Form>
      )}
      <div role="status">
        {sent && (
          <Alert status="success">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Description>{t('auth.request.sent')}</Alert.Description>
            </Alert.Content>
          </Alert>
        )}
      </div>
      <Link href="/belepes" className="auth-center-link">
        {t('auth.request.backToLogin')}
      </Link>
    </AuthLayout>
  );
}
