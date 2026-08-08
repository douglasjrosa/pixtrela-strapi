/**
 * Shared welcome profile fields returned after identify/login.
 */
export type WelcomeProfile = {
  name: string;
  greetingGender: 'masculine' | 'feminine' | null;
  avatarUrl: string | null;
  facePhotoUrl: string | null;
};

function readGreetingGender(
  value: unknown,
): WelcomeProfile['greetingGender'] {
  if (value === 'feminine') return 'feminine';
  if (value === 'masculine') return 'masculine';
  return null;
}

export function mapWelcomeProfile(user: {
  name?: string | null;
  username?: string | null;
  greetingGender?: string | null;
  greeting_gender?: string | null;
  avatar?: { url?: string } | null;
  facePhoto?: { url?: string } | null;
}): WelcomeProfile {
  return {
    name: String(user.name ?? user.username ?? ''),
    greetingGender: readGreetingGender(
      user.greetingGender ?? user.greeting_gender,
    ),
    avatarUrl: user.avatar?.url ? String(user.avatar.url) : null,
    facePhotoUrl: user.facePhoto?.url ? String(user.facePhoto.url) : null,
  };
}
