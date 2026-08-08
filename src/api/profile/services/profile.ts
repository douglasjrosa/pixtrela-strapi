import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import {
  assertCanUpdateOwnAvatar,
  parseOwnAvatarBody,
  validateOwnAvatarFile,
} from '../../../business/profile-avatar';
import {
  assertCanUpdateOwnPersonal,
  parseOwnPersonalBody,
  type OwnPersonalFields,
} from '../../../business/profile-personal';

const USER_UID = 'plugin::users-permissions.user';

async function readUserAvatarUrl(documentId: string): Promise<string | null> {
  const user = await strapi.documents(USER_UID).findOne({
    documentId,
    populate: { avatar: { fields: ['url'] } },
  });
  const avatar = user?.avatar as { url?: string } | null | undefined;
  return avatar?.url ? String(avatar.url) : null;
}

export default {
  async updateOwnAvatar(
    userId: number,
    fileBuffer: Buffer,
    mimeType: string,
    fileName: string,
  ): Promise<{ avatarUrl: string | null }> {
    const user = await strapi.db.query(USER_UID).findOne({
      where: { id: userId },
      select: ['documentId', 'roleType'],
    });
    if (!user?.documentId) {
      throw new Error('notFound');
    }

    assertCanUpdateOwnAvatar(
      typeof user.roleType === 'string' ? user.roleType : null,
    );

    const validation = validateOwnAvatarFile(
      fileBuffer,
      mimeType,
      fileBuffer.length,
    );
    if (validation.ok === false) {
      throw new Error(validation.error);
    }

    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'profile-avatar-'));
    const safeName =
      fileName.replace(/[^a-zA-Z0-9._-]/g, '_') || 'avatar.jpg';
    const tmpPath = path.join(tmpDir, safeName);

    let uploaded: unknown;
    try {
      await fs.writeFile(tmpPath, fileBuffer);
      uploaded = await strapi.plugin('upload').service('upload').upload({
        data: {
          fileInfo: {
            name: fileName,
            alternativeText: 'User profile avatar',
          },
        },
        files: {
          filepath: tmpPath,
          originalFilename: fileName,
          mimetype: mimeType,
          size: fileBuffer.length,
        },
      });
    } catch (uploadError) {
      const message =
        uploadError instanceof Error ? uploadError.message : 'uploadException';
      throw new Error(`uploadFailed:${message}`);
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }

    const file = Array.isArray(uploaded) ? uploaded[0] : uploaded;
    const fileId = (file as { id?: number } | null)?.id;
    if (!fileId) throw new Error('uploadFailed');

    await strapi.documents(USER_UID).update({
      documentId: user.documentId as string,
      data: { avatar: fileId },
    });

    const fileUrl = (file as { url?: string } | null)?.url;
    const avatarUrl = fileUrl
      ? String(fileUrl)
      : await readUserAvatarUrl(user.documentId as string);
    return { avatarUrl };
  },

  parseBody: parseOwnAvatarBody,

  async updateOwnPersonal(
    userId: number,
    fields: OwnPersonalFields,
  ): Promise<OwnPersonalFields> {
    const user = await strapi.db.query(USER_UID).findOne({
      where: { id: userId },
      select: ['documentId', 'roleType', 'email'],
    });
    if (!user?.documentId) {
      throw new Error('notFound');
    }

    assertCanUpdateOwnPersonal(
      typeof user.roleType === 'string' ? user.roleType : null,
    );

    const emailChanged =
      String(user.email ?? '').toLowerCase() !== fields.email.toLowerCase();
    if (emailChanged) {
      const conflict = await strapi.db.query(USER_UID).findOne({
        where: { email: fields.email },
        select: ['id'],
      });
      if (conflict && conflict.id !== userId) {
        throw new Error('emailTaken');
      }
    }

    await strapi.documents(USER_UID).update({
      documentId: user.documentId as string,
      data: {
        name: fields.name,
        lastName: fields.lastName,
        email: fields.email,
        phone: fields.phone,
      },
    });

    return fields;
  },

  parsePersonalBody: parseOwnPersonalBody,
};
