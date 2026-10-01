import { useState } from 'react';
import { Button, Description, Input, Label, Tag, TagGroup, TextArea, TextField } from '@heroui/react';
import { FileTrigger } from 'react-aria-components';
import { assetUrl } from '../../lib/data';
import type { CategoryOption, EditorProject } from '../../lib/editor';
import { t } from '../../lib/i18n';
import { IMAGE_TYPES } from '../../lib/teacher';
import { Icon } from '../Icon';

export type ProjectTextPatch = Partial<Pick<EditorProject, 'title' | 'shortDescription' | 'author'>>;

/** Projekt fül (11c): cím, kép, rövid leírás, alkotó, téma, törlés. */
export function ProjectPanel({
  project,
  categories,
  onChange,
  onCategories,
  onReplaceImage,
  onDelete,
}: {
  project: EditorProject;
  categories: CategoryOption[];
  onChange: (patch: ProjectTextPatch) => void;
  onCategories: (ids: string[]) => void;
  onReplaceImage: (file: File) => Promise<void>;
  onDelete: () => void;
}) {
  const [replacing, setReplacing] = useState(false);
  const [imageError, setImageError] = useState(false);

  async function replace(file: File | undefined) {
    if (!file || !IMAGE_TYPES.includes(file.type)) return;
    setReplacing(true);
    setImageError(false);
    try {
      await onReplaceImage(file);
    } catch {
      setImageError(true);
    } finally {
      setReplacing(false);
    }
  }

  return (
    <div className="panel-sections">
      <TextField id="project-title" value={project.title} onChange={(title) => onChange({ title })} fullWidth>
        <Label>{t('teacher.editor.project.title')}</Label>
        <Input />
      </TextField>

      <div className="panel-field" role="group" aria-labelledby="project-image">
        <span id="project-image" className="panel-label">
          {t('teacher.editor.project.image')}
        </span>
        <div className="image-card">
          <img src={assetUrl(project.imagePath)} alt="" />
          <span className="sound-card-text">
            <span className="sound-card-meta">
              {t('teacher.editor.project.imageSize', { w: project.imageWidth, h: project.imageHeight })}
            </span>
          </span>
          <FileTrigger acceptedFileTypes={IMAGE_TYPES} onSelect={(files) => void replace(files?.[0])}>
            <Button size="sm" variant="secondary" isPending={replacing}>
              {t('teacher.editor.project.replaceImage')}
            </Button>
          </FileTrigger>
        </div>
        <p className="panel-help">{t('teacher.editor.project.replaceHelp')}</p>
        {imageError && (
          <p className="field-error-text" role="alert">
            {t('teacher.editor.project.imageError')}
          </p>
        )}
      </div>

      <TextField
        id="project-short-description"
        value={project.shortDescription}
        onChange={(shortDescription) => onChange({ shortDescription })}
        fullWidth
      >
        <Label>{t('teacher.editor.project.shortDescription')}</Label>
        <TextArea rows={3} />
        <Description>{t('teacher.editor.project.shortDescriptionHelp')}</Description>
      </TextField>

      <TextField value={project.author} onChange={(author) => onChange({ author })} fullWidth>
        <Label>{t('teacher.editor.project.author')}</Label>
        <Input />
        <Description>{t('teacher.editor.project.authorHelp')}</Description>
      </TextField>

      <TagGroup
        selectionMode="multiple"
        selectedKeys={new Set(project.categories)}
        onSelectionChange={(keys) => onCategories([...keys].map(String))}
      >
        <Label>{t('teacher.editor.project.themes')}</Label>
        <TagGroup.List>
          {categories.map((c) => (
            <Tag key={c.id} id={c.id} textValue={c.label}>
              {c.icon && <Icon name={c.icon} size={14} />}
              {c.label}
            </Tag>
          ))}
        </TagGroup.List>
        <Description>{t('teacher.editor.project.themesHelp')}</Description>
      </TagGroup>

      <section className="panel-danger-zone" aria-labelledby="project-delete">
        <h2 id="project-delete" className="panel-section-title">
          {t('teacher.editor.project.deleteTitle')}
        </h2>
        <p className="panel-help">{t('teacher.editor.project.deleteText')}</p>
        <Button size="sm" variant="danger-soft" onPress={onDelete}>
          {t('teacher.editor.project.deleteButton')}
        </Button>
      </section>
    </div>
  );
}
