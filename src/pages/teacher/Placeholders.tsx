import { Button } from '@heroui/react';
import { TeacherLayout } from '../../components/TeacherLayout';
import { t } from '../../lib/i18n';
import { supabase } from '../../lib/supabase';

/** Helykitöltő: a Profil (14) később készül; a kijelentkezés már itt van. */
export function ProfilePlaceholder() {
  return (
    <TeacherLayout documentTitle={t('teacher.profile.documentTitle')}>
      <div className="page-heading">
        <h1>{t('teacher.profile.title')}</h1>
        <p>{t('teacher.profile.comingSoon')}</p>
      </div>
      <Button variant="outline" onPress={() => void supabase.auth.signOut()}>
        {t('teacher.profile.signOut')}
      </Button>
    </TeacherLayout>
  );
}
