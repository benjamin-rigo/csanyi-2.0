import { Alert, Button, Chip, ProgressBar } from '@heroui/react';
import { t, tList } from '../../lib/i18n';
import { ButtonLink } from '../SiteHeader';
import { Icon } from '../Icon';

type Step = { title: string; text: string; points?: string[]; hint?: string };

/**
 * Első lépések sáv (9a, 9b) a szerkesztő bal oldalán: lépések pipákkal, haladás, az aktuális lépés teendője.
 * Mintában (sample) csak az 1. lépés él a „Most te jössz” gombbal; a gyakorló projektben a lépések maguktól teljesülnek.
 */
export function OnboardingPanel({
  mode,
  steps,
  finished,
  onStart,
  starting,
  startError,
}: {
  mode: 'sample' | 'practice';
  steps: boolean[];
  finished: boolean;
  onStart?: () => void;
  starting?: boolean;
  startError?: boolean;
}) {
  const content = tList<Step>('teacher.onboarding.steps');
  const done = steps.filter(Boolean).length;
  const current = mode === 'sample' ? 0 : steps.findIndex((s) => !s);

  return (
    <aside className="onboarding" aria-labelledby="onboarding-title">
      <div className="onboarding-head">
        <div className="onboarding-head-row">
          <Chip size="sm" variant="primary">
            {t('teacher.onboarding.label')}
          </Chip>
          <span className="panel-help">{t('teacher.onboarding.progress', { done, total: steps.length })}</span>
        </div>
        <h2 id="onboarding-title">{t('teacher.onboarding.title')}</h2>
        <ProgressBar aria-label={t('teacher.onboarding.progressLabel')} value={(done / steps.length) * 100} size="sm">
          <ProgressBar.Track>
            <ProgressBar.Fill />
          </ProgressBar.Track>
        </ProgressBar>
      </div>

      {finished ? (
        <div className="onboarding-current" role="status">
          <h3>{t('teacher.onboarding.doneTitle')}</h3>
          <p>{t('teacher.onboarding.doneText')}</p>
          <ButtonLink href="/projektjeim" variant="primary">
            {t('teacher.onboarding.doneButton')}
          </ButtonLink>
        </div>
      ) : (
        <ol className="onboarding-steps">
          {content.map((step, i) => {
            const isCurrent = i === current;
            const isDone = mode === 'practice' && steps[i];
            return (
              <li
                key={step.title}
                className={isCurrent ? 'onboarding-current' : 'onboarding-step'}
                aria-current={isCurrent ? 'step' : undefined}
              >
                <span className={`onboarding-num${isDone ? ' is-done' : ''}`} aria-hidden="true">
                  {isDone ? <Icon name="check" size={14} /> : i + 1}
                </span>
                <div className="onboarding-step-body">
                  <h3>
                    {step.title}
                    <span className="sr-only">
                      {isDone ? `, ${t('teacher.onboarding.stepDone')}` : isCurrent ? `, ${t('teacher.onboarding.stepCurrent')}` : ''}
                    </span>
                  </h3>
                  {isCurrent && (
                    <>
                      <p>{step.text}</p>
                      {step.points && (
                        <ul className="onboarding-points">
                          {step.points.map((p) => (
                            <li key={p}>
                              <Icon name="check" size={14} />
                              {p}
                            </li>
                          ))}
                        </ul>
                      )}
                      {step.hint && <p className="panel-help">{step.hint}</p>}
                      {mode === 'sample' && onStart && (
                        <Button onPress={onStart} isPending={starting}>
                          {t('teacher.onboarding.start')}
                          <Icon name="forward" size={16} />
                        </Button>
                      )}
                      {startError && (
                        <Alert status="danger" role="alert">
                          <Alert.Indicator />
                          <Alert.Content>
                            <Alert.Title>{t('teacher.onboarding.startError')}</Alert.Title>
                          </Alert.Content>
                        </Alert>
                      )}
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {!finished && (
        <div className="onboarding-foot">
          {mode === 'practice' && (
            <ButtonLink href="/minta" variant="secondary">
              <Icon name="eye" size={16} />
              {t('teacher.onboarding.openSample')}
            </ButtonLink>
          )}
          <ButtonLink href="/projektjeim">{t('teacher.onboarding.later')}</ButtonLink>
        </div>
      )}
    </aside>
  );
}
